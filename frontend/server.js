const express = require('express');
const path = require('path');

const app = express();
const API_URL = process.env.API_URL || 'http://localhost:3000';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => res.json({ status: 'UP' }));
app.get('/ready', (req, res) => res.json({ status: 'READY' }));

// Proxy every /api/* call to the API microservice
app.use('/api', async (req, res) => {
  try {
    const upstream = await fetch(API_URL + req.originalUrl, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
    });
    const text = await upstream.text();
    res.status(upstream.status).type('application/json').send(text);
  } catch (err) {
    res.status(502).json({ error: 'api unreachable' });
  }
});

const PORT = process.env.PORT || 8080;
if (require.main === module) {
  app.listen(PORT, () => console.log(`frontend listening on ${PORT}`));
}

module.exports = app;
