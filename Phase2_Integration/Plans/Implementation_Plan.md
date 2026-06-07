# Phase 2-5 Implementation & Integration Plan

This document details the step-by-step roadmap, migration strategy, and development phases to transition the platform from local assessment to autonomous enterprise-grade operation.

---

## 📅 Roadmap Overview

```
 V1: Local Scan ──► V2: Centralized Ingestion ──► V3: Gated Active Remediation ──► V4: Auto-Healing ──► V5: Cognitive AI
 (Implemented)      (Core Platform Ingress)       (Orchestration & Validation)     (Policy Engine)      (Graph RAG Copilot)
```

---

## Phase 2: Centralized Ingestion & Graph Modeling (V2)
The objective of this phase is to move from manual files to a centralized database and real-time graph visualization.

### Step 1: Base Platform & Ingestion Setup
*   **Infrastructure:** Deploy PostgreSQL and NATS Server using Docker Compose or Kubernetes manifests.
*   **API Layer:** Build FastAPI endpoints `/api/v2/discovery/upload` and `/api/v2/evidence/upload` to receive telemetry from collectors.
*   **Telemetry Pipeline:** Configure OpenTelemetry Collector to receive, filter, and log agent payloads.

### Step 2: JanusGraph Integration & Schema Definition
*   **Database Setup:** Spin up JanusGraph with a PostgreSQL storage backend and Elasticsearch index backend.
*   **Schema Provisioning:** Define vertex labels (`Machine`, `OS`, `Port`, `Finding`, etc.) and edge labels (`HOSTS`, `DEPENDS_ON`, etc.) via Gremlin console scripts.
*   **Graph Processor:** Build a NATS consumer that reads incoming `DiscoveryCompleted` events and performs graph upserts in JanusGraph.

### Step 3: Identity & React Flow UI Rewrite
*   **SSO Deploy:** Set up Keycloak. Wire React App and FastAPI with Keycloak via OAuth2 Proxy.
*   **Graph UI Upgrade:** Migrate the static SVG topology visualization to dynamic **React Flow** and **Graphology**, enabling interactive node inspection and real-time status borders.

---

## Phase 3: Gated Operations & Active Remediation (V3)
Transitioning the system from passive observation to an active execution platform.

### Step 1: Temporal Orchestration Setup
*   **Workflow Engine:** Spin up a Temporal cluster.
*   **Workers & Activities:** Develop Python Temporal workers executing activities like running validation checks, triggering script runs, and monitoring process statuses.

### Step 2: Remediation & Validation Services
*   **Validation Engine:** Implement baseline checking cmdlets and comparison algorithms.
*   **Remediation Engine:** Implement playbooks for automatic/gated script generation (generating cmdlets to clear space, start services, rotate keys).
*   **Gated Approval UI:** Create a React portal for security and operations officers to audit, edit, and approve remediation scripts before they run.

---

## Phase 4: Autonomous Operations & Policy Engines (V4)
Achieving continuous compliance and closed-loop self-healing.

### Step 1: Continuous Daemon Collectors
*   **Daemon Scripts:** Package PowerShell collectors as Windows Services and osquery as systemd daemons, running assessments on scheduled intervals.
*   **NATS JetStream Sagas:** Establish NATS saga patterns for handling multi-host workflows.

### Step 2: Centralized Policy Engine
*   **Rule Store:** Implement a dynamic rule-updating pipeline storing Microsoft RulesEngine JSON specifications in PostgreSQL.
*   **Autonomous Run Loops:** Implement a policy executor that automatically initiates pre-approved remediation workflows when specific critical findings are published.

---

## Phase 5: Cognitive Operations Layer (V5)
Empowering teams with advanced AI diagnostics, explanation generators, and conversational operations.

### Step 1: Graph RAG Engine Setup
*   **LlamaIndex Pipeline:** Build index adapters using JanusGraph graph traversals and PostgreSQL history records.
*   **LiteLLM Integration:** Configure LiteLLM proxy router to support failovers and load balancing across model providers (Claude, OpenAI, Local Llama).

### Step 2: Conversational Copilot UI
*   **Diagnostics Chat:** Replace the simulated V1 chat with a live WebSocket-backed LlamaIndex RAG chat window.
*   **Script Generation:** Enable the AI assistant to recommend playbooks and script configurations.
*   **Remediation Safeguard:** Ensure the AI service cannot execute commands directly. The AI can only request a remediation workflow start, which must still go through the Temporal approval process.

---

## 💾 SQLite V1 to PostgreSQL V2 Migration Plan

To preserve user data and historical records during the transition from V1 to V2, follow this migration strategy:

```
┌────────────────────────────────┐       ┌────────────────────────────────┐
│      V1 Host Database          │       │      V2 Central Database       │
│  (SQLite: Local IndexedDB)     │       │     (PostgreSQL Cluster)       │
│  ┌──────────────────────────┐  │       │  ┌──────────────────────────┐  │
│  │ Local Assessment History │  │───────┼─►│ Central Machine Ledger   │  │
│  └──────────────────────────┘  │       │  └──────────────────────────┘  │
└────────────────────────────────┘       └────────────────────────────────┘
```

1.  **Export Schema:** Implement an export function in the V1 React dashboard that compiles the browser's IndexedDB/SQLite historical assessment runs into a single migration package (`.json`).
2.  **API Migration Endpoint:** Expose a FastAPI endpoint `/api/v2/migrate/import` which accepts V1 migration JSON packages.
3.  **Data Transformation Pipeline:**
    *   Parse the V1 local findings and scores.
    *   Map SQLite column properties to the new PostgreSQL schemas.
    *   Extract host specifications to generate unique machine UUID entries in the `machines` registry.
4.  **Graph Seed:** Automatically traverse the migrated assets to build initial nodes and relationships in JanusGraph, maintaining historical timeline nodes in the database.
