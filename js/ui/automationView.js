/**
 * AXIOM INVENTORY INTELLIGENCE - AUTOMATION CENTER VIEW
 * Module: Automation Center & Persistent Workflow Engine (#sec-automations)
 * 
 * Features:
 * - Summary KPI cards (Active Automations, Scheduled Cron, Event Watchdogs, Total Runs)
 * - Filter tabs (All, Scheduled, Event-Driven)
 * - Automation Cards with Active/Inactive Toggle, Details, and "▶ RUN NOW" button
 * - Create Automation Modal (Scheduled cron presets or Event-Driven triggers)
 * - Execution History Table with status pills, execution duration, and download links
 */

window.AxiomAutomation = (function() {
  'use strict';

  let allAutomations = [];
  let executionHistory = [];
  let currentTab = 'all';

  /**
   * Render the entire Automation Center module
   */
  async function renderAutomation(containerEl) {
    if (!containerEl) containerEl = document.getElementById('automationContainer');
    if (!containerEl) return;

    containerEl.innerHTML = `
      <div class="auto-container">
        <!-- Header -->
        <div class="auto-header-bar">
          <div class="auto-header-info">
            <h2 class="auto-main-title">Autonomous Workflow & Automation Center</h2>
            <p class="auto-main-sub">Orchestrate recurring procurement briefings, automated linear programming runs, and real-time event-driven alerts.</p>
          </div>
          <div class="auto-header-actions">
            <button class="btn btn-primary" onclick="AxiomAutomation.openCreateModal()">
              <span>✦</span> CREATE AUTOMATION
            </button>
          </div>
        </div>

        <!-- KPI Strip -->
        <div class="auto-kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">ACTIVE AUTOMATIONS</div>
            <div class="kpi-value cyan" id="autoStatActive">--</div>
            <div class="kpi-sub" id="autoStatTotal">Out of -- configured</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">SCHEDULED CRON JOBS</div>
            <div class="kpi-value" id="autoStatCron">--</div>
            <div class="kpi-sub">Daily, Weekly, Monthly cycles</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">EVENT WATCHDOGS</div>
            <div class="kpi-value amber" id="autoStatEvents">--</div>
            <div class="kpi-sub">Stockout & SLA Thresholds</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">HISTORICAL EXECUTIONS</div>
            <div class="kpi-value green" id="autoStatRuns">--</div>
            <div class="kpi-sub">Autonomous Runs Completed</div>
          </div>
        </div>

        <!-- Filter Tabs -->
        <div class="auto-tabs-bar">
          <div class="auto-tab-btn active" id="tabAll" onclick="AxiomAutomation.switchTab('all')">All Workflows</div>
          <div class="auto-tab-btn" id="tabScheduled" onclick="AxiomAutomation.switchTab('SCHEDULED')">Scheduled Jobs (Cron)</div>
          <div class="auto-tab-btn" id="tabEvent" onclick="AxiomAutomation.switchTab('EVENT')">Event-Driven Watchdogs</div>
          <button class="btn btn-outline btn-sm" style="margin-left:auto;" onclick="AxiomAutomation.loadData()">🔄 Refresh</button>
        </div>

        <!-- Automations Grid -->
        <div class="auto-cards-grid" id="autoCardsGrid">
          <div style="grid-column:1/-1;text-align:center;padding:2rem;">Loading automations...</div>
        </div>

        <!-- Execution History Log -->
        <div class="card auto-history-card">
          <div class="card-header">
            <div class="card-title"><span class="card-title-icon">⏱</span> Execution History Log</div>
            <span class="chip info" id="historyCountBadge">0 RUNS</span>
          </div>
          <div class="card-body" style="padding:0;">
            <div class="table-wrap">
              <table class="data-table" id="historyTable">
                <thead>
                  <tr>
                    <th>AUTOMATION WORKFLOW</th>
                    <th>TRIGGER SOURCE</th>
                    <th>STATUS</th>
                    <th>TIMESTAMP</th>
                    <th>DURATION</th>
                    <th>COMPILED REPORT & DOWNLOADS</th>
                  </tr>
                </thead>
                <tbody id="historyTableBody">
                  <tr><td colspan="6" style="text-align:center;padding:2rem;">Loading execution history...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;

    await loadData();
  }

  /**
   * Load automations and execution history from backend
   */
  async function loadData() {
    try {
      const [autosResp, histResp] = await Promise.all([
        fetch('/api/automations'),
        fetch('/api/automations/history')
      ]);

      const autosData = await autosResp.json();
      const histData = await histResp.json();

      if (autosData.success) allAutomations = autosData.automations || [];
      if (histData.success) executionHistory = histData.history || [];

      updateStats();
      renderGrid();
      renderHistoryTable();
    } catch (err) {
      console.error('[AutomationCenter] Error loading data:', err);
    }
  }

  /**
   * Update top KPI statistics
   */
  function updateStats() {
    const activeEl = document.getElementById('autoStatActive');
    const totalEl = document.getElementById('autoStatTotal');
    const cronEl = document.getElementById('autoStatCron');
    const eventsEl = document.getElementById('autoStatEvents');
    const runsEl = document.getElementById('autoStatRuns');

    const activeCount = allAutomations.filter(a => a.active).length;
    const cronCount = allAutomations.filter(a => a.type === 'SCHEDULED').length;
    const eventCount = allAutomations.filter(a => a.type === 'EVENT').length;

    if (activeEl) activeEl.textContent = activeCount;
    if (totalEl) totalEl.textContent = `Out of ${allAutomations.length} configured`;
    if (cronEl) cronEl.textContent = cronCount;
    if (eventsEl) eventsEl.textContent = eventCount;
    if (runsEl) runsEl.textContent = executionHistory.length;

    const histBadge = document.getElementById('historyCountBadge');
    if (histBadge) histBadge.textContent = `${executionHistory.length} RUNS`;
  }

  /**
   * Filter tab switch
   */
  function switchTab(tabKey) {
    currentTab = tabKey;
    document.querySelectorAll('.auto-tab-btn').forEach(btn => btn.classList.remove('active'));
    if (tabKey === 'all') document.getElementById('tabAll')?.classList.add('active');
    else if (tabKey === 'SCHEDULED') document.getElementById('tabScheduled')?.classList.add('active');
    else if (tabKey === 'EVENT') document.getElementById('tabEvent')?.classList.add('active');
    renderGrid();
  }

  /**
   * Render Automations Grid
   */
  function renderGrid() {
    const gridEl = document.getElementById('autoCardsGrid');
    if (!gridEl) return;

    let filtered = allAutomations;
    if (currentTab !== 'all') {
      filtered = filtered.filter(a => a.type === currentTab);
    }

    if (filtered.length === 0) {
      gridEl.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--text2);">No automations match the selected filter.</div>`;
      return;
    }

    gridEl.innerHTML = filtered.map(auto => {
      const isScheduled = auto.type === 'SCHEDULED';
      const triggerLabel = isScheduled ? (auto.cronLabel || auto.cronExpression) : `Event Trigger: ${auto.thresholdValue || 0}${auto.thresholdUnit || ''}`;
      const lastRunStr = auto.lastRun ? new Date(auto.lastRun).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Never';
      const formats = (auto.formats || ['pdf', 'xlsx']).map(f => `<span class="fmt-pill ${f.toLowerCase()}">${f.toUpperCase()}</span>`).join(' ');

      return `
        <div class="card auto-item-card ${auto.active ? 'active' : 'paused'}">
          <div class="auto-item-header">
            <div class="auto-type-badge ${isScheduled ? 'scheduled' : 'event'}">
              ${isScheduled ? '⏰ SCHEDULED' : '⚡ EVENT-DRIVEN'}
            </div>
            <!-- Toggle Switch -->
            <label class="toggle-switch" title="Toggle active status">
              <input type="checkbox" ${auto.active ? 'checked' : ''} onchange="AxiomAutomation.toggleActive('${auto.id}', this.checked)">
              <span class="toggle-slider"></span>
            </label>
          </div>

          <h3 class="auto-item-name">${auto.name}</h3>
          <p class="auto-item-desc">${auto.description || ''}</p>

          <div class="auto-item-details">
            <div class="auto-detail-row">
              <span class="detail-label">Cadence / Condition:</span>
              <span class="detail-val mono highlight">${triggerLabel}</span>
            </div>
            <div class="auto-detail-row">
              <span class="detail-label">Compiled Formats:</span>
              <span class="detail-val">${formats}</span>
            </div>
            <div class="auto-detail-row">
              <span class="detail-label">Audience:</span>
              <span class="detail-val">${auto.targetAudience || 'Operations Team'}</span>
            </div>
            <div class="auto-detail-row">
              <span class="detail-label">Last Execution:</span>
              <span class="detail-val mono text-muted">${lastRunStr} (${auto.runCount || 0} runs)</span>
            </div>
          </div>

          <div class="auto-item-actions">
            <button class="btn btn-primary btn-sm rs-run-now" id="runBtn_${auto.id}" onclick="AxiomAutomation.runNow('${auto.id}')">
              <span>▶</span> RUN NOW
            </button>
            <button class="btn btn-outline btn-sm btn-danger" onclick="AxiomAutomation.deleteAuto('${auto.id}')" title="Delete Automation">
              🗑
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Render Execution History Table
   */
  function renderHistoryTable() {
    const tbody = document.getElementById('historyTableBody');
    if (!tbody) return;

    if (executionHistory.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text2);">No execution history recorded yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = executionHistory.slice(0, 20).map(rec => {
      const isSuccess = rec.status === 'SUCCESS';
      const dateStr = new Date(rec.timestamp).toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      const formats = rec.formats || {};

      return `
        <tr>
          <td>
            <div class="mono" style="font-weight:600;color:var(--text);">${rec.automationName}</div>
            <div style="font-size:0.75rem;color:var(--text2);">${rec.reportTitle || ''}</div>
          </td>
          <td><span class="chip info">${rec.triggeredBy || 'MANUAL'}</span></td>
          <td>
            <span class="chip ${isSuccess ? 'ok' : 'crit'}">
              ${isSuccess ? '✔ SUCCESS' : '✖ FAILED'}
            </span>
          </td>
          <td><span class="mono text-muted">${dateStr}</span></td>
          <td><span class="mono">${rec.durationMs || 0}ms</span></td>
          <td>
            <div class="dl-format-pills">
              ${formats.pdf ? `<a href="${formats.pdf.downloadUrl}" download class="fmt-pill-link pdf" title="Download PDF">PDF</a>` : ''}
              ${formats.docx ? `<a href="${formats.docx.downloadUrl}" download class="fmt-pill-link docx" title="Download Word">DOCX</a>` : ''}
              ${formats.xlsx ? `<a href="${formats.xlsx.downloadUrl}" download class="fmt-pill-link xlsx" title="Download Excel">XLSX</a>` : ''}
              ${formats.pptx ? `<a href="${formats.pptx.downloadUrl}" download class="fmt-pill-link pptx" title="Download PowerPoint">PPTX</a>` : ''}
              ${formats.csv ? `<a href="${formats.csv.downloadUrl}" download class="fmt-pill-link csv" title="Download CSV">CSV</a>` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  /**
   * Toggle Active / Inactive
   */
  async function toggleActive(id, isActive) {
    try {
      const resp = await fetch(`/api/automations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: isActive })
      });
      const data = await resp.json();
      if (data.success) {
        const item = allAutomations.find(a => a.id === id);
        if (item) item.active = isActive;
        updateStats();
        renderGrid();
        if (window.AxiomDrawerModal) {
          window.AxiomDrawerModal.toast(`Automation ${isActive ? 'activated' : 'paused'}`, 'info');
        }
      }
    } catch (err) {
      console.error('[AutomationCenter] Toggle error:', err);
    }
  }

  /**
   * Trigger Manual Run Now
   */
  async function runNow(id) {
    const btn = document.getElementById(`runBtn_${id}`);
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner-small"></span> RUNNING...`;
    }

    try {
      const resp = await fetch(`/api/automations/${id}/run`, { method: 'POST' });
      const data = await resp.json();
      if (data.success) {
        if (window.AxiomDrawerModal) {
          window.AxiomDrawerModal.toast('Automation executed successfully! Files compiled.', 'success');
        }
        await loadData();
      } else {
        throw new Error(data.error || 'Execution failed');
      }
    } catch (err) {
      console.error('[AutomationCenter] Run error:', err);
      if (window.AxiomDrawerModal) {
        window.AxiomDrawerModal.toast(`Execution error: ${err.message}`, 'error');
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<span>▶</span> RUN NOW`;
      }
    }
  }

  /**
   * Delete Automation
   */
  async function deleteAuto(id) {
    if (!confirm('Are you sure you want to delete this automation schedule?')) return;

    try {
      const resp = await fetch(`/api/automations/${id}`, { method: 'DELETE' });
      const data = await resp.json();
      if (data.success) {
        allAutomations = allAutomations.filter(a => a.id !== id);
        updateStats();
        renderGrid();
        if (window.AxiomDrawerModal) {
          window.AxiomDrawerModal.toast('Automation deleted', 'info');
        }
      }
    } catch (err) {
      console.error('[AutomationCenter] Delete error:', err);
    }
  }

  /**
   * Open Create Automation Modal
   */
  function openCreateModal() {
    const modalBox = document.getElementById('modalBox');
    const modalBackdrop = document.getElementById('modalBackdrop');
    if (!modalBox || !modalBackdrop) return;

    modalBox.innerHTML = `
      <div class="modal-header">
        <div class="modal-title">
          <span style="color:var(--cyan);margin-right:8px;">⚙️</span>
          Configure New Autonomous Workflow
        </div>
        <button class="drawer-close" onclick="AxiomDrawerModal.closeModal()">&times;</button>
      </div>
      <div class="modal-body">
        <div class="rs-form-group" style="margin-bottom:1rem;">
          <label class="rs-label">Automation Name</label>
          <input type="text" id="newAutoName" class="rs-input" placeholder="e.g. Daily Tokyo Stockout Alert">
        </div>

        <div class="rs-form-group" style="margin-bottom:1rem;">
          <label class="rs-label">Description / Purpose</label>
          <input type="text" id="newAutoDesc" class="rs-input" placeholder="e.g. Monitors forward room shortages and compiles executive buy orders">
        </div>

        <div class="rs-form-row-2" style="margin-bottom:1rem;">
          <div class="rs-form-group">
            <label class="rs-label">Trigger Type</label>
            <select id="newAutoType" class="rs-select" onchange="AxiomAutomation.onModalTypeChange(this.value)">
              <option value="SCHEDULED">Scheduled Recurring (Cron)</option>
              <option value="EVENT">Event-Driven Watchdog</option>
            </select>
          </div>
          <div class="rs-form-group" id="cronCadenceWrap">
            <label class="rs-label">Recurring Cadence</label>
            <select id="newAutoCron" class="rs-select">
              <option value="0 8 * * *">Daily at 08:00 AM</option>
              <option value="0 9 * * 1">Weekly on Monday at 09:00 AM</option>
              <option value="0 18 * * 5">Weekly on Friday at 06:00 PM</option>
              <option value="0 0 1 * *">Monthly on the 1st</option>
            </select>
          </div>
          <div class="rs-form-group" id="eventConditionWrap" style="display:none;">
            <label class="rs-label">Event Condition</label>
            <select id="newAutoEvent" class="rs-select">
              <option value="STOCKOUT_RISK">Demand Exceeds Stock by >300%</option>
              <option value="SUPPLIER_SLA_DROP">Wholesaler SLA Dips Below 92%</option>
            </select>
          </div>
        </div>

        <div class="rs-form-group" style="margin-bottom:1rem;">
          <label class="rs-label">Action to Execute</label>
          <select id="newAutoAction" class="rs-select">
            <option value="GENERATE_EXECUTIVE_DIGEST">Generate Executive Business Briefing</option>
            <option value="RUN_SOLVER_AND_EXPORT">Run LP Solver & Export Allocation Plan</option>
            <option value="TRIGGER_STOCKOUT_WORKFLOW">Generate Inventory Stockout Rapid Audit</option>
            <option value="MONITOR_SUPPLIER_SLA">Generate Supplier Performance Scorecard</option>
          </select>
        </div>

        <div class="rs-form-group" style="margin-bottom:1rem;">
          <label class="rs-label">Target Audience / Distribution</label>
          <input type="text" id="newAutoAudience" class="rs-input" value="Executive & Revenue Management Team">
        </div>
      </div>
      <div class="modal-footer" style="display:flex;justify-content:flex-end;gap:10px;">
        <button class="btn btn-outline" onclick="AxiomDrawerModal.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="AxiomAutomation.submitCreateAutomation()">Create & Activate Workflow</button>
      </div>
    `;

    modalBackdrop.style.display = 'flex';
  }

  function onModalTypeChange(type) {
    const cronWrap = document.getElementById('cronCadenceWrap');
    const eventWrap = document.getElementById('eventConditionWrap');
    if (type === 'SCHEDULED') {
      if (cronWrap) cronWrap.style.display = 'block';
      if (eventWrap) eventWrap.style.display = 'none';
    } else {
      if (cronWrap) cronWrap.style.display = 'none';
      if (eventWrap) eventWrap.style.display = 'block';
    }
  }

  async function submitCreateAutomation() {
    const name = document.getElementById('newAutoName')?.value?.trim();
    if (!name) {
      alert('Please enter a name for the automation.');
      return;
    }

    const desc = document.getElementById('newAutoDesc')?.value?.trim() || '';
    const type = document.getElementById('newAutoType')?.value || 'SCHEDULED';
    const cronExpression = document.getElementById('newAutoCron')?.value || '0 8 * * *';
    const cronLabel = document.getElementById('newAutoCron')?.options[document.getElementById('newAutoCron')?.selectedIndex]?.text || '';
    const eventType = document.getElementById('newAutoEvent')?.value || 'STOCKOUT_RISK';
    const action = document.getElementById('newAutoAction')?.value || 'GENERATE_EXECUTIVE_DIGEST';
    const targetAudience = document.getElementById('newAutoAudience')?.value || 'Executive Committee';

    try {
      const resp = await fetch('/api/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: desc,
          type,
          cronExpression,
          cronLabel,
          eventType,
          action,
          targetAudience,
          formats: ['pdf', 'xlsx'],
          active: true
        })
      });

      const data = await resp.json();
      if (data.success) {
        if (window.AxiomDrawerModal) {
          window.AxiomDrawerModal.closeModal();
          window.AxiomDrawerModal.toast('New automation schedule activated!', 'success');
        }
        await loadData();
      }
    } catch (err) {
      console.error('[AutomationCenter] Submit error:', err);
    }
  }

  return {
    renderAutomation,
    loadData,
    switchTab,
    toggleActive,
    runNow,
    deleteAuto,
    openCreateModal,
    onModalTypeChange,
    submitCreateAutomation
  };
})();
