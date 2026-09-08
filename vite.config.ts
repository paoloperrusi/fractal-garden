import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    target: 'esnext',
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      input: 'index.dev.html',
    },
  },
  server: {
    port: 3000,
    open: '/index.dev.html',
  },
});
