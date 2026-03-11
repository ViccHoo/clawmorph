import path from "node:path";
import fs from "fs-extra";
import YAML from "yaml";

import type { LoadedRolePack, RolePack } from "../types/role-pack";

const ROLE_PACK_EXTENSIONS = new Set([".yaml", ".yml"]);

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function normalizeRolePack(input: unknown, filePath: string): RolePack {
  if (!input || typeof input !== "object") {
    throw new Error(`Invalid role pack in ${filePath}: expected a YAML object.`);
  }

  const record = input as Record<string, unknown>;
  const name = typeof record.name === "string" ? record.name.trim() : "";
  const description =
    typeof record.description === "string" ? record.description.trim() : "";
  const role = typeof record.role === "string" ? record.role.trim() : "";
  const prompt = typeof record.prompt === "string" ? record.prompt.trim() : "";
  const version =
    typeof record.version === "string" && record.version.trim().length > 0
      ? record.version.trim()
      : "0.1.0";
  const instructions = isStringArray(record.instructions)
    ? record.instructions.map((item) => item.trim()).filter(Boolean)
    : [];
  const skills = isStringArray(record.skills)
    ? record.skills.map((item) => item.trim()).filter(Boolean)
    : [];

  if (!name) {
    throw new Error(`Invalid role pack in ${filePath}: missing "name".`);
  }

  if (!role) {
    throw new Error(`Invalid role pack in ${filePath}: missing "role".`);
  }

  return {
    name,
    version,
    description,
    role,
    prompt,
    instructions,
    skills,
  };
}

export async function resolveRolePacksDir(explicitDir?: string): Promise<string> {
  if (explicitDir) {
    return path.resolve(explicitDir);
  }

  const candidates = [
    path.resolve(process.cwd(), "role-packs"),
    path.resolve(__dirname, "..", "..", "role-packs"),
  ];

  for (const candidate of candidates) {
    if (await fs.pathExists(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
}

export async function loadRolePacks(explicitDir?: string): Promise<LoadedRolePack[]> {
  const directory = await resolveRolePacksDir(explicitDir);

  if (!(await fs.pathExists(directory))) {
    return [];
  }

  const entries = await fs.readdir(directory);
  const files = entries
    .filter((entry) => ROLE_PACK_EXTENSIONS.has(path.extname(entry).toLowerCase()))
    .sort((left, right) => left.localeCompare(right));

  const packs = await Promise.all(
    files.map(async (fileName) => {
      const filePath = path.join(directory, fileName);
      const raw = await fs.readFile(filePath, "utf8");
      const parsed = normalizeRolePack(YAML.parse(raw), filePath);
      const id = path.basename(fileName, path.extname(fileName));

      return {
        ...parsed,
        id,
        fileName,
        filePath,
        raw,
      } satisfies LoadedRolePack;
    }),
  );

  return packs.sort((left, right) => left.name.localeCompare(right.name));
}

export async function loadRolePackByName(
  name: string,
  explicitDir?: string,
): Promise<LoadedRolePack> {
  const normalizedName = name.trim().toLowerCase();
  const packs = await loadRolePacks(explicitDir);
  const match = packs.find(
    (pack) =>
      pack.id.toLowerCase() === normalizedName ||
      pack.name.toLowerCase() === normalizedName,
  );

  if (!match) {
    throw new Error(`Role pack "${name}" was not found.`);
  }

  return match;
}

export function formatRolePackSummary(pack: LoadedRolePack): string {
  const version = pack.version ? ` v${pack.version}` : "";
  const description = pack.description ? ` — ${pack.description}` : "";
  return `${pack.name}${version}${description}`;
}
