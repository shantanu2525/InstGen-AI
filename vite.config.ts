import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
  // User explicitly requested to use a specific API key.
  const API_KEY = "AIzaSyB33IGftG1Jj3jld9tygz3BzIqn3RjippA";

  return {
    plugins: [react()],
    define: {
      // Injects the hardcoded API key into the application
      'process.env.API_KEY': JSON.stringify(API_KEY),
    },
  };
});