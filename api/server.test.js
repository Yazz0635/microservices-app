const request = require('supertest');
const app = require('./server');

describe('API service', () => {
  test('GET /health returns UP', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('UP');
  });

  test('GET /ready returns READY', async () => {
    const res = await request(app).get('/ready');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('READY');
  });

  test('GET /api/items returns a list', async () => {
    const res = await request(app).get('/api/items');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('POST /api/items creates an item', async () => {
    const res = await request(app).post('/api/items').send({ name: 'Trivy', category: 'Security' });
    expect(res.statusCode).toBe(201);
    expect(res.body.name).toBe('Trivy');
  });

  test('POST /api/items rejects missing name', async () => {
    const res = await request(app).post('/api/items').send({});
    expect(res.statusCode).toBe(400);
  });

  test('GET /api/load burns CPU briefly', async () => {
    const res = await request(app).get('/api/load?ms=20');
    expect(res.statusCode).toBe(200);
    expect(res.body.burnedMs).toBe(20);
  });

  test('GET /metrics exposes Prometheus data', async () => {
    await request(app).get('/health');
    const res = await request(app).get('/metrics');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('http_requests_total');
  });
});
