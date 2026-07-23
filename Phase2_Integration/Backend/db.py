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
    "postgresql://postgres:48c2eb0044739942911b123eb476e6fb@ba47g6qs.ap-southeast.database.insforge.app:5432/insforge?sslmode=require"
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
        except Exception as e:
            logger.warning(f"Failed to create database connection pool: {e}. Operating with in-memory fallback state.")
            self.pool = None

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
        # In-memory query simulation for testing
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

    async def execute(self, query: str, *args):
        if self.pool:
            try:
                async with self.pool.acquire() as conn:
                    return await conn.execute(query, *args)
            except Exception as e:
                logger.error(f"Database execute error: {e}")
        
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

