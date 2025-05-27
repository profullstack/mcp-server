/**
 * Weather Module Utilities
 *
 * Utility functions for weather data processing and formatting.
 */

/**
 * Validate latitude and longitude coordinates
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @throws {Error} If coordinates are invalid
 */
export function validateCoordinates(latitude, longitude) {
  if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
    throw new Error('Invalid latitude: must be a number between -90 and 90');
  }
  if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
    throw new Error('Invalid longitude: must be a number between -180 and 180');
  }
}

/**
 * Convert Celsius to Fahrenheit
 * @param {number} celsius - Temperature in Celsius
 * @returns {number} Temperature in Fahrenheit
 */
export function celsiusToFahrenheit(celsius) {
  if (celsius === null || celsius === undefined) return null;
  return Math.round((celsius * 9) / 5 + 32);
}

/**
 * Convert meters per second to miles per hour
 * @param {number} mps - Speed in meters per second
 * @returns {number} Speed in miles per hour
 */
export function mpsToMph(mps) {
  if (mps === null || mps === undefined) return null;
  return Math.round(mps * 2.237);
}

/**
 * Convert meters to miles
 * @param {number} meters - Distance in meters
 * @returns {number} Distance in miles
 */
export function metersToMiles(meters) {
  if (meters === null || meters === undefined) return null;
  return Math.round(meters * 0.000621371 * 100) / 100;
}

/**
 * Convert pascals to inches of mercury
 * @param {number} pascals - Pressure in pascals
 * @returns {number} Pressure in inches of mercury
 */
export function pascalsToInHg(pascals) {
  if (pascals === null || pascals === undefined) return null;
  return Math.round(pascals * 0.0002953 * 100) / 100;
}

/**
 * Format weather data for different types of responses
 */
export const formatWeatherData = {
  /**
   * Format current weather data
   * @param {Object} data - Raw weather data from API
   * @param {Object} location - Location information
   * @returns {Object} Formatted current weather data
   */
  current(data, location) {
    return {
      location,
      current: {
        timestamp: data.timestamp,
        temperature: {
          value: data.temperature?.value,
          unit: data.temperature?.unitCode,
          fahrenheit: celsiusToFahrenheit(data.temperature?.value),
        },
        dewpoint: {
          value: data.dewpoint?.value,
          unit: data.dewpoint?.unitCode,
          fahrenheit: celsiusToFahrenheit(data.dewpoint?.value),
        },
        windDirection: {
          value: data.windDirection?.value,
          unit: data.windDirection?.unitCode,
        },
        windSpeed: {
          value: data.windSpeed?.value,
          unit: data.windSpeed?.unitCode,
          mph: mpsToMph(data.windSpeed?.value),
        },
        windGust: {
          value: data.windGust?.value,
          unit: data.windGust?.unitCode,
          mph: mpsToMph(data.windGust?.value),
        },
        barometricPressure: {
          value: data.barometricPressure?.value,
          unit: data.barometricPressure?.unitCode,
          inHg: pascalsToInHg(data.barometricPressure?.value),
        },
        seaLevelPressure: {
          value: data.seaLevelPressure?.value,
          unit: data.seaLevelPressure?.unitCode,
          inHg: pascalsToInHg(data.seaLevelPressure?.value),
        },
        visibility: {
          value: data.visibility?.value,
          unit: data.visibility?.unitCode,
          miles: metersToMiles(data.visibility?.value),
        },
        maxTemperatureLast24Hours: {
          value: data.maxTemperatureLast24Hours?.value,
          unit: data.maxTemperatureLast24Hours?.unitCode,
          fahrenheit: celsiusToFahrenheit(data.maxTemperatureLast24Hours?.value),
        },
        minTemperatureLast24Hours: {
          value: data.minTemperatureLast24Hours?.value,
          unit: data.minTemperatureLast24Hours?.unitCode,
          fahrenheit: celsiusToFahrenheit(data.minTemperatureLast24Hours?.value),
        },
        relativeHumidity: {
          value: data.relativeHumidity?.value,
          unit: data.relativeHumidity?.unitCode,
        },
        windChill: {
          value: data.windChill?.value,
          unit: data.windChill?.unitCode,
          fahrenheit: celsiusToFahrenheit(data.windChill?.value),
        },
        heatIndex: {
          value: data.heatIndex?.value,
          unit: data.heatIndex?.unitCode,
          fahrenheit: celsiusToFahrenheit(data.heatIndex?.value),
        },
        cloudLayers: data.cloudLayers,
        presentWeather: data.presentWeather,
        textDescription: data.textDescription,
      },
    };
  },

  /**
   * Format forecast data
   * @param {Object} data - Raw forecast data from API
   * @param {Object} location - Location information
   * @param {number} days - Number of days to include
   * @returns {Object} Formatted forecast data
   */
  forecast(data, location, days) {
    const periods = data.periods?.slice(0, days * 2) || []; // Day and night periods

    return {
      location,
      forecast: {
        updated: data.updated,
        units: data.units,
        forecastGenerator: data.forecastGenerator,
        generatedAt: data.generatedAt,
        updateTime: data.updateTime,
        validTimes: data.validTimes,
        elevation: data.elevation,
        periods: periods.map(period => ({
          number: period.number,
          name: period.name,
          startTime: period.startTime,
          endTime: period.endTime,
          isDaytime: period.isDaytime,
          temperature: period.temperature,
          temperatureUnit: period.temperatureUnit,
          temperatureTrend: period.temperatureTrend,
          windSpeed: period.windSpeed,
          windDirection: period.windDirection,
          icon: period.icon,
          shortForecast: period.shortForecast,
          detailedForecast: period.detailedForecast,
        })),
      },
    };
  },

  /**
   * Format weather alerts data
   * @param {Array} alerts - Raw alerts data from API
   * @param {Object} location - Location information
   * @returns {Object} Formatted alerts data
   */
  alerts(alerts, location) {
    return {
      location,
      alerts: {
        count: alerts.length,
        active: alerts.map(alert => ({
          id: alert.id,
          type: alert.properties.event,
          headline: alert.properties.headline,
          description: alert.properties.description,
          instruction: alert.properties.instruction,
          severity: alert.properties.severity,
          certainty: alert.properties.certainty,
          urgency: alert.properties.urgency,
          effective: alert.properties.effective,
          expires: alert.properties.expires,
          onset: alert.properties.onset,
          ends: alert.properties.ends,
          status: alert.properties.status,
          messageType: alert.properties.messageType,
          category: alert.properties.category,
          sender: alert.properties.senderName,
          areas: alert.properties.areaDesc,
        })),
      },
    };
  },
};

/**
 * Build image URLs for weather imagery
 */
export const buildImageUrl = {
  /**
   * Build radar image URL
   * @param {string} station - Radar station code
   * @param {string} product - Radar product code
   * @returns {string} Radar image URL
   */
  radar(station, product) {
    const baseUrl = 'https://radar.weather.gov/ridge/standard';
    return `${baseUrl}/${product}_${station}_0.gif`;
  },

  /**
   * Build satellite image URL
   * @param {string} satellite - Satellite name
   * @param {string} product - Satellite product
   * @returns {string} Satellite image URL
   */
  satellite(satellite, product) {
    const baseUrl = 'https://cdn.star.nesdis.noaa.gov/GOES16/ABI/CONUS';
    return `${baseUrl}/${product}/GOES16-CONUS-${product}-600x600.gif`;
  },
};

/**
 * Get weather condition emoji based on description
 * @param {string} description - Weather description
 * @param {boolean} isDaytime - Whether it's daytime
 * @returns {string} Weather emoji
 */
export function getWeatherEmoji(description, isDaytime = true) {
  if (!description) return '🌡️';

  const desc = description.toLowerCase();

  if (desc.includes('sunny') || desc.includes('clear')) {
    return isDaytime ? '☀️' : '🌙';
  }
  if (desc.includes('partly cloudy') || desc.includes('partly sunny')) {
    return isDaytime ? '⛅' : '🌙';
  }
  if (desc.includes('cloudy') || desc.includes('overcast')) {
    return '☁️';
  }
  if (desc.includes('rain') || desc.includes('shower')) {
    return '🌧️';
  }
  if (desc.includes('thunderstorm') || desc.includes('storm')) {
    return '⛈️';
  }
  if (desc.includes('snow') || desc.includes('blizzard')) {
    return '❄️';
  }
  if (desc.includes('fog') || desc.includes('mist')) {
    return '🌫️';
  }
  if (desc.includes('wind')) {
    return '💨';
  }

  return '🌡️';
}

/**
 * Format timestamp to readable string
 * @param {string} timestamp - ISO timestamp
 * @returns {string} Formatted timestamp
 */
export function formatTimestamp(timestamp) {
  if (!timestamp) return 'Unknown';

  try {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  } catch (error) {
    return timestamp;
  }
}

/**
 * Geocode a location string to coordinates using the Census Bureau API
 * @param {string} location - Location string (city, state, zip code, address, etc.)
 * @returns {Promise<Object>} Coordinates and location info
 */
export async function geocodeLocation(location) {
  try {
    // Clean up the location string
    const cleanLocation = location.trim();

    // Check if it's already coordinates (lat,lon format)
    const coordMatch = cleanLocation.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lon = parseFloat(coordMatch[2]);
      validateCoordinates(lat, lon);
      return {
        latitude: lat,
        longitude: lon,
        formattedAddress: `${lat}, ${lon}`,
        source: 'coordinates',
      };
    }

    // Check for city, state format and try built-in city database first
    const cityStateMatch = cleanLocation.match(/^([^,]+),\s*([A-Z]{2})$/i);
    if (cityStateMatch) {
      const cityName = cityStateMatch[1].trim().toLowerCase();
      const stateName = cityStateMatch[2].trim().toUpperCase();
      const cityCoords = await lookupMajorCity(cityName, stateName);
      if (cityCoords) {
        return {
          latitude: cityCoords.lat,
          longitude: cityCoords.lon,
          formattedAddress: `${cityCoords.name}, ${stateName}`,
          source: 'city_database',
        };
      }
    }

    // Try Census Bureau geocoding API (free, no API key required)
    // Note: This works best with specific street addresses
    const encodedLocation = encodeURIComponent(cleanLocation);
    const censusUrl = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodedLocation}&benchmark=2020&format=json`;

    const response = await fetch(censusUrl);
    if (!response.ok) {
      throw new Error(`Geocoding request failed: ${response.status}`);
    }

    const data = await response.json();

    if (data.result?.addressMatches && data.result.addressMatches.length > 0) {
      const match = data.result.addressMatches[0];
      const coords = match.coordinates;

      return {
        latitude: coords.y,
        longitude: coords.x,
        formattedAddress: match.matchedAddress,
        source: 'census',
      };
    }

    // If Census API fails, try a basic zip code lookup for US zip codes
    const zipMatch = cleanLocation.match(/^\d{5}(-\d{4})?$/);
    if (zipMatch) {
      const zipCoords = await lookupZipCode(zipMatch[0].substring(0, 5));
      if (zipCoords) {
        return {
          latitude: zipCoords.lat,
          longitude: zipCoords.lon,
          formattedAddress: `${zipMatch[0]}, USA`,
          source: 'zipcode',
        };
      }
    }

    throw new Error(
      `Could not geocode location: ${location}. Please try a more specific address or use coordinates.`
    );
  } catch (error) {
    throw new Error(`Geocoding failed: ${error.message}`);
  }
}

/**
 * Lookup major US cities by name and state
 * @param {string} cityName - City name (case insensitive)
 * @param {string} stateName - State abbreviation (2 letters)
 * @returns {Object|null} Coordinates and city info or null if not found
 */
async function lookupMajorCity(cityName, stateName) {
  // Database of major US cities with coordinates
  const majorCities = {
    'new york': {
      NY: { lat: 40.7128, lon: -74.006, name: 'New York' },
    },
    'los angeles': {
      CA: { lat: 34.0522, lon: -118.2437, name: 'Los Angeles' },
    },
    chicago: {
      IL: { lat: 41.8781, lon: -87.6298, name: 'Chicago' },
    },
    houston: {
      TX: { lat: 29.7604, lon: -95.3698, name: 'Houston' },
    },
    phoenix: {
      AZ: { lat: 33.4484, lon: -112.074, name: 'Phoenix' },
    },
    philadelphia: {
      PA: { lat: 39.9526, lon: -75.1652, name: 'Philadelphia' },
    },
    'san antonio': {
      TX: { lat: 29.4241, lon: -98.4936, name: 'San Antonio' },
    },
    'san diego': {
      CA: { lat: 32.7157, lon: -117.1611, name: 'San Diego' },
    },
    dallas: {
      TX: { lat: 32.7767, lon: -96.797, name: 'Dallas' },
    },
    'san jose': {
      CA: { lat: 37.3382, lon: -121.8863, name: 'San Jose' },
    },
    austin: {
      TX: { lat: 30.2672, lon: -97.7431, name: 'Austin' },
    },
    jacksonville: {
      FL: { lat: 30.3322, lon: -81.6557, name: 'Jacksonville' },
    },
    'fort worth': {
      TX: { lat: 32.7555, lon: -97.3308, name: 'Fort Worth' },
    },
    columbus: {
      OH: { lat: 39.9612, lon: -82.9988, name: 'Columbus' },
    },
    charlotte: {
      NC: { lat: 35.2271, lon: -80.8431, name: 'Charlotte' },
    },
    'san francisco': {
      CA: { lat: 37.7749, lon: -122.4194, name: 'San Francisco' },
    },
    indianapolis: {
      IN: { lat: 39.7684, lon: -86.1581, name: 'Indianapolis' },
    },
    seattle: {
      WA: { lat: 47.6062, lon: -122.3321, name: 'Seattle' },
    },
    denver: {
      CO: { lat: 39.7392, lon: -104.9903, name: 'Denver' },
    },
    washington: {
      DC: { lat: 38.9072, lon: -77.0369, name: 'Washington' },
    },
    boston: {
      MA: { lat: 42.3601, lon: -71.0589, name: 'Boston' },
    },
    'el paso': {
      TX: { lat: 31.7619, lon: -106.485, name: 'El Paso' },
    },
    detroit: {
      MI: { lat: 42.3314, lon: -83.0458, name: 'Detroit' },
    },
    nashville: {
      TN: { lat: 36.1627, lon: -86.7816, name: 'Nashville' },
    },
    portland: {
      OR: { lat: 45.5152, lon: -122.6784, name: 'Portland' },
    },
    memphis: {
      TN: { lat: 35.1495, lon: -90.049, name: 'Memphis' },
    },
    'oklahoma city': {
      OK: { lat: 35.4676, lon: -97.5164, name: 'Oklahoma City' },
    },
    'las vegas': {
      NV: { lat: 36.1699, lon: -115.1398, name: 'Las Vegas' },
    },
    louisville: {
      KY: { lat: 38.2527, lon: -85.7585, name: 'Louisville' },
    },
    baltimore: {
      MD: { lat: 39.2904, lon: -76.6122, name: 'Baltimore' },
    },
    milwaukee: {
      WI: { lat: 43.0389, lon: -87.9065, name: 'Milwaukee' },
    },
    albuquerque: {
      NM: { lat: 35.0844, lon: -106.6504, name: 'Albuquerque' },
    },
    tucson: {
      AZ: { lat: 32.2226, lon: -110.9747, name: 'Tucson' },
    },
    fresno: {
      CA: { lat: 36.7378, lon: -119.7871, name: 'Fresno' },
    },
    sacramento: {
      CA: { lat: 38.5816, lon: -121.4944, name: 'Sacramento' },
    },
    mesa: {
      AZ: { lat: 33.4152, lon: -111.8315, name: 'Mesa' },
    },
    'kansas city': {
      MO: { lat: 39.0997, lon: -94.5786, name: 'Kansas City' },
    },
    atlanta: {
      GA: { lat: 33.749, lon: -84.388, name: 'Atlanta' },
    },
    'long beach': {
      CA: { lat: 33.7701, lon: -118.1937, name: 'Long Beach' },
    },
    'colorado springs': {
      CO: { lat: 38.8339, lon: -104.8214, name: 'Colorado Springs' },
    },
    raleigh: {
      NC: { lat: 35.7796, lon: -78.6382, name: 'Raleigh' },
    },
    miami: {
      FL: { lat: 25.7617, lon: -80.1918, name: 'Miami' },
    },
    'virginia beach': {
      VA: { lat: 36.8529, lon: -75.978, name: 'Virginia Beach' },
    },
    omaha: {
      NE: { lat: 41.2524, lon: -95.998, name: 'Omaha' },
    },
    oakland: {
      CA: { lat: 37.8044, lon: -122.2712, name: 'Oakland' },
    },
    minneapolis: {
      MN: { lat: 44.9778, lon: -93.265, name: 'Minneapolis' },
    },
    tulsa: {
      OK: { lat: 36.154, lon: -95.9928, name: 'Tulsa' },
    },
    arlington: {
      TX: { lat: 32.7357, lon: -97.1081, name: 'Arlington' },
    },
    tampa: {
      FL: { lat: 27.9506, lon: -82.4572, name: 'Tampa' },
    },
    'new orleans': {
      LA: { lat: 29.9511, lon: -90.0715, name: 'New Orleans' },
    },
    wichita: {
      KS: { lat: 37.6872, lon: -97.3301, name: 'Wichita' },
    },
    cleveland: {
      OH: { lat: 41.4993, lon: -81.6944, name: 'Cleveland' },
    },
    bakersfield: {
      CA: { lat: 35.3733, lon: -119.0187, name: 'Bakersfield' },
    },
  };

  const cityData = majorCities[cityName.toLowerCase()];
  if (cityData && cityData[stateName]) {
    return cityData[stateName];
  }

  return null;
}

/**
 * Basic zip code lookup for common US zip codes
 * @param {string} zipCode - 5-digit zip code
 * @returns {Object|null} Coordinates or null if not found
 */
async function lookupZipCode(zipCode) {
  // Basic lookup for major US cities (this could be expanded with a full zip code database)
  const basicZipCodes = {
    10001: { lat: 40.7505, lon: -73.9934 }, // NYC - Manhattan
    10002: { lat: 40.7156, lon: -73.9877 }, // NYC - Lower East Side
    90210: { lat: 34.0901, lon: -118.4065 }, // Beverly Hills, CA
    90211: { lat: 34.0836, lon: -118.4006 }, // Beverly Hills, CA
    60601: { lat: 41.8825, lon: -87.6441 }, // Chicago, IL - Loop
    60602: { lat: 41.8781, lon: -87.6298 }, // Chicago, IL - Loop
    77001: { lat: 29.7604, lon: -95.3698 }, // Houston, TX
    77002: { lat: 29.7633, lon: -95.3633 }, // Houston, TX
    85001: { lat: 33.4484, lon: -112.074 }, // Phoenix, AZ
    85002: { lat: 33.4734, lon: -112.058 }, // Phoenix, AZ
    33101: { lat: 25.7617, lon: -80.1918 }, // Miami, FL
    33102: { lat: 25.7743, lon: -80.1937 }, // Miami, FL
    98101: { lat: 47.6062, lon: -122.3321 }, // Seattle, WA
    98102: { lat: 47.6205, lon: -122.3212 }, // Seattle, WA
    80201: { lat: 39.7392, lon: -104.9903 }, // Denver, CO
    80202: { lat: 39.7539, lon: -104.9962 }, // Denver, CO
    '02101': { lat: 42.3601, lon: -71.0589 }, // Boston, MA
    '02102': { lat: 42.3584, lon: -71.0598 }, // Boston, MA
    30301: { lat: 33.749, lon: -84.388 }, // Atlanta, GA
    30302: { lat: 33.7676, lon: -84.3922 }, // Atlanta, GA
  };

  return basicZipCodes[zipCode] || null;
}

/**
 * Parse location input and return standardized coordinates
 * @param {string|Object} locationInput - Location string or coordinate object
 * @returns {Promise<Object>} Standardized location object with coordinates
 */
export async function parseLocationInput(locationInput) {
  // If it's already an object with lat/lon, validate and return
  if (typeof locationInput === 'object' && locationInput.latitude && locationInput.longitude) {
    validateCoordinates(locationInput.latitude, locationInput.longitude);
    return {
      latitude: locationInput.latitude,
      longitude: locationInput.longitude,
      formattedAddress: `${locationInput.latitude}, ${locationInput.longitude}`,
      source: 'object',
    };
  }

  // If it's a string, try to geocode it
  if (typeof locationInput === 'string') {
    return await geocodeLocation(locationInput);
  }

  throw new Error(
    'Invalid location input. Please provide coordinates, address, city/state, or zip code.'
  );
}
