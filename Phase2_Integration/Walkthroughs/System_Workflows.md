# Phase 2: System Workflows & Sequence Diagrams

This document contains visual workflow diagrams and detailed logic walkthroughs for the core system processing paths in Phase 2.

---

## 1. Telemetry Ingestion & Graph Update Workflow

This workflow tracks how raw system telemetry gathered by agents is normalized, ingested, and modeled inside the JanusGraph property graph.

### Sequence Diagram
```mermaid
sequenceDiagram
    autonumber
    participant Agent as Host (PowerShell/osquery)
    participant OTel as OpenTelemetry Collector
    participant API as FastAPI Gateway
    participant NATS as NATS JetStream Bus
    participant GraphSvc as Graph Service (Consumer)
    participant GraphDB as JanusGraph Store

    Agent->>OTel: Stream raw telemetry JSON & CSV logs
    Note over OTel: Normalizes schemas & metadata
    OTel->>API: Forward payload over gRPC (TLS)
    API->>API: Authenticate Client ID & Token
    API->>NATS: Publish DiscoveryCompleted Event
    NATS-->>API: Acknowledge event receipt
    NATS->>GraphSvc: Dispatch event to consumer queue
    Note over GraphSvc: Translates assets to nodes/edges
    GraphSvc->>GraphDB: Execute Gremlin upsert operations
    GraphDB-->>GraphSvc: Confirm transaction success
    GraphSvc->>NATS: Publish GraphTopologyUpdated Event
```

### Walkthrough Steps
1.  **Telemetry Stream:** The PowerShell collector runs on the target machine, executing WMI queries and osquery calls, and streams normalized JSON results to the OpenTelemetry Collector.
2.  **Normalization:** The OpenTelemetry Collector acts as an edge aggregator, stripping out local formatting anomalies and applying global context tags (e.g., Tenant ID, Site ID).
3.  **Secure Ingestion:** The FastAPI gateway receives the structured OTel payload, verifies JWT credentials via OAuth2 Proxy, and formats a canonical asset payload.
4.  **Event Dispatch:** FastAPI publishes the `DiscoveryCompleted` event to the `eiip.discovery.completed` NATS topic.
5.  **Graph Synthesis:** The Graph Service consumes the event from NATS. It checks if the machine node already exists in JanusGraph. If not, it creates a `Machine` vertex. It then parses the JSON fields to generate child vertices (e.g., `OS`, `Port`, `Service`) and links them with relationships (e.g., `HOSTS`, `LISTENS_ON`, `RUNS`).

---

## 2. Rule Evaluation & Score Calculation Workflow

This workflow represents the reasoning engine evaluating evidence against rules to determine health scores and generate findings.

### Sequence Diagram
```mermaid
sequenceDiagram
    autonumber
    participant NATS as NATS JetStream Bus
    participant AssessSvc as Assessment Service
    participant RulesEng as Microsoft RulesEngine
    participant DB as PostgreSQL
    participant UI as React Flow Frontend

    NATS->>AssessSvc: Dispatch DiscoveryCompleted Event
    Note over AssessSvc: Fetches active JSON rulesets from DB
    AssessSvc->>RulesEng: Load rulesets and pass telemetry input
    Note over RulesEng: Evaluates expressions dynamically
    RulesEng-->>AssessSvc: Return rule output matches (Failures)
    Note over AssessSvc: Calculates Domain Health Scores & Weighted Index
    AssessSvc->>DB: Persist Findings & Health Scores
    AssessSvc->>NATS: Publish FindingCreated & HealthScoreCalculated Events
    NATS->>UI: Stream new findings & updated gauges via WebSockets
```

### Walkthrough Steps
1.  **Rule Trigger:** The Assessment Service receives the `DiscoveryCompleted` event containing normalized metrics and software catalogs.
2.  **RulesEngine Invocation:** The service fetches the active, JSON-defined policy rules from PostgreSQL and loads them into the Microsoft RulesEngine. It feeds the telemetry data into the engine as input objects.
3.  **Policy Evaluation:** The RulesEngine runs expressions (e.g., CPU utilization > 85%, admin accounts > 3). It compiles list of rule violations.
4.  **Score Deductions:** For every rule violated, the Assessment Service generates a `Finding` record and deducts points from the domain's 100-point base score based on severity (Critical: -25, High: -15, Medium: -8, Low: -3).
5.  **Persistence & Streaming:** The findings and scores are saved to PostgreSQL. The service publishes `FindingCreated` and `HealthScoreCalculated` events. A WebSocket server in FastAPI pushes these events to the React frontend, updating the radial gauges and table views.

---

## 3. Gated Remediation & Validation Workflow

This workflow outlines the process for proposing, validating, approving, and executing corrective actions.

### Sequence Diagram
```mermaid
sequenceDiagram
    autonumber
    participant Risk as Risk Service
    participant RemSvc as Remediation Service
    participant UI as React Dashboard Portal
    participant Admin as System Administrator
    participant Temp as Temporal Workflows
    participant Agent as Host Execution Agent

    Risk->>RemSvc: Publish RiskAssessed Event
    Note over RemSvc: Maps finding to playbook
    RemSvc->>RemSvc: Generate Execution, Rollback, & Validation scripts
    RemSvc->>UI: Publish RemediationPlanProposed Event
    UI->>Admin: Display approval prompt with script previews
    Admin->>UI: Review and click "Approve Remediation"
    UI->>RemSvc: Send authorization signature
    RemSvc->>Temp: Start RemediationWorkflow(planId)
    
    activate Temp
    Note over Temp: Phase 1: Pre-Validation Check
    Temp->>Agent: Run Validation script (Is fault still there?)
    Agent-->>Temp: Returns true (Condition matches)
    
    Note over Temp: Phase 2: Remediation Script Run
    Temp->>Agent: Run Execution script (Clear space/stop service)
    Agent-->>Temp: Returns execution outcome (Done)
    
    Note over Temp: Phase 3: Post-Validation Check
    Temp->>Agent: Run Validation script (Is disk space > 15GB?)
    Agent-->>Temp: Returns outcome
    deactivate Temp

    alt Validation Passed
        Temp->>RemSvc: Report Success
        RemSvc->>UI: Update dashboard status (Mitigated)
    else Validation Failed
        Temp->>Agent: Execute Rollback script
        Temp->>RemSvc: Report Failure (Trigger Alerts)
    end
```

### Walkthrough Steps
1.  **Remediation Proposal:** The Remediation Service consumes the `RiskAssessed` event. It matches the associated finding with an approved playbook (e.g., Disk Exhaustion finding maps to Temp Directory Cleanup script). It generates a plan containing the execution script, a validation script, and a rollback script.
2.  **Operator Gating:** The service publishes a `RemediationPlanProposed` event. The React dashboard displays an alert prompt to the administrator. The admin inspects the generated PowerShell commands.
3.  **Workflow Start:** Once approved, the dashboard sends the approval signature to the API. The Remediation Service starts the Temporal workflow `RemediationWorkflow`.
4.  **Temporal Orchestration:**
    *   **Pre-Check:** Temporal runs the Validation script on the target host. If the check returns true (fault exists), it proceeds.
    *   **Execution:** Temporal instructs the host agent to execute the corrective PowerShell commands.
    *   **Post-Check:** Temporal runs the Validation script again. If it returns true (fault resolved), it reports success.
5.  **Rollback Protection:** If the post-check fails, Temporal halts the workflow, triggers a compensating activity running the Rollback script, and flags the failure to the administrator.
