# Sentinel (EIIP) API Summary

## API Standards
- **Framework**: FastAPI (Python)
- **Protocol**: HTTP/REST for management and queries; WebSockets for real-time telemetry streaming and execution.
- **Port Mapping**: Defaults to `:8000` for API service, `:8080` for Keycloak proxy.

## Key Endpoints
1. **`/api/v1/assessments`**
   - `POST /`: Submit new assessment run (accepts inventory JSON).
   - `GET /`: List recent run histories.
   - `GET /{id}`: Fetch detailed metrics, findings, and risk scores.
2. **`/api/v1/topology`**
   - `GET /graph`: Returns nodes and edges in Graphology JSON format for React Flow.
3. **`/api/v1/remediations`**
   - `POST /plan`: Generate fix plan for specific findings.
   - `POST /execute`: Run approved remediation workflow (handled via Temporal).
