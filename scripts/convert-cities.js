const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

// Read the CSV file
const csvPath = path.join(process.cwd(), 'public', 'worldcities.csv');
const csvContent = fs.readFileSync(csvPath, 'utf8');

// Parse CSV data
const records = parse(csvContent, {
  columns: true,
  skip_empty_lines: true
});

// Convert to a more efficient format for lookup
const citiesDatabase = records.map(city => ({
  city: city.city,
  city_ascii: city.city_ascii,
  lat: parseFloat(city.lat),
  lng: parseFloat(city.lng),
  country: city.country,
  iso2: city.iso2,
  iso3: city.iso3,
  admin_name: city.admin_name,
  capital: city.capital,
  population: parseInt(city.population) || 0
}));

// Write to JSON file
const jsonPath = path.join(process.cwd(), 'public', 'cities.json');
fs.writeFileSync(jsonPath, JSON.stringify(citiesDatabase));

console.log(`Converted ${citiesDatabase.length} cities to JSON format`); 