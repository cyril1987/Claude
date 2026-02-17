/* global API, escapeHtml, currentUser */

const Tasks = {
  refreshTimer: null,
  currentView: 'my',
  currentFilters: {},
  currentSort: 'due_date',
  currentPage: 0,
  pageSize: 50,
  categories: [],
  users: [],

  async render(container, view) {
    Tasks.currentView = view || 'my';
    Tasks.currentPage = 0;
    if (Tasks.refreshTimer) { clearInterval(Tasks.refreshTimer); Tasks.refreshTimer = null; }

    container.innerHTML = '<div class="loading" style="text-align:center;padding:3rem;color:var(--color-text-secondary)">Loading tasks...</div>';

    try {
      const [tasksData, stats, categories, users] = await Promise.all([
        Tasks.fetchTasks(),
        API.get(`/tasks/stats?view=${Tasks.currentView === 'all' ? 'all' : 'my'}`),
        API.get('/tasks/categories'),
        API.get('/tasks/users'),
      ]);
      Tasks.categories = categories;
      Tasks.users = users;
      Tasks.renderContent(container, tasksData, stats);
    } catch (err) {
      container.innerHTML = `<div class="empty-state" style="text-align:center;padding:3rem"><h2>Error loading tasks</h2><p>${escapeHtml(err.message)}</p></div>`;
    }
  },

  async fetchTasks() {
    const params = new URLSearchParams();
    if (Tasks.currentFilters.status) params.set('status', Tasks.currentFilters.status);
    if (Tasks.currentFilters.priority) params.set('priority', Tasks.currentFilters.priority);
    if (Tasks.currentFilters.category) params.set('category', Tasks.currentFilters.category);
    if (Tasks.currentFilters.source) params.set('source', Tasks.currentFilters.source);
    if (Tasks.currentFilters.search) params.set('search', Tasks.currentFilters.search);
    params.set('sort', Tasks.currentSort);
    params.set('limit', Tasks.pageSize);
    params.set('offset', Tasks.currentPage * Tasks.pageSize);

    const endpoint = Tasks.currentView === 'all' ? '/tasks/all' : '/tasks';
    return API.get(`${endpoint}?${params.toString()}`);
  },

  renderContent(container, tasksData, stats) {
    const { tasks, total } = tasksData;
    const totalPages = Math.ceil(total / Tasks.pageSize);

    container.innerHTML = `
      ${Tasks.renderSummaryBar(stats)}
      ${Tasks.renderToolbar()}
      ${tasks.length > 0 ? Tasks.renderTasksTable(tasks) : Tasks.renderEmptyState()}
      ${totalPages > 1 ? Tasks.renderPagination(total, totalPages) : ''}
    `;

    Tasks.attachListeners(container);
  },

  renderSummaryBar(stats) {
    return `
      <div class="summary-bar" style="grid-template-columns: repeat(5, 1fr)">
        <div class="summary-stat">
          <div class="label">Total</div>
          <div class="value">${stats.total}</div>
        </div>
        <div class="summary-stat">
          <div class="label">To Do</div>
          <div class="value">${stats.todo}</div>
        </div>
        <div class="summary-stat">
          <div class="label">In Progress</div>
          <div class="value" style="color: var(--color-primary)">${stats.inProgress}</div>
        </div>
        <div class="summary-stat">
          <div class="label">Done</div>
          <div class="value" style="color: var(--color-up)">${stats.done}</div>
        </div>
        <div class="summary-stat">
          <div class="label">Overdue</div>
          <div class="value" style="color: var(--color-down)">${stats.overdue}</div>
        </div>
      </div>
    `;
  },

  renderToolbar() {
    const f = Tasks.currentFilters;
    return `
      <div class="tasks-toolbar">
        <div class="tasks-toolbar-left">
          <div class="tasks-view-toggle">
            <a href="#/tasks" class="btn btn-sm ${Tasks.currentView === 'my' ? 'btn-primary' : 'btn-secondary'}">My Tasks</a>
            <a href="#/tasks/all" class="btn btn-sm ${Tasks.currentView === 'all' ? 'btn-primary' : 'btn-secondary'}">All Tasks</a>
          </div>
          <select class="tasks-filter-select" id="filter-status">
            <option value="">All Statuses</option>
            <option value="todo" ${f.status === 'todo' ? 'selected' : ''}>To Do</option>
            <option value="in_progress" ${f.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
            <option value="done" ${f.status === 'done' ? 'selected' : ''}>Done</option>
            <option value="cancelled" ${f.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
          <select class="tasks-filter-select" id="filter-priority">
            <option value="">All Priorities</option>
            <option value="urgent" ${f.priority === 'urgent' ? 'selected' : ''}>Urgent</option>
            <option value="high" ${f.priority === 'high' ? 'selected' : ''}>High</option>
            <option value="medium" ${f.priority === 'medium' ? 'selected' : ''}>Medium</option>
            <option value="low" ${f.priority === 'low' ? 'selected' : ''}>Low</option>
          </select>
          <select class="tasks-filter-select" id="filter-category">
            <option value="">All Categories</option>
            ${Tasks.categories.map(c => `<option value="${c.id}" ${f.category == c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
          </select>
          <select class="tasks-filter-select" id="filter-source">
            <option value="">All Sources</option>
            <option value="manual" ${f.source === 'manual' ? 'selected' : ''}>Manual</option>
            <option value="ismart" ${f.source === 'ismart' ? 'selected' : ''}>iSmart</option>
            <option value="recurring" ${f.source === 'recurring' ? 'selected' : ''}>Recurring</option>
          </select>
          <select class="tasks-filter-select" id="sort-select">
            <option value="due_date" ${Tasks.currentSort === 'due_date' ? 'selected' : ''}>Sort: Due Date</option>
            <option value="priority" ${Tasks.currentSort === 'priority' ? 'selected' : ''}>Sort: Priority</option>
            <option value="created" ${Tasks.currentSort === 'created' ? 'selected' : ''}>Sort: Created</option>
            <option value="status" ${Tasks.currentSort === 'status' ? 'selected' : ''}>Sort: Status</option>
          </select>
        </div>
        <div class="tasks-toolbar-right">
          <input type="text" id="task-search" class="tasks-filter-select" placeholder="Search tasks..." value="${escapeHtml(f.search || '')}" style="width:200px">
          <a href="#/tasks/new" class="btn btn-primary btn-sm">+ New Task</a>
        </div>
      </div>
    `;
  },

  renderTasksTable(tasks) {
    return `
      <div class="checks-section" style="margin-top:0">
        <div style="overflow-x:auto">
          <table class="checks-table">
            <thead>
              <tr>
                <th style="width:110px">Status</th>
                <th style="width:40px">Pri</th>
                <th>Title</th>
                ${Tasks.currentView === 'all' ? '<th style="min-width:130px">Assigned To</th>' : ''}
                <th style="min-width:110px">Category</th>
                <th style="width:110px">Due Date</th>
                <th style="width:80px">Source</th>
              </tr>
            </thead>
            <tbody>
              ${tasks.map(t => Tasks.renderTaskRow(t)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderTaskRow(task) {
    const priorityColors = { urgent: 'var(--color-down)', high: '#f59e0b', medium: 'var(--color-primary)', low: 'var(--color-unknown)' };
    const today = new Date().toISOString().split('T')[0];
    const isOverdue = task.dueDate && task.status !== 'done' && task.status !== 'cancelled' && task.dueDate < today;
    const statusLabel = task.status.replace('_', ' ');

    return `
      <tr class="task-row ${isOverdue ? 'task-overdue' : ''}" style="cursor:pointer" onclick="location.hash='#/tasks/${task.id}'">
        <td><span class="task-status-badge task-status-${task.status}">${escapeHtml(statusLabel)}</span></td>
        <td><span class="task-priority-dot" style="background:${priorityColors[task.priority]}" title="${task.priority}"></span></td>
        <td class="task-title-cell">
          ${escapeHtml(task.title)}
          ${task.recurringTemplateId ? '<span class="task-recurring-badge">recurring</span>' : ''}
          ${task.subtaskCount > 0 ? `<span style="color:var(--color-text-tertiary);font-size:0.72rem;margin-left:0.3rem">(${task.subtaskCount} subtask${task.subtaskCount !== 1 ? 's' : ''})</span>` : ''}
        </td>
        ${Tasks.currentView === 'all' ? `
          <td>
            ${task.assignedToAvatar ? `<img class="task-avatar" src="${escapeHtml(task.assignedToAvatar)}" alt="" referrerpolicy="no-referrer">` : ''}
            ${task.assignedToName ? escapeHtml(task.assignedToName) : '<span style="color:var(--color-text-tertiary)">Unassigned</span>'}
          </td>
        ` : ''}
        <td>${task.categoryName ? `<span class="task-category-badge" style="background:${task.categoryColor}20;color:${task.categoryColor}">${escapeHtml(task.categoryName)}</span>` : '<span style="color:var(--color-text-tertiary)">--</span>'}</td>
        <td class="${isOverdue ? 'task-overdue-date' : ''}">${task.dueDate || '<span style="color:var(--color-text-tertiary)">--</span>'}</td>
        <td><span class="task-source-badge">${escapeHtml(task.source)}</span></td>
      </tr>
    `;
  },

  renderEmptyState() {
    const hasFilters = Object.values(Tasks.currentFilters).some(v => v);
    return `
      <div style="text-align:center;padding:3rem;color:var(--color-text-secondary)">
        <h3 style="margin-bottom:0.5rem">${hasFilters ? 'No tasks match your filters' : 'No tasks yet'}</h3>
        <p style="margin-bottom:1rem">${hasFilters ? 'Try adjusting your filters or search terms.' : 'Create your first task to get started.'}</p>
        ${!hasFilters ? '<a href="#/tasks/new" class="btn btn-primary btn-sm">+ New Task</a>' : ''}
      </div>
    `;
  },

  renderPagination(total, totalPages) {
    const page = Tasks.currentPage;
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:1rem;font-size:0.82rem;color:var(--color-text-secondary)">
        <span>Showing ${page * Tasks.pageSize + 1}–${Math.min((page + 1) * Tasks.pageSize, total)} of ${total}</span>
        <div style="display:flex;gap:0.5rem">
          <button class="btn btn-secondary btn-sm" id="page-prev" ${page === 0 ? 'disabled' : ''}>Previous</button>
          <button class="btn btn-secondary btn-sm" id="page-next" ${page >= totalPages - 1 ? 'disabled' : ''}>Next</button>
        </div>
      </div>
    `;
  },

  attachListeners(container) {
    // Filters
    ['filter-status', 'filter-priority', 'filter-category', 'filter-source', 'sort-select'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', () => {
          Tasks.currentFilters.status = document.getElementById('filter-status').value || undefined;
          Tasks.currentFilters.priority = document.getElementById('filter-priority').value || undefined;
          Tasks.currentFilters.category = document.getElementById('filter-category').value || undefined;
          Tasks.currentFilters.source = document.getElementById('filter-source').value || undefined;
          Tasks.currentSort = document.getElementById('sort-select').value;
          Tasks.currentPage = 0;
          Tasks.render(container, Tasks.currentView === 'all' ? 'all' : undefined);
        });
      }
    });

    // Search
    const searchInput = document.getElementById('task-search');
    if (searchInput) {
      let searchTimeout;
      searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          Tasks.currentFilters.search = searchInput.value.trim() || undefined;
          Tasks.currentPage = 0;
          Tasks.render(container, Tasks.currentView === 'all' ? 'all' : undefined);
        }, 400);
      });
    }

    // Pagination
    const prevBtn = document.getElementById('page-prev');
    const nextBtn = document.getElementById('page-next');
    if (prevBtn) prevBtn.addEventListener('click', () => { Tasks.currentPage--; Tasks.render(container, Tasks.currentView === 'all' ? 'all' : undefined); });
    if (nextBtn) nextBtn.addEventListener('click', () => { Tasks.currentPage++; Tasks.render(container, Tasks.currentView === 'all' ? 'all' : undefined); });
  },

  // ─── Create / Edit Form ─────────────────────────────────────────────────

  async renderForm(container, editId) {
    container.innerHTML = '<div class="loading" style="text-align:center;padding:3rem;color:var(--color-text-secondary)">Loading...</div>';

    try {
      const [categories, users] = await Promise.all([
        API.get('/tasks/categories'),
        API.get('/tasks/users'),
      ]);

      let task = null;
      if (editId) {
        task = await API.get(`/tasks/${editId}`);
      }

      Tasks.renderFormContent(container, task, categories, users);
    } catch (err) {
      container.innerHTML = `<div class="empty-state" style="text-align:center;padding:3rem"><h2>Error</h2><p>${escapeHtml(err.message)}</p></div>`;
    }
  },

  renderFormContent(container, task, categories, users) {
    const isEdit = !!task;
    const isTemplate = task && task.isRecurringTemplate;
    const t = task || {};
    const rp = t.recurrencePattern || {};

    container.innerHTML = `
      <div class="form-container">
        <h2 class="form-title">${isEdit ? (isTemplate ? 'Edit Recurring Template' : 'Edit Task') : 'New Task'}</h2>
        <div id="form-errors"></div>
        <form id="task-form">
          <div class="form-group">
            <label for="title">Title *</label>
            <input type="text" id="title" name="title" value="${escapeHtml(t.title || '')}" required maxlength="255" placeholder="Enter task title">
          </div>

          <div class="form-group">
            <label for="description">Description</label>
            <textarea id="description" name="description" rows="4" maxlength="5000" placeholder="Optional details...">${escapeHtml(t.description || '')}</textarea>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
            <div class="form-group">
              <label for="priority">Priority</label>
              <select id="priority" name="priority">
                <option value="low" ${t.priority === 'low' ? 'selected' : ''}>Low</option>
                <option value="medium" ${t.priority === 'medium' || !t.priority ? 'selected' : ''}>Medium</option>
                <option value="high" ${t.priority === 'high' ? 'selected' : ''}>High</option>
                <option value="urgent" ${t.priority === 'urgent' ? 'selected' : ''}>Urgent</option>
              </select>
            </div>

            <div class="form-group">
              <label for="categoryId">Category</label>
              <div style="display:flex;gap:0.5rem">
                <select id="categoryId" name="categoryId" style="flex:1">
                  <option value="">-- No Category --</option>
                  ${categories.map(c => `<option value="${c.id}" ${t.categoryId == c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
                </select>
                <button type="button" class="btn btn-secondary btn-sm" id="add-category-btn">+ New</button>
              </div>
              <div id="new-category-input" style="display:none;margin-top:0.5rem">
                <div style="display:flex;gap:0.5rem">
                  <input type="text" id="new-category-name" placeholder="Category name" style="flex:1">
                  <input type="color" id="new-category-color" value="#2a9d8f" style="width:40px;padding:2px">
                  <button type="button" class="btn btn-primary btn-sm" id="confirm-new-category">Add</button>
                  <button type="button" class="btn btn-secondary btn-sm" id="cancel-new-category">Cancel</button>
                </div>
              </div>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
            <div class="form-group">
              <label for="source">Source</label>
              <select id="source" name="source">
                <option value="manual" ${t.source === 'manual' || !t.source ? 'selected' : ''}>Manual</option>
                <option value="ismart" ${t.source === 'ismart' ? 'selected' : ''}>iSmart Ticket</option>
              </select>
            </div>

            <div class="form-group">
              <label for="sourceRef">Source Reference</label>
              <input type="text" id="sourceRef" name="sourceRef" value="${escapeHtml(t.sourceRef || '')}" placeholder="e.g. iSmart ticket ID" maxlength="255">
              <div class="hint">External reference ID (optional)</div>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
            <div class="form-group">
              <label for="dueDate">Due Date</label>
              <input type="date" id="dueDate" name="dueDate" value="${t.dueDate || ''}">
            </div>

            <div class="form-group">
              <label for="assignedTo">Assign To</label>
              <select id="assignedTo" name="assignedTo">
                <option value="">-- Unassigned --</option>
                ${users.map(u => `<option value="${u.id}" ${t.assignedTo == u.id ? 'selected' : ''}>${escapeHtml(u.name)} (${escapeHtml(u.email)})</option>`).join('')}
              </select>
            </div>
          </div>

          ${!isEdit || isTemplate ? `
          <div class="form-group">
            <label>
              <input type="checkbox" id="enable-recurrence" ${t.recurrencePattern ? 'checked' : ''}>
              Make this a recurring task
            </label>
            <div class="hint">Recurring tasks will automatically create new instances on schedule</div>
          </div>

          <div class="recurrence-section" id="recurrence-section" style="${t.recurrencePattern ? '' : 'display:none'}">
            <h4>Recurrence Settings</h4>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
              <div class="form-group">
                <label for="recurrence-type">Frequency</label>
                <select id="recurrence-type">
                  <option value="daily" ${rp.type === 'daily' ? 'selected' : ''}>Daily</option>
                  <option value="weekly" ${rp.type === 'weekly' ? 'selected' : ''}>Weekly</option>
                  <option value="monthly" ${rp.type === 'monthly' ? 'selected' : ''}>Monthly</option>
                  <option value="yearly" ${rp.type === 'yearly' ? 'selected' : ''}>Yearly</option>
                </select>
              </div>
              <div class="form-group">
                <label for="recurrence-interval">Every N periods</label>
                <input type="number" id="recurrence-interval" min="1" max="365" value="${rp.interval || 1}">
                <div class="hint">e.g. 1 = every day, 2 = every other day</div>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
              <div class="form-group" id="recurrence-day-of-month-group" style="${rp.type === 'monthly' || rp.type === 'yearly' ? '' : 'display:none'}">
                <label for="recurrence-day-of-month">Day of Month</label>
                <input type="number" id="recurrence-day-of-month" min="1" max="31" value="${rp.dayOfMonth || ''}">
              </div>
              <div class="form-group">
                <label for="recurrence-end">End Date (optional)</label>
                <input type="date" id="recurrence-end" value="${t.recurrenceEndAt || ''}">
              </div>
            </div>
          </div>
          ` : ''}

          <div class="form-actions">
            <button type="submit" class="btn btn-primary">${isEdit ? 'Update Task' : 'Create Task'}</button>
            <a href="#/tasks" class="btn btn-secondary">Cancel</a>
          </div>
        </form>
      </div>
    `;

    // Attach form listeners
    const form = document.getElementById('task-form');

    // Category inline creation
    const addCatBtn = document.getElementById('add-category-btn');
    const newCatInput = document.getElementById('new-category-input');
    if (addCatBtn) {
      addCatBtn.addEventListener('click', () => { newCatInput.style.display = 'block'; addCatBtn.style.display = 'none'; });
      document.getElementById('cancel-new-category').addEventListener('click', () => { newCatInput.style.display = 'none'; addCatBtn.style.display = ''; });
      document.getElementById('confirm-new-category').addEventListener('click', async () => {
        const name = document.getElementById('new-category-name').value.trim();
        const color = document.getElementById('new-category-color').value;
        if (!name) return;
        try {
          const cat = await API.post('/tasks/categories', { name, color });
          const select = document.getElementById('categoryId');
          const opt = document.createElement('option');
          opt.value = cat.id;
          opt.textContent = cat.name;
          opt.selected = true;
          select.appendChild(opt);
          newCatInput.style.display = 'none';
          addCatBtn.style.display = '';
        } catch (err) {
          alert('Failed to create category: ' + (err.data?.errors?.join(', ') || err.message));
        }
      });
    }

    // Recurrence toggle
    const recCheck = document.getElementById('enable-recurrence');
    const recSection = document.getElementById('recurrence-section');
    if (recCheck) {
      recCheck.addEventListener('change', () => { recSection.style.display = recCheck.checked ? '' : 'none'; });
    }

    // Recurrence type change (show/hide day-of-month)
    const recType = document.getElementById('recurrence-type');
    if (recType) {
      recType.addEventListener('change', () => {
        const domGroup = document.getElementById('recurrence-day-of-month-group');
        if (domGroup) domGroup.style.display = (recType.value === 'monthly' || recType.value === 'yearly') ? '' : 'none';
      });
    }

    // Form submit
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorsDiv = document.getElementById('form-errors');
      errorsDiv.innerHTML = '';

      const body = {
        title: document.getElementById('title').value.trim(),
        description: document.getElementById('description').value.trim(),
        priority: document.getElementById('priority').value,
        categoryId: document.getElementById('categoryId').value || null,
        source: document.getElementById('source').value,
        sourceRef: document.getElementById('sourceRef').value.trim() || null,
        dueDate: document.getElementById('dueDate').value || null,
        assignedTo: document.getElementById('assignedTo').value || null,
      };

      // Recurrence
      const recEnabled = document.getElementById('enable-recurrence');
      if (recEnabled && recEnabled.checked) {
        body.recurrencePattern = {
          type: document.getElementById('recurrence-type').value,
          interval: parseInt(document.getElementById('recurrence-interval').value, 10) || 1,
        };
        const dayOfMonth = document.getElementById('recurrence-day-of-month').value;
        if (dayOfMonth) body.recurrencePattern.dayOfMonth = parseInt(dayOfMonth, 10);

        const endDate = document.getElementById('recurrence-end').value;
        if (endDate) body.recurrenceEndAt = endDate;
      }

      try {
        if (isEdit) {
          await API.put(`/tasks/${task.id}`, body);
        } else {
          await API.post('/tasks', body);
        }
        location.hash = '#/tasks';
      } catch (err) {
        const errors = err.data?.errors || [err.message];
        errorsDiv.innerHTML = `<div class="form-errors">${errors.map(e => `<div>${escapeHtml(e)}</div>`).join('')}</div>`;
      }
    });
  },
};
