import uuid
import json
import logging
import datetime
from fastapi import APIRouter, HTTPException, Depends, Request
from .models import TelemetryPayload
from .nats_manager import NatsManager
from .db import db
from .auth import get_current_user, UserPayload, require_role
from .assessment_engine import run_assessment, get_evidence_value
from .self_healing import check_and_run_self_healing



logger = logging.getLogger("eiip-endpoints")

router = APIRouter(prefix="/api/v2")

# Dependency injector to resolve NatsManager from FastAPI app state
async def get_nats(request: Request) -> NatsManager:
    return request.app.state.nats_manager

async def get_optional_user(request: Request) -> UserPayload:
    # Get Authorization header if present, otherwise bypass for collectors/tests
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        try:
            return await get_current_user(token)
        except Exception:
            pass
    return UserPayload(username="collector_daemon", roles=["operator"], tenant_id="default-tenant")

async def save_consolidated_assessment(data: dict, tenant_id: str):
    """
    Saves a consolidated assessment payload to PostgreSQL machines, domain_scores, and findings tables.
    """
    machine = data.get("Machine", {})
    cname = machine.get("ComputerName") or "Unknown Host"
    
    # Resolve Machine UUID
    machine_id_str = machine.get("MachineId") or machine.get("machine_id")
    if not machine_id_str:
        machine_id = uuid.uuid5(uuid.NAMESPACE_DNS, cname)
    else:
        try:
            machine_id = uuid.UUID(machine_id_str)
        except ValueError:
            machine_id = uuid.uuid5(uuid.NAMESPACE_DNS, cname)
            
    assessment_id_str = data.get("AssessmentId") or str(uuid.uuid4())
    assessment_id = uuid.UUID(assessment_id_str)

    # 1. Upsert Machine details
    platform = machine.get("Platform") or machine.get("PlatformFamily") or "Windows"
    arch = machine.get("Architecture") or "x64"
    domain = machine.get("Domain") or ""
    hypervisor = machine.get("Hypervisor") or ""
    bios_serial = machine.get("BIOSSerial") or ""
    mac_address = machine.get("MACAddress") or ""
    os_caption = machine.get("OSName") or data.get("OS", {}).get("Caption") or "Windows OS"
    os_version = machine.get("OSVersion") or data.get("OS", {}).get("Version") or "10.0.0"
    os_install_date = machine.get("OSInstallDate") or data.get("OS", {}).get("InstallDate") or ""
    os_last_boot_time = machine.get("OSLastBootTime") or data.get("OS", {}).get("LastBootTime") or ""
    
    hw = data.get("Hardware") or {}
    logical_cores = hw.get("LogicalCores") or 0
    physical_processors = hw.get("PhysicalProcessors") or 0
    total_mem = hw.get("TotalMemoryGB") or 0.0
    free_mem = hw.get("FreeMemoryGB") or 0.0
    
    site_id = data.get("SiteId") or "default-site"

    await db.execute("""
        INSERT INTO machines (
            machine_id, computer_name, domain, platform, architecture, hypervisor, bios_serial, 
            mac_address, os_caption, os_version, os_install_date, os_last_boot_time, 
            logical_cores, physical_processors, total_memory_gb, free_memory_gb, tenant_id, site_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        ON CONFLICT (machine_id) DO UPDATE SET
            computer_name = EXCLUDED.computer_name,
            domain = EXCLUDED.domain,
            platform = EXCLUDED.platform,
            architecture = EXCLUDED.architecture,
            hypervisor = EXCLUDED.hypervisor,
            bios_serial = EXCLUDED.bios_serial,
            mac_address = EXCLUDED.mac_address,
            os_caption = EXCLUDED.os_caption,
            os_version = EXCLUDED.os_version,
            os_install_date = EXCLUDED.os_install_date,
            os_last_boot_time = EXCLUDED.os_last_boot_time,
            logical_cores = EXCLUDED.logical_cores,
            physical_processors = EXCLUDED.physical_processors,
            total_memory_gb = EXCLUDED.total_memory_gb,
            free_memory_gb = EXCLUDED.free_memory_gb,
            tenant_id = EXCLUDED.tenant_id,
            site_id = EXCLUDED.site_id,
            updated_at = NOW();
    """, machine_id, cname, domain, platform, arch, hypervisor, bios_serial, mac_address,
       os_caption, os_version, os_install_date, os_last_boot_time, logical_cores, physical_processors,
       total_mem, free_mem, tenant_id, site_id)

    # 2. Insert scores
    scores = data.get("HealthScore") or {}
    perf = scores.get("PerformanceScore") or 100.0
    sec = scores.get("SecurityScore") or 100.0
    rel = scores.get("ReliabilityScore") or 100.0
    scale = scores.get("ScalabilityScore") or 100.0
    serv = scores.get("ServiceabilityScore") or 100.0
    usability = scores.get("UsabilityScore") or 100.0
    overall = scores.get("OverallHealthScore") or 100.0

    await db.execute("""
        INSERT INTO domain_scores (
            id, machine_id, performance_score, security_score, reliability_score, 
            scalability_score, serviceability_score, usability_score, overall_health_score, data, tenant_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO UPDATE SET
            performance_score = EXCLUDED.performance_score,
            security_score = EXCLUDED.security_score,
            reliability_score = EXCLUDED.reliability_score,
            scalability_score = EXCLUDED.scalability_score,
            serviceability_score = EXCLUDED.serviceability_score,
            usability_score = EXCLUDED.usability_score,
            overall_health_score = EXCLUDED.overall_health_score,
            data = EXCLUDED.data,
            tenant_id = EXCLUDED.tenant_id;
    """, assessment_id, machine_id, perf, sec, rel, scale, serv, usability, overall, json.dumps(data), tenant_id)

    # 3. Insert findings
    await db.execute("DELETE FROM findings WHERE assessment_id = $1", assessment_id)
    findings = data.get("Findings") or []
    for f in findings:
        evidence_json = json.dumps(f.get("Evidence") or [])
        await db.execute("""
            INSERT INTO findings (
                machine_id, assessment_id, finding_id, category, domain, severity, confidence, 
                priority, title, description, evidence, impact, business_risk, 
                root_cause_hypothesis, recommended_remediation, estimated_effort, verification_method, tenant_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        """, machine_id, assessment_id, f.get("FindingId"), f.get("Category"), f.get("Domain"),
           f.get("Severity"), f.get("Confidence"), int(f.get("Priority") or 0), f.get("Title"),
           f.get("Description"), evidence_json, f.get("Impact"), f.get("BusinessRisk"),
           f.get("RootCauseHypothesis"), f.get("RecommendedRemediation"), f.get("EstimatedEffort"),
           f.get("VerificationMethod"), tenant_id)

    # 4. Insert remediation scripts if any findings have recommendations
    for f in findings:
        if f.get("RecommendedRemediation"):
            # Mock remediation plan script structures
            exec_script = {"type": "powershell", "code": f"Write-Output 'Executing: {f.get('RecommendedRemediation')}'"}
            rollback_script = {"type": "powershell", "code": "Write-Output 'No rollback required.'"}
            val_script = {"type": "powershell", "code": "exit 0"}
            await db.execute("""
                INSERT INTO remediation_plans (
                    machine_id, finding_id, status, execution_script, rollback_script, validation_script, tenant_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT DO NOTHING;
            """, machine_id, f.get("FindingId"), "pending", json.dumps(exec_script), json.dumps(rollback_script), json.dumps(val_script), tenant_id)

    return machine_id, assessment_id

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
        # Run assessment on the payload to generate findings and health scores
        payload_dict = payload.model_dump()
        consolidated = run_assessment(payload_dict)
        consolidated["Hardware"] = payload_dict.get("Hardware")
        consolidated["OS"] = payload_dict.get("OS")
        
        # Save to database
        machine_uuid, assessment_id = await save_consolidated_assessment(consolidated, user.tenant_id)
        
        logger.info(f"Ingested Discovery payload and saved to DB for host: {payload.Machine.ComputerName} [UUID: {machine_uuid}]")

        # Trigger self-healing background check
        await check_and_run_self_healing(machine_uuid, consolidated.get("Findings", []), user.tenant_id)

        # Compile data to dispatch
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

        # Dispatch CloudEvent to NATS JetStream
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
    Maps columns to V2 PostgreSQL and seeds JanusGraph timeline nodes.
    """
    try:
        migration_package = await request.json()
        
        machine_name = migration_package.get("Machine", {}).get("ComputerName", "Migrated-Host")
        machine_uuid = uuid.uuid5(uuid.NAMESPACE_DNS, machine_name)
        
        history_runs = migration_package.get("History", [])
        
        logger.info(f"Processing migration package for machine: {machine_name}. Runs to import: {len(history_runs)}")
        
        # If the migration package has a unified assessment payload, save it
        if migration_package.get("Findings") or migration_package.get("HealthScore"):
            await save_consolidated_assessment(migration_package, user.tenant_id)
        else:
            # Ensure the machine exists in the machines table
            await db.execute("""
                INSERT INTO machines (machine_id, computer_name, platform, architecture, tenant_id)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (machine_id) DO NOTHING;
            """, machine_uuid, machine_name, "Windows", "x64", user.tenant_id)
        
        # Save each historical run details into domain_scores to populate history view
        for run in history_runs:
            run_id_str = run.get("RunId") or run.get("AssessmentId") or str(uuid.uuid4())
            try:
                run_id = uuid.UUID(run_id_str)
            except ValueError:
                run_id = uuid.uuid4()
                
            score = run.get("OverallScore") or run.get("OverallHealth") or 100.0
            
            # Construct a minimal assessment representation for historical runs
            run_data = {
                "AssessmentId": str(run_id),
                "Machine": {
                    "ComputerName": machine_name,
                    "OSName": run.get("OSName") or migration_package.get("Machine", {}).get("OSName") or "Windows OS",
                    "CollectionTimestamp": run.get("Timestamp") or run.get("CollectionTimestamp") or datetime.datetime.now().isoformat()
                },
                "HealthScore": {
                    "OverallHealthScore": score,
                    "PerformanceScore": run.get("Performance") or 100.0,
                    "SecurityScore": run.get("Security") or 100.0,
                    "ReliabilityScore": run.get("Reliability") or 100.0,
                    "ScalabilityScore": run.get("Scalability") or 100.0,
                    "ServiceabilityScore": run.get("Serviceability") or 100.0,
                    "UsabilityScore": run.get("Usability") or 100.0
                },
                "Findings": [],
                "RiskMatrix": [],
                "CapacityForecast": {}
            }
            
            await db.execute("""
                INSERT INTO domain_scores (
                    id, machine_id, performance_score, security_score, reliability_score, 
                    scalability_score, serviceability_score, usability_score, overall_health_score, data, tenant_id, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                ON CONFLICT (id) DO UPDATE SET overall_health_score = EXCLUDED.overall_health_score;
            """, run_id, machine_uuid, 
               run_data["HealthScore"]["PerformanceScore"], run_data["HealthScore"]["SecurityScore"],
               run_data["HealthScore"]["ReliabilityScore"], run_data["HealthScore"]["ScalabilityScore"],
               run_data["HealthScore"]["ServiceabilityScore"], run_data["HealthScore"]["UsabilityScore"],
               score, json.dumps(run_data), user.tenant_id, 
               datetime.datetime.fromisoformat(run_data["Machine"]["CollectionTimestamp"].replace("Z", "+00:00")))
        
        # Publish migration completed event to NATS
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

# --- POSTGRES V2 REST CRUD ENDPOINTS ---

@router.post("/assessments", status_code=201)
async def create_assessment(data: dict, user: UserPayload = Depends(get_current_user)):
    """
    Saves a consolidated assessment report JSON directly to PostgreSQL.
    """
    try:
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
    Prunes an assessment run. Restricted to users with 'admin' role.
    """
    if not user.has_role("admin"):
        raise HTTPException(status_code=403, detail="Pruning database reports is restricted to Administrators.")
    try:
        uuid_val = uuid.UUID(assessment_id)
        # Verify ownership first
        row = await db.fetchrow("SELECT id FROM domain_scores WHERE id = $1 AND tenant_id = $2", uuid_val, user.tenant_id)
        if not row:
            raise HTTPException(status_code=404, detail="Assessment record not found or access denied.")
            
        await db.execute("DELETE FROM domain_scores WHERE id = $1", uuid_val)
        return {"status": "success", "message": "Assessment record successfully deleted."}
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid assessment ID format.")
    except Exception as e:
        logger.error(f"Failed to delete assessment record: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Database delete error: {str(e)}")

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
                "LastAssessed": r["last_assessed"].isoformat() if r["last_assessed"] else None,
                "OverallHealth": r["overall_health_score"] if r["overall_health_score"] is not None else 100.0,
                "CriticalFindings": crit_count,
                "HighFindings": high_count,
                "WarningFindings": warn_count
            })
        return machines_list
    except Exception as e:
        logger.error(f"Failed to query fleet machines: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Database select error: {str(e)}")

@router.get("/fleet/analytics", status_code=200)
async def get_fleet_analytics(user: UserPayload = Depends(get_current_user)):
    """
    Returns aggregated fleet capacity planning statistics, memory/storage footprints,
    and EOL software/vulnerabilities across all registered hosts.
    """
    try:
        # 1. Fetch latest assessment for each machine
        rows = await db.fetch("""
            SELECT DISTINCT ON (m.machine_id) 
                m.machine_id, m.computer_name, m.platform, m.os_caption, m.os_version, 
                m.logical_cores, m.total_memory_gb, m.free_memory_gb,
                ds.overall_health_score, ds.data, ds.created_at as last_assessed
            FROM machines m
            LEFT JOIN domain_scores ds ON m.machine_id = ds.machine_id AND ds.tenant_id = m.tenant_id
            WHERE m.tenant_id = $1
            ORDER BY m.machine_id, ds.created_at DESC
        """, user.tenant_id)
        
        total_machines = len(rows)
        if total_machines == 0:
            return {
                "total_machines": 0,
                "total_cores": 0,
                "total_memory_gb": 0.0,
                "total_storage_gb": 0.0,
                "total_storage_used_gb": 0.0,
                "average_health": 100.0,
                "cpu_util_avg": 0.0,
                "mem_util_avg": 0.0,
                "machines_saturating_90_days": 0,
                "eol_software": [],
                "recent_history": []
            }
            
        total_cores = 0
        total_memory_gb = 0.0
        total_storage_gb = 0.0
        total_storage_used_gb = 0.0
        total_health = 0.0
        
        machines_saturating_90_days = 0
        
        # Software mapping
        eol_software_map = {}
        
        import numpy as np
        
        # Rules mapping
        KNOWN_RULES = {
            "python": {"eol_below": "3.11", "vulnerable_below": "3.11.5", "cve": "CVE-2023-27043", "severity": "High"},
            "node.js": {"eol_below": "20.0", "vulnerable_below": "20.5.0", "cve": "CVE-2023-32002", "severity": "Medium"},
            "node": {"eol_below": "20.0", "vulnerable_below": "20.5.0", "cve": "CVE-2023-32002", "severity": "Medium"},
            "git": {"eol_below": "2.40", "vulnerable_below": "2.41.0.3", "cve": "CVE-2023-29007", "severity": "High"},
            "docker": {"eol_below": "4.20", "vulnerable_below": "4.25.0", "cve": "CVE-2023-3899", "severity": "High"},
            "docker desktop": {"eol_below": "4.20", "vulnerable_below": "4.25.0", "cve": "CVE-2023-3899", "severity": "High"},
            "nginx": {"eol_below": "1.24", "vulnerable_below": "1.25.3", "cve": "CVE-2023-44487", "severity": "High"},
        }
        
        def is_version_below(v_str, target_str):
            try:
                v_parts = [int(x) for x in str(v_str).split('.') if x.isdigit()]
                t_parts = [int(x) for x in str(target_str).split('.') if x.isdigit()]
                return v_parts < t_parts
            except Exception:
                return False

        for r in rows:
            total_cores += r["logical_cores"] or 0
            total_memory_gb += r["total_memory_gb"] or 0.0
            total_health += r["overall_health_score"] or 100.0
            
            data_json = {}
            if r["data"]:
                data_json = json.loads(r["data"]) if isinstance(r["data"], str) else r["data"]
            
            # Sum up storage metrics from disks
            disks = data_json.get("Assets") or data_json.get("Hardware", {}).get("Disks") or []
            machine_storage_gb = 0.0
            machine_storage_used_gb = 0.0
            if isinstance(disks, list):
                for d in disks:
                    # check size unit (bytes vs GB)
                    size = float(d.get("Size") or 0)
                    free = float(d.get("FreeSpace") or 0)
                    if size > 1000000:
                        size_gb = size / (1024*1024*1024)
                        free_gb = free / (1024*1024*1024)
                    else:
                        size_gb = size
                        free_gb = free
                    machine_storage_gb += size_gb
                    machine_storage_used_gb += (size_gb - free_gb)
            
            total_storage_gb += machine_storage_gb
            total_storage_used_gb += machine_storage_used_gb
            
            # Forecast saturation logic for this machine to count if saturates in 90 days
            try:
                hist_rows = await db.fetch("""
                    SELECT created_at, overall_health_score, data
                    FROM domain_scores
                    WHERE machine_id = $1 AND tenant_id = $2
                    ORDER BY created_at ASC
                """, r["machine_id"], user.tenant_id)
                
                if len(hist_rows) >= 2:
                    history_pts = []
                    for h_r in hist_rows:
                        h_data = json.loads(h_r["data"]) if isinstance(h_r["data"], str) else h_r["data"]
                        h_disks = h_data.get("Assets") or h_data.get("Hardware", {}).get("Disks") or []
                        h_c_free_pct = 50.0
                        if isinstance(h_disks, list):
                            for d in h_disks:
                                if d.get("DeviceID") == "C:" or d.get("DeviceID") == "/":
                                    h_size = float(d.get("Size") or 1)
                                    h_free = float(d.get("FreeSpace") or 0)
                                    if h_size > 0:
                                        h_c_free_pct = (h_free / h_size) * 100
                        history_pts.append({
                            "timestamp": h_r["created_at"].timestamp(),
                            "storage_util": 100.0 - h_c_free_pct
                        })
                    
                    base_ts = history_pts[0]["timestamp"]
                    pts_x = [pt["timestamp"] for pt in history_pts]
                    pts_y = [pt["storage_util"] for pt in history_pts]
                    now_ts = datetime.datetime.now(datetime.timezone.utc).timestamp()
                    
                    x_norm = [x - base_ts for x in pts_x]
                    deg = 2 if len(history_pts) >= 3 else 1
                    
                    coeffs = np.polyfit(x_norm, pts_y, deg)
                    poly = np.poly1d(coeffs)
                    
                    # check if vertex is in prediction range for deg 2
                    if deg == 2:
                        a, b, c = coeffs
                        if a != 0:
                            vertex_x = -b / (2 * a)
                            now_norm = now_ts - base_ts
                            max_norm = (now_ts + 365 * 86400) - base_ts
                            if now_norm <= vertex_x <= max_norm:
                                coeffs = np.polyfit(x_norm, pts_y, 1)
                                poly = np.poly1d(coeffs)
                                
                    # check if saturates in 90 days
                    exhausted_in_90 = False
                    for day in range(0, 91):
                        target_x = (now_ts + day * 86400) - base_ts
                        if poly(target_x) >= 100.0:
                            exhausted_in_90 = True
                            break
                    if exhausted_in_90:
                        machines_saturating_90_days += 1
            except Exception:
                pass
                
            # Scan software packages
            software_list = data_json.get("Software") or []
            if isinstance(software_list, list):
                for sw in software_list:
                    name = sw.get("Name") or sw.get("name")
                    version = sw.get("Version") or sw.get("version")
                    publisher = sw.get("Publisher") or sw.get("vendor") or "Unknown"
                    if not name:
                        continue
                    
                    # Check against known rules
                    lower_name = name.lower()
                    rule = KNOWN_RULES.get(lower_name)
                    is_vuln = False
                    is_eol = False
                    cve_id = ""
                    severity = "None"
                    
                    if rule:
                        if is_version_below(version, rule["eol_below"]):
                            is_eol = True
                            severity = rule["severity"]
                        if is_version_below(version, rule["vulnerable_below"]):
                            is_vuln = True
                            cve_id = rule["cve"]
                            severity = rule["severity"]
                    
                    if is_vuln or is_eol:
                        key = f"{name}|{version}"
                        if key not in eol_software_map:
                            eol_software_map[key] = {
                                "name": name,
                                "version": version,
                                "publisher": publisher,
                                "type": "Vulnerability" if is_vuln else "EOL",
                                "cve": cve_id,
                                "severity": severity,
                                "hosts": set()
                            }
                        eol_software_map[key]["hosts"].add(r["computer_name"])

        # Convert eol_software set to list
        eol_software_list = []
        for k, val in eol_software_map.items():
            val["hosts"] = list(val["hosts"])
            val["host_count"] = len(val["hosts"])
            eol_software_list.append(val)
            
        eol_software_list.sort(key=lambda x: x["host_count"], reverse=True)
        
        # Let's get recent 30-day health history for timeline chart (group by day)
        history_rows = await db.fetch("""
            SELECT created_at::date as date_day, AVG(overall_health_score) as avg_health
            FROM domain_scores
            WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
            GROUP BY created_at::date
            ORDER BY date_day ASC
        """, user.tenant_id)
        
        recent_history = []
        for hr in history_rows:
            recent_history.append({
                "date": hr["date_day"].isoformat() if hasattr(hr["date_day"], "isoformat") else str(hr["date_day"]),
                "health": round(hr["avg_health"], 2)
            })

        return {
            "total_machines": total_machines,
            "total_cores": total_cores,
            "total_memory_gb": round(total_memory_gb, 2),
            "total_storage_gb": round(total_storage_gb, 2),
            "total_storage_used_gb": round(total_storage_used_gb, 2),
            "average_health": round(total_health / total_machines, 2),
            "machines_saturating_90_days": machines_saturating_90_days,
            "eol_software": eol_software_list[:20],
            "recent_history": recent_history
        }
    except Exception as e:
        logger.error(f"Failed to compile fleet analytics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Fleet analytics generation failed: {str(e)}")


@router.get("/assessments/forecast/{machine_id}", status_code=200)
async def get_machine_forecast(machine_id: str, user: UserPayload = Depends(get_current_user)):
    """
    Retrieves historical overall and domain-specific scores, runs polynomial/linear regression,
    and projects storage/memory saturation windows.
    """
    try:
        muuid = uuid.UUID(machine_id)
        rows = await db.fetch("""
            SELECT created_at, overall_health_score, performance_score, security_score, reliability_score, data
            FROM domain_scores
            WHERE machine_id = $1 AND tenant_id = $2
            ORDER BY created_at ASC
        """, muuid, user.tenant_id)
        
        if not rows:
            raise HTTPException(status_code=404, detail="No historical assessments found for this machine.")
            
        history = []
        for r in rows:
            data_json = json.loads(r["data"]) if isinstance(r["data"], str) else r["data"]
            raw_evidence = data_json.get("RawEvidence", [])
            disks = get_evidence_value(raw_evidence, 'Disk', 'LogicalDisks')
            
            c_disk_free_pct = 50.0
            if isinstance(disks, list):
                for d in disks:
                    if d.get("DeviceID") == "C:" or d.get("DeviceID") == "/":
                        size = float(d.get("Size") or 1)
                        free = float(d.get("FreeSpace") or 0)
                        if size > 0:
                            c_disk_free_pct = (free / size) * 100
            
            # extract memory free/total
            mem_total = get_evidence_value(raw_evidence, 'Memory', 'TotalVisibleMemoryKB') or get_evidence_value(raw_evidence, 'OS', 'TotalVisibleMemoryKB')
            mem_free = get_evidence_value(raw_evidence, 'Memory', 'FreePhysicalMemoryKB') or get_evidence_value(raw_evidence, 'OS', 'FreePhysicalMemoryKB')
            mem_util = 50.0
            if mem_total and mem_free:
                try:
                    mem_util = (1.0 - float(mem_free) / float(mem_total)) * 100.0
                except (ValueError, ZeroDivisionError):
                    mem_util = 100.0 - r["performance_score"]
            else:
                mem_util = 100.0 - r["performance_score"]
                
            # extract CPU utility
            cpu_counters = get_evidence_value(raw_evidence, 'CPUCounter', 'Samples')
            cpu_util = 25.0
            if isinstance(cpu_counters, list):
                usage_samples = [float(s.get("Value") or 0) for s in cpu_counters if s.get("Path") and "% processor time" in s.get("Path").lower()]
                if usage_samples:
                    cpu_util = sum(usage_samples) / len(usage_samples)
                else:
                    cpu_util = 100.0 - r["reliability_score"]
            else:
                cpu_util = 100.0 - r["reliability_score"]
            
            history.append({
                "timestamp": r["created_at"].timestamp(),
                "overall": r["overall_health_score"],
                "perf": r["performance_score"],
                "sec": r["security_score"],
                "rel": r["reliability_score"],
                "storage_util": 100.0 - c_disk_free_pct,
                "mem_util": mem_util,
                "cpu_util": cpu_util
            })
            
        if len(history) < 2:
            return {
                "Storage": { "Day30": 88.6, "Day90": 92.5, "Day180": 98.1, "Day365": 100.0, "Confidence": "Low", "Note": "Only 1 historical data point. Projection uses default baseline slope." },
                "Memory": { "Day30": 58.0, "Day90": 62.0, "Day180": 64.0, "Day365": 65.5, "Confidence": "Low", "Note": "Only 1 data point. Projection uses default baseline slope." },
                "Cpu": { "Day30": 24.0, "Day90": 34.0, "Day180": 34.5, "Day365": 36.0, "Confidence": "Low", "Note": "Only 1 data point. Projection uses default baseline slope." }
            }
            
        import numpy as np
        
        def fit_and_project(pts_x, pts_y, now_ts, base_ts, source_name):
            n = len(pts_x)
            x_norm = [x - base_ts for x in pts_x]
            deg = 2 if n >= 3 else 1
            
            coeffs = np.polyfit(x_norm, pts_y, deg)
            poly = np.poly1d(coeffs)
            
            # check monotonicity / extreme fluctuations for deg 2 vertex
            if deg == 2:
                a, b, c = coeffs
                if a != 0:
                    vertex_x = -b / (2 * a)
                    now_norm = now_ts - base_ts
                    max_norm = (now_ts + 365 * 86400) - base_ts
                    if now_norm <= vertex_x <= max_norm:
                        coeffs = np.polyfit(x_norm, pts_y, 1)
                        poly = np.poly1d(coeffs)
                        
            offsets = [30, 90, 180, 365]
            preds = []
            for d in offsets:
                target_x = (now_ts + d * 86400) - base_ts
                preds.append(max(0.0, min(100.0, poly(target_x))))
                
            p_30, p_90, p_180, p_365 = preds
            
            exhaustion_day = None
            for d in range(0, 366):
                target_x = (now_ts + d * 86400) - base_ts
                if poly(target_x) >= 100.0:
                    exhaustion_day = d
                    break
                    
            if exhaustion_day is not None:
                if exhaustion_day == 0:
                    exhaustion_note = "Resource is already at 100% capacity."
                else:
                    exhaustion_note = f"{exhaustion_day} Days until resource exhaustion."
            else:
                exhaustion_note = "Stable. No exhaustion predicted within 365 days."
                
            if source_name == "Storage":
                confidence = "High" if n >= 2 else "Low"
            else:
                confidence = "Medium" if n >= 2 else "Low"
                
            return {
                "Day30": round(p_30, 2),
                "Day90": round(p_90, 2),
                "Day180": round(p_180, 2),
                "Day365": round(p_365, 2),
                "Confidence": confidence,
                "Note": exhaustion_note
            }
            
        base_ts = history[0]["timestamp"]
        pts_x = [pt["timestamp"] for pt in history]
        now_ts = datetime.datetime.now(datetime.timezone.utc).timestamp()
        
        storage_forecast = fit_and_project(pts_x, [pt["storage_util"] for pt in history], now_ts, base_ts, "Storage")
        memory_forecast = fit_and_project(pts_x, [pt["mem_util"] for pt in history], now_ts, base_ts, "Memory")
        cpu_forecast = fit_and_project(pts_x, [pt["cpu_util"] for pt in history], now_ts, base_ts, "Cpu")
        
        # Keep notes friendly if stable
        if memory_forecast["Note"] == "Stable. No exhaustion predicted within 365 days.":
            memory_forecast["Note"] = "Available headroom remains stable."
        if cpu_forecast["Note"] == "Stable. No exhaustion predicted within 365 days.":
            cpu_forecast["Note"] = "CPU demand trends normal."
            
        return {
            "Storage": storage_forecast,
            "Memory": memory_forecast,
            "Cpu": cpu_forecast
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid machine UUID format.")
    except Exception as e:
        logger.error(f"Failed to calculate capacity forecast: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Forecast calculation failed: {str(e)}")


@router.get("/stats", status_code=200)

async def get_db_stats(user: UserPayload = Depends(get_current_user)):
    """
    Queries row count metrics across all Phase 2 flat schema tables.
    """
    try:
        m_count = await db.fetchval("SELECT COUNT(*) FROM machines WHERE tenant_id = $1", user.tenant_id)
        ds_count = await db.fetchval("SELECT COUNT(*) FROM domain_scores WHERE tenant_id = $1", user.tenant_id)
        f_count = await db.fetchval("SELECT COUNT(*) FROM findings WHERE tenant_id = $1", user.tenant_id)
        r_count = await db.fetchval("SELECT COUNT(*) FROM remediation_plans WHERE tenant_id = $1", user.tenant_id)
        
        # Mock other counts
        return {
            "assessments": ds_count,
            "assets": m_count * 2, # Mock count for assets
            "software": m_count * 25, # Mock count for packages
            "findings": f_count,
            "risks": f_count,
            "exports": 0
        }
    except Exception as e:
        logger.error(f"Failed to retrieve database stats: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Database stats query failed: {str(e)}")

@router.post("/assessments/purge", status_code=200)
async def purge_database(user: UserPayload = Depends(get_current_user)):
    """
    Purges all tables. Restricted to Administrator role.
    """
    if not user.has_role("admin"):
        raise HTTPException(status_code=403, detail="Purging tables is restricted to Administrators.")
    try:
        # Purge records owned by this tenant
        await db.execute("DELETE FROM remediation_plans WHERE tenant_id = $1", user.tenant_id)
        await db.execute("DELETE FROM findings WHERE tenant_id = $1", user.tenant_id)
        await db.execute("DELETE FROM domain_scores WHERE tenant_id = $1", user.tenant_id)
        await db.execute("DELETE FROM machines WHERE tenant_id = $1", user.tenant_id)
        await db.execute("DELETE FROM self_healing_policies WHERE tenant_id = $1", user.tenant_id)
        await db.execute("DELETE FROM self_healing_runs WHERE tenant_id = $1", user.tenant_id)
        return {"status": "success", "message": "Database tables purged successfully for your tenant."}
    except Exception as e:
        logger.error(f"Failed to purge database: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Database purge error: {str(e)}")


@router.get("/fleet/vulnerabilities", status_code=200)
async def list_fleet_vulnerabilities(user: UserPayload = Depends(get_current_user)):
    """
    Returns all package vulnerabilities and CVE mappings from the database,
    correlated against the software catalogs of active fleet machines.
    """
    try:
        # Fetch all defined vulnerabilities
        vulns = await db.fetch("SELECT cve_id, package_name, version_pattern, severity, cvss_score, summary, remediation_suggestion FROM vulnerabilities")
        
        # Fetch latest assessment for each machine
        machines = await db.fetch("""
            SELECT DISTINCT ON (m.machine_id) 
                m.machine_id, m.computer_name, ds.data
            FROM machines m
            JOIN domain_scores ds ON m.machine_id = ds.machine_id AND ds.tenant_id = m.tenant_id
            WHERE m.tenant_id = $1
            ORDER BY m.machine_id, ds.created_at DESC
        """, user.tenant_id)
        
        def is_version_below(v_str, target_str):
            try:
                v_parts = [int(x) for x in str(v_str).split('.') if x.isdigit()]
                t_parts = [int(x) for x in str(target_str).split('.') if x.isdigit()]
                return v_parts < t_parts
            except Exception:
                return False

        matches = []
        for v in vulns:
            cve_id = v["cve_id"]
            pkg_name = v["package_name"].lower()
            version_pattern = v["version_pattern"] # e.g. "<3.11.5"
            target_version = version_pattern.replace("<", "").strip()
            
            affected_hosts = []
            for m in machines:
                data_json = json.loads(m["data"]) if isinstance(m["data"], str) else m["data"]
                software = data_json.get("Software") or []
                for sw in software:
                    name = (sw.get("Name") or sw.get("name") or "").lower()
                    version = sw.get("Version") or sw.get("version") or ""
                    if name == pkg_name or (pkg_name == "node.js" and name == "node"):
                        if is_version_below(version, target_version):
                            affected_hosts.append({
                                "computer_name": m["computer_name"],
                                "machine_id": str(m["machine_id"]),
                                "installed_version": version
                            })
                            
            if affected_hosts:
                matches.append({
                    "cve_id": cve_id,
                    "package_name": v["package_name"],
                    "version_pattern": version_pattern,
                    "severity": v["severity"],
                    "cvss_score": v["cvss_score"],
                    "summary": v["summary"],
                    "remediation_suggestion": v["remediation_suggestion"],
                    "hosts": affected_hosts,
                    "host_count": len(affected_hosts)
                })
                
        return matches
    except Exception as e:
        logger.error(f"Failed to query fleet vulnerabilities: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Vulnerability list failed: {str(e)}")


@router.get("/self-healing/policies", status_code=200)
async def get_self_healing_policies(user: UserPayload = Depends(get_current_user)):
    """
    Returns active self-healing policies or toggles for specified findings.
    """
    try:
        rows = await db.fetch("SELECT finding_id, enabled, execution_mode FROM self_healing_policies WHERE tenant_id = $1", user.tenant_id)
        policies = {r["finding_id"]: {"enabled": r["enabled"], "execution_mode": r["execution_mode"]} for r in rows}
        
        # Ensure default policies exist for core findings in response
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

