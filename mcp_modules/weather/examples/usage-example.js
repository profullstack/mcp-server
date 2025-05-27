/**
 * Weather Module Usage Examples
 *
 * This file demonstrates how to use the weather module
 * for various weather data retrieval scenarios.
 */

// Example coordinates for major US cities
const EXAMPLE_LOCATIONS = {
  'New York, NY': { lat: 40.7128, lon: -74.006 },
  'Los Angeles, CA': { lat: 34.0522, lon: -118.2437 },
  'Chicago, IL': { lat: 41.8781, lon: -87.6298 },
  'Houston, TX': { lat: 29.7604, lon: -95.3698 },
  'Phoenix, AZ': { lat: 33.4484, lon: -112.074 },
  'Miami, FL': { lat: 25.7617, lon: -80.1918 },
  'Seattle, WA': { lat: 47.6062, lon: -122.3321 },
  'Denver, CO': { lat: 39.7392, lon: -104.9903 },
};

const API_BASE_URL = 'http://localhost:3000'; // MCP server URL

/**
 * Example 1: Get Current Weather (using location string)
 */
async function getCurrentWeatherExample() {
  console.log('🌡️ Example 1: Getting Current Weather for New York using location string');

  try {
    const response = await fetch(`${API_BASE_URL}/tools/weather`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'current',
        location: 'New York, NY',
      }),
    });

    const result = await response.json();

    if (result.result) {
      const weather = result.result;
      console.log('✅ Current weather retrieved successfully!');
      console.log(`📍 Location: ${weather.location.city}, ${weather.location.state}`);
      console.log(
        `🌡️ Temperature: ${weather.current.temperature.fahrenheit}°F (${weather.current.temperature.value}°C)`
      );
      console.log(
        `💨 Wind: ${weather.current.windSpeed.mph} mph from ${weather.current.windDirection.value}°`
      );
      console.log(`💧 Humidity: ${weather.current.relativeHumidity.value}%`);
      console.log(`📊 Pressure: ${weather.current.barometricPressure.inHg}" Hg`);
      console.log(`👁️ Visibility: ${weather.current.visibility.miles} miles`);
      console.log(`📝 Conditions: ${weather.current.textDescription}`);
    } else {
      console.error('❌ Failed to get current weather:', result.error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Example 2: Get Weather Forecast
 */
async function getForecastExample() {
  console.log('\n📅 Example 2: Getting 3-Day Forecast for Los Angeles');

  try {
    const { lat, lon } = EXAMPLE_LOCATIONS['Los Angeles, CA'];

    const response = await fetch(`${API_BASE_URL}/tools/weather`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'forecast',
        latitude: lat,
        longitude: lon,
        days: 3,
      }),
    });

    const result = await response.json();

    if (result.result) {
      const forecast = result.result;
      console.log('✅ Forecast retrieved successfully!');
      console.log(`📍 Location: ${forecast.location.city}, ${forecast.location.state}`);
      console.log('📅 Forecast periods:');

      forecast.forecast.periods.forEach((period, index) => {
        const emoji = period.isDaytime ? '☀️' : '🌙';
        console.log(`  ${emoji} ${period.name}: ${period.temperature}°${period.temperatureUnit}`);
        console.log(`     ${period.shortForecast}`);
        console.log(`     Wind: ${period.windSpeed} ${period.windDirection}`);
        if (index < forecast.forecast.periods.length - 1) console.log('');
      });
    } else {
      console.error('❌ Failed to get forecast:', result.error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Example 3: Get Weather Alerts
 */
async function getWeatherAlertsExample() {
  console.log('\n⚠️ Example 3: Getting Weather Alerts for Miami');

  try {
    const { lat, lon } = EXAMPLE_LOCATIONS['Miami, FL'];

    const response = await fetch(`${API_BASE_URL}/tools/weather`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'alerts',
        latitude: lat,
        longitude: lon,
      }),
    });

    const result = await response.json();

    if (result.result) {
      const alerts = result.result;
      console.log('✅ Weather alerts retrieved successfully!');
      console.log(`📍 Location: ${alerts.location.latitude}, ${alerts.location.longitude}`);
      console.log(`🚨 Active alerts: ${alerts.alerts.count}`);

      if (alerts.alerts.count > 0) {
        alerts.alerts.active.forEach((alert, index) => {
          console.log(`\n  Alert ${index + 1}:`);
          console.log(`  🏷️ Type: ${alert.type}`);
          console.log(`  📰 Headline: ${alert.headline}`);
          console.log(`  ⚡ Severity: ${alert.severity}`);
          console.log(`  ⏰ Effective: ${alert.effective}`);
          console.log(`  ⏳ Expires: ${alert.expires}`);
          if (alert.instruction) {
            console.log(`  📋 Instructions: ${alert.instruction}`);
          }
        });
      } else {
        console.log('  ✅ No active weather alerts');
      }
    } else {
      console.error('❌ Failed to get weather alerts:', result.error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Example 4: Get Radar Images
 */
async function getRadarImagesExample() {
  console.log('\n📡 Example 4: Getting Radar Images for Chicago');

  try {
    const { lat, lon } = EXAMPLE_LOCATIONS['Chicago, IL'];

    const response = await fetch(`${API_BASE_URL}/tools/weather`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'radar',
        latitude: lat,
        longitude: lon,
      }),
    });

    const result = await response.json();

    if (result.result) {
      const radar = result.result;
      console.log('✅ Radar images retrieved successfully!');
      console.log(`📍 Location: ${radar.location.city}, ${radar.location.state}`);
      console.log(`📡 Radar Station: ${radar.location.radarStation}`);
      console.log('🖼️ Available radar images:');

      Object.entries(radar.images).forEach(([type, url]) => {
        const displayName = type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        console.log(`  📊 ${displayName}: ${url}`);
      });

      console.log(`\n📝 Note: ${radar.note}`);
    } else {
      console.error('❌ Failed to get radar images:', result.error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Example 5: Get Satellite Images
 */
async function getSatelliteImagesExample() {
  console.log('\n🛰️ Example 5: Getting Satellite Images for Phoenix');

  try {
    const { lat, lon } = EXAMPLE_LOCATIONS['Phoenix, AZ'];

    const response = await fetch(`${API_BASE_URL}/tools/weather`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'satellite',
        latitude: lat,
        longitude: lon,
      }),
    });

    const result = await response.json();

    if (result.result) {
      const satellite = result.result;
      console.log('✅ Satellite images retrieved successfully!');
      console.log(`📍 Location: ${satellite.location.latitude}, ${satellite.location.longitude}`);
      console.log('🛰️ Available satellite images:');

      Object.entries(satellite.images).forEach(([type, url]) => {
        const displayName = type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        console.log(`  🌍 ${displayName}: ${url}`);
      });

      console.log(`\n📝 Note: ${satellite.note}`);
    } else {
      console.error('❌ Failed to get satellite images:', result.error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Example 6: Multi-City Weather Comparison
 */
async function multiCityWeatherExample() {
  console.log('\n🌍 Example 6: Multi-City Weather Comparison');

  const cities = ['New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX'];

  try {
    const weatherPromises = cities.map(async city => {
      const { lat, lon } = EXAMPLE_LOCATIONS[city];

      const response = await fetch(`${API_BASE_URL}/tools/weather`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'current',
          latitude: lat,
          longitude: lon,
        }),
      });

      const result = await response.json();
      return { city, weather: result.result, error: result.error };
    });

    const results = await Promise.all(weatherPromises);

    console.log('✅ Multi-city weather comparison:');
    console.log('┌─────────────────┬─────────────┬─────────────┬─────────────┐');
    console.log('│ City            │ Temperature │ Conditions  │ Humidity    │');
    console.log('├─────────────────┼─────────────┼─────────────┼─────────────┤');

    results.forEach(({ city, weather, error }) => {
      if (weather && !error) {
        const temp = `${weather.current.temperature.fahrenheit}°F`;
        const conditions = weather.current.textDescription?.substring(0, 11) || 'Unknown';
        const humidity = `${weather.current.relativeHumidity.value}%`;

        console.log(
          `│ ${city.padEnd(15)} │ ${temp.padEnd(11)} │ ${conditions.padEnd(11)} │ ${humidity.padEnd(11)} │`
        );
      } else {
        console.log(`│ ${city.padEnd(15)} │ Error       │ Error       │ Error       │`);
      }
    });

    console.log('└─────────────────┴─────────────┴─────────────┴─────────────┘');
  } catch (error) {
    console.error('❌ Error in multi-city comparison:', error.message);
  }
}

/**
 * Example 7: Weather Dashboard
 */
async function weatherDashboardExample() {
  console.log('\n📊 Example 7: Complete Weather Dashboard for Seattle');

  try {
    const { lat, lon } = EXAMPLE_LOCATIONS['Seattle, WA'];

    // Get all weather data in parallel
    const [currentResponse, forecastResponse, alertsResponse, radarResponse] = await Promise.all([
      fetch(`${API_BASE_URL}/tools/weather`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'current', latitude: lat, longitude: lon }),
      }),
      fetch(`${API_BASE_URL}/tools/weather`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'forecast', latitude: lat, longitude: lon, days: 2 }),
      }),
      fetch(`${API_BASE_URL}/tools/weather`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'alerts', latitude: lat, longitude: lon }),
      }),
      fetch(`${API_BASE_URL}/tools/weather`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'radar', latitude: lat, longitude: lon }),
      }),
    ]);

    const [current, forecast, alerts, radar] = await Promise.all([
      currentResponse.json(),
      forecastResponse.json(),
      alertsResponse.json(),
      radarResponse.json(),
    ]);

    console.log('✅ Complete weather dashboard loaded!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(
      `📍 WEATHER DASHBOARD FOR ${current.result.location.city.toUpperCase()}, ${current.result.location.state}`
    );
    console.log('═══════════════════════════════════════════════════════════');

    // Current conditions
    console.log('\n🌡️ CURRENT CONDITIONS:');
    console.log(`   Temperature: ${current.result.current.temperature.fahrenheit}°F`);
    console.log(`   Conditions: ${current.result.current.textDescription}`);
    console.log(`   Wind: ${current.result.current.windSpeed.mph} mph`);
    console.log(`   Humidity: ${current.result.current.relativeHumidity.value}%`);

    // Alerts
    console.log('\n⚠️ WEATHER ALERTS:');
    if (alerts.result.alerts.count > 0) {
      alerts.result.alerts.active.forEach(alert => {
        console.log(`   🚨 ${alert.type}: ${alert.headline}`);
      });
    } else {
      console.log('   ✅ No active alerts');
    }

    // Short forecast
    console.log('\n📅 SHORT FORECAST:');
    forecast.result.forecast.periods.slice(0, 4).forEach(period => {
      const emoji = period.isDaytime ? '☀️' : '🌙';
      console.log(`   ${emoji} ${period.name}: ${period.temperature}°F - ${period.shortForecast}`);
    });

    // Radar
    console.log('\n📡 RADAR IMAGES:');
    console.log(`   Base Reflectivity: ${radar.result.images.base_reflectivity}`);
    console.log(`   Velocity: ${radar.result.images.velocity}`);

    console.log('\n═══════════════════════════════════════════════════════════');
  } catch (error) {
    console.error('❌ Error creating weather dashboard:', error.message);
  }
}

/**
 * Main function to run all examples
 */
async function runExamples() {
  console.log('🚀 Weather Module Usage Examples\n');

  console.log('📋 Setup Instructions:');
  console.log('1. Ensure the MCP server is running on the correct port');
  console.log('2. The weather module uses the free National Weather Service API');
  console.log('3. No API key required - works for US locations only');
  console.log('4. Run: node examples/usage-example.js\n');

  // Run examples sequentially to avoid overwhelming the API
  await getCurrentWeatherExample();
  await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay

  await getForecastExample();
  await new Promise(resolve => setTimeout(resolve, 1000));

  await getWeatherAlertsExample();
  await new Promise(resolve => setTimeout(resolve, 1000));

  await getRadarImagesExample();
  await new Promise(resolve => setTimeout(resolve, 1000));

  await getSatelliteImagesExample();
  await new Promise(resolve => setTimeout(resolve, 1000));

  await multiCityWeatherExample();
  await new Promise(resolve => setTimeout(resolve, 1000));

  await weatherDashboardExample();

  console.log('\n✨ All weather examples completed!');
  console.log('\n💡 Tips:');
  console.log('• Weather data is updated hourly for current conditions');
  console.log('• Radar images update every 5-10 minutes');
  console.log('• Satellite images update every 15-30 minutes');
  console.log('• Use 4 decimal places for coordinate precision');
  console.log('• The module works only for US locations (NWS coverage area)');
}

// Run examples if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runExamples().catch(console.error);
}

export {
  getCurrentWeatherExample,
  getForecastExample,
  getWeatherAlertsExample,
  getRadarImagesExample,
  getSatelliteImagesExample,
  multiCityWeatherExample,
  weatherDashboardExample,
  EXAMPLE_LOCATIONS,
};
