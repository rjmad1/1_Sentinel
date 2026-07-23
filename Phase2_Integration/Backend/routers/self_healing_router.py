import logging
from fastapi import APIRouter, HTTPException, Depends
from ..db import db
from ..auth import get_current_user, UserPayload

logger = logging.getLogger("eiip-router-self-healing")

router = APIRouter()

@router.get("/self-healing/policies", status_code=200)
async def get_self_healing_policies(user: UserPayload = Depends(get_current_user)):
    """
    Returns active self-healing policies or toggles for specified findings.
    """
    try:
        rows = await db.fetch("SELECT finding_id, enabled, execution_mode FROM self_healing_policies WHERE tenant_id = $1", user.tenant_id)
        policies = {r["finding_id"]: {"enabled": r["enabled"], "execution_mode": r["execution_mode"]} for r in rows}
        
        default_findings = ['SEC-FW-001', 'SEC-DEF-001', 'PERF-DISKFREE-C', 'REL-SVC-001']
        for f_id in default_findings:
            if f_id not in policies:
                policies[f_id] = {"enabled": False, "execution_mode": "autonomous"}
                
        return policies
    except Exception as e:
        logger.error(f"Failed to fetch self-healing policies: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Database query error: {str(e)}")

@router.post("/self-healing/policies", status_code=200)
async def update_self_healing_policy(policy: dict, user: UserPayload = Depends(get_current_user)):
    """
    Saves or toggles a self-healing policy execution mode.
    """
    try:
        finding_id = policy.get("finding_id")
        enabled = bool(policy.get("enabled", False))
        execution_mode = policy.get("execution_mode", "autonomous")
        
        if not finding_id:
            raise HTTPException(status_code=400, detail="Missing finding_id.")
            
        await db.execute("""
            INSERT INTO self_healing_policies (finding_id, enabled, execution_mode, tenant_id, updated_at)
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (finding_id) DO UPDATE SET
                enabled = EXCLUDED.enabled,
                execution_mode = EXCLUDED.execution_mode,
                updated_at = NOW();
        """, finding_id, enabled, execution_mode, user.tenant_id)
        
        await db.record_audit_log("UPDATE_SELF_HEALING_POLICY", user.username, policy, user.tenant_id)
        return {"status": "success", "message": "Policy updated successfully."}
    except Exception as e:
        logger.error(f"Failed to update self-healing policy: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Database update error: {str(e)}")

@router.get("/self-healing/runs", status_code=200)
async def get_self_healing_runs(user: UserPayload = Depends(get_current_user)):
    """
    Queries recorded self-healing audit executions from the database.
    """
    try:
        rows = await db.fetch("""
            SELECT r.id, r.machine_id, r.finding_id, r.status, r.error_message, r.stdout, r.stderr, r.executed_at, m.computer_name
            FROM self_healing_runs r
            JOIN machines m ON r.machine_id = m.machine_id
            WHERE r.tenant_id = $1
            ORDER BY r.executed_at DESC
            LIMIT 100
        """, user.tenant_id)
        
        runs = []
        for r in rows:
            runs.append({
                "id": str(r["id"]),
                "machine_id": str(r["machine_id"]),
                "computer_name": r["computer_name"],
                "finding_id": r["finding_id"],
                "status": r["status"],
                "error_message": r["error_message"],
                "stdout": r["stdout"],
                "stderr": r["stderr"],
                "executed_at": r["executed_at"].isoformat() if r["executed_at"] else None
            })
        return runs
    except Exception as e:
        logger.error(f"Failed to fetch self-healing runs: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Database query error: {str(e)}")
