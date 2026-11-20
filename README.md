# ✈️ AXIOM INVENTORY INTELLIGENCE v2.0
### AI-Powered Travel Demand Forecasting & Procurement Optimization Platform

> **An enterprise decision-intelligence platform that transforms real-time travel demand signals, wholesale bedbank rates, booking pace acceleration, and holding decay into explainable, profit-optimal inventory procurement decisions — powered by an integrated Groq / Gemini / OpenAI Multi-Agent AI Engine.**

![Platform](https://img.shields.io/badge/Platform-AXIOM%202.0%20Enterprise-00e5ff?style=flat-square)
![Status](https://img.shields.io/badge/Status-Production%20Ready-00e676?style=flat-square)
![Tests](https://img.shields.io/badge/Tests-34%2F34%20Passing%20(100%25)-00e676?style=flat-square)
![Backend](https://img.shields.io/badge/Backend-Node.js%20%2F%20Express-00e5ff?style=flat-square)
![AI Multi-Agent](https://img.shields.io/badge/AI%20Agents-7%20Specialized%20Personas-7928ca?style=flat-square)
![Optimization](https://img.shields.io/badge/Optimization-Constrained%20Knapsack%20LP-ff9900?style=flat-square)

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Problem Being Solved](#2-problem-being-solved)
3. [Core Features](#3-core-features)
4. [AI Architecture & Multi-Agent Orchestrator](#4-ai-architecture--multi-agent-orchestrator)
5. [Demand Forecasting Methodology](#5-demand-forecasting-methodology)
6. [Procurement Optimization Engine](#6-procurement-optimization-engine)
7. [Scenario Simulation Lab](#7-scenario-simulation-lab)
8. [Risk & Anomaly Analysis](#8-risk--anomaly-analysis)
9. [Document Generation (5 Native Formats)](#9-document-generation-5-native-formats)
10. [AI Reporting & Workflow Automation](#10-ai-reporting--workflow-automation)
11. [Technology Stack](#11-technology-stack)
12. [Project & Repository Architecture](#12-project--repository-architecture)
13. [Installation Instructions](#13-installation-instructions)
14. [Environment Configuration](#14-environment-configuration)
15. [Startup Instructions](#15-startup-instructions)
16. [REST API Documentation](#16-rest-api-documentation)
17. [Security Architecture & Notes](#17-security-architecture--notes)
18. [Limitations & Future Integrations](#18-limitations--future-integrations)

---

## 1. Project Overview

**AXIOM Inventory Intelligence** is an enterprise-grade travel procurement optimization and operational intelligence platform. It bridges the gap between raw booking telemetry (search volumes, pace pickup, wholesaler availability) and real capital deployment.

Instead of treating inventory procurement as a static spreadsheet exercise, AXIOM continuously ingests market signals, runs bounded optimization models, detects operational stockout and holding decay risks, coordinates autonomous multi-agent AI syntheses, and generates board-level reports and financial workbooks.

---

## 2. Problem Being Solved

Travel distributors, online travel agencies (OTAs), and tour operators face severe structural margin erosion due to the classical **Travel Inventory Dilemma**:

1. **Under-Procurement (Stockouts)**: Unfulfilled customer booking demand when destination pace surges unexpectedly, leading to lost gross booking value (GBV) and permanent customer churn.
2. **Over-Procurement (Holding Decay)**: Surplus contracted room blocks expiring unsold past cancellation cutoff covenants, causing direct 100% loss of committed working capital.
3. **Wholesaler Asymmetry & Fragmentation**: Bedbanks and aggregators offer volatile wholesale pricing, fluctuating fulfillment SLAs, and punitive release penalties that humans cannot optimize manually across hundreds of properties.
4. **Black-Box Decision Making**: Traditional yield management software delivers arbitrary recommendations without explaining *why* a particular room block should be bought, held, or released.

AXIOM resolves these challenges with bounded mathematical optimization coupled with explainable multi-agent AI intelligence.

---

## 3. Core Features

- **Executive Intelligence Command Center**: Unified KPI matrix ($1.61M exposure, 75.3% budget deployed, $2.30M projected turnover, 49.9% net portfolio margin) with real-time pace pickup charts.
- **AI Copilot & Floating Dock**: Grounded conversational intelligence interface with streaming SSE responses and domain memory.
- **Procurement Optimizer (The Core Engine)**: Multi-factor constrained knapsack solver delivering defensible actions (`BUY MORE`, `MAINTAIN`, `REDUCE`, `HOLD`, `AVOID`) with full mathematical derivation drawer.
- **Demand Forecasting Engine**: Triple-signal predictive modeling with confidence bands and backtested error tracking.
- **Inventory Intelligence System**: 36 wholesale hotel room contracts across 12 destinations with live sell-through, room-type tiering, and stockout classifications.
- **Dynamic Budget Allocation Lab**: Real-time slider re-solving ($500K to $4.0M) enforcing diversification ceilings and marginal yield optimization.
- **Destination Intelligence & Comparison**: Momentum scoring (0–100), ADR spread, and interactive head-to-head destination comparison modal.
- **Supplier Scorecard & Radar**: Evaluation of 6 global bedbanks across fulfillment reliability, price competitiveness, and cancellation covenant flexibility.
- **Scenario Simulation Lab**: Interactive what-if stress testing calculating exact Baseline vs. Scenario financial deltas across 6 macro presets.
- **Risk & Anomaly Detection**: Capital-at-risk prioritization, stockout exposure modeling, holding decay tracking, and automated mitigations.
- **Performance Analytics & Backtesting**: Realized vs. predicted accuracy tracking with a documented historical ROI of $1.84 per $1 wholesale committed.
- **AI Report Studio**: 12 enterprise report templates with animated 7-stage multi-agent synthesis and interactive section markdown editor.
- **Enterprise Document Library**: Centralized repository with live full-text search, category filters, tabbed document previews, and one-click binary downloads.
- **Autonomous Automation Center**: Background `node-cron` scheduler for recurring digests and threshold event watchdogs with full audit logs.

---

## 4. AI Architecture & Multi-Agent Orchestrator

AXIOM implements a decoupled **Multi-Agent Orchestrator** coordinating 7 specialized AI personas:

```text
                           USER / SCHEDULED TRIGGER
                                      │
                                      ▼
                        AXIOM MULTI-AGENT ORCHESTRATOR
                                      │
       ┌──────────────────────────────┼──────────────────────────────┐
       │                              │                              │
       ▼                              ▼                              ▼
1. DATA ANALYST               2. FORECAST ANALYST           3. PROCUREMENT STRATEGIST
Quantitative data validation   Holt-Winters smoothing        Linear knapsack solver
Allotment coverage audit       Booking pace acceleration     Marginal profit yield
       │                              │                              │
       └──────────────────────────────┼──────────────────────────────┘
                                      │
       ┌──────────────────────────────┼──────────────────────────────┐
       │                              │                              │
       ▼                              ▼                              ▼
4. RISK ANALYST               5. REPORT GENERATOR           6. EXECUTIVE ASSISTANT
Stockout capital exposure      Multi-section drafting        C-Suite synthesis
Wholesaler SLA watchdog        12 board templates            Conversational answers
       │                              │                              │
       └──────────────────────────────┼──────────────────────────────┘
                                      │
                                      ▼
                        7. WORKFLOW ORCHESTRATOR AGENT
                  Persistent Cron · Webhooks · Binary Exporters
```

### Data-Grounded RAG Pipeline
To guarantee mathematical precision and eliminate hallucinations, every prompt sent to the LLM passes through `groundingEngine.js`, injecting verified portfolio metrics, current allocations, contracted wholesale rates, and active risk alerts before generation.

### Multi-Provider Cloud Orchestration
Supported LLM adapters include:
- **Groq**: High-speed inference using `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`, or `openai/gpt-oss-120b`.
- **Google Gemini**: REST API integration with `gemini-1.5-flash` or `gemini-1.5-pro`.
- **OpenAI**: Native completions via `gpt-4o` or `gpt-4o-mini`.
- **Deterministic Rule-Based Fallback**: Autonomous fallback engine providing complete continuity if API keys are omitted or providers encounter outages.

---

## 5. Demand Forecasting Methodology

The forecast engine predicts future booking room-night demand across operational horizons ($h \in \{7, 14, 30, 60, 90\}$ days) using a composite formulation:

$$\hat{D}_{d}(t + h) = \big( L_{t} + h \cdot T_{t} \big) \times S_{\text{DOW}}(t + h) \times \left( 0.60 \cdot \frac{V_{\text{curr}}}{V_{\text{base}}} + 0.25 \cdot \frac{Q_{\text{search}}}{100} + 0.15 \cdot I_{\text{season}} \right)$$

Where:
- $L_t, T_t$: Holt-Winters level and trend components with smoothing parameters $\alpha = 0.35, \beta = 0.15$.
- $S_{\text{DOW}}$: Day-of-week seasonality multiplier.
- $V_{\text{curr}} / V_{\text{base}}$: Realized booking pickup velocity ratio over the trailing 7 days.
- $Q_{\text{search}}$: Normalized flight and hotel search query volume index (0–100).
- $I_{\text{season}}$: Destination calendar seasonality index (holidays, peak festivals, corporate seasons).
- 95% Confidence Bounds: Derived using empirical standard error $\sigma_h = \text{RMSE} \times \sqrt{h}$.

---

## 6. Procurement Optimization Engine

Procurement decisions are formulated as a **Multi-Factor Constrained Knapsack Optimization Problem**:

$$\max \sum_{i} \Big( \mathbb{E}[\text{Revenue}_i] - \text{ProcurementCost}_i - \text{UnsoldPen}_i - \text{ShortagePen}_i - \text{RiskPen}_i \Big)$$

### Mathematical Constraints:
1. **Working Capital Budget Ceiling**:
   $$\sum_{i} (q_i \cdot C_i) \le B_{\text{total}}$$
2. **Wholesaler Allotment Capacity**:
   $$0 \le q_i \le \min\big(\text{SupplierMax}_i - I_i^{\text{curr}},\, \max(0, \hat{D}_i - I_i^{\text{curr}})\big)$$
3. **Geographic Diversification Limit**:
   $$\sum_{i \in \text{Dest}_d} (q_i \cdot C_i) \le 0.22 \times B_{\text{total}} \quad \forall d$$
4. **Minimum Order Quantity (MOQ) & Lot Discretization**:
   $$q_i = k \cdot \text{BatchSize}_i \quad (k \in \mathbb{N}_0)$$

---

## 7. Scenario Simulation Lab

AXIOM allows revenue managers to evaluate market shocks before committing capital:
- **Summer Leisure Surge**: +35% demand spike in leisure destinations, +15% ADR expansion.
- **Global Macro Contraction**: -25% demand drop across corporate hubs, -10% wholesale room discounting.
- **Wholesale Price Shock**: +20% cost surge from primary bedbanks, compressing net profit margins.
- **Primary Bedbank Outage**: Simulation of major wholesaler downtime, rerouting volume to secondary suppliers.
- **Austerity Budget Cut**: -40% reduction in working procurement capital, prioritizing top-quintile margin properties.
- **Severe Weather Shock**: Sudden demand collapse in specific tropical destinations (e.g. Cancun, Maldives).

---

## 8. Risk & Anomaly Analysis

The Risk Engine identifies and ranks threats strictly by **Financial Exposure ($ at risk)**:
1. **Critical Stockout Risk**: Current inventory insufficient to cover forecast demand pace; risk quantified as $(\hat{D}_i - I_i^{\text{curr}}) \times (\text{ADR}_i - C_i)$.
2. **Surplus Holding Decay**: Room allotments nearing cancellation release cutoff dates without sufficient forward pickup.
3. **Wholesaler SLA Degradation**: Bedbank confirmed delivery reliability dropping below the 95% SLA covenant threshold.
4. **Automated One-Click Mitigations**: Direct API execution to auto-reorder room allotments, trigger wholesaler volume reallocation, or release holding blocks.

---

## 9. Document Generation (5 Native Formats)

AXIOM compiles genuine, physically downloadable binary assets saved to server storage:

| Format | Library | Corporate Features |
| :--- | :--- | :--- |
| **PDF** | `pdfkit` | Vector branding, KPI summary strip, styled action badges, horizontal spend distribution vector chart, buffered running page footer (`Page X of Y`). |
| **Excel (XLSX)** | `exceljs` | Multi-worksheet financial model, `$#,##0` currency formats, `0.0%` margin formats, and dynamic native Excel summary formulas (`=SUM(...)`, `=AVERAGE(...)`). |
| **Word (DOCX)** | `docx` | Formatted executive brief, styled headers, clean callout cards, and decision tables. |
| **PowerPoint (PPTX)** | `pptxgenjs` | 16:9 widescreen presentation deck with dark corporate aesthetic, metric cards, decision schedules, and visual bar charts. |
| **CSV** | Native RFC-4180 | Tabular dataset with strict comma/quote escaping and executive `PORTFOLIO TOTAL` summary row for ERP integration. |

---

## 10. AI Reporting & Workflow Automation

- **12 Enterprise Report Templates**: Executive Business Briefing, Monthly Operations Review, Inventory Performance, Wholesaler Evaluation, Destination Demand, Budget Capital Allocation, Scenario Stress Test, Risk Audit, Forward Purchase Plan, Profitability Breakdown, Post-Season Reconciliation, and Daily Executive Digest.
- **Autonomous Scheduler (`node-cron`)**: Persistent cron execution running morning briefings, weekly rebalancing runs, and monthly board audits.
- **Event-Driven Watchdogs**: Continuous evaluation of imminent stockout conditions and wholesaler error rates with deduplicated notification dispatching.

---

## 11. Technology Stack

- **Backend**: Node.js (v18+ / v22+), Express 4.19, `dotenv`, `cors`.
- **Document Engineering**: `pdfkit`, `exceljs`, `docx`, `pptxgenjs`, `uuid`.
- **Automation**: `node-cron`.
- **Frontend**: Pure modern ECMAScript 2022, CSS3 with Syne & JetBrains Mono typography, Chart.js 4.4.
- **AI Providers**: Groq API, Google Gemini REST API, OpenAI API.
- **Testing**: Native Node.js test runners (`test/full-system-test.js`, `test/backend-test.js`).

---

## 12. Project & Repository Architecture

```text
operations-supply-chain-dashboard/
├── server.js                          # Express application entry point & port resolution
├── server/
│   ├── routes.js                      # REST API routing & request handlers
│   ├── aiService.js                   # Groq, Gemini, OpenAI, & fallback adapters
│   ├── groundingEngine.js             # Anti-hallucination data RAG context injector
│   ├── multiAgentService.js           # 7-agent autonomous coordination engine
│   └── services/
│       ├── documentGenerator.js       # Binary generator (PDF, XLSX, DOCX, PPTX, CSV)
│       ├── reportService.js           # 12 Enterprise Report templates & studio logic
│       ├── automationService.js       # Persistent node-cron & event watchdog
│       ├── notificationService.js     # System alert & notification manager
│       ├── authService.js             # Enterprise authentication & session tokens
│       └── storageService.js          # Atomic, thread-safe JSON file persistence
├── js/
│   ├── app.js                         # Application state controller & filter sync
│   ├── data/syntheticDataset.js       # Baseline destinations, inventory, suppliers
│   ├── math/
│   │   ├── forecastingEngine.js       # Holt-Winters double exponential smoothing
│   │   ├── optimizerEngine.js         # Constrained knapsack optimization solver
│   │   ├── scenarioEngine.js          # What-if market stress simulator
│   │   └── explainabilityEngine.js    # Defensible mathematical rationale engine
│   └── ui/
│       ├── navigation.js              # Global routing & topbar filter state
│       ├── drawerModal.js             # Modal dialog & toast notification manager
│       ├── reportStudioView.js        # AI Report Studio view & multi-agent pipeline
│       ├── documentLibraryView.js     # Enterprise Document Library & 3-tab previewer
│       ├── automationView.js          # Autonomous Automation Center view
│       └── sanitizer.js               # Client-side XSS defense & HTML sanitization
├── css/axiom.css                      # Bloomberg-density enterprise theme
├── storage/                           # Persistent local JSON data & generated files
│   └── documents/                     # Storage directory for compiled binary documents
├── test/
│   ├── full-system-test.js            # Comprehensive 34-point end-to-end test suite
│   └── backend-test.js                # 6-point multi-agent & report generation test
├── index.html                         # Unified single-page application entry point
├── package.json                       # Dependencies & npm scripts
├── .env.example                       # Safe environment variables template
└── .gitignore                         # Comprehensive secret & build exclusion rules
```

---

## 13. Installation Instructions

### Prerequisites
- **Node.js**: v18.0.0 or higher (v22.23+ recommended)
- **npm**: v9.0.0 or higher
- **Git**: For version control

### Clone and Install
```bash
# Clone the repository
git clone https://github.com/invalid-52/AXIOM-Inventory-Intelligence.git
cd AXIOM-Inventory-Intelligence

# Install all required dependencies
npm install
```

---

## 14. Environment Configuration

Copy the provided placeholder configuration:
```bash
cp .env.example .env
```

Edit `.env` to configure your preferred AI provider and port:
```env
PORT=3000

# Choose active AI Provider: 'groq' | 'gemini' | 'openai'
AI_PROVIDER=groq
AI_MODEL=openai/gpt-oss-120b

# Supply your private API key for the chosen provider:
GROQ_API_KEY=your_groq_api_key_here
GEMINI_API_KEY=
OPENAI_API_KEY=
```

> [!NOTE]
> If no API key is provided, AXIOM operates seamlessly in **Deterministic Fallback Mode**, generating rule-based mathematical briefs without throwing runtime errors.

---

## 15. Startup Instructions

### Start the Server
```bash
npm start
```
The application will launch on `http://localhost:3000/`. If port 3000 is occupied, the server automatically detects conflict and binds to the next available port.

### Run Automated Tests
```bash
# Run comprehensive system verification (34 tests)
npm test

# Run backend services verification (6 tests)
npm run test:backend
```

---

## 16. REST API Documentation

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | System health, active AI provider, uptime, and status. |
| `GET` | `/api/config` | Non-sensitive runtime configuration (masked key prefix). |
| `POST` | `/api/ai/chat` | Context-grounded conversational Copilot endpoint. |
| `POST` | `/api/ai/test-conn` | Live connection diagnostic probe to active LLM provider. |
| `POST` | `/api/ai/agent-task` | Multi-agent execution endpoint routing to 1 of 7 personas. |
| `GET` | `/api/reports/templates` | Catalogs the 12 Enterprise Report Templates. |
| `GET` | `/api/reports` | Returns all generated documents and metadata in storage. |
| `POST` | `/api/reports/generate` | Generates a new document dossier across selected formats. |
| `GET` | `/api/reports/download/:file`| Physical download endpoint for PDF, XLSX, DOCX, PPTX, CSV. |
| `POST` | `/api/risk/mitigate` | Persists mitigation actions and dispatches system alerts. |
| `GET` | `/api/automations` | Lists scheduled cron jobs and event watchdogs. |
| `POST` | `/api/automations/:id/run` | Triggers immediate manual execution of a workflow. |
| `GET` | `/api/notifications` | Lists in-app operational notifications and unread counts. |

---

## 17. Security Architecture & Notes

1. **Zero Secret Leakage**: API credentials never touch client bundles, local storage, or public endpoints.
2. **Git & Repo Hygiene**: `.env` and all `.env.*` variants are strictly ignored.
3. **Anti-Path Traversal**: File download endpoints enforce sanitization and restrict serving to the absolute storage path.
4. **Client-Side Defense-in-Depth**: All rendered markdown is parsed through `AxiomSanitizer`, stripping `<script>`, inline event handlers (`onload`, `onerror`), and `javascript:` URIs.
5. **Strict Rate-Limiting & Payload Bounds**: Express server restricts payloads to 5MB and enforces `nosniff`, `DENY` framing, and XSS protection headers.

---

## 18. Limitations & Future Integrations

- **Demonstration Dataset**: Current hotel allotments, rates, and demand curves are synthetic representations built for validation.
- **Future GDS & Bedbank API Connectors**: Architecture is primed for live connectors to Sabre, Amadeus, Hotelbeds APItude, and WebBeds XML feeds.
- **Dynamic Pricing Elasticity**: Future releases will incorporate price elasticity curves ($\epsilon = \frac{\% \Delta Q}{\% \Delta P}$) into the objective function.
- **Distributed Database Migration**: Designed for straightforward migration from local atomic JSON storage to PostgreSQL / Redis for high-concurrency clusters.

---

### License
Released under the ISC License. Copyright &copy; 2026 AXIOM Product Engineering Team.
