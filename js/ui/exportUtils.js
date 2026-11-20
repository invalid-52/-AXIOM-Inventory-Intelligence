/**
 * AXIOM INVENTORY INTELLIGENCE
 * Export & Executive Report Generator
 * 
 * Generates downloadable CSV data files and triggers
 * executive print-ready PDF reporting.
 */

(function(window) {
  'use strict';

  /**
   * Triggers a browser download of CSV text
   */
  function downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    window.AxiomDrawerModal.toast(`Export successful: ${filename}`, 'ok');
  }

  /**
   * Export Procurement Optimization Recommendations to CSV
   */
  function exportRecommendationsCSV(decisions) {
    if (!decisions || decisions.length === 0) {
      window.AxiomDrawerModal.toast('No procurement decisions available to export', 'warn');
      return;
    }

    const headers = [
      'Action',
      'Contract_ID',
      'Destination',
      'Property_Name',
      'Room_Type',
      'Supplier',
      'Unit_Cost_USD',
      'Selling_Price_USD',
      'Gross_Margin_Pct',
      'Forecast_Demand_Units',
      'Current_Inventory_Units',
      'Recommended_Purchase_Units',
      'Allocated_Budget_USD',
      'Post_Procurement_Coverage_Pct',
      'Expected_Revenue_USD',
      'Expected_Profit_USD',
      'Marginal_ROI_Pct',
      'Risk_Score',
      'Optimization_Rationale'
    ];

    const rows = decisions.map(d => {
      const rationale = (d.explainability && d.explainability.summaryText) 
        ? `"${d.explainability.summaryText.replace(/"/g, '""')}"` 
        : `"${d.action}"`;

      return [
        d.action,
        d.id,
        `"${d.destinationName}"`,
        `"${d.propertyName}"`,
        `"${d.roomType}"`,
        `"${d.supplierName}"`,
        d.unitCost,
        d.sellingPrice,
        d.unitMarginPct,
        d.forecastDemand,
        d.currentInventory,
        d.recommendedPurchaseQty,
        d.allocatedBudgetUSD,
        d.coveragePctAfter,
        d.expectedRevenueUSD,
        d.expectedProfitUSD,
        d.marginalROI,
        d.riskScore,
        rationale
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    downloadCSV(csv, `AXIOM_Procurement_Decisions_${new Date().toISOString().split('T')[0]}.csv`);
  }

  /**
   * Export Inventory Registry Audit to CSV
   */
  function exportInventoryCSV(inventoryList) {
    if (!inventoryList || inventoryList.length === 0) return;

    const headers = [
      'Inventory_ID',
      'Destination',
      'Property_Name',
      'Room_Type',
      'Category',
      'Supplier',
      'Days_To_Travel',
      'Purchased_Qty',
      'Booked_Qty',
      'Remaining_Qty',
      'Sell_Through_Pct',
      'Unit_Cost_USD',
      'Selling_Price_USD',
      'Current_Pace_Daily',
      'Cancellation_Rate_Pct'
    ];

    const rows = inventoryList.map(item => {
      const sellThrough = item.purchasedQty > 0 ? Math.round((item.bookedQty / item.purchasedQty) * 100) : 0;
      return [
        item.id,
        `"${item.destinationName}"`,
        `"${item.propertyName}"`,
        `"${item.roomType}"`,
        `"${item.category}"`,
        `"${item.supplierName}"`,
        item.daysToTravel,
        item.purchasedQty,
        item.bookedQty,
        item.remainingQty,
        sellThrough,
        item.unitCost,
        item.sellingPrice,
        item.currentPace,
        Math.round(item.cancellationRate * 1000) / 10
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    downloadCSV(csv, `AXIOM_Inventory_Audit_${new Date().toISOString().split('T')[0]}.csv`);
  }

  /**
   * Export Scenario Lab Comparison to CSV
   */
  function exportScenarioCSV(scenarioData) {
    if (!scenarioData || !scenarioData.comparison) return;

    const c = scenarioData.comparison;
    const rows = [
      ['Metric', 'Baseline', 'Scenario', 'Delta', 'Delta_Pct'],
      ['Total Portfolio Revenue', `$${c.baseline.totalProjectedRevenueUSD.toLocaleString()}`, `$${c.scenario.totalProjectedRevenueUSD.toLocaleString()}`, `$${c.deltas.revenue.toLocaleString()}`, `${c.deltas.revenuePct}%`],
      ['Total Projected Gross Profit', `$${c.baseline.totalProjectedProfitUSD.toLocaleString()}`, `$${c.scenario.totalProjectedProfitUSD.toLocaleString()}`, `$${c.deltas.profit.toLocaleString()}`, `${c.deltas.profitPct}%`],
      ['Gross Margin Pct', `${c.baseline.portfolioGrossMarginPct}%`, `${c.scenario.portfolioGrossMarginPct}%`, `${c.deltas.marginPct}%`, 'N/A'],
      ['Budget Utilized USD', `$${c.baseline.budgetUtilizedUSD.toLocaleString()}`, `$${c.scenario.budgetUtilizedUSD.toLocaleString()}`, `$${c.deltas.spend.toLocaleString()}`, 'N/A'],
      ['Units Procured', c.baseline.totalRecommendedUnits, c.scenario.totalRecommendedUnits, c.deltas.units, 'N/A'],
      ['Surplus Holding Exposure', `$${c.baseline.totalSurplusExposureUSD.toLocaleString()}`, `$${c.scenario.totalSurplusExposureUSD.toLocaleString()}`, `$${c.deltas.surplus.toLocaleString()}`, 'N/A'],
      ['Unrealized Shortage Loss', `$${c.baseline.totalUnrealizedShortageUSD.toLocaleString()}`, `$${c.scenario.totalUnrealizedShortageUSD.toLocaleString()}`, `$${c.deltas.shortage.toLocaleString()}`, 'N/A']
    ];

    const csv = rows.map(r => r.join(',')).join('\n');
    downloadCSV(csv, `AXIOM_Scenario_Comparison_${new Date().toISOString().split('T')[0]}.csv`);
  }

  /**
   * Triggers the Print/PDF export modal
   */
  function printExecutiveReport() {
    // Switch to Report view first
    window.AxiomNavigation.switchSection('report');
    setTimeout(() => {
      window.print();
    }, 400);
  }

  window.AxiomExport = {
    exportRecommendationsCSV,
    exportInventoryCSV,
    exportScenarioCSV,
    printExecutiveReport
  };

})(window);
