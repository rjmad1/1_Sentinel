# Phase 2: Centralized Fleet Ingestion & Graph Modeling (Implementation Plan)

This plan details the roadmap, architectural migration, and integration tasks to transition the Sentinel (EIIP) platform from a local-first workstation utility (Phase 1) to a centralized, fleet-capable infrastructure intelligence platform (Phase 2).

---

## 📅 Roadmap & Business Value Model

### The Business Value Matrix
To guide design decisions, we define the product capabilities alongside their technical enablers and business outcomes:

| Capability | Tech Enabler | Business Value & Outcome | Primary Metrics |
| :--- | :--- | :--- | :--- |
| **Centralized Fleet Ledger** | InsForge DB (Postgres) | Consolidate workstation/server configurations, OS states, and security posture across the organization. | **Unified Visibility**: 100% centralized tracking of machine metadata. |
| **Automated Telemetry Ingest** | FastAPI Ingress + OTel Collector | Move from manual file uploads to scheduled, automated background telemetry streaming. | **Reduced Compliance Time**: Replaces hours of manual scans with real-time audit updates. |
| **Interactive Topology Canvas** | React Flow + Graphology + JanusGraph | Visually model and query service dependencies, communication sockets, and vulnerability blast radiuses. | **Lower MTTR (Mean Time to Resolution)**: Root cause analysis resolved 50% faster via dependency tracing. |
| **Enterprise RBAC Access** | InsForge Auth (SSO) | Enforce operational separation of duties, ensuring only authorized operators and admins can trigger actions. | **Security Compliance**: ISO27001 / SOC2 auditing compliance. |
| **Dynamic Findings & Risk** | RulesEngine + Postgres Findings | Evaluate system stats against weighted rules to calculate real-time risk severity indexes. | **Proactive Security**: Instant notification of compliance and vulnerability breaches. |

---

## ⚙️ Task Execution Schedule (Predecessor-Successor)

This schedule models task execution order based on logical dependency constraints.

```
[T1: InsForge DB & Auth Setup]
            │
            ▼
[T2: JanusGraph Setup]
            │
            ▼
[T3: FastAPI Ingestion API]
            │
            ▼
[T4: RulesEngine Assessment] ──► [T5: React Flow UI Refactor]
```

### Detailed Task Specifications

#### Task 1: InsForge Database Schema & Auth Setup (ID: `T1`)
*   **Predecessor:** None.
*   **High-Level Goal:** Provision the centralized database and auth gateway.
*   **Low-Level Tasks:**
    *   Initialize InsForge CLI settings in `.insforge/project.json`.
    *   Create migrations for Postgres tables: `machines`, `os_properties`, `findings`, `domain_scores`.
    *   Enforce Row Level Security (RLS) policies using `auth.uid()` to secure tenant boundaries.
    *   Register API application credentials for collectors.
*   **Inputs:** Domain glossary specifications.
*   **Outputs:** Active PostgreSQL schemas, auth client registered.
*   **Processes:** InsForge migrations (`insforge db migrate`), CLI client registration.

#### Task 2: JanusGraph Container Provisioning (ID: `T2`)
*   **Predecessor:** `T1` (Requires PostgreSQL storage credentials).
*   **High-Level Goal:** Setup property graph database engine for dependency modeling.
*   **Low-Level Tasks:**
    *   Compose docker-compose config running JanusGraph with InsForge PostgreSQL storage backend.
    *   Deploy TinkerPop Gremlin schema definition script defining vertices (`Machine`, `Service`, `Port`) and edges (`HOSTS`, `RUNS`, `DEPENDS_ON`).
    *   Configure traversals index on `uuid`.
*   **Inputs:** Graph models from [Architecture_and_Tech_Stack.md](file:///c:/AIProjects/1_Sentinel/Phase2_Integration/Technical_Needs/Architecture_and_Tech_Stack.md).
*   **Outputs:** JanusGraph container listening on port `:8182`.
*   **Processes:** Docker container configuration, Gremlin schema compiler.

#### Task 3: FastAPI Ingestion & Graph Processor (ID: `T3`)
*   **Predecessor:** `T2` (Requires active JanusGraph).
*   **High-Level Goal:** Develop secure gateway endpoints to process telemetry.
*   **Low-Level Tasks:**
    *   Implement async routes `/api/v2/discovery/upload` and `/api/v2/evidence/upload`.
    *   Integrate JWT validating middleware mapping InsForge Auth tokens.
    *   Write a graph parser using `gremlin_python` that translates discovery JSON payloads to Gremlin upsert operations.
    *   Store relational asset metrics via `@insforge/sdk` using the array insert pattern: `insert([{...}])`.
*   **Inputs:** PowerShell collector JSON payload.
*   **Outputs:** Ingested database records, updated topology graph nodes.
*   **Processes:** FastAPI route handling, Pydantic data normalization, Gremlin transactional traversals.

#### Task 4: RulesEngine Assessment Service (ID: `T4`)
*   **Predecessor:** `T3` (Requires normalized telemetry ingest).
*   **High-Level Goal:** Assess system telemetry against JSON policies to compute health scores.
*   **Low-Level Tasks:**
    *   Wrap rules execution utilizing Microsoft RulesEngine patterns.
    *   Load active rules files dynamically from PostgreSQL.
    *   Calculate Domain Health Scores (0-100) using weighted severity deductions.
    *   Create `findings` logs and broadcast real-time event updates via InsForge Realtime.
*   **Inputs:** Normalized inventory details, JSON rule matrices.
*   **Outputs:** Active findings entries, calculated scores.
*   **Processes:** Rules checking, weighted score evaluation.

#### Task 5: Frontend Refactor & React Flow Canvas (ID: `T5`)
*   **Predecessor:** `T3`, `T4` (Requires secure backend endpoints).
*   **High-Level Goal:** Switch frontend data flow to APIs and render the network map.
*   **Low-Level Tasks:**
    *   Integrate `@insforge/sdk` auth provider wrapping the React application.
    *   Replace local Dexie IndexedDB calls in `App.tsx` with remote FastAPI endpoints.
    *   Refactor `TopologyCanvas.tsx` to mount `@xyflow/react` and `graphology`.
    *   Implement finding-based glow borders (Green, Orange, Red) around custom nodes.
*   **Inputs:** REST endpoints, `/api/v2/graph` topology response.
*   **Outputs:** Sleek, authenticated React Flow dashboard.
*   **Processes:** React Context hook bindings, React Flow node layouts, CSS custom variables.

---

## 💾 Migration Path: V1 to V2

```
┌────────────────────────────────┐       ┌────────────────────────────────┐
│      V1 Host Database          │       │      V2 Central Database       │
│  (SQLite: Local IndexedDB)     │       │     (PostgreSQL Cluster)       │
│  ┌──────────────────────────┐  │       │  ┌──────────────────────────┐  │
│  │ Local Assessment History │  │───────┼─►│ Central Machine Ledger   │  │
│  └──────────────────────────┘  │       │  └──────────────────────────┘  │
└────────────────────────────────┘       └────────────────────────────────┘
```

1.  **JSON Export:** The V1 React dashboard provides a "Download Diagnostics & Backup" feature which compiles the local Dexie IndexedDB collection into a single JSON file.
2.  **Migration Endpoint:** Expose a FastAPI endpoint `/api/v2/migrate/import` accepting V1 JSON backups.
3.  **Data Ingestion:** Parse the import file, map old tables to PostgreSQL columns, generate Machine UUIDs, and seed initial topology vertices in JanusGraph.
