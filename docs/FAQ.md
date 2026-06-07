# Frequently Asked Questions (FAQ)

This FAQ contains 30 beginner-friendly questions and answers categorized by topic to help you understand and troubleshoot the Enterprise Infrastructure Intelligence Platform (EIIP).

---

## 🏁 Installation & Setup

### Q1: Do I need to install a database on my server to run EIIP?
No. EIIP requires no server-side databases. It uses your web browser's built-in IndexedDB engine to store all data locally on your machine.

### Q2: What web browsers are supported?
EIIP supports all modern, standard-compliant browsers including Google Chrome, Mozilla Firefox, Microsoft Edge, and Apple Safari.

### Q3: Does the application run offline?
Yes. Once you load the static assets in your browser, the application runs entirely offline. You can import files, view graphs, and manage history without an active internet connection.

### Q4: Can I run EIIP on a Linux or macOS machine?
The web interface and frontend rules engine run on any operating system. The telemetry gathering collectors (Tauri and daemon) currently support Windows, with native macOS/Linux collectors planned for V3.

### Q5: Is there a command-line interface for the UI?
No. The user interface is entirely web-based or Tauri desktop-based for easy accessibility, but the background daemon operates as a local HTTP service.

---

## ⚡ Collector & Assessments

### Q6: What does the collector script actually do?
The script performs read-only checks of system hardware specifications, OS configuration files, running services, local administrator groups, and package managers (Winget, Chocolatey, Scoop, WSL, Docker, npm, and pip).

### Q7: Does the collector script make modifications to my operating system?
No. The collector script is strictly read-only. It gathers information and outputs it to a JSON file. It makes no configuration adjustments, install updates, or security changes.

### Q8: How long does the collection script take to run?
Typically under 2 minutes. On systems with massive software catalogs or nested Docker containers, it can take up to 5 minutes.

### Q9: Can I run the collector on multiple servers and combine them?
The V1 UI is designed to import and display results for a single machine at a time. The ability to aggregate and toggle between multiple machine profiles is scheduled for our V3 release.

### Q10: How do I schedule assessments to run automatically?
The background daemon service automatically monitors host status and updates findings. You can configure scan intervals directly in the daemon configuration file or service settings.

---

## 🛡️ Security & Compliance

### Q11: Why is my antivirus flagging the collector script?
PowerShell scripts downloaded from the internet are sometimes flagged by antivirus heuristics due to execution policy protections. The script code is human-readable; you can open it in a text editor (like Notepad) to verify its safety before execution.

### Q12: Why does the dashboard check BitLocker status?
BitLocker status is evaluated as part of the **Security Health Score**. Unencrypted physical disks represent a compliance vulnerability for enterprise workstations.

### Q13: Does EIIP evaluate active CVE vulnerability databases?
Yes. The software catalog checks packages against a localized reference list of common vulnerabilities (CVEs) and warns you about critical risk exposures.

### Q14: How does EIIP calculate the Risk Score?
The risk scoring system rates findings based on a matrix of **Impact Severity** (Low to Critical) and **Likelihood of Failure** (Very Low to Very High).

### Q15: What is privilege sprawl and how does EIIP flag it?
Privilege sprawl occurs when too many individual accounts belong to the local **Administrators** group. EIIP flags this finding if it detects more than 3 accounts in the administrator group.

---

## 📦 Software Inventory & Normalization

### Q16: What does "Normalized Software" mean?
Different package managers label the same software differently (e.g. "python3", "python-3.11", "Python PSF"). EIIP groups these matching instances under a single normalized name (e.g. "Python") for clean lifecycle tracking.

### Q17: Can EIIP track software installed through pip or npm?
Yes. The collector sweeps globally installed npm modules and standard Python environments to map software assets.

### Q18: What is the difference between User Scope and Machine Scope?
* **User Scope**: Software installed only for the active user profile (e.g., via Scoop or local AppData).
* **Machine Scope**: Software installed system-wide for all users (e.g., standard Program Files installations).

### Q19: What is End-of-Life (EOL) software?
EOL software is no longer supported by the vendor, meaning it will not receive stability updates or security patches. EIIP flags EOL software in red.

### Q20: How do the simulated upgrades work?
The **Upgrade Planner** simulates upgrading packages in-memory, updating version counts and recalculating your system health score so you can see the impact before touching live servers.

---

## 🤖 AI Review Packages

### Q21: What is an AI Review Package?
It is a `.zip` file generated by EIIP containing structured JSON data and Markdown summaries of your machine configuration, structured specifically to be parsed by Large Language Models.

### Q22: Is it safe to upload my review package to public LLMs?
If you use public LLMs, ensure you do not have proprietary corporate hostnames. For commercial environments, we recommend using an **Enterprise LLM account** (which guarantees that data is not used for model training) or a **Local LLM** (e.g. running Ollama).

### Q23: Which AI model works best for analyzing these packages?
Advanced reasoning models with file-upload capabilities (such as Claude 3.5 Sonnet and ChatGPT-4o) produce the most accurate architecture and security reviews.

### Q24: How do I use the package with local LLMs?
Unzip the package and copy-paste the text of `AssessmentSummary.md` directly into your local LLM interface (like Ollama or Open WebUI).

### Q25: Can the AI write cleanup scripts for me?
Yes. If you ask the AI to generate a remediation script based on your uploaded package, it will output custom PowerShell or Bash scripts tailored to your findings.

---

## 🔒 Privacy & Local Storage

### Q26: Where is my data saved when I import an assessment?
It is saved in your web browser's private **IndexedDB** database on your local hard drive.

### Q27: Does EIIP send telemetry or metrics back to the developers?
No. There is zero telemetry. The application is entirely local-first. We do not track page views, uploads, or assessment scores.

### Q28: How do I backup or export my assessment history?
Since the history is stored in browser storage, you can download a backup by exporting individual assessments as JSON from the importer view.

### Q29: Will clearing my browser cache delete my history?
Yes. If you choose to clear "Site Data" or "Offline Website Data" in your browser settings, the IndexedDB database will be reset. We recommend saving copies of your `Assessment.json` files on your local drive for archiving.

### Q30: What is your future roadmap?
We are actively evolving toward automated remediations (V4) and autonomous background agent operations (V5). Check out the [README.md](../README.md#roadmap) for full details.
