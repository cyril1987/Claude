/* global API, escapeHtml, currentUser */

const TaskDetail = {
  async render(container, id) {
    container.innerHTML = '<div class="loading" style="text-align:center;padding:3rem;color:var(--color-text-secondary)">Loading task...</div>';

    try {
      const [task, comments] = await Promise.all([
        API.get(`/tasks/${id}`),
        API.get(`/tasks/${id}/comments`),
      ]);

      let subtasks = [];
      if (task.subtaskCount > 0) {
        const result = await API.get(`/tasks/all?parentTaskId=${id}`);
        subtasks = result.tasks || [];
      }

      TaskDetail.renderContent(container, task, comments, subtasks);
    } catch (err) {
      container.innerHTML = `<div class="empty-state" style="text-align:center;padding:3rem"><h2>Error</h2><p>${escapeHtml(err.message)}</p></div>`;
    }
  },

  renderContent(container, task, comments, subtasks) {
    const priorityColors = { urgent: 'var(--color-down)', high: '#f59e0b', medium: 'var(--color-primary)', low: 'var(--color-unknown)' };
    const today = new Date().toISOString().split('T')[0];
    const isOverdue = task.dueDate && task.status !== 'done' && task.status !== 'cancelled' && task.dueDate < today;
    const statusLabel = task.status.replace('_', ' ');

    container.innerHTML = `
      <!-- Header -->
      <div class="detail-header">
        <div class="detail-info">
          <h2>
            <span class="status-dot ${task.status === 'done' ? 'up' : task.status === 'cancelled' ? 'down' : task.status === 'in_progress' ? 'up' : ''}"></span>
            ${escapeHtml(task.title)}
          </h2>
          <div class="detail-url" style="font-size:0.82rem;color:var(--color-text-secondary)">
            ${task.recurringTemplateId ? '<span class="task-recurring-badge">recurring instance</span>' : ''}
            ${task.isRecurringTemplate ? '<span class="task-recurring-badge">recurring template</span>' : ''}
            ${task.source !== 'manual' ? `<span class="task-source-badge" style="margin-left:0.3rem">${escapeHtml(task.source)}</span>` : ''}
            ${task.sourceRef ? `<span style="color:var(--color-text-tertiary);margin-left:0.3rem">Ref: ${escapeHtml(task.sourceRef)}</span>` : ''}
          </div>
        </div>
        <div class="detail-actions">
          <a href="#/tasks/${task.id}/edit" class="btn btn-secondary btn-sm">Edit</a>
          <button class="btn btn-danger btn-sm" id="delete-task-btn">Delete</button>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="stats-grid" style="grid-template-columns: repeat(6, 1fr)">
        <div class="stat-card">
          <div class="stat-label">Status</div>
          <div class="stat-value"><span class="task-status-badge task-status-${task.status}">${escapeHtml(statusLabel)}</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Priority</div>
          <div class="stat-value" style="display:flex;align-items:center;gap:0.4rem;justify-content:center">
            <span class="task-priority-dot" style="background:${priorityColors[task.priority]}"></span>
            <span style="color:${priorityColors[task.priority]};text-transform:capitalize">${task.priority}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Due Date</div>
          <div class="stat-value ${isOverdue ? 'task-overdue-date' : ''}" style="font-size:0.92rem">
            ${task.dueDate || '<span style="color:var(--color-text-tertiary)">None</span>'}
            ${isOverdue ? '<div style="font-size:0.68rem;color:var(--color-down);margin-top:0.2rem">OVERDUE</div>' : ''}
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Assigned To</div>
          <div class="stat-value" style="font-size:0.85rem;display:flex;align-items:center;gap:0.35rem;justify-content:center">
            ${task.assignedToAvatar ? `<img class="task-avatar" src="${escapeHtml(task.assignedToAvatar)}" alt="" referrerpolicy="no-referrer">` : ''}
            ${task.assignedToName ? escapeHtml(task.assignedToName) : '<span style="color:var(--color-text-tertiary)">Unassigned</span>'}
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Category</div>
          <div class="stat-value">
            ${task.categoryName
              ? `<span class="task-category-badge" style="background:${task.categoryColor}20;color:${task.categoryColor}">${escapeHtml(task.categoryName)}</span>`
              : '<span style="color:var(--color-text-tertiary)">None</span>'}
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Source</div>
          <div class="stat-value"><span class="task-source-badge">${escapeHtml(task.source)}</span></div>
        </div>
      </div>

      <!-- Status Transition -->
      ${!task.isRecurringTemplate ? `
      <div class="chart-container" style="margin-top:1.25rem">
        <h3 style="font-size:0.88rem;font-weight:600;margin-bottom:0.75rem;color:var(--color-text-secondary)">Transition Status</h3>
        <div class="task-transitions">
          ${TaskDetail.renderTransitionButtons(task)}
        </div>
      </div>
      ` : ''}

      <!-- Description -->
      ${task.description ? `
      <div class="chart-container" style="margin-top:1.25rem">
        <h3 style="font-size:0.88rem;font-weight:600;margin-bottom:0.75rem;color:var(--color-text-secondary)">Description</h3>
        <div style="color:var(--color-text);line-height:1.65;white-space:pre-wrap;font-size:0.88rem">${escapeHtml(task.description)}</div>
      </div>
      ` : ''}

      <!-- Subtasks -->
      ${subtasks.length > 0 || !task.isRecurringTemplate ? `
      <div class="chart-container" style="margin-top:1.25rem">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem">
          <h3 style="font-size:0.88rem;font-weight:600;color:var(--color-text-secondary)">Subtasks (${subtasks.length})</h3>
          <a href="#/tasks/new?parent=${task.id}" class="btn btn-secondary btn-sm" style="font-size:0.72rem">+ Add Subtask</a>
        </div>
        ${subtasks.length > 0 ? `
          <div style="overflow-x:auto">
            <table class="checks-table" style="margin:0">
              <thead>
                <tr>
                  <th style="width:90px">Status</th>
                  <th>Title</th>
                  <th style="width:90px">Priority</th>
                  <th style="width:100px">Due Date</th>
                </tr>
              </thead>
              <tbody>
                ${subtasks.map(st => {
                  const stOverdue = st.dueDate && st.status !== 'done' && st.status !== 'cancelled' && st.dueDate < today;
                  return `
                    <tr class="task-row" style="cursor:pointer" onclick="location.hash='#/tasks/${st.id}'">
                      <td><span class="task-status-badge task-status-${st.status}">${st.status.replace('_', ' ')}</span></td>
                      <td>${escapeHtml(st.title)}</td>
                      <td><span class="task-priority-dot" style="background:${priorityColors[st.priority]}" title="${st.priority}"></span> ${st.priority}</td>
                      <td class="${stOverdue ? 'task-overdue-date' : ''}">${st.dueDate || '--'}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        ` : '<p style="color:var(--color-text-tertiary);font-size:0.82rem">No subtasks yet.</p>'}
      </div>
      ` : ''}

      <!-- Comments Section -->
      <div class="task-comments-section">
        <h3>Activity & Comments (${comments.length})</h3>
        ${comments.length > 0 ? comments.map(c => `
          <div class="task-comment">
            <div class="task-comment-header">
              ${c.userAvatar ? `<img class="task-avatar" src="${escapeHtml(c.userAvatar)}" alt="" referrerpolicy="no-referrer">` : ''}
              <span class="task-comment-author">${escapeHtml(c.userName || 'Unknown')}</span>
              <span class="task-comment-time">${TaskDetail.formatTime(c.createdAt)}</span>
              ${!c.isSystem && c.userId === currentUser?.id ? `<button class="btn btn-danger btn-sm" style="margin-left:auto;font-size:0.65rem;padding:0.1rem 0.4rem" onclick="TaskDetail.deleteComment(${task.id}, ${c.id})">Delete</button>` : ''}
            </div>
            <div class="task-comment-body ${c.isSystem ? 'task-comment-system' : ''}">
              ${escapeHtml(c.body)}
            </div>
          </div>
        `).join('') : '<div class="task-comment" style="color:var(--color-text-tertiary)">No comments yet.</div>'}

        <div class="task-comment-input-wrapper">
          <textarea id="comment-input" placeholder="Add a comment..." rows="2"></textarea>
          <button class="btn btn-primary btn-sm" id="add-comment-btn" style="align-self:flex-end">Post</button>
        </div>
      </div>

      <!-- Metadata Footer -->
      <div class="detail-meta" style="margin-top:1.25rem">
        <span>Created by <strong>${escapeHtml(task.createdByName || 'Unknown')}</strong></span>
        <span>Created ${TaskDetail.formatTime(task.createdAt)}</span>
        <span>Updated ${TaskDetail.formatTime(task.updatedAt)}</span>
        ${task.recurringTemplateId ? `<span><a href="#/tasks/${task.recurringTemplateId}" style="color:var(--color-primary)">View recurring template</a></span>` : ''}
      </div>
    `;

    // Attach event listeners
    document.getElementById('delete-task-btn').addEventListener('click', () => TaskDetail.remove(task.id));
    document.getElementById('add-comment-btn').addEventListener('click', () => TaskDetail.addComment(task.id));

    // Enter key for comment
    document.getElementById('comment-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        TaskDetail.addComment(task.id);
      }
    });

    // Transition buttons
    container.querySelectorAll('[data-transition]').forEach(btn => {
      btn.addEventListener('click', () => TaskDetail.transition(task.id, btn.dataset.transition));
    });
  },

  renderTransitionButtons(task) {
    const transitions = {
      'todo': [
        { status: 'in_progress', label: 'Start Progress', cls: 'btn-primary' },
        { status: 'cancelled', label: 'Cancel', cls: 'btn-danger' },
      ],
      'in_progress': [
        { status: 'done', label: 'Mark Done', cls: 'btn-primary' },
        { status: 'todo', label: 'Back to To Do', cls: 'btn-secondary' },
        { status: 'cancelled', label: 'Cancel', cls: 'btn-danger' },
      ],
      'done': [
        { status: 'todo', label: 'Reopen', cls: 'btn-secondary' },
      ],
      'cancelled': [
        { status: 'todo', label: 'Reopen', cls: 'btn-secondary' },
      ],
    };

    const available = transitions[task.status] || [];
    if (available.length === 0) return '<span style="color:var(--color-text-tertiary);font-size:0.82rem">No transitions available</span>';

    return available.map(t =>
      `<button class="btn ${t.cls} btn-sm" data-transition="${t.status}">${escapeHtml(t.label)}</button>`
    ).join('');
  },

  async transition(taskId, newStatus) {
    try {
      await API.post(`/tasks/${taskId}/transition`, { status: newStatus });
      TaskDetail.render(document.getElementById('app'), taskId);
    } catch (err) {
      alert('Failed to update status: ' + (err.data?.errors?.join(', ') || err.message));
    }
  },

  async addComment(taskId) {
    const input = document.getElementById('comment-input');
    const body = input.value.trim();
    if (!body) return;

    try {
      await API.post(`/tasks/${taskId}/comments`, { body });
      TaskDetail.render(document.getElementById('app'), taskId);
    } catch (err) {
      alert('Failed to add comment: ' + (err.data?.errors?.join(', ') || err.message));
    }
  },

  async deleteComment(taskId, commentId) {
    if (!confirm('Delete this comment?')) return;
    try {
      await API.delete(`/tasks/${taskId}/comments/${commentId}`);
      TaskDetail.render(document.getElementById('app'), taskId);
    } catch (err) {
      alert('Failed to delete comment: ' + err.message);
    }
  },

  async remove(taskId) {
    if (!confirm('Are you sure you want to delete this task? This cannot be undone.')) return;
    try {
      await API.delete(`/tasks/${taskId}`);
      location.hash = '#/tasks';
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  },

  formatTime(isoStr) {
    if (!isoStr) return '--';
    try {
      const d = new Date(isoStr.endsWith('Z') ? isoStr : isoStr + 'Z');
      return d.toLocaleString();
    } catch {
      return isoStr;
    }
  },
};
