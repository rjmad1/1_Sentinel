# Sentinel (EIIP) Architecture Summary

## 1. Principles & Patterns
- **AP-01 Fleet-Capable First**: Cluster-wide deployment standard.
- **AP-02 Graph-Centric**: JanusGraph dependency structures dictate reasoning.
- **AP-03 Domain-Driven Design (DDD)**: 10 strictly separated bounded contexts.
- **AP-04 Event-Driven**: CloudEvents 1.0 specifications routed over NATS.
- **AP-05 Agnostic Core**: Collectors are external agents (PowerShell, osquery).

## 2. Component Core Tech
- **Frontend**: React, React Flow, Graphology.
- **Middleware**: FastAPI, Temporal (workflow orchestrator).
- **Messaging**: NATS.
- **Rules Engine**: Microsoft RulesEngine.
- **Data Layers**: PostgreSQL (relational/metadata) and JanusGraph (topology).
- **AI Layer**: LlamaIndex and LiteLLM (Graph RAG).
