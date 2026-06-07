# Troubleshooting Guide

This guide provides step-by-step troubleshooting steps for common issues encountered while running the collector script, importing assessments, or exporting packages.

---

## 🛠️ Local Daemon & Tauri Live Scan Problems

### 1. Connection Refused / Daemon Offline
* **Symptom**: The UI modal shows "Sentinel Local Collector Offline" or "Daemon Connection Refused".
* **Resolution**: 
  - Verify that the background daemon service is running on your host machine:
    ```powershell
    # Windows Service Status
    Get-Service -Name SentinelDaemon
    ```
  - If the daemon is not installed, install and register the Sentinel background service on your endpoint.
  - Check if port `1337` is occupied by another application on your system.

### 2. Administrator Elevation / Permissions
* **Symptom**: The daemon is connected but fails to query firewall profile settings or BitLocker statuses.
* **Resolution**:
  - The daemon runs background queries to check security posture. Ensure the background daemon process is running with Administrator / Local System privileges.

---

## 📁 Assessment Import Problems

### 1. File Parsing Errors / Invalid JSON
* **Symptom**: Importing `Assessment.json` fails with an error:
  `Failed to parse file: Invalid format.`
* **Resolution**:
  - Open the file in a text editor (e.g. Notepad) and verify it starts with `{` and ends with `}`.
  - If the export was interrupted or modified, the JSON structure will be truncated. Re-run the live scan and export again.

### 2. Schema Drift
* **Symptom**: The file uploads, but no findings appear, or gauges remain at 0.
* **Resolution**:
  - Ensure the imported file conforms to the unified V1 schema containing at least the `Machine` and `RawEvidence` keys.

---

## 💾 Browser Storage & Performance Issues

### 1. IndexedDB Disk Space Warning
* **Symptom**: The browser warns that storage quotas are exceeded, or historical assessments are deleted after closing the tab.
* **Resolution**:
  - **In Private Browsing / Incognito**: Browsers automatically delete IndexedDB storage when an incognito tab is closed. Run EIIP in a normal browser tab to preserve assessment history.
  - **Storage Permissions**: Go to your browser settings, navigate to Site Permissions -> Storage, search for the EIIP URL, and check that it is allowed to store offline data.
  - **Clear Old History**: If storage size grows too large (e.g. after hundreds of scans containing large logs), clear your local database using the clear options in your browser settings.

### 2. Lag during Topology Graph Rendering
* **Symptom**: Draggable nodes stutter or the interface lags on older hardware.
* **Resolution**:
  - Keep the tab focused. Backgrounding tabs can cause CPU throttling.
  - Keep the number of active nodes reasonable. The graph focuses on the critical 15 system nodes and normalized catalog packages.

---

## 📤 Export Problems

### 1. ZIP Archive Generation Fails
* **Symptom**: Clicking "Export AI Review Package" fails or does not trigger a download.
* **Resolution**:
  - The ZIP exporter runs completely client-side in Javascript using JSZip. Verify that pop-ups and automatic downloads are not blocked by your browser for the EIIP application domain.
  - Check the console logs. If a custom JSON file was imported with missing mandatory properties (like `envData.ComputerName`), the script might fail during file creation. Verify your Assessment JSON has correct properties.
