/**
 * Craigslist Module API Tests
 *
 * This file contains tests for the Craigslist module API functions.
 */

import { expect } from 'chai';
import { describe, it, beforeEach, afterEach } from 'mocha';
import sinon from 'sinon';
// JSDOM is used indirectly through the API module

// Import the API functions
import * as api from '../api.js';
const { searchCity, searchMultipleCities, getPostingDetails } = api;

// We'll mock fetch at the global level

describe('Craigslist API', () => {
  // Sinon sandbox for managing stubs
  let sandbox;

  beforeEach(() => {
    // Create a new sandbox before each test
    sandbox = sinon.createSandbox();

    // Stub fetch to prevent actual HTTP requests
    // We need to use a different approach since we can't directly stub fetch in ES modules
    global.fetch = sandbox.stub();
    global.fetch.resolves({
      ok: true,
      text: () => Promise.resolve('<html><body></body></html>'),
    });
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
        text: () => Promise.resolve('<html><body></body></html>'),
      };
      global.fetch.resolves(mockResponse);

      // Call the function under test
      await searchCity('seattle', {
        category: 'sss',
        query: 'test query',
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
        text: () => Promise.resolve('<html><body></body></html>'),
      };
      global.fetch.resolves(mockResponse);

      // Call the function under test
      await searchCity('newyork', {
        category: 'apa',
        filters: {
          min_price: 1000,
          max_price: 2000,
          bedrooms: 2,
          has_image: 1,
        },
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

    it('should parse search results correctly from JSON-LD data', async () => {
      // Create a mock HTML response with JSON-LD search results
      const mockHtml = `
        <html>
          <body>
            <script type="application/ld+json" id="ld_searchpage_results">
              {
                "itemListElement": [
                  {
                    "position": "0",
                    "@type": "ListItem",
                    "item": {
                      "@context": "http://schema.org",
                      "@type": "Product",
                      "name": "Test Listing",
                      "image": [
                        "https://images.craigslist.org/01414_abcdef_600x450.jpg"
                      ],
                      "offers": {
                        "availableAtOrFrom": {
                          "@type": "Place",
                          "address": {
                            "addressLocality": "Downtown",
                            "@type": "PostalAddress",
                            "addressRegion": "WA"
                          },
                          "geo": {
                            "latitude": 47.6062,
                            "@type": "GeoCoordinates",
                            "longitude": -122.3321
                          }
                        },
                        "priceCurrency": "USD",
                        "@type": "Offer",
                        "price": "1000.00"
                      },
                      "description": ""
                    }
                  },
                  {
                    "position": "1",
                    "@type": "ListItem",
                    "item": {
                      "@context": "http://schema.org",
                      "@type": "Product",
                      "name": "Another Listing",
                      "image": [
                        "https://images.craigslist.org/00j0j_image_600x450.jpg"
                      ],
                      "offers": {
                        "availableAtOrFrom": {
                          "@type": "Place",
                          "address": {
                            "addressLocality": "Capitol Hill",
                            "@type": "PostalAddress",
                            "addressRegion": "WA"
                          }
                        },
                        "priceCurrency": "USD",
                        "@type": "Offer",
                        "price": "2000.00"
                      },
                      "description": ""
                    }
                  }
                ],
                "@context": "https://schema.org",
                "@type": "ItemList"
              }
            </script>
          </body>
        </html>
      `;

      // Setup fetch to return the mock HTML
      const mockResponse = {
        ok: true,
        text: () => Promise.resolve(mockHtml),
      };
      global.fetch.resolves(mockResponse);

      // Call the function under test
      const results = await searchCity('seattle', { category: 'sss' });

      // Verify the results
      expect(results).to.be.an('array').with.lengthOf(2);

      // Check first result
      expect(results[0].id).to.equal('0');
      expect(results[0].title).to.equal('Test Listing');
      expect(results[0].price).to.equal('USD1000.00');
      expect(results[0].location).to.equal('Downtown');
      expect(results[0].imageUrl).to.equal(
        'https://images.craigslist.org/01414_abcdef_600x450.jpg'
      );
      expect(results[0].city).to.equal('seattle');

      // Check for new features in first result
      expect(results[0].images).to.be.an('array');
      expect(results[0].images[0]).to.equal(
        'https://images.craigslist.org/01414_abcdef_600x450.jpg'
      );
      expect(results[0]).to.have.property('attributes');
      expect(results[0]).to.have.property('description');

      // Check second result
      expect(results[1].id).to.equal('1');
      expect(results[1].title).to.equal('Another Listing');
      expect(results[1].price).to.equal('USD2000.00');
      expect(results[1].location).to.equal('Capitol Hill');
      expect(results[1].imageUrl).to.equal('https://images.craigslist.org/00j0j_image_600x450.jpg');
      expect(results[1].city).to.equal('seattle');

      // Check for new features in second result
      expect(results[1].images).to.be.an('array');
      expect(results[1].images[0]).to.equal(
        'https://images.craigslist.org/00j0j_image_600x450.jpg'
      );
      expect(results[1]).to.have.property('attributes');
      expect(results[1]).to.have.property('description');
    });

    it('should handle HTTP errors', async () => {
      // Setup fetch to return an error response
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
      };
      global.fetch.resolves(mockResponse);

      // Call the function under test
      const results = await searchCity('invalid-city', { category: 'sss' });

      // Verify the results
      expect(results).to.be.an('array').that.is.empty;
    });

    it('should handle parsing errors with missing JSON-LD data', async () => {
      // Setup fetch to return HTML without JSON-LD data
      const mockResponse = {
        ok: true,
        text: () =>
          Promise.resolve('<html><body><div class="invalid">No JSON-LD data</div></body></html>'),
      };
      global.fetch.resolves(mockResponse);

      // Call the function under test
      const results = await searchCity('seattle', { category: 'sss' });

      // Verify the results
      expect(results).to.be.an('array').that.is.empty;
    });

    it('should handle parsing errors with invalid JSON-LD data', async () => {
      // Setup fetch to return HTML with invalid JSON-LD data
      const mockResponse = {
        ok: true,
        text: () =>
          Promise.resolve(`
          <html>
            <body>
              <script type="application/ld+json" id="ld_searchpage_results">
                {
                  "itemListElement": "not-an-array",
                  "@context": "https://schema.org",
                  "@type": "ItemList"
                }
              </script>
            </body>
          </html>
        `),
      };
      global.fetch.resolves(mockResponse);

      // Call the function under test
      const results = await searchCity('seattle', { category: 'sss' });

      // Verify the results
      expect(results).to.be.an('array').that.is.empty;
    });
  });

  describe('searchMultipleCities()', () => {
    let searchCityStub;

    beforeEach(() => {
      // Stub the searchCity function
      searchCityStub = sandbox.stub(api, 'searchCity');
    });

    it('should search multiple cities with limit', async () => {
      // Setup the stub to return different results for each city
      searchCityStub
        .withArgs('seattle')
        .resolves([{ id: 'seattle-123', title: 'Seattle Listing' }]);
      searchCityStub
        .withArgs('portland')
        .resolves([{ id: 'portland-123', title: 'Portland Listing' }]);
      searchCityStub.withArgs('sfbay').resolves([{ id: 'sfbay-123', title: 'SF Bay Listing' }]);

      // Call the function under test
      const results = await searchMultipleCities(
        ['seattle', 'portland', 'sfbay', 'newyork', 'chicago'],
        { limit: 3, category: 'sss' }
      );

      // Verify that only the first 3 cities were searched
      expect(searchCityStub.callCount).to.equal(3);
      expect(searchCityStub.calledWith('seattle')).to.be.true;
      expect(searchCityStub.calledWith('portland')).to.be.true;
      expect(searchCityStub.calledWith('sfbay')).to.be.true;
      expect(searchCityStub.calledWith('newyork')).to.be.false;
      expect(searchCityStub.calledWith('chicago')).to.be.false;

      // Verify the results
      expect(results).to.be.an('array').with.lengthOf(3);
      expect(results[0].id).to.equal('seattle-123');
      expect(results[1].id).to.equal('portland-123');
      expect(results[2].id).to.equal('sfbay-123');
    });

    it('should handle errors in individual city searches', async () => {
      // Setup the stub to return different results for each city
      searchCityStub
        .withArgs('seattle')
        .resolves([{ id: 'seattle-123', title: 'Seattle Listing' }]);
      searchCityStub.withArgs('error-city').rejects(new Error('Search failed'));
      searchCityStub
        .withArgs('portland')
        .resolves([{ id: 'portland-123', title: 'Portland Listing' }]);

      // Call the function under test
      const results = await searchMultipleCities(['seattle', 'error-city', 'portland'], {
        category: 'sss',
      });

      // Verify that all cities were attempted
      expect(searchCityStub.callCount).to.equal(3);

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
          <head>
            <meta name="geo.position" content="47.6062;-122.3321">
            <meta name="geo.placename" content="Seattle">
            <meta name="geo.region" content="US-WA">
            <script type="application/ld+json">
              {
                "@context": "http://schema.org",
                "@type": "Product",
                "name": "Test Posting",
                "description": "This is the posting description.",
                "offers": {
                  "@type": "Offer",
                  "price": "1500",
                  "priceCurrency": "USD",
                  "itemCondition": "UsedCondition"
                }
              }
            </script>
          </head>
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
            <div class="mapAndAttrs">
              <p class="attrgroup">
                <span>Year: 2023</span>
                <span>Make: Test Brand</span>
                <span>Model: Test Model</span>
              </p>
            </div>
            <div id="map" data-latitude="47.6062" data-longitude="-122.3321"></div>
            <div class="postinginfo">Posted: 2025-05-12</div>
            <div class="postinginfo">Updated: 2025-05-13</div>
            <div class="postinginfo">Post ID: 12345678</div>
          </body>
        </html>
      `;

      // Setup fetch to return the mock HTML
      const mockResponse = {
        ok: true,
        text: () => Promise.resolve(mockHtml),
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
      expect(details.attributes['bedrooms']).to.equal('2');
      expect(details.attributes['bathrooms']).to.equal('1');
      expect(details.attributes['pets allowed']).to.be.true;

      // Check specs (alias for attributes)
      expect(details.specs).to.be.an('object');
      expect(details.specs).to.deep.equal(details.attributes);

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
        statusText: 'Not Found',
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
        text: () =>
          Promise.resolve('<html><body><div class="invalid">Bad HTML</div></body></html>'),
      };
      global.fetch.resolves(mockResponse);

      // Call the function under test
      const details = await getPostingDetails('https://seattle.craigslist.org/test/123.html');

      // Verify the result
      expect(details).to.be.null;
    });
  });
});
