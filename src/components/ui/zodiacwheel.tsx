"use client";

import React, { useRef, useEffect, useState } from 'react';

// Planet symbols (unicode)
const PLANET_SYMBOLS: Record<string, string> = {
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
  midheaven: 'MC',     // Medium Coeli (Midheaven)
  northnode: '☊',       // Mean North Node
  trueNode: '☊',       // True North Node
  southnode: '☋',      // South Node (always opposite to North Node)
  lilith: '⚸',     // Lilith
  oscLilith: '⚸',      // Oscillating Lilith
  chiron: '⚷'         // Chiron
};

// Zodiac sign symbols (unicode)
const ZODIAC_SYMBOLS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer',
  'Leo', 'Virgo', 'Libra', 'Scorpio',
  'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

// South Indian chart order - defining the position of signs in the chart grid
// Starting from lower right and moving counterclockwise
const SOUTH_INDIAN_CHART_ORDER = [
  11, // Pisces - lower right
  0,  // Aries - going up
  1,  // Taurus
  2,  // Gemini - upper right
  3,  // Cancer - going left
  4,  // Leo
  5,  // Virgo - upper left
  6,  // Libra - going down
  7,  // Scorpio
  8,  // Sagittarius - lower left
  9,  // Capricorn - going right
  10  // Aquarius
];

export type Planet = {
  name: string; 
  symbol: string;
  longitude: number;
  degree: number;
};

export type House = {
  cusp: number;
  name: string;
  symbol: string;
  degree: number;
};

export type Aspect = {
  planet1: string;
  planet2: string;
  aspect: string;
  angle: number;
  orb: number;
  symbol: string;
  influence: string;
};

export type ChartData = {
  planets: Record<string, Planet>;
  houses: Record<string, House>;
  ascendant: Planet;
  aspects?: Aspect[];
  date?: string;
  time?: string;
  location?: string;
  title?: string;
  id?: number;
  userId?: number;
  rawOutput?: string; // Add raw output for Swiss Ephemeris data
  formattedDay?: string; // Day component formatted with leading zero
  formattedMonth?: string; // Month component formatted with leading zero
  formattedYear?: string; // Year component with 4 digits
  hour?: number; // Hour value from the time
  minute?: number; // Minute value from the time
};

type ZodiacWheelProps = {
  chartData: ChartData;
  width?: number;
  height?: number;
  onSaveChart?: (chartData: ChartData) => void;
  onTitleChange?: (title: string) => void;
  hideControls?: boolean; // New prop to hide edit title and export buttons
};

// Helper function to export chart as PNG image
export function exportChartAsImage(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  chartTitle: string = 'Birth Chart'
): void {
  if (!canvasRef.current) return;
  
  try {
    // Create a temporary anchor element
    const link = document.createElement('a');
    link.download = `${chartTitle.replace(/\s+/g, '-').toLowerCase()}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error exporting chart as image:', error);
  }
}

export function ZodiacWheel({ 
  chartData, 
  width = 600, 
  height = 600,
  onSaveChart,
  onTitleChange,
  hideControls = false
}: ZodiacWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tooltipInfo, setTooltipInfo] = useState<{ x: number; y: number; text: string } | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [scale, setScale] = useState(1);
  const [lastTouchDistance, setLastTouchDistance] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  // Default title if not provided
  const chartTitle = chartData.title || 'Birth Chart';
  
  // Initialize title value when chart data changes
  useEffect(() => {
    setTitleValue(chartTitle);
  }, [chartTitle]);
  
  // Calculate center and dimensions for the South Indian square chart
  const chartSize = Math.min(width, height) * 0.9; // Square chart size
  const cellSize = chartSize / 4; // Size of each cell in the grid
  const chartX = (width - chartSize) / 2; // Top-left X of the chart
  const chartY = (height - chartSize) / 2; // Top-left Y of the chart
  const centerX = width / 2; // Center X
  const centerY = height / 2; // Center Y
  
  // Define colors for elements
  const elementColors: Record<string, string> = {
    fire: 'rgba(255, 50, 0, 0.2)',    // Bright red for Fire (Aries, Leo, Sagittarius)
    earth: 'rgba(0, 180, 0, 0.2)',    // Rich green for Earth (Taurus, Virgo, Capricorn)
    air: 'rgba(255, 255, 0, 0.2)',    // Yellow for Air (Gemini, Libra, Aquarius)
    water: 'rgba(0, 100, 255, 0.2)'   // Blue for Water (Cancer, Scorpio, Pisces)
  };
  
  // Bright colors for planets
  const planetColors: Record<string, string> = {
    sun: '#ff0',          // Bright yellow
    moon: '#fff',         // White
    mercury: '#0ff',      // Cyan
    venus: '#f0f',        // Magenta
    mars: '#f00',         // Pure red
    jupiter: '#f80',      // Orange
    saturn: '#fb0',       // Gold
    uranus: '#0f8',       // Bright teal
    neptune: '#08f',      // Bright blue
    pluto: '#80f',        // Purple
    ascendant: '#ff0',    // Bright yellow
    midheaven: '#ff9',    // Light yellow
    meanNode: '#0f0',     // Bright green
    trueNode: '#0f0',     // Bright green
    southNode: '#f66',    // Light red
    meanLilith: '#f0f',   // Magenta
    chiron: '#0ff'        // Cyan
  };
  
  // Create a new Image element for the background chart
  const [chartImage, setChartImage] = useState<HTMLImageElement | null>(null);
  
  // Load the background image on component mount
  useEffect(() => {
    const img = new Image();
    img.src = '/visuals/zodiacsouth.PNG';
    img.onload = () => {
      setChartImage(img);
    };
  }, []);
  
  useEffect(() => {
    if (!canvasRef.current || !chartData) return;
    
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Clear canvas
      ctx.clearRect(0, 0, width, height);
      
      // Draw background
      drawBackground(ctx);
      
      // Draw the South Indian Chart using the background image
      if (chartImage) {
        drawSouthIndianChart(ctx);
      }
      
      // Draw planets in their respective houses
      drawPlanets(ctx);
      
      // Draw chart info in the center
      drawChartInfo(ctx);
      
    } catch (error) {
      console.error('Error drawing zodiac wheel:', error);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartData, width, height, chartImage]);
  
  const drawBackground = (ctx: CanvasRenderingContext2D) => {
    // Create a solid black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
  };
  
  const drawSouthIndianChart = (ctx: CanvasRenderingContext2D) => {
    if (!chartImage) return;
    
    // Calculate the size to maintain the square aspect ratio
    const chartSize = Math.min(width, height) * 0.9;
    
    // Draw the background image
    ctx.drawImage(
      chartImage,
      chartX,
      chartY,
      chartSize,
      chartSize
    );
    
    // Draw a thin white border around the chart for better visibility
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(chartX, chartY, chartSize, chartSize);
  };
  
  // Helper function to get the cell coordinates for each house
  const getHouseCellPosition = (houseIndex: number): {x: number, y: number} => {
    // Convert from house index to grid position
    // South Indian chart is arranged in a specific order around the central square
    const positions = [
      {x: 3, y: 3}, // House 1 (Pisces) - lower right
      {x: 3, y: 2}, // House 2 (Aries) - going up
      {x: 3, y: 1}, // House 3 (Taurus)
      {x: 3, y: 0}, // House 4 (Gemini) - upper right
      {x: 2, y: 0}, // House 5 (Cancer) - going left
      {x: 1, y: 0}, // House 6 (Leo)
      {x: 0, y: 0}, // House 7 (Virgo) - upper left
      {x: 0, y: 1}, // House 8 (Libra) - going down
      {x: 0, y: 2}, // House 9 (Scorpio)
      {x: 0, y: 3}, // House 10 (Sagittarius) - lower left
      {x: 1, y: 3}, // House 11 (Capricorn) - going right
      {x: 2, y: 3}  // House 12 (Aquarius)
    ];
    
    return positions[houseIndex];
  };
  
  // Get house index for a sign based on its longitude
  const getHouseForLongitude = (longitude: number): number => {
    // Convert longitude to sign index (0-11)
    const signIndex = Math.floor(longitude / 30) % 12;
    
    // Find the position of this sign in the South Indian chart
    return SOUTH_INDIAN_CHART_ORDER.indexOf(signIndex);
  };
  
  // Draw planets in their respective houses
  const drawPlanets = (ctx: CanvasRenderingContext2D) => {
    if (!chartData || !chartData.planets) {
      console.log('No chart data or planets found');
      return;
    }
    
    console.log('Chart data planets:', chartData.planets);
    
    // Filter valid planets with longitude data
    const planetEntries = Object.entries(chartData.planets)
      .filter(([name, planet]) => {
        const isValid = planet && typeof planet.longitude === 'number';
        if (!isValid) {
          console.log(`Filtered out planet ${name}:`, planet);
        }
        return isValid;
      });
    
    console.log('Filtered planet entries:', planetEntries);
    
    // Skip if no valid planets
    if (planetEntries.length === 0) {
      console.log('No valid planets found after filtering');
      return;
    }
    
    // Find the ascendant sign for marking
    const ascendantSign = Math.floor((chartData.ascendant?.longitude || 0) / 30) % 12;
    const ascendantHouseIndex = SOUTH_INDIAN_CHART_ORDER.indexOf(ascendantSign);
    
    // Mark the ascendant house with just a triangle in the upper right corner
    if (ascendantHouseIndex >= 0) {
      const cellPos = getHouseCellPosition(ascendantHouseIndex);
      const x = chartX + (cellPos.x + 0.9) * cellSize;
      const y = chartY + (cellPos.y + 0.1) * cellSize;
      
      // Draw a colored triangle with semi-transparency
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 20, y);
      ctx.lineTo(x, y + 20);
      ctx.closePath();
      ctx.fillStyle = '#ff0'; // Bright yellow
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha = 1.0; // Reset alpha
    }
    
    // Group planets by house
    const planetsByHouse: Record<number, Array<{name: string, planet: Planet}>> = {};
    
    // Process each planet
    planetEntries.forEach(([name, planet]) => {
      const longitude = planet.longitude;
      const signIndex = Math.floor(longitude / 30) % 12;
      const houseIndex = SOUTH_INDIAN_CHART_ORDER.indexOf(signIndex);
      
      if (houseIndex >= 0) {
        if (!planetsByHouse[houseIndex]) {
          planetsByHouse[houseIndex] = [];
        }
        planetsByHouse[houseIndex].push({ name, planet });
      }
    });
    
    // Draw planets in each house
    for (const [houseIndexStr, planets] of Object.entries(planetsByHouse)) {
      const houseIndex = parseInt(houseIndexStr);
      const cellPos = getHouseCellPosition(houseIndex);
      
      // Arrange planets within the cell
      const numPlanets = planets.length;
      const padding = 0.15; // Padding from cell edges
      const spacing = (1 - 2 * padding) / Math.max(numPlanets, 1);
      
      planets.forEach((planetData, index) => {
        const {name, planet} = planetData;
        
        // Calculate position for this planet within the cell
        let x, y;
        if (numPlanets <= 2) {
          // For 1-2 planets, center them in the cell
          x = chartX + (cellPos.x + 0.5) * cellSize;
          y = chartY + (cellPos.y + 0.5 + (index - numPlanets/2 + 0.5) * 0.3) * cellSize;
        } else {
          // For 3+ planets, arrange in a grid pattern
          const cols = Math.ceil(Math.sqrt(numPlanets));
          const rows = Math.ceil(numPlanets / cols);
          const col = index % cols;
          const row = Math.floor(index / cols);
          
          x = chartX + (cellPos.x + padding + (col + 0.5) * (1 - 2 * padding) / cols) * cellSize;
          y = chartY + (cellPos.y + padding + (row + 0.5) * (1 - 2 * padding) / rows) * cellSize;
        }
        
        // Draw a semi-transparent black background for better visibility
        ctx.beginPath();
        ctx.rect(x - 18, y - 18, 36, 36);  // Larger background for bigger symbols
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fill();
        
        // Draw planet symbol with larger font directly (no circle)
        // Special case for Sun - make it larger than other planets
        if (name === 'sun') {
          ctx.font = 'bold 32px Arial';  // Larger for the Sun
        } else {
          ctx.font = 'bold 30px Arial';  // Increased size for all other planets
        }
        ctx.fillStyle = planetColors[name] || '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Always use the symbol from PLANET_SYMBOLS
        const symbol = PLANET_SYMBOLS[name] || name.charAt(0).toUpperCase();
        ctx.fillText(symbol, x, y);
        
        // Show degree as small text below planet
        const degText = planet.degree.toFixed(0) + '°';
        ctx.font = '12px Arial';  // Slightly larger font for better readability
        ctx.fillStyle = '#fff';
        ctx.fillText(degText, x, y + 26);  // Moved further down to accommodate larger symbol
      });
    }
  };
  
  // Draw chart information in the center box
  const drawChartInfo = (ctx: CanvasRenderingContext2D) => {
    // Center area coordinates
    const centerX = chartX + cellSize * 1.1;
    const centerY = chartY + cellSize * 1.1;
    const centerWidth = cellSize * 1.8;
    const centerHeight = cellSize * 1.8;
    
    // Draw a semi-transparent background for better text readability
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(centerX, centerY, centerWidth, centerHeight);
    
    // Add inner border for aesthetics
   
    
    // Draw chart title
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(chartTitle, centerX + centerWidth / 2, centerY + 10);
    
    // Draw date, time, location if available - with improved visibility
    let yOffset = 35;
    
    // Draw a header for birth info
    ctx.font = 'bold 14px Arial';
    ctx.fillStyle = '#fff';
    ctx.fillText('Birth Information', centerX + centerWidth / 2, centerY + yOffset);
    yOffset += 20;
    
    // Date
    if (chartData.date) {
      ctx.font = '13px Arial';
      ctx.fillStyle = '#ffcc00'; // Use a brighter color for label
      ctx.textAlign = 'right';
      ctx.fillText('Date:', centerX + centerWidth / 2 - 5, centerY + yOffset);
      
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'left';
      ctx.fillText(chartData.date, centerX + centerWidth / 2 + 5, centerY + yOffset);
      yOffset += 18;
    }
    
    // Time
    if (chartData.time) {
      ctx.font = '13px Arial';
      ctx.fillStyle = '#ffcc00'; // Use a brighter color for label
      ctx.textAlign = 'right';
      ctx.fillText('Time:', centerX + centerWidth / 2 - 5, centerY + yOffset);
      
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'left';
      ctx.fillText(chartData.time, centerX + centerWidth / 2 + 5, centerY + yOffset);
      yOffset += 18;
    }
    
    // Location
    if (chartData.location) {
      ctx.font = '13px Arial';
      ctx.fillStyle = '#ffcc00'; // Use a brighter color for label
      ctx.textAlign = 'right';
      ctx.fillText('Location:', centerX + centerWidth / 2 - 5, centerY + yOffset);
      
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'left';
      
      // Split location into two lines if it's too long
      const locationText = chartData.location;
      const maxCharsPerLine = 20;
      
      if (locationText.length > maxCharsPerLine) {
        // Find the last space before the maxCharsPerLine
        const splitIndex = locationText.lastIndexOf(' ', maxCharsPerLine);
        const line1 = locationText.substring(0, splitIndex);
        const line2 = locationText.substring(splitIndex + 1);
        
        ctx.fillText(line1, centerX + centerWidth / 2 + 5, centerY + yOffset);
        yOffset += 18;
        ctx.fillText(line2, centerX + centerWidth / 2 + 5, centerY + yOffset);
      } else {
        ctx.fillText(locationText, centerX + centerWidth / 2 + 5, centerY + yOffset);
      }
      yOffset += 25;
    }
    
    // Divider line
    ctx.beginPath();
    ctx.moveTo(centerX + 15, centerY + yOffset - 5);
    ctx.lineTo(centerX + centerWidth - 15, centerY + yOffset - 5);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.stroke();
    
    // Draw planetary positions in a more compact format
    ctx.font = '11px Arial';
    ctx.textAlign = 'left';
    
    const planetKeys = Object.keys(chartData.planets).filter(key => 
      key !== 'ascendant' && key !== 'meanNode'
    );
    
    // Use 3 columns for more compact display
    const planetsPerColumn = Math.ceil(planetKeys.length / 3);
    const colWidth = centerWidth / 3;
    
    planetKeys.forEach((key, index) => {
      const planet = chartData.planets[key];
      if (!planet) return;
      
      const column = Math.floor(index / planetsPerColumn);
      const row = index % planetsPerColumn;
      
      const x = centerX + 10 + column * colWidth;
      const y = centerY + yOffset + row * 16;
      
      // Abbreviate sign names to 3 letters
      const signAbbr = getSignAbbreviation(planet.name);
      const position = `${planet.degree.toFixed(0)}° ${signAbbr}`;
      
      // Draw planet name entirely in its color
      ctx.fillStyle = planetColors[key] || '#fff';
      const planetName = key.charAt(0).toUpperCase() + key.slice(1, 3);
      ctx.fillText(planetName + ':', x, y);
      
      // Draw position in white
      ctx.fillStyle = '#fff';
      ctx.fillText(position, x + 30, y);
    });
    
    // Draw ascendant information
    if (chartData.ascendant) {
      const asc = chartData.ascendant;
      const signAbbr = getSignAbbreviation(asc.name);
      const degree = typeof asc.degree === 'number' ? asc.degree : parseFloat(asc.degree) || 0;
      
      ctx.fillStyle = '#ff0'; // Yellow for ascendant
      ctx.textAlign = 'center';
      ctx.font = 'bold 12px Arial';
      ctx.fillText(
        `Asc: ${degree.toFixed(0)}° ${signAbbr}`,
        centerX + centerWidth / 2,
        centerY + centerHeight - 15
      );
    }
  };
  
  // Helper function to abbreviate sign names
  const getSignAbbreviation = (signName: string): string => {
    // Return first 3 letters of sign name
    return signName.substring(0, 3);
  };
  
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!chartData || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Convert coordinates to cell position
    const cellX = Math.floor((x - chartX) / cellSize);
    const cellY = Math.floor((y - chartY) / cellSize);
    
    // Check if mouse is over a valid house cell (not the center)
    let houseIndex = -1;
    
    if (cellX >= 0 && cellX < 4 && cellY >= 0 && cellY < 4) {
      // Skip center area
      if (!(cellX === 1 && cellY === 1) && 
          !(cellX === 1 && cellY === 2) && 
          !(cellX === 2 && cellY === 1) && 
          !(cellX === 2 && cellY === 2)) {
          
        // Find which house cell this is
        for (let i = 0; i < 12; i++) {
          const pos = getHouseCellPosition(i);
          if (pos.x === cellX && pos.y === cellY) {
            houseIndex = i;
            break;
          }
        }
      }
    }
    
    // If not over a house cell, hide tooltip
    if (houseIndex === -1) {
      setTooltipInfo(null);
      return;
    }
    
    // Get the sign for this house
    const signIndex = SOUTH_INDIAN_CHART_ORDER[houseIndex];
    const signName = ZODIAC_SIGNS[signIndex];
    
    // Find planets in this house
    const planetsInHouse = Object.entries(chartData.planets)
      .filter(([_, planet]) => {
        const planetSignIndex = Math.floor(planet.longitude / 30) % 12;
        return planetSignIndex === signIndex;
      });
    
    // Create tooltip text
    let tooltipText = `${signName}`;
    
    if (planetsInHouse.length > 0) {
      tooltipText += '\n' + planetsInHouse
        .map(([name, planet]: [string, { degree: number | string }]) => {
          const degree = typeof planet.degree === 'number' ? planet.degree : parseFloat(planet.degree) || 0;
          return `${name}: ${degree.toFixed(1)}°`;
        })
        .join('\n');
    }
    
    setTooltipInfo({ x, y, text: tooltipText });
  };
  
  const handleMouseLeave = () => {
    setTooltipInfo(null);
  };
  
  // Handle title edit
  const handleTitleEdit = () => {
    setIsEditingTitle(true);
  };

  // Handle title save
  const handleTitleSave = () => {
    setIsEditingTitle(false);
    if (onTitleChange) {
      onTitleChange(titleValue);
    }
  };

  // Handle title input change
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitleValue(e.target.value);
  };

  // Handle export chart as image
  const handleExportChart = () => {
    exportChartAsImage(canvasRef, chartTitle);
  };

  // Handle saving chart
  const handleSaveChart = () => {
    if (onSaveChart) {
      // Create a new chart data object with the updated title
      const updatedChartData = {
        ...chartData,
        title: titleValue || chartTitle
      };
      onSaveChart(updatedChartData);
    }
  };

  // Handle touch start
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2) {
      // Calculate initial distance between two touches
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      setLastTouchDistance(distance);
    } else if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y
      });
    }
  };

  // Handle touch move
  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2) {
      // Calculate current distance between two touches
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      
      // Calculate zoom factor
      const zoomFactor = distance / lastTouchDistance;
      setScale(prevScale => Math.min(Math.max(prevScale * zoomFactor, 0.5), 3));
      setLastTouchDistance(distance);
    } else if (e.touches.length === 1 && isDragging) {
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y
      });
    }
  };

  // Handle touch end
  const handleTouchEnd = () => {
    setIsDragging(false);
    setLastTouchDistance(0);
  };

  // Reset zoom and position
  const handleDoubleClick = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  return (
    <div className="relative overflow-hidden">
      <div 
        className="touch-manipulation"
        style={{
          transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)`,
          transformOrigin: 'center',
          transition: isDragging ? 'none' : 'transform 0.1s ease-out'
        }}
      >
        <canvas 
          ref={canvasRef} 
          width={width} 
          height={height}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onDoubleClick={handleDoubleClick}
          className="border border-gray-700 rounded-lg shadow-xl cursor-crosshair"
        />
      </div>
      
      {tooltipInfo && (
        <div 
          className="absolute bg-black bg-opacity-80 text-white text-xs p-2 rounded pointer-events-none z-10 whitespace-pre-wrap max-w-[200px]"
          style={{ 
            left: tooltipInfo.x + 10, 
            top: tooltipInfo.y + 10,
            transform: tooltipInfo.x > width - 100 ? 'translateX(-100%)' : 'none'
          }}
        >
          {tooltipInfo.text}
        </div>
      )}

      {!hideControls && (
        <div className="mt-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 pl-4">
            {isEditingTitle ? (
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={titleValue}
                  onChange={handleTitleChange}
                  className="flex-1 p-2 rounded border border-gray-500 bg-gray-800 text-white"
                  placeholder="Chart Title"
                />
                <button 
                  onClick={handleTitleSave}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded"
                >
                  Save Title
                </button>
              </div>
            ) : (
              <button 
                onClick={handleTitleEdit}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
              >
                Edit Title
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handleExportChart}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded"
            >
              Export as PNG
            </button>
            
            {onSaveChart && (
              <button 
                onClick={handleSaveChart}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded"
              >
                Save Chart
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}