# Sentinel EIIP Operational Runbook

This document details deployment, operations, maintenance, database management, and diagnostic procedures for the **Sentinel Enterprise Infrastructure Intelligence Platform (EIIP)**.

---

## 1. Quick Start & Deployment Options

### Option A: Local Development Mode (Vite + FastAPI)
1. **Frontend SPA**:
   ```bash
   npm install
   npm run dev
   ```
2. **Collector Daemon**:
   ```bash
   npm run daemon
   ```
3. **Backend API Gateway**:
   ```bash
   pip install -r requirements.txt
   uvicorn Phase2_Integration.Backend.main:app --reload --port 8000
   ```

### Option B: Docker Containerization (Production Stack)
```bash
docker-compose up --build -d
```
Services provided:
- **`sentinel-backend`**: FastAPI API Gateway on port `8000`
- **`sentinel-postgres`**: PostgreSQL Database on port `5432`
- **`sentinel-nats`**: NATS JetStream server on port `4222` / dashboard `8222`

---

## 2. Telemetry Harvesting & Daemon Management

### Installing as System Service
- **Windows Service (PowerShell)**:
  ```powershell
  pwsh ./collector/daemon/install-service.ps1
  ```
- **Linux (systemd)**:
  ```bash
  sudo ./collector/daemon/install-systemd.sh
  ```
- **macOS (LaunchAgent)**:
  ```bash
  ./collector/daemon/install-launchagent.sh
  ```

### Verifying Daemon Status
```bash
curl http://localhost:3001/api/v1/health
```

---

## 3. Database Schema Migrations & Backup

### Applying Migrations
SQL migration files reside in `migrations/`. Migrations apply automatically upon FastAPI backend startup. To run manually:
```bash
psql $DATABASE_URL -f migrations/20260607061717_init-schema.sql
psql $DATABASE_URL -f migrations/20260607173100_phase3-schema.sql
psql $DATABASE_URL -f migrations/20260607180000_phase4-workspace-schema.sql
```

### Database Backup & Restore
- **Backup**:
  ```bash
  pg_dump $DATABASE_URL -F c -b -v -f sentinel_backup.dump
  ```
- **Restore**:
  ```bash
  pg_restore -d $DATABASE_URL -v sentinel_backup.dump
  ```

---

## 4. Operational Diagnostics & Health Checks

- **API Gateway Health**: `GET http://localhost:8000/`
- **Prometheus Metrics**: `GET http://localhost:8000/metrics`
- **OpenAPI Documentation**: `http://localhost:8000/docs`
- **Release Quality Evaluator**:
  ```bash
  npm run test:evaluate
  ```

---

## 5. Security & Authentication Configuration

In production environments, ensure environment variables are set:
```env
DEVELOPMENT_MODE=false
DATABASE_URL=postgresql://user:pass@host:5432/dbname?sslmode=require
NATS_SERVERS=nats://localhost:4222
```
When `DEVELOPMENT_MODE=false`, unauthenticated dev bypasses are disabled, and JWT token signatures are verified.
