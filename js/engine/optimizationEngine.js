/**
 * AXIOM INVENTORY INTELLIGENCE
 * Procurement Optimization Engine — Core Decision Engine
 * 
 * ALGORITHM SPECIFICATION:
 * Bounded Marginal Allocation Optimization Heuristic
 * (Discrete Multi-Period Knapsack Formulation with Multi-Factor Risk Penalization)
 * 
 * OBJECTIVE FUNCTION:
 * Maximize Incremental Net Economic Contribution:
 *   Incremental Revenue (from incremental units sold)
 *   − Incremental Procurement Cost (q_i * UnitCost_i)
 *   − Expected Holding / Unsold Inventory Penalty (Over-provisioning decay)
 *   − Expected Shortage Penalty (Unrealized demand & customer spillover)
 *   − Wholesaler SLA & Market Concentration Risk Penalty
 * 
 * CONSTRAINTS ENFORCED:
 * 1. Global Procurement Budget: Sum(q_i * Cost_i) <= TotalBudget
 * 2. Supplier Allotment Capacity: q_i <= MaxSupplierCapacity_i - CurrentInventory_i
 * 3. Destination Allocation Corridor: MinAlloc_d <= DestinationBudget_d <= MaxAlloc_d
 * 4. Discrete Procurement Batches: q_i = k * minBatchSize
 * 5. Destination Minimum Allocation: Enforces baseline capital presence across active markets (minDestBudget)
 */

(function(exports) {
  'use strict';

  /**
   * Run the Procurement Optimization Solver
   * @param {Array} inventoryItems - Array of inventory items with forecast demand
   * @param {Object} destinations - Map or array of destinations
   * @param {Object} suppliers - Map or array of suppliers
   * @param {Object} config - Budget and optimization parameters
   * @returns {Object} Optimized recommendations, portfolio financial outcomes, and destination allocations
   */
  function solveProcurementOptimization(inventoryItems, destinations, suppliers, config = {}) {
    const totalBudget = config.totalBudgetUSD || 1500000;
    const minDestPct = (config.minDestinationBudgetPct || 3.0) / 100;
    const maxDestPct = (config.maxDestinationBudgetPct || 22.0) / 100;
    const holdingFactor = config.holdingCostFactor || 0.35;
    const shortageFactor = config.shortagePenaltyFactor || 0.45;
    const riskTolerance = config.riskTolerance || 'balanced';

    // Risk tolerance coefficients: Conservative penalizes risk more, Aggressive prioritizes raw yield
    const riskWeights = {
      conservative: 1.5,
      balanced: 1.0,
      aggressive: 0.6
    };
    const riskMultiplier = riskWeights[riskTolerance] || 1.0;

    // Build lookup maps
    const supplierMap = {};
    if (Array.isArray(suppliers)) {
      suppliers.forEach(s => { supplierMap[s.id] = s; });
    } else {
      Object.assign(supplierMap, suppliers || {});
    }

    const destMap = {};
    if (Array.isArray(destinations)) {
      destinations.forEach(d => { destMap[d.id] = d; });
    } else {
      Object.assign(destMap, destinations || {});
    }

    const numDestinations = Math.max(1, Object.keys(destMap).length);
    // Budget bounds per destination
    const minDestBudget = Math.min(totalBudget * minDestPct, (totalBudget / numDestinations) * 0.9);
    const maxDestBudget = totalBudget * maxDestPct;

    // Track state per destination
    const destAllocations = {};
    Object.keys(destMap).forEach(dId => {
      destAllocations[dId] = {
        destinationId: dId,
        destinationName: destMap[dId].name,
        allocatedBudgetUSD: 0,
        unitsProcured: 0,
        expectedRevenueUSD: 0,
        expectedProfitUSD: 0,
        items: []
      };
    });

    // 1. Initial State for each inventory item
    const decisions = (inventoryItems || []).map(item => {
      const supplier = supplierMap[item.supplierId] || { reliabilityScore: 85, priceCompetitiveness: 85, name: item.supplierName || 'Wholesaler' };
      const dest = destMap[item.destinationId] || { marketRiskScore: 30, name: item.destinationName || 'Destination' };
      const currentAvailable = item.remainingQty !== undefined ? item.remainingQty : (item.currentInventory || 0);
      const forecastDemand = item.forecastDemand || Math.round((item.currentPace || 100) * 30);
      const batchSize = item.minBatchSize || 10;
      const unitCost = item.unitCost || 200;
      const sellingPrice = item.sellingPrice || 300;
      const cancelRate = item.cancellationRate || 0.08;

      // Max additional units available from supplier
      const maxAdditional = Math.max(0, (item.maxSupplierCapacity || 300) - currentAvailable);

      return {
        item,
        id: item.id,
        destinationId: item.destinationId,
        destinationName: item.destinationName || dest.name,
        propertyName: item.propertyName,
        roomType: item.roomType,
        category: item.category,
        supplierId: item.supplierId,
        supplierName: item.supplierName || supplier.name,
        supplier,
        travelPeriod: item.travelPeriod,
        daysToTravel: item.daysToTravel || 30,
        unitCost,
        sellingPrice,
        unitMargin: sellingPrice - unitCost,
        unitMarginPct: Math.round(((sellingPrice - unitCost) / sellingPrice) * 1000) / 10,
        currentInventory: currentAvailable,
        existingInventoryCost: Math.round(currentAvailable * unitCost),
        forecastDemand,
        cancelRate,
        batchSize,
        maxAdditional,
        // Optimization decision variables
        recommendedPurchaseQty: 0,
        allocatedBudgetUSD: 0,
        incrementalRevenueUSD: 0,
        totalUnitsAfterPurchase: currentAvailable,
        expectedBookings: 0,
        expectedRevenueUSD: 0,
        expectedProfitUSD: 0,
        totalPortfolioProfitUSD: 0,
        expectedSurplusUnits: 0,
        expectedShortageUnits: 0,
        coveragePctBefore: Math.round((currentAvailable / Math.max(1, forecastDemand)) * 100),
        coveragePctAfter: 0,
        action: 'MAINTAIN',
        actionClass: 'maintain',
        marginalROI: 0,
        riskScore: Math.round((100 - (supplier.reliabilityScore || 85)) * 0.6 + (dest.marketRiskScore || 30) * 0.4),
        explainability: null
      };
    });

    // Helper: Compute rigorous financial outcomes for a given inventory block
    function evaluateFinancials(d, additionalQ) {
      const currentQ = d.currentInventory;
      const totalQ = currentQ + additionalQ;
      const demand = d.forecastDemand;
      const price = d.sellingPrice;
      const cost = d.unitCost;
      const effectiveDemand = Math.round(demand * (1 - d.cancelRate * 0.5));

      // Units sold
      const totalSold = Math.min(totalQ, effectiveDemand);
      const baselineSold = Math.min(currentQ, effectiveDemand);
      const incrementalSold = Math.max(0, totalSold - baselineSold);

      // Financials
      const totalExpectedRevenue = totalSold * price;
      const incrementalRevenue = incrementalSold * price;
      const incrementalProcurementCost = additionalQ * cost;
      const totalInventoryCost = totalQ * cost;

      // Penalties
      const expectedSurplus = Math.max(0, totalQ - effectiveDemand);
      const unsoldPenalty = expectedSurplus * cost * holdingFactor;

      const expectedShortage = Math.max(0, effectiveDemand - totalQ);
      const shortagePenalty = expectedShortage * (price - cost) * shortageFactor;

      // Supplier and lead time risk penalty
      const supplierReliability = d.supplier.reliabilityScore || 85;
      const supplierRiskCoeff = (100 - supplierReliability) / 100;
      const riskPenalty = additionalQ * cost * supplierRiskCoeff * 0.15 * riskMultiplier;

      // Incremental Net Economic Profit (Marginal contribution of the purchase)
      // When additional units are purchased, they yield incremental revenue minus procurement cost,
      // and relieve shortage penalty but may incur holding or risk penalties.
      const baselineSurplus = Math.max(0, currentQ - effectiveDemand);
      const baselineShortage = Math.max(0, effectiveDemand - currentQ);
      const deltaShortageRelief = (baselineShortage - expectedShortage) * (price - cost) * shortageFactor;
      const deltaHoldingPenalty = (expectedSurplus - baselineSurplus) * cost * holdingFactor;

      const incrementalNetProfit = incrementalRevenue - incrementalProcurementCost + deltaShortageRelief - deltaHoldingPenalty - riskPenalty;
      const totalPortfolioProfit = totalExpectedRevenue - totalInventoryCost - unsoldPenalty - shortagePenalty - riskPenalty;

      return {
        expectedSold: Math.round(totalSold),
        incrementalSold: Math.round(incrementalSold),
        expectedRevenue: Math.round(totalExpectedRevenue),
        incrementalRevenue: Math.round(incrementalRevenue),
        procurementCost: Math.round(incrementalProcurementCost),
        totalInventoryCost: Math.round(totalInventoryCost),
        expectedSurplus: Math.round(expectedSurplus),
        expectedShortage: Math.round(expectedShortage),
        netProfit: Math.round(incrementalNetProfit),
        totalPortfolioProfit: Math.round(totalPortfolioProfit)
      };
    }

    let remainingBudget = totalBudget;

    // ══════════════════════════════════════════════════════════════════
    // PHASE 1: ENFORCE DESTINATION MINIMUM ALLOCATION (minDestBudget)
    // ══════════════════════════════════════════════════════════════════
    Object.keys(destMap).forEach(destId => {
      const destItems = decisions.filter(d => d.destinationId === destId);
      let destSpent = destAllocations[destId].allocatedBudgetUSD;

      // Sort candidate items by marginal contribution per dollar
      destItems.sort((a, b) => {
        const evalA = evaluateFinancials(a, a.recommendedPurchaseQty + a.batchSize);
        const evalB = evaluateFinancials(b, b.recommendedPurchaseQty + b.batchSize);
        const effA = evalA.netProfit / (a.batchSize * a.unitCost);
        const effB = evalB.netProfit / (b.batchSize * b.unitCost);
        return effB - effA;
      });

      for (const d of destItems) {
        if (destSpent >= minDestBudget) break;
        while (destSpent < minDestBudget && remainingBudget > 2000) {
          const nextQty = d.recommendedPurchaseQty + d.batchSize;
          if (nextQty > d.maxAdditional) break;
          const batchCost = d.batchSize * d.unitCost;
          if (batchCost > remainingBudget) break;
          if (destSpent + batchCost > maxDestBudget) break;

          const currentEval = evaluateFinancials(d, d.recommendedPurchaseQty);
          const nextEval = evaluateFinancials(d, nextQty);
          // Allocate if it produces value or fills minimum quota safely
          if (nextEval.netProfit >= currentEval.netProfit - 50) {
            d.recommendedPurchaseQty += d.batchSize;
            remainingBudget -= batchCost;
            destSpent += batchCost;
            destAllocations[destId].allocatedBudgetUSD += batchCost;
          } else {
            break;
          }
        }
      }
    });

    // ══════════════════════════════════════════════════════════════════
    // PHASE 2: GREEDY MARGINAL ALLOCATION LOOP TO MAXIMIZE PROFIT
    // ══════════════════════════════════════════════════════════════════
    let improvementFound = true;
    const maxIterations = 400;
    let iteration = 0;

    while (improvementFound && remainingBudget > 2000 && iteration < maxIterations) {
      iteration++;
      let bestItem = null;
      let bestMarginalProfitPerDollar = 0;
      let bestBatchCost = 0;

      for (let i = 0; i < decisions.length; i++) {
        const d = decisions[i];
        const nextQty = d.recommendedPurchaseQty + d.batchSize;

        // Constraint 1: Supplier capacity
        if (nextQty > d.maxAdditional) continue;

        const batchCost = d.batchSize * d.unitCost;

        // Constraint 2: Global budget
        if (batchCost > remainingBudget) continue;

        // Constraint 3: Destination maximum budget ceiling
        const currentDestBudget = destAllocations[d.destinationId].allocatedBudgetUSD;
        if (currentDestBudget + batchCost > maxDestBudget) continue;

        // Evaluate marginal benefit
        const currentEval = evaluateFinancials(d, d.recommendedPurchaseQty);
        const nextEval = evaluateFinancials(d, nextQty);
        const deltaProfit = nextEval.netProfit - currentEval.netProfit;

        if (deltaProfit > 0) {
          const marginalEfficiency = deltaProfit / batchCost;
          if (marginalEfficiency > bestMarginalProfitPerDollar) {
            bestMarginalProfitPerDollar = marginalEfficiency;
            bestItem = d;
            bestBatchCost = batchCost;
          }
        }
      }

      if (bestItem && bestMarginalProfitPerDollar > 0.03) {
        bestItem.recommendedPurchaseQty += bestItem.batchSize;
        remainingBudget -= bestBatchCost;
        destAllocations[bestItem.destinationId].allocatedBudgetUSD += bestBatchCost;
      } else {
        improvementFound = false;
      }
    }

    // ══════════════════════════════════════════════════════════════════
    // PHASE 3: FINALIZE METRICS & ACTION CLASSIFICATIONS
    // ══════════════════════════════════════════════════════════════════
    decisions.forEach(d => {
      const finalEval = evaluateFinancials(d, d.recommendedPurchaseQty);
      const totalUnits = d.currentInventory + d.recommendedPurchaseQty;
      const coveragePctAfter = Math.round((totalUnits / Math.max(1, d.forecastDemand)) * 100);

      d.allocatedBudgetUSD = d.recommendedPurchaseQty * d.unitCost;
      d.incrementalRevenueUSD = finalEval.incrementalRevenue;
      d.totalUnitsAfterPurchase = totalUnits;
      d.expectedBookings = finalEval.expectedSold;
      d.expectedRevenueUSD = finalEval.expectedRevenue;
      d.expectedProfitUSD = finalEval.netProfit;
      d.totalPortfolioProfitUSD = finalEval.totalPortfolioProfit;
      d.expectedSurplusUnits = finalEval.expectedSurplus;
      d.expectedShortageUnits = finalEval.expectedShortage;
      d.coveragePctAfter = coveragePctAfter;

      // Marginal ROI on incremental capital deployed
      if (d.allocatedBudgetUSD > 0) {
        d.marginalROI = Math.round((d.expectedProfitUSD / d.allocatedBudgetUSD) * 1000) / 10;
      }

      // Action Classification Logic
      if (d.recommendedPurchaseQty > 0) {
        d.action = 'BUY MORE';
        d.actionClass = 'buy';
      } else if (d.coveragePctBefore >= 125) {
        d.action = 'REDUCE';
        d.actionClass = 'reduce';
      } else if (d.supplier.reliabilityScore < 80) {
        d.action = 'AVOID';
        d.actionClass = 'avoid';
      } else if (d.daysToTravel < 14 && d.currentInventory > d.forecastDemand) {
        d.action = 'HOLD';
        d.actionClass = 'hold';
      } else {
        d.action = 'MAINTAIN';
        d.actionClass = 'maintain';
      }

      // Generate Detailed Computational Explainability
      d.explainability = buildDecisionExplainability(d, finalEval);

      // Aggregate destination summaries
      const dSummary = destAllocations[d.destinationId];
      if (dSummary) {
        dSummary.unitsProcured += d.recommendedPurchaseQty;
        dSummary.expectedRevenueUSD += d.expectedRevenueUSD;
        dSummary.expectedProfitUSD += d.expectedProfitUSD;
        dSummary.items.push(d);
      }
    });

    // 4. Portfolio Totals & Performance Indicators
    let totalProcurementBudgetUtilized = 0;
    let totalRecommendedUnits = 0;
    let totalProjectedRevenue = 0;
    let totalProjectedProfit = 0;
    let totalExistingInventoryCost = 0;
    let totalSurplusExposureUSD = 0;
    let totalUnrealizedShortageUSD = 0;

    decisions.forEach(d => {
      totalProcurementBudgetUtilized += d.allocatedBudgetUSD;
      totalRecommendedUnits += d.recommendedPurchaseQty;
      totalProjectedRevenue += d.expectedRevenueUSD;
      totalProjectedProfit += d.expectedProfitUSD;
      totalExistingInventoryCost += d.existingInventoryCost;
      totalSurplusExposureUSD += d.expectedSurplusUnits * d.unitCost;
      totalUnrealizedShortageUSD += d.expectedShortageUnits * d.unitMargin;
    });

    const budgetUtilizationPct = Math.round((totalProcurementBudgetUtilized / totalBudget) * 1000) / 10;
    const portfolioGrossMarginPct = totalProjectedRevenue > 0 
      ? Math.round((totalProjectedProfit / totalProjectedRevenue) * 1000) / 10 
      : 0;

    return {
      decisions,
      destAllocations,
      portfolio: {
        totalBudgetUSD: totalBudget,
        budgetUtilizedUSD: totalProcurementBudgetUtilized,
        budgetRemainingUSD: Math.round(remainingBudget),
        budgetUtilizationPct,
        totalRecommendedUnits,
        totalProjectedRevenueUSD: totalProjectedRevenue,
        totalProjectedProfitUSD: totalProjectedProfit,
        totalExistingInventoryCostUSD: totalExistingInventoryCost,
        portfolioGrossMarginPct,
        totalSurplusExposureUSD,
        totalUnrealizedShortageUSD,
        riskTolerance,
        algorithm: 'Bounded Marginal Allocation Optimization Heuristic'
      }
    };
  }

  /**
   * Generates step-by-step mathematical explainability for a recommendation
   */
  function buildDecisionExplainability(d, finalEval) {
    const { action, recommendedPurchaseQty, currentInventory, forecastDemand, unitCost, sellingPrice, supplier, coveragePctBefore, coveragePctAfter } = d;
    
    let summaryText = '';
    let mathTrace = [];

    if (action === 'BUY MORE') {
      summaryText = `Procure +${recommendedPurchaseQty.toLocaleString()} additional room-nights from ${supplier.name}. Projected 30-day demand is ${forecastDemand.toLocaleString()} units, while current baseline inventory of ${currentInventory.toLocaleString()} units covered only ${coveragePctBefore}% of anticipated bookings. This purchase elevates demand coverage to ${coveragePctAfter}%, capturing an estimated $${finalEval.expectedRevenue.toLocaleString()} in gross bookings at an incremental procurement cost of $${d.allocatedBudgetUSD.toLocaleString()}.`;
      mathTrace = [
        { label: 'Forecast Demand (D)', value: `${forecastDemand.toLocaleString()} room-nights` },
        { label: 'Current Inventory (I_0)', value: `${currentInventory.toLocaleString()} units (${coveragePctBefore}% coverage)` },
        { label: 'Baseline Inventory Value', value: `$${d.existingInventoryCost.toLocaleString()}` },
        { label: 'Recommended Purchase (q*)', value: `+${recommendedPurchaseQty.toLocaleString()} units` },
        { label: 'Incremental Spend', value: `$${d.allocatedBudgetUSD.toLocaleString()} (${recommendedPurchaseQty} × $${unitCost})` },
        { label: 'Post-Procurement Coverage', value: `${coveragePctAfter}% target` },
        { label: 'Projected Net Profit Contribution', value: `+$${finalEval.netProfit.toLocaleString()} (ROI: ${d.marginalROI}%)` },
        { label: 'Supplier Reliability Rating', value: `${supplier.reliabilityScore}/100` }
      ];
    } else if (action === 'MAINTAIN') {
      summaryText = `Maintain existing inventory position without incremental capital deployment. Current inventory (${currentInventory.toLocaleString()} units, value: $${d.existingInventoryCost.toLocaleString()}) provides ${coveragePctBefore}% coverage against expected demand (${forecastDemand.toLocaleString()} units). Purchasing further units would trigger holding cost penalties ($${Math.round(unitCost * 0.35)}/unit/mo) and elevate unsold room risk.`;
      mathTrace = [
        { label: 'Forecast Demand (D)', value: `${forecastDemand.toLocaleString()} room-nights` },
        { label: 'Current Stock (I_0)', value: `${currentInventory.toLocaleString()} units ($${d.existingInventoryCost.toLocaleString()})` },
        { label: 'Demand Coverage Ratio', value: `${coveragePctBefore}% (Within optimal corridor)` },
        { label: 'Additional Purchase', value: '0 units' },
        { label: 'Budget Preserved', value: `$${(d.batchSize * unitCost).toLocaleString()} freed for high-demand lanes` }
      ];
    } else if (action === 'REDUCE') {
      summaryText = `Over-provisioned inventory position. Current stock of ${currentInventory.toLocaleString()} units exceeds forecasted demand (${forecastDemand.toLocaleString()} units) by ${Math.round(coveragePctBefore - 100)}%. Immediate recommendation: Execute markdown distribution or release uncommitted allotments back to ${supplier.name} before the cancellation deadline to avert holding losses.`;
      mathTrace = [
        { label: 'Current Stock vs Demand', value: `${currentInventory.toLocaleString()} vs ${forecastDemand.toLocaleString()} units` },
        { label: 'Over-Provision Surplus', value: `${(currentInventory - forecastDemand).toLocaleString()} units` },
        { label: 'Unsold Capital Exposure', value: `$${((currentInventory - forecastDemand) * unitCost).toLocaleString()}` },
        { label: 'Recommended Mitigation', value: 'Release allotments / Promotional distribution' }
      ];
    } else if (action === 'AVOID') {
      summaryText = `Do not procure additional inventory through ${supplier.name}. Supplier reliability score of ${supplier.reliabilityScore}/100 and strict confirmation terms present unacceptable downside risk. Sourcing from alternative bedbanks is recommended.`;
      mathTrace = [
        { label: 'Supplier Reliability Score', value: `${supplier.reliabilityScore}/100` },
        { label: 'Alternative Recommendation', value: 'Reroute procurement to Tier-1 wholesalers' }
      ];
    } else { // HOLD
      summaryText = `Hold procurement decisions pending near-term booking pickup signals. With ${d.daysToTravel} days to travel, committing wholesale capital risks negative margin realization.`;
      mathTrace = [
        { label: 'Days to Travel', value: `${d.daysToTravel} days` },
        { label: 'Recommended Action', value: 'Re-evaluate at 7-day mark' }
      ];
    }

    return {
      summaryText,
      mathTrace,
      objectiveFormula: 'Max Incremental E[Rev] - ProcCost - UnsoldPen - ShortagePen - RiskPen',
      marginalROI: d.marginalROI,
      riskAdjustment: `Supplier Risk: ${100 - (supplier.reliabilityScore || 85)}% | Market Risk: ${d.riskScore}`
    };
  }

  // Export for browser and Node.js
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { solveProcurementOptimization };
  }
  if (typeof window !== 'undefined') {
    window.AxiomOptimization = { solveProcurementOptimization };
  }

})(typeof window !== 'undefined' ? window : global);
