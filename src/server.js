const express = require('express');
const client = require('prom-client');

const app = express();
const register = new client.Registry();

client.collectDefaultMetrics({ register });

const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests processed',
  labelNames: ['method', 'route', 'status'],
  registers: [register]
});

app.use((req, res, next) => {
  res.on('finish', () => {
    httpRequestCounter.inc({
      method: req.method,
      route: req.path,
      status: res.statusCode
    });
  });
  next();
});

app.get('/', (req, res) => {
  res.status(200).json({ service: 'enterprise-microservice', version: '1.0.0', status: 'running' });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
}

module.exports = app;
