// Vercel Cron Job: Run due sanity checks (runs every 5 minutes)
const { dbReady } = require('../../src/db');
const config = require('../../src/config');

module.exports = async (req, res) => {
  // Verify cron secret
  const authHeader = req.headers.authorization;
  if (config.cronSecret && authHeader !== `Bearer ${config.cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await dbReady;

    const { tick } = require('../../src/services/sanityCheckScheduler');
    await tick();

    res.json({ ok: true });
  } catch (err) {
    console.error('[CRON] Sanity check error:', err);
    res.status(500).json({ error: err.message });
  }
};
