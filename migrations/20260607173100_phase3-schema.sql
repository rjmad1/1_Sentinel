-- 5. self_healing_policies table
CREATE TABLE IF NOT EXISTS self_healing_policies (
    finding_id TEXT PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    execution_mode TEXT NOT NULL DEFAULT 'autonomous', -- 'autonomous' or 'approval_gated'
    tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. self_healing_runs table
CREATE TABLE IF NOT EXISTS self_healing_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID REFERENCES machines(machine_id) ON DELETE CASCADE,
    finding_id TEXT NOT NULL,
    status TEXT NOT NULL, -- 'success', 'failed', 'running'
    error_message TEXT,
    stdout TEXT,
    stderr TEXT,
    tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. vulnerabilities table
CREATE TABLE IF NOT EXISTS vulnerabilities (
    cve_id TEXT PRIMARY KEY,
    package_name TEXT NOT NULL,
    version_pattern TEXT NOT NULL, -- e.g. '<3.11.5'
    severity TEXT NOT NULL, -- 'Critical', 'High', 'Medium', 'Low'
    cvss_score DOUBLE PRECISION,
    summary TEXT,
    remediation_suggestion TEXT,
    tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed initial vulnerabilities for offline security matching
INSERT INTO vulnerabilities (cve_id, package_name, version_pattern, severity, cvss_score, summary, remediation_suggestion)
VALUES 
('CVE-2023-27043', 'Python', '<3.11.5', 'High', 7.5, 'Email address parsing vulnerability in email.utils.parseaddr.', 'Upgrade to Python 3.11.5 or newer.'),
('CVE-2023-32002', 'Node.js', '<20.5.0', 'Medium', 6.5, 'Permission model bypass via module.constructor.createRequire().', 'Upgrade Node.js to version 20.5.0 or newer.'),
('CVE-2023-29007', 'Git', '<2.41.0.3', 'High', 8.1, 'Arbitrary configuration injection via git submodule deinit.', 'Upgrade Git to version 2.41.0.3 or newer.'),
('CVE-2023-44487', 'Nginx', '<1.25.3', 'High', 7.5, 'HTTP/2 Rapid Reset DDoS vulnerability (flood of stream resets).', 'Upgrade Nginx to version 1.25.3 or newer.')
ON CONFLICT (cve_id) DO NOTHING;

-- Enable Row Level Security (RLS) on new tables
ALTER TABLE self_healing_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE self_healing_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vulnerabilities ENABLE ROW LEVEL SECURITY;

-- Configure RLS Policies
CREATE POLICY tenant_isolation_policy ON self_healing_policies
    FOR ALL
    USING (tenant_id = (auth.jwt() ->> 'tenant_id') OR auth.jwt() IS NULL)
    WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id') OR auth.jwt() IS NULL);

CREATE POLICY tenant_isolation_policy ON self_healing_runs
    FOR ALL
    USING (tenant_id = (auth.jwt() ->> 'tenant_id') OR auth.jwt() IS NULL)
    WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id') OR auth.jwt() IS NULL);

CREATE POLICY tenant_isolation_policy ON vulnerabilities
    FOR ALL
    USING (tenant_id = (auth.jwt() ->> 'tenant_id') OR auth.jwt() IS NULL)
    WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id') OR auth.jwt() IS NULL);
