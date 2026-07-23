/**
 * Centralized API Gateway Configuration Utility
 */

export const API_BASE_URL = 
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
  'http://localhost:8000';

export const DAEMON_BASE_URL = 
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_DAEMON_URL) ||
  'http://localhost:1337';

export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}

export function getDaemonUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${DAEMON_BASE_URL}${cleanPath}`;
}
