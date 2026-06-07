# Sentinel (EIIP) Repository Index

## Directories & Modules

### 📁 Root Directory
- **[PROJECT.md](file:///c:/AIProjects/1_Sentinel/PROJECT.md)**: Product vision, objectives, key features, and roadmap.
- **[ARCHITECTURE.md](file:///c:/AIProjects/1_Sentinel/ARCHITECTURE.md)**: Architectural principles, bounded contexts, and approved OSS tech stack.
- **[CODING_STANDARDS.md](file:///c:/AIProjects/1_Sentinel/CODING_STANDARDS.md)**: Guidelines for writing clean, compliant TypeScript/React and InsForge backend integrations.
- **[DOMAIN_GLOSSARY.md](file:///c:/AIProjects/1_Sentinel/DOMAIN_GLOSSARY.md)**: Unified vocabulary defining domain terminology, graph nodes, and relationships.
- **[AGENTS.md](file:///c:/AIProjects/1_Sentinel/AGENTS.md)**: Specific guidelines for coding agents when working with InsForge BaaS resources.

### 📁 [src/](file:///c:/AIProjects/1_Sentinel/src) (Frontend React Application)
- **[App.tsx](file:///c:/AIProjects/1_Sentinel/src/App.tsx)**: Main application container, routing, state orchestration (IndexedDB, mock data imports, and telemetry scans).
- **[index.css](file:///c:/AIProjects/1_Sentinel/src/index.css)**: Core design system styling variables, dark mode styles, custom fonts, animations, and Tailwind configurations.
- **📁 [components/](file:///c:/AIProjects/1_Sentinel/src/components)**
  - **[TopologyCanvas.tsx](file:///c:/AIProjects/1_Sentinel/src/components/TopologyCanvas.tsx)**: SVG-based interactive, draggable node topology graph showing service dependencies.
  - **[SoftwareIntelligence.tsx](file:///c:/AIProjects/1_Sentinel/src/components/SoftwareIntelligence.tsx)**: Data tables showcasing scanned software inventory, upgrade statuses, and conflict planners.
  - **[SystemStatusPage.tsx](file:///c:/AIProjects/1_Sentinel/src/components/SystemStatusPage.tsx)**: Live CPU, memory, network, and storage details view.
  - **[ComingSoonPage.tsx](file:///c:/AIProjects/1_Sentinel/src/components/ComingSoonPage.tsx)**: Placeholder context pages for unimplemented features.
  - **[DesignSystemComponents.tsx](file:///c:/AIProjects/1_Sentinel/src/components/DesignSystemComponents.tsx)**: Unified components preview dashboard.
  - **[MarkdownRenderer.tsx](file:///c:/AIProjects/1_Sentinel/src/components/MarkdownRenderer.tsx)**: Interactive markdown rendering support for documentation guides.
- **📁 [utils/](file:///c:/AIProjects/1_Sentinel/src/utils)**
  - **[assessmentEngine.js](file:///c:/AIProjects/1_Sentinel/src/utils/assessmentEngine.js)**: Health assessment, finding generator, and version validation logic.
  - **[db.ts](file:///c:/AIProjects/1_Sentinel/src/utils/db.ts)**: Local IndexedDB connector used to store assessment history and findings locally.
  - **[docsRegistry.ts](file:///c:/AIProjects/1_Sentinel/src/utils/docsRegistry.ts)**: Local index linking help files.
  - **[mockData.ts](file:///c:/AIProjects/1_Sentinel/src/utils/mockData.ts)** / **[softwareMockData.ts](file:///c:/AIProjects/1_Sentinel/src/utils/softwareMockData.ts)**: Stub datasets for workstation profiles.

### 📁 [src-tauri/](file:///c:/AIProjects/1_Sentinel/src-tauri) (Tauri Desktop Shell)
- Rust source files and configuration enabling local native scan execution and native operating system capability.

### 📁 [collector/](file:///c:/AIProjects/1_Sentinel/collector) (Agent Collector Services)
- **📁 [daemon/](file:///c:/AIProjects/1_Sentinel/collector/daemon)**: Native platform background services (Node.js script, systemd configurations, launchagent scripts, Windows service installation script).
- **📁 [lib/](file:///c:/AIProjects/1_Sentinel/collector/lib)**: Database engine binaries enabling local SQLite configuration parsing.

### 📁 [Requirements/](file:///c:/AIProjects/1_Sentinel/Requirements) (Phase 1 Baseline Specs)
- **[Invoke-MachineHealthAssessment.ps1](file:///c:/AIProjects/1_Sentinel/Requirements/Invoke-MachineHealthAssessment.ps1)**: Telemetry scan collector PowerShell script that gathers machine inventory.

### 📁 [Phase2_Integration/](file:///c:/AIProjects/1_Sentinel/Phase2_Integration) (Phase 2 Enterprise Specs)
- Integration blueprints, bounded contexts, event contracts, NATS and JanusGraph configuration plans, and actionable work checklists.

### 📁 [docs/](file:///c:/AIProjects/1_Sentinel/docs) (Documentation Wiki)
- Markdown files housing user guides, releasing guides, dashboards walkthroughs, and troubleshooting advice.

### 📁 [tests/](file:///c:/AIProjects/1_Sentinel/tests) (Test Suites)
- Unit, integration, golden datasets, intelligence, and contract validation suites.
