# Sentinel (EIIP) Service Dependency Graph

```mermaid
graph TD
    %% User Tier
    UI["Frontend (React + React Flow)"] -->|REST / WebSockets| API["API Gateway (FastAPI)"]
    
    %% Orchestration Tier
    API -->|Commands / Triggers| Temporal["Temporal Workflow Engine"]
    
    %% Event & Service Backbone
    API -->|Publish Events| NATS["NATS Message Broker (CloudEvents 1.0)"]
    NATS -->|Asynchronous Routing| BoundedContexts["Bounded Contexts Services"]
    Temporal -->|Orchestrate Activities| BoundedContexts
    
    %% Bounded Context Interdependencies
    DiscoveryContext["Discovery Context"] -->|Publish Info| NATS
    EvidenceContext["Evidence Context"] -->|Publish Metrics| NATS
    AssessmentContext["Assessment Context"] -->|Uses Rules| RulesEngine["Microsoft RulesEngine"]
    CorrelationContext["Correlation Context"] -->|Traverses Graph| GraphIntel["Graph Intelligence Context"]
    RiskContext["Risk Context"] -->|Queries Findings| NATS
    ForecastingContext["Forecasting Context"] -->|Uses Models| MLNet["ML.NET Regression Engine"]
    RemediationContext["Remediation Context"] -->|Runs Actions| Temporal
    ValidationContext["Validation Context"] -->|Verifies State| NATS
    
    %% Knowledge & AI
    GraphIntel -->|Traverse / Query| JanusGraph["JanusGraph Property Graph"]
    KnowledgeContext["Knowledge Context"] -->|Saves State| Postgres["PostgreSQL Database"]
    AIReasoning["AI Reasoning Layer (LlamaIndex + LiteLLM)"] -->|Graph RAG| JanusGraph
    AIReasoning -->|Call Models| LiteLLM["LiteLLM API Gateway"]
```

## Detailed Service Mappings

### 1. User Interface to API Gateway
- **Type**: Synchronous (HTTP/REST & WebSockets)
- **Dependency**: Frontend (`src`) depends on the FastAPI Backend to fetch assessment results, search packages, trigger scans, and stream terminal actions.

### 2. Message Bus Topology (NATS)
- **Type**: Asynchronous (Publish-Subscribe)
- **Schema**: CloudEvents 1.0 JSON format.
- **Data Flow**: Domain events like `ScanCompleted`, `FindingCreated`, and `RiskCalculated` are broadcasted through NATS to decouple microservices.

### 3. Workflow Orchestration (Temporal)
- **Type**: Distributed Orchestrator
- **Responsibility**: Coordinates multi-step, stateful processes such as remediation validation loops and scheduling daemon tasks.

### 4. Property Graph Database (JanusGraph)
- **Type**: Graph (TinkerPop Gremlin)
- **Storage**: Renders host-to-package dependency topology. Accessed exclusively by the Graph Intelligence Context and the AI reasoning layer.

### 5. Relational Database (PostgreSQL)
- **Type**: SQL
- **Responsibility**: Hosts metadata tables for Bounded Contexts (e.g., discovery configurations, task state tables, assessment scoring logs).
