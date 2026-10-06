import { cpSync, existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const appRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const standaloneRoot = path.join(appRoot, '.next', 'standalone', 'apps', 'web');
const serverPath = path.join(standaloneRoot, 'server.js');

if (!existsSync(serverPath)) {
  throw new Error('Standalone build not found. Run "pnpm build" before starting the web app.');
}

cpSync(path.join(appRoot, '.next', 'static'), path.join(standaloneRoot, '.next', 'static'), {
  recursive: true,
});

const publicPath = path.join(appRoot, 'public');
if (existsSync(publicPath)) {
  cpSync(publicPath, path.join(standaloneRoot, 'public'), { recursive: true });
}

await import(pathToFileURL(serverPath).href);
