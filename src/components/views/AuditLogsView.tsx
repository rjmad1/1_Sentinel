import React from 'react';
import { Terminal as TerminalIcon } from '../../utils/icons';

export interface AuditRecord {
  id: string;
  action: string;
  actor: string;
  timestamp: string;
  details?: string;
}

interface AuditLogsViewProps {
  logs: string[];
  auditRecords?: AuditRecord[];
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ logs, auditRecords = [] }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px', backgroundColor: 'var(--bg-primary, #0b0f19)' }}>
      <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '20px 24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#f9fafb', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <TerminalIcon style={{ color: '#3b82f6' }} size={20} />
          System Execution Log & Audit Trail
        </h2>
        <p style={{ fontSize: '13px', color: '#9ca3af', margin: '4px 0 0 0' }}>
          Immutable operational log stream capturing agent events, API requests, and self-healing runs.
        </p>
      </div>

      {/* Terminal Output Window */}
      <div style={{
        backgroundColor: '#030712',
        border: '1px solid #1f2937',
        borderRadius: '8px',
        padding: '16px',
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#10b981',
        maxHeight: '400px',
        overflowY: 'auto',
        lineHeight: '1.6'
      }}>
        {logs.length === 0 ? (
          <div style={{ color: '#6b7280' }}>[INFO] System logger initialized. Monitoring live telemetry events...</div>
        ) : (
          logs.map((log, idx) => (
            <div key={idx} style={{ wordBreak: 'break-all' }}>
              {log}
            </div>
          ))
        )}
      </div>

      {/* Audit Log Table */}
      {auditRecords.length > 0 && (
        <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #1f2937', fontWeight: 'bold', fontSize: '14px', color: '#f3f4f6' }}>
            Structured Tenant Audit Logs
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#1f2937', color: '#9ca3af' }}>
                <th style={{ padding: '10px 16px' }}>Timestamp</th>
                <th style={{ padding: '10px 16px' }}>Actor</th>
                <th style={{ padding: '10px 16px' }}>Action</th>
                <th style={{ padding: '10px 16px' }}>Log ID</th>
              </tr>
            </thead>
            <tbody>
              {auditRecords.map(rec => (
                <tr key={rec.id} style={{ borderBottom: '1px solid #1f2937', color: '#e5e7eb' }}>
                  <td style={{ padding: '10px 16px' }}>{rec.timestamp}</td>
                  <td style={{ padding: '10px 16px', fontWeight: 600 }}>{rec.actor}</td>
                  <td style={{ padding: '10px 16px' }}>{rec.action}</td>
                  <td style={{ padding: '10px 16px', fontFamily: 'monospace', color: '#6b7280' }}>{rec.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
