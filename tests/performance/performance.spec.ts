import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('EIIP Client UI SLA Performance Checks', () => {
  const tempDir = path.join(__dirname, '../golden-datasets/temp_perf');
  const filesToUpload = [
    path.join(tempDir, 'healthy.environmentoverview.json'),
    path.join(tempDir, 'healthy.findings.json'),
    path.join(tempDir, 'healthy.healthscore.json'),
    path.join(tempDir, 'healthy.riskmatrix.json'),
    path.join(tempDir, 'healthy.capacityforecast.json'),
  ];

  test.beforeAll(() => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const combinedPath = path.join(__dirname, '../golden-datasets/healthy-workstation.json');
    const dataset = JSON.parse(fs.readFileSync(combinedPath, 'utf8'));

    fs.writeFileSync(filesToUpload[0], JSON.stringify(dataset.input.Environment), 'utf8');
    fs.writeFileSync(filesToUpload[1], JSON.stringify(dataset.expected.Findings), 'utf8');
    fs.writeFileSync(filesToUpload[2], JSON.stringify(dataset.expected.HealthScore), 'utf8');
    fs.writeFileSync(filesToUpload[3], JSON.stringify(dataset.expected.RiskMatrix), 'utf8');
    fs.writeFileSync(filesToUpload[4], JSON.stringify(dataset.expected.CapacityForecast), 'utf8');
  });

  test.afterAll(() => {
    try {
      filesToUpload.forEach(f => {
        if (fs.existsSync(f)) fs.unlinkSync(f);
      });
      if (fs.existsSync(tempDir)) fs.rmdirSync(tempDir);
    } catch {
      // Ignore cleanup errors
    }
  });

  test('Dashboard Page Load SLA < 2 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - start;
    console.log(`Page Load Time: ${loadTime} ms`);
    expect(loadTime).toBeLessThan(2000); // 2 seconds target
  });

  test('Software Search & Filter SLA < 500 ms', async ({ page }) => {
    await page.goto('/');
    
    // Load dataset first so there are items to filter
    await page.click('button.menu-item:has-text("Imports")');
    await page.setInputFiles('input[type="file"]', filesToUpload);

    await page.click('button.menu-item:has-text("Software Intelligence")');
    
    // Type query and measure search execution time
    const startSearch = Date.now();
    await page.fill('input[placeholder="Search catalog software..."]', 'Python');
    await page.locator('tbody tr').first().waitFor({ state: 'visible' });
    const searchTime = Date.now() - startSearch;
    console.log(`Search response time: ${searchTime} ms`);
    expect(searchTime).toBeLessThan(500); // 500 ms target
    
    // Select option filter and measure filter execution time
    const startFilter = Date.now();
    await page.selectOption('select:below(label:has-text("Security Risk"))', 'None');
    const filterTime = Date.now() - startFilter;
    console.log(`Filter response time: ${filterTime} ms`);
    expect(filterTime).toBeLessThan(500); // 500 ms target
  });
});
