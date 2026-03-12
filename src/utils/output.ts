import type { LoadedRolePack } from "../types/role-pack";
import type { ResolvedWorkspaceTarget } from "../types/workspace";
import type { CreatedSnapshot } from "../core/snapshots";

export function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

export function serializeRolePack(rolePack: LoadedRolePack): Record<string, unknown> {
  return {
    id: rolePack.id,
    fileName: rolePack.fileName,
    filePath: rolePack.filePath,
    name: rolePack.name,
    version: rolePack.version,
    description: rolePack.description,
    role: rolePack.role,
    prompt: rolePack.prompt,
    instructions: rolePack.instructions,
    skills: rolePack.skills,
  };
}

export function serializeTarget(target: ResolvedWorkspaceTarget): Record<string, unknown> {
  return {
    rootPath: target.rootPath,
    resolution: target.resolution,
    agentName: target.agentName,
  };
}

export function serializeSnapshot(snapshot: CreatedSnapshot): Record<string, unknown> {
  return {
    id: snapshot.id,
    directory: snapshot.directory,
    metadataPath: snapshot.metadataPath,
    timestamp: snapshot.metadata.timestamp,
    role: snapshot.metadata.role,
    changedFiles: snapshot.metadata.changedFiles,
    memoryEntriesAppended: snapshot.metadata.memoryEntriesAppended,
  };
}
