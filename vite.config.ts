/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: '@citadel/apps/chat/client', replacement: fileURLToPath(new URL('./src/apps/chat/client.tsx', import.meta.url)) },
      { find: '@citadel/apps/chat/server', replacement: fileURLToPath(new URL('./src/apps/chat/serverEntry.ts', import.meta.url)) },
      { find: '@citadel/apps/chess/client', replacement: fileURLToPath(new URL('./src/apps/chess/client.tsx', import.meta.url)) },
      { find: '@citadel/apps/chess/server', replacement: fileURLToPath(new URL('./src/apps/chess/serverEntry.ts', import.meta.url)) },
      { find: '@citadel/apps/snake/client', replacement: fileURLToPath(new URL('./src/apps/snake/client.tsx', import.meta.url)) },
      { find: '@citadel/apps/snake/server', replacement: fileURLToPath(new URL('./src/apps/snake/serverEntry.ts', import.meta.url)) },
      { find: '@citadel/platform/server-app', replacement: fileURLToPath(new URL('./src/platform/serverApp.ts', import.meta.url)) },
      { find: '@citadel/platform/persistence', replacement: fileURLToPath(new URL('./src/platform/persistence.ts', import.meta.url)) },
      { find: '@citadel/platform/client', replacement: fileURLToPath(new URL('./src/platform/client.ts', import.meta.url)) },
      { find: '@citadel/platform/app', replacement: fileURLToPath(new URL('./src/platform/app.ts', import.meta.url)) },
      { find: '@citadel/apps/catalog', replacement: fileURLToPath(new URL('./src/apps/catalog.ts', import.meta.url)) },
      { find: '@citadel/apps/chat', replacement: fileURLToPath(new URL('./src/apps/chat/index.ts', import.meta.url)) },
      { find: '@citadel/apps/chess', replacement: fileURLToPath(new URL('./src/apps/chess/index.ts', import.meta.url)) },
      { find: '@citadel/apps/snake', replacement: fileURLToPath(new URL('./src/apps/snake/index.ts', import.meta.url)) }
    ]
  },
  server: {
    port: 5173,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true
      },
      '/health': 'http://localhost:3001'
    }
  },
  test: {
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx']
  }
});
