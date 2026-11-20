/**
 * AXIOM INVENTORY INTELLIGENCE - BACKEND API ROUTES
 * REST Endpoints for AI Copilot, Configuration, Multi-Agent Orchestration,
 * Report Studio, Physical Document Downloads, Automations, and Notifications.
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const aiService = require('./aiService');
const groundingEngine = require('./groundingEngine');
const docGenerator = require('./services/documentGenerator');
const reportService = require('./services/reportService');
const automationService = require('./services/automationService');
const notificationService = require('./services/notificationService');
const agentOrchestrator = require('./services/agentOrchestrator');
const authService = require('./services/authService');
const storage = require('./services/storageService');

/**
 * ══════════════════════════════════════════════════════════════════
 * 1. AUTHENTICATION & SYSTEM CONFIGURATION ENDPOINTS
 * ══════════════════════════════════════════════════════════════════
 */

router.post('/auth/login', (req, res) => {
  const { password } = req.body || {};
  const result = authService.login(password);
  if (!result.success) {
    return res.status(401).json(result);
  }
  res.json(result);
});

router.get('/auth/me', (req, res) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : req.headers['x-admin-token'];
  const valid = authService.isValidToken(token);
  res.json({
    authenticated: valid,
    role: valid ? 'admin' : 'anonymous'
  });
});

router.post('/auth/logout', (req, res) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : req.headers['x-admin-token'];
  res.json(authService.logout(token));
});

router.get('/health', (req, res) => {
  const cfg = aiService.getActiveProviderConfig();
  res.json({
    status: 'HEALTHY',
    systemStatus: 'online',
    version: '2.0.0',
    platform: 'AXIOM AI Intelligence Engine',
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    aiProvider: cfg.provider,
    aiModel: cfg.model,
    hasApiKey: cfg.hasKey
  });
});

router.get('/config', (req, res) => {
  const cfg = aiService.getActiveProviderConfig();
  res.json({
    success: true,
    config: cfg
  });
});

router.post('/config', authService.requireAdminAuth, (req, res) => {
  try {
    const updatedCfg = aiService.updateProviderConfig(req.body || {});
    res.json({
      success: true,
      message: `Configuration updated securely: Active provider is ${updatedCfg.provider} (${updatedCfg.model})`,
      config: updatedCfg
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/ai/test-connection', async (req, res) => {
  const { provider, model } = req.body || {};
  const result = await aiService.testConnection(provider, model);
  res.json(result);
});

/**
 * ══════════════════════════════════════════════════════════════════
 * 2. AI COPILOT & MULTI-AGENT ENDPOINTS
 * ══════════════════════════════════════════════════════════════════
 */

router.post('/ai/chat', async (req, res) => {
  try {
    const { messages, clientContext, model, temperature } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const systemPrompt = groundingEngine.buildGroundedSystemPrompt(clientContext);
    const result = await aiService.generateChatCompletion(messages, systemPrompt, {
      model,
      temperature,
      groundedContext: clientContext
    });

    res.json({
      success: true,
      content: result.content,
      provider: result.provider,
      model: result.model,
      isFallback: result.isFallback,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[API /ai/chat ERROR]:', err.message);
    res.status(500).json({
      success: false,
      error: 'Failed to process AI copilot request',
      details: err.message
    });
  }
});

router.post('/ai/brief', async (req, res) => {
  try {
    const { clientContext } = req.body || {};
    const systemPrompt = groundingEngine.buildGroundedSystemPrompt(clientContext);
    
    const messages = [{
      role: 'user',
      content: 'Generate a high-conviction 4-point executive briefing on our travel inventory procurement posture. Format each insight with: 1. Headline 2. Evidence with exact numbers 3. Financial Impact ($) 4. Recommended Procurement Action.'
    }];

    const result = await aiService.generateChatCompletion(messages, systemPrompt, {
      temperature: 0.2,
      groundedContext: clientContext
    });

    res.json({
      success: true,
      briefing: result.content,
      provider: result.provider,
      model: result.model,
      isFallback: result.isFallback
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate briefing', details: err.message });
  }
});

router.post('/ai/explain', async (req, res) => {
  try {
    const { decision, clientContext } = req.body || {};
    if (!decision) {
      return res.status(400).json({ error: 'Decision object is required' });
    }

    const systemPrompt = groundingEngine.buildGroundedSystemPrompt(clientContext);
    const messages = [{
      role: 'user',
      content: `Explain in detail why the optimization solver recommends the action '${decision.action}' for ${decision.propertyName} in ${decision.destinationName} (${decision.roomType}) with supplier ${decision.supplierName}. 
Current Inventory: ${decision.currentInventory} units
Forecast Demand: ${decision.forecastDemand} units
Recommended Purchase: ${decision.recommendedPurchaseQty} units
Procurement Cost: $${decision.allocatedBudgetUSD} ($${decision.unitCost}/night)
Expected Profit: +$${decision.expectedProfitUSD} (Selling Price: $${decision.sellingPrice})
Risk Score: ${decision.riskScore}/100
Detail marginal profitability, holding loss protection, and strategic importance.`
    }];

    const result = await aiService.generateChatCompletion(messages, systemPrompt, {
      temperature: 0.2,
      groundedContext: clientContext
    });

    res.json({
      success: true,
      explanation: result.content,
      provider: result.provider,
      isFallback: result.isFallback
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to explain decision', details: err.message });
  }
});

router.post('/agents/task', async (req, res) => {
  try {
    const { taskPrompt, context, agentId } = req.body || {};
    if (!taskPrompt) return res.status(400).json({ error: 'taskPrompt is required' });

    const result = await agentOrchestrator.executeAgentTask(taskPrompt, context, agentId);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: 'Agent execution failed', details: err.message });
  }
});

router.post('/agents/pipeline', async (req, res) => {
  try {
    const { templateId, parameters, clientData } = req.body || {};
    const pipeline = await agentOrchestrator.runMultiAgentReportPipeline(templateId, parameters, clientData);
    res.json({ success: true, pipeline });
  } catch (err) {
    res.status(500).json({ error: 'Pipeline execution failed', details: err.message });
  }
});

/**
 * ══════════════════════════════════════════════════════════════════
 * 3. REPORT STUDIO & DOCUMENT GENERATION ENDPOINTS
 * ══════════════════════════════════════════════════════════════════
 */

router.get('/reports/templates', (req, res) => {
  res.json({
    success: true,
    templates: reportService.REPORT_TEMPLATES
  });
});

router.get('/reports', (req, res) => {
  const reports = reportService.listReports();
  res.json({ success: true, count: reports.length, reports });
});

router.get('/reports/:id', (req, res) => {
  const report = reportService.getReportById(req.params.id);
  if (!report) return res.status(404).json({ error: 'Report not found' });
  res.json({ success: true, report });
});

router.post('/reports/generate', async (req, res) => {
  try {
    const { templateId, title, horizonDays, destinationId, supplierId, detailLevel, tone, formats, clientContext } = req.body || {};
    const report = await reportService.generateReport({
      templateId,
      title,
      horizonDays,
      destinationId,
      supplierId,
      detailLevel,
      tone,
      formats: formats || ['pdf', 'docx', 'xlsx', 'pptx', 'csv'],
      author: 'AXIOM Autonomous AI Engine'
    }, clientContext || {});

    // Notify user
    notificationService.addNotification({
      title: `Report Generated: ${report.title}`,
      message: `Successfully synthesized ${Object.keys(report.formats || {}).length} formats. Available in Document Library.`,
      severity: 'INFO',
      category: 'REPORT',
      actionLink: '#sec-documents',
      metadata: { reportId: report.id }
    });

    res.json({ success: true, report });
  } catch (err) {
    console.error('[API /reports/generate ERROR]:', err.message);
    res.status(500).json({ error: 'Report generation failed', details: err.message });
  }
});

router.patch('/reports/:id/sections/:sectionIndex', async (req, res) => {
  try {
    const { id, sectionIndex } = req.params;
    const { content } = req.body || {};
    if (content === undefined) return res.status(400).json({ error: 'Section content is required' });

    const updatedReport = await reportService.updateReportSection(id, parseInt(sectionIndex, 10), content);
    res.json({ success: true, report: updatedReport });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update section', details: err.message });
  }
});

router.post('/reports/:id/ai-rewrite', async (req, res) => {
  try {
    const { id } = req.params;
    const { sectionIndex, instruction } = req.body || {};
    const result = await reportService.rewriteSection(id, parseInt(sectionIndex, 10), instruction);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'AI section rewrite failed', details: err.message });
  }
});

router.delete('/reports/:id', (req, res) => {
  const success = reportService.deleteReport(req.params.id);
  if (!success) return res.status(404).json({ error: 'Report not found or could not be deleted' });
  res.json({ success: true, message: 'Report and physical files deleted successfully' });
});

/**
 * Physical Document Download Endpoint (Real binary file serving with canonical path defense)
 */
router.get('/reports/download/:filename', (req, res) => {
  const { filename } = req.params;
  const safeFilename = path.basename(filename);
  const resolvedBaseDir = path.resolve(docGenerator.STORAGE_DIR);
  const filePath = path.resolve(resolvedBaseDir, safeFilename);

  // Strict path traversal defense
  if (!filePath.startsWith(resolvedBaseDir)) {
    return res.status(403).json({ success: false, error: 'Access denied: Path traversal detected' });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, error: 'File not found on server disk' });
  }

  // Set appropriate mime-type and attachment header
  const ext = path.extname(safeFilename).toLowerCase();
  let contentType = 'application/octet-stream';
  if (ext === '.pdf') contentType = 'application/pdf';
  else if (ext === '.docx') contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  else if (ext === '.xlsx') contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  else if (ext === '.pptx') contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  else if (ext === '.csv') contentType = 'text/csv';

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
  res.sendFile(filePath);
});

/**
 * Risk Mitigation Action Endpoint
 */
router.post('/risk/mitigate', (req, res) => {
  try {
    const { riskId, riskTitle, action, actionType, notes, propertyName, destinationName } = req.body || {};
    const mitigationId = `mit-${crypto.randomUUID()}`;
    const chosenAction = action || actionType || 'Automated inventory review & hedging order';

    const record = {
      id: mitigationId,
      riskId: riskId || 'risk-general',
      riskTitle: riskTitle || 'Inventory Anomaly Risk',
      action: chosenAction,
      propertyName: propertyName || 'Portfolio Level',
      destinationName: destinationName || 'Global',
      notes: notes || '',
      status: 'PROTOCOL_DISPATCHED',
      timestamp: new Date().toISOString()
    };

    // Store in storage/mitigations.json
    const mitigationsFile = path.join(__dirname, '..', 'storage', 'mitigations.json');
    const existing = storage.readJSONSync(mitigationsFile, []);
    existing.unshift(record);
    storage.writeJSONSync(mitigationsFile, existing);

    // Add persistent notification
    notificationService.addNotification({
      title: `Risk Mitigation Dispatched: ${riskTitle || 'Inventory Risk'}`,
      message: `Protocol executed: ${chosenAction}. Status: Protocol Active. ${notes ? 'Notes: ' + notes : ''}`,
      severity: 'WARNING',
      category: 'RISK',
      actionLink: '#sec-risk',
      metadata: { mitigationId, riskId, action: chosenAction, notes }
    });

    res.json({
      ok: true,
      success: true,
      mitigationId,
      status: 'PROTOCOL_DISPATCHED',
      timestamp: record.timestamp,
      action: chosenAction,
      record,
      message: `Mitigation protocol '${chosenAction}' recorded and operational alert dispatched.`
    });
  } catch (err) {
    res.status(500).json({ ok: false, success: false, error: err.message });
  }
});

/**
 * ══════════════════════════════════════════════════════════════════
 * 4. AUTOMATION & PERSISTENT SCHEDULER ENDPOINTS
 * ══════════════════════════════════════════════════════════════════
 */

router.get('/automations', (req, res) => {
  const list = automationService.listAutomations();
  res.json({ success: true, count: list.length, automations: list });
});

router.post('/automations', (req, res) => {
  const newAuto = automationService.createAutomation(req.body);
  res.json({ success: true, automation: newAuto });
});

router.get('/automations/history', (req, res) => {
  const history = automationService.getExecutionHistory();
  res.json({ success: true, count: history.length, history });
});

router.get('/automations/:id', (req, res) => {
  const auto = automationService.getAutomationById(req.params.id);
  if (!auto) return res.status(404).json({ error: 'Automation not found' });
  res.json({ success: true, automation: auto });
});

router.patch('/automations/:id', (req, res) => {
  const updated = automationService.updateAutomation(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Automation not found' });
  res.json({ success: true, automation: updated });
});

router.delete('/automations/:id', (req, res) => {
  const deleted = automationService.deleteAutomation(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Automation not found' });
  res.json({ success: true, message: 'Automation deleted successfully' });
});

router.post('/automations/:id/run', async (req, res) => {
  try {
    const result = await automationService.runAutomationNow(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to run automation', details: err.message });
  }
});

router.post('/automations/check-triggers', async (req, res) => {
  try {
    const { portfolioState } = req.body || {};
    const triggered = await automationService.evaluateEventTriggers(portfolioState);
    res.json({ success: true, count: triggered.length, triggered });
  } catch (err) {
    res.status(500).json({ error: 'Failed to evaluate triggers', details: err.message });
  }
});

/**
 * ══════════════════════════════════════════════════════════════════
 * 5. NOTIFICATION CENTER ENDPOINTS
 * ══════════════════════════════════════════════════════════════════
 */

router.get('/notifications', (req, res) => {
  const notifs = notificationService.listNotifications();
  const unreadCount = notifs.filter(n => !n.read).length;
  res.json({ success: true, count: notifs.length, unreadCount, notifications: notifs });
});

router.patch('/notifications/:id/read', (req, res) => {
  const updated = notificationService.markAsRead(req.params.id);
  res.json({ success: true, notification: updated });
});

router.post('/notifications/read-all', (req, res) => {
  const updated = notificationService.markAllAsRead();
  res.json({ success: true, notifications: updated });
});

router.post('/notifications/clear', (req, res) => {
  notificationService.clearAll();
  res.json({ success: true, message: 'All notifications cleared' });
});

module.exports = router;
