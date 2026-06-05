# Privacy and Security Guide

Enterprise Infrastructure Intelligence Platform (EIIP) is built from the ground up on a **local-first privacy architecture**. We believe that infrastructure audit logs and configuration details are sensitive intellectual assets.

This document outlines how EIIP manages data security to establish trust.

---

## 🔒 The Local-First Architecture

Unlike traditional cloud-hosted SaaS tools that require sending infrastructure configurations, software catalogs, and CVE logs to external remote servers, EIIP operates entirely within your browser sandboxed environment.

```
[ PowerShell Scan ] ➔ Local File (Assessment.json) ➔ [ Browser UI ] ➔ Offline Browser IndexedDB (Local Disk)
                                                                 ▲
                                                                 └── Zero Network Outbound Transmissions
```

### 1. In-Browser Parsing
When you drag-and-drop your `Assessment.json` or `SoftwareCatalog.json` files into the Importer, the parsing engine runs client-side inside the browser. No upload request is sent to a server.

### 2. IndexedDB Persistence
All historical runs, trends, findings states, and completed remediations are saved using the browser's native **IndexedDB** engine.
- This database resides on your local physical disk under your browser's secure data directory.
- It is isolated from other websites using the browser's **Same-Origin Policy**. Other domains cannot inspect or retrieve your assessment history.

### 3. Static Hosting
The EIIP application is distributed as a static bundle of HTML, CSS, and Javascript. Once the web resources are loaded, the page does not make any background API calls or upload payloads.

---

## 🔍 Data Classification Sheet

Here is an audit of what data leaves your machine:

| Data Type | Stored Locally? | Transmitted to EIIP Servers? | Description / Verification |
| :--- | :---: | :---: | :--- |
| **Hostname & Computer Specs** | **Yes** (IndexedDB) | **No** | Stays locally in browser storage. |
| **Installed Applications & Versions**| **Yes** (IndexedDB) | **No** | Stays locally in browser storage. |
| **Disk Sizes & Utilization** | **Yes** (IndexedDB) | **No** | Stays locally in browser storage. |
| **Firewall & Security Statuses** | **Yes** (IndexedDB) | **No** | Stays locally in browser storage. |
| **AI Review Packages (ZIP)** | **Yes** (Local Download)| **No** | Exists as a local ZIP file on your machine. |
| **Diagnostic Logs & Service Logs** | **Yes** (IndexedDB) | **No** | Stays locally in browser storage. |

---

## 🛡️ AI Review Package Privacy

When generating an **AI Review Package** (`MachineReviewPackage.zip`):
* **You are in Control**: The ZIP is generated entirely locally. You can inspect its contents (using WinZip, 7-Zip, or a text editor) before uploading it to any LLM.
* **LLM Data Policies**: When uploading the ZIP package to Claude, ChatGPT, or Gemini, your data is governed by the specific privacy policy of the AI provider.
  - *Enterprise Tip*: If you are working in a highly sensitive corporate environment, utilize an **Enterprise AI subscription** (which prevents models from training on your uploaded data) or process the files locally using **Local LLMs** (via Ollama or Llama.cpp) on an air-gapped machine.
