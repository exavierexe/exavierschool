'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { querySwissEph, saveBirthChart, getBirthChartById, getDefaultChart } from '@/actions'
import { ZodiacWheel } from '@/components/ui/zodiacwheel'
import { SavedBirthCharts } from '@/components/ui/birth-chart-calculator'
import { SignedIn, SignedOut } from '@clerk/nextjs'
import { currentUser } from '@clerk/nextjs/server'
import type { ChartData } from '@/components/ui/zodiacwheel'

// Define zodiac constants
const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer',
  'Leo', 'Virgo', 'Libra', 'Scorpio',
  'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

const ZODIAC_SYMBOLS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];

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
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveResult, setSaveResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [showChart, setShowChart] = useState(false);
  const [loadingStoredChart, setLoadingStoredChart] = useState(false);

  const handleCalculate = async () => {
    try {
      setLoading(true);
      setError(null);
      setSaveResult(null);

      if (!date || !time || !location) {
        setError('Please fill in all required fields');
        return;
      }

      const result = await querySwissEph({ date, time, location });
      
      if (result.error) {
        setError(result.error);
        return;
      }

      // Convert the result to ChartData format
      const chartData: ChartData = {
        title: `Birth Chart - ${date}`,
        date,
        time,
        location,
        planets: {},
        houses: {},
        ascendant: { name: 'Aries', symbol: '♈', longitude: 0, degree: 0 }
      };

      // Convert planet data
      if (result.planetData) {
        Object.entries(result.planetData).forEach(([key, data]: [string, any]) => {
          if (data && typeof data.longitude === 'number') {
            const signIndex = Math.floor(data.longitude / 30) % 12;
            const degree = data.longitude % 30;
            
            chartData.planets[key] = {
              name: data.name || ZODIAC_SIGNS[signIndex],
              symbol: data.symbol || ZODIAC_SYMBOLS[signIndex],
              longitude: data.longitude,
              degree: degree
            };
          }
        });
      }

      // Convert house data
      if (result.houseData) {
        Object.entries(result.houseData).forEach(([key, data]: [string, any]) => {
          if (data && typeof data.cusp === 'number') {
            const signIndex = Math.floor(data.cusp / 30) % 12;
            chartData.houses[key] = {
              cusp: data.cusp,
              name: data.name || ZODIAC_SIGNS[signIndex],
              symbol: data.symbol || ZODIAC_SYMBOLS[signIndex],
              degree: data.cusp % 30
            };
          }
        });
      }

      // Set ascendant if available
      if (result.houseData?.Ascendant) {
        const ascData = result.houseData.Ascendant;
        const signIndex = Math.floor(ascData.cusp / 30) % 12;
        chartData.ascendant = {
          name: ascData.name || ZODIAC_SIGNS[signIndex],
          symbol: ascData.symbol || ZODIAC_SYMBOLS[signIndex],
          longitude: ascData.cusp,
          degree: ascData.cusp % 30
        };
      }

      setChartData(chartData);
      setShowChart(true);
    } catch (err) {
      console.error('Error calculating chart:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChart = async () => {
    if (!isSignedIn || !user) {
      setSaveResult({
        success: false,
        error: "You must be logged in to save charts."
      });
      return;
    }

    try {
      setLoading(true);
      const result = await saveBirthChart(chartData, user.id);
      setSaveResult(result);
    } catch (err) {
      console.error('Error saving chart:', err);
      setSaveResult({
        success: false,
        error: "Failed to save chart. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  // Load user's default chart or URL-specified chart on component mount
  useEffect(() => {
    const loadInitialChart = async () => {
      if (!isLoaded) return;

      if (chartIdFromUrl) {
        try {
          setLoadingStoredChart(true);
          if (!isSignedIn || !user) {
            setSaveResult({
              success: false,
              error: "You must be logged in to view saved charts."
            });
            return;
          }

          const chartToLoad = await getBirthChartById(parseInt(chartIdFromUrl), parseInt(user.id));
          if (chartToLoad) {
            // Convert stored chart data to ChartData format
            const planetData: ChartData['planets'] = {};
            const houseData: ChartData['houses'] = {};
            
            // Convert planet positions
            Object.entries(chartToLoad).forEach(([key, value]) => {
              if (['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'].includes(key)) {
                const planetInfo = typeof value === 'string' ? JSON.parse(value) : value;
                if (planetInfo && typeof planetInfo === 'object') {
                  planetData[key] = {
                    name: planetInfo.name || 'Unknown',
                    symbol: planetInfo.symbol || '?',
                    longitude: planetInfo.longitude || 0,
                    degree: planetInfo.degree || 0
                  };
                }
              }
            });

            // Convert house positions
            for (let i = 1; i <= 12; i++) {
              const houseKey = `house${i}`;
              const houseInfo = chartToLoad[houseKey];
              if (houseInfo) {
                const parsedHouse = typeof houseInfo === 'string' ? JSON.parse(houseInfo) : houseInfo;
                houseData[houseKey] = {
                  cusp: parsedHouse.cusp || 0,
                  name: parsedHouse.name || 'Unknown',
                  symbol: parsedHouse.symbol || '?',
                  degree: parsedHouse.degree || 0
                };
              }
            }

            // Parse ascendant
            const ascendantInfo = typeof chartToLoad.ascendant === 'string' 
              ? JSON.parse(chartToLoad.ascendant)
              : chartToLoad.ascendant;

            const convertedChart: ChartData = {
              title: chartToLoad.name || 'Birth Chart',
              date: chartToLoad.birthDate ? new Date(chartToLoad.birthDate).toLocaleDateString() : undefined,
              time: chartToLoad.birthTime || undefined,
              location: chartToLoad.birthPlace || undefined,
              planets: planetData,
              houses: houseData,
              ascendant: ascendantInfo || {
                name: 'Aries',
                symbol: '♈',
                longitude: 0,
                degree: 0
              },
              id: chartToLoad.id
            };
            
            setChartData(convertedChart);
          }
        } catch (err) {
          console.error('Error loading chart:', err);
          setError('Failed to load chart');
        } finally {
          setLoadingStoredChart(false);
        }
      } else if (isSignedIn && user) {
        try {
          setLoadingStoredChart(true);
          const defaultChart = await getDefaultChart(parseInt(user.id));
          if (defaultChart) {
            // Convert default chart using the same conversion logic
            const planetData: ChartData['planets'] = {};
            const houseData: ChartData['houses'] = {};
            
            // Convert planet positions
            Object.entries(defaultChart).forEach(([key, value]) => {
              if (['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'].includes(key)) {
                const planetInfo = typeof value === 'string' ? JSON.parse(value) : value;
                if (planetInfo && typeof planetInfo === 'object') {
                  planetData[key] = {
                    name: planetInfo.name || 'Unknown',
                    symbol: planetInfo.symbol || '?',
                    longitude: planetInfo.longitude || 0,
                    degree: planetInfo.degree || 0
                  };
                }
              }
            });

            const convertedChart: ChartData = {
              title: defaultChart.name || 'Birth Chart',
              date: defaultChart.birthDate ? new Date(defaultChart.birthDate).toLocaleDateString() : undefined,
              time: defaultChart.birthTime || undefined,
              location: defaultChart.birthPlace || undefined,
              planets: planetData,
              houses: houseData,
              ascendant: {
                name: 'Aries',
                symbol: '♈',
                longitude: 0,
                degree: 0
              },
              id: defaultChart.id
            };
            
            setChartData(convertedChart);
          }
        } catch (err) {
          console.error('Error loading default chart:', err);
        } finally {
          setLoadingStoredChart(false);
        }
      }
    };

    loadInitialChart();
  }, [isLoaded, isSignedIn, user, chartIdFromUrl]);

  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="date">Date of Birth</Label>
              <Input
                id="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="MM/DD/YYYY"
                disabled={loading}
              />
            </div>
            <div>
              <Label htmlFor="time">Time of Birth</Label>
              <Input
                id="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="HH:MM AM/PM"
                disabled={loading}
              />
            </div>
            <div>
              <Label htmlFor="location">Location of Birth</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, Country"
                disabled={loading}
              />
            </div>
            <Button onClick={handleCalculate} disabled={loading}>
              {loading ? 'Calculating...' : 'Calculate Chart'}
            </Button>
          </div>
        </Card>

        {showChart && chartData && (
          <Card className="p-4">
            <div className="flex flex-col items-center space-y-4">
              <ZodiacWheel chartData={chartData} width={600} height={600} />
              <SignedIn>
                <Button onClick={handleSaveChart} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Chart'}
                </Button>
              </SignedIn>
            </div>
          </Card>
        )}

        {error && (
          <div className="col-span-2">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          </div>
        )}

        {saveResult && (
          <div className="col-span-2">
            <div className={`${saveResult.success ? 'bg-green-100 border-green-400 text-green-700' : 'bg-red-100 border-red-400 text-red-700'} px-4 py-3 rounded relative`} role="alert">
              <span className="block sm:inline">
                {saveResult.success ? 'Chart saved successfully!' : saveResult.error}
              </span>
            </div>
          </div>
        )}
      </div>

      <SignedIn>
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Your Saved Charts</h2>
          <SavedBirthCharts userId={user ? parseInt(user.id) : undefined} />
        </div>
      </SignedIn>
    </div>
  );
}

export default function BirthChartPage() {
  const searchParams = useSearchParams();
  const chartId = searchParams.get('chartId');

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SwissEphContent chartIdFromUrl={chartId} />
    </Suspense>
  );
}