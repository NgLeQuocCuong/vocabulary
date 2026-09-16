import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: '/vocabulary/',
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
  },
  server: {
    port: 5173,
    open: true,
  },
});
