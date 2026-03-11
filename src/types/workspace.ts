export const OPENCLAW_FILE_NAMES = [
  "IDENTITY.md",
  "SOUL.md",
  "TOOLS.md",
  "MEMORY.md",
] as const;

export type OpenClawFileName = (typeof OPENCLAW_FILE_NAMES)[number];

export interface WorkspaceTargetOptions {
  path?: string;
  agent?: string;
}

export interface ResolvedWorkspaceTarget {
  rootPath: string;
  resolution: "path" | "agent";
  agentName?: string;
}

export interface OpenClawWorkspaceFile {
  name: OpenClawFileName;
  path: string;
  exists: boolean;
  content: string;
}

export interface OpenClawWorkspace {
  rootPath: string;
  resolution: "path" | "agent";
  agentName?: string;
  files: Record<OpenClawFileName, OpenClawWorkspaceFile>;
}
