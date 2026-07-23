import uuid
import json
import logging
import datetime
from fastapi import APIRouter, HTTPException, Depends, Request
from ..db import db
from ..auth import get_current_user, UserPayload

logger = logging.getLogger("eiip-router-assessments")

router = APIRouter()

@router.post("/assessments", status_code=201)
async def create_assessment(data: dict, user: UserPayload = Depends(get_current_user)):
    """
    Saves a consolidated assessment report JSON directly to PostgreSQL.
    """
    try:
        from ..endpoints import save_consolidated_assessment
        machine_uuid, assessment_id = await save_consolidated_assessment(data, user.tenant_id)
        return {
            "status": "success",
            "message": "Assessment report successfully stored in PostgreSQL.",
            "assessment_id": str(assessment_id),
            "machine_uuid": str(machine_uuid)
        }
    except Exception as e:
        logger.error(f"Failed to save assessment to database: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Database insert error: {str(e)}")

@router.get("/assessments", status_code=200)
async def list_assessments(user: UserPayload = Depends(get_current_user)):
    """
    Queries PostgreSQL to return a historical timeline of all assessment runs.
    """
    try:
        rows = await db.fetch("""
            SELECT ds.id, ds.created_at, ds.overall_health_score, ds.performance_score, 
                   ds.security_score, ds.reliability_score, ds.scalability_score, 
                   ds.serviceability_score, ds.usability_score, m.computer_name, m.os_caption
            FROM domain_scores ds
            JOIN machines m ON ds.machine_id = m.machine_id
            WHERE ds.tenant_id = $1
            ORDER BY ds.created_at DESC
        """, user.tenant_id)
        
        assessments_list = []
        for r in rows:
            assessments_list.append({
                "AssessmentId": str(r["id"]),
                "Timestamp": r["created_at"].isoformat() if isinstance(r["created_at"], datetime.datetime) else str(r["created_at"]),
                "ComputerName": r["computer_name"],
                "OSName": r["os_caption"],
                "OverallHealth": r["overall_health_score"],
                "Performance": r["performance_score"],
                "Security": r["security_score"],
                "Reliability": r["reliability_score"],
                "Scalability": r["scalability_score"],
                "Serviceability": r["serviceability_score"],
                "Usability": r["usability_score"]
            })
        return assessments_list
    except Exception as e:
        logger.error(f"Failed to query assessments list: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Database select error: {str(e)}")

@router.get("/assessments/{assessment_id}", status_code=200)
async def get_assessment(assessment_id: str, user: UserPayload = Depends(get_current_user)):
    """
    Retrieves the complete consolidated assessment report JSON for a specific run.
    """
    try:
        uuid_val = uuid.UUID(assessment_id)
        row = await db.fetchrow("""
            SELECT data FROM domain_scores 
            WHERE id = $1 AND tenant_id = $2
        """, uuid_val, user.tenant_id)
        
        if not row:
            raise HTTPException(status_code=404, detail="Assessment record not found.")
            
        return json.loads(row["data"])
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid assessment ID format.")
    except Exception as e:
        logger.error(f"Failed to retrieve assessment details: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Database select error: {str(e)}")

@router.delete("/assessments/{assessment_id}", status_code=200)
async def delete_assessment(assessment_id: str, user: UserPayload = Depends(get_current_user)):
    """
    Prunes an assessment run. Restricted to users with 'admin' role. Record audit log.
    """
    if not user.has_role("admin"):
        raise HTTPException(status_code=403, detail="Pruning database reports is restricted to Administrators.")
    try:
        uuid_val = uuid.UUID(assessment_id)
        row = await db.fetchrow("SELECT id FROM domain_scores WHERE id = $1 AND tenant_id = $2", uuid_val, user.tenant_id)
        if not row:
            raise HTTPException(status_code=404, detail="Assessment record not found or access denied.")
            
        await db.execute("DELETE FROM domain_scores WHERE id = $1", uuid_val)
        await db.record_audit_log("DELETE_ASSESSMENT", user.username, {"assessment_id": assessment_id}, user.tenant_id)
        return {"status": "success", "message": "Assessment record successfully deleted."}
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid assessment ID format.")
    except Exception as e:
        logger.error(f"Failed to delete assessment record: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Database delete error: {str(e)}")

@router.post("/assessments/purge", status_code=200)
async def purge_database(user: UserPayload = Depends(get_current_user)):
    """
    Purges all tables owned by tenant. Restricted to Administrator role. Records immutable audit entry.
    """
    if not user.has_role("admin"):
        raise HTTPException(status_code=403, detail="Purging tables is restricted to Administrators.")
    try:
        await db.execute("DELETE FROM remediation_plans WHERE tenant_id = $1", user.tenant_id)
        await db.execute("DELETE FROM findings WHERE tenant_id = $1", user.tenant_id)
        await db.execute("DELETE FROM domain_scores WHERE tenant_id = $1", user.tenant_id)
        await db.execute("DELETE FROM machines WHERE tenant_id = $1", user.tenant_id)
        await db.execute("DELETE FROM self_healing_policies WHERE tenant_id = $1", user.tenant_id)
        await db.execute("DELETE FROM self_healing_runs WHERE tenant_id = $1", user.tenant_id)
        await db.record_audit_log("PURGE_DATABASE", user.username, {"action": "FULL_PURGE"}, user.tenant_id)
        return {"status": "success", "message": "Database tables purged successfully for your tenant."}
    except Exception as e:
        logger.error(f"Failed to purge database: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Database purge error: {str(e)}")
