const express = require('express');
const path = require('path');
const config = require('./src/config');
const scheduler = require('./src/services/scheduler');
const monitorsRouter = require('./src/routes/monitors');
const checksRouter = require('./src/routes/checks');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/monitors', monitorsRouter);
app.use('/api', checksRouter);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(config.port, () => {
  console.log(`URL Monitor running on http://localhost:${config.port}`);
  scheduler.start();
});

process.on('SIGTERM', () => {
  scheduler.stop();
  server.close();
});

process.on('SIGINT', () => {
  scheduler.stop();
  server.close();
});
