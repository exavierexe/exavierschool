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
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [showChart, setShowChart] = useState(false);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveResult, setSaveResult] = useState<{ success: boolean; error?: string; chartId?: number } | null>(null);
  const [savingChart, setSavingChart] = useState(false);
  const [selectedChartId, setSelectedChartId] = useState<number | null>(null);
  const [loadingStoredChart, setLoadingStoredChart] = useState(false);

  // Handler for showing the chart
  const handleShowChart = () => {
    setShowChart(true);
    setSaveResult(null);
    
    // Create a simple chart data object for demonstration
    const newChartData: ChartData = {
      title: `Birth Chart - ${date}`,
      date,
      time,
      location,
      planets: {
        sun: { name: 'Aries', symbol: '♈', longitude: 15, degree: 15 },
        moon: { name: 'Taurus', symbol: '♉', longitude: 45, degree: 15 },
        mercury: { name: 'Gemini', symbol: '♊', longitude: 75, degree: 15 },
        venus: { name: 'Cancer', symbol: '♋', longitude: 105, degree: 15 },
        mars: { name: 'Leo', symbol: '♌', longitude: 135, degree: 15 },
        jupiter: { name: 'Virgo', symbol: '♍', longitude: 165, degree: 15 },
        saturn: { name: 'Libra', symbol: '♎', longitude: 195, degree: 15 },
        uranus: { name: 'Scorpio', symbol: '♏', longitude: 225, degree: 15 },
        neptune: { name: 'Sagittarius', symbol: '♐', longitude: 255, degree: 15 },
        pluto: { name: 'Capricorn', symbol: '♑', longitude: 285, degree: 15 }
      },
      houses: {
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
        house12: { cusp: 330, name: 'Pisces', symbol: '♓', degree: 0 }
      },
      aspects: [],
      ascendant: { name: 'Aries', symbol: '♈', longitude: 0, degree: 0 }
    };
    
    setChartData(newChartData);
  };

  // Handler for updating the chart title
  const handleTitleChange = (title: string) => {
    setChartData(prevData => {
      if (!prevData) return null;
      return {
        ...prevData,
        title
      };
    });
  };

  // Handler for saving the chart
  const handleSaveChart = async (updatedChartData: ChartData) => {
    try {
      if (!isSignedIn || !user) {
        setSaveResult({
          success: false,
          error: "You must be logged in to save a chart."
        });
        return;
      }

      setSavingChart(true);
      setSaveResult(null);
      
      // Parse user ID from Clerk user object
      const userId = parseInt(user.id);
      if (isNaN(userId)) {
        throw new Error('Invalid user ID');
      }
      
      // Call the saveBirthChart server action with user ID
      const result = await saveBirthChart(updatedChartData, userId);
      
      // Update state with the result
      setSaveResult(result);
      
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
      setSavingChart(false);
    }
  };

  // Handler for selecting a saved chart
  const handleSelectChart = async (chartId: number) => {
    try {
      if (!isSignedIn || !user) {
        setError("You must be logged in to view saved charts.");
        return;
      }

      setLoadingStoredChart(true);
      setSelectedChartId(chartId);
      setSaveResult(null); // Clear any previous save results
      
      // Parse user ID from Clerk user object
      const userId = parseInt(user.id);
      if (isNaN(userId)) {
        throw new Error('Invalid user ID');
      }
      
      // Fetch the saved chart from the database
      const savedChart = await getBirthChartById(chartId, userId);
      
      if (!savedChart) {
        setError('Chart not found or you do not have permission to view it.');
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
      if (savedChart.northnode) planets.northnode = parsePosition(savedChart.northnode);
      if (savedChart.southnode) planets.southnode = parsePosition(savedChart.southnode);
      if (savedChart.lilith) planets.lilith = parsePosition(savedChart.lilith);

      
     
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
      console.error('Error loading chart:', error);
      setError('An error occurred while loading the chart.');
    } finally {
      setLoadingStoredChart(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Birth Chart Calculator</h1>
      
      {!isLoaded ? (
        <div className="text-center">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Enter Birth Details</h2>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="date">Birth Date (DD.MM.YYYY)</Label>
                    <Input
                      id="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      placeholder="e.g., 08.10.1995"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="time">Birth Time (HH:MM)</Label>
                    <Input
                      id="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      placeholder="e.g., 14:30"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="location">Birth Location</Label>
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g., New York, USA"
                    />
                  </div>
                  
                  <Button 
                    onClick={handleShowChart}
                    disabled={loading || !date || !time || !location}
                    className="w-full"
                  >
                    {loading ? 'Calculating...' : 'Calculate Chart'}
                  </Button>
                </div>
              </Card>
            </div>
            
            <div>
              {isSignedIn ? (
                <SavedBirthCharts 
                  userId={parseInt(user.id)} 
                  onSelectChart={handleSelectChart}
                />
              ) : (
                <Card className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Saved Charts</h2>
                  <p className="text-gray-400">
                    Please sign in to view and save your birth charts.
                  </p>
                </Card>
              )}
            </div>
          </div>
          
          {error && (
            <div className="mt-4 p-4 bg-red-900/50 border border-red-600 rounded">
              <p className="text-red-200">{error}</p>
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
                {chartData && (
                  <ZodiacWheel
                    chartData={chartData}
                    onSaveChart={isSignedIn ? handleSaveChart : undefined}
                    onTitleChange={handleTitleChange}
                  />
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
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