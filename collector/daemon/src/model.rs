use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "PascalCase")]
pub struct EvidenceRecord {
    pub source: String,
    pub name: String,
    pub value: serde_json::Value,
    pub validation_state: String,
    pub collector: String,
    pub notes: String,
    pub timestamp: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "PascalCase")]
pub struct Finding {
    pub finding_id: String,
    pub category: String,
    pub domain: String,
    pub severity: String,
    pub confidence: String,
    pub priority: i32,
    pub title: String,
    pub description: String,
    pub evidence: Vec<EvidenceRecord>,
    pub impact: String,
    pub business_risk: String,
    pub root_cause_hypothesis: String,
    pub recommended_remediation: String,
    pub estimated_effort: String,
    pub verification_method: String,
    pub created_on: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "PascalCase")]
pub struct EnvironmentOverview {
    pub platform_family: String,
    pub supported_platform: bool,
    pub execution_mode: String,
    pub is_elevated: bool,
    pub computer_name: String,
    pub user_name: String,
    pub domain: String,
    pub power_shell_version: String,
    pub os_name: String,
    pub os_version: String,
    pub os_build: String,
    pub manufacturer: String,
    pub model: String,
    pub serial_number: String,
    pub last_boot_time: String,
    pub collection_timestamp: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "PascalCase")]
pub struct HealthScore {
    pub formula: String,
    pub overall_health_score: f64,
    pub performance_score: f64,
    pub security_score: f64,
    pub reliability_score: f64,
    pub scalability_score: f64,
    pub serviceability_score: f64,
    pub usability_score: f64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "PascalCase")]
pub struct RiskMatrixRow {
    pub severity: String,
    pub finding_count: i32,
    pub technical_impact: String,
    pub business_impact: String,
    pub operational_impact: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "PascalCase")]
pub struct ForecastMetric {
    pub day30: Option<f64>,
    pub day90: Option<f64>,
    pub day180: Option<f64>,
    pub day365: Option<f64>,
    pub confidence: String,
    pub note: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "PascalCase")]
pub struct CapacityForecast {
    pub storage: ForecastMetric,
    pub memory: ForecastMetric,
    pub cpu: ForecastMetric,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SoftwarePackage {
    #[serde(rename = "Name")]
    pub name: String,
    #[serde(rename = "Version")]
    pub version: String,
    #[serde(rename = "Publisher")]
    pub publisher: Option<String>,
    #[serde(rename = "Source")]
    pub source: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "PascalCase")]
pub struct ConsolidatedAssessment {
    pub assessment_id: String,
    pub machine: EnvironmentOverview,
    pub assets: Vec<serde_json::Value>,
    pub software: Vec<SoftwarePackage>,
    pub services: Vec<serde_json::Value>,
    pub security: Vec<Finding>,
    pub reliability: Vec<Finding>,
    pub raw_evidence: Vec<EvidenceRecord>,
    pub findings: Vec<Finding>,
    pub health_score: HealthScore,
    pub risk_matrix: Vec<RiskMatrixRow>,
    pub capacity_forecast: CapacityForecast,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub completed_remediations: Option<serde_json::Value>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DaemonStatusResponse {
    pub connected: bool,
    pub version: String,
    pub platform: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct HealthStatusResponse {
    pub status: String,
    pub uptime_seconds: u64,
    pub memory_bytes: u64,
    pub cpu_percent: f64,
}
