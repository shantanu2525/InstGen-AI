import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // If the API Key exists at build time (e.g. Vercel, .env), bake it in.
      // If not, use a safe runtime lookup that works in Playground (globalThis.process.env.API_KEY)
      // and returns undefined (instead of crashing) in standard browsers.
      'process.env.API_KEY': env.API_KEY 
        ? JSON.stringify(env.API_KEY) 
        : 'globalThis.process?.env?.API_KEY',
    },
  };
});