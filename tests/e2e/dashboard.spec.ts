import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('EIIP Operations Command Center E2E Tests', () => {
  const tempDir = path.join(__dirname, '../golden-datasets/temp');
  
  // Files to upload in E2E tests
  const filesToUpload = {
    env: path.join(tempDir, 'vulnerable-workstation.environmentoverview.json'),
    findings: path.join(tempDir, 'vulnerable-workstation.findings.json'),
    score: path.join(tempDir, 'vulnerable-workstation.healthscore.json'),
    risk: path.join(tempDir, 'vulnerable-workstation.riskmatrix.json'),
    forecast: path.join(tempDir, 'vulnerable-workstation.capacityforecast.json'),
  };

  test.beforeAll(() => {
    // Ensure temp dir exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Load combined vulnerable-workstation dataset
    const combinedPath = path.join(__dirname, '../golden-datasets/vulnerable-workstation.json');
    const dataset = JSON.parse(fs.readFileSync(combinedPath, 'utf8'));

    // Split it into separate files expected by the App's JSON loader
    fs.writeFileSync(filesToUpload.env, JSON.stringify(dataset.input.Environment), 'utf8');
    fs.writeFileSync(filesToUpload.findings, JSON.stringify(dataset.expected.Findings), 'utf8');
    fs.writeFileSync(filesToUpload.score, JSON.stringify(dataset.expected.HealthScore), 'utf8');
    fs.writeFileSync(filesToUpload.risk, JSON.stringify(dataset.expected.RiskMatrix), 'utf8');
    fs.writeFileSync(filesToUpload.forecast, JSON.stringify(dataset.expected.CapacityForecast), 'utf8');
  });

  test.afterAll(() => {
    // Cleanup temp files
    try {
      Object.values(filesToUpload).forEach(f => {
        if (fs.existsSync(f)) fs.unlinkSync(f);
      });
      if (fs.existsSync(tempDir)) fs.rmdirSync(tempDir);
    } catch (e) {
      console.warn('Cleanup error:', e);
    }
  });

  test('Execute Full Assessment Workflow (10 E2E Scenarios)', async ({ page }) => {
    // Scenario 1: Load and Render Landing Page
    await page.goto('/');
    await expect(page).toHaveTitle(/SENTINEL/);

    // Scenario 2: Upload Assessment JSON
    // Navigate to Imports tab
    await page.click('button.menu-item:has-text("Imports")');
    
    // Set input files to trigger the JSON parser upload handler
    await page.setInputFiles('input[type="file"]', Object.values(filesToUpload));

    // Wait for upload info logs to appear in import console
    await expect(page.locator('body')).toContainText(/Loaded and updated environment details/i);
    await expect(page.locator('body')).toContainText(/findings/i);

    // Scenario 3: Render Dashboard Overview
    await page.click('button.menu-item:has-text("Overview")');
    
    // Check Threat Status banner
    await expect(page.locator('.system-threat-banner')).toContainText(/WARNING/i);
    
    // Verify Computer Name card
    await expect(page.locator('.glass-panel:has-text("Environment Overview Details")')).toContainText('VULN-LAPTOP15');
    
    // Verify radial health gauge contains overall score (84.75 or 85)
    await expect(page.locator('.app-container')).toContainText('84.75');

    // Scenario 4: Search Software Inventory
    await page.click('button.menu-item:has-text("Software Intelligence")');
    await page.fill('input[placeholder="Search catalog software..."]', 'Python');
    // Verify Python is present
    await expect(page.locator('tbody')).toContainText('Python');

    // Scenario 5: Filter Software Inventory
    await page.fill('input[placeholder="Search catalog software..."]', '');
    await page.selectOption('select:below(label:has-text("Security Risk"))', 'Critical');
    // Outdated Nginx package contains CVE-2023-44487 (Critical)
    await expect(page.locator('tbody')).toContainText('Nginx');

    // Scenario 6: Group Software Inventory
    await page.selectOption('select:below(label:has-text("Security Risk"))', 'ALL');
    await page.selectOption('select:below(label:has-text("Grouping"))', 'Group by Vendor');
    // Should render vendor headers in table
    await expect(page.locator('tbody')).toContainText('Python Software Foundation');

    // Scenario 7: Generate Upgrade Plan
    // Select a package and click the upgrade icon button
    const upgradeBtn = page.locator('button[title="Automated Upgrade"]').first();
    await upgradeBtn.click();
    
    // Verify upgrade drawer and simulation terminal
    await expect(page.locator('.main-content')).toContainText(/Initiating Upgrade Analysis/i);
    
    // Click execute upgrades to generate simulation logs
    await page.click('button:has-text("Execute Approved Operations")');
    // Wait for success logs
    await expect(page.locator('.main-content')).toContainText(/SUCCESS. Overall system status reports STABLE/i);

    // Close the drawer to prevent blocking other elements
    await page.click('.glass-panel:has-text("Upgrade Plan") button:has-text("Close")');

    // Scenario 8: Export AI Review Package / Chat Commands
    await page.click('button.menu-item:has-text("AI Guardian")');
    await page.fill('input[placeholder="Type a query or /help..."]', '/help');
    await page.press('input[placeholder="Type a query or /help..."]', 'Enter');
    
    // Check chatbot response for command list
    await expect(page.locator('.chat-messages-container, .main-content')).toContainText(/Quick Command Protocol/i);

    // Scenario 9: Generate Architecture Review
    await page.fill('input[placeholder="Type a query or /help..."]', '/graph');
    await page.press('input[placeholder="Type a query or /help..."]', 'Enter');
    await expect(page.locator('.chat-messages-container, .main-content')).toContainText(/Infrastructure Knowledge Graph Nodes/i);

    // Scenario 10: Validate Dependency Graph
    await page.click('button.menu-item:has-text("Infrastructure Graph")');
    // Verify canvas renders React Flow and node labels
    await expect(page.locator('.react-flow')).toBeVisible();
    await expect(page.locator('.react-flow')).toContainText('Compute CPU');

    // Perform node details inspector click on the Compute CPU node
    await page.locator('.react-flow__node:has-text("Compute CPU")').click();
    // Verify side panel updates with CIM property details
    await expect(page.locator('.glass-panel .glass-panel:has-text("Node Parameter Audit")')).toContainText('Logical Processors');

    // Scenario 11: Risk Checkbox Mitigation updates score
    // Switch to Dashboard Overview first to capture initial pending count
    await page.click('button.menu-item:has-text("Overview")');
    const pendingBadge = page.locator('.glass-panel:has-text("Audit Action Panel") .badge-orange');
    const initialText = await pendingBadge.innerText();
    
    // Perform mitigation check-off directly on the Overview page
    await page.locator('input[type="checkbox"]').first().click();
    
    // Verify pending badge decrements
    await page.waitForTimeout(500); // Allow state to propagate
    const updatedText = await pendingBadge.innerText();
    expect(parseInt(updatedText)).toBeLessThan(parseInt(initialText));

    // Scenario 12: Validate Fleet Command Center
    await page.click('button.menu-item:has-text("Fleet Overview")');
    await expect(page.locator('h1')).toContainText('Fleet Command Center');
    
    // Verify that the table is rendered and contains hosts (like VULN-LAPTOP15)
    await expect(page.locator('tbody')).toContainText('VULN-LAPTOP15');
    
    // Test filtering by platform
    await page.locator('div:has(span:has-text("Platform:")) select').first().selectOption('MACOS');
    // Since VULN-LAPTOP15 is Windows/not macos, it should say "No hosts match current filters"
    await expect(page.locator('body')).toContainText(/No hosts match current filters/i);
    
    // Reset platform filter
    await page.locator('div:has(span:has-text("Platform:")) select').first().selectOption('ALL');
    await expect(page.locator('tbody')).toContainText('VULN-LAPTOP15');
    
    // Test filtering by search query
    await page.locator('input[placeholder="Search hosts by name, OS, or ID..."]').fill('VULN-LAPTOP15');
    await expect(page.locator('tbody')).toContainText('VULN-LAPTOP15');
    await page.locator('input[placeholder="Search hosts by name, OS, or ID..."]').fill('');

    // Test context switcher by selecting the machine context
    // It should switch activeTab to 'overview' and change context
    await page.locator('tr:has-text("VULN-LAPTOP15") button').click();
    await expect(page.locator('h1')).toContainText('Dashboard Overview');

    // Scenario 13: Validate Capacity Forecasting
    await page.click('button.menu-item:has-text("Capacity Forecasting")');
    await expect(page.locator('h1')).toContainText('Capacity Forecast');
    
    // Verify presence of forecast trends panels
    await expect(page.locator('.glass-panel:has-text("Storage Trend")')).toBeVisible();
    await expect(page.locator('.glass-panel:has-text("Memory Forecast")')).toBeVisible();
    
    // Verify SVG trend chart is present
    await expect(page.locator('.glass-panel:has-text("Timeline Saturation Curve") svg[viewBox="0 0 600 280"]')).toBeVisible();

    // Scenario 14: Validate Auto-Healing Dashboard
    await page.click('button.menu-item:has-text("Auto-Healing")');
    await expect(page.locator('body')).toContainText('Closed-Loop Auto-Healing Policies');
    await expect(page.locator('body')).toContainText('Self-Healing Execution Audit Trail');

    // Scenario 15: Validate Vulnerability Intel Dashboard
    await page.click('button.menu-item:has-text("Vulnerability Intel")');
    await expect(page.locator('body')).toContainText('Threat intelligence Catalog');
    await expect(page.locator('body')).toContainText('Active Vulnerabilities');
    await expect(page.locator('body')).toContainText('Select a vulnerability from the threat intelligence catalog');
  });
});
