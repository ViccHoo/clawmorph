import { Command } from "commander";
import pc from "picocolors";

import { buildPreviewPlan } from "../core/preview";
import { loadRolePackByName } from "../core/role-pack";
import { resolveWorkspaceTarget, scanOpenClawWorkspace } from "../core/workspace";

type PreviewOptions = {
  role: string;
  path?: string;
  agent?: string;
  dir?: string;
};

function colorizeDiffLine(line: string): string {
  if (line.startsWith("+ ")) {
    return pc.green(line);
  }

  if (line.startsWith("- ")) {
    return pc.red(line);
  }

  return pc.dim(line);
}

function formatStatus(status: "create" | "update" | "unchanged"): string {
  if (status === "create") {
    return pc.green(status);
  }

  if (status === "update") {
    return pc.yellow(status);
  }

  return pc.dim(status);
}

function formatRiskLevel(riskLevel: "low" | "medium" | "high"): string {
  if (riskLevel === "high") {
    return pc.red(riskLevel);
  }

  if (riskLevel === "medium") {
    return pc.yellow(riskLevel);
  }

  return pc.green(riskLevel);
}

export function createPreviewCommand(): Command {
  return new Command("preview")
    .description("Preview role-pack changes for an OpenClaw workspace")
    .option("-p, --path <path>", "explicit agent/workspace path")
    .option("-a, --agent <name>", "agent name under common workspace paths")
    .requiredOption("-r, --role <name>", "role pack name")
    .option("-d, --dir <path>", "role packs directory")
    .action(async (options: PreviewOptions) => {
      const pack = await loadRolePackByName(options.role, options.dir);
      const target = await resolveWorkspaceTarget({
        path: options.path,
        agent: options.agent,
      });
      const workspace = await scanOpenClawWorkspace(target);
      const preview = buildPreviewPlan(pack, workspace);

      console.log(pc.bold(`Previewing ${pack.name}`));
      console.log(
        pc.dim(
          `${workspace.rootPath} · ${
            workspace.resolution === "agent"
              ? `resolved from --agent ${workspace.agentName}`
              : "resolved from --path"
          }`,
        ),
      );
      console.log();

      console.log(pc.bold("Target role pack"));
      console.log(`- ${pc.cyan(`${pack.name} v${pack.version}`)}`);
      console.log(`- ${pack.role}${pack.description ? ` — ${pack.description}` : ""}`);
      console.log(
        `- Suggested skills: ${
          preview.suggestedSkills.length > 0
            ? preview.suggestedSkills.join(", ")
            : pc.dim("none")
        }`,
      );
      console.log();

      console.log(pc.bold("Files that would change"));
      if (preview.filesToChange.length === 0) {
        console.log(pc.dim("- none"));
      } else {
        for (const file of preview.filesToChange) {
          console.log(`- ${formatStatus(file.status)} ${file.fileName}`);

          for (const line of file.previewLines) {
            console.log(`  ${colorizeDiffLine(line)}`);
          }
        }
      }
      console.log();

      console.log(pc.bold("Missing files"));
      if (preview.missingFiles.length === 0) {
        console.log(pc.dim("- none"));
      } else {
        for (const fileName of preview.missingFiles) {
          console.log(`- ${pc.yellow(fileName)}`);
        }
      }
      console.log();

      console.log(pc.bold("Memory entries that would be appended"));
      if (preview.memoryEntriesToAppend.length === 0) {
        console.log(pc.dim("- none"));
      } else {
        for (const entry of preview.memoryEntriesToAppend) {
          console.log(`- ${entry}`);
        }
      }
      console.log();

      console.log(pc.bold("Risk level"));
      console.log(`- ${formatRiskLevel(preview.riskLevel)}`);
    });
}
