-- 1. machines table
CREATE TABLE IF NOT EXISTS machines (
    machine_id UUID PRIMARY KEY,
    computer_name TEXT NOT NULL,
    domain TEXT,
    platform TEXT NOT NULL,
    architecture TEXT NOT NULL,
    hypervisor TEXT,
    bios_serial TEXT,
    mac_address TEXT,
    os_caption TEXT,
    os_version TEXT,
    os_install_date TEXT,
    os_last_boot_time TEXT,
    logical_cores INTEGER,
    physical_processors INTEGER,
    total_memory_gb DOUBLE PRECISION,
    free_memory_gb DOUBLE PRECISION,
    tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
    site_id TEXT NOT NULL DEFAULT 'default-site',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. domain_scores table (represents each assessment run)
CREATE TABLE IF NOT EXISTS domain_scores (
    id UUID PRIMARY KEY, -- assessment_id
    machine_id UUID REFERENCES machines(machine_id) ON DELETE CASCADE,
    performance_score DOUBLE PRECISION NOT NULL,
    security_score DOUBLE PRECISION NOT NULL,
    reliability_score DOUBLE PRECISION NOT NULL,
    scalability_score DOUBLE PRECISION NOT NULL,
    serviceability_score DOUBLE PRECISION NOT NULL,
    usability_score DOUBLE PRECISION NOT NULL,
    overall_health_score DOUBLE PRECISION NOT NULL,
    data JSONB NOT NULL, -- full consolidated assessment report JSON
    tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. findings table
CREATE TABLE IF NOT EXISTS findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID REFERENCES machines(machine_id) ON DELETE CASCADE,
    assessment_id UUID REFERENCES domain_scores(id) ON DELETE CASCADE,
    finding_id TEXT NOT NULL,
    category TEXT NOT NULL,
    domain TEXT NOT NULL,
    severity TEXT NOT NULL,
    confidence TEXT NOT NULL,
    priority INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    evidence JSONB,
    impact TEXT,
    business_risk TEXT,
    root_cause_hypothesis TEXT,
    recommended_remediation TEXT,
    estimated_effort TEXT,
    verification_method TEXT,
    tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. remediation_plans table
CREATE TABLE IF NOT EXISTS remediation_plans (
    plan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID REFERENCES machines(machine_id) ON DELETE CASCADE,
    finding_id TEXT NOT NULL,
    approver TEXT,
    approval_time TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'pending',
    execution_script JSONB,
    rollback_script JSONB,
    validation_script JSONB,
    tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE remediation_plans ENABLE ROW LEVEL SECURITY;

-- Configure RLS Policies matching user tenant_id claim
CREATE POLICY tenant_isolation_policy ON machines
    FOR ALL
    USING (tenant_id = (auth.jwt() ->> 'tenant_id'))
    WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id'));

CREATE POLICY tenant_isolation_policy ON domain_scores
    FOR ALL
    USING (tenant_id = (auth.jwt() ->> 'tenant_id'))
    WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id'));

CREATE POLICY tenant_isolation_policy ON findings
    FOR ALL
    USING (tenant_id = (auth.jwt() ->> 'tenant_id'))
    WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id'));

CREATE POLICY tenant_isolation_policy ON remediation_plans
    FOR ALL
    USING (tenant_id = (auth.jwt() ->> 'tenant_id'))
    WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id'));
