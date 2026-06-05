# Software Intelligence Guide

The **Software Intelligence** module is a core engine of EIIP. It automatically consolidates, normalizes, and audits software packages installed across multiple distinct package managers and registries.

---

## 📦 What is Normalized Software?

On a single machine, developers and engineers install software using multiple utilities. This leads to configuration drift. 

EIIP automatically sweeps **9 different discovery sources**:

| Source | Description | Scope Level |
| :--- | :--- | :--- |
| **Winget** | Official Windows Package Manager | Machine-Wide or User |
| **Chocolatey** | Popular Windows developer packages | Machine-Wide |
| **Scoop** | Command-line installer for Windows developer tools | Current User |
| **WSL** | Software running inside Windows Subsystem for Linux | User Environment |
| **Docker** | Active containers and images | Container Isolation |
| **pip** | Python package registry | User / Virtualenv |
| **npm** | Node.js global modules | User / Global |
| **Store** | Microsoft Store Apps | User Account |
| **MSI / Registry** | Direct system installers (Add/Remove Programs) | System Component |

EIIP groups identical software found across different sources into a single **Normalized Package**, listing each location as an **Instance**.

---

## 🔍 Search, Sort, Filter, and Group

The toolbar allows you to slice and dice your software inventory to isolate risks.

`![Software Catalog Toolbar](docs/images/screenshot_software_toolbar.png)`
*Placeholder: Screenshot of the Software Intelligence filtering toolbar.*

### 1. Advanced Search
* **Search Fields**: Narrow your search to *All Fields*, *Name Only*, *Vendor*, *Publisher*, or *Install Path*.
* **Search Modes**:
  - `Contains`: Standard substring match (e.g., searching "git" matches "Git" and "Github CLI").
  - `Starts With`: Match names beginning with the query.
  - `Exact`: Exact match (case insensitive).
  - `Regex`: Full regular expression matching (e.g., `^python-3\..*`).

### 2. Status Filters
* **Update State**: Filter by *Up-To-Date*, *Update Available*, *Unsupported*, *Deprecated*, or *End-of-Life (EOL)*.
* **Security Risk**: Filter by CVE ratings (*Critical*, *High*, *Medium*, *None*).
* **Scope**: Filter by *Current User* (installed only for your login), *Machine-Wide* (installed for all users), or *System Component*.
* **Source Agent**: Isolate packages discovered by a specific engine (e.g., only Docker or pip).

### 3. Grouping Systems
* **By Vendor**: Groups packages under Microsoft, Oracle, Python Software Foundation, F5 Inc., etc.
* **By Source**: Groups by the primary package manager.
* **By Scope**: Groups user-specific vs. system-wide software.
* **By Status**: Groups by lifecycle health state.

---

## 🛠️ Operational Planners

Rather than just listing outdated software, EIIP includes **interactive action planners** to simulate changes and output shell commands.

### 1. Single Package Upgrade
When a package has `Update Available` status, click the **Wrench** icon in the catalog.
* **Console Logs Output**: Previews the update command-line action:
  - Example: `winget upgrade --id Git.Git --silent`
* **Health Impact**: Completing the upgrade updates the local packages database and boosts the Overall Health Score by **+2.5 points**.

### 2. Bulk Upgrades
Select multiple packages using checkboxes at the left of the table.
* **Bulk Upgrade Action**: Click **Upgrade Selected** in the blue actions header.
* **Health Impact**: Simulates concurrent upgrades and boosts overall health by **+2.0 points per package**.

### 3. Dependency Conflict Uninstaller
Click the **Trash** icon to remove a package. Before execution, the uninstaller automatically checks for dependency conflicts.
* **Conflict Warning Example**:
  If you attempt to uninstall **Python**, the planner scans other packages and blocks with a warning:
  > **[Warning] Python is required by: Poetry (Python), JupyterLab (Python).**
  Users must confirm if they want to force-remove dependents or cancel the uninstallation.
