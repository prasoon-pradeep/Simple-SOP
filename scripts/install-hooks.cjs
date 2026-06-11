#!/usr/bin/env node
/**
 * Installs project-local git hooks into .git/hooks/.
 * Run once after cloning: npm run install-hooks
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const HOOKS_DIR = path.join(ROOT, '.git', 'hooks');
const SCRIPTS_DIR = path.join(ROOT, 'scripts');

if (!fs.existsSync(HOOKS_DIR)) {
  console.error('ERROR: .git/hooks directory not found. Are you in the project root?');
  process.exit(1);
}

const hooks = [
  { hook: 'pre-commit', script: 'pre-commit.cjs' },
];

for (const { hook, script } of hooks) {
  const hookPath = path.join(HOOKS_DIR, hook);
  const scriptPath = path.join(SCRIPTS_DIR, script);
  const hookContent = `#!/bin/sh\nnode "${scriptPath}"\n`;

  fs.writeFileSync(hookPath, hookContent, { mode: 0o755 });
  console.log(`✓ Installed ${hook} → scripts/${script}`);
}

console.log('\nAll hooks installed. They will run automatically on each git commit.');
