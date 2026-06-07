# Phase 2: Technical Architecture & Tech Stack Integration

This document defines the configuration, schema structures, routing protocols, and integration architectures for the Enterprise Infrastructure Intelligence Platform (EIIP) Phase 2 technology stack.

---

## 1. Frontend: React Flow & Graphology

The frontend visualizes the topology graph and highlights finding severities using a neon-styled dark mode dashboard.

```
┌─────────────────────────────────────────────────────────┐
│ React Command Center (Dashboard View)                  │
│  ┌───────────────────────┐   ┌───────────────────────┐  │
│  │    React Flow Canvas  │   │   Side-Inspector Panel│  │
│  │ [Machine (Red Glow)]  │◄──┼─── [Shows active OS,  │  │
│  │         │             │   │    CPU, Port, Service │  │
│  │   RUNS  ▼             │   │    CIM properties]    │  │
│  │  [SQL Server Service] │   └───────────────────────┘  │
│  └───────────────────────┘                              │
└─────────────────────────────────────────────────────────┘
```

*   **React Flow & Graphology Integration:**
    *   `Graphology` manages the graph data structure (nodes, edges, attributes, and pathfinding traversals) in memory.
    *   `React Flow` handles the layout, rendering, zooming, and interactive node drag-and-drop actions.
*   **Custom Node Visuals:**
    *   Every node (e.g., `Machine`, `Service`, `Port`) has a custom React Flow node template.
    *   **Status Glow borders** reflect findings: Green (No warnings), Orange (Warning / Medium-High severity), Red (Error / Critical severity).
*   **Side-Inspector:**
    *   Selecting a node in React Flow queries Graphology attributes and displays raw CIM/WMI or osquery property grids in the inspector pane.

---

## 2. Identity & Access: Keycloak & OAuth2 Proxy

Ensures secure, unified single sign-on (SSO) and Role-Based Access Control (RBAC) across the platform.

*   **OIDC Flow:**
    *   Users authenticate via Keycloak.
    *   `OAuth2 Proxy` wraps the FastAPI endpoints and React static content, intercepting requests and validating JWT signatures.
*   **Role-Based Access Control (RBAC):**
    *   `Administrator`: Full read/write, manual triggers, and remediation approval.
    *   `Operator`: Read-only views, manual triggering of assessments, but cannot approve remediation scripts.
    *   `Auditor`: Read-only views, cannot trigger assessments or remediation.
*   **Service Authentication:**
    *   Collector agents running on servers authenticate to the API endpoints using **OAuth2 Client Credentials Grant** (service accounts) to stream telemetry packets.

---

## 3. Discovery & Telemetry: PowerShell, osquery, & OpenTelemetry

A dual-agent model combining broad Windows systems telemetry with deep cross-platform OS audit logs.

```
┌─────────────────────────────────────────────────────────┐
│ Target Infrastructure Host                              │
│  ┌──────────────────────┐     ┌──────────────────────┐  │
│  │ PowerShell Collector │     │    osquery Daemon    │  │
│  │ (WMI / CIM queries)  │     │ (System tables, SQL) │  │
│  └──────────┬───────────┘     └──────────┬───────────┘  │
└─────────────┼────────────────────────────┼──────────────┘
              │ (Normalized JSON streams)  │
              ▼                            ▼
   ┌──────────────────────────────────────────────────┐
   │             OpenTelemetry Collector              │
   │      (Aggregates logs, metrics, & traces)        │
   └────────────────────────┬─────────────────────────┘
                            │ (gRPC / TLS)
                            ▼
                     [FastAPI Ingestion]
```

*   **PowerShell Collectors:** Query WMI/CIM classes for system configuration (BitLocker, TPM, Local Admins, Disk metrics) and serialize to JSON.
*   **osquery Enforcements:** Queries operating system states via SQL-like queries (e.g., `SELECT * FROM listening_ports;`, `SELECT * FROM processes;`).
*   **OpenTelemetry Collector Pipeline:**
    *   Configured with receivers for logs, metrics, and application traces.
    *   Normalizes and forwards data securely via TLS to the FastAPI ingestion layer.

---

## 4. API Layer: FastAPI (Python)

Serves as the high-performance asynchronous gateway for the platform.

*   **Asynchronous Processing:** Powered by `asyncio` and `uvicorn` to handle thousands of concurrent telemetry updates.
*   **Endpoint Categories:**
    *   `/api/v2/discovery`: Ingestion endpoints for collector JSON packages.
    *   `/api/v2/graph`: Topology graph queries (nodes, edges, sub-graphs).
    *   `/api/v2/assessments`: Rule assessment triggers and health score lookups.
    *   `/api/v2/remediation`: Gated approvals, validation results, and rollback execution.
*   **WebSocket Streamers:** Provide live updates on running assessments and log streams straight to the React frontend console.

---

## 5. Persistence & Graph: PostgreSQL & JanusGraph

Supports separate relational storage and high-speed property graph traversals.

### PostgreSQL Relational Schema (Metadata & State)
Each bounded context maintains its tables. No cross-context foreign keys.
*   **Discovery context:** `machines`, `os_properties`, `hardware_components`.
*   **Assessment context:** `findings`, `domain_scores`.
*   **Risk context:** `assessed_risks`, `impact_matrices`.
*   **Remediation context:** `remediation_plans`, `approval_logs`.

### JanusGraph & Apache TinkerPop (Topology & Reasoning)
*   **Graph Engine:** JanusGraph running on the TinkerPop framework. Uses PostgreSQL or ScyllaDB as its storage backend, and Elasticsearch as its indexing backend.
*   **Vertex Labels:** `Tenant`, `Site`, `Machine`, `Hardware`, `OS`, `Application`, `Service`, `Process`, `Container`, `Port`, `Database`, `Storage`, `Network`, `User`, `Finding`, `Risk`, `Forecast`, `Remediation`.
*   **Edge Labels:** `HOSTS`, `RUNS`, `DEPENDS_ON`, `USES`, `CONNECTS_TO`, `LISTENS_ON`, `EXPOSES`, `PRODUCES`, `CONSUMES`, `AFFECTS`, `MITIGATES`.
*   **Gremlin Traversal Example (Impact Analysis):**
    ```groovy
    // Find all Applications dependent on a failing Machine
    g.V().hasLabel('Machine').has('id', '9a2468db-37a5-48fa-bb64-c2c61bc3d2be')
     .inE('HOSTS').outV() // Move to OS / Processes
     .outE('DEPENDS_ON').inV() // Move to dependent services
     .hasLabel('Application').valueMap('name', 'status')
    ```

---

## 6. Messaging: NATS & CloudEvents

High-performance, low-latency publish-subscribe system enforcing standard message formats.

*   **NATS JetStream:** Utilized for durable messaging queues.
*   **Topic Naming Conventions:**
    *   `eiip.discovery.completed` (published by Discovery, consumed by Graph & Evidence)
    *   `eiip.assessment.finding.created` (published by Assessment, consumed by Correlation & Risk)
    *   `eiip.risk.assessed` (published by Risk, consumed by Remediation)
    *   `eiip.remediation.proposed` (published by Remediation, consumed by Temporal / Webhooks)
*   **MassTransit:** Facilitates event routing, message dispatching, and saga patterns when .NET services are integrated.

---

## 7. Rules Engine: Microsoft RulesEngine

Executes decoupled, JSON-configured rules for assessing infrastructure health.

*   **Execution Strategy:**
    *   FastAPI wraps the RulesEngine execution logic.
    *   Rules are stored as JSON files in PostgreSQL database records. They are reloaded dynamically without service restarts when updated.
*   **Sample JSON Rule definition (Security Domain):**
    ```json
    [
      {
        "WorkflowName": "SecurityAssessment",
        "Rules": [
          {
            "RuleName": "AdminSprawlCheck",
            "SuccessEvent": "ADMIN_SPRAWL_DETECTED",
            "ErrorMessage": "More than 3 administrative accounts detected on the system.",
            "Expression": "input1.LocalAdmins.Count > 3",
            "Severity": "High",
            "Properties": {
              "Domain": "Security",
              "DeductionPoints": 15
            }
          }
        ]
      }
    ]
    ```

---

## 8. Workflow Orchestration: Temporal

Temporal orchestrates the long-running, multi-step operations workflows with guaranteed state durability.

```
AssessmentWorkflow (Temporal Orchestrator)
 ├── Activity 1: Run Telemetry Ingestion Check
 ├── Activity 2: Trigger RulesEngine Assessments
 ├── Activity 3: Execute Graph Topology Updates
 ├── Activity 4: Calculate Health Index & Deductions
 └── Activity 5: Publish AssessmentCompleted Event
```

*   **Orchestrated Workflows:**
    *   `AssessmentWorkflow`: Ingestion -> Rule execution -> Score updating -> Graph Sync.
    *   `RemediationWorkflow`: Validation pre-check -> Script Execution -> Validation post-check -> (Rollback if failed) -> Audit Log writing.
*   **Resiliency Capabilities:**
    *   **Retry Policies:** Exponential back-offs for API/agent timeouts.
    *   **Compensating Actions:** Automatic rollbacks executed if a script breaks a service (e.g., re-enabling a service if starting it crashed).
    *   **Audit Trails:** Temporal history serves as the immutable audit log of who triggered what fix.

---

## 9. Forecasting: ML.NET

Runs localized and centralized capacity prediction.

*   **Models:** Timeseries Forecasting (SSA - Singular Spectrum Analysis) and linear/polynomial regressions.
*   **Training Loop:** Background workers run weekly ML.NET training cycles using historical PostgreSQL metrics.
*   **Forecast Windows:** Runs daily predictions for 30, 90, 180, and 365 days, outputting predicted breach dates to the database.

---

## 10. AI Layer: LlamaIndex, LiteLLM & RAG

Provides conversational insights, automated failure reasoning, and remediation suggestions.

```
┌─────────────────────────────────────────────────────────┐
│ AI Layer (LlamaIndex + LiteLLM Router)                  │
│                                                         │
│  User Query: "Why is the SQL Server service down?"      │
│                                                         │
│  ┌───────────────┐     ┌─────────────────────────────┐  │
│  │  LlamaIndex   │◄───►│ Graph Traversal (Gremlin)   │  │
│  │ (RAG Pipeline)│     │ "MSSQLSERVER depends on C:" │  │
│  └───────┬───────┘     └─────────────────────────────┘  │
│          │ (Structured Prompt)                          │
│          ▼                                              │
│  ┌───────────────┐                                      │
│  │    LiteLLM    │◄───► API: Claude / OpenAI / Llama    │
│  └───────────────┘                                      │
└─────────────────────────────────────────────────────────┘
```

*   **Graph RAG Pipeline:**
    *   LlamaIndex converts natural language queries into Gremlin queries to traverse JanusGraph.
    *   Merges graph outputs with historical PostgreSQL finding records to build a rich context prompt.
*   **LiteLLM Abstraction:** Handles API connections to multiple models (e.g., Claude 3.5 Sonnet, GPT-4o, or local Llama 3) via a unified API key/routing endpoint.
*   **Strict Security Guardrails:**
    *   **Read-Only Interaction:** The AI model is strictly prohibited from executing commands. It *cannot* write files or trigger CLI actions directly.
    *   **Workflow Approval Requirement:** Remediation recommendations must be formatted as JSON playbooks, sent to the Remediation Bounded Context, and require manual approval before Temporal runs them.

---

## 📐 Build Rules Matrix (ADOPT, EXTEND, WRAP, FORK, BUILD)

| Code Category | OSS Target | Strategy | Detail |
| :--- | :--- | :---: | :--- |
| **Workflow Engine** | Temporal | **ADOPT** | Use Temporal SDKs directly without modification. |
| **Identity / Auth** | Keycloak | **ADOPT** | Use Keycloak image directly. Integrate client configs. |
| **Telemetry Agent** | osquery | **EXTEND** | Write custom osquery config queries and schema extensions. |
| **Rules Evaluator** | MS RulesEngine | **WRAP** | Build a FastAPI wrapper around the engine execution loops. |
| **Graph Database** | JanusGraph | **ADOPT** | Run JanusGraph instance. Define custom indexes/schemas. |
| **AI Router** | LiteLLM | **ADOPT** | Adopt standard LiteLLM proxy deployment. |
| **Reasoning Engine** | None | **BUILD** | Custom implementation for Correlation, Risk, and AI Graph RAG. |
| **Playbooks** | PowerShell / Shell | **BUILD** | Custom remediation scripts and validation check cmdlets. |
