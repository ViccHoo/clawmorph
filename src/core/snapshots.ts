import path from "node:path";
import fs from "fs-extra";

import type { PreviewPlan } from "./preview";
import type { OpenClawFileName, ResolvedWorkspaceTarget } from "../types/workspace";

type SnapshotChangeStatus = "create" | "update";

export interface SnapshotChangedFile {
  fileName: OpenClawFileName;
  status: SnapshotChangeStatus;
  existedBefore: boolean;
  workspacePath: string;
  snapshotFile?: string;
}

export interface SnapshotMetadata {
  role: {
    id: string;
    name: string;
    version: string;
  };
  target: {
    rootPath: string;
    resolution: "path" | "agent";
    agentName?: string;
    snapshotKey: string;
  };
  timestamp: string;
  changedFiles: SnapshotChangedFile[];
  memoryEntriesAppended: string[];
}

export interface CreatedSnapshot {
  directory: string;
  metadataPath: string;
  metadata: SnapshotMetadata;
}

export interface RollbackResult {
  snapshotDirectory: string;
  metadataPath: string;
  restoredFiles: SnapshotChangedFile[];
  removedFiles: SnapshotChangedFile[];
}

function sanitizeSnapshotSegment(value: string): string {
  const sanitized = value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/gu, "-")
    .replace(/-+/gu, "-")
    .replace(/^-|-$/gu, "")
    .toLowerCase();

  if (sanitized.length > 0) {
    return sanitized.slice(0, 80);
  }

  return "workspace";
}

function createSnapshotKey(target: ResolvedWorkspaceTarget): string {
  if (target.resolution === "agent" && target.agentName) {
    return `agent-${sanitizeSnapshotSegment(target.agentName)}`;
  }

  return `path-${sanitizeSnapshotSegment(target.rootPath)}`;
}

function getSnapshotsRoot(target: ResolvedWorkspaceTarget): {
  root: string;
  snapshotKey: string;
} {
  const snapshotKey = createSnapshotKey(target);

  return {
    root: path.join(target.rootPath, ".clawmorph", "snapshots", snapshotKey),
    snapshotKey,
  };
}

function createTimestampDirectoryName(timestamp: string): string {
  return timestamp.replace(/[:.]/gu, "-");
}

async function removeIfEmpty(directory: string): Promise<void> {
  const entries = await fs.readdir(directory).catch(() => null);

  if (!entries || entries.length > 0) {
    return;
  }

  await fs.remove(directory);
}

export async function createSnapshot(preview: PreviewPlan): Promise<CreatedSnapshot> {
  const target = preview.workspace;
  const timestamp = new Date().toISOString();
  const { root, snapshotKey } = getSnapshotsRoot(target);
  const directory = path.join(root, createTimestampDirectoryName(timestamp));

  await fs.ensureDir(directory);

  const changedFiles: SnapshotChangedFile[] = [];

  for (const file of preview.filesToChange) {
    const workspacePath = path.join(target.rootPath, file.fileName);
    const status: SnapshotChangeStatus = file.status === "create" ? "create" : "update";
    let snapshotFile: string | undefined;

    if (file.exists) {
      snapshotFile = file.fileName;
      await fs.outputFile(path.join(directory, snapshotFile), file.currentContent, "utf8");
    }

    changedFiles.push({
      fileName: file.fileName,
      status,
      existedBefore: file.exists,
      workspacePath,
      snapshotFile,
    });
  }

  const metadata: SnapshotMetadata = {
    role: {
      id: preview.rolePack.id,
      name: preview.rolePack.name,
      version: preview.rolePack.version,
    },
    target: {
      rootPath: target.rootPath,
      resolution: target.resolution,
      agentName: target.agentName,
      snapshotKey,
    },
    timestamp,
    changedFiles,
    memoryEntriesAppended: preview.memoryEntriesToAppend,
  };

  const metadataPath = path.join(directory, "meta.json");
  await fs.writeJson(metadataPath, metadata, { spaces: 2 });

  return {
    directory,
    metadataPath,
    metadata,
  };
}

export async function findLatestSnapshot(
  target: ResolvedWorkspaceTarget,
): Promise<CreatedSnapshot | null> {
  const { root } = getSnapshotsRoot(target);
  const exists = await fs.pathExists(root);

  if (!exists) {
    return null;
  }

  const entries = await fs.readdir(root);
  const directories: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(root, entry);
    const stats = await fs.stat(entryPath).catch(() => null);

    if (stats?.isDirectory()) {
      directories.push(entry);
    }
  }

  const latestEntry = directories.sort((left, right) => right.localeCompare(left))[0];

  if (!latestEntry) {
    return null;
  }

  const directory = path.join(root, latestEntry);
  const metadataPath = path.join(directory, "meta.json");
  const metadata = await fs.readJson(metadataPath);

  return {
    directory,
    metadataPath,
    metadata: metadata as SnapshotMetadata,
  };
}

export async function rollbackSnapshot(
  target: ResolvedWorkspaceTarget,
): Promise<RollbackResult | null> {
  const snapshot = await findLatestSnapshot(target);

  if (!snapshot) {
    return null;
  }

  const restoredFiles: SnapshotChangedFile[] = [];
  const removedFiles: SnapshotChangedFile[] = [];

  for (const file of snapshot.metadata.changedFiles) {
    if (file.existedBefore && file.snapshotFile) {
      const content = await fs.readFile(path.join(snapshot.directory, file.snapshotFile), "utf8");
      await fs.outputFile(file.workspacePath, content, "utf8");
      restoredFiles.push(file);
      continue;
    }

    await fs.remove(file.workspacePath);
    removedFiles.push(file);
  }

  await fs.remove(snapshot.directory);

  const snapshotsRoot = getSnapshotsRoot(target).root;
  await removeIfEmpty(snapshotsRoot);
  await removeIfEmpty(path.dirname(snapshotsRoot));
  await removeIfEmpty(path.join(target.rootPath, ".clawmorph"));

  return {
    snapshotDirectory: snapshot.directory,
    metadataPath: snapshot.metadataPath,
    restoredFiles,
    removedFiles,
  };
}
