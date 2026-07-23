import sys
import os
os.environ["DEVELOPMENT_MODE"] = "true"
import pytest
from fastapi.testclient import TestClient

# Ensure Phase2_Integration is on the system path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from Phase2_Integration.Backend.main import app

def test_full_api_lifecycle_integration():
    with TestClient(app) as client:
        # 1. Verify Root API Health
        root_res = client.get("/")
        assert root_res.status_code == 200
        assert root_res.json()["status"] == "online"

        # 2. Clean Database before run
        purge_res = client.post("/api/v2/assessments/purge")
        assert purge_res.status_code == 200
        assert purge_res.json()["status"] == "success"

        # 3. Post Telemetry Payload
        payload = {
            "TenantId": "integration-tenant-01",
            "SiteId": "integration-site-01",
            "Machine": {
                "ComputerName": "INT-HOST-NODE-01",
                "Platform": "Windows",
                "Architecture": "x64"
            },
            "OS": {
                "Caption": "Microsoft Windows 11 Enterprise",
                "Version": "10.0.22631",
                "InstallDate": "2024-01-01T00:00:00Z",
                "LastBootTime": "2026-07-20T00:00:00Z"
            },
            "Hardware": {
                "LogicalCores": 8,
                "PhysicalProcessors": 1,
                "TotalMemoryGB": 16.0,
                "FreeMemoryGB": 4.0,
                "Disks": [
                    {
                        "DeviceID": "C:",
                        "Size": "500000000000",
                        "FreeSpace": "40000000000" # <10% free -> triggers disk warning finding
                    }
                ],
                "NetworkAdapters": []
            },
            "Services": [],
            "LocalAdmins": ["Administrator"],
            "Software": [
                {
                    "Name": "OpenSSL",
                    "Version": "1.1.1", # vulnerable version
                    "Publisher": "OpenSSL Project"
                }
            ]
        }

        ingest_res = client.post("/api/v2/discovery/upload", json=payload)
        assert ingest_res.status_code == 201
        res_data = ingest_res.json()
        assert res_data["status"] == "success"
        assert "machine_uuid" in res_data
        machine_id = res_data["machine_uuid"]

        # 4. Query Machine Inventory
        machines_res = client.get("/api/v2/fleet/machines")
        assert machines_res.status_code == 200
        machines = machines_res.json()
        assert any(m.get("MachineId") == machine_id or m.get("machine_id") == machine_id or m.get("ComputerName") == "INT-HOST-NODE-01" or m.get("computer_name") == "INT-HOST-NODE-01" for m in machines)

        # 5. Query Findings
        findings_res = client.get(f"/api/v2/findings/{machine_id}")
        assert findings_res.status_code == 200

        # 6. Check Self-Healing Policies
        policies_res = client.get("/api/v2/self-healing/policies")
        assert policies_res.status_code == 200
        policies = policies_res.json()
        assert isinstance(policies, (dict, list))

        # 7. Execute Self-Healing Action
        if len(policies) > 0:
            policy_id = list(policies.keys())[0] if isinstance(policies, dict) else (policies[0].get("policy_id") if isinstance(policies[0], dict) else "SEC-FW-001")
            exec_res = client.post(f"/api/v2/self-healing/policies/{policy_id}/execute", json={"machine_id": machine_id})
            assert exec_res.status_code in [200, 404]

        # 8. Query Forecast Endpoint
        forecast_res = client.get(f"/api/v2/forecast/storage/{machine_id}")
        assert forecast_res.status_code in [200, 404]
