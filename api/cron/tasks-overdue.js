// Vercel Cron Job: Overdue tasks notification (runs at 10:00 AM IST / 4:30 UTC and 6:00 PM IST / 12:30 UTC)
const { dbReady } = require('../../src/db');
const config = require('../../src/config');

module.exports = async (req, res) => {
  const authHeader = req.headers.authorization;
  if (config.cronSecret && authHeader !== `Bearer ${config.cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await dbReady;

    const { checkOverdueTasks } = require('../../src/services/taskNotifier');
    const sent = await checkOverdueTasks();

    res.json({ ok: true, sent });
  } catch (err) {
    console.error('[CRON] Tasks overdue error:', err);
    res.status(500).json({ error: err.message });
  }
};
