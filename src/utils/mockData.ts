export interface EvidenceRecord {
  Source: string;
  Name: string;
  Value: unknown;
  ValidationState: 'Validated' | 'Partial' | 'Missing' | 'Failed' | 'Unsupported';
  Collector: string;
  Notes: string;
  Timestamp: string;
}

export interface Finding {
  FindingId: string;
  Category: string;
  Domain: string;
  Severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';
  Confidence: 'High' | 'Medium' | 'Low' | 'Unknown';
  Priority: number;
  Title: string;
  Description: string;
  Evidence: EvidenceRecord[];
  Impact: string;
  BusinessRisk: string;
  RootCauseHypothesis: string;
  RecommendedRemediation: string;
  EstimatedEffort: 'Low' | 'Medium' | 'High';
  VerificationMethod: string;
  CreatedOn: string;
}

export interface EnvironmentOverview {
  PlatformFamily: string;
  SupportedPlatform: boolean;
  ExecutionMode: 'ReadOnly' | 'Audit' | 'DeepAudit';
  IsElevated: boolean;
  ComputerName: string;
  UserName: string;
  Domain: string;
  PowerShellVersion: string;
  OSName: string;
  OSVersion: string;
  OSBuild: string;
  Manufacturer: string;
  Model: string;
  SerialNumber: string;
  LastBootTime: string;
  CollectionTimestamp: string;
}

export interface HealthScore {
  Formula: string;
  OverallHealthScore: number;
  PerformanceScore: number;
  SecurityScore: number;
  ReliabilityScore: number;
  ScalabilityScore: number;
  ServiceabilityScore: number;
  UsabilityScore: number;
}

export interface RiskMatrixRow {
  Severity: string;
  FindingCount: number;
  TechnicalImpact: string;
  BusinessImpact: string;
  OperationalImpact: string;
}

export interface ForecastMetric {
  Day30: number | null;
  Day90: number | null;
  Day180: number | null;
  Day365: number | null;
  Confidence: 'High' | 'Medium' | 'Low' | 'Unknown';
  Note: string;
}

export interface CapacityForecast {
  Storage: ForecastMetric;
  Memory: ForecastMetric;
  CPU: ForecastMetric;
}

export interface HistoricalAssessment {
  AssessmentId: string;
  Timestamp: string;
  ComputerName: string;
  OSName: string;
  OverallHealth: number;
  Performance: number;
  Security: number;
  Reliability: number;
  Scalability: number;
  Serviceability: number;
  Usability: number;
}

export const MOCK_HISTORY: HistoricalAssessment[] = [
  {
    AssessmentId: "hist-001",
    Timestamp: "2026-05-15T10:00:00.0000000Z",
    ComputerName: "SENTINEL-SRV01",
    OSName: "Microsoft Windows Server 2022 Datacenter",
    OverallHealth: 62.5,
    Performance: 75.0,
    Security: 50.0,
    Reliability: 60.0,
    Scalability: 70.0,
    Serviceability: 80.0,
    Usability: 40.0
  },
  {
    AssessmentId: "hist-002",
    Timestamp: "2026-05-22T11:15:00.0000000Z",
    ComputerName: "SENTINEL-SRV01",
    OSName: "Microsoft Windows Server 2022 Datacenter",
    OverallHealth: 66.8,
    Performance: 80.0,
    Security: 55.0,
    Reliability: 68.0,
    Scalability: 75.0,
    Serviceability: 82.0,
    Usability: 45.0
  },
  {
    AssessmentId: "hist-003",
    Timestamp: "2026-05-29T09:30:00.0000000Z",
    ComputerName: "SENTINEL-SRV01",
    OSName: "Microsoft Windows Server 2022 Datacenter",
    OverallHealth: 70.4,
    Performance: 85.0,
    Security: 58.0,
    Reliability: 72.0,
    Scalability: 80.0,
    Serviceability: 88.0,
    Usability: 50.0
  },
  {
    AssessmentId: "hist-004",
    Timestamp: "2026-06-05T15:00:00.0000000Z",
    ComputerName: "SENTINEL-SRV01",
    OSName: "Microsoft Windows Server 2022 Datacenter",
    OverallHealth: 73.2,
    Performance: 85.0,
    Security: 60.0,
    Reliability: 77.0,
    Scalability: 82.0,
    Serviceability: 90.0,
    Usability: 50.0
  }
];

export const MOCK_ENVIRONMENT: EnvironmentOverview = {
  PlatformFamily: "Windows",
  SupportedPlatform: true,
  ExecutionMode: "Audit",
  IsElevated: true,
  ComputerName: "SENTINEL-SRV01",
  UserName: "Administrator",
  Domain: "CORP-DOMAIN",
  PowerShellVersion: "7.4.2",
  OSName: "Microsoft Windows Server 2022 Datacenter",
  OSVersion: "10.0.20348",
  OSBuild: "20348",
  Manufacturer: "VMware, Inc.",
  Model: "VMware Virtual Platform",
  SerialNumber: "VMware-56 4d b8 cc 38 f5 1c f3-8f 5d a2 63 f9 2c e5 a1",
  LastBootTime: "2026-06-01T08:15:30.0000000Z",
  CollectionTimestamp: "2026-06-05T15:00:00.0000000Z"
};

export const MOCK_HEALTH_SCORE: HealthScore = {
  Formula: "Overall = Performance*0.20 + Security*0.25 + Reliability*0.20 + Scalability*0.15 + Serviceability*0.10 + Usability*0.10",
  OverallHealthScore: 73.2,
  PerformanceScore: 85.0,
  SecurityScore: 60.0,
  ReliabilityScore: 77.0,
  ScalabilityScore: 82.0,
  ServiceabilityScore: 90.0,
  UsabilityScore: 50.0
};

export const MOCK_FINDINGS: Finding[] = [
  {
    FindingId: "PERF-DISKFREE-C",
    Category: "DiskCapacity",
    Domain: "Performance",
    Severity: "High",
    Confidence: "High",
    Priority: 20,
    Title: "Low free space on C:",
    Description: "The volume has less than 15 percent free space available.",
    Evidence: [
      { Source: "Disk", Name: "DeviceID", Value: "C:", ValidationState: "Validated", Collector: "Get-DiskEvidence", Notes: "", Timestamp: "2026-06-05T15:00:00Z" },
      { Source: "Disk", Name: "FreePercent", Value: 11.4, ValidationState: "Validated", Collector: "Get-DiskEvidence", Notes: "", Timestamp: "2026-06-05T15:00:00Z" },
      { Source: "Disk", Name: "FreeSpaceGB", Value: 14.2, ValidationState: "Validated", Collector: "Get-DiskEvidence", Notes: "", Timestamp: "2026-06-05T15:00:00Z" },
      { Source: "Disk", Name: "TotalSizeGB", Value: 124.5, ValidationState: "Validated", Collector: "Get-DiskEvidence", Notes: "", Timestamp: "2026-06-05T15:00:00Z" }
    ],
    Impact: "Low free space can degrade performance, increase fragmentation pressure, and reduce update reliability.",
    BusinessRisk: "Build failures, patching failures, and production instability.",
    RootCauseHypothesis: "Capacity growth exceeded available storage management controls.",
    RecommendedRemediation: "Free disk space, archive stale artifacts, move large datasets, or expand the volume.",
    EstimatedEffort: "Medium",
    VerificationMethod: "Re-run assessment and confirm free space is above threshold.",
    CreatedOn: "2026-06-05T15:00:00Z"
  },
  {
    FindingId: "SEC-FW-001",
    Category: "Firewall",
    Domain: "Security",
    Severity: "High",
    Confidence: "High",
    Priority: 20,
    Title: "One or more firewall profiles are disabled",
    Description: "The local firewall is not enabled across all discovered profiles.",
    Evidence: [
      {
        Source: "Security",
        Name: "DisabledFirewallProfiles",
        Value: [
          { "Name": "Public", "Enabled": false },
          { "Name": "Private", "Enabled": true },
          { "Name": "Domain", "Enabled": true }
        ],
        ValidationState: "Validated",
        Collector: "Get-SecurityEvidence",
        Notes: "",
        Timestamp: "2026-06-05T15:00:00Z"
      }
    ],
    Impact: "Host-based traffic filtering is weakened.",
    BusinessRisk: "Increased exposure to lateral movement and unwanted inbound access.",
    RootCauseHypothesis: "Firewall baseline drift or intentional weakening for application compatibility.",
    RecommendedRemediation: "Re-enable disabled firewall profiles and validate required allow rules.",
    EstimatedEffort: "Medium",
    VerificationMethod: "Confirm all firewall profiles report Enabled=True.",
    CreatedOn: "2026-06-05T15:00:00Z"
  },
  {
    FindingId: "SEC-DEF-001",
    Category: "Defender",
    Domain: "Security",
    Severity: "High",
    Confidence: "High",
    Priority: 20,
    Title: "Real-time antimalware protection is not enabled",
    Description: "Microsoft Defender real-time protection is not enabled.",
    Evidence: [
      { Source: "Security", "Name": "RealTimeProtectionEnabled", "Value": false, ValidationState: "Validated", Collector: "Get-SecurityEvidence", Notes: "", Timestamp: "2026-06-05T15:00:00Z" },
      { Source: "Security", "Name": "DefenderStatus", "Value": { "AntivirusEnabled": true, "RealTimeProtectionEnabled": false }, ValidationState: "Validated", Collector: "Get-SecurityEvidence", Notes: "", Timestamp: "2026-06-05T15:00:00Z" }
    ],
    Impact: "Malicious file and process activity may evade real-time interception.",
    BusinessRisk: "Increased malware execution risk on the endpoint or server.",
    RootCauseHypothesis: "Protection disabled, passive mode, or third-party control overlap.",
    RecommendedRemediation: "Validate security platform ownership and ensure real-time protection is enabled or an equivalent control is active.",
    EstimatedEffort: "Medium",
    VerificationMethod: "Re-run defender status collection and confirm real-time protection is enabled.",
    CreatedOn: "2026-06-05T15:00:00Z"
  },
  {
    FindingId: "REL-SVC-001",
    Category: "ServiceAvailability",
    Domain: "Reliability",
    Severity: "Medium",
    Confidence: "High",
    Priority: 50,
    Title: "Automatic services are not running",
    Description: "2 automatic services are not currently running.",
    Evidence: [
      {
        Source: "Service",
        Name: "AutomaticServicesNotRunning",
        Value: [
          { "Name": "Spooler", "DisplayName": "Print Spooler", "Status": "Stopped", "StartType": "Automatic" },
          { "Name": "WbioSrvc", "DisplayName": "Windows Biometric Service", "Status": "Stopped", "StartType": "Automatic" }
        ],
        ValidationState: "Validated",
        Collector: "Get-ServiceEvidence",
        Notes: "",
        Timestamp: "2026-06-05T15:00:00Z"
      }
    ],
    Impact: "Expected service behavior may be degraded or absent.",
    BusinessRisk: "Operational interruptions, missing dependencies, or degraded workstation/server function.",
    RootCauseHypothesis: "Service crash, dependency failure, disabled dependency, or startup issue.",
    RecommendedRemediation: "Review service dependencies and recent service-related events, then restore expected service state through standard change control.",
    EstimatedEffort: "Medium",
    VerificationMethod: "Confirm required automatic services remain running after restart or repair.",
    CreatedOn: "2026-06-05T15:00:00Z"
  },
  {
    FindingId: "SCALE-CPU-ARCH-001",
    Category: "CpuHeadroom",
    Domain: "Scalability",
    Severity: "Low",
    Confidence: "Medium",
    Priority: 80,
    Title: "Logical processor count limits growth headroom for multi-threaded workloads",
    Description: "The machine reports 4 logical processors.",
    Evidence: [
      { Source: "CPU", "Name": "NumberOfLogicalProcessors", "Value": 4, ValidationState: "Validated", Collector: "Get-ProcessorEvidence", Notes: "", Timestamp: "2026-06-05T15:00:00Z" }
    ],
    Impact: "Parallel build, AI, CI, and development workloads may saturate sooner.",
    BusinessRisk: "Reduced suitability for future concurrency-heavy workloads.",
    RootCauseHypothesis: "Hardware profile is closer to general-purpose endpoint sizing than engineering-node sizing.",
    RecommendedRemediation: "Evaluate workload class and consider higher-core configuration for AI, build, or shared engineering use.",
    EstimatedEffort: "High",
    VerificationMethod: "Compare against target workload concurrency requirements.",
    CreatedOn: "2026-06-05T15:00:00Z"
  },
  {
    FindingId: "USE-STARTUP-001",
    Category: "StartupImpact",
    Domain: "Usability",
    Severity: "Medium",
    Confidence: "Medium",
    Priority: 50,
    Title: "High startup item count may increase boot and sign-in friction",
    Description: "The machine has 18 startup command entries.",
    Evidence: [
      { Source: "Startup", "Name": "StartupCommandCount", "Value": 18, ValidationState: "Validated", Collector: "Get-StartupEvidence", Notes: "", Timestamp: "2026-06-05T15:00:00Z" }
    ],
    Impact: "Longer sign-in readiness and increased user friction.",
    BusinessRisk: "Reduced productivity and slower recovery after reboot.",
    RootCauseHypothesis: "Software accumulation and weak startup hygiene.",
    RecommendedRemediation: "Review startup entries and remove or delay non-essential launch items.",
    EstimatedEffort: "Low",
    VerificationMethod: "Measure reduced startup inventory and improved post-login readiness.",
    CreatedOn: "2026-06-05T15:00:00Z"
  }
];

export const MOCK_RISK_MATRIX: RiskMatrixRow[] = [
  {
    Severity: "Critical",
    FindingCount: 0,
    TechnicalImpact: "No critical impacts identified.",
    BusinessImpact: "No critical business risks observed.",
    OperationalImpact: "None observed"
  },
  {
    Severity: "High",
    FindingCount: 3,
    TechnicalImpact: "Low free space degrades performance | Host firewall defenses disabled | Real-time security protection absent",
    BusinessImpact: "Build & patch failures | Host network lateral movement | Malware execution risk",
    OperationalImpact: "Operational review required"
  },
  {
    Severity: "Medium",
    FindingCount: 2,
    TechnicalImpact: "Automatic services are stopped | Boot delay from startup items",
    BusinessImpact: "Interrupted print/auth functions | Workplace bootup slowdowns",
    OperationalImpact: "Operational review required"
  },
  {
    Severity: "Low",
    FindingCount: 1,
    TechnicalImpact: "Limited core count saturation under load",
    BusinessImpact: "Workload queuing or build delays",
    OperationalImpact: "Operational review required"
  },
  {
    Severity: "Informational",
    FindingCount: 0,
    TechnicalImpact: "No informational impacts noted.",
    BusinessImpact: "No business risks of informational grade.",
    OperationalImpact: "None observed"
  }
];

export const MOCK_CAPACITY_FORECAST: CapacityForecast = {
  Storage: {
    Day30: 92.5,
    Day90: 98.1,
    Day180: 100.0,
    Day365: 100.0,
    Confidence: "High",
    Note: "Storage growth trends indicate C: volume exhaustion within 95 days."
  },
  Memory: {
    Day30: 62.0,
    Day90: 63.5,
    Day180: 64.0,
    Day365: 65.5,
    Confidence: "Low",
    Note: "No significant upward trend in RAM usage. Available headroom is stable."
  },
  CPU: {
    Day30: 34.0,
    Day90: 35.0,
    Day180: 34.5,
    Day365: 36.0,
    Confidence: "Unknown",
    Note: "CPU forecasting relies on workload concurrency cycles; baseline remains stable."
  }
};

export const MOCK_LOGS = [
  "[Info] Starting Machine Health Assessment Framework v1.0.0",
  "[Info] ExecutionMode=Audit  OutputFormat=All  OutputPath=C:\\Users\\rajaj\\MachineHealthReport",
  "[Info] Running environment detection...",
  "[Info] Detected: Windows operating system, elevated privileges present.",
  "[Info] Running collector: Get-OperatingSystemEvidence",
  "[Info] Running collector: Get-ProcessorEvidence",
  "[Info] Running collector: Get-MemoryEvidence",
  "[Info] Running collector: Get-DiskEvidence",
  "[Info] Running collector: Get-NetworkEvidence",
  "[Info] Running collector: Get-ServiceEvidence",
  "[Info] Running collector: Get-StartupEvidence",
  "[Info] Running collector: Get-SecurityEvidence",
  "[Info] Running collector: Get-EventLogEvidence",
  "[Info] Running collector: Get-InstalledSoftwareEvidence",
  "[Info] Evidence collection complete. Validating evidence count...",
  "[Info] Validating collector outputs: OK.",
  "[Info] Invoking analysis engine...",
  "[Info] Evaluating performance metrics... Found low space on C: (11.4%).",
  "[Info] Evaluating security profiles... Disabled firewall profile Public detected.",
  "[Info] Evaluating security Defender... Realtime antivirus disabled.",
  "[Info] Evaluating reliability metrics... Stopped auto services detected: Spooler, WbioSrvc.",
  "[Info] Evaluating scalability headroom... CPU count OK, memory OK.",
  "[Info] Evaluating usability... Startup count detected: 18 items.",
  "[Info] Invoking correlation rules...",
  "[Info] Correlation found: Storage Capacity Pressure -> Outage Risk.",
  "[Info] Scoring machine health indexes...",
  "[Info] Exporting reports to C:\\Users\\rajaj\\MachineHealthReport...",
  "[Info] HTML dashboard generated: C:\\Users\\rajaj\\MachineHealthReport\\ExecutiveSummary.html",
  "[Info] JSON reports successfully written.",
  "[Info] Assessment completed successfully. Findings=6 Correlations=1"
];
