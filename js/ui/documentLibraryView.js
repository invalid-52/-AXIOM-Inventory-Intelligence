/**
 * AXIOM INVENTORY INTELLIGENCE - DOCUMENT LIBRARY VIEW
 * Module: Document Management & Document Library (#sec-documents)
 * 
 * Features:
 * - Search by keyword, title, and author
 * - Category and format filters
 * - Document metadata (Title, Category, Period, Author, Created Date, Formats)
 * - Direct download buttons for physical PDF, DOCX, XLSX, PPTX, CSV files
 * - Interactive document preview modal
 * - Open in Report Studio for section editing
 * - Delete document action
 */

window.AxiomDocumentLibrary = (function() {
  'use strict';

  let allDocuments = [];
  let currentFilterCategory = 'all';
  let searchQuery = '';

  /**
   * Render the entire Document Library module
   */
  async function renderDocumentLibrary(containerEl) {
    if (!containerEl) containerEl = document.getElementById('documentLibraryContainer');
    if (!containerEl) return;

    containerEl.innerHTML = `
      <div class="dl-container">
        <!-- Header -->
        <div class="dl-header-bar">
          <div class="dl-header-info">
            <h2 class="dl-main-title">Enterprise Document Library</h2>
            <p class="dl-main-sub">Centralized repository of AI-synthesized procurement dossiers, operational reviews, and financial workbooks.</p>
          </div>
          <div class="dl-header-actions">
            <button class="btn btn-primary" onclick="AxiomNavigation.switchSection('report-studio')">
              <span>✦</span> CREATE NEW REPORT
            </button>
          </div>
        </div>

        <!-- KPI Strip -->
        <div class="dl-kpi-grid" id="dlKpiGrid">
          <div class="kpi-card">
            <div class="kpi-label">TOTAL GENERATED REPORTS</div>
            <div class="kpi-value cyan" id="dlStatTotal">--</div>
            <div class="kpi-sub">Across 12 Enterprise Templates</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">TOTAL STORAGE DEPLOYED</div>
            <div class="kpi-value" id="dlStatStorage">--</div>
            <div class="kpi-sub">PDF · DOCX · XLSX · PPTX · CSV</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">AUTONOMOUS RUNS</div>
            <div class="kpi-value green" id="dlStatAuto">--</div>
            <div class="kpi-sub">Via Persistent Scheduler</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">LATEST SYNTHESIS</div>
            <div class="kpi-value" id="dlStatLatest" style="font-size:1.1rem;margin-top:4px;">--</div>
            <div class="kpi-sub" id="dlStatLatestSub">Active Horizon</div>
          </div>
        </div>

        <!-- Filter & Search Toolbar -->
        <div class="dl-toolbar">
          <div class="dl-search-wrap">
            <span class="dl-search-icon">🔍</span>
            <input type="text" id="dlSearchInput" class="dl-search-input" placeholder="Search reports by title, keyword, property, destination..." oninput="AxiomDocumentLibrary.onSearchInput(this.value)">
          </div>
          <div class="dl-filters">
            <select id="dlCategorySelect" class="tb-select" onchange="AxiomDocumentLibrary.onCategoryChange(this.value)">
              <option value="all">All Categories</option>
              <option value="Executive Report">Executive Reports</option>
              <option value="Operations">Operations</option>
              <option value="Inventory">Inventory Intelligence</option>
              <option value="Forecasting">Forecasting</option>
              <option value="Procurement">Procurement</option>
              <option value="Suppliers">Supplier Intelligence</option>
              <option value="Finance">Financial Analysis</option>
              <option value="Risk">Risk Assessment</option>
              <option value="Strategic Planning">Strategic Planning</option>
            </select>
            <button class="btn btn-outline btn-sm" onclick="AxiomDocumentLibrary.loadDocuments()" title="Refresh Document List">
              🔄 Refresh
            </button>
          </div>
        </div>

        <!-- Documents Table / Grid -->
        <div class="card dl-card">
          <div class="card-header">
            <div class="card-title"><span class="card-title-icon">📂</span> Generated Documents Repository</div>
            <span class="chip info" id="dlDocumentCount">Loading...</span>
          </div>
          <div class="card-body" style="padding:0;">
            <div class="table-wrap">
              <table class="data-table" id="dlTable">
                <thead>
                  <tr>
                    <th>DOCUMENT TITLE & CATEGORY</th>
                    <th>HORIZON</th>
                    <th>AUTHOR / ENGINE</th>
                    <th>DATE GENERATED</th>
                    <th>AVAILABLE FORMATS</th>
                    <th style="text-align:right;">ACTIONS</th>
                  </tr>
                </thead>
                <tbody id="dlTableBody">
                  <tr><td colspan="6" style="text-align:center;padding:2rem;">Loading documents repository...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;

    await loadDocuments();
  }

  /**
   * Fetch documents from backend API
   */
  async function loadDocuments() {
    try {
      const resp = await fetch('/api/reports');
      const data = await resp.json();
      if (data.success && Array.isArray(data.reports)) {
        allDocuments = data.reports;
        updateStats();
        renderTable();
      }
    } catch (err) {
      console.error('[DocumentLibrary] Error fetching documents:', err);
      const tbody = document.getElementById('dlTableBody');
      if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--red);padding:2rem;">Failed to load documents: ${err.message}</td></tr>`;
    }
  }

  /**
   * Update top KPI stats
   */
  function updateStats() {
    const totalEl = document.getElementById('dlStatTotal');
    const storageEl = document.getElementById('dlStatStorage');
    const autoEl = document.getElementById('dlStatAuto');
    const latestEl = document.getElementById('dlStatLatest');
    const latestSubEl = document.getElementById('dlStatLatestSub');
    const countBadge = document.getElementById('dlDocumentCount');

    if (totalEl) totalEl.textContent = allDocuments.length;
    if (countBadge) countBadge.textContent = `${allDocuments.length} DOCUMENTS`;

    let totalBytes = 0;
    let autoCount = 0;
    allDocuments.forEach(d => {
      if ((d.author || '').toLowerCase().includes('auto')) autoCount++;
      if (d.formats) {
        Object.values(d.formats).forEach(f => {
          totalBytes += (f.sizeBytes || 0);
        });
      }
    });

    if (storageEl) {
      if (totalBytes > 1024 * 1024) {
        storageEl.textContent = `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
      } else {
        storageEl.textContent = `${Math.round(totalBytes / 1024)} KB`;
      }
    }

    if (autoEl) autoEl.textContent = `${autoCount} Scheduled`;

    if (latestEl && allDocuments.length > 0) {
      const latest = allDocuments[0];
      latestEl.textContent = (latest.title || 'Report').substring(0, 22) + '...';
      if (latestSubEl) latestSubEl.textContent = new Date(latest.createdAt).toLocaleDateString();
    }
  }

  /**
   * Render documents table based on search & filter
   */
  function renderTable() {
    const tbody = document.getElementById('dlTableBody');
    if (!tbody) return;

    let filtered = allDocuments;

    if (currentFilterCategory !== 'all') {
      filtered = filtered.filter(d => (d.category || '').toLowerCase() === currentFilterCategory.toLowerCase());
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(d =>
        (d.title || '').toLowerCase().includes(q) ||
        (d.summary || '').toLowerCase().includes(q) ||
        (d.author || '').toLowerCase().includes(q) ||
        (d.category || '').toLowerCase().includes(q)
      );
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:3rem;color:var(--text2);">No documents match current filters. Click "CREATE NEW REPORT" to generate a dossier.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(doc => {
      const formats = doc.formats || {};
      const dateStr = new Date(doc.createdAt).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });

      return `
        <tr>
          <td>
            <div class="dl-doc-title-cell">
              <span class="dl-doc-title" onclick="AxiomDocumentLibrary.previewDocument('${doc.id}')">${doc.title}</span>
              <span class="dl-category-pill">${doc.category || 'Executive Report'}</span>
            </div>
            <div class="dl-doc-summary">${(doc.summary || '').substring(0, 85)}...</div>
          </td>
          <td><span class="mono">${doc.period || '30 Days'}</span></td>
          <td><span class="dl-author-tag">${doc.author || 'AXIOM AI Engine'}</span></td>
          <td><span class="mono text-muted">${dateStr}</span></td>
          <td>
            <div class="dl-format-pills">
              ${formats.pdf ? `<a href="${formats.pdf.downloadUrl}" download class="fmt-pill-link pdf" title="Download PDF (${Math.round(formats.pdf.sizeBytes/1024)}KB)">PDF</a>` : ''}
              ${formats.docx ? `<a href="${formats.docx.downloadUrl}" download class="fmt-pill-link docx" title="Download Word (${Math.round(formats.docx.sizeBytes/1024)}KB)">DOCX</a>` : ''}
              ${formats.xlsx ? `<a href="${formats.xlsx.downloadUrl}" download class="fmt-pill-link xlsx" title="Download Excel (${Math.round(formats.xlsx.sizeBytes/1024)}KB)">XLSX</a>` : ''}
              ${formats.pptx ? `<a href="${formats.pptx.downloadUrl}" download class="fmt-pill-link pptx" title="Download PowerPoint (${Math.round(formats.pptx.sizeBytes/1024)}KB)">PPTX</a>` : ''}
              ${formats.csv ? `<a href="${formats.csv.downloadUrl}" download class="fmt-pill-link csv" title="Download CSV">CSV</a>` : ''}
            </div>
          </td>
          <td style="text-align:right;">
            <div class="dl-action-btns">
              <button class="btn btn-outline btn-sm" onclick="AxiomDocumentLibrary.previewDocument('${doc.id}')" title="Preview document in modal">👁 Preview</button>
              <button class="btn btn-outline btn-sm" onclick="AxiomDocumentLibrary.openInStudio('${doc.id}')" title="Open and edit in Report Studio">✎ Edit</button>
              <button class="btn btn-outline btn-sm btn-danger" onclick="AxiomDocumentLibrary.deleteDocument('${doc.id}')" title="Delete document">🗑</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  /**
   * Search input handler
   */
  function onSearchInput(val) {
    searchQuery = (val || '').trim();
    renderTable();
  }

  /**
   * Category filter handler
   */
  function onCategoryChange(cat) {
    currentFilterCategory = cat;
    renderTable();
  }

  /**
   * Interactive Document Preview Modal with Tabbed Views:
   * 1. Executive Narrative & Sections
   * 2. Procurement Action Schedule
   * 3. Native Embedded PDF Viewer
   */
  let currentPreviewDoc = null;

  function previewDocument(id) {
    const doc = allDocuments.find(d => d.id === id);
    if (!doc) return;
    currentPreviewDoc = doc;

    const modalBox = document.getElementById('modalBox');
    const modalBackdrop = document.getElementById('modalBackdrop');
    if (!modalBox || !modalBackdrop) return;

    modalBox.style.width = '1020px';
    modalBox.style.maxWidth = '96vw';
    modalBox.style.maxHeight = '90vh';

    const formats = doc.formats || {};
    const kpis = doc.kpis || doc.metrics || {};
    const decisions = Array.isArray(doc.decisions) && doc.decisions.length > 0
      ? doc.decisions
      : (doc.metrics && Array.isArray(doc.metrics.decisions) ? doc.metrics.decisions : []);

    const hasPdf = Boolean(formats.pdf && formats.pdf.downloadUrl);
    const hasDecisions = decisions.length > 0;

    modalBox.innerHTML = `
      <div class="modal-header" style="padding:1rem 1.4rem;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:1.4rem;">📑</span>
          <div>
            <div style="font-family:var(--syne);font-size:1.15rem;font-weight:700;color:var(--text);">${doc.title}</div>
            <div style="font-family:var(--mono);font-size:0.62rem;color:var(--text2);display:flex;gap:12px;margin-top:2px;">
              <span>CATEGORY: <strong style="color:var(--cyan);">${doc.category || 'Executive Report'}</strong></span>
              <span>HORIZON: <strong>${doc.period || 'Forward 30 Days'}</strong></span>
              <span>AUTHOR: <strong>${doc.author || 'AXIOM AI Engine'}</strong></span>
              <span>DATE: <strong>${new Date(doc.createdAt).toLocaleDateString()}</strong></span>
            </div>
          </div>
        </div>
        <button class="drawer-close" onclick="AxiomDrawerModal.closeModal()">&times;</button>
      </div>

      <!-- Quick Download Toolbar -->
      <div style="background:rgba(255,255,255,0.02);border-bottom:1px solid var(--border);padding:8px 1.4rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
        <div style="font-family:var(--mono);font-size:0.65rem;color:var(--text2);letter-spacing:0.05em;">
          DOWNLOAD ASSETS:
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${formats.pdf ? `<a href="${formats.pdf.downloadUrl}" download class="btn-download pdf" style="padding:4px 10px;font-size:0.65rem;border-radius:4px;background:rgba(239,68,68,0.15);color:#f87171;border:1px solid rgba(239,68,68,0.3);text-decoration:none;font-weight:600;" title="Download PDF Document">⬇ PDF (${Math.round((formats.pdf.sizeBytes||0)/1024)} KB)</a>` : ''}
          ${formats.xlsx ? `<a href="${formats.xlsx.downloadUrl}" download class="btn-download xlsx" style="padding:4px 10px;font-size:0.65rem;border-radius:4px;background:rgba(16,185,129,0.15);color:#34d399;border:1px solid rgba(16,185,129,0.3);text-decoration:none;font-weight:600;" title="Download Excel Spreadsheet with Native Formulas">⬇ XLSX (${Math.round((formats.xlsx.sizeBytes||0)/1024)} KB)</a>` : ''}
          ${formats.docx ? `<a href="${formats.docx.downloadUrl}" download class="btn-download docx" style="padding:4px 10px;font-size:0.65rem;border-radius:4px;background:rgba(59,130,246,0.15);color:#60a5fa;border:1px solid rgba(59,130,246,0.3);text-decoration:none;font-weight:600;" title="Download Microsoft Word Document">⬇ DOCX (${Math.round((formats.docx.sizeBytes||0)/1024)} KB)</a>` : ''}
          ${formats.pptx ? `<a href="${formats.pptx.downloadUrl}" download class="btn-download pptx" style="padding:4px 10px;font-size:0.65rem;border-radius:4px;background:rgba(249,115,22,0.15);color:#fb923c;border:1px solid rgba(249,115,22,0.3);text-decoration:none;font-weight:600;" title="Download PowerPoint Slides with Native Charts">⬇ PPTX (${Math.round((formats.pptx.sizeBytes||0)/1024)} KB)</a>` : ''}
          ${formats.csv ? `<a href="${formats.csv.downloadUrl}" download class="btn-download csv" style="padding:4px 10px;font-size:0.65rem;border-radius:4px;background:rgba(0,229,255,0.15);color:var(--cyan);border:1px solid rgba(0,229,255,0.3);text-decoration:none;font-weight:600;" title="Download Plain CSV Data">⬇ CSV</a>` : ''}
        </div>
      </div>

      <!-- Preview Navigation Tabs -->
      <div style="display:flex;gap:6px;border-bottom:1px solid var(--border);padding:8px 1.4rem;background:rgba(0,0,0,0.15);">
        <button class="tb-btn" id="dlTabBtn-narrative" onclick="AxiomDocumentLibrary.switchPreviewTab('narrative')" style="font-size:0.68rem;padding:5px 12px;background:var(--cyan);color:#080d1b;font-weight:700;">
          📄 Narrative Dossier
        </button>
        ${hasPdf ? `
          <button class="tb-btn btn-outline" id="dlTabBtn-pdf" onclick="AxiomDocumentLibrary.switchPreviewTab('pdf')" style="font-size:0.68rem;padding:5px 12px;">
            📑 Embedded PDF View
          </button>
        ` : ''}
        ${hasDecisions ? `
          <button class="tb-btn btn-outline" id="dlTabBtn-decisions" onclick="AxiomDocumentLibrary.switchPreviewTab('decisions')" style="font-size:0.68rem;padding:5px 12px;">
            📊 Decisions Matrix (${decisions.length})
          </button>
        ` : ''}
      </div>

      <!-- Modal Body Content -->
      <div class="modal-body" style="padding:1.4rem;max-height:64vh;overflow-y:auto;">
        
        <!-- Tab 1: Executive Narrative -->
        <div id="dlTabPane-narrative">
          <!-- KPI Summary Strip -->
          <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:1.4rem;gap:10px;">
            <div class="kpi-card" style="padding:10px 14px;">
              <div class="kpi-label">TOTAL ALLOCATION</div>
              <div class="kpi-value cyan" style="font-size:1.15rem;">$${((kpis.allocatedBudgetUSD || kpis.totalSpend || 1129125)).toLocaleString()}</div>
              <div class="kpi-sub">Wholesale Capital Deployed</div>
            </div>
            <div class="kpi-card" style="padding:10px 14px;">
              <div class="kpi-label">FORECAST REVENUE</div>
              <div class="kpi-value green" style="font-size:1.15rem;">$${((kpis.forecastRevenueUSD || kpis.totalRevenue || 2301330)).toLocaleString()}</div>
              <div class="kpi-sub">Projected Turnover</div>
            </div>
            <div class="kpi-card" style="padding:10px 14px;">
              <div class="kpi-label">NET PROFIT CONTRIBUTION</div>
              <div class="kpi-value green" style="font-size:1.15rem;">+$${((kpis.expectedProfitUSD || kpis.netProfit || 1172205)).toLocaleString()}</div>
              <div class="kpi-sub">Net Margin Impact</div>
            </div>
            <div class="kpi-card" style="padding:10px 14px;">
              <div class="kpi-label">PORTFOLIO GROSS MARGIN</div>
              <div class="kpi-value cyan" style="font-size:1.15rem;">${((kpis.portfolioMarginPct || kpis.portfolioGrossMarginPct || 50.9)).toFixed(1)}%</div>
              <div class="kpi-sub">Margin Efficiency</div>
            </div>
          </div>

          <!-- Structured Sections -->
          <div class="modal-sections-wrap">
            ${(doc.sections || []).map((sec, idx) => {
              const formattedContent = window.AxiomSanitizer 
                ? window.AxiomSanitizer.safeMarkdownToHTML(sec.content) 
                : sec.content.split('\n\n').map(p => `<p style="margin-bottom:0.7rem;line-height:1.6;">${p.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>`).join('');

              return `
                <div class="card" style="margin-bottom:1rem;background:rgba(18,28,54,0.4);">
                  <div class="card-header" style="padding:0.6rem 1rem;">
                    <div class="card-title" style="font-size:0.85rem;color:var(--cyan);font-weight:700;">
                      <span style="font-family:var(--mono);color:var(--text3);margin-right:6px;">0${idx + 1}.</span>
                      ${sec.title}
                    </div>
                  </div>
                  <div class="card-body" style="padding:1rem;font-size:0.82rem;line-height:1.6;color:var(--text);">
                    ${formattedContent}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Tab 2: Embedded PDF View -->
        ${hasPdf ? `
          <div id="dlTabPane-pdf" style="display:none;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
              <div style="font-family:var(--mono);font-size:0.65rem;color:var(--text2);">
                RENDERED ARTIFACT: <strong>${formats.pdf.filename}</strong> (${Math.round((formats.pdf.sizeBytes||0)/1024)} KB)
              </div>
              <a href="${formats.pdf.downloadUrl}" target="_blank" class="btn btn-outline btn-sm" style="font-size:0.65rem;padding:3px 10px;text-decoration:none;">
                ↗ Open PDF in Dedicated Tab
              </a>
            </div>
            <iframe src="${formats.pdf.downloadUrl}#toolbar=1" style="width:100%;height:580px;border:1px solid var(--border);border-radius:var(--radius-sm);background:#1a202c;"></iframe>
          </div>
        ` : ''}

        <!-- Tab 3: Decisions Matrix -->
        ${hasDecisions ? `
          <div id="dlTabPane-decisions" style="display:none;">
            <div class="table-wrap" style="max-height:540px;overflow-y:auto;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Property / Hotel</th>
                    <th>Destination</th>
                    <th>Room Type</th>
                    <th>Supplier</th>
                    <th>Units</th>
                    <th>Allocated Spend</th>
                    <th>Expected Profit</th>
                    <th>Risk</th>
                  </tr>
                </thead>
                <tbody>
                  ${decisions.map(d => {
                    const isBuy = (d.action || '').toUpperCase().includes('BUY');
                    const badgeClass = isBuy ? 'buy' : 'maintain';
                    return `
                      <tr>
                        <td><span class="action-badge ${badgeClass}">${d.action || 'HOLD'}</span></td>
                        <td style="font-weight:600;color:var(--text);">${d.propertyName || ''}</td>
                        <td style="font-family:var(--mono);font-size:0.65rem;">${d.destinationName || ''}</td>
                        <td style="font-size:0.72rem;color:var(--text2);">${d.roomType || ''}</td>
                        <td style="font-family:var(--mono);font-size:0.65rem;">${d.supplierName || ''}</td>
                        <td style="font-family:var(--mono);font-weight:700;color:${isBuy ? 'var(--green)' : 'var(--text)'};">+${d.recommendedPurchaseQty || 0}</td>
                        <td style="font-family:var(--mono);">$${((d.allocatedBudgetUSD || 0)).toLocaleString()}</td>
                        <td style="font-family:var(--mono);font-weight:700;color:var(--green);">+$${((d.expectedProfitUSD || 0)).toLocaleString()}</td>
                        <td><span style="font-family:var(--mono);font-size:0.62rem;color:${d.riskScore > 35 ? 'var(--amber)' : 'var(--cyan)'};">${d.riskScore || 0}/100</span></td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        ` : ''}

      </div>

      <!-- Modal Footer -->
      <div class="modal-footer" style="padding:0.8rem 1.4rem;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
        <div style="display:flex;gap:8px;">
          <button class="btn btn-outline btn-sm" onclick="AxiomDocumentLibrary.openInStudio('${doc.id}')">
            ✎ Open in Report Studio
          </button>
          <button class="btn btn-outline btn-sm" onclick="window.print()">
            🖨 Print / Save Page
          </button>
        </div>
        <button class="btn btn-primary btn-sm" onclick="AxiomDrawerModal.closeModal()">
          Close Preview
        </button>
      </div>
    `;

    modalBackdrop.style.display = 'flex';
    modalBackdrop.classList.add('active');
  }

  /**
   * Switch active tab in Document Preview Modal
   */
  function switchPreviewTab(tabKey) {
    const tabs = ['narrative', 'pdf', 'decisions'];
    tabs.forEach(t => {
      const pane = document.getElementById(`dlTabPane-${t}`);
      const btn = document.getElementById(`dlTabBtn-${t}`);
      if (pane) pane.style.display = (t === tabKey) ? 'block' : 'none';
      if (btn) {
        if (t === tabKey) {
          btn.style.background = 'var(--cyan)';
          btn.style.color = '#080d1b';
          btn.style.fontWeight = '700';
          btn.classList.remove('btn-outline');
        } else {
          btn.style.background = 'transparent';
          btn.style.color = 'var(--text2)';
          btn.style.fontWeight = 'normal';
          btn.classList.add('btn-outline');
        }
      }
    });
  }

  /**
   * Open document in Report Studio
   */
  function openInStudio(id) {
    const doc = allDocuments.find(d => d.id === id);
    if (!doc) return;

    if (window.AxiomDrawerModal) window.AxiomDrawerModal.closeModal();
    if (window.AxiomReportStudio) window.AxiomReportStudio.setReport(doc);
    if (window.AxiomNavigation) window.AxiomNavigation.switchSection('report-studio');
  }

  /**
   * Delete document
   */
  async function deleteDocument(id) {
    if (!confirm('Are you sure you want to permanently delete this document and all associated binary files?')) {
      return;
    }

    try {
      const resp = await fetch(`/api/reports/${id}`, { method: 'DELETE' });
      const data = await resp.json();
      if (data.success) {
        allDocuments = allDocuments.filter(d => d.id !== id);
        updateStats();
        renderTable();
        if (window.AxiomDrawerModal) {
          window.AxiomDrawerModal.toast('Document permanently deleted', 'info');
        }
      }
    } catch (err) {
      console.error('[DocumentLibrary] Delete error:', err);
    }
  }

  return {
    renderDocumentLibrary,
    loadDocuments,
    onSearchInput,
    onCategoryChange,
    previewDocument,
    switchPreviewTab,
    openInStudio,
    deleteDocument
  };
})();
