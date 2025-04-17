"use server";
import { neon } from "@neondatabase/serverless";
import prisma from "./lib/prisma";
import { revalidatePath } from "next/cache";
import { calculateBirthChart as calculateEphemerisChart, geocodeLocation } from './lib/ephemeris';
import chartascendant from "./lib/astronomia"
import { useUser } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
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

interface PlanetPointData {
  name: string;
  symbol: string;
  longitude: number;
  degree: number;
}

interface LocationData {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  timezone?: string;
  city?: string;
  state?: string;
  province?: string;
  country?: string;
}

//export function getData() {
//    const sql = neon(process.env.DATABASE_URL);
 //   const data = await sql`...`;
   // return data;
//}

// Function to ensure user exists in database
export const syncUser = async (clerkId: string) => {
  try {
    // Get the current user from Clerk to access their name and email
    const clerkUser = await currentUser();
    
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        clerkId: clerkId
      },
      select: {
        id: true,
        clerkId: true,
        name: true,
        defaultChart: true
      }
    });

    if (!existingUser) {
      // Create new user if they don't exist
      const newUser = await prisma.user.create({
        data: {
          clerkId: clerkId,
          name: clerkUser?.firstName || null,
          email: clerkUser?.emailAddresses[0]?.emailAddress || 'no-email@example.com'
        }
      });
      return newUser;
    } else {
      // Update existing user's name if it has changed
      if (existingUser.name !== clerkUser?.firstName) {
        const updatedUser = await prisma.user.update({
          where: {
            id: existingUser.id
          },
          data: {
            name: clerkUser?.firstName || null
          }
        });
        return updatedUser;
      }
      return existingUser;
    }
  } catch (error) {
    console.error("Error syncing user:", error);
    throw error;
  }
};

// Modify addUser to use syncUser
export const addUser = async (formData: FormData) => {
    try {
        let user = null;
        try {
            user = await currentUser();
            console.log("Current user:", user); // Debug log
        } catch (error) {
            console.log("No authenticated user, proceeding as guest");
        }

        const name = formData.get("uname") as string;
        const phone = formData.get("phone") as string;
        const email = formData.get("email") as string;
        const birthday = formData.get("birthday") as string;
        const time = formData.get("time") as string;
        const location = formData.get("location") as string;
        const questions = formData.get("questions") as string;
        const rtype = formData.get("rtype") as string;
        const price = formData.get("price") as string;
        const username = user?.username as string;

        // Validate required fields
        if (!name || !email || !birthday || !time || !location) {
            console.log("Missing required fields:", { name, email, birthday, time, location });
            return { 
                success: false, 
                error: "Please fill in all required fields" 
            };
        }
        
        // Ensure user exists in database if logged in
        if (user?.id) {
            try {
                await syncUser(user.id);
            } catch (syncError) {
                console.error("Error syncing user:", syncError);
                return { 
                    success: false, 
                    error: "Failed to sync user data" 
                };
            }
        }
        
        try {
            await prisma.formSubmission.create({
                data: {
                    name: name,
                    phone: phone || null,
                    email: email,
                    birthday: birthday,
                    time: time,
                    location: location,
                    questions: questions || null,
                    rtype: rtype || null,
                    price: price || null,
                    username: username || null
                },
            });
            
            return { success: true };
        } catch (dbError) {
            console.error("Database error:", dbError);
            return { 
                success: false, 
                error: "Failed to save form submission" 
            };
        }
    } catch (error) {
        console.error("Error in addUser:", error);
        return { 
            success: false, 
            error: "An unexpected error occurred. Please try again." 
        };
    }
};

// Server action to sync user
export async function syncUserAction() {
  const user = await currentUser();
  if (user?.id) {
    try {
      await syncUser(user.id);
      return { success: true };
    } catch (error) {
      console.error("Error syncing user:", error);
      return { success: false, error: "Failed to sync user" };
    }
  }
  return { success: false, error: "No user found" };
}

// Tarot Reading Actions

// Save a tarot reading
export const saveTarotReading = async (formData: FormData) => {
  try {
    const name = formData.get("name") as string;
    const spreadType = formData.get("spreadType") as string;
    const cards = formData.get("cards") as string;
    const question = formData.get("question") as string;
    const notes = formData.get("notes") as string;
    const clerkId = formData.get("userId") as string;
    
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

    // Find the user by their Clerk ID
    const user = await prisma.user.findFirst({
      where: { clerkId }
    });

    if (!user) {
      console.error("User not found for Clerk ID:", clerkId);
      return {
        success: false,
        error: "User not found. Please try logging in again."
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
        userId: user.id,
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

// Get all tarot readings for a specific user
export const getTarotReadings = async (userId: string) => {
  try {
    // First find the user by their Clerk ID
    const user = await prisma.user.findFirst({
      where: { clerkId: userId }
    });

    if (!user) {
      console.error("User not found for Clerk ID:", userId);
      return [];
    }

    // Get readings for the found user
    const readings = await prisma.tarotReading.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    });
    return readings;
  } catch (error) {
    console.error("Error fetching tarot readings:", error);
    return [];
  }
};

// Get a specific tarot reading by ID
export const getTarotReadingById = async (readingId: number, userId: string) => {
  try {
    // First find the user by their Clerk ID
    const user = await prisma.user.findFirst({
      where: { clerkId: userId }
    });

    if (!user) {
      console.error("User not found for Clerk ID:", userId);
      return null;
    }

    // Get the reading and verify it belongs to the user
    const reading = await prisma.tarotReading.findFirst({
      where: { 
        id: readingId,
        userId: user.id
      }
    });
    return reading;
  } catch (error) {
    console.error("Error fetching tarot reading:", error);
    return null;
  }
};

// Delete a tarot reading
export const deleteTarotReading = async (readingId: number, userId: string) => {
  try {
    // First find the user by their Clerk ID
    const user = await prisma.user.findFirst({
      where: { clerkId: userId }
    });

    if (!user) {
      console.error("User not found for Clerk ID:", userId);
      return { success: false, error: "User not found" };
    }

    // Verify the reading belongs to the user and delete it
    const reading = await prisma.tarotReading.findFirst({
      where: { 
        id: readingId,
        userId: user.id
      }
    });

    if (!reading) {
      return { success: false, error: "Reading not found or you don't have permission to delete it" };
    }

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
    
    // Use the timezone information from geocodeLocation if available
    if (geocodedLocation.timezone) {
      console.log(`Using timezone data: ${geocodedLocation.timezone}`);
      
      // Get the timezone offset in hours and minutes for display
      let totalOffsetMinutes = 0;
      let offsetHours = 0;
      let offsetMinutes = 0;

      // Parse the timezone string to get offset
      const timezoneMatch = geocodedLocation.timezone.match(/UTC([+-])(\d+):(\d+)/);
      if (timezoneMatch) {
        const sign = timezoneMatch[1] === '+' ? 1 : -1;
        offsetHours = sign * parseInt(timezoneMatch[2]);
        offsetMinutes = sign * parseInt(timezoneMatch[3]);
        totalOffsetMinutes = (offsetHours * 60) + offsetMinutes;
      }
      
      timeZoneInfo = {
        name: geocodedLocation.timezone,
        offsetHours,
        offsetMinutes,
        totalOffsetMinutes
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

    if (geocodedLocation.timezone) {
      // Parse the timezone string to get offset
      const timezoneMatch = geocodedLocation.timezone.match(/UTC([+-])(\d+):(\d+)/);
      if (timezoneMatch) {
        const sign = timezoneMatch[1] === '+' ? 1 : -1;
        offsetHours = sign * parseInt(timezoneMatch[2]);
        offsetMinutes = sign * parseInt(timezoneMatch[3]);
        totalOffsetMinutes = (offsetHours * 60) + offsetMinutes;
      }
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
    const formattedHour = hour.toString().padStart(2, '0')
    const formattedMinute = minute.toString().padStart(2, '0')
    
    console.log("formatted date")
    console.log(formattedYear)
    console.log(formattedMonth)
    console.log(formattedDay)
    
    const dateObj = new Date(`${formattedYear}-${formattedMonth}-${formattedDay}T${formattedHour}:${formattedMinute}:00${tzSignA}${formattedHours}:${formattedMinutes}`);
    const dateObj2 = new Date(`1995-09-08T19:05:00-4:00`)
    
    console.log(dateObj)
    console.log(dateObj2)
    console.log(`${formattedYear}`+"-"+`${formattedMonth}`+"-"+`${formattedDay}`+"T"+`${hour}`+":"+`${minute}`+":00"+`${tzSignA}`+`${formattedHours}`+":"+`${formattedMinutes}`)
    console.log(`${year}`+"-"+`${month}`+"-"+`${day}`+"T"+`${hour}`+":"+`${minute}`+":00"+`${tzSignA}`+`${formattedHours}`+":"+`${formattedMinutes}`)
    
    console.log(hour)
    console.log(minute)
    console.log(timeZoneInfo.offsetHours)
    
    // Store the timezone offset information separately to pass to the ephemeris calculation
    const timeZoneOffsetSeconds = totalOffsetMinutes * 60;
    
    console.log(`Input local time: ${year}-${month}-${day} ${hour}:${minute}:${second}`);
    console.log(`Timezone offset: ${offsetHours} hours, ${offsetMinutes} minutes (${totalOffsetMinutes} minutes total)`);
    console.log(`Timezone offset in seconds: ${timeZoneOffsetSeconds}`);
    console.log(`Parsed Date object (local time): ${dateObj.toString()}`);
    console.log(`UTC representation: ${dateObj.toUTCString()}`);
    
    // Use our robust wrapper for ephemeris calculations in serverless environments
    // This will automatically handle fallbacks if the module isn't available
    // For server components/actions, we use the server-side implementation
    // const ephemerisJs = require('./lib/server-ephemeris');
    console.log(hour)
    console.log(minute)
    
    const ascendantobj = chartascendant(formattedYear, formattedMonth, formattedDay, hour, minute, geocodedLocation.latitude, geocodedLocation.longitude)
    const ascendantdegree = ascendantobj.ascdegree
    const ascendantsign = ascendantobj.ascsign
    const ascendantdecimal = ascendantobj.decimaldegree
    const bodies1 = ascendantobj.bodies
    const points1 = ascendantobj.points
    const midheaven1 = ascendantobj.midheaven
    // *** THIS IS THE DATEOBJ FROM LINE 298 THAT SHOULD BE USED FOR ALL CHART CALCULATIONS ***
    
    // Calculate the positions using ephemeris.js with dateObj from line 298
    // The original dateObj is passed directly without any manipulation
    console.log("calculation")
    console.log(dateObj)
    console.log(ascendantdegree)
    console.log(ascendantdecimal)
    console.log(bodies1)
    console.log(points1)
    console.log(midheaven1)
  
    console.log(bodies1.sun.ChartPosition)

    const planetData: any = {};

        // The zodiac signs array
        const zodiacSigns = [
          'Aries', 'Taurus', 'Gemini', 'Cancer',
          'Leo', 'Virgo', 'Libra', 'Scorpio',
          'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
        ];
    
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
      { id: 'pluto', name: 'Pluto' }
    ];

    // Extract planet data
  for (const planet of planets) {
    if (ascendantobj.bodies[planet.id]) {
      const planetInfo = ascendantobj.bodies[planet.id];
      
      // Get longitude from the result
      const longitude = planetInfo.ChartPosition.Ecliptic.DecimalDegrees;
      
      const signIndex = Math.floor(longitude / 30) % 12;
      const degree = planetInfo.ChartPosition.Ecliptic.ArcDegreesFormatted30;
      
      const sign = zodiacSigns[signIndex];
      
      planetData[planet.id] = {
        name: sign,
        symbol: getZodiacSymbol(signIndex),
        longitude,
        degree
      };
    }
  }

  const pointData: any = {};

    const points = [
      { id: 'northnode', name: 'North Node', symbol: '☊' },
      { id: 'southnode', name: 'South Node', symbol: '☋' },
      { id: 'lilith', name: 'Lilith', symbol: '⚸' }
    ];

    for (const point of points) {
      if (ascendantobj.points[point.id]) {
        const pointInfo = ascendantobj.points[point.id];
        
        // Get longitude from the result
        const longitude = pointInfo.ChartPosition.Ecliptic.DecimalDegrees;
        const signIndex = Math.floor(longitude / 30) % 12;
        const degree = pointInfo.ChartPosition.Ecliptic.ArcDegreesFormatted30;
        
        const sign = zodiacSigns[signIndex];
        
        pointData[point.id] = {
          name: sign,
          symbol: point.symbol,
          longitude,
          degree
        };
      }
    }
    if (ascendantobj.midheaven) {
      const longitude = ascendantobj.midheaven.ChartPosition.Ecliptic.DecimalDegrees;
      const signIndex = Math.floor(longitude / 30) % 12;
      const degree = ascendantobj.midheaven.ChartPosition.Ecliptic.ArcDegreesFormatted30;
      const sign = zodiacSigns[signIndex];
      pointData['midheaven'] = {
        name: sign,
        symbol: getZodiacSymbol(signIndex),
        longitude,
        degree
      }

    }

     // Format the output to look similar to the original Swiss Ephemeris output
     
    let formattedOutput = '';
     // Add planet positions
    if (Object.keys(planetData).length > 0) {
     formattedOutput += 'Planets:\n';
     for (const [planet, data] of Object.entries(planetData)) {
       const planetData = data as PlanetPointData;
       formattedOutput += `${planet.padEnd(12)} ${planetData.name} ${planetData.degree}\n`;
     }};

     if (Object.keys(pointData).length > 0) {
     formattedOutput += 'Points:\n';
     for (const [point, data] of Object.entries(pointData)) {
       const pointData = data as PlanetPointData;
       formattedOutput += `${point.padEnd(12)} ${pointData.name} ${pointData.degree}\n`;
     }};
     

    
    
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
     const timezoneInfoText = geocodedLocation.timezone ? 
       `Time Zone: ${geocodedLocation.timezone}` :
       `Time Zone: ${timeZoneInfo.name}`;
       
     const locationInfo = `
 Date (Local): ${date}
 Time (Local): ${time}
 Location: ${geocodedLocation.formattedAddress}
 ${timezoneInfoText}
 Latitude: ${geocodedLocation.latitude.toFixed(4)}° ${geocodedLocation.latitude >= 0 ? 'N' : 'S'}
 Longitude: ${geocodedLocation.longitude.toFixed(4)}° ${geocodedLocation.longitude >= 0 ? 'E' : 'W'}
 
 Location Details:
 - City: ${geocodedLocation.city || 'Unknown'}
 - State/Province: ${geocodedLocation.state || geocodedLocation.province || 'Unknown'}
 - Country: ${geocodedLocation.country || 'Unknown'}
 - Time Zone: ${geocodedLocation.timezone || timeZoneInfo.name}
 - UTC Offset: ${formattedHours}:${formattedMinutes}
 
 ---- EPHEMERIS OUTPUT ----
${formattedOutput}`;
     
     // Return both the formatted output and the calculation data
     return { 
       output: locationInfo,
       planetData,
       pointData,
       houseData
     };
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

    
function convertEphemerisResultToChartData(ascendantobj: any, geocodedLocation: any) {
    // Calculate positions for the main planets
    const planetData: any = {};

        // The zodiac signs array
        const zodiacSigns = [
          'Aries', 'Taurus', 'Gemini', 'Cancer',
          'Leo', 'Virgo', 'Libra', 'Scorpio',
          'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
        ];
    
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
      { id: 'pluto', name: 'Pluto' }
    ];

    // Extract planet data
  for (const planet of planets) {
    if (ascendantobj.bodies[planet.id]) {
      const planetInfo = ascendantobj.bodies[planet.id];
      
      // Get longitude from the result
      const longitude = planetInfo.ChartPosition.Ecliptic.DecimalDegrees;
      
      const signIndex = Math.floor(longitude / 30) % 12;
      const degree = longitude % 30;
      
      const sign = zodiacSigns[signIndex];
      
      planetData[planet.id] = {
        name: sign,
        symbol: getZodiacSymbol(signIndex),
        longitude,
        degree
      };
    }
  }

  const pointData: any = {};

    const points = [
      { id: 'northnode', name: 'North Node' },
      { id: 'southnode', name: 'South Node' },
      { id: 'lilith', name: 'Lilith' },
      { id: 'midheaven', name: 'Midheaven' }
    ];

    for (const point of points) {
      if (ascendantobj.points[point.id]) {
        const pointInfo = ascendantobj.points[point.id];
        
        // Get longitude from the result
        const longitude = pointInfo.ChartPosition.Ecliptic.DecimalDegrees;
        const signIndex = Math.floor(longitude / 30) % 12;
        const degree = longitude % 30;
        
        const sign = zodiacSigns[signIndex];
        
        pointData[point.id] = {
          name: sign,
          symbol: getZodiacSymbol(signIndex),
          longitude,
          degree
        };
      }
    }
    
    const ascendant = ascendantobj.chartposition

    return {
      planets,
      points,
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
export const saveBirthChart = async (chartData: any, userId: string) => {
  try {
    console.log('Attempting to save birth chart with data:', {
      userId,
      chartData: {
        ...chartData,
        planets: chartData.planets ? 'planets data present' : 'no planets data',
        ascendant: chartData.ascendant ? 'ascendant data present' : 'no ascendant data'
      }
    });

    if (!chartData) {
      console.error('No chart data provided');
      return {
        success: false,
        error: "Missing chart data."
      };
    }

    // Validate user ID
    if (!userId) {
      console.error('No user ID provided');
      return {
        success: false,
        error: "Invalid user ID. Please log in again."
      };
    }

    // Verify user exists - only check by clerkId since we're using Clerk authentication
    console.log('Looking up user with Clerk ID:', userId);
    const user = await prisma.user.findFirst({
      where: { 
        clerkId: userId
      },
      select: { 
        id: true,
        defaultChart: true 
      }
    });

    if (!user) {
      console.error('User not found for Clerk ID:', userId);
      return {
        success: false,
        error: "User not found. Please log in again."
      };
    }
    
    // Format the birth date from the chart data
    let birthDate = new Date();
    
    // If we have a date string, try to parse it
    if (chartData.date) {
      try {
        console.log('Parsing birth date:', chartData.date);
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
        console.log('Parsed birth date:', birthDate);
      } catch (error) {
        console.error("Error parsing birth date:", error);
        return {
          success: false,
          error: "Invalid birth date format. Please use DD.MM.YYYY or YYYY-MM-DD format."
        };
      }
    }
    
    // Validate required data
    if (!chartData.planets || !chartData.ascendant) {
      console.error('Missing required chart data:', {
        hasPlanets: !!chartData.planets,
        hasAscendant: !!chartData.ascendant
      });
      return {
        success: false,
        error: "Missing required chart data (planets or ascendant)."
      };
    }

    // Helper function to format planet data
    const formatPlanetData = (planet: any) => {
      if (!planet) return null;
      
      // If planet is already in string format (e.g., "Aries 15.5°"), return as is
      if (typeof planet === 'string') {
        return planet;
      }
      
      // Handle planet object format
      if (typeof planet === 'object') {
        const name = planet.name || '';
        const degree = planet.degree || 0;
        return `${name} ${degree}°`;
      }
      
      return null;
    };
    
    // Create the birth chart in the database
    console.log('Creating birth chart in database...');
    const chart = await prisma.birthChart.create({
      data: {
        title: chartData.title || 'Birth Chart',
        date: birthDate,
        time: chartData.time || '',
        location: chartData.location || '',
        planets: chartData.planets || {},
        ascendant: chartData.ascendant || {},
        houses: chartData.houses || {},
        aspects: chartData.aspects || [],
        userId: user.id,
      }
    });
    
    console.log('Successfully created birth chart with ID:', chart.id);
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
export const getBirthCharts = async (userId: string) => {
  try {
    if (!userId) {
      return [];
    }

    // First, find the user by their Clerk ID
    const user = await prisma.user.findFirst({
      where: { 
        clerkId: userId
      }
    });

    if (!user) {
      console.error('User not found for Clerk ID:', userId);
      return [];
    }

    // Then fetch their charts using the database user ID
    const charts = await prisma.birthChart.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    });
    return charts;
  } catch (error) {
    console.error("Error fetching birth charts:", error);
    return [];
  }
};

// Get a specific birth chart by ID
export const getBirthChartById = async (chartId: number, userId: string) => {
  try {
    // First find the user by their Clerk ID
    const user = await prisma.user.findFirst({
      where: { 
        clerkId: userId
      }
    });

    if (!user) {
      console.error('User not found for Clerk ID:', userId);
      return null;
    }

    // Then find the chart using the database user ID
    const chart = await prisma.birthChart.findFirst({
      where: {
        id: chartId,
        userId: user.id
      }
    });

    return chart;
  } catch (error) {
    console.error("Error fetching birth chart:", error);
    return null;
  }
};

// Get a user's default chart
export const getDefaultChart = async (userId: string) => {
  try {
    if (!userId) return null;
    
    // First, find the user by their Clerk ID
    const user = await prisma.user.findFirst({
      where: { 
        clerkId: userId
      },
      select: { 
        id: true,
        defaultChart: true 
      }
    });
    
    if (!user || !user.defaultChart) return null;
    
    const chart = await prisma.birthChart.findUnique({
      where: { id: user.defaultChart }
    });
    
    return chart;
  } catch (error) {
    console.error("Error fetching default chart:", error);
    return null;
  }
};

// Set a user's default chart
export const setDefaultChart = async (userId: string, chartId: number) => {
  try {
    if (!userId || !chartId) {
      return {
        success: false,
        error: "Missing user ID or chart ID."
      };
    }
    
    // First, find the user by their Clerk ID
    const user = await prisma.user.findFirst({
      where: { 
        clerkId: userId
      }
    });
    
    if (!user) {
      return {
        success: false,
        error: "User not found."
      };
    }
    
    // Then verify that the chart belongs to this user
    const chart = await prisma.birthChart.findFirst({
      where: {
        id: chartId,
        userId: user.id
      }
    });
    
    if (!chart) {
      return {
        success: false,
        error: "Chart not found or does not belong to this user."
      };
    }
    
    // Update user's default chart preference
    await prisma.user.update({
      where: { id: user.id },
      data: {
        defaultChart: chartId
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
    'North Node': 'northnode',
    'South Node': 'southnode',
    'Lilith': 'lilith',
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

// Function to query city and timezone information from the database
export async function queryCityAndTimezone(cityName: string, countryCode?: string) {
  try {
    // First try to find the city in our database
    const city = await prisma.city.findFirst({
      where: {
        city_ascii: {
          contains: cityName,
          mode: 'insensitive'
        },
        ...(countryCode && {
          iso2: countryCode
        })
      }
    });

    if (!city) {
      console.log('City not found');
      return null;
    }

    // Find the timezone
    const timezone = await prisma.timeZone.findFirst({
      where: {
        zoneName: {
          contains: city.city_ascii,
          mode: 'insensitive'
        }
      }
    });

    return {
      city: {
        name: city.city_ascii,
        country: city.country,
        latitude: city.lat,
        longitude: city.lng,
        admin_name: city.admin_name
      },
      timezone: timezone ? {
        name: timezone.zoneName,
        offset: timezone.utcOffset
      } : null
    };
  } catch (error) {
    console.error('Error querying city and timezone:', error);
    return null;
  }
}