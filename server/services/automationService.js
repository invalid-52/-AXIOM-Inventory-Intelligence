/**
 * AXIOM INVENTORY INTELLIGENCE - AUTONOMOUS AUTOMATION ENGINE
 * Persistent Cron Scheduler (node-cron), Internal Event-Driven Trigger Watchdog,
 * Idempotent Cooldown Control, and Execution History Audit Logger.
 */

const path = require('path');
const cron = require('node-cron');
const crypto = require('crypto');
const storage = require('./storageService');
const reportService = require('./reportService');
const notificationService = require('./notificationService');
const dataset = require('../../js/data/syntheticDataset');

const AUTOMATIONS_FILE = path.join(__dirname, '..', '..', 'storage', 'automations.json');
const HISTORY_FILE = path.join(__dirname, '..', '..', 'storage', 'execution_history.json');

// Initial automations if not present
const INITIAL_AUTOMATIONS = [
  {
    id: 'auto-daily-brief',
    name: 'Daily Executive Procurement Digest',
    description: 'Compiles morning executive briefing of booking pace, active allotment stockouts, and capital utilization.',
    type: 'SCHEDULED',
    cronExpression: '0 8 * * *',
    cronLabel: 'Daily at 08:00 AM',
    active: true,
    formats: ['pdf', 'xlsx'],
    targetAudience: 'Executive Committee',
    lastRun: new Date(Date.now() - 3600000 * 6).toISOString(),
    nextRun: new Date(Date.now() + 3600000 * 18).toISOString(),
    runCount: 45,
    action: 'GENERATE_EXECUTIVE_DIGEST'
  },
  {
    id: 'auto-weekly-optimization',
    name: 'Weekly Allotment Rebalancing & Solver Run',
    description: 'Runs optimization solver across all destinations, generates optimal buy/release recommendations and exports multi-sheet financial model.',
    type: 'SCHEDULED',
    cronExpression: '0 9 * * 1',
    cronLabel: 'Weekly on Monday at 09:00 AM',
    active: true,
    formats: ['xlsx', 'docx', 'pptx'],
    targetAudience: 'Procurement & Revenue Team',
    lastRun: new Date(Date.now() - 86400000 * 3).toISOString(),
    nextRun: new Date(Date.now() + 86400000 * 4).toISOString(),
    runCount: 16,
    action: 'RUN_SOLVER_AND_EXPORT'
  },
  {
    id: 'auto-stockout-trigger',
    name: 'Imminent Stockout Rapid Response Alert',
    description: 'Fires when forward unconstrained demand exceeds committed room capacity by >300% on any tier-1 property.',
    type: 'EVENT',
    eventType: 'STOCKOUT_RISK',
    thresholdValue: 300,
    thresholdUnit: '% excess demand',
    active: true,
    formats: ['pdf', 'csv'],
    targetAudience: 'Inventory Operations',
    lastRun: new Date(Date.now() - 86400000 * 1).toISOString(),
    runCount: 7,
    action: 'TRIGGER_STOCKOUT_WORKFLOW'
  },
  {
    id: 'auto-supplier-risk',
    name: 'Wholesaler SLA Degradation Watchdog',
    description: 'Monitors partner fulfillment rates. Alerts and triggers mitigation report when fulfillment dips below 92%.',
    type: 'EVENT',
    eventType: 'SUPPLIER_SLA_DROP',
    thresholdValue: 92,
    thresholdUnit: '% confirmed bookings',
    active: true,
    formats: ['pdf', 'docx'],
    targetAudience: 'Supplier Relations',
    lastRun: new Date(Date.now() - 86400000 * 2).toISOString(),
    runCount: 3,
    action: 'MONITOR_SUPPLIER_SLA'
  }
];

function initAutomations() {
  const existing = storage.readJSONSync(AUTOMATIONS_FILE, null);
  if (!existing || !Array.isArray(existing) || existing.length === 0) {
    storage.writeJSONSync(AUTOMATIONS_FILE, INITIAL_AUTOMATIONS);
  }
  const existingHist = storage.readJSONSync(HISTORY_FILE, null);
  if (!existingHist || !Array.isArray(existingHist)) {
    storage.writeJSONSync(HISTORY_FILE, []);
  }
}
initAutomations();

// Active in-memory cron jobs & watchdog timers
const scheduledJobs = new Map();
let internalWatchdogTimer = null;
const eventTriggerCooldowns = new Map(); // autoId -> timestamp

function readAutomations() {
  return storage.readJSONSync(AUTOMATIONS_FILE, INITIAL_AUTOMATIONS) || [];
}

function writeAutomations(autos) {
  storage.writeJSONSync(AUTOMATIONS_FILE, autos);
}

function readHistory() {
  return storage.readJSONSync(HISTORY_FILE, []) || [];
}

function logExecution(record) {
  const history = readHistory();
  history.unshift(record);
  if (history.length > 200) history.pop();
  storage.writeJSONSync(HISTORY_FILE, history);
}

/**
 * Execute automation action with error boundary and audit logging
 */
async function executeAutomationAction(automation, triggerSource = 'SCHEDULE') {
  const startTime = Date.now();
  console.log(`[AutomationEngine] Executing: ${automation.name} (${automation.action}) triggered by ${triggerSource}`);

  let templateId = 'EXECUTIVE_BRIEF';
  let reportTitle = `${automation.name} - ${new Date().toLocaleDateString('en-GB')}`;

  if (automation.action === 'RUN_SOLVER_AND_EXPORT') {
    templateId = 'PROCUREMENT_PLAN';
  } else if (automation.action === 'TRIGGER_STOCKOUT_WORKFLOW') {
    templateId = 'INVENTORY_PERF';
    reportTitle = `Rapid Stockout Incident Report - ${new Date().toLocaleDateString('en-GB')}`;
  } else if (automation.action === 'MONITOR_SUPPLIER_SLA') {
    templateId = 'SUPPLIER_SCORECARD';
    reportTitle = `Supplier SLA Compliance Audit - ${new Date().toLocaleDateString('en-GB')}`;
  }

  let generatedReport = null;
  let status = 'SUCCESS';
  let errorMsg = null;

  try {
    generatedReport = await reportService.generateReport({
      templateId,
      title: reportTitle,
      formats: automation.formats || ['pdf', 'xlsx'],
      author: `AXIOM Automation Engine [${automation.id}]`
    });

    // Notify user
    notificationService.addNotification({
      title: `Automation Executed: ${automation.name}`,
      message: `Successfully executed via ${triggerSource}. Output files compiled to Document Library.`,
      severity: 'SUCCESS',
      category: 'AUTOMATION',
      actionLink: '#sec-documents',
      metadata: { automationId: automation.id, reportId: generatedReport.id }
    });
  } catch (err) {
    status = 'FAILED';
    errorMsg = err.message;
    console.error(`[AutomationEngine Execution Error]:`, err.message);

    notificationService.addNotification({
      title: `Automation Failed: ${automation.name}`,
      message: `Failed during execution: ${err.message}`,
      severity: 'CRITICAL',
      category: 'AUTOMATION',
      actionLink: '#sec-automations'
    });
  }

  const durationMs = Date.now() - startTime;

  // Record in execution history
  const historyEntry = {
    id: `exec-${crypto.randomUUID()}`,
    automationId: automation.id,
    automationName: automation.name,
    type: automation.type,
    triggerSource,
    timestamp: new Date().toISOString(),
    status,
    durationMs,
    reportId: generatedReport ? generatedReport.id : null,
    reportTitle: generatedReport ? generatedReport.title : null,
    formats: generatedReport && generatedReport.formats ? Object.keys(generatedReport.formats) : [],
    errorMessage: errorMsg
  };

  logExecution(historyEntry);

  // Update automation run metrics
  const automations = readAutomations();
  const target = automations.find(a => a.id === automation.id);
  if (target) {
    target.lastRun = new Date().toISOString();
    target.runCount = (target.runCount || 0) + 1;
    writeAutomations(automations);
  }

  return {
    success: status === 'SUCCESS',
    historyEntry,
    report: generatedReport
  };
}

/**
 * Register a scheduled cron job using node-cron
 */
function registerCronJob(auto) {
  if (scheduledJobs.has(auto.id)) {
    scheduledJobs.get(auto.id).stop();
    scheduledJobs.delete(auto.id);
  }

  if (!auto.active || auto.type !== 'SCHEDULED') return;

  if (!cron.validate(auto.cronExpression)) {
    console.warn(`[AutomationEngine] Invalid cron expression '${auto.cronExpression}' for job: ${auto.name}`);
    return;
  }

  const task = cron.schedule(auto.cronExpression, async () => {
    try {
      await executeAutomationAction(auto, 'CRON_SCHEDULE');
    } catch (err) {
      console.error(`[AutomationEngine Cron Task Error]:`, err.message);
    }
  });

  scheduledJobs.set(auto.id, task);
  console.log(`[AutomationEngine] Registered scheduled job '${auto.name}' with schedule [${auto.cronExpression}]`);
}

/**
 * Internal Event Watchdog: Periodically monitors portfolio data against event triggers
 */
async function evaluateInternalTriggers() {
  const automations = readAutomations();
  const activeEventAutos = automations.filter(a => a.active && a.type === 'EVENT');
  if (activeEventAutos.length === 0) return [];

  const triggered = [];
  const now = Date.now();
  const ONE_HOUR = 3600000;

  for (const auto of activeEventAutos) {
    const lastTriggered = eventTriggerCooldowns.get(auto.id) || 0;
    if (now - lastTriggered < ONE_HOUR) {
      // In cooldown window to prevent spamming
      continue;
    }

    let shouldFire = false;

    if (auto.eventType === 'STOCKOUT_RISK') {
      // Evaluate inventory vs forecast demand
      const stockouts = dataset.INVENTORY.filter(item => {
        const demand = Math.round((item.currentPace || 100) * 30);
        const inv = item.remainingQty || 0;
        return demand > inv * 3;
      });
      if (stockouts.length > 0) {
        shouldFire = true;
      }
    } else if (auto.eventType === 'SUPPLIER_SLA_DROP') {
      // Evaluate supplier SLA reliability
      const fallingSla = dataset.SUPPLIERS.filter(s => (s.reliabilityScore || 100) < (auto.thresholdValue || 92));
      if (fallingSla.length > 0) {
        shouldFire = true;
      }
    }

    if (shouldFire) {
      console.log(`[EventWatchdog] Threshold breached for: ${auto.name}`);
      eventTriggerCooldowns.set(auto.id, now);
      const res = await executeAutomationAction(auto, 'INTERNAL_EVENT_WATCHDOG');
      triggered.push({ automation: auto, result: res });
    }
  }

  return triggered;
}

/**
 * Initialize all persistent cron schedules & internal event watchdog on server boot
 */
function initScheduler() {
  const automations = readAutomations();
  automations.forEach(auto => {
    if (auto.type === 'SCHEDULED' && auto.active) {
      registerCronJob(auto);
    }
  });

  // Start internal event evaluator watchdog (evaluates every 60 seconds)
  if (internalWatchdogTimer) clearInterval(internalWatchdogTimer);
  internalWatchdogTimer = setInterval(async () => {
    try {
      await evaluateInternalTriggers();
    } catch (err) {
      console.warn('[AutomationWatchdog] Error in internal evaluation:', err.message);
    }
  }, 60000);

  console.log(`[AutomationEngine] Initialized ${scheduledJobs.size} active background cron schedules and internal event watchdog.`);
}

/**
 * Gracefully stop all background jobs and timers
 */
function stopScheduler() {
  for (const [id, task] of scheduledJobs.entries()) {
    task.stop();
  }
  scheduledJobs.clear();
  if (internalWatchdogTimer) {
    clearInterval(internalWatchdogTimer);
    internalWatchdogTimer = null;
  }
  console.log('[AutomationEngine] All background jobs and timers stopped.');
}

/**
 * Trigger an automation manually ("Run Now")
 */
async function runAutomationNow(id) {
  const automations = readAutomations();
  const auto = automations.find(a => a.id === id);
  if (!auto) throw new Error('Automation not found');

  return await executeAutomationAction(auto, 'MANUAL_OVERRIDE');
}

/**
 * Evaluate Event Triggers against incoming portfolio state (via external API call)
 */
async function evaluateEventTriggers(portfolioState = {}) {
  const automations = readAutomations();
  const eventAutos = automations.filter(a => a.active && a.type === 'EVENT');
  const triggered = [];

  for (const auto of eventAutos) {
    let shouldFire = false;

    if (auto.eventType === 'STOCKOUT_RISK') {
      const decisions = portfolioState.decisions || [];
      const stockoutItems = decisions.filter(d => (d.forecastDemand || 0) > (d.currentInventory || 0) * 3);
      if (stockoutItems.length > 0) shouldFire = true;
    } else if (auto.eventType === 'SUPPLIER_SLA_DROP') {
      const suppliers = portfolioState.suppliers || [];
      const failingSuppliers = suppliers.filter(s => (s.slaReliabilityPct || 100) < (auto.thresholdValue || 92));
      if (failingSuppliers.length > 0) shouldFire = true;
    }

    if (shouldFire) {
      console.log(`[EventTrigger API] Event threshold breached for: ${auto.name}`);
      const res = await executeAutomationAction(auto, 'API_EVENT_TRIGGER');
      triggered.push({ automation: auto, result: res });
    }
  }

  return triggered;
}

/**
 * CRUD Operations
 */
function listAutomations() {
  return readAutomations();
}

function getAutomationById(id) {
  const automations = readAutomations();
  return automations.find(a => a.id === id) || null;
}

function createAutomation(data) {
  const automations = readAutomations();
  const newAuto = {
    id: `auto-${crypto.randomUUID()}`,
    name: data.name || 'Untitled Automation',
    description: data.description || '',
    type: data.type || 'SCHEDULED',
    cronExpression: data.cronExpression || '0 9 * * 1',
    cronLabel: data.cronLabel || 'Weekly on Monday at 09:00 AM',
    eventType: data.eventType || null,
    thresholdValue: data.thresholdValue || null,
    thresholdUnit: data.thresholdUnit || null,
    active: data.active !== undefined ? data.active : true,
    formats: data.formats || ['pdf', 'xlsx'],
    targetAudience: data.targetAudience || 'Operations Team',
    createdAt: new Date().toISOString(),
    runCount: 0,
    action: data.action || 'GENERATE_EXECUTIVE_DIGEST'
  };

  automations.push(newAuto);
  writeAutomations(automations);

  if (newAuto.type === 'SCHEDULED' && newAuto.active) {
    registerCronJob(newAuto);
  }

  return newAuto;
}

function updateAutomation(id, updates) {
  const automations = readAutomations();
  const auto = automations.find(a => a.id === id);
  if (!auto) return null;

  Object.assign(auto, updates);
  writeAutomations(automations);

  if (auto.type === 'SCHEDULED') {
    registerCronJob(auto);
  }

  return auto;
}

function deleteAutomation(id) {
  const automations = readAutomations();
  const idx = automations.findIndex(a => a.id === id);
  if (idx === -1) return false;

  if (scheduledJobs.has(id)) {
    scheduledJobs.get(id).stop();
    scheduledJobs.delete(id);
  }

  automations.splice(idx, 1);
  writeAutomations(automations);
  return true;
}

function getExecutionHistory() {
  return readHistory();
}

module.exports = {
  initScheduler,
  stopScheduler,
  executeAutomationAction,
  runAutomationNow,
  evaluateEventTriggers,
  evaluateInternalTriggers,
  listAutomations,
  getAutomationById,
  createAutomation,
  updateAutomation,
  deleteAutomation,
  getExecutionHistory
};
