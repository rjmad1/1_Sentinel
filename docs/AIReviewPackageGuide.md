# AI Review Package Guide

This guide explains how to export, inspect, and upload an **AI Review Package** to Large Language Models (LLMs) to perform automated architecture audits, workstation readiness checks, and security reviews.

---

## 🤖 What is an AI Review Package?

The **AI Review Package** is a consolidated ZIP archive containing the structural state of your scanned infrastructure. Instead of copy-pasting raw command line outputs, EIIP bundles your configuration into a package structured for LLMs.

### Package File Manifest
When you click **Export AI Review Package** on the **AI Chat Guardian** panel, EIIP generates a file named `MachineReviewPackage.zip` containing:

| Filename | Format | Purpose |
| :--- | :--- | :--- |
| `Assessment.json` | JSON | Complete system snapshot (Hardware, OS, Findings, Risks, Forecats). |
| `Assets.json` | JSON | Consolidated hardware specifications (CPU, Memory, Storage). |
| `SoftwareCatalog.json` | JSON | Normalized software package catalog listing versions and risk CVEs. |
| `DependencyGraph.json` | JSON | Topological representation of nodes and relationships. |
| `AssessmentSummary.md` | Markdown | Summarized system health overview and prioritized findings. |
| `ExecutiveSummary.md` | Markdown | High-level summary of recommendations for managers. |

---

## 🚀 How to Generate & Import the Package

```
[ EIIP App ] ➔ Click "Export AI Review Package" ➔ Download ZIP ➔ Upload ZIP to Claude / ChatGPT / Gemini
```

1. Navigate to the **AI Chat Guardian** tab in the EIIP web application.
2. Select the **AI Review Package** panel and click the **Export AI Review Package** button.
3. The browser will generate and download `MachineReviewPackage.zip`.
4. Open your preferred AI assistant (Claude, ChatGPT, Gemini Advanced, or a local interface running Ollama).
5. Drag-and-drop the ZIP file into the AI's chat box.
6. Copy and paste one of the prompt templates below.

---

## 📋 Copy-Paste Prompt Templates

Choose the prompt that matches your objective:

### 1. General Infrastructure Review (Claude / ChatGPT / Gemini)
```text
I have attached a ZIP file containing the infrastructure snapshot of my workstation/server.
Please review the files (AssessmentSummary.md, SoftwareCatalog.json, and DependencyGraph.json) and provide:
1. A concise summary of the overall machine health.
2. The top 3 security risks I should address immediately.
3. A step-by-step remediation plan with target commands.
Keep the advice clear and actionable.
```

### 2. Local LLMs (Ollama with Llama-3 or Qwen)
For local LLMs without ZIP parsing capabilities, unzip the package and copy-paste the text of `AssessmentSummary.md` directly:
```text
Here is the Assessment Summary for my machine:
[Paste contents of AssessmentSummary.md here]

Evaluate this report and suggest:
- Which service configurations look problematic?
- What command-line tools can I run to verify these recommendations?
```

---

## 🎯 Example Walkthrough Use Cases

### Use Case 1: AI Development Workstation Review
* **Goal**: Determine if the machine can support running local agentic workflows (Ollama, Open WebUI, VS Code, PostgreSQL, Qdrant, and Python virtual environments).
* **Step-by-Step Walkthrough**:
  1. Open the EIIP collector script and execute it to scan your developer workstation.
  2. Upload `MachineReviewPackage.zip` to Claude and paste this prompt:
     ```text
     I want to determine if this machine can support running a local AI Development stack containing:
     - Ollama (running local LLMs)
     - Open WebUI (frontend interface)
     - VS Code (IDE)
     - PostgreSQL & Qdrant (for Vector database storage)
     - Agentic coding workflows.

     Based on the attached Assets.json and SoftwareCatalog.json, evaluate:
     1. Hardware Readiness: Does the CPU cores count, RAM size, and free disk space meet requirements?
     2. Software Readiness: Are Python, Node.js, and Docker installed and at compatible versions?
     3. What conflicts or performance bottlenecks do you predict based on the active findings?
     ```
  3. **Expected Outcome**: The AI will analyze the CPU/RAM limits, warning you if your free space is too low to store large model weights (e.g. Llama-3 8B requires ~5GB), and check if Docker is installed to host Qdrant.

---

### Use Case 2: Software Upgrade Planning
* **Goal**: Identify outdated software and generate a clean upgrade plan.
* **Step-by-Step Walkthrough**:
  1. Export the AI Review Package.
  2. Upload the ZIP to ChatGPT and paste this prompt:
     ```text
     Review the attached SoftwareCatalog.json. Identify all packages that are marked as having an upgrade available or are nearing End-of-Life (EOL).
     Create a clean markdown table showing:
     - Package Name
     - Current Version
     - Latest Version
     - Primary installation source (e.g., Winget, Chocolatey)
     - The exact silent upgrade command line to patch it.
     ```
  3. **Expected Outcome**: The AI parses the catalog and returns a table containing commands like `winget upgrade --id Python.Python` and `choco upgrade git`, ordered by priority.

---

### Use Case 3: Architecture Review
* **Goal**: Review the machine's topological structure and secure running services.
* **Step-by-Step Walkthrough**:
  1. Export the AI Review Package.
  2. Upload the ZIP to Gemini and paste this prompt:
     ```text
     Analyze the attached DependencyGraph.json. Note the relationships between the Host Machine, OS, running services, and security profiles.
     1. Evaluate the security posture (check Defender and Firewall state).
     2. Identify unnecessary services running (such as Spooler) that could represent security vectors.
     3. Provide suggestions to harden the operating system baseline.
     ```
  3. **Expected Outcome**: Gemini flags that the Print Spooler is running and the public firewall profile is disabled, providing commands like `Stop-Service Spooler -Force` and `Set-NetFirewallProfile -Profile Public -Enabled True`.
