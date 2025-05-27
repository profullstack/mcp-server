/**
 * Tides and Currents Module
 *
 * A module for retrieving tidal and ocean current data using NOAA CO-OPS API.
 * Provides tide predictions, water levels, and current data for marine navigation.
 */

import { logger } from '../../src/utils/logger.js';
import { getTideData, getCurrentData, getStationInfo, searchStations } from './src/controller.js';
import { tidesService } from './src/service.js';

/**
 * Register this module with the Hono app
 * @param {import('hono').Hono} app - The Hono app instance
 */
export async function register(app) {
  logger.info('Registering tides and currents module');

  // Basic module info endpoint
  app.get('/tides-currents', c => {
    return c.json({
      module: 'tides-currents',
      status: 'active',
      message: 'Tides and Currents - Marine navigation data from NOAA',
      version: metadata.version,
    });
  });

  // Register tides and currents routes
  app.get('/tides-currents/tides/:stationId', getTideData);
  app.get('/tides-currents/currents/:stationId', getCurrentData);
  app.get('/tides-currents/station/:stationId', getStationInfo);
  app.get('/tides-currents/stations/search', searchStations);

  // Register MCP tool info
  app.get('/tools/tides-currents/info', c => {
    return c.json({
      name: 'tides-currents',
      description: 'Get tidal and ocean current data from NOAA CO-OPS',
      parameters: {
        action: {
          type: 'string',
          description: 'The action to perform (tides, currents, station, search)',
          required: true,
        },
        stationId: {
          type: 'string',
          description: 'NOAA station ID (e.g., "8518750" for The Battery, NY)',
          required: false,
        },
        location: {
          type: 'string',
          description: 'Location name for station search (e.g., "San Francisco")',
          required: false,
        },
        latitude: {
          type: 'number',
          description: 'Latitude for nearby station search',
          required: false,
        },
        longitude: {
          type: 'number',
          description: 'Longitude for nearby station search',
          required: false,
        },
        days: {
          type: 'number',
          description: 'Number of days for predictions (1-30, default: 7)',
          required: false,
        },
        datum: {
          type: 'string',
          description: 'Tidal datum (MLLW, MSL, MTL, etc., default: MLLW)',
          required: false,
        },
        units: {
          type: 'string',
          description: 'Units: metric or english (default: metric)',
          required: false,
        },
      },
    });
  });

  // Register MCP tool endpoint
  app.post('/tools/tides-currents', async c => {
    try {
      const params = await c.req.json();

      // Validate required parameters
      if (!params.action) {
        return c.json({ error: 'Missing required parameter: action' }, 400);
      }

      let result;

      switch (params.action) {
        case 'tides': {
          if (!params.stationId) {
            return c.json({ error: 'Missing required parameter: stationId for tides action' }, 400);
          }

          const options = {
            days: params.days || 7,
            datum: params.datum || 'MLLW',
            units: params.units || 'metric',
          };

          result = await tidesService.getTidePredictions(params.stationId, options);
          break;
        }

        case 'currents': {
          if (!params.stationId) {
            return c.json(
              { error: 'Missing required parameter: stationId for currents action' },
              400
            );
          }

          const options = {
            days: params.days || 7,
            units: params.units || 'metric',
          };

          result = await tidesService.getCurrentPredictions(params.stationId, options);
          break;
        }

        case 'station': {
          if (!params.stationId) {
            return c.json(
              { error: 'Missing required parameter: stationId for station action' },
              400
            );
          }

          result = await tidesService.getStationMetadata(params.stationId);
          break;
        }

        case 'search': {
          if (!params.location && (!params.latitude || !params.longitude)) {
            return c.json(
              {
                error:
                  'Missing location information. Provide either "location" name or "latitude" and "longitude" coordinates.',
              },
              400
            );
          }

          if (params.location) {
            result = await tidesService.searchStationsByLocation(params.location);
          } else {
            result = await tidesService.findNearbyStations(params.latitude, params.longitude);
          }
          break;
        }

        default:
          return c.json({ error: `Unknown action: ${params.action}` }, 400);
      }

      return c.json({
        tool: 'tides-currents',
        action: params.action,
        input: {
          stationId: params.stationId,
          location: params.location,
          coordinates:
            params.latitude && params.longitude
              ? { latitude: params.latitude, longitude: params.longitude }
              : undefined,
          options: {
            days: params.days,
            datum: params.datum,
            units: params.units,
          },
        },
        result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return c.json({ error: error.message }, 500);
    }
  });

  // Register the module info endpoint
  app.get('/modules/tides-currents', c => {
    return c.json(metadata);
  });

  logger.info('Tides and currents module registered successfully');
}

/**
 * Unregister this module (cleanup)
 */
export async function unregister() {
  logger.info('Unregistering tides and currents module');
  // Perform any cleanup here
}

/**
 * Module metadata
 */
export const metadata = {
  name: 'Tides and Currents Module',
  version: '1.0.0',
  description:
    'Marine navigation data from NOAA CO-OPS including tides, currents, and station information',
  author: 'Profullstack, Inc.',
  tools: ['tides-currents'],
  endpoints: [
    { path: '/tides-currents', method: 'GET', description: 'Get module information' },
    {
      path: '/tides-currents/tides/:stationId',
      method: 'GET',
      description: 'Get tide predictions for station',
    },
    {
      path: '/tides-currents/currents/:stationId',
      method: 'GET',
      description: 'Get current predictions for station',
    },
    {
      path: '/tides-currents/station/:stationId',
      method: 'GET',
      description: 'Get station information',
    },
    {
      path: '/tides-currents/stations/search',
      method: 'GET',
      description: 'Search for stations by location',
    },
    {
      path: '/tools/tides-currents',
      method: 'POST',
      description: 'Tides and currents tool endpoint',
    },
  ],
};
