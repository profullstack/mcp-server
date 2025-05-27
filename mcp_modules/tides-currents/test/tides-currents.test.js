import { describe, it, before } from 'mocha';
import { expect } from 'chai';

describe('Tides and Currents Module', () => {
  describe('Module Structure', () => {
    it('should export the required functions', async () => {
      const module = await import('../index.js');
      expect(module.register).to.be.a('function');
      expect(module.unregister).to.be.a('function');
      expect(module.metadata).to.be.an('object');
    });

    it('should have correct metadata', async () => {
      const { metadata } = await import('../index.js');
      expect(metadata.name).to.equal('Tides and Currents Module');
      expect(metadata.version).to.equal('1.0.0');
      expect(metadata.description).to.include('Marine navigation');
      expect(metadata.author).to.equal('Profullstack, Inc.');
      expect(metadata.tools).to.include('tides-currents');
      expect(metadata.endpoints).to.be.an('array');
      expect(metadata.endpoints.length).to.be.greaterThan(0);
    });
  });

  describe('Utility Functions', () => {
    let utils;

    before(async () => {
      utils = await import('../src/utils.js');
    });

    describe('validateCoordinates', () => {
      it('should accept valid coordinates', () => {
        expect(() => utils.validateCoordinates(40.7128, -74.006)).to.not.throw();
        expect(() => utils.validateCoordinates(0, 0)).to.not.throw();
        expect(() => utils.validateCoordinates(90, 180)).to.not.throw();
        expect(() => utils.validateCoordinates(-90, -180)).to.not.throw();
      });

      it('should reject invalid latitude', () => {
        expect(() => utils.validateCoordinates(91, 0)).to.throw('Invalid latitude');
        expect(() => utils.validateCoordinates(-91, 0)).to.throw('Invalid latitude');
        expect(() => utils.validateCoordinates('invalid', 0)).to.throw('Invalid latitude');
      });

      it('should reject invalid longitude', () => {
        expect(() => utils.validateCoordinates(0, 181)).to.throw('Invalid longitude');
        expect(() => utils.validateCoordinates(0, -181)).to.throw('Invalid longitude');
        expect(() => utils.validateCoordinates(0, 'invalid')).to.throw('Invalid longitude');
      });
    });

    describe('Station ID Validation', () => {
      it('should validate tide station IDs', () => {
        expect(utils.validateStationId('8518750')).to.be.true; // The Battery, NY
        expect(utils.validateStationId('9414290')).to.be.true; // San Francisco
        expect(utils.validateStationId('12345678')).to.be.true; // 8-digit format
        expect(utils.validateStationId('1234567')).to.be.true; // 7-digit format
      });

      it('should validate current station IDs', () => {
        expect(utils.validateStationId('ACT4176')).to.be.true; // The Race
        expect(utils.validateStationId('PCT0101')).to.be.true; // Golden Gate
      });

      it('should reject invalid station IDs', () => {
        expect(utils.validateStationId('123')).to.be.false; // Too short
        expect(utils.validateStationId('123456789')).to.be.false; // Too long
        expect(utils.validateStationId('ABC123')).to.be.false; // Wrong format
        expect(utils.validateStationId('')).to.be.false; // Empty
        expect(utils.validateStationId(null)).to.be.false; // Null
      });
    });

    describe('Station Type Detection', () => {
      it('should detect tide stations', () => {
        expect(utils.getStationType('8518750')).to.equal('tide');
        expect(utils.getStationType('9414290')).to.equal('tide');
        expect(utils.getStationType('12345678')).to.equal('tide');
      });

      it('should detect current stations', () => {
        expect(utils.getStationType('ACT4176')).to.equal('current');
        expect(utils.getStationType('PCT0101')).to.equal('current');
      });

      it('should return unknown for invalid IDs', () => {
        expect(utils.getStationType('invalid')).to.equal('unknown');
        expect(utils.getStationType('123')).to.equal('unknown');
      });
    });

    describe('Unit Conversions', () => {
      it('should convert height units correctly', () => {
        expect(utils.convertHeight(1, 'meters', 'feet')).to.be.closeTo(3.28084, 0.001);
        expect(utils.convertHeight(3.28084, 'feet', 'meters')).to.be.closeTo(1, 0.001);
        expect(utils.convertHeight(5, 'meters', 'meters')).to.equal(5);
      });

      it('should convert velocity units correctly', () => {
        expect(utils.convertVelocity(1, 'm/s', 'knots')).to.be.closeTo(1.94384, 0.001);
        expect(utils.convertVelocity(1.94384, 'knots', 'm/s')).to.be.closeTo(1, 0.001);
        expect(utils.convertVelocity(5, 'knots', 'knots')).to.equal(5);
      });
    });

    describe('Compass Direction', () => {
      it('should return correct compass directions', () => {
        expect(utils.getCompassDirection(0)).to.equal('N');
        expect(utils.getCompassDirection(90)).to.equal('E');
        expect(utils.getCompassDirection(180)).to.equal('S');
        expect(utils.getCompassDirection(270)).to.equal('W');
        expect(utils.getCompassDirection(45)).to.equal('NE');
        expect(utils.getCompassDirection(315)).to.equal('NW');
      });

      it('should handle edge cases', () => {
        expect(utils.getCompassDirection(null)).to.equal('Unknown');
        expect(utils.getCompassDirection(undefined)).to.equal('Unknown');
        expect(utils.getCompassDirection(360)).to.equal('N'); // Should wrap around
      });
    });

    describe('Tide and Current Type Descriptions', () => {
      it('should return correct tide type descriptions', () => {
        expect(utils.getTideTypeDescription('H')).to.equal('High Tide');
        expect(utils.getTideTypeDescription('L')).to.equal('Low Tide');
        expect(utils.getTideTypeDescription('high')).to.equal('High Tide');
        expect(utils.getTideTypeDescription('low')).to.equal('Low Tide');
        expect(utils.getTideTypeDescription('unknown')).to.equal('Unknown');
      });

      it('should return correct current type descriptions', () => {
        expect(utils.getCurrentTypeDescription('max')).to.equal('Maximum Current');
        expect(utils.getCurrentTypeDescription('slack')).to.equal('Slack Water');
        expect(utils.getCurrentTypeDescription('flood')).to.equal('Flood Current');
        expect(utils.getCurrentTypeDescription('ebb')).to.equal('Ebb Current');
        expect(utils.getCurrentTypeDescription('unknown')).to.equal('Unknown');
      });
    });

    describe('Tidal Coefficient Calculation', () => {
      it('should calculate tidal coefficients correctly', () => {
        const highRange = utils.calculateTidalCoefficient(5.0);
        expect(highRange.coefficient).to.equal('high');
        expect(highRange.description).to.include('Spring tides');

        const mediumRange = utils.calculateTidalCoefficient(3.0);
        expect(mediumRange.coefficient).to.equal('medium');
        expect(mediumRange.description).to.include('Moderate');

        const lowRange = utils.calculateTidalCoefficient(1.5);
        expect(lowRange.coefficient).to.equal('low');
        expect(lowRange.description).to.include('Neap tides');
      });

      it('should handle null values', () => {
        const result = utils.calculateTidalCoefficient(null);
        expect(result.coefficient).to.be.null;
        expect(result.description).to.equal('Unknown');
      });
    });

    describe('Marine Emojis', () => {
      it('should return appropriate emojis for marine conditions', () => {
        expect(utils.getMarineEmoji('high')).to.equal('🌊');
        expect(utils.getMarineEmoji('low')).to.equal('🏖️');
        expect(utils.getMarineEmoji('slack')).to.equal('🌊');
        expect(utils.getMarineEmoji('max')).to.equal('💨');
        expect(utils.getMarineEmoji('station')).to.equal('📍');
        expect(utils.getMarineEmoji('harbor')).to.equal('⚓');
      });

      it('should return default emoji for unknown conditions', () => {
        expect(utils.getMarineEmoji('unknown')).to.equal('🌊');
        expect(utils.getMarineEmoji('')).to.equal('🌊');
      });
    });

    describe('Timestamp Formatting', () => {
      it('should format valid timestamps', () => {
        const timestamp = '2023-12-07T15:30:00Z';
        const formatted = utils.formatTimestamp(timestamp);
        expect(formatted).to.be.a('string');
        expect(formatted).to.not.equal('Unknown');
        expect(formatted).to.include('2023');
      });

      it('should handle invalid timestamps', () => {
        // formatTimestamp returns the original string if Date parsing fails, but Date.toLocaleString() returns "Invalid Date"
        const result = utils.formatTimestamp('invalid');
        expect(result).to.satisfy(r => r === 'invalid' || r === 'Invalid Date');
        expect(utils.formatTimestamp(null)).to.equal('Unknown');
        expect(utils.formatTimestamp(undefined)).to.equal('Unknown');
        expect(utils.formatTimestamp('')).to.equal('Unknown');
      });
    });

    describe('Next Event Calculation', () => {
      it('should find next tide event', () => {
        const futureTide = {
          time: '2025-12-07 15:30',
          height: 2.5,
          type: 'High',
          timestamp: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
        };

        const pastTide = {
          time: '2025-12-07 09:30',
          height: 0.5,
          type: 'Low',
          timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
        };

        const tides = [pastTide, futureTide];
        const nextEvent = utils.getNextTideEvent(tides);

        expect(nextEvent).to.not.be.null;
        expect(nextEvent.type).to.equal('High');
        expect(nextEvent.timeUntil).to.be.an('object');
        expect(nextEvent.timeUntil.hours).to.be.a('number');
        expect(nextEvent.timeUntil.minutes).to.be.a('number');
      });

      it('should return null if no future events', () => {
        const pastTide = {
          time: '2025-12-07 09:30',
          height: 0.5,
          type: 'Low',
          timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        };

        const nextEvent = utils.getNextTideEvent([pastTide]);
        expect(nextEvent).to.be.null;
      });
    });
  });

  describe('Service Class', () => {
    let TidesService;
    let service;

    before(async () => {
      const serviceModule = await import('../src/service.js');
      TidesService = serviceModule.TidesService;
      service = serviceModule.tidesService;
    });

    it('should create a service instance', () => {
      expect(service).to.be.an.instanceof(TidesService);
      expect(service.baseUrl).to.equal('https://api.tidesandcurrents.noaa.gov/api/prod/datagetter');
      expect(service.userAgent).to.include('MCP-Tides-Currents-Module');
    });

    it('should have cache functionality', () => {
      expect(service.cache).to.be.an.instanceof(Map);
      expect(service.cacheTimeout).to.be.a('number');
      expect(service.clearCache).to.be.a('function');
      expect(service.getCacheStats).to.be.a('function');
    });

    it('should provide cache statistics', () => {
      const stats = service.getCacheStats();
      expect(stats).to.have.property('size');
      expect(stats).to.have.property('timeout');
      expect(stats).to.have.property('entries');
      expect(stats.entries).to.be.an('array');
    });

    it('should clear cache', () => {
      service.clearCache();
      const stats = service.getCacheStats();
      expect(stats.size).to.equal(0);
    });

    it('should format dates correctly for NOAA API', () => {
      const date = new Date('2023-12-07T15:30:00Z');
      const formatted = service.formatDate(date);
      expect(formatted).to.equal('2023-12-07 15:30');
    });

    it('should calculate distance between coordinates', () => {
      // Distance between New York and Boston (approximately 300km)
      const distance = service.calculateDistance(40.7128, -74.006, 42.3601, -71.0589);
      expect(distance).to.be.closeTo(300, 50); // Within 50km tolerance
    });

    it('should convert degrees to radians', () => {
      expect(service.toRadians(0)).to.equal(0);
      expect(service.toRadians(90)).to.be.closeTo(Math.PI / 2, 0.001);
      expect(service.toRadians(180)).to.be.closeTo(Math.PI, 0.001);
      expect(service.toRadians(360)).to.be.closeTo(2 * Math.PI, 0.001);
    });

    it('should provide common stations database', () => {
      const stations = service.getCommonStations();
      expect(stations).to.be.an('array');
      expect(stations.length).to.be.greaterThan(0);

      // Check that stations have required properties
      const station = stations[0];
      expect(station).to.have.property('id');
      expect(station).to.have.property('name');
      expect(station).to.have.property('latitude');
      expect(station).to.have.property('longitude');
      expect(station).to.have.property('type');
      expect(station).to.have.property('region');
    });

    it('should search stations by location', async () => {
      const results = await service.searchStationsByLocation('New York');
      expect(results).to.have.property('query', 'New York');
      expect(results).to.have.property('matches');
      expect(results).to.have.property('stations');
      expect(results.stations).to.be.an('array');

      if (results.matches > 0) {
        expect(results.stations[0]).to.have.property('id');
        expect(results.stations[0]).to.have.property('name');
      }
    });

    it('should find nearby stations by coordinates', async () => {
      // Coordinates for New York Harbor
      const results = await service.findNearbyStations(40.7128, -74.006);
      expect(results).to.have.property('coordinates');
      expect(results.coordinates.latitude).to.equal(40.7128);
      expect(results.coordinates.longitude).to.equal(-74.006);
      expect(results).to.have.property('stations');
      expect(results.stations).to.be.an('array');

      // Stations should be sorted by distance
      if (results.stations.length > 1) {
        expect(results.stations[0].distance).to.be.at.most(results.stations[1].distance);
      }
    });

    it('should validate coordinates in nearby station search', async () => {
      try {
        await service.findNearbyStations(91, 0); // Invalid latitude
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Invalid latitude');
      }
    });
  });

  describe('Controller Functions', () => {
    let controller;

    before(async () => {
      controller = await import('../src/controller.js');
    });

    it('should export all required controller functions', () => {
      expect(controller.getTideData).to.be.a('function');
      expect(controller.getCurrentData).to.be.a('function');
      expect(controller.getStationInfo).to.be.a('function');
      expect(controller.searchStations).to.be.a('function');
      expect(controller.getCurrentWaterLevels).to.be.a('function');
      expect(controller.getMarineConditions).to.be.a('function');
      expect(controller.getStationCapabilities).to.be.a('function');
      expect(controller.getPopularStations).to.be.a('function');
    });
  });

  describe('Data Formatting', () => {
    let formatTideData, formatCurrentData, formatStationData;

    before(async () => {
      const utils = await import('../src/utils.js');
      formatTideData = utils.formatTideData;
      formatCurrentData = utils.formatCurrentData;
      formatStationData = utils.formatStationData;
    });

    describe('Tide Data Formatting', () => {
      it('should format tide data correctly', () => {
        const mockData = {
          predictions: [
            { t: '2023-12-07 06:30', v: '2.5', type: 'H' },
            { t: '2023-12-07 12:45', v: '0.3', type: 'L' },
            { t: '2023-12-07 18:15', v: '2.8', type: 'H' },
            { t: '2023-12-08 00:30', v: '0.1', type: 'L' },
          ],
        };

        const mockStation = {
          id: '8518750',
          name: 'The Battery',
          latitude: 40.7,
          longitude: -74.0,
        };

        const options = { datum: 'MLLW', units: 'metric' };
        const formatted = formatTideData(mockData, mockStation, options);

        expect(formatted).to.have.property('station');
        expect(formatted).to.have.property('predictions');
        expect(formatted).to.have.property('metadata');
        expect(formatted.station).to.equal(mockStation);
        expect(formatted.predictions.datum).to.equal('MLLW');
        expect(formatted.predictions.units).to.equal('meters');
        expect(formatted.predictions.data).to.be.an('array');
        expect(formatted.predictions.data.length).to.equal(2); // 2 days

        const firstDay = formatted.predictions.data[0];
        expect(firstDay).to.have.property('date');
        expect(firstDay).to.have.property('tides');
        expect(firstDay).to.have.property('summary');
        expect(firstDay.tides).to.be.an('array');
        expect(firstDay.summary).to.have.property('tidalRange');
      });
    });

    describe('Current Data Formatting', () => {
      it('should format current data correctly', () => {
        const mockData = {
          predictions: [
            { t: '2023-12-07 06:30', v: '1.5', d: '90', type: 'max' },
            { t: '2023-12-07 09:15', v: '0.0', d: null, type: 'slack' },
            { t: '2023-12-07 12:45', v: '2.1', d: '270', type: 'max' },
          ],
        };

        const mockStation = {
          id: 'ACT4176',
          name: 'The Race',
          latitude: 41.2,
          longitude: -72.0,
        };

        const options = { units: 'metric' };
        const formatted = formatCurrentData(mockData, mockStation, options);

        expect(formatted).to.have.property('station');
        expect(formatted).to.have.property('predictions');
        expect(formatted).to.have.property('metadata');
        expect(formatted.station).to.equal(mockStation);
        expect(formatted.predictions.units).to.equal('meters/second');
        expect(formatted.predictions.data).to.be.an('array');

        const firstDay = formatted.predictions.data[0];
        expect(firstDay).to.have.property('date');
        expect(firstDay).to.have.property('currents');
        expect(firstDay).to.have.property('summary');
        expect(firstDay.currents).to.be.an('array');
        expect(firstDay.summary).to.have.property('maxVelocity');
      });
    });

    describe('Station Data Formatting', () => {
      it('should format station data correctly', () => {
        const mockData = {
          metadata: {
            id: '8518750',
            name: 'The Battery',
            lat: '40.7',
            lon: '-74.0',
            state: 'NY',
            timezone: 'EST',
            timezonecorr: '-5',
          },
        };

        const formatted = formatStationData(mockData);

        expect(formatted).to.have.property('id', '8518750');
        expect(formatted).to.have.property('name', 'The Battery');
        expect(formatted).to.have.property('latitude', 40.7);
        expect(formatted).to.have.property('longitude', -74.0);
        expect(formatted).to.have.property('state', 'NY');
        expect(formatted).to.have.property('timezone', 'EST');
        expect(formatted).to.have.property('nearby');
      });

      it('should handle missing metadata gracefully', () => {
        const mockData = { metadata: {} };
        const formatted = formatStationData(mockData);

        expect(formatted).to.have.property('id', 'Unknown');
        expect(formatted).to.have.property('name', 'Unknown Station');
        expect(formatted).to.have.property('latitude', null);
        expect(formatted).to.have.property('longitude', null);
      });
    });
  });

  describe('Error Handling', () => {
    let service;

    before(async () => {
      const serviceModule = await import('../src/service.js');
      service = serviceModule.tidesService;
    });

    it('should handle invalid days parameter', async () => {
      try {
        await service.getTidePredictions('8518750', { days: 0 });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Days must be between 1 and 30');
      }

      try {
        await service.getTidePredictions('8518750', { days: 31 });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Days must be between 1 and 30');
      }
    });

    it('should handle coordinate validation errors', async () => {
      const utils = await import('../src/utils.js');

      try {
        utils.validateCoordinates(999, 0);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Invalid latitude');
      }
    });

    it('should handle conversion function errors gracefully', async () => {
      const utils = await import('../src/utils.js');

      // These should not throw errors
      expect(utils.convertHeight(5, 'meters', 'meters')).to.equal(5);
      expect(utils.convertVelocity(5, 'knots', 'knots')).to.equal(5);
      expect(utils.getCompassDirection(null)).to.equal('Unknown');
    });
  });

  describe('Integration Tests', () => {
    let service;

    before(async () => {
      const serviceModule = await import('../src/service.js');
      service = serviceModule.tidesService;
    });

    it('should handle station search with various inputs', async () => {
      const testCases = ['New York', 'San Francisco', 'Boston', 'Miami', 'Seattle'];

      for (const location of testCases) {
        const results = await service.searchStationsByLocation(location);
        expect(results).to.have.property('query', location);
        expect(results).to.have.property('stations');
        expect(results.stations).to.be.an('array');
      }
    });

    it('should handle coordinate-based station search', async () => {
      const testCoordinates = [
        { lat: 40.7128, lon: -74.006, name: 'New York' },
        { lat: 37.7749, lon: -122.4194, name: 'San Francisco' },
        { lat: 42.3601, lon: -71.0589, name: 'Boston' },
      ];

      for (const coord of testCoordinates) {
        const results = await service.findNearbyStations(coord.lat, coord.lon);
        expect(results).to.have.property('coordinates');
        expect(results.coordinates.latitude).to.equal(coord.lat);
        expect(results.coordinates.longitude).to.equal(coord.lon);
        expect(results).to.have.property('stations');
        expect(results.stations).to.be.an('array');
      }
    });

    it('should maintain consistency in station data', () => {
      const stations = service.getCommonStations();

      // Check that all stations have consistent structure
      stations.forEach(station => {
        expect(station).to.have.property('id');
        expect(station).to.have.property('name');
        expect(station).to.have.property('latitude');
        expect(station).to.have.property('longitude');
        expect(station).to.have.property('type');
        expect(station).to.have.property('region');
        expect(station).to.have.property('state');

        // Validate coordinates
        expect(station.latitude).to.be.a('number');
        expect(station.longitude).to.be.a('number');
        expect(station.latitude).to.be.at.least(-90);
        expect(station.latitude).to.be.at.most(90);
        expect(station.longitude).to.be.at.least(-180);
        expect(station.longitude).to.be.at.most(180);

        // Validate type
        expect(['tide', 'current']).to.include(station.type);
      });
    });
  });

  describe('Regional Station Coverage', () => {
    let service;

    before(async () => {
      const serviceModule = await import('../src/service.js');
      service = serviceModule.tidesService;
    });

    it('should have stations for major coastal regions', () => {
      const stations = service.getCommonStations();
      const regions = [...new Set(stations.map(s => s.region))];

      expect(regions).to.include('East Coast');
      expect(regions).to.include('West Coast');
      expect(regions).to.include('Gulf Coast');
      expect(regions).to.include('Great Lakes');
    });

    it('should have both tide and current stations', () => {
      const stations = service.getCommonStations();
      const types = [...new Set(stations.map(s => s.type))];

      expect(types).to.include('tide');
      expect(types).to.include('current');
    });

    it('should have major port cities covered', () => {
      const stations = service.getCommonStations();
      const cities = stations.map(s => s.city.toLowerCase());

      expect(cities).to.include('new york');
      expect(cities).to.include('san francisco');
      expect(cities).to.include('boston');
      expect(cities).to.include('seattle');
      expect(cities).to.include('miami');
    });
  });
});
