from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

# 1. Base Machine details
class MachineModel(BaseModel):
    MachineId: Optional[str] = Field(None, alias="machine_id")
    ComputerName: str
    Domain: Optional[str] = None
    Platform: str
    Architecture: str
    Hypervisor: Optional[str] = None
    BIOSSerial: Optional[str] = None
    MACAddress: Optional[str] = None

# 2. Operating System details
class OSModel(BaseModel):
    Caption: str
    Version: str
    InstallDate: str
    LastBootTime: str
    PSVersion: Optional[str] = None

# 3. Hardware Metrics
class HardwareModel(BaseModel):
    LogicalCores: int
    PhysicalProcessors: int
    TotalMemoryGB: float
    FreeMemoryGB: float
    Disks: List[Dict[str, Any]]
    NetworkAdapters: List[Dict[str, Any]]

# 4. Service details
class ServiceModel(BaseModel):
    Name: str
    DisplayName: str
    Status: str
    StartMode: str

# 5. Software Package details
class SoftwarePackageModel(BaseModel):
    Name: str
    Version: str
    Publisher: Optional[str] = None
    Vendor: Optional[str] = None
    Scope: Optional[str] = "Machine-Wide"
    SourceAgent: Optional[str] = "Registry"

# 6. Entire Telemetry payload submitted by collectors
class TelemetryPayload(BaseModel):
    TenantId: str = "default-tenant"
    SiteId: str = "default-site"
    Machine: MachineModel
    OS: OSModel
    Hardware: HardwareModel
    Services: List[ServiceModel]
    LocalAdmins: List[str]
    Software: List[SoftwarePackageModel]
    RawEvidence: Optional[List[Dict[str, Any]]] = []
