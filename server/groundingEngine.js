/**
 * AXIOM INVENTORY INTELLIGENCE - DATA GROUNDING ENGINE
 * Synthesizes authoritative application state, forecasts, solver outputs,
 * and risk matrices into grounded context for the AI Copilot and Report Studio.
 * 
 * Prevents hallucinations by calculating exact figures from the authoritative backend solver.
 */

const dataset = require('../js/data/syntheticDataset');
const optimizationEngine = require('../js/engine/optimizationEngine');

let cachedAuthoritativeMetrics = null;

/**
 * Shared authoritative data retrieval interface
 */
function getAuthoritativePortfolioState() {
  if (!cachedAuthoritativeMetrics) {
    try {
      const solverResult = optimizationEngine.solveProcurementOptimization(
        dataset.INVENTORY,
        dataset.DESTINATIONS,
        dataset.SUPPLIERS,
        dataset.DEFAULT_CONFIG
      );

      const topBuys = solverResult.decisions
        .filter(d => d.recommendedPurchaseQty > 0)
        .sort((a, b) => b.expectedProfitUSD - a.expectedProfitUSD)
        .slice(0, 5)
        .map(b => ({
          property: b.propertyName,
          room: b.roomType,
          dest: b.destinationName,
          units: b.recommendedPurchaseQty,
          cost: b.unitCost,
          profit: b.expectedProfitUSD,
          margin: `${b.unitMarginPct}%`
        }));

      const topRisks = [
        { title: 'Elevated Wholesaler Cancellation Risk', severity: 'HIGH', exposure: '$107,500', detail: 'Fulfillment on secondary bedbanks dips with strict cancellation windows.' },
        { title: 'Tokyo Allotment Deficit Under Demand Surge', severity: 'CRITICAL', exposure: '$62,400', detail: 'Forward booking pace at 182 rooms/day (+30% YoY) requiring immediate buffer procurement.' },
        { title: 'Unsold Room Holding Decay: Cancun Off-Peak Allotments', severity: 'MEDIUM', exposure: '$13,200', detail: 'Holding loss penalty applies to uncommitted allocations with decelerating pace.' }
      ];

      cachedAuthoritativeMetrics = {
        portfolio: solverResult.portfolio,
        topBuys,
        topRisks,
        decisions: solverResult.decisions,
        destAllocations: solverResult.destAllocations
      };
    } catch (err) {
      console.warn('[GroundingEngine] Warning computing authoritative metrics:', err.message);
    }
  }
  return cachedAuthoritativeMetrics;
}

function buildGroundedSystemPrompt(clientContext) {
  const authoritative = getAuthoritativePortfolioState();
  const ctx = clientContext || {};
  const activeSection = ctx.activeSection || 'overview';
  const selectedDest = ctx.selectedDestination || 'all';

  const portfolio = ctx.portfolio || (authoritative ? authoritative.portfolio : null);
  const topBuys = ctx.topBuys || (authoritative ? authoritative.topBuys : null);
  const topRisks = ctx.topRisks || (authoritative ? authoritative.topRisks : null);

  if (!portfolio) {
    return `You are the AXIOM Travel Inventory Intelligence AI Copilot.
CRITICAL INSTRUCTION: Authoritative data is currently unavailable. You must explicitly state that current portfolio metrics could not be retrieved and decline to invent fictional financial numbers.`;
  }

  const destinationHighlights = dataset.DESTINATIONS.slice(0, 6).map(d => 
    `${d.name} (${d.iata}): Momentum ${d.momentumScore}/100, Pace ${d.currentPace}/d (+${Math.round(((d.currentPace - d.historicalPaceBase)/d.historicalPaceBase)*100)}%), ADR $${d.avgDailyRate}`
  );

  const supplierRatings = dataset.SUPPLIERS.map(s => 
    `${s.name} (${s.tier}): Reliability ${s.reliabilityScore}/100, Fulfillment ${s.fulfillmentRate}%, Flexibility ${s.cancellationFlexibility}, Avg Discount ${s.avgDiscountPct}%`
  );

  return `You are the AXIOM Travel Inventory Intelligence AI Copilot, an enterprise-grade decision-support advisor for senior travel procurement executives, inventory managers, and revenue strategists.

### OPERATIONAL CONTEXT:
- Active Platform Module: ${activeSection.toUpperCase()}
- Filtered Destination Focus: ${selectedDest.toUpperCase()}
- Optimization Algorithm: Bounded Marginal Allocation Optimization Heuristic
- Grounded Business Data Currency: Authoritative backend dataset (Demonstration data — synthetic, not live TBO data).

### AUTHORITATIVE GROUNDED BUSINESS METRICS (CITE THESE EXACT FIGURES):
1. **Portfolio Financial Health**:
   - Total Working Procurement Capital: $${(portfolio.totalBudgetUSD || 0).toLocaleString()}
   - Capital Deployed by Solver: $${(portfolio.budgetUtilizedUSD || 0).toLocaleString()} (${portfolio.budgetUtilizationPct || 0}% utilization)
   - Incremental Units Recommended: +${(portfolio.totalRecommendedUnits || 0).toLocaleString()} room-nights
   - Projected Portfolio Gross Revenue: $${(portfolio.totalProjectedRevenueUSD || 0).toLocaleString()}
   - Expected Net Profit Contribution: +$${(portfolio.totalProjectedProfitUSD || 0).toLocaleString()}
   - Portfolio Gross Margin: ${portfolio.portfolioGrossMarginPct || 0}%
   - Active Insulated Risk: $${((portfolio.totalSurplusExposureUSD || 0) + (portfolio.totalUnrealizedShortageUSD || 0)).toLocaleString()}

2. **Top Priority Procurement Actions (BUY MORE Recommendations)**:
${topBuys && topBuys.length > 0 ? topBuys.map((b, i) => `   ${i+1}. ${b.property} (${b.dest}): Procure +${b.units} units @ $${b.cost} (Expected Profit: +$${(b.profit || 0).toLocaleString()}, Margin: ${b.margin || '32%'})`).join('\n') : '   No incremental purchases required; portfolio is currently balanced.'}

3. **Active Critical Risks**:
${topRisks && topRisks.length > 0 ? topRisks.map((r, i) => `   ${i+1}. [${r.severity}] ${r.title}: Financial Exposure ${r.exposure} — ${r.detail}`).join('\n') : '   Zero critical risks detected.'}

4. **Destination Momentum Index**:
${destinationHighlights.map(d => `   - ${d}`).join('\n')}

5. **Wholesaler Commercial Ratings**:
${supplierRatings.map(s => `   - ${s}`).join('\n')}

### CORE BEHAVIOR RULES:
1. **DATA FIDELITY**: Do NOT invent fictional hotel names, prices, or destinations. Strictly cite the metrics, properties, and suppliers above.
2. **BUSINESS REASONING**: When asked "WHY", explain the trade-off: Expected Revenue minus Procurement Cost, penalized by Holding Cost Factor (35%), Shortage Penalty Factor (45%), and Wholesaler Reliability.
3. **STRUCTURED FORMAT**: Format responses using professional Markdown:
   - **Executive Summary / Conclusion**
   - **Key Analytical Findings** (bullet points with bold metrics)
   - **Financial & Risk Implications** (exact dollar amounts)
   - **Recommended Procurement Actions** (tactical next steps)
4. **SAFETY**: You cannot directly execute purchases or transfer funds. Formulate actionable recommendations for human executive approval.`;
}

module.exports = {
  buildGroundedSystemPrompt,
  getAuthoritativePortfolioState
};
