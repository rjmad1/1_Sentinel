import uuid
import logging
from fastapi import APIRouter, HTTPException, Depends, Request
from ..models import TelemetryPayload
from ..nats_manager import NatsManager
from ..db import db
from ..auth import UserPayload
from ..assessment_engine import run_assessment
from ..self_healing import check_and_run_self_healing

logger = logging.getLogger("eiip-router-discovery")

router = APIRouter()

async def get_nats(request: Request) -> NatsManager:
    return request.app.state.nats_manager

async def get_optional_user(request: Request) -> UserPayload:
    from ..endpoints import get_optional_user as fetch_user
    return await fetch_user(request)

@router.post("/discovery/upload", status_code=201)
async def upload_discovery_data(
    payload: TelemetryPayload, 
    nats: NatsManager = Depends(get_nats),
    user: UserPayload = Depends(get_optional_user)
):
    """
    Accepts normalized collector payload packages, stores metadata state in PostgreSQL database,
    and publishes the DiscoveryCompleted CloudEvent.
    """
    try:
        from ..endpoints import save_consolidated_assessment
        payload_dict = payload.model_dump()
        consolidated = run_assessment(payload_dict)
        consolidated["Hardware"] = payload_dict.get("Hardware")
        consolidated["OS"] = payload_dict.get("OS")
        
        machine_uuid, assessment_id = await save_consolidated_assessment(consolidated, user.tenant_id)
        logger.info(f"Ingested Discovery payload for host: {payload.Machine.ComputerName} [UUID: {machine_uuid}]")

        await check_and_run_self_healing(machine_uuid, consolidated.get("Findings", []), user.tenant_id)

        event_data = {
            "machine_uuid": str(machine_uuid),
            "assessment_id": str(assessment_id),
            "computer_name": payload.Machine.ComputerName,
            "platform": payload.Machine.Platform,
            "os_caption": payload.OS.Caption,
            "os_version": payload.OS.Version,
            "tenant_id": user.tenant_id,
            "site_id": payload.SiteId,
            "software_count": len(payload.Software),
            "services_count": len(payload.Services),
            "hardware": {
                "cores": payload.Hardware.LogicalCores,
                "memory_gb": payload.Hardware.TotalMemoryGB,
                "disk_count": len(payload.Hardware.Disks)
            }
        }

        await nats.publish_cloudevent(
            event_type="DiscoveryCompleted",
            subject=f"Machine/{machine_uuid}",
            source="eiip://discovery-service",
            data=event_data
        )

        return {
            "status": "success",
            "message": "Discovery payload received, database record saved, and event dispatched.",
            "machine_uuid": str(machine_uuid),
            "assessment_id": str(assessment_id)
        }
    except Exception as e:
        logger.error(f"Failed to process discovery upload: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to process discovery upload: {str(e)}")

@router.post("/telemetry/ingress", status_code=200)
async def otel_telemetry_ingress(
    request: Request, 
    nats: NatsManager = Depends(get_nats),
    user: UserPayload = Depends(get_optional_user)
):
    """
    Ingress point mapped to the OpenTelemetry Collector exporters.
    """
    try:
        payload = await request.json()
        logger.info(f"Received telemetry ingress packet from OTel Collector. Logs count: {len(payload.get('resourceLogs', []))}")
        
        await nats.publish_cloudevent(
            event_type="EvidenceCollected",
            subject="Telemetry/OTelCollector",
            source="eiip://otel-collector",
            data={"raw_payload": payload, "tenant_id": user.tenant_id}
        )

        return {"status": "success", "message": "OTel telemetry packet queued."}
    except Exception as e:
        logger.error(f"OTel Ingress error: {e}")
        raise HTTPException(status_code=400, detail="Invalid JSON telemetry format.")

@router.post("/migrate/import", status_code=200)
async def migrate_import_v1(
    request: Request, 
    nats: NatsManager = Depends(get_nats),
    user: UserPayload = Depends(get_optional_user)
):
    """
    Accepts V1 local SQLite/IndexedDB migration files.
    """
    try:
        from ..endpoints import save_consolidated_assessment
        migration_package = await request.json()
        machine_name = migration_package.get("Machine", {}).get("ComputerName", "Migrated-Host")
        machine_uuid = uuid.uuid5(uuid.NAMESPACE_DNS, machine_name)
        history_runs = migration_package.get("History", [])
        
        if migration_package.get("Findings") or migration_package.get("HealthScore"):
            await save_consolidated_assessment(migration_package, user.tenant_id)
        else:
            await db.execute("""
                INSERT INTO machines (machine_id, computer_name, platform, architecture, tenant_id)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (machine_id) DO NOTHING;
            """, machine_uuid, machine_name, "Windows", "x64", user.tenant_id)

        await nats.publish_cloudevent(
            event_type="MigrationCompleted",
            subject=f"Machine/{machine_uuid}",
            source="eiip://migration-service",
            data={
                "machine_uuid": str(machine_uuid),
                "computer_name": machine_name,
                "imported_runs_count": len(history_runs),
                "payload": migration_package
            }
        )

        return {
            "status": "success",
            "message": "Migration completed successfully.",
            "imported_runs": len(history_runs),
            "machine_uuid": str(machine_uuid)
        }
    except Exception as e:
        logger.error(f"Migration failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Migration failed: {str(e)}")
