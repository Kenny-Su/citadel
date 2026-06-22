import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createChatServer } from './chatServer.js';

const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? '0.0.0.0';
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';
const serverDir = dirname(fileURLToPath(import.meta.url));
const staticDir = resolve(serverDir, '..', '..', 'dist');

const { httpServer } = createChatServer({
  clientOrigin: CLIENT_ORIGIN,
  staticDir: existsSync(resolve(staticDir, 'index.html')) ? staticDir : undefined
});

httpServer.listen(PORT, HOST, () => {
  console.log(`Chat server listening on http://${HOST}:${PORT}`);
});
