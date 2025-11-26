import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // This allows us to access environment variables during local development
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // This is the magic line that lets Vercel inject the API Key into your code securely
      'process.env.API_KEY': JSON.stringify(process.env.API_KEY || env.API_KEY)
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
    server: {
      port: 3000,
    }
  };
});