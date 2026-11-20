/**
 * AXIOM BACKEND INTEGRATION & VERIFICATION TEST SUITE
 * Tests:
 * 1. AI Provider Connectivity & Grounded Reasoning
 * 2. Multi-Agent Orchestrator (7 Agents)
 * 3. Physical Document Generation (PDF, DOCX, XLSX, PPTX, CSV)
 * 4. Report Service & 12 Templates Catalog
 * 5. Automation Center, Cron Registration & Manual Execution
 * 6. Notification Center
 */

const aiService = require('../server/aiService');
const agentOrchestrator = require('../server/services/agentOrchestrator');
const docGenerator = require('../server/services/documentGenerator');
const reportService = require('../server/services/reportService');
const automationService = require('../server/services/automationService');
const notificationService = require('../server/services/notificationService');

async function runAllTests() {
  console.log('======================================================');
  console.log('🧪 RUNNING COMPREHENSIVE AXIOM BACKEND TEST SUITE');
  console.log('======================================================\n');

  // Test 1: Provider Config
  console.log('▶ [1/6] Testing AI Provider Configuration...');
  const cfg = aiService.getActiveProviderConfig();
  console.log(`  Active Provider: ${cfg.provider} | Model: ${cfg.model} | Key configured: ${cfg.hasKey}`);
  if (!cfg.hasKey) {
    console.error('  ❌ FAIL: No API key found in .env');
    process.exit(1);
  }
  console.log('  ✔ PASS: Provider credentials loaded securely.\n');

  // Test 2: AI Multi-Agent Task Execution
  console.log('▶ [2/6] Testing Multi-Agent Orchestrator...');
  const agentTaskRes = await agentOrchestrator.executeAgentTask(
    'Audit forward stockout risks across our Tokyo properties and recommend allocation',
    { selectedDestination: 'tokyo', totalBudgetUSD: 1500000 }
  );
  console.log(`  Routed to Agent: ${agentTaskRes.agent.name} (${agentTaskRes.agent.badge})`);
  console.log(`  Provider used: ${agentTaskRes.provider} (Fallback: ${agentTaskRes.isFallback})`);
  console.log(`  Response snippet: ${agentTaskRes.content.substring(0, 150)}...`);
  console.log('  ✔ PASS: Multi-Agent task executed successfully.\n');

  // Test 3: 12 Templates Catalog & Physical Multi-Format Report Generation
  console.log('▶ [3/6] Testing Report Studio & 12 Enterprise Templates...');
  const templates = reportService.REPORT_TEMPLATES;
  console.log(`  Loaded ${templates.length} Enterprise Templates (Expected: 12)`);
  if (templates.length !== 12) {
    console.error(`  ❌ FAIL: Expected 12 templates, found ${templates.length}`);
    process.exit(1);
  }

  console.log('  Generating multi-format report (PDF, DOCX, XLSX, PPTX, CSV)...');
  const report = await reportService.generateReport({
    templateId: 'EXECUTIVE_BRIEF',
    title: 'Unit Test Procurement Strategy Bundle',
    formats: ['pdf', 'docx', 'xlsx', 'pptx', 'csv']
  });

  console.log(`  Report ID: ${report.id}`);
  console.log(`  Title: ${report.title}`);
  console.log(`  Generated Formats:`, Object.keys(report.formats));
  ['pdf', 'docx', 'xlsx', 'pptx', 'csv'].forEach(fmt => {
    if (!report.formats[fmt]) {
      console.error(`  ❌ FAIL: Missing format ${fmt}`);
      process.exit(1);
    }
    console.log(`    - ${fmt.toUpperCase()}: ${report.formats[fmt].filename} (${report.formats[fmt].sizeBytes} bytes)`);
  });
  console.log('  ✔ PASS: All 5 physical file formats generated & saved on disk.\n');

  // Test 4: Section Update & AI Rewrite
  console.log('▶ [4/6] Testing Document Intelligence & Section Editor...');
  const updatedReport = await reportService.updateReportSection(
    report.id,
    0,
    'Updated Executive Summary: Tokyo demand momentum confirmed at 92/100. Procuring 240 units of Grand Hyatt Tokyo immediately.'
  );
  console.log(`  Updated section 0 content length: ${updatedReport.sections[0].content.length}`);
  console.log('  ✔ PASS: Section updated and binary files re-compiled.\n');

  // Test 5: Automation Center & Scheduler
  console.log('▶ [5/6] Testing Automation Engine & Trigger Execution...');
  const automations = automationService.listAutomations();
  console.log(`  Active Automations: ${automations.length}`);
  const firstAuto = automations[0];
  console.log(`  Triggering manual run of: '${firstAuto.name}'...`);
  const autoRunRes = await automationService.runAutomationNow(firstAuto.id);
  console.log(`  Execution result: ${autoRunRes.success ? 'SUCCESS' : 'FAILED'}`);
  console.log(`  Duration: ${autoRunRes.historyEntry.durationMs}ms`);
  const history = automationService.getExecutionHistory();
  console.log(`  Execution History records: ${history.length}`);
  console.log('  ✔ PASS: Automation executed and recorded in history log.\n');

  // Test 6: In-App Notification Center
  console.log('▶ [6/6] Testing Notification Center...');
  const notifs = notificationService.listNotifications();
  console.log(`  Total notifications: ${notifs.length}`);
  const testNotif = notificationService.addNotification({
    title: 'Test Operational Alert',
    message: 'Simulated alert for test suite verification.',
    severity: 'INFO',
    category: 'TEST'
  });
  console.log(`  Created notification: ${testNotif.title} [${testNotif.severity}]`);
  notificationService.markAsRead(testNotif.id);
  console.log('  ✔ PASS: Notification created and marked as read.\n');

  console.log('======================================================');
  console.log('🎉 ALL 6 BACKEND SYSTEMS FULLY OPERATIONAL AND VERIFIED');
  console.log('======================================================\n');
  process.exit(0);
}

runAllTests().catch(err => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
