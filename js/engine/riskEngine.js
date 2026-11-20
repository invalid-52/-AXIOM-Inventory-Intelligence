/**
 * AXIOM INVENTORY INTELLIGENCE
 * Risk & Alert Center Engine
 * 
 * Scans travel inventory, demand projections, booking velocities,
 * and supplier fulfillment histories to detect and quantify business risks.
 * 
 * Quantifies exact financial impact ($ at risk) and provides actionable mitigations.
 * Prioritized strictly by financial exposure.
 */

(function(window) {
  'use strict';

  /**
   * Run the Risk Engine across current optimization state & inventory
   * @param {Array} decisions - Procurement optimization decisions
   * @param {Array} destinations - Destinations array
   * @param {Array} suppliers - Suppliers array
   * @param {Object} portfolio - Portfolio financial summary
   * @returns {Array} List of prioritized risk alerts with financial impact and mitigation
   */
  function scanPortfolioRisks(decisions, destinations, suppliers, portfolio) {
    const alerts = [];

    // Lookup helpers
    const supplierMap = {};
    suppliers.forEach(s => { supplierMap[s.id] = s; });

    const destMap = {};
    destinations.forEach(d => { destMap[d.id] = d; });

    // 1. Scan Inventory for Stockout / Shortage Risks
    decisions.forEach(d => {
      // If current inventory plus recommended purchase still leaves unmet demand
      const unmetDemand = Math.max(0, d.forecastDemand - d.totalUnitsAfterPurchase);
      const isImminentShortage = (d.currentInventory <= d.batchSize && d.forecastDemand > d.currentInventory * 2);

      if (isImminentShortage || unmetDemand > 15) {
        const lostRevenue = Math.round(unmetDemand * d.sellingPrice);
        const lostProfit = Math.round(unmetDemand * d.unitMargin);
        const sev = lostRevenue > 40000 ? 'CRITICAL' : lostRevenue > 15000 ? 'HIGH' : 'MEDIUM';

        alerts.push({
          id: `RISK-SHORT-${d.id}`,
          category: 'Inventory Shortage',
          severity: sev,
          title: `Imminent Room Stockout: ${d.propertyName}`,
          target: `${d.destinationName} · ${d.roomType}`,
          destinationId: d.destinationId,
          supplierId: d.supplierId,
          financialImpactUSD: lostRevenue,
          financialImpactText: `-$${lostRevenue.toLocaleString()} potential revenue lost (-$${lostProfit.toLocaleString()} gross margin)`,
          probability: Math.round(Math.min(96, 75 + (d.forecastDemand / Math.max(1, d.currentInventory)) * 5)),
          explanation: `Remaining stock is down to ${d.currentInventory} units against an expected demand of ${d.forecastDemand} units over the next 30 days. Booking pace is accelerating at ${d.item.currentPace}/day. Without immediate allocation procurement, stockout will occur within 3–5 days.`,
          mitigation: `Execute immediate emergency purchase of +${d.recommendedPurchaseQty > 0 ? d.recommendedPurchaseQty : d.batchSize * 2} units from ${d.supplierName} to secure seasonal margin.`,
          actionType: 'PROCURE'
        });
      }
    });

    // 2. Scan Inventory for Holding & Aging Expiry Losses (Unsold Over-provisioning)
    decisions.forEach(d => {
      const isAging = d.daysToTravel <= 21;
      const surplusUnits = Math.max(0, d.currentInventory - d.forecastDemand);
      const hasExcess = (d.coveragePctBefore >= 125 && surplusUnits >= 20);

      if (isAging && hasExcess) {
        const capitalExposed = Math.round(surplusUnits * d.unitCost);
        const sev = capitalExposed > 35000 ? 'CRITICAL' : capitalExposed > 15000 ? 'HIGH' : 'MEDIUM';

        alerts.push({
          id: `RISK-AGING-${d.id}`,
          category: 'Unsold Inventory & Aging Risk',
          severity: sev,
          title: `Over-Provisioned Allotment Expiring: ${d.propertyName}`,
          target: `${d.destinationName} · ${d.travelPeriod}`,
          destinationId: d.destinationId,
          supplierId: d.supplierId,
          financialImpactUSD: capitalExposed,
          financialImpactText: `$${capitalExposed.toLocaleString()} unrecovered capital at risk of full expiry`,
          probability: Math.round(Math.min(92, 60 + (21 - d.daysToTravel) * 2)),
          explanation: `Inventory contract has ${d.daysToTravel} days until check-in with ${d.currentInventory} units remaining, but demand projection accounts for only ${d.forecastDemand} bookings. High risk of unsold room expiration under current rate parity.`,
          mitigation: `Release ${Math.round(surplusUnits * 0.7)} uncommitted units back to ${d.supplierName} prior to cancellation deadline or activate promotional B2B package markdown.`,
          actionType: 'RELEASE_OR_MARKDOWN'
        });
      }
    });

    // 3. Scan Suppliers for Reliability & Fulfillment Failures
    suppliers.forEach(s => {
      if (s.reliabilityScore < 85 || s.fulfillmentRate < 93.0) {
        // Calculate total procurement exposure tied to this supplier
        let exposedCapital = 0;
        decisions.forEach(d => {
          if (d.supplierId === s.id) exposedCapital += d.allocatedBudgetUSD;
        });

        const totalExposure = exposedCapital > 0 ? exposedCapital : s.utilizedCreditUSD * 0.4;
        const sev = s.reliabilityScore < 80 ? 'CRITICAL' : 'HIGH';

        alerts.push({
          id: `RISK-SUPP-${s.id}`,
          category: 'Supplier Fulfillment Risk',
          severity: sev,
          title: `Elevated Fulfillment Failure Rate: ${s.name}`,
          target: `${s.tier} · ${s.headquarters}`,
          destinationId: 'all',
          supplierId: s.id,
          financialImpactUSD: Math.round(totalExposure),
          financialImpactText: `$${Math.round(totalExposure).toLocaleString()} procurement volume exposed to delay or stop-sale`,
          probability: Math.round(100 - s.fulfillmentRate + 15),
          explanation: `${s.name} fulfillment reliability is degraded at ${s.fulfillmentRate}%, below our 95% enterprise SLA benchmark. Their cancellation clause is '${s.cancellationFlexibility}', risking unconfirmed bookings and customer re-accommodation costs during peak season.`,
          mitigation: `Hedge procurement by diverting high-value luxury allotments to NexusBeds Global or Horizon BedBank. Place ${s.name} on restricted quota watch.`,
          actionType: 'REALLOCATE_SUPPLIER'
        });
      }
    });

    // 4. Scan Destinations for Booking Pace Deceleration Shocks
    destinations.forEach(dest => {
      const paceRatio = dest.historicalPaceBase > 0 ? (dest.currentPace / dest.historicalPaceBase) : 1.0;
      if (paceRatio < 0.88) { // >12% slowdown
        const paceDropPct = Math.round((1 - paceRatio) * 100);
        const revenueExposure = Math.round(dest.baselineMonthlyDemand * dest.avgDailyRate * (paceDropPct / 100) * 0.4);
        const sev = revenueExposure > 50000 ? 'HIGH' : 'MEDIUM';

        alerts.push({
          id: `RISK-PACE-${dest.id}`,
          category: 'Demand Deceleration Shock',
          severity: sev,
          title: `Booking Pace Decelerating: ${dest.name}`,
          target: `${dest.name} (${dest.country}) · Pace: ${dest.currentPace}/d vs ${dest.historicalPaceBase}/d`,
          destinationId: dest.id,
          supplierId: 'all',
          financialImpactUSD: revenueExposure,
          financialImpactText: `-$${revenueExposure.toLocaleString()} estimated revenue compression over 30d`,
          probability: 78,
          explanation: `Booking pickup in ${dest.name} has fallen by ${paceDropPct}% compared to seasonal benchmarks. Search query intent index is at ${dest.searchIndex}. Indicates localized softness or competitive price undercut from regional aggregators.`,
          mitigation: `Freeze incremental inventory commitments in ${dest.name}. Review B2B rate distribution and negotiate price promotions with local DMO partners.`,
          actionType: 'PAUSE_PROCUREMENT'
        });
      }
    });

    // 5. Scan Portfolio for Destination Concentration Risk
    if (portfolio && portfolio.budgetUtilizedUSD > 0) {
      const destSpend = {};
      decisions.forEach(d => {
        destSpend[d.destinationId] = (destSpend[d.destinationId] || 0) + d.allocatedBudgetUSD;
      });

      Object.keys(destSpend).forEach(dId => {
        const spend = destSpend[dId];
        const pct = (spend / portfolio.budgetUtilizedUSD) * 100;
        if (pct > 24.0) { // Single market exceeding concentration limit
          const destName = destMap[dId] ? destMap[dId].name : dId;
          const sev = pct > 28.0 ? 'CRITICAL' : 'HIGH';

          alerts.push({
            id: `RISK-CONC-${dId}`,
            category: 'Portfolio Concentration',
            severity: sev,
            title: `Excessive Capital Concentration: ${destName}`,
            target: `${destName} represents ${Math.round(pct)}% of total portfolio spend`,
            destinationId: dId,
            supplierId: 'all',
            financialImpactUSD: Math.round(spend),
            financialImpactText: `$${Math.round(spend).toLocaleString()} allocated to a single market destination`,
            probability: 65,
            explanation: `Procurement allocation in ${destName} accounts for ${Math.round(pct)}% of total capital deployed, breaching our 22% diversification ceiling. Any localized geopolitical, meteorological, or airline disruption would disproportionately impair portfolio gross margin.`,
            mitigation: `Rebalance budget allocation by trimming marginal ${destName} batches and re-allocating $${Math.round(spend * 0.15).toLocaleString()} to under-weighted emerging markets.`,
            actionType: 'REBALANCE_BUDGET'
          });
        }
      });
    }

    // Sort strictly by Financial Impact descending
    alerts.sort((a, b) => b.financialImpactUSD - a.financialImpactUSD);

    return alerts;
  }

  // Expose on window object
  window.AxiomRisk = {
    scanPortfolioRisks
  };

})(window);
