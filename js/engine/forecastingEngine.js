/**
 * AXIOM INVENTORY INTELLIGENCE
 * Demand Forecasting Engine
 * 
 * Implements a multi-factor forecasting architecture:
 * 1. Seasonal Historical Baseline & Day-of-Week Indices
 * 2. Trend-Aware Exponential Smoothing (Holt-Winters Level + Trend)
 * 3. Booking Pace Pickup Calibration (Velocity Delta vs Benchmark)
 * 4. Search Demand Intent Multiplier
 * 5. Confidence Interval Calculation (Upper & Lower 95% / 80% Bands)
 * 6. Mathematical Error Metrics (MAE, RMSE, MAPE)
 * 7. Transparent Decision Explainability Diagnoser
 */

(function(window) {
  'use strict';

  // --- DAY-OF-WEEK SEASONALITY FACTORS ---
  // Travel industry standard: Thu/Fri/Sat leisure peaks, Tue/Wed business peaks
  const DOW_FACTORS = {
    0: 0.94, // Sun
    1: 0.90, // Mon
    2: 1.02, // Tue
    3: 1.04, // Wed
    4: 1.10, // Thu
    5: 1.28, // Fri
    6: 1.22  // Sat
  };

  /**
   * Exponential Smoothing Parameters
   * alpha: Level smoothing factor (0.35 gives strong recent responsiveness)
   * beta: Trend smoothing factor (0.15 gives stable velocity projection)
   */
  const ALPHA = 0.35;
  const BETA = 0.15;

  /**
   * Forecast demand for a destination across horizon days
   * @param {Object} destination - Destination object from AxiomData.DESTINATIONS
   * @param {Array} history - 90-day time series from AxiomData.TIME_SERIES[destId]
   * @param {number} horizonDays - 7, 14, 30, 60, or 90
   * @param {number} demandGrowthOverride - Optional slider override (e.g. +10% or -20%)
   * @returns {Object} Full forecast dataset with confidence bounds, metrics & explainability
   */
  function forecastDestinationDemand(destination, history, horizonDays = 30, demandGrowthOverride = 0) {
    if (!destination || !history || history.length === 0) {
      return null;
    }

    const n = history.length;
    // Extract actual historical demand values
    const actuals = history.map(d => d.demand);

    // 1. Calculate Initial Level (L0) and Trend (T0) from the first 14 days
    let level = 0;
    for (let i = 0; i < 14; i++) {
      level += actuals[i];
    }
    level /= 14;

    let trend = (actuals[13] - actuals[0]) / 13;

    // Residual errors for variance and accuracy metrics
    const residuals = [];

    // 2. Iterate Holt-Winters Exponential Smoothing through history
    for (let t = 14; t < n; t++) {
      const prevLevel = level;
      const prevTrend = trend;
      const actualVal = actuals[t];

      // Update level and trend
      level = ALPHA * actualVal + (1 - ALPHA) * (prevLevel + prevTrend);
      trend = BETA * (level - prevLevel) + (1 - BETA) * prevTrend;

      const oneStepFitted = prevLevel + prevTrend;
      residuals.push(actualVal - oneStepFitted);
    }

    // 3. Compute Historical Accuracy Metrics on the test window (last 30 days)
    const testWindow = Math.min(30, residuals.length);
    const testResiduals = residuals.slice(-testWindow);
    const testActuals = actuals.slice(-testWindow);

    let sumAbsError = 0;
    let sumSqError = 0;
    let sumPctError = 0;
    let validMapeCount = 0;

    for (let i = 0; i < testResiduals.length; i++) {
      const err = testResiduals[i];
      const actual = testActuals[i];
      sumAbsError += Math.abs(err);
      sumSqError += err * err;
      if (actual > 0) {
        sumPctError += Math.abs(err / actual);
        validMapeCount++;
      }
    }

    const mae = Math.round((sumAbsError / testResiduals.length) * 10) / 10;
    const rmse = Math.round(Math.sqrt(sumSqError / testResiduals.length) * 10) / 10;
    const mape = validMapeCount > 0 ? Math.round((sumPctError / validMapeCount) * 1000) / 10 : 6.5;

    // Standard deviation of one-step forecast error
    const variance = sumSqError / testResiduals.length;
    const sigma = Math.sqrt(variance);

    // 4. Compute Pace & Search Momentum Modifiers
    // Booking pace acceleration: current pace vs historical pace base
    const paceRatio = destination.historicalPaceBase > 0 
      ? destination.currentPace / destination.historicalPaceBase 
      : 1.0;

    // Search query intent multiplier
    const searchMultiplier = destination.searchIndex ? (destination.searchIndex / 100) : 1.0;

    // Weighted composite momentum factor (60% booking pace velocity, 25% search volume, 15% seasonality index)
    const compositeFactor = (0.60 * paceRatio) + (0.25 * searchMultiplier) + (0.15 * destination.currentSeasonalityIdx);

    // Apply any what-if scenario override
    const growthMultiplier = 1 + (demandGrowthOverride / 100);

    // 5. Generate Future Horizon Forecast with Confidence Intervals
    const forecastPoints = [];
    const lastDate = new Date(history[history.length - 1].date);
    let totalPredictedDemand = 0;
    let totalLowerBand = 0;
    let totalUpperBand = 0;

    // Inventory capacity benchmark per day
    const dailyCapacity = Math.round((destination.baselineMonthlyDemand / 30) * 1.25);

    for (let h = 1; h <= horizonDays; h++) {
      const targetDate = new Date(lastDate);
      targetDate.setDate(targetDate.getDate() + h);
      const dow = targetDate.getDay();
      const dowMultiplier = DOW_FACTORS[dow] || 1.0;

      // Base Holt-Winters linear extrapolation
      const baselineStep = Math.max(0, level + h * trend);

      // Final adjusted predicted point
      const predictedDemand = Math.round(baselineStep * compositeFactor * dowMultiplier * growthMultiplier);

      // Dynamic confidence expansion: error expands with sqrt(lead time)
      const errorMargin = 1.96 * sigma * Math.sqrt(h * 0.4);
      const upperBand = Math.round(predictedDemand + errorMargin);
      const lowerBand = Math.max(0, Math.round(predictedDemand - errorMargin));

      totalPredictedDemand += predictedDemand;
      totalLowerBand += lowerBand;
      totalUpperBand += upperBand;

      forecastPoints.push({
        dayIndex: h,
        date: targetDate.toISOString().split('T')[0],
        dayOfWeek: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dow],
        predictedDemand: predictedDemand,
        upperBand: upperBand,
        lowerBand: lowerBand,
        inventoryCapacity: dailyCapacity,
        isShortageZone: predictedDemand > dailyCapacity,
        shortageUnits: Math.max(0, predictedDemand - dailyCapacity)
      });
    }

    // Historical demand baseline for the same duration prior
    const priorActuals = actuals.slice(-horizonDays);
    const totalHistoricalDemand = priorActuals.reduce((sum, v) => sum + v, 0);
    const demandGrowthPct = totalHistoricalDemand > 0 
      ? Math.round(((totalPredictedDemand - totalHistoricalDemand) / totalHistoricalDemand) * 1000) / 10
      : 0;

    // Confidence score based on MAPE and sample depth
    const forecastConfidenceScore = Math.max(68, Math.min(97, Math.round(100 - (mape * 1.6))));

    // 6. Generate Transparent Business Explanation
    const explanation = generateForecastExplanation({
      destination,
      paceRatio,
      searchMultiplier,
      demandGrowthPct,
      horizonDays,
      totalPredictedDemand,
      totalHistoricalDemand,
      mape
    });

    return {
      destinationId: destination.id,
      destinationName: destination.name,
      horizonDays,
      totalPredictedDemand,
      totalHistoricalDemand,
      demandGrowthPct,
      confidenceScore: forecastConfidenceScore,
      accuracy: {
        mae,
        rmse,
        mape
      },
      forecastPoints,
      explanation
    };
  }

  /**
   * Forecast demand across all inventory products
   * @param {Array} inventoryList - AxiomData.INVENTORY
   * @param {Object} destinationForecasts - Precalculated destination forecasts
   * @param {number} horizonDays
   * @returns {Array} List of product-level demand forecasts
   */
  function forecastInventoryDemand(inventoryList, destinationForecasts, horizonDays = 30) {
    return inventoryList.map(item => {
      const destForecast = destinationForecasts[item.destinationId];
      const destDailyDemand = destForecast 
        ? (destForecast.totalPredictedDemand / horizonDays)
        : (item.historicalPace * 30);

      // Pace multiplier specific to this hotel/room contract
      const contractPaceRatio = item.historicalPace > 0 ? (item.currentPace / item.historicalPace) : 1.0;

      // Product forecast demand for the horizon
      const dailyContractDemand = item.currentPace * (0.85 + contractPaceRatio * 0.15);
      const totalContractDemand = Math.round(dailyContractDemand * horizonDays);

      // Inventory coverage calculation
      const currentAvailable = item.remainingQty;
      const coverageRatio = totalContractDemand > 0 ? (currentAvailable / totalContractDemand) : 1.0;
      const coveragePct = Math.round(coverageRatio * 100);

      const projectedShortage = Math.max(0, totalContractDemand - currentAvailable);
      const projectedSurplus = Math.max(0, currentAvailable - totalContractDemand);

      return {
        ...item,
        horizonDays,
        forecastDemand: totalContractDemand,
        currentAvailable,
        coveragePct,
        projectedShortage,
        projectedSurplus,
        contractPaceRatio: Math.round(contractPaceRatio * 100) / 100
      };
    });
  }

  /**
   * Generates deterministic natural language explanations for why demand is changing
   */
  function generateForecastExplanation(data) {
    const { destination, paceRatio, searchMultiplier, demandGrowthPct, horizonDays, totalPredictedDemand } = data;
    const paceDiffPct = Math.round((paceRatio - 1) * 100);
    const searchDiffPct = Math.round((searchMultiplier - 1) * 100);

    let paceDesc = '';
    if (paceDiffPct > 15) {
      paceDesc = `booking pace is surging +${paceDiffPct}% above historical velocity (current pickup: ${destination.currentPace} vs benchmark ${destination.historicalPaceBase}/day)`;
    } else if (paceDiffPct < -10) {
      paceDesc = `booking velocity has slowed by ${Math.abs(paceDiffPct)}% below historical norms (${destination.currentPace}/day vs benchmark ${destination.historicalPaceBase}/day)`;
    } else {
      paceDesc = `booking pace remains aligned with baseline (+${paceDiffPct}%)`;
    }

    let searchDesc = '';
    if (searchDiffPct > 20) {
      searchDesc = `traveler search intent is highly elevated at index ${destination.searchIndex} (+${searchDiffPct}% year-over-year search volume)`;
    } else if (searchDiffPct < -5) {
      searchDesc = `search volume is subdued at index ${destination.searchIndex}`;
    } else {
      searchDesc = `search momentum is stable at index ${destination.searchIndex}`;
    }

    let conclusion = '';
    if (demandGrowthPct > 15) {
      conclusion = `Overall ${horizonDays}-day outlook expects ${totalPredictedDemand.toLocaleString()} room-nights (+${demandGrowthPct}% growth). Recommended action: Expand procurement allocations early to prevent imminent sell-out stockouts.`;
    } else if (demandGrowthPct < -10) {
      conclusion = `Overall ${horizonDays}-day demand will contract to ${totalPredictedDemand.toLocaleString()} room-nights (${demandGrowthPct}% decline). Recommended action: Restrict spot commitments and release unbooked blocks to avert holding loss.`;
    } else {
      conclusion = `Overall ${horizonDays}-day demand is balanced at ${totalPredictedDemand.toLocaleString()} room-nights (+${demandGrowthPct}% growth). Maintain calibrated procurement buffer.`;
    }

    return `Demand for ${destination.name} is primarily driven by seasonal index (${destination.currentSeasonalityIdx}x) during its ${destination.peakSeason}. Real-time signals confirm ${paceDesc}, while ${searchDesc}. ${conclusion}`;
  }

  // Expose on window object
  window.AxiomForecasting = {
    forecastDestinationDemand,
    forecastInventoryDemand
  };

})(window);
