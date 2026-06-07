import sys
import os
import time
from fastapi.testclient import TestClient

# Ensure Phase2_Integration is on the system path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from Phase2_Integration.Backend.main import app

def test_fleet_and_forecast_workflow():
    with TestClient(app) as client:
        # 0. Clean database to avoid interference from previous runs
        purge_res = client.post("/api/v2/assessments/purge")
        assert purge_res.status_code == 200
        
        # 1. Upload first discovery payload for machine FORECAST-HOST-01
        payload1 = {
            "TenantId": "test-tenant",
            "SiteId": "test-site",
            "Machine": {
                "ComputerName": "FORECAST-HOST-01",
                "Platform": "Linux",
                "Architecture": "x86_64"
            },
            "OS": {
                "Caption": "Ubuntu 22.04 LTS",
                "Version": "22.04",
                "InstallDate": "2024-01-10T00:00:00Z",
                "LastBootTime": "2026-06-07T00:00:00Z"
            },
            "Hardware": {
                "LogicalCores": 4,
                "PhysicalProcessors": 1,
                "TotalMemoryGB": 8.0,
                "FreeMemoryGB": 4.0,
                "Disks": [
                    {
                        "DeviceID": "/",
                        "Size": "100000000000",
                        "FreeSpace": "40000000000" # 40% free, 60% util
                    }
                ],
                "NetworkAdapters": []
            },
            "Services": [],
            "LocalAdmins": ["root"],
            "Software": []
        }
        
        response1 = client.post("/api/v2/discovery/upload", json=payload1)
        assert response1.status_code == 201
        data1 = response1.json()
        machine_uuid = data1["machine_uuid"]
        
        # 2. Upload second discovery payload with increased disk utilization (e.g. storage growing)
        # We need a small delay to separate the assessment timestamps in the DB
        time.sleep(0.5)
        
        payload2 = payload1.copy()
        payload2["Hardware"] = {
            "LogicalCores": 4,
            "PhysicalProcessors": 1,
            "TotalMemoryGB": 8.0,
            "FreeMemoryGB": 3.0,
            "Disks": [
                {
                    "DeviceID": "/",
                    "Size": "100000000000",
                    "FreeSpace": "30000000000" # 30% free, 70% util
                }
            ],
            "NetworkAdapters": []
        }
        
        response2 = client.post("/api/v2/discovery/upload", json=payload2)
        assert response2.status_code == 201
        
        # 3. Retrieve fleet list
        fleet_response = client.get("/api/v2/fleet/machines")
        assert fleet_response.status_code == 200
        fleet_data = fleet_response.json()
        
        # Check that FORECAST-HOST-01 is in the fleet list
        host_entry = next((item for item in fleet_data if item["MachineId"] == machine_uuid), None)
        assert host_entry is not None
        assert host_entry["ComputerName"] == "FORECAST-HOST-01"
        assert host_entry["Platform"] == "Linux"
        
        # 4. Query capacity forecast for this machine
        forecast_response = client.get(f"/api/v2/assessments/forecast/{machine_uuid}")
        assert forecast_response.status_code == 200
        forecast_data = forecast_response.json()
        
        # Verify response structure
        assert "Storage" in forecast_data
        assert "Memory" in forecast_data
        assert "Cpu" in forecast_data
        
        # Verify forecast predictions
        storage_forecast = forecast_data["Storage"]
        assert storage_forecast["Confidence"] == "High"
        assert "exhaustion" in storage_forecast["Note"].lower() or "capacity" in storage_forecast["Note"].lower()
        
        # Values should be computed and projected
        assert storage_forecast["Day30"] >= 70.0
        
        # 5. Query global fleet capacity analytics
        analytics_response = client.get("/api/v2/fleet/analytics")
        assert analytics_response.status_code == 200
        analytics_data = analytics_response.json()
        
        assert "total_machines" in analytics_data
        assert analytics_data["total_machines"] >= 1
        assert "total_cores" in analytics_data
        assert analytics_data["total_cores"] >= 4
        assert "total_memory_gb" in analytics_data
        assert analytics_data["total_memory_gb"] >= 8.0
        assert "total_storage_gb" in analytics_data
        assert analytics_data["total_storage_gb"] > 0.0
        assert "eol_software" in analytics_data
        assert isinstance(analytics_data["eol_software"], list)
        assert "recent_history" in analytics_data
        assert isinstance(analytics_data["recent_history"], list)

