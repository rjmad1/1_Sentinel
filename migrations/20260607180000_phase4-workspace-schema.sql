-- 8. workspace_repositories table
CREATE TABLE IF NOT EXISTS workspace_repositories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID REFERENCES machines(machine_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    remote_url TEXT,
    default_branch TEXT NOT NULL DEFAULT 'main',
    current_branch TEXT NOT NULL DEFAULT 'main',
    size_bytes BIGINT NOT NULL DEFAULT 0,
    uncommitted_count INTEGER NOT NULL DEFAULT 0,
    staged_count INTEGER NOT NULL DEFAULT 0,
    untracked_count INTEGER NOT NULL DEFAULT 0,
    unpushed_count INTEGER NOT NULL DEFAULT 0,
    unpulled_count INTEGER NOT NULL DEFAULT 0,
    has_merge_conflicts BOOLEAN NOT NULL DEFAULT FALSE,
    is_detached_head BOOLEAN NOT NULL DEFAULT FALSE,
    health_status TEXT NOT NULL DEFAULT 'healthy', -- 'healthy', 'warning', 'unsafe'
    last_modified TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_opened TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    profile_id TEXT DEFAULT 'default',
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    language TEXT,
    tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. workspace_profiles table
CREATE TABLE IF NOT EXISTS workspace_profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    repositories TEXT[] DEFAULT ARRAY[]::TEXT[],
    folder_locations TEXT[] DEFAULT ARRAY[]::TEXT[],
    preferred_branch TEXT DEFAULT 'main',
    retention_days INTEGER DEFAULT 90,
    tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. workspace_snapshots table
CREATE TABLE IF NOT EXISTS workspace_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID REFERENCES machines(machine_id) ON DELETE CASCADE,
    profile_id TEXT NOT NULL,
    snapshot_data JSONB NOT NULL,
    tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. workspace_cleanup_logs table
CREATE TABLE IF NOT EXISTS workspace_cleanup_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID REFERENCES machines(machine_id) ON DELETE CASCADE,
    repository_name TEXT NOT NULL,
    remote_url TEXT NOT NULL,
    freed_bytes BIGINT NOT NULL,
    deleted_path TEXT NOT NULL,
    verified_pushed BOOLEAN NOT NULL DEFAULT TRUE,
    tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE workspace_repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_cleanup_logs ENABLE ROW LEVEL SECURITY;

-- Configure RLS Policies
CREATE POLICY tenant_isolation_policy ON workspace_repositories
    FOR ALL
    USING (tenant_id = (auth.jwt() ->> 'tenant_id'))
    WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id'));

CREATE POLICY tenant_isolation_policy ON workspace_profiles
    FOR ALL
    USING (tenant_id = (auth.jwt() ->> 'tenant_id'))
    WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id'));

CREATE POLICY tenant_isolation_policy ON workspace_snapshots
    FOR ALL
    USING (tenant_id = (auth.jwt() ->> 'tenant_id'))
    WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id'));

CREATE POLICY tenant_isolation_policy ON workspace_cleanup_logs
    FOR ALL
    USING (tenant_id = (auth.jwt() ->> 'tenant_id'))
    WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id'));
