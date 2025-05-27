import { describe, it, before } from 'mocha';
import { expect } from 'chai';

describe('Weather Module', () => {
  describe('Module Structure', () => {
    it('should export the required functions', async () => {
      const module = await import('../index.js');
      expect(module.register).to.be.a('function');
      expect(module.unregister).to.be.a('function');
      expect(module.metadata).to.be.an('object');
    });

    it('should have correct metadata', async () => {
      const { metadata } = await import('../index.js');
      expect(metadata.name).to.equal('Weather Module');
      expect(metadata.version).to.equal('1.0.0');
      expect(metadata.description).to.include('Weather data');
      expect(metadata.author).to.equal('Profullstack, Inc.');
      expect(metadata.tools).to.include('weather');
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

    describe('Temperature Conversion', () => {
      it('should convert Celsius to Fahrenheit correctly', () => {
        expect(utils.celsiusToFahrenheit(0)).to.equal(32);
        expect(utils.celsiusToFahrenheit(100)).to.equal(212);
        expect(utils.celsiusToFahrenheit(20)).to.equal(68);
        expect(utils.celsiusToFahrenheit(-10)).to.equal(14);
      });

      it('should handle null and undefined values', () => {
        expect(utils.celsiusToFahrenheit(null)).to.be.null;
        expect(utils.celsiusToFahrenheit(undefined)).to.be.null;
      });
    });

    describe('Speed Conversion', () => {
      it('should convert meters per second to miles per hour', () => {
        expect(utils.mpsToMph(10)).to.equal(22); // 10 m/s ≈ 22.37 mph
        expect(utils.mpsToMph(0)).to.equal(0);
        expect(utils.mpsToMph(5)).to.equal(11); // 5 m/s ≈ 11.18 mph
      });

      it('should handle null and undefined values', () => {
        expect(utils.mpsToMph(null)).to.be.null;
        expect(utils.mpsToMph(undefined)).to.be.null;
      });
    });

    describe('Distance Conversion', () => {
      it('should convert meters to miles', () => {
        expect(utils.metersToMiles(1609)).to.equal(1); // 1609 meters ≈ 1 mile
        expect(utils.metersToMiles(0)).to.equal(0);
        expect(utils.metersToMiles(3218)).to.equal(2); // ~2 miles
      });

      it('should handle null and undefined values', () => {
        expect(utils.metersToMiles(null)).to.be.null;
        expect(utils.metersToMiles(undefined)).to.be.null;
      });
    });

    describe('Pressure Conversion', () => {
      it('should convert pascals to inches of mercury', () => {
        expect(utils.pascalsToInHg(101325)).to.equal(29.92); // Standard atmospheric pressure
        expect(utils.pascalsToInHg(0)).to.equal(0);
      });

      it('should handle null and undefined values', () => {
        expect(utils.pascalsToInHg(null)).to.be.null;
        expect(utils.pascalsToInHg(undefined)).to.be.null;
      });
    });

    describe('Weather Emoji', () => {
      it('should return appropriate emojis for weather conditions', () => {
        expect(utils.getWeatherEmoji('sunny', true)).to.equal('☀️');
        expect(utils.getWeatherEmoji('clear', false)).to.equal('🌙');
        expect(utils.getWeatherEmoji('partly cloudy', true)).to.equal('⛅');
        expect(utils.getWeatherEmoji('cloudy')).to.equal('☁️');
        expect(utils.getWeatherEmoji('rain')).to.equal('🌧️');
        expect(utils.getWeatherEmoji('thunderstorm')).to.equal('⛈️');
        expect(utils.getWeatherEmoji('snow')).to.equal('❄️');
        expect(utils.getWeatherEmoji('fog')).to.equal('🌫️');
        expect(utils.getWeatherEmoji('wind')).to.equal('💨');
      });

      it('should return default emoji for unknown conditions', () => {
        expect(utils.getWeatherEmoji('unknown')).to.equal('🌡️');
        expect(utils.getWeatherEmoji('')).to.equal('🌡️');
        expect(utils.getWeatherEmoji(null)).to.equal('🌡️');
      });
    });

    describe('Image URL Building', () => {
      it('should build correct radar URLs', () => {
        const url = utils.buildImageUrl.radar('KOKX', 'N0R');
        expect(url).to.equal('https://radar.weather.gov/ridge/standard/N0R_KOKX_0.gif');
      });

      it('should build correct satellite URLs', () => {
        const url = utils.buildImageUrl.satellite('GOES16', 'GEOCOLOR');
        expect(url).to.equal(
          'https://cdn.star.nesdis.noaa.gov/GOES16/ABI/CONUS/GEOCOLOR/GOES16-CONUS-GEOCOLOR-600x600.gif'
        );
      });
    });

    describe('Timestamp Formatting', () => {
      it('should format valid timestamps', () => {
        const timestamp = '2023-12-07T15:30:00Z';
        const formatted = utils.formatTimestamp(timestamp);
        expect(formatted).to.be.a('string');
        expect(formatted).to.not.equal('Unknown');
      });

      it('should handle invalid timestamps', () => {
        expect(utils.formatTimestamp('invalid')).to.equal('Invalid Date');
        expect(utils.formatTimestamp(null)).to.equal('Unknown');
        expect(utils.formatTimestamp(undefined)).to.equal('Unknown');
      });
    });
  });

  describe('Service Class', () => {
    let WeatherService;
    let service;

    before(async () => {
      const serviceModule = await import('../src/service.js');
      WeatherService = serviceModule.WeatherService;
      service = serviceModule.weatherService;
    });

    it('should create a service instance', () => {
      expect(service).to.be.an.instanceof(WeatherService);
      expect(service.baseUrl).to.equal('https://api.weather.gov');
      expect(service.userAgent).to.include('MCP-Weather-Module');
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
  });

  describe('Data Formatting', () => {
    let formatWeatherData;

    before(async () => {
      const utils = await import('../src/utils.js');
      formatWeatherData = utils.formatWeatherData;
    });

    describe('Current Weather Formatting', () => {
      it('should format current weather data correctly', () => {
        const mockData = {
          timestamp: '2023-12-07T15:30:00Z',
          temperature: { value: 20, unitCode: 'wmoUnit:degC' },
          windSpeed: { value: 5, unitCode: 'wmoUnit:m_s-1' },
          relativeHumidity: { value: 65, unitCode: 'wmoUnit:percent' },
        };

        const mockLocation = {
          latitude: 40.7128,
          longitude: -74.006,
          city: 'New York',
          state: 'NY',
        };

        const formatted = formatWeatherData.current(mockData, mockLocation);

        expect(formatted).to.have.property('location');
        expect(formatted).to.have.property('current');
        expect(formatted.location).to.deep.equal(mockLocation);
        expect(formatted.current.temperature.fahrenheit).to.equal(68);
        expect(formatted.current.windSpeed.mph).to.equal(11);
      });
    });

    describe('Forecast Formatting', () => {
      it('should format forecast data correctly', () => {
        const mockData = {
          updated: '2023-12-07T15:30:00Z',
          periods: [
            {
              number: 1,
              name: 'Today',
              temperature: 68,
              temperatureUnit: 'F',
              shortForecast: 'Sunny',
            },
            {
              number: 2,
              name: 'Tonight',
              temperature: 45,
              temperatureUnit: 'F',
              shortForecast: 'Clear',
            },
          ],
        };

        const mockLocation = {
          latitude: 40.7128,
          longitude: -74.006,
          city: 'New York',
          state: 'NY',
        };

        const formatted = formatWeatherData.forecast(mockData, mockLocation, 1);

        expect(formatted).to.have.property('location');
        expect(formatted).to.have.property('forecast');
        expect(formatted.forecast.periods).to.be.an('array');
        expect(formatted.forecast.periods).to.have.length(2);
        expect(formatted.forecast.periods[0].name).to.equal('Today');
      });
    });

    describe('Alerts Formatting', () => {
      it('should format alerts data correctly', () => {
        const mockAlerts = [
          {
            id: 'alert1',
            properties: {
              event: 'Winter Storm Warning',
              headline: 'Winter Storm Warning issued',
              severity: 'Moderate',
              certainty: 'Likely',
            },
          },
        ];

        const mockLocation = {
          latitude: 40.7128,
          longitude: -74.006,
        };

        const formatted = formatWeatherData.alerts(mockAlerts, mockLocation);

        expect(formatted).to.have.property('location');
        expect(formatted).to.have.property('alerts');
        expect(formatted.alerts.count).to.equal(1);
        expect(formatted.alerts.active).to.be.an('array');
        expect(formatted.alerts.active[0].type).to.equal('Winter Storm Warning');
      });
    });
  });

  describe('Controller Functions', () => {
    let controller;

    before(async () => {
      controller = await import('../src/controller.js');
    });

    it('should export all required controller functions', () => {
      expect(controller.getCurrentWeather).to.be.a('function');
      expect(controller.getForecast).to.be.a('function');
      expect(controller.getWeatherAlerts).to.be.a('function');
      expect(controller.getRadarImage).to.be.a('function');
      expect(controller.getSatelliteImage).to.be.a('function');
    });
  });

  describe('Error Handling', () => {
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
      expect(utils.celsiusToFahrenheit(null)).to.be.null;
      expect(utils.mpsToMph(undefined)).to.be.null;
      expect(utils.formatTimestamp('')).to.equal('Unknown');
    });
  });
});
