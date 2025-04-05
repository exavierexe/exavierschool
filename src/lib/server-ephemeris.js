'use server';

// Server-only implementation of ephemeris calculations
// This file will be used only in server components and server actions

// Import our robust wrapper

// Import our robust wrapper
const ephemerisWrapper = require('./ephemeris-wrapper');


// Log the server initialization
console.log('[SERVER-EPHEMERIS] Initializing server-side ephemeris module');

// Export the wrapped functions that can be used in server contexts
module.exports = {
  getAllPlanets: (date, longitude, latitude, height, options) => {
    console.log(`[SERVER-EPHEMERIS] getAllPlanets called with date=${date}, long=${longitude}, lat=${latitude}`);
    return ephemerisWrapper.getAllPlanets(date, longitude, latitude, height, options);
  },
  
  getPlanet: (planet, date, longitude, latitude, height, options) => {
    console.log(`[SERVER-EPHEMERIS] getPlanet called for ${planet}`);
    return ephemerisWrapper.getPlanet(planet, date, longitude, latitude, height, options);
  },
  
  defaultPositions: (date, longitude, latitude, height, options) => {
    console.log(`[SERVER-EPHEMERIS] defaultPositions called`);
    return ephemerisWrapper.defaultPositions(date, longitude, latitude, height, options);
  }
};