/**
 * AXIOM INVENTORY INTELLIGENCE - AI COPILOT CONTROLLER
 * Manages conversational intelligence, contextual grounding,
 * prompt suggestions, and real-time backend API streaming/fetching.
 */

(function(window) {
  'use strict';

  const copilotState = {
    messages: [
      {
        role: 'assistant',
        content: `### Welcome to AXIOM AI Copilot 👋

I am your data-grounded travel inventory procurement advisor. I have direct access to your **12 destinations**, **36 hotel allotments**, **6 wholesaler scorecards**, and **real-time optimization solver outputs**.

**What would you like to explore today?**
- Ask about **destination demand momentum** (e.g., Tokyo, Maldives, Cancun)
- Inquire about **procurement actions** (e.g., "Which hotels should we buy more of?")
- Review **wholesaler commercial value** and fulfillment risks
- Evaluate **budget allocation** or simulate demand shocks

Select a prompt below or type your question in natural language.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ],
    isLoading: false,
    activeModel: 'openai/gpt-oss-120b',
    activeProvider: 'groq'
  };

  /**
   * Initialize Copilot View and Quick Prompts
   */
  function initCopilot() {
    renderChatMessages('copilotMessages');
    renderChatMessages('floatingCopilotMessages');
    fetchConfig();
  }

  /**
   * Fetch current backend AI configuration
   */
  async function fetchConfig() {
    try {
      const resp = await fetch('/api/config');
      if (resp.ok) {
        const data = await resp.json();
        if (data.config) {
          copilotState.activeProvider = data.config.provider;
          copilotState.activeModel = data.config.model;
          updateProviderBadges();
        }
      }
    } catch (e) {
      console.warn('Could not fetch AI config from backend:', e);
    }
  }

  function updateProviderBadges() {
    const badges = document.querySelectorAll('.ai-provider-badge');
    badges.forEach(b => {
      b.textContent = `${copilotState.activeProvider.toUpperCase()} · ${copilotState.activeModel}`;
    });
  }

  /**
   * Render messages in a chat container
   */
  function renderChatMessages(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = copilotState.messages.map(m => {
      const isUser = m.role === 'user';
      return `
        <div class="chat-message ${isUser ? 'user' : 'assistant'}">
          <div class="chat-avatar">${isUser ? '👤' : '✦'}</div>
          <div class="chat-bubble">
            <div class="chat-meta">
              <span class="chat-sender">${isUser ? 'Procurement Strategist' : 'AXIOM Copilot'}</span>
              <span class="chat-time">${m.timestamp || ''}</span>
            </div>
            <div class="chat-body-text">${formatMarkdownText(m.content)}</div>
          </div>
        </div>
      `;
    }).join('');

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
  }

  /**
   * Secure markdown formatter using AxiomSanitizer to neutralize XSS
   */
  function formatMarkdownText(text) {
    if (!text) return '';
    if (window.AxiomSanitizer && window.AxiomSanitizer.safeMarkdownToHTML) {
      return window.AxiomSanitizer.safeMarkdownToHTML(text);
    }
    // Fallback safe escape
    return String(text).replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /**
   * Send user message to Copilot backend
   */
  async function sendMessage(inputElId, containerId) {
    const input = document.getElementById(inputElId);
    if (!input || !input.value.trim() || copilotState.isLoading) return;

    const userText = input.value.trim();
    input.value = '';

    // Append user message
    copilotState.messages.push({
      role: 'user',
      content: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    renderChatMessages('copilotMessages');
    renderChatMessages('floatingCopilotMessages');

    copilotState.isLoading = true;
    showTypingIndicator(containerId);

    // Build client context from current application state
    const appData = window.AxiomApp ? window.AxiomApp.getState() : {};
    const navState = window.AxiomNavigation ? window.AxiomNavigation.getState() : {};
    const opt = appData.optimizationResults || {};

    const clientContext = {
      activeSection: navState.currentSection || 'copilot',
      selectedDestination: navState.selectedDestinationId || 'all',
      portfolio: opt.portfolio || null,
      topBuys: (opt.decisions || [])
        .filter(d => d.action === 'BUY MORE')
        .slice(0, 5)
        .map(d => ({
          property: d.propertyName,
          room: d.roomType,
          dest: d.destinationName,
          units: d.recommendedPurchaseQty,
          cost: d.unitCost,
          profit: d.expectedProfitUSD,
          margin: `${d.unitMarginPct}%`
        })),
      topRisks: (appData.riskAlerts || []).slice(0, 4).map(r => ({
        title: r.title,
        severity: r.severity,
        exposure: r.financialImpactText,
        detail: r.explanation
      }))
    };

    // Intelligent Command Interception
    const lowerText = userText.toLowerCase();
    if (lowerText.startsWith('/report') || lowerText.includes('generate report') || lowerText.includes('create report') || lowerText.includes('generate dossier')) {
      copilotState.messages.push({
        role: 'assistant',
        content: `### 📑 Report Generation Dispatched\nRouting your request to the **Report Generator Agent** and **Workflow Orchestrator**.\n\nOpening **AI Report Studio** with live synthesis in progress across all 5 native formats (PDF, DOCX, XLSX, PPTX, CSV)...`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      removeTypingIndicator();
      renderChatMessages('copilotMessages');
      renderChatMessages('floatingCopilotMessages');
      copilotState.isLoading = false;
      setTimeout(() => {
        if (window.AxiomNavigation) window.AxiomNavigation.switchSection('report-studio');
        if (window.AxiomReportStudio) window.AxiomReportStudio.generateReport();
      }, 700);
      return;
    }

    if (lowerText.startsWith('/automation') || lowerText.includes('schedule report') || lowerText.includes('create automation') || lowerText.includes('setup cron')) {
      copilotState.messages.push({
        role: 'assistant',
        content: `### ⚙️ Automation Center Dispatched\nRouting your request to the **Workflow Orchestrator Agent**.\n\nOpening the **Autonomous Workflow & Automation Center** to configure your recurring cron schedule or event watchdog...`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      removeTypingIndicator();
      renderChatMessages('copilotMessages');
      renderChatMessages('floatingCopilotMessages');
      copilotState.isLoading = false;
      setTimeout(() => {
        if (window.AxiomNavigation) window.AxiomNavigation.switchSection('automations');
      }, 700);
      return;
    }

    try {
      const resp = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: copilotState.messages.map(m => ({ role: m.role, content: m.content })),
          clientContext: clientContext,
          model: copilotState.activeModel
        })
      });

      removeTypingIndicator();

      if (resp.ok) {
        const data = await resp.json();
        copilotState.messages.push({
          role: 'assistant',
          content: data.content,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isFallback: data.isFallback
        });
      } else {
        copilotState.messages.push({
          role: 'assistant',
          content: `⚠ Unable to complete AI query (${resp.status}). The deterministic fallback engine is standing by.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }
    } catch (err) {
      removeTypingIndicator();
      copilotState.messages.push({
        role: 'assistant',
        content: `⚠ Network exception: ${err.message}. Please check that the AXIOM backend server is running.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }

    copilotState.isLoading = false;
    renderChatMessages('copilotMessages');
    renderChatMessages('floatingCopilotMessages');
  }

  function showTypingIndicator(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const ind = document.createElement('div');
    ind.id = 'copilotTypingInd';
    ind.className = 'chat-message assistant';
    ind.innerHTML = `
      <div class="chat-avatar">✦</div>
      <div class="chat-bubble" style="background:rgba(0,229,255,0.06);border-color:var(--cyan-border);">
        <div style="display:flex;align-items:center;gap:6px;font-family:var(--mono);font-size:0.65rem;color:var(--cyan);">
          <span class="pulse-dot"></span>
          <span>REASONING OVER PORTFOLIO DATA...</span>
        </div>
      </div>
    `;
    container.appendChild(ind);
    container.scrollTop = container.scrollHeight;
  }

  function removeTypingIndicator() {
    const el = document.getElementById('copilotTypingInd');
    if (el) el.remove();
  }

  /**
   * Handle Quick Prompt Pill click
   */
  function askQuickPrompt(promptText) {
    const input = document.getElementById('copilotInput');
    if (input) {
      input.value = promptText;
      sendMessage('copilotInput', 'copilotMessages');
    }
  }

  /**
   * Toggle Floating Copilot Drawer
   */
  function toggleFloatingCopilot() {
    const drawer = document.getElementById('floatingCopilotDrawer');
    if (!drawer) return;
    drawer.classList.toggle('active');
    if (drawer.classList.contains('active')) {
      renderChatMessages('floatingCopilotMessages');
    }
  }

  // Expose on window object
  window.AxiomCopilot = {
    initCopilot,
    sendMessage,
    askQuickPrompt,
    toggleFloatingCopilot,
    getState: () => copilotState
  };

})(window);
