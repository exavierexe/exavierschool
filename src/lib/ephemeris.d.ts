// Type definitions for ephemeris module
declare module 'ephemeris' {
  export interface PlanetPosition {
    apparentLongitudeDd: number;
    geocentricDistanceAu: number;
    aberration: number;
    precessionJ2000: number;
    nutation: number;
    apparentDiameter: number;
    angularRadius: number;
    // Additional properties that may be included
    apparentLongitude: string;
    apparentLongitudeDms: string;
    equatorialRightAscension: number;
    equatorialDeclination: number;
    heliocentricLongitude: number;
    heliocentricLatitude: number;
    heliocentricDistance: number;
  }

  export interface DateInfo {
    gregorianUniversal: Date;
    gregorianLocalMeridian: Date;
    universalDateString?: string;
    julianDay: number;
    julianCentury: number;
    julianTerrestrial: number;
    unix: number;
  }

  export interface EphemerisResult {
    date: DateInfo;
    observed: {
      sun?: PlanetPosition;
      moon?: PlanetPosition;
      mercury?: PlanetPosition;
      venus?: PlanetPosition;
      mars?: PlanetPosition;
      jupiter?: PlanetPosition;
      saturn?: PlanetPosition;
      uranus?: PlanetPosition;
      neptune?: PlanetPosition;
      pluto?: PlanetPosition;
      chiron?: PlanetPosition;
      // Any other celestial bodies that might be supported
    };
    /**
     * Original input parameters
     */
    $input: {
      year?: number;
      month?: number;
      day?: number;
      hours?: number;
      minutes?: number;
      seconds?: number;
      longitude: number;
      latitude: number;
      height?: number;
    };
    /**
     * Options used during calculation
     */
    options: {
      isInterpolated?: boolean;
      outputFields?: string[];
    };
  }

  /**
   * Calculates positions for all planets
   * @param date The date to calculate positions for (Date object or ISO string)
   * @param longitude Observer's longitude in decimal degrees
   * @param latitude Observer's latitude in decimal degrees
   * @param height Observer's height in meters above sea level (optional)
   * @param options Additional options for calculation (optional)
   * @returns An object containing planet positions and date information
   */
  export function getAllPlanets(
    date: Date | string,
    longitude: number,
    latitude: number,
    height?: number,
    options?: {
      isInterpolated?: boolean;
      outputFields?: string[];
    }
  ): EphemerisResult;

  /**
   * Calculates position for a specific planet
   * @param planet Planet name (sun, moon, mercury, venus, etc.)
   * @param date The date to calculate positions for
   * @param longitude Observer's longitude in decimal degrees
   * @param latitude Observer's latitude in decimal degrees 
   * @param height Observer's height in meters above sea level (optional)
   * @param options Additional options for calculation (optional)
   * @returns An object containing planet position and date information
   */
  export function getPlanet(
    planet: string,
    date: Date | string,
    longitude: number,
    latitude: number,
    height?: number,
    options?: {
      isInterpolated?: boolean;
      outputFields?: string[];
    }
  ): EphemerisResult;

  /**
   * Default method to calculate positions for the most common planets (sun, moon, mercury, venus, mars, jupiter, saturn)
   * @param date The date to calculate positions for
   * @param longitude Observer's longitude in decimal degrees
   * @param latitude Observer's latitude in decimal degrees
   * @param height Observer's height in meters above sea level (optional)
   * @param options Additional options for calculation (optional)
   * @returns An object containing planet positions and date information
   */
  export function defaultPositions(
    date: Date | string,
    longitude: number,
    latitude: number,
    height?: number,
    options?: {
      isInterpolated?: boolean;
      outputFields?: string[];
    }
  ): EphemerisResult;
}