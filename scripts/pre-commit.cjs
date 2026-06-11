#!/usr/bin/env node
/**
 * Pre-commit hook — TypeScript type check.
 * Blocks the commit if tsc reports any errors.
 *
 * Installed via: npm run install-hooks
 * Runs automatically on every: git commit
 */

'use strict';

const { spawnSync } = require('child_process');

console.log('⏳ TypeScript check...');

const result = spawnSync(
  'npx',
  ['tsc', '--noEmit'],
  { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' }
);

const output = (result.stdout + result.stderr).trim();

if (result.status !== 0) {
  console.error('\n❌ TypeScript check failed — commit blocked\n');
  if (output) console.error(output);
  console.error('\nFix the errors above, then re-run git commit.');
  process.exit(1);
}

console.log('✓ TypeScript check passed\n');
