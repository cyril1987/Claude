const MonitorForm = {
  async render(container, editId) {
    let monitor = null;

    if (editId) {
      try {
        monitor = await API.get(`/monitors/${editId}`);
      } catch (err) {
        container.innerHTML = `<div class="empty-state"><h2>Monitor not found</h2><p>${err.message}</p></div>`;
        return;
      }
    }

    const title = monitor ? 'Edit Monitor' : 'Add Monitor';
    const url = monitor ? monitor.url : '';
    const name = monitor ? monitor.name : '';
    const frequency = monitor ? monitor.frequencySeconds : 300;
    const expectedStatus = monitor ? monitor.expectedStatus : 200;
    const timeoutMs = monitor ? monitor.timeoutMs : 10000;
    const notifyEmail = monitor ? monitor.notifyEmail : '';

    container.innerHTML = `
      <div class="form-container">
        <h2 class="form-title">${title}</h2>
        <div id="form-errors"></div>
        <form id="monitor-form">
          <div class="form-group">
            <label for="url">URL</label>
            <input type="url" id="url" name="url" value="${escapeAttr(url)}" placeholder="https://example.com" required>
            <div class="hint">The URL to monitor (must be http or https)</div>
          </div>

          <div class="form-group">
            <label for="name">Name</label>
            <input type="text" id="name" name="name" value="${escapeAttr(name)}" placeholder="My Website">
            <div class="hint">A friendly name for this monitor (auto-derived from URL if blank)</div>
          </div>

          <div class="form-group">
            <label for="frequency">Check Frequency</label>
            <select id="frequency" name="frequency">
              <option value="60" ${frequency === 60 ? 'selected' : ''}>Every 1 minute</option>
              <option value="300" ${frequency === 300 ? 'selected' : ''}>Every 5 minutes</option>
              <option value="900" ${frequency === 900 ? 'selected' : ''}>Every 15 minutes</option>
              <option value="1800" ${frequency === 1800 ? 'selected' : ''}>Every 30 minutes</option>
              <option value="3600" ${frequency === 3600 ? 'selected' : ''}>Every 1 hour</option>
            </select>
          </div>

          <div class="form-group">
            <label for="expectedStatus">Expected Status Code</label>
            <input type="number" id="expectedStatus" name="expectedStatus" value="${expectedStatus}" min="100" max="599">
            <div class="hint">The HTTP status code that indicates success (default: 200)</div>
          </div>

          <div class="form-group">
            <label for="timeoutMs">Timeout (ms)</label>
            <input type="number" id="timeoutMs" name="timeoutMs" value="${timeoutMs}" min="1000" max="30000" step="1000">
            <div class="hint">How long to wait for a response before considering it a timeout (1000-30000ms)</div>
          </div>

          <div class="form-group">
            <label for="notifyEmail">Notification Email</label>
            <input type="email" id="notifyEmail" name="notifyEmail" value="${escapeAttr(notifyEmail)}" placeholder="admin@example.com" required>
            <div class="hint">Email address to receive alerts when this URL goes down or recovers</div>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn btn-primary">${monitor ? 'Update Monitor' : 'Create Monitor'}</button>
            <a href="#/" class="btn btn-secondary">Cancel</a>
          </div>
        </form>
      </div>
    `;

    document.getElementById('monitor-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorsEl = document.getElementById('form-errors');
      errorsEl.innerHTML = '';

      const formData = {
        url: document.getElementById('url').value.trim(),
        name: document.getElementById('name').value.trim(),
        frequency: parseInt(document.getElementById('frequency').value, 10),
        expectedStatus: parseInt(document.getElementById('expectedStatus').value, 10),
        timeoutMs: parseInt(document.getElementById('timeoutMs').value, 10),
        notifyEmail: document.getElementById('notifyEmail').value.trim(),
      };

      try {
        if (monitor) {
          await API.put(`/monitors/${monitor.id}`, formData);
        } else {
          await API.post('/monitors', formData);
        }
        location.hash = '#/';
      } catch (err) {
        const errors = err.data?.errors || [err.message];
        errorsEl.innerHTML = `
          <div class="form-errors">
            <ul>${errors.map((e) => `<li>${escapeHtml(e)}</li>`).join('')}</ul>
          </div>
        `;
      }
    });
  },
};

function escapeAttr(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
