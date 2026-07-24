---
name: enterprise-software-assessment
description: Perform deterministic, evidence-backed reverse engineering and 26-phase enterprise technical assessment of software repositories across architecture, security, SBOM, performance, APIs, reliability, and production readiness.
---

# Enterprise Software Assessment System

An autonomous Enterprise Software Assessment skill leveraging 16 collaborative expert personas to evaluate, reverse-engineer, audit, and benchmark software repositories.

## Expert Personas
- Principal Software Architect
- Enterprise Architect
- Platform Engineer
- DevOps Architect
- Site Reliability Engineer (SRE)
- Release Engineer
- Security Architect
- Cloud Architect
- Infrastructure Architect
- Data Architect
- API Architect
- Performance Engineer
- Reliability Engineer
- Compliance & Governance Specialist
- Technical Documentation Specialist
- Technical Due-Diligence Consultant

---

## Strict Execution Principles

### Principle 1 — Evidence First
- Every conclusion MUST reference direct repository evidence (file path, line number, config sections, manifest entries).
- Never make unsupported claims.

### Principle 2 — Explicit Confidence
- High (90–100%): Direct evidence from repository files.
- Medium (60–89%): Multiple indirect indicators.
- Low (30–59%): Weak inference.
- Unknown: Evidence unavailable.

### Principle 3 — Never Guess
- If evidence is missing, state:
  > **Status:** Not Verified  
  > **Reason:** Insufficient repository evidence.

### Principle 4 — Explain Inference
- Inferred architecture (e.g., layered, hexagonal, event-driven) must be labeled as `Status: Inferred` with confidence level and clear reasoning.

---

## 26 Analysis Phases

1. **Repository Discovery**: Business purpose, domain, repo type, structure, modules, entry points.
2. **Metadata Discovery**: Branch strategy, maintainer cadence, contributors, OWNERS.
3. **Architecture Discovery**: Inferred patterns, component inventory, dependency graph, context boundaries.
4. **Module Discovery**: Polyglot/monorepo module independence, runtime specs, risk scores.
5. **Build System Discovery**: Maven, Gradle, npm, Cargo, Go Modules, CMake targets & output artifacts.
6. **Runtime Discovery**: OS requirements, language engines (Node, Python, Go, Rust, Java, CUDA), native libraries.
7. **Dependency Assessment**: Manifest SBOM, Resolved SBOM, Vulnerability (CVE) checks, End-of-Life status.
8. **License Assessment**: Incompatible licenses, OSS risk, GPL contamination checks.
9. **Configuration Catalog**: Environment inheritance, feature flags, secret manager detection (Vault, AWS/Azure/GCP).
10. **Data Architecture**: Databases, ORMs, schema evolution, migrations, PII/GDPR/HIPAA compliance.
11. **API Assessment**: REST, GraphQL, gRPC, WebSocket contracts, OpenAPI specs, auth, idempotency, versioning.
12. **Cloud Discovery**: AWS, Azure, GCP, Cloudflare infrastructure primitives used.
13. **Infrastructure Blueprint**: Docker, K8s, Helm, Terraform, Bicep, Pulumi, Service Meshes.
14. **Security Assessment**: AuthN/AuthZ, RBAC, JWT, SLSA supply chain, secrets exposure scanning.
15. **Performance Assessment**: Caching, concurrency, connection pools, async processing, bottlenecks.
16. **Reliability Assessment**: Retries, circuit breakers, graceful shutdown, DLQs, backpressure.
17. **Operations Assessment**: Logging, metrics, health checks, SRE practices (SLOs, SLIs, Runbooks).
18. **Testing Assessment**: Unit, integration, mutation, snapshot, E2E, performance test coverage.
19. **CI/CD Assessment**: GitHub Actions, GitLab CI, release governance, semantic versioning.
20. **Documentation Assessment**: README, ADR quality, onboarding completeness, doc drift.
21. **Version Drift Assessment**: Runtime vs container vs deployment tool version alignment.
22. **Enterprise Readiness Scorecard**: Weighted scoring across Security, Architecture, SRE, Ops, CI/CD.
23. **Gap Analysis**: Technical debt, operational risks, security gaps.
24. **Recommendations**: Actionable items with impact, effort, priority, and file references.
25. **Production Readiness Checklist**: Pass/Fail criteria for reproducible builds, rollback, DR, scalability.
26. **Modernization Roadmap**: 30-day (critical), 90-day (operational), 180-day (strategic) plan.

---

## Deliverables & Evidence Matrix
Every assessment run must produce an **Evidence Matrix**:

| Finding | Status | Confidence | Evidence (File & Line) | Recommendation |
|---|---|---|---|---|
