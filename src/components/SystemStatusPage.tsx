import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../utils/db';
import { Database, Shield, HardDrive, RefreshCw, Trash2, Settings } from '../utils/icons';

interface SystemStatusProps {
  activeAssessmentId: string | null;
  activeMachineName: string | null;
  nodesCount: number;
  linksCount: number;
  showToast: (message: string, type: 'success' | 'info' | 'warning' | 'error') => void;
  onPurgeDb: () => void;
}

export const SystemStatusPage: React.FC<SystemStatusProps> = ({
  activeAssessmentId,
  activeMachineName,
  nodesCount,
  linksCount,
  showToast,
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
      showToast('Assessment database cleared successfully.', 'success');
    } catch (err) {
      showToast('Error clearing database: ' + String(err), 'error');
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
      
      {/* 5-Section Layout grid */}
      <div className="dashboard-grid">
        
        {/* 1. Platform Health */}
        <div className="glass-panel" style={{ gridColumn: 'span 4' }}>
          <div className="panel-header">
            <h2 className="panel-title">
              <Database size={16} color="var(--color-cyan)" /> 
              <span>Platform Health</span>
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>IndexedDB Connection:</span>
              <strong style={{ color: dbOpen ? 'var(--color-green)' : 'var(--color-pink)' }}>
                {dbOpen ? 'CONNECTED' : 'DISCONNECTED'}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>DB Store Name:</span>
              <strong style={{ fontFamily: 'var(--font-mono)' }}>{db.name} (v{db.verno})</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Application Version:</span>
              <strong style={{ color: 'var(--color-cyan)', fontFamily: 'var(--font-mono)' }}>v1.0.0</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Build Timestamp:</span>
              <strong style={{ fontFamily: 'var(--font-mono)' }}>2026-06-05.1</strong>
            </div>
          </div>
        </div>

        {/* 2. Assessment Health */}
        <div className="glass-panel" style={{ gridColumn: 'span 4' }}>
          <div className="panel-header">
            <h2 className="panel-title">
              <Shield size={16} color="var(--color-blue)" /> 
              <span>Assessment Health</span>
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Active Host:</span>
              <strong style={{ fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>{activeAssessmentId ? activeMachineName : 'NONE'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Assessment ID:</span>
              <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{activeAssessmentId ? activeAssessmentId : 'No file loaded'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Total Historical Imports:</span>
              <strong style={{ fontFamily: 'var(--font-mono)' }}>{counts.assessments}</strong>
            </div>
          </div>
        </div>

        {/* 3. Storage Health */}
        <div className="glass-panel" style={{ gridColumn: 'span 4' }}>
          <div className="panel-header">
            <h2 className="panel-title">
              <HardDrive size={16} color="var(--color-pink)" /> 
              <span>Storage Health</span>
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>IndexedDB Storage Used:</span>
              <strong style={{ fontFamily: 'var(--font-mono)' }}>{storage.used}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Browser Allocation Quota:</span>
              <strong style={{ fontFamily: 'var(--font-mono)' }}>{storage.quota}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>LocalStorage Usage:</span>
              <strong style={{ fontFamily: 'var(--font-mono)' }}>{localStorageUsage}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Storage Quota Used %:</span>
              <strong style={{ fontFamily: 'var(--font-mono)' }}>{storage.percentage}%</strong>
            </div>
          </div>
        </div>

        {/* 4. Data Health */}
        <div className="glass-panel" style={{ gridColumn: 'span 7' }}>
          <div className="panel-header">
            <h2 className="panel-title"><Database size={16} /> Data Health & Table Statistics</h2>
            <button className="cyber-btn" style={{ padding: 'var(--spacing-2) var(--spacing-3)', fontSize: 'var(--font-size-caption)' }} onClick={fetchStats} disabled={loading}>
              <RefreshCw size={12} className={loading ? 'spin' : ''} />
              <span>Refresh Stats</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { name: 'assessments', label: 'Assessments Master', count: counts.assessments, desc: 'Stores core host metrics & config blocks.' },
              { name: 'findings', label: 'Findings Registry', count: counts.findings, desc: 'Aggregated list of security & performance alerts.' },
              { name: 'software', label: 'Software Catalog', count: counts.software, desc: 'Normalized list of packages discovered on targets.' },
              { name: 'assets', label: 'Logical Assets', count: counts.assets, desc: 'Disk volumes and CPU evidence nodes.' },
              { name: 'risks', label: 'Risk Indices', count: counts.risks, desc: 'Historical severity counters and drift levels.' },
              { name: 'exports', label: 'Export Packages', count: counts.exports, desc: 'Stored diagnostic snapshots.' }
            ].map(table => (
              <div key={table.name} style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '13px', color: 'var(--text-primary)' }}>{table.label}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>table: {table.name} • {table.desc}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
                  <span className="cyber-badge badge-cyan" style={{ fontSize: '11px', minWidth: '48px', justifyContent: 'center' }}>
                    {table.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 5. System Diagnostics */}
        <div className="glass-panel" style={{ gridColumn: 'span 5', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="panel-header">
              <h2 className="panel-title"><Settings size={16} /> System Diagnostics</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Graph Nodes Loaded:</span>
                <strong style={{ fontFamily: 'var(--font-mono)' }}>{nodesCount} Nodes</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Graph Links Rendered:</span>
                <strong style={{ fontFamily: 'var(--font-mono)' }}>{linksCount} Links</strong>
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
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center', lineHeight: '1.4' }}>
              Purging deletes all raw metrics, tables, and history in IndexedDB. Use with caution.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};
