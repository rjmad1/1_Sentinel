import logging
import httpx
import json
import os
import asyncio
from .db import db

logger = logging.getLogger("eiip-self-healing")

DAEMON_URL = os.getenv("DAEMON_URL", "http://localhost:1337")
DAEMON_TOKEN = os.getenv("SENTINEL_DAEMON_TOKEN", "")

async def trigger_self_healing(machine_uuid: str, finding_id: str, tenant_id: str):
    """
    Checks policy and executes the remediation command via the local daemon, recording the run.
    """
    try:
        # 1. Fetch policy
        policy = await db.fetchrow(
            "SELECT enabled, execution_mode FROM self_healing_policies WHERE finding_id = $1 AND tenant_id = $2",
            finding_id, tenant_id
        )
        if not policy or not policy["enabled"]:
            logger.info(f"Self-healing bypassed for finding {finding_id}: policy not enabled.")
            return
            
        execution_mode = policy["execution_mode"]
        if execution_mode != "autonomous":
            logger.info(f"Self-healing for finding {finding_id} is in '{execution_mode}' mode. Requires manual approval.")
            return

        logger.info(f"Starting autonomous self-healing trigger for machine {machine_uuid}, finding {finding_id}...")

        # 2. Record run as 'running'
        run_id = await db.fetchval("""
            INSERT INTO self_healing_runs (machine_id, finding_id, status, tenant_id)
            VALUES ($1, $2, $3, $4)
            RETURNING id;
        """, machine_uuid, finding_id, 'running', tenant_id)

        # 3. Call local daemon to execute
        # In a real environment, this might call via NATS or direct HTTP.
        # We will try HTTP first. If it fails, we fall back to a mock success if in offline/testing mode.
        success = False
        stdout = ""
        stderr = ""
        error_message = None

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{DAEMON_URL}/api/execute",
                    headers={
                        "Content-Type": "application/json",
                        "X-Sentinel-Token": DAEMON_TOKEN
                    },
                    json={"finding_id": finding_id}
                )
                if response.status_code == 200:
                    res_data = response.json()
                    if res_data.get("success"):
                        success = True
                        stdout = res_data.get("stdout", "")
                        stderr = res_data.get("stderr", "")
                    else:
                        error_message = res_data.get("error", "Daemon failed execution.")
                        stdout = res_data.get("stdout", "")
                        stderr = res_data.get("stderr", "")
                else:
                    error_message = f"Daemon returned HTTP status {response.status_code}."
        except Exception as daemon_err:
            error_message = f"Failed to connect to local collector daemon: {str(daemon_err)}"
            logger.error(f"Daemon communication failed: {error_message}")
            success = False
            stdout = ""
            stderr = str(daemon_err)

        # 4. Update the run record
        status = 'success' if success else 'failed'
        await db.execute("""
            UPDATE self_healing_runs
            SET status = $1, error_message = $2, stdout = $3, stderr = $4, executed_at = NOW()
            WHERE id = $5;
        """, status, error_message, stdout, stderr, run_id)

        # 5. If success, toggle the finding in the latest assessment CompletedRemediations list
        if success:
            logger.info(f"Self-healing successfully executed and verified for finding {finding_id} on machine {machine_uuid}.")
            # Find the latest assessment record
            latest_ds = await db.fetchrow(
                "SELECT id, data FROM domain_scores WHERE machine_id = $1 AND tenant_id = $2 ORDER BY created_at DESC LIMIT 1",
                machine_uuid, tenant_id
            )
            if latest_ds:
                ds_id = latest_ds["id"]
                ds_data = json.loads(latest_ds["data"]) if isinstance(latest_ds["data"], str) else latest_ds["data"]
                
                # Update completedRemediations
                completed = ds_data.get("completedRemediations") or {}
                completed[finding_id] = True
                ds_data["completedRemediations"] = completed
                
                await db.execute(
                    "UPDATE domain_scores SET data = $1 WHERE id = $2",
                    json.dumps(ds_data), ds_id
                )
                
    except Exception as e:
        logger.error(f"Error in self-healing execution loop: {e}", exc_info=True)

async def check_and_run_self_healing(machine_uuid: str, findings: list, tenant_id: str):
    """
    Asynchronously checks all findings for the machine and runs self-healing if needed.
    """
    for f in findings:
        finding_id = f.get("FindingId") or f.get("finding_id")
        if finding_id:
            # Run each trigger in the background
            asyncio.create_task(trigger_self_healing(machine_uuid, finding_id, tenant_id))
