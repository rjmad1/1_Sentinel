/**
 * Enterprise Machine Health Assessment Rules Engine (TypeScript Strict Implementation)
 */

export interface EvidenceRecord {
  Source: string;
  Name: string;
  Value: unknown;
  ValidationState: string;
  Collector: string;
  Notes: string;
  Timestamp: string;
}

export interface Finding {
  FindingId: string;
  Category: string;
  Domain: string;
  Severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';
  Confidence: 'High' | 'Medium' | 'Low' | 'Unknown';
  Priority: number;
  Title: string;
  Description: string;
  Evidence: EvidenceRecord[];
  Impact: string;
  BusinessRisk: string;
  RootCauseHypothesis: string;
  RecommendedRemediation: string;
  EstimatedEffort: string;
  VerificationMethod: string;
  CreatedOn: string;
}

export interface HealthScore {
  Formula: string;
  OverallHealthScore: number;
  PerformanceScore: number;
  SecurityScore: number;
  ReliabilityScore: number;
  ScalabilityScore: number;
  ServiceabilityScore: number;
  UsabilityScore: number;
}

export interface AssessmentResult {
  Findings: Finding[];
  HealthScore: HealthScore;
  RiskMatrix: Array<{
    Severity: string;
    FindingCount: number;
    TechnicalImpact: string;
    BusinessImpact: string;
    OperationalImpact: string;
  }>;
  CapacityForecast: Record<string, unknown>;
  Graph: {
    nodes: Array<{ id: string; type: string; status: string }>;
    links: unknown[];
  };
  Recommendations: string[];
}

export function getEvidenceValue(rawEvidence: EvidenceRecord[], source: string, name: string): unknown {
  if (!Array.isArray(rawEvidence)) return null;
  const record = rawEvidence.find(r => r.Source === source && r.Name === name);
  return record ? record.Value : null;
}

export function getSafeProperty<T>(object: Record<string, unknown> | null | undefined, propertyName: string, defaultValue: T | null = null): T | null {
  if (!object) return defaultValue;
  if (Object.prototype.hasOwnProperty.call(object, propertyName)) {
    const val = object[propertyName];
    return val !== undefined && val !== null ? (val as T) : defaultValue;
  }
  return defaultValue;
}

export function createEvidenceRecord(
  source: string,
  name: string,
  value: unknown,
  validationState = 'Validated',
  collector = '',
  notes = ''
): EvidenceRecord {
  return {
    Source: source,
    Name: name,
    Value: value,
    ValidationState: validationState,
    Collector: collector,
    Notes: notes,
    Timestamp: new Date().toISOString()
  };
}

export function createFinding(data: {
  findingId: string;
  category: string;
  domain: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';
  confidence: 'High' | 'Medium' | 'Low';
  title: string;
  description: string;
  evidence?: EvidenceRecord[];
  impact: string;
  businessRisk: string;
  rootCauseHypothesis: string;
  recommendedRemediation: string;
  estimatedEffort: string;
  verificationMethod: string;
  priority?: number;
}): Finding {
  let priority = data.priority ?? -1;
  if (priority < 0) {
    const priorityMap: Record<string, number> = {
      Critical: 10,
      High: 20,
      Medium: 50,
      Low: 80,
      Informational: 90
    };
    priority = priorityMap[data.severity] || 100;
  }

  return {
    FindingId: data.findingId,
    Category: data.category,
    Domain: data.domain,
    Severity: data.severity,
    Confidence: data.confidence,
    Priority: priority,
    Title: data.title,
    Description: data.description,
    Evidence: data.evidence || [],
    Impact: data.impact,
    BusinessRisk: data.businessRisk,
    RootCauseHypothesis: data.rootCauseHypothesis,
    RecommendedRemediation: data.recommendedRemediation,
    EstimatedEffort: data.estimatedEffort,
    VerificationMethod: data.verificationMethod,
    CreatedOn: new Date().toISOString()
  };
}

export function runPerformanceAssessment(rawEvidence: EvidenceRecord[]): Finding[] {
  const findings: Finding[] = [];
  const logicalDisks = getEvidenceValue(rawEvidence, 'Disk', 'LogicalDisks');
  if (Array.isArray(logicalDisks)) {
    for (const disk of logicalDisks) {
      const size = Number(disk.Size || 0);
      const free = Number(disk.FreeSpace || 0);
      const deviceId = disk.DeviceID || '';
      
      let freePct: number | null = null;
      if (size > 0 && free !== null) {
        freePct = Math.round((free / size) * 10000) / 100;
      }
      
      if (freePct !== null && freePct < 15.0) {
        const idLetter = deviceId.replace(':', '');
        findings.push(createFinding({
          findingId: `PERF-DISKFREE-${idLetter}`,
          category: 'DiskCapacity',
          domain: 'Performance',
          severity: 'High',
          confidence: 'High',
          title: `Low free space on ${deviceId}`,
          description: 'The volume has less than 15 percent free space available.',
          evidence: [
            createEvidenceRecord('Disk', 'DeviceID', deviceId),
            createEvidenceRecord('Disk', 'FreePercent', freePct)
          ],
          impact: 'Low free space can degrade performance, increase fragmentation pressure, and reduce update reliability.',
          businessRisk: 'Build failures, patching failures, and production instability.',
          rootCauseHypothesis: 'Capacity growth exceeded available storage management controls.',
          recommendedRemediation: 'Free disk space, archive stale artifacts, move large datasets, or expand the volume.',
          estimatedEffort: 'Medium',
          verificationMethod: 'Re-run assessment and confirm free space is above threshold.'
        }));
      }
    }
  }

  const cpuCounters = getEvidenceValue(rawEvidence, 'CPUCounter', 'Samples');
  if (Array.isArray(cpuCounters)) {
    const usageSamples = cpuCounters
      .filter((s: { Path?: string }) => s.Path && s.Path.toLowerCase().includes('% processor time'))
      .map((s: { Value?: number }) => Number(s.Value || 0));
    
    const queueSamples = cpuCounters
      .filter((s: { Path?: string }) => s.Path && s.Path.toLowerCase().includes('processor queue length'))
      .map((s: { Value?: number }) => Number(s.Value || 0));

    if (usageSamples.length > 0) {
      const sum = usageSamples.reduce((a: number, b: number) => a + b, 0);
      const avgCpu = Math.round((sum / usageSamples.length) * 100) / 100;
      if (avgCpu >= 85.0) {
        findings.push(createFinding({
          findingId: 'PERF-CPU-001',
          category: 'CpuSaturation',
          domain: 'Performance',
          severity: 'High',
          confidence: 'Medium',
          title: 'Sustained CPU utilization is elevated',
          description: `Average sampled CPU utilization is ${avgCpu} percent.`,
          evidence: [
            createEvidenceRecord('CPUCounter', 'AverageCpuPercent', avgCpu)
          ],
          impact: 'Sustained CPU pressure can increase latency and reduce workload responsiveness.',
          businessRisk: 'User slowdown, queue backlogs, and service quality degradation.',
          rootCauseHypothesis: 'Insufficient compute headroom or workload contention.',
          recommendedRemediation: 'Review top CPU consumers, tune workloads, and consider scaling or process isolation.',
          estimatedEffort: 'Medium',
          verificationMethod: 'Re-sample CPU counters after remediation.'
        }));
      }
    }

    if (queueSamples.length > 0) {
      const sum = queueSamples.reduce((a: number, b: number) => a + b, 0);
      const avgQueue = Math.round((sum / queueSamples.length) * 100) / 100;
      if (avgQueue >= 4.0) {
        findings.push(createFinding({
          findingId: 'PERF-CPUQUEUE-001',
          category: 'CpuQueue',
          domain: 'Performance',
          severity: 'Medium',
          confidence: 'Medium',
          title: 'Processor queue length is elevated',
          description: `Average sampled processor queue length is ${avgQueue}.`,
          evidence: [
            createEvidenceRecord('CPUCounter', 'AverageProcessorQueueLength', avgQueue)
          ],
          impact: 'Runnable work is waiting for CPU time.',
          businessRisk: 'Burst workloads may push the machine into visible contention.',
          rootCauseHypothesis: 'Thread contention or sustained compute oversubscription.',
          recommendedRemediation: 'Review high-thread processes and right-size workload concurrency.',
          estimatedEffort: 'Medium',
          verificationMethod: 'Confirm processor queue length normalizes after tuning.'
        }));
      }
    }
  }

  return findings;
}

export function runSecurityAssessment(rawEvidence: EvidenceRecord[]): Finding[] {
  const findings: Finding[] = [];

  const fw = getEvidenceValue(rawEvidence, 'Security', 'FirewallProfiles');
  if (Array.isArray(fw)) {
    const disabledProfiles = fw.filter(p => p.Enabled === false || p.Enabled === 0 || p.Enabled === 'False');
    if (disabledProfiles.length > 0) {
      findings.push(createFinding({
        findingId: 'SEC-FW-001',
        category: 'Firewall',
        domain: 'Security',
        severity: 'High',
        confidence: 'High',
        title: 'One or more firewall profiles are disabled',
        description: 'The local firewall is not enabled across all discovered profiles.',
        evidence: [
          createEvidenceRecord('Security', 'DisabledFirewallProfiles', disabledProfiles.map(p => ({ Name: p.Name, Enabled: p.Enabled })))
        ],
        impact: 'Host-based traffic filtering is weakened.',
        businessRisk: 'Increased exposure to lateral movement and unwanted inbound access.',
        rootCauseHypothesis: 'Firewall baseline drift or intentional weakening for application compatibility.',
        recommendedRemediation: 'Re-enable disabled firewall profiles and validate required allow rules.',
        estimatedEffort: 'Medium',
        verificationMethod: 'Confirm all firewall profiles report Enabled=True.'
      }));
    }
  }

  const defender = getEvidenceValue(rawEvidence, 'Security', 'DefenderStatus') as Record<string, unknown> | null;
  if (defender) {
    const rtEnabled = getSafeProperty(defender, 'RealTimeProtectionEnabled');
    if (rtEnabled !== true && rtEnabled !== 'True' && rtEnabled !== 1) {
      findings.push(createFinding({
        findingId: 'SEC-DEF-001',
        category: 'Defender',
        domain: 'Security',
        severity: 'High',
        confidence: 'High',
        title: 'Real-time antimalware protection is not enabled',
        description: 'Microsoft Defender real-time protection is not enabled.',
        evidence: [
          createEvidenceRecord('Security', 'RealTimeProtectionEnabled', rtEnabled)
        ],
        impact: 'Malicious file and process activity may evade real-time interception.',
        businessRisk: 'Increased malware execution risk on the endpoint or server.',
        rootCauseHypothesis: 'Protection disabled, passive mode, or third-party control overlap.',
        recommendedRemediation: 'Validate security platform ownership and ensure real-time protection is enabled or an equivalent control is active.',
        estimatedEffort: 'Medium',
        verificationMethod: 'Re-run defender status collection and confirm real-time protection is enabled.'
      }));
    }
  }

  const bitlocker = getEvidenceValue(rawEvidence, 'Security', 'BitLockerVolumes');
  if (Array.isArray(bitlocker)) {
    const unprotected = bitlocker.filter(v => {
      const status = getSafeProperty(v as Record<string, unknown>, 'ProtectionStatus');
      const type = getSafeProperty(v as Record<string, unknown>, 'VolumeType');
      return (status !== 'On' && status !== 1 && status !== '1') && (type === 'OperatingSystem' || !type);
    });
    if (unprotected.length > 0) {
      findings.push(createFinding({
        findingId: 'SEC-BDE-001',
        category: 'BitLocker',
        domain: 'Security',
        severity: 'High',
        confidence: 'Medium',
        title: 'Operating system volume is not protected by BitLocker',
        description: 'An operating system volume does not show active BitLocker protection.',
        evidence: [
          createEvidenceRecord('Security', 'UnprotectedBitLockerVolumes', unprotected.map((u: Record<string, unknown>) => ({
            MountPoint: u.MountPoint || u.DeviceID,
            ProtectionStatus: getSafeProperty(u, 'ProtectionStatus'),
            VolumeType: getSafeProperty(u, 'VolumeType')
          })))
        ],
        impact: 'At-rest protection for local data may be insufficient.',
        businessRisk: 'Data exposure risk after theft, loss, or offline disk access.',
        rootCauseHypothesis: 'Drive encryption was never enabled or protection is suspended.',
        recommendedRemediation: 'Enable and escrow BitLocker protection on operating system volumes where policy requires it.',
        estimatedEffort: 'Medium',
        verificationMethod: 'Verify ProtectionStatus is On for operating system volumes.'
      }));
    }
  }

  const tpm = getEvidenceValue(rawEvidence, 'Security', 'TPM') as Record<string, unknown> | null;
  if (tpm) {
    const tpmPresent = String(getSafeProperty(tpm, 'TpmPresent', false)).toLowerCase();
    const tpmReady = String(getSafeProperty(tpm, 'TpmReady', false)).toLowerCase();
    if (tpmPresent !== 'true' || tpmReady !== 'true') {
      findings.push(createFinding({
        findingId: 'SEC-TPM-001',
        category: 'TPM',
        domain: 'Security',
        severity: 'Medium',
        confidence: 'High',
        title: 'TPM is absent or not ready',
        description: 'The TPM does not report as present and ready.',
        evidence: [
          createEvidenceRecord('Security', 'TPMStatus', tpm)
        ],
        impact: 'Hardware-backed trust features may be unavailable or degraded.',
        businessRisk: 'Reduced support for secure boot chains, credential protection, and device encryption scenarios.',
        rootCauseHypothesis: 'Hardware TPM absent, disabled in firmware, or not provisioned.',
        recommendedRemediation: 'Review firmware settings and TPM provisioning state. Enable and initialize TPM where supported.',
        estimatedEffort: 'Medium',
        verificationMethod: 'Confirm TpmPresent=True and TpmReady=True.'
      }));
    }
  }

  const localAdmins = getEvidenceValue(rawEvidence, 'Security', 'LocalAdministrators');
  if (Array.isArray(localAdmins)) {
    const count = localAdmins.length;
    if (count > 3) {
      findings.push(createFinding({
        findingId: 'SEC-LADM-001',
        category: 'LocalAdministrators',
        domain: 'Security',
        severity: 'Medium',
        confidence: 'Medium',
        title: 'Local Administrators group membership is broader than expected',
        description: `The local Administrators group contains ${count} members.`,
        evidence: [
          createEvidenceRecord('Security', 'LocalAdministratorsCount', count)
        ],
        impact: 'Privilege sprawl increases accidental and malicious change risk.',
        businessRisk: 'Elevated blast radius for credential misuse and unauthorized changes.',
        rootCauseHypothesis: 'Access hygiene drift or exception accumulation.',
        recommendedRemediation: 'Review local admin membership and remove non-essential accounts and groups.',
        estimatedEffort: 'Low',
        verificationMethod: 'Re-run and validate expected privileged group membership.'
      }));
    }
  }

  return findings;
}

export function runReliabilityAssessment(rawEvidence: EvidenceRecord[]): Finding[] {
  const findings: Finding[] = [];

  const systemEvents = getEvidenceValue(rawEvidence, 'EventLog', 'SystemCriticalErrorEvents');
  if (Array.isArray(systemEvents)) {
    const count = systemEvents.length;
    if (count >= 20) {
      findings.push(createFinding({
        findingId: 'REL-SYSLOG-001',
        category: 'SystemEvents',
        domain: 'Reliability',
        severity: 'High',
        confidence: 'Medium',
        title: 'High volume of recent critical or error system events',
        description: `Recent system log collection contains ${count} critical or error events in the assessed window.`,
        evidence: [
          createEvidenceRecord('EventLog', 'SystemCriticalErrorEventCount', count)
        ],
        impact: 'Recurring low-level failures may indicate driver, storage, update, or service instability.',
        businessRisk: 'Unplanned outages and degraded machine trustworthiness.',
        rootCauseHypothesis: 'Underlying platform instability or unresolved recurring faults.',
        recommendedRemediation: 'Cluster events by provider and event ID, then address the highest-frequency root cause first.',
        estimatedEffort: 'High',
        verificationMethod: 'Re-run after corrective action and verify event rate decreases.'
      }));
    }
  }

  const failedAuto = getEvidenceValue(rawEvidence, 'Service', 'AutomaticServicesNotRunning');
  if (Array.isArray(failedAuto)) {
    const count = failedAuto.length;
    if (count > 0) {
      findings.push(createFinding({
        findingId: 'REL-SVC-001',
        category: 'ServiceAvailability',
        domain: 'Reliability',
        severity: 'Medium',
        confidence: 'High',
        title: 'Automatic services are not running',
        description: `${count} automatic services are not currently running.`,
        evidence: [
          createEvidenceRecord('Service', 'AutomaticServicesNotRunning', failedAuto.map(s => ({
            Name: s.Name,
            DisplayName: s.DisplayName,
            Status: s.Status,
            StartType: s.StartType
          })))
        ],
        impact: 'Expected service behavior may be degraded or absent.',
        businessRisk: 'Operational interruptions, missing dependencies, or degraded workstation/server function.',
        rootCauseHypothesis: 'Service crash, dependency failure, disabled dependency, or startup issue.',
        recommendedRemediation: 'Review service dependencies and recent service-related events, then restore expected service state through standard change control.',
        estimatedEffort: 'Medium',
        verificationMethod: 'Confirm required automatic services remain running after restart or repair.'
      }));
    }
  }

  return findings;
}

export function runScalabilityAssessment(rawEvidence: EvidenceRecord[]): Finding[] {
  const findings: Finding[] = [];

  let memTotalKb = getEvidenceValue(rawEvidence, 'Memory', 'TotalVisibleMemoryKB') as number | null;
  if (memTotalKb === null) {
    memTotalKb = getEvidenceValue(rawEvidence, 'OS', 'TotalVisibleMemoryKB') as number | null;
  }
  let memFreeKb = getEvidenceValue(rawEvidence, 'Memory', 'FreePhysicalMemoryKB') as number | null;
  if (memFreeKb === null) {
    memFreeKb = getEvidenceValue(rawEvidence, 'OS', 'FreePhysicalMemoryKB') as number | null;
  }

  if (memTotalKb !== null && memFreeKb !== null && memTotalKb > 0) {
    const usedPct = Math.round((1 - memFreeKb / memTotalKb) * 10000) / 100;
    if (usedPct >= 90.0) {
      findings.push(createFinding({
        findingId: 'SCALE-MEM-001',
        category: 'MemoryExhaustionRisk',
        domain: 'Scalability',
        severity: 'High',
        confidence: 'High',
        title: 'Memory headroom is critically low',
        description: `Estimated current memory utilization is ${usedPct} percent.`,
        evidence: [
          createEvidenceRecord('Memory', 'MemoryUtilizationPercent', usedPct)
        ],
        impact: 'Additional workload growth may trigger paging and severe responsiveness loss.',
        businessRisk: 'System instability under bursts and constrained future scaling.',
        rootCauseHypothesis: 'RAM capacity is misaligned with workload demand.',
        recommendedRemediation: 'Reduce memory-heavy workloads, tune application limits, or increase RAM capacity.',
        estimatedEffort: 'Medium',
        verificationMethod: 'Re-check memory utilization after changes.'
      }));
    }
  }

  const cpuLogical = getEvidenceValue(rawEvidence, 'CPU', 'NumberOfLogicalProcessors') as number | null;
  if (cpuLogical !== null && cpuLogical > 0 && cpuLogical <= 4) {
    findings.push(createFinding({
      findingId: 'SCALE-CPU-ARCH-001',
      category: 'CpuHeadroom',
      domain: 'Scalability',
      severity: 'Low',
      confidence: 'Medium',
      title: 'Logical processor count limits growth headroom for multi-threaded workloads',
      description: `The machine reports ${cpuLogical} logical processors.`,
      evidence: [
        createEvidenceRecord('CPU', 'NumberOfLogicalProcessors', cpuLogical)
      ],
      impact: 'Parallel build, AI, CI, and development workloads may saturate sooner.',
      businessRisk: 'Reduced suitability for future concurrency-heavy workloads.',
      rootCauseHypothesis: 'Hardware profile is closer to general-purpose endpoint sizing than engineering-node sizing.',
      recommendedRemediation: 'Evaluate workload class and consider higher-core configuration for AI, build, or shared engineering use.',
      estimatedEffort: 'High',
      verificationMethod: 'Compare against target workload concurrency requirements.'
    }));
  }

  return findings;
}

export function runServiceabilityAssessment(rawEvidence: EvidenceRecord[]): Finding[] {
  const findings: Finding[] = [];

  const eventLogs = rawEvidence.find(r => r.Source === 'EventLog');
  if (eventLogs && (eventLogs.ValidationState === 'Failed' || eventLogs.ValidationState === 'Missing')) {
    findings.push(createFinding({
      findingId: 'SERV-OBS-001',
      category: 'MonitoringReadiness',
      domain: 'Serviceability',
      severity: 'Medium',
      confidence: 'High',
      title: 'Event log telemetry collection is incomplete',
      description: 'Required event log evidence could not be collected reliably.',
      evidence: [eventLogs],
      impact: 'Troubleshooting and historical correlation quality are reduced.',
      businessRisk: 'Longer incident resolution times and lower confidence in failure analysis.',
      rootCauseHypothesis: 'Permissions, retention gaps, log corruption, or collector limitations.',
      recommendedRemediation: 'Validate log service health, retention settings, and collector permissions.',
      estimatedEffort: 'Medium',
      verificationMethod: 'Confirm event log evidence is collected successfully on the next run.'
    }));
  }

  return findings;
}

export function runUsabilityAssessment(rawEvidence: EvidenceRecord[]): Finding[] {
  const findings: Finding[] = [];

  const startupCommands = getEvidenceValue(rawEvidence, 'Startup', 'StartupCommands');
  const startupCount = getEvidenceValue(rawEvidence, 'Startup', 'StartupCommandCount');
  
  let count = 0;
  let hasStartup = false;
  
  if (Array.isArray(startupCommands)) {
    count = startupCommands.length;
    hasStartup = true;
  } else if (startupCount !== null) {
    count = Number(startupCount);
    hasStartup = true;
  }

  if (hasStartup && count >= 15) {
    findings.push(createFinding({
      findingId: 'USE-STARTUP-001',
      category: 'StartupImpact',
      domain: 'Usability',
      severity: 'Medium',
      confidence: 'Medium',
      title: 'High startup item count may increase boot and sign-in friction',
      description: `The machine has ${count} startup command entries.`,
      evidence: [
        createEvidenceRecord('Startup', 'StartupCommandCount', count)
      ],
      impact: 'Longer sign-in readiness and increased user friction.',
      businessRisk: 'Reduced productivity and slower recovery after reboot.',
      rootCauseHypothesis: 'Software accumulation and weak startup hygiene.',
      recommendedRemediation: 'Review startup entries and remove or delay non-essential launch items.',
      estimatedEffort: 'Low',
      verificationMethod: 'Measure reduced startup inventory and improved post-login readiness.'
    }));
  }

  return findings;
}

export function getDeduplicatedFindings(findings: Finding[]): Finding[] {
  if (!Array.isArray(findings) || findings.length === 0) {
    return [];
  }
  
  const seen = new Map<string, Finding>();
  const sorted = [...findings].sort((a, b) => {
    if (a.Priority !== b.Priority) return a.Priority - b.Priority;
    return a.FindingId.localeCompare(b.FindingId);
  });

  for (const f of sorted) {
    if (!f) continue;
    const key = `${f.Category}|${f.Title}|${f.Description}`;
    if (!seen.has(key)) {
      seen.set(key, f);
    }
  }

  return Array.from(seen.values());
}

export function getDomainScore(findings: Finding[], domain: string): number {
  const weights: Record<string, number> = {
    Critical: 25,
    High: 15,
    Medium: 8,
    Low: 3,
    Informational: 0
  };

  const domainFindings = findings.filter(f => f.Domain === domain);
  const penalty = domainFindings.reduce((sum, f) => sum + (weights[f.Severity] || 0), 0);
  return Math.max(0, 100 - penalty);
}

export function calculateHealthScore(findings: Finding[]): HealthScore {
  const performance = getDomainScore(findings, 'Performance');
  const security = getDomainScore(findings, 'Security');
  const reliability = getDomainScore(findings, 'Reliability');
  const scalability = getDomainScore(findings, 'Scalability');
  const serviceability = getDomainScore(findings, 'Serviceability');
  const usability = getDomainScore(findings, 'Usability');

  const overall = (performance * 0.20) + (security * 0.25) + (reliability * 0.20) +
                  (scalability * 0.15) + (serviceability * 0.10) + (usability * 0.10);

  return {
    Formula: 'Overall = Performance*0.20 + Security*0.25 + Reliability*0.20 + Scalability*0.15 + Serviceability*0.10 + Usability*0.10',
    OverallHealthScore: Math.round(overall * 100) / 100,
    PerformanceScore: performance,
    SecurityScore: security,
    ReliabilityScore: reliability,
    ScalabilityScore: scalability,
    ServiceabilityScore: serviceability,
    UsabilityScore: usability
  };
}

export function calculateRiskMatrix(findings: Finding[]) {
  const severities: Array<'Critical' | 'High' | 'Medium' | 'Low' | 'Informational'> = ['Critical', 'High', 'Medium', 'Low', 'Informational'];
  return severities.map(sev => {
    const items = findings.filter(f => f.Severity === sev);
    return {
      Severity: sev,
      FindingCount: items.length,
      TechnicalImpact: items.length > 0 ? items.slice(0, 3).map(f => f.Impact).join(' | ') : '',
      BusinessImpact: items.length > 0 ? items.slice(0, 3).map(f => f.BusinessRisk).join(' | ') : '',
      OperationalImpact: items.length > 0 ? 'Operational review required' : 'None observed'
    };
  });
}

export function calculateCapacityForecast(_rawEvidence: EvidenceRecord[], executionMode: string) {
  const confidence = executionMode === 'DeepAudit' ? 'Low' : 'Unknown';
  return {
    Storage: { Day30: null, Day90: null, Day180: null, Day365: null, Confidence: confidence, Note: 'No verified forecast generated. Historical trend data insufficient.' },
    Memory: { Day30: null, Day90: null, Day180: null, Day365: null, Confidence: confidence, Note: 'No verified forecast generated. Historical trend data insufficient.' },
    Cpu: { Day30: null, Day90: null, Day180: null, Day365: null, Confidence: confidence, Note: 'No verified forecast generated. Historical trend data insufficient.' }
  };
}

export function generateGraphNodes(findings: Finding[], rawEvidence: EvidenceRecord[]) {
  const nodes = [
    { id: 'machine', type: 'machine', status: 'normal' }
  ];

  const hasOs = rawEvidence.some(r => r.Source === 'OS' || r.Source === 'EnvironmentOverview');
  if (hasOs) {
    nodes.push({ id: 'os', type: 'os', status: 'normal' });
  }

  const hasSecurity = rawEvidence.some(r => r.Source === 'Security');
  if (hasSecurity) {
    const defStatus = findings.some(f => f.FindingId === 'SEC-DEF-001') ? 'error' : 'normal';
    nodes.push({ id: 'defender', type: 'security', status: defStatus });

    const fwStatus = findings.some(f => f.FindingId === 'SEC-FW-001') ? 'error' : 'normal';
    nodes.push({ id: 'firewall', type: 'security', status: fwStatus });

    if (findings.some(f => f.FindingId === 'SEC-LADM-001')) {
      nodes.push({ id: 'local_admins', type: 'user', status: 'warn' });
    }
  }

  nodes.push({ id: 'software_catalog', type: 'software', status: 'normal' });

  if (findings.some(f => f.FindingId === 'PERF-DISKFREE-C')) {
    nodes.push({ id: 'disk_c', type: 'storage', status: 'error' });
  }

  const hasCpu = rawEvidence.some(r => r.Source === 'CPU');
  if (hasCpu) {
    let cpuStatus = 'normal';
    if (findings.some(f => f.FindingId === 'PERF-CPU-001' || f.FindingId === 'PERF-CPUQUEUE-001')) {
      cpuStatus = 'error';
    } else if (findings.some(f => f.FindingId === 'SCALE-CPU-ARCH-001')) {
      cpuStatus = 'warn';
    }
    nodes.push({ id: 'cpu', type: 'hardware', status: cpuStatus });
  }

  if (findings.some(f => f.FindingId === 'REL-SVC-001')) {
    nodes.push({ id: 'svc_spooler', type: 'service', status: 'error' });
  }

  return nodes;
}

export function runCorrelationAssessment(findings: Finding[]): Finding[] {
  const correlations: Finding[] = [];

  const hasCpu = findings.some(f => f.Domain === 'Performance' && (f.FindingId === 'PERF-CPU-001' || f.FindingId === 'PERF-CPUQUEUE-001'));
  const hasReliability = findings.some(f => f.Domain === 'Reliability');

  if (hasCpu && hasReliability) {
    correlations.push(createFinding({
      findingId: 'CORR-PR-001',
      category: 'Correlation',
      domain: 'Correlation',
      severity: 'High',
      confidence: 'Medium',
      title: 'Performance pressure is likely contributing to reliability risk',
      description: 'CPU contention findings and reliability findings were both detected in the same assessment window.',
      impact: 'Transient performance issues may be amplifying service and application instability.',
      businessRisk: 'Small degradations can escalate into recurring operational incidents.',
      rootCauseHypothesis: 'Shared resource contention is affecting workload stability.',
      recommendedRemediation: 'Address top compute pressure and unstable services together instead of treating them as isolated defects.',
      estimatedEffort: 'Medium',
      verificationMethod: 'Re-assess after reducing CPU contention and compare event and service stability trends.'
    }));
  }

  const lowDisk = findings.some(f => f.FindingId === 'PERF-DISKFREE-C' || f.Category === 'DiskCapacity');
  if (lowDisk) {
    correlations.push(createFinding({
      findingId: 'CORR-STOR-001',
      category: 'Correlation',
      domain: 'Correlation',
      severity: 'High',
      confidence: 'High',
      title: 'Storage capacity pressure creates outage risk',
      description: 'Low storage headroom is correlated with update failure, logging failure, and workload interruption risk.',
      impact: 'Core machine functions may fail when storage exhaustion thresholds are crossed.',
      businessRisk: 'Unexpected downtime, failed builds, broken updates, and data handling errors.',
      rootCauseHypothesis: 'Capacity planning and cleanup controls are insufficient for growth rate.',
      recommendedRemediation: 'Treat storage cleanup or expansion as a near-term remediation priority.',
      estimatedEffort: 'Medium',
      verificationMethod: 'Verify sustained free-space headroom after corrective action.'
    }));
  }

  return correlations;
}

export function runAssessment(environment: Record<string, unknown> = {}, rawEvidence: EvidenceRecord[] = []): AssessmentResult {
  const executionMode = (environment?.ExecutionMode as string) || 'Audit';
  if (!Array.isArray(rawEvidence)) {
    rawEvidence = [];
  }

  let findings: Finding[] = [];
  findings.push(...runPerformanceAssessment(rawEvidence));
  findings.push(...runSecurityAssessment(rawEvidence));
  findings.push(...runReliabilityAssessment(rawEvidence));
  findings.push(...runScalabilityAssessment(rawEvidence));
  findings.push(...runServiceabilityAssessment(rawEvidence));
  findings.push(...runUsabilityAssessment(rawEvidence));
  findings.push(...runCorrelationAssessment(findings));

  findings = getDeduplicatedFindings(findings);

  const healthScore = calculateHealthScore(findings);
  const riskMatrix = calculateRiskMatrix(findings);
  const capacityForecast = calculateCapacityForecast(rawEvidence, executionMode);
  const graphNodes = generateGraphNodes(findings, rawEvidence);

  const recommendations = findings
    .filter(f => f.RecommendedRemediation)
    .map(f => f.RecommendedRemediation);

  return {
    Findings: findings,
    HealthScore: healthScore,
    RiskMatrix: riskMatrix,
    CapacityForecast: capacityForecast,
    Graph: {
      nodes: graphNodes,
      links: []
    },
    Recommendations: recommendations
  };
}

export function buildRemediationDashboard(
  findings: Finding[],
  completedRemediations: Record<string, boolean> = {},
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  _envDataState: any = {}
) {
  const activeFindings = findings.filter(f => !completedRemediations[f.FindingId]);
  
  const totalIssues = findings.length;
  const criticalIssues = findings.filter(f => f.Severity === 'Critical' || f.Severity === 'High').length;
  const actionableIssues = activeFindings.filter(f => {
    return ['SEC-FW-001', 'SEC-DEF-001', 'PERF-DISKFREE-C', 'REL-SVC-001'].includes(f.FindingId);
  }).length;
  
  const healthScore = calculateHealthScore(findings);
  const remainingFindings = activeFindings.filter(f => !['SEC-FW-001', 'SEC-DEF-001', 'PERF-DISKFREE-C', 'REL-SVC-001'].includes(f.FindingId));
  const postRemediationHealth = calculateHealthScore(remainingFindings);
  
  const highRiskCount = activeFindings.filter(f => f.Severity === 'High').length;
  const criticalRiskCount = activeFindings.filter(f => f.Severity === 'Critical').length;
  const riskScore = Math.min(100, (criticalRiskCount * 40) + (highRiskCount * 25) + (activeFindings.filter(f => f.Severity === 'Medium').length * 10));

  const categoryMap: Record<string, Finding[]> = {};
  findings.forEach(f => {
    const cat = f.Domain || f.Category || 'General';
    if (!categoryMap[cat]) categoryMap[cat] = [];
    categoryMap[cat].push(f);
  });

  const categories = Object.entries(categoryMap).map(([catName, items]) => {
    const maxSev = items.some(i => i.Severity === 'Critical')
      ? 'Critical'
      : items.some(i => i.Severity === 'High')
      ? 'High'
      : items.some(i => i.Severity === 'Medium')
      ? 'Medium'
      : 'Low';

    return {
      category: catName,
      severity: maxSev,
      issue_count: items.length,
      issues: items.map(item => ({
        finding_id: item.FindingId,
        title: item.Title,
        root_cause: item.RootCauseHypothesis || item.Description,
        impact: item.Impact,
        recommended_action: item.RecommendedRemediation,
        estimated_fix_time: item.EstimatedEffort || '15m',
        is_resolved: Boolean(completedRemediations[item.FindingId])
      }))
    };
  });

  const execution_plan = activeFindings.map((f, idx) => ({
    sequence: idx + 1,
    finding_id: f.FindingId,
    title: f.Title,
    action: f.RecommendedRemediation,
    estimated_time: f.EstimatedEffort || '10m'
  }));

  const generated_scripts = activeFindings.map(f => ({
    script_name: `Remediate-${f.FindingId}.ps1`,
    purpose: f.Title
  }));

  return {
    overall_health_score: healthScore.OverallHealthScore,
    risk_score: riskScore,
    total_issues: totalIssues,
    critical_issues: criticalIssues,
    actionable_issues: actionableIssues,
    estimated_full_remediation_time: '15m',
    post_remediation_validation: {
      health_score: postRemediationHealth.OverallHealthScore,
      resolved_issues: totalIssues - activeFindings.length,
      remaining_issues: activeFindings.length
    },
    categories,
    execution_plan,
    generated_scripts
  };
}

/**
 * Enterprise Software Codebase Assessment Engine Interfaces & Helpers
 */

export interface EnterpriseReadinessScorecard {
  ArchitectureScore: number;
  SecurityScore: number;
  OperationsScore: number;
  CICDScore: number;
  TestingScore: number;
  DocumentationScore: number;
  MaintainabilityScore: number;
  PerformanceScore: number;
  ReliabilityScore: number;
  DeploymentScore: number;
  ObservabilityScore: number;
  OverallReadinessScore: number;
}

export interface ProductionReadinessItem {
  ChecklistId: string;
  Category: string;
  Requirement: string;
  Status: 'Pass' | 'Fail' | 'Not Verified';
  Confidence: 'High' | 'Medium' | 'Low' | 'Unknown';
  Evidence: string;
  RemediationGuidance?: string;
}

export interface ModernizationInitiative {
  Title: string;
  BusinessValue: string;
  EngineeringEffort: 'Low' | 'Medium' | 'High';
  Dependencies: string[];
  ImplementationRisk: 'Low' | 'Medium' | 'High';
  SuccessCriteria: string;
}

export interface CodebaseAssessmentSummary {
  ProjectName: string;
  BusinessPurpose: string;
  InferredArchitecture: string;
  Confidence: 'High' | 'Medium' | 'Low' | 'Unknown';
  Status: 'Verified' | 'Inferred' | 'Not Verified';
  ReadinessScorecard: EnterpriseReadinessScorecard;
  ProductionReadinessChecklist: ProductionReadinessItem[];
  ModernizationRoadmap: {
    Plan30Day: ModernizationInitiative[];
    Plan90Day: ModernizationInitiative[];
    Plan180Day: ModernizationInitiative[];
  };
}

export function createCodebaseFinding(data: {
  findingId: string;
  domain: 'Architecture' | 'Security' | 'Dependencies' | 'LicenseRisk' | 'APIQuality' | 'CICDMaturity' | 'ProductionReadiness' | 'Infrastructure' | 'DataArchitecture';
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';
  confidence: 'High' | 'Medium' | 'Low' | 'Unknown';
  title: string;
  description: string;
  filePath: string;
  lineNumber?: string;
  impact: string;
  recommendedRemediation: string;
}): Finding {
  const evidenceRecord: EvidenceRecord = {
    Source: 'CodebaseAssessment',
    Name: 'SourceLocation',
    Value: `${data.filePath}${data.lineNumber ? '#' + data.lineNumber : ''}`,
    ValidationState: data.confidence === 'High' ? 'Validated' : 'Inferred',
    Collector: 'EnterpriseAssessmentSkill',
    Notes: `Domain: ${data.domain}`,
    Timestamp: new Date().toISOString()
  };

  return {
    FindingId: data.findingId,
    Category: data.domain,
    Domain: data.domain,
    Severity: data.severity,
    Confidence: data.confidence,
    Priority: data.severity === 'Critical' ? 1 : data.severity === 'High' ? 2 : data.severity === 'Medium' ? 3 : 4,
    Title: data.title,
    Description: data.description,
    Evidence: [evidenceRecord],
    Impact: data.impact,
    BusinessRisk: `Codebase risk in ${data.domain}`,
    RootCauseHypothesis: `Discovered during 26-phase software assessment of ${data.filePath}`,
    RecommendedRemediation: data.recommendedRemediation,
    EstimatedEffort: '30m',
    VerificationMethod: `Inspect ${data.filePath}`,
    CreatedOn: new Date().toISOString()
  };
}

