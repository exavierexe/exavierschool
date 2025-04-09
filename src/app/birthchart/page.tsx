'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { querySwissEph, saveBirthChart, getBirthChartById, getDefaultChart } from '../../actions'
import { ZodiacWheel, type ChartData, exportChartAsImage } from '@/components/ui/zodiacwheel'
import { SavedBirthCharts } from '@/components/ui/birth-chart-calculator'

// Helper function to parse JavaScript Ephemeris output into chart data
function parseSwissEphOutput(output: string): ChartData {
  if (!output) {
    // Return default chart data if no output
    return {
      planets: {
        sun: { name: 'Aries', symbol: '♈', longitude: 15, degree: 15 }
      },
      houses: {} as Record<string, { cusp: number; name: string; symbol: string; degree: number }>,
      ascendant: { name: 'Aries', symbol: '♈', longitude: 0, degree: 0 }
    };
  }
  
  // Define the types
  type PlanetData = { 
    name: string; 
    symbol: string; 
    longitude: number; 
    degree: number; 
  };
  
  type HouseData = { 
    cusp: number; 
    name: string; 
    symbol: string; 
    degree: number; 
  };
  
  const planets: Record<string, PlanetData> = {};
  const houses: Record<string, HouseData> = {};
  let ascendant: PlanetData = { name: 'Aries', symbol: '♈', longitude: 0, degree: 0 };
  
  // Zodiac signs and their symbols
  const ZODIAC_SIGNS = [
    'Aries', 'Taurus', 'Gemini', 'Cancer',
    'Leo', 'Virgo', 'Libra', 'Scorpio',
    'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
  ];
  const ZODIAC_SYMBOLS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
  
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
    'True Node': 'trueNode',
    'South Node': 'southnode',
    'Node': 'meanNode',            // Alternative name
    'Lilith': 'lilith',
    'osc. Lilith': 'oscLilith',    // Oscillating Lilith
          // Alternative name
    'Chiron': 'chiron',
    'Ceres': 'ceres',
    'Pallas': 'pallas',
    'Juno': 'juno',
    'Vesta': 'vesta',
    'Ascendant': 'ascendant', 
    'Asc': 'ascendant',            // Alternative name for Ascendant
    'Midheaven': 'midheaven',      // Midheaven
    'MC': 'midheaven'              // Alternative name for Midheaven
  };

  // Map planet keys to their symbols
  const planetSymbols: Record<string, string> = {
    sun: '☉',
    moon: '☽',
    mercury: '☿',
    venus: '♀',
    mars: '♂',
    jupiter: '♃',
    saturn: '♄',
    uranus: '♅',
    neptune: '♆',
    pluto: '♇',
    ascendant: 'Asc',
    midheaven: 'MC',
    meanNode: '☊',
    trueNode: '☊',
    southNode: '☋',
    meanLilith: '⚸',
    oscLilith: '⚸',
    chiron: '⚷'
  };
  
  // Parse the output line by line
  const lines = output.split('\n');
  
  // Debug the raw output
  console.log("Raw Ephemeris output:", output);
  
  // Check if we have the new JavaScript Ephemeris output format
  const isJavaScriptEphemeris = output.includes('---- EPHEMERIS OUTPUT ----');
  
  // Extract planet positions
  for (const line of lines) {
    // Skip empty lines or headers
    if (!line.trim() || line.includes('----') || line.includes('Date:') || line.includes('Time:') || line.includes('Location:')) continue;
    
    // Debug each line
    console.log("Processing line:", line);
    
    // Check for planet data in the new JavaScript Ephemeris format
    // Format: "Sun         15° Libra 5' 3.1""
    if (isJavaScriptEphemeris) {
      for (const [planetName, planetKey] of Object.entries(planetMap)) {
        if (line.startsWith(planetName)) {
          // Match degrees, sign, minutes, seconds format
          // Format: "Sun         15° Libra 5' 3.1""
          const degreeMatch = line.match(/(\d+)°\s+(\w+)\s+(\d+)'\s+(\d+\.?\d*)"/);
          
          if (degreeMatch) {
            console.log(`Found planet ${planetName} with data:`, degreeMatch);
            
            const degrees = parseInt(degreeMatch[1]);
            const signName = degreeMatch[2];
            const minutes = parseInt(degreeMatch[3]);
            const seconds = parseFloat(degreeMatch[4]);
            
            // Find the sign index
            const signIndex = ZODIAC_SIGNS.findIndex(s => s === signName);
            if (signIndex !== -1) {
              // Calculate precise degree within the sign
              const degreeInSign = degrees + (minutes / 60) + (seconds / 3600);
              // Calculate total longitude
              const absoluteDegree = signIndex * 30 + degreeInSign;
              
              // Check for retrograde symbol
              const isRetrograde = line.includes('R');
              
              // Create symbol with retrograde indicator if needed
              const baseSymbol = ZODIAC_SYMBOLS[signIndex];
              const symbol = isRetrograde ? `${baseSymbol}ᴿ` : baseSymbol;
              
              planets[planetKey] = {
                name: signName,
                symbol: symbol,
                longitude: absoluteDegree,
                degree: degreeInSign
              };
              
              console.log(`Parsed ${planetName} at ${absoluteDegree}° (${degreeInSign}° ${signName}), retrograde: ${isRetrograde}`);
              
              // If this is the Ascendant, store it separately
              if (planetName === 'Ascendant') {
                ascendant = planets[planetKey];
              }
            }
          } else {
            // Try older absolute degree format as fallback
            const absoluteDegreeMatch = line.match(/(\d+\.\d+)/);
            if (absoluteDegreeMatch) {
              const absoluteDegree = parseFloat(absoluteDegreeMatch[1]);
              const signIndex = Math.floor(absoluteDegree / 30) % 12;
              const sign = ZODIAC_SIGNS[signIndex];
              const degreeInSign = absoluteDegree % 30;
              
              // Check for retrograde symbol
              const isRetrograde = line.includes('R');
              
              // Create symbol with retrograde indicator if needed
              const baseSymbol = ZODIAC_SYMBOLS[signIndex];
              const symbol = isRetrograde ? `${baseSymbol}ᴿ` : baseSymbol;
              
              planets[planetKey] = {
                name: sign,
                symbol: symbol,
                longitude: absoluteDegree,
                degree: degreeInSign
              };
              
              console.log(`Parsed ${planetName} at ${absoluteDegree}° (${degreeInSign}° ${sign}), retrograde: ${isRetrograde}`);
              
              // If this is the Ascendant, store it separately
              if (planetName === 'Ascendant') {
                ascendant = planets[planetKey];
              }
            } else {
              console.log(`Could not match pattern for ${planetName} in line: ${line}`);
            }
          }
        }
      }
      
      // Check for house cusps in the new format
      // Format: "house 1     15° Libra 5' 3.1""
      const houseMatch = line.match(/house\s+(\d+)\s+(\d+)°\s+(\w+)\s+(\d+)'\s+(\d+\.?\d*)"/);
      if (houseMatch) {
        const houseNumber = parseInt(houseMatch[1]);
        const degrees = parseInt(houseMatch[2]);
        const signName = houseMatch[3];
        const minutes = parseInt(houseMatch[4]);
        const seconds = parseFloat(houseMatch[5]);
        
        // Find the sign index
        const signIndex = ZODIAC_SIGNS.findIndex(s => s === signName);
        if (signIndex !== -1) {
          // Calculate precise degree within the sign
          const degreeInSign = degrees + (minutes / 60) + (seconds / 3600);
          // Calculate total longitude
          const absoluteDegree = signIndex * 30 + degreeInSign;
          
          houses[`house${houseNumber}`] = {
            cusp: absoluteDegree,
            name: signName,
            symbol: ZODIAC_SYMBOLS[signIndex],
            degree: degreeInSign
          };
          
          console.log(`Parsed house ${houseNumber} cusp at ${absoluteDegree}° (${degreeInSign}° ${signName})`);
          
          // If this is house 1, use it as the ascendant
          if (houseNumber === 1) {
            ascendant = {
              name: signName,
              symbol: ZODIAC_SYMBOLS[signIndex],
              longitude: absoluteDegree,
              degree: degreeInSign
            };
          }
        }
      }
    } else {
      // Check if the line contains planet data with absolute degrees and motion (Swiss Ephemeris format)
      // Format: "Sun              195.2253469   0.9869944   6.9210360"
      for (const [planetName, planetKey] of Object.entries(planetMap)) {
        if (line.startsWith(planetName)) {
          // Extract the absolute degree and motion values
          // Format: "Sun              195.2253469   0.9869944   6.9210360"
          // We need to extract the first number (absolute degree) and second number (motion)
          const pattern = new RegExp(`${planetName}\\s+(\\d+\\.\\d+)\\s+([\\-\\+]?\\d+\\.\\d+)`);
          
          // Alternative pattern if there are more spaces than expected
          const alternativePattern = new RegExp(`${planetName}\\s+([\\d\\.]+)\\s+([\\-\\+]?[\\d\\.]+)`);
          
          let match = line.match(pattern);
          if (!match) {
            match = line.match(alternativePattern);
          }
          
          if (match) {
            console.log(`Found planet ${planetName} with data:`, match);
            
            // Parse the absolute degree (e.g., 195.2253469)
            const absoluteDegree = parseFloat(match[1]);
            
            // Parse the motion value (positive = direct, negative = retrograde)
            const motion = parseFloat(match[2]);
            const isRetrograde = motion < 0;
            
            // Calculate which sign the degree falls in (each sign is 30 degrees)
            const signIndex = Math.floor(absoluteDegree / 30) % 12;
            const sign = ZODIAC_SIGNS[signIndex];
            
            // Calculate degree within that sign
            const degreeInSign = absoluteDegree % 30;
            
            // Add retrograde indicator to the symbol if needed
            const baseSymbol = ZODIAC_SYMBOLS[signIndex];
            const symbol = isRetrograde ? `${baseSymbol}ᴿ` : baseSymbol;
            
            // Store planet data - make sure longitude is properly calculated
            planets[planetKey] = {
              name: sign,
              symbol: symbol,
              // This is the key longitude value that determines position on the wheel
              longitude: absoluteDegree,
              degree: degreeInSign
            };
            
            console.log(`Parsed ${planetName} at ${absoluteDegree}° (${degreeInSign}° ${sign}), retrograde: ${isRetrograde}`);
            
            // If this is the Ascendant, store it separately
            if (planetName === 'Ascendant') {
              ascendant = planets[planetKey];
            }
          } else {
            console.log(`Could not match pattern for ${planetName} in line: ${line}`);
          }
        }
      }
      
      // Check for house cusps data in various formats
      
      // Format: "house  1: 175.6389" or "house1: 175.6389"
      const houseAbsoluteMatch = line.match(/house\s*(\d+):\s*(\d+\.\d+)/);
      
      // Alternative pattern for just house number and degree
      const houseSimpleMatch = line.match(/house\s*(\d+)\s+(\d+\.\d+)/);
      
      // Traditional formats
      // "house  1: 15 Lib  5'" or "house  1: 15 Libra  5' 0.0""
      const houseTraditionalMatch = line.match(/house\s+(\d+):\s+(\d+)\s+(\w+)\s+(\d+)'(\s+(\d+\.\d+)")?/);
      
      if (houseAbsoluteMatch || houseSimpleMatch) {
        // Parse house with absolute degree
        const match = houseAbsoluteMatch || houseSimpleMatch;
        const houseNumber = parseInt(match![1]);
        const absoluteDegree = parseFloat(match![2]);
        
        // Calculate which sign the degree falls in
        const signIndex = Math.floor(absoluteDegree / 30) % 12;
        const sign = ZODIAC_SIGNS[signIndex];
        
        // Calculate degree within that sign
        const degreeInSign = absoluteDegree % 30;
        
        // Store house data - making sure cusp is the absolute degree
        houses[`house${houseNumber}`] = {
          cusp: absoluteDegree,
          name: sign,
          symbol: ZODIAC_SYMBOLS[signIndex],
          degree: degreeInSign
        };
        
        console.log(`Parsed house ${houseNumber} cusp at ${absoluteDegree}° (${degreeInSign}° ${sign})`);
        
        // If this is house 1, use it as the ascendant
        if (houseNumber === 1) {
          ascendant = {
            name: sign,
            symbol: ZODIAC_SYMBOLS[signIndex],
            longitude: absoluteDegree,
            degree: degreeInSign
          };
        }
      } else if (houseTraditionalMatch) {
        // Parse house with traditional format
        const houseNumber = parseInt(houseTraditionalMatch[1]);
        const degrees = parseInt(houseTraditionalMatch[2]);
        
        // Handle abbreviated sign names
        let sign = houseTraditionalMatch[3];
        if (sign.length <= 3) {
          // Map abbreviations to full names
          const abbrevMap: Record<string, string> = {
            'Ari': 'Aries', 'Tau': 'Taurus', 'Gem': 'Gemini', 'Can': 'Cancer',
            'Leo': 'Leo', 'Vir': 'Virgo', 'Lib': 'Libra', 'Sco': 'Scorpio',
            'Sag': 'Sagittarius', 'Cap': 'Capricorn', 'Aqu': 'Aquarius', 'Pis': 'Pisces'
          };
          sign = abbrevMap[sign] || sign;
        }
        
        const minutes = parseInt(houseTraditionalMatch[4]);
        // If seconds are available use them (captured in group 6), otherwise default to 0
        const seconds = houseTraditionalMatch[6] ? parseFloat(houseTraditionalMatch[6]) : 0;
        
        // Get the sign index
        const signIndex = ZODIAC_SIGNS.indexOf(sign);
        if (signIndex !== -1) {
          // Calculate decimal degrees within the sign including seconds
          const degreeInSign = degrees + (minutes / 60) + (seconds / 3600);
          
          // Calculate total cusp
          const cusp = signIndex * 30 + degreeInSign;
          
          // Store house data
          houses[`house${houseNumber}`] = {
            name: sign,
            symbol: ZODIAC_SYMBOLS[signIndex],
            cusp: cusp,
            degree: degreeInSign
          };
          
          // If this is house 1, use it for the ascendant
          if (houseNumber === 1) {
            ascendant = {
              name: sign,
              symbol: ZODIAC_SYMBOLS[signIndex],
              longitude: cusp,
              degree: degreeInSign
            };
          }
        }
      }
    }
  }
  
  // If no planets were found or critical planets are missing, create them for a valid chart
  const requiredPlanets = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'midheaven'];
  let missingPlanets = requiredPlanets.filter(planet => !planets[planet]);
  
  if (missingPlanets.length > 0) {
    console.log(`Missing required planets: ${missingPlanets.join(', ')}. Adding placeholders.`);
    
    // Add default positions for missing planets
    if (!planets.sun) planets.sun = { name: 'Aries', symbol: '♈', longitude: 15, degree: 15 };
    if (!planets.moon) planets.moon = { name: 'Taurus', symbol: '♉', longitude: 45, degree: 15 };
    if (!planets.mercury) planets.mercury = { name: 'Gemini', symbol: '♊', longitude: 75, degree: 15 };
    if (!planets.venus) planets.venus = { name: 'Cancer', symbol: '♋', longitude: 105, degree: 15 };
    if (!planets.mars) planets.mars = { name: 'Leo', symbol: '♌', longitude: 135, degree: 15 };
    if (!planets.jupiter) planets.jupiter = { name: 'Virgo', symbol: '♍', longitude: 165, degree: 15 };
    if (!planets.saturn) planets.saturn = { name: 'Libra', symbol: '♎', longitude: 195, degree: 15 };
    if (!planets.uranus) planets.uranus = { name: 'Scorpio', symbol: '♏', longitude: 225, degree: 15 };
    if (!planets.neptune) planets.neptune = { name: 'Sagittarius', symbol: '♐', longitude: 255, degree: 15 };
    if (!planets.pluto) planets.pluto = { name: 'Capricorn', symbol: '♑', longitude: 285, degree: 15 };
    if (!planets.trueNode) planets.trueNode = { name: 'Cancer', symbol: '☊', longitude: 105, degree: 15 };
    if (!planets.midheaven) planets.midheaven = { name: 'Pisces', symbol: '♓', longitude: 350, degree: 20 };
    
    // Use sun for ascendant if not found
    if (!ascendant || ascendant.longitude === 0) {
      ascendant = planets.sun;
    }
  }
  
  // Add south node based on true node
  if (planets.trueNode && !planets.southNode) {
    const trueNodeLong = planets.trueNode.longitude;
    const southNodeLong = (trueNodeLong + 180) % 360;
    const southNodeSignIndex = Math.floor(southNodeLong / 30);
    const southNodeDegree = southNodeLong % 30;
    
    planets.southNode = {
      name: ZODIAC_SIGNS[southNodeSignIndex],
      symbol: '☋',
      longitude: southNodeLong,
      degree: southNodeDegree
    };
  }
  
  // Create default houses if none were found
  if (Object.keys(houses).length === 0) {
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
  }
  
  // Return the chart data
  return {
    planets,
    houses,
    ascendant
  };
}

// Define constants here for reuse
const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer',
  'Leo', 'Virgo', 'Libra', 'Scorpio',
  'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

const ZODIAC_SYMBOLS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];

// Wrapper component to handle search params with Suspense
function ChartParamsWrapper({ children }: { children: (props: { chartIdFromUrl: string | null }) => React.ReactNode }) {
  const searchParams = useSearchParams();
  const chartIdFromUrl = searchParams.get('chart');
  
  return <>{children({ chartIdFromUrl })}</>;
}

// Helper function to get zodiac symbol from sign index
function getZodiacSymbol(signIndex: number): string {
  const ZODIAC_SYMBOLS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
  return ZODIAC_SYMBOLS[signIndex] || '?';
}

function SwissEphContent({ chartIdFromUrl }: { chartIdFromUrl: string | null }) {
  const { isLoaded, isSignedIn, user } = useUser();
  
  // Get current date in the user's local time zone
  const currentDate = new Date();
  console.log("Current date")
  console.log(currentDate)
  
  // Format date in DD.MM.YYYY format
  const formattedDate = `${currentDate.getDate().toString().padStart(2, '0')}.${(currentDate.getMonth() + 1).toString().padStart(2, '0')}.${currentDate.getFullYear()}`;
  console.log(formattedDate)
  // Get current time in HH:MM format in user's local time zone
  const formattedTime = `${currentDate.getHours().toString().padStart(2, '0')}:${currentDate.getMinutes().toString().padStart(2, '0')}`;
  
  // Default location state
  const [date, setDate] = useState(formattedDate)
  const [time, setTime] = useState(formattedTime)
  const [location, setLocation] = useState('') // Will be determined by geolocation
  const [locationLoading, setLocationLoading] = useState(true)
  
  // State for ephemeris calculation data
  const [planetData, setPlanetData] = useState<any>({})
  const [pointData, setPointData] = useState<any>({})
  const [houseData, setHouseData] = useState<any>({})
  
  // Get user's approximate location using geolocation API
  useEffect(() => {
    const getLocation = async () => {
      try {
        setLocationLoading(true);
        
        // Check if browser supports geolocation
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              try {
                // Get latitude and longitude
                const { latitude, longitude } = position.coords;
                
                // Attempt to get city name using a reverse geocoding service
                // Here we're using a simple approach that should work in most browsers
                const response = await fetch(
                  `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`
                );
                
                if (response.ok) {
                  const data = await response.json();
                  let locationStr = '';
                  
                  // Try to create a readable location string
                  if (data.address) {
                    // Get only city, state, and country (no county)
                    const city = data.address.city || data.address.town || data.address.village || '';
                    const state = data.address.state || '';
                    const country = data.address.country || '';
                    
                    // Build location string with just these three parts
                    if (city) locationStr += city;
                    if (state) locationStr += locationStr ? `, ${state}` : state;
                    if (country) locationStr += locationStr ? `, ${country}` : country;
                    
                    console.log("Detected location:", locationStr);
                  }
                  
                  // Set the user's location, or default to "Your Location" if geocoding failed
                  setLocation(locationStr || "Your Location");
                } else {
                  // Default location if the geocoding fails
                  setLocation("Your Location");
                }
              } catch (error) {
                console.error("Error getting location name:", error);
                setLocation("Your Location");
              } finally {
                setLocationLoading(false);
              }
            },
            (error) => {
              console.error("Geolocation error:", error);
              setLocation("New York, NY, USA"); // Default if geolocation fails
              setLocationLoading(false);
            },
            { timeout: 5000 } // 5 second timeout
          );
        } else {
          // Browser doesn't support geolocation
          console.log("Geolocation not supported by browser");
          setLocation("New York, NY, USA");
          setLocationLoading(false);
        }
      } catch (error) {
        console.error("Error in geolocation:", error);
        setLocation("New York, NY, USA");
        setLocationLoading(false);
      }
    };
    
    getLocation();
  }, []);
  const [result, setResult] = useState<{ output: string; error?: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [chartData, setChartData] = useState<ChartData | null>(null)
  const [showChart, setShowChart] = useState(false)
  const [savingChart, setSavingChart] = useState(false)
  const [saveResult, setSaveResult] = useState<{ success: boolean; error?: string; chartId?: number } | null>(null)
  const [selectedChartId, setSelectedChartId] = useState<number | null>(null)
  const [loadingStoredChart, setLoadingStoredChart] = useState(false)
  const [initialLoadDone, setInitialLoadDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    setChartData(null)
    setShowChart(false)
    
    try {
      // Format date for the API call
      const dateParts = date.split('.');
      const formattedDate = {
        day: parseInt(dateParts[0]),
        month: parseInt(dateParts[1]),
        year: parseInt(dateParts[2])
      };
      
      // Parse time
      const timeParts = time.split(':');
      const hour = parseInt(timeParts[0]);
      const minute = parseInt(timeParts[1]);
      
      // Call querySwissEph
      const response = await querySwissEph({
        date,
        time,
        location
      })
      
      // Store the raw response
      setResult(response)
      
      // Extract and store the calculation data
      if (response.planetData) setPlanetData(response.planetData);
      if (response.pointData) setPointData(response.pointData);
      if (response.houseData) setHouseData(response.houseData);
      
      // Log the data we received
      console.log("Received calculation data:", {
        planetData: response.planetData,
        pointData: response.pointData,
        houseData: response.houseData
      });
      
    } catch (error) {
      setResult({ output: '', error: 'Failed to execute query. Please try again.' })
    } finally {
      setLoading(false)
    }
  }
  
  const handleShowChart = () => {
    setShowChart(true);
    setSaveResult(null);
    
    // Create chart data using the stored calculation data
    const planets: Record<string, any> = {};
    
    // Define planet symbols
    const planetSymbols: Record<string, string> = {
      sun: '☉',
      moon: '☽',
      mercury: '☿',
      venus: '♀',
      mars: '♂',
      jupiter: '♃',
      saturn: '♄',
      uranus: '♅',
      neptune: '♆',
      pluto: '♇',
      ascendant: 'Asc',
      midheaven: 'MC',
      meanNode: '☊',
      trueNode: '☊',
      southNode: '☋',
      meanLilith: '⚸',
      oscLilith: '⚸',
      chiron: '⚷'
    };
    
    // Combine planet and point data
    for (const key in planetData) {
      if (planetData[key]) {
        planets[key] = {
          ...planetData[key],
          degree: parseFloat(planetData[key].degree) || 0,
          symbol: planetSymbols[key] || planetData[key].symbol
        };
      }
    }
    
    for (const key in pointData) {
      if (pointData[key]) {
        planets[key] = {
          ...pointData[key],
          degree: parseFloat(pointData[key].degree) || 0,
          symbol: planetSymbols[key] || pointData[key].symbol
        };
      }
    }
    
    // Ensure all required planets exist
    const requiredPlanets = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'midheaven'];
    for (const planet of requiredPlanets) {
      if (!planets[planet] || typeof planets[planet].degree !== 'number') {
        console.log(`Adding placeholder for ${planet}`);
        planets[planet] = {
          name: 'Aries',
          symbol: planetSymbols[planet] || '♈',
          longitude: 0,
          degree: 0
        };
      }
    }
    
    // Prepare houses data
    const houses: Record<string, any> = {};
    for (let i = 1; i <= 12; i++) {
      const houseKey = `house${i}`;
      const actionHouseKey = `House ${i}`;
      
      if (houseData[actionHouseKey]) {
        houses[houseKey] = {
          cusp: houseData[actionHouseKey].longitude,
          name: houseData[actionHouseKey].sign,
          symbol: getZodiacSymbol(ZODIAC_SIGNS.indexOf(houseData[actionHouseKey].sign)),
          degree: houseData[actionHouseKey].degree
        };
      }
    }
    
    // Get ascendant from houseData
    const ascendant = houseData['Ascendant'] ? {
      name: houseData['Ascendant'].sign,
      symbol: getZodiacSymbol(ZODIAC_SIGNS.indexOf(houseData['Ascendant'].sign)),
      longitude: houseData['Ascendant'].longitude,
      degree: houseData['Ascendant'].degree
    } : { name: 'Aries', symbol: '♈', longitude: 0, degree: 0 };
    
    // Create the chart data object
    const newChartData = {
      planets,
      houses,
      ascendant,
      date,
      time,
      location,
      title: `Birth Chart - ${date}`
    };
    
    console.log("Generated chart data:", newChartData);
    setChartData(newChartData);
  }
  
  // Handler for saving the chart
  const handleSaveChart = async (updatedChartData: ChartData) => {
    try {
      setSavingChart(true)
      setSaveResult(null)
      
      // Call the saveBirthChart server action
      const result = await saveBirthChart(updatedChartData)
      
      // Update state with the result
      setSaveResult(result)
      
      // Update the chart data with the saved title
      if (result.success && updatedChartData.title) {
        setChartData(prevData => {
          if (!prevData) return null;
          return {
            ...prevData,
            title: updatedChartData.title,
            id: result.chartId
          };
        });
      }
    } catch (error) {
      console.error("Error saving chart:", error);
      setSaveResult({
        success: false,
        error: "An unexpected error occurred while saving the chart."
      });
    } finally {
      setSavingChart(false)
    }
  }
  
  // Handler for updating the chart title
  const handleTitleChange = (title: string) => {
    setChartData(prevData => {
      if (!prevData) return null;
      return {
        ...prevData,
        title
      };
    });
  }
  
  // Load user's default chart or URL-specified chart on component mount
  useEffect(() => {
    const loadInitialChart = async () => {
      if (initialLoadDone || !isLoaded) return;
      
      try {
        setLoadingStoredChart(true);
        
        let chartToLoad = null;
        
        // If there's a chart ID in the URL, try to load that chart
        if (chartIdFromUrl) {
          const chartId = parseInt(chartIdFromUrl);
          if (!isNaN(chartId)) {
            chartToLoad = await getBirthChartById(chartId);
            setSelectedChartId(chartId);
          }
        } 
        // Otherwise, if the user is signed in, try to load their default chart
        else if (isSignedIn && user) {
          const userId = parseInt(user.id);
          if (!isNaN(userId)) {
            chartToLoad = await getDefaultChart(userId);
            if (chartToLoad) {
              setSelectedChartId(chartToLoad.id);
            }
          }
        }
        
        // If we found a chart to load, convert and display it
        if (chartToLoad) {
          // Convert the stored chart to our ChartData format
          // Parse planet positions from stored strings
          const planets: Record<string, any> = {};
          
          // Helper function to parse stored position strings like "Aries 15.5°"
          const parsePosition = (posStr: string | null): { name: string; symbol: string; longitude: number; degree: number } | null => {
            if (!posStr) return null;
            
            // Extract sign name and degrees
            const match = posStr.match(/([A-Za-z]+)\s+(\d+\.?\d*)°/);
            if (!match) return null;
            
            const signName = match[1];
            const degree = parseFloat(match[2]);
            
            // Find sign index
            const signIndex = ZODIAC_SIGNS.findIndex(sign => 
              sign.toLowerCase() === signName.toLowerCase()
            );
            
            if (signIndex === -1) return null;
            
            // Calculate absolute longitude (0-360)
            const longitude = signIndex * 30 + degree;
            
            return {
              name: ZODIAC_SIGNS[signIndex],
              symbol: ZODIAC_SYMBOLS[signIndex],
              longitude,
              degree
            };
          };
          
          // Add planets
          if (chartToLoad.sun) planets.sun = parsePosition(chartToLoad.sun);
          if (chartToLoad.moon) planets.moon = parsePosition(chartToLoad.moon);
          if (chartToLoad.mercury) planets.mercury = parsePosition(chartToLoad.mercury);
          if (chartToLoad.venus) planets.venus = parsePosition(chartToLoad.venus);
          if (chartToLoad.mars) planets.mars = parsePosition(chartToLoad.mars);
          if (chartToLoad.jupiter) planets.jupiter = parsePosition(chartToLoad.jupiter);
          if (chartToLoad.saturn) planets.saturn = parsePosition(chartToLoad.saturn);
          if (chartToLoad.uranus) planets.uranus = parsePosition(chartToLoad.uranus);
          if (chartToLoad.neptune) planets.neptune = parsePosition(chartToLoad.neptune);
          if (chartToLoad.pluto) planets.pluto = parsePosition(chartToLoad.pluto);
          
          // Parse ascendant
          const ascendant = parsePosition(chartToLoad.ascendant) || { 
            name: 'Unknown', symbol: '?', longitude: 0, degree: 0 
          };
          
          const convertedChart: ChartData = {
            title: chartToLoad.name,
            date: new Date(chartToLoad.birthDate).toLocaleDateString(),
            time: chartToLoad.birthTime,
            location: chartToLoad.birthPlace,
            planets,
            houses: chartToLoad.houses as any || {},
            aspects: chartToLoad.aspects as any || [],
            ascendant,
            id: chartToLoad.id,
          };
          
          // Calculate South Node from True Node if available
          if (convertedChart.planets.trueNode) {
            const trueNodeLong = convertedChart.planets.trueNode.longitude;
            const southNodeLong = (trueNodeLong + 180) % 360;
            const southNodeSignIndex = Math.floor(southNodeLong / 30);
            const southNodeDegree = southNodeLong % 30;
            
            convertedChart.planets.southNode = {
              name: ZODIAC_SIGNS[southNodeSignIndex],
              symbol: ZODIAC_SYMBOLS[southNodeSignIndex],
              longitude: southNodeLong,
              degree: southNodeDegree
            };
          }
          
          // Set chart data and show the chart
          setChartData(convertedChart);
          setShowChart(true);
        }
        
        // If no chart was loaded but we have a date and time, show the current chart
        if (!chartToLoad && !date && !time) {
          // Get the current date and time
          const now = new Date();
          setDate(`${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()}`);
          setTime(now.toLocaleTimeString());
        }
      } catch (error) {
        console.error('Error loading initial chart:', error);
      } finally {
        setLoadingStoredChart(false);
        setInitialLoadDone(true);
      }
    };
    
    loadInitialChart();
  }, [chartIdFromUrl, isLoaded, isSignedIn, user, initialLoadDone, date, time]);
  
  // Handler for selecting a saved chart
  const handleSelectChart = async (chartId: number) => {
    try {
      setLoadingStoredChart(true);
      setSelectedChartId(chartId);
      setSaveResult(null); // Clear any previous save results
      
      // Fetch the saved chart from the database
      const savedChart = await getBirthChartById(chartId);
      
      if (!savedChart) {
        console.error('Chart not found');
        return;
      }
      
      // Convert the stored chart to our ChartData format
      // Parse planet positions from stored strings
      const planets: Record<string, any> = {};
      
      // Helper function to parse stored position strings like "Aries 15.5°"
      const parsePosition = (posStr: string | null): { name: string; symbol: string; longitude: number; degree: number } | null => {
        if (!posStr) return null;
        
        // Extract sign name and degrees
        const match = posStr.match(/([A-Za-z]+)\s+(\d+\.?\d*)°/);
        if (!match) return null;
        
        const signName = match[1];
        const degree = parseFloat(match[2]);
        
        // Find sign index
        const signIndex = ZODIAC_SIGNS.findIndex(sign => 
          sign.toLowerCase() === signName.toLowerCase()
        );
        
        if (signIndex === -1) return null;
        
        // Calculate absolute longitude (0-360)
        const longitude = signIndex * 30 + degree;
        
        // Create proper zodiac symbol
        const symbol = ZODIAC_SYMBOLS[signIndex];
        
        return {
          name: ZODIAC_SIGNS[signIndex],
          symbol,
          longitude,
          degree
        };
      };
      
      // Add planets
      if (savedChart.sun) planets.sun = parsePosition(savedChart.sun);
      if (savedChart.moon) planets.moon = parsePosition(savedChart.moon);
      if (savedChart.mercury) planets.mercury = parsePosition(savedChart.mercury);
      if (savedChart.venus) planets.venus = parsePosition(savedChart.venus);
      if (savedChart.mars) planets.mars = parsePosition(savedChart.mars);
      if (savedChart.jupiter) planets.jupiter = parsePosition(savedChart.jupiter);
      if (savedChart.saturn) planets.saturn = parsePosition(savedChart.saturn);
      if (savedChart.uranus) planets.uranus = parsePosition(savedChart.uranus);
      if (savedChart.neptune) planets.neptune = parsePosition(savedChart.neptune);
      if (savedChart.pluto) planets.pluto = parsePosition(savedChart.pluto);
      
      // Add true node (North Node)
      const trueNodePos = parsePosition(savedChart.trueNode);
      if (trueNodePos) {
        planets.trueNode = trueNodePos;
        
        // Calculate South Node (always 180° opposite to True Node)
        const southNodeLongitude = (trueNodePos.longitude + 180) % 360;
        const southNodeSignIndex = Math.floor(southNodeLongitude / 30);
        const southNodeDegree = southNodeLongitude % 30;
        
        planets.southNode = {
          name: ZODIAC_SIGNS[southNodeSignIndex],
          symbol: ZODIAC_SYMBOLS[southNodeSignIndex],
          longitude: southNodeLongitude,
          degree: southNodeDegree
        };
      }
      
      // Parse ascendant
      const ascendant = parsePosition(savedChart.ascendant) || { 
        name: 'Unknown', symbol: ZODIAC_SYMBOLS[0], longitude: 0, degree: 0 
      };
      
      // Parse midheaven if available
      if (savedChart.midheaven) {
        planets.midheaven = parsePosition(savedChart.midheaven);
      }
      
      const convertedChart: ChartData = {
        title: savedChart.name,
        date: new Date(savedChart.birthDate).toLocaleDateString(),
        time: savedChart.birthTime,
        location: savedChart.birthPlace,
        planets,
        houses: savedChart.houses as any || {},
        aspects: savedChart.aspects as any || [],
        ascendant,
        id: savedChart.id,
      };
      
      // Set chart data and show the chart
      setChartData(convertedChart);
      setShowChart(true);
      
      // Also update the form fields to match the chart data
      // This helps if user wants to make adjustments to the saved chart
      const birthDate = new Date(savedChart.birthDate);
      setDate(`${birthDate.getDate().toString().padStart(2, '0')}.${(birthDate.getMonth() + 1).toString().padStart(2, '0')}.${birthDate.getFullYear()}`);
      setTime(savedChart.birthTime);
      setLocation(savedChart.birthPlace);
      
      // Scroll the chart into view
      setTimeout(() => {
        const chartElement = document.getElementById('chart-display');
        if (chartElement) {
          chartElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      
    } catch (error) {
      console.error('Error loading saved chart:', error);
    } finally {
      setLoadingStoredChart(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Birth Chart Calculator</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Calculate New Chart</h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="date">Date (DD.MM.YYYY)</Label>
                  <Input 
                    id="date" 
                    placeholder="08.10.1995"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Format: 08.10.1995 (Day.Month.Year)</p>
                </div>
                
                <div>
                  <Label htmlFor="time">Time (HH:MM)</Label>
                  <Input 
                    id="time" 
                    placeholder="19:56"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Format: 19:56 (24-hour format, local time for the location)</p>
                </div>
                
                <div>
                  <Label htmlFor="location">Birth Location</Label>
                  <Input 
                    id="location" 
                    placeholder={locationLoading ? "Detecting your location..." : "Enter your birth location"}
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    required
                    disabled={locationLoading}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {locationLoading 
                      ? "Getting your current location..." 
                      : "Enter city name, optionally with state/country (e.g., \"New York, NY\" or \"Paris, France\")"}
                  </p>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Calculate Birth Chart'}
                </Button>
              </div>
            </form>
          </Card>
          
          {/* Saved Charts Section */}
          <div className="mt-8">
            <SavedBirthCharts onSelectChart={handleSelectChart} />
          </div>
        </div>
        
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Results</h2>
          {result ? (
            <>
              {result.error && (
                <div className="bg-red-900/50 border border-red-600 rounded-md p-3 mb-4">
                  <p className="text-red-200 font-medium">{result.error}</p>
                  <p className="text-gray-300 text-xs mt-2">
                    This could be due to missing libraries or configuration issues with the Swiss Ephemeris.
                  </p>
                </div>
              )}
              
              <div className="bg-black p-4 rounded-md border border-gray-700 h-[500px] overflow-auto">
                <pre className="font-mono text-sm whitespace-pre-wrap">
                  {result.output.split('\n').map((line, index) => {
                    // Display headers in cyan
                    if (line.includes('----') || line.startsWith('Date:') || line.startsWith('Time:') || line.startsWith('Location:')) {
                      return <div key={index} className="text-cyan-400 font-bold">{line}</div>;
                    }
                    // Display planet data in green
                    else if (line.match(/^(Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto|Chiron|Node|Apogee)/)) {
                      return <div key={index} className="text-green-400">{line}</div>;
                    }
                    // Display errors in red
                    else if (line.toLowerCase().includes('error') || line.toLowerCase().includes('illegal')) {
                      return <div key={index} className="text-red-400">{line}</div>;
                    }
                    // Regular output
                    return <div key={index} className="text-gray-300">{line}</div>;
                  })}
                </pre>
              </div>
              
              {/* Always show button for testing */}
              {result.output && !showChart && (
                <div className="mt-4">
                  <Button 
                    onClick={handleShowChart}
                    className="w-full bg-indigo-700 hover:bg-indigo-600"
                  >
                    Generate Natal Chart
                  </Button>
                </div>
              )}
              
              {showChart && (
                <div id="chart-display" className="mt-6 rounded-lg overflow-hidden">
                  <h2 className="text-xl font-semibold mb-2">Natal Chart</h2>
                  
                  {saveResult && (
                    <div className={`mb-4 p-3 rounded ${saveResult.success ? 'bg-green-900/50 border border-green-600' : 'bg-red-900/50 border border-red-600'}`}>
                      {saveResult.success ? (
                        <p className="text-green-200">Chart saved successfully! Chart ID: {saveResult.chartId}</p>
                      ) : (
                        <p className="text-red-200">{saveResult.error || "Failed to save chart."}</p>
                      )}
                    </div>
                  )}
                  
                  <div className="flex justify-center">
                    <ZodiacWheel 
                      chartData={chartData || {
                        planets: (() => {
                          // Combine planet and point data
                          const combinedData: Record<string, any> = {};
                          
                          // Add planet data if available
                          if (Object.keys(planetData).length > 0) {
                            Object.entries(planetData).forEach(([key, value]) => {
                              combinedData[key] = value;
                            });
                          }
                          
                          // Add point data if available
                          if (Object.keys(pointData).length > 0) {
                            Object.entries(pointData).forEach(([key, value]) => {
                              combinedData[key] = value;
                            });
                          }
                          
                          // Return combined data or defaults if empty
                          return Object.keys(combinedData).length > 0 ? combinedData : {
                            sun: { name: 'Aries', symbol: '♈', longitude: 15, degree: 15 },
                            moon: { name: 'Taurus', symbol: '♉', longitude: 45, degree: 15 },
                            mercury: { name: 'Gemini', symbol: '♊', longitude: 75, degree: 15 },
                          };
                        })(),
                        houses: Object.keys(houseData).length > 0 ? 
                          // Convert house format to match what ZodiacWheel expects
                          Object.entries(houseData)
                            .filter(([key]) => key.startsWith('House '))
                            .reduce((acc, [key, value]) => {
                              const houseNum = parseInt(key.replace('House ', ''));
                              if (!isNaN(houseNum) && houseNum >= 1 && houseNum <= 12) {
                                const houseKey = `house${houseNum}`;
                                acc[houseKey] = {
                                  cusp: (value as any).longitude,
                                  name: (value as any).sign,
                                  symbol: getZodiacSymbol(ZODIAC_SIGNS.indexOf((value as any).sign)),
                                  degree: (value as any).degree,
                                  longitude: (value as any).longitude
                                };
                              }
                              return acc;
                            }, {} as Record<string, any>) : 
                          // Default houses if none provided
                          {
                            house1: { cusp: 0, name: 'Aries', symbol: '♈', degree: 0 },
                            house2: { cusp: 30, name: 'Taurus', symbol: '♉', degree: 0 },
                            house3: { cusp: 60, name: 'Gemini', symbol: '♊', degree: 0 },
                            house4: { cusp: 90, name: 'Cancer', symbol: '♋', degree: 0 },
                            house5: { cusp: 120, name: 'Leo', symbol: '♌', degree: 0 },
                            house6: { cusp: 150, name: 'Virgo', symbol: '♍', degree: 0 },
                            house7: { cusp: 180, name: 'Libra', symbol: '♎', degree: 0 },
                            house8: { cusp: 210, name: 'Scorpio', symbol: '♏', degree: 0 },
                            house9: { cusp: 240, name: 'Sagittarius', symbol: '♐', degree: 0 },
                            house10: { cusp: 270, name: 'Capricorn', symbol: '♑', degree: 0 },
                            house11: { cusp: 300, name: 'Aquarius', symbol: '♒', degree: 0 },
                            house12: { cusp: 330, name: 'Pisces', symbol: '♓', degree: 0 },
                          },
                        ascendant: houseData['Ascendant'] ? {
                          name: houseData['Ascendant'].sign,
                          symbol: getZodiacSymbol(ZODIAC_SIGNS.indexOf(houseData['Ascendant'].sign)),
                          longitude: houseData['Ascendant'].longitude,
                          degree: houseData['Ascendant'].degree
                        } : { name: 'Aries', symbol: '♈', longitude: 0, degree: 0 },
                        date: date,
                        time: time,
                        location: location,
                        title: `Birth Chart - ${date}`,
                      } as ChartData} 
                      width={window.innerWidth < 768 ? window.innerWidth - 40 : 600} 
                      height={window.innerWidth < 768 ? window.innerWidth - 40 : 600}
                      onSaveChart={handleSaveChart}
                      onTitleChange={handleTitleChange}
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-gray-500 italic">
              Results will appear here after you run a query.
            </div>
          )}
        </Card>
      </div>
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Common Parameters</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="p-4">
            <h3 className="font-bold">-p[planets]</h3>
            <p className="text-sm">Specify planets: 0=Sun through 9=Pluto, D=nodes, A=mean node, t=true node, j=lilith</p>
          </Card>
          <Card className="p-4">
            <h3 className="font-bold">-fPlsj</h3>
            <p className="text-sm">Format output with planet name, longitude in signs</p>
          </Card>
          <Card className="p-4">
            <h3 className="font-bold">-head</h3>
            <p className="text-sm">Include headers in output</p>
          </Card>
          <Card className="p-4">
            <h3 className="font-bold">-house[long],[lat],[system]</h3>
            <p className="text-sm">Calculate house cusps (P=Placidus, K=Koch, O=Porphyrius, R=Regiomontanus, etc.)</p>
          </Card>
          <Card className="p-4">
            <h3 className="font-bold">-eswe</h3>
            <p className="text-sm">Use Swiss Ephemeris</p>
          </Card>
          <Card className="p-4">
            <h3 className="font-bold">-b[date]</h3>
            <p className="text-sm">Birth date (automatically added)</p>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function SwissEphPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8">Loading chart data...</div>}>
      <ChartParamsWrapper>
        {({ chartIdFromUrl }) => <SwissEphContent chartIdFromUrl={chartIdFromUrl} />}
      </ChartParamsWrapper>
    </Suspense>
  );
}