import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { spawn } from 'child_process'
import path from 'path'

// Vite plugin to run the background Node daemon and FastAPI server
function backgroundDaemon() {
  return {
    name: 'background-daemon',
    configureServer() {
      if (process.env.VITEST) return;
      console.log('Starting Sentinel background collector daemon...');
      const daemonScript = path.resolve(__dirname, 'collector/daemon/daemon.cjs');
      const daemonProcess = spawn('node', [daemonScript], {
        stdio: 'inherit',
        detached: false
      });

      daemonProcess.on('error', (err: Error) => {
        console.error('Failed to start collector daemon:', err);
      });

      console.log('Starting Sentinel FastAPI gateway server...');
      const fastapiProcess = spawn('uvicorn', ['Phase2_Integration.Backend.main:app', '--host', '127.0.0.1', '--port', '8000'], {
        shell: true,
        stdio: 'inherit'
      });

      fastapiProcess.on('error', (err: Error) => {
        console.error('Failed to start FastAPI server:', err);
      });

      process.on('exit', () => {
        daemonProcess.kill();
        fastapiProcess.kill();
      });
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tsconfigPaths(), backgroundDaemon()],
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.test.ts']
  }
} as any)
