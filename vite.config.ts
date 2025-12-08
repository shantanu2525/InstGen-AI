import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // If env.API_KEY is present (Vercel/Local .env), stringify it.
      // If missing, we fallback to checking `globalThis.process?.env?.API_KEY` at runtime.
      // This allows the AI Studio playground to inject the key at runtime without it being overwritten by "undefined" at build time.
      'process.env.API_KEY': env.API_KEY 
        ? JSON.stringify(env.API_KEY) 
        : 'globalThis.process?.env?.API_KEY',
    },
  };
});