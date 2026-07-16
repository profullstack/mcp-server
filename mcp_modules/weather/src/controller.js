/**
 * Weather Module Controller
 *
 * HTTP route handlers for the weather module endpoints.
 */

import { weatherService } from './service.js';
import { validateCoordinates } from './utils.js';

function parseCoordinates(c) {
  const rawLat = c.req.param('lat');
  const rawLon = c.req.param('lon');
  if (!rawLat?.trim() || !rawLon?.trim()) return null;

  const lat = Number(rawLat);
  const lon = Number(rawLon);
  try {
    validateCoordinates(lat, lon);
    return { lat, lon };
  } catch {
    return null;
  }
}

function invalidCoordinates(c) {
  return c.json({ error: 'Invalid latitude or longitude parameters' }, 400);
}

/**
 * Get current weather conditions
 * @param {Object} c - Hono context
 * @returns {Response} Current weather data
 */
export async function getCurrentWeather(c) {
  try {
    const coordinates = parseCoordinates(c);
    if (!coordinates) return invalidCoordinates(c);
    const { lat, lon } = coordinates;

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
    const coordinates = parseCoordinates(c);
    if (!coordinates) return invalidCoordinates(c);
    const { lat, lon } = coordinates;
    const days = parseInt(c.req.query('days')) || 5;

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
    const coordinates = parseCoordinates(c);
    if (!coordinates) return invalidCoordinates(c);
    const { lat, lon } = coordinates;

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
    const coordinates = parseCoordinates(c);
    if (!coordinates) return invalidCoordinates(c);
    const { lat, lon } = coordinates;

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
    const coordinates = parseCoordinates(c);
    if (!coordinates) return invalidCoordinates(c);
    const { lat, lon } = coordinates;

    const satelliteData = await weatherService.getSatelliteImage(lat, lon);
    return c.json(satelliteData);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
}
