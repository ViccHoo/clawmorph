#!/usr/bin/env node
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const projectRoot = process.cwd();
const fixture = path.join(projectRoot, 'test-fixtures', 'demo-agent');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clawmorph-demo-'));
fs.copySync(fixture, tmpDir, { overwrite: true });

function run(args) {
  const result = spawnSync('node', ['dist/cli.js', ...args], {
    cwd: projectRoot,
    stdio: 'inherit',
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log(`Using temp demo path: ${tmpDir}`);
run(['apply', '--path', tmpDir, '--role', 'researcher']);
run(['rollback', '--path', tmpDir]);
