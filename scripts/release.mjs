#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const bump = process.argv[2];
if (!['major', 'minor', 'patch'].includes(bump)) {
  console.error('Uso: node scripts/release.mjs <major|minor|patch>');
  process.exit(1);
}

// --- Ler versao atual do package.json ---
const pkgPath = resolve(root, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
const [major, minor, patch] = pkg.version.split('.').map(Number);

// --- Calcular nova versao ---
let newVersion;
if (bump === 'major') {
  newVersion = `${major + 1}.0.0`;
} else if (bump === 'minor') {
  newVersion = `${major}.${minor + 1}.0`;
} else {
  newVersion = `${major}.${minor}.${patch + 1}`;
}

console.log(`Versao: ${pkg.version} -> ${newVersion}`);

// --- Atualizar package.json ---
pkg.version = newVersion;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
console.log(`Atualizado: package.json`);

// --- Atualizar tauri.conf.json ---
const tauriConfPath = resolve(root, 'src-tauri', 'tauri.conf.json');
const tauriConf = JSON.parse(readFileSync(tauriConfPath, 'utf-8'));
tauriConf.version = newVersion;
writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n', 'utf-8');
console.log(`Atualizado: src-tauri/tauri.conf.json`);

// --- Atualizar Cargo.toml ---
const cargoPath = resolve(root, 'src-tauri', 'Cargo.toml');
let cargo = readFileSync(cargoPath, 'utf-8');
cargo = cargo.replace(
  /^(version\s*=\s*")([^"]+)(")/m,
  `$1${newVersion}$3`
);
writeFileSync(cargoPath, cargo, 'utf-8');
console.log(`Atualizado: src-tauri/Cargo.toml`);

// --- Git commit, tag e push ---
// Note: execSync is used here with hardcoded commands only.
// The version string is computed internally (not from external input),
// so there is no command injection risk.
const tag = `v${newVersion}`;
const run = (cmd) => {
  console.log(`$ ${cmd}`);
  execSync(cmd, { cwd: root, stdio: 'inherit' });
};

run('git add -A');
run(`git commit -m "release: ${tag}"`);
run(`git tag ${tag}`);
run('git push');
run('git push --tags');

console.log(`\nRelease ${tag} criada com sucesso!`);
