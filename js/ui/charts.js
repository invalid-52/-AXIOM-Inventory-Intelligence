/**
 * AXIOM INVENTORY INTELLIGENCE
 * Chart.js Visualization Manager
 * 
 * Manages clean lifecycle (creation, update, destroy) of enterprise charts:
 * - Dark theme styling
 * - Confidence band fills
 * - Interactive tooltips
 * - Memory leak prevention
 */

(function(window) {
  'use strict';

  const chartInstances = {};

  const chartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
        labels: {
          color: '#8ab4c8',
          font: { family: 'DM Mono', size: 10 }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(6, 10, 20, 0.95)',
        borderColor: 'rgba(0, 229, 255, 0.25)',
        borderWidth: 1,
        titleColor: '#00e5ff',
        bodyColor: '#e8f4fd',
        titleFont: { family: 'Syne', size: 11, weight: 'bold' },
        bodyFont: { family: 'DM Mono', size: 10 },
        padding: 10,
        boxPadding: 4,
        cornerRadius: 4
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: { color: '#6c88a8', font: { family: 'DM Mono', size: 9 } }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: { color: '#6c88a8', font: { family: 'DM Mono', size: 9 } }
      }
    }
  };

  /**
   * Safely create or replace a chart instance on a canvas
   */
  function renderChart(canvasId, type, data, customOpts = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;

    // Destroy existing instance to prevent canvas reuse errors
    if (chartInstances[canvasId]) {
      chartInstances[canvasId].destroy();
      delete chartInstances[canvasId];
    }

    // Deep merge options
    const options = {
      ...chartDefaults,
      ...customOpts,
      plugins: {
        ...chartDefaults.plugins,
        ...(customOpts.plugins || {})
      },
      scales: customOpts.scales !== undefined ? customOpts.scales : chartDefaults.scales
    };

    try {
      const chart = new Chart(canvas, { type, data, options });
      chartInstances[canvasId] = chart;
      return chart;
    } catch (e) {
      console.warn(`Chart render warning on ${canvasId}:`, e);
      return null;
    }
  }

  /**
   * Render a mini sparkline
   */
  function renderSparkline(canvasId, values, color = '#00e5ff') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (chartInstances[canvasId]) {
      chartInstances[canvasId].destroy();
      delete chartInstances[canvasId];
    }

    try {
      const chart = new Chart(canvas, {
        type: 'line',
        data: {
          labels: values.map((_, i) => i),
          datasets: [{
            data: values,
            borderColor: color,
            borderWidth: 1.5,
            pointRadius: 0,
            fill: true,
            backgroundColor: color.includes('rgba') ? color : `${color}18`,
            tension: 0.35
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
          scales: { x: { display: false }, y: { display: false } },
          animation: { duration: 0 }
        }
      });
      chartInstances[canvasId] = chart;
    } catch (e) {
      console.warn(`Sparkline warning on ${canvasId}:`, e);
    }
  }

  // Expose on window object
  window.AxiomCharts = {
    renderChart,
    renderSparkline,
    destroyChart: (id) => {
      if (chartInstances[id]) {
        chartInstances[id].destroy();
        delete chartInstances[id];
      }
    }
  };

})(window);
