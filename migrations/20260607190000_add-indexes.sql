-- Migration: Add Indexes for Performance & Query Optimization
-- Table: machines
CREATE INDEX IF NOT EXISTS idx_machines_tenant_id ON machines(tenant_id);
CREATE INDEX IF NOT EXISTS idx_machines_computer_name ON machines(computer_name);
CREATE INDEX IF NOT EXISTS idx_machines_platform ON machines(platform);
CREATE INDEX IF NOT EXISTS idx_machines_updated_at ON machines(updated_at);

-- Table: domain_scores
CREATE INDEX IF NOT EXISTS idx_domain_scores_machine_id ON domain_scores(machine_id);
CREATE INDEX IF NOT EXISTS idx_domain_scores_tenant_id ON domain_scores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_domain_scores_created_at ON domain_scores(created_at);

-- Table: findings
CREATE INDEX IF NOT EXISTS idx_findings_machine_id ON findings(machine_id);
CREATE INDEX IF NOT EXISTS idx_findings_assessment_id ON findings(assessment_id);
CREATE INDEX IF NOT EXISTS idx_findings_tenant_id ON findings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_findings_finding_id ON findings(finding_id);
CREATE INDEX IF NOT EXISTS idx_findings_category ON findings(category);
CREATE INDEX IF NOT EXISTS idx_findings_severity ON findings(severity);
CREATE INDEX IF NOT EXISTS idx_findings_created_at ON findings(created_at);

-- Table: remediation_plans
CREATE INDEX IF NOT EXISTS idx_remediation_plans_machine_id ON remediation_plans(machine_id);
CREATE INDEX IF NOT EXISTS idx_remediation_plans_finding_id ON remediation_plans(finding_id);
CREATE INDEX IF NOT EXISTS idx_remediation_plans_tenant_id ON remediation_plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_remediation_plans_status ON remediation_plans(status);

-- Table: self_healing_policies
CREATE INDEX IF NOT EXISTS idx_self_healing_policies_tenant_id ON self_healing_policies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_self_healing_policies_enabled ON self_healing_policies(enabled);

-- Table: self_healing_runs
CREATE INDEX IF NOT EXISTS idx_self_healing_runs_machine_id ON self_healing_runs(machine_id);
CREATE INDEX IF NOT EXISTS idx_self_healing_runs_finding_id ON self_healing_runs(finding_id);
CREATE INDEX IF NOT EXISTS idx_self_healing_runs_tenant_id ON self_healing_runs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_self_healing_runs_status ON self_healing_runs(status);
CREATE INDEX IF NOT EXISTS idx_self_healing_runs_executed_at ON self_healing_runs(executed_at);

-- Table: vulnerabilities
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_package_name ON vulnerabilities(package_name);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_severity ON vulnerabilities(severity);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_tenant_id ON vulnerabilities(tenant_id);

-- Table: workspace_repositories
CREATE INDEX IF NOT EXISTS idx_workspace_repositories_machine_id ON workspace_repositories(machine_id);
CREATE INDEX IF NOT EXISTS idx_workspace_repositories_tenant_id ON workspace_repositories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workspace_repositories_health_status ON workspace_repositories(health_status);

-- Table: workspace_profiles
CREATE INDEX IF NOT EXISTS idx_workspace_profiles_tenant_id ON workspace_profiles(tenant_id);

-- Table: workspace_snapshots
CREATE INDEX IF NOT EXISTS idx_workspace_snapshots_machine_id ON workspace_snapshots(machine_id);
CREATE INDEX IF NOT EXISTS idx_workspace_snapshots_tenant_id ON workspace_snapshots(tenant_id);

-- Table: workspace_cleanup_logs
CREATE INDEX IF NOT EXISTS idx_workspace_cleanup_logs_machine_id ON workspace_cleanup_logs(machine_id);
CREATE INDEX IF NOT EXISTS idx_workspace_cleanup_logs_tenant_id ON workspace_cleanup_logs(tenant_id);
