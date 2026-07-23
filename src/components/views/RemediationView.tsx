import React, { useState } from 'react';
import { Shield, Play, RefreshCw } from '../../utils/icons';
import { SeverityBadge, CheckCircleIcon } from '../DesignSystemComponents';

export interface RemediationFinding {
  FindingId: string;
  Category: string;
  Severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';
  Title: string;
  Description: string;
  Impact?: string;
  RootCauseHypothesis?: string;
  RecommendedRemediation: string;
  EstimatedEffort?: string;
  Status?: string;
}

interface RemediationViewProps {
  findings: RemediationFinding[];
  canExecute: boolean;
  canApprove?: boolean;
  onExecuteRemediation?: (findingId: string) => void;
  showToast: (msg: string, type: 'success' | 'info' | 'warning' | 'error') => void;
}

export const RemediationView: React.FC<RemediationViewProps> = ({
  findings,
  canExecute,
  onExecuteRemediation,
  showToast
}) => {
  const [executingMap, setExecutingMap] = useState<Record<string, boolean>>({});
  const [filterSeverity, setFilterSeverity] = useState<string>('All');

  const filteredFindings = findings.filter(f => {
    if (filterSeverity === 'All') return true;
    return f.Severity === filterSeverity;
  });

  const handleRunRemediation = async (findingId: string) => {
    if (!canExecute) {
      showToast("Access Denied: Only Administrators can execute remediations.", "error");
      return;
    }
    setExecutingMap(prev => ({ ...prev, [findingId]: true }));
    try {
      if (onExecuteRemediation) {
        await onExecuteRemediation(findingId);
      }
      showToast(`Remediation executed successfully for ${findingId}.`, 'success');
    } catch {
      showToast(`Failed to execute remediation for ${findingId}.`, 'error');
    } finally {
      setExecutingMap(prev => ({ ...prev, [findingId]: false }));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px', backgroundColor: 'var(--bg-primary, #0b0f19)', color: 'var(--text-primary, #f9fafb)' }}>
      {/* Top Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#111827',
        border: '1px solid #1f2937',
        borderRadius: '12px',
        padding: '20px 24px'
      }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shield style={{ color: '#10b981' }} size={20} />
            Closed-Loop Self-Healing & Remediation Command Center
          </h2>
          <p style={{ fontSize: '13px', color: '#9ca3af', margin: '4px 0 0 0' }}>
            Execute approval-gated corrective actions, monitor self-healing policies, and track resolution metrics.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['All', 'Critical', 'High', 'Medium', 'Low'].map(sev => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              style={{
                backgroundColor: filterSeverity === sev ? '#10b981' : '#1f2937',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Findings Action List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredFindings.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#111827', borderRadius: '8px', border: '1px solid #1f2937', color: '#9ca3af' }}>
            <CheckCircleIcon size={32} color="#10b981" />
            <p style={{ marginTop: '12px', fontSize: '14px' }}>No active findings requiring remediation in this category.</p>
          </div>
        ) : (
          filteredFindings.map(finding => (
            <div
              key={finding.FindingId}
              style={{
                backgroundColor: '#111827',
                border: '1px solid #1f2937',
                borderRadius: '8px',
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <SeverityBadge severity={finding.Severity} />
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#f3f4f6' }}>{finding.Title}</span>
                  <span style={{ fontSize: '11px', color: '#6b7280', fontFamily: 'monospace' }}>[{finding.FindingId}]</span>
                </div>
                <button
                  disabled={executingMap[finding.FindingId]}
                  onClick={() => handleRunRemediation(finding.FindingId)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: canExecute ? '#3b82f6' : '#374151',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: canExecute ? 'pointer' : 'not-allowed',
                    opacity: executingMap[finding.FindingId] ? 0.6 : 1
                  }}
                >
                  {executingMap[finding.FindingId] ? <RefreshCw size={14} className="spin" /> : <Play size={14} />}
                  <span>{executingMap[finding.FindingId] ? 'Executing...' : 'Execute Remediation'}</span>
                </button>
              </div>
              <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0 }}>{finding.Description}</p>
              {finding.RecommendedRemediation && (
                <div style={{ backgroundColor: '#1f2937', padding: '10px 14px', borderRadius: '6px', fontSize: '12px', color: '#10b981', borderLeft: '3px solid #10b981' }}>
                  <strong>Remediation Step:</strong> {finding.RecommendedRemediation}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
