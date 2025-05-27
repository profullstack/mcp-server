/**
 * Tides and Currents Controller
 *
 * HTTP route handlers for the tides and currents module endpoints.
 */

import { tidesService } from './service.js';
import {
  validateStationId,
  getStationType,
  getNextTideEvent,
  getNextCurrentEvent,
} from './utils.js';

/**
 * Get tide predictions for a station
 * @param {Object} c - Hono context
 * @returns {Response} Tide prediction data
 */
export async function getTideData(c) {
  try {
    const stationId = c.req.param('stationId');
    const days = parseInt(c.req.query('days')) || 7;
    const datum = c.req.query('datum') || 'MLLW';
    const units = c.req.query('units') || 'metric';

    if (!validateStationId(stationId)) {
      return c.json({ error: 'Invalid station ID format' }, 400);
    }

    if (days < 1 || days > 30) {
      return c.json({ error: 'Days must be between 1 and 30' }, 400);
    }

    const options = { days, datum, units };
    const result = await tidesService.getTidePredictions(stationId, options);

    // Add next tide event information
    const allTides = result.predictions.data.flatMap(day => day.tides);
    const nextTide = getNextTideEvent(allTides);

    return c.json({
      ...result,
      nextEvent: nextTide,
      stationType: getStationType(stationId),
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
}

/**
 * Get current predictions for a station
 * @param {Object} c - Hono context
 * @returns {Response} Current prediction data
 */
export async function getCurrentData(c) {
  try {
    const stationId = c.req.param('stationId');
    const days = parseInt(c.req.query('days')) || 7;
    const units = c.req.query('units') || 'metric';

    if (!validateStationId(stationId)) {
      return c.json({ error: 'Invalid station ID format' }, 400);
    }

    if (days < 1 || days > 30) {
      return c.json({ error: 'Days must be between 1 and 30' }, 400);
    }

    const options = { days, units };
    const result = await tidesService.getCurrentPredictions(stationId, options);

    // Add next current event information
    const allCurrents = result.predictions.data.flatMap(day => day.currents);
    const nextCurrent = getNextCurrentEvent(allCurrents);

    return c.json({
      ...result,
      nextEvent: nextCurrent,
      stationType: getStationType(stationId),
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
}

/**
 * Get station information
 * @param {Object} c - Hono context
 * @returns {Response} Station metadata
 */
export async function getStationInfo(c) {
  try {
    const stationId = c.req.param('stationId');

    if (!validateStationId(stationId)) {
      return c.json({ error: 'Invalid station ID format' }, 400);
    }

    const result = await tidesService.getStationMetadata(stationId);

    return c.json({
      station: result,
      stationType: getStationType(stationId),
      capabilities: {
        tides: getStationType(stationId) === 'tide',
        currents: getStationType(stationId) === 'current',
        waterLevels: getStationType(stationId) === 'tide',
      },
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
}

/**
 * Search for stations by location or coordinates
 * @param {Object} c - Hono context
 * @returns {Response} Station search results
 */
export async function searchStations(c) {
  try {
    const location = c.req.query('location');
    const latitude = c.req.query('latitude');
    const longitude = c.req.query('longitude');

    if (!location && (!latitude || !longitude)) {
      return c.json(
        {
          error:
            'Missing search parameters. Provide either "location" or both "latitude" and "longitude"',
        },
        400
      );
    }

    let result;

    if (location) {
      result = await tidesService.searchStationsByLocation(location);
    } else {
      const lat = parseFloat(latitude);
      const lon = parseFloat(longitude);

      if (isNaN(lat) || isNaN(lon)) {
        return c.json({ error: 'Invalid latitude or longitude values' }, 400);
      }

      result = await tidesService.findNearbyStations(lat, lon);
    }

    // Add station type information to each result
    result.stations = result.stations.map(station => ({
      ...station,
      stationType: getStationType(station.id),
      capabilities: {
        tides: station.type === 'tide' || getStationType(station.id) === 'tide',
        currents: station.type === 'current' || getStationType(station.id) === 'current',
      },
    }));

    return c.json(result);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
}

/**
 * Get current water levels (real-time data)
 * @param {Object} c - Hono context
 * @returns {Response} Current water level data
 */
export async function getCurrentWaterLevels(c) {
  try {
    const stationId = c.req.param('stationId');

    if (!validateStationId(stationId)) {
      return c.json({ error: 'Invalid station ID format' }, 400);
    }

    if (getStationType(stationId) !== 'tide') {
      return c.json({ error: 'Water levels are only available for tide stations' }, 400);
    }

    const result = await tidesService.getCurrentWaterLevels(stationId);

    return c.json({
      ...result,
      stationType: 'tide',
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
}

/**
 * Get marine conditions summary for a station
 * @param {Object} c - Hono context
 * @returns {Response} Marine conditions summary
 */
export async function getMarineConditions(c) {
  try {
    const stationId = c.req.param('stationId');
    const days = parseInt(c.req.query('days')) || 3;

    if (!validateStationId(stationId)) {
      return c.json({ error: 'Invalid station ID format' }, 400);
    }

    const stationType = getStationType(stationId);
    const stationInfo = await tidesService.getStationMetadata(stationId);

    let conditions = {
      station: stationInfo,
      stationType,
      summary: {
        location: `${stationInfo.name}, ${stationInfo.state}`,
        coordinates: {
          latitude: stationInfo.latitude,
          longitude: stationInfo.longitude,
        },
        timeZone: stationInfo.timezone,
      },
    };

    // Get tide data if it's a tide station
    if (stationType === 'tide') {
      try {
        const tideData = await tidesService.getTidePredictions(stationId, { days });
        const allTides = tideData.predictions.data.flatMap(day => day.tides);
        const nextTide = getNextTideEvent(allTides);

        conditions.tides = {
          available: true,
          nextEvent: nextTide,
          dailySummary: tideData.predictions.data.map(day => ({
            date: day.date,
            tidalRange: day.summary.tidalRange,
            highCount: day.summary.highCount,
            lowCount: day.summary.lowCount,
          })),
        };

        // Try to get current water levels
        try {
          const currentLevel = await tidesService.getCurrentWaterLevels(stationId);
          conditions.currentLevel = currentLevel;
        } catch (error) {
          conditions.currentLevel = { error: 'Current water level data not available' };
        }
      } catch (error) {
        conditions.tides = { available: false, error: error.message };
      }
    }

    // Get current data if it's a current station
    if (stationType === 'current') {
      try {
        const currentData = await tidesService.getCurrentPredictions(stationId, { days });
        const allCurrents = currentData.predictions.data.flatMap(day => day.currents);
        const nextCurrent = getNextCurrentEvent(allCurrents);

        conditions.currents = {
          available: true,
          nextEvent: nextCurrent,
          dailySummary: currentData.predictions.data.map(day => ({
            date: day.date,
            maxVelocity: day.summary.maxVelocity,
            averageDirection: day.summary.averageDirection,
            maxCurrentCount: day.summary.maxCurrentCount,
            slackWaterCount: day.summary.slackWaterCount,
          })),
        };
      } catch (error) {
        conditions.currents = { available: false, error: error.message };
      }
    }

    conditions.metadata = {
      generatedAt: new Date().toISOString(),
      source: 'NOAA CO-OPS',
      disclaimer:
        'Marine conditions are predictions and should not be the sole source for navigation decisions',
    };

    return c.json(conditions);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
}

/**
 * Get station capabilities and available data types
 * @param {Object} c - Hono context
 * @returns {Response} Station capabilities
 */
export async function getStationCapabilities(c) {
  try {
    const stationId = c.req.param('stationId');

    if (!validateStationId(stationId)) {
      return c.json({ error: 'Invalid station ID format' }, 400);
    }

    const stationType = getStationType(stationId);
    const stationInfo = await tidesService.getStationMetadata(stationId);

    const capabilities = {
      station: stationInfo,
      stationType,
      dataTypes: {
        tidePredictions: stationType === 'tide',
        currentPredictions: stationType === 'current',
        waterLevels: stationType === 'tide',
        historicalData: true,
      },
      supportedParameters: {
        days: { min: 1, max: 30, default: 7 },
        units: ['metric', 'english'],
        datum: stationType === 'tide' ? ['MLLW', 'MSL', 'MTL', 'NAVD'] : null,
        timeZone: 'lst_ldt',
      },
      endpoints: {
        tides: stationType === 'tide' ? `/tides-currents/tides/${stationId}` : null,
        currents: stationType === 'current' ? `/tides-currents/currents/${stationId}` : null,
        station: `/tides-currents/station/${stationId}`,
        conditions: `/tides-currents/conditions/${stationId}`,
      },
    };

    return c.json(capabilities);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
}

/**
 * Get popular/common stations by region
 * @param {Object} c - Hono context
 * @returns {Response} Popular stations by region
 */
export async function getPopularStations(c) {
  try {
    const region = c.req.query('region');
    const type = c.req.query('type'); // 'tide', 'current', or 'all'

    const commonStations = tidesService.getCommonStations();

    let filteredStations = commonStations;

    if (region) {
      filteredStations = filteredStations.filter(station =>
        station.region.toLowerCase().includes(region.toLowerCase())
      );
    }

    if (type && type !== 'all') {
      filteredStations = filteredStations.filter(station => station.type === type);
    }

    // Group by region
    const stationsByRegion = filteredStations.reduce((acc, station) => {
      if (!acc[station.region]) {
        acc[station.region] = [];
      }
      acc[station.region].push({
        ...station,
        stationType: getStationType(station.id),
      });
      return acc;
    }, {});

    return c.json({
      regions: Object.keys(stationsByRegion),
      totalStations: filteredStations.length,
      stationsByRegion,
      filters: {
        region: region || 'all',
        type: type || 'all',
      },
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
}
