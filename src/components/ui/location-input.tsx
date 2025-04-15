'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from './input';
import { Label } from './label';
import { getCities } from '@/lib/ephemeris';
import { Loader2 } from 'lucide-react';

interface CityData {
  name: string;
  country: string;
  lat: number;
  lng: number;
}

interface LocationInputProps {
  value: string;
  onChange: (value: string) => void;
  loading?: boolean;
  disabled?: boolean;
}

export function LocationInput({ value, onChange, loading, disabled }: LocationInputProps) {
  const [suggestions, setSuggestions] = useState<CityData[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Handle clicks outside the input and suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (inputRef.current && !inputRef.current.contains(event.target as Node) &&
          suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/cities?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch cities');
      }
      const data = await response.json();
      setSuggestions(data);
    } catch (err) {
      setError('Failed to load city suggestions');
      console.error('Error fetching cities:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: { name: string; country: string }) => {
    onChange(`${suggestion.name}, ${suggestion.country}`);
    setShowSuggestions(false);
  };

  return (
    <div className="relative">
      <Label htmlFor="location">Birth Location</Label>
      <Input
        ref={inputRef}
        id="location"
        placeholder={loading ? "Detecting your location..." : "Enter your birth location"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setShowSuggestions(true)}
        required
        disabled={loading || disabled}
      />
      <p className="text-xs text-gray-500 mt-1">
        {loading 
          ? "Getting your current location..." 
          : "Enter city name, optionally with state/country (e.g., \"New York, NY\" or \"Paris, France\")"}
      </p>

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {isLoading ? (
            <div className="p-2 text-sm text-gray-500">Loading suggestions...</div>
          ) : (
            suggestions.map((suggestion, index) => (
              <div
                key={`${suggestion.name}-${index}`}
                className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion.name}, {suggestion.country}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
} 