import uuid
import json
import logging
import datetime
from fastapi import APIRouter, HTTPException, Depends
from ..db import db
from ..auth import get_current_user, UserPayload

logger = logging.getLogger("eiip-router-fleet")

router = APIRouter()

@router.get("/fleet/machines", status_code=200)
async def list_fleet_machines(user: UserPayload = Depends(get_current_user)):
    """
    Returns a summary list of all registered hosts in the fleet with their latest scores.
    """
    try:
        rows = await db.fetch("""
            SELECT DISTINCT ON (m.machine_id) 
                m.machine_id, m.computer_name, m.platform, m.os_caption, m.os_version, m.tenant_id,
                ds.id as assessment_id, ds.overall_health_score, ds.created_at as last_assessed
            FROM machines m
            LEFT JOIN domain_scores ds ON m.machine_id = ds.machine_id AND ds.tenant_id = m.tenant_id
            WHERE m.tenant_id = $1
            ORDER BY m.machine_id, ds.created_at DESC
        """, user.tenant_id)
        
        machines_list = []
        for r in rows:
            crit_count = await db.fetchval("SELECT COUNT(*) FROM findings WHERE machine_id = $1 AND severity = 'Critical'", r["machine_id"])
            high_count = await db.fetchval("SELECT COUNT(*) FROM findings WHERE machine_id = $1 AND severity = 'High'", r["machine_id"])
            warn_count = await db.fetchval("SELECT COUNT(*) FROM findings WHERE machine_id = $1 AND (severity = 'Warning' OR severity = 'Medium')", r["machine_id"])
            
            machines_list.append({
                "MachineId": str(r["machine_id"]),
                "ComputerName": r["computer_name"],
                "Platform": r["platform"],
                "OSName": r["os_caption"] or "Unknown OS",
                "OSVersion": r["os_version"] or "Unknown",
                "LastAssessed": r["last_assessed"].isoformat() if r.get("last_assessed") and hasattr(r["last_assessed"], "isoformat") else (str(r["last_assessed"]) if r.get("last_assessed") else None),
                "OverallHealth": r["overall_health_score"] if r["overall_health_score"] is not None else 100.0,
                "CriticalFindings": crit_count,
                "HighFindings": high_count,
                "WarningFindings": warn_count
            })
        return machines_list
    except Exception as e:
        logger.error(f"Failed to query fleet machines: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Database select error: {str(e)}")

@router.get("/findings/{machine_id}", status_code=200)
async def get_machine_findings(machine_id: str, user: UserPayload = Depends(get_current_user)):
    """
    Retrieves findings for a specific machine ID.
    """
    try:
        try:
            uuid_val = uuid.UUID(machine_id)
            rows = await db.fetch("SELECT id, finding_id, severity, title, description, remediation, status FROM findings WHERE machine_id = $1 AND tenant_id = $2", uuid_val, user.tenant_id)
        except ValueError:
            rows = await db.fetch("SELECT id, finding_id, severity, title, description, remediation, status FROM findings WHERE tenant_id = $1", user.tenant_id)
        return [
            {
                "id": str(r["id"]),
                "finding_id": r.get("finding_id", "SEC-001"),
                "machine_id": machine_id,
                "severity": r.get("severity", "Warning"),
                "title": r.get("title", "Finding Title"),
                "description": r.get("description", ""),
                "remediation": r.get("remediation", ""),
                "status": r.get("status", "open")
            }
            for r in rows
        ]
    except Exception as e:
        logger.error(f"Failed to fetch machine findings: {e}")
        return []
