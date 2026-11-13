import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  server: { cors: { origin: 'https://www.owlbear.rodeo' } },
  build: {
    rollupOptions: {
      input: {
        home: resolve(import.meta.dirname, 'index.html'),
        background: resolve(import.meta.dirname, 'background.html'),
        settings: resolve(import.meta.dirname, 'step-settings.html'),
      },
    },
  },
});
