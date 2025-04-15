import { PrismaClient } from '@prisma/client';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function importCountries() {
  try {
    console.log('Starting countries import...');
    
    // Read the CSV file
    const csvPath = path.join(process.cwd(), 'public', 'TimeZoneDB.csv', 'country.csv');
    console.log('Reading country file from:', csvPath);
    
    const fileContent = fs.readFileSync(csvPath, 'utf8');
    const records = parse(fileContent, {
      columns: false, // File doesn't have headers
      skip_empty_lines: true
    });
    
    console.log(`Found ${records.length} countries to import`);
    
    // Transform and insert all countries
    const countries = records.map(record => ({
      code: record[0],
      name: record[1]
    }));
    
    // Insert countries
    await prisma.country.createMany({
      data: countries,
      skipDuplicates: true
    });
    
    console.log(`Inserted ${countries.length} countries`);
    console.log('Countries import completed successfully');
  } catch (error) {
    console.error('Error importing countries:', error);
  }
}

async function importTimeZones() {
  try {
    console.log('Starting timezones import...');
    
    // Read the CSV file
    const csvPath = path.join(process.cwd(), 'public', 'TimeZoneDB.csv', 'time_zone.csv');
    console.log('Reading timezone file from:', csvPath);
    
    const fileContent = fs.readFileSync(csvPath, 'utf8');
    const records = parse(fileContent, {
      columns: false, // File doesn't have headers
      skip_empty_lines: true
    });
    
    console.log(`Found ${records.length} timezone records to import`);
    
    // Process records in batches to avoid memory issues
    const batchSize = 1000;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      console.log(`Processing batch ${i / batchSize + 1} of ${Math.ceil(records.length / batchSize)}`);
      
      // Transform and insert the batch
      const timezones = batch.map(record => ({
        zoneName: record[0],
        countryCode: record[1],
        zoneType: record[2],
        startTime: BigInt(record[3]),
        utcOffset: parseInt(record[4]),
        isDst: record[5] === '1'
      }));
      
      // Insert the batch
      await prisma.timeZone.createMany({
        data: timezones,
        skipDuplicates: true
      });
      
      console.log(`Inserted ${timezones.length} timezone records`);
    }
    
    console.log('Timezones import completed successfully');
  } catch (error) {
    console.error('Error importing timezones:', error);
  }
}

async function importAll() {
  try {
    // Import countries first since timezones reference them
    await importCountries();
    await importTimeZones();
    console.log('All imports completed successfully');
  } catch (error) {
    console.error('Error during import:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importAll(); 