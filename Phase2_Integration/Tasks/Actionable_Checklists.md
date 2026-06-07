# Phase 2: Actionable Development Checklists

This document provides role-based backlogs and checklists for development, integration, and security operations teams.

---

## 🎨 Frontend Team Checklist (React & React Flow)

### SSO & Routing
*   [ ] Integrate the Keycloak JS SDK adapter into the React frontend.
*   [ ] Implement a React authentication context provider (`AuthContext`) wrapping the application root.
*   [ ] Configure Route Guards preventing unauthenticated users from accessing dashboard views.
*   [ ] Extract user roles (`admin`, `operator`, `auditor`) from JWT claims and update UI permissions.

### Topology Graph Refactor
*   [ ] Set up `@xyflow/react` and `graphology` packages.
*   [ ] Implement custom node renderers for the 18 defined node types (Machine, OS, Service, Database, Storage, etc.).
*   [ ] Implement edge connections mapping system relationships (HOSTS, RUNS, DEPENDS_ON, mitages, etc.).
*   [ ] Create a dynamic side-inspector panel that mounts on node selection to show active properties.
*   [ ] Apply neon-styled box shadow glows (Green, Orange, Red) around custom nodes based on finding severities.

---

## 🐍 Backend Team Checklist (FastAPI & NATS)

### API Core
*   [ ] Set up FastAPI project boilerplate with asynchronous routing.
*   [ ] Configure `OAuth2PasswordBearer` and JWT token validator to verify Keycloak-signed tokens.
*   [ ] Implement the `/api/v2/discovery/upload` ingestion endpoint (JSON schema validation via Pydantic).
*   [ ] Implement WebSocket routers mapping live log stream events.

### Messaging & Event Architecture
*   [ ] Set up NATS connection manager with automatic reconnect logic.
*   [ ] Enforce the CloudEvents 1.0 JSON specification for all outgoing backend events.
*   [ ] Build NATS JetStream event publishers for Discovery, Assessment, and Risk actions.
*   [ ] Configure NATS subscriber daemons for the background services.

---

## 💾 Graph & Data Team Checklist (JanusGraph & PostgreSQL)

### Database Schemas
*   [ ] Define and run PostgreSQL migration scripts for local table schemas (Discovery metadata, scores, and risks).
*   [ ] Set up multi-tenant indexing (indexing by `tenant_id` columns).

### JanusGraph & Gremlin
*   [ ] Spin up JanusGraph with a PostgreSQL storage engine.
*   [ ] Create indices on key properties (e.g., composite indexes on `uuid`, mixed indexes on `name` or `status` using Elasticsearch).
*   [ ] Write Gremlin-based repository helper functions in Python (using `gremlin_python`) to upsert nodes and edges transactionally.
*   [ ] Optimize impact assessment queries (calculating downstream blast radius for a given machine ID).

---

## 🤖 AI Team Checklist (LlamaIndex & LiteLLM)

### Graph RAG Integration
*   [ ] Configure LlamaIndex to query the PostgreSQL historical database.
*   [ ] Build a LlamaIndex query engine wrapper that translates user prompts into Gremlin traversals for JanusGraph.
*   [ ] Create prompt templates incorporating system topologies, risks, and findings as context.

### LiteLLM Proxy Router
*   [ ] Configure LiteLLM proxy definitions in YAML mapping to providers (Anthropic Claude 3.5, OpenAI GPT-4o, or local Ollama).
*   [ ] Setup fallback policies and API key rotation within LiteLLM.
*   [ ] Enforce AI security guardrails: Ensure AI functions return structured JSON recommendations only, and have absolutely no direct execution pathways.

---

## 🔒 Security & Operations Checklist (Keycloak, Temporal, IaC)

### Keycloak Configuration
*   [ ] Design the EIIP Keycloak realm structure.
*   [ ] Define roles (`admin`, `operator`, `auditor`) and scope policies.
*   [ ] Register API clients (FastAPI, React client, PowerShell collector).

### Temporal Worker Deployment
*   [ ] Deploy the Temporal cluster in a development environment.
*   [ ] Implement Temporal python activities executing validation cmdlets.
*   [ ] Define retry policies and compensation tasks for the remediation workflow.

### Compliance & IaC
*   [ ] Generate Terraform/Docker Compose scripts for provisioning NATS, JanusGraph, Keycloak, and PostgreSQL.
*   [ ] Integrate SBOM (Software Bill of Materials) generation tools into the CI/CD pipeline (e.g., using `syft`).
*   [ ] Enable TLS 1.3 across all communication pathways (NATS, API, DBs).
