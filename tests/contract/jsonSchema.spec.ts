import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('EIIP Assessment Schema Contract Tests', () => {
  const datasetsDir = path.join(__dirname, '../golden-datasets');
  const files = fs.readdirSync(datasetsDir).filter(f => f.endsWith('.json'));

  for (const file of files) {
    test(`Validate JSON contract structure for: ${file}`, async () => {
      const filePath = path.join(datasetsDir, file);
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      // Validate Input Structure
      expect(content).toHaveProperty('input');
      expect(content.input).toHaveProperty('Environment');
      expect(content.input).toHaveProperty('RawEvidence');
      expect(Array.isArray(content.input.RawEvidence)).toBe(true);

      const env = content.input.Environment;
      expect(env).toHaveProperty('PlatformFamily');
      expect(env).toHaveProperty('ComputerName');
      expect(env).toHaveProperty('OSName');
      expect(env).toHaveProperty('ExecutionMode');

      // Validate Expected Structure
      expect(content).toHaveProperty('expected');
      expect(content.expected).toHaveProperty('Findings');
      expect(Array.isArray(content.expected.Findings)).toBe(true);
      expect(content.expected).toHaveProperty('HealthScore');
      expect(content.expected).toHaveProperty('RiskMatrix');
      expect(content.expected).toHaveProperty('CapacityForecast');
      expect(content.expected).toHaveProperty('Graph');
      expect(content.expected).toHaveProperty('Recommendations');

      // Validate Expected HealthScore Structure
      const scores = content.expected.HealthScore;
      expect(scores).toHaveProperty('OverallHealthScore');
      expect(scores).toHaveProperty('PerformanceScore');
      expect(scores).toHaveProperty('SecurityScore');
      expect(scores).toHaveProperty('ReliabilityScore');
      expect(scores).toHaveProperty('ScalabilityScore');
      expect(scores).toHaveProperty('ServiceabilityScore');
      expect(scores).toHaveProperty('UsabilityScore');

      // Validate Expected Risk Matrix
      const risk = content.expected.RiskMatrix;
      expect(Array.isArray(risk)).toBe(true);
      for (const row of risk) {
        expect(row).toHaveProperty('Severity');
        expect(row).toHaveProperty('FindingCount');
      }

      // Validate Expected Graph Structure
      const graph = content.expected.Graph;
      expect(graph).toHaveProperty('nodes');
      expect(Array.isArray(graph.nodes)).toBe(true);
      for (const node of graph.nodes) {
        expect(node).toHaveProperty('id');
        expect(node).toHaveProperty('type');
        expect(node).toHaveProperty('status');
      }
    });
  }
});
