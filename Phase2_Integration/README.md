# Phase 2: Enterprise Infrastructure Intelligence Platform (EIIP)
## Integration & Architecture Blueprint Workspace

Welcome to the **Phase 2 Integration Workspace**. This workspace contains the blueprints, technical specs, implementations plans, workflows, and task lists required to evolve EIIP from a local V1 tool into a unified, fleet-capable, and enterprise-grade intelligence platform.

```
                  ┌──────────────────────────────────────────┐
                  │          UI: React + React Flow          │
                  └────────────────────┬─────────────────────┘
                                       │ (REST / WebSockets)
                                       ▼
                  ┌──────────────────────────────────────────┐
                  │             API: FastAPI                 │
                  └────────────────────┬─────────────────────┘
                                       │ (CloudEvents / NATS)
                                       ▼
 ┌───────────────────────────────────────────────────────────────────────────┐
 │                            BOUNDED CONTEXTS                               │
 │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐│
 │  │ Discovery │  │ Evidence  │  │   Graph   │  │Assessment │  │Correlation││
 │  └───────────┘  └───────────┘  └───────────┘  └───────────┘  └───────────┘│
 │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐│
 │  │   Risk    │  │Forecast'g │  │Remediation│  │Validation │  │ Knowledge ││
 │  └───────────┘  └───────────┘  └───────────┘  └───────────┘  └───────────┘│
 └───────────────────────────────────────────────────────────────────────────┘
                                       │
                      ┌────────────────┴────────────────┐
                      ▼                                 ▼
         ┌─────────────────────────┐       ┌─────────────────────────┐
         │ Relational: PostgreSQL  │       │   Graph: JanusGraph     │
         └─────────────────────────┘       └─────────────────────────┘
```

---

## 📂 Directory Map

Use this directory structure to navigate the requirements, technical plans, and tasks for Phase 2:

* 📄 **[README.md](file:///c:/AIProjects/1_Sentinel/Phase2_Integration/README.md)** (This Document) - Index of the Phase 2 integration blueprints.
* 📁 **[Requirements/](file:///c:/AIProjects/1_Sentinel/Phase2_Integration/Requirements/)**
  * 📄 **[Functional_Requirements.md](file:///c:/AIProjects/1_Sentinel/Phase2_Integration/Requirements/Functional_Requirements.md)** - Bounded Context descriptions, domain events, and event routing contracts.
* 📁 **[Technical_Needs/](file:///c:/AIProjects/1_Sentinel/Phase2_Integration/Technical_Needs/)**
  * 📄 **[Architecture_and_Tech_Stack.md](file:///c:/AIProjects/1_Sentinel/Phase2_Integration/Technical_Needs/Architecture_and_Tech_Stack.md)** - Technology mappings (NATS, JanusGraph, Keycloak, RulesEngine, Temporal, ML.NET, LlamaIndex, LiteLLM) and data models.
* 📁 **[Plans/](file:///c:/AIProjects/1_Sentinel/Phase2_Integration/Plans/)**
  * 📄 **[Implementation_Plan.md](file:///c:/AIProjects/1_Sentinel/Phase2_Integration/Plans/Implementation_Plan.md)** - Phased rollout plan, dependencies, and migration path from V1.
* 📁 **[Walkthroughs/](file:///c:/AIProjects/1_Sentinel/Phase2_Integration/Walkthroughs/)**
  * 📄 **[System_Workflows.md](file:///c:/AIProjects/1_Sentinel/Phase2_Integration/Walkthroughs/System_Workflows.md)** - Sequence diagrams and logic walkthroughs for system processing paths.
* 📁 **[Tasks/](file:///c:/AIProjects/1_Sentinel/Phase2_Integration/Tasks/)**
  * 📄 **[Actionable_Checklists.md](file:///c:/AIProjects/1_Sentinel/Phase2_Integration/Tasks/Actionable_Checklists.md)** - Actionable development lists grouped by phase and component.

---

## 📐 Core Architecture Principles

These principles guide every integration decision in Phase 2:

1. **Fleet-capable from inception:** Single-machine options are just configurations; the platform defaults to cluster-wide operation.
2. **Graph-centric intelligence:** Infrastructure reasoning and dependency analysis originate from traversing JanusGraph.
3. **Domain-driven design:** Strict separation of the 10 bounded contexts. No shared databases or domain models.
4. **Event-driven communication:** All contexts communicate asynchronously via NATS using CloudEvents 1.0 specifications.
5. **Infrastructure-agnostic core:** The FastAPI backend is decoupled from Windows/OS-specific agent scripts.
6. **Commercial-safe OSS only:** Direct alignment with Apache 2.0, MIT, and BSD licensing. No licensing traps.
7. **ADOPT, EXTEND, WRAP, FORK, BUILD Rule:** Custom development is restricted *exclusively* to Infrastructure Intelligence, Correlation Logic, Risk Models, Knowledge Models, Operational Reasoning, Remediation Knowledge, and AI Operations. Everything else leverages standard OSS tools.

---

## 🛠️ The Approved OSS Technology Stack

| Component | Technology | Primary Role | License |
| :--- | :--- | :--- | :--- |
| **Frontend** | React + React Flow + Graphology | High-fidelity topology graph visualization and dashboard. | MIT |
| **Identity** | Keycloak + OAuth2 Proxy | Single Sign-On, OIDC federation, RBAC enforcement. | Apache 2.0 |
| **Discovery** | PowerShell Framework + osquery | Multi-platform agent metrics and event log harvesting. | MIT / Apache 2.0 |
| **Telemetry** | OpenTelemetry Collector | Log, metric, and trace aggregation pipeline. | Apache 2.0 |
| **API Layer** | FastAPI (Python) | Rest endpoints, WebSocket streaming, microservice controller. | MIT |
| **Persistence** | PostgreSQL | Bounded context metadata, state, historical logs. | PostgreSQL |
| **Graph Layer** | JanusGraph + Apache TinkerPop | High-performance, distributed property graph store. | Apache 2.0 |
| **Messaging** | NATS + CloudEvents + MassTransit | High-speed, lightweight messaging backplane. | Apache 2.0 |
| **Rules Engine**| Microsoft RulesEngine | Decoupled JSON-based policy assessment executor. | MIT |
| **Workflow** | Temporal | Multi-step orchestration, retry, compensation, audit trails. | MIT |
| **Forecasting** | ML.NET | Regression models for CPU, memory, and disk consumption. | MIT |
| **AI Layer** | LlamaIndex + LiteLLM | Graph RAG, multi-LLM abstractions, contextual advisory. | MIT |

---
*For questions or contributions, reference the detailed sheets under the subfolders.*
