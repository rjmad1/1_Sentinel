import os
import logging
import asyncpg
import re
import datetime
import json
from dotenv import load_dotenv

# Ensure environment variables are loaded
load_dotenv()

logger = logging.getLogger("eiip-db")

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/insforge"
)

class Database:
    def __init__(self):
        self.pool = None
        self.machines = {}
        self.findings = {}
        self.policies = {}
        self.domain_scores = {}

    async def connect(self):
        if self.pool is not None:
            return
        try:
            logger.info("Initializing PostgreSQL database connection pool...")
            self.pool = await asyncpg.create_pool(DATABASE_URL, command_timeout=5, timeout=5)
            logger.info("PostgreSQL database connection pool initialized successfully.")
            await self._init_schema()
        except Exception as e:
            logger.warning(f"Failed to create database connection pool: {e}. Operating with in-memory fallback state.")
            self.pool = None

    async def _init_schema(self):
        if not self.pool:
            return
        try:
            async with self.pool.acquire() as conn:
                await conn.execute("""
                CREATE TABLE IF NOT EXISTS machines (
                    machine_id VARCHAR PRIMARY KEY,
                    computer_name VARCHAR,
                    domain VARCHAR,
                    platform VARCHAR,
                    architecture VARCHAR,
                    hypervisor VARCHAR,
                    bios_serial VARCHAR,
                    mac_address VARCHAR,
                    os_caption VARCHAR,
                    os_version VARCHAR,
                    os_install_date VARCHAR,
                    os_last_boot_time VARCHAR,
                    logical_cores INT,
                    physical_processors INT,
                    total_memory_gb DOUBLE PRECISION,
                    free_memory_gb DOUBLE PRECISION,
                    tenant_id VARCHAR DEFAULT 'default-tenant',
                    site_id VARCHAR DEFAULT 'default-site',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
                CREATE TABLE IF NOT EXISTS domain_scores (
                    id VARCHAR PRIMARY KEY,
                    machine_id VARCHAR,
                    performance_score DOUBLE PRECISION,
                    security_score DOUBLE PRECISION,
                    reliability_score DOUBLE PRECISION,
                    scalability_score DOUBLE PRECISION,
                    serviceability_score DOUBLE PRECISION,
                    usability_score DOUBLE PRECISION,
                    overall_health_score DOUBLE PRECISION,
                    data JSONB,
                    tenant_id VARCHAR DEFAULT 'default-tenant',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
                CREATE TABLE IF NOT EXISTS findings (
                    id VARCHAR PRIMARY KEY,
                    machine_id VARCHAR,
                    assessment_id VARCHAR,
                    finding_id VARCHAR,
                    category VARCHAR,
                    domain VARCHAR,
                    severity VARCHAR,
                    confidence VARCHAR,
                    priority INT,
                    title VARCHAR,
                    description TEXT,
                    evidence JSONB,
                    impact TEXT,
                    business_risk TEXT,
                    root_cause_hypothesis TEXT,
                    recommended_remediation TEXT,
                    estimated_effort VARCHAR,
                    verification_method VARCHAR,
                    status VARCHAR DEFAULT 'open',
                    tenant_id VARCHAR DEFAULT 'default-tenant',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
                CREATE TABLE IF NOT EXISTS self_healing_policies (
                    finding_id VARCHAR PRIMARY KEY,
                    enabled BOOLEAN DEFAULT FALSE,
                    execution_mode VARCHAR DEFAULT 'autonomous',
                    tenant_id VARCHAR DEFAULT 'default-tenant',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
                CREATE TABLE IF NOT EXISTS self_healing_runs (
                    id VARCHAR PRIMARY KEY,
                    machine_id VARCHAR,
                    finding_id VARCHAR,
                    status VARCHAR,
                    error_message TEXT,
                    stdout TEXT,
                    stderr TEXT,
                    computer_name VARCHAR,
                    vss_snapshot_id VARCHAR,
                    tenant_id VARCHAR DEFAULT 'default-tenant',
                    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
                CREATE TABLE IF NOT EXISTS vulnerabilities (
                    cve_id VARCHAR PRIMARY KEY,
                    package_name VARCHAR,
                    version_pattern VARCHAR,
                    severity VARCHAR,
                    cvss_score DOUBLE PRECISION,
                    summary TEXT,
                    remediation_suggestion TEXT,
                    tenant_id VARCHAR DEFAULT 'default-tenant',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
                CREATE TABLE IF NOT EXISTS audit_logs (
                    id VARCHAR PRIMARY KEY,
                    action VARCHAR NOT NULL,
                    actor VARCHAR NOT NULL,
                    details JSONB,
                    tenant_id VARCHAR DEFAULT 'default-tenant',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
                INSERT INTO vulnerabilities (cve_id, package_name, version_pattern, severity, cvss_score, summary, remediation_suggestion)
                VALUES 
                ('CVE-2023-27043', 'Python', '<3.11.5', 'High', 7.5, 'Email address parsing vulnerability in email.utils.parseaddr.', 'Upgrade to Python 3.11.5 or newer.'),
                ('CVE-2023-32002', 'Node.js', '<20.5.0', 'Medium', 6.5, 'Permission model bypass via module.constructor.createRequire().', 'Upgrade Node.js to version 20.5.0 or newer.'),
                ('CVE-2023-29007', 'Git', '<2.41.0.3', 'High', 8.1, 'Arbitrary configuration injection via git submodule deinit.', 'Upgrade Git to version 2.41.0.3 or newer.'),
                ('CVE-2023-44487', 'Nginx', '<1.25.3', 'High', 7.5, 'HTTP/2 Rapid Reset DDoS vulnerability (flood of stream resets).', 'Upgrade Nginx to version 1.25.3 or newer.')
                ON CONFLICT (cve_id) DO NOTHING;
                """)
        except Exception as e:
            logger.warning(f"Schema initialization warning: {e}")

    async def record_audit_log(self, action: str, actor: str, details: dict = None, tenant_id: str = "default-tenant"):
        import uuid
        import json
        log_id = str(uuid.uuid4())
        details_json = json.dumps(details or {})
        try:
            await self.execute("""
                INSERT INTO audit_logs (id, action, actor, details, tenant_id)
                VALUES ($1, $2, $3, $4, $5)
            """, log_id, action, actor, details_json, tenant_id)
        except Exception as e:
            logger.error(f"Failed to record audit log: {e}")

    async def close(self):
        if self.pool:
            logger.info("Closing PostgreSQL database connection pool...")
            try:
                await self.pool.close()
            except Exception:
                pass
            self.pool = None
            logger.info("PostgreSQL database connection pool closed.")

    async def fetch(self, query: str, *args):
        if self.pool:
            try:
                async with self.pool.acquire() as conn:
                    return await conn.fetch(query, *args)
            except Exception as e:
                logger.error(f"Database fetch error: {e}")
                if os.getenv("DEVELOPMENT_MODE", "false").lower() != "true":
                    raise e
        if os.getenv("DEVELOPMENT_MODE", "false").lower() != "true" and not self.pool:
            raise RuntimeError("Database pool unavailable")
        # In-memory query simulation for isolated testing environment
        q_lower = query.lower()
        if re.search(r"from\s+machines", q_lower):
            return [
                {
                    "machine_id": m["machine_id"],
                    "MachineId": str(m["machine_id"]),
                    "computer_name": m.get("computer_name", "UNKNOWN"),
                    "ComputerName": m.get("computer_name", "UNKNOWN"),
                    "platform": m.get("platform", "Windows"),
                    "Platform": m.get("platform", "Windows"),
                    "architecture": m.get("architecture", "x64"),
                    "logical_cores": m.get("logical_cores", 4),
                    "total_memory_gb": m.get("total_memory_gb", 8.0),
                    "free_memory_gb": m.get("free_memory_gb", 4.0),
                    "os_caption": m.get("os_caption", "Linux OS"),
                    "os_version": m.get("os_version", "22.04"),
                    "last_assessed": None,
                    "overall_health_score": 100.0,
                    "tenant_id": m.get("tenant_id", "default-tenant")
                }
                for m in self.machines.values()
            ]

        if re.search(r"from\s+domain_scores", q_lower):
            return list(self.domain_scores.values())
        if re.search(r"from\s+findings", q_lower):
            return list(self.findings.values())
        if re.search(r"from\s+self_healing_policies", q_lower):
            return [
                {"finding_id": k, "policy_id": k, "enabled": v.get("enabled", False), "execution_mode": v.get("execution_mode", "approval_gated")}
                for k, v in self.policies.items()
            ]
        return []

    async def fetchrow(self, query: str, *args):
        if self.pool:
            try:
                async with self.pool.acquire() as conn:
                    return await conn.fetchrow(query, *args)
            except Exception as e:
                logger.error(f"Database fetchrow error: {e}")
                if os.getenv("DEVELOPMENT_MODE", "false").lower() != "true":
                    raise e
        if os.getenv("DEVELOPMENT_MODE", "false").lower() != "true" and not self.pool:
            raise RuntimeError("Database pool unavailable")
        q_lower = query.lower()
        if re.search(r"from\s+machines", q_lower) and args:
            m_id = str(args[0])
            m = self.machines.get(m_id)
            if m:
                return {
                    "machine_id": m["machine_id"],
                    "computer_name": m.get("computer_name", "UNKNOWN"),
                    "platform": m.get("platform", "Windows"),
                    "architecture": m.get("architecture", "x64"),
                    "logical_cores": m.get("logical_cores", 4),
                    "total_memory_gb": m.get("total_memory_gb", 8.0)
                }
        return None

    async def executemany(self, query: str, args_list: list):
        if not args_list:
            return "INSERT 0 0"
        if self.pool:
            try:
                async with self.pool.acquire() as conn:
                    return await conn.executemany(query, args_list)
            except Exception as e:
                logger.error(f"Database executemany error: {e}")
                if os.getenv("DEVELOPMENT_MODE", "false").lower() != "true":
                    raise e
        if os.getenv("DEVELOPMENT_MODE", "false").lower() != "true" and not self.pool:
            raise RuntimeError("Database pool unavailable")
        for args in args_list:
            await self.execute(query, *args)
        return f"INSERT 0 {len(args_list)}"

    async def execute(self, query: str, *args):
        if self.pool:
            try:
                async with self.pool.acquire() as conn:
                    return await conn.execute(query, *args)
            except Exception as e:
                logger.error(f"Database execute error: {e}")
                if os.getenv("DEVELOPMENT_MODE", "false").lower() != "true":
                    raise e
        if os.getenv("DEVELOPMENT_MODE", "false").lower() != "true" and not self.pool:
            raise RuntimeError("Database pool unavailable")
        
        q_lower = query.lower()
        if "delete from machines" in q_lower:
            self.machines.clear()
            return "DELETE 0"
        if "delete from findings" in q_lower:
            self.findings.clear()
            return "DELETE 0"
        if "delete from self_healing_policies" in q_lower:
            self.policies.clear()
            return "DELETE 0"
        if "assessments/purge" in q_lower or "truncate" in q_lower or ("delete from" in q_lower and "domain_scores" in q_lower):
            self.machines.clear()
            self.findings.clear()
            self.policies.clear()
            self.domain_scores.clear()
            return "DELETE 0"
            
        if re.search(r"insert\s+into\s+machines", q_lower) and args:
            machine_id = str(args[0])
            computer_name = args[1] if len(args) > 1 else "UNKNOWN"
            self.machines[machine_id] = {
                "machine_id": machine_id,
                "computer_name": computer_name,
                "platform": args[3] if len(args) > 3 else "Windows",
                "architecture": args[4] if len(args) > 4 else "x64",
                "logical_cores": args[12] if len(args) > 12 else 4,
                "total_memory_gb": args[14] if len(args) > 14 else 8.0,
                "free_memory_gb": args[15] if len(args) > 15 else 4.0
            }
            return "INSERT 0 1"

        if re.search(r"insert\s+into\s+domain_scores", q_lower) and args:
            ds_id = str(args[0])
            machine_id = str(args[1]) if len(args) > 1 else ""
            data_val = args[9] if len(args) > 9 else "{}"
            self.domain_scores[ds_id] = {
                "id": ds_id,
                "machine_id": machine_id,
                "created_at": datetime.datetime.now(datetime.timezone.utc),
                "overall_health_score": args[8] if len(args) > 8 else 100.0,
                "performance_score": args[2] if len(args) > 2 else 100.0,
                "security_score": args[3] if len(args) > 3 else 100.0,
                "reliability_score": args[4] if len(args) > 4 else 100.0,
                "scalability_score": args[5] if len(args) > 5 else 100.0,
                "serviceability_score": args[6] if len(args) > 6 else 100.0,
                "usability_score": args[7] if len(args) > 7 else 100.0,
                "data": data_val if isinstance(data_val, str) else json.dumps(data_val),
                "tenant_id": args[10] if len(args) > 10 else "default-tenant"
            }
            return "INSERT 0 1"

        if re.search(r"insert\s+into\s+findings", q_lower) and args:
            f_id = str(args[0])
            self.findings[f_id] = {
                "id": f_id,
                "finding_id": args[1] if len(args) > 1 else f_id,
                "machine_id": str(args[2]) if len(args) > 2 else "",
                "severity": args[3] if len(args) > 3 else "Warning",
                "title": args[4] if len(args) > 4 else "System Finding",
                "description": args[5] if len(args) > 5 else "",
                "remediation": args[6] if len(args) > 6 else "",
                "status": "open",
                "tenant_id": "default-tenant"
            }
            return "INSERT 0 1"

        if re.search(r"self_healing_policies", q_lower):
            if len(args) >= 2:
                p_id = str(args[0])
                self.policies[p_id] = {"enabled": bool(args[1]), "execution_mode": args[2] if len(args) > 2 else "approval_gated"}
            return "INSERT 0 1"
            
        return "SELECT 0"

    async def fetchval(self, query: str, *args):
        if self.pool:
            try:
                async with self.pool.acquire() as conn:
                    return await conn.fetchval(query, *args)
            except Exception as e:
                logger.error(f"Database fetchval error: {e}")
        return None

db = Database()

