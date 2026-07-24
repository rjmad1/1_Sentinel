# Enterprise Software Assessment Guide

This guide describes how to run an **Autonomous Enterprise Software Assessment** on target software codebases using Sentinel's multi-persona AI agent framework.

---

## 🏛 Framework Overview

The **Enterprise Software Assessment System** combines 16 collaborative expert personas to perform evidence-first technical due diligence, software architecture reverse engineering, and production readiness checks.

### Expert Personas
- **Principal Software Architect**: Overall system topology, component boundaries, and structural patterns.
- **Enterprise Architect**: Business capabilities mapping, bounded contexts, and domain alignment.
- **Platform Engineer**: Infrastructure abstraction, developer platform tooling, and environment setup.
- **DevOps Architect**: Automation, build pipelines, dependency manifests, and artifact distribution.
- **Site Reliability Engineer (SRE)**: Telemetry, observability, error budgets, incident runbooks, and SLOs.
- **Release Engineer**: Version control workflows, branch protection, tagging strategies, and changelogs.
- **Security Architect**: Vulnerability exposure, secret management, IAM/RBAC, and SLSA supply chain safety.
- **Cloud Architect**: Cloud provider resource footprints (AWS, Azure, GCP), serverless, and IAM rules.
- **Infrastructure Architect**: IaC configurations (Terraform, Bicep, Pulumi), Helm charts, and container orchestration.
- **Data Architect**: Schema evolution, ORM mappings, data migration scripts, PII/GDPR data governance.
- **API Architect**: Contract clarity (REST, GraphQL, gRPC), versioning, idempotency, and OpenAPI quality.
- **Performance Engineer**: Memory profiling, thread pool allocations, async queue backpressure, and caching layers.
- **Reliability Engineer**: Resiliency patterns, circuit breakers, dead-letter queues, and retry mechanisms.
- **Compliance & Governance Specialist**: Licensing risk, GPL contamination, audit trails, and security policies.
- **Technical Documentation Specialist**: ADR records, README quality, onboarding docs, and documentation drift.
- **Technical Due-Diligence Consultant**: Consolidated executive scorecards, gap analysis, and modernization roadmaps.

---

## 🎯 Deterministic Execution Principles

### 1. Evidence First
Every conclusion **must** cite concrete repository evidence:
- Absolute or relative file path
- Specific line numbers (e.g., `src/auth.ts#L45-L60`)
- Manifest or config section references

### 2. Explicit Confidence Levels
Findings must state confidence level:
- **High (90–100%)**: Direct, unambiguous repository evidence.
- **Medium (60–89%)**: Inferred from multiple indirect file patterns.
- **Low (30–59%)**: Weak structural inference.
- **Unknown**: Evidence unavailable in repository.

### 3. Anti-Hallucination Guardrails
If evidence is absent, the system explicitly reports:
> **Status:** Not Verified  
> **Reason:** Insufficient repository evidence.

---

## 📑 26-Phase Assessment Checklist

```
Phase 1: Repository Discovery      ➔ Phase 2: Metadata Discovery     ➔ Phase 3: Architecture Discovery
Phase 4: Module Discovery          ➔ Phase 5: Build System Discovery ➔ Phase 6: Runtime Matrix
Phase 7: Dependency & SBOM         ➔ Phase 8: License Risk           ➔ Phase 9: Configuration Catalog
Phase 10: Data Architecture        ➔ Phase 11: API Assessment       ➔ Phase 12: Cloud Architecture
Phase 13: Infrastructure Blueprint  ➔ Phase 14: Security Assessment   ➔ Phase 15: Performance Assessment
Phase 16: Reliability Assessment   ➔ Phase 17: Operations Handbook   ➔ Phase 18: Testing Maturity
Phase 19: CI/CD Assessment         ➔ Phase 20: Documentation Quality➔ Phase 21: Version Drift
Phase 22: Enterprise Readiness     ➔ Phase 23: Gap Analysis          ➔ Phase 24: Recommendations
Phase 25: Production Readiness     ➔ Phase 26: Modernization Roadmap
```

---

## 🚀 How to Execute an Assessment

### Option A: Using Antigravity Agent Skill
Invoke the custom skill when interacting with the AI agent:
```text
Run an /enterprise-software-assessment on this repository and produce an evidence matrix.
```

### Option B: Exporting Codebase Review Package
1. Use Sentinel to generate a repository snapshot archive.
2. Upload the repository package alongside the `enterprise-software-assessment` prompt in your LLM tool of choice.

---

## 📊 Required Output Deliverables

1. Executive Summary & Project Profile
2. Inferred Architecture & Dependency Graph
3. Resolved SBOM & Dependency Vulnerability Report
4. License Risk Assessment (GPL Contamination Check)
5. Configuration Catalog & Secret Inventory
6. Security & Supply Chain Vulnerability Scorecard
7. Production Readiness Checklist (Pass/Fail)
8. Evidence Matrix with Line-by-Line Citations
9. 30/90/180-Day Modernization Roadmap
