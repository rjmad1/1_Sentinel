# Sentinel (EIIP) Architecture Blueprint

## Architectural Principles
- **AP-01 Fleet-Capable First**: Single-machine deployment is an implementation choice; fleet-wide operation is the architectural posture.
- **AP-02 Graph-Centric Intelligence**: The dependency graph is a first-class platform capability, not just a reporting tool. It is the foundation for root cause analysis, risk propagation, and AI reasoning.
- **AP-03 Domain-Driven Design**: All major capabilities are isolated through bounded contexts. No shared "god model" or database across contexts.
- **AP-04 Event-Driven Evolution**: The platform uses CloudEvents-aligned domain events communicating asynchronously via NATS.
- **AP-05 Infrastructure Agnostic Core**: Platform logic remains independent of Windows-specific collectors, which are implementation details.

## Bounded Contexts
The platform is organized into 10 Bounded Contexts:
1. **Discovery Context**: Handles hardware, OS, application, and service scans.
2. **Evidence Context**: Collects operational metrics (performance, security, reliability).
3. **Graph Intelligence Context**: Constructs and queries the topology graph model.
4. **Assessment Context**: Runs rule-based evaluations to identify software upgrade paths and health scores.
5. **Correlation Context**: Performs root cause analysis by associating multiple findings.
6. **Risk Context**: Translates technical conditions into business/machine reliability risks.
7. **Forecasting Context**: Uses regression models to predict capacity exhaustion (storage, CPU, memory).
8. **Remediation Context**: Formulates actions to resolve issues. This includes managing closed-loop self-healing policies (autonomous auto-fix execution vs. approval-gated manual oversight) and tracking execution logs.
9. **Validation Context**: Measures state before and after execution to verify success.
10. **Knowledge Context**: Evolving repository of operational findings, historical trends, CVE threat intelligence, and remediation outcomes.

## Database Schema (PostgreSQL Relational Layer)

The relational storage layer in PostgreSQL manages fleet metadata, audit histories, and compliance policies:
1. **`machines`**: Core host registry tracking UUIDs, names, platform specifications, and hardware footprints.
2. **`domain_scores`**: Consolidated compliance assessment reports, domain sub-scores, and overall health indexes.
3. **`findings`**: Active system warnings, misconfigurations, and compliance failures mapped to machines.
4. **`remediation_plans`**: Recommended actions and checklist guidelines for correcting findings.
5. **`self_healing_policies`**: Closed-loop automation policies maps showing which findings can be auto-remediated, their enabled states, and execution modes (`autonomous` or `approval_gated`).
6. **`self_healing_runs`**: Historical audits tracking daemon execution runs, status (`running`, `success`, `failed`), and output stdout/stderr logs.
7. **`vulnerabilities`**: Threat intelligence CVE record registry mapping critical security exposures to package versions.

### Tenant Isolation & Security
All relational tables employ PostgreSQL Row Level Security (RLS) to enforce strict tenant isolation:
- RLS Policies ensure users can only access rows matching their tenant context via JWT claims (`tenant_id = (auth.jwt() ->> 'tenant_id')`).
- Under development and unit testing contexts, mock overrides bypass authentication gates.

## Technical Stack & Layers
```text
┌─────────────────────────────┐
│ User Experience Layer       │
│ React + React Flow          │
└─────────────┬───────────────┘
              │ (REST / WebSockets)
              ▼
┌─────────────────────────────┐
│ API & Orchestration Layer   │
│ FastAPI (Python) + Temporal │
└─────────────┬───────────────┘
              │ (CloudEvents / NATS)
              ▼
┌─────────────────────────────┐
│ Core Domain Services Layer  │
│ 10 Bounded Contexts         │
└─────────────┬───────────────┘
              │
              ├─────────────────────────┐
              ▼                         ▼
┌─────────────────────────┐       ┌─────────────────────────┐
│ Relational: PostgreSQL  │       │   Graph: JanusGraph     │
└─────────────────────────┘       └─────────────────────────┘
```

### Approved OSS Technologies
- **Frontend**: React + React Flow + Graphology (MIT)
- **Identity**: Keycloak + OAuth2 Proxy (Apache 2.0)
- **Discovery**: PowerShell Framework + osquery (MIT/Apache 2.0)
- **Telemetry**: OpenTelemetry Collector (Apache 2.0)
- **API**: FastAPI (MIT)
- **Persistence**: PostgreSQL (PostgreSQL License)
- **Graph Layer**: JanusGraph + Apache TinkerPop (Apache 2.0)
- **Messaging**: NATS + CloudEvents (Apache 2.0)
- **Rules Engine**: Microsoft RulesEngine (MIT)
- **Workflow**: Temporal (MIT)
- **Forecasting**: ML.NET (MIT)
- **AI Layer**: LlamaIndex + LiteLLM (MIT)
