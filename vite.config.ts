import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  define: {
    global: 'window',
    process: {
      env: {},
      browser: true,
      nextTick: '((fn, ...args) => setTimeout(() => fn(...args), 0))'
    }
  },
});