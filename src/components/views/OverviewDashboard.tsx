import React from 'react';
import {
  Activity,
  Shield,
  AlertTriangle,
  Cpu,
  HardDrive,
  Globe
} from '../../utils/icons';
import { FileIcon } from '../DesignSystemComponents';

interface OverviewDashboardProps {
  environment: {
    ComputerName: string;
    OSName: string;
    Platform: string;
    LogicalCores: number;
    TotalMemoryGB: number;
  };
  healthScore: {
    OverallHealthScore: number;
    PerformanceScore: number;
    SecurityScore: number;
    ReliabilityScore: number;
    ScalabilityScore: number;
    ServiceabilityScore: number;
    UsabilityScore: number;
  };
  findings: Array<{
    FindingId: string;
    Category: string;
    Severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';
    Title: string;
    Description: string;
    RecommendedRemediation: string;
  }>;
  onExportExecutiveReport: () => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  environment,
  healthScore,
  findings,
  onExportExecutiveReport
}) => {
  const criticalCount = findings.filter(f => f.Severity === 'Critical').length;
  const highCount = findings.filter(f => f.Severity === 'High').length;
  const warningCount = findings.filter(f => f.Severity === 'Medium' || f.Severity === 'Low').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px', backgroundColor: '#0b0f19', minHeight: '100%' }}>
      {/* Header Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#111827',
        borderRadius: '12px',
        padding: '20px 24px',
        border: '1px solid #1f2937'
      }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: '#f9fafb', margin: 0 }}>
            {environment.ComputerName} Infrastructure Intelligence
          </h1>
          <p style={{ fontSize: '13px', color: '#9ca3af', margin: '4px 0 0 0' }}>
            {environment.OSName} • {environment.Platform} • {environment.LogicalCores} Cores • {environment.TotalMemoryGB} GB RAM
          </p>
        </div>

        <button
          onClick={onExportExecutiveReport}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#10b981',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 16px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <FileIcon size={16} />
          Export Executive Report (PDF/HTML)
        </button>
      </div>

      {/* Domain Sub-Score Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        {[
          { label: 'Overall Health', score: healthScore.OverallHealthScore, icon: <Activity style={{ color: '#3b82f6' }} /> },
          { label: 'Security Score', score: healthScore.SecurityScore, icon: <Shield style={{ color: '#ef4444' }} /> },
          { label: 'Performance', score: healthScore.PerformanceScore, icon: <Cpu style={{ color: '#10b981' }} /> },
          { label: 'Reliability', score: healthScore.ReliabilityScore, icon: <AlertTriangle style={{ color: '#f59e0b' }} /> },
          { label: 'Capacity', score: healthScore.ScalabilityScore, icon: <HardDrive style={{ color: '#8b5cf6' }} /> },
          { label: 'Serviceability', score: healthScore.ServiceabilityScore, icon: <Globe style={{ color: '#06b6d4' }} /> }
        ].map((metric, idx) => (
          <div key={idx} style={{
            backgroundColor: '#111827',
            border: '1px solid #1f2937',
            borderRadius: '10px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>{metric.label}</span>
              {metric.icon}
            </div>
            <div style={{ fontSize: '26px', fontWeight: 'bold', color: metric.score >= 80 ? '#10b981' : metric.score >= 60 ? '#f59e0b' : '#ef4444' }}>
              {Math.round(metric.score)}%
            </div>
          </div>
        ))}
      </div>

      {/* Active Findings Summary */}
      <div style={{
        backgroundColor: '#111827',
        borderRadius: '12px',
        padding: '20px 24px',
        border: '1px solid #1f2937'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#f3f4f6', margin: 0 }}>
            Active Findings & Risks ({findings.length})
          </h2>
          <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
            <span style={{ color: '#ef4444' }}>● Critical: {criticalCount}</span>
            <span style={{ color: '#f59e0b' }}>● High: {highCount}</span>
            <span style={{ color: '#3b82f6' }}>● Warning: {warningCount}</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {findings.slice(0, 10).map((finding) => (
            <div key={finding.FindingId} style={{
              backgroundColor: '#1f2937',
              borderRadius: '8px',
              padding: '14px 16px',
              borderLeft: `4px solid ${
                finding.Severity === 'Critical' ? '#ef4444' : finding.Severity === 'High' ? '#f59e0b' : '#3b82f6'
              }`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600, color: '#f9fafb', fontSize: '14px' }}>
                  [{finding.FindingId}] {finding.Title}
                </span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 'bold',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: finding.Severity === 'Critical' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                  color: finding.Severity === 'Critical' ? '#ef4444' : '#f59e0b'
                }}>
                  {finding.Severity}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#9ca3af', margin: '6px 0 0 0' }}>
                {finding.Description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
