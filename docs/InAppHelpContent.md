# In-App Help Content

This document outlines the contextual help content designed to be embedded directly inside the EIIP user interface as tooltips, helper panels, or documentation sidebars.

---

## 🎛️ 1. Dashboard Contextual Help

* **Purpose**: Provides a high-level operational overview of the workstation or server environment, translating technical findings into an aggregated health index score and visual risk matrix.
* **Benefits**: 
  - Immediate understanding of system status without looking through hundreds of raw log lines.
  - Prioritized view of issues sorted by risk severity and occurrence probability.
  - Tracking of historical improvements over multiple scans.
* **Common Workflows**:
  1. Open the dashboard to check the **Overall Health Score**.
  2. Locate any critical items mapped to the top-right quadrant of the **Risk Matrix** (Red Zone).
  3. Review the **Recent Findings** list to identify which specific component is dragging down your scores.

---

## 📦 2. Software Inventory Contextual Help

* **Purpose**: Serves as a unified software catalog that pulls, normalizes, and categorizes installed software across all active package managers (such as Winget, Chocolatey, Scoop, WSL, Docker, pip, and npm).
* **Benefits**:
  - Eliminates version drift and duplicate entries.
  - Flags deprecated, unsupported, or End-of-Life (EOL) versions.
  - Provides risk indicators showing active CVEs for vulnerable packages.
* **Common Workflows**:
  1. Use the search bar to find a specific library or package.
  2. Filter the catalog by **Update Available** or **Security Risk** to isolate vulnerable programs.
  3. Expand a package drawer to inspect its installation path, size, and vendor.
  4. Run a simulated single or bulk upgrade to see how it improves the system health score.

---

## 🕸️ 3. Graph View Contextual Help

* **Purpose**: Renders an interactive, draggable topological graph mapping out relationships between hardware components, operating system configurations, services, security profiles, and software catalogs.
* **Benefits**:
  - Visualizes dependencies so you can see how components affect one another.
  - Highlights unhealthy nodes using red or orange border rings.
  - Prevents breaking dependent toolchains during software removals.
* **Common Workflows**:
  1. Inspect node outlines: green is normal, orange is warning, and red indicates an error condition.
  2. Drag nodes to clean up overlapping lines.
  3. Click a node (e.g. `defender` or `local_admins`) to open its configuration details card in the inspector panel.

---

## 📤 4. Export Center Contextual Help

* **Purpose**: Packages all raw evidence, normalized catalog JSONs, dependency models, and markdown summaries into a standardized ZIP file format.
* **Benefits**:
  - Allows easy transfer of system reports.
  - Ensures no raw data is sent over the network, maintaining 100% security privacy.
  - Prepares the infrastructure state in a format designed for LLM consumption.
* **Common Workflows**:
  1. Verify your active assessment details are correct.
  2. Navigate to the export pane.
  3. Download the zipped package to your local drive for archiving or sharing.

---

## 🤖 5. AI Review Package Contextual Help

* **Purpose**: Specifically compiles and formats your infrastructure state into an **AI Review Package** optimized for Large Language Model processing.
* **Benefits**:
  - Enables advanced automated audits, upgrade planners, and security hardening recommendations.
  - Saves hours of manual technical writing by letting the AI draft step-by-step shell scripts.
  - Fully compatible with cloud LLMs (Claude, ChatGPT) and local LLMs (Ollama).
* **Common Workflows**:
  1. Click **Export AI Review Package** on the AI panel.
  2. Upload the downloaded `MachineReviewPackage.zip` directly to Claude or ChatGPT.
  3. Run one of the pre-written audit prompts (found in the [AI Review Package Guide](AIReviewPackageGuide.md)) to get immediate recommendations.

---

## 📥 6. Assessment Import Contextual Help

* **Purpose**: Serves as the landing gate for loading raw system logs or consolidated `Assessment.json` files.
* **Benefits**:
  - Static execution ensures your data is loaded offline inside your browser sandbox.
  - Instant loading and persistence into your IndexedDB cache.
  - Automatically seeds baseline history runs on first load.
* **Common Workflows**:
  1. Trigger a zero-friction **Live Scan** directly from the dashboard header modal (via Tauri or background daemon).
  2. Alternatively, drag-and-drop a previously exported `Assessment.json` file into this upload area to populate the Dashboard.
