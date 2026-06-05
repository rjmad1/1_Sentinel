# Sentinel / EIIP Ecosystem: As-Is and To-Be State Matrix

This document provides a comprehensive, component-by-component view of the Enterprise Infrastructure Intelligence Platform (EIIP) / Sentinel ecosystem. It serves as a living matrix indicating what has already been built (the **As-Is** state) and what is planned for future releases (the **To-Be** state).

---

## 📊 Roadmap Overview & Version Status

The Sentinel platform is designed to evolve across five distinct phases, moving from localized single-node assessment to decentralized, autonomous fleet-wide intelligence.

| Version | Focus | Primary Technologies | Status |
| :--- | :--- | :--- | :--- |
| **V1** | Local Assessment Platform | PowerShell 7+, React (Vite SPA), JSON, HTML/MD | **Implemented** (Offline integration via JSON upload) |
| **V2** | Centralized Fleet Intelligence | FastAPI, PostgreSQL, Graph Database, React | **Planned** (To-Be) |
| **V3** | Active Operations & Remediation | FastAPI, PowerShell Execution Agent | **Planned** (To-Be) |
| **V4** | Autonomous Fleet Management | Python Daemons, Scheduled Agents, Policy Engine | **Planned** (To-Be) |
| **V5** | Generative AI Operations Core | LLM Agent Core, Retrieval-Augmented Generation (RAG) | **Planned** (To-Be) |

---

## 🛠️ Checklist Legend
* `[x]` **Built (As-Is):** Implemented in the current V1 PowerShell Collector script (`Invoke-MachineHealthAssessment.ps1`) or the React Dashboard application.
* `[ ]` **Yet to be Built (To-Be):** Planned for V2 through V5 to scale the platform.

---

## 1. System Orchestration & Environment Detection (Collector Core)
The primary runtime engine responsible for bootstrapping collectors, managing logging, and establishing environment baselines.

- [x] **Strict Parameter Validation:** Checks runtime constraints, output paths, and execution levels.
- [x] **Console Progress Indicators:** Renders real-time cmdlet progress bars to track active collector phases.
- [x] **Structured Logging Core:** Writes standardized logs with levels (`Info`, `Warn`, `Error`, `Debug`) to filesystem files.
- [x] **Environment Profiling Module:** Gathers host information (Machine Name, OS Version, Hypervisor Model, BIOS Serial).
- [x] **Graceful Non-Windows Degradation:** Intercepts execution on Linux or macOS, generating a `PLATFORM-UNSUPPORTED-001` finding.
- [x] **Deduplication Engine:** Normalizes findings, sorting by priority and filtering out redundant warning records.
- [ ] **Multi-Host Concurrent Collection:** Orchestrating multiple target agent runs simultaneously from a central controller. *(Planned V2)*
- [ ] **Self-Updating Agent Core:** Checking centralized version controls and downloading updated collector modules. *(Planned V4)*

---

## 2. Telemetry & Evidence Collectors (PowerShell Agent)
The collectors gather system-level metrics and configuration files to pass onto the assessment engines.

- [x] **OS Configuration Collector:** Retrieves Win32_OperatingSystem properties (Caption, Install Date, Boot Time).
- [x] **Processor Collector:** Queries Win32_Processor parameters and captures localized performance counter samples.
- [x] **Memory Collector:** Extracts physical and virtual memory sizes, and samples commit rates.
- [x] **Logical & Physical Disk Collector:** Evaluates logical partition sizes, free spaces, and physical device counts.
- [x] **Network Interface Collector:** Enumerates active adapters, IP bindings, gateway details, and network counters.
- [x] **Service Status Collector:** Inventories all system services, isolating automatic services that are stopped.
- [x] **Startup & Task Collector:** Lists scheduled tasks (Ready/Running) and active boot commands.
- [x] **Antivirus & Defender Status Collector:** Queries Microsoft Defender Computer Status (Real-time protection enabled, signature version).
- [x] **Firewall Profile Collector:** Audits active Domain, Private, and Public profile policies.
- [x] **BitLocker Drive Encryption Collector:** Checks protection state, mount points, and volume types.
- [x] **TPM Status Collector:** Determines hardware TPM presence and readiness.
- [x] **Local Administrators SID Resolver:** Resolves `S-1-5-32-544` member list safely, avoiding locale naming failures.
- [x] **Listening Ports Collector:** Maps active TCP sockets currently in `LISTEN` state.
- [x] **Event Log Diagnostic Collector:** Filters System and Application event logs for critical errors in the assessed window.
- [x] **Installed Software Collector:** Inventories applications by parsing 32-bit and 64-bit registry uninstall keys.
- [x] **Telemetry Completeness Validator:** Verifies collector outputs and flags incomplete or failed sweeps.
- [ ] **Custom Plugin Loader:** Loading external telemetry collection scripts dynamically from a designated folder. *(Planned V2)*
- [ ] **Direct Database Streamer:** Shipping evidence packets directly to database endpoints over TLS, bypassing local files. *(Planned V2)*

---

## 3. Analysis & Assessment Engine (Reasoning Core)
The analytical modules that evaluate gathered evidence against health benchmarks and risk criteria.

- [x] **Performance Evaluator:** Identifies disk space shortages (<15%), high CPU (>=85%), and CPU queues (>=4).
- [x] **Security Auditor:** Identifies disabled firewall profiles, disabled Defender protection, unencrypted OS volumes, missing TPM, and admin privilege sprawl (>3 local admins).
- [x] **Reliability Diagnoser:** Alerts on service drops and high error log rates (>=20 errors).
- [x] **Scalability Analyst:** Evaluates memory usage (>=90%) and low logical core counts (<=4 headroom limits).
- [x] **Serviceability & Usability Assessors:** Detects event log collection drops and high startup counts (>=15 items).
- [x] **Rule-Based Correlation Engine:** Associates Performance + Reliability issues (CORR-PR-001) and Disk Capacity + Outage Risks (CORR-STOR-001).
- [x] **Domain Health Score Calculator:** Deducts penalties from domain bases according to severity weights:
  * *Critical Findings:* -25 points
  * *High Findings:* -15 points
  * *Medium Findings:* -8 points
  * *Low Findings:* -3 points
- [x] **Weighted Health Index:** Combines domains: Performance (20%), Security (25%), Reliability (20%), Scalability (15%), Serviceability (10%), Usability (10%).
- [x] **Risk Matrix Builder:** Maps counts to Technical, Business, and Operational impacts by severity grades.
- [ ] **Cross-Host Correlation Engine:** Linking events across machines (e.g., matching a database slowdown on Server A with a network drop on Server B). *(Planned V2)*
- [ ] **Time-Series Capacity Forecasting Engine:** Calculating regression trendlines using historical metrics from centralized database storage. *(Planned V2)*
- [ ] **AI-Assisted Root Cause Diagnosis:** Applying generative model queries to correlate anomalies and propose complex causes. *(Planned V5)*

---

## 4. Reporting & Persistence Layer
Responsible for storing findings and presenting them in human-readable formats.

- [x] **JSON Data Exporter:** Outputs JSON snapshots (`EnvironmentOverview.json`, `Findings.json`, `HealthScore.json`, `RiskMatrix.json`, `CapacityForecast.json`, `RawEvidence.json`).
- [x] **CSV Exporter:** Exports spreadsheet-ready tables (`Findings.csv`).
- [x] **Markdown Document Generator:** Formats an executive summaries file (`ExecutiveSummary.md`).
- [x] **HTML Dashboard Exporter:** Generates a standalone, CSS-styled HTML page (`ExecutiveSummary.html`) with embedded status styles.
- [x] **Evidence Archive Creator:** Compresses and timestamps raw telemetry files in local output folders.
- [x] **SQLite Local Engine:** Storing assessment histories on the host machine to support local trend forecasting. *(Implemented V1)*
- [ ] **PostgreSQL Central DB Schema:** Structuring database tables for multi-node, historical inventory, and findings. *(Planned V2)*
- [ ] **Property Graph Database Integration:** Storing environment topologies in Neo4j or another graph store to traverse relationships. *(Planned V2)*
- [ ] **ITSM/SIEM Log Forwarder:** Emitting findings to central syslog receivers or webhook endpoints (Splunk, Jira, ServiceNow). *(Planned V2)*

---

## 5. React Command Center Dashboard (V1 Front-End)
The modern user interface designed to provide visual operations insight and coordinate analysis.

### Dashboard Overview Tab
- [x] **Harmonious Neon Design System:** Features a dark-mode theme utilizing glassmorphism, responsive flex layouts, and custom fonts.
- [x] **Radial Gauge scoreboards:** Renders visual health gauges for the Overall Index and individual domains.
- [x] **Environment Metadata Board:** Lists machine specifications, platform details, and execution parameters.
- [x] **Operations Action Panel:** Aggregates findings and displays Pending vs Mitigated counts.

### Findings Auditor Tab
- [x] **Multi-Filter Auditor Bar:** Searches titles/descriptions and filters findings by Domain and Severity.
- [x] **Interactive Detail Cards:** Expands cards to reveal descriptions, raw evidence JSON grids, business impacts, root causes, and recommended actions.
- [x] **Estimated Effort badges:** Shows estimated repair effort levels (Low, Medium, High).

### Risk & Remediation Tab
- [x] **Prioritized Action Plan:** Renders prioritized tasks, sorting findings by severity and impact score.
- [x] **Manual Remediation Checklists:** Employs checkboxes allowing security officers to flag resolved issues and immediately update dashboard scores.
- [ ] **Remote Remediation Trigger:** Executes fixes directly from the UI by communicating with the host. *(Planned V3)*

### Capacity Saturation Tab
- [x] **Linear Trend Chart:** Visualizes CPU, Memory, and Disk capacity growth lines with interactive tooltips.
- [x] **Saturation Timeframes:** Identifies predicted days-to-exhaustion for system resources.
- [ ] **Dynamic Database Querying:** Pulling live, database-backed capacity data instead of front-end mock matrices. *(Planned V2)*

### Infrastructure Graph (Topology Tab)
- [x] **Interactive SVG Topology Node-Map:** Renders graph nodes representing the system structure.
- [x] **Graph Node Typing:** Renders custom nodes for Machines, OS, CPU, Disk, Services, Security profiles, and Users.
- [x] **Drag-and-Drop Repositioning:** Supports node repositioning within the canvas.
- [x] **Status Glow borders:** Highlights node status (Green = Normal, Orange = Warning, Red = Error) based on findings.
- [x] **Relationship Connections:** Links nodes with arrows (HOSTS, HAS_HARDWARE, RUNS, HAS_GROUP, etc.).
- [x] **Interactive Side-Inspector:** Displays CIM property panels for the selected node.
- [ ] **Centralized Graph Store Syncing:** Syncing node movements and structures back to a central Graph Database. *(Planned V2)*
- [ ] **Multi-Machine Network Mapping:** Renders connections between multiple host machines on a unified fleet topology map. *(Planned V2)*

### Import & Log Stream Tab
- [x] **Drag-and-Drop JSON Importer:** Accepts local collector JSON reports and loads them directly into the browser memory to hydrate the UI.
- [x] **Log Stream Console:** Renders PowerShell agent console outputs in a terminal view.
- [x] **Log Filter Bar:** Categorizes output lines (All, Info, Warn, Error).
- [ ] **Real-Time WebSockets Streamer:** Streaming logs and events from running agents in real-time. *(Planned V2)*

### AI Guardian Chat Tab
- [x] **Diagnostics Chat UI:** Simulation window with timestamped message bubbles.
- [x] **Command Shortcode Parser:** Supports chat shortcuts (`/help`, `/status`, `/remediate`, `/graph`, `/clear`).
- [x] **Simulated Natural Language Matcher:** Replies automatically when keywords ("security", "space", "services") are typed.
- [ ] **True LLM Core Integration:** Connects the chat window to a central LLM agent running backend diagnostics. *(Planned V5)*

---

## 6. Remediation & Gated Active Actions (Action Layer)
The capability layer designed to transition the ecosystem from an observation engine to an active operator.

- [ ] **Remediation Script Engine:** Executing pre-approved PowerShell or Shell fixes on target host systems. *(Planned V3)*
- [ ] **Rollback Automation:** Recovering previous system state if validation checks fail post-remediation. *(Planned V3)*
- [ ] **Gated Approval Workflows:** Requiring digital signatures or manual approvals via the dashboard before executing high-impact remediations. *(Planned V3)*
- [ ] **Closed-Loop Validation Engine:** Running pre-checks, executing changes, running post-checks, and reporting success metrics. *(Planned V3)*

---

## 7. Continuous Operations & Autonomous Self-Healing (Run Loop)
The platform automation modules that run assessments continuously and trigger healing loops.

- [ ] **Continuous Scheduling Daemon:** Scheduling PowerShell assessments as background cron agents or daemons. *(Planned V4)*
- [ ] **Centralized Policy Engine:** Configuring JSON/YAML policy definitions to regulate acceptable system health scores across the fleet. *(Planned V4)*
- [ ] **Autonomous Auto-Healing loops:** Launching closed-loop remediations automatically when matching warnings are detected. *(Planned V4)*

---

## 8. Generative AI Operations Core (Cognitive Layer)
The cognitive layer that integrates AI models to help operators reason about infrastructure.

- [ ] **Property Graph RAG Core:** Allowing LLM agents to traverse the property graph database to diagnose complex infrastructure issues. *(Planned V5)*
- [ ] **Conversational Script Builder:** Translating natural language prompts into target shell scripts, subject to admin approval. *(Planned V5)*
- [ ] **Predictive Failure Analyst:** Employing machine learning models to forecast hardware failures or memory leaks before thresholds are breached. *(Planned V5)*

---

## 9. Quality Engineering, Intelligence Validation & Performance Assurance
The validation and quality assurance framework ensuring the correctness, performance, reliability, and intelligence quality of the platform.

- [ ] **PowerShell Pester Unit/Integration Suite:** Running localized unit and integration tests for collectors, deduplication, and score calculation. *(Planned V1)*
- [ ] **Playwright UI Automated Testing:** Driving the React Command Center Dashboard, verifying imports, view tabs, checklists, and manual remediations. *(Planned V1)*
- [ ] **Playwright API Contract Validation:** Running backend endpoint simulations and JSON schema structure checks. *(Planned V1)*
- [ ] **k6 Performance Saturation Testing:** Gauging dashboard load times, query response speeds, and large-dataset ingestion under load. *(Planned V1)*
- [ ] **Static Analysis & Code Quality Checks:** SonarQube-aligned linting and static analysis integrations. *(Planned V1)*
- [ ] **Synthetic Golden Dataset Engine:** Managing machine profiles (Workstations, Servers, Vulnerable systems) with pre-defined expected outputs. *(Planned V1)*
- [ ] **Intelligence Validation Assertion Core:** Performing deep comparative checks of Expected vs Actual assessments, risk matrices, and dependency graphs. *(Planned V1)*
- [ ] **Automated AI Quality Evaluator:** Generating post-release reports outlining discovery, assessment, risk, graph, and upgrade plan accuracy. *(Planned V1)*

