/**
 * TypeScript declarations for assessmentEngine.js
 */
export function runAssessment(environment: any, rawEvidence: any[]): {
  Findings: any[];
  HealthScore: {
    Formula: string;
    OverallHealthScore: number;
    PerformanceScore: number;
    SecurityScore: number;
    ReliabilityScore: number;
    ScalabilityScore: number;
    ServiceabilityScore: number;
    UsabilityScore: number;
  };
  RiskMatrix: any[];
  CapacityForecast: any;
  Graph: {
    nodes: any[];
    links: any[];
  };
  Recommendations: string[];
};

export function getEvidenceValue(rawEvidence: any[], source: string, name: string): any;
export function createEvidenceRecord(source: string, name: string, value: any, validationState?: string, collector?: string, notes?: string): any;
export function createFinding(data: any): any;
export function runPerformanceAssessment(rawEvidence: any[]): any[];
export function runSecurityAssessment(rawEvidence: any[]): any[];
export function runReliabilityAssessment(rawEvidence: any[]): any[];
export function runScalabilityAssessment(rawEvidence: any[]): any[];
export function runServiceabilityAssessment(rawEvidence: any[]): any[];
export function runUsabilityAssessment(rawEvidence: any[]): any[];
export function runCorrelationEngine(findings: any[], rawEvidence: any[]): { correlations: any[]; correlationFindings: any[] };
export function getDeduplicatedFindings(findings: any[]): any[];
export function getDomainScore(findings: any[], domain: string): number;
export function calculateHealthScore(findings: any[], environment: any): any;
export function calculateRiskMatrix(findings: any[]): any[];
export function calculateCapacityForecast(rawEvidence: any[], executionMode: string): any;
export function generateGraphNodes(findings: any[], rawEvidence: any[]): any[];
