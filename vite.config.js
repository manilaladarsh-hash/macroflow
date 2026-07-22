import { defineConfig } from 'vite';
import { sites } from './build/sites-vite-plugin.js';

export default defineConfig({
  plugins: [sites()],
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/macroflow.js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: assetInfo => assetInfo.name?.endsWith('.css')
          ? 'assets/macroflow.css'
          : 'assets/[name]-[hash][extname]'
      }
    }
  },
  test: {
    environment: 'node',
    coverage: { reporter: ['text', 'html'] }
  }
});
