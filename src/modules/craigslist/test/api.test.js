/**
 * Craigslist Module API Tests
 * 
 * This file contains tests for the Craigslist module API functions.
 */

import { expect } from 'chai';
import { describe, it, beforeEach, afterEach } from 'mocha';
import sinon from 'sinon';
import { JSDOM } from 'jsdom';

// Import the API functions
import { searchCity, searchMultipleCities, getPostingDetails } from '../api.js';

// Mock fetch for testing
import fetch from 'node-fetch';

describe('Craigslist API', () => {
  // Sinon sandbox for managing stubs
  let sandbox;
  
  beforeEach(() => {
    // Create a new sandbox before each test
    sandbox = sinon.createSandbox();
    
    // Stub fetch to prevent actual HTTP requests
    // We need to use a different approach since we can't directly stub fetch in ES modules
    global.fetch = sandbox.stub();
  });
  
  afterEach(() => {
    // Restore all stubs after each test
    sandbox.restore();
  });
  
  describe('searchCity()', () => {
    it('should build the correct search URL with query', async () => {
      // Setup fetch to return a successful response
      const mockResponse = {
        ok: true,
        text: () => Promise.resolve('<html><body></body></html>')
      };
      global.fetch.resolves(mockResponse);
      
      // Call the function under test
      await searchCity('seattle', {
        category: 'sss',
        query: 'test query'
      });
      
      // Verify the URL
      expect(global.fetch.calledOnce).to.be.true;
      const url = global.fetch.firstCall.args[0];
      expect(url).to.include('https://seattle.craigslist.org/search/sss');
      expect(url).to.include('query=test+query');
    });
    
    it('should build the correct search URL with filters', async () => {
      // Setup fetch to return a successful response
      const mockResponse = {
        ok: true,
        text: () => Promise.resolve('<html><body></body></html>')
      };
      global.fetch.resolves(mockResponse);
      
      // Call the function under test
      await searchCity('newyork', {
        category: 'apa',
        filters: {
          min_price: 1000,
          max_price: 2000,
          bedrooms: 2,
          has_image: 1
        }
      });
      
      // Verify the URL
      expect(global.fetch.calledOnce).to.be.true;
      const url = global.fetch.firstCall.args[0];
      expect(url).to.include('https://newyork.craigslist.org/search/apa');
      expect(url).to.include('min_price=1000');
      expect(url).to.include('max_price=2000');
      expect(url).to.include('bedrooms=2');
      expect(url).to.include('has_image=1');
    });
    
    it('should parse search results correctly', async () => {
      // Create a mock HTML response with search results
      const mockHtml = `
        <html>
          <body>
            <div class="result-row" data-pid="12345">
              <time class="result-date" datetime="2025-05-12T12:00:00">May 12</time>
              <a class="result-title" href="/test/path/12345.html">Test Listing</a>
              <span class="result-price">$1000</span>
              <span class="result-hood"> (Downtown)</span>
              <a class="result-image" data-ids="1:abcdef"></a>
            </div>
            <div class="result-row" data-pid="67890">
              <time class="result-date" datetime="2025-05-12T13:00:00">May 12</time>
              <a class="result-title" href="/test/path/67890.html">Another Listing</a>
              <span class="result-price">$2000</span>
              <a class="result-image" src="https://images.craigslist.org/image.jpg"></a>
            </div>
          </body>
        </html>
      `;
      
      // Setup fetch to return the mock HTML
      const mockResponse = {
        ok: true,
        text: () => Promise.resolve(mockHtml)
      };
      global.fetch.resolves(mockResponse);
      
      // Call the function under test
      const results = await searchCity('seattle', { category: 'sss' });
      
      // Verify the results
      expect(results).to.be.an('array').with.lengthOf(2);
      
      // Check first result
      expect(results[0].id).to.equal('12345');
      expect(results[0].title).to.equal('Test Listing');
      expect(results[0].url).to.equal('/test/path/12345.html');
      expect(results[0].price).to.equal('$1000');
      expect(results[0].date).to.equal('2025-05-12T12:00:00');
      expect(results[0].location).to.equal('Downtown');
      expect(results[0].imageUrl).to.equal('https://images.craigslist.org/abcdef_300x300.jpg');
      expect(results[0].city).to.equal('seattle');
      
      // Check second result
      expect(results[1].id).to.equal('67890');
      expect(results[1].title).to.equal('Another Listing');
      expect(results[1].price).to.equal('$2000');
      expect(results[1].imageUrl).to.equal('https://images.craigslist.org/image.jpg');
    });
    
    it('should handle HTTP errors', async () => {
      // Setup fetch to return an error response
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found'
      };
      global.fetch.resolves(mockResponse);
      
      // Call the function under test
      const results = await searchCity('invalid-city', { category: 'sss' });
      
      // Verify the results
      expect(results).to.be.an('array').that.is.empty;
    });
    
    it('should handle parsing errors', async () => {
      // Setup fetch to return invalid HTML
      const mockResponse = {
        ok: true,
        text: () => Promise.resolve('<html><body><div class="invalid">Bad HTML</div></body></html>')
      };
      global.fetch.resolves(mockResponse);
      
      // Call the function under test
      const results = await searchCity('seattle', { category: 'sss' });
      
      // Verify the results
      expect(results).to.be.an('array').that.is.empty;
    });
  });
  
  describe('searchMultipleCities()', () => {
    it('should search multiple cities with limit', async () => {
      // Create a mock searchCity function
      // We need to use a different approach since we can't directly stub imported functions in ES modules
      const originalSearchCity = global.searchCity;
      global.searchCity = (city) => {
        return Promise.resolve([{ id: `${city}-123`, title: `${city} Listing` }]);
      };
      
      // Make sure to restore the original function after the test
      afterEach(() => {
        global.searchCity = originalSearchCity;
      });
      
      // Call the function under test
      const results = await searchMultipleCities(
        ['seattle', 'portland', 'sfbay', 'newyork', 'chicago'],
        { limit: 3, category: 'sss' }
      );
      
      // Verify that only the first 3 cities were searched
      expect(global.searchCity.callCount).to.equal(3);
      expect(global.searchCity.calledWith('seattle')).to.be.true;
      expect(global.searchCity.calledWith('portland')).to.be.true;
      expect(global.searchCity.calledWith('sfbay')).to.be.true;
      expect(global.searchCity.calledWith('newyork')).to.be.false;
      expect(global.searchCity.calledWith('chicago')).to.be.false;
      
      // Verify the results
      expect(results).to.be.an('array').with.lengthOf(3);
    });
    
    it('should handle errors in individual city searches', async () => {
      // Create a mock searchCity function
      const originalSearchCity = global.searchCity;
      global.searchCity = (city) => {
        if (city === 'error-city') {
          return Promise.reject(new Error('Search failed'));
        }
        return Promise.resolve([{ id: `${city}-123`, title: `${city} Listing` }]);
      };
      
      // Make sure to restore the original function after the test
      afterEach(() => {
        global.searchCity = originalSearchCity;
      });
      
      // Call the function under test
      const results = await searchMultipleCities(
        ['seattle', 'error-city', 'portland'],
        { category: 'sss' }
      );
      
      // Verify that all cities were attempted
      expect(global.searchCity.callCount).to.equal(3);
      
      // Verify the results (should only include successful searches)
      expect(results).to.be.an('array').with.lengthOf(2);
      expect(results[0].id).to.equal('seattle-123');
      expect(results[1].id).to.equal('portland-123');
    });
  });
  
  describe('getPostingDetails()', () => {
    it('should fetch and parse posting details', async () => {
      // Create a mock HTML response with posting details
      const mockHtml = `
        <html>
          <body>
            <h1 id="titletextonly">Test Posting</h1>
            <span class="price">$1500</span>
            <section id="postingbody">This is the posting description.</section>
            <time class="date timeago">2025-05-12</time>
            <div id="thumbs">
              <a class="thumb" href="#"><img src="https://images.craigslist.org/image1_50x50c.jpg"></a>
              <a class="thumb" href="#"><img src="https://images.craigslist.org/image2_50x50c.jpg"></a>
            </div>
            <div class="attrgroup">
              <span>Bedrooms: 2</span>
              <span>Bathrooms: 1</span>
              <span>Pets Allowed</span>
            </div>
            <div id="map" data-latitude="47.6062" data-longitude="-122.3321"></div>
          </body>
        </html>
      `;
      
      // Setup fetch to return the mock HTML
      const mockResponse = {
        ok: true,
        text: () => Promise.resolve(mockHtml)
      };
      global.fetch.resolves(mockResponse);
      
      // Call the function under test
      const details = await getPostingDetails('https://seattle.craigslist.org/test/123.html');
      
      // Verify the details
      expect(details).to.be.an('object');
      expect(details.title).to.equal('Test Posting');
      expect(details.price).to.equal('$1500');
      expect(details.description).to.include('This is the posting description');
      expect(details.postingDate).to.equal('2025-05-12');
      
      // Check images
      expect(details.images).to.be.an('array').with.lengthOf(2);
      expect(details.images[0]).to.equal('https://images.craigslist.org/image1_600x450.jpg');
      expect(details.images[1]).to.equal('https://images.craigslist.org/image2_600x450.jpg');
      
      // Check attributes
      expect(details.attributes).to.be.an('object');
      expect(details.attributes['Bedrooms']).to.equal('2');
      expect(details.attributes['Bathrooms']).to.equal('1');
      expect(details.attributes['Pets Allowed']).to.be.true;
      
      // Check location
      expect(details.location).to.be.an('object');
      expect(details.location.latitude).to.equal('47.6062');
      expect(details.location.longitude).to.equal('-122.3321');
      
      // Check URL
      expect(details.url).to.equal('https://seattle.craigslist.org/test/123.html');
    });
    
    it('should handle HTTP errors', async () => {
      // Setup fetch to return an error response
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found'
      };
      global.fetch.resolves(mockResponse);
      
      // Call the function under test
      const details = await getPostingDetails('https://seattle.craigslist.org/invalid/123.html');
      
      // Verify the result
      expect(details).to.be.null;
    });
    
    it('should handle parsing errors', async () => {
      // Setup fetch to return invalid HTML
      const mockResponse = {
        ok: true,
        text: () => Promise.resolve('<html><body><div class="invalid">Bad HTML</div></body></html>')
      };
      global.fetch.resolves(mockResponse);
      
      // Call the function under test
      const details = await getPostingDetails('https://seattle.craigslist.org/test/123.html');
      
      // Verify the result
      expect(details).to.be.null;
    });
  });
});