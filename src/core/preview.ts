import { diffLines } from "diff";

import type { LoadedRolePack } from "../types/role-pack";
import {
  OPENCLAW_FILE_NAMES,
  type OpenClawFileName,
  type OpenClawWorkspace,
} from "../types/workspace";

type FileChangeStatus = "create" | "update" | "unchanged";
type RiskLevel = "low" | "medium" | "high";

export interface PreviewFileChange {
  fileName: OpenClawFileName;
  status: FileChangeStatus;
  exists: boolean;
  currentContent: string;
  nextContent: string;
  previewLines: string[];
}

export interface PreviewPlan {
  rolePack: LoadedRolePack;
  workspace: OpenClawWorkspace;
  filesToChange: PreviewFileChange[];
  missingFiles: OpenClawFileName[];
  memoryEntriesToAppend: string[];
  suggestedSkills: string[];
  riskLevel: RiskLevel;
}

const PREVIEW_LINE_LIMIT = 8;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function ensureTrailingNewline(content: string): string {
  if (content.length === 0) {
    return "";
  }

  return content.endsWith("\n") ? content : `${content}\n`;
}

function appendBlock(currentContent: string, block: string): string {
  const trimmed = currentContent.trimEnd();

  if (trimmed.length === 0) {
    return `${block}\n`;
  }

  return `${trimmed}\n\n${block}\n`;
}

function upsertSection(currentContent: string, sectionId: string, body: string): string {
  const startMarker = `<!-- clawmorph:${sectionId}:start -->`;
  const endMarker = `<!-- clawmorph:${sectionId}:end -->`;
  const block = `${startMarker}\n${body}\n${endMarker}`;
  const pattern = new RegExp(
    `${escapeRegExp(startMarker)}[\\s\\S]*?${escapeRegExp(endMarker)}`,
    "u",
  );

  if (pattern.test(currentContent)) {
    return ensureTrailingNewline(currentContent.replace(pattern, block).trimEnd());
  }

  return appendBlock(currentContent, block);
}

function buildIdentitySection(rolePack: LoadedRolePack): string {
  return [
    "## Active Role Pack",
    "",
    `- Name: ${rolePack.name}`,
    `- Role: ${rolePack.role}`,
    `- Version: ${rolePack.version}`,
    rolePack.description ? `- Description: ${rolePack.description}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildSoulSection(rolePack: LoadedRolePack): string {
  return [
    "## Active Role Prompt",
    "",
    rolePack.prompt.trim(),
    "",
    "### Working Rules",
    ...rolePack.instructions.map((instruction) => `- ${instruction}`),
  ].join("\n");
}

function buildToolsSection(rolePack: LoadedRolePack): string {
  return [
    "## Suggested Skills",
    "",
    ...rolePack.skills.map((skill) => `- ${skill}`),
  ].join("\n");
}

function normalizeMemoryLine(value: string): string {
  return value
    .trim()
    .replace(/^[-*]\s+/u, "")
    .toLowerCase();
}

function buildMemoryContent(
  currentContent: string,
  entries: string[],
): { nextContent: string; entriesToAppend: string[] } {
  const existingEntries = new Set(
    currentContent
      .split(/\r?\n/u)
      .map((line) => normalizeMemoryLine(line))
      .filter(Boolean),
  );

  const entriesToAppend = entries.filter((entry) => {
    const normalized = normalizeMemoryLine(entry);
    return normalized.length > 0 && !existingEntries.has(normalized);
  });

  if (entriesToAppend.length === 0) {
    return {
      nextContent: currentContent,
      entriesToAppend: [],
    };
  }

  const bulletLines = entriesToAppend.map((entry) => `- ${entry}`).join("\n");

  if (currentContent.trim().length === 0) {
    return {
      nextContent: `# Memory\n\n${bulletLines}\n`,
      entriesToAppend,
    };
  }

  return {
    nextContent: `${currentContent.trimEnd()}\n\n${bulletLines}\n`,
    entriesToAppend,
  };
}

function getFileStatus(exists: boolean, currentContent: string, nextContent: string): FileChangeStatus {
  if (currentContent === nextContent) {
    return "unchanged";
  }

  return exists ? "update" : "create";
}

function summarizeDiff(currentContent: string, nextContent: string): string[] {
  const lines: string[] = [];

  for (const part of diffLines(currentContent, nextContent)) {
    if (!part.added && !part.removed) {
      continue;
    }

    const prefix = part.added ? "+ " : "- ";
    const chunkLines = part.value
      .split("\n")
      .map((line) => line.trimEnd())
      .filter(Boolean)
      .filter((line) => !line.includes("<!-- clawmorph:"))
      .map((line) => `${prefix}${line}`);

    lines.push(...chunkLines);
  }

  if (lines.length === 0 && currentContent !== nextContent) {
    return ["+ (formatting update)"];
  }

  if (lines.length <= PREVIEW_LINE_LIMIT) {
    return lines;
  }

  return [
    ...lines.slice(0, PREVIEW_LINE_LIMIT),
    `... ${lines.length - PREVIEW_LINE_LIMIT} more change lines`,
  ];
}

function determineRiskLevel(
  filesToChangeCount: number,
  missingFilesCount: number,
): RiskLevel {
  if (missingFilesCount >= 3) {
    return "high";
  }

  if (missingFilesCount > 0 || filesToChangeCount > 1) {
    return "medium";
  }

  return "low";
}

export function buildPreviewPlan(
  rolePack: LoadedRolePack,
  workspace: OpenClawWorkspace,
): PreviewPlan {
  const memoryPlan = buildMemoryContent(workspace.files["MEMORY.md"].content, rolePack.instructions);

  const desiredContent: Record<OpenClawFileName, string> = {
    "IDENTITY.md": upsertSection(
      workspace.files["IDENTITY.md"].content,
      "identity",
      buildIdentitySection(rolePack),
    ),
    "SOUL.md": upsertSection(
      workspace.files["SOUL.md"].content,
      "soul",
      buildSoulSection(rolePack),
    ),
    "TOOLS.md":
      rolePack.skills.length > 0
        ? upsertSection(
            workspace.files["TOOLS.md"].content,
            "tools",
            buildToolsSection(rolePack),
          )
        : workspace.files["TOOLS.md"].content,
    "MEMORY.md": memoryPlan.nextContent,
  };

  const filesToChange = OPENCLAW_FILE_NAMES.map((fileName) => {
    const file = workspace.files[fileName];
    const nextContent = desiredContent[fileName];
    const status = getFileStatus(file.exists, file.content, nextContent);

    return {
      fileName,
      status,
      exists: file.exists,
      currentContent: file.content,
      nextContent,
      previewLines: summarizeDiff(file.content, nextContent),
    } satisfies PreviewFileChange;
  }).filter((file) => file.status !== "unchanged");

  const missingFiles = OPENCLAW_FILE_NAMES.filter((fileName) => !workspace.files[fileName].exists);

  return {
    rolePack,
    workspace,
    filesToChange,
    missingFiles,
    memoryEntriesToAppend: memoryPlan.entriesToAppend,
    suggestedSkills: rolePack.skills,
    riskLevel: determineRiskLevel(filesToChange.length, missingFiles.length),
  };
}
