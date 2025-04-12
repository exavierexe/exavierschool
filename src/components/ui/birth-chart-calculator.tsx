'use client';

import { useState, useEffect } from 'react';
import { Card } from './card';
import { Button } from './button';
import { getBirthCharts, deleteBirthChart } from '@/actions';
import { ZodiacWheel } from '@/components/ui/zodiacwheel';
import { ChartData } from '@/components/ui/zodiacwheel';

// Zodiac signs and their symbols
const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer',
  'Leo', 'Virgo', 'Libra', 'Scorpio',
  'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];
const ZODIAC_SYMBOLS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];

type BirthChart = {
  id: number;
  userId: number;
  name: string;
  birthDate: Date;
  birthTime: string;
  birthPlace: string;
  createdAt: Date;
  updatedAt: Date;
  sun: string;
  moon: string;
  mercury: string;
  venus: string;
  mars: string;
  jupiter: string;
  saturn: string;
  uranus: string;
  neptune: string;
  pluto: string;
  ascendant: string | null;
  houses: any; // Allow any type for JSON fields
  aspects: any; // Allow any type for JSON fields
};

type SavedChartProps = {
  userId?: string;
  onSelectChart?: (chartId: number) => void;
};

export function SavedBirthCharts({ userId, onSelectChart }: SavedChartProps) {
  const [charts, setCharts] = useState<BirthChart[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChart, setSelectedChart] = useState<BirthChart | null>(null);
  const [showChart, setShowChart] = useState(false);
  const [chartData, setChartData] = useState<ChartData | null>(null);

  // Load charts on component mount
  useEffect(() => {
    const loadCharts = async () => {
      if (!userId) return;
      
      try {
        setLoading(true);
        const userCharts = await getBirthCharts(userId);
        setCharts(userCharts);
      } catch (err) {
        console.error('Error loading charts:', err);
        setError('Failed to load saved charts');
      } finally {
        setLoading(false);
      }
    };

    loadCharts();
  }, [userId]);

  const handleDelete = async (chartId: number) => {
    try {
      await deleteBirthChart(chartId);
      setCharts(charts.filter(chart => chart.id !== chartId));
      if (selectedChart?.id === chartId) {
        setSelectedChart(null);
        setShowChart(false);
        setChartData(null);
      }
    } catch (err) {
      console.error('Error deleting chart:', err);
      setError('Failed to delete chart');
    }
  };

  const handleView = async (chart: BirthChart) => {
    try {
      setSelectedChart(chart);
      setShowChart(true);
      
      // Convert the stored chart to our ChartData format
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
      if (chart.sun) planets.sun = parsePosition(chart.sun);
      if (chart.moon) planets.moon = parsePosition(chart.moon);
      if (chart.mercury) planets.mercury = parsePosition(chart.mercury);
      if (chart.venus) planets.venus = parsePosition(chart.venus);
      if (chart.mars) planets.mars = parsePosition(chart.mars);
      if (chart.jupiter) planets.jupiter = parsePosition(chart.jupiter);
      if (chart.saturn) planets.saturn = parsePosition(chart.saturn);
      if (chart.uranus) planets.uranus = parsePosition(chart.uranus);
      if (chart.neptune) planets.neptune = parsePosition(chart.neptune);
      if (chart.pluto) planets.pluto = parsePosition(chart.pluto);
      
      // Parse ascendant
      const ascendant = parsePosition(chart.ascendant) || { 
        name: 'Unknown', symbol: '?', longitude: 0, degree: 0 
      };
      
      const convertedChart: ChartData = {
        title: chart.name,
        date: new Date(chart.birthDate).toLocaleDateString(),
        time: chart.birthTime,
        location: chart.birthPlace,
        planets,
        houses: chart.houses as any || {},
        aspects: chart.aspects as any || [],
        ascendant,
        id: chart.id,
      };
      
      setChartData(convertedChart);
    } catch (error) {
      console.error('Error loading chart:', error);
      setError('Failed to load chart');
    }
  };

  if (loading) {
    return <div className="text-gray-500">Loading saved charts...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (charts.length === 0) {
    return <div className="text-gray-500">No saved charts found</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Saved Charts</h3>
      <div className="space-y-2">
        {charts.map((chart) => (
          <div key={chart.id} className="flex items-center justify-between p-2 bg-gray-800 rounded">
            <span className="text-sm">{chart.name}</span>
            <div className="flex space-x-2">
              <button
                onClick={() => handleView(chart)}
                className="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded"
              >
                View
              </button>
              <button
                onClick={() => handleDelete(chart.id)}
                className="text-xs bg-red-600 hover:bg-red-700 px-2 py-1 rounded"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {showChart && chartData && (
        <div className="mt-4 p-4 bg-gray-800 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-semibold">{chartData.title}</h4>
            <button
              onClick={() => {
                setShowChart(false);
                setSelectedChart(null);
                setChartData(null);
              }}
              className="text-sm text-gray-400 hover:text-white"
            >
              Close
            </button>
          </div>
          <div className="flex justify-center">
            <ZodiacWheel 
              chartData={chartData} 
              width={400} 
              height={400}
              onSaveChart={() => {}} // No-op since we're just viewing
              onTitleChange={() => {}} // No-op since we're just viewing
            />
          </div>
        </div>
      )}
    </div>
  );
}