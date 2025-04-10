'use client';

import { useState, useEffect } from 'react';
import { Card } from './card';
import { Button } from './button';
import { getBirthCharts, deleteBirthChart } from '@/actions';

type SavedChartProps = {
  userId: number;
  onSelectChart?: (chartId: number) => void;
};

export function SavedBirthCharts({ userId, onSelectChart }: SavedChartProps) {
  const [charts, setCharts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<{ id: number; status: 'pending' | 'success' | 'error' } | null>(null);

  // Load charts when component mounts
  useEffect(() => {
    const loadCharts = async () => {
      try {
        setLoading(true);
        const savedCharts = await getBirthCharts(userId);
        setCharts(savedCharts);
        setError(null);
      } catch (err) {
        console.error('Error loading birth charts:', err);
        setError('Failed to load saved charts. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadCharts();
  }, [userId]);

  // Handle chart deletion
  const handleDeleteChart = async (chartId: number) => {
    if (!confirm('Are you sure you want to delete this chart?')) {
      return;
    }

    try {
      setDeleteStatus({ id: chartId, status: 'pending' });
      const result = await deleteBirthChart(chartId);
      
      if (result.success) {
        setDeleteStatus({ id: chartId, status: 'success' });
        // Remove the chart from the list
        setCharts(charts.filter(chart => chart.id !== chartId));
      } else {
        setDeleteStatus({ id: chartId, status: 'error' });
        setError(result.error || 'Failed to delete chart');
      }
    } catch (err) {
      console.error('Error deleting chart:', err);
      setDeleteStatus({ id: chartId, status: 'error' });
      setError('An unexpected error occurred while deleting the chart');
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (loading) {
    return (
      <Card className="p-6 text-center">
        <p className="text-gray-400">Loading saved charts...</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 text-center bg-red-900/20 border-red-700">
        <p className="text-red-300">{error}</p>
      </Card>
    );
  }

  if (charts.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="text-gray-400">No saved charts found. Create and save a birth chart to see it here.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold">Your Saved Charts</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {charts.map(chart => (
          <Card key={chart.id} className="p-4 flex flex-col justify-between h-full">
            <div>
              <h4 className="font-bold text-lg mb-1">{chart.name}</h4>
              <p className="text-sm text-gray-400 mb-2">{formatDate(chart.createdAt)}</p>
              
              <div className="space-y-1 text-sm">
                <p><span className="text-gray-400">Birth Date:</span> {new Date(chart.birthDate).toLocaleDateString()}</p>
                <p><span className="text-gray-400">Birth Time:</span> {chart.birthTime}</p>
                <p><span className="text-gray-400">Birth Place:</span> {chart.birthPlace}</p>
              </div>
              
              {chart.sun && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <p className="text-sm"><span className="text-yellow-400">☉</span> Sun: {chart.sun}</p>
                  {chart.moon && <p className="text-sm"><span className="text-blue-300">☽</span> Moon: {chart.moon}</p>}
                  {chart.ascendant && <p className="text-sm"><span className="text-purple-400">Asc:</span> {chart.ascendant}</p>}
                  {chart.trueNode && <p className="text-sm"><span className="text-green-400">☊</span> North Node: {chart.trueNode}</p>}
                </div>
              )}
            </div>
            
            <div className="mt-4 flex gap-2">
              {onSelectChart && (
                <Button
                  onClick={() => onSelectChart(chart.id)}
                  className="flex-1"
                >
                  View Chart
                </Button>
              )}
              
              <Button
                onClick={() => handleDeleteChart(chart.id)}
                variant="destructive"
                className="flex-1"
                disabled={deleteStatus?.id === chart.id && deleteStatus?.status === 'pending'}
              >
                {deleteStatus?.id === chart.id ? (
                  deleteStatus.status === 'pending' ? 'Deleting...' : 
                  deleteStatus.status === 'success' ? 'Deleted' : 'Error'
                ) : 'Delete'}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}