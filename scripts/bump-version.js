#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const version = process.argv[2];

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error('Usage: npm run version <major.minor.patch>  e.g. npm run version 0.3.0');
  process.exit(1);
}

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// Update package.json
const pkgPath = path.join(root, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const oldPkg = pkg.version;
pkg.version = version;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log(`package.json:         ${oldPkg} → ${version}`);

// Update Cargo.toml (first version = "..." line only — the package version)
const cargoPath = path.join(root, 'src-tauri', 'Cargo.toml');
const cargo = fs.readFileSync(cargoPath, 'utf8');
const oldCargo = (cargo.match(/^version\s*=\s*"([^"]+)"/m) || [])[1] || '?';
const updatedCargo = cargo.replace(/^version\s*=\s*"[^"]+"/m, `version = "${version}"`);
fs.writeFileSync(cargoPath, updatedCargo);
console.log(`src-tauri/Cargo.toml: ${oldCargo} → ${version}`);

console.log(`\nDone. Run "cargo build" or "npm run tauri build" to regenerate lock files.`);
