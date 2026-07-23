import { createClient } from '@insforge/sdk';

export const insforge = createClient({
  baseUrl: import.meta.env.VITE_INSFORGE_HOST || '',
  anonKey: import.meta.env.VITE_INSFORGE_API_KEY || ''
});
