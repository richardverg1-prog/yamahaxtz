import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');
const svg = readFileSync(join(root, 'public', 'icon.svg'));

const sizes = [
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
];

for (const { name, size } of sizes) {
  await sharp(svg)
    .resize(size, size)
    .flatten({ background: '#060810' })  // fill transparent → dark bg (required for iOS)
    .png()
    .toFile(join(root, 'public', name));
  console.log(`✓ ${name} (${size}x${size})`);
}
console.log('Done.');
