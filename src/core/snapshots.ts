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
  id: string;
  directory: string;
  metadataPath: string;
  metadata: SnapshotMetadata;
}

export interface RollbackResult {
  snapshotId: string;
  snapshotDirectory: string;
  metadataPath: string;
  restoredFiles: SnapshotChangedFile[];
  removedFiles: SnapshotChangedFile[];
  prunedSnapshotIds: string[];
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
  const id = createTimestampDirectoryName(timestamp);
  const directory = path.join(root, id);

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
    id,
    directory,
    metadataPath,
    metadata,
  };
}

export async function listSnapshots(
  target: ResolvedWorkspaceTarget,
): Promise<CreatedSnapshot[]> {
  const { root } = getSnapshotsRoot(target);
  const exists = await fs.pathExists(root);

  if (!exists) {
    return [];
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

  const sortedIds = directories.sort((left, right) => right.localeCompare(left));

  return Promise.all(
    sortedIds.map(async (id) => {
      const directory = path.join(root, id);
      const metadataPath = path.join(directory, "meta.json");
      const metadata = await fs.readJson(metadataPath);

      return {
        id,
        directory,
        metadataPath,
        metadata: metadata as SnapshotMetadata,
      } satisfies CreatedSnapshot;
    }),
  );
}

export async function findLatestSnapshot(
  target: ResolvedWorkspaceTarget,
): Promise<CreatedSnapshot | null> {
  const snapshots = await listSnapshots(target);
  return snapshots[0] ?? null;
}

export async function rollbackSnapshot(
  target: ResolvedWorkspaceTarget,
  snapshotId?: string,
): Promise<RollbackResult | null> {
  const snapshots = await listSnapshots(target);

  if (snapshots.length === 0) {
    return null;
  }

  const selectedIndex = snapshotId
    ? snapshots.findIndex((snapshot) => snapshot.id === snapshotId)
    : 0;

  if (selectedIndex === -1) {
    throw new Error(`Snapshot "${snapshotId}" was not found.`);
  }

  const snapshot = snapshots[selectedIndex];
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

  const prunedSnapshots = snapshots.slice(0, selectedIndex + 1);
  for (const item of prunedSnapshots) {
    await fs.remove(item.directory);
  }

  const snapshotsRoot = getSnapshotsRoot(target).root;
  await removeIfEmpty(snapshotsRoot);
  await removeIfEmpty(path.dirname(snapshotsRoot));
  await removeIfEmpty(path.join(target.rootPath, ".clawmorph"));

  return {
    snapshotId: snapshot.id,
    snapshotDirectory: snapshot.directory,
    metadataPath: snapshot.metadataPath,
    restoredFiles,
    removedFiles,
    prunedSnapshotIds: prunedSnapshots.map((item) => item.id),
  };
}
