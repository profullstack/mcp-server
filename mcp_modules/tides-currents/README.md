# Tides and Currents Module

A comprehensive marine navigation module for the MCP server that integrates with NOAA's CO-OPS (Center for Operational Oceanographic Products and Services) API to provide tidal predictions, ocean current data, and station information for boats, harbors, and marine navigation.

## Features

- **Tide Predictions** - High/low tide times and heights for up to 30 days
- **Current Predictions** - Maximum currents and slack water times
- **Station Search** - Find stations by location name or GPS coordinates
- **Real-time Water Levels** - Current water level data where available
- **Marine Conditions** - Comprehensive marine navigation summaries
- **No API Key Required** - Uses free NOAA government data
- **Extensive Station Coverage** - Major ports and coastal areas across the US
- **Multiple Data Formats** - Metric and English units support

## Supported Regions

### East Coast

- New York Harbor (The Battery, Montauk)
- Boston Harbor
- Baltimore
- Charleston
- Miami (Virginia Key)
- Key West
- Mayport

### West Coast

- San Francisco Bay
- Los Angeles/Long Beach
- San Diego
- Seattle/Puget Sound
- Astoria, Oregon

### Gulf Coast

- Galveston, Texas
- Port Arthur, Texas
- Panama City, Florida
- Dauphin Island, Alabama

### Great Lakes

- Milwaukee, Wisconsin
- Grand Haven, Michigan
- Duluth, Minnesota

### Current Stations

- The Race (Long Island Sound)
- Golden Gate (San Francisco)

## Usage

### As an MCP Tool

**Get Tide Predictions:**

```json
{
  "action": "tides",
  "stationId": "8518750",
  "days": 7,
  "datum": "MLLW",
  "units": "metric"
}
```

**Get Current Predictions:**

```json
{
  "action": "currents",
  "stationId": "ACT4176",
  "days": 3,
  "units": "metric"
}
```

**Search Stations by Location:**

```json
{
  "action": "search",
  "location": "San Francisco"
}
```

**Search Stations by Coordinates:**

```json
{
  "action": "search",
  "latitude": 37.7749,
  "longitude": -122.4194
}
```

**Get Station Information:**

```json
{
  "action": "station",
  "stationId": "9414290"
}
```

### HTTP Endpoints

#### GET /tides-currents/tides/:stationId

Get tide predictions for a specific station.

**Query Parameters:**

- `days` (optional): Number of days (1-30, default: 7)
- `datum` (optional): Tidal datum (MLLW, MSL, MTL, default: MLLW)
- `units` (optional): metric or english (default: metric)

**Example:**

```
GET /tides-currents/tides/8518750?days=3&units=metric
```

**Response:**

```json
{
  "station": {
    "id": "8518750",
    "name": "The Battery",
    "latitude": 40.7,
    "longitude": -74.0,
    "state": "NY"
  },
  "predictions": {
    "datum": "MLLW",
    "units": "meters",
    "timeZone": "Local Standard Time / Local Daylight Time",
    "days": 3,
    "totalPredictions": 12,
    "data": [
      {
        "date": "2025-05-27",
        "tides": [
          {
            "time": "2025-05-27 06:30",
            "height": 1.2,
            "type": "High",
            "timestamp": "2025-05-27T06:30:00.000Z"
          },
          {
            "time": "2025-05-27 12:45",
            "height": 0.3,
            "type": "Low",
            "timestamp": "2025-05-27T12:45:00.000Z"
          }
        ],
        "summary": {
          "highCount": 2,
          "lowCount": 2,
          "maxHigh": 1.5,
          "minLow": 0.1,
          "tidalRange": 1.4
        }
      }
    ]
  },
  "nextEvent": {
    "time": "2025-05-27 18:15",
    "height": 1.4,
    "type": "High",
    "timeUntil": {
      "hours": 6,
      "minutes": 30,
      "totalMinutes": 390
    }
  },
  "stationType": "tide"
}
```

#### GET /tides-currents/currents/:stationId

Get current predictions for a specific station.

**Query Parameters:**

- `days` (optional): Number of days (1-30, default: 7)
- `units` (optional): metric or english (default: metric)

#### GET /tides-currents/station/:stationId

Get detailed station information and capabilities.

#### GET /tides-currents/stations/search

Search for stations by location or coordinates.

**Query Parameters:**

- `location` (optional): Location name (e.g., "New York")
- `latitude` & `longitude` (optional): GPS coordinates for nearby search

#### POST /tools/tides-currents

MCP tool endpoint for all tides and currents operations.

## Station IDs

### Common Tide Stations

- **8518750** - The Battery, New York, NY
- **9414290** - San Francisco, CA
- **8443970** - Boston, MA
- **8665530** - Charleston, SC
- **8723214** - Virginia Key, Miami, FL
- **8724580** - Key West, FL
- **9410170** - San Diego, CA
- **9447130** - Seattle, WA
- **8761724** - Galveston, TX

### Current Stations

- **ACT4176** - The Race, Long Island Sound, NY
- **PCT0101** - Golden Gate, San Francisco, CA

## Data Types and Parameters

### Tidal Datums

- **MLLW** - Mean Lower Low Water (default)
- **MSL** - Mean Sea Level
- **MTL** - Mean Tide Level
- **NAVD** - North American Vertical Datum

### Error Correction Levels

Tidal predictions include confidence intervals and accuracy information based on harmonic analysis of historical data.

### Units

- **Metric**: Heights in meters, velocities in meters/second
- **English**: Heights in feet, velocities in knots

### Time Zones

All times are provided in Local Standard Time / Local Daylight Time (LST/LDT) for the station location.

## Examples

### Basic Tide Information

```javascript
const response = await fetch('/tools/tides-currents', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'tides',
    stationId: '8518750', // The Battery, NY
    days: 3,
  }),
});

const result = await response.json();
console.log('Next high tide:', result.result.nextEvent);
```

### Current Conditions

```javascript
const response = await fetch('/tools/tides-currents', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'currents',
    stationId: 'ACT4176', // The Race
    days: 1,
  }),
});

const result = await response.json();
console.log('Current predictions:', result.result.predictions.data);
```

### Station Search

```javascript
// Search by location name
const locationSearch = await fetch('/tools/tides-currents', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'search',
    location: 'San Francisco',
  }),
});

// Search by coordinates
const coordSearch = await fetch('/tools/tides-currents', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'search',
    latitude: 37.7749,
    longitude: -122.4194,
  }),
});
```

### Marine Navigation Planning

```javascript
const response = await fetch('/tides-currents/conditions/8518750');
const conditions = await response.json();

console.log('Station:', conditions.summary.location);
console.log('Next tide:', conditions.tides.nextEvent);
console.log('Current water level:', conditions.currentLevel);
```

## Marine Navigation Use Cases

### Harbor Entry/Exit Planning

```javascript
// Get tide predictions for harbor navigation
const tides = await getTidePredictions('8518750', { days: 1 });
const nextHigh = tides.nextEvent;

if (nextHigh.type === 'High' && nextHigh.timeUntil.hours < 2) {
  console.log('Optimal time for harbor entry in', nextHigh.timeUntil.hours, 'hours');
}
```

### Fishing and Recreation

```javascript
// Find best fishing times (moving water)
const currents = await getCurrentPredictions('ACT4176', { days: 1 });
const maxCurrents = currents.predictions.data[0].currents.filter(c => c.type === 'max');

console.log('Best fishing times (max current):', maxCurrents);
```

### Commercial Shipping

```javascript
// Check multiple factors for large vessel navigation
const station = '8518750'; // The Battery, NY
const [tides, station_info] = await Promise.all([
  getTidePredictions(station, { days: 2 }),
  getStationInfo(station),
]);

const deepWaterTimes = tides.predictions.data.flatMap(day =>
  day.tides.filter(
    tide => tide.type === 'High' && tide.height > 1.0 // Minimum depth requirement
  )
);
```

### Emergency Response

```javascript
// Get current conditions for search and rescue
const conditions = await getMarineConditions('9414290'); // San Francisco

console.log('Current conditions for SAR operations:');
console.log('Water level:', conditions.currentLevel);
console.log('Next tide change:', conditions.tides.nextEvent);
console.log('Station coordinates:', conditions.summary.coordinates);
```

## Data Sources and Accuracy

### NOAA CO-OPS API

- **Source**: National Oceanic and Atmospheric Administration
- **Update Frequency**: Real-time for observations, daily for predictions
- **Accuracy**: Tide predictions typically accurate to ±6 minutes and ±0.1 meters
- **Coverage**: US coastal waters, Great Lakes, and territories

### Harmonic Analysis

Tide predictions are based on harmonic analysis of long-term water level observations, accounting for:

- Astronomical forces (moon, sun positions)
- Local geographic factors
- Seasonal variations
- Long-term trends

### Limitations

- Predictions do not account for weather effects (storm surge, wind)
- Real-time conditions may vary from predictions
- Not suitable as sole source for critical navigation decisions
- Some stations may have limited historical data

## Error Handling

### Common Error Scenarios

```javascript
// Invalid station ID
{
  "error": "Invalid station ID format"
}

// Station not found
{
  "error": "NOAA API error: Station not found"
}

// Invalid date range
{
  "error": "Days must be between 1 and 30"
}

// Network/API issues
{
  "error": "NOAA API request failed: 503 Service Unavailable"
}
```

### Best Practices

1. **Validate Station IDs**: Use the search function to find valid stations
2. **Handle API Timeouts**: NOAA API may be slow during peak usage
3. **Cache Results**: Predictions don't change frequently
4. **Check Data Age**: Verify timestamp of predictions
5. **Backup Plans**: Have alternative stations for critical operations

## Integration Examples

### Node.js/Express

```javascript
app.get('/marine-conditions/:stationId', async (req, res) => {
  try {
    const response = await fetch(
      `http://localhost:3000/tides-currents/conditions/${req.params.stationId}`
    );
    const conditions = await response.json();

    res.json({
      location: conditions.summary.location,
      nextTide: conditions.tides?.nextEvent,
      currentLevel: conditions.currentLevel,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Python Integration

```python
import requests
from datetime import datetime

def get_tide_predictions(station_id, days=7):
    response = requests.post('http://localhost:3000/tools/tides-currents',
                           json={
                               'action': 'tides',
                               'stationId': station_id,
                               'days': days
                           })

    if response.status_code == 200:
        return response.json()['result']
    else:
        raise Exception(f"Failed to get tide data: {response.text}")

# Usage
tides = get_tide_predictions('8518750', days=3)
next_high = tides['nextEvent']
print(f"Next high tide: {next_high['time']} ({next_high['height']}m)")
```

### React/JavaScript Frontend

```javascript
import React, { useState, useEffect } from 'react';

function TideWidget({ stationId }) {
  const [tideData, setTideData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTides() {
      try {
        const response = await fetch('/tools/tides-currents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'tides',
            stationId: stationId,
            days: 1,
          }),
        });

        const result = await response.json();
        setTideData(result.result);
      } catch (error) {
        console.error('Failed to fetch tide data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchTides();
  }, [stationId]);

  if (loading) return <div>Loading tide data...</div>;
  if (!tideData) return <div>Failed to load tide data</div>;

  return (
    <div className="tide-widget">
      <h3>{tideData.station.name}</h3>
      {tideData.nextEvent && (
        <div className="next-tide">
          <strong>Next {tideData.nextEvent.type} Tide:</strong>
          <div>{tideData.nextEvent.time}</div>
          <div>{tideData.nextEvent.height}m</div>
          <div>
            In {tideData.nextEvent.timeUntil.hours}h {tideData.nextEvent.timeUntil.minutes}m
          </div>
        </div>
      )}
    </div>
  );
}
```

## Testing

The module includes comprehensive tests covering:

- **Station ID Validation**: Format validation for tide and current stations
- **Coordinate Validation**: GPS coordinate bounds checking
- **Data Formatting**: Tide and current data structure validation
- **Unit Conversions**: Height and velocity unit conversions
- **Error Handling**: Invalid inputs and API error scenarios
- **Integration**: Station search and data consistency
- **Regional Coverage**: Verification of major port coverage

Run tests with:

```bash
cd mcp_modules/tides-currents
pnpm test
```

## Dependencies

- **Node.js**: >=18.0.0
- **No external API dependencies**: Uses free NOAA government APIs
- **No API keys required**: Public government data

## Performance Considerations

### Caching Strategy

- **Cache Duration**: 30 minutes for marine data
- **Cache Keys**: Include station ID, date range, and options
- **Memory Usage**: Automatic cleanup of expired cache entries

### API Rate Limits

- NOAA CO-OPS API has no published rate limits for reasonable use
- Module implements request caching to minimize API calls
- Batch requests when possible for multiple stations

### Data Freshness

- Tide predictions: Generated daily, valid for months
- Current predictions: Generated daily, valid for weeks
- Real-time data: Updated every 6 minutes at most stations

## Contributing

When contributing to this module:

1. Follow NOAA data usage guidelines
2. Test with multiple station types (tide/current)
3. Validate against official NOAA data
4. Include error handling for API failures
5. Update station database for new regions
6. Test coordinate calculations for accuracy

## Disclaimer

**Important Navigation Notice**: This module provides tide and current predictions for informational purposes. These predictions:

- Do not account for weather conditions (storms, wind, pressure)
- May not reflect real-time conditions
- Should not be used as the sole source for navigation decisions
- Are based on harmonic analysis and may have inherent uncertainties

For critical marine navigation, always consult:

- Official NOAA charts and publications
- Local Coast Guard notices
- Real-time weather and sea conditions
- Professional marine navigation equipment

## License

MIT License - see the main project license for details.

## API Reference

### Main Endpoint

- `POST /tools/tides-currents` - Universal tool interface

### Actions

- `tides` - Get tide predictions
- `currents` - Get current predictions
- `station` - Get station information
- `search` - Search stations by location or coordinates

### Parameters

- `stationId` (required for tides/currents/station): NOAA station identifier
- `location` (optional): Location name for search
- `latitude`/`longitude` (optional): GPS coordinates for search
- `days` (optional): Prediction period (1-30, default: 7)
- `datum` (optional): Tidal datum (MLLW, MSL, MTL, default: MLLW)
- `units` (optional): metric or english (default: metric)

### Response Format

All responses include:

- `tool`: "tides-currents"
- `action`: Requested action
- `input`: Input parameters
- `result`: Formatted data
- `timestamp`: Generation time
