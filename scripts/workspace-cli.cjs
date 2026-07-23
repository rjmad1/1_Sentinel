#!/usr/bin/env node

/**
 * Sentinel Developer Workspace Manager Companion CLI
 * Usage:
 *   node scripts/workspace-cli.cjs scan
 *   node scripts/workspace-cli.cjs health
 *   node scripts/workspace-cli.cjs clean --path "C:\AIProjects\old-repo"
 *   node scripts/workspace-cli.cjs restore --url "https://github.com/org/repo.git" --path "C:\AIProjects\repo"
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const args = process.argv.slice(2);
const command = args[0] || 'help';

function printHelp() {
  console.log(`
Sentinel Developer Workspace Manager CLI
-----------------------------------------
Commands:
  scan                   Scan local directories for Git repositories
  health                 Evaluate health score of discovered repositories
  clean --path <path>    Safely delete local repository clone (verifies 0 uncommitted/unpushed)
  restore --url <url> --path <target>   One-click clone repository from remote
  profiles               List workspace profiles
`);
}

function scanRepos(searchRoots = ['C:\\AIProjects', 'C:\\Users\\rajaj\\career-ops', 'C:\\Users\\rajaj\\CareerPropel', 'C:\\Users\\rajaj\\Projects']) {
  const repos = [];
  for (const root of searchRoots) {
    if (!fs.existsSync(root)) continue;
    try {
      const items = fs.readdirSync(root, { withFileTypes: true });
      for (const item of items) {
        if (!item.isDirectory()) continue;
        const dirPath = path.join(root, item.name);
        if (fs.existsSync(path.join(dirPath, '.git'))) {
          let branch = 'main';
          let uncommitted = 0;
          let unpushed = 0;

          try {
            branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: dirPath, encoding: 'utf-8', timeout: 3000 }).trim();
          } catch (e) {}

          try {
            const st = execSync('git status --porcelain', { cwd: dirPath, encoding: 'utf-8', timeout: 3000 }).trim();
            if (st) uncommitted = st.split('\n').filter(Boolean).length;
          } catch (e) {}

          try {
            const unp = execSync('git log @{u}..HEAD --oneline', { cwd: dirPath, encoding: 'utf-8', timeout: 3000 }).trim();
            if (unp) unpushed = unp.split('\n').filter(Boolean).length;
          } catch (e) {}

          let health = 'HEALTHY';
          if (uncommitted > 0 || unpushed > 0) health = 'WARNING';
          if (uncommitted > 10 || unpushed > 5) health = 'UNSAFE';

          repos.push({ name: item.name, path: dirPath, branch, uncommitted, unpushed, health });
        }
      }
    } catch (e) {}
  }
  return repos;
}

if (command === 'scan') {
  const repos = scanRepos();
  console.log(`\nDiscovered ${repos.length} Git Repositories:\n`);
  console.table(repos);
} else if (command === 'health') {
  const repos = scanRepos();
  const healthy = repos.filter(r => r.health === 'HEALTHY').length;
  const warning = repos.filter(r => r.health === 'WARNING').length;
  const unsafe = repos.filter(r => r.health === 'UNSAFE').length;

  console.log(`\nWorkspace Health Summary:`);
  console.log(`  Healthy: ${healthy}`);
  console.log(`  Warning: ${warning}`);
  console.log(`  Unsafe:  ${unsafe}\n`);
} else if (command === 'clean') {
  const pathIdx = args.indexOf('--path');
  if (pathIdx === -1 || !args[pathIdx + 1]) {
    console.error('Error: --path <dir> is required for clean command.');
    process.exit(1);
  }
  const targetPath = args[pathIdx + 1];
  console.log(`Evaluating safe cleanup for: ${targetPath}`);

  try {
    const statusOut = execSync('git status --porcelain', { cwd: targetPath, encoding: 'utf-8', timeout: 3000 }).trim();
    if (statusOut) {
      console.error(`Safety Violation: Repository has uncommitted files. Aborting deletion.`);
      process.exit(1);
    }
    const unpushedOut = execSync('git log @{u}..HEAD --oneline', { cwd: targetPath, encoding: 'utf-8', timeout: 3000 }).trim();
    if (unpushedOut) {
      console.error(`Safety Violation: Repository has unpushed commits. Aborting deletion.`);
      process.exit(1);
    }

    fs.rmSync(targetPath, { recursive: true, force: true });
    console.log(`Successfully cleaned local clone: ${targetPath}`);
  } catch (err) {
    console.error(`Cleanup failed: ${err.message}`);
  }
} else if (command === 'restore') {
  const urlIdx = args.indexOf('--url');
  const pathIdx = args.indexOf('--path');
  if (urlIdx === -1 || pathIdx === -1 || !args[urlIdx + 1] || !args[pathIdx + 1]) {
    console.error('Error: Both --url and --path are required.');
    process.exit(1);
  }
  const url = args[urlIdx + 1];
  const targetPath = args[pathIdx + 1];
  console.log(`Cloning ${url} -> ${targetPath}...`);
  try {
    execSync(`git clone ${url} "${targetPath}"`, { encoding: 'utf-8', timeout: 60000 });
    console.log(`Restoration complete!`);
  } catch (err) {
    console.error(`Restore failed: ${err.message}`);
  }
} else {
  printHelp();
}
