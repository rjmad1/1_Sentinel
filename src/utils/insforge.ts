import { createClient } from '@insforge/sdk';

export const insforge = createClient({
  baseUrl: import.meta.env.VITE_INSFORGE_HOST || 'https://ba47g6qs.ap-southeast.insforge.app',
  anonKey: import.meta.env.VITE_INSFORGE_API_KEY || 'ik_baabb3b9174850662cf034b9a36fe467'
});
