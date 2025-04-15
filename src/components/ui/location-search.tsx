import { useState, useEffect, useRef } from 'react';
import { Input } from './input';
import { Label } from './label';
import { getCities } from '@/lib/ephemeris';

interface LocationSearchProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (location: { name: string; country: string }) => void;
  placeholder?: string;
  disabled?: boolean;
}

interface CityData {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export function LocationSearch({
  value,
  onChange,
  onSelect,
  placeholder = 'Enter city or country',
  disabled = false
}: LocationSearchProps) {
  const [suggestions, setSuggestions] = useState<CityData[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle clicks outside the component
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch suggestions when input changes
  useEffect(() => {
    if (!value.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setLoading(true);
    
    // Clear previous timeout
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    // Set a new timeout to debounce the search
    searchTimeout.current = setTimeout(async () => {
      try {
        const cities = await getCities(value);
        setSuggestions(cities);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Error fetching cities:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [value]);

  const handleSelect = (city: CityData) => {
    onSelect({ name: city.name, country: city.country });
    onChange(`${city.name}, ${city.country}`);
    setShowSuggestions(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full"
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((city, index) => (
            <div
              key={`${city.name}-${city.country}-${index}`}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => handleSelect(city)}
            >
              <div className="font-medium">{city.name}</div>
              <div className="text-sm text-gray-500">{city.country}</div>
            </div>
          ))}
        </div>
      )}
      
      {loading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
        </div>
      )}
    </div>
  );
} 