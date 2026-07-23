import { describe, it, expect } from 'vitest';
import {
  getEvidenceValue,
  getSafeProperty,
  createEvidenceRecord,
  createFinding,
  runAssessment,
  buildRemediationDashboard
} from '../../src/utils/assessmentEngine';

describe('Assessment Rules Engine Unit Tests', () => {
  it('should extract evidence value correctly from evidence records array', () => {
    const records = [
      createEvidenceRecord('Memory', 'FreePhysicalMemoryKB', 4194304),
      createEvidenceRecord('OS', 'Caption', 'Microsoft Windows 11 Enterprise')
    ];

    const memValue = getEvidenceValue(records, 'Memory', 'FreePhysicalMemoryKB');
    expect(memValue).toBe(4194304);

    const missingValue = getEvidenceValue(records, 'Disk', 'FreeSpaceGB');
    expect(missingValue).toBeNull();
  });

  it('should safely extract object properties with fallback defaults', () => {
    const sampleObj = { totalMemory: 16, platform: 'Windows' };
    
    expect(getSafeProperty(sampleObj, 'totalMemory')).toBe(16);
    expect(getSafeProperty(sampleObj, 'missingProp', 'defaultVal')).toBe('defaultVal');
    expect(getSafeProperty(null, 'anyProp', 100)).toBe(100);
  });

  it('should construct a valid finding object with normalized properties', () => {
    const finding = createFinding({
      findingId: 'SEC-FW-001',
      category: 'Security',
      domain: 'Security',
      severity: 'Critical',
      confidence: 'High',
      priority: 1,
      title: 'Public Firewall Profile Disabled',
      description: 'The Windows Public Firewall profile is currently disabled.',
      evidence: [],
      impact: 'Exposes network ports to unauthorized incoming connections.',
      businessRisk: 'High risk of unauthorized network intrusion.',
      rootCauseHypothesis: 'Disabled by administrator script.',
      recommendedRemediation: 'Set-NetFirewallProfile -Profile Public -Enabled True',
      estimatedEffort: '5m',
      verificationMethod: 'Get-NetFirewallProfile'
    });

    expect(finding.FindingId).toBe('SEC-FW-001');
    expect(finding.Severity).toBe('Critical');
    expect(finding.Priority).toBe(1);
    expect(finding.CreatedOn).toBeDefined();
  });

  it('should evaluate raw telemetry data and produce health scores and risk matrix', () => {
    const rawTelemetry = {
      Machine: { ComputerName: 'TEST-HOST-01', Platform: 'Windows' },
      Hardware: { LogicalCores: 8, TotalMemoryGB: 16, FreeMemoryGB: 8 },
      Software: [{ Name: 'Python', Version: '3.11.4' }],
      Services: [{ Name: 'wuauserv', Status: 'Running' }]
    };

    const result = runAssessment(rawTelemetry);

    expect(result.HealthScore).toBeDefined();
    expect(result.HealthScore.OverallHealthScore).toBeGreaterThanOrEqual(0);
    expect(result.HealthScore.OverallHealthScore).toBeLessThanOrEqual(100);
    expect(Array.isArray(result.Findings)).toBe(true);
    expect(Array.isArray(result.RiskMatrix)).toBe(true);
  });

  it('should compute post-remediation validation and execution plan in remediation dashboard', () => {
    const rawTelemetry = {
      Machine: { ComputerName: 'TEST-HOST-02' },
      Hardware: { LogicalCores: 4, TotalMemoryGB: 8 }
    };
    const assessment = runAssessment(rawTelemetry);
    const dashboard = buildRemediationDashboard(assessment.Findings, assessment.HealthScore, { 'SEC-FW-001': true });

    expect(dashboard.overall_health_score).toBeDefined();
    expect(Array.isArray(dashboard.categories)).toBe(true);
    expect(Array.isArray(dashboard.execution_plan)).toBe(true);
  });
});
