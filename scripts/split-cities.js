const fs = require('fs');
const path = require('path');

// Read the cities JSON file
const jsonPath = path.join(process.cwd(), 'public', 'cities.json');
const cities = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// Create a directory for the chunks
const chunksDir = path.join(process.cwd(), 'public', 'cities');
if (!fs.existsSync(chunksDir)) {
  fs.mkdirSync(chunksDir, { recursive: true });
}

// Split cities into chunks of 1000
const chunkSize = 1000;
const chunks = [];
for (let i = 0; i < cities.length; i += chunkSize) {
  chunks.push(cities.slice(i, i + chunkSize));
}

// Write each chunk to a separate file
chunks.forEach((chunk, index) => {
  const chunkPath = path.join(chunksDir, `chunk${index}.json`);
  fs.writeFileSync(chunkPath, JSON.stringify(chunk));
});

// Create an index file with metadata
const index = {
  totalCities: cities.length,
  chunkSize,
  numChunks: chunks.length,
  chunks: chunks.map((_, i) => `chunk${i}.json`)
};

fs.writeFileSync(path.join(chunksDir, 'index.json'), JSON.stringify(index));

console.log(`Split ${cities.length} cities into ${chunks.length} chunks`); 