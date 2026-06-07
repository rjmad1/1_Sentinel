# Sentinel (EIIP) API Summary

## API Standards
- **Framework**: FastAPI (Python)
- **Protocol**: HTTP/REST for management and queries; WebSockets/NATS for real-time telemetry streaming and execution.
- **Port Mapping**: Defaults to `:8000` for API gateway service.

## Core v2 API Endpoints

### 📡 Telemetry & Ingestion
* **`POST /api/v2/discovery/upload`**: Telemetry Ingest API. Accepts raw Windows/Linux/macOS telemetry configurations. Runs asynchronous assessment, updates database, and streams real-time status.
* **`POST /api/v2/migrate/import`**: Legacy JSON Migration API. Normalizes legacy assessment reports into Postgres.
* **`POST /api/v2/assessments/purge`**: Database Purge. restricted to `admin` role. Clears all fleet tables, policies, and runs history.

### 📊 Assessments & Fleet Queries
* **`GET /api/v2/assessments`**: Queries historical timeline profiles of all assessment runs.
* **`GET /api/v2/assessments/{assessment_id}`**: Retrieves complete details of a specific assessment run.
* **`DELETE /api/v2/assessments/{assessment_id}`**: Prunes an assessment run (Admin restricted).
* **`GET /api/v2/fleet/machines`**: Returns registered network hosts with active health grades.
* **`GET /api/v2/fleet/analytics`**: Aggregated fleet capacity footprints, EOL software, and 30-day timeline curves.

### 🔮 Capacity Forecasting & Predictions
* **`GET /api/v2/assessments/forecast/{machine_id}`**: Computes polynomial regression models to project 30/90/180/365-day capacity saturation thresholds for storage, memory, and CPU.

### 🛡️ Closed-Loop Self-Healing
* **`GET /api/v2/self-healing/policies`**: Returns list of all defined findings IDs mapped to their enabled states and execution mode (`autonomous` or `approval_gated`).
* **`POST /api/v2/self-healing/policies`**: Creates or toggles execution mode configurations for self-healing findings.
* **`GET /api/v2/self-healing/runs`**: Queries recorded autonomous execution run logs.

### 🔍 Threat Intelligence & CVE Correlation
* **`GET /api/v2/fleet/vulnerabilities`**: Correlates fleet software catalogs against known security CVE vulnerability catalogs (e.g. CVE-2023-27043) and returns details of active exposures.
