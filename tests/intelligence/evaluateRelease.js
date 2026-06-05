import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const psScript = path.join(__dirname, 'Evaluate-ReleaseQuality.ps1');

console.log(`Launching release quality evaluation from: ${psScript}...`);

const child = spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', psScript], {
  shell: true,
  stdio: 'inherit'
});

child.on('close', (code) => {
  console.log(`Evaluation process finished with exit code ${code}.`);
  process.exit(code);
});
