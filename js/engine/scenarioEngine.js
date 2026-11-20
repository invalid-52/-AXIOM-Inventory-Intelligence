/**
 * AXIOM INVENTORY INTELLIGENCE
 * Scenario Lab & What-If Simulation Engine
 * 
 * Simulates volatile operational and market conditions:
 * - Demand Surges & Downturns
 * - Supplier Wholesale Cost Shocks
 * - Wholesaler Stop-Sales & Failures
 * - Budget Capital Cuts & Injections
 * - Cancellation Rate Spikes
 * 
 * Produces full Baseline vs Scenario delta evaluations across:
 * Revenue, Gross Margin, Units Procured, Shortages, and Unsold Capital Exposure.
 */

(function(window) {
  'use strict';

  // --- PRESET SCENARIOS ---
  const PRESET_SCENARIOS = {
    surge: {
      id: 'surge',
      name: 'High Summer Demand Surge',
      description: 'Global booking pace surges +35% across Europe & APAC with favorable +8% rate realization.',
      demandGrowthPct: 35.0,
      budgetDeltaPct: 20.0,
      supplierCostDeltaPct: 5.0,
      cancellationRateDeltaPct: -2.0,
      sellingPriceDeltaPct: 8.0,
      disabledSupplierIds: []
    },
    recession: {
      id: 'recession',
      name: 'Macro Travel Contraction',
      description: 'Consumer discretionary pullback reduces global demand by -25% with cancellations spiking +15%.',
      demandGrowthPct: -25.0,
      budgetDeltaPct: -25.0,
      supplierCostDeltaPct: -5.0,
      cancellationRateDeltaPct: 15.0,
      sellingPriceDeltaPct: -10.0,
      disabledSupplierIds: []
    },
    costShock: {
      id: 'costShock',
      name: 'Wholesale Procurement Cost Shock',
      description: 'Bedbanks increase wholesale rates by +18% due to hotelier yield compression and supply constraints.',
      demandGrowthPct: 0.0,
      budgetDeltaPct: 0.0,
      supplierCostDeltaPct: 18.0,
      cancellationRateDeltaPct: 0.0,
      sellingPriceDeltaPct: 4.0, // Partial pass-through to consumer
      disabledSupplierIds: []
    },
    supplierFailure: {
      id: 'supplierFailure',
      name: 'Tier-3 Bedbank Stop-Sale / Outage',
      description: 'Zenith Travel Partners and TransWorld Consolidators suffer system outage / inventory freeze.',
      demandGrowthPct: 5.0,
      budgetDeltaPct: 0.0,
      supplierCostDeltaPct: 8.0,
      cancellationRateDeltaPct: 8.0,
      sellingPriceDeltaPct: 0.0,
      disabledSupplierIds: ['sup-zenith', 'sup-transworld']
    },
    budgetCrop: {
      id: 'budgetCrop',
      name: 'Austerity Budget Restriction (-40%)',
      description: 'Executive committee enforces a -40% procurement budget cap ($900k) to conserve corporate cash flow.',
      demandGrowthPct: 0.0,
      budgetDeltaPct: -40.0,
      supplierCostDeltaPct: 0.0,
      cancellationRateDeltaPct: 0.0,
      sellingPriceDeltaPct: 0.0,
      disabledSupplierIds: []
    },
    weatherDisruption: {
      id: 'weatherDisruption',
      name: 'Severe Weather / Advisory Disruption',
      description: 'Coastal resort demand (Cancun, Bali) drops -35% while European & Tokyo city demand increases +15%.',
      demandGrowthPct: -5.0,
      budgetDeltaPct: -10.0,
      supplierCostDeltaPct: 2.0,
      cancellationRateDeltaPct: 12.0,
      sellingPriceDeltaPct: -4.0,
      disabledSupplierIds: []
    }
  };

  /**
   * Run a simulation by cloning inventory and destinations, applying scenario shocks,
   * re-running optimization, and generating detailed delta comparison against baseline.
   * 
   * @param {Object} baselineResults - Output from AxiomOptimization.solveProcurementOptimization
   * @param {Object} params - Scenario parameters
   * @param {Array} rawInventory - AxiomData.INVENTORY
   * @param {Array} rawDestinations - AxiomData.DESTINATIONS
   * @param {Array} rawSuppliers - AxiomData.SUPPLIERS
   * @param {Object} baseConfig - AxiomData.DEFAULT_CONFIG
   * @returns {Object} Comprehensive Scenario simulation results and delta comparisons
   */
  function runScenarioSimulation(baselineResults, params, rawInventory, rawDestinations, rawSuppliers, baseConfig) {
    const demandMultiplier = 1 + ((params.demandGrowthPct || 0) / 100);
    const budgetMultiplier = 1 + ((params.budgetDeltaPct || 0) / 100);
    const costMultiplier = 1 + ((params.supplierCostDeltaPct || 0) / 100);
    const priceMultiplier = 1 + ((params.sellingPriceDeltaPct || 0) / 100);
    const cancelShift = (params.cancellationRateDeltaPct || 0) / 100;
    const disabledSuppliers = new Set(params.disabledSupplierIds || []);

    // 1. Adjust Destination Parameters
    const simDestinations = rawDestinations.map(d => {
      let destDemandMod = demandMultiplier;
      // Localized adjustments for specific scenarios
      if (params.id === 'weatherDisruption') {
        if (d.id === 'dest-cun' || d.id === 'dest-dps') destDemandMod *= 0.65;
        if (d.id === 'dest-tyo' || d.id === 'dest-lon') destDemandMod *= 1.15;
      }

      return {
        ...d,
        baselineMonthlyDemand: Math.round(d.baselineMonthlyDemand * destDemandMod),
        avgDailyRate: Math.round(d.avgDailyRate * priceMultiplier),
        avgProcurementCost: Math.round(d.avgProcurementCost * costMultiplier),
        cancellationRate: Math.max(0.02, Math.min(0.40, d.cancellationRate + cancelShift))
      };
    });

    // 2. Adjust Inventory Contracts
    const simInventory = rawInventory.map(item => {
      const isSupplierDisabled = disabledSuppliers.has(item.supplierId);
      const unitCost = Math.round(item.unitCost * costMultiplier);
      const sellingPrice = Math.round(item.sellingPrice * priceMultiplier);
      const maxCap = isSupplierDisabled ? item.remainingQty : item.maxSupplierCapacity;

      // Base demand adjusted by scenario
      let localDemandMod = demandMultiplier;
      if (params.id === 'weatherDisruption' && (item.destinationId === 'dest-cun' || item.destinationId === 'dest-dps')) {
        localDemandMod *= 0.65;
      }

      const simDemand = Math.round((item.currentPace * 30) * localDemandMod);

      return {
        ...item,
        unitCost,
        sellingPrice,
        cancellationRate: Math.max(0.02, Math.min(0.45, item.cancellationRate + cancelShift)),
        maxSupplierCapacity: maxCap,
        forecastDemand: simDemand
      };
    });

    // 3. Adjusted Configuration
    const simConfig = {
      ...baseConfig,
      totalBudgetUSD: Math.round((baseConfig.totalBudgetUSD || 1500000) * budgetMultiplier)
    };

    // 4. Execute Solver under Scenario Conditions
    const simResults = window.AxiomOptimization.solveProcurementOptimization(
      simInventory,
      simDestinations,
      rawSuppliers,
      simConfig
    );

    // 5. Calculate Exact Baseline vs Scenario Deltas
    const baseP = baselineResults.portfolio;
    const simP = simResults.portfolio;

    const deltaRevenue = simP.totalProjectedRevenueUSD - baseP.totalProjectedRevenueUSD;
    const deltaProfit = simP.totalProjectedProfitUSD - baseP.totalProjectedProfitUSD;
    const deltaSpend = simP.budgetUtilizedUSD - baseP.budgetUtilizedUSD;
    const deltaUnits = simP.totalRecommendedUnits - baseP.totalRecommendedUnits;
    const deltaSurplus = simP.totalSurplusExposureUSD - baseP.totalSurplusExposureUSD;
    const deltaShortage = simP.totalUnrealizedShortageUSD - baseP.totalUnrealizedShortageUSD;
    const deltaMarginPct = Math.round((simP.portfolioGrossMarginPct - baseP.portfolioGrossMarginPct) * 10) / 10;

    // Financial viability verdict
    let verdict = 'NEUTRAL';
    let verdictClass = 'info';
    let summaryNarrative = '';

    if (deltaProfit >= 50000) {
      verdict = 'FAVORABLE UPSIDE';
      verdictClass = 'ok';
      summaryNarrative = `Scenario indicates strong portfolio expansion (+${Math.round(deltaProfit / 1000)}k net profit). Increased demand velocity absorbs capital effectively with minimal surplus decay.`;
    } else if (deltaProfit <= -60000) {
      verdict = 'CRITICAL MARGIN DOWNSIDE';
      verdictClass = 'crit';
      summaryNarrative = `Scenario impairs portfolio profitability by -$${Math.round(Math.abs(deltaProfit) / 1000)}k. Escalated wholesale costs or demand contraction triggers severe margin erosion. Defensive hedging mandatory.`;
    } else if (deltaProfit < 0) {
      verdict = 'MODERATE PRESSURE';
      verdictClass = 'warn';
      summaryNarrative = `Scenario introduces moderate margin pressure (-$${Math.round(Math.abs(deltaProfit) / 1000)}k). Selective allotment trimming recommended to preserve cash efficiency.`;
    } else {
      verdict = 'STABLE RESILIENCE';
      verdictClass = 'ok';
      summaryNarrative = 'Portfolio demonstrates resilient absorption across tested shocks with balanced returns.';
    }

    return {
      params,
      scenarioResults: simResults,
      comparison: {
        baseline: baseP,
        scenario: simP,
        deltas: {
          revenue: deltaRevenue,
          revenuePct: baseP.totalProjectedRevenueUSD > 0 ? Math.round((deltaRevenue / baseP.totalProjectedRevenueUSD) * 1000) / 10 : 0,
          profit: deltaProfit,
          profitPct: baseP.totalProjectedProfitUSD > 0 ? Math.round((deltaProfit / baseP.totalProjectedProfitUSD) * 1000) / 10 : 0,
          spend: deltaSpend,
          units: deltaUnits,
          surplus: deltaSurplus,
          shortage: deltaShortage,
          marginPct: deltaMarginPct
        },
        verdict,
        verdictClass,
        summaryNarrative
      }
    };
  }

  // Expose on window object
  window.AxiomScenario = {
    PRESET_SCENARIOS,
    runScenarioSimulation
  };

})(window);
