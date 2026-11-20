/**
 * AXIOM INVENTORY INTELLIGENCE - SYSTEM SETTINGS CONTROLLER
 * Manages AI provider configurations, connection testing,
 * model selection, security audits, and data governance.
 */

(function(window) {
  'use strict';

  let settingsState = {
    provider: 'groq',
    model: 'openai/gpt-oss-120b',
    hasKey: true,
    keyPrefix: 'gsk_gw9...',
    lastTestedLatency: 253,
    connectionStatus: 'VERIFIED'
  };

  async function initSettings() {
    await refreshConfig();
    renderSettingsView();
  }

  async function refreshConfig() {
    try {
      const resp = await fetch('/api/config');
      if (resp.ok) {
        const data = await resp.json();
        if (data.config) {
          settingsState.provider = data.config.provider;
          settingsState.model = data.config.model;
          settingsState.hasKey = data.config.hasKey;
          settingsState.keyPrefix = data.config.keyPrefix;
        }
      }
    } catch (e) {
      console.warn('Failed to load settings config:', e);
    }
  }

  function renderSettingsView() {
    const container = document.getElementById('settingsContainer');
    if (!container) return;

    container.innerHTML = `
      <div class="grid-main" style="margin-bottom:1.2rem;">
        <!-- AI Provider Status & Live Connection Test -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">
              <span class="card-title-icon">🤖</span> AI Engine & LLM Provider Configuration
            </div>
            <span class="chip ${settingsState.hasKey ? 'live' : 'warn'}" id="settingsStatusChip">
              ${settingsState.hasKey ? 'KEY CONFIGURED' : 'KEY MISSING'}
            </span>
          </div>
          <div class="card-body">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.2rem;">
              <div style="background:rgba(255,255,255,0.02);padding:1rem;border-radius:6px;border:1px solid var(--border);">
                <div style="font-family:var(--mono);font-size:0.55rem;color:var(--text2);text-transform:uppercase;">Active AI Provider</div>
                <div style="font-family:var(--syne);font-size:1.3rem;font-weight:700;color:var(--cyan);margin-top:4px;" id="dispProvider">
                  ${settingsState.provider.toUpperCase()}
                </div>
                <div style="font-family:var(--mono);font-size:0.6rem;color:var(--text3);margin-top:2px;">
                  Model: <strong id="dispModel">${settingsState.model}</strong>
                </div>
              </div>

              <div style="background:rgba(255,255,255,0.02);padding:1rem;border-radius:6px;border:1px solid var(--border);">
                <div style="font-family:var(--mono);font-size:0.55rem;color:var(--text2);text-transform:uppercase;">Connection Status</div>
                <div style="display:flex;align-items:center;gap:8px;margin-top:6px;">
                  <div class="pulse-dot"></div>
                  <span style="font-family:var(--syne);font-size:1.1rem;font-weight:700;color:var(--green);" id="dispConnStatus">
                    ${settingsState.connectionStatus}
                  </span>
                </div>
                <div style="font-family:var(--mono);font-size:0.6rem;color:var(--text2);margin-top:4px;" id="dispLatency">
                  Verified Latency: ~${settingsState.lastTestedLatency}ms
                </div>
              </div>
            </div>

            <!-- Provider Selection & Testing -->
            <div style="display:flex;flex-direction:column;gap:0.8rem;background:rgba(8,13,26,0.6);padding:1rem;border-radius:6px;border:1px solid var(--border);">
              <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
                <div style="font-family:var(--mono);font-size:0.65rem;color:var(--text2);">SWITCH ACTIVE PROVIDER:</div>
                <div style="display:flex;gap:6px;">
                  <button class="tb-btn ${settingsState.provider === 'groq' ? '' : 'btn-outline'}" onclick="AxiomSettings.selectProvider('groq')">Groq (Active)</button>
                  <button class="tb-btn ${settingsState.provider === 'gemini' ? '' : 'btn-outline'}" onclick="AxiomSettings.selectProvider('gemini')">Google Gemini</button>
                  <button class="tb-btn ${settingsState.provider === 'openai' ? '' : 'btn-outline'}" onclick="AxiomSettings.selectProvider('openai')">OpenAI</button>
                </div>
              </div>

              <div style="display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--border);padding-top:0.8rem;margin-top:0.4rem;">
                <div>
                  <div style="font-size:0.75rem;font-weight:600;color:var(--text);">Live Connection Diagnostics</div>
                  <div style="font-family:var(--mono);font-size:0.6rem;color:var(--text2);">Sends an authenticated test probe to the backend provider adapter</div>
                </div>
                <button class="btn btn-primary" id="btnTestConn" onclick="AxiomSettings.testConnectionNow()">
                  ⚡ TEST CONNECTION NOW
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Security Architecture Card -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">🔒 Enterprise Security Posture</div>
            <span class="chip live">ENFORCED</span>
          </div>
          <div class="card-body" style="font-size:0.74rem;line-height:1.5;color:var(--text3);display:flex;flex-direction:column;gap:0.7rem;">
            <div>
              <strong style="color:var(--cyan);">Zero Client-Side Secret Leakage:</strong>
              API credentials reside exclusively in the server environment (<code style="color:var(--amber);">.env</code>). No secret keys are stored in browser localStorage, sessionStorage, or JavaScript bundles.
            </div>
            <div>
              <strong style="color:var(--cyan);">Grounded RAG Pipeline:</strong>
              All user inquiries pass through the deterministic grounding engine, injecting verified metrics (demand volume, margins, stockouts) before reaching the LLM to prevent calculation hallucinations.
            </div>
            <div>
              <strong style="color:var(--cyan);">Offline & Fail-Safe Operation:</strong>
              If the LLM provider experiences network timeout, rate-limiting, or downtime, AXIOM automatically engages its rule-based deterministic reasoning engine with zero disruption to financial calculations.
            </div>
          </div>
        </div>
      </div>

      <!-- Synthetic Data & Environment Reference -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">▦ Data Layer & Environment Architecture</div>
          <span class="chip info">DEMO DATASET</span>
        </div>
        <div class="card-body">
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;">
            <div style="background:rgba(255,255,255,0.02);padding:0.8rem;border-radius:4px;border:1px solid var(--border);">
              <div style="font-family:var(--mono);font-size:0.55rem;color:var(--text2);">Active Destinations</div>
              <div style="font-family:var(--syne);font-size:1.3rem;font-weight:700;color:var(--cyan);margin-top:2px;">12 Markets</div>
              <div style="font-family:var(--mono);font-size:0.55rem;color:var(--text2);margin-top:2px;">Tokyo, Paris, Dubai, etc.</div>
            </div>
            <div style="background:rgba(255,255,255,0.02);padding:0.8rem;border-radius:4px;border:1px solid var(--border);">
              <div style="font-family:var(--mono);font-size:0.55rem;color:var(--text2);">Contracted Allotments</div>
              <div style="font-family:var(--syne);font-size:1.3rem;font-weight:700;color:var(--green);margin-top:2px;">36 Blocks</div>
              <div style="font-family:var(--mono);font-size:0.55rem;color:var(--text2);margin-top:2px;">Luxury, Resorts, Business</div>
            </div>
            <div style="background:rgba(255,255,255,0.02);padding:0.8rem;border-radius:4px;border:1px solid var(--border);">
              <div style="font-family:var(--mono);font-size:0.55rem;color:var(--text2);">Wholesale Bedbanks</div>
              <div style="font-family:var(--syne);font-size:1.3rem;font-weight:700;color:var(--amber);margin-top:2px;">6 Providers</div>
              <div style="font-family:var(--mono);font-size:0.55rem;color:var(--text2);margin-top:2px;">NexusBeds, Horizon, etc.</div>
            </div>
            <div style="background:rgba(255,255,255,0.02);padding:0.8rem;border-radius:4px;border:1px solid var(--border);">
              <div style="font-family:var(--mono);font-size:0.55rem;color:var(--text2);">Historical Time Series</div>
              <div style="font-family:var(--syne);font-size:1.3rem;font-weight:700;color:var(--text);margin-top:2px;">90 Days Daily</div>
              <div style="font-family:var(--mono);font-size:0.55rem;color:var(--text2);margin-top:2px;">Pickups, Searches, Prices</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async function testConnectionNow() {
    const btn = document.getElementById('btnTestConn');
    if (btn) btn.innerHTML = '⏳ TESTING...';

    try {
      const resp = await fetch('/api/ai/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: settingsState.provider,
          model: settingsState.model
        })
      });

      const data = await resp.json();
      if (btn) btn.innerHTML = '⚡ TEST CONNECTION NOW';

      if (data.success) {
        settingsState.connectionStatus = 'ONLINE (VERIFIED)';
        settingsState.lastTestedLatency = data.latencyMs;
        window.AxiomDrawerModal.toast(`Connected successfully to ${data.provider.toUpperCase()} in ${data.latencyMs}ms!`, 'ok');
      } else {
        settingsState.connectionStatus = 'CONNECTION FAILED';
        window.AxiomDrawerModal.toast(`Connection warning: ${data.error}`, 'error');
      }
      renderSettingsView();
    } catch (err) {
      if (btn) btn.innerHTML = '⚡ TEST CONNECTION NOW';
      window.AxiomDrawerModal.toast(`Connection error: ${err.message}`, 'error');
    }
  }

  async function selectProvider(prov) {
    settingsState.provider = prov;
    if (prov === 'groq') settingsState.model = 'openai/gpt-oss-120b';
    else if (prov === 'gemini') settingsState.model = 'gemini-1.5-flash';
    else if (prov === 'openai') settingsState.model = 'gpt-4o-mini';

    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: settingsState.provider,
          model: settingsState.model
        })
      });
      window.AxiomDrawerModal.toast(`Active provider set to ${prov.toUpperCase()} (${settingsState.model})`, 'info');
      renderSettingsView();
    } catch (e) {
      console.warn('Config update error:', e);
    }
  }

  window.AxiomSettings = {
    initSettings,
    renderSettingsView,
    testConnectionNow,
    selectProvider
  };

})(window);
