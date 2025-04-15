'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from './input';
import { Label } from './label';
import { getCities } from '@/lib/ephemeris';

interface LocationInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  loading?: boolean;
}

interface CityData {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export function LocationInput({ value, onChange, disabled, loading }: LocationInputProps) {
  const [suggestions, setSuggestions] = useState<CityData[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce the search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (value.length >= 2) {
        setIsLoading(true);
        try {
          const cities = await getCities(value);
          setSuggestions(cities);
          setShowSuggestions(true);
        } catch (error) {
          console.error('Error fetching cities:', error);
          setSuggestions([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [value]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (city: CityData) => {
    onChange(`${city.name}, ${city.country}`);
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
        required
        disabled={disabled || loading}
        onFocus={() => value.length >= 2 && setShowSuggestions(true)}
      />
      <p className="text-xs text-gray-500 mt-1">
        {loading 
          ? "Getting your current location..." 
          : "Enter city name, optionally with state/country (e.g., \"New York, NY\" or \"Paris, France\")"}
      </p>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
          <ul className="py-1 max-h-60 overflow-auto">
            {suggestions.map((city, index) => (
              <li
                key={`${city.name}-${index}`}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => handleSelect(city)}
              >
                <div className="font-medium">{city.name}</div>
                <div className="text-sm text-gray-500">{city.country}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isLoading && (
        <div className="absolute right-2 top-8">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
        </div>
      )}
    </div>
  );
} 