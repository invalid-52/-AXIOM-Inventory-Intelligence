/**
 * AXIOM INVENTORY INTELLIGENCE
 * Navigation & Global State Manager
 * 
 * Manages persistent routing across all 13 modules:
 * 1. Executive Intelligence
 * 2. AI Copilot
 * 3. Procurement Optimizer (The Core Product)
 * 4. Demand Forecasting
 * 5. Inventory Intelligence
 * 6. Budget Allocation
 * 7. Destination Intelligence
 * 8. Supplier Intelligence
 * 9. Scenario Simulation Lab
 * 10. Risk & Anomaly Detection
 * 11. Performance Analytics
 * 12. Executive Reporting
 * 13. System Settings
 */

(function(window) {
  'use strict';

  const SECTION_TITLES = {
    overview: 'Executive Intelligence · Command Center',
    copilot: 'AXIOM AI Copilot · Conversational Intelligence',
    optimizer: 'Procurement Optimizer · Core Decision Engine',
    forecasting: 'Demand Forecasting Engine',
    inventory: 'Inventory Intelligence System',
    budget: 'Dynamic Budget Planning & Allocation',
    destination: 'Destination Intelligence & Momentum',
    supplier: 'Supplier Evaluation & Bedbank Scorecard',
    scenario: 'Scenario Lab · What-If Stress Testing',
    risk: 'Risk & Anomaly Detection Center',
    performance: 'Performance Analytics & Outcome Tracking',
    report: 'Executive Intelligence Report',
    'report-studio': 'AI Report Studio · Multi-Format Document Synthesis',
    documents: 'Enterprise Document Library · 5 Native Formats',
    automations: 'Autonomous Workflow & Automation Center',
    settings: 'System Settings & AI Provider Diagnostics'
  };

  // Global Filter State
  const state = {
    currentSection: 'overview',
    selectedHorizonDays: 30,
    selectedDestinationId: 'all',
    selectedSupplierId: 'all',
    searchQuery: '',
    riskTolerance: 'balanced',
    totalBudgetUSD: 1500000,
    demandGrowthOverridePct: 0.0
  };

  function initNavigation() {
    // Topbar UTC Clock
    function updateClock() {
      const el = document.getElementById('tbTime');
      if (el) {
        const now = new Date();
        el.textContent = now.toLocaleTimeString('en-US', { hour12: false }) + ' UTC';
      }
    }
    setInterval(updateClock, 1000);
    updateClock();

    // Populate Destination Filter in Topbar
    const destSelect = document.getElementById('tbFilterDest');
    if (destSelect && window.AxiomData) {
      destSelect.innerHTML = '<option value="all">Global (All Destinations)</option>' +
        window.AxiomData.DESTINATIONS.map(d => `<option value="${d.id}">${d.name} (${d.iata})</option>`).join('');
      
      destSelect.addEventListener('change', (e) => {
        state.selectedDestinationId = e.target.value;
        window.AxiomApp.onFilterChange();
      });
    }

    // Populate Supplier Filter in Topbar
    const suppSelect = document.getElementById('tbFilterSupplier');
    if (suppSelect && window.AxiomData) {
      suppSelect.innerHTML = '<option value="all">All Suppliers / Bedbanks</option>' +
        window.AxiomData.SUPPLIERS.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
      
      suppSelect.addEventListener('change', (e) => {
        state.selectedSupplierId = e.target.value;
        window.AxiomApp.onFilterChange();
      });
    }

    // Horizon Select
    const horizonSelect = document.getElementById('tbFilterHorizon');
    if (horizonSelect) {
      horizonSelect.addEventListener('change', (e) => {
        state.selectedHorizonDays = parseInt(e.target.value, 10) || 30;
        window.AxiomApp.onFilterChange();
      });
    }

    // Sidebar Nav Clicks
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', function() {
        const sectionId = this.dataset.section;
        if (sectionId) {
          switchSection(sectionId);
        }
      });
    });
  }

  function switchSection(sectionId) {
    if (!SECTION_TITLES[sectionId]) return;

    state.currentSection = sectionId;

    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(n => {
      n.classList.toggle('active', n.dataset.section === sectionId);
    });

    // Update active content container
    document.querySelectorAll('.content-area').forEach(c => {
      c.classList.toggle('active', c.id === `sec-${sectionId}`);
    });

    // Update topbar breadcrumb
    const bc = document.getElementById('tbSectionTitle');
    if (bc) {
      bc.textContent = SECTION_TITLES[sectionId];
    }

    // Notify app to render view if needed
    if (window.AxiomApp && window.AxiomApp.onSectionChange) {
      window.AxiomApp.onSectionChange(sectionId);
    }
  }

  window.AxiomNavigation = {
    initNavigation,
    switchSection,
    getState: () => state,
    setState: (updates) => Object.assign(state, updates)
  };

})(window);
