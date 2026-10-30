const request = require('supertest');
const app = require('./server');

describe('Frontend service', () => {
  test('GET /health returns UP', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('UP');
  });

  test('GET / serves the UI', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('GitOps');
  });

  test('proxy returns 502 when API is unreachable', async () => {
    const res = await request(app).get('/api/items');
    expect(res.statusCode).toBe(502);
  });
});
