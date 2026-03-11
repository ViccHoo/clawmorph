#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';

const projectRoot = process.cwd();
const fixture = path.join(projectRoot, 'test-fixtures', 'demo-agent');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clawmorph-e2e-'));

function run(args) {
  const result = spawnSync('node', ['dist/cli.js', ...args], {
    cwd: projectRoot,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    process.stderr.write(result.stdout ?? '');
    process.stderr.write(result.stderr ?? '');
    throw new Error(`Command failed: node dist/cli.js ${args.join(' ')}`);
  }

  return result;
}

function collectFiles(rootDir, currentDir = rootDir) {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name));
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(currentDir, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectFiles(rootDir, entryPath));
      continue;
    }

    if (entry.isFile()) {
      files.push(path.relative(rootDir, entryPath));
    }
  }

  return files;
}

function createWorkspaceFingerprint(rootDir) {
  const hash = crypto.createHash('sha256');
  const files = collectFiles(rootDir);

  for (const relativePath of files) {
    hash.update(relativePath);
    hash.update('\0');
    hash.update(fs.readFileSync(path.join(rootDir, relativePath)));
    hash.update('\0');
  }

  return hash.digest('hex');
}

try {
  fs.copySync(fixture, tmpDir, { overwrite: true });

  const beforeFingerprint = createWorkspaceFingerprint(tmpDir);
  const applyResult = run(['apply', '--path', tmpDir, '--role', 'researcher']);

  assert.match(applyResult.stdout, /Applied researcher/);
  assert.ok(
    fs.pathExistsSync(path.join(tmpDir, '.clawmorph', 'snapshots')),
    'Expected snapshot directory after apply.',
  );
  assert.ok(fs.pathExistsSync(path.join(tmpDir, 'SOUL.md')), 'Expected SOUL.md to be created.');
  assert.ok(fs.pathExistsSync(path.join(tmpDir, 'TOOLS.md')), 'Expected TOOLS.md to be created.');

  const rollbackResult = run(['rollback', '--path', tmpDir]);
  assert.match(rollbackResult.stdout, /Rollback complete/);
  assert.equal(
    createWorkspaceFingerprint(tmpDir),
    beforeFingerprint,
    'Workspace contents should match the original fixture after rollback.',
  );
  assert.equal(
    fs.pathExistsSync(path.join(tmpDir, '.clawmorph')),
    false,
    'Expected .clawmorph to be cleaned up after rollback.',
  );

  console.log(`E2E verification passed for ${tmpDir}`);
} finally {
  fs.removeSync(tmpDir);
}
