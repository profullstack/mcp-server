# Weather Module

A comprehensive weather module for the MCP server that integrates with the National Weather Service API (weather.gov) to provide current conditions, forecasts, alerts, and weather imagery with full URLs. Supports multiple location input formats including city names, zip codes, addresses, and coordinates.

## Features

- **Current Weather Conditions** - Real-time weather data from NWS observation stations
- **Weather Forecasts** - Up to 7-day forecasts with detailed information
- **Weather Alerts** - Active weather warnings and advisories
- **Radar Imagery** - Live radar images with multiple products
- **Satellite Imagery** - GOES satellite imagery with various bands
- **No API Key Required** - Uses the free National Weather Service API
- **Full Image URLs** - Returns complete URLs for all weather imagery
- **Comprehensive Data** - Temperature, humidity, pressure, wind, visibility, and more

## Supported Data Types

### Current Weather

- Temperature (Celsius and Fahrenheit)
- Dewpoint
- Wind speed and direction
- Wind gusts
- Barometric pressure
- Sea level pressure
- Visibility
- Relative humidity
- Wind chill and heat index
- Cloud layers
- Present weather conditions

### Forecast Data

- 7-day forecast periods
- Day and night forecasts
- Temperature trends
- Wind conditions
- Detailed descriptions
- Weather icons

### Weather Alerts

- Active warnings and advisories
- Severity levels
- Effective and expiration times
- Detailed descriptions and instructions

### Weather Imagery

- **Radar Products:**
  - Base Reflectivity
  - Composite Reflectivity
  - Velocity
  - Storm Relative Velocity
- **Satellite Products:**
  - Visible/GEOCOLOR
  - Infrared
  - Water Vapor
  - Air Mass

## Location Input Formats

The weather module accepts multiple location input formats for maximum flexibility:

### Supported Formats

- **City, State**: `"New York, NY"`, `"Los Angeles, CA"`, `"Chicago, IL"`
- **Zip Codes**: `"10001"`, `"90210"`, `"60601"`
- **Full Addresses**: `"1600 Pennsylvania Avenue NW, Washington, DC"`
- **Coordinates**: `"40.7128,-74.0060"` or separate latitude/longitude parameters

### Geocoding

- Uses the free **US Census Bureau Geocoding API** (no API key required)
- Falls back to built-in zip code database for major US cities
- Automatic coordinate detection and validation
- Returns geocoding source information in responses

## Usage

### As an MCP Tool

**Using Location String:**

```json
{
  "action": "current",
  "location": "New York, NY"
}
```

**Using Coordinates:**

```json
{
  "action": "current",
  "latitude": 40.7128,
  "longitude": -74.006
}
```

### HTTP Endpoints

#### GET /weather

Get module information and status.

#### GET /weather/current/:lat/:lon

Get current weather conditions for coordinates.

**Example:** `/weather/current/40.7128/-74.0060`

**Response:**

```json
{
  "location": {
    "latitude": 40.7128,
    "longitude": -74.006,
    "city": "New York",
    "state": "NY",
    "station": "https://api.weather.gov/stations/KNYC"
  },
  "current": {
    "timestamp": "2023-12-07T15:51:00+00:00",
    "temperature": {
      "value": 15.6,
      "unit": "wmoUnit:degC",
      "fahrenheit": 60
    },
    "windSpeed": {
      "value": 3.6,
      "unit": "wmoUnit:m_s-1",
      "mph": 8
    },
    "textDescription": "Partly Cloudy"
  }
}
```

#### GET /weather/forecast/:lat/:lon?days=5

Get weather forecast for coordinates.

**Parameters:**

- `days` (optional): Number of forecast days (1-7, default: 5)

#### GET /weather/alerts/:lat/:lon

Get active weather alerts for coordinates.

#### GET /weather/radar/:lat/:lon

Get radar imagery URLs for coordinates.

**Response:**

```json
{
  "location": {
    "latitude": 40.7128,
    "longitude": -74.006,
    "radarStation": "KOKX"
  },
  "images": {
    "base_reflectivity": "https://radar.weather.gov/ridge/standard/N0R_KOKX_0.gif",
    "composite_reflectivity": "https://radar.weather.gov/ridge/standard/NCR_KOKX_0.gif",
    "velocity": "https://radar.weather.gov/ridge/standard/N0V_KOKX_0.gif",
    "storm_relative_velocity": "https://radar.weather.gov/ridge/standard/N0S_KOKX_0.gif"
  },
  "timestamp": "2023-12-07T15:51:00.000Z",
  "note": "Radar images are updated every 5-10 minutes"
}
```

#### GET /weather/satellite/:lat/:lon

Get satellite imagery URLs for coordinates.

**Response:**

```json
{
  "location": {
    "latitude": 40.7128,
    "longitude": -74.006
  },
  "images": {
    "visible": "https://cdn.star.nesdis.noaa.gov/GOES16/ABI/CONUS/GEOCOLOR/GOES16-CONUS-GEOCOLOR-600x600.gif",
    "infrared": "https://cdn.star.nesdis.noaa.gov/GOES16/ABI/CONUS/Band13/GOES16-CONUS-Band13-600x600.gif",
    "water_vapor": "https://cdn.star.nesdis.noaa.gov/GOES16/ABI/CONUS/Band08/GOES16-CONUS-Band08-600x600.gif",
    "air_mass": "https://cdn.star.nesdis.noaa.gov/GOES16/ABI/CONUS/AirMass/GOES16-CONUS-AirMass-600x600.gif"
  },
  "timestamp": "2023-12-07T15:51:00.000Z",
  "note": "Satellite images are updated every 15-30 minutes"
}
```

#### POST /tools/weather

MCP tool endpoint for weather operations.

## Examples

### Get Current Weather

```javascript
const response = await fetch('/tools/weather', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'current',
    latitude: 40.7128,
    longitude: -74.006,
  }),
});

const weather = await response.json();
console.log(`Current temperature: ${weather.result.current.temperature.fahrenheit}°F`);
```

### Get 3-Day Forecast

```javascript
const response = await fetch('/tools/weather', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'forecast',
    latitude: 40.7128,
    longitude: -74.006,
    days: 3,
  }),
});

const forecast = await response.json();
forecast.result.forecast.periods.forEach(period => {
  console.log(`${period.name}: ${period.shortForecast}`);
});
```

### Get Weather Alerts

```javascript
const response = await fetch('/tools/weather', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'alerts',
    latitude: 40.7128,
    longitude: -74.006,
  }),
});

const alerts = await response.json();
if (alerts.result.alerts.count > 0) {
  alerts.result.alerts.active.forEach(alert => {
    console.log(`${alert.type}: ${alert.headline}`);
  });
}
```

### Get Radar Images

```javascript
const response = await fetch('/tools/weather', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'radar',
    latitude: 40.7128,
    longitude: -74.006,
  }),
});

const radar = await response.json();
console.log('Base Reflectivity:', radar.result.images.base_reflectivity);
console.log('Velocity:', radar.result.images.velocity);
```

## Coordinate Examples

### Major US Cities

- **New York, NY**: `40.7128, -74.0060`
- **Los Angeles, CA**: `34.0522, -118.2437`
- **Chicago, IL**: `41.8781, -87.6298`
- **Houston, TX**: `29.7604, -95.3698`
- **Phoenix, AZ**: `33.4484, -112.0740`
- **Philadelphia, PA**: `39.9526, -75.1652`
- **San Antonio, TX**: `29.4241, -98.4936`
- **San Diego, CA**: `32.7157, -117.1611`
- **Dallas, TX**: `32.7767, -96.7970`
- **San Jose, CA**: `37.3382, -121.8863`

## Data Sources

- **National Weather Service API** - weather.gov
- **NOAA Radar Network** - Real-time radar imagery
- **GOES Satellite System** - Geostationary satellite imagery
- **Automated Surface Observing System (ASOS)** - Current conditions

## Limitations

- **US Coverage Only** - NWS API covers United States and territories
- **Coordinate Precision** - Some remote areas may not have nearby observation stations
- **Image Availability** - Radar and satellite images depend on operational status
- **Update Frequency** - Current conditions updated every hour, radar every 5-10 minutes

## Error Handling

The module provides comprehensive error handling for:

- **Invalid Coordinates** - Latitude/longitude validation
- **API Unavailability** - NWS service outages
- **Missing Stations** - No observation stations in area
- **Network Errors** - Connection timeouts and failures

### Common Error Messages

```json
{
  "error": "Invalid latitude: must be a number between -90 and 90"
}
```

```json
{
  "error": "No observation stations found for this location"
}
```

```json
{
  "error": "Weather station lookup failed: 404 Not Found"
}
```

## Caching

The module implements intelligent caching:

- **Station Information** - Cached for 10 minutes
- **Automatic Cleanup** - Prevents memory leaks
- **Cache Statistics** - Available via service methods

## Performance Tips

1. **Coordinate Precision** - Use 4 decimal places for optimal results
2. **Batch Requests** - Group multiple locations when possible
3. **Cache Awareness** - Repeated requests for same location are faster
4. **Error Handling** - Always implement retry logic for network issues

## Troubleshooting

### Common Issues

1. **No Data Available**

   - Check if coordinates are within US boundaries
   - Verify observation stations exist in the area
   - Try nearby coordinates

2. **Image URLs Not Loading**

   - Radar/satellite systems may be temporarily offline
   - Images are updated on different schedules
   - Check NOAA status pages

3. **Forecast Unavailable**
   - Some remote areas may not have forecast coverage
   - Try coordinates closer to populated areas

### Getting Help

- Check the [National Weather Service API documentation](https://www.weather.gov/documentation/services-web-api)
- Review [NOAA radar status](https://www.roc.noaa.gov/WSR88D/)
- Monitor [GOES satellite status](https://www.goes-r.gov/)

## Contributing

When contributing to this module:

1. Follow the established template structure
2. Add comprehensive error handling
3. Include coordinate validation
4. Test with various US locations
5. Update documentation for new features

## License

MIT License - see the main project license for details.
