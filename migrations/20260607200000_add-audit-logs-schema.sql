-- Migration: Create audit_logs table for administrative and security events tracking
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    actor TEXT NOT NULL,
    details JSONB,
    tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Configure RLS Policy
CREATE POLICY tenant_isolation_policy ON audit_logs
    FOR ALL
    USING (tenant_id = (auth.jwt() ->> 'tenant_id'))
    WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id'));

-- Indexing for rapid audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
