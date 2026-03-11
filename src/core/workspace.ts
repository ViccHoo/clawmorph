import path from "node:path";
import os from "node:os";
import fs from "fs-extra";

import {
  OPENCLAW_FILE_NAMES,
  type OpenClawFileName,
  type OpenClawWorkspace,
  type OpenClawWorkspaceFile,
  type ResolvedWorkspaceTarget,
  type WorkspaceTargetOptions,
} from "../types/workspace";

const AGENT_PATH_CANDIDATES = [
  (cwd: string, agentName: string) => path.resolve(cwd, "agents", agentName),
  (cwd: string, agentName: string) => path.resolve(cwd, ".openclaw", "agents", agentName),
  (cwd: string, agentName: string) => path.resolve(cwd, "openclaw", "agents", agentName),
  (_cwd: string, agentName: string) => path.resolve(os.homedir(), ".openclaw", "workspace", "agents", agentName),
  (_cwd: string, agentName: string) => path.resolve(os.homedir(), ".openclaw", "workspace", agentName),
];

async function resolveDirectory(targetPath: string, label: string): Promise<string> {
  const resolvedPath = path.resolve(targetPath);
  const stats = await fs.stat(resolvedPath).catch(() => null);

  if (!stats) {
    throw new Error(`${label} "${targetPath}" was not found.`);
  }

  if (!stats.isDirectory()) {
    throw new Error(`${label} "${resolvedPath}" must be a directory.`);
  }

  return resolvedPath;
}

export async function resolveWorkspaceTarget(
  options: WorkspaceTargetOptions,
): Promise<ResolvedWorkspaceTarget> {
  const hasPath = Boolean(options.path?.trim());
  const hasAgent = Boolean(options.agent?.trim());

  if (hasPath === hasAgent) {
    throw new Error("Provide exactly one of --path or --agent.");
  }

  if (hasPath) {
    const rootPath = await resolveDirectory(options.path as string, "Workspace path");
    return {
      rootPath,
      resolution: "path",
    };
  }

  const agentName = (options.agent as string).trim();
  const cwd = process.cwd();
  const candidates = AGENT_PATH_CANDIDATES.map((buildPath) => buildPath(cwd, agentName));

  for (const candidate of candidates) {
    const stats = await fs.stat(candidate).catch(() => null);

    if (stats?.isDirectory()) {
      return {
        rootPath: candidate,
        resolution: "agent",
        agentName,
      };
    }
  }

  throw new Error(
    `Agent "${agentName}" was not found. Checked: ${candidates.join(", ")}`,
  );
}

export async function scanOpenClawWorkspace(
  target: ResolvedWorkspaceTarget,
): Promise<OpenClawWorkspace> {
  const files = await Promise.all(
    OPENCLAW_FILE_NAMES.map(async (fileName) => {
      const filePath = path.join(target.rootPath, fileName);
      const exists = await fs.pathExists(filePath);
      const content = exists ? await fs.readFile(filePath, "utf8") : "";

      return [
        fileName,
        {
          name: fileName,
          path: filePath,
          exists,
          content,
        } satisfies OpenClawWorkspaceFile,
      ] as const;
    }),
  );

  return {
    rootPath: target.rootPath,
    resolution: target.resolution,
    agentName: target.agentName,
    files: Object.fromEntries(files) as Record<OpenClawFileName, OpenClawWorkspaceFile>,
  };
}
