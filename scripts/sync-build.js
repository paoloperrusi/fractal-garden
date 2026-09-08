import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const builtFile = path.join(rootDir, 'dist', 'index.dev.html');
const targetIndex = path.join(rootDir, 'index.html');
const targetStandalone = path.join(rootDir, 'index.standalone.html');

if (fs.existsSync(builtFile)) {
  fs.copyFileSync(builtFile, targetIndex);
  fs.copyFileSync(builtFile, targetStandalone);
  console.log('Successfully synced bundle to index.html and index.standalone.html!');
} else {
  console.error('Built file not found at:', builtFile);
  process.exit(1);
}
