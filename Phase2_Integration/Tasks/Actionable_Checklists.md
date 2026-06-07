# Phase 2: Actionable Development Checklists (InsForge Integrated)

This document provides role-based backlogs and task checklists for the development, integration, and security operations teams in Phase 2.

---

## 🎨 Frontend Team Checklist (React & React Flow)

### SSO & Session Integration
*   [x] Configure the `@insforge/sdk` client credentials mapping to the Sentinel realm.
*   [x] Implement a React authentication context provider (`AuthContext`) wrapping the application root.
*   [x] Configure Route Guards preventing unauthenticated users from accessing dashboard views.
*   [x] Extract user roles (`admin`, `operator`, `auditor`) from JWT claims and update UI permissions.

### Ingest Data Mapping
*   [x] Replace local Dexie IndexedDB calls in `src/App.tsx` and `src/utils/db.ts` with API calls referencing the FastAPI `/api/v2/` ingestion layer.
*   [x] Add an import tool allowing V1 JSON files to be uploaded to the `/api/v2/migrate/import` endpoint.

### Topology Graph Refactor
*   [x] Set up `@xyflow/react` and `graphology` packages.
*   [x] Implement custom node renderers for the defined node types (Machine, OS, Service, Database, Storage, Port).
*   [x] Apply neon-styled box shadow glows (Green, Orange, Red) around custom nodes based on finding severities.
*   [x] Create a dynamic side-inspector panel that mounts on node selection to show active properties (CIM specs, open connections).

---

## 🐍 Backend Team Checklist (FastAPI & NATS)

### API Ingress Development
*   [x] Configure FastAPI project boilerplate with asynchronous routing.
*   [x] Add JWT authentication middleware validating tokens signed by InsForge.
*   [x] Implement the `/api/v2/discovery/upload` ingestion endpoint (JSON schema validation via Pydantic).
*   [x] Implement the `/api/v2/migrate/import` endpoint for V1 JSON database seeding.

### Event Processing & Messaging
*   [x] Set up NATS connection manager with automatic reconnect logic.
*   [x] Enforce the CloudEvents 1.0 JSON specification for all outgoing backend events.
*   [x] Build NATS JetStream event publishers for `DiscoveryCompleted` actions.
*   [x] Build a background subscriber that reads incoming discovery completed events and initiates graph synthesis.

---

## 💾 Graph & Data Team Checklist (JanusGraph & PostgreSQL)

### InsForge PostgreSQL Configuration
*   [x] Write InsForge migration files to define flat schema tables (`machines`, `findings`, `domain_scores`, `remediation_plans`).
*   [x] Implement Row Level Security (RLS) policies on tables mapping permissions to user `tenant_id` claims.
*   [x] Implement database insertions using array format: `insert([{ ... }])`.

### JanusGraph & Gremlin
*   [x] Spin up JanusGraph container using InsForge's PostgreSQL as the backend storage engine.
*   *   [x] Write Gremlin schema bootstrapper defining vertex and edge labels (`HOSTS`, `RUNS`, `DEPENDS_ON`).
*   [x] Configure composite indexes on `uuid` and mixed indexes on `name` or `status` using Elasticsearch.
*   [x] Write python helper functions (`gremlin-python`) to transactionally upsert nodes and edges on telemetry ingress.

---

## 🤖 Rules & AI Team Checklist (RulesEngine & AI Gateway)

### RulesEngine Assessment
*   [x] Integrate Microsoft RulesEngine library wrapper in FastAPI.
*   [x] Store policy check configurations in PostgreSQL. Load rules dynamically during evaluation loops without restarts.
*   [x] Implement health score deduction algorithm (-25 Critical, -15 High, -8 Medium, -3 Low) based on findings, writing results to `findings` table.
*   [x] Broadcast `FindingCreated` and `HealthScoreCalculated` events via InsForge Realtime.

### AI Gateway Integration
*   [x] Connect LlamaIndex to the PostgreSQL database for historical query context.
*   [x] Configure LlamaIndex to query JanusGraph by translating user prompts to Gremlin queries.
*   [x] Route AI prompts through the InsForge AI Model Gateway.
*   [x] Enforce AI security guardrails: Ensure AI functions return structured JSON recommendations only, and have absolutely no direct execution pathways.
