/**
 * Tides and Currents Service
 *
 * This file contains the main business logic for the tides and currents module.
 * Integrates with NOAA CO-OPS API for marine navigation data.
 */

import {
  validateCoordinates,
  formatTideData,
  formatCurrentData,
  formatStationData,
} from './utils.js';

/**
 * Tides and Currents service class for handling marine data operations
 */
export class TidesService {
  constructor() {
    this.baseUrl = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';
    this.userAgent = 'MCP-Tides-Currents-Module/1.0 (contact@profullstack.com)';
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes for marine data
  }

  /**
   * Get tide predictions for a station
   * @param {string} stationId - NOAA station ID
   * @param {Object} options - Prediction options
   * @returns {Promise<Object>} - Tide prediction data
   */
  async getTidePredictions(stationId, options = {}) {
    try {
      const { days = 7, datum = 'MLLW', units = 'metric' } = options;

      // Validate parameters
      if (days < 1 || days > 30) {
        throw new Error('Days must be between 1 and 30');
      }

      const cacheKey = `tides_${stationId}_${days}_${datum}_${units}`;
      const cached = this.cache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      // Calculate date range
      const beginDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + days);

      const params = new URLSearchParams({
        product: 'predictions',
        application: 'MCP_Tides_Module',
        begin_date: this.formatDate(beginDate),
        end_date: this.formatDate(endDate),
        datum: datum,
        station: stationId,
        time_zone: 'lst_ldt',
        units: units === 'metric' ? 'metric' : 'english',
        interval: 'hilo', // High and low tides
        format: 'json',
      });

      const response = await fetch(`${this.baseUrl}?${params}`, {
        headers: {
          'User-Agent': this.userAgent,
        },
      });

      if (!response.ok) {
        throw new Error(`NOAA API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(`NOAA API error: ${data.error.message}`);
      }

      // Get station metadata
      const stationInfo = await this.getStationMetadata(stationId);

      const formattedData = formatTideData(data, stationInfo, options);

      // Cache the result
      this.cache.set(cacheKey, {
        data: formattedData,
        timestamp: Date.now(),
      });

      return formattedData;
    } catch (error) {
      throw new Error(`Failed to get tide predictions: ${error.message}`);
    }
  }

  /**
   * Get current predictions for a station
   * @param {string} stationId - NOAA station ID
   * @param {Object} options - Prediction options
   * @returns {Promise<Object>} - Current prediction data
   */
  async getCurrentPredictions(stationId, options = {}) {
    try {
      const { days = 7, units = 'metric' } = options;

      // Validate parameters
      if (days < 1 || days > 30) {
        throw new Error('Days must be between 1 and 30');
      }

      const cacheKey = `currents_${stationId}_${days}_${units}`;
      const cached = this.cache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      // Calculate date range
      const beginDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + days);

      const params = new URLSearchParams({
        product: 'currents_predictions',
        application: 'MCP_Tides_Module',
        begin_date: this.formatDate(beginDate),
        end_date: this.formatDate(endDate),
        station: stationId,
        time_zone: 'lst_ldt',
        units: units === 'metric' ? 'metric' : 'english',
        interval: 'MAX_SLACK', // Maximum current and slack water
        format: 'json',
      });

      const response = await fetch(`${this.baseUrl}?${params}`, {
        headers: {
          'User-Agent': this.userAgent,
        },
      });

      if (!response.ok) {
        throw new Error(`NOAA API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(`NOAA API error: ${data.error.message}`);
      }

      // Get station metadata
      const stationInfo = await this.getStationMetadata(stationId);

      const formattedData = formatCurrentData(data, stationInfo, options);

      // Cache the result
      this.cache.set(cacheKey, {
        data: formattedData,
        timestamp: Date.now(),
      });

      return formattedData;
    } catch (error) {
      throw new Error(`Failed to get current predictions: ${error.message}`);
    }
  }

  /**
   * Get station metadata
   * @param {string} stationId - NOAA station ID
   * @returns {Promise<Object>} - Station information
   */
  async getStationMetadata(stationId) {
    try {
      const cacheKey = `station_${stationId}`;
      const cached = this.cache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      // Use built-in station database instead of API call
      const commonStations = this.getCommonStations();
      const station = commonStations.find(s => s.id === stationId);

      if (station) {
        const stationData = {
          id: station.id,
          name: station.name,
          latitude: station.latitude,
          longitude: station.longitude,
          state: station.state,
          region: station.region,
          type: station.type,
          city: station.city,
        };

        // Cache the result
        this.cache.set(cacheKey, {
          data: stationData,
          timestamp: Date.now(),
        });

        return stationData;
      } else {
        // Fallback for unknown stations
        return {
          id: stationId,
          name: `Station ${stationId}`,
          latitude: null,
          longitude: null,
          state: null,
          region: 'Unknown',
          type: 'unknown',
          city: 'Unknown',
        };
      }
    } catch (error) {
      throw new Error(`Failed to get station metadata: ${error.message}`);
    }
  }

  /**
   * Search for stations by location name
   * @param {string} location - Location name
   * @returns {Promise<Object>} - Station search results
   */
  async searchStationsByLocation(location) {
    try {
      // This is a simplified search - in a production system, you'd want
      // a more comprehensive station database or geocoding service
      const commonStations = this.getCommonStations();

      const searchTerm = location.toLowerCase();
      const matches = commonStations.filter(
        station =>
          station.name.toLowerCase().includes(searchTerm) ||
          station.state.toLowerCase().includes(searchTerm) ||
          station.region.toLowerCase().includes(searchTerm)
      );

      return {
        query: location,
        matches: matches.length,
        stations: matches.slice(0, 10), // Limit to 10 results
        note: 'Search results from common NOAA stations database',
      };
    } catch (error) {
      throw new Error(`Failed to search stations: ${error.message}`);
    }
  }

  /**
   * Find nearby stations by coordinates
   * @param {number} latitude - Latitude
   * @param {number} longitude - Longitude
   * @returns {Promise<Object>} - Nearby stations
   */
  async findNearbyStations(latitude, longitude) {
    try {
      validateCoordinates(latitude, longitude);

      const commonStations = this.getCommonStations();

      // Calculate distances and sort by proximity
      const stationsWithDistance = commonStations.map(station => {
        const distance = this.calculateDistance(
          latitude,
          longitude,
          station.latitude,
          station.longitude
        );
        return { ...station, distance };
      });

      // Sort by distance and take closest 10
      stationsWithDistance.sort((a, b) => a.distance - b.distance);
      const nearbyStations = stationsWithDistance.slice(0, 10);

      return {
        coordinates: { latitude, longitude },
        matches: nearbyStations.length,
        stations: nearbyStations,
        note: 'Stations sorted by distance from coordinates',
      };
    } catch (error) {
      throw new Error(`Failed to find nearby stations: ${error.message}`);
    }
  }

  /**
   * Get current water levels (real-time data)
   * @param {string} stationId - NOAA station ID
   * @returns {Promise<Object>} - Current water level data
   */
  async getCurrentWaterLevels(stationId) {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const params = new URLSearchParams({
        product: 'water_level',
        application: 'MCP_Tides_Module',
        begin_date: this.formatDate(oneHourAgo),
        end_date: this.formatDate(now),
        station: stationId,
        time_zone: 'lst_ldt',
        units: 'metric',
        format: 'json',
      });

      const response = await fetch(`${this.baseUrl}?${params}`, {
        headers: {
          'User-Agent': this.userAgent,
        },
      });

      if (!response.ok) {
        throw new Error(`Water level request failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(`NOAA API error: ${data.error.message}`);
      }

      return {
        stationId,
        currentLevel: data.data && data.data.length > 0 ? data.data[data.data.length - 1] : null,
        timestamp: new Date().toISOString(),
        units: 'meters',
      };
    } catch (error) {
      throw new Error(`Failed to get current water levels: ${error.message}`);
    }
  }

  /**
   * Format date for NOAA API
   * @param {Date} date - Date to format
   * @returns {string} - Formatted date string
   */
  formatDate(date) {
    return date.toISOString().slice(0, 16).replace('T', ' ');
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   * @param {number} lat1 - Latitude 1
   * @param {number} lon1 - Longitude 1
   * @param {number} lat2 - Latitude 2
   * @param {number} lon2 - Longitude 2
   * @returns {number} - Distance in kilometers
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   * @param {number} degrees - Degrees
   * @returns {number} - Radians
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get common NOAA stations database
   * @returns {Array} - Array of station objects
   */
  getCommonStations() {
    return [
      // East Coast
      {
        id: '8518750',
        name: 'The Battery',
        city: 'New York',
        state: 'NY',
        region: 'East Coast',
        latitude: 40.7,
        longitude: -74.0,
        type: 'tide',
      },
      {
        id: '8510560',
        name: 'Montauk',
        city: 'Montauk',
        state: 'NY',
        region: 'East Coast',
        latitude: 41.0,
        longitude: -71.9,
        type: 'tide',
      },
      {
        id: '8443970',
        name: 'Boston',
        city: 'Boston',
        state: 'MA',
        region: 'East Coast',
        latitude: 42.4,
        longitude: -71.0,
        type: 'tide',
      },
      {
        id: '8594900',
        name: 'Baltimore',
        city: 'Baltimore',
        state: 'MD',
        region: 'East Coast',
        latitude: 39.3,
        longitude: -76.6,
        type: 'tide',
      },
      {
        id: '8665530',
        name: 'Charleston',
        city: 'Charleston',
        state: 'SC',
        region: 'East Coast',
        latitude: 32.8,
        longitude: -79.9,
        type: 'tide',
      },
      {
        id: '8720218',
        name: 'Mayport',
        city: 'Mayport',
        state: 'FL',
        region: 'East Coast',
        latitude: 30.4,
        longitude: -81.4,
        type: 'tide',
      },
      {
        id: '8723214',
        name: 'Virginia Key',
        city: 'Miami',
        state: 'FL',
        region: 'East Coast',
        latitude: 25.7,
        longitude: -80.2,
        type: 'tide',
      },
      {
        id: '8724580',
        name: 'Key West',
        city: 'Key West',
        state: 'FL',
        region: 'East Coast',
        latitude: 24.6,
        longitude: -81.8,
        type: 'tide',
      },

      // West Coast
      {
        id: '9414290',
        name: 'San Francisco',
        city: 'San Francisco',
        state: 'CA',
        region: 'West Coast',
        latitude: 37.8,
        longitude: -122.5,
        type: 'tide',
      },
      {
        id: '9410170',
        name: 'San Diego',
        city: 'San Diego',
        state: 'CA',
        region: 'West Coast',
        latitude: 32.7,
        longitude: -117.2,
        type: 'tide',
      },
      {
        id: '9411340',
        name: 'Los Angeles',
        city: 'Los Angeles',
        state: 'CA',
        region: 'West Coast',
        latitude: 33.7,
        longitude: -118.3,
        type: 'tide',
      },
      {
        id: '9447130',
        name: 'Seattle',
        city: 'Seattle',
        state: 'WA',
        region: 'West Coast',
        latitude: 47.6,
        longitude: -122.3,
        type: 'tide',
      },
      {
        id: '9440910',
        name: 'Toke Point',
        city: 'Toke Point',
        state: 'WA',
        region: 'West Coast',
        latitude: 46.7,
        longitude: -123.9,
        type: 'tide',
      },
      {
        id: '9435380',
        name: 'Astoria',
        city: 'Astoria',
        state: 'OR',
        region: 'West Coast',
        latitude: 46.2,
        longitude: -123.8,
        type: 'tide',
      },

      // Gulf Coast
      {
        id: '8761724',
        name: 'Galveston',
        city: 'Galveston',
        state: 'TX',
        region: 'Gulf Coast',
        latitude: 29.3,
        longitude: -94.8,
        type: 'tide',
      },
      {
        id: '8760922',
        name: 'Port Arthur',
        city: 'Port Arthur',
        state: 'TX',
        region: 'Gulf Coast',
        latitude: 29.9,
        longitude: -93.9,
        type: 'tide',
      },
      {
        id: '8729840',
        name: 'Panama City',
        city: 'Panama City',
        state: 'FL',
        region: 'Gulf Coast',
        latitude: 30.2,
        longitude: -85.7,
        type: 'tide',
      },
      {
        id: '8735180',
        name: 'Dauphin Island',
        city: 'Dauphin Island',
        state: 'AL',
        region: 'Gulf Coast',
        latitude: 30.3,
        longitude: -88.1,
        type: 'tide',
      },

      // Great Lakes
      {
        id: '9087031',
        name: 'Milwaukee',
        city: 'Milwaukee',
        state: 'WI',
        region: 'Great Lakes',
        latitude: 43.0,
        longitude: -87.9,
        type: 'tide',
      },
      {
        id: '9063053',
        name: 'Grand Haven',
        city: 'Grand Haven',
        state: 'MI',
        region: 'Great Lakes',
        latitude: 43.1,
        longitude: -86.2,
        type: 'tide',
      },
      {
        id: '9014087',
        name: 'Duluth',
        city: 'Duluth',
        state: 'MN',
        region: 'Great Lakes',
        latitude: 46.8,
        longitude: -92.1,
        type: 'tide',
      },

      // Current Stations (examples)
      {
        id: 'ACT4176',
        name: 'The Race',
        city: 'Long Island Sound',
        state: 'NY',
        region: 'East Coast',
        latitude: 41.2,
        longitude: -72.0,
        type: 'current',
      },
      {
        id: 'PCT0101',
        name: 'Golden Gate',
        city: 'San Francisco',
        state: 'CA',
        region: 'West Coast',
        latitude: 37.8,
        longitude: -122.5,
        type: 'current',
      },
    ];
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      timeout: this.cacheTimeout,
      entries: Array.from(this.cache.keys()),
    };
  }
}

// Export a singleton instance
export const tidesService = new TidesService();
