import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../utils/db';
import { Database, Shield, Activity, HardDrive, RefreshCw, Trash2, Settings } from '../utils/icons';

interface SystemStatusProps {
  activeAssessmentId: string | null;
  activeMachineName: string | null;
  nodesCount: number;
  linksCount: number;
  onPurgeDb: () => void;
}

export const SystemStatusPage: React.FC<SystemStatusProps> = ({
  activeAssessmentId,
  activeMachineName,
  nodesCount,
  linksCount,
  onPurgeDb
}) => {
  const [counts, setCounts] = useState({
    assessments: 0,
    assets: 0,
    software: 0,
    findings: 0,
    risks: 0,
    exports: 0
  });
  const [storage, setStorage] = useState({
    used: 'N/A',
    quota: 'N/A',
    percentage: 0
  });
  const [localStorageUsage, setLocalStorageUsage] = useState('0 Bytes');
  const [dbOpen, setDbOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isPurging, setIsPurging] = useState(false);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      // Get table row counts
      const assessmentsCount = await db.assessments.count();
      const assetsCount = await db.assets.count();
      const softwareCount = await db.software.count();
      const findingsCount = await db.findings.count();
      const risksCount = await db.risks.count();
      const exportsCount = await db.exports.count();

      setCounts({
        assessments: assessmentsCount,
        assets: assetsCount,
        software: softwareCount,
        findings: findingsCount,
        risks: risksCount,
        exports: exportsCount
      });

      setDbOpen(db.isOpen());

      // Storage Estimate
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        const usageBytes = estimate.usage || 0;
        const quotaBytes = estimate.quota || 1;
        const pct = Math.round((usageBytes / quotaBytes) * 10000) / 100;
        
        setStorage({
          used: formatBytes(usageBytes),
          quota: formatBytes(quotaBytes),
          percentage: pct
        });
      }

      // LocalStorage usage
      let lsBytes = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          lsBytes += key.length + (localStorage.getItem(key) || '').length;
        }
      }
      setLocalStorageUsage(formatBytes(lsBytes));
    } catch (err) {
      console.error('Failed to retrieve system status telemetry:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleClearDatabase = async () => {
    if (!window.confirm('WARNING: Are you sure you want to purge all assessment database tables? This will delete all imported and demo assessments from IndexedDB.')) {
      return;
    }
    
    setIsPurging(true);
    try {
      await db.transaction('rw', [db.assessments, db.assets, db.software, db.findings, db.risks, db.exports], async () => {
        await db.assessments.clear();
        await db.assets.clear();
        await db.software.clear();
        await db.findings.clear();
        await db.risks.clear();
        await db.exports.clear();
      });
      
      onPurgeDb();
      await fetchStats();
      alert('Assessment database cleared successfully.');
    } catch (err) {
      alert('Error clearing database: ' + String(err));
    } finally {
      setIsPurging(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStats();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchStats]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Visual System Overview Row */}
      <div className="stats-container">
        
        <div className="glass-panel">
          <div className="panel-title">
            <Database size={16} color="var(--color-cyan)" /> 
            <span>IndexedDB State</span>
          </div>
          <div className="metric-value" style={{ color: dbOpen ? 'var(--color-green)' : 'var(--color-pink)' }}>
            {dbOpen ? 'CONNECTED' : 'DISCONNECTED'}
          </div>
          <div className="metric-label" style={{ marginTop: '8px' }}>
            Store: {db.name} (v{db.verno})
          </div>
        </div>

        <div className="glass-panel">
          <div className="panel-title">
            <Shield size={16} color="var(--color-blue)" /> 
            <span>Active Assessment</span>
          </div>
          <div className="metric-value" style={{ fontSize: activeAssessmentId ? '22px' : '28px', wordBreak: 'break-all' }}>
            {activeAssessmentId ? activeMachineName : 'NONE'}
          </div>
          <div className="metric-label" style={{ marginTop: '8px' }}>
            {activeAssessmentId ? `ID: ${activeAssessmentId.substring(0, 8)}...` : 'No file loaded'}
          </div>
        </div>

        <div className="glass-panel">
          <div className="panel-title">
            <Activity size={16} color="var(--color-cyan)" /> 
            <span>Total Imports</span>
          </div>
          <div className="metric-value">{counts.assessments}</div>
          <div className="metric-label" style={{ marginTop: '8px' }}>
            Historical Runs Stored
          </div>
        </div>

        <div className="glass-panel">
          <div className="panel-title">
            <HardDrive size={16} color="var(--color-pink)" /> 
            <span>Storage Used</span>
          </div>
          <div className="metric-value" style={{ fontSize: '26px' }}>{storage.used}</div>
          <div className="metric-label" style={{ marginTop: '8px' }}>
            Est. Quota: {storage.quota}
          </div>
        </div>

      </div>

      <div className="dashboard-grid">
        
        {/* Table Rows Count */}
        <div className="glass-panel" style={{ gridColumn: 'span 7' }}>
          <div className="panel-header">
            <h2 className="panel-title"><Database size={16} /> Database Table Statistics</h2>
            <button className="cyber-btn" style={{ padding: '6px 12px', fontSize: '11px' }} onClick={fetchStats} disabled={loading}>
              <RefreshCw size={12} className={loading ? 'spin' : ''} />
              <span>Refresh Stats</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              { name: 'assessments', label: 'Assessments Master', count: counts.assessments, desc: 'Stores core host metrics & config blocks.' },
              { name: 'findings', label: 'Findings Registry', count: counts.findings, desc: 'Aggregated list of security & performance alerts.' },
              { name: 'software', label: 'Software Catalog', count: counts.software, desc: 'Normalized list of packages discovered on targets.' },
              { name: 'assets', label: 'Logical Assets', count: counts.assets, desc: 'Disk volumes and CPU evidence nodes.' },
              { name: 'risks', label: 'Risk Indices', count: counts.risks, desc: 'Historical severity counters and drift levels.' },
              { name: 'exports', label: 'Export Packages', count: counts.exports, desc: 'Stored diagnostic snapshots.' }
            ].map(table => (
              <div key={table.name} style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '10px' }}>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{table.label}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>table: {table.name} • {table.desc}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="cyber-badge badge-cyan" style={{ fontSize: '13px', minWidth: '50px', justifyContent: 'center' }}>
                    {table.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Telemetry and System Info */}
        <div className="glass-panel" style={{ gridColumn: 'span 5', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="panel-header">
              <h2 className="panel-title"><Settings size={16} /> System Diagnostics</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>LocalStorage Size:</span>
                <strong style={{ fontFamily: 'var(--font-mono)' }}>{localStorageUsage}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Graph Nodes Loaded:</span>
                <strong style={{ fontFamily: 'var(--font-mono)' }}>{nodesCount} Nodes</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Graph Links Rendered:</span>
                <strong style={{ fontFamily: 'var(--font-mono)' }}>{linksCount} Links</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Storage quota allocation:</span>
                <strong style={{ fontFamily: 'var(--font-mono)' }}>{storage.percentage}%</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Application Version:</span>
                <strong style={{ color: 'var(--color-cyan)', fontFamily: 'var(--font-mono)' }}>v1.0.0</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Build Timestamp:</span>
                <strong style={{ fontFamily: 'var(--font-mono)' }}>2026-06-05.1</strong>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '24px' }}>
            <button 
              className="cyber-btn cyber-btn-danger" 
              style={{ width: '100%', gap: '8px', padding: '12px' }}
              onClick={handleClearDatabase}
              disabled={isPurging}
            >
              <Trash2 size={14} />
              <span>{isPurging ? 'Purging Tables...' : 'Purge Assessment Database'}</span>
            </button>
            <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center', lineHeight: '1.4' }}>
              Purging deletes all raw metrics, tables, and history in IndexedDB. Use with caution.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};
