const express = require('express');
const client = require('prom-client');

const app = express();
app.use(express.json());

// ---- Prometheus metrics ----
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequests = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

app.use((req, res, next) => {
  res.on('finish', () => {
    const route = req.route ? req.route.path : req.path;
    httpRequests.inc({ method: req.method, route, status: res.statusCode });
  });
  next();
});

// ---- In-memory data ----
const items = [
  { id: 1, name: 'Git', category: 'Source Control' },
  { id: 2, name: 'Docker', category: 'Containers' },
  { id: 3, name: 'Argo CD', category: 'GitOps' },
];

// ---- Probes (used by Kubernetes liveness/readiness) ----
app.get('/health', (req, res) => res.json({ status: 'UP' }));
app.get('/ready', (req, res) => res.json({ status: 'READY' }));

// ---- Business endpoints ----
app.get('/api/items', (req, res) => res.json(items));

app.post('/api/items', (req, res) => {
  const { name, category } = req.body || {};
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'name is required' });
  }
  const item = { id: items.length + 1, name, category: category || 'General' };
  items.push(item);
  res.status(201).json(item);
});

// CPU burner so the HPA / load test has something to scale on.
// Burns in 10ms slices and yields between them so /health and /metrics still respond.
app.get('/api/load', (req, res) => {
  const ms = Math.min(parseInt(req.query.ms, 10) || 100, 2000);
  const end = Date.now() + ms;
  let x = 0;
  const burn = () => {
    const sliceEnd = Math.min(Date.now() + 10, end);
    while (Date.now() < sliceEnd) {
      x += Math.sqrt(Math.random());
    }
    if (Date.now() < end) {
      return setImmediate(burn);
    }
    res.json({ burnedMs: ms, result: x });
  };
  burn();
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`api listening on ${PORT}`));
}

module.exports = app;
