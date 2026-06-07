import uuid
import logging
from fastapi import APIRouter, HTTPException, Depends, Request
from .models import TelemetryPayload
from .nats_manager import NatsManager

logger = logging.getLogger("eiip-endpoints")

router = APIRouter(prefix="/api/v2")

# Dependency injector to resolve NatsManager from FastAPI app state
async def get_nats(request: Request) -> NatsManager:
    return request.app.state.nats_manager

@router.post("/discovery/upload", status_code=201)
async def upload_discovery_data(payload: TelemetryPayload, nats: NatsManager = Depends(get_nats)):
    """
    Accepts normalized collector payload packages, stores metadata state,
    and publishes the DiscoveryCompleted CloudEvent.
    """
    try:
        # Generate deterministic Machine UUID if not provided
        machine_uuid = payload.Machine.MachineId or str(uuid.uuid5(uuid.NAMESPACE_DNS, payload.Machine.ComputerName))
        
        logger.info(f"Ingested Discovery payload for host: {payload.Machine.ComputerName} [UUID: {machine_uuid}]")

        # Compile data to dispatch
        event_data = {
            "machine_uuid": machine_uuid,
            "computer_name": payload.Machine.ComputerName,
            "platform": payload.Machine.Platform,
            "os_caption": payload.OS.Caption,
            "os_version": payload.OS.Version,
            "tenant_id": payload.TenantId,
            "site_id": payload.SiteId,
            "software_count": len(payload.Software),
            "services_count": len(payload.Services),
            "hardware": {
                "cores": payload.Hardware.LogicalCores,
                "memory_gb": payload.Hardware.TotalMemoryGB,
                "disk_count": len(payload.Hardware.Disks)
            }
        }

        # Dispatch CloudEvent to NATS JetStream
        await nats.publish_cloudevent(
            event_type="DiscoveryCompleted",
            subject=f"Machine/{machine_uuid}",
            source="eiip://discovery-service",
            data=event_data
        )

        return {
            "status": "success",
            "message": "Discovery payload received and event dispatched successfully.",
            "machine_uuid": machine_uuid
        }
    except Exception as e:
        logger.error(f"Failed to process discovery upload: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process discovery upload: {str(e)}")

@router.post("/telemetry/ingress", status_code=200)
async def otel_telemetry_ingress(request: Request, nats: NatsManager = Depends(get_nats)):
    """
    Ingress point mapped to the OpenTelemetry Collector exporters.
    Handles streaming logs, metrics, and trace packets.
    """
    try:
        payload = await request.json()
        logger.info(f"Received telemetry ingress packet from OTel Collector. Logs count: {len(payload.get('resourceLogs', []))}")
        
        # Publish to NATS JetStream
        await nats.publish_cloudevent(
            event_type="EvidenceCollected",
            subject="Telemetry/OTelCollector",
            source="eiip://otel-collector",
            data={"raw_payload": payload}
        )

        return {"status": "success", "message": "OTel telemetry packet queued."}
    except Exception as e:
        logger.error(f"OTel Ingress error: {e}")
        raise HTTPException(status_code=400, detail="Invalid JSON telemetry format.")

@router.post("/migrate/import", status_code=200)
async def migrate_import_v1(request: Request, nats: NatsManager = Depends(get_nats)):
    """
    Accepts V1 local SQLite/IndexedDB migration files.
    Maps columns to V2 PostgreSQL and seeds JanusGraph timeline nodes.
    """
    try:
        migration_package = await request.json()
        
        machine_name = migration_package.get("Machine", {}).get("ComputerName", "Migrated-Host")
        machine_uuid = str(uuid.uuid5(uuid.NAMESPACE_DNS, machine_name))
        
        history_runs = migration_package.get("History", [])
        
        logger.info(f"Processing migration package for machine: {machine_name}. Runs to import: {len(history_runs)}")
        
        # Publish migration completed event to NATS
        await nats.publish_cloudevent(
            event_type="MigrationCompleted",
            subject=f"Machine/{machine_uuid}",
            source="eiip://migration-service",
            data={
                "machine_uuid": machine_uuid,
                "computer_name": machine_name,
                "imported_runs_count": len(history_runs),
                "payload": migration_package
            }
        )

        return {
            "status": "success",
            "message": "Migration completed successfully.",
            "imported_runs": len(history_runs),
            "machine_uuid": machine_uuid
        }
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        raise HTTPException(status_code=500, detail=f"Migration failed: {str(e)}")
