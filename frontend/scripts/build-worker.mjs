import * as esbuild from 'esbuild';
import path from 'node:path';
import fs from 'node:fs';
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

  // Cloudflare Pages has a strict 25 MiB per-file limit.
  // onnxruntime-web loads the 14.1MB WASM binary directly from /ort/ort-wasm-simd-threaded.wasm,
  // so any duplicate or oversized .wasm file generated inside dist/assets can be safely removed.
  const assetsDir = path.resolve(frontendDir, 'dist/assets');
  if (fs.existsSync(assetsDir)) {
    const files = fs.readdirSync(assetsDir);
    for (const file of files) {
      if (file.endsWith('.wasm')) {
        const filePath = path.join(assetsDir, file);
        const stat = fs.statSync(filePath);
        fs.unlinkSync(filePath);
        console.log(`✓ Removed duplicate asset wasm: ${file} (${(stat.size / 1024 / 1024).toFixed(1)}MB, served from /ort/)`);
      }
    }
  }
} catch (err) {
  console.error('Error building Pages Worker bundle:', err);
  process.exit(1);
}
