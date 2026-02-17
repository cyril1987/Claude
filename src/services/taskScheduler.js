const db = require('../db');

const getTemplatesDue = db.prepare(`
  SELECT t.*, u.email AS assigned_to_email, u.name AS assigned_to_name
  FROM tasks t
  LEFT JOIN users u ON t.assigned_to = u.id
  WHERE t.is_recurring_template = 1
  AND t.recurrence_next_at IS NOT NULL
  AND t.recurrence_next_at <= datetime('now')
`);

const checkDuplicate = db.prepare(`
  SELECT id FROM tasks
  WHERE recurring_template_id = ?
  AND due_date = ?
  AND is_recurring_template = 0
`);

const insertInstance = db.prepare(`
  INSERT INTO tasks (title, description, source, priority, status, due_date,
    assigned_to, created_by, category_id, recurring_template_id, is_recurring_template)
  VALUES (?, ?, 'recurring', ?, 'todo', ?, ?, ?, ?, ?, 0)
`);

const insertSystemComment = db.prepare(`
  INSERT INTO task_comments (task_id, user_id, body, is_system) VALUES (?, ?, ?, 1)
`);

const updateNextAt = db.prepare(`
  UPDATE tasks SET recurrence_next_at = ?, updated_at = datetime('now') WHERE id = ?
`);

function computeNextOccurrence(pattern, currentDateStr) {
  const d = new Date(currentDateStr);
  const interval = pattern.interval || 1;

  switch (pattern.type) {
    case 'daily':
      d.setDate(d.getDate() + interval);
      break;
    case 'weekly':
      d.setDate(d.getDate() + (7 * interval));
      break;
    case 'monthly':
      d.setMonth(d.getMonth() + interval);
      if (pattern.dayOfMonth) {
        const maxDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        d.setDate(Math.min(pattern.dayOfMonth, maxDay));
      }
      break;
    case 'yearly':
      d.setFullYear(d.getFullYear() + interval);
      if (pattern.month) d.setMonth(pattern.month - 1);
      if (pattern.dayOfMonth) {
        const maxDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        d.setDate(Math.min(pattern.dayOfMonth, maxDay));
      }
      break;
  }
  // Format as SQLite-compatible datetime (YYYY-MM-DD HH:MM:SS)
  return d.toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');
}

function tick() {
  const templates = getTemplatesDue.all();
  if (templates.length === 0) return;

  console.log(`[TASKS] Processing ${templates.length} recurring template(s)`);

  const createInstances = db.transaction((templates) => {
    for (const tmpl of templates) {
      const pattern = JSON.parse(tmpl.recurrence_pattern);
      const dueDate = tmpl.recurrence_next_at.split(' ')[0]; // YYYY-MM-DD

      // Duplicate check
      const existing = checkDuplicate.get(tmpl.id, dueDate);
      if (!existing) {
        const result = insertInstance.run(
          tmpl.title,
          tmpl.description || '',
          tmpl.priority,
          dueDate,
          tmpl.assigned_to,
          tmpl.created_by,
          tmpl.category_id,
          tmpl.id
        );
        console.log(`[TASKS] Created recurring instance: "${tmpl.title}" due ${dueDate}`);

        // Add system comment to the new instance
        insertSystemComment.run(
          result.lastInsertRowid,
          tmpl.created_by,
          `Auto-created from recurring template`
        );
      }

      // Compute next occurrence
      const nextAt = computeNextOccurrence(pattern, tmpl.recurrence_next_at);

      // Check if past end date
      if (tmpl.recurrence_end_at && nextAt > tmpl.recurrence_end_at) {
        updateNextAt.run(null, tmpl.id); // stop recurrence
        console.log(`[TASKS] Recurring template "${tmpl.title}" reached end date — stopped`);
      } else {
        updateNextAt.run(nextAt, tmpl.id);
      }
    }
  });

  createInstances(templates);
}

module.exports = { tick };
