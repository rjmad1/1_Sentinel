import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { spawn } from 'child_process'
import path from 'path'

// Vite plugin to run the background Node daemon
function backgroundDaemon() {
  return {
    name: 'background-daemon',
    configureServer() {
      console.log('Starting Sentinel background collector daemon...');
      const daemonScript = path.resolve(__dirname, 'collector/daemon/daemon.cjs');
      const daemonProcess = spawn('node', [daemonScript], {
        stdio: 'inherit',
        detached: false
      });

      daemonProcess.on('error', (err: Error) => {
        console.error('Failed to start collector daemon:', err);
      });

      process.on('exit', () => {
        daemonProcess.kill();
      });
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), backgroundDaemon()],
})
