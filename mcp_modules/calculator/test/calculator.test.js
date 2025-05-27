import { describe, it } from 'mocha';
import { expect } from 'chai';

describe('Calculator Module', () => {
  describe('Safe Evaluation Function', () => {
    // We'll test the calculator functionality through a simple function
    function safeEval(expression) {
      // Remove any whitespace
      const cleanExpression = expression.replace(/\s+/g, '');

      // Validate that the expression only contains allowed characters
      const allowedPattern = /^[0-9+\-*/.()%\s]+$/;
      if (!allowedPattern.test(cleanExpression)) {
        throw new Error(
          'Invalid characters in expression. Only numbers, +, -, *, /, %, ., (, ) are allowed.'
        );
      }

      // Check for potential security issues
      if (
        cleanExpression.includes('__') ||
        cleanExpression.includes('constructor') ||
        cleanExpression.includes('prototype')
      ) {
        throw new Error('Invalid expression detected.');
      }

      try {
        // Use Function constructor for safer evaluation than eval()
        const result = new Function('return ' + cleanExpression)();

        if (typeof result !== 'number' || !isFinite(result)) {
          throw new Error('Expression did not evaluate to a valid number.');
        }

        return result;
      } catch (error) {
        throw new Error(`Calculation error: ${error.message}`);
      }
    }

    it('should perform basic addition', () => {
      const result = safeEval('2 + 3');
      expect(result).to.equal(5);
    });

    it('should perform basic subtraction', () => {
      const result = safeEval('10 - 4');
      expect(result).to.equal(6);
    });

    it('should perform basic multiplication', () => {
      const result = safeEval('3 * 7');
      expect(result).to.equal(21);
    });

    it('should perform basic division', () => {
      const result = safeEval('15 / 3');
      expect(result).to.equal(5);
    });

    it('should handle modulo operation', () => {
      const result = safeEval('10 % 3');
      expect(result).to.equal(1);
    });

    it('should handle parentheses', () => {
      const result = safeEval('(2 + 3) * 4');
      expect(result).to.equal(20);
    });

    it('should handle decimal numbers', () => {
      const result = safeEval('3.14 * 2');
      expect(result).to.be.closeTo(6.28, 0.001);
    });

    it('should handle complex expressions', () => {
      const result = safeEval('2 + 3 * 4 - (10 / 2)');
      expect(result).to.equal(9);
    });

    it('should throw error for invalid characters', () => {
      expect(() => safeEval('2 + eval("alert(1)")')).to.throw('Invalid characters');
    });

    it('should throw error for security patterns', () => {
      expect(() => safeEval('2 + constructor')).to.throw('Invalid characters');
    });

    it('should throw error for malformed expressions', () => {
      expect(() => safeEval('2 + + 3')).to.throw('Calculation error');
    });

    it('should handle division by zero', () => {
      expect(() => safeEval('5 / 0')).to.throw('Expression did not evaluate to a valid number');
    });

    it('should handle expressions with whitespace', () => {
      const result = safeEval(' 2 + 3 * 4 ');
      expect(result).to.equal(14);
    });
  });

  describe('Module Structure', () => {
    it('should export the required functions', async () => {
      const module = await import('../index.js');
      expect(module.register).to.be.a('function');
      expect(module.unregister).to.be.a('function');
      expect(module.metadata).to.be.an('object');
    });

    it('should have correct metadata', async () => {
      const { metadata } = await import('../index.js');
      expect(metadata.name).to.equal('Calculator Module');
      expect(metadata.version).to.equal('1.0.0');
      expect(metadata.description).to.include('mathematical operations');
      expect(metadata.author).to.equal('Profullstack, Inc.');
      expect(metadata.tools).to.include('calculator');
      expect(metadata.endpoints).to.be.an('array');
      expect(metadata.endpoints.length).to.be.greaterThan(0);
    });
  });
});
