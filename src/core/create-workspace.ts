import os from "node:os";
import path from "node:path";
import fs from "fs-extra";

import type { ResolvedWorkspaceTarget } from "../types/workspace";
import type { OpenClawFileName } from "../types/workspace";

export interface CreateWorkspaceOptions {
  name: string;
  rootDir?: string;
}

export interface CreatedWorkspaceFile {
  fileName: OpenClawFileName;
  path: string;
  status: "create" | "reuse";
}

export interface CreatedWorkspace {
  target: ResolvedWorkspaceTarget;
  createdFiles: CreatedWorkspaceFile[];
  existedBefore: boolean;
}

export function getDefaultAgentsRoot(): string {
  return path.join(os.homedir(), ".openclaw", "workspace", "agents");
}

export function normalizeWorkspaceName(name: string): string {
  const trimmed = name.trim();

  if (!trimmed) {
    throw new Error("Workspace name is required.");
  }

  if (trimmed !== path.basename(trimmed) || trimmed.includes(path.sep)) {
    throw new Error(
      `Workspace name "${name}" must be a single directory name, not a path.`,
    );
  }

  if (!/^[a-zA-Z0-9._-]+$/u.test(trimmed)) {
    throw new Error(
      `Workspace name "${name}" may only contain letters, numbers, dot, underscore, or hyphen.`,
    );
  }

  return trimmed;
}

function buildIdentityContent(name: string): string {
  return [
    `# ${name}`,
    "",
    "This OpenClaw agent workspace was initialized by ClawMorph.",
    "",
    "You can now apply a role pack and refine the agent from here.",
    "",
  ].join("\n");
}

function buildMemoryContent(): string {
  return "# Memory\n\n";
}

export async function createWorkspace(
  options: CreateWorkspaceOptions,
): Promise<CreatedWorkspace> {
  const name = normalizeWorkspaceName(options.name);
  const rootDir = path.resolve(options.rootDir ?? getDefaultAgentsRoot());
  const rootPath = path.join(rootDir, name);
  const existedBefore = await fs.pathExists(rootPath);

  if (existedBefore) {
    const entries = await fs.readdir(rootPath);
    if (entries.length > 0) {
      throw new Error(
        `Workspace directory already exists and is not empty: ${rootPath}`,
      );
    }
  }

  await fs.ensureDir(rootPath);

  const filesToSeed: Array<{ fileName: OpenClawFileName; content: string }> = [
    { fileName: "IDENTITY.md", content: buildIdentityContent(name) },
    { fileName: "MEMORY.md", content: buildMemoryContent() },
  ];

  const createdFiles: CreatedWorkspaceFile[] = [];

  for (const file of filesToSeed) {
    const filePath = path.join(rootPath, file.fileName);
    const exists = await fs.pathExists(filePath);

    if (!exists) {
      await fs.outputFile(filePath, file.content, "utf8");
      createdFiles.push({
        fileName: file.fileName,
        path: filePath,
        status: "create",
      });
      continue;
    }

    createdFiles.push({
      fileName: file.fileName,
      path: filePath,
      status: "reuse",
    });
  }

  return {
    target: {
      rootPath,
      resolution: "path",
    },
    createdFiles,
    existedBefore,
  };
}
