#!/usr/bin/env node
/**
 * Validation script for feature registry.
 * 
 * This script reads the featureRegistry.ts file and verifies that:
 * 1. Each disabled tool has a clear "unavailable" message
 * 2. Each limited tool has a limitation text
 * 3. Each stable tool has accurate support text
 * 
 * Usage: npx tsx scripts/validate-feature-registry.ts
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Read the feature registry source
const registryPath = resolve(process.cwd(), 'src/config/featureRegistry.ts');
const registrySource = readFileSync(registryPath, 'utf8');

// Parse the registry entries
const entries: Array<{
  id: string;
  releaseState: string;
  support?: string;
  limitation?: string;
}> = [];

// Simple regex-based parser for the registry
const entryRegex = /'([a-z-]+)':\s*\{[^}]*releaseState:\s*'([^']+)'[^}]*\}/g;
let match;
while ((match = entryRegex.exec(registrySource)) !== null) {
  const id = match[1];
  const releaseState = match[2];
  
  // Extract support and limitation if present
  const supportMatch = match[0].match(/support:\s*'([^']+)'/);
  const limitationMatch = match[0].match(/limitation:\s*'([^']+)'/);
  
  entries.push({
    id,
    releaseState,
    support: supportMatch?.[1],
    limitation: limitationMatch?.[1],
  });
}

// Validate entries
const errors: string[] = [];
const warnings: string[] = [];

for (const entry of entries) {
  // Check disabled tools
  if (entry.releaseState === 'disabled') {
    if (!entry.support && !entry.limitation) {
      errors.push(`Disabled tool '${entry.id}' has no support or limitation text`);
    }
    if (entry.support && !entry.support.toLowerCase().includes('not') && !entry.support.toLowerCase().includes('unavailable')) {
      warnings.push(`Disabled tool '${entry.id}' support text may not clearly indicate unavailability: "${entry.support}"`);
    }
  }
  
  // Check limited tools
  if (entry.releaseState === 'limited') {
    if (!entry.limitation) {
      errors.push(`Limited tool '${entry.id}' has no limitation text`);
    }
    if (!entry.support) {
      warnings.push(`Limited tool '${entry.id}' has no support text`);
    }
  }
  
  // Check stable tools
  if (entry.releaseState === 'stable') {
    if (!entry.support) {
      warnings.push(`Stable tool '${entry.id}' has no support text`);
    }
  }
}

// Output report
console.log('Feature Registry Validation Report');
console.log('=====================================');
console.log(`Total entries: ${entries.length}`);
console.log(`Errors: ${errors.length}`);
console.log(`Warnings: ${warnings.length}`);
console.log('');

if (errors.length > 0) {
  console.log('ERRORS:');
  errors.forEach(e => console.log(`  ❌ ${e}`));
  console.log('');
}

if (warnings.length > 0) {
  console.log('WARNINGS:');
  warnings.forEach(w => console.log(`  ⚠️  ${w}`));
  console.log('');
}

if (errors.length === 0 && warnings.length === 0) {
  console.log('✅ All entries are valid!');
}

// Exit with error code if there are errors
process.exit(errors.length > 0 ? 1 : 0);