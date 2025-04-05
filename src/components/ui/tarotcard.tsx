"use client";
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "./card";
import { Button } from "./button";
import Image from "next/image";
// Import the placeholder mystery card
import mysteryCard from "../../public/tarot/tarot0.png";
import tarot0 from "../../public/tarot/tarot0.png";
import tarot1 from "../../public/tarot/tarot1.png";
import tarot2 from "../../public/tarot/tarot2.png";
import tarot3 from "../../public/tarot/tarot3.png";
import tarot4 from "../../public/tarot/tarot4.png";
import tarot5 from "../../public/tarot/tarot5.png";
import tarot6 from "../../public/tarot/tarot6.png";
import tarot7 from "../../public/tarot/tarot7.png";
import tarot8 from "../../public/tarot/tarot8.png";
import tarot9 from "../../public/tarot/tarot9.png";
import tarot10 from "../../public/tarot/tarot10.png";
import tarot11 from "../../public/tarot/tarot11.png";
import tarot12 from "../../public/tarot/tarot12.png";
import tarot13 from "../../public/tarot/tarot13.png";
import tarot14 from "../../public/tarot/tarot14.png";
import tarot15 from "../../public/tarot/tarot15.png";
import tarot16 from "../../public/tarot/tarot16.png";
import tarot17 from "../../public/tarot/tarot17.png";
import tarot18 from "../../public/tarot/tarot18.png";
import tarot19 from "../../public/tarot/tarot19.png";
import tarot20 from "../../public/tarot/tarot20.png";
import tarot21 from "../../public/tarot/tarot21.png";
import tarot22 from "../../public/tarot/tarot22.png";
import tarot23 from "../../public/tarot/tarot23.png";
import tarot24 from "../../public/tarot/tarot24.png";
import tarot25 from "../../public/tarot/tarot25.png";
import tarot26 from "../../public/tarot/tarot26.png";
import tarot27 from "../../public/tarot/tarot27.png";
import tarot28 from "../../public/tarot/tarot28.png";
import tarot29 from "../../public/tarot/tarot29.png";
import tarot30 from "../../public/tarot/tarot30.png";
import tarot31 from "../../public/tarot/tarot31.png";
import tarot32 from "../../public/tarot/tarot32.png";
import tarot33 from "../../public/tarot/tarot33.png";
import tarot34 from "../../public/tarot/tarot34.png";
import tarot35 from "../../public/tarot/tarot35.png";
import tarot36 from "../../public/tarot/tarot36.png";
import tarot37 from "../../public/tarot/tarot37.png";
import tarot38 from "../../public/tarot/tarot38.png";
import tarot39 from "../../public/tarot/tarot39.png";
import tarot40 from "../../public/tarot/tarot40.png";
import tarot41 from "../../public/tarot/tarot41.png";
import tarot42 from "../../public/tarot/tarot42.png";
import tarot43 from "../../public/tarot/tarot43.png";
import tarot44 from "../../public/tarot/tarot44.png";
import tarot45 from "../../public/tarot/tarot45.png";
import tarot46 from "../../public/tarot/tarot46.png";
import tarot47 from "../../public/tarot/tarot47.png";
import tarot48 from "../../public/tarot/tarot48.png";
import tarot49 from "../../public/tarot/tarot49.png";
import tarot50 from "../../public/tarot/tarot50.png";
import tarot51 from "../../public/tarot/tarot51.png";
import tarot52 from "../../public/tarot/tarot52.png";
import tarot53 from "../../public/tarot/tarot53.png";
import tarot54 from "../../public/tarot/tarot54.png";
import tarot55 from "../../public/tarot/tarot55.png";

type SpreadType = {
  id: string;
  name: string;
  positions: string[];
  description: string;
};

type CardData = {
  id: number;
  image: any;
  description: string;
  position: string;
  reversed: boolean;
};

type TarotCardProps = {
  onSaveReading?: (reading: {
    name: string;
    spreadType: string;
    cards: CardData[];
    question: string;
    notes: string;
  }) => Promise<{ success: boolean; error?: string }>;
};

// TarotCard component with multiple spread types and save functionality
export function TarotCard({ onSaveReading }: TarotCardProps) {
  // Available spreads
  const SPREADS: SpreadType[] = [
    {
      id: 'single-card',
      name: 'Single Card',
      positions: ['Card'],
      description: 'A simple one-card spread for quick insights or daily guidance.'
    },
    {
      id: 'three-card',
      name: 'Three Card Spread',
      positions: ['Past', 'Present', 'Future'],
      description: 'Classic three-card spread showing past influences, present situation, and future possibilities.'
    },
    {
      id: 'cross',
      name: 'Simple Cross',
      positions: ['Situation', 'Challenge', 'Advice', 'Outcome'],
      description: 'A four-card spread providing insight into your situation, challenges, advice, and outcome.'
    },
    {
      id: 'five-card',
      name: 'Five Card Spread',
      positions: ['Present', 'Past', 'Future', 'Reason', 'Potential'],
      description: 'A comprehensive spread showing the present situation, past influences, future outcome, underlying cause, and potential.'
    }
  ];
  
  // All available tarot cards - array of card images (skipping mystery card at index 0)
  const allCards = [
    tarot1, tarot2, tarot3, tarot4, tarot5, tarot6, tarot7, tarot8, tarot9, tarot10,
    tarot11, tarot12, tarot13, tarot14, tarot15, tarot16, tarot17, tarot18, tarot19, tarot20,
    tarot21, tarot22, tarot23, tarot24, tarot25, tarot26, tarot27, tarot28, tarot29, tarot30,
    tarot31, tarot32, tarot33, tarot34, tarot35, tarot36, tarot37, tarot38, tarot39, tarot40,
    tarot41, tarot42, tarot43, tarot44, tarot45, tarot46, tarot47, tarot48, tarot49, tarot50,
    tarot51, tarot52, tarot53, tarot54, tarot55
  ];
  // Use mystery card as placeholder
  const placeholderCard = mysteryCard;
  
  // Updated detailed card descriptions
  const allDescriptions = [
    "", // Mystery card - placeholder
    
    // Fire
    "The individual's vision or perspective. Spring.",
    "Someone else's vision or perspective.",
    "Subjective perception of the surroundings. Confrontations.",
    "Conceptualized vision. Labels and judgements. Self image and identification.",
    "Character. Emoting passion. Personal flair. Creativity.",
    "Glamorous vision or provocative expression. Magnetism and attraction.",
    "Honest expression. Accuracy. Detachment. Sudden inspiration.",
    "Focus. Holding onto a vision. Unchanging perspective.",
    "Culminating vision. Wise perspective. Seeing potential.",
    "Primal expression. Transformative experience.",
    "All kinds of visions. Multiple perspectives. Sagittarius.",
    "Receiving lots of visions. Internal fire. Self interest. Aries.",
    "Giving lots of visions. Expressing oneself completely. Paternity. Leo.",
    
    // Water
    "The individual's emotion or feeling. Internal reflection. Summer.",
    "Someone else's emotion. Emotional relationship. Emotional balance.",
    "Vibe of a situation. Emotional subtext. Spatial harmony.",
    "Secluded emotions. Privacy. Sorting out feelings. Home and Family.",
    "Volatile emotions. Inner transformation.",
    "Revealing emotions. Resurfacing memories. Empathy or nostalgia.",
    "Channeled messages. Internal cleansing.",
    "Emotional fixation. Fractal experiences. Emotional cycles.",
    "Intuitive wisdom. Emotional fulfillment. Natural flow.",
    "Spiritual connection. Transcendent emotions.",
    "All kinds of emotions. Dreams and illusions. Pisces.",
    "Receiving emotional support. Maternity. Cancer.",
    "Giving emotional support. Manipulating emotions. Scorpio.",
    
    // Air
    "The individual's thought or idea. Fall/autumn.",
    "Someone's thought or idea. Mental relationship. Mental balance.",
    "Conversation. Socializing. Abstract surroundings.",
    "Mentality. Mental condition. Narrative.",
    "Tone and vibration. Colorful language. Music.",
    "Popular idea. Spreading ideas. Many options.",
    "Honest communication. Travel. Scientific thinking.",
    "Thought patterns. Recurring thoughts. Lingering spirits.",
    "Wise thoughts or communication. Mental stimulation. Decisiveness.",
    "Mental boundaries. Mental expansion or contraction. Mental stress.",
    "All kinds of thoughts and ideas. Mental flexibility. Changing affiliations. Gemini.",
    "Receiving lots of communication. Partnerships. Libra.",
    "Giving lots of communication. Broad social networks. Mental programming. Aquarius.",
    
    // Earth
    "The individual's object or task. Winter.",
    "Someone else's object or task. Exchanging value. Material balance.",
    "Objective surroundings. Physical environment.",
    "Organizing reality. Construction. Compartmentalization.",
    "Sentimental object. Priorities. Hierarchies.",
    "Beautiful object. Practical risk. Business venture.",
    "Forensic evidence. Analyzing reality. Skepticism. Caution.",
    "Spending time. Time cycles. Extended time periods.",
    "Culminating resources. Practical wisdom. Manifestation.",
    "Spiritual objects. Material transformation. Ancestral roots.",
    "All kinds of materials. Diligence and maintenance. Virgo.",
    "Receiving lots of materials. Status and reputation. Capricorn.",
    "Giving lots of materials. Confidence and self worth. Stability. Taurus.",
    
    // Black & White
    "Internal world. Yin. Feminine.",
    "External world. Yang. Masculine."
  ];
  
  // State
  const [selectedSpread, setSelectedSpread] = useState<SpreadType>(SPREADS[0]);
  const [drawnCards, setDrawnCards] = useState<CardData[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [question, setQuestion] = useState('');
  const [notes, setNotes] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [readingName, setReadingName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Draw cards for the selected spread
  function drawSpread() {
    setIsComplete(false);
    setSaveSuccess(false);
    
    // Generate the appropriate number of unique cards
    const newCards: CardData[] = [];
    const numCards = selectedSpread.positions.length;
    const usedIndices = new Set<number>();
    
    for (let i = 0; i < numCards; i++) {
      let randomIndex;
      // Ensure we don't get duplicate cards
      do {
        // Get a random index from the allCards array (which already excludes mystery card)
        randomIndex = Math.floor(Math.random() * allCards.length);
      } while (usedIndices.has(randomIndex));
      
      usedIndices.add(randomIndex);
      
      // Random chance for reversed cards
      const reversed = Math.random() > 0.75;
      
      newCards.push({
        id: randomIndex + 1, // +1 since our descriptions array is 1-indexed (0 is mystery)
        image: allCards[randomIndex],
        description: allDescriptions[randomIndex + 1] || "Unknown card.",
        position: selectedSpread.positions[i],
        reversed
      });
    }
    
    setDrawnCards(newCards);
    setIsComplete(true);
  }
  
  // Handle saving the reading
  async function saveReading(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    
    if (!readingName.trim()) {
      setSaveError("Please give your reading a name");
      setIsSaving(false);
      return;
    }
    
    if (!onSaveReading) {
      setSaveError("Save functionality is not available");
      setIsSaving(false);
      return;
    }
    
    try {
      const reading = {
        name: readingName,
        spreadType: selectedSpread.id,
        cards: drawnCards,
        question,
        notes
      };
      
      const result = await onSaveReading(reading);
      
      if (result.success) {
        setSaveSuccess(true);
        setShowSaveForm(false);
      } else {
        setSaveError(result.error || "Error saving reading");
      }
    } catch (error) {
      setSaveError("An unexpected error occurred");
      console.error("Error saving reading:", error);
    } finally {
      setIsSaving(false);
    }
  }
  
  // Reset the reading
  function resetReading() {
    setDrawnCards([]);
    setIsComplete(false);
    setQuestion('');
    setNotes('');
    setReadingName('');
    setSaveSuccess(false);
  }
  
  return (
    <div className="w-full max-w-4xl mx-auto">
      <Card className="w-full bg-gradient-to-br from-gray-900 to-black border border-gray-700">
        <CardHeader className="border-b border-gray-800">
          <CardTitle className="text-2xl bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-600">
            Tarot Reading
          </CardTitle>
          <div className="flex flex-wrap gap-2 mt-2">
            {SPREADS.map(spread => (
              <Button 
                key={spread.id}
                variant={selectedSpread.id === spread.id ? "default" : "outline"}
                onClick={() => {
                  setSelectedSpread(spread);
                  setDrawnCards([]);
                  setIsComplete(false);
                }}
                className="text-sm"
              >
                {spread.name}
              </Button>
            ))}
          </div>
          <CardDescription className="mt-2 text-gray-400">
            {selectedSpread.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="mb-4">
            <div className="space-y-3 mb-4">
              <div>
                <label htmlFor="question" className="block text-sm font-medium mb-1 text-gray-300">
                  Your Question (optional)
                </label>
                <input
                  id="question"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="w-full p-2 rounded-md border border-gray-700 bg-black text-white focus:border-purple-500 outline-none"
                  placeholder="What would you like to know?"
                />
              </div>
            </div>
            <Button 
              onClick={drawSpread} 
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              disabled={isSaving}
            >
              Draw {selectedSpread.name}
            </Button>
          </div>
          
          {isComplete && (
            <div className="space-y-6">
              <div className={`grid gap-6 ${
                drawnCards.length === 1 ? 'grid-cols-1 justify-items-center' : 
                drawnCards.length <= 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'
              }`}>
                {drawnCards.map((card, i) => (
                  <div key={i} className="space-y-2 flex flex-col items-center">
                    <div className="relative">
                      <Image 
                        src={card.image} 
                        alt={card.position}
                        width={150}
                        height={250}
                        className={`rounded-lg border border-gray-700 shadow-lg ${card.reversed ? 'transform rotate-180' : ''}`}
                      />
                      <div className="absolute top-0 left-0 bg-black bg-opacity-70 text-white px-2 py-1 text-xs rounded-tl-lg rounded-br-lg">
                        {card.position}
                      </div>
                    </div>
                    <div className="text-center text-sm max-w-[150px]">
                      <p className="text-gray-300">{card.description}</p>
                      {card.reversed && <p className="italic mt-1 text-orange-500">Reversed</p>}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="space-y-3 mt-6">
                <label htmlFor="notes" className="block text-sm font-medium mb-1 text-gray-300">
                  Notes & Interpretation
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2 h-24 rounded-md border border-gray-700 bg-black text-white focus:border-purple-500 outline-none"
                  placeholder="Record your thoughts and interpretations about this reading..."
                />
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button 
                  variant="outline" 
                  onClick={resetReading} 
                  disabled={isSaving}
                  className="border-gray-700 text-gray-300 hover:bg-gray-800"
                >
                  Clear Reading
                </Button>
                {onSaveReading && (
                  <Button 
                    onClick={() => setShowSaveForm(true)} 
                    disabled={isSaving}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    Save Reading
                  </Button>
                )}
              </div>
            </div>
          )}
          
          {showSaveForm && (
            <div className="mt-6 p-4 border rounded-md border-gray-700 bg-black bg-opacity-50">
              <h3 className="text-lg font-medium mb-4 text-purple-400">Save Your Reading</h3>
              {saveError && (
                <div className="p-3 mb-4 text-sm bg-red-900 text-white rounded-md">
                  {saveError}
                </div>
              )}
              <form onSubmit={saveReading} className="space-y-4">
                <div>
                  <label htmlFor="readingName" className="block text-sm font-medium mb-1 text-gray-300">
                    Reading Name*
                  </label>
                  <input
                    id="readingName"
                    value={readingName}
                    onChange={(e) => setReadingName(e.target.value)}
                    className="w-full p-2 rounded-md border border-gray-700 bg-black text-white focus:border-purple-500 outline-none"
                    placeholder="e.g. Career Decision Reading"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowSaveForm(false)}
                    disabled={isSaving}
                    className="border-gray-700 text-gray-300 hover:bg-gray-800"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isSaving}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    {isSaving ? "Saving..." : "Save Reading"}
                  </Button>
                </div>
              </form>
            </div>
          )}
          
          {saveSuccess && (
            <div className="mt-4 p-3 bg-green-900 text-white rounded-md">
              Reading saved successfully!
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default TarotCard;