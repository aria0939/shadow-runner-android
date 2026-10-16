import { defineConfig } from 'vite';
import { resolve } from 'path';

// Vite configuration for Shadow Runner.
// - Base path is './' so the built bundle works when packaged inside
//   an Android WebView via Capacitor (file:// scheme).
// - Phaser is bundled (no external CDN) for offline Android use.
// - Build target is modern evergreen browsers / Android WebView 60+.
export default defineConfig({
  base: './',
  root: '.',
  publicDir: 'public',
  server: {
    host: true,
    port: 5173,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    target: 'es2020',
    sourcemap: false,
    minify: 'esbuild',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        manualChunks: {
          phaser: ['phaser'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
