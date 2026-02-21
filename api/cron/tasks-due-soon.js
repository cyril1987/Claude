// Vercel Cron Job: Tasks due soon notification (runs once daily at 12:00 PM IST / 6:30 UTC)
const { dbReady } = require('../../src/db');
const config = require('../../src/config');

module.exports = async (req, res) => {
  const authHeader = req.headers.authorization;
  if (config.cronSecret && authHeader !== `Bearer ${config.cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await dbReady;

    const { checkDueSoonTasks } = require('../../src/services/taskNotifier');
    const sent = await checkDueSoonTasks();

    res.json({ ok: true, sent });
  } catch (err) {
    console.error('[CRON] Tasks due soon error:', err);
    res.status(500).json({ error: err.message });
  }
};
