'use client';

import { useState, useEffect } from 'react';
import { Card } from './card';
import { Button } from './button';
import { getBirthCharts, deleteBirthChart } from '@/actions';
import { ZodiacWheel } from '@/components/ui/zodiacwheel';
import { ChartData } from '@/components/ui/zodiacwheel';
import { JsonValue } from 'type-fest';

// Zodiac signs and their symbols
const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer',
  'Leo', 'Virgo', 'Libra', 'Scorpio',
  'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];
const ZODIAC_SYMBOLS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];

interface BirthChart {
  id: number;
  title: string;
  date: Date;
  time: string;
  location: string;
  planets: JsonValue;
  ascendant: JsonValue;
  houses: JsonValue;
  aspects: JsonValue;
  userId: number;
  createdAt: Date;
  updatedAt: Date;
}

type SavedChartProps = {
  userId?: string;
  onSelectChart?: (chartId: number) => void;
};

export function SavedBirthCharts({ userId, onSelectChart }: SavedChartProps) {
  const [charts, setCharts] = useState<BirthChart[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedChart, setSelectedChart] = useState<BirthChart | null>(null);
  const [showChart, setShowChart] = useState(false);
  const [chartData, setChartData] = useState<ChartData | null>(null);

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

  const handleView = (chart: BirthChart) => {
    setSelectedChart(chart);
    setShowChart(true);

    // Parse the planets data from JSON
    const planetsData = typeof chart.planets === 'string' 
      ? JSON.parse(chart.planets) 
      : chart.planets;

    // Parse houses from JSON
    const housesData = typeof chart.houses === 'string'
      ? JSON.parse(chart.houses)
      : chart.houses;

    // Parse aspects from JSON
    const aspectsData = typeof chart.aspects === 'string'
      ? JSON.parse(chart.aspects)
      : chart.aspects;

    // Parse ascendant from JSON
    const ascendantData = typeof chart.ascendant === 'string'
      ? JSON.parse(chart.ascendant)
      : chart.ascendant;

    const convertedChart: ChartData = {
      title: chart.title,
      date: new Date(chart.date).toLocaleDateString(),
      time: chart.time,
      location: chart.location,
      planets: planetsData,
      houses: housesData || {},
      ascendant: ascendantData || null,
      aspects: aspectsData || [],
      rawOutput: ''
    };

    setChartData(convertedChart);
  };

  if (loading) return <div>Loading saved charts...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (charts.length === 0) return <div>No saved charts found.</div>;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Saved Charts</h3>
      <div className="grid gap-4">
        {charts.map((chart) => (
          <div
            key={chart.id}
            className="p-4 border rounded-lg"
          >
            <div className="flex justify-between items-center">
              <div className="font-medium">{chart.title}</div>
              <div className="flex items-center gap-4 text-sm">
                {(() => {
                  const planets = typeof chart.planets === 'string' 
                    ? JSON.parse(chart.planets) 
                    : chart.planets;
                  const ascendant = typeof chart.ascendant === 'string'
                    ? JSON.parse(chart.ascendant)
                    : chart.ascendant;

                  const getSignAndDegree = (longitude: any) => {
                    if (!longitude) return 'N/A';
                    if (typeof longitude === 'string') {
                      const [sign, degree] = longitude.split(' ');
                      return `${sign} ${degree}`;
                    }
                    if (typeof longitude === 'object' && longitude.longitude) {
                      return longitude.longitude;
                    }
                    return 'N/A';
                  };

                  const getZodiacSymbol = (sign: string) => {
                    const index = ZODIAC_SIGNS.findIndex(s => s.toLowerCase() === sign.toLowerCase());
                    return index >= 0 ? ZODIAC_SYMBOLS[index] : '';
                  };

                  const formatPlanetInfo = (planet: any) => {
                    const [sign, degree] = getSignAndDegree(planet).split(' ');
                    return `${getZodiacSymbol(sign)} ${degree}`;
                  };

                  return (
                    <>
                      <div className="flex items-center gap-1">
                        <span>☉</span>
                        <span>{formatPlanetInfo(planets?.sun)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>☽</span>
                        <span>{formatPlanetInfo(planets?.moon)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>AC</span>
                        <span>{formatPlanetInfo(ascendant)}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {new Date(chart.date).toLocaleDateString()} at {chart.time}
            </div>
            <div className="text-sm text-gray-500">{chart.location}</div>

            <div className="flex gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleView(chart)}
              >
                View
              </Button>
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
              width={600} 
              height={600}
              onSaveChart={() => {}} // No-op since we're just viewing
              onTitleChange={() => {}} // No-op since we're just viewing
            />
          </div>
        </div>
      )}
    </div>
  );
}