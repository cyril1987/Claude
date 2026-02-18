/* global API, escapeHtml, Modal, XLSX */

const IsmartUpload = {
  parsedData: [],
  currentStep: 1,

  render(container) {
    this.parsedData = [];
    this.currentStep = 1;
    this.renderUploadStep(container);
  },

  renderSteps(active) {
    const steps = ['Upload CSV', 'Review & Confirm', 'Results'];
    return `
      <div class="upload-steps">
        ${steps.map((s, i) => `
          <div class="upload-step ${i + 1 === active ? 'active' : ''} ${i + 1 < active ? 'completed' : ''}">
            <span class="upload-step-num">${i + 1 < active ? '✓' : i + 1}</span>
            <span class="upload-step-label">${s}</span>
          </div>
        `).join('<div class="upload-step-line"></div>')}
      </div>
    `;
  },

  // ─── Step 1: File Upload ──────────────────────────────────────────────────

  renderUploadStep(container) {
    this.currentStep = 1;
    container.innerHTML = `
      <div class="form-container" style="max-width:780px;position:relative">
        <button type="button" class="form-close-btn" id="form-close-btn" title="Close">&times;</button>
        ${this.renderSteps(1)}
        <h2 class="form-title">Upload iSmart Tickets</h2>
        <p style="color:var(--color-text-secondary);font-size:0.88rem;margin-bottom:1.5rem">
          Upload an iSmart CSV export to import tickets as tasks. Existing tickets (by Reference ID) will be updated.
          New tickets create unassigned tasks.
        </p>
        <div id="upload-errors"></div>
        <div class="upload-dropzone" id="upload-dropzone">
          <div class="upload-dropzone-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <div class="upload-dropzone-text">Drag and drop an iSmart CSV here, or click to browse</div>
          <div class="upload-dropzone-hint">Supports .csv, .xlsx, .xls files exported from iSmart</div>
          <input type="file" id="file-input" accept=".csv,.xlsx,.xls" style="display:none">
        </div>
        <div style="margin-top:1.5rem;padding:1rem;background:var(--color-card);border:1px solid var(--color-card-border);border-radius:var(--radius-sm)">
          <h4 style="font-size:0.82rem;color:var(--color-primary);margin-bottom:0.5rem">Expected CSV Columns</h4>
          <p style="font-size:0.78rem;color:var(--color-text-secondary);line-height:1.6">
            <strong>Required:</strong> Reference Id, Short Description<br>
            <strong>Used:</strong> Priority, State, Description, Opened At, Updated At, Due Date, Opened By, Assigned To,
            Group Name, Business Service, Category, Subcategory, Impact, Urgency, Hold Reason, Has Breached, Internal State, Location, Channel, Program Name
          </p>
        </div>
      </div>
    `;

    // Close button
    document.getElementById('form-close-btn').addEventListener('click', () => {
      if (window.history.length > 1) window.history.back();
      else location.hash = '#/tasks';
    });

    const dropzone = document.getElementById('upload-dropzone');
    const fileInput = document.getElementById('file-input');

    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) this.handleFile(container, e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', () => {
      if (fileInput.files.length > 0) this.handleFile(container, fileInput.files[0]);
    });
  },

  handleFile(container, file) {
    const errDiv = document.getElementById('upload-errors');
    errDiv.innerHTML = '';

    const maxSize = 5 * 1024 * 1024; // 5MB (matches server JSON body limit)
    if (file.size > maxSize) {
      errDiv.innerHTML = '<div class="form-errors"><div>File too large (max 5MB)</div></div>';
      return;
    }

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext)) {
      errDiv.innerHTML = '<div class="form-errors"><div>Unsupported file type. Use .csv, .xlsx, or .xls</div></div>';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (rows.length === 0) {
          errDiv.innerHTML = '<div class="form-errors"><div>No data rows found in file</div></div>';
          return;
        }

        this.parsedData = this.mapRows(rows);
        this.renderReviewStep(container);
      } catch (err) {
        errDiv.innerHTML = `<div class="form-errors"><div>Failed to parse file: ${escapeHtml(err.message)}</div></div>`;
      }
    };
    reader.readAsArrayBuffer(file);
  },

  // ─── Column Mapping ───────────────────────────────────────────────────────

  mapRows(rows) {
    // Flexible column name mapping (CSV headers can vary)
    const colMap = {
      referenceId: ['Reference Id', 'reference_id', 'Reference ID', 'Ref Id', 'ref_id', 'INC', 'Incident Number'],
      incidentId: ['process_incident_master.id', 'Incident ID', 'incident_id', 'ID'],
      priority: ['Priority', 'priority'],
      shortDescription: ['Short Description', 'short_description', 'Title', 'Summary', 'Subject'],
      description: ['Description', 'description', 'Details', 'Long Description'],
      state: ['State', 'state', 'Status'],
      internalState: ['Internal State', 'internal_state', 'Internal State ID'],
      category: ['category', 'Category'],
      subcategory: ['subcategory', 'Subcategory', 'Sub Category'],
      subcategory2: ['subcategory2', 'Subcategory2', 'Sub Category 2'],
      openedAt: ['Opened At', 'opened_at', 'Created', 'Created Date'],
      updatedAt: ['Updated At', 'updated_at', 'Last Updated'],
      dueDate: ['Due Date', 'due_date', 'Due'],
      openedBy: ['Opened By', 'opened_by', 'Reporter', 'Created By'],
      assignedTo: ['Assigned To', 'assigned_to', 'Assignee', 'process_incident_master.assigned_to'],
      groupName: ['Group Name', 'group_name', 'Support Group', 'Assignment Group'],
      businessService: ['Business Service', 'business_service'],
      impact: ['Impact', 'impact'],
      urgency: ['Urgency', 'urgency'],
      holdReason: ['Hold Reason', 'hold_reason'],
      hasBreached: ['HasBreached', 'has_breached', 'Breached', 'SLA Breached'],
      location: ['Location', 'location', 'Work Location'],
      channel: ['Channel', 'channel', 'Origin'],
      programName: ['Program Name', 'program_name'],
    };

    return rows.map((row) => {
      const mapped = {};
      for (const [field, aliases] of Object.entries(colMap)) {
        for (const alias of aliases) {
          if (row[alias] !== undefined && row[alias] !== '') {
            let val = row[alias];
            // Convert dates to strings
            if (val instanceof Date) {
              val = val.toISOString().replace('T', ' ').substring(0, 19);
            }
            mapped[field] = String(val).trim();
            break;
          }
        }
        if (!mapped[field]) mapped[field] = '';
      }

      // Derive due date from the "Due Date" column, format to YYYY-MM-DD if possible
      if (mapped.dueDate) {
        const d = new Date(mapped.dueDate);
        if (!isNaN(d.getTime())) {
          mapped.dueDate = d.toISOString().split('T')[0];
        }
      }

      // Validation flags
      mapped._errors = [];
      if (!mapped.referenceId) mapped._errors.push('Missing Reference Id');
      if (!mapped.shortDescription) mapped._errors.push('Missing Short Description');

      return mapped;
    });
  },

  // ─── Step 2: Review ───────────────────────────────────────────────────────

  renderReviewStep(container) {
    this.currentStep = 2;
    const data = this.parsedData;
    const valid = data.filter(d => d._errors.length === 0);
    const invalid = data.filter(d => d._errors.length > 0);

    // Check which reference IDs already exist
    const existingRefs = new Set();
    try {
      const allRefs = data.map(d => d.referenceId).filter(Boolean);
      if (allRefs.length > 0) {
        const placeholders = allRefs.map(() => '?').join(',');
        const existing = (() => {
          // Use fetch to check via API — we'll mark on the frontend
          // For now just mark existing ones based on what we'll get from the backend
          return [];
        })();
      }
    } catch { /* ignore */ }

    container.innerHTML = `
      <div class="form-container" style="max-width:960px;position:relative">
        <button type="button" class="form-close-btn" id="form-close-btn" title="Close">&times;</button>
        ${this.renderSteps(2)}
        <h2 class="form-title" style="margin-bottom:1rem">Review iSmart Tickets</h2>

        <div style="display:flex;gap:1rem;margin-bottom:1.25rem">
          <div class="summary-stat" style="flex:1;padding:0.75rem">
            <div class="label">Total Rows</div>
            <div class="value">${data.length}</div>
          </div>
          <div class="summary-stat" style="flex:1;padding:0.75rem">
            <div class="label">Valid</div>
            <div class="value" style="color:var(--color-up)">${valid.length}</div>
          </div>
          <div class="summary-stat" style="flex:1;padding:0.75rem">
            <div class="label">Invalid</div>
            <div class="value" style="color:${invalid.length > 0 ? 'var(--color-down)' : 'var(--color-text-secondary)'}">${invalid.length}</div>
          </div>
        </div>

        ${invalid.length > 0 ? `
          <div class="form-errors" style="margin-bottom:1rem">
            <div style="font-weight:600;margin-bottom:0.3rem">${invalid.length} row(s) have errors and will be skipped:</div>
            ${invalid.map((d, i) => `<div>Row ${data.indexOf(d) + 1}: ${escapeHtml(d._errors.join(', '))}</div>`).join('')}
          </div>
        ` : ''}

        <div style="overflow-x:auto;max-height:400px;overflow-y:auto;border:1px solid var(--color-card-border);border-radius:var(--radius-sm)">
          <table class="checks-table" style="font-size:0.78rem">
            <thead style="position:sticky;top:0;z-index:1">
              <tr>
                <th style="width:40px">#</th>
                <th style="width:130px">Reference ID</th>
                <th style="width:80px">Priority</th>
                <th>Short Description</th>
                <th style="width:90px">State</th>
                <th style="width:120px">Opened By</th>
                <th style="width:100px">Due Date</th>
                <th style="width:50px">Status</th>
              </tr>
            </thead>
            <tbody>
              ${data.map((d, i) => {
                const hasErr = d._errors.length > 0;
                return `
                  <tr style="${hasErr ? 'opacity:0.5;background:rgba(244,63,94,0.05)' : ''}">
                    <td>${i + 1}</td>
                    <td><code style="font-size:0.72rem">${escapeHtml(d.referenceId || '--')}</code></td>
                    <td>${escapeHtml(d.priority || '--')}</td>
                    <td style="max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escapeHtml(d.shortDescription)}">${escapeHtml(d.shortDescription || '--')}</td>
                    <td><span class="ismart-state-badge ismart-state-${(d.state || '').toLowerCase().replace(/\s+/g, '-')}">${escapeHtml(d.state || '--')}</span></td>
                    <td>${escapeHtml(d.openedBy || '--')}</td>
                    <td>${escapeHtml(d.dueDate || '--')}</td>
                    <td>${hasErr ? '<span style="color:var(--color-down)" title="' + escapeHtml(d._errors.join(', ')) + '">✗</span>' : '<span style="color:var(--color-up)">✓</span>'}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <div class="form-actions" style="margin-top:1.5rem">
          <button class="btn btn-primary" id="import-btn" ${valid.length === 0 ? 'disabled' : ''}>
            Import ${valid.length} Ticket${valid.length !== 1 ? 's' : ''}
          </button>
          <button class="btn btn-secondary" id="back-btn">Back</button>
        </div>
      </div>
    `;

    document.getElementById('form-close-btn').addEventListener('click', () => {
      if (window.history.length > 1) window.history.back();
      else location.hash = '#/tasks';
    });

    document.getElementById('back-btn').addEventListener('click', () => this.renderUploadStep(container));

    document.getElementById('import-btn').addEventListener('click', async () => {
      const btn = document.getElementById('import-btn');
      btn.disabled = true;
      btn.textContent = 'Importing...';

      try {
        const validTickets = data.filter(d => d._errors.length === 0).map(d => {
          const { _errors, ...ticket } = d;
          return ticket;
        });

        const result = await API.post('/tasks/ismart-upload', { tickets: validTickets });
        this.renderResultsStep(container, result);
      } catch (err) {
        btn.disabled = false;
        btn.textContent = `Import ${valid.length} Ticket${valid.length !== 1 ? 's' : ''}`;
        await Modal.alert('Import failed: ' + (err.message || 'Unknown error'), 'Error');
      }
    });
  },

  // ─── Step 3: Results ──────────────────────────────────────────────────────

  renderResultsStep(container, result) {
    this.currentStep = 3;
    const { created, updated, failed, summary } = result;

    container.innerHTML = `
      <div class="form-container" style="max-width:780px;position:relative">
        <button type="button" class="form-close-btn" id="form-close-btn" title="Close">&times;</button>
        ${this.renderSteps(3)}
        <h2 class="form-title" style="margin-bottom:1.5rem">Import Complete</h2>

        <div style="display:flex;gap:1rem;margin-bottom:1.5rem">
          <div class="summary-stat" style="flex:1;padding:0.75rem">
            <div class="label">Total</div>
            <div class="value">${summary.total}</div>
          </div>
          <div class="summary-stat" style="flex:1;padding:0.75rem">
            <div class="label">Created</div>
            <div class="value" style="color:var(--color-up)">${summary.created}</div>
          </div>
          <div class="summary-stat" style="flex:1;padding:0.75rem">
            <div class="label">Updated</div>
            <div class="value" style="color:var(--color-primary)">${summary.updated}</div>
          </div>
          <div class="summary-stat" style="flex:1;padding:0.75rem">
            <div class="label">Failed</div>
            <div class="value" style="color:${summary.failed > 0 ? 'var(--color-down)' : 'var(--color-text-secondary)'}">${summary.failed}</div>
          </div>
        </div>

        ${created.length > 0 ? `
          <div style="margin-bottom:1.25rem">
            <h4 style="font-size:0.82rem;color:var(--color-up);margin-bottom:0.5rem">Created Tasks (${created.length})</h4>
            <div style="max-height:200px;overflow-y:auto;border:1px solid var(--color-card-border);border-radius:var(--radius-sm)">
              <table class="checks-table" style="font-size:0.78rem">
                <thead><tr><th style="width:130px">Reference ID</th><th>Title</th><th style="width:80px">Task</th></tr></thead>
                <tbody>
                  ${created.map(r => `
                    <tr>
                      <td><code>${escapeHtml(r.referenceId)}</code></td>
                      <td style="max-width:350px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(r.title)}</td>
                      <td><a href="#/tasks/${r.taskId}" style="color:var(--color-primary)">#${r.taskId}</a></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        ` : ''}

        ${updated.length > 0 ? `
          <div style="margin-bottom:1.25rem">
            <h4 style="font-size:0.82rem;color:var(--color-primary);margin-bottom:0.5rem">Updated Tickets (${updated.length})</h4>
            <div style="max-height:200px;overflow-y:auto;border:1px solid var(--color-card-border);border-radius:var(--radius-sm)">
              <table class="checks-table" style="font-size:0.78rem">
                <thead><tr><th style="width:130px">Reference ID</th><th>Title</th><th style="width:80px">Task</th></tr></thead>
                <tbody>
                  ${updated.map(r => `
                    <tr>
                      <td><code>${escapeHtml(r.referenceId)}</code></td>
                      <td style="max-width:350px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(r.title)}</td>
                      <td><a href="#/tasks/${r.taskId}" style="color:var(--color-primary)">#${r.taskId}</a></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        ` : ''}

        ${failed.length > 0 ? `
          <div style="margin-bottom:1.25rem">
            <h4 style="font-size:0.82rem;color:var(--color-down);margin-bottom:0.5rem">Failed (${failed.length})</h4>
            <div class="form-errors">
              ${failed.map(r => `<div>${escapeHtml(r.referenceId || 'Row ' + (r.rowIndex + 1))}: ${escapeHtml(r.errors.join(', '))}</div>`).join('')}
            </div>
          </div>
        ` : ''}

        <div class="form-actions">
          <a href="#/tasks" class="btn btn-primary">Go to Tasks</a>
          <button class="btn btn-secondary" id="upload-more-btn">Upload More</button>
        </div>
      </div>
    `;

    document.getElementById('form-close-btn').addEventListener('click', () => { location.hash = '#/tasks'; });
    document.getElementById('upload-more-btn').addEventListener('click', () => this.renderUploadStep(container));
  },
};
