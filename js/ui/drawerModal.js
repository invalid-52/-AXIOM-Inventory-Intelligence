/**
 * AXIOM INVENTORY INTELLIGENCE
 * Interactive Drawer, Modal & Toast UI Component
 * 
 * Provides:
 * 1. Procurement Explainability Drawer (Mathematical step-by-step trace)
 * 2. Destination Comparison Modal
 * 3. Inventory Item Drill-Down Modal
 * 4. Toast Notifications
 */

(function(window) {
  'use strict';

  function initDrawerModal() {
    // Backdrop close handlers
    const drawerBackdrop = document.getElementById('drawerBackdrop');
    if (drawerBackdrop) {
      drawerBackdrop.addEventListener('click', closeDrawer);
    }

    const modalBackdrop = document.getElementById('modalBackdrop');
    if (modalBackdrop) {
      modalBackdrop.addEventListener('click', function(e) {
        if (e.target === modalBackdrop) closeModal();
      });
    }

    // Escape key closes open drawers or modals
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        closeDrawer();
        closeModal();
      }
    });
  }

  // --- 1. EXPLAINABILITY DRAWER ---
  function openRecommendationDrawer(decision) {
    const drawer = document.getElementById('explainDrawer');
    const backdrop = document.getElementById('drawerBackdrop');
    if (!drawer || !backdrop) return;

    const exp = decision.explainability || {};
    const mathTrace = exp.mathTrace || [];

    const actionBadgeClass = decision.actionClass || 'maintain';

    document.getElementById('drawerTitle').innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="action-badge ${actionBadgeClass}">${decision.action}</span>
        <span>${decision.destinationName} · ${decision.propertyName}</span>
      </div>
    `;

    document.getElementById('drawerBody').innerHTML = `
      <div style="font-family:var(--mono);font-size:0.6rem;color:var(--text2);display:flex;gap:15px;border-bottom:1px solid var(--border);padding-bottom:0.75rem;">
        <span>CONTRACT ID: <strong style="color:var(--cyan)">${decision.id}</strong></span>
        <span>SUPPLIER: <strong style="color:var(--text)">${decision.supplierName}</strong></span>
        <span>ROOM: <strong style="color:var(--text)">${decision.roomType}</strong></span>
      </div>

      <div class="card" style="background:rgba(0,229,255,0.04);border-color:var(--cyan-border);">
        <div class="card-header" style="background:transparent;border-bottom:1px solid rgba(0,229,255,0.15);">
          <div class="card-title" style="font-size:0.75rem;color:var(--cyan);">✦ OPTIMIZATION RATIONALE</div>
          <span class="chip info">DEFENSIBLE DECISION</span>
        </div>
        <div class="card-body" style="font-size:0.78rem;line-height:1.5;color:var(--text);">
          ${exp.summaryText || 'Calculated optimal procurement action based on constrained marginal return.'}
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title" style="font-size:0.75rem;">⟁ COMPUTATIONAL INPUTS & DERIVATION TRACE</div>
          <span style="font-family:var(--mono);font-size:0.55rem;color:var(--text2);">${exp.objectiveFormula || ''}</span>
        </div>
        <div class="card-body" style="padding:0;">
          <table style="width:100%;border-collapse:collapse;font-size:0.72rem;">
            <tbody>
              ${mathTrace.map(row => `
                <tr style="border-bottom:1px solid var(--border-subtle);">
                  <td style="padding:0.6rem 0.9rem;font-family:var(--mono);color:var(--text2);font-size:0.62rem;">${row.label}</td>
                  <td style="padding:0.6rem 0.9rem;text-align:right;font-weight:600;color:var(--text);font-family:var(--mono);font-size:0.68rem;">${row.value}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card" style="background:rgba(8,13,26,0.6);">
        <div class="card-header">
          <div class="card-title" style="font-size:0.75rem;">▦ FINANCIAL IMPACT BREAKDOWN</div>
        </div>
        <div class="card-body" style="display:grid;grid-template-columns:1fr 1fr;gap:0.8rem;">
          <div style="background:rgba(255,255,255,0.02);padding:0.7rem;border-radius:4px;border:1px solid var(--border);">
            <div style="font-family:var(--mono);font-size:0.55rem;color:var(--text2);text-transform:uppercase;">Procurement Capital</div>
            <div style="font-family:var(--syne);font-size:1.15rem;font-weight:700;color:var(--text);margin-top:2px;">$${decision.allocatedBudgetUSD.toLocaleString()}</div>
            <div style="font-family:var(--mono);font-size:0.55rem;color:var(--text2);margin-top:2px;">${decision.recommendedPurchaseQty} units @ $${decision.unitCost}</div>
          </div>
          <div style="background:rgba(255,255,255,0.02);padding:0.7rem;border-radius:4px;border:1px solid var(--border);">
            <div style="font-family:var(--mono);font-size:0.55rem;color:var(--text2);text-transform:uppercase;">Expected Net Profit</div>
            <div style="font-family:var(--syne);font-size:1.15rem;font-weight:700;color:var(--green);margin-top:2px;">+$${decision.expectedProfitUSD.toLocaleString()}</div>
            <div style="font-family:var(--mono);font-size:0.55rem;color:var(--text2);margin-top:2px;">Margin: ${decision.unitMarginPct}%</div>
          </div>
        </div>
      </div>

      <div style="display:flex;gap:10px;margin-top:0.5rem;">
        <button class="btn btn-primary" style="flex:1;" onclick="AxiomDrawerModal.confirmDecisionAction('${decision.id}')">
          ✓ EXECUTE PROCUREMENT ACTION
        </button>
        <button class="btn btn-outline" onclick="AxiomDrawerModal.closeDrawer()">
          CLOSE
        </button>
      </div>
    `;

    backdrop.classList.add('active');
    drawer.classList.add('active');
  }

  function closeDrawer() {
    const drawer = document.getElementById('explainDrawer');
    const backdrop = document.getElementById('drawerBackdrop');
    if (drawer) drawer.classList.remove('active');
    if (backdrop) backdrop.classList.remove('active');
  }

  function confirmDecisionAction(decisionId) {
    closeDrawer();
    toast(`Procurement instruction queued for ${decisionId}. Transmitted to ERP contract staging.`, 'ok');
  }

  // --- 2. DESTINATION COMPARISON MODAL ---
  function openDestinationComparisonModal(dest1Id, dest2Id) {
    const backdrop = document.getElementById('modalBackdrop');
    const modalBox = document.getElementById('modalBox');
    if (!backdrop || !modalBox || !window.AxiomData) return;

    const destinations = window.AxiomData.DESTINATIONS;
    const d1 = destinations.find(d => d.id === dest1Id) || destinations[0];
    const d2 = destinations.find(d => d.id === dest2Id) || destinations[1];

    modalBox.innerHTML = `
      <div class="card-header" style="background:var(--bg3);padding:1rem 1.4rem;">
        <div class="card-title" style="font-size:0.95rem;">
          <span style="color:var(--cyan)">◎</span> Destination Intelligence Comparison
        </div>
        <button class="drawer-close" onclick="AxiomDrawerModal.closeModal()">&times;</button>
      </div>
      <div style="padding:1.4rem;overflow-y:auto;flex:1;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.2rem;">
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:1rem;text-align:center;">
            <div style="font-family:var(--syne);font-size:1.4rem;font-weight:700;color:var(--cyan);">${d1.name}</div>
            <div style="font-family:var(--mono);font-size:0.6rem;color:var(--text2);">${d1.country} · ${d1.region} · ${d1.iata}</div>
          </div>
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:1rem;text-align:center;">
            <div style="font-family:var(--syne);font-size:1.4rem;font-weight:700;color:var(--text);">${d2.name}</div>
            <div style="font-family:var(--mono);font-size:0.6rem;color:var(--text2);">${d2.country} · ${d2.region} · ${d2.iata}</div>
          </div>
        </div>

        <table class="data-table" style="font-size:0.75rem;">
          <thead>
            <tr>
              <th>Metric / Indicator</th>
              <th style="color:var(--cyan);">${d1.name}</th>
              <th>${d2.name}</th>
              <th>Advantage</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Market Category</td>
              <td style="font-weight:600;">${d1.marketType}</td>
              <td style="font-weight:600;">${d2.marketType}</td>
              <td style="font-family:var(--mono);color:var(--text2);">Contextual</td>
            </tr>
            <tr>
              <td>Baseline Monthly Demand</td>
              <td style="font-family:var(--mono);">${d1.baselineMonthlyDemand.toLocaleString()} r-n</td>
              <td style="font-family:var(--mono);">${d2.baselineMonthlyDemand.toLocaleString()} r-n</td>
              <td style="font-family:var(--mono);color:var(--green);">${d1.baselineMonthlyDemand > d2.baselineMonthlyDemand ? d1.name : d2.name}</td>
            </tr>
            <tr>
              <td>Booking Pace Velocity</td>
              <td style="font-family:var(--mono);color:var(--cyan);">${d1.currentPace}/d (vs base ${d1.historicalPaceBase})</td>
              <td style="font-family:var(--mono);">${d2.currentPace}/d (vs base ${d2.historicalPaceBase})</td>
              <td style="font-family:var(--mono);color:var(--green);">${(d1.currentPace/d1.historicalPaceBase) > (d2.currentPace/d2.historicalPaceBase) ? d1.name : d2.name}</td>
            </tr>
            <tr>
              <td>Average Daily Rate (ADR)</td>
              <td style="font-family:var(--mono);">$${d1.avgDailyRate}</td>
              <td style="font-family:var(--mono);">$${d2.avgDailyRate}</td>
              <td style="font-family:var(--mono);color:var(--text3);">$${Math.abs(d1.avgDailyRate - d2.avgDailyRate)} spread</td>
            </tr>
            <tr>
              <td>Procurement Gross Margin</td>
              <td style="font-family:var(--mono);color:var(--green);">${Math.round(((d1.avgDailyRate - d1.avgProcurementCost) / d1.avgDailyRate) * 100)}%</td>
              <td style="font-family:var(--mono);color:var(--green);">${Math.round(((d2.avgDailyRate - d2.avgProcurementCost) / d2.avgDailyRate) * 100)}%</td>
              <td style="font-family:var(--mono);color:var(--green);">${((d1.avgDailyRate - d1.avgProcurementCost) / d1.avgDailyRate) > ((d2.avgDailyRate - d2.avgProcurementCost) / d2.avgDailyRate) ? d1.name : d2.name}</td>
            </tr>
            <tr>
              <td>Search Intent Index</td>
              <td style="font-family:var(--mono);">${d1.searchIndex}</td>
              <td style="font-family:var(--mono);">${d2.searchIndex}</td>
              <td style="font-family:var(--mono);color:var(--green);">${d1.searchIndex > d2.searchIndex ? d1.name : d2.name}</td>
            </tr>
            <tr>
              <td>Cancellation Rate</td>
              <td style="font-family:var(--mono);">${Math.round(d1.cancellationRate * 1000)/10}%</td>
              <td style="font-family:var(--mono);">${Math.round(d2.cancellationRate * 1000)/10}%</td>
              <td style="font-family:var(--mono);color:var(--green);">${d1.cancellationRate < d2.cancellationRate ? d1.name : d2.name} (Lower Risk)</td>
            </tr>
            <tr>
              <td>Demand Momentum Score</td>
              <td style="font-family:var(--syne);font-weight:700;color:var(--cyan);">${d1.momentumScore}/100</td>
              <td style="font-family:var(--syne);font-weight:700;color:var(--text);">${d2.momentumScore}/100</td>
              <td style="font-family:var(--mono);color:var(--green);">${d1.momentumScore > d2.momentumScore ? d1.name : d2.name}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="card-header" style="justify-content:flex-end;gap:8px;">
        <button class="btn btn-outline" onclick="AxiomDrawerModal.closeModal()">CLOSE</button>
      </div>
    `;

    backdrop.classList.add('active');
  }

  function closeModal() {
    const backdrop = document.getElementById('modalBackdrop');
    if (backdrop) {
      backdrop.classList.remove('active');
      backdrop.style.display = 'none';
    }
  }

  // --- 3. TOAST MESSAGES ---
  function toast(message, type = 'info') {
    const wrap = document.getElementById('toastWrap');
    if (!wrap) return;

    const colors = {
      ok: 'var(--green)',
      error: 'var(--red)',
      warn: 'var(--amber)',
      info: 'var(--cyan)'
    };
    const icons = {
      ok: '✓',
      error: '✕',
      warn: '⚠',
      info: '✦'
    };

    const t = document.createElement('div');
    t.className = 'toast';
    t.style.borderLeftColor = colors[type] || colors.info;
    t.innerHTML = `
      <span style="color:${colors[type] || colors.info};font-weight:bold;">${icons[type] || '●'}</span>
      <span>${message}</span>
    `;

    wrap.appendChild(t);

    setTimeout(() => {
      t.style.transition = 'all 0.25s ease';
      t.style.opacity = '0';
      t.style.transform = 'translateX(20px)';
      setTimeout(() => t.remove(), 250);
    }, 4000);
  }

  window.AxiomDrawerModal = {
    initDrawerModal,
    openRecommendationDrawer,
    closeDrawer,
    confirmDecisionAction,
    openDestinationComparisonModal,
    closeModal,
    toast
  };

})(window);
