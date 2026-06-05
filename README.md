# Enterprise Infrastructure Intelligence Platform (EIIP)

> **Monitoring tells you what happened. EIIP explains why it happened, what it affects, and what should happen next.**

EIIP is a modern, local-first platform designed to construct a living operational memory of your workstation or server infrastructure. It helps you discover installed software, identify outdated packages, analyze operational risks, visualize dependencies in an interactive graph, and export AI-ready review packages for reasoning workflows.

---

## 🚀 What It Does

EIIP provides immediate, deep visibility into your machines without requiring complex server infrastructure. 

With EIIP, you can:
- **Scan** hardware specifications, operating systems, running services, and security configurations.
- **Normalize** software packages discovered across multiple package managers (Winget, Chocolatey, Scoop, WSL, Docker, pip, npm, and MSI).
- **Visualize** dependencies in an interactive, draggable topology node graph.
- **Reason** about capacity limits, storage exhaustion, and reliability risks using built-in intelligence.
- **Export** an AI Review Package (`.zip`) containing structured assessment details, allowing you to prompt Claude, ChatGPT, Gemini, or local LLMs to perform automated architecture audits.

---

## ✨ Key Features

| Feature | Description | Strategic Pillar |
| :--- | :--- | :---: |
| 🛡️ **Hardware & OS Inventory** | Scans CPU cores, logical processors, memory, and BitLocker encryption status. | **Discover** |
| 📦 **Unified Software Catalog** | Normalizes software entries from 9 different ecosystems (Winget, WSL, npm, etc.). | **Discover** |
| ⏱️ **Version & Upgrade Tracking** | Highlights installed vs. latest versions, upgrade availability, and lifecycle states (EOL, Deprecated). | **Discover** / **Understand** |
| 🕸️ **Dependency Visualization** | Renders an interactive, draggable SVG topology graph showing service-to-host relationships. | **Understand** |
| 📊 **Upgrade & Uninstall Planner** | Previews dependency conflicts and runs simulated uninstalls or upgrades before execution. | **Act** |
| 🤖 **AI Review Package Export** | Package your infrastructure state into a ZIP archive optimized for LLM analysis. | **Reason** |
| 🔒 **Local-First Privacy** | 100% of data is stored in your browser's IndexedDB. Zero server-side transmissions. | **Learn** |
| ⚡ **Zero Infrastructure** | Runs as a static browser application. Just run the PowerShell collector and import the result. | **Discover** |

---

## 📸 Screenshots

To help you visualize the platform interface:

### 1. Main Dashboard & Health Score
`![EIIP Dashboard Overview](docs/images/screenshot_dashboard.png)`
*A high-level dashboard displaying your system health score, key findings, and environment overview.*

### 2. Normalized Software Catalog
`![Software Intelligence view](docs/images/screenshot_software.png)`
*The software catalog displaying version tracking, update states, and uninstallation planners.*

### 3. Interactive Topology Graph
`![Dependency Node Graph](docs/images/screenshot_graph.png)`
*Interactive, draggable SVG node graph showing package dependencies and status severities.*

---

## ⚡ Quick Start

Follow these 5 simple steps to run an assessment on your system:

### 1. Access the Application
Open the EIIP web application URL in your web browser.

### 2. Download the Collector
From the **Assessment Importer** tab, download the Collector Bundle containing the collection script:
```powershell
# Locate the collector in this repository at:
# collector/Invoke-EIIPAssessment.ps1
```

### 3. Run the Assessment Script
Open PowerShell as an Administrator and execute the script. It will scan your machine and generate a unified `Assessment.json` file on your desktop:
```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force
.\Invoke-EIIPAssessment.ps1
```

### 4. Import the Assessment File
Go back to the EIIP web application, navigate to the **Assessment Importer** tab, and drag-and-drop the generated `Assessment.json` file.

### 5. Explore Results & Export AI Packages
Review your dashboard scores, check the software intelligence table, inspect the dependency graph, and click **Export AI Review Package** to generate a ZIP package for LLM review.

---

## 🎯 Benefits

* **🛠️ AI Workstation Audits:** Instantly check if your developer machine has the necessary packages (Ollama, Python, VS Code, Git, Docker) and configuration to run agentic LLM workflows.
* **🛡️ Security & Lifecycle Management:** Spot End-of-Life (EOL) software, active CVEs, and disabled Firewalls or Antiviruses before they become vulnerabilities.
* **💾 Capacity & Trend Planning:** Predict when your storage or memory limits will be exceeded based on historical assessment runs saved locally in your IndexedDB.
* **💡 Low Overhead, High Trust:** Since no data leaves your machine, you can run audits in air-gapped or restricted enterprise environments with confidence.

---

## 🗺️ Roadmap

We are building the operational memory and reasoning system for enterprise infrastructure. Here is our product evolution timeline:

```
V1: Discover & Map  ➔  V2: Reason & Guide  ➔  V3: Predict & Scale  ➔  V4: Closed-Loop Act  ➔  V5: Autonomous AIOps
```

* **V1: Discover & Map (Current)**
  - Local PowerShell collector.
  - Interactive SVG topology graph.
  - IndexedDB storage for historical runs.
  - Software catalog normalization and AI Review Package export.
* **V2: Reason & Guide**
  - Enhanced Risk Scoring matrix.
  - Root cause hypotheses and remediation checklist integration.
  - Version upgrade validation simulations.
* **V3: Predict & Scale**
  - Disk/memory capacity forecasting charts.
  - Multi-node data aggregation (combining multiple machine JSONs).
  - Out-of-the-box support for Linux/macOS Shell collectors.
* **V4: Closed-Loop Act**
  - Automated remediation script generation (generating custom PowerShell fix scripts).
  - API integrations with Jira, ServiceNow, and internal asset databases.
  - Live package upgrade execution via Winget and Chocolatey.
* **V5: Autonomous AIOps**
  - Continuous background scanning agents.
  - Self-healing threshold remediation workflows.
  - Built-in conversational AI Copilot (running local LLMs in-browser).

---

## ❓ FAQ

### Is my data shared with external servers?
**No.** EIIP is a strictly local-first application. All files you upload, all parsed data, and all historical trends are stored directly inside your browser's IndexedDB. No telemetry or server-side storage is utilized.

### What are the prerequisites to run the assessment script?
You need a Windows machine running PowerShell 5.1 or PowerShell Core (7+). The script performs read-only queries of system registries, package managers, services, and hardware configurations.

### Can I run the collector without Administrator privileges?
Yes. The script will run under user scope. However, running as an Administrator allows it to query system-wide registry hives, BitLocker statuses, and all local user profiles, producing a more complete report.

### How do I use the exported AI Review Package?
Simply upload the exported `MachineReviewPackage.zip` file directly to a advanced LLM (like Claude 3.5 Sonnet or ChatGPT-4o) and paste one of our recommended prompts (located in the [AI Review Package Guide](docs/AIReviewPackageGuide.md)) to get an instant architecture review.

---

## 📄 License & Wiki

For full platform details, user guides, and troubleshooting steps, check out the markdown files in the [docs/](file:///c:/AIProjects/1_Sentinel/docs) folder. They are ready to be uploaded straight to your GitHub Wiki!
