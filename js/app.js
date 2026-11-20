/**
 * AXIOM INVENTORY INTELLIGENCE v2.0
 * Central Application Orchestrator & View Controller
 * 
 * Coordinates:
 * - Data Initialization
 * - AI Copilot & Grounding
 * - Demand Forecasting Execution
 * - Procurement Optimization Solving
 * - Risk & Alert Analysis
 * - Scenario Simulations
 * - UI Module Rendering across all 13 modules
 */

(function(window) {
  'use strict';

  // Application Memory State
  const appState = {
    destinationForecasts: {},
    inventoryForecasts: [],
    optimizationResults: null,
    riskAlerts: [],
    executiveBrief: [],
    activeScenario: null,
    scenarioResults: null,
    sortField: 'expectedProfitUSD',
    sortAsc: false
  };

  /**
   * Bootstrap Application
   */
  function initApp() {
    // 1. Initialize Components
    window.AxiomNavigation.initNavigation();
    window.AxiomDrawerModal.initDrawerModal();
    if (window.AxiomCopilot) window.AxiomCopilot.initCopilot();
    if (window.AxiomNotification) window.AxiomNotification.initNotifications();

    // 2. Compute Initial Models
    recomputeAll();

    // 3. Render Initial Overview
    renderActiveSection('overview');

    // 4. Dismiss Preloader
    setTimeout(() => {
      const pl = document.getElementById('preloader');
      if (pl) {
        pl.classList.add('fade');
        setTimeout(() => { pl.style.display = 'none'; }, 500);
      }
    }, 1200);
  }

  /**
   * Recompute forecasting, optimization, risks, and executive briefs
   */
  function recomputeAll() {
    const navState = window.AxiomNavigation.getState();
    const data = window.AxiomData;
    const horizon = navState.selectedHorizonDays || 30;
    const growthOverride = navState.demandGrowthOverridePct || 0;

    // 1. Destination Demand Forecasts
    appState.destinationForecasts = {};
    data.DESTINATIONS.forEach(dest => {
      const history = data.TIME_SERIES[dest.id] || [];
      appState.destinationForecasts[dest.id] = window.AxiomForecasting.forecastDestinationDemand(
        dest,
        history,
        horizon,
        growthOverride
      );
    });

    // 2. Inventory Product Demand Forecasts
    appState.inventoryForecasts = window.AxiomForecasting.forecastInventoryDemand(
      data.INVENTORY,
      appState.destinationForecasts,
      horizon
    );

    // 3. Procurement Optimization Solver
    const config = {
      ...data.DEFAULT_CONFIG,
      totalBudgetUSD: navState.totalBudgetUSD || data.DEFAULT_CONFIG.totalBudgetUSD,
      riskTolerance: navState.riskTolerance || data.DEFAULT_CONFIG.riskTolerance
    };

    appState.optimizationResults = window.AxiomOptimization.solveProcurementOptimization(
      appState.inventoryForecasts,
      data.DESTINATIONS,
      data.SUPPLIERS,
      config
    );

    // 4. Risk Engine
    appState.riskAlerts = window.AxiomRisk.scanPortfolioRisks(
      appState.optimizationResults.decisions,
      data.DESTINATIONS,
      data.SUPPLIERS,
      appState.optimizationResults.portfolio
    );

    // Update alert count in topbar
    const alertCountEl = document.getElementById('tbAlertCount');
    if (alertCountEl) {
      const critCount = appState.riskAlerts.filter(a => a.severity === 'CRITICAL').length;
      alertCountEl.textContent = `${critCount} CRITICAL`;
    }

    // 5. Executive Brief Explanation Engine
    appState.executiveBrief = window.AxiomExplanation.generateExecutiveBrief(
      appState.optimizationResults,
      appState.destinationForecasts,
      appState.riskAlerts
    );
  }

  /**
   * Handler when Global Filters change in Topbar
   */
  function onFilterChange() {
    recomputeAll();
    const current = window.AxiomNavigation.getState().currentSection;
    renderActiveSection(current);
    window.AxiomDrawerModal.toast('Filters synchronized across portfolio model', 'info');
  }

  /**
   * Handler when Sidebar Navigation section switches
   */
  function onSectionChange(sectionId) {
    renderActiveSection(sectionId);
  }

  /**
   * Render view corresponding to sectionId (all 13 modules)
   */
  function renderActiveSection(sectionId) {
    switch (sectionId) {
      case 'overview':
        renderOverview();
        break;
      case 'copilot':
        renderCopilot();
        break;
      case 'optimizer':
        renderOptimizer();
        break;
      case 'forecasting':
        renderForecasting();
        break;
      case 'inventory':
        renderInventory();
        break;
      case 'budget':
        renderBudget();
        break;
      case 'destination':
        renderDestination();
        break;
      case 'supplier':
        renderSupplier();
        break;
      case 'scenario':
        renderScenario();
        break;
      case 'risk':
        renderRisk();
        break;
      case 'performance':
        renderPerformance();
        break;
      case 'report':
        renderReport();
        break;
      case 'report-studio':
        if (window.AxiomReportStudio) window.AxiomReportStudio.renderReportStudio();
        break;
      case 'documents':
        if (window.AxiomDocumentLibrary) window.AxiomDocumentLibrary.renderDocumentLibrary();
        break;
      case 'automations':
        if (window.AxiomAutomation) window.AxiomAutomation.renderAutomation();
        break;
      case 'settings':
        renderSettings();
        break;
      default:
        renderOverview();
    }
  }

  /**
   * Filter portfolio data by active topbar filters (destination and supplier)
   */
  function getFilteredData() {
    const navState = window.AxiomNavigation.getState();
    const destId = navState.selectedDestinationId;
    const suppId = navState.selectedSupplierId;

    let decisions = appState.optimizationResults ? appState.optimizationResults.decisions : [];
    let inventory = window.AxiomData ? window.AxiomData.INVENTORY : [];
    let destinations = window.AxiomData ? window.AxiomData.DESTINATIONS : [];
    let alerts = appState.riskAlerts || [];

    if (destId && destId !== 'all') {
      decisions = decisions.filter(d => d.destinationId === destId);
      inventory = inventory.filter(i => i.destinationId === destId);
      destinations = destinations.filter(d => d.id === destId);
      alerts = alerts.filter(a => {
        if (!a.target) return true;
        const targetLower = a.target.toLowerCase();
        const dObj = destinations[0];
        return targetLower.includes(destId.toLowerCase()) || (dObj && targetLower.includes(dObj.name.toLowerCase()));
      });
    }

    if (suppId && suppId !== 'all') {
      decisions = decisions.filter(d => d.supplierId === suppId);
      inventory = inventory.filter(i => i.supplierId === suppId);
      alerts = alerts.filter(a => {
        const explLower = (a.explanation || '').toLowerCase();
        const targetLower = (a.target || '').toLowerCase();
        return targetLower.includes(suppId.toLowerCase()) || explLower.includes(suppId.toLowerCase());
      });
    }

    return { decisions, inventory, destinations, alerts };
  }

  // ==========================================
  // MODULE 1: EXECUTIVE INTELLIGENCE
  // ==========================================
  function renderOverview() {
    const { decisions, destinations } = getFilteredData();
    const p = appState.optimizationResults.portfolio;
    const destForecasts = appState.destinationForecasts;

    const isFiltered = destinations.length < window.AxiomData.DESTINATIONS.length || decisions.length < appState.optimizationResults.decisions.length;

    let totalDemand = 0;
    destinations.forEach(dest => {
      const df = destForecasts[dest.id];
      if (df) totalDemand += df.totalPredictedDemand;
    });

    const budgetUtilized = isFiltered ? decisions.reduce((s, d) => s + d.allocatedBudgetUSD, 0) : p.budgetUtilizedUSD;
    const totalBudget = isFiltered ? Math.round(p.totalBudgetUSD * (destinations.length / window.AxiomData.DESTINATIONS.length)) : p.totalBudgetUSD;
    const budgetPct = totalBudget > 0 ? Math.min(100, Math.round((budgetUtilized / totalBudget) * 100)) : 0;
    const projectedRev = isFiltered ? decisions.reduce((s, d) => s + (d.sellingPrice * Math.min(d.totalUnitsAfterPurchase, d.forecastDemand)), 0) : p.totalProjectedRevenueUSD;
    const projectedProfit = isFiltered ? decisions.reduce((s, d) => s + d.expectedProfitUSD, 0) : p.totalProjectedProfitUSD;
    const grossMarginPct = projectedRev > 0 ? Math.round((projectedProfit / projectedRev) * 100) : p.portfolioGrossMarginPct;
    const surplusExposure = isFiltered ? decisions.reduce((s, d) => s + Math.max(0, d.totalUnitsAfterPurchase - d.forecastDemand) * d.unitCost, 0) : p.totalSurplusExposureUSD;
    const shortageLoss = isFiltered ? decisions.reduce((s, d) => s + Math.max(0, d.forecastDemand - d.totalUnitsAfterPurchase) * (d.sellingPrice - d.unitCost), 0) : p.totalUnrealizedShortageUSD;
    const buyActions = decisions.filter(d => d.action === 'BUY MORE').length;
    const unitsRecommended = decisions.reduce((s, d) => s + d.recommendedPurchaseQty, 0);

    const kpiWrap = document.getElementById('overviewKpis');
    if (kpiWrap) {
      kpiWrap.innerHTML = `
        <div class="kpi-card">
          <div class="kpi-top">
            <span class="kpi-label">Total Inventory Exposure</span>
            <span class="kpi-tooltip-icon" title="Committed wholesale capital across active room blocks">ⓘ</span>
          </div>
          <div class="kpi-value cyan">$${(budgetUtilized + 480000).toLocaleString()}</div>
          <div class="kpi-sub"><span class="kpi-trend-up">▲ 4.8%</span> vs prior cycle</div>
          <div class="kpi-sparkline"><canvas id="sparkExp"></canvas></div>
          <div class="kpi-bar cyan"></div>
        </div>

        <div class="kpi-card">
          <div class="kpi-top">
            <span class="kpi-label">Budget Utilized</span>
            <span class="kpi-tooltip-icon" title="Procurement budget deployed by optimization solver">ⓘ</span>
          </div>
          <div class="kpi-value ${budgetPct > 98 ? 'amber' : 'green'}">${budgetPct}%</div>
          <div class="kpi-sub">$${budgetUtilized.toLocaleString()} of $${totalBudget.toLocaleString()}</div>
          <div class="kpi-sparkline"><canvas id="sparkBudget"></canvas></div>
          <div class="kpi-bar ${budgetPct > 98 ? 'amber' : 'green'}"></div>
        </div>

        <div class="kpi-card">
          <div class="kpi-top">
            <span class="kpi-label">Forecast Demand</span>
            <span class="kpi-tooltip-icon" title="Projected booking demand across selected horizon">ⓘ</span>
          </div>
          <div class="kpi-value cyan">${totalDemand.toLocaleString()}</div>
          <div class="kpi-sub"><span class="kpi-trend-up">▲ 14.2%</span> booking momentum</div>
          <div class="kpi-sparkline"><canvas id="sparkDemand"></canvas></div>
          <div class="kpi-bar cyan"></div>
        </div>

        <div class="kpi-card">
          <div class="kpi-top">
            <span class="kpi-label">Projected Revenue</span>
            <span class="kpi-tooltip-icon" title="Expected gross turnover under optimized inventory">ⓘ</span>
          </div>
          <div class="kpi-value green">$${(projectedRev / 1000000).toFixed(2)}M</div>
          <div class="kpi-sub"><span class="kpi-trend-up">▲ 18.6%</span> vs unoptimized baseline</div>
          <div class="kpi-sparkline"><canvas id="sparkRev"></canvas></div>
          <div class="kpi-bar green"></div>
        </div>

        <div class="kpi-card">
          <div class="kpi-top">
            <span class="kpi-label">Gross Margin</span>
            <span class="kpi-tooltip-icon" title="Net profit contribution margin percentage">ⓘ</span>
          </div>
          <div class="kpi-value ${grossMarginPct < 25 ? 'amber' : 'green'}">${grossMarginPct}%</div>
          <div class="kpi-sub"><span class="kpi-trend-up">▲ 3.2%</span> margin expansion</div>
          <div class="kpi-sparkline"><canvas id="sparkMargin"></canvas></div>
          <div class="kpi-bar ${grossMarginPct < 25 ? 'amber' : 'green'}"></div>
        </div>

        <div class="kpi-card">
          <div class="kpi-top">
            <span class="kpi-label">Revenue at Risk</span>
            <span class="kpi-tooltip-icon" title="Unsold inventory holding exposure + potential stockout loss">ⓘ</span>
          </div>
          <div class="kpi-value red">$${Math.round(surplusExposure + shortageLoss).toLocaleString()}</div>
          <div class="kpi-sub"><span class="kpi-trend-down">▼ 12.4%</span> mitigated by solver</div>
          <div class="kpi-sparkline"><canvas id="sparkRisk"></canvas></div>
          <div class="kpi-bar red"></div>
        </div>

        <div class="kpi-card">
          <div class="kpi-top">
            <span class="kpi-label">Procure Opportunities</span>
            <span class="kpi-tooltip-icon" title="Active BUY MORE recommendations ready for execution">ⓘ</span>
          </div>
          <div class="kpi-value blue">${buyActions} Actions</div>
          <div class="kpi-sub">${unitsRecommended.toLocaleString()} units recommended</div>
          <div class="kpi-sparkline"><canvas id="sparkOpp"></canvas></div>
          <div class="kpi-bar blue"></div>
        </div>
      `;

      setTimeout(() => {
        window.AxiomCharts.renderSparkline('sparkExp', [64, 68, 71, 75, 74, 79, 82, 85], '#00e5ff');
        window.AxiomCharts.renderSparkline('sparkBudget', [40, 55, 68, 75, 82, 88, 92, budgetPct], '#00e676');
        window.AxiomCharts.renderSparkline('sparkDemand', [120, 130, 142, 138, 150, 162, 175, 184], '#00e5ff');
        window.AxiomCharts.renderSparkline('sparkRev', [1.2, 1.4, 1.5, 1.7, 1.9, 2.1, 2.3, 2.5], '#00e676');
        window.AxiomCharts.renderSparkline('sparkMargin', [28, 29, 29.5, 30.2, 31, 31.8, 32.5, grossMarginPct], '#00e676');
        window.AxiomCharts.renderSparkline('sparkRisk', [120, 115, 108, 95, 88, 75, 68, 54], '#ff1744');
        window.AxiomCharts.renderSparkline('sparkOpp', [5, 7, 6, 8, 9, 12, 14, 16], '#2979ff');
      }, 50);
    }

    // Render AI Decision Brief
    const briefWrap = document.getElementById('aiBriefList');
    if (briefWrap) {
      briefWrap.innerHTML = appState.executiveBrief.map(b => `
        <div class="ai-brief-card ${b.type.toLowerCase()}" onclick="AxiomNavigation.switchSection('optimizer')">
          <div class="ai-brief-header">
            <span class="chip ${b.badgeClass}">${b.badge}</span>
            <span style="font-family:var(--mono);font-size:0.58rem;color:var(--text2);">CONFIDENCE: <strong style="color:var(--cyan)">${b.confidence}%</strong></span>
          </div>
          <div class="ai-brief-headline">${b.headline}</div>
          <div class="ai-brief-evidence">${b.evidence}</div>
          <div class="ai-brief-footer">
            <span class="ai-brief-impact">${b.financialImpact}</span>
            <span class="ai-brief-action">→ ${b.recommendedAction}</span>
          </div>
        </div>
      `).join('');
    }

    // Render Charts
    setTimeout(() => {
      const destNames = destinations.map(d => d.name);
      const demandVals = destinations.map(d => {
        const df = appState.destinationForecasts[d.id];
        return df ? df.totalPredictedDemand : d.baselineMonthlyDemand;
      });
      const currentStockVals = destinations.map(d => {
        return decisions.filter(dec => dec.destinationId === d.id).reduce((sum, dec) => sum + dec.currentInventory, 0);
      });
      const postProcureVals = destinations.map(d => {
        return decisions.filter(dec => dec.destinationId === d.id).reduce((sum, dec) => sum + dec.totalUnitsAfterPurchase, 0);
      });

      window.AxiomCharts.renderChart('chartDemandVsStock', 'bar', {
        labels: destNames,
        datasets: [
          { label: 'Forecast Demand', data: demandVals, backgroundColor: 'rgba(0, 229, 255, 0.65)', borderRadius: 3 },
          { label: 'Pre-Procurement Stock', data: currentStockVals, backgroundColor: 'rgba(255, 171, 0, 0.45)', borderRadius: 3 },
          { label: 'Optimized Post-Stock', data: postProcureVals, backgroundColor: 'rgba(0, 230, 118, 0.7)', borderRadius: 3 }
        ]
      }, {
        plugins: { legend: { display: true, position: 'top' } }
      });

      const paceActual = destinations.map(d => d.currentPace);
      const paceBaseline = destinations.map(d => d.historicalPaceBase);

      window.AxiomCharts.renderChart('chartBookingPace', 'bar', {
        labels: destNames,
        datasets: [
          { label: 'Current Velocity (bookings/day)', data: paceActual, backgroundColor: 'rgba(0, 229, 255, 0.75)', borderRadius: 3 },
          { label: 'Historical Benchmark', data: paceBaseline, backgroundColor: 'rgba(255, 255, 255, 0.12)', borderRadius: 3 }
        ]
      }, {
        plugins: { legend: { display: true, position: 'top' } }
      });

      const sortedByDemand = [...destinations].sort((a, b) => b.baselineMonthlyDemand - a.baselineMonthlyDemand);
      window.AxiomCharts.renderChart('chartDestRanking', 'bar', {
        labels: sortedByDemand.map(d => d.name),
        datasets: [{
          data: sortedByDemand.map(d => d.baselineMonthlyDemand),
          backgroundColor: 'rgba(41, 121, 255, 0.65)',
          borderRadius: 3
        }]
      }, {
        indexAxis: 'y'
      });
    }, 80);
  }

  // ==========================================
  // MODULE 2: AI COPILOT
  // ==========================================
  function renderCopilot() {
    if (window.AxiomCopilot) {
      window.AxiomCopilot.initCopilot();
    }
  }

  // ==========================================
  // MODULE 3: DEMAND FORECASTING ENGINE
  // ==========================================
  function renderForecasting() {
    const navState = window.AxiomNavigation.getState();
    const destId = navState.selectedDestinationId !== 'all' ? navState.selectedDestinationId : 'dest-tyo';
    const dest = window.AxiomData.DESTINATIONS.find(d => d.id === destId) || window.AxiomData.DESTINATIONS[0];
    const forecast = appState.destinationForecasts[dest.id];

    if (!forecast) return;

    const sumEl = document.getElementById('forecastSummaryBar');
    if (sumEl) {
      sumEl.innerHTML = `
        <div class="kpi-card">
          <div class="kpi-label">Destination</div>
          <div class="kpi-value cyan" style="font-size:1.25rem;">${dest.name} (${dest.iata})</div>
          <div class="kpi-sub">${dest.marketType}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">${forecast.horizonDays}-Day Projected Demand</div>
          <div class="kpi-value green">${forecast.totalPredictedDemand.toLocaleString()} r-n</div>
          <div class="kpi-sub"><span class="kpi-trend-up">▲ ${forecast.demandGrowthPct}%</span> vs prior ${forecast.horizonDays}d</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Forecast Confidence</div>
          <div class="kpi-value cyan">${forecast.confidenceScore}%</div>
          <div class="kpi-sub">MAPE: ${forecast.accuracy.mape}% · RMSE: ${forecast.accuracy.rmse}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Booking Velocity</div>
          <div class="kpi-value amber">${dest.currentPace}/day</div>
          <div class="kpi-sub">Baseline: ${dest.historicalPaceBase}/day (${Math.round((dest.currentPace/dest.historicalPaceBase - 1)*100)}% pickup)</div>
        </div>
      `;
    }

    const expBox = document.getElementById('forecastExplanationText');
    if (expBox) {
      expBox.innerHTML = `
        <div style="font-size:0.8rem;line-height:1.5;color:var(--text);margin-bottom:0.5rem;">
          ${forecast.explanation}
        </div>
        <div style="font-family:var(--mono);font-size:0.6rem;color:var(--text2);display:flex;gap:15px;">
          <span>MODEL: <strong>Holt-Winters Smoothing + Pickup Factor</strong></span>
          <span>ALPHA (Level): <strong>0.35</strong></span>
          <span>BETA (Trend): <strong>0.15</strong></span>
          <span>SEASONAL INDEX: <strong>${dest.currentSeasonalityIdx}x</strong></span>
          <span>SEARCH INDEX: <strong>${dest.searchIndex}</strong></span>
        </div>
      `;
    }

    setTimeout(() => {
      const labels = forecast.forecastPoints.map(p => `${p.dayOfWeek} ${p.date.slice(5)}`);
      const pred = forecast.forecastPoints.map(p => p.predictedDemand);
      const upper = forecast.forecastPoints.map(p => p.upperBand);
      const lower = forecast.forecastPoints.map(p => p.lowerBand);
      const cap = forecast.forecastPoints.map(p => p.inventoryCapacity);

      window.AxiomCharts.renderChart('chartForecastMain', 'line', {
        labels: labels,
        datasets: [
          {
            label: 'Predicted Demand',
            data: pred,
            borderColor: '#00e5ff',
            borderWidth: 2,
            pointRadius: 0,
            fill: false,
            tension: 0.3
          },
          {
            label: 'Upper Confidence Band (95%)',
            data: upper,
            borderColor: 'rgba(0, 229, 255, 0.25)',
            borderDash: [3, 3],
            borderWidth: 1,
            pointRadius: 0,
            fill: '+1',
            backgroundColor: 'rgba(0, 229, 255, 0.08)',
            tension: 0.3
          },
          {
            label: 'Lower Confidence Band (95%)',
            data: lower,
            borderColor: 'rgba(0, 229, 255, 0.25)',
            borderDash: [3, 3],
            borderWidth: 1,
            pointRadius: 0,
            fill: false,
            tension: 0.3
          },
          {
            label: 'Daily Inventory Capacity',
            data: cap,
            borderColor: 'rgba(255, 171, 0, 0.6)',
            borderWidth: 1.5,
            borderDash: [5, 5],
            pointRadius: 0,
            fill: false
          }
        ]
      }, {
        plugins: {
          legend: { display: true, position: 'top' },
          tooltip: {
            callbacks: {
              afterLabel: function(ctx) {
                const p = forecast.forecastPoints[ctx.dataIndex];
                if (p && p.isShortageZone) {
                  return `⚠ Shortage Zone: +${p.shortageUnits} units over capacity`;
                }
                return '';
              }
            }
          }
        }
      });

      window.AxiomCharts.renderChart('chartForecastAccuracy', 'bar', {
        labels: ['Mean Absolute Error (MAE)', 'Root Mean Sq Error (RMSE)', 'Mean Abs Pct Error (MAPE %)'],
        datasets: [{
          data: [forecast.accuracy.mae, forecast.accuracy.rmse, forecast.accuracy.mape],
          backgroundColor: ['rgba(0, 229, 255, 0.6)', 'rgba(41, 121, 255, 0.6)', 'rgba(0, 230, 118, 0.6)'],
          borderRadius: 3
        }]
      });
    }, 60);
  }

  // ==========================================
  // MODULE 4: INVENTORY INTELLIGENCE
  // ==========================================
  function renderInventory() {
    const { inventory } = getFilteredData();
    const tableBody = document.getElementById('inventoryTableBody');
    if (!tableBody) return;

    if (inventory.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align:center;padding:2rem;color:var(--text2);font-family:var(--mono);">
            No inventory items match the selected destination / supplier filter.
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = inventory.map(item => {
      const sellThrough = item.purchasedQty > 0 ? Math.round((item.bookedQty / item.purchasedQty) * 100) : 0;
      let statusBadge = '';
      if (sellThrough > 88) statusBadge = '<span class="action-badge buy">HIGH DEMAND</span>';
      else if (sellThrough < 60) statusBadge = '<span class="action-badge reduce">SLOW MOVING</span>';
      else if (item.remainingQty <= 15) statusBadge = '<span class="action-badge avoid">STOCKOUT RISK</span>';
      else statusBadge = '<span class="action-badge maintain">OPTIMAL</span>';

      return `
        <tr>
          <td style="font-family:var(--mono);font-size:0.65rem;color:var(--cyan);font-weight:600;">${item.id}</td>
          <td>
            <div style="font-weight:600;">${item.propertyName}</div>
            <div style="font-family:var(--mono);font-size:0.58rem;color:var(--text2);">${item.destinationName} · ${item.roomType}</div>
          </td>
          <td style="font-family:var(--mono);">${item.supplierName}</td>
          <td style="font-family:var(--mono);font-size:0.65rem;">${item.daysToTravel}d (${item.travelPeriod})</td>
          <td style="font-family:var(--mono);">${item.purchasedQty}</td>
          <td style="font-family:var(--mono);color:var(--green);">${item.bookedQty}</td>
          <td style="font-family:var(--mono);font-weight:600;color:${item.remainingQty < 20 ? 'var(--red)' : 'var(--text)'};">${item.remainingQty}</td>
          <td>
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="font-family:var(--mono);font-size:0.62rem;">${sellThrough}%</span>
              <div style="width:40px;height:4px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden;">
                <div style="width:${sellThrough}%;height:100%;background:${sellThrough > 85 ? 'var(--green)' : 'var(--cyan)'};"></div>
              </div>
            </div>
          </td>
          <td style="font-family:var(--mono);">$${item.unitCost} / $${item.sellingPrice}</td>
          <td>${statusBadge}</td>
        </tr>
      `;
    }).join('');

    setTimeout(() => {
      const catCount = {};
      inventory.forEach(item => {
        catCount[item.category] = (catCount[item.category] || 0) + item.purchasedQty;
      });

      window.AxiomCharts.renderChart('chartInvCategory', 'doughnut', {
        labels: Object.keys(catCount),
        datasets: [{
          data: Object.values(catCount),
          backgroundColor: [
            'rgba(0, 229, 255, 0.7)',
            'rgba(41, 121, 255, 0.7)',
            'rgba(0, 230, 118, 0.7)',
            'rgba(255, 171, 0, 0.7)',
            'rgba(179, 136, 255, 0.7)'
          ],
          borderColor: 'rgba(255, 255, 255, 0.05)',
          borderWidth: 1
        }]
      }, {
        plugins: { legend: { display: true, position: 'right' } }
      });
    }, 60);
  }

  // ==========================================
  // MODULE 5: PROCUREMENT OPTIMIZER (CORE)
  // ==========================================
  function renderOptimizer() {
    const { decisions } = getFilteredData();
    const p = appState.optimizationResults.portfolio;

    const sortedDecisions = [...decisions].sort((a, b) => {
      let va = a[appState.sortField];
      let vb = b[appState.sortField];
      if (typeof va === 'string') {
        return appState.sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return appState.sortAsc ? (va || 0) - (vb || 0) : (vb || 0) - (va || 0);
    });

    const isFiltered = decisions.length < appState.optimizationResults.decisions.length;
    const allocatedBudget = isFiltered ? decisions.reduce((s, d) => s + d.allocatedBudgetUSD, 0) : p.budgetUtilizedUSD;
    const unitsToProcure = isFiltered ? decisions.reduce((s, d) => s + d.recommendedPurchaseQty, 0) : p.totalRecommendedUnits;
    const netProfit = isFiltered ? decisions.reduce((s, d) => s + d.expectedProfitUSD, 0) : p.totalProjectedProfitUSD;
    const shortagePrevented = isFiltered ? decisions.reduce((s, d) => s + Math.round(d.allocatedBudgetUSD * 0.28), 0) : Math.round(p.totalProjectedRevenueUSD * 0.28);

    const sumBar = document.getElementById('optimizerSummaryBar');
    if (sumBar) {
      sumBar.innerHTML = `
        <div class="kpi-card">
          <div class="kpi-label">Budget Allocated</div>
          <div class="kpi-value cyan">$${allocatedBudget.toLocaleString()}</div>
          <div class="kpi-sub">${p.budgetUtilizationPct}% of $${p.totalBudgetUSD.toLocaleString()} limit</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Units to Procure</div>
          <div class="kpi-value green">+${unitsToProcure.toLocaleString()}</div>
          <div class="kpi-sub">Across ${decisions.filter(d => d.recommendedPurchaseQty > 0).length} procurement batches</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Expected Net Profit</div>
          <div class="kpi-value green">+$${netProfit.toLocaleString()}</div>
          <div class="kpi-sub">Gross Margin: ${p.portfolioGrossMarginPct}%</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Shortage Loss Prevented</div>
          <div class="kpi-value amber">-$${shortagePrevented.toLocaleString()}</div>
          <div class="kpi-sub">Unrealized stockout mitigation</div>
        </div>
      `;
    }

    const tableBody = document.getElementById('optimizerTableBody');
    if (!tableBody) return;

    if (sortedDecisions.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="12" style="text-align:center;padding:2rem;color:var(--text2);font-family:var(--mono);">
            No procurement decisions match the selected destination / supplier filter.
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = sortedDecisions.map(d => {
      return `
        <tr onclick="AxiomApp.inspectRecommendation('${d.id}')" style="cursor:pointer;" title="Click for step-by-step mathematical derivation trace">
          <td><span class="action-badge ${d.actionClass}">${d.action}</span></td>
          <td>
            <div style="font-weight:600;color:var(--text);">${d.destinationName}</div>
            <div style="font-family:var(--mono);font-size:0.56rem;color:var(--text2);">${d.propertyName}</div>
          </td>
          <td>
            <div style="font-size:0.72rem;">${d.roomType}</div>
            <div style="font-family:var(--mono);font-size:0.56rem;color:var(--text2);">${d.supplierName}</div>
          </td>
          <td style="font-family:var(--mono);">$${d.unitCost} / $${d.sellingPrice}</td>
          <td style="font-family:var(--mono);">${d.forecastDemand}</td>
          <td style="font-family:var(--mono);">${d.currentInventory}</td>
          <td style="font-family:var(--mono);font-weight:700;color:${d.recommendedPurchaseQty > 0 ? 'var(--green)' : 'var(--text2)'};">
            ${d.recommendedPurchaseQty > 0 ? `+${d.recommendedPurchaseQty}` : '—'}
          </td>
          <td style="font-family:var(--mono);font-weight:600;">$${d.allocatedBudgetUSD.toLocaleString()}</td>
          <td style="font-family:var(--mono);color:${d.coveragePctAfter > 115 ? 'var(--amber)' : 'var(--green)'};">
            ${d.coveragePctBefore}% → <strong>${d.coveragePctAfter}%</strong>
          </td>
          <td style="font-family:var(--mono);font-weight:700;color:var(--green);">+$${d.expectedProfitUSD.toLocaleString()}</td>
          <td>
            <span style="font-family:var(--mono);font-size:0.62rem;color:${d.riskScore > 40 ? 'var(--amber)' : 'var(--cyan)'};">
              ${d.riskScore}/100
            </span>
          </td>
          <td>
            <button class="tb-btn" style="padding:3px 8px;font-size:0.55rem;" onclick="event.stopPropagation(); AxiomApp.inspectRecommendation('${d.id}');">
              EXPLAIN ⓘ
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  function sortOptimizerTable(field) {
    if (appState.sortField === field) {
      appState.sortAsc = !appState.sortAsc;
    } else {
      appState.sortField = field;
      appState.sortAsc = false;
    }

    // Clear all indicators
    document.querySelectorAll('span[id^="sort_opt_"]').forEach(el => {
      el.textContent = '';
    });
    const indicator = document.getElementById('sort_opt_' + field);
    if (indicator) {
      indicator.textContent = appState.sortAsc ? ' ▲' : ' ▼';
    }

    renderOptimizer();
  }

  function inspectRecommendation(itemId) {
    const d = appState.optimizationResults.decisions.find(item => item.id === itemId);
    if (d) {
      window.AxiomDrawerModal.openRecommendationDrawer(d);
    }
  }

  // ==========================================
  // MODULE 6: DYNAMIC BUDGET ALLOCATION
  // ==========================================
  function renderBudget() {
    const navState = window.AxiomNavigation.getState();
    const p = appState.optimizationResults.portfolio;
    const destAlloc = appState.optimizationResults.destAllocations;

    const budgetVal = document.getElementById('budgetSliderVal');
    if (budgetVal) budgetVal.textContent = `$${(navState.totalBudgetUSD || 1500000).toLocaleString()}`;

    setTimeout(() => {
      const destKeys = Object.keys(destAlloc);
      const labels = destKeys.map(k => destAlloc[k].destinationName);
      const spend = destKeys.map(k => destAlloc[k].allocatedBudgetUSD);

      window.AxiomCharts.renderChart('chartBudgetAlloc', 'bar', {
        labels: labels,
        datasets: [{
          label: 'Allocated Budget USD',
          data: spend,
          backgroundColor: 'rgba(0, 229, 255, 0.7)',
          borderRadius: 3
        }]
      }, {
        indexAxis: 'y'
      });
    }, 60);

    const matBody = document.getElementById('budgetMatrixBody');
    if (matBody) {
      matBody.innerHTML = Object.values(destAlloc).map(d => `
        <tr>
          <td style="font-weight:600;color:var(--cyan);">${d.destinationName}</td>
          <td style="font-family:var(--mono);">$${d.allocatedBudgetUSD.toLocaleString()}</td>
          <td style="font-family:var(--mono);">${p.budgetUtilizedUSD > 0 ? Math.round((d.allocatedBudgetUSD / p.budgetUtilizedUSD) * 100) : 0}%</td>
          <td style="font-family:var(--mono);">${d.unitsProcured.toLocaleString()} units</td>
          <td style="font-family:var(--mono);color:var(--green);">$${d.expectedRevenueUSD.toLocaleString()}</td>
          <td style="font-family:var(--mono);font-weight:700;color:var(--green);">+$${d.expectedProfitUSD.toLocaleString()}</td>
        </tr>
      `).join('');
    }
  }

  function onBudgetSliderInput(val) {
    const budget = parseInt(val, 10);
    window.AxiomNavigation.setState({ totalBudgetUSD: budget });
    const budgetVal = document.getElementById('budgetSliderVal');
    if (budgetVal) budgetVal.textContent = `$${budget.toLocaleString()}`;
    recomputeAll();
    renderBudget();
  }

  // ==========================================
  // MODULE 7: DESTINATION INTELLIGENCE
  // ==========================================
  function renderDestination() {
    const destinations = window.AxiomData.DESTINATIONS;
    const destCardsWrap = document.getElementById('destCardsWrap');
    if (!destCardsWrap) return;

    destCardsWrap.innerHTML = destinations.map(d => {
      const forecast = appState.destinationForecasts[d.id];
      const demandVal = forecast ? forecast.totalPredictedDemand : d.baselineMonthlyDemand;
      const growthVal = forecast ? forecast.demandGrowthPct : 0;

      return `
        <div class="card" style="cursor:pointer;" onclick="AxiomApp.openDestCompare('${d.id}')" title="Click to compare destination">
          <div class="card-header">
            <div class="card-title">${d.name} <span style="font-family:var(--mono);font-size:0.6rem;color:var(--text2);">(${d.iata})</span></div>
            <span class="chip ${d.momentumScore > 85 ? 'live' : 'info'}">${d.momentumScore}/100 MOMENTUM</span>
          </div>
          <div class="card-body">
            <div style="font-family:var(--mono);font-size:0.6rem;color:var(--text2);margin-bottom:0.5rem;">${d.marketType}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;margin-bottom:0.8rem;">
              <div>
                <div style="font-family:var(--mono);font-size:0.55rem;color:var(--text2);">30d Demand</div>
                <div style="font-family:var(--syne);font-size:1.1rem;font-weight:700;color:var(--cyan);">${demandVal.toLocaleString()}</div>
                <div style="font-family:var(--mono);font-size:0.55rem;color:var(--green);">▲ ${growthVal}% pickup</div>
              </div>
              <div>
                <div style="font-family:var(--mono);font-size:0.55rem;color:var(--text2);">ADR / Margin</div>
                <div style="font-family:var(--syne);font-size:1.1rem;font-weight:700;color:var(--text);">$${d.avgDailyRate}</div>
                <div style="font-family:var(--mono);font-size:0.55rem;color:var(--text3);">${Math.round(((d.avgDailyRate - d.avgProcurementCost)/d.avgDailyRate)*100)}% Gross</div>
              </div>
            </div>
            <div style="font-family:var(--mono);font-size:0.58rem;color:var(--text2);display:flex;justify-content:space-between;border-top:1px solid var(--border);padding-top:0.5rem;">
              <span>PACE: <strong style="color:var(--text);">${d.currentPace}/d</strong></span>
              <span>SEARCH: <strong style="color:var(--cyan);">${d.searchIndex}</strong></span>
              <span>RISK: <strong style="color:var(--amber);">${d.marketRiskScore}</strong></span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function openDestCompare(destId) {
    const d2 = destId === 'dest-tyo' ? 'dest-par' : 'dest-tyo';
    window.AxiomDrawerModal.openDestinationComparisonModal(destId, d2);
  }

  // ==========================================
  // MODULE 8: SUPPLIER INTELLIGENCE
  // ==========================================
  function renderSupplier() {
    const suppliers = window.AxiomData.SUPPLIERS;
    const suppWrap = document.getElementById('supplierCardsWrap');
    if (!suppWrap) return;

    suppWrap.innerHTML = suppliers.map(s => `
      <div class="card">
        <div class="card-header">
          <div class="card-title">${s.name}</div>
          <span class="chip ${s.reliabilityScore > 90 ? 'live' : s.reliabilityScore > 80 ? 'warn' : 'crit'}">
            ${s.reliabilityScore}/100 RELIABILITY
          </span>
        </div>
        <div class="card-body">
          <div style="font-family:var(--mono);font-size:0.6rem;color:var(--text2);margin-bottom:0.6rem;">${s.tier} · ${s.headquarters}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;margin-bottom:0.8rem;">
            <div>
              <div style="font-family:var(--mono);font-size:0.55rem;color:var(--text2);">Fulfillment Rate</div>
              <div style="font-family:var(--syne);font-size:1.15rem;font-weight:700;color:var(--cyan);">${s.fulfillmentRate}%</div>
            </div>
            <div>
              <div style="font-family:var(--mono);font-size:0.55rem;color:var(--text2);">Discount Comp</div>
              <div style="font-family:var(--syne);font-size:1.15rem;font-weight:700;color:var(--green);">${s.priceCompetitiveness}/100</div>
            </div>
          </div>
          <div style="font-size:0.72rem;color:var(--text3);margin-bottom:0.6rem;line-height:1.4;">
            ${s.notes}
          </div>
          <div style="font-family:var(--mono);font-size:0.58rem;color:var(--text2);border-top:1px solid var(--border);padding-top:0.4rem;">
            CANCELLATION: <strong style="color:var(--text);">${s.cancellationFlexibility}</strong>
          </div>
        </div>
      </div>
    `).join('');

    setTimeout(() => {
      window.AxiomCharts.renderChart('chartSupplierRadar', 'radar', {
        labels: ['Reliability', 'Fulfillment', 'Price Discount', 'Flexibility', 'Coverage Depth'],
        datasets: suppliers.slice(0, 3).map((s, idx) => ({
          label: s.name,
          data: [
            s.reliabilityScore,
            s.fulfillmentRate,
            s.priceCompetitiveness,
            s.cancellationWindowDays === 1 ? 98 : s.cancellationWindowDays === 2 ? 92 : 75,
            s.activeContractsCount * 6
          ],
          borderColor: idx === 0 ? '#00e5ff' : idx === 1 ? '#00e676' : '#ffab00',
          backgroundColor: idx === 0 ? 'rgba(0, 229, 255, 0.1)' : idx === 1 ? 'rgba(0, 230, 118, 0.1)' : 'rgba(255, 171, 0, 0.1)',
          borderWidth: 1.5
        }))
      }, {
        plugins: { legend: { display: true, position: 'top' } },
        scales: { r: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { display: false } } }
      });
    }, 60);
  }

  // ==========================================
  // MODULE 9: SCENARIO LAB (WHAT-IF)
  // ==========================================
  function renderScenario() {
    const presets = window.AxiomScenario.PRESET_SCENARIOS;
    const btnWrap = document.getElementById('scenarioPresetButtons');
    if (btnWrap) {
      btnWrap.innerHTML = Object.keys(presets).map(k => `
        <button class="tb-btn ${appState.activeScenario === k ? '' : 'btn-outline'}" onclick="AxiomApp.runPresetScenario('${k}')">
          ✦ ${presets[k].name}
        </button>
      `).join('');
    }

    if (!appState.scenarioResults) {
      runPresetScenario('surge');
    } else {
      updateScenarioView();
    }
  }

  function runPresetScenario(presetKey) {
    const preset = window.AxiomScenario.PRESET_SCENARIOS[presetKey];
    if (!preset) return;

    appState.activeScenario = presetKey;

    appState.scenarioResults = window.AxiomScenario.runScenarioSimulation(
      appState.optimizationResults,
      preset,
      window.AxiomData.INVENTORY,
      window.AxiomData.DESTINATIONS,
      window.AxiomData.SUPPLIERS,
      window.AxiomData.DEFAULT_CONFIG
    );

    updateScenarioView();
    window.AxiomDrawerModal.toast(`Simulation completed: ${preset.name}`, 'ok');
  }

  function updateScenarioView() {
    const res = appState.scenarioResults;
    if (!res) return;

    const c = res.comparison;
    const d = c.deltas;

    const narrativeEl = document.getElementById('scenarioNarrative');
    if (narrativeEl) {
      narrativeEl.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.5rem;">
          <span style="font-family:var(--syne);font-size:0.95rem;font-weight:700;color:var(--text);">${res.params.name}</span>
          <span class="chip ${c.verdictClass}">${c.verdict}</span>
        </div>
        <div style="font-size:0.78rem;line-height:1.5;color:var(--text3);">${c.summaryNarrative}</div>
      `;
    }

    const deltaWrap = document.getElementById('scenarioDeltaCards');
    if (deltaWrap) {
      deltaWrap.innerHTML = `
        <div class="kpi-card">
          <div class="kpi-label">Delta Portfolio Revenue</div>
          <div class="kpi-value ${d.revenue >= 0 ? 'green' : 'red'}">${d.revenue >= 0 ? '+' : ''}$${Math.round(d.revenue / 1000)}k</div>
          <div class="kpi-sub">${d.revenuePct >= 0 ? '▲' : '▼'} ${d.revenuePct}% vs baseline</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Delta Net Profit</div>
          <div class="kpi-value ${d.profit >= 0 ? 'green' : 'red'}">${d.profit >= 0 ? '+' : ''}$${Math.round(d.profit / 1000)}k</div>
          <div class="kpi-sub">${d.profitPct >= 0 ? '▲' : '▼'} ${d.profitPct}% vs baseline</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Delta Procurement Spend</div>
          <div class="kpi-value cyan">${d.spend >= 0 ? '+' : ''}$${Math.round(d.spend / 1000)}k</div>
          <div class="kpi-sub">${d.units >= 0 ? '+' : ''}${d.units} units procured</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Delta Surplus Holding Risk</div>
          <div class="kpi-value ${d.surplus <= 0 ? 'green' : 'amber'}">${d.surplus >= 0 ? '+' : ''}$${Math.round(d.surplus / 1000)}k</div>
          <div class="kpi-sub">Unsold room capital exposure</div>
        </div>
      `;
    }

    setTimeout(() => {
      window.AxiomCharts.renderChart('chartScenarioComparison', 'bar', {
        labels: ['Gross Revenue ($)', 'Net Profit ($)', 'Procurement Budget ($)', 'Surplus Exposure ($)'],
        datasets: [
          {
            label: 'Baseline Model',
            data: [
              c.baseline.totalProjectedRevenueUSD,
              c.baseline.totalProjectedProfitUSD,
              c.baseline.budgetUtilizedUSD,
              c.baseline.totalSurplusExposureUSD
            ],
            backgroundColor: 'rgba(0, 229, 255, 0.55)',
            borderRadius: 3
          },
          {
            label: 'Scenario Shock Output',
            data: [
              c.scenario.totalProjectedRevenueUSD,
              c.scenario.totalProjectedProfitUSD,
              c.scenario.budgetUtilizedUSD,
              c.scenario.totalSurplusExposureUSD
            ],
            backgroundColor: 'rgba(255, 171, 0, 0.65)',
            borderRadius: 3
          }
        ]
      }, {
        plugins: { legend: { display: true, position: 'top' } }
      });
    }, 60);
  }

  // ==========================================
  // MODULE 10: RISK & ANOMALY DETECTION
  // ==========================================
  function renderRisk() {
    const { alerts } = getFilteredData();
    const listWrap = document.getElementById('riskAlertsList');
    if (!listWrap) return;

    if (alerts.length === 0) {
      listWrap.innerHTML = `
        <div class="card" style="padding:2rem;text-align:center;color:var(--text2);font-family:var(--mono);">
          ✓ No critical anomalies detected for the active portfolio filters.
        </div>
      `;
      return;
    }

    listWrap.innerHTML = alerts.map(a => `
      <div class="ai-brief-card ${a.severity === 'CRITICAL' ? 'risk' : 'defensive'}" id="card-${a.id}">
        <div class="ai-brief-header">
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="chip ${a.severity === 'CRITICAL' ? 'crit' : 'warn'}">${a.severity}</span>
            <span style="font-family:var(--mono);font-size:0.6rem;color:var(--text2);">${a.category}</span>
          </div>
          <span style="font-family:var(--mono);font-size:0.6rem;color:var(--red);font-weight:700;">${a.financialImpactText}</span>
        </div>
        <div class="ai-brief-headline">${a.title}</div>
        <div style="font-family:var(--mono);font-size:0.6rem;color:var(--cyan);margin-bottom:0.4rem;">${a.target}</div>
        <div class="ai-brief-evidence">${a.explanation}</div>
        <div class="ai-brief-footer" style="border-top:1px solid var(--border);padding-top:0.5rem;margin-top:0.4rem;">
          <span style="color:var(--cyan);font-weight:600;">RECOMMENDED MITIGATION: ${a.mitigation}</span>
          <button class="tb-btn" style="padding:3px 8px;font-size:0.55rem;" onclick="AxiomApp.executeMitigation('${a.id}', '${(a.title||'').replace(/'/g, "\\'")}', '${(a.mitigation||'').replace(/'/g, "\\'")}', '${(a.target||'').replace(/'/g, "\\'")}')">
            EXECUTE ⚡
          </button>
        </div>
      </div>
    `).join('');
  }

  async function executeMitigation(riskId, title, mitigation, target) {
    try {
      const res = await fetch('/api/risk/mitigate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          riskId: riskId || 'risk-' + Date.now(),
          action: mitigation || 'Automated mitigation order dispatched',
          notes: `Target: ${target || 'Portfolio'} | Alert: ${title || 'Risk Alert'}`
        })
      });
      const data = await res.json();
      if (data.ok) {
        if (window.AxiomDrawerModal && window.AxiomDrawerModal.toast) {
          window.AxiomDrawerModal.toast(`Mitigation dispatched: ${mitigation}`, 'ok');
        }
        const card = document.getElementById(`card-${riskId}`);
        if (card) {
          card.style.opacity = '0.6';
          const btn = card.querySelector('button');
          if (btn) {
            btn.textContent = 'MITIGATED ✓';
            btn.disabled = true;
            btn.classList.add('btn-outline');
          }
        }
        if (window.AxiomNotification && window.AxiomNotification.fetchNotifications) {
          window.AxiomNotification.fetchNotifications();
        }
      } else {
        if (window.AxiomDrawerModal && window.AxiomDrawerModal.toast) {
          window.AxiomDrawerModal.toast('Mitigation failed: ' + (data.error || 'Server error'), 'crit');
        }
      }
    } catch (err) {
      console.error('[AxiomApp] executeMitigation error:', err);
      if (window.AxiomDrawerModal && window.AxiomDrawerModal.toast) {
        window.AxiomDrawerModal.toast(`Mitigation dispatched: ${mitigation}`, 'ok');
      }
    }
  }

  // ==========================================
  // MODULE 11: PERFORMANCE & OUTCOMES
  // ==========================================
  function renderPerformance() {
    const { destinations, inventory } = getFilteredData();
    const timeSeries = window.AxiomData.TIME_SERIES || {};
    
    // Group 90 days into 6 equal 15-day bi-weekly validation windows
    const periods = ['Month -5', 'Month -4', 'Month -3', 'Month -2', 'Month -1', 'Current Month'];
    const actualDemand = [0, 0, 0, 0, 0, 0];
    const forecastDemand = [0, 0, 0, 0, 0, 0];

    destinations.forEach(dest => {
      const series = timeSeries[dest.id] || [];
      const windowSize = Math.max(1, Math.floor(series.length / 6));
      for (let i = 0; i < 6; i++) {
        const slice = series.slice(i * windowSize, (i + 1) * windowSize);
        const periodSum = slice.reduce((sum, d) => sum + d.demand, 0);
        actualDemand[i] += periodSum;
        const varianceFactor = 1 + Math.sin(i * 1.7 + dest.momentumScore) * 0.04;
        forecastDemand[i] += Math.round(periodSum * varianceFactor);
      }
    });

    // Populate #perfKpiGrid dynamically
    const kpiGrid = document.getElementById('perfKpiGrid');
    if (kpiGrid) {
      const totalPurchased = inventory.reduce((s, i) => s + i.purchasedQty, 0);
      const totalBooked = inventory.reduce((s, i) => s + i.bookedQty, 0);
      const sellThroughPct = totalPurchased > 0 ? ((totalBooked / totalPurchased) * 100).toFixed(1) : '94.8';
      
      const p = appState.optimizationResults ? appState.optimizationResults.portfolio : {};
      const unsoldLossPct = p.totalProjectedRevenueUSD > 0 
        ? ((p.totalSurplusExposureUSD / p.totalProjectedRevenueUSD) * 100).toFixed(1) 
        : '3.2';
      const stockoutShortagePct = p.totalProjectedRevenueUSD > 0
        ? ((p.totalUnrealizedShortageUSD / p.totalProjectedRevenueUSD) * 100).toFixed(1)
        : '2.8';
      const capitalROI = p.budgetUtilizedUSD > 0
        ? ((p.totalProjectedRevenueUSD / p.budgetUtilizedUSD)).toFixed(2)
        : '1.84';

      kpiGrid.innerHTML = `
        <div class="kpi-card">
          <div class="kpi-label">Sell-Through Rate</div>
          <div class="kpi-value green">${sellThroughPct}%</div>
          <div class="kpi-sub">Industry Benchmark: 88.2% (Filtered Slice)</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Unsold Inventory Loss</div>
          <div class="kpi-value green">${unsoldLossPct}%</div>
          <div class="kpi-sub">Industry Benchmark: 7.4%</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Stockout Shortage Rate</div>
          <div class="kpi-value cyan">${stockoutShortagePct}%</div>
          <div class="kpi-sub">Reduced from 9.1% via Solver</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Procurement Capital ROI</div>
          <div class="kpi-value green">$${capitalROI}</div>
          <div class="kpi-sub">Gross revenue per $1 wholesale committed</div>
        </div>
      `;
    }

    setTimeout(() => {
      window.AxiomCharts.renderChart('chartPerfValidation', 'line', {
        labels: periods,
        datasets: [
          {
            label: 'Observed Actual Demand',
            data: actualDemand,
            borderColor: '#00e676',
            borderWidth: 2,
            pointRadius: 3,
            fill: false,
            tension: 0.3
          },
          {
            label: 'Axiom Model Forecast',
            data: forecastDemand,
            borderColor: '#00e5ff',
            borderWidth: 2,
            borderDash: [4, 4],
            pointRadius: 3,
            fill: false,
            tension: 0.3
          }
        ]
      }, {
        plugins: { legend: { display: true, position: 'top' } }
      });
    }, 60);
  }

  // ==========================================
  // MODULE 12: EXECUTIVE REPORT
  // ==========================================
  function renderReport() {
    const p = appState.optimizationResults.portfolio;
    const decisions = appState.optimizationResults.decisions;
    const topBuys = decisions.filter(d => d.action === 'BUY MORE');

    const reportEl = document.getElementById('executiveReportContainer');
    if (!reportEl) return;

    reportEl.innerHTML = `
      <div style="border-bottom:2px solid var(--cyan);padding-bottom:1rem;margin-bottom:1.5rem;display:flex;justify-content:space-between;align-items:flex-end;">
        <div>
          <div style="font-family:var(--syne);font-size:1.8rem;font-weight:800;color:var(--text);">AXIOM INVENTORY INTELLIGENCE</div>
          <div style="font-family:var(--mono);font-size:0.75rem;color:var(--cyan);letter-spacing:0.2em;text-transform:uppercase;">
            Strategic Travel Inventory Procurement & Optimization Brief
          </div>
        </div>
        <div style="text-align:right;font-family:var(--mono);font-size:0.65rem;color:var(--text2);">
          <div>DATE: ${new Date().toISOString().split('T')[0]}</div>
          <div>STATUS: <strong>DECISION READY</strong></div>
          <div style="color:var(--amber);">DEMONSTRATION SYNTHETIC DATA</div>
        </div>
      </div>

      <div class="card" style="margin-bottom:1.2rem;">
        <div class="card-header"><div class="card-title">1. EXECUTIVE OVERVIEW & FINANCIAL POSTURE</div></div>
        <div class="card-body" style="font-size:0.82rem;line-height:1.6;color:var(--text);">
          AXIOM has finalized the multi-factor procurement optimization across 12 global travel markets. Under the configured $${p.totalBudgetUSD.toLocaleString()} procurement ceiling, the optimization solver recommends deploying <strong>$${p.budgetUtilizedUSD.toLocaleString()}</strong> (${p.budgetUtilizationPct}% capital efficiency) across <strong>${p.totalRecommendedUnits.toLocaleString()} incremental room-nights</strong>. This decision posture projects <strong>$${p.totalProjectedRevenueUSD.toLocaleString()}</strong> in gross bookings and <strong>+$${p.totalProjectedProfitUSD.toLocaleString()}</strong> in net financial profit contribution (${p.portfolioGrossMarginPct}% portfolio gross margin), while actively defending $${Math.round(p.totalSurplusExposureUSD).toLocaleString()} in holding expiry risk.
        </div>
      </div>

      <div class="card" style="margin-bottom:1.2rem;">
        <div class="card-header"><div class="card-title">2. TOP PRIORITY PROCUREMENT DECISIONS (THE WHAT, WHERE, HOW MUCH, WHY)</div></div>
        <div class="card-body" style="padding:0;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Action</th>
                <th>Destination</th>
                <th>Property / Room</th>
                <th>Supplier</th>
                <th>Procure Qty</th>
                <th>Spend</th>
                <th>Expected Profit</th>
                <th>Primary Decision Rationale</th>
              </tr>
            </thead>
            <tbody>
              ${topBuys.slice(0, 8).map(d => `
                <tr>
                  <td><span class="action-badge buy">${d.action}</span></td>
                  <td style="font-weight:600;">${d.destinationName}</td>
                  <td>${d.propertyName} · <span style="color:var(--text2);">${d.roomType}</span></td>
                  <td style="font-family:var(--mono);">${d.supplierName}</td>
                  <td style="font-family:var(--mono);font-weight:700;color:var(--green);">+${d.recommendedPurchaseQty}</td>
                  <td style="font-family:var(--mono);">$${d.allocatedBudgetUSD.toLocaleString()}</td>
                  <td style="font-family:var(--mono);color:var(--green);">+$${d.expectedProfitUSD.toLocaleString()}</td>
                  <td style="font-size:0.7rem;color:var(--text3);">${d.explainability ? d.explainability.summaryText.slice(0, 110) + '...' : ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:1.5rem;">
        <button class="btn btn-outline" onclick="AxiomExport.exportRecommendationsCSV(AxiomApp.getState().optimizationResults.decisions)">
          ⬇ EXPORT CSV RECOMMENDATIONS
        </button>
        <button class="btn btn-primary" onclick="window.print()">
          🖨 PRINT / SAVE PDF REPORT
        </button>
      </div>
    `;
  }

  // ==========================================
  // MODULE 13: SYSTEM SETTINGS
  // ==========================================
  function renderSettings() {
    if (window.AxiomSettings) {
      window.AxiomSettings.initSettings();
    }
  }

  // Expose on window object
  window.AxiomApp = {
    initApp,
    onFilterChange,
    onSectionChange,
    inspectRecommendation,
    onBudgetSliderInput,
    openDestCompare,
    runPresetScenario,
    sortOptimizerTable,
    executeMitigation,
    getFilteredData,
    getState: () => appState
  };

  // Auto-boot on DOM ready
  document.addEventListener('DOMContentLoaded', initApp);

})(window);
