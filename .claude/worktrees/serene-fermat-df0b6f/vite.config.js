import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: './',
  server: { port: 5173, open: true, watch: { usePolling: true } },
});
