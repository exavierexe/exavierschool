"use server";
import { neon } from "@neondatabase/serverless";
import prisma from "./lib/prisma";
import { revalidatePath } from "next/cache";
import { calculateBirthChart as calculateEphemerisChart, geocodeLocation } from './lib/ephemeris';
import chartascendant from "./lib/astronomia"
// No need for execSync since we're using WebAssembly version
import path from 'path';
// We still need fs for loading city data, but this will be removed in future

// Time zone boundaries (approximate, simplified)
const TIME_ZONE_BOUNDARIES = [
  { min: -180, max: -165, name: 'UTC-12:00' },
  { min: -165, max: -150, name: 'UTC-11:00' },
  { min: -150, max: -135, name: 'UTC-10:00' },
  { min: -135, max: -120, name: 'UTC-09:00' },
  { min: -120, max: -105, name: 'UTC-08:00' },
  { min: -105, max: -90, name: 'UTC-07:00' },
  { min: -90, max: -75, name: 'UTC-06:00' },
  { min: -75, max: -60, name: 'UTC-05:00' },
  { min: -60, max: -45, name: 'UTC-04:00' },
  { min: -45, max: -30, name: 'UTC-03:00' },
  { min: -30, max: -15, name: 'UTC-02:00' },
  { min: -15, max: 0, name: 'UTC-01:00' },
  { min: 0, max: 15, name: 'UTC+00:00' },
  { min: 15, max: 30, name: 'UTC+01:00' },
  { min: 30, max: 45, name: 'UTC+02:00' },
  { min: 45, max: 60, name: 'UTC+03:00' },
  { min: 60, max: 75, name: 'UTC+04:00' },
  { min: 75, max: 90, name: 'UTC+05:00' },
  { min: 90, max: 105, name: 'UTC+06:00' },
  { min: 105, max: 120, name: 'UTC+07:00' },
  { min: 120, max: 135, name: 'UTC+08:00' },
  { min: 135, max: 150, name: 'UTC+09:00' },
  { min: 150, max: 165, name: 'UTC+10:00' },
  { min: 165, max: 180, name: 'UTC+11:00' },
  { min: 180, max: 195, name: 'UTC+12:00' }
];

interface City {
  city: string;
  country: string;
  iso2: string;
  lat: string;
  lng: string;
}

//export function getData() {
//    const sql = neon(process.env.DATABASE_URL);
 //   const data = await sql`...`;
   // return data;
//}

export const addUser = async (formData: FormData) => {
    const uname = formData.get("uname") as string;
    const phone = formData.get("phone") as string;
    const email = formData.get("email") as string;
    const birthday = formData.get("birthday") as string;
    const time = formData.get("time") as string;
    const location = formData.get("location") as string;
    const questions = formData.get("questions") as string;
    const rtype = formData.get("rtype") as string;
    const price = formData.get("price") as string;
    
    await prisma.user.create({
      data: {
        uname: uname as string,
        phone: phone as string,
        email: email as string,
        birthday: birthday as string,
        time: time as string,
        location: location as string,
        questions: questions as string,
        rtype: rtype as string,
        price: price as string
      },
    });
  };



// Tarot Reading Actions



// Save a tarot reading
export const saveTarotReading = async (formData: FormData) => {
  try {
    const name = formData.get("name") as string;
    const spreadType = formData.get("spreadType") as string;
    const cards = formData.get("cards") as string;
    const question = formData.get("question") as string;
    const notes = formData.get("notes") as string;
    const userId = formData.get("userId") as string;
    
    if (!name || !spreadType || !cards) {
      return {
        success: false,
        error: "Missing required fields for tarot reading."
      };
    }
    
    // Parse the cards JSON data
    let parsedCards;
    try {
      parsedCards = JSON.parse(cards);
    } catch (e) {
      return {
        success: false,
        error: "Invalid card data format."
      };
    }
    
    // Create the tarot reading in the database
    const reading = await prisma.tarotReading.create({
      data: {
        name,
        spreadType,
        cards: parsedCards,
        question: question || null,
        notes: notes || null,
        userId: userId ? parseInt(userId) : null,
      }
    });
    
    revalidatePath('/divination');
    return { success: true, readingId: reading.id };
  } catch (error) {
    console.error("Error saving tarot reading:", error);
    return { 
      success: false, 
      error: "Failed to save tarot reading. Please try again."
    };
  }
};

// Get all tarot readings
export const getTarotReadings = async (userId?: number) => {
  try {
    const where = userId ? { userId } : {};
    const readings = await prisma.tarotReading.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    return readings;
  } catch (error) {
    console.error("Error fetching tarot readings:", error);
    return [];
  }
};

// Get a specific tarot reading by ID
export const getTarotReadingById = async (readingId: number) => {
  try {
    const reading = await prisma.tarotReading.findUnique({
      where: { id: readingId }
    });
    return reading;
  } catch (error) {
    console.error("Error fetching tarot reading:", error);
    return null;
  }
};

// Delete a tarot reading
export const deleteTarotReading = async (readingId: number) => {
  try {
    await prisma.tarotReading.delete({
      where: { id: readingId }
    });
    revalidatePath('/divination');
    return { success: true };
  } catch (error) {
    console.error("Error deleting tarot reading:", error);
    return { success: false, error: "Failed to delete tarot reading." };
  }
};

// Swiss Ephemeris Direct Query Tool

// Execute a direct query to Swiss Ephemeris
export const querySwissEph = async (params: {
  date: string;
  time: string;
  location: string;
}) => {
  try {
    const { date, time, location } = params;
    
    // Validate input
    const dateRegex = /^\d{1,2}\.\d{1,2}\.\d{4}$/;
    const timeRegex = /^\d{1,2}:\d{1,2}(:\d{1,2})?$/;
    
    if (!dateRegex.test(date)) {
      return {
        output: '',
        error: 'Invalid date format. Please use DD.MM.YYYY format (e.g., 08.10.1995).'
      };
    }
    
    if (!timeRegex.test(time)) {
      return {
        output: '',
        error: 'Invalid time format. Please use HH:MM or HH:MM:SS format (e.g., 19:56).'
      };
    }
    
    if (!location || location.trim() === '') {
      return {
        output: '',
        error: 'Please enter a location (city name).'
      };
    }
    
    // Geocode the provided location
    const geocodedLocation = await geocodeLocation(location);
    
    // Parse date and time with validation
    const [day, month, year] = date.split('.').map(Number);
    const [hour, minute, second = 0] = time.split(':').map(Number);
    
    // Validate time values
    if (isNaN(hour) || hour < 0 || hour > 23 || isNaN(minute) || minute < 0 || minute > 59 || isNaN(second) || second < 0 || second > 59) {
      return {
        output: '',
        error: 'Invalid time value. Hours must be 0-23, minutes and seconds must be 0-59.'
      };
    }
    
    // Get the time zone information for the location
    let timeZoneInfo;
    
    // Use the timeZone information from geocodeLocation if available
    if (geocodedLocation.timeZone) {
      console.log(`Using TimeZoneDB data: ${geocodedLocation.timeZone.zoneName}, UTC offset: ${geocodedLocation.timeZone.utcOffset} seconds`);
      
      // Convert seconds to hours and minutes for display
      const totalMinutes = geocodedLocation.timeZone.utcOffset / 60;
      const offsetHours = Math.floor(Math.abs(totalMinutes) / 60) * (totalMinutes >= 0 ? 1 : -1);
      const offsetMinutes = Math.abs(totalMinutes) % 60;
      
      // Format timezone name with sign
      const tzSignA = totalMinutes >= 0 ? '+' : '-';
      const formattedHours = Math.abs(offsetHours).toString().padStart(2, '0');
      const formattedMinutes = Math.abs(offsetMinutes).toString().padStart(2, '0');
      console.log(tzSignA)
      console.log(formattedHours)
      console.log(formattedMinutes)
      
      timeZoneInfo = {
        name: `${geocodedLocation.timeZone.zoneName} (UTC${tzSignA}${formattedHours}:${formattedMinutes})`,
        offsetHours,
        offsetMinutes: offsetMinutes * (totalMinutes >= 0 ? 1 : -1),
        totalOffsetMinutes: totalMinutes
        
      };
      
    } else {
      // Fall back to the longitude-based method
      timeZoneInfo = await determineTimeZone(geocodedLocation.longitude, geocodedLocation.latitude);
    }
    
    console.log(`Time zone: ${timeZoneInfo.name}, offset: ${timeZoneInfo.offsetHours}:${Math.abs(timeZoneInfo.offsetMinutes).toString().padStart(2, '0')}`);
    console.log(hour)
    console.log(minute)
    // Get the timezone offset in hours and minutes for display
    let totalOffsetMinutes = 0;
    let offsetHours = 0;
    let offsetMinutes = 0;

    if (geocodedLocation.timeZone && geocodedLocation.timeZone.utcOffset) {
      totalOffsetMinutes = geocodedLocation.timeZone.utcOffset / 60;
      offsetHours = Math.floor(Math.abs(totalOffsetMinutes) / 60) * (totalOffsetMinutes >= 0 ? 1 : -1);
      offsetMinutes = Math.abs(totalOffsetMinutes) % 60;
    } else {
      // Fallback to longitude-based calculation
      const approxOffsetHours = Math.round(geocodedLocation.longitude / 15);
      totalOffsetMinutes = approxOffsetHours * 60;
      offsetHours = approxOffsetHours;
      offsetMinutes = 0;
    }
    
    // Format timezone values for display
    const tzSignA = totalOffsetMinutes >= 0 ? '+' : '-';
    const formattedHours = Math.abs(offsetHours).toString().padStart(2, '0');
    const formattedMinutes = Math.abs(offsetMinutes).toString().padStart(2, '0');
    
    // Create a Date object with the local birth time (not UTC)
    // The ephemeris.js library expects a Date object with the birth time in local time
    // When we pass this Date object to the ephemeris library alongside the longitude/latitude
    // the library will handle the astronomical calculations correctly
    console.log("start")
    console.log(tzSignA)
    console.log(formattedHours)
    console.log(formattedMinutes)
    const formattedDay = day.toString().padStart(2, '0')
    const formattedMonth = month.toString().padStart(2, '0')
    const formattedYear = year.toString().padStart(4, '0')
    const dateObj = new Date(`${formattedYear}`+"-"+`${formattedMonth}`+"-"+`${formattedDay}`+"T"+`${hour}`+":"+`${minute}`+":00"+`${tzSignA}`+`${formattedHours}`+":"+`${formattedMinutes}`);
    
    
    console.log(dateObj)
    
    console.log(`${year}`+"-"+`${month}`+"-"+`${day}`+"T"+`${hour}`+":"+`${minute}`+":00"+`${tzSignA}`+`${formattedHours}`+":"+`${formattedMinutes}`)
    
    console.log(hour)
    console.log(minute)
    console.log(timeZoneInfo.offsetHours)
    
    // Store the timezone offset information separately to pass to the ephemeris calculation
    const timeZoneOffsetSeconds = geocodedLocation.timeZone.utcOffset;
    
    console.log(`Input local time: ${year}-${month}-${day} ${hour}:${minute}:${second}`);
    console.log(`Timezone offset: ${offsetHours} hours, ${offsetMinutes} minutes (${totalOffsetMinutes} minutes total)`);
    console.log(`Timezone offset in seconds: ${timeZoneOffsetSeconds}`);
    console.log(`Parsed Date object (local time): ${dateObj.toString()}`);
    console.log(`UTC representation: ${dateObj.toUTCString()}`);
    
    // Use our robust wrapper for ephemeris calculations in serverless environments
    // This will automatically handle fallbacks if the module isn't available
    // For server components/actions, we use the server-side implementation
    const ephemerisJs = require('./lib/server-ephemeris');
    console.log(hour)
    console.log(minute)
    
    const ascendantobj = chartascendant(formattedYear, formattedMonth, formattedDay, hour, minute, geocodedLocation.latitude, geocodedLocation.longitude)
    const ascendantdegree = ascendantobj.ascdegree
    const ascendantsign = ascendantobj.ascsign
    const ascendantdecimal = ascendantobj.decimaldegree
    // *** THIS IS THE DATEOBJ FROM LINE 298 THAT SHOULD BE USED FOR ALL CHART CALCULATIONS ***
    
    // Calculate the positions using ephemeris.js with dateObj from line 298
    // The original dateObj is passed directly without any manipulation
    console.log("calculation")
    console.log(dateObj)
    console.log(ascendantdegree)
    console.log(ascendantdecimal)
    const result = ephemerisJs.getAllPlanets(
      dateObj, // This is THE dateObj from line 298, used directly
      geocodedLocation.longitude,
      geocodedLocation.latitude,
      0 // height in meters
      
    );
  
    
    
    // Extract Julian Day from result
    const julDay = result.date.julianTerrestrial || 0;
    
    // Calculate positions for the main planets
    const planetData: any = {};
    
    // Define planets to calculate
    const planets = [
      { id: 'sun', name: 'Sun' },
      { id: 'moon', name: 'Moon' },
      { id: 'mercury', name: 'Mercury' },
      { id: 'venus', name: 'Venus' },
      { id: 'mars', name: 'Mars' },
      { id: 'jupiter', name: 'Jupiter' },
      { id: 'saturn', name: 'Saturn' },
      { id: 'uranus', name: 'Uranus' },
      { id: 'neptune', name: 'Neptune' },
      { id: 'pluto', name: 'Pluto' },
      { id: 'chiron', name: 'Chiron' }
    ];
    
    // The zodiac signs array
    const zodiacSigns = [
      'Aries', 'Taurus', 'Gemini', 'Cancer',
      'Leo', 'Virgo', 'Libra', 'Scorpio',
      'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
    ];
    
    // Extract the position of each planet
    for (const planet of planets) {
      try {
        if (result.observed[planet.id]) {
          const planetResult = result.observed[planet.id];
          
          // Get longitude from the result
          const longitude = planetResult.apparentLongitudeDd;
          const signIndex = Math.floor(longitude / 30) % 12;
          const degree = longitude % 30;
          
          // Ephemeris.js doesn't provide speed data, so we don't know if it's retrograde
          const retrograde = false;
          
          const sign = zodiacSigns[signIndex];
          
          // Format the position output similar to Swiss Ephemeris command line tool
          const minutes = Math.floor((degree - Math.floor(degree)) * 60);
          const seconds = Math.floor(((degree - Math.floor(degree)) * 60 - minutes) * 60);
          
          planetData[planet.name] = {
            longitude,
            sign,
            degree: Math.floor(degree),
            minutes,
            seconds,
            retrograde,
            formattedPosition: `${Math.floor(degree)}° ${sign} ${minutes}' ${seconds.toFixed(1)}" ${retrograde ? 'R' : ''}`
          };
        }
      } catch (err) {
        console.error(`Error calculating ${planet.name} position:`, err);
      }
    }
    
    // Calculate mean nodes (not provided by ephemeris.js directly)
    try {
      // Approximation based on standard formulas
      const T = (julDay - 2451545.0) / 36525; // Julian centuries since J2000.0
      const meanNodeLongitude = 125.04452 - 1934.136261 * T + 0.0020708 * T * T + T * T * T / 450000;
      // Normalize to 0-360 range
      const normalizedNodeLong = ((meanNodeLongitude % 360) + 360) % 360;
      
      // Mean Node
      const meanNodeSignIndex = Math.floor(normalizedNodeLong / 30) % 12;
      const meanNodeDegree = normalizedNodeLong % 30;
      const meanNodeMinutes = Math.floor((meanNodeDegree - Math.floor(meanNodeDegree)) * 60);
      const meanNodeSeconds = Math.floor(((meanNodeDegree - Math.floor(meanNodeDegree)) * 60 - meanNodeMinutes) * 60);
      
      planetData['Mean Node'] = {
        longitude: normalizedNodeLong,
        sign: zodiacSigns[meanNodeSignIndex],
        degree: Math.floor(meanNodeDegree),
        minutes: meanNodeMinutes,
        seconds: meanNodeSeconds,
        retrograde: false,
        formattedPosition: `${Math.floor(meanNodeDegree)}° ${zodiacSigns[meanNodeSignIndex]} ${meanNodeMinutes}' ${meanNodeSeconds.toFixed(1)}"`
      };
      
      // For this implementation, True Node is same as Mean Node
      planetData['True Node'] = planetData['Mean Node'];
      
    } catch (err) {
      console.error('Error calculating nodes:', err);
    }
    
    // Calculate house cusps if coordinates are available
    let houseData: any = {};
    
    if (geocodedLocation.latitude !== 0 || geocodedLocation.longitude !== 0) {
      try {

           /// get the real ascendant... might have to fix something up there
    const ascendantobj = chartascendant(formattedYear, formattedMonth, formattedDay, hour, minute, geocodedLocation.latitude, geocodedLocation.longitude)
    const ascendantdegree = ascendantobj.ascdegree
    const ascendantsign = ascendantobj.ascsign
    const ascendantdecimal = ascendantobj.decimaldegree
        
        
        // Ascendant
        const ascLongitude = ascendantdecimal;
        const ascSignIndex = Math.floor(ascendantdecimal / 30) % 12;
       
      

      
        
        houseData['Ascendant'] = {
          longitude: ascLongitude,
          sign: zodiacSigns[ascSignIndex],
          degree: ascendantdegree,
          formattedPosition: `${ascendantdegree} ${zodiacSigns[ascSignIndex]}`
        };
        
        
    
        
        
        // Calculate house cusps using equal house system
        // Each house is 30 degrees, starting from the Ascendant
        for (let i = 1; i <= 12; i++) {
          const houseCusp = (ascLongitude + (i - 1) * 30) % 360;
          const houseSignIndex = Math.floor(houseCusp / 30) % 12;
          const houseDegree = houseCusp % 30;
          const houseMinutes = Math.floor((houseDegree - Math.floor(houseDegree)) * 60);
          const houseSeconds = Math.floor(((houseDegree - Math.floor(houseDegree)) * 60 - houseMinutes) * 60);
          
          houseData[`House ${i}`] = {
            longitude: houseCusp,
            sign: zodiacSigns[houseSignIndex],
            degree: Math.floor(houseDegree),
            minutes: houseMinutes,
            seconds: houseSeconds,
            formattedPosition: `${Math.floor(houseDegree)}° ${zodiacSigns[houseSignIndex]} ${houseMinutes}' ${houseSeconds.toFixed(1)}"`
          };
        }
        
      } catch (err) {
        console.error('Error calculating houses:', err);
      }
    }
    
    // Format the output to look similar to the original Swiss Ephemeris output
    let formattedOutput = '';
    
    // Add planet positions
    formattedOutput += 'Planets:\n';
    for (const [name, data] of Object.entries(planetData)) {
      // Add type assertion to handle 'unknown' type
      const typedData = data as { formattedPosition: string };
      formattedOutput += `${name.padEnd(12)} ${typedData.formattedPosition}\n`;
    }
    
    // Add house cusps if available
    if (Object.keys(houseData).length > 0) {
      formattedOutput += '\nHouses:\n';
      
      // First add special points
      if (houseData['Ascendant']) {
        const ascData = houseData['Ascendant'] as { formattedPosition: string };
        formattedOutput += `Ascendant    ${ascData.formattedPosition}\n`;
      }
      
    
      
      // Then add house cusps
      for (let i = 1; i <= 12; i++) {
        const houseKey = `House ${i}`;
        if (houseData[houseKey]) {
          const houseData2 = houseData[houseKey] as { formattedPosition: string };
          formattedOutput += `house ${i.toString().padStart(2)}     ${houseData2.formattedPosition}\n`;
        }
      }
    }
    
    // Get UTC date and time components
    let utcDateStr, utcTimeStr;
    
    // Check if universalDate is available, otherwise fall back to dateObj
    if (result.date && result.date.universalDateString) {
      // Parse from the string format '10.8.2015 17:7:52.983'
      const dateParts = result.date.universalDateString.split(' ');
      if (dateParts.length >= 2) {
        utcDateStr = dateParts[0]; // e.g. '10.8.2015'
        utcTimeStr = dateParts[1]; // e.g. '17:7:52.983'
      }
    } 
    
    // If we couldn't get the universal date string, use the dateObj
    if (!utcDateStr || !utcTimeStr) {
      const utcDay = dateObj.getUTCDate().toString().padStart(2, '0');
      const utcMonth = (dateObj.getUTCMonth() + 1).toString().padStart(2, '0');
      const utcYear = dateObj.getUTCFullYear();
      const utcHour = dateObj.getUTCHours().toString().padStart(2, '0');
      const utcMinute = dateObj.getUTCMinutes().toString().padStart(2, '0');
      const utcSecond = dateObj.getUTCSeconds().toString().padStart(2, '0');
      
      utcDateStr = `${utcDay}.${utcMonth}.${utcYear}`;
      utcTimeStr = `${utcHour}:${utcMinute}:${utcSecond}`;
    }
    
    // Add location information to the output
    const timezoneInfoText = geocodedLocation.timeZone ? 
      `Time Zone: ${geocodedLocation.timeZone.zoneName} (${geocodedLocation.timeZone.countryName})` :
      `Time Zone: ${timeZoneInfo.name}`;
      
    const locationInfo = `
Date (Local): ${date}
Time (Local): ${time}
Date (UTC): ${utcDateStr}
Time (UTC): ${utcTimeStr}
Location: ${geocodedLocation.formattedAddress}
${timezoneInfoText}
Latitude: ${geocodedLocation.latitude.toFixed(4)}° ${geocodedLocation.latitude >= 0 ? 'N' : 'S'}
Longitude: ${geocodedLocation.longitude.toFixed(4)}° ${geocodedLocation.longitude >= 0 ? 'E' : 'W'}
Julian Day: ${julDay.toFixed(6)}

---- JAVASCRIPT EPHEMERIS OUTPUT ----
${formattedOutput}`;
    
    return { output: locationInfo };
  } catch (error: any) {
    console.error('Error executing ephemeris calculation:', error);
    return {
      output: '',
      error: `Error: ${error.message}`
    };
  }
};

// Birth Chart Calculator Actions

/**
 * Converts raw ephemeris.js result to chart data format
 * This function takes the raw output from ephemeris.js and converts it to our ChartData format
 */
function convertEphemerisResultToChartData(result: any, geocodedLocation: any) {
  // The zodiac signs array
  const zodiacSigns = [
    'Aries', 'Taurus', 'Gemini', 'Cancer',
    'Leo', 'Virgo', 'Libra', 'Scorpio',
    'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
  ];

  // Initialize the chart data structure
  const planets: Record<string, any> = {};
  const houses: Record<string, any> = {};
  let ascendant = { name: 'Aries', symbol: '♈', longitude: 0, degree: 0 };

  // Define planets to extract
  const planetList = [
    { id: 'sun', name: 'Sun' },
    { id: 'moon', name: 'Moon' },
    { id: 'mercury', name: 'Mercury' },
    { id: 'venus', name: 'Venus' },
    { id: 'mars', name: 'Mars' },
    { id: 'jupiter', name: 'Jupiter' },
    { id: 'saturn', name: 'Saturn' },
    { id: 'uranus', name: 'Uranus' },
    { id: 'neptune', name: 'Neptune' },
    { id: 'pluto', name: 'Pluto' },
    { id: 'chiron', name: 'Chiron' }
  ];

  // Extract planet data
  for (const planet of planetList) {
    if (result.observed[planet.id]) {
      const planetData = result.observed[planet.id];
      
      // Get longitude from the result
      const longitude = planetData.apparentLongitudeDd;
      const signIndex = Math.floor(longitude / 30) % 12;
      const degree = longitude % 30;
      
      const sign = zodiacSigns[signIndex];
      
      planets[planet.id] = {
        name: sign,
        symbol: getZodiacSymbol(signIndex),
        longitude,
        degree
      };
    }
  }

  // Calculate mean nodes (not provided by ephemeris.js directly)
  try {
    // Approximation based on standard formulas
    const julDay = result.date.julianTerrestrial || 0;
    const T = (julDay - 2451545.0) / 36525; // Julian centuries since J2000.0
    const meanNodeLongitude = 125.04452 - 1934.136261 * T + 0.0020708 * T * T + T * T * T / 450000;
    // Normalize to 0-360 range
    const normalizedNodeLong = ((meanNodeLongitude % 360) + 360) % 360;
    
    // Mean Node
    const meanNodeSignIndex = Math.floor(normalizedNodeLong / 30) % 12;
    const meanNodeDegree = normalizedNodeLong % 30;
    
    planets['meanNode'] = {
      name: zodiacSigns[meanNodeSignIndex],
      symbol: '☊',
      longitude: normalizedNodeLong,
      degree: meanNodeDegree
    };
    
    planets['trueNode'] = planets['meanNode'];
    
    // Calculate South Node (always opposite to North Node)
    const southNodeLong = (normalizedNodeLong + 180) % 360;
    const southNodeSignIndex = Math.floor(southNodeLong / 30) % 12;
    const southNodeDegree = southNodeLong % 30;
    
    planets['southNode'] = {
      name: zodiacSigns[southNodeSignIndex],
      symbol: '☋',
      longitude: southNodeLong,
      degree: southNodeDegree
    };
  } catch (err) {
    console.error('Error calculating nodes:', err);
  }

  // Calculate house cusps if coordinates are available
  if (geocodedLocation.latitude !== 0 || geocodedLocation.longitude !== 0) {
    try {


             /// get the real ascendant... might have to fix something up there
    const ascendantobj = chartascendant(formattedYear, formattedMonth, formattedDay, hour, minute, geocodedLocation.latitude, geocodedLocation.longitude)
    const ascendantdegree = ascendantobj.ascdegree
    const ascendantsign = ascendantobj.ascsign
    const ascendantdecimal = ascendantobj.decimaldegree
        
        
        // Ascendant
        const ascLongitude = ascendantdecimal;
        const ascSignIndex = Math.floor(ascendantdecimal / 30) % 12;
       
      
      // Ascendant
     
      
      
      ascendant = {
        name: zodiacSigns[ascSignIndex],
        symbol: getZodiacSymbol(ascSignIndex),
        longitude: ascendantdecimal,
        degree: ascendantdegree
      };
      
      
      
      
      
      // Calculate house cusps using equal house system
      // Each house is 30 degrees, starting from the Ascendant
      for (let i = 1; i <= 12; i++) {
        const houseCusp = (ascLongitude + (i - 1) * 30) % 360;
        const houseSignIndex = Math.floor(houseCusp / 30) % 12;
        const houseDegree = houseCusp % 30;
        
        houses[`house${i}`] = {
          cusp: houseCusp,
          name: zodiacSigns[houseSignIndex],
          symbol: getZodiacSymbol(houseSignIndex),
          degree: houseDegree
        };
      }
    } catch (err) {
      console.error('Error calculating houses:', err);
    }
  }

  // Return the chart data
  return {
    planets,
    houses,
    ascendant
  };
}

/**
 * Helper function to get zodiac symbol from sign index
 */
function getZodiacSymbol(signIndex: number): string {
  const ZODIAC_SYMBOLS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
  return ZODIAC_SYMBOLS[signIndex] || '?';
}

// Calculate a birth chart using JavaScript ephemeris implementation
export const calculateBirthChartWithSwissEph = async (params: {
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  formattedDay?: string;
  formattedMonth?: string;
  formattedYear?: string;
  hour?: number;
  minute?: number;
}) => {
  try {
    const { birthDate, birthTime, birthPlace, formattedDay, formattedMonth, formattedYear, hour: paramsHour, minute: paramsMinute } = params;
    
    // Validate birth place
    if (!birthPlace || birthPlace.trim() === '') {
      return {
        error: 'Please enter a birth place (city name).'
      };
    }
    
    // First, geocode the birth place to get latitude and longitude
    const geocodedLocation = await geocodeLocation(birthPlace);
    if (geocodedLocation.latitude === 0 && geocodedLocation.longitude === 0) {
      return {
        error: `Could not geocode location "${birthPlace}". Please try a different city name.`
      };
    }
    
    // Check if timezone information is available
    if (!geocodedLocation.timeZone) {
      return {
        error: `Could not determine the timezone for "${birthPlace}". Please try a different city name.`
      };
    }
    
    // Parse the date and time with validation
    let year, month, day, hour, minute;
    
    // Use provided formatted values if available, otherwise parse from birthDate/birthTime
    if (formattedYear && formattedMonth && formattedDay && paramsHour !== undefined && paramsMinute !== undefined) {
      year = parseInt(formattedYear);
      month = parseInt(formattedMonth);
      day = parseInt(formattedDay);
      hour = paramsHour;
      minute = paramsMinute;
    } else {
      // Parse from birthDate/birthTime as fallback
      [year, month, day] = birthDate.split('-').map(Number);
      [hour, minute] = birthTime.split(':').map(Number);
    }
    
    // Validate time values
    if (isNaN(hour) || hour < 0 || hour > 23 || isNaN(minute) || minute < 0 || minute > 59) {
      return {
        error: 'Invalid time value. Hours must be 0-23 and minutes must be 0-59.'
      };
    }
    
    console.log(`Input (local birth time): ${year}-${month}-${day} ${hour}:${minute}`);
    console.log(`Location: ${birthPlace} (${geocodedLocation.latitude}, ${geocodedLocation.longitude})`);
    console.log(`Timezone: ${geocodedLocation.timeZone.zoneName}, offset: ${geocodedLocation.timeZone.utcOffset} seconds`);
    
    // Format the offset for an ISO string
    const totalOffsetMinutes = geocodedLocation.timeZone.utcOffset / 60;
    const offsetHours = Math.floor(Math.abs(totalOffsetMinutes) / 60) * (totalOffsetMinutes >= 0 ? 1 : -1);
    const offsetMinutes = Math.abs(totalOffsetMinutes) % 60;
    const offsetSign = totalOffsetMinutes >= 0 ? '+' : '-';
    const offsetString = `${offsetSign}${String(Math.abs(offsetHours)).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;
    
    // Create an ISO date string with the timezone information
    const formattedYearStr = String(year).padStart(4, '0');
    const formattedMonthStr = String(month).padStart(2, '0');
    const formattedDayStr = String(day).padStart(2, '0');
    const formattedHourStr = String(hour).padStart(2, '0');
    const formattedMinuteStr = String(minute).padStart(2, '0');
    
    const isoDateString = `${formattedYearStr}-${formattedMonthStr}-${formattedDayStr}T${formattedHourStr}:${formattedMinuteStr}:00.000${offsetString}`;
    
    // Create a Date object from this ISO string - this will contain the proper timezone information
    let birthDateObj = new Date(isoDateString);
    
    // We'll also store the timezone offset information separately to pass to the ephemeris calculation
    // This ensures the timezone information is properly associated with the birth location
    const timeZoneOffsetSeconds = geocodedLocation.timeZone.utcOffset;
    
    console.log(`Birth time with timezone offset (${offsetString}): ${isoDateString}`);
    console.log(`Timezone offset in seconds: ${timeZoneOffsetSeconds}`);
    console.log(`Parsed birth date object: ${birthDateObj.toString()}`);
    console.log(`UTC representation: ${birthDateObj.toUTCString()}`);
    
    // Use the dateObj from line 298 in querySwissEph
    // Check if we have a matching date format
    if (formattedDay && formattedMonth && formattedYear && 
        day.toString().padStart(2, '0') === formattedDay &&
        month.toString().padStart(2, '0') === formattedMonth &&
        year.toString().padStart(4, '0') === formattedYear &&
        paramsHour === hour && paramsMinute === minute) {
      // Create the date object just like in line 298 of querySwissEph
      const dateObj = new Date(`${formattedYear}-${formattedMonth}-${formattedDay}T${hour}:${minute}:00${offsetSign}${String(Math.abs(offsetHours)).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`);
      console.log("Using dateObj format from line 298:", dateObj.toString());
      birthDateObj = dateObj; // Use this dateObj instead
    }
    
    // Import the ephemeris.js library for server-side calculations
    const ephemerisJs = require('./lib/server-ephemeris');
    
    // Create a fresh dateObj using EXACTLY the same code as line 298
    // This ensures we're using the exact same dateObj format and construction
    const dateObj = new Date(`${formattedYear}-${formattedMonth}-${formattedDay}T${hour}:${minute}:00${offsetSign}${String(Math.abs(offsetHours)).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`);
    
    console.log("Using a dateObj with EXACTLY the same format as line 298:", dateObj.toString());
    
    // Calculate the positions using ephemeris.js with this date object
    // The dateObj is passed directly to ephemerisJs without any manipulation
    const result = ephemerisJs.getAllPlanets(
      dateObj,
      geocodedLocation.longitude,
      geocodedLocation.latitude,
      0, // height in meters
      { 
        timeZoneOffsetSeconds // Pass the timezone offset as an option
      }
    );
   
    // Convert the raw ephemeris result to our chart data format
    const chartData = convertEphemerisResultToChartData(result, geocodedLocation);
    
    // Format the data for return
    const formattedChartData = {
      ...chartData,
      birthLocationFormatted: geocodedLocation.formattedAddress,
      calculationMethod: 'JavaScript Ephemeris',
      timeZone: geocodedLocation.timeZone
    };
    
    console.log('Birth chart calculated successfully');
    
    // Log the chart data for debugging
    console.log('Calculated birth chart data:', {
      ascendant: formattedChartData.ascendant,
      planets: Object.keys(formattedChartData.planets || {}),
      houses: Object.keys(formattedChartData.houses || {})
    });

    // Return the data to the client
    return {
      data: formattedChartData
    };
    
  } catch (error) {
    console.error('Error calculating birth chart with Swiss Ephemeris:', error);
    return {
      error: 'Failed to calculate birth chart. Please try again.'
    };
  }
};

// Function to parse the output from Swiss Ephemeris
/**
 * Determines the time zone of a location based on its longitude and latitude
 * @param longitude - The longitude of the location (-180 to 180)
 * @param latitude - The latitude of the location (-90 to 90)
 * @returns An object containing time zone information
 */
export async function determineTimeZone(longitude: number, latitude: number): Promise<{
  name: string;
  offsetHours: number;
  offsetMinutes: number;
  totalOffsetMinutes: number;
}> {
  try {
    // First, try to find the closest city
    console.log(`Looking up timezone for coordinates: ${latitude}, ${longitude}`);
    
    // Import the geocodeLocation function to use it for reverse geocoding
    const { geocodeLocation } = await import('./lib/ephemeris');
    
    // Instead of loading city data from the file system, which doesn't work in serverless,
    // we'll use a simple longitude-based calculation which is more compatible with serverless
    const cities: City[] = [];
    
    // Find the closest city
    let closestCity = null;
    let minDistance = Number.MAX_VALUE;
    
    for (const city of cities) {
      const cityLat = parseFloat(city.lat);
      const cityLng = parseFloat(city.lng);
      const distance = Math.sqrt(
        Math.pow(cityLat - latitude, 2) + 
        Math.pow(cityLng - longitude, 2)
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        closestCity = city;
      }
    }
    
    // If we found a city, use it to look up the time zone
    if (closestCity) {
      console.log(`Found closest city: ${closestCity.city}, ${closestCity.country} (${closestCity.iso2})`);
      
      // Instead of loading timezone data from files, we'll use a simple calculation based on longitude
      // This is compatible with serverless environments
      
      // Calculate the timezone offset based on longitude
      // Each 15 degrees corresponds to 1 hour time difference
      const approxOffsetHours = Math.round(longitude / 15);
      const utcOffset = approxOffsetHours * 3600; // Convert to seconds
      
      // Create a descriptive timezone name based on the offset
      const tzSignC = approxOffsetHours >= 0 ? '+' : '-';
      const absHours = Math.abs(approxOffsetHours);
      const zoneName = `UTC${tzSignC}${absHours}`;
      
      // US special case handling
      let countryName = "Unknown";
      let effectiveOffset = utcOffset;
      let effectiveZoneName = zoneName;
      
      if (closestCity && closestCity.iso2) {
        countryName = closestCity.country || closestCity.iso2;
        
        // Special case for US timezones
        if (closestCity.iso2.toUpperCase() === 'US') {
          if (longitude < -170) {
            // Aleutian Islands
            effectiveZoneName = 'America/Adak';
            effectiveOffset = -10 * 3600;
          } else if (longitude < -140) {
            // Alaska 
            effectiveZoneName = 'America/Anchorage';
            effectiveOffset = -9 * 3600;
          } else if (longitude < -115) {
            // Pacific Time
            effectiveZoneName = 'America/Los_Angeles';
            effectiveOffset = -8 * 3600;
          } else if (longitude < -100) {
            // Mountain Time
            effectiveZoneName = 'America/Denver';
            effectiveOffset = -7 * 3600;
          } else if (longitude < -85) {
            // Central Time
            effectiveZoneName = 'America/Chicago';
            effectiveOffset = -6 * 3600;
          } else {
            // Eastern Time
            effectiveZoneName = 'America/New_York';
            effectiveOffset = -5 * 3600;
          }
          
          // Hawaii special case
          if (longitude < -150 && latitude < 25 && latitude > 15) {
            effectiveZoneName = 'Pacific/Honolulu';
            effectiveOffset = -10 * 3600;
          }
          
          countryName = "United States";
        }
      }
      
      // Create the timezone object
      const timezone = {
        zoneName: effectiveZoneName,
        utcOffset: effectiveOffset,
        countryName: countryName
      };
      console.log(`Found timezone: ${timezone.zoneName}, offset: ${timezone.utcOffset} seconds`);
      
      // Convert seconds to hours and minutes
      const totalMinutes = timezone.utcOffset / 60;
      const offsetHours = Math.floor(Math.abs(totalMinutes) / 60) * (totalMinutes >= 0 ? 1 : -1);
      const offsetMinutes = Math.abs(totalMinutes) % 60;
      
      // Format timezone name
      const tzSignD = totalMinutes >= 0 ? '+' : '-';
      const formattedHours = Math.abs(offsetHours).toString().padStart(2, '0');
      const formattedMinutes = Math.abs(offsetMinutes).toString().padStart(2, '0');
      const timeZoneName = `${timezone.zoneName} (UTC${tzSignD}${formattedHours}:${formattedMinutes})`;
      
      return {
        name: timeZoneName,
        offsetHours,
        offsetMinutes: offsetMinutes * (totalMinutes >= 0 ? 1 : -1),
        totalOffsetMinutes: totalMinutes
      };
    }
    
    // If we couldn't find a city, fall back to the simplified longitude-based approach
    console.log('No city found, falling back to longitude-based timezone calculation');
    
    // Normalize longitude to be between -180 and 180
    let normLongitude = longitude;
    while (normLongitude > 180) normLongitude -= 360;
    while (normLongitude < -180) normLongitude += 360;
    
    // Find the time zone based on longitude
    const timeZone = TIME_ZONE_BOUNDARIES.find(
      zone => normLongitude >= zone.min && normLongitude < zone.max
    );
    
    let timeZoneName = 'UTC+00:00';
    let offsetHours = 0;
    let offsetMinutes = 0;
    
    if (timeZone) {
      timeZoneName = timeZone.name;
      
      // Parse the offset hours and minutes from the name
      const match = timeZone.name.match(/UTC([+-])(\d+):(\d+)/);
      if (match) {
        const sign = match[1] === '+' ? 1 : -1;
        offsetHours = sign * parseInt(match[2]);
        offsetMinutes = sign * parseInt(match[3]);
      }
    } else {
      // Fallback calculation based on longitude
      // Each 15 degrees of longitude represents approximately 1 hour
      offsetHours = Math.round(normLongitude / 15);
      timeZoneName = `UTC${offsetHours >= 0 ? '+' : ''}${offsetHours}:00`;
    }
    
    // Calculate total offset in minutes for easier calculations
    const totalOffsetMinutes = (offsetHours * 60) + offsetMinutes;
    
    // Special cases based on latitude and longitude for politically defined time zones
    // This is a simplified approach - real time zones follow political boundaries
    
    // Examples of special cases (add more as needed):
    
    // Spain (mostly should be UTC+00:00 by longitude but uses UTC+01:00)
    if (normLongitude > -10 && normLongitude < 3 && latitude > 35 && latitude < 44) {
      timeZoneName = 'UTC+01:00';
      offsetHours = 1;
      offsetMinutes = 0;
    }
    
    // China (spans multiple time zones but uses UTC+08:00 for the entire country)
    if (normLongitude > 73 && normLongitude < 135 && latitude > 18 && latitude < 54) {
      timeZoneName = 'UTC+08:00';
      offsetHours = 8;
      offsetMinutes = 0;
    }
    
    // India (uses UTC+05:30)
    if (normLongitude > 68 && normLongitude < 97 && latitude > 6 && latitude < 36) {
      timeZoneName = 'UTC+05:30';
      offsetHours = 5;
      offsetMinutes = 30;
    }
    
    return {
      name: timeZoneName,
      offsetHours,
      offsetMinutes,
      totalOffsetMinutes: (offsetHours * 60) + offsetMinutes
    };
  } catch (error) {
    console.error('Error determining time zone:', error);
    
    // Return UTC as fallback
    return {
      name: 'UTC+00:00',
      offsetHours: 0,
      offsetMinutes: 0,
      totalOffsetMinutes: 0
    };
  }
}

// Save a birth chart
export const saveBirthChart = async (chartData: any) => {
  try {
    if (!chartData) {
      return {
        success: false,
        error: "Missing chart data."
      };
    }
    
    // Format the birth date from the chart data
    let birthDate = new Date();
    
    // If we have a date string, try to parse it
    if (chartData.date) {
      try {
        // Handle different date formats
        // DD.MM.YYYY format (like 08.10.1995)
        if (chartData.date.includes('.')) {
          const [day, month, year] = chartData.date.split('.').map(Number);
          birthDate = new Date(year, month - 1, day);
        } 
        // YYYY-MM-DD format
        else if (chartData.date.includes('-')) {
          birthDate = new Date(chartData.date);
        }
      } catch (error) {
        console.error("Error parsing birth date:", error);
        // If parsing fails, keep the default date
      }
    }
    
    // Extract planet positions
    const { 
      sun, moon, mercury, venus, mars, jupiter, saturn, uranus, neptune, pluto,
      trueNode, midheaven, southNode, meanNode, chiron, meanLilith
    } = chartData.planets || {};
    
    // Create the birth chart in the database
    const chart = await prisma.birthChart.create({
      data: {
        name: chartData.title || 'Birth Chart',
        birthDate,
        birthTime: chartData.time || '',
        birthPlace: chartData.location || '',
        ascendant: chartData.ascendant?.name 
          ? `${chartData.ascendant.name} ${chartData.ascendant.degree.toFixed(1)}°`
          : null,
        midheaven: midheaven?.name 
          ? `${midheaven.name} ${midheaven.degree.toFixed(1)}°` 
          : null,
        sun: sun?.name ? `${sun.name} ${sun.degree.toFixed(1)}°` : null,
        moon: moon?.name ? `${moon.name} ${moon.degree.toFixed(1)}°` : null,
        mercury: mercury?.name ? `${mercury.name} ${mercury.degree.toFixed(1)}°` : null,
        venus: venus?.name ? `${venus.name} ${venus.degree.toFixed(1)}°` : null,
        mars: mars?.name ? `${mars.name} ${mars.degree.toFixed(1)}°` : null,
        jupiter: jupiter?.name ? `${jupiter.name} ${jupiter.degree.toFixed(1)}°` : null,
        saturn: saturn?.name ? `${saturn.name} ${saturn.degree.toFixed(1)}°` : null,
        uranus: uranus?.name ? `${uranus.name} ${uranus.degree.toFixed(1)}°` : null,
        neptune: neptune?.name ? `${neptune.name} ${neptune.degree.toFixed(1)}°` : null,
        pluto: pluto?.name ? `${pluto.name} ${pluto.degree.toFixed(1)}°` : null,
        trueNode: trueNode?.name ? `${trueNode.name} ${trueNode.degree.toFixed(1)}°` : null,
        meanNode: meanNode?.name ? `${meanNode.name} ${meanNode.degree.toFixed(1)}°` : null,
        chiron: chiron?.name ? `${chiron.name} ${chiron.degree.toFixed(1)}°` : null,
        lilith: meanLilith?.name ? `${meanLilith.name} ${meanLilith.degree.toFixed(1)}°` : null,
        houses: chartData.houses || {},
        aspects: chartData.aspects || [],
        userId: chartData.userId || null,
      }
    });
    
    revalidatePath('/swisseph');
    return { success: true, chartId: chart.id };
  } catch (error) {
    console.error("Error saving birth chart:", error);
    return { 
      success: false, 
      error: "Failed to save birth chart. Please try again."
    };
  }
};

// Get all birth charts for a user
export const getBirthCharts = async (userId?: number) => {
  try {
    const where = userId ? { userId } : {};
    const charts = await prisma.birthChart.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    return charts;
  } catch (error) {
    console.error("Error fetching birth charts:", error);
    return [];
  }
};

// Get a specific birth chart by ID
export const getBirthChartById = async (chartId: number) => {
  try {
    const chart = await prisma.birthChart.findUnique({
      where: { id: chartId }
    });
    return chart;
  } catch (error) {
    console.error("Error fetching birth chart:", error);
    return null;
  }
};

// Set a user's default chart
export const setDefaultChart = async (userId: number, chartId: number) => {
  try {
    if (!userId || !chartId) {
      return {
        success: false,
        error: "Missing user ID or chart ID."
      };
    }
    
    // First, verify that the chart belongs to this user
    const chart = await prisma.birthChart.findFirst({
      where: {
        id: chartId,
        userId: userId
      }
    });
    
    if (!chart) {
      return {
        success: false,
        error: "Chart not found or does not belong to this user."
      };
    }
    
    // Update user's default chart preference
    // Note: You would need to add a defaultChartId field to your User model
    await prisma.user.update({
      where: { id: userId },
      data: {
        defaultChartId: chartId
      }
    });
    
    return { success: true };
  } catch (error) {
    console.error("Error setting default chart:", error);
    return { 
      success: false, 
      error: "Failed to set default chart. Please try again."
    };
  }
};

// Get a user's default chart
export const getDefaultChart = async (userId: number) => {
  try {
    if (!userId) return null;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { defaultChartId: true }
    });
    
    if (!user || !user.defaultChartId) return null;
    
    const chart = await prisma.birthChart.findUnique({
      where: { id: user.defaultChartId }
    });
    
    return chart;
  } catch (error) {
    console.error("Error fetching default chart:", error);
    return null;
  }
};

// Delete a birth chart
export const deleteBirthChart = async (chartId: number) => {
  try {
    await prisma.birthChart.delete({
      where: { id: chartId }
    });
    revalidatePath('/swisseph');
    return { success: true };
  } catch (error) {
    console.error("Error deleting birth chart:", error);
    return { success: false, error: "Failed to delete birth chart." };
  }
};

// Function to parse the output from WebAssembly Swiss Ephemeris
function parseSwissEphOutput(output: string, location: any) {
  // Initialize parsed data
  const parsedData: Record<string, any> = {
    planets: {},
    houses: {},
    location: location
  };
  
  // Get the lines of output
  const lines = output.split('\n');
  
  // Map planet names to their keys
  const planetMap: Record<string, string> = {
    'Sun': 'sun',
    'Moon': 'moon',
    'Mercury': 'mercury',
    'Venus': 'venus',
    'Mars': 'mars',
    'Jupiter': 'jupiter',
    'Saturn': 'saturn',
    'Uranus': 'uranus',
    'Neptune': 'neptune',
    'Pluto': 'pluto',
    'Mean Node': 'meanNode',
    'True Node': 'trueNode',
    'Mean Lilith': 'meanLilith',
    'Ascendant': 'ascendant',
    'Midheaven': 'midheaven'
  };
  
  // Signs and their degrees
  const zodiacSigns = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 
    'Leo', 'Virgo', 'Libra', 'Scorpio', 
    'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
  ];
  
  // Flags to track sections
  let inPlanetsSection = false;
  let inHousesSection = false;
  
  // Parse each line
  for (const line of lines) {
    // Skip empty lines or header dividers
    if (!line.trim() || line.includes('----')) continue;
    
    // Track sections
    if (line.includes('Planets:')) {
      inPlanetsSection = true;
      inHousesSection = false;
      continue;
    } else if (line.includes('Houses:')) {
      inPlanetsSection = false;
      inHousesSection = true;
      continue;
    }
    
    // Parse planet positions
    if (inPlanetsSection) {
      for (const [planetName, planetKey] of Object.entries(planetMap)) {
        if (line.startsWith(planetName)) {
          // Extract the position from formatted output
          // Format: "Sun         15° Libra 5' 3.1" R"
          const match = line.match(/\s+(\d+)°\s+(\w+)\s+(\d+)'\s+(\d+\.\d+)"\s*(R)?/);
          if (match) {
            const degrees = parseInt(match[1]);
            const sign = match[2];
            const minutes = parseInt(match[3]);
            const seconds = parseFloat(match[4]);
            const isRetrograde = match[5] === 'R';
            
            // Calculate total degrees within the sign
            const totalDegrees = degrees + (minutes / 60) + (seconds / 3600);
            
            // Get sign index
            const signIndex = zodiacSigns.indexOf(sign);
            
            // Store the data
            parsedData.planets[planetKey] = {
              name: sign,
              degree: totalDegrees,
              longitude: signIndex * 30 + totalDegrees,
              retrograde: isRetrograde
            };
          }
          break;
        }
      }
    }
    
    // Parse house cusps
    if (inHousesSection) {
      // Process Ascendant and Midheaven
      if (line.startsWith('Ascendant') || line.startsWith('Midheaven')) {
        const planetName = line.startsWith('Ascendant') ? 'Ascendant' : 'Midheaven';
        const planetKey = planetMap[planetName];
        
        const match = line.match(/\s+(\d+)°\s+(\w+)\s+(\d+)'\s+(\d+\.\d+)"/);
        if (match) {
          const degrees = parseInt(match[1]);
          const sign = match[2];
          const minutes = parseInt(match[3]);
          const seconds = parseFloat(match[4]);
          
          // Calculate total degrees within the sign
          const totalDegrees = degrees + (minutes / 60) + (seconds / 3600);
          
          // Get sign index
          const signIndex = zodiacSigns.indexOf(sign);
          
          // Store the data in planets for easier access
          parsedData.planets[planetKey] = {
            name: sign,
            degree: totalDegrees,
            longitude: signIndex * 30 + totalDegrees
          };
        }
      }
      
      // Process house cusps
      const houseMatch = line.match(/house\s+(\d+)\s+(\d+)°\s+(\w+)\s+(\d+)'\s+(\d+\.\d+)"/);
      if (houseMatch) {
        const houseNumber = parseInt(houseMatch[1]);
        const degrees = parseInt(houseMatch[2]);
        const sign = houseMatch[3];
        const minutes = parseInt(houseMatch[4]);
        const seconds = parseFloat(houseMatch[5]);
        
        // Calculate total degrees within the sign
        const totalDegrees = degrees + (minutes / 60) + (seconds / 3600);
        
        // Get sign index
        const signIndex = zodiacSigns.indexOf(sign);
        
        // Store the house data
        parsedData.houses[`house${houseNumber}`] = {
          name: sign,
          degree: totalDegrees,
          cusp: signIndex * 30 + totalDegrees,
          longitude: signIndex * 30 + totalDegrees
        };
      }
    }
  }
  
  return parsedData;
}