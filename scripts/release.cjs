#!/usr/bin/env node
/**
 * Pre-release validation wrapper.
 * Runs 3 checks before triggering gh workflow run release.yml.
 *
 * Usage:
 *   node scripts/release.js <tag> <notes>
 *   npm run release -- v0.2.9 "What's new..."
 *
 * Exit codes:
 *   0  — all checks passed, release triggered
 *   1  — one or more checks failed (errors printed to stderr)
 */

'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ── Args ──────────────────────────────────────────────────────────────────────
const [, , tag, notes] = process.argv;

if (!tag || !notes) {
  console.error('ERROR [USAGE]: node scripts/release.js <tag> <notes>');
  console.error('  tag   — e.g. v0.2.9');
  console.error('  notes — release notes string (quote it if multi-line)');
  process.exit(1);
}

const errors = [];
const warnings = [];

// ── Check 1: Dangerous shell characters in notes ──────────────────────────────
// These characters break shell scripts when a ${{ inputs.notes }} expression is
// expanded inline inside a `run:` block. Even with the current env: fix in place,
// flagging them prevents regressions if the workflow is ever edited carelessly.
const SHELL_DANGEROUS = [
  {
    pattern: /;/,
    name: 'semicolon (;)',
    reason: 'shell command separator — splits the notes string into multiple commands when expanded inline',
    example: '"Tools & Consumables; editor updated" → shell runs "editor updated" as a command',
  },
  {
    pattern: /`/,
    name: 'backtick (`)',
    reason: 'shell command substitution — executes the text between backticks as a shell command',
  },
  {
    pattern: /\$\(/,
    name: '$( subshell',
    reason: 'shell command substitution — executes the embedded command and inlines the output',
  },
];

for (const { pattern, name, reason, example } of SHELL_DANGEROUS) {
  if (pattern.test(notes)) {
    let msg = `[CHECK 1 — NOTES CHARS] Contains ${name}\n` +
              `  Reason : ${reason}`;
    if (example) msg += `\n  Example: ${example}`;
    msg += '\n  Fix    : Remove or replace the character in your release notes.';
    errors.push(msg);
  }
}

// Warn (non-blocking) about characters that are dangerous only if the workflow
// ever reverts to inline expansion.
const SHELL_WARN = [
  { pattern: /&&/, name: '&& (AND operator)', reason: 'chains commands — safe with env: but dangerous if workflow is changed to inline expansion' },
  { pattern: / \|\| /, name: '|| (OR operator)', reason: 'chains commands — safe with env: but dangerous if workflow is changed to inline expansion' },
];

for (const { pattern, name, reason } of SHELL_WARN) {
  if (pattern.test(notes)) {
    warnings.push(`[CHECK 1 — NOTES CHARS] Warning: contains ${name} — ${reason}`);
  }
}

// ── Check 2: Workflow YAML lint ───────────────────────────────────────────────
// Ensure no ${{ github.event.inputs.* }} or ${{ inputs.* }} is expanded inline
// inside a `run:` shell block. All inputs must be passed via `env:`.
const WORKFLOW_PATH = path.resolve(__dirname, '../.github/workflows/release.yml');
const INLINE_INPUT_RE = /\$\{\{\s*(github\.event\.inputs\.|inputs\.)/;

try {
  const src = fs.readFileSync(WORKFLOW_PATH, 'utf8');
  const lines = src.split('\n');

  let inRunBlock = false;
  let runIndent = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trimStart();
    const indent = line.length - trimmed.length;

    // Detect start of a multiline run: block
    if (/^\s*run:\s*[|>]/.test(line)) {
      inRunBlock = true;
      runIndent = indent;
      continue;
    }

    // Single-line run: "command"
    if (/^\s*run:\s/.test(line) && !inRunBlock) {
      if (INLINE_INPUT_RE.test(line)) {
        errors.push(
          `[CHECK 2 — WORKFLOW LINT] Line ${i + 1}: inline \${{ inputs }} in single-line run:\n` +
          `  Line   : ${line.trim()}\n` +
          `  Fix    : Move the input to an env: block above run: and reference it as $VAR_NAME instead.`
        );
      }
      continue;
    }

    if (inRunBlock) {
      // Exit the run block when indentation returns to run level (non-blank line)
      if (trimmed.length > 0 && indent <= runIndent) {
        inRunBlock = false;
        runIndent = -1;
        // Re-check this line as a potential new directive
        i--;
        continue;
      }
      if (INLINE_INPUT_RE.test(line)) {
        errors.push(
          `[CHECK 2 — WORKFLOW LINT] Line ${i + 1}: inline \${{ inputs }} inside run: block\n` +
          `  Line   : ${line.trim()}\n` +
          `  Fix    : Add an env: section to this step and reference the value as $VAR_NAME:\n` +
          `           env:\n` +
          `             MY_VAR: \${{ github.event.inputs.my_input }}\n` +
          `           run: |\n` +
          `             echo "$MY_VAR"`
        );
      }
    }
  }
} catch (e) {
  warnings.push(`[CHECK 2 — WORKFLOW LINT] Could not read ${WORKFLOW_PATH}: ${e.message}`);
}

// ── Check 3: Version collision ────────────────────────────────────────────────
// The tag must not already exist as a published (non-draft) GitHub release.
try {
  const result = spawnSync('gh', ['release', 'list', '--limit', '100', '--json', 'tagName,isDraft'], {
    encoding: 'utf8',
  });
  if (result.status === 0 && result.stdout) {
    const releases = JSON.parse(result.stdout);
    const published = releases.filter(r => !r.isDraft).map(r => r.tagName);
    if (published.includes(tag)) {
      errors.push(
        `[CHECK 3 — VERSION COLLISION] Tag ${tag} is already a published GitHub release.\n` +
        `  Fix: Bump the version (npm run version 0.x.y), commit, push, then re-run this script.`
      );
    }
  } else {
    warnings.push(
      `[CHECK 3 — VERSION COLLISION] Could not fetch GitHub releases (offline or gh not authenticated?).\n` +
      `  Skipping version collision check — verify manually that ${tag} does not already exist.`
    );
  }
} catch (e) {
  warnings.push(`[CHECK 3 — VERSION COLLISION] gh CLI error: ${e.message}`);
}

// ── Report ────────────────────────────────────────────────────────────────────
if (warnings.length > 0) {
  console.warn('\n⚠  Warnings (non-blocking):');
  warnings.forEach(w => console.warn(`\n   ${w}`));
}

if (errors.length > 0) {
  console.error('\n\n✗ RELEASE BLOCKED — fix the following errors before releasing:\n');
  errors.forEach((e, idx) => {
    console.error(`  [${idx + 1}/${errors.length}] ${e}\n`);
  });
  process.exit(1);
}

console.log('\n✓ All checks passed — triggering release workflow...\n');

// Trigger the workflow. Use spawnSync with an args array so the notes string
// is passed as a literal value — no shell interpolation.
const result = spawnSync(
  'gh',
  ['workflow', 'run', 'release.yml', '--field', `tag=${tag}`, '--field', `notes=${notes}`],
  { stdio: 'inherit' }
);

process.exit(result.status ?? 0);
