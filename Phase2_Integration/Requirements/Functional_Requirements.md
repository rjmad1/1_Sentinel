# Phase 2: Functional Requirements Specification

This document defines the functional boundaries, requirements, and domain events for the ten independent bounded contexts of the Enterprise Infrastructure Intelligence Platform (EIIP).

---

## 🧭 Bounded Context Boundaries

To satisfy the **Domain-Driven Design (DDD)** principle, there are **no shared database models or schemas** across bounded contexts. Each bounded context is an independently deployable service that publishes and consumes events through the **NATS messaging bus** using the **CloudEvents 1.0** protocol.

```
+─────────────────────────────────────────────────────────────────────────────+
│                                  NATS BUS                                   │
+───▲───────────▲────────────▲────────────▲───────────▲───────────▲───────────▲──+
    │           │            │            │           │           │           │
┌───┴─────┐ ┌───┴─────┐ ┌────┴────┐ ┌─────┴────┐ ┌────┴─────┐ ┌───┴─────┐ ┌───┴─────┐
│Discovery│ │Evidence │ │  Graph  │ │Assessment│ │Correlation││  Risk   │ │Remediat.│
└─────────┘ └─────────┘ └─────────┘ └──────────┘ └──────────┘ └─────────┘ └─────────┘
```

---

## 1. Discovery Context
The entry point of the platform, collecting basic inventory data and normalizing it into a canonical asset model.

*   **Inputs:** 
    *   PowerShell Collector JSON streams (Hardware, OS, Memory, CPU, Storage, Network, Services, Security, Applications).
    *   osquery CSV/JSON records (Processes, Packages, Users, Connections, File System).
*   **Key Requirements:**
    *   Normalize disparate OS naming, vendor labels, CPU models, and storage measurements.
    *   Generate a unique deterministic machine fingerprint (UUID) based on hardware IDs (BIOS UUID, Serial, MAC address).
    *   Support incremental discovery (publish changes only).
*   **Outputs:**
    *   Canonical Asset Catalog payloads.
    *   `DiscoveryCompleted` domain event.

---

## 2. Evidence Context
Responsible for continuous performance counter aggregation, event log harvesting, and system state snapshots.

*   **Inputs:**
    *   OpenTelemetry Collector metrics stream.
    *   PowerShell performance logs (CPU queue, memory commits, disk activity).
    *   Windows Event Logs / Linux syslogs.
*   **Key Requirements:**
    *   Store raw, time-series telemetry evidence in a highly compressed format.
    *   Index logs and traces associated with specific Machine and OS UUIDs.
    *   Validate the completeness and integrity of incoming telemetry packets.
*   **Outputs:**
    *   Raw evidence snapshots.
    *   `EvidenceCollected` domain event.

---

## 3. Graph Context
The relational backbone of the platform. Builds and updates the infrastructure dependency graph using JanusGraph.

*   **Inputs:**
    *   Asset registries from the Discovery Context.
    *   Socket connections and active processes from the Evidence Context.
*   **Key Nodes:**
    *   `Tenant`, `Site`, `Machine`, `Hardware`, `OS`, `Application`, `Service`, `Process`, `Container`, `Port`, `Database`, `Storage`, `Network`, `User`, `Finding`, `Risk`, `Forecast`, `Remediation`.
*   **Key Relationships:**
    *   `HOSTS`, `RUNS`, `DEPENDS_ON`, `USES`, `CONNECTS_TO`, `LISTENS_ON`, `EXPOSES`, `PRODUCES`, `CONSUMES`, `AFFECTS`, `MITIGATES`.
*   **Key Requirements:**
    *   Enforce transactional graph integrity.
    *   Compute and update graph traversal weights.
    *   Detect isolated or disconnected node networks.
*   **Outputs:**
    *   Graph Topology updates.
    *   `GraphTopologyUpdated` domain event.

---

## 4. Assessment Context
Evaluates normalized assets and evidence against technical policies using the Microsoft RulesEngine.

*   **Inputs:**
    *   Asset specifications and evidence metrics.
    *   JSON-defined rulesets across six domains:
        1.  **Performance:** CPU saturation, memory exhaustion, disk queues.
        2.  **Security:** Disabled firewalls/antiviruses, admin sprawl, missing BitLocker/TPM.
        3.  **Reliability:** Stopped auto-start services, error log spike rates.
        4.  **Scalability:** Insufficient headroom limits, logical core limits.
        5.  **Serviceability:** Diagnostic collector availability.
        6.  **Usability:** Bloated startup items.
*   **Key Requirements:**
    *   Evaluate rules dynamically without service restarts.
    *   Calculate Domain Health Scores (0-100) using weighted deductions:
        *   `Critical`: -25 points
        *   `High`: -15 points
        *   `Medium`: -8 points
        *   `Low`: -3 points
    *   Expose metadata: Severity (Critical, High, Medium, Low) and Confidence score (0.0 to 1.0).
*   **Outputs:**
    *   Assessment findings reports.
    *   `FindingCreated` domain event.
    *   `HealthScoreCalculated` domain event.

---

## 5. Correlation Context
Correlates individual findings with graph topology relationships and historical knowledge to identify root causes.

*   **Inputs:**
    *   Active findings from the Assessment Context.
    *   Graph traversals from the Graph Context.
    *   Historical resolutions from the Knowledge Context.
*   **Key Requirements:**
    *   Trace dependency chains to determine if Finding A is causing Finding B (e.g., Disk Exhaustion causing Service Crash).
    *   Map multiple findings to a single Root Cause hypothesis.
    *   Generate human-readable explanations of the causal chain.
*   **Outputs:**
    *   Impact chains and root-cause records.
    *   `RootCauseIdentified` domain event.

---

## 6. Risk Context
Translates technical findings and correlations into business, operational, and technical risk models.

*   **Inputs:**
    *   Findings, root causes, and graph blast radiuses.
*   **Key Requirements:**
    *   Calculate **Likelihood**, **Impact**, and overall **Risk Score** (Likelihood × Impact).
    *   Assess blast radius (how many dependent services are affected if this machine goes offline).
    *   Categorize risks: Technical (e.g., crash), Business (e.g., data loss, compliance breach), Operational (e.g., downtime).
*   **Outputs:**
    *   Risk matrix scores.
    *   `RiskAssessed` domain event.

---

## 7. Forecasting Context
Leverages ML.NET regression models to predict resource saturation windows.

*   **Inputs:**
    *   Historical metrics (CPU, Memory, Storage, Network, GPU) from the Evidence/Knowledge databases.
*   **Key Requirements:**
    *   Train and run forecasting models on 30, 90, 180, and 365-day horizons.
    *   Identify dates where resource usage is predicted to breach critical thresholds (e.g., Disk Space < 10%).
    *   Calculate forecast confidence bands.
*   **Outputs:**
    *   Resource capacity forecasts.
    *   `CapacityBreachPredicted` domain event.

---

## 8. Remediation Context
Generates corrective actions, rollback procedures, and validation steps for identified findings and risks.

*   **Inputs:**
    *   Active findings, risks, and root causes.
    *   Approved remediation playbook templates.
*   **Key Requirements:**
    *   Generate target scripts (PowerShell / Shell / Ansible).
    *   Include a mandatory, automated Rollback script for every remediation plan.
    *   Enforce workflow gates (Human-in-the-Loop approvals for high/critical changes).
*   **Outputs:**
    *   Remediation Plans.
    *   `RemediationPlanProposed` domain event.
    *   `RemediationApproved` domain event.

---

## 9. Validation Context
Executes closed-loop validation before, during, and after remediation actions are applied.

*   **Inputs:**
    *   Active remediation plans and execution parameters.
    *   Fresh telemetry evidence.
*   **Key Requirements:**
    *   Capture pre-remediation baseline telemetry.
    *   Run check cmdlets to verify the target fault is still present before modifying.
    *   Run post-remediation validation checks to verify resolution.
    *   Trigger automatic rollback if validation checks fail.
*   **Outputs:**
    *   Validation reports.
    *   `ValidationPassed` or `ValidationFailed` domain events.

---

## 10. Knowledge Context
Serves as the long-term cognitive repository, recording assessment histories, risk records, and remediation outcomes.

*   **Inputs:**
    *   All domain events published across the platform.
*   **Key Requirements:**
    *   Maintain an immutable ledger of all historical assessments and states.
    *   Track remediation success rates to feed back into the Remediation context.
    *   Index historical contexts to support LLM Graph RAG queries.
*   **Outputs:**
    *   Historical reports.
    *   `KnowledgeBaseUpdated` domain event.

---

## 🌐 Event Architecture & CloudEvents 1.0 Contracts

All communications occur through structured JSON events complying with **CloudEvents 1.0**.

### Required Envelope Fields
*   `specversion`: String, must be `"1.0"`.
*   `id`: String, unique event UUID.
*   `source`: String, URI identifying the publishing bounded context.
*   `type`: String, the name of the domain event.
*   `subject`: String, URI mapping to the target entity (e.g., `Machine/uuid`).
*   `time`: String, RFC3339 timestamp.
*   `data`: Object, context-specific payload.

---

### Concrete Event Schemas

#### 1. `FindingCreated` Event (Assessment Context)
```json
{
  "specversion": "1.0",
  "id": "7bdf882a-289c-4573-ad22-6b957655845c",
  "source": "eiip://assessment-service",
  "type": "FindingCreated",
  "subject": "Machine/9a2468db-37a5-48fa-bb64-c2c61bc3d2be",
  "time": "2026-06-07T10:45:00Z",
  "data": {
    "findingId": "FND-SEC-004",
    "domain": "Security",
    "title": "Administrator Account Sprawl Detected",
    "description": "More than 3 accounts belong to the local administrators group S-1-5-32-544.",
    "severity": "High",
    "confidence": 1.0,
    "evidence": {
      "adminCount": 5,
      "identities": ["Administrator", "dev_user", "test_admin", "rajaj", "backup_svc"]
    }
  }
}
```

#### 2. `RootCauseIdentified` Event (Correlation Context)
```json
{
  "specversion": "1.0",
  "id": "e2e9c1db-49c0-4357-8ffb-88a4e321bf49",
  "source": "eiip://correlation-service",
  "type": "RootCauseIdentified",
  "subject": "Machine/9a2468db-37a5-48fa-bb64-c2c61bc3d2be",
  "time": "2026-06-07T10:46:12Z",
  "data": {
    "correlationId": "CORR-STOR-SVC-001",
    "probableRootCause": "Disk space exhaustion on OS volume (C:) is causing critical services (SQL Server) to crash.",
    "findings": ["FND-PERF-001", "FND-RELI-002"],
    "impactChain": [
      { "node": "Storage/C:", "status": "Error", "finding": "FND-PERF-001" },
      { "node": "Process/sqlservr.exe", "status": "Error" },
      { "node": "Service/MSSQLSERVER", "status": "Stopped", "finding": "FND-RELI-002" }
    ],
    "explanation": "Traversing the property graph reveals that Process sqlservr.exe DEPENDS_ON Storage C: which is currently at 98% utilization. This disk saturation triggered the SQL Server service crash event."
  }
}
```

#### 3. `RiskAssessed` Event (Risk Context)
```json
{
  "specversion": "1.0",
  "id": "c8e4210d-7b24-4f01-a204-bd345091799a",
  "source": "eiip://risk-service",
  "type": "RiskAssessed",
  "subject": "Machine/9a2468db-37a5-48fa-bb64-c2c61bc3d2be",
  "time": "2026-06-07T10:47:00Z",
  "data": {
    "riskId": "RSK-OPS-109",
    "category": "Operational",
    "likelihood": 0.9,
    "impact": 0.8,
    "overallSeverity": "Critical",
    "confidence": 0.95,
    "blastRadiusScore": 0.75,
    "impactedDownstreamAssets": [
      { "type": "Application", "id": "App/InventoryPortal", "relationship": "DEPENDS_ON" }
    ],
    "summary": "High risk of inventory system outage due to persistent SQL database service failures on DBServer-01."
  }
}
```

#### 4. `RemediationApproved` Event (Remediation Context)
```json
{
  "specversion": "1.0",
  "id": "fa2b10a2-2cb0-4e12-b94d-91b427b3ea8d",
  "source": "eiip://remediation-service",
  "type": "RemediationApproved",
  "subject": "Machine/9a2468db-37a5-48fa-bb64-c2c61bc3d2be",
  "time": "2026-06-07T11:00:00Z",
  "data": {
    "planId": "REM-PLN-1209",
    "findingId": "FND-PERF-001",
    "approver": "rajaj",
    "approvalTime": "2026-06-07T10:59:58Z",
    "executionScript": {
      "type": "powershell",
      "code": "Remove-Item -Path 'C:\\Windows\\Temp\\*' -Recurse -Force -ErrorAction SilentlyContinue"
    },
    "rollbackScript": {
      "type": "powershell",
      "code": "Write-Output 'Rollback path: Clean-up is non-destructive and cannot be undone.'"
    },
    "validationScript": {
      "type": "powershell",
      "code": "if ((Get-Volume -DriveLetter C).SizeRemaining -gt 15GB) { exit 0 } else { exit 1 }"
    }
  }
}
```
