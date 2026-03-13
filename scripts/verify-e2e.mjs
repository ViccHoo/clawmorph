#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';

const projectRoot = process.cwd();
const demoFixture = path.join(projectRoot, 'test-fixtures', 'demo-agent');
const managedFixture = path.join(projectRoot, 'test-fixtures', 'managed-agent');

function runRaw(args) {
  return spawnSync('node', ['dist/cli.js', ...args], {
    cwd: projectRoot,
    encoding: 'utf8',
  });
}

function run(args) {
  const result = runRaw(args);

  if (result.status !== 0) {
    process.stderr.write(result.stdout ?? '');
    process.stderr.write(result.stderr ?? '');
    throw new Error(`Command failed: node dist/cli.js ${args.join(' ')}`);
  }

  return result;
}

function withFixtureCopy(fixturePath, callback) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clawmorph-e2e-'));

  try {
    fs.copySync(fixturePath, tmpDir, { overwrite: true });
    callback(tmpDir);
  } finally {
    fs.removeSync(tmpDir);
  }
}

function withTempDir(callback) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clawmorph-e2e-root-'));

  try {
    callback(tmpDir);
  } finally {
    fs.removeSync(tmpDir);
  }
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

function verifyBasicApplyRollback() {
  withFixtureCopy(demoFixture, (tmpDir) => {
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
  });
}

function verifyIdempotentApply() {
  withFixtureCopy(demoFixture, (tmpDir) => {
    const firstApply = run(['apply', '--path', tmpDir, '--role', 'researcher']);
    const fingerprintAfterFirstApply = createWorkspaceFingerprint(tmpDir);
    const secondApply = run(['apply', '--path', tmpDir, '--role', 'researcher']);

    assert.match(firstApply.stdout, /Changed 4 file\(s\)/);
    assert.match(secondApply.stdout, /No changes were needed\./);
    assert.equal(
      createWorkspaceFingerprint(tmpDir),
      fingerprintAfterFirstApply,
      'Second apply should not mutate an already-morphed workspace.',
    );
  });
}

function verifyMultiRoleRollbackChain() {
  withFixtureCopy(demoFixture, (tmpDir) => {
    const originalFingerprint = createWorkspaceFingerprint(tmpDir);

    run(['apply', '--path', tmpDir, '--role', 'researcher']);
    const researcherFingerprint = createWorkspaceFingerprint(tmpDir);

    run(['apply', '--path', tmpDir, '--role', 'founder']);
    const founderFingerprint = createWorkspaceFingerprint(tmpDir);
    assert.notEqual(founderFingerprint, researcherFingerprint, 'Founder apply should change the workspace.');

    run(['rollback', '--path', tmpDir]);
    assert.equal(
      createWorkspaceFingerprint(tmpDir),
      researcherFingerprint,
      'First rollback should restore the previous role state.',
    );

    run(['rollback', '--path', tmpDir]);
    assert.equal(
      createWorkspaceFingerprint(tmpDir),
      originalFingerprint,
      'Second rollback should restore the original workspace state.',
    );
  });
}

function verifyManagedSectionsUpdate() {
  withFixtureCopy(managedFixture, (tmpDir) => {
    const applyResult = run(['apply', '--path', tmpDir, '--role', 'founder']);
    const identity = fs.readFileSync(path.join(tmpDir, 'IDENTITY.md'), 'utf8');
    const soul = fs.readFileSync(path.join(tmpDir, 'SOUL.md'), 'utf8');
    const tools = fs.readFileSync(path.join(tmpDir, 'TOOLS.md'), 'utf8');
    const memory = fs.readFileSync(path.join(tmpDir, 'MEMORY.md'), 'utf8');

    assert.match(applyResult.stdout, /Applied founder/);
    assert.match(identity, /Name: founder/);
    assert.match(soul, /You are the Founder role pack/);
    assert.match(tools, /strategy-memo/);
    assert.match(memory, /Tie decisions to market, revenue, or adoption signals\./);
    assert.match(memory, /Flag assumptions that need rapid validation\./);
    assert.equal(
      (identity.match(/clawmorph:identity:start/g) ?? []).length,
      1,
      'Identity marker should be updated in place without duplication.',
    );
    assert.match(identity, /Persistent identity notes stay above the managed section\./);
    assert.match(soul, /Human-authored soul preface\./);
    assert.match(tools, /Manual tools note before generated skills\./);
  });
}

function verifyJsonOutputs() {
  const listResult = JSON.parse(run(['list', '--json']).stdout);
  assert.equal(listResult.packs.length, 5, 'Expected built-in role packs in list JSON output.');

  withFixtureCopy(demoFixture, (tmpDir) => {
    const previewResult = JSON.parse(
      run(['preview', '--path', tmpDir, '--role', 'researcher', '--json']).stdout,
    );
    assert.equal(previewResult.riskLevel, 'medium');
    assert.equal(previewResult.filesToChange.length, 4);

    const applyResult = JSON.parse(
      run(['apply', '--path', tmpDir, '--role', 'researcher', '--json']).stdout,
    );
    assert.equal(applyResult.createdCount, 2);
    assert.equal(applyResult.updatedCount, 2);
    assert.ok(applyResult.snapshot?.id, 'Expected snapshot metadata in apply JSON output.');

    const rollbackResult = JSON.parse(run(['rollback', '--path', tmpDir, '--json']).stdout);
    assert.equal(rollbackResult.found, true);
    assert.equal(Array.isArray(rollbackResult.prunedSnapshotIds), true);
  });
}

function verifySnapshotsCommandAndSpecificRollback() {
  withFixtureCopy(demoFixture, (tmpDir) => {
    const originalFingerprint = createWorkspaceFingerprint(tmpDir);

    run(['apply', '--path', tmpDir, '--role', 'researcher']);
    run(['apply', '--path', tmpDir, '--role', 'founder']);

    const snapshots = JSON.parse(run(['snapshots', '--path', tmpDir, '--json']).stdout);
    assert.equal(snapshots.snapshots.length, 2, 'Expected two snapshots after two applies.');

    const oldestSnapshot = snapshots.snapshots[snapshots.snapshots.length - 1];
    const rollbackResult = JSON.parse(
      run(['rollback', '--path', tmpDir, '--snapshot', oldestSnapshot.id, '--json']).stdout,
    );

    assert.equal(rollbackResult.snapshotId, oldestSnapshot.id);
    assert.equal(
      createWorkspaceFingerprint(tmpDir),
      originalFingerprint,
      'Rollback to a specific older snapshot should restore the original state.',
    );

    const remainingSnapshots = JSON.parse(run(['snapshots', '--path', tmpDir, '--json']).stdout);
    assert.equal(
      remainingSnapshots.snapshots.length,
      0,
      'Rollback to an older snapshot should prune that snapshot and newer ones.',
    );
  });
}

function verifyNewWorkspaceCommand() {
  withTempDir((rootDir) => {
    const result = JSON.parse(
      run(['new', 'alpha-agent', '--role', 'researcher', '--root', rootDir, '--json']).stdout,
    );
    const workspacePath = path.join(rootDir, 'alpha-agent');

    assert.equal(result.target.rootPath, workspacePath);
    assert.equal(fs.pathExistsSync(path.join(workspacePath, 'IDENTITY.md')), true);
    assert.equal(fs.pathExistsSync(path.join(workspacePath, 'SOUL.md')), true);
    assert.equal(fs.pathExistsSync(path.join(workspacePath, 'TOOLS.md')), true);
    assert.equal(fs.pathExistsSync(path.join(workspacePath, 'MEMORY.md')), true);
    assert.match(
      fs.readFileSync(path.join(workspacePath, 'IDENTITY.md'), 'utf8'),
      /Name: researcher/,
    );
    assert.ok(result.snapshot?.id, 'Expected snapshot for a newly created workspace.');

    const duplicateAttempt = runRaw(['new', 'alpha-agent', '--role', 'founder', '--root', rootDir]);

    assert.notEqual(duplicateAttempt.status, 0, 'Creating the same workspace twice should fail.');
    assert.match(
      `${duplicateAttempt.stdout}
${duplicateAttempt.stderr}`,
      /Workspace directory already exists and is not empty/,
      'Creating the same workspace twice should fail safely.',
    );
  });
}

verifyBasicApplyRollback();
verifyIdempotentApply();
verifyMultiRoleRollbackChain();
verifyManagedSectionsUpdate();
verifyJsonOutputs();
verifySnapshotsCommandAndSpecificRollback();
verifyNewWorkspaceCommand();
console.log('All E2E verification scenarios passed.');
