import { PrismaClient } from '@prisma/client';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function importCities() {
  try {
    console.log('Starting cities import...');
    
    // Read the CSV file
    const csvPath = path.join(process.cwd(), 'src', 'lib', 'worldcities.csv');
    console.log('Reading CSV file from:', csvPath);
    
    const fileContent = fs.readFileSync(csvPath, 'utf8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true
    });
    
    console.log(`Found ${records.length} cities to import`);
    
    // Process records in batches to avoid memory issues
    const batchSize = 1000;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      console.log(`Processing batch ${i / batchSize + 1} of ${Math.ceil(records.length / batchSize)}`);
      
      // Transform and insert the batch
      const cities = batch.map(record => ({
        city: record.city,
        city_ascii: record.city_ascii,
        lat: parseFloat(record.lat),
        lng: parseFloat(record.lng),
        country: record.country,
        iso2: record.iso2,
        iso3: record.iso3,
        admin_name: record.admin_name || null,
        capital: record.capital || null,
        population: record.population ? parseInt(record.population) : null
      }));
      
      // Insert the batch
      await prisma.city.createMany({
        data: cities,
        skipDuplicates: true
      });
      
      console.log(`Inserted ${cities.length} cities`);
    }
    
    console.log('Cities import completed successfully');
  } catch (error) {
    console.error('Error importing cities:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importCities(); 