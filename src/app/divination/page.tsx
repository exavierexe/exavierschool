"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import pointblankzodiac from "./tarot/pointblankzodiac.jpg";
import { saveTarotReading, getTarotReadings, deleteTarotReading } from "@/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { TarotCard } from "@/components/ui/tarotcard";

// Card type definition
type TarotCard = {
  position: string;
  description: string;
  reversed?: boolean;
  [key: string]: any; // For any additional properties
};

// Type for tarot reading data
type TarotReadingType = {
  id: number;
  name: string;
  spreadType: string;
  cards: TarotCard[];
  question?: string | null;
  notes?: string | null;
  createdAt: Date | string;
  updatedAt?: Date;
  userId?: number | null;
};

export default function Divination() {
  const [showReadings, setShowReadings] = useState(false);
  const [savedReadings, setSavedReadings] = useState<TarotReadingType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [viewingReading, setViewingReading] = useState<TarotReadingType | null>(null);

  // Load saved readings when the component mounts or showReadings is toggled
  useEffect(() => {
    if (showReadings) {
      loadReadings();
    }
  }, [showReadings]);

  // Load saved tarot readings
  const loadReadings = async () => {
    setIsLoading(true);
    try {
      const readings = await getTarotReadings();
      // Transform the readings to make sure cards is parsed correctly
      const parsedReadings = readings.map(reading => ({
        ...reading,
        // Parse cards if it's a string, otherwise use as is
        cards: typeof reading.cards === 'string' 
          ? JSON.parse(reading.cards) 
          : reading.cards
      }));
      setSavedReadings(parsedReadings);
    } catch (error) {
      console.error("Error loading tarot readings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle saving a new reading
  const handleSaveReading = async (reading: any) => {
    try {
      // Create a FormData object directly without using a constructor
      const formData = new FormData();
      
      // Process each key-value pair in the reading object
      for (const key in reading) {
        if (Object.prototype.hasOwnProperty.call(reading, key)) {
          const value = reading[key];
          
          // Convert objects to JSON strings, everything else to string
          const processedValue = typeof value === 'object' && value !== null 
            ? JSON.stringify(value) 
            : String(value);
            
          // Append to FormData
          formData.append(key, processedValue);
        }
      }
      
      // Send the FormData to the server
      const result = await saveTarotReading(formData);
      
      // Handle success by reloading readings if needed
      if (result.success && showReadings) {
        loadReadings();
      }
      
      return result;
    } catch (error) {
      console.error("Error saving reading:", error);
      return { success: false, error: "An unexpected error occurred" };
    }
  };

  // Handle deleting a reading
  const handleDeleteReading = async (readingId: number) => {
    setIsDeleting(readingId);
    try {
      const result = await deleteTarotReading(readingId);
      if (result.success) {
        // Remove the deleted reading from the state
        setSavedReadings(savedReadings.filter(reading => reading.id !== readingId));
      }
    } catch (error) {
      console.error("Error deleting reading:", error);
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

  return (
    <div className="min-h-screen py-8 px-4 space-y-12 max-w-7xl mx-auto">
      <header className="text-center">
        <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-600">
          Tarot Divination
        </h1>
        <p className="text-lg max-w-2xl mx-auto text-gray-300">
          Explore insights and guidance through the ancient art of tarot. 
          Select a spread, ask your question, and interpret the cards' wisdom.
        </p>
      </header>

      <main className="space-y-12">
        {/* Tarot card reader */}
        <section className="flex justify-center">
          <TarotCard onSaveReading={handleSaveReading} />
        </section>
        
        {/* Saved readings section */}
        <section className="pt-8 border-t border-gray-800">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-600">
              Your Saved Readings
            </h2>
            <Button 
              variant="outline" 
              onClick={() => setShowReadings(!showReadings)}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              {showReadings ? "Hide Readings" : "Show Readings"}
            </Button>
          </div>
          
          {/* Viewing a specific reading */}
          {viewingReading && (
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-medium text-purple-400">{viewingReading.name}</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setViewingReading(null)}
                  className="border-gray-700 text-gray-300 hover:bg-gray-800"
                >
                  Back to All Readings
                </Button>
              </div>
              
              <Card className="bg-gradient-to-br from-gray-900 to-black border-gray-700">
                <CardHeader>
                  <CardTitle>{viewingReading.name}</CardTitle>
                  <CardDescription>
                    {formatSpreadType(viewingReading.spreadType)} • {formatDate(viewingReading.createdAt)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {viewingReading.question && (
                    <div>
                      <h4 className="text-sm font-medium text-purple-400">Your Question:</h4>
                      <p className="text-gray-300 mt-1">{viewingReading.question}</p>
                    </div>
                  )}
                  
                  <div>
                    <h4 className="text-sm font-medium text-purple-400 mb-2">Cards:</h4>
                    <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                      {viewingReading.cards.map((card: TarotCard, i) => (
                        <div key={i} className="bg-black bg-opacity-50 rounded-lg p-3 border border-gray-800">
                          <div className="font-medium text-gray-200">{card.position}</div>
                          <div className="text-sm text-gray-400 mt-1">{card.description}</div>
                          {card.reversed && (
                            <div className="text-xs text-orange-500 mt-1 italic">Reversed</div>
                          )}
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
                    variant="destructive" 
                    size="sm"
                    onClick={() => {
                      handleDeleteReading(viewingReading.id);
                      setViewingReading(null);
                    }}
                    disabled={isDeleting === viewingReading.id}
                  >
                    {isDeleting === viewingReading.id ? "Deleting..." : "Delete Reading"}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          )}
          
          {/* List of saved readings */}
          {showReadings && !viewingReading && (
            <>
              {isLoading ? (
                <div className="text-center py-8 bg-gray-900 rounded-lg border border-gray-800">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-purple-500 border-r-2 border-purple-500 border-b-2 border-transparent mb-4"></div>
                  <p>Loading your saved readings...</p>
                </div>
              ) : savedReadings.length === 0 ? (
                <div className="text-center py-8 bg-gray-900 rounded-lg border border-gray-800">
                  <p className="mb-2">You don't have any saved readings yet.</p>
                  <p className="text-sm text-gray-400">Use the tarot card reader above to create and save readings.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {savedReadings.map(reading => (
                    <Card key={reading.id} className="bg-gradient-to-br from-gray-900 to-black border-gray-700 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setViewingReading(reading)}>
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
                        
                        <div className="flex flex-wrap gap-1 mt-1">
                          {reading.cards.slice(0, 3).map((card: TarotCard, i) => (
                            <div key={i} className="px-2 py-1 bg-black bg-opacity-50 rounded text-xs text-gray-300">
                              {card.position}
                              {card.reversed && ' (R)'}
                            </div>
                          ))}
                          {reading.cards.length > 3 && (
                            <div className="px-2 py-1 bg-black bg-opacity-50 rounded text-xs text-gray-400">
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
                            handleDeleteReading(reading.id);
                          }}
                          disabled={isDeleting === reading.id}
                        >
                          {isDeleting === reading.id ? "Deleting..." : "Delete"}
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </main>

      <div className="pt-8 text-center">
        <Image 
          src={pointblankzodiac} 
          alt="Point Blank Zodiac" 
          width={500} 
          height={500} 
          className="rounded-lg mx-auto border border-gray-700 shadow-lg"
        />
      </div>
      
      <footer className="text-center text-sm text-gray-500 pt-8">
        <p>All tarot interpretations are based on traditional meanings combined with intuitive insights.</p>
      </footer>
    </div>
  );
}
