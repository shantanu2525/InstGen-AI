import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
  return {
    plugins: [react()],
    // Removed hardcoded API_KEY injection. 
    // The app now relies on the user providing the key via the UI.
  };
});