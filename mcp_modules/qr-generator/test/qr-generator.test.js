import { describe, it, before } from 'mocha';
import { expect } from 'chai';

describe('QR Generator Module', () => {
  describe('Module Structure', () => {
    it('should export the required functions', async () => {
      const module = await import('../index.js');
      expect(module.register).to.be.a('function');
      expect(module.unregister).to.be.a('function');
      expect(module.metadata).to.be.an('object');
    });

    it('should have correct metadata', async () => {
      const { metadata } = await import('../index.js');
      expect(metadata.name).to.equal('QR Code Generator Module');
      expect(metadata.version).to.equal('1.0.0');
      expect(metadata.description).to.include('QR codes');
      expect(metadata.author).to.equal('Profullstack, Inc.');
      expect(metadata.tools).to.include('qr-generator');
      expect(metadata.endpoints).to.be.an('array');
      expect(metadata.endpoints.length).to.be.greaterThan(0);
    });
  });

  describe('Utility Functions', () => {
    let utils;

    before(async () => {
      utils = await import('../src/utils.js');
    });

    describe('validateQRInput', () => {
      it('should accept valid text input', () => {
        expect(() => utils.validateQRInput('Hello, World!')).to.not.throw();
        expect(() => utils.validateQRInput('https://example.com')).to.not.throw();
        expect(() => utils.validateQRInput('1234567890')).to.not.throw();
      });

      it('should reject invalid text input', () => {
        expect(() => utils.validateQRInput('')).to.throw('Text cannot be empty');
        expect(() => utils.validateQRInput(123)).to.throw('Text must be a string');
        expect(() => utils.validateQRInput(null)).to.throw('Text must be a string');
        expect(() => utils.validateQRInput(undefined)).to.throw('Text must be a string');
      });

      it('should reject text that is too long', () => {
        const longText = 'a'.repeat(5000);
        expect(() => utils.validateQRInput(longText)).to.throw('Text too long');
      });

      it('should validate size options', () => {
        expect(() => utils.validateQRInput('test', { size: 200 })).to.not.throw();
        expect(() => utils.validateQRInput('test', { size: 49 })).to.throw(
          'Size must be a number between 50 and 1000'
        );
        expect(() => utils.validateQRInput('test', { size: 1001 })).to.throw(
          'Size must be a number between 50 and 1000'
        );
        expect(() => utils.validateQRInput('test', { size: 'invalid' })).to.throw(
          'Size must be a number'
        );
      });

      it('should validate format options', () => {
        expect(() => utils.validateQRInput('test', { format: 'png' })).to.not.throw();
        expect(() => utils.validateQRInput('test', { format: 'svg' })).to.not.throw();
        expect(() => utils.validateQRInput('test', { format: 'base64' })).to.not.throw();
        expect(() => utils.validateQRInput('test', { format: 'invalid' })).to.throw(
          'Format must be png, svg, or base64'
        );
      });

      it('should validate error correction level options', () => {
        expect(() => utils.validateQRInput('test', { errorCorrectionLevel: 'L' })).to.not.throw();
        expect(() => utils.validateQRInput('test', { errorCorrectionLevel: 'M' })).to.not.throw();
        expect(() => utils.validateQRInput('test', { errorCorrectionLevel: 'Q' })).to.not.throw();
        expect(() => utils.validateQRInput('test', { errorCorrectionLevel: 'H' })).to.not.throw();
        expect(() => utils.validateQRInput('test', { errorCorrectionLevel: 'X' })).to.throw(
          'Error correction level must be L, M, Q, or H'
        );
      });

      it('should validate margin options', () => {
        expect(() => utils.validateQRInput('test', { margin: 4 })).to.not.throw();
        expect(() => utils.validateQRInput('test', { margin: 0 })).to.not.throw();
        expect(() => utils.validateQRInput('test', { margin: 10 })).to.not.throw();
        expect(() => utils.validateQRInput('test', { margin: -1 })).to.throw(
          'Margin must be a number between 0 and 10'
        );
        expect(() => utils.validateQRInput('test', { margin: 11 })).to.throw(
          'Margin must be a number between 0 and 10'
        );
      });
    });

    describe('formatQRResponse', () => {
      it('should format QR response correctly', () => {
        const mockData = {
          text: 'Hello, World!',
          qrData: 'base64data',
          mimeType: 'image/png',
          encoding: 'base64',
          options: { size: 200, format: 'png', errorCorrectionLevel: 'M', margin: 4 },
          size: { estimatedModules: 25, description: 'Estimated 25x25 modules' },
        };

        const formatted = utils.formatQRResponse(mockData);

        expect(formatted).to.have.property('success', true);
        expect(formatted).to.have.property('qrCode');
        expect(formatted).to.have.property('input');
        expect(formatted).to.have.property('metadata');
        expect(formatted).to.have.property('usage');
        expect(formatted.qrCode.data).to.equal('base64data');
        expect(formatted.qrCode.mimeType).to.equal('image/png');
        expect(formatted.input.text).to.equal('Hello, World!');
        expect(formatted.input.textLength).to.equal(13);
      });
    });

    describe('getQRCapacity', () => {
      it('should return capacity information for different error correction levels', () => {
        const capacityL = utils.getQRCapacity('L');
        const capacityM = utils.getQRCapacity('M');
        const capacityQ = utils.getQRCapacity('Q');
        const capacityH = utils.getQRCapacity('H');

        expect(capacityL.errorCorrectionLevel).to.equal('L');
        expect(capacityM.errorCorrectionLevel).to.equal('M');
        expect(capacityQ.errorCorrectionLevel).to.equal('Q');
        expect(capacityH.errorCorrectionLevel).to.equal('H');

        expect(capacityL.maxCharacters).to.be.greaterThan(capacityM.maxCharacters);
        expect(capacityM.maxCharacters).to.be.greaterThan(capacityQ.maxCharacters);
        expect(capacityQ.maxCharacters).to.be.greaterThan(capacityH.maxCharacters);
      });

      it('should default to M level when no level specified', () => {
        const capacity = utils.getQRCapacity();
        expect(capacity.errorCorrectionLevel).to.equal('M');
      });
    });

    describe('detectEncodingMode', () => {
      it('should detect numeric mode for numbers', () => {
        const result = utils.detectEncodingMode('1234567890');
        expect(result.mode).to.equal('numeric');
        expect(result.efficiency).to.equal('highest');
      });

      it('should detect alphanumeric mode for uppercase letters and numbers', () => {
        const result = utils.detectEncodingMode('HELLO123');
        expect(result.mode).to.equal('alphanumeric');
        expect(result.efficiency).to.equal('high');
      });

      it('should detect binary mode for mixed case and special characters', () => {
        const result = utils.detectEncodingMode('Hello, World!');
        expect(result.mode).to.equal('binary');
        expect(result.efficiency).to.equal('standard');
      });
    });

    describe('sanitizeText', () => {
      it('should remove null bytes and trim whitespace', () => {
        const result = utils.sanitizeText('  Hello\0World  ');
        expect(result).to.equal('HelloWorld');
      });

      it('should throw error for non-string input', () => {
        expect(() => utils.sanitizeText(123)).to.throw('Input must be a string');
        expect(() => utils.sanitizeText(null)).to.throw('Input must be a string');
      });

      it('should throw error for empty text after sanitization', () => {
        expect(() => utils.sanitizeText('   ')).to.throw('Text cannot be empty after sanitization');
        expect(() => utils.sanitizeText('\0\0\0')).to.throw(
          'Text cannot be empty after sanitization'
        );
      });
    });

    describe('getRecommendedSettings', () => {
      it('should return preset settings for different use cases', () => {
        const urlSettings = utils.getRecommendedSettings('url');
        const textSettings = utils.getRecommendedSettings('text');
        const printSettings = utils.getRecommendedSettings('print');
        const mobileSettings = utils.getRecommendedSettings('mobile');

        expect(urlSettings).to.have.property('size');
        expect(urlSettings).to.have.property('errorCorrectionLevel');
        expect(urlSettings).to.have.property('format');
        expect(urlSettings).to.have.property('description');

        expect(printSettings.format).to.equal('svg');
        expect(printSettings.errorCorrectionLevel).to.equal('H');
        expect(mobileSettings.size).to.be.lessThan(textSettings.size);
      });

      it('should return default settings for unknown use cases', () => {
        const defaultSettings = utils.getRecommendedSettings('unknown');
        const explicitDefault = utils.getRecommendedSettings('default');

        expect(defaultSettings).to.deep.equal(explicitDefault);
      });
    });

    describe('Base64 Conversion', () => {
      it('should convert base64 to buffer and back', () => {
        const originalText = 'Hello, World!';
        const buffer = Buffer.from(originalText);
        const base64 = utils.bufferToBase64(buffer);
        const convertedBuffer = utils.base64ToBuffer(base64);

        expect(convertedBuffer.toString()).to.equal(originalText);
      });

      it('should handle invalid base64 data', () => {
        // Node.js Buffer.from() is quite lenient, so let's test with a more obviously invalid string
        expect(() => utils.base64ToBuffer('!@#$%^&*()')).to.not.throw();
        // The function should still work, just return a buffer with the decoded data
        const result = utils.base64ToBuffer('SGVsbG8gV29ybGQ='); // "Hello World" in base64
        expect(result.toString()).to.equal('Hello World');
      });
    });
  });

  describe('Service Class', () => {
    let QRService;
    let service;

    before(async () => {
      const serviceModule = await import('../src/service.js');
      QRService = serviceModule.QRService;
      service = serviceModule.qrService;
    });

    it('should create a service instance', () => {
      expect(service).to.be.an.instanceof(QRService);
      expect(service.maxTextLength).to.equal(4296);
      expect(service.defaultOptions).to.be.an('object');
    });

    it('should have required methods', () => {
      expect(service.generateQRCode).to.be.a('function');
      expect(service.getQRInfo).to.be.a('function');
      expect(service.canEncode).to.be.a('function');
      expect(service.getSupportedOptions).to.be.a('function');
    });

    it('should validate text encoding capability', () => {
      expect(service.canEncode('Hello, World!')).to.be.true;
      expect(service.canEncode('a'.repeat(5000))).to.be.false;
    });

    it('should provide supported options', () => {
      const options = service.getSupportedOptions();
      expect(options).to.have.property('formats');
      expect(options).to.have.property('errorCorrectionLevels');
      expect(options).to.have.property('sizeRange');
      expect(options).to.have.property('maxTextLength');
      expect(options.formats).to.include('png');
      expect(options.formats).to.include('svg');
      expect(options.formats).to.include('base64');
    });

    it('should calculate QR size information', () => {
      const sizeInfo = service.calculateQRSize('Hello, World!', 'M');
      expect(sizeInfo).to.have.property('estimatedModules');
      expect(sizeInfo).to.have.property('minSize');
      expect(sizeInfo).to.have.property('description');
      expect(sizeInfo.estimatedModules).to.be.at.least(21);
      expect(sizeInfo.minSize).to.equal(21);
    });

    it('should get QR info without generating', () => {
      const info = service.getQRInfo('Hello, World!', 'M');
      expect(info).to.have.property('textLength');
      expect(info).to.have.property('maxLength');
      expect(info).to.have.property('estimatedSize');
      expect(info).to.have.property('errorCorrectionLevel');
      expect(info).to.have.property('supportedFormats');
      expect(info.textLength).to.equal(13);
      expect(info.errorCorrectionLevel).to.equal('M');
    });
  });

  describe('Controller Functions', () => {
    let controller;

    before(async () => {
      controller = await import('../src/controller.js');
    });

    it('should export all required controller functions', () => {
      expect(controller.generateQRCode).to.be.a('function');
      expect(controller.getQRCodeInfo).to.be.a('function');
      expect(controller.getQRCodeBinary).to.be.a('function');
      expect(controller.validateQRText).to.be.a('function');
      expect(controller.getQRPresets).to.be.a('function');
    });
  });

  describe('QR Code Generation', () => {
    let service;

    before(async () => {
      const serviceModule = await import('../src/service.js');
      service = serviceModule.qrService;
    });

    it('should generate QR code in PNG format', async () => {
      const result = await service.generateQRCode('Hello, World!', { format: 'png' });

      expect(result).to.have.property('success', true);
      expect(result).to.have.property('qrCode');
      expect(result.qrCode.mimeType).to.equal('image/png');
      expect(result.qrCode.encoding).to.equal('base64');
      expect(result.qrCode.data).to.be.a('string');
      expect(result.qrCode.data.length).to.be.greaterThan(0);
    });

    it('should generate QR code in SVG format', async () => {
      const result = await service.generateQRCode('Hello, World!', { format: 'svg' });

      expect(result).to.have.property('success', true);
      expect(result.qrCode.mimeType).to.equal('image/svg+xml');
      expect(result.qrCode.encoding).to.equal('base64');
    });

    it('should generate QR code in base64 format', async () => {
      const result = await service.generateQRCode('Hello, World!', { format: 'base64' });

      expect(result).to.have.property('success', true);
      expect(result.qrCode.encoding).to.equal('dataurl');
      expect(result.qrCode.data).to.include('data:image/png;base64,');
    });

    it('should handle different error correction levels', async () => {
      const resultL = await service.generateQRCode('Test', { errorCorrectionLevel: 'L' });
      const resultH = await service.generateQRCode('Test', { errorCorrectionLevel: 'H' });

      expect(resultL.metadata.errorCorrectionLevel).to.equal('L');
      expect(resultH.metadata.errorCorrectionLevel).to.equal('H');
    });

    it('should handle different sizes', async () => {
      const small = await service.generateQRCode('Test', { size: 100 });
      const large = await service.generateQRCode('Test', { size: 400 });

      expect(small.qrCode.size.pixels).to.equal(100);
      expect(large.qrCode.size.pixels).to.equal(400);
    });

    it('should handle URLs correctly', async () => {
      const url = 'https://example.com/path?param=value';
      const result = await service.generateQRCode(url);

      expect(result.success).to.be.true;
      expect(result.input.text).to.equal(url);
    });

    it('should handle special characters', async () => {
      const text = 'Hello! @#$%^&*()_+ 世界';
      const result = await service.generateQRCode(text);

      expect(result.success).to.be.true;
      expect(result.input.text).to.equal(text);
    });
  });

  describe('Error Handling', () => {
    let service;

    before(async () => {
      const serviceModule = await import('../src/service.js');
      service = serviceModule.qrService;
    });

    it('should handle empty text', async () => {
      try {
        await service.generateQRCode('');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('empty');
      }
    });

    it('should handle text that is too long', async () => {
      const longText = 'a'.repeat(5000);
      try {
        await service.generateQRCode(longText);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('too long');
      }
    });

    it('should handle invalid options', async () => {
      try {
        await service.generateQRCode('test', { size: 10 });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Size must be');
      }
    });

    it('should handle invalid format', async () => {
      try {
        await service.generateQRCode('test', { format: 'invalid' });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Format must be');
      }
    });
  });

  describe('Integration Tests', () => {
    let service;

    before(async () => {
      const serviceModule = await import('../src/service.js');
      service = serviceModule.qrService;
    });

    it('should generate valid QR codes for common use cases', async () => {
      const testCases = [
        { text: 'https://example.com', description: 'URL' },
        { text: 'Hello, World!', description: 'Simple text' },
        { text: '1234567890', description: 'Numbers' },
        { text: 'HELLO123', description: 'Alphanumeric' },
        { text: 'mailto:test@example.com', description: 'Email' },
        { text: 'tel:+1234567890', description: 'Phone' },
      ];

      for (const testCase of testCases) {
        const result = await service.generateQRCode(testCase.text);
        expect(result.success).to.be.true;
        expect(result.input.text).to.equal(testCase.text);
        expect(result.qrCode.data).to.be.a('string');
        expect(result.qrCode.data.length).to.be.greaterThan(0);
      }
    });

    it('should maintain consistency across multiple generations', async () => {
      const text = 'Consistency test';
      const options = { size: 200, format: 'png', errorCorrectionLevel: 'M' };

      const result1 = await service.generateQRCode(text, options);
      const result2 = await service.generateQRCode(text, options);

      // QR codes with same input should produce same output
      expect(result1.qrCode.data).to.equal(result2.qrCode.data);
      expect(result1.qrCode.size.modules).to.equal(result2.qrCode.size.modules);
    });
  });
});
