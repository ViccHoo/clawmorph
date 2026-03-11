import path from "node:path";
import fs from "fs-extra";

import type { LoadedRolePack } from "../types/role-pack";
import type { OpenClawFileName, ResolvedWorkspaceTarget } from "../types/workspace";
import { buildPreviewPlan } from "./preview";
import { createSnapshot, type CreatedSnapshot } from "./snapshots";
import { scanOpenClawWorkspace } from "./workspace";

type ApplyChangeStatus = "create" | "update";

export interface AppliedFile {
  fileName: OpenClawFileName;
  status: ApplyChangeStatus;
  path: string;
}

export interface ApplyResult {
  rolePack: LoadedRolePack;
  target: ResolvedWorkspaceTarget;
  snapshot: CreatedSnapshot | null;
  filesChanged: AppliedFile[];
  memoryEntriesAppended: string[];
  createdCount: number;
  updatedCount: number;
}

export async function applyRolePack(
  rolePack: LoadedRolePack,
  target: ResolvedWorkspaceTarget,
): Promise<ApplyResult> {
  const workspace = await scanOpenClawWorkspace(target);
  const preview = buildPreviewPlan(rolePack, workspace);

  if (preview.filesToChange.length === 0) {
    return {
      rolePack,
      target,
      snapshot: null,
      filesChanged: [],
      memoryEntriesAppended: [],
      createdCount: 0,
      updatedCount: 0,
    };
  }

  const snapshot = await createSnapshot(preview);

  for (const file of preview.filesToChange) {
    await fs.outputFile(path.join(target.rootPath, file.fileName), file.nextContent, "utf8");
  }

  const filesChanged = preview.filesToChange.map((file) => {
    const status: ApplyChangeStatus = file.status === "create" ? "create" : "update";

    return {
      fileName: file.fileName,
      status,
      path: path.join(target.rootPath, file.fileName),
    } satisfies AppliedFile;
  });

  return {
    rolePack,
    target,
    snapshot,
    filesChanged,
    memoryEntriesAppended: preview.memoryEntriesToAppend,
    createdCount: filesChanged.filter((file) => file.status === "create").length,
    updatedCount: filesChanged.filter((file) => file.status === "update").length,
  };
}
