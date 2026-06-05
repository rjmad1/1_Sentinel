# Troubleshooting Guide

This guide provides step-by-step troubleshooting steps for common issues encountered while running the collector script, importing assessments, or exporting packages.

---

## 🛠️ Collector Execution Problems

### 1. Script is Blocked by Execution Policy
* **Symptom**: When trying to run `Invoke-EIIPAssessment.ps1`, PowerShell returns:
  `File ... cannot be loaded because running scripts is disabled on this system.`
* **Resolution**: 
  Windows blocks script execution by default. Run the script with a bypass parameter scoped only to the active command line session:
  ```powershell
  Set-ExecutionPolicy Bypass -Scope Process -Force
  .\Invoke-EIIPAssessment.ps1
  ```
  Alternatively, if you are in a highly restricted active directory environment, run the script from inside a bypass scope shell:
  ```powershell
  powershell.exe -ExecutionPolicy Bypass -File .\Invoke-EIIPAssessment.ps1
  ```

### 2. Administrator Elevation Errors
* **Symptom**: The collector warns that the script is running with restricted user privileges.
* **Resolution**: 
  While the script runs under standard user scope, it will miss machine-wide registries, security BitLocker states, and certain services. Close your PowerShell terminal, right-click the PowerShell application icon, select **Run as Administrator**, and re-execute.

---

## 📁 Assessment Import Problems

### 1. File Parsing Errors / Invalid JSON
* **Symptom**: Importing `Assessment.json` fails with an error:
  `Failed to parse file: Invalid format.`
* **Resolution**:
  - Open the file in a text editor (e.g. Notepad) and verify it starts with `{` and ends with `}`.
  - If the script was interrupted before completing, the JSON structure will be truncated. Re-run the PowerShell collector and wait for the "Scan complete" message on the CLI before transferring the file.

### 2. Schema Drift / Older Collector Version
* **Symptom**: The file uploads, but no findings appear, or gauges remain at 0.
* **Resolution**:
  Ensure you are using the correct collector script version matching the UI. From the **Assessment Importer** tab, download the latest version of the script:
  `Invoke-EIIPAssessment.ps1`

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
