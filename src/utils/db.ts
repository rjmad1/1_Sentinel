import Dexie, { type Table } from 'dexie';

export interface AssessmentRecord {
  assessmentId: string;
  timestamp: string;
  computerName: string;
  osName: string;
  overallHealthScore: number;
  performanceScore: number;
  securityScore: number;
  reliabilityScore: number;
  scalabilityScore: number;
  serviceabilityScore: number;
  usabilityScore: number;
  findingsCount: number;
  data: any; // complete consolidated Assessment JSON
}

export interface AssetRecord {
  id?: number;
  assessmentId: string;
  deviceId: string;
  size: number;
  freeSpace: number;
  driveType: number;
}

export interface SoftwareRecord {
  id?: number;
  assessmentId: string;
  name: string;
  version: string;
  publisher: string | null;
  source: string;
}

export interface FindingRecord {
  id?: number;
  assessmentId: string;
  findingId: string;
  title: string;
  severity: string;
  domain: string;
  description: string;
  recommendedRemediation: string;
}

export interface RiskRecord {
  id?: number;
  assessmentId: string;
  severity: string;
  findingCount: number;
}

export interface ExportRecord {
  id?: number;
  assessmentId: string;
  timestamp: string;
  packageName: string;
  blob: Blob;
}

class EIIPDatabase extends Dexie {
  assessments!: Table<AssessmentRecord, string>;
  assets!: Table<AssetRecord, number>;
  software!: Table<SoftwareRecord, number>;
  findings!: Table<FindingRecord, number>;
  risks!: Table<RiskRecord, number>;
  exports!: Table<ExportRecord, number>;

  constructor() {
    super('EIIP');
    this.version(1).stores({
      assessments: 'assessmentId, timestamp, computerName',
      assets: '++id, assessmentId, deviceId',
      software: '++id, assessmentId, name, source',
      findings: '++id, assessmentId, findingId, severity, domain',
      risks: '++id, assessmentId, severity',
      exports: '++id, assessmentId, timestamp'
    });
  }
}

export const db = new EIIPDatabase();

// Repository abstractions
export const saveAssessment = async (data: any): Promise<string> => {
  const assessmentId = data.AssessmentId || crypto.randomUUID();
  const timestamp = data.Machine?.CollectionTimestamp || new Date().toISOString();
  
  // 1. Transaction to write consistently
  await db.transaction('rw', [db.assessments, db.assets, db.software, db.findings, db.risks], async () => {
    // Clean up any existing entries for this assessment first
    await db.assets.where('assessmentId').equals(assessmentId).delete();
    await db.software.where('assessmentId').equals(assessmentId).delete();
    await db.findings.where('assessmentId').equals(assessmentId).delete();
    await db.risks.where('assessmentId').equals(assessmentId).delete();

    // Insert main assessment record
    await db.assessments.put({
      assessmentId,
      timestamp,
      computerName: data.Machine?.ComputerName || 'Unknown Host',
      osName: data.Machine?.OSName || 'Windows OS',
      overallHealthScore: data.HealthScore?.OverallHealthScore ?? 100,
      performanceScore: data.HealthScore?.PerformanceScore ?? 100,
      securityScore: data.HealthScore?.SecurityScore ?? 100,
      reliabilityScore: data.HealthScore?.ReliabilityScore ?? 100,
      scalabilityScore: data.HealthScore?.ScalabilityScore ?? 100,
      serviceabilityScore: data.HealthScore?.ServiceabilityScore ?? 100,
      usabilityScore: data.HealthScore?.UsabilityScore ?? 100,
      findingsCount: data.Findings ? data.Findings.length : 0,
      data
    });

    // Insert assets using bulkAdd
    if (data.Assets && Array.isArray(data.Assets)) {
      const assetsToAdd = data.Assets.map((asset: any) => ({
        assessmentId,
        deviceId: asset.DeviceID || 'Unknown',
        size: Number(asset.Size) || 0,
        freeSpace: Number(asset.FreeSpace) || 0,
        driveType: Number(asset.DriveType) || 3
      }));
      await db.assets.bulkAdd(assetsToAdd);
    }

    // Insert software using bulkAdd
    if (data.Software && Array.isArray(data.Software)) {
      const softwareToAdd = data.Software.map((pkg: any) => ({
        assessmentId,
        name: pkg.Name || 'Unknown Package',
        version: pkg.Version || '0.0.0',
        publisher: pkg.Publisher || null,
        source: pkg.Source || 'Registry'
      }));
      await db.software.bulkAdd(softwareToAdd);
    }

    // Insert findings using bulkAdd
    if (data.Findings && Array.isArray(data.Findings)) {
      const findingsToAdd = data.Findings.map((f: any) => ({
        assessmentId,
        findingId: f.FindingId,
        title: f.Title || 'Finding',
        severity: f.Severity || 'Low',
        domain: f.Domain || 'General',
        description: f.Description || '',
        recommendedRemediation: f.RecommendedRemediation || ''
      }));
      await db.findings.bulkAdd(findingsToAdd);
    }

    // Insert risks using bulkAdd
    if (data.RiskMatrix && Array.isArray(data.RiskMatrix)) {
      const risksToAdd = data.RiskMatrix.map((r: any) => ({
        assessmentId,
        severity: r.Severity,
        findingCount: Number(r.FindingCount) || 0
      }));
      await db.risks.bulkAdd(risksToAdd);
    }
  });

  // 2. Enforce retention policy: limit to 20 assessments (keep the most recent ones)
  try {
    const allAssessments = await db.assessments.orderBy('timestamp').toArray();
    if (allAssessments.length > 20) {
      const toDelete = allAssessments.slice(0, allAssessments.length - 20);
      for (const record of toDelete) {
        await deleteAssessment(record.assessmentId);
      }
    }
  } catch (err) {
    console.error("Failed to prune old assessments:", err);
  }

  return assessmentId;
};

export const getHistoricalAssessments = async (): Promise<any[]> => {
  const list = await db.assessments.orderBy('timestamp').toArray();
  return list.map(item => ({
    AssessmentId: item.assessmentId,
    Timestamp: item.timestamp,
    ComputerName: item.computerName,
    OSName: item.osName,
    OverallHealth: item.overallHealthScore,
    Performance: item.performanceScore,
    Security: item.securityScore,
    Reliability: item.reliabilityScore,
    Scalability: item.scalabilityScore,
    Serviceability: item.serviceabilityScore,
    Usability: item.usabilityScore
  }));
};

export const loadAssessmentDetails = async (assessmentId: string): Promise<any | null> => {
  const record = await db.assessments.get(assessmentId);
  return record ? record.data : null;
};

export const deleteAssessment = async (assessmentId: string): Promise<void> => {
  await db.transaction('rw', [db.assessments, db.assets, db.software, db.findings, db.risks, db.exports], async () => {
    await db.assessments.delete(assessmentId);
    await db.assets.where('assessmentId').equals(assessmentId).delete();
    await db.software.where('assessmentId').equals(assessmentId).delete();
    await db.findings.where('assessmentId').equals(assessmentId).delete();
    await db.risks.where('assessmentId').equals(assessmentId).delete();
    await db.exports.where('assessmentId').equals(assessmentId).delete();
  });
};
