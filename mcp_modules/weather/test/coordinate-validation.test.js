import { afterEach, before, describe, it } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import { Hono } from 'hono';
import { register } from '../index.js';
import { weatherService } from '../src/service.js';

describe('Weather coordinate validation', () => {
  let app;

  before(async () => {
    app = new Hono();
    await register(app);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('rejects partially numeric REST coordinates before calling the service', async () => {
    const service = sinon.stub(weatherService, 'getCurrentWeather').resolves({});

    const response = await app.request('/weather/current/40abc/-74');

    expect(response.status).to.equal(400);
    expect(await response.json()).to.deep.equal({
      error: 'Invalid latitude or longitude parameters',
    });
    expect(service.called).to.be.false;
  });

  it('rejects out-of-range REST coordinates before calling the service', async () => {
    const service = sinon.stub(weatherService, 'getWeatherAlerts').resolves({});

    const response = await app.request('/weather/alerts/91/0');

    expect(response.status).to.equal(400);
    expect(service.called).to.be.false;
  });

  it('rejects out-of-range MCP tool coordinates before calling the service', async () => {
    const service = sinon.stub(weatherService, 'getSatelliteImage').resolves({});

    const response = await app.request('/tools/weather', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'satellite', latitude: 0, longitude: 181 }),
    });

    expect(response.status).to.equal(400);
    expect(await response.json()).to.deep.equal({
      error: 'Invalid longitude: must be a number between -180 and 180',
    });
    expect(service.called).to.be.false;
  });
});
