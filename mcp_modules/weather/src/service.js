/**
 * Weather Module Service
 *
 * This file contains the main business logic for the weather module.
 * Integrates with the National Weather Service API (weather.gov).
 */

import {
  formatWeatherData,
  validateCoordinates,
  buildImageUrl,
  parseLocationInput,
} from './utils.js';

/**
 * Weather service class for handling weather data operations
 */
export class WeatherService {
  constructor() {
    this.baseUrl = 'https://api.weather.gov';
    this.userAgent = 'MCP-Weather-Module/1.0 (contact@profullstack.com)';
    this.cache = new Map();
    this.cacheTimeout = 10 * 60 * 1000; // 10 minutes
  }

  /**
   * Get weather station information for coordinates
   * @param {number} latitude - Latitude coordinate
   * @param {number} longitude - Longitude coordinate
   * @returns {Promise<Object>} - Station information
   */
  async getWeatherStation(latitude, longitude) {
    validateCoordinates(latitude, longitude);

    const cacheKey = `station_${latitude}_${longitude}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const response = await fetch(`${this.baseUrl}/points/${latitude},${longitude}`, {
        headers: {
          'User-Agent': this.userAgent,
        },
      });

      if (!response.ok) {
        throw new Error(`Weather station lookup failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const stationInfo = data.properties;

      // Cache the result
      this.cache.set(cacheKey, {
        data: stationInfo,
        timestamp: Date.now(),
      });

      return stationInfo;
    } catch (error) {
      throw new Error(`Failed to get weather station: ${error.message}`);
    }
  }

  /**
   * Get current weather conditions
   * @param {number} latitude - Latitude coordinate
   * @param {number} longitude - Longitude coordinate
   * @returns {Promise<Object>} - Current weather data
   */
  async getCurrentWeather(latitude, longitude) {
    try {
      const stationInfo = await this.getWeatherStation(latitude, longitude);

      // Get observation stations
      const stationsResponse = await fetch(stationInfo.observationStations, {
        headers: { 'User-Agent': this.userAgent },
      });

      if (!stationsResponse.ok) {
        throw new Error(`Observation stations lookup failed: ${stationsResponse.status}`);
      }

      const stationsData = await stationsResponse.json();
      const firstStation = stationsData.features[0]?.id;

      if (!firstStation) {
        throw new Error('No observation stations found for this location');
      }

      // Get latest observation
      const currentResponse = await fetch(`${firstStation}/observations/latest`, {
        headers: { 'User-Agent': this.userAgent },
      });

      if (!currentResponse.ok) {
        throw new Error(`Current weather lookup failed: ${currentResponse.status}`);
      }

      const currentData = await currentResponse.json();

      return formatWeatherData.current(currentData.properties, {
        latitude,
        longitude,
        station: firstStation,
        city: stationInfo.relativeLocation?.properties?.city || 'Unknown',
        state: stationInfo.relativeLocation?.properties?.state || 'Unknown',
      });
    } catch (error) {
      throw new Error(`Failed to get current weather: ${error.message}`);
    }
  }

  /**
   * Get weather forecast
   * @param {number} latitude - Latitude coordinate
   * @param {number} longitude - Longitude coordinate
   * @param {number} days - Number of days (1-7)
   * @returns {Promise<Object>} - Forecast data
   */
  async getForecast(latitude, longitude, days = 5) {
    try {
      const stationInfo = await this.getWeatherStation(latitude, longitude);

      const forecastResponse = await fetch(stationInfo.forecast, {
        headers: { 'User-Agent': this.userAgent },
      });

      if (!forecastResponse.ok) {
        throw new Error(`Forecast lookup failed: ${forecastResponse.status}`);
      }

      const forecastData = await forecastResponse.json();

      return formatWeatherData.forecast(
        forecastData.properties,
        {
          latitude,
          longitude,
          city: stationInfo.relativeLocation?.properties?.city || 'Unknown',
          state: stationInfo.relativeLocation?.properties?.state || 'Unknown',
        },
        days
      );
    } catch (error) {
      throw new Error(`Failed to get forecast: ${error.message}`);
    }
  }

  /**
   * Get weather alerts
   * @param {number} latitude - Latitude coordinate
   * @param {number} longitude - Longitude coordinate
   * @returns {Promise<Object>} - Weather alerts
   */
  async getWeatherAlerts(latitude, longitude) {
    try {
      const alertsResponse = await fetch(
        `${this.baseUrl}/alerts/active?point=${latitude},${longitude}`,
        {
          headers: { 'User-Agent': this.userAgent },
        }
      );

      if (!alertsResponse.ok) {
        throw new Error(`Weather alerts lookup failed: ${alertsResponse.status}`);
      }

      const alertsData = await alertsResponse.json();

      return formatWeatherData.alerts(alertsData.features, {
        latitude,
        longitude,
      });
    } catch (error) {
      throw new Error(`Failed to get weather alerts: ${error.message}`);
    }
  }

  /**
   * Get radar image
   * @param {number} latitude - Latitude coordinate
   * @param {number} longitude - Longitude coordinate
   * @returns {Promise<Object>} - Radar image data
   */
  async getRadarImage(latitude, longitude) {
    try {
      const stationInfo = await this.getWeatherStation(latitude, longitude);

      // Get radar station from grid data
      const radarStation = stationInfo.radarStation || 'CONUS';

      const radarImages = {
        base_reflectivity: buildImageUrl.radar(radarStation, 'N0R'),
        composite_reflectivity: buildImageUrl.radar(radarStation, 'NCR'),
        velocity: buildImageUrl.radar(radarStation, 'N0V'),
        storm_relative_velocity: buildImageUrl.radar(radarStation, 'N0S'),
      };

      return {
        location: {
          latitude,
          longitude,
          radarStation,
          city: stationInfo.relativeLocation?.properties?.city || 'Unknown',
          state: stationInfo.relativeLocation?.properties?.state || 'Unknown',
        },
        images: radarImages,
        timestamp: new Date().toISOString(),
        note: 'Radar images are updated every 5-10 minutes',
      };
    } catch (error) {
      throw new Error(`Failed to get radar image: ${error.message}`);
    }
  }

  /**
   * Get satellite image
   * @param {number} latitude - Latitude coordinate
   * @param {number} longitude - Longitude coordinate
   * @returns {Promise<Object>} - Satellite image data
   */
  async getSatelliteImage(latitude, longitude) {
    try {
      const satelliteImages = {
        visible: buildImageUrl.satellite('GOES16', 'GEOCOLOR'),
        infrared: buildImageUrl.satellite('GOES16', 'Band13'),
        water_vapor: buildImageUrl.satellite('GOES16', 'Band08'),
        air_mass: buildImageUrl.satellite('GOES16', 'AirMass'),
      };

      return {
        location: {
          latitude,
          longitude,
        },
        images: satelliteImages,
        timestamp: new Date().toISOString(),
        note: 'Satellite images are updated every 15-30 minutes',
      };
    } catch (error) {
      throw new Error(`Failed to get satellite image: ${error.message}`);
    }
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

  /**
   * Get current weather by location string (city, address, zip code, etc.)
   * @param {string} location - Location string
   * @returns {Promise<Object>} - Current weather data
   */
  async getCurrentWeatherByLocation(location) {
    try {
      const locationData = await parseLocationInput(location);
      const weather = await this.getCurrentWeather(locationData.latitude, locationData.longitude);

      // Enhance location info with geocoded data
      weather.location.formattedAddress = locationData.formattedAddress;
      weather.location.geocodingSource = locationData.source;

      return weather;
    } catch (error) {
      throw new Error(`Failed to get current weather for "${location}": ${error.message}`);
    }
  }

  /**
   * Get weather forecast by location string
   * @param {string} location - Location string
   * @param {number} days - Number of days (1-7)
   * @returns {Promise<Object>} - Forecast data
   */
  async getForecastByLocation(location, days = 5) {
    try {
      const locationData = await parseLocationInput(location);
      const forecast = await this.getForecast(locationData.latitude, locationData.longitude, days);

      // Enhance location info with geocoded data
      forecast.location.formattedAddress = locationData.formattedAddress;
      forecast.location.geocodingSource = locationData.source;

      return forecast;
    } catch (error) {
      throw new Error(`Failed to get forecast for "${location}": ${error.message}`);
    }
  }

  /**
   * Get weather alerts by location string
   * @param {string} location - Location string
   * @returns {Promise<Object>} - Weather alerts
   */
  async getWeatherAlertsByLocation(location) {
    try {
      const locationData = await parseLocationInput(location);
      const alerts = await this.getWeatherAlerts(locationData.latitude, locationData.longitude);

      // Enhance location info with geocoded data
      alerts.location.formattedAddress = locationData.formattedAddress;
      alerts.location.geocodingSource = locationData.source;

      return alerts;
    } catch (error) {
      throw new Error(`Failed to get weather alerts for "${location}": ${error.message}`);
    }
  }

  /**
   * Get radar image by location string
   * @param {string} location - Location string
   * @returns {Promise<Object>} - Radar image data
   */
  async getRadarImageByLocation(location) {
    try {
      const locationData = await parseLocationInput(location);
      const radar = await this.getRadarImage(locationData.latitude, locationData.longitude);

      // Enhance location info with geocoded data
      radar.location.formattedAddress = locationData.formattedAddress;
      radar.location.geocodingSource = locationData.source;

      return radar;
    } catch (error) {
      throw new Error(`Failed to get radar image for "${location}": ${error.message}`);
    }
  }

  /**
   * Get satellite image by location string
   * @param {string} location - Location string
   * @returns {Promise<Object>} - Satellite image data
   */
  async getSatelliteImageByLocation(location) {
    try {
      const locationData = await parseLocationInput(location);
      const satellite = await this.getSatelliteImage(locationData.latitude, locationData.longitude);

      // Enhance location info with geocoded data
      satellite.location.formattedAddress = locationData.formattedAddress;
      satellite.location.geocodingSource = locationData.source;

      return satellite;
    } catch (error) {
      throw new Error(`Failed to get satellite image for "${location}": ${error.message}`);
    }
  }
}

// Export a singleton instance
export const weatherService = new WeatherService();
