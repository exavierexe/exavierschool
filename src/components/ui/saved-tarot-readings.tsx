'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { getTarotReadings, deleteTarotReading } from '@/actions';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type TarotReadingType = {
  id: number;
  name: string;
  spreadType: string;
  cards: any[];
  question: string | null;
  notes: string | null;
  createdAt: Date;
};

type SavedTarotReadingsProps = {
  userId?: string;
};

export function SavedTarotReadings({ userId }: SavedTarotReadingsProps) {
  const [readings, setReadings] = useState<TarotReadingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [viewingReading, setViewingReading] = useState<TarotReadingType | null>(null);

  // Load readings on component mount
  useEffect(() => {
    const loadReadings = async () => {
      if (!userId) return;
      
      try {
        setLoading(true);
        const userReadings = await getTarotReadings(userId);
        // Transform the readings to make sure cards is parsed correctly
        const parsedReadings = userReadings.map(reading => ({
          ...reading,
          cards: typeof reading.cards === 'string' 
            ? JSON.parse(reading.cards) 
            : reading.cards
        }));
        setReadings(parsedReadings);
      } catch (err) {
        console.error('Error loading readings:', err);
        setError('Failed to load saved readings');
      } finally {
        setLoading(false);
      }
    };

    loadReadings();
  }, [userId]);

  // Handle deleting a reading
  const handleDelete = async (readingId: number) => {
    if (!userId) return;
    
    try {
      setIsDeleting(readingId);
      await deleteTarotReading(readingId, userId);
      setReadings(readings.filter(reading => reading.id !== readingId));
      if (viewingReading?.id === readingId) {
        setViewingReading(null);
      }
    } catch (err) {
      console.error('Error deleting reading:', err);
      setError('Failed to delete reading');
    } finally {
      setIsDeleting(null);
    }
  };

  // Format date for display
  const formatDate = (date: Date | string) => {
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format spread type for display
  const formatSpreadType = (type: string) => {
    return type.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (loading) {
    return <div className="text-gray-500">Loading saved readings...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (readings.length === 0) {
    return <div className="text-gray-500">No saved readings found</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Saved Readings</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {readings.map(reading => (
          <Card 
            key={reading.id} 
            className="bg-gradient-to-br from-gray-900 to-black border-gray-700 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => setViewingReading(reading)}
          >
            <CardHeader>
              <CardTitle className="text-lg">{reading.name}</CardTitle>
              <CardDescription>
                {formatSpreadType(reading.spreadType)} • {formatDate(reading.createdAt)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {reading.question && (
                <div>
                  <h4 className="text-xs font-medium text-gray-400">Question:</h4>
                  <p className="text-sm text-gray-300 line-clamp-1">{reading.question}</p>
                </div>
              )}
              
              <div className="grid grid-cols-3 gap-2 mt-2">
                {reading.cards.slice(0, 3).map((card, i) => (
                  <div key={i} className="relative">
                    <Image 
                      src={`/tarot/tarot${card.id}.png`} 
                      alt={card.position}
                      width={80}
                      height={140}
                      className={`rounded-lg border border-gray-700 ${card.reversed ? 'transform rotate-180' : ''}`}
                    />
                    <div className="absolute top-0 left-0 bg-black bg-opacity-70 text-white px-1 py-0.5 text-xs rounded-tl-lg rounded-br-lg">
                      {card.position}
                    </div>
                  </div>
                ))}
                {reading.cards.length > 3 && (
                  <div className="flex items-center justify-center bg-black bg-opacity-50 rounded-lg text-xs text-gray-400">
                    +{reading.cards.length - 3} more
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Click to view details</span>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(reading.id);
                }}
                disabled={isDeleting === reading.id}
              >
                {isDeleting === reading.id ? "Deleting..." : "Delete"}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Viewing a specific reading */}
      {viewingReading && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-4xl bg-gradient-to-br from-gray-900 to-black border-gray-700">
            <CardHeader>
              <CardTitle className="text-2xl">{viewingReading.name}</CardTitle>
              <CardDescription>
                {formatSpreadType(viewingReading.spreadType)} • {formatDate(viewingReading.createdAt)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {viewingReading.question && (
                <div>
                  <h4 className="text-sm font-medium text-purple-400 mb-2">Your Question:</h4>
                  <p className="text-gray-300">{viewingReading.question}</p>
                </div>
              )}
              
              <div>
                <h4 className="text-sm font-medium text-purple-400 mb-2">Cards:</h4>
                <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                  {viewingReading.cards.map((card, i) => (
                    <div key={i} className="space-y-2">
                      <div className="relative">
                        <Image 
                          src={`/tarot/tarot${card.id}.png`} 
                          alt={card.position}
                          width={150}
                          height={250}
                          className={`rounded-lg border border-gray-700 shadow-lg ${card.reversed ? 'transform rotate-180' : ''}`}
                        />
                        <div className="absolute top-0 left-0 bg-black bg-opacity-70 text-white px-2 py-1 text-xs rounded-tl-lg rounded-br-lg">
                          {card.position}
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-300">{card.description}</p>
                        {card.reversed && (
                          <p className="text-xs text-orange-500 mt-1 italic">Reversed</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {viewingReading.notes && (
                <div>
                  <h4 className="text-sm font-medium text-purple-400">Your Notes:</h4>
                  <div className="bg-black bg-opacity-50 p-3 rounded-lg border border-gray-800 mt-1">
                    <p className="text-gray-300 whitespace-pre-wrap">{viewingReading.notes}</p>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button 
                variant="outline" 
                onClick={() => setViewingReading(null)}
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                Close
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
} 