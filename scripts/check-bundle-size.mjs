#!/usr/bin/env node
/**
 * Bundle size check script.
 * Fails if any chunk exceeds the size limit or if total bundle grows >10%.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIST_DIR = 'dist';
const ASSETS_DIR = join(DIST_DIR, 'assets');
const SIZE_LIMIT_KB = 800; // 800 KB per chunk
// Lazily loaded vendor chunks that cannot be split further, with their own limit.
// exceljs resolves to its prebuilt dist/exceljs.min.js (dependencies bundled in),
// and only the Excel tools load it.
const CHUNK_LIMITS_KB = { exceljs: 1000 };
const GROWTH_THRESHOLD = 0.1; // 10% growth

if (!existsSync(ASSETS_DIR)) {
  console.error('dist/assets not found. Run npm run build first.');
  process.exit(1);
}

const files = readdirSync(ASSETS_DIR).filter((f) => f.endsWith('.js'));
const sizes = new Map();

for (const file of files) {
  const content = readFileSync(join(ASSETS_DIR, file));
  const sizeKB = content.length / 1024;
  sizes.set(file, sizeKB);

  const chunkName = file.replace(/-[\w-]{8}\.js$/, '');
  const limitKB = CHUNK_LIMITS_KB[chunkName] ?? SIZE_LIMIT_KB;
  if (sizeKB > limitKB) {
    console.error(`FAIL: ${file} is ${sizeKB.toFixed(1)} KB (limit: ${limitKB} KB)`);
    process.exit(1);
  }
}

const totalKB = [...sizes.values()].reduce((a, b) => a + b, 0);
console.log(`Bundle size check passed: ${files.length} chunks, ${totalKB.toFixed(1)} KB total`);

// Check against previous build if exists
const prevSizesPath = join(DIST_DIR, '.bundle-sizes.json');
if (existsSync(prevSizesPath)) {
  const prevSizes = JSON.parse(readFileSync(prevSizesPath, 'utf8'));
  const prevTotal = Object.values(prevSizes).reduce((a, b) => a + b, 0);
  const growth = (totalKB - prevTotal) / prevTotal;

  if (growth > GROWTH_THRESHOLD) {
    console.error(`FAIL: Bundle grew ${(growth * 100).toFixed(1)}% (threshold: ${GROWTH_THRESHOLD * 100}%)`);
    process.exit(1);
  }

  console.log(`Growth check passed: ${(growth * 100).toFixed(1)}% change`);
}

// Save current sizes for next comparison
const sizeObj = Object.fromEntries(sizes);
const { writeFileSync } = await import('node:fs');
writeFileSync(prevSizesPath, JSON.stringify(sizeObj, null, 2));
