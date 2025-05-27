/**
 * Weather Module Controller
 *
 * HTTP route handlers for the weather module endpoints.
 */

import { weatherService } from './service.js';

/**
 * Get current weather conditions
 * @param {Object} c - Hono context
 * @returns {Response} Current weather data
 */
export async function getCurrentWeather(c) {
  try {
    const lat = parseFloat(c.req.param('lat'));
    const lon = parseFloat(c.req.param('lon'));

    if (isNaN(lat) || isNaN(lon)) {
      return c.json({ error: 'Invalid latitude or longitude parameters' }, 400);
    }

    const weatherData = await weatherService.getCurrentWeather(lat, lon);
    return c.json(weatherData);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
}

/**
 * Get weather forecast
 * @param {Object} c - Hono context
 * @returns {Response} Weather forecast data
 */
export async function getForecast(c) {
  try {
    const lat = parseFloat(c.req.param('lat'));
    const lon = parseFloat(c.req.param('lon'));
    const days = parseInt(c.req.query('days')) || 5;

    if (isNaN(lat) || isNaN(lon)) {
      return c.json({ error: 'Invalid latitude or longitude parameters' }, 400);
    }

    if (days < 1 || days > 7) {
      return c.json({ error: 'Days parameter must be between 1 and 7' }, 400);
    }

    const forecastData = await weatherService.getForecast(lat, lon, days);
    return c.json(forecastData);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
}

/**
 * Get weather alerts
 * @param {Object} c - Hono context
 * @returns {Response} Weather alerts data
 */
export async function getWeatherAlerts(c) {
  try {
    const lat = parseFloat(c.req.param('lat'));
    const lon = parseFloat(c.req.param('lon'));

    if (isNaN(lat) || isNaN(lon)) {
      return c.json({ error: 'Invalid latitude or longitude parameters' }, 400);
    }

    const alertsData = await weatherService.getWeatherAlerts(lat, lon);
    return c.json(alertsData);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
}

/**
 * Get radar image
 * @param {Object} c - Hono context
 * @returns {Response} Radar image data
 */
export async function getRadarImage(c) {
  try {
    const lat = parseFloat(c.req.param('lat'));
    const lon = parseFloat(c.req.param('lon'));

    if (isNaN(lat) || isNaN(lon)) {
      return c.json({ error: 'Invalid latitude or longitude parameters' }, 400);
    }

    const radarData = await weatherService.getRadarImage(lat, lon);
    return c.json(radarData);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
}

/**
 * Get satellite image
 * @param {Object} c - Hono context
 * @returns {Response} Satellite image data
 */
export async function getSatelliteImage(c) {
  try {
    const lat = parseFloat(c.req.param('lat'));
    const lon = parseFloat(c.req.param('lon'));

    if (isNaN(lat) || isNaN(lon)) {
      return c.json({ error: 'Invalid latitude or longitude parameters' }, 400);
    }

    const satelliteData = await weatherService.getSatelliteImage(lat, lon);
    return c.json(satelliteData);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
}
