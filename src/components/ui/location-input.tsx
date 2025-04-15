'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from './input';
import { Label } from './label';
import { getCities } from '@/lib/ephemeris';

interface LocationInputProps {
  value: string;
  onChange: (value: string) => void;
  loading?: boolean;
  disabled?: boolean;
}

export function LocationInput({ value, onChange, loading, disabled }: LocationInputProps) {
  const [suggestions, setSuggestions] = useState<Array<{ name: string; country: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

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

  // Fetch suggestions when input changes
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!value.trim()) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      try {
        const cities = await getCities(value);
        setSuggestions(cities.map(city => ({
          name: city.name,
          country: city.country
        })));
        setShowSuggestions(true);
      } catch (error) {
        console.error('Error fetching city suggestions:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [value]);

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