require('dotenv').config();
const express = require('express');
const trendsRouter = require('./routes/trends');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'fashion-trends-api' });
});

app.use('/api/trends', trendsRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`Fashion Trends API listening on port ${PORT}`);
  console.log(`  GET /api/trends - Trending fashion (Google Trends + Unsplash)`);
  console.log(`  GET /health     - Health check`);
});

module.exports = app;
