/**
 * AXIOM INVENTORY INTELLIGENCE - REPORT STUDIO VIEW
 * Module: Interactive AI Report Generation Studio (#sec-report-studio)
 * 
 * Features:
 * - 12 Enterprise Report Templates selector
 * - Parameter controls (Horizon, Destination, Supplier, Tone, Formats)
 * - 7-Stage Multi-Agent Animated Progress Timeline
 * - Live Document Viewer & Section Editor
 * - In-place AI Rewriting ("✦ Rewrite for C-Suite", "✦ Expand Analysis", etc.)
 * - Physical Binary Downloads (PDF, DOCX, XLSX, PPTX, CSV)
 */

window.AxiomReportStudio = (function() {
  'use strict';

  let currentReport = null;
  let selectedTemplateId = 'EXECUTIVE_BRIEF';
  let isGenerating = false;

  // Catalog of 12 Enterprise Report Templates
  const TEMPLATES = [
    { id: 'EXECUTIVE_BRIEF', title: 'Executive Business Briefing', category: 'Executive', icon: '📊', badge: 'C-SUITE', desc: 'High-level synthesis of capital allocation, net profit impact, critical stockout alerts, and strategic procurement mandates.' },
    { id: 'MONTHLY_OPERATIONS', title: 'Monthly Operations Review', category: 'Operations', icon: '📅', badge: 'MONTHLY', desc: '30-day review of allotment fulfillment, booking velocity by market, wholesaler SLA compliance, and budget variance.' },
    { id: 'INVENTORY_PERF', title: 'Inventory Performance & Stockout Analysis', category: 'Inventory', icon: '▦', badge: 'UTILIZATION', desc: 'Property-level analysis of sell-through efficiency, under-provisioned allotments, unsold room decay risks, and holding costs.' },
    { id: 'DEMAND_FORECAST', title: 'Demand Forecast & Velocity Analysis', category: 'Forecasting', icon: '📈', badge: 'HOLT-WINTERS', desc: 'Forward-looking demand projections across 12 markets, Holt-Winters trend/seasonality decomposition, booking pace pickup, and confidence bounds.' },
    { id: 'PROCUREMENT_PLAN', title: 'Procurement Optimization Plan', category: 'Procurement', icon: '⚡', badge: 'LP SOLVER', desc: 'Optimal linear programming procurement plan maximizing net margin within budget, risk, and supplier allotment constraints.' },
    { id: 'SUPPLIER_SCORECARD', title: 'Supplier Performance & SLA Scorecard', category: 'Suppliers', icon: '🤝', badge: 'WHOLESALER SLA', desc: 'Performance ranking of top bedbanks (Hotelbeds, WebBeds, Travco, etc.) across fulfillment rate, pricing advantage, and SLA reliability.' },
    { id: 'FINANCIAL_IMPACT', title: 'Financial Impact & Margin Assessment', category: 'Finance', icon: '💰', badge: 'ROI & P&L', desc: 'Comprehensive P&L assessment: projected gross revenue, wholesale cost of goods, net profit contribution, and return on invested capital.' },
    { id: 'RISK_MITIGATION', title: 'Risk Assessment & Mitigation Plan', category: 'Risk', icon: '🛡️', badge: 'RISK AUDIT', desc: 'In-depth audit of portfolio vulnerabilities: imminent inventory shortages, supplier concentration risks, holding losses, and hedging tactics.' },
    { id: 'DESTINATION_DOSSIER', title: 'Destination Intelligence Dossier', category: 'Market Intelligence', icon: '◎', badge: 'DEEP DIVE', desc: 'Deep analytical profile of prioritized travel hubs (Tokyo, Maldives, Paris, Dubai, Bali) covering ADR trends, booking velocity, and occupancy.' },
    { id: 'SCENARIO_ANALYSIS', title: 'Scenario Analysis & Stress Test', category: 'Simulation', icon: '⟐', badge: 'MONTE CARLO', desc: 'What-if simulation examining business impact under demand surges (+30%), macro shocks (-20%), supplier rate increases (+15%), and capacity squeezes.' },
    { id: 'MANAGEMENT_SUMMARY', title: 'Management Summary & Action Items', category: 'Management', icon: '📋', badge: 'ACTION ITEMS', desc: 'Clear, execution-focused operational roadmap with assignable action items, deadlines, priority levels, and anticipated financial outcomes.' },
    { id: 'ANNUAL_STRATEGY', title: 'Annual Procurement Strategy & Budget Review', category: 'Strategic Planning', icon: '🏆', badge: '12-MONTH PLAN', desc: 'Long-term strategic blueprint for annual travel inventory procurement, wholesale contract negotiations, capacity expansion, and capital budgeting.' }
  ];

  /**
   * Render the entire Report Studio Module
   */
  function renderReportStudio(containerEl) {
    if (!containerEl) containerEl = document.getElementById('reportStudioContainer');
    if (!containerEl) return;

    const data = window.AxiomData || {};
    const destinations = data.DESTINATIONS || [];
    const suppliers = data.SUPPLIERS || [];

    containerEl.innerHTML = `
      <div class="rs-container">
        <!-- Top Control Bar -->
        <div class="rs-header-bar">
          <div class="rs-header-info">
            <h2 class="rs-main-title">AI Report Generation Studio</h2>
            <p class="rs-main-sub">Generate board-level procurement dossiers, operational reviews, and financial analyses in 5 native formats.</p>
          </div>
          <div class="rs-header-badges">
            <span class="chip ok">12 TEMPLATES</span>
            <span class="chip live">7-AGENT PIPELINE</span>
            <span class="chip info">PDF · DOCX · XLSX · PPTX · CSV</span>
          </div>
        </div>

        <!-- Studio Grid Layout -->
        <div class="rs-grid">
          <!-- Left Column: Template Selection & Config -->
          <div class="rs-config-pane">
            <div class="card rs-card">
              <div class="card-header">
                <div class="card-title"><span class="card-title-icon">📑</span> Select Report Template</div>
                <span class="chip info" id="selectedTemplateBadge">EXECUTIVE BRIEF</span>
              </div>
              <div class="card-body">
                <!-- Template Grid -->
                <div class="template-selector-grid" id="templateGrid">
                  ${TEMPLATES.map(t => `
                    <div class="template-card ${t.id === selectedTemplateId ? 'selected' : ''}" onclick="AxiomReportStudio.selectTemplate('${t.id}')">
                      <div class="template-icon">${t.icon}</div>
                      <div class="template-details">
                        <div class="template-header">
                          <span class="template-name">${t.title}</span>
                          <span class="template-badge">${t.badge}</span>
                        </div>
                        <div class="template-desc">${t.desc}</div>
                      </div>
                    </div>
                  `).join('')}
                </div>

                <!-- Parameters Box -->
                <div class="rs-parameters-box">
                  <div class="rs-param-title">REPORT PARAMETERS & CONSTRAINTS</div>
                  
                  <div class="rs-form-row">
                    <div class="rs-form-group">
                      <label class="rs-label">Report Title (Optional Override)</label>
                      <input type="text" id="rsReportTitle" class="rs-input" placeholder="e.g. Q4 Executive Procurement Blueprint">
                    </div>
                  </div>

                  <div class="rs-form-row-2">
                    <div class="rs-form-group">
                      <label class="rs-label">Planning Horizon</label>
                      <select id="rsHorizon" class="rs-select">
                        <option value="7">7 Days (Tactical)</option>
                        <option value="14">14 Days (Bi-Weekly)</option>
                        <option value="30" selected>30 Days (Monthly Standard)</option>
                        <option value="60">60 Days (Forward Rolling)</option>
                        <option value="90">90 Days (Quarterly Strategy)</option>
                      </select>
                    </div>
                    <div class="rs-form-group">
                      <label class="rs-label">Destination Filter</label>
                      <select id="rsDestination" class="rs-select">
                        <option value="all">Global Portfolio (All 12 Destinations)</option>
                        ${destinations.map(d => `<option value="${d.id}">${d.name} (${d.country})</option>`).join('')}
                      </select>
                    </div>
                  </div>

                  <div class="rs-form-row-2">
                    <div class="rs-form-group">
                      <label class="rs-label">Analytical Tone</label>
                      <select id="rsTone" class="rs-select">
                        <option value="Executive & Decisive" selected>Executive & Decisive (C-Suite / Board)</option>
                        <option value="Analytical & Quantitative">Analytical & Quantitative (Operations Research)</option>
                        <option value="Operational & Tactical">Operational & Tactical (Procurement Team)</option>
                        <option value="Strategic & Long-Term">Strategic & Long-Term (Planning Committee)</option>
                      </select>
                    </div>
                    <div class="rs-form-group">
                      <label class="rs-label">Detail Depth</label>
                      <select id="rsDetail" class="rs-select">
                        <option value="Executive Briefing">Executive Briefing (2-3 Pages)</option>
                        <option value="Standard Comprehensive" selected>Standard Comprehensive (5-7 Pages)</option>
                        <option value="In-Depth Technical Dossier">In-Depth Technical Dossier (All Tables)</option>
                      </select>
                    </div>
                  </div>

                  <!-- Formats Checkboxes -->
                  <div class="rs-formats-row">
                    <label class="rs-label">Output Formats to Compile:</label>
                    <div class="rs-format-checkboxes">
                      <label class="format-check"><input type="checkbox" id="fmtPdf" checked> <span class="fmt-pill pdf">PDF</span></label>
                      <label class="format-check"><input type="checkbox" id="fmtDocx" checked> <span class="fmt-pill docx">Word (.docx)</span></label>
                      <label class="format-check"><input type="checkbox" id="fmtXlsx" checked> <span class="fmt-pill xlsx">Excel (.xlsx)</span></label>
                      <label class="format-check"><input type="checkbox" id="fmtPptx" checked> <span class="fmt-pill pptx">PowerPoint (.pptx)</span></label>
                      <label class="format-check"><input type="checkbox" id="fmtCsv" checked> <span class="fmt-pill csv">CSV Data</span></label>
                    </div>
                  </div>

                  <!-- Generate Action Button -->
                  <button class="btn btn-primary rs-generate-btn" id="rsGenerateBtn" onclick="AxiomReportStudio.generateReport()">
                    <span class="btn-sparkle">✦</span> GENERATE ENTERPRISE REPORT
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Column: Generation Pipeline & Live Document Preview / Editor -->
          <div class="rs-preview-pane">
            <!-- Multi-Agent Animated Pipeline Timeline -->
            <div class="card rs-pipeline-card" id="rsPipelineCard" style="display:none;">
              <div class="card-header">
                <div class="card-title"><span class="card-title-icon">⚙️</span> Multi-Agent Synthesis Pipeline</div>
                <span class="chip live" id="rsPipelineStatus">RUNNING</span>
              </div>
              <div class="card-body">
                <div class="agent-timeline" id="agentTimeline">
                  <div class="timeline-step" id="step1"><span class="step-num">1</span> <span class="step-text">Data Validation (Data Analyst)</span></div>
                  <div class="timeline-step" id="step2"><span class="step-num">2</span> <span class="step-text">Demand Velocity Model (Forecasting Analyst)</span></div>
                  <div class="timeline-step" id="step3"><span class="step-num">3</span> <span class="step-text">LP Capital Allocation (Procurement Strategist)</span></div>
                  <div class="timeline-step" id="step4"><span class="step-num">4</span> <span class="step-text">Stockout & Holding Audit (Risk Analyst)</span></div>
                  <div class="timeline-step" id="step5"><span class="step-num">5</span> <span class="step-text">Narrative Synthesis (Report Generator)</span></div>
                  <div class="timeline-step" id="step6"><span class="step-num">6</span> <span class="step-text">C-Suite Briefing Polish (Executive Assistant)</span></div>
                  <div class="timeline-step" id="step7"><span class="step-num">7</span> <span class="step-text">5-Format Binary Assembly (Workflow Orchestrator)</span></div>
                </div>
              </div>
            </div>

            <!-- Live Document Viewer & Section Editor -->
            <div class="card rs-doc-viewer" id="rsDocViewer">
              <div class="card-header">
                <div class="card-title" id="rsViewerTitle"><span class="card-title-icon">📄</span> Document Preview & Section Editor</div>
                <div class="rs-viewer-actions" id="rsViewerActions"></div>
              </div>
              <div class="card-body" id="rsDocBody">
                <div class="rs-placeholder">
                  <div class="rs-placeholder-icon">📑</div>
                  <h3>No Report Loaded in Active View</h3>
                  <p>Select a template on the left and click <strong>"GENERATE ENTERPRISE REPORT"</strong> to run the multi-agent synthesis pipeline, or load a generated document from the Document Library.</p>
                  <button class="btn btn-outline" onclick="AxiomReportStudio.loadLatestReport()">Load Latest Report</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Attempt to load latest report if any exists
    loadLatestReport();
  }

  /**
   * Template selection handler
   */
  function selectTemplate(templateId) {
    selectedTemplateId = templateId;
    const t = TEMPLATES.find(x => x.id === templateId);
    if (!t) return;

    const badgeEl = document.getElementById('selectedTemplateBadge');
    if (badgeEl) badgeEl.textContent = t.badge;

    document.querySelectorAll('.template-card').forEach(card => {
      card.classList.remove('selected');
    });

    const activeEl = event ? event.currentTarget : null;
    if (activeEl) activeEl.classList.add('selected');
  }

  /**
   * Run the multi-agent report generation pipeline
   */
  async function generateReport() {
    if (isGenerating) return;
    isGenerating = true;

    const generateBtn = document.getElementById('rsGenerateBtn');
    const pipelineCard = document.getElementById('rsPipelineCard');
    const pipelineStatus = document.getElementById('rsPipelineStatus');

    if (generateBtn) {
      generateBtn.disabled = true;
      generateBtn.innerHTML = `<span class="spinner-small"></span> GENERATING PIPELINE...`;
    }
    if (pipelineCard) pipelineCard.style.display = 'block';

    // Collect options
    const titleVal = document.getElementById('rsReportTitle')?.value?.trim();
    const horizonDays = parseInt(document.getElementById('rsHorizon')?.value || '30', 10);
    const destinationId = document.getElementById('rsDestination')?.value || 'all';
    const tone = document.getElementById('rsTone')?.value || 'Executive & Decisive';
    const detailLevel = document.getElementById('rsDetail')?.value || 'Standard Comprehensive';

    const formats = [];
    if (document.getElementById('fmtPdf')?.checked) formats.push('pdf');
    if (document.getElementById('fmtDocx')?.checked) formats.push('docx');
    if (document.getElementById('fmtXlsx')?.checked) formats.push('xlsx');
    if (document.getElementById('fmtPptx')?.checked) formats.push('pptx');
    if (document.getElementById('fmtCsv')?.checked) formats.push('csv');
    if (formats.length === 0) formats.push('pdf', 'xlsx');

    // Reset the 7 steps
    const stepIds = ['step1', 'step2', 'step3', 'step4', 'step5', 'step6', 'step7'];
    stepIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.className = 'timeline-step';
    });

    try {
      const appState = window.AxiomApp ? window.AxiomApp.getState() : {};
      const clientContext = {
        totalBudgetUSD: appState.optimizationResults?.portfolio?.totalBudgetUSD || 1500000,
        allocatedBudgetUSD: appState.optimizationResults?.portfolio?.budgetUtilizedUSD || 1129125,
        forecastRevenueUSD: appState.optimizationResults?.portfolio?.totalProjectedRevenueUSD || 2301330,
        expectedProfitUSD: appState.optimizationResults?.portfolio?.totalProjectedProfitUSD || 1172205,
        portfolioMarginPct: appState.optimizationResults?.portfolio?.portfolioGrossMarginPct || 50.9,
        decisions: appState.optimizationResults?.decisions || []
      };

      // 1. Kick off real backend Multi-Agent pipeline
      const pipelinePromise = fetch('/api/agents/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplateId,
          parameters: { totalBudgetUSD: clientContext.totalBudgetUSD, horizonDays },
          clientData: clientContext
        })
      }).then(r => r.json()).catch(err => ({ success: false, error: err.message }));

      // 2. Kick off document generator
      const reportPromise = fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplateId,
          title: titleVal,
          horizonDays,
          destinationId,
          tone,
          detailLevel,
          formats,
          clientContext
        })
      }).then(r => r.json());

      // Progressively animate the steps while the requests process
      for (let i = 0; i < stepIds.length; i++) {
        const el = document.getElementById(stepIds[i]);
        if (el) el.className = 'timeline-step active';
        await new Promise(r => setTimeout(r, 120));
        if (el) el.className = 'timeline-step done';
      }

      const [pipeResult, result] = await Promise.all([pipelinePromise, reportPromise]);

      // Apply real measured durations from orchestrator telemetry
      if (pipeResult && pipeResult.pipeline && Array.isArray(pipeResult.pipeline.steps)) {
        pipeResult.pipeline.steps.forEach((st, idx) => {
          if (idx < stepIds.length) {
            const stepEl = document.getElementById(stepIds[idx]);
            if (stepEl) {
              const textEl = stepEl.querySelector('.step-text');
              if (textEl) {
                textEl.innerHTML = `${st.name} <span style="font-family:var(--mono);font-size:0.56rem;color:var(--cyan);font-weight:600;">(${st.durationMs}ms)</span>`;
              }
            }
          }
        });
      }

      if (pipelineStatus) {
        pipelineStatus.textContent = 'COMPLETED';
        pipelineStatus.className = 'chip ok';
      }

      if (result.success && result.report) {
        currentReport = result.report;
        renderDocumentPreview(currentReport);
        if (window.AxiomDrawerModal) {
          window.AxiomDrawerModal.toast(`Report generated successfully in ${formats.length} formats!`, 'success');
        }
      } else {
        throw new Error(result.error || 'Report generation failed');
      }
    } catch (err) {
      console.error('[ReportStudio] Generation error:', err);
      if (window.AxiomDrawerModal) {
        window.AxiomDrawerModal.toast(`Error generating report: ${err.message}`, 'error');
      }
    } finally {
      isGenerating = false;
      if (generateBtn) {
        generateBtn.disabled = false;
        generateBtn.innerHTML = `<span class="btn-sparkle">✦</span> GENERATE ENTERPRISE REPORT`;
      }
      setTimeout(() => {
        if (pipelineCard) pipelineCard.style.display = 'none';
      }, 5000);
    }
  }

  /**
   * Render the live Document Preview & Interactive Section Editor
   */
  function renderDocumentPreview(report) {
    const bodyEl = document.getElementById('rsDocBody');
    const actionsEl = document.getElementById('rsViewerActions');
    const titleEl = document.getElementById('rsViewerTitle');
    if (!bodyEl) return;

    if (titleEl) {
      titleEl.innerHTML = `<span class="card-title-icon">📄</span> ${report.title}`;
    }

    // Top Download Actions Bar
    if (actionsEl) {
      const formats = report.formats || {};
      actionsEl.innerHTML = `
        <div class="doc-download-bar">
          <span class="download-label">DOWNLOAD:</span>
          ${formats.pdf ? `<a href="${formats.pdf.downloadUrl}" download class="btn-download pdf" title="Download PDF document">⬇ PDF (${Math.round(formats.pdf.sizeBytes/1024)}KB)</a>` : ''}
          ${formats.docx ? `<a href="${formats.docx.downloadUrl}" download class="btn-download docx" title="Download Word document">⬇ DOCX (${Math.round(formats.docx.sizeBytes/1024)}KB)</a>` : ''}
          ${formats.xlsx ? `<a href="${formats.xlsx.downloadUrl}" download class="btn-download xlsx" title="Download Excel workbook">⬇ XLSX (${Math.round(formats.xlsx.sizeBytes/1024)}KB)</a>` : ''}
          ${formats.pptx ? `<a href="${formats.pptx.downloadUrl}" download class="btn-download pptx" title="Download PowerPoint deck">⬇ PPTX (${Math.round(formats.pptx.sizeBytes/1024)}KB)</a>` : ''}
          ${formats.csv ? `<a href="${formats.csv.downloadUrl}" download class="btn-download csv" title="Download CSV data">⬇ CSV</a>` : ''}
        </div>
      `;
    }

    // Body: Metadata Strip + KPI Cards + Interactive Sections
    const kpis = report.kpis || {};
    bodyEl.innerHTML = `
      <div class="doc-preview-wrapper">
        <!-- Metadata Header -->
        <div class="doc-meta-strip">
          <div class="meta-item"><span class="meta-label">CATEGORY:</span> <span class="meta-val">${report.category || 'Strategic Report'}</span></div>
          <div class="meta-item"><span class="meta-label">HORIZON:</span> <span class="meta-val">${report.period || 'Forward 30 Days'}</span></div>
          <div class="meta-item"><span class="meta-label">AUTHOR:</span> <span class="meta-val">${report.author || 'AXIOM Autonomous AI'}</span></div>
          <div class="meta-item"><span class="meta-label">GENERATED:</span> <span class="meta-val">${new Date(report.createdAt).toLocaleString()}</span></div>
        </div>

        <!-- KPI Strip -->
        <div class="doc-kpi-strip">
          <div class="doc-kpi-card">
            <div class="doc-kpi-label">COMMITTED CAPITAL</div>
            <div class="doc-kpi-val">$${Math.round(kpis.allocatedBudgetUSD || 1129125).toLocaleString()}</div>
          </div>
          <div class="doc-kpi-card">
            <div class="doc-kpi-label">PROJECTED REVENUE</div>
            <div class="doc-kpi-val">$${Math.round(kpis.forecastRevenueUSD || 2301330).toLocaleString()}</div>
          </div>
          <div class="doc-kpi-card">
            <div class="doc-kpi-label">NET PROFIT CONTRIBUTION</div>
            <div class="doc-kpi-val green">+$${Math.round(kpis.expectedProfitUSD || 1172205).toLocaleString()}</div>
          </div>
          <div class="doc-kpi-card">
            <div class="doc-kpi-label">PORTFOLIO GROSS MARGIN</div>
            <div class="doc-kpi-val cyan">${(kpis.portfolioMarginPct || 50.9).toFixed(1)}%</div>
          </div>
        </div>

        <!-- Section Editor List -->
        <div class="doc-sections-list">
          ${(report.sections || []).map((sec, idx) => `
            <div class="doc-section-card" id="secCard_${idx}">
              <div class="section-card-header">
                <div class="section-title-wrap">
                  <span class="section-idx">0${idx + 1}</span>
                  <span class="section-title">${sec.title || 'Analysis Section'}</span>
                </div>
                <div class="section-ai-actions">
                  <button class="btn-ai-action" onclick="AxiomReportStudio.rewriteSection(${idx}, 'Make more concise and impactful for executive leadership')">✦ Rewrite for C-Suite</button>
                  <button class="btn-ai-action" onclick="AxiomReportStudio.rewriteSection(${idx}, 'Expand with deeper quantitative data, percentages, and financial impacts')">✦ Expand Analysis</button>
                  <button class="btn-ai-action" onclick="AxiomReportStudio.toggleEditSection(${idx})">✎ Edit Text</button>
                </div>
              </div>
              <div class="section-card-body" id="secBody_${idx}">
                <div class="section-markdown-preview">${formatMarkdown(sec.content)}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Helper: Format basic markdown securely into sanitized HTML
   */
  function formatMarkdown(text) {
    if (!text) return '';
    if (window.AxiomSanitizer && window.AxiomSanitizer.safeMarkdownToHTML) {
      return window.AxiomSanitizer.safeMarkdownToHTML(text);
    }
    return String(text).replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /**
   * Toggle inline editing for a section
   */
  function toggleEditSection(idx) {
    const bodyEl = document.getElementById(`secBody_${idx}`);
    if (!bodyEl || !currentReport || !currentReport.sections[idx]) return;

    const isEditing = bodyEl.querySelector('textarea') !== null;
    if (isEditing) {
      // Save changes
      const updatedText = bodyEl.querySelector('textarea').value;
      saveSection(idx, updatedText);
    } else {
      // Switch to textarea editor
      const rawText = currentReport.sections[idx].content;
      bodyEl.innerHTML = `
        <div class="section-edit-wrap">
          <textarea class="section-textarea" id="textarea_${idx}" rows="8">${rawText}</textarea>
          <div class="section-edit-actions">
            <button class="btn btn-primary btn-sm" onclick="AxiomReportStudio.saveSection(${idx}, document.getElementById('textarea_${idx}').value)">Save & Recompile All 5 Formats</button>
            <button class="btn btn-outline btn-sm" onclick="AxiomReportStudio.renderDocumentPreview(AxiomReportStudio.getCurrentReport())">Cancel</button>
          </div>
        </div>
      `;
    }
  }

  /**
   * Save updated section to backend and update current view
   */
  async function saveSection(idx, updatedContent) {
    if (!currentReport) return;
    try {
      const resp = await fetch(`/api/reports/${currentReport.id}/sections/${idx}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: updatedContent })
      });
      const data = await resp.json();
      if (data.success && data.report) {
        currentReport = data.report;
        renderDocumentPreview(currentReport);
        if (window.AxiomDrawerModal) {
          window.AxiomDrawerModal.toast('Section updated & binary files re-compiled!', 'success');
        }
      }
    } catch (err) {
      console.error('[ReportStudio] Error updating section:', err);
    }
  }

  /**
   * AI rewrite section action
   */
  async function rewriteSection(idx, instruction) {
    if (!currentReport) return;
    const bodyEl = document.getElementById(`secBody_${idx}`);
    if (bodyEl) {
      bodyEl.innerHTML = `<div class="ai-rewriting-spin"><span class="spinner-small"></span> AI Agent Rewriting Section...</div>`;
    }

    try {
      const resp = await fetch(`/api/reports/${currentReport.id}/ai-rewrite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionIndex: idx, instruction })
      });
      const data = await resp.json();
      if (data.success && data.report) {
        currentReport = data.report;
        renderDocumentPreview(currentReport);
        if (window.AxiomDrawerModal) {
          window.AxiomDrawerModal.toast('Section rewritten with grounded data & recompiled!', 'success');
        }
      }
    } catch (err) {
      console.error('[ReportStudio] Error rewriting section:', err);
      renderDocumentPreview(currentReport);
    }
  }

  /**
   * Load latest generated report from database
   */
  async function loadLatestReport() {
    try {
      const resp = await fetch('/api/reports');
      const data = await resp.json();
      if (data.success && data.reports && data.reports.length > 0) {
        currentReport = data.reports[0];
        renderDocumentPreview(currentReport);
      }
    } catch (err) {
      console.warn('[ReportStudio] Could not load latest report:', err.message);
    }
  }

  /**
   * Set current active report (e.g. from Document Library)
   */
  function setReport(report) {
    currentReport = report;
    renderDocumentPreview(currentReport);
  }

  return {
    renderReportStudio,
    selectTemplate,
    generateReport,
    renderDocumentPreview,
    toggleEditSection,
    saveSection,
    rewriteSection,
    loadLatestReport,
    setReport,
    getCurrentReport: () => currentReport
  };
})();
