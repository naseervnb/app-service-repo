const request = require('supertest');
const app = require('../src/server');

describe('Microservice Endpoints', () => {
  test('GET / returns service status', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('running');
  });

  test('GET /health returns UP', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('UP');
  });

  test('GET /metrics exposes Prometheus metrics', async () => {
    const res = await request(app).get('/metrics');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('http_requests_total');
  });
});
