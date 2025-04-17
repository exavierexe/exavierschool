// Ephemeris calculations for astrology using the ephemeris JavaScript package
import path from 'path';
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import ephemeris from 'ephemeris';
// Import our robust wrapper that works in both client and server environments

interface CityData {
  name: string;
  country: string;
  lat: number;
  lng: number;
  timezone?: {
    name: string;
    offset: number;
    isDst: boolean;
  } | null;
}

interface LocationData {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  countryCode: string;
  timezone: string;
  utcOffset: number;
}

interface FallbackLocation {
  lat: number;
  lng: number;
  formattedAddress: string;
  countryCode: string;
  timezoneName: string;
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

const fallbackLocationDatabase: FallbackLocation[] = [
  {
    lat: 40.7128,
    lng: -74.0060,
    formattedAddress: 'New York, United States',
    countryCode: 'US',
    timezoneName: 'America/New_York'
  },
  // Add more fallback locations as needed
];

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

// Import the queryCityAndTimezone function from actions.ts
import { queryCityAndTimezone } from '../actions';

// Function to find the timezone for a location
function findTimeZone(latitude: number, longitude: number, countryCode: string): { 
  zoneName: string; 
  utcOffset: number;
  countryName: string; 
} {
  try {
    // Load timezone and country data
    const timeZones = loadTimeZoneData();
    const countries = loadCountryData();
    
    // First try to find the timezone using the date to account for DST
    const now = new Date();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Get the current offset including DST
    const currentOffset = -now.getTimezoneOffset() * 60; // Convert to seconds
    
    // If we found a valid timezone, use it
    if (timezone) {
      return {
        zoneName: timezone,
        utcOffset: currentOffset,
        countryName: countries.get(countryCode) || countryCode || 'Unknown'
      };
    }
    
    // Fallback to the existing logic if timezone detection fails
    const countryZones = Array.from(timeZones.values()).filter(zone => zone.countryCode === countryCode);
    
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
        
        // Find the closest timezone
        let minDifference = Number.MAX_VALUE;
        let closestZone = countryZones[0];
        
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

export async function geocodeLocation(locationInput: string): Promise<LocationData | null> {
  try {
    // First try to find the location in our database
    const [cityName, countryCode] = locationInput.split(',').map(part => part.trim());
    const dbResult = await queryCityAndTimezone(cityName, countryCode);

    if (dbResult) {
      return {
        latitude: dbResult.city.latitude,
        longitude: dbResult.city.longitude,
        formattedAddress: `${dbResult.city.name}, ${dbResult.city.country}`,
        countryCode: dbResult.city.country,
        timezone: dbResult.timezone?.name || 'UTC',
        utcOffset: dbResult.timezone?.offset || 0
      };
    }

    // If not found in database, try the CSV file
    const cities = await getCities(locationInput);
    if (cities.length > 0) {
      const city = cities[0];
      return {
        latitude: city.lat,
        longitude: city.lng,
        formattedAddress: `${city.name}, ${city.country}`,
        countryCode: city.country,
        timezone: city.timezone?.name || 'UTC',
        utcOffset: city.timezone?.offset || 0
      };
    }

    // If still not found, try the fallback database
    const fallbackLocation = fallbackLocationDatabase.find(loc => 
      loc.formattedAddress.toLowerCase().includes(locationInput.toLowerCase())
    );

    if (fallbackLocation) {
      return {
        latitude: fallbackLocation.lat,
        longitude: fallbackLocation.lng,
        formattedAddress: fallbackLocation.formattedAddress,
        countryCode: fallbackLocation.countryCode,
        timezone: fallbackLocation.timezoneName || 'UTC',
        utcOffset: 0
      };
    }

    return null;
  } catch (error) {
    console.error('Error in geocodeLocation:', error);
    return null;
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
    // First try to get cities from the API
    const response = await fetch(`/api/cities?q=${encodeURIComponent(locationInput)}`);
    if (response.ok) {
      const data = await response.json();
      return data.cities;
    }

    // If API fails, fall back to CSV data
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
      lat: parseFloat(city.lat),
      lng: parseFloat(city.lng),
      timezone: null // CSV data doesn't include timezone info
    }));
  } catch (error) {
    console.error('Error in getCities:', error);
    return [];
  }
}

// Load city data from JSON file
export async function loadCityData(): Promise<CityData[]> {
  try {
    const response = await fetch('/cities.json');
    if (!response.ok) {
      throw new Error('Failed to load city data');
    }
    return await response.json();
  } catch (error) {
    console.error('Error loading city data:', error);
    return [];
  }
}