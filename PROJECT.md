# Sentinel (EIIP) Project Memory

## Executive Summary
The Enterprise Infrastructure Intelligence Platform (EIIP) / Sentinel is a fleet-capable infrastructure intelligence system designed to discover, model, assess, correlate, predict, remediate, validate, and learn from enterprise computing environments. 

## Strategic Objectives (Discovery to AIOps)
- **Discover**: Understand what exists (hardware specifications, operating systems, running services, and security configurations).
- **Model**: Understand how components relate via an interactive, draggable topology node graph.
- **Assess**: Evaluate operational health using multi-ecosystem package trackers (Winget, Chocolatey, Scoop, WSL, Docker, pip, npm, and MSI).
- **Correlate**: Identify root causes of failures.
- **Predict**: Forecast future constraints and failures.
- **Remediate**: Recommend and execute corrective actions (approval-gated).
- **Validate**: Verify outcomes.
- **Learn**: Build institutional knowledge from historical operations.

## Key Features
- **Hardware & OS Inventory**: Scans CPU cores, logical processors, memory, and BitLocker encryption status.
- **Unified Software Catalog**: Normalizes software entries from 9 different ecosystems (Winget, WSL, npm, etc.).
- **Version & Upgrade Tracking**: Highlights installed vs. latest versions, upgrade availability, and lifecycle states (EOL, Deprecated).
- **Dependency Visualization**: Renders an interactive, draggable SVG topology graph showing service-to-host relationships.
- **Upgrade & Uninstall Planner**: Previews dependency conflicts and runs simulated uninstalls or upgrades before execution.
- **AI Review Package Export**: Package your infrastructure state into a ZIP archive optimized for LLM analysis.
- **Local-First Privacy**: 100% of data is stored in your browser's IndexedDB. Zero server-side transmissions.
- **Zero Infrastructure**: Runs as a static browser application. Just run the PowerShell collector and import the result.

## Roadmap
1. **V1: Discover & Map [COMPLETE]**: Local PowerShell collector, interactive SVG topology graph, IndexedDB, software catalog normalization, AI Review Package export.
2. **V2: Reason & Guide [COMPLETE]**: Enhanced Risk Scoring matrix, root cause hypotheses and remediation checklist, version upgrade validation simulations.
3. **V3: Predict & Scale [COMPLETE]**: Disk/memory capacity forecasting charts, multi-node data aggregation, Linux/macOS Shell collectors support.
4. **V4: Closed-Loop Act [COMPLETE]**: Closed-loop self-healing policies, auto-remediation logs, API integrations, and vulnerability threat intelligence correlation.
5. **V5: Autonomous AIOps [PLANNED]**: Continuous background scanning agents, self-healing thresholds, in-browser local conversational AI Copilot.
