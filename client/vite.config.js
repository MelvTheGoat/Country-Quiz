import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // The shared package is a workspace symlink outside client/, so Vite needs
    // permission to read it during dev.
    fs: { allow: ['..'] },
  },
  // Pre-bundling a linked workspace package with a JSON import trips esbuild's
  // dep scanner; letting Vite process it as source keeps hot reload working.
  optimizeDeps: { exclude: ['@capitals-quiz/shared'] },
  build: { outDir: 'dist', sourcemap: true },
});
