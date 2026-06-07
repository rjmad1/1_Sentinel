# Understanding Your Dashboard

The EIIP Dashboard is your central control center. It translates raw technical configurations, logs, and registry entries into clean, actionable intelligence.

---

## 📈 Health Scores

At the top of the Dashboard, you are presented with the **Overall Health Score** along with seven sub-component health gauges:

```
[ Overall Health Score: 84.75 / 100 ]
  ├── ⚡ Performance Score: 85.0
  ├── 🛡️ Security Score: 72.0
  ├── 🔄 Reliability Score: 68.0
  ├── ⚖️ Scalability Score: 80.0
  ├── 🔧 Serviceability Score: 88.0
  └── ♿ Usability Score: 50.0
```

### Health Gauge Meanings
* **Overall Health Score**: An aggregated weighted index representing the general operational readiness and stability of the machine.
* **Performance**: Measures disk throughput indicators, processor speed bottlenecks, and low memory warnings.
* **Security**: Evaluates antivirus coverage, active firewall rules, BitLocker disk encryption, and local administrator account sprawl.
* **Reliability**: Monitors stopped critical services (like Print Spooler or Windows Biometric Service), driver failures, and system crash history.
* **Scalability**: Evaluates system architecture limits (e.g. x86 vs. x64 compatibility) and PowerShell runtimes.
* **Serviceability**: Determines how easily the machine can be updated and audited based on package manager coverage (Winget, Chocolatey, etc.).
* **Usability**: Flags restricted execution permissions and active user scope configurations.

---

## 🎛️ The Risk Matrix

The **Risk Matrix** maps discovered findings into a visual 5x5 quadrant system based on:
1. **Likelihood of Failure** (Very Low to Very High)
2. **Impact Severity** (Low to Critical)

`![Risk Matrix Quadrants](docs/images/screenshot_risk_matrix.png)`
*Placeholder: Screenshot of the Risk Matrix showing findings plotted across probability and severity.*

### Quadrant Interpretation Guide

| Quadrant | Priority | Description | Action Required |
| :--- | :---: | :--- | :--- |
| **Critical Risk (Red)** | **Immediate** | High likelihood of failure and critical impact (e.g., public firewall profile disabled, critical CVE exposure in Docker). | Remediate within 24 hours. |
| **High Risk (Orange)** | **High** | Medium-to-high likelihood and high impact (e.g., local administrator sprawl, outdated main Git installations). | Plan remediation in the next sprint. |
| **Medium Risk (Yellow)** | **Medium** | Low-to-medium likelihood and medium impact (e.g., non-critical stopped service, minor version updates available). | Address during routine maintenance. |
| **Low Risk (Green)** | **Low** | Minimal likelihood and low impact (e.g., standard registry configurations, minor documentation warnings). | Monitor or acknowledge. |

---

## 📋 Health Findings Overview

Directly below the health indices, the **Recent Findings** list outlines all discovered anomalies.
* **Severity Color Codes**:
  - 🔴 **Critical**: System failures or immediate security exposures.
  - 🟠 **High**: Outdated primary tools with active vulnerabilities.
  - 🟡 **Medium**: Service misconfigurations or performance warnings.
  - 🔵 **Low**: Minor version updates or optimization recommendations.
* **Filter Quick-links**: Click on the **Domain** labels (Security, Performance, Reliability, Software) to filter findings on the fly.

---

## 🕒 Historical Trends

One of the most powerful features of EIIP is its **Historical Assessment Trend Chart**. Located at the bottom of the dashboard, it queries your browser's IndexedDB to display a graph of your overall health score over time.

### Example Scenario:
1. **May 15**: First assessment run shows **62.5%** overall health due to an active Print Spooler vulnerability and disabled Defender.
2. **May 22**: Defender is re-enabled. Health score rises to **66.8%**.
3. **May 29**: Spooler service is stopped and local admin sprawl is cleaned up. Health score rises to **70.4%**.
4. **June 05**: System is fully patched. Health score rises to **84.75%**.

Hovering over any point in the history timeline displays the exact machine name, execution timestamp, and active score breakdown.

---

## 🛡️ Closed-Loop Auto-Healing

The **Auto-Healing** dashboard allows operators to define automated remediation rules for common system findings. This transitions operations from detection to autonomous recovery.

### Execution Modes
* **Autonomous**: As soon as a matching finding is ingested, the system automatically triggers remediation commands on the local daemon and reports stdout/stderr results to the database.
* **Approval Gated**: Automatically flags matching findings, but halts execution until an administrator reviews and explicitly approves the action.

### Dashboard Key Elements
1. **Policy Switchers**: Toggles individual finding IDs (e.g. `SEC-FW-001` for firewalls, `REL-SVC-001` for stopped services) between enabled/disabled and configures the execution mode.
2. **Audit Execution Logs**: Displays real-time and historical lists of all auto-remediation runs across the fleet, showing machine names, findings, status (`success`, `failed`, `running`), timestamps, and output logs.

---

## 🔍 Vulnerability & Threat Intelligence

The **Vulnerability Intel** dashboard correlates host software catalogs against known common vulnerabilities and exposures (CVEs).

### Core Features
* **Threat Intelligence Catalog**: Displays seeded CVE records (e.g. `CVE-2023-27043` for Python email address parsing, `CVE-2023-44487` for Nginx HTTP/2 Rapid Reset) with CVSS scores, threat summaries, and remediation instructions.
* **Active Vulnerabilities List**: Outlines active exposures across the fleet. Clicking on any vulnerability displays a detailed description, affected package versions, remediation guidelines, and a list of all affected hosts.
* **Mitigation Guidance**: Provides clickable navigation links to help operators resolve issues via packages upgrade or automated healing.
