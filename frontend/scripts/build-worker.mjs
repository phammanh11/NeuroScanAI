import * as esbuild from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(__dirname, '..');
const backendEntry = path.resolve(frontendDir, '../backend/src/index.ts');
const outfile = path.resolve(frontendDir, 'dist/_worker.js');

try {
  await esbuild.build({
    entryPoints: [backendEntry],
    bundle: true,
    format: 'esm',
    target: 'es2022',
    platform: 'browser',
    conditions: ['worker', 'browser'],
    outfile,
    nodePaths: [path.resolve(frontendDir, 'node_modules')],
    minify: true,
    sourcemap: false,
    external: ['node:*', 'cloudflare:*'],
  });

  console.log('✓ Successfully built Cloudflare Pages Worker bundle: dist/_worker.js');
} catch (err) {
  console.error('Error building Pages Worker bundle:', err);
  process.exit(1);
}
