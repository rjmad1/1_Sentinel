import sys
import os
from fastapi.testclient import TestClient

# Ensure Phase2_Integration is on the system path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from Phase2_Integration.Backend.main import app

def test_root():
    with TestClient(app) as client:
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "online"
        assert "Sentinel EIIP Enterprise API" in data["service"]

def test_discovery_upload():
    with TestClient(app) as client:
        payload = {
            "TenantId": "test-tenant",
            "SiteId": "test-site",
            "Machine": {
                "ComputerName": "TEST-HOST-01",
                "Platform": "Windows",
                "Architecture": "x64"
            },
            "OS": {
                "Caption": "Microsoft Windows 11 Enterprise",
                "Version": "10.0.22631",
                "InstallDate": "2023-10-15T12:00:00Z",
                "LastBootTime": "2026-06-07T08:00:00Z"
            },
            "Hardware": {
                "LogicalCores": 8,
                "PhysicalProcessors": 1,
                "TotalMemoryGB": 16.0,
                "FreeMemoryGB": 4.5,
                "Disks": [
                    {
                        "DeviceID": "C:",
                        "Size": "512110000000",
                        "FreeSpace": "120000000000"
                    }
                ],
                "NetworkAdapters": [
                    {
                        "Name": "Ethernet",
                        "IPAddress": "10.0.0.15"
                    }
                ]
            },
            "Services": [
                {
                    "Name": "Spooler",
                    "DisplayName": "Print Spooler",
                    "Status": "Running",
                    "StartMode": "Auto"
                }
            ],
            "LocalAdmins": ["Administrator", "rajaj"],
            "Software": [
                {
                    "Name": "Python",
                    "Version": "3.14.4",
                    "Vendor": "Python Software Foundation"
                }
            ]
        }
        response = client.post("/api/v2/discovery/upload", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["status"] == "success"
        assert "machine_uuid" in data

def test_migrate_import():
    with TestClient(app) as client:
        payload = {
            "Machine": {
                "ComputerName": "MIGRATED-HOST-01"
            },
            "History": [
                {
                    "RunId": "run-001",
                    "Timestamp": "2026-06-06T10:00:00Z",
                    "OverallScore": 92.5
                }
            ]
        }
        response = client.post("/api/v2/migrate/import", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["imported_runs"] == 1
        assert "machine_uuid" in data

def test_create_assessment_non_uuid_id():
    import uuid
    with TestClient(app) as client:
        payload = {
            "AssessmentId": "my-custom-assessment-id-123",
            "Machine": {
                "ComputerName": "NON-UUID-HOST-01",
                "Platform": "Windows",
                "Architecture": "x64"
            },
            "OS": {
                "Caption": "Microsoft Windows 11 Enterprise",
                "Version": "10.0.22631",
                "InstallDate": "2023-10-15T12:00:00Z",
                "LastBootTime": "2026-06-07T08:00:00Z"
            },
            "Hardware": {
                "LogicalCores": 8,
                "PhysicalProcessors": 1,
                "TotalMemoryGB": 16.0,
                "FreeMemoryGB": 4.5,
                "Disks": [],
                "NetworkAdapters": []
            },
            "Services": [],
            "LocalAdmins": [],
            "Software": []
        }
        response = client.post("/api/v2/assessments", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["status"] == "success"
        assert "assessment_id" in data
        expected_uuid = str(uuid.uuid5(uuid.NAMESPACE_DNS, "my-custom-assessment-id-123"))
        assert data["assessment_id"] == expected_uuid

