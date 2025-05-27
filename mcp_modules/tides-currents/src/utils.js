/**
 * Tides and Currents Utilities
 *
 * Utility functions for marine data validation, formatting, and calculations.
 */

/**
 * Validate coordinates
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @throws {Error} If coordinates are invalid
 */
export function validateCoordinates(latitude, longitude) {
  if (typeof latitude !== 'number' || isNaN(latitude)) {
    throw new Error('Invalid latitude: must be a number');
  }
  if (typeof longitude !== 'number' || isNaN(longitude)) {
    throw new Error('Invalid longitude: must be a number');
  }
  if (latitude < -90 || latitude > 90) {
    throw new Error('Invalid latitude: must be between -90 and 90 degrees');
  }
  if (longitude < -180 || longitude > 180) {
    throw new Error('Invalid longitude: must be between -180 and 180 degrees');
  }
}

/**
 * Format tide prediction data
 * @param {Object} data - Raw NOAA tide data
 * @param {Object} stationInfo - Station metadata
 * @param {Object} options - Formatting options
 * @returns {Object} - Formatted tide data
 */
export function formatTideData(data, stationInfo, options) {
  const predictions = data.predictions || [];

  // Group predictions by day
  const dailyTides = {};

  predictions.forEach(prediction => {
    const date = prediction.t.split(' ')[0]; // Extract date part
    if (!dailyTides[date]) {
      dailyTides[date] = [];
    }

    dailyTides[date].push({
      time: prediction.t,
      height: parseFloat(prediction.v),
      type: prediction.type === 'H' ? 'High' : 'Low',
      timestamp: new Date(prediction.t).toISOString(),
    });
  });

  // Calculate tide ranges for each day
  const tidalData = Object.entries(dailyTides).map(([date, tides]) => {
    const highs = tides.filter(t => t.type === 'High');
    const lows = tides.filter(t => t.type === 'Low');

    const maxHigh = highs.length > 0 ? Math.max(...highs.map(h => h.height)) : null;
    const minLow = lows.length > 0 ? Math.min(...lows.map(l => l.height)) : null;
    const range = maxHigh !== null && minLow !== null ? maxHigh - minLow : null;

    return {
      date,
      tides: tides.sort((a, b) => new Date(a.time) - new Date(b.time)),
      summary: {
        highCount: highs.length,
        lowCount: lows.length,
        maxHigh,
        minLow,
        tidalRange: range,
      },
    };
  });

  return {
    station: stationInfo,
    predictions: {
      datum: options.datum || 'MLLW',
      units: options.units === 'metric' ? 'meters' : 'feet',
      timeZone: 'Local Standard Time / Local Daylight Time',
      days: tidalData.length,
      totalPredictions: predictions.length,
      data: tidalData,
    },
    metadata: {
      generatedAt: new Date().toISOString(),
      source: 'NOAA CO-OPS',
      note: 'Tide predictions are based on harmonic analysis of historical data',
    },
  };
}

/**
 * Format current prediction data
 * @param {Object} data - Raw NOAA current data
 * @param {Object} stationInfo - Station metadata
 * @param {Object} options - Formatting options
 * @returns {Object} - Formatted current data
 */
export function formatCurrentData(data, stationInfo, options) {
  const predictions = data.current_predictions || data.predictions || [];

  // Group predictions by day
  const dailyCurrents = {};

  predictions.forEach(prediction => {
    const date = prediction.Time ? prediction.Time.split(' ')[0] : prediction.t.split(' ')[0];
    if (!dailyCurrents[date]) {
      dailyCurrents[date] = [];
    }

    const velocity = prediction.Velocity_Major || prediction.v || 0;
    const direction = prediction.Direction || prediction.d || null;
    const time = prediction.Time || prediction.t;
    const type = prediction.Type || (velocity === 0 ? 'slack' : 'max');

    dailyCurrents[date].push({
      time,
      velocity: parseFloat(velocity),
      direction: direction ? parseFloat(direction) : null,
      type: type.toLowerCase(),
      timestamp: new Date(time).toISOString(),
    });
  });

  // Calculate current statistics for each day
  const currentData = Object.entries(dailyCurrents).map(([date, currents]) => {
    const maxCurrents = currents.filter(c => c.type === 'max' || c.velocity > 0);
    const slackWaters = currents.filter(c => c.type === 'slack' || c.velocity === 0);

    const maxVelocity = maxCurrents.length > 0 ? Math.max(...maxCurrents.map(c => c.velocity)) : 0;
    const avgDirection = calculateAverageDirection(maxCurrents.filter(c => c.direction !== null));

    return {
      date,
      currents: currents.sort((a, b) => new Date(a.time) - new Date(b.time)),
      summary: {
        maxCurrentCount: maxCurrents.length,
        slackWaterCount: slackWaters.length,
        maxVelocity,
        averageDirection: avgDirection,
      },
    };
  });

  return {
    station: stationInfo,
    predictions: {
      units: options.units === 'metric' ? 'meters/second' : 'knots',
      timeZone: 'Local Standard Time / Local Daylight Time',
      days: currentData.length,
      totalPredictions: predictions.length,
      data: currentData,
    },
    metadata: {
      generatedAt: new Date().toISOString(),
      source: 'NOAA CO-OPS',
      note: 'Current predictions include maximum currents and slack water times',
    },
  };
}

/**
 * Format station metadata
 * @param {Object} data - Raw NOAA station data
 * @returns {Object} - Formatted station data
 */
export function formatStationData(data) {
  const metadata = data.metadata || {};

  return {
    id: metadata.id || 'Unknown',
    name: metadata.name || 'Unknown Station',
    latitude: metadata.lat ? parseFloat(metadata.lat) : null,
    longitude: metadata.lon ? parseFloat(metadata.lon) : null,
    state: metadata.state || null,
    timezone: metadata.timezone || null,
    timezonecorr: metadata.timezonecorr || null,
    observedst: metadata.observedst || null,
    stormsurge: metadata.stormsurge || null,
    nearby: {
      NOAA: metadata.nearby_noaa || null,
      NWS: metadata.nearby_nws || null,
      buoy: metadata.nearby_buoy || null,
    },
    forecast: metadata.forecast || null,
    outlook: metadata.outlook || null,
    disclaimer: metadata.disclaimer || null,
  };
}

/**
 * Calculate average direction from current data
 * @param {Array} currents - Array of current objects with direction
 * @returns {number|null} - Average direction in degrees
 */
function calculateAverageDirection(currents) {
  if (currents.length === 0) return null;

  // Convert directions to unit vectors, average them, then convert back
  let sumX = 0;
  let sumY = 0;

  currents.forEach(current => {
    const radians = (current.direction * Math.PI) / 180;
    sumX += Math.cos(radians);
    sumY += Math.sin(radians);
  });

  const avgX = sumX / currents.length;
  const avgY = sumY / currents.length;

  let avgDirection = (Math.atan2(avgY, avgX) * 180) / Math.PI;
  if (avgDirection < 0) avgDirection += 360;

  return Math.round(avgDirection);
}

/**
 * Convert height units
 * @param {number} height - Height value
 * @param {string} fromUnit - Source unit (meters or feet)
 * @param {string} toUnit - Target unit (meters or feet)
 * @returns {number} - Converted height
 */
export function convertHeight(height, fromUnit, toUnit) {
  if (fromUnit === toUnit) return height;

  if (fromUnit === 'meters' && toUnit === 'feet') {
    return height * 3.28084;
  }
  if (fromUnit === 'feet' && toUnit === 'meters') {
    return height / 3.28084;
  }

  return height;
}

/**
 * Convert velocity units
 * @param {number} velocity - Velocity value
 * @param {string} fromUnit - Source unit (m/s or knots)
 * @param {string} toUnit - Target unit (m/s or knots)
 * @returns {number} - Converted velocity
 */
export function convertVelocity(velocity, fromUnit, toUnit) {
  if (fromUnit === toUnit) return velocity;

  if (fromUnit === 'm/s' && toUnit === 'knots') {
    return velocity * 1.94384;
  }
  if (fromUnit === 'knots' && toUnit === 'm/s') {
    return velocity / 1.94384;
  }

  return velocity;
}

/**
 * Get tide type description
 * @param {string} type - Tide type (H or L)
 * @returns {string} - Human-readable tide type
 */
export function getTideTypeDescription(type) {
  const types = {
    H: 'High Tide',
    L: 'Low Tide',
    high: 'High Tide',
    low: 'Low Tide',
  };
  return types[type] || 'Unknown';
}

/**
 * Get current type description
 * @param {string} type - Current type
 * @returns {string} - Human-readable current type
 */
export function getCurrentTypeDescription(type) {
  const types = {
    max: 'Maximum Current',
    slack: 'Slack Water',
    flood: 'Flood Current',
    ebb: 'Ebb Current',
  };
  return types[type.toLowerCase()] || 'Unknown';
}

/**
 * Calculate next tide event
 * @param {Array} tides - Array of tide predictions
 * @returns {Object|null} - Next tide event
 */
export function getNextTideEvent(tides) {
  const now = new Date();

  for (const tide of tides) {
    const tideTime = new Date(tide.timestamp);
    if (tideTime > now) {
      const timeUntil = tideTime - now;
      const hoursUntil = Math.floor(timeUntil / (1000 * 60 * 60));
      const minutesUntil = Math.floor((timeUntil % (1000 * 60 * 60)) / (1000 * 60));

      return {
        ...tide,
        timeUntil: {
          hours: hoursUntil,
          minutes: minutesUntil,
          totalMinutes: Math.floor(timeUntil / (1000 * 60)),
        },
      };
    }
  }

  return null;
}

/**
 * Calculate next current event
 * @param {Array} currents - Array of current predictions
 * @returns {Object|null} - Next current event
 */
export function getNextCurrentEvent(currents) {
  const now = new Date();

  for (const current of currents) {
    const currentTime = new Date(current.timestamp);
    if (currentTime > now) {
      const timeUntil = currentTime - now;
      const hoursUntil = Math.floor(timeUntil / (1000 * 60 * 60));
      const minutesUntil = Math.floor((timeUntil % (1000 * 60 * 60)) / (1000 * 60));

      return {
        ...current,
        timeUntil: {
          hours: hoursUntil,
          minutes: minutesUntil,
          totalMinutes: Math.floor(timeUntil / (1000 * 60)),
        },
      };
    }
  }

  return null;
}

/**
 * Get compass direction from degrees
 * @param {number} degrees - Direction in degrees
 * @returns {string} - Compass direction
 */
export function getCompassDirection(degrees) {
  if (degrees === null || degrees === undefined) return 'Unknown';

  const directions = [
    'N',
    'NNE',
    'NE',
    'ENE',
    'E',
    'ESE',
    'SE',
    'SSE',
    'S',
    'SSW',
    'SW',
    'WSW',
    'W',
    'WNW',
    'NW',
    'NNW',
  ];

  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

/**
 * Format timestamp for display
 * @param {string} timestamp - ISO timestamp
 * @returns {string} - Formatted timestamp
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
 * Validate station ID format
 * @param {string} stationId - Station ID to validate
 * @returns {boolean} - Whether station ID is valid format
 */
export function validateStationId(stationId) {
  if (typeof stationId !== 'string') return false;

  // NOAA station IDs are typically 7-8 digits for tide stations
  // or alphanumeric for current stations (e.g., ACT4176, PCT0101)
  const tideStationPattern = /^\d{7,8}$/;
  const currentStationPattern = /^[A-Z]{3}\d{4}$/;

  return tideStationPattern.test(stationId) || currentStationPattern.test(stationId);
}

/**
 * Get station type from ID
 * @param {string} stationId - Station ID
 * @returns {string} - Station type (tide, current, or unknown)
 */
export function getStationType(stationId) {
  if (!validateStationId(stationId)) return 'unknown';

  if (/^\d{7,8}$/.test(stationId)) return 'tide';
  if (/^[A-Z]{3}\d{4}$/.test(stationId)) return 'current';

  return 'unknown';
}

/**
 * Calculate tidal coefficient (spring/neap indicator)
 * @param {number} tidalRange - Tidal range in meters
 * @returns {Object} - Tidal coefficient information
 */
export function calculateTidalCoefficient(tidalRange) {
  if (tidalRange === null || tidalRange === undefined) {
    return { coefficient: null, description: 'Unknown' };
  }

  // Simplified tidal coefficient calculation
  // In reality, this would be based on lunar and solar influences
  let coefficient;
  let description;

  if (tidalRange > 4.0) {
    coefficient = 'high';
    description = 'Spring tides - large tidal range';
  } else if (tidalRange > 2.0) {
    coefficient = 'medium';
    description = 'Moderate tidal range';
  } else {
    coefficient = 'low';
    description = 'Neap tides - small tidal range';
  }

  return { coefficient, description, range: tidalRange };
}

/**
 * Get marine weather emoji based on conditions
 * @param {string} condition - Weather or sea condition
 * @returns {string} - Appropriate emoji
 */
export function getMarineEmoji(condition) {
  const emojis = {
    high: '🌊',
    low: '🏖️',
    slack: '🌊',
    max: '💨',
    flood: '⬆️',
    ebb: '⬇️',
    spring: '🌕',
    neap: '🌑',
    tide: '🌊',
    current: '💨',
    station: '📍',
    harbor: '⚓',
    ocean: '🌊',
  };

  return emojis[condition.toLowerCase()] || '🌊';
}
