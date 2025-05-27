/**
 * Weather Module
 *
 * A module for retrieving weather data and images using the National Weather Service API (weather.gov).
 * Provides current conditions, forecasts, and weather imagery with full URLs.
 */

import { logger } from '../../src/utils/logger.js';
import {
  getCurrentWeather,
  getForecast,
  getWeatherAlerts,
  getRadarImage,
  getSatelliteImage,
} from './src/controller.js';
import { weatherService } from './src/service.js';

/**
 * Register this module with the Hono app
 * @param {import('hono').Hono} app - The Hono app instance
 */
export async function register(app) {
  logger.info('Registering weather module');

  // Basic module info endpoint
  app.get('/weather', c => {
    return c.json({
      module: 'weather',
      status: 'active',
      message: 'Weather data and imagery from National Weather Service',
      version: metadata.version,
    });
  });

  // Register weather routes
  app.get('/weather/current/:lat/:lon', getCurrentWeather);
  app.get('/weather/forecast/:lat/:lon', getForecast);
  app.get('/weather/alerts/:lat/:lon', getWeatherAlerts);
  app.get('/weather/radar/:lat/:lon', getRadarImage);
  app.get('/weather/satellite/:lat/:lon', getSatelliteImage);

  // Register MCP tool info
  app.get('/tools/weather/info', c => {
    return c.json({
      name: 'weather',
      description: 'Get weather data and imagery from the National Weather Service',
      parameters: {
        action: {
          type: 'string',
          description: 'The action to perform (current, forecast, alerts, radar, satellite)',
          required: true,
        },
        location: {
          type: 'string',
          description:
            'Location as city/state, address, zip code, or coordinates (e.g., "New York, NY", "10001", "40.7128,-74.0060")',
          required: false,
        },
        latitude: {
          type: 'number',
          description: 'Latitude coordinate (alternative to location string)',
          required: false,
        },
        longitude: {
          type: 'number',
          description: 'Longitude coordinate (alternative to location string)',
          required: false,
        },
        days: {
          type: 'number',
          description: 'Number of forecast days (1-7, default: 5)',
          required: false,
        },
      },
    });
  });

  // Register MCP tool endpoint
  app.post('/tools/weather', async c => {
    try {
      const params = await c.req.json();

      // Validate required parameters
      if (!params.action) {
        return c.json({ error: 'Missing required parameter: action' }, 400);
      }

      // Check if we have either location string or coordinates
      const hasLocation = params.location && typeof params.location === 'string';
      const hasCoordinates =
        typeof params.latitude === 'number' && typeof params.longitude === 'number';

      if (!hasLocation && !hasCoordinates) {
        return c.json(
          {
            error:
              'Missing location information. Provide either "location" (city, address, zip) or "latitude" and "longitude" coordinates.',
          },
          400
        );
      }

      let result;
      let locationInfo;

      switch (params.action) {
        case 'current': {
          if (hasLocation) {
            result = await weatherService.getCurrentWeatherByLocation(params.location);
            locationInfo = { location: params.location };
          } else {
            result = await weatherService.getCurrentWeather(params.latitude, params.longitude);
            locationInfo = { latitude: params.latitude, longitude: params.longitude };
          }
          break;
        }

        case 'forecast': {
          const days = params.days || 5;
          if (hasLocation) {
            result = await weatherService.getForecastByLocation(params.location, days);
            locationInfo = { location: params.location };
          } else {
            result = await weatherService.getForecast(params.latitude, params.longitude, days);
            locationInfo = { latitude: params.latitude, longitude: params.longitude };
          }
          break;
        }

        case 'alerts': {
          if (hasLocation) {
            result = await weatherService.getWeatherAlertsByLocation(params.location);
            locationInfo = { location: params.location };
          } else {
            result = await weatherService.getWeatherAlerts(params.latitude, params.longitude);
            locationInfo = { latitude: params.latitude, longitude: params.longitude };
          }
          break;
        }

        case 'radar': {
          if (hasLocation) {
            result = await weatherService.getRadarImageByLocation(params.location);
            locationInfo = { location: params.location };
          } else {
            result = await weatherService.getRadarImage(params.latitude, params.longitude);
            locationInfo = { latitude: params.latitude, longitude: params.longitude };
          }
          break;
        }

        case 'satellite': {
          if (hasLocation) {
            result = await weatherService.getSatelliteImageByLocation(params.location);
            locationInfo = { location: params.location };
          } else {
            result = await weatherService.getSatelliteImage(params.latitude, params.longitude);
            locationInfo = { latitude: params.latitude, longitude: params.longitude };
          }
          break;
        }

        default:
          return c.json({ error: `Unknown action: ${params.action}` }, 400);
      }

      return c.json({
        tool: 'weather',
        action: params.action,
        input: locationInfo,
        result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return c.json({ error: error.message }, 500);
    }
  });

  // Register the module info endpoint
  app.get('/modules/weather', c => {
    return c.json(metadata);
  });

  logger.info('Weather module registered successfully');
}

/**
 * Unregister this module (cleanup)
 */
export async function unregister() {
  logger.info('Unregistering weather module');
  // Perform any cleanup here
}

/**
 * Module metadata
 */
export const metadata = {
  name: 'Weather Module',
  version: '1.0.0',
  description: 'Weather data and imagery from the National Weather Service API',
  author: 'Profullstack, Inc.',
  tools: ['weather'],
  endpoints: [
    { path: '/weather', method: 'GET', description: 'Get module information' },
    {
      path: '/weather/current/:lat/:lon',
      method: 'GET',
      description: 'Get current weather conditions',
    },
    { path: '/weather/forecast/:lat/:lon', method: 'GET', description: 'Get weather forecast' },
    { path: '/weather/alerts/:lat/:lon', method: 'GET', description: 'Get weather alerts' },
    { path: '/weather/radar/:lat/:lon', method: 'GET', description: 'Get radar imagery' },
    { path: '/weather/satellite/:lat/:lon', method: 'GET', description: 'Get satellite imagery' },
    { path: '/tools/weather', method: 'POST', description: 'Weather tool endpoint' },
  ],
};
