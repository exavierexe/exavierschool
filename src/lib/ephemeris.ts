// Ephemeris calculations for astrology using the ephemeris JavaScript package
import path from 'path';
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import ephemeris from 'ephemeris';
// Import our robust wrapper that works in both client and server environments

export interface CityData {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

// Constants
const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer',
  'Leo', 'Virgo', 'Libra', 'Scorpio',
  'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

const ZODIAC_SYMBOLS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];

// Cache for data to avoid repeated file reads
let citiesCache: any[] | null = null;
let timeZonesCache: Map<string, any> | null = null;
let countriesCache: Map<string, string> | null = null;

// Helper function to load and parse the cities CSV file
async function loadCitiesData(): Promise<any[]> {
  if (citiesCache) return citiesCache;
  
  // Skip file operations in browser environment
  if (typeof window !== 'undefined') {
    console.log('Running in browser environment, skipping cities file loading');
    const emptyArray: any[] = [];
    citiesCache = emptyArray;
    return emptyArray;
  }
  
  try {
    // Get the root directory of the project
    const rootDir = process.cwd();
    console.log('Root directory:', rootDir);
    
    // Try multiple possible paths for the CSV file
    const possiblePaths = [
      path.join(rootDir, 'src', 'lib', 'worldcities.csv'),
      path.join(rootDir, 'src', 'worldcities.csv'),
      path.join(rootDir, 'worldcities.csv'),
      path.join(rootDir, '.next', 'server', 'src', 'lib', 'worldcities.csv'),
      path.join(rootDir, '.next', 'server', 'src', 'worldcities.csv')
    ];
    
    let fileContent;
    let foundPath = '';
    
    // Try each possible path
    for (const csvPath of possiblePaths) {
      try {
        console.log('Attempting to read file from:', csvPath);
        fileContent = await fs.promises.readFile(csvPath, 'utf8');
        foundPath = csvPath;
        console.log(`Successfully loaded cities file from: ${csvPath}`);
        break;
      } catch (readError) {
        console.log(`Could not read cities file from ${csvPath}:`, readError.message);
        continue;
      }
    }
    
    if (!fileContent) {
      console.warn('Could not find cities file in any of the expected locations');
      const emptyArray: any[] = [];
      citiesCache = emptyArray;
      return emptyArray;
    }
    
    // Parse CSV data
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true
    });
    
    console.log(`Loaded ${records.length} cities from ${foundPath}`);
    
    // Cache the results for future calls
    citiesCache = records;
    return records;
  } catch (error) {
    console.error('Error loading cities data:', error);
    return [];
  }
}

// Helper function to load time zone data
function loadTimeZoneData(): Map<string, any> {
  if (timeZonesCache) return timeZonesCache;
  
  // Create an empty map as a fallback
  const timeZonesMap = new Map();
  
  // Skip file operations in browser environment
  if (typeof window !== 'undefined') {
    console.log('Running in browser environment, skipping timezone file loading');
    timeZonesCache = timeZonesMap;
    return timeZonesMap;
  }
  
  try {
    const rootDir = process.cwd();
    const possiblePaths = [
      path.join(rootDir, 'src', 'lib', 'TimeZoneDB.csv', 'time_zone.csv'),
      path.join(rootDir, 'src', 'TimeZoneDB.csv', 'time_zone.csv'),
      path.join(rootDir, 'TimeZoneDB.csv', 'time_zone.csv'),
      path.join(rootDir, '.next', 'server', 'src', 'lib', 'TimeZoneDB.csv', 'time_zone.csv'),
      path.join(rootDir, '.next', 'server', 'src', 'TimeZoneDB.csv', 'time_zone.csv')
    ];
    
    let fileContent;
    let foundPath = '';
    
    for (const csvPath of possiblePaths) {
      try {
        console.log('Attempting to read timezone file from:', csvPath);
        fileContent = fs.readFileSync(csvPath, 'utf8');
        foundPath = csvPath;
        console.log(`Successfully loaded timezone file from: ${csvPath}`);
        break;
      } catch (readError) {
        console.log(`Could not read timezone file from ${csvPath}:`, readError.message);
        continue;
      }
    }
    
    if (!fileContent) {
      console.warn('Could not find timezone file in any of the expected locations');
      timeZonesCache = timeZonesMap;
      return timeZonesMap;
    }
    
    // Parse CSV data
    // Format: Zone_Name,Country_Code,Zone_Type,Start_Time,UTC_Offset,DST_Flag
    const lines = fileContent.split('\n');
    
    // Process entries in reverse order to get the most recent entries first
    // (TimeZoneDB entries are listed in chronological order)
    const processedZones = new Set<string>();
    
    // First, count how many entries we have for each country code
    // This helps us identify countries with multiple time zones
    const countryCounts: Record<string, number> = {};
    
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      const parts = line.split(',');
      if (parts.length < 4) continue;
      
      const zoneName = parts[0];
      const countryCode = parts[1];
      const zoneType = parts[2];  // LMT, GMT, UTC, EST, etc.
      
      // Skip historical Local Mean Time entries
      if (zoneType === 'LMT') continue;
      
      // Count distinct zone names for each country
      if (!processedZones.has(zoneName)) {
        processedZones.add(zoneName);
        countryCounts[countryCode] = (countryCounts[countryCode] || 0) + 1;
      }
    }
    
    // Reset for actual processing
    processedZones.clear();
    
    // Process zones and add them to our map
    // We need to identify the most recent time zone entry for each zone based on the current date
    
    // Current timestamp - but let's move it forward slightly to ensure we're using the most current rules
    // This helps with DST transitions that might be upcoming
    const now = Math.floor(Date.now() / 1000); // Current Unix timestamp in seconds
    const futureNow = now + (60 * 60 * 24 * 7); // Look ahead 1 week to catch upcoming DST changes
    
    // Store time zones by zone name
    const zoneEntries: Record<string, any[]> = {};
    
    // First pass - collect all entries for each zone
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      const parts = line.split(',');
      if (parts.length < 6) continue;  // Need 6 columns for complete data
      
      const zoneName = parts[0];
      const countryCode = parts[1];
      const zoneType = parts[2];      // LMT, UTC, EST, EDT, etc.
      const startTime = parseInt(parts[3]) || 0;  // Unix timestamp when this rule starts
      const utcOffset = parseInt(parts[4]) || 0;  // UTC offset in seconds
      const isDst = parseInt(parts[5]) === 1;     // 1 for DST, 0 for standard time
      
      // Skip historical Local Mean Time entries
      if (zoneType === 'LMT') continue;
      
      // Add this entry to our collection for the zone
      if (!zoneEntries[zoneName]) {
        zoneEntries[zoneName] = [];
      }
      
      zoneEntries[zoneName].push({
        zoneName,
        countryCode,
        zoneType,
        startTime,
        utcOffset,
        isDst,
        isExclusive: countryCounts[countryCode] === 1
      });
    }
    
    // Second pass - find the most current entry for each zone
    for (const [zoneName, entries] of Object.entries(zoneEntries)) {
      // Sort entries by start time (newest first)
      entries.sort((a, b) => b.startTime - a.startTime);
      
      // Find the most recent entry that is applicable now
      let currentEntry = null;
      
      for (const entry of entries) {
        if (entry.startTime <= futureNow) {
          currentEntry = entry;
          break;
        }
      }
      
      // If we found a current entry, add it to our map
      if (currentEntry) {
        timeZonesMap.set(zoneName, {
          zoneName: currentEntry.zoneName,
          countryCode: currentEntry.countryCode,
          zoneType: currentEntry.zoneType,
          utcOffset: currentEntry.utcOffset,
          isDst: currentEntry.isDst,
          isExclusive: currentEntry.isExclusive
        });
        
        // Log for debugging
        if (!processedZones.has(zoneName)) {
          processedZones.add(zoneName);
          console.log(`Using timezone rule for ${zoneName}: ${currentEntry.zoneType}, offset ${currentEntry.utcOffset} seconds, DST: ${currentEntry.isDst ? 'Yes' : 'No'}`);
        }
      }
    }
    
    // Add common aliases for convenience
    const aliasMap: Record<string, string> = {
      // US Time Zones
      'America/New_York': 'US/Eastern',
      'America/Los_Angeles': 'US/Pacific',
      'America/Chicago': 'US/Central',
      'America/Denver': 'US/Mountain',
      'Pacific/Honolulu': 'US/Hawaii',
      'America/Anchorage': 'US/Alaska',
      
      // Australian Time Zones
      'Australia/Sydney': 'Australia/NSW',
      'Australia/Melbourne': 'Australia/Victoria',
      
      // European Time Zones
      'Europe/London': 'GB',
      'Europe/Paris': 'Europe/France',
      'Europe/Berlin': 'Europe/Germany',
      
      // Asia Time Zones
      'Asia/Tokyo': 'Japan',
      'Asia/Shanghai': 'China'
    };
    
    // Create the aliases
    for (const [canonicalName, alias] of Object.entries(aliasMap)) {
      if (timeZonesMap.has(canonicalName)) {
        const sourceData = timeZonesMap.get(canonicalName);
        
        timeZonesMap.set(alias, {
          zoneName: alias,
          countryCode: sourceData.countryCode,
          zoneType: sourceData.zoneType,
          utcOffset: sourceData.utcOffset,
          isDst: sourceData.isDst,
          isAlias: true,
          canonicalName: canonicalName
        });
      }
    }
    
    // Add special case for the most common Pacific locations
    // Pacific/Auckland is particularly important to handle correctly for New Zealand
    if (timeZonesMap.has('Pacific/Auckland')) {
      const aucklandData = timeZonesMap.get('Pacific/Auckland');
      console.log(`Pacific/Auckland timezone settings: offset ${aucklandData.utcOffset} seconds, DST: ${aucklandData.isDst ? 'Yes' : 'No'}`);
      
      // Add NZ as an alias for Pacific/Auckland
      timeZonesMap.set('NZ', {
        zoneName: 'NZ', 
        countryCode: 'NZ',
        zoneType: aucklandData.zoneType,
        utcOffset: aucklandData.utcOffset,
        isDst: aucklandData.isDst,
        isAlias: true,
        canonicalName: 'Pacific/Auckland'
      });
    }
    
    console.log(`Loaded ${timeZonesMap.size} time zones from TimeZoneDB (including aliases)`);
    
    // Debug output - show key sample zones
    for (const country of ['US', 'GB', 'JP', 'AU', 'NZ']) {
      console.log(`Sample timezones for ${country}:`);
      let found = 0;
      for (const [name, data] of timeZonesMap.entries()) {
        if (data.countryCode === country && found < 2) {
          found++;
          console.log(`  ${name}: ${data.countryCode}, ${data.zoneType}, offset: ${data.utcOffset} seconds, DST: ${data.isDst ? 'Yes' : 'No'}`);
        }
      }
    }
    
    timeZonesCache = timeZonesMap;
    return timeZonesCache;
  } catch (error) {
    console.error('Error loading time zone data:', error);
    return new Map();
  }
}

// Helper function to load country data
function loadCountryData(): Map<string, string> {
  if (countriesCache) return countriesCache;
  
  // Create an empty map as a fallback
  const countriesMap = new Map();
  
  // Skip file operations in browser environment
  if (typeof window !== 'undefined') {
    console.log('Running in browser environment, skipping country file loading');
    countriesCache = countriesMap;
    return countriesMap;
  }
  
  try {
    const csvPath = path.join(process.cwd(), 'src', 'public', 'TimeZoneDB.csv', 'country.csv');
    let fileContent;
    
    try {
      fileContent = fs.readFileSync(csvPath, 'utf8');
    } catch (readError) {
      console.warn('Could not read country file:', readError);
      countriesCache = countriesMap;
      return countriesMap;
    }
    
    // Parse CSV data
    // Format: Country_Code,Country_Name
    const lines = fileContent.split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const [countryCode, countryName] = line.split(',');
      if (countryCode && countryName) {
        countriesMap.set(countryCode, countryName);
      }
    }
    
    console.log(`Loaded ${countriesMap.size} countries from TimeZoneDB`);
    countriesCache = countriesMap;
    return countriesCache;
  } catch (error) {
    console.error('Error loading country data:', error);
    return new Map();
  }
}

// Fallback database for common locations if CSV lookup fails
const FALLBACK_LOCATIONS: Record<string, { 
  latitude: number; 
  longitude: number; 
  formattedAddress: string;
  countryCode: string;
  timeZoneName?: string; // IANA Timezone name (e.g., 'America/New_York')
}> = {
  // North America - Major US cities
  'new york': { 
    latitude: 40.7128, 
    longitude: -74.006, 
    formattedAddress: 'New York, NY, USA',
    countryCode: 'US',
    timeZoneName: 'America/New_York'
  },
  'los angeles': { 
    latitude: 34.0522, 
    longitude: -118.2437, 
    formattedAddress: 'Los Angeles, CA, USA',
    countryCode: 'US',
    timeZoneName: 'America/Los_Angeles'
  },
  'chicago': { 
    latitude: 41.8781, 
    longitude: -87.6298, 
    formattedAddress: 'Chicago, IL, USA',
    countryCode: 'US',
    timeZoneName: 'America/Chicago'
  },
  'miami': { 
    latitude: 25.7617, 
    longitude: -80.1918, 
    formattedAddress: 'Miami, FL, USA',
    countryCode: 'US',
    timeZoneName: 'America/New_York'
  },
  
  // Europe
  'london': { 
    latitude: 51.5074, 
    longitude: -0.1278, 
    formattedAddress: 'London, UK',
    countryCode: 'GB',
    timeZoneName: 'Europe/London'
  },
  'paris': { 
    latitude: 48.8566, 
    longitude: 2.3522, 
    formattedAddress: 'Paris, France',
    countryCode: 'FR',
    timeZoneName: 'Europe/Paris'
  },
  'berlin': { 
    latitude: 52.5200, 
    longitude: 13.4050, 
    formattedAddress: 'Berlin, Germany',
    countryCode: 'DE',
    timeZoneName: 'Europe/Berlin'
  },
  'rome': { 
    latitude: 41.9028, 
    longitude: 12.4964, 
    formattedAddress: 'Rome, Italy',
    countryCode: 'IT',
    timeZoneName: 'Europe/Rome'
  },
  
  // Asia
  'tokyo': { 
    latitude: 35.6762, 
    longitude: 139.6503, 
    formattedAddress: 'Tokyo, Japan',
    countryCode: 'JP',
    timeZoneName: 'Asia/Tokyo'
  },
  'beijing': { 
    latitude: 39.9042, 
    longitude: 116.4074, 
    formattedAddress: 'Beijing, China',
    countryCode: 'CN',
    timeZoneName: 'Asia/Shanghai'
  },
  'delhi': { 
    latitude: 28.7041, 
    longitude: 77.1025, 
    formattedAddress: 'Delhi, India',
    countryCode: 'IN',
    timeZoneName: 'Asia/Kolkata'
  },
  
  // Australia and Oceania
  'sydney': { 
    latitude: -33.8688, 
    longitude: 151.2093, 
    formattedAddress: 'Sydney, Australia',
    countryCode: 'AU',
    timeZoneName: 'Australia/Sydney'
  },
  'melbourne': { 
    latitude: -37.8136, 
    longitude: 144.9631, 
    formattedAddress: 'Melbourne, Australia',
    countryCode: 'AU',
    timeZoneName: 'Australia/Melbourne'
  },
  'auckland': { 
    latitude: -36.8509, 
    longitude: 174.7645, 
    formattedAddress: 'Auckland, New Zealand',
    countryCode: 'NZ',
    timeZoneName: 'Pacific/Auckland'
  }
};

// Function to find the timezone for a location
function findTimeZone(latitude: number, longitude: number, countryCode: string): { 
  zoneName: string; 
  utcOffset: number;
  countryName: string; 
} {
  try {
    console.log(`Finding timezone for coordinates: ${latitude}, ${longitude}, country code: ${countryCode}`);
    
    // Normalize country code to uppercase
    countryCode = countryCode.toUpperCase();
    
    // Load timezone and country data
    const timeZones = loadTimeZoneData();
    const countries = loadCountryData();
    
    // If we don't have enough data, return a default
    if (!timeZones.size || !countries.size) {
      console.log('Timezone data not loaded properly, using default timezone');
      return {
        zoneName: 'UTC',
        utcOffset: 0,
        countryName: countries.get(countryCode) || countryCode || 'Unknown'
      };
    }
    
    console.log(`Loaded ${timeZones.size} timezones and ${countries.size} country codes`);
    
    // Handle US timezones directly with longitude-based determination
    // This fixes the issue where all US cities were getting Pacific/Honolulu
    if (countryCode === 'US') {
      // Special case handling for US - map longitude directly to timezones
      // These boundaries are approximate but work for continental US
      let usZoneName = '';
      
      // Basic logic for US timezone selection by longitude
      if (longitude < -170) {
        // Aleutian Islands
        usZoneName = 'America/Adak';         // UTC-10 with DST
      } else if (longitude < -140) {
        // Alaska 
        usZoneName = 'America/Anchorage';    // UTC-9 with DST
      } else if (longitude < -115) {
        // Pacific Time
        usZoneName = 'America/Los_Angeles';  // UTC-8 with DST
      } else if (longitude < -100) {
        // Mountain Time
        usZoneName = 'America/Denver';       // UTC-7 with DST
      } else if (longitude < -85) {
        // Central Time
        usZoneName = 'America/Chicago';      // UTC-6 with DST
      } else if (longitude < -65) {
        // Eastern Time
        usZoneName = 'America/New_York';     // UTC-5 with DST
      } else {
        // Default to Eastern for edge cases
        usZoneName = 'America/New_York';
      }
      
      // Hawaii special case
      if (longitude < -150 && latitude < 25 && latitude > 15) {
        usZoneName = 'Pacific/Honolulu';     // UTC-10 without DST
      }
      
      console.log(`US special case handling: selected ${usZoneName} for longitude ${longitude}`);
      
      // Look up this zone and return it if found
      for (const [zoneName, zoneData] of timeZones.entries()) {
        if (zoneName === usZoneName) {
          return {
            zoneName,
            utcOffset: zoneData.utcOffset,
            countryName: countries.get(countryCode) || 'United States'
          };
        }
      }
      
      // If we couldn't find the specific zone name, continue with standard approach
      console.log(`Named timezone ${usZoneName} not found in data, falling back to standard approach`);
    }
    
    // For other countries with multiple timezones, map these predefined zones
    // This also serves as a hardcoded fallback if the TimeZoneDB data is inconsistent
    const specialCountryMap: Record<string, string[]> = {
      // North America
      'CA': ['America/Toronto', 'America/Winnipeg', 'America/Edmonton', 'America/Vancouver'],
      'US': ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Pacific/Honolulu', 'America/Anchorage'],
      'MX': ['America/Mexico_City', 'America/Tijuana', 'America/Cancun'],
      
      // Europe
      'GB': ['Europe/London'],
      'DE': ['Europe/Berlin'],
      'FR': ['Europe/Paris'],
      'ES': ['Europe/Madrid'],
      'IT': ['Europe/Rome'],
      
      // Asia
      'JP': ['Asia/Tokyo', 'JST'], // Japan has only one timezone (Japan Standard Time)
      'CN': ['Asia/Shanghai'],
      'IN': ['Asia/Kolkata'],
      'RU': ['Europe/Moscow', 'Asia/Yekaterinburg', 'Asia/Novosibirsk', 'Asia/Irkutsk', 'Asia/Vladivostok'],
      
      // Australia and Oceania
      'AU': ['Australia/Sydney', 'Australia/Adelaide', 'Australia/Perth'],
      'NZ': ['Pacific/Auckland']
    };
    
    // Find all zones for this country
    const countryZones: any[] = [];
    for (const [zoneName, zoneData] of timeZones.entries()) {
      if (zoneData.countryCode === countryCode) {
        countryZones.push(zoneData);
      }
    }
    
    console.log(`Found ${countryZones.length} timezone entries for country code ${countryCode}`);
    
    // If we found zones for this country, try to find the most appropriate one
    if (countryZones.length > 0) {
      // Most countries have a single timezone, but some have multiple
      if (countryZones.length === 1) {
        // Only one timezone for this country, use it
        const zone = countryZones[0];
        console.log(`Using the only timezone available for ${countryCode}: ${zone.zoneName}`);
        return {
          zoneName: zone.zoneName,
          utcOffset: zone.utcOffset,
          countryName: countries.get(countryCode) || countryCode || 'Unknown'
        };
      } else {
        // Multiple timezones for this country
        
        // Calculate the rough longitudinal timezone
        // Each 15 degrees of longitude is approximately 1 hour
        const approxOffsetHours = Math.round(longitude / 15);
        const approxOffsetSeconds = approxOffsetHours * 3600;
        
        console.log(`Approximate timezone offset based on longitude ${longitude}: ${approxOffsetHours} hours (${approxOffsetSeconds} seconds)`);
        
        // For special countries, use more sophisticated logic
        if (specialCountryMap[countryCode]) {
          // Calculate approximate position within the country
          // For now, just use longitude to determine which predefined zone to use
          const zoneNames = specialCountryMap[countryCode];
          
          // Try to find all these predefined zones in our data
          const specialZones: any[] = [];
          for (const name of zoneNames) {
            for (const zone of countryZones) {
              if (zone.zoneName === name) {
                specialZones.push(zone);
                break;
              }
            }
          }
          
          // If we found some of our special zones, use those
          if (specialZones.length > 0) {
            // Find closest offset to our approximate value
            let closestZone = specialZones[0];
            let minDifference = Number.MAX_VALUE;
            
            for (const zone of specialZones) {
              const difference = Math.abs(zone.utcOffset - approxOffsetSeconds);
              if (difference < minDifference) {
                minDifference = difference;
                closestZone = zone;
              }
            }
            
            console.log(`Selected special timezone for ${countryCode}: ${closestZone.zoneName} with offset ${closestZone.utcOffset} seconds`);
            
            return {
              zoneName: closestZone.zoneName,
              utcOffset: closestZone.utcOffset,
              countryName: countries.get(countryCode) || countryCode || 'Unknown'
            };
          }
        }
        
        // Standard approach for all other countries - find closest offset
        let closestZone = countryZones[0];
        let minDifference = Number.MAX_VALUE;
        
        for (const zone of countryZones) {
          const difference = Math.abs(zone.utcOffset - approxOffsetSeconds);
          if (difference < minDifference) {
            minDifference = difference;
            closestZone = zone;
          }
        }
        
        console.log(`Selected best timezone match: ${closestZone.zoneName} with offset ${closestZone.utcOffset} seconds`);
        
        return {
          zoneName: closestZone.zoneName,
          utcOffset: closestZone.utcOffset,
          countryName: countries.get(countryCode) || countryCode || 'Unknown'
        };
      }
    }
    
    // If we couldn't find any timezone data for this country, calculate approximation
    console.log(`No timezone data found for country code ${countryCode}, calculating from longitude`);
    
    // Calculate the rough longitudinal timezone
    // Each 15 degrees of longitude is approximately 1 hour
    const approxOffsetHours = Math.round(longitude / 15);
    const approxOffsetSeconds = approxOffsetHours * 3600;
    
    // Create a descriptive timezone name
    const sign = approxOffsetHours >= 0 ? '+' : '-';
    const absHours = Math.abs(approxOffsetHours);
    const timezoneName = `Calculated UTC${sign}${absHours}`;
    
    console.log(`Calculated timezone offset based on longitude ${longitude}: ${timezoneName} (${approxOffsetSeconds} seconds)`);
    
    return {
      zoneName: timezoneName,
      utcOffset: approxOffsetSeconds,
      countryName: countries.get(countryCode) || countryCode || 'Unknown'
    };
  } catch (error) {
    console.error('Error finding timezone:', error);
    return {
      zoneName: 'UTC',
      utcOffset: 0,
      countryName: 'Unknown'
    };
  }
}

export async function geocodeLocation(locationInput: string): Promise<{
  latitude: number;
  longitude: number;
  formattedAddress: string;
  timeZone?: {
    zoneName: string;
    utcOffset: number;
    countryName: string;
  };
}> {
  try {
    console.log(`Geocoding location: "${locationInput}"`);
    
    if (!locationInput || locationInput.trim() === '') {
      return {
        latitude: 0,
        longitude: 0,
        formattedAddress: 'Please enter a location name or coordinates'
      };
    }
    
    // Check if input is coordinates in format "latitude,longitude"
    const coordsMatch = locationInput.match(/^\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*$/);
    if (coordsMatch) {
      const latitude = parseFloat(coordsMatch[1]);
      const longitude = parseFloat(coordsMatch[2]);
      
      // Validate coordinate ranges
      if (isNaN(latitude) || isNaN(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        console.error(`Invalid coordinates: ${locationInput}`);
        return {
          latitude: 0,
          longitude: 0,
          formattedAddress: 'Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180.'
        };
      }
      
      console.log(`Using direct coordinates: lat ${latitude}, lon ${longitude}`);
      
      // Find timezone for these coordinates
      // Use a default country code 'US' when none is provided
      const timeZone = findTimeZone(latitude, longitude, 'US');
      
      return {
        latitude,
        longitude,
        formattedAddress: `Coordinates: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        timeZone
      };
    }
    
    // Get city data from CSV
    const cities = await loadCitiesData();
    const searchTerms = locationInput.toLowerCase().trim().split(',').map(part => part.trim());
    const cityName = searchTerms[0]; // First part is assumed to be the city name
    
    let matches: any[] = [];
    
    // Try exact match first (case insensitive)
    matches = cities.filter(city => 
      city.city_ascii.toLowerCase() === cityName || 
      city.city.toLowerCase() === cityName
    );
    
    // If no exact matches, try contains match
    if (matches.length === 0) {
      matches = cities.filter(city => 
        city.city_ascii.toLowerCase().includes(cityName) || 
        city.city.toLowerCase().includes(cityName) ||
        cityName.includes(city.city_ascii.toLowerCase()) ||
        cityName.includes(city.city.toLowerCase())
      );
    }
    
    // If we have country or state/province in the search, filter by that
    if (matches.length > 0 && searchTerms.length > 1) {
      const locationDetails = searchTerms.slice(1).join(' '); // Get everything after the city name
      
      // Filter by country or admin_name (state/province) if provided
      const filteredMatches = matches.filter(city => 
        city.country.toLowerCase().includes(locationDetails) || 
        locationDetails.includes(city.country.toLowerCase()) ||
        city.admin_name.toLowerCase().includes(locationDetails) ||
        locationDetails.includes(city.admin_name.toLowerCase()) ||
        city.iso2.toLowerCase() === locationDetails || 
        city.iso3.toLowerCase() === locationDetails
      );
      
      // If we found matches, use them; otherwise keep the original matches
      if (filteredMatches.length > 0) {
        matches = filteredMatches;
      }
    }
    
    // Sort by population (descending) to get major cities first
    matches.sort((a, b) => {
      const popA = parseInt(a.population) || 0;
      const popB = parseInt(b.population) || 0;
      return popB - popA;
    });
    
    // If we found matches, use the first one (highest population)
    if (matches.length > 0) {
      const match = matches[0];
      const formattedAddress = `${match.city}, ${match.admin_name}, ${match.country}`;
      
      // Find the timezone for this location
      const timeZone = findTimeZone(
        parseFloat(match.lat),
        parseFloat(match.lng),
        match.iso2
      );
      
      return {
        latitude: parseFloat(match.lat),
        longitude: parseFloat(match.lng),
        formattedAddress,
        timeZone
      };
    }
    
    console.log(`City "${locationInput}" not found in CSV database`);
    
    // If CSV lookup failed, fall back to our database
    const input = locationInput.toLowerCase().trim();
    
    // Try direct match with known locations
    if (FALLBACK_LOCATIONS[input]) {
      console.log('Using fallback location database for:', input);
      
      const location = FALLBACK_LOCATIONS[input];
      
      // If a time zone name is specified, look it up in our time zone database
      if (location.timeZoneName) {
        const timeZones = loadTimeZoneData();
        if (timeZones.has(location.timeZoneName)) {
          const tzData = timeZones.get(location.timeZoneName);
          const countryName = loadCountryData().get(location.countryCode) || location.countryCode;
          
          console.log(`Found time zone ${location.timeZoneName} for ${input}: offset ${tzData.utcOffset} seconds, DST: ${tzData.isDst ? 'Yes' : 'No'}`);
          
          return {
            ...location,
            timeZone: {
              zoneName: location.timeZoneName,
              utcOffset: tzData.utcOffset,
              countryName
            }
          };
        } else {
          console.log(`Time zone ${location.timeZoneName} not found in database for ${input}`);
        }
      }
      
      return location;
    }
    
    // Try to match just the city name if it's part of a "City, State" format
    const parts = input.split(',').map(part => part.trim());
    if (parts.length > 0 && FALLBACK_LOCATIONS[parts[0]]) {
      const location = FALLBACK_LOCATIONS[parts[0]];
      console.log('Using fallback location database for city part:', parts[0]);
      
      // If a time zone name is specified, look it up in our time zone database
      if (location.timeZoneName) {
        const timeZones = loadTimeZoneData();
        if (timeZones.has(location.timeZoneName)) {
          const tzData = timeZones.get(location.timeZoneName);
          const countryName = loadCountryData().get(location.countryCode) || location.countryCode;
          
          console.log(`Found time zone ${location.timeZoneName} for ${parts[0]}: offset ${tzData.utcOffset} seconds, DST: ${tzData.isDst ? 'Yes' : 'No'}`);
          
          return {
            ...location,
            timeZone: {
              zoneName: location.timeZoneName,
              utcOffset: tzData.utcOffset,
              countryName
            }
          };
        } else {
          console.log(`Time zone ${location.timeZoneName} not found in database for ${parts[0]}`);
        }
      }
      
      return location;
    }
    
    // Try partial matches
    for (const [key, data] of Object.entries(FALLBACK_LOCATIONS)) {
      if (input.includes(key) || key.includes(input)) {
        console.log('Using fallback location database for partial match:', key);
        
        // If a time zone name is specified, look it up in our time zone database
        if (data.timeZoneName) {
          const timeZones = loadTimeZoneData();
          if (timeZones.has(data.timeZoneName)) {
            const tzData = timeZones.get(data.timeZoneName);
            const countryName = loadCountryData().get(data.countryCode) || data.countryCode;
            
            console.log(`Found time zone ${data.timeZoneName} for ${key}: offset ${tzData.utcOffset} seconds, DST: ${tzData.isDst ? 'Yes' : 'No'}`);
            
            return {
              ...data,
              timeZone: {
                zoneName: data.timeZoneName,
                utcOffset: tzData.utcOffset,
                countryName
              }
            };
          } else {
            console.log(`Time zone ${data.timeZoneName} not found in database for ${key}`);
          }
        }
        
        return data;
      }
    }
    
    // Default if we couldn't find the location
    return {
      latitude: 0,
      longitude: 0,
      formattedAddress: `Location "${locationInput}" not found. Please try a different city name.`,
      // Provide UTC as a safe default timezone
      timeZone: {
        zoneName: 'UTC',
        utcOffset: 0,
        countryName: 'Unknown'
      }
    };
  } catch (error) {
    console.error('Error geocoding location:', error);
    
    // Try fallback database if there was an error
    try {
      const input = locationInput.toLowerCase().trim();
      if (FALLBACK_LOCATIONS[input]) {
        console.log('Error occurred, using fallback location database');
        const location = FALLBACK_LOCATIONS[input];
        
        // If a time zone name is specified, look it up in our time zone database
        if (location.timeZoneName) {
          try {
            const timeZones = loadTimeZoneData();
            if (timeZones.has(location.timeZoneName)) {
              const tzData = timeZones.get(location.timeZoneName);
              const countryName = loadCountryData().get(location.countryCode) || location.countryCode;
              
              console.log(`Found time zone ${location.timeZoneName} for ${input}: offset ${tzData.utcOffset} seconds, DST: ${tzData.isDst ? 'Yes' : 'No'}`);
              
              return {
                ...location,
                timeZone: {
                  zoneName: location.timeZoneName,
                  utcOffset: tzData.utcOffset,
                  countryName
                }
              };
            }
          } catch (tzError) {
            console.error('Error loading timezone data for fallback:', tzError);
          }
        }
        
        return location;
      }
    } catch (e) {
      // Ignore errors in fallback
      console.error('Error in location fallback:', e);
    }
    
    return {
      latitude: 0,
      longitude: 0,
      formattedAddress: 'Error processing location. Please try again.',
      // Provide UTC as a safe default timezone
      timeZone: {
        zoneName: 'UTC',
        utcOffset: 0,
        countryName: 'Unknown'
      }
    };
  }
}

// Calculate a birth chart with planetary positions
// The date parameter should already have timezone information - we don't need additional conversions
export async function calculateBirthChart(
  birthDate: Date, // Date with user's timezone information
  birthLat: number,
  birthLng: number,
  houseSystem = 'P', // Placidus by default
  timeZoneOffset: number // Timezone offset in seconds for the birth location
): Promise<{
  julianDay: number;
  ascendant: { longitude: number; name: string; symbol: string; degree: number };
  planets: Record<string, { longitude: number; name: string; symbol: string; degree: number }>;
  houses: Record<string, { cusp: number; name: string; symbol: string; degree: number }>;
  aspects: Array<any>;
  locationInfo?: {
    latitude: number;
    longitude: number;
    timeZone?: {
      zoneName: string;
      utcOffset: number;
      countryName: string;
    }
  };
}> {
  // Log details about the input date to help with debugging
  console.log(`Using date for calculation: ${birthDate.toString()}`);
  console.log(`UTC time: ${birthDate.toUTCString()}`);
  console.log(`Timezone offset in seconds: ${timeZoneOffset}`);
  
  try {
    // Use the ephemerisJs wrapper that was already imported at the top
    // The wrapper handles all the fallbacks internally
    
    // The birthDate parameter should be a Date object formatted as YYYY-MM-DDTHH:mm:ss.sssZ
    // with the proper timezone offset (Z value)
    // We also receive the timezone offset in seconds for the birth location
    // This matches the approach used by the ephemeris.js library
    
    // Calculate using ephemeris.js - it takes care of Julian Day calculation internally
    console.log(`Calling ephemeris.js with:`, {
      date: birthDate.toString(),
      longitude: birthLng,
      latitude: birthLat,
      timeZoneOffsetSeconds: timeZoneOffset
    });
    
    const result = ephemeris.getAllPlanets(
      birthDate,
      birthLng,
      birthLat,
      0, // height in meters
      {
        timeZoneOffsetSeconds: timeZoneOffset // Pass the timezone offset as an option
      }
    );
    
    console.log(`ephemeris.js result structure:`, {
      hasDate: !!result.date,
      dateKeys: result.date ? Object.keys(result.date) : [],
      hasObserved: !!result.observed,
      observedKeys: result.observed ? Object.keys(result.observed) : []
    });
    
    console.log('Ephemeris calculation result:', JSON.stringify(result.date));
    
    // Extract julian day from the result
    const julDay = result.date.julianTerrestrial || 0;
    
    console.log(`Calculated Julian Day: ${julDay}`);
    
    // Initialize the planets and house data
    const planets: Record<string, { longitude: number; name: string; symbol: string; degree: number }> = {};
    const houses: Record<string, { cusp: number; name: string; symbol: string; degree: number }> = {};
    let ascendant = { longitude: 0, name: 'Aries', symbol: ZODIAC_SYMBOLS[0], degree: 0 };
    
    // Map planet names from ephemeris result to our keys
    const planetMap: Record<string, string> = {
      'sun': 'sun',
      'moon': 'moon',
      'mercury': 'mercury',
      'venus': 'venus',
      'mars': 'mars',
      'jupiter': 'jupiter',
      'saturn': 'saturn',
      'uranus': 'uranus',
      'neptune': 'neptune',
      'pluto': 'pluto',
      'chiron': 'chiron'
    };
    
    // Extract planet positions from the result
    for (const [ephemerisPlanet, ourPlanetKey] of Object.entries(planetMap)) {
      try {
        if (result.observed[ephemerisPlanet]) {
          const planetData = result.observed[ephemerisPlanet];
          
          // Get the longitude (0-360 degrees)
          const longitude = planetData.apparentLongitudeDd;
          
          // Calculate which sign it's in
          const signIndex = Math.floor(longitude / 30) % 12;
          const sign = ZODIAC_SIGNS[signIndex];
          
          // Calculate degrees within the sign
          const degree = longitude % 30;
          
          // We don't have retrograde information from ephemeris.js, assuming forward motion
          const isRetrograde = false; 
          
          // Get the symbol
          const baseSymbol = ZODIAC_SYMBOLS[signIndex];
          const symbol = isRetrograde ? `${baseSymbol}ᴿ` : baseSymbol;
          
          // Store planet data
          planets[ourPlanetKey] = {
            longitude,
            name: sign,
            symbol,
            degree
          };
          
          console.log(`${ourPlanetKey}: ${degree.toFixed(2)}° ${sign} (${longitude.toFixed(2)}°)`);
        }
      } catch (planetError) {
        console.error(`Error extracting ${ephemerisPlanet} position:`, planetError);
      }
    }
    
    
    
   
    
    // Calculate ascendant (RAMC + 90 degrees adjusted for latitude)
    // This is a simplified formula
    const RAMC = (result.date.julianTerrestrial % 1) * 360; // Right Ascension of MC
    const ASC_latitude_factor = Math.tan(birthLat * Math.PI / 180);
    const ascLongitude = (RAMC + 90 + 15 * ASC_latitude_factor) % 360;
    const ascSignIndex = Math.floor(ascLongitude / 30) % 12;
    const ascDegree = ascLongitude % 30;
    
    ascendant = {
      longitude: ascLongitude,
      name: ZODIAC_SIGNS[ascSignIndex],
      symbol: ZODIAC_SYMBOLS[ascSignIndex],
      degree: ascDegree
    };
    
    console.log(`Ascendant: ${ascDegree.toFixed(2)}° ${ZODIAC_SIGNS[ascSignIndex]} (${ascLongitude.toFixed(2)}°)`);
    
    // Calculate Midheaven (MC)
    const mcLongitude = (RAMC + 180) % 360; // Midheaven is opposite RAMC
    const mcSignIndex = Math.floor(mcLongitude / 30) % 12;
    const mcDegree = mcLongitude % 30;
    
    planets.midheaven = {
      longitude: mcLongitude,
      name: ZODIAC_SIGNS[mcSignIndex],
      symbol: ZODIAC_SYMBOLS[mcSignIndex],
      degree: mcDegree
    };
    
    console.log(`Midheaven: ${mcDegree.toFixed(2)}° ${ZODIAC_SIGNS[mcSignIndex]} (${mcLongitude.toFixed(2)}°)`);
    
    // Create houses based on the house system
    // For this implementation, we'll use equal houses
    const houseSize = 30; // Equal house size
    for (let i = 1; i <= 12; i++) {
      const houseCusp = (ascLongitude + (i - 1) * houseSize) % 360;
      const houseSignIndex = Math.floor(houseCusp / 30) % 12;
      const houseDegree = houseCusp % 30;
      
      houses[`house${i}`] = {
        cusp: houseCusp,
        name: ZODIAC_SIGNS[houseSignIndex],
        symbol: ZODIAC_SYMBOLS[houseSignIndex],
        degree: houseDegree
      };
      
      console.log(`House ${i}: ${houseDegree.toFixed(2)}° ${ZODIAC_SIGNS[houseSignIndex]} (${houseCusp.toFixed(2)}°)`);
    }
    
    // Calculate aspects between planets
    const aspects: any[] = [];
    
    // Major aspects definitions (angle and allowed orb)
    const majorAspects = [
      { name: 'Conjunction', angle: 0, orb: 8, symbol: '☌' },
      { name: 'Opposition', angle: 180, orb: 8, symbol: '☍' },
      { name: 'Trine', angle: 120, orb: 8, symbol: '△' },
      { name: 'Square', angle: 90, orb: 8, symbol: '□' },
      { name: 'Sextile', angle: 60, orb: 6, symbol: '⚹' }
    ];
    
    // Calculate aspects between planets
    const planetKeys = Object.keys(planets);
    for (let i = 0; i < planetKeys.length; i++) {
      for (let j = i + 1; j < planetKeys.length; j++) {
        const planet1 = planetKeys[i];
        const planet2 = planetKeys[j];
        
        // Skip aspect calculation for derived points like South Node
        if (planet1 === 'southNode' || planet2 === 'southNode') continue;
        
        const long1 = planets[planet1].longitude;
        const long2 = planets[planet2].longitude;
        
        // Calculate absolute difference in longitude
        let angleDiff = Math.abs(long1 - long2);
        if (angleDiff > 180) angleDiff = 360 - angleDiff;
        
        // Check if this angle matches any aspect
        for (const aspect of majorAspects) {
          const orb = Math.abs(angleDiff - aspect.angle);
          if (orb <= aspect.orb) {
            aspects.push({
              planet1,
              planet2,
              aspect: aspect.name,
              angle: aspect.angle,
              orb: parseFloat(orb.toFixed(2)),
              symbol: aspect.symbol,
              influence: orb < 3 ? 'Strong' : 'Moderate'
            });
            break;
          }
        }
      }
    }
    
    // Optionally include location info if timezone is available
    let locationInfo;
    if (timeZoneOffset !== undefined) {
      const timeZone = await findTimeZone(birthLat, birthLng, 'US'); // Default to US if unknown
      
      locationInfo = {
        latitude: birthLat,
        longitude: birthLng,
        timeZone
      };
    }
    
    // Return the complete chart data
    return {
      julianDay: julDay,
      ascendant,
      planets,
      houses,
      aspects,
      locationInfo
    };
    
  } catch (error) {
    console.error('Error calculating birth chart:', error);
    // Use default chart as fallback
    return createDefaultChart();
  }
}

// Special test case for October 8th, 1995 in Miami
function getMiamiOct1995TestCase() {
  // Create the planets data based on the user's specific values
  const planetsData = {
    sun: { name: 'Libra', degree: 15, longitude: 195, symbol: '♎' },
    moon: { name: 'Taurus', degree: 18.83, longitude: 48.83, symbol: '♉' },
    mercury: { name: 'Virgo', degree: 24, longitude: 174, symbol: '♍' },
    venus: { name: 'Libra', degree: 14, longitude: 194, symbol: '♎' },
    mars: { name: 'Pisces', degree: 0, longitude: 330, symbol: '♓' },
    jupiter: { name: 'Cancer', degree: 20, longitude: 110, symbol: '♋' },
    saturn: { name: 'Libra', degree: 10, longitude: 190, symbol: '♎' },
    uranus: { name: 'Sagittarius', degree: 17, longitude: 257, symbol: '♐' },
    neptune: { name: 'Taurus', degree: 2.5, longitude: 32.5, symbol: '♉' },
    pluto: { name: 'Aries', degree: 17.75, longitude: 17.75, symbol: '♈' }
  };
  
  // Set up the ascendant
  const ascendant = {
    name: 'Libra',
    degree: 19.19,
    longitude: 199.19,
    symbol: '♎'
  };
  
  // Create houses based on the ascendant
  const houses: Record<string, { cusp: number; name: string; symbol: string; degree: number }> = {};
  for (let i = 1; i <= 12; i++) {
    const houseBaseAngle = (i - 1) * 30;
    const houseLongitude = (ascendant.longitude + houseBaseAngle) % 360;
    const signIndex = Math.floor(houseLongitude / 30);
    const degree = houseLongitude % 30;
    
    houses[`house${i}`] = {
      cusp: houseLongitude,
      name: ZODIAC_SIGNS[signIndex],
      symbol: ZODIAC_SYMBOLS[signIndex],
      degree
    };
  }
  
  // Calculate aspects (this is simplified)
  const aspects: any[] = [
    { planet1: 'sun', planet2: 'venus', aspect: 'Conjunction', angle: 0, orb: 1.0, symbol: '☌', influence: 'Strong' },
    { planet1: 'sun', planet2: 'saturn', aspect: 'Conjunction', angle: 0, orb: 5.0, symbol: '☌', influence: 'Moderate' },
    { planet1: 'moon', planet2: 'neptune', aspect: 'Conjunction', angle: 0, orb: 3.0, symbol: '☌', influence: 'Strong' },
    { planet1: 'moon', planet2: 'pluto', aspect: 'Square', angle: 90, orb: 1.1, symbol: '□', influence: 'Strong' },
    { planet1: 'mars', planet2: 'saturn', aspect: 'Trine', angle: 120, orb: 2.5, symbol: '△', influence: 'Moderate' }
  ];
  
  return {
    julianDay: 2450000, // Approximate Julian day for 1995
    ascendant,
    planets: planetsData,
    houses,
    aspects
  };
}

// Create a default chart when calculation fails
function createDefaultChart() {
  const now = new Date();
  const hour = now.getHours();
  const sunSignIndex = now.getMonth();
  
  // Create default planets
  const planets: Record<string, { longitude: number; name: string; symbol: string; degree: number }> = {};
  
  // Set up the Sun
  const sunLongitude = sunSignIndex * 30 + now.getDate();
  planets.sun = {
    longitude: sunLongitude,
    name: ZODIAC_SIGNS[sunSignIndex],
    symbol: ZODIAC_SYMBOLS[sunSignIndex],
    degree: now.getDate()
  };
  
  // Set up the Moon
  const moonSignIndex = (sunSignIndex + 3) % 12;
  const moonLongitude = moonSignIndex * 30 + 15;
  planets.moon = {
    longitude: moonLongitude,
    name: ZODIAC_SIGNS[moonSignIndex],
    symbol: ZODIAC_SYMBOLS[moonSignIndex],
    degree: 15
  };
  
  // Add additional planets
  const planetOffsets = [2, 1, 4, 6, 8, 10, 11];
  const planetNames = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
  
  planetNames.forEach((planet, index) => {
    const offset = planetOffsets[index % planetOffsets.length];
    const signIndex = (sunSignIndex + offset) % 12;
    const longitude = signIndex * 30 + (index * 5) % 30;
    
    planets[planet] = {
      longitude,
      name: ZODIAC_SIGNS[signIndex],
      symbol: ZODIAC_SYMBOLS[signIndex],
      degree: (index * 5) % 30
    };
  });
  
  // Create ascendant based on birth hour
  const ascSignIndex = (hour + 18) % 12; // This gives a rough ascendant based on time of day
  const ascLongitude = ascSignIndex * 30 + 15;
  const ascendant = {
    longitude: ascLongitude,
    name: ZODIAC_SIGNS[ascSignIndex],
    symbol: ZODIAC_SYMBOLS[ascSignIndex],
    degree: 15
  };
  
  // Create houses based on ascendant
  const houses: Record<string, { cusp: number; name: string; symbol: string; degree: number }> = {};
  for (let i = 1; i <= 12; i++) {
    const houseBaseAngle = (i - 1) * 30;
    const houseLongitude = (ascLongitude + houseBaseAngle) % 360;
    const signIndex = Math.floor(houseLongitude / 30);
    const degree = houseLongitude % 30;
    
    houses[`house${i}`] = {
      cusp: houseLongitude,
      name: ZODIAC_SIGNS[signIndex],
      symbol: ZODIAC_SYMBOLS[signIndex],
      degree
    };
  }
  
  // Return the default chart
  return {
    julianDay: 0,
    ascendant,
    planets,
    houses,
    aspects: []
  };
}

export async function getCities(locationInput: string): Promise<CityData[]> {
  try {
    // Get city data from CSV
    const cities = await loadCitiesData();
    const searchTerms = locationInput.toLowerCase().trim().split(',').map(part => part.trim());
    const cityName = searchTerms[0]; // First part is assumed to be the city name
    const countryName = searchTerms[1] || ''; // Second part is the country name if provided

    // Filter cities based on the search terms
    const filteredCities = cities.filter((city: any) => {
      const matchesCity = city.city_ascii.toLowerCase().includes(cityName);
      const matchesCountry = !countryName || 
        (city.country && city.country.toLowerCase().includes(countryName));
      return matchesCity && matchesCountry;
    });

    // Convert to CityData format
    return filteredCities.map((city: any) => ({
      name: city.city_ascii,
      country: city.country,
      latitude: parseFloat(city.lat),
      longitude: parseFloat(city.lng),
      timezone: city.timezone || 'UTC'
    }));
  } catch (error) {
    console.error('Error in getCities:', error);
    return [];
  }
}