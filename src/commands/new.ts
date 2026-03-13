import { Command } from "commander";
import pc from "picocolors";

import { applyRolePack } from "../core/apply";
import { createWorkspace, getDefaultAgentsRoot } from "../core/create-workspace";
import { loadRolePackByName } from "../core/role-pack";
import { printJson, serializeRolePack, serializeSnapshot, serializeTarget } from "../utils/output";

type NewOptions = {
  role: string;
  root?: string;
  dir?: string;
  json?: boolean;
};

export function createNewCommand(): Command {
  return new Command("new")
    .description("Create a new OpenClaw agent workspace and apply a role pack")
    .argument("<name>", "new workspace / agent directory name")
    .requiredOption("-r, --role <name>", "role pack name")
    .option(
      "--root <path>",
      `root directory for new workspaces (default: ${getDefaultAgentsRoot()})`,
    )
    .option("-d, --dir <path>", "role packs directory")
    .option("--json", "output machine-readable JSON")
    .action(async (name: string, options: NewOptions) => {
      const workspace = await createWorkspace({
        name,
        rootDir: options.root,
      });
      const pack = await loadRolePackByName(options.role, options.dir);
      const result = await applyRolePack(pack, workspace.target);

      if (options.json) {
        printJson({
          name,
          rolePack: serializeRolePack(pack),
          target: serializeTarget(workspace.target),
          createdWorkspaceFiles: workspace.createdFiles,
          snapshot: result.snapshot ? serializeSnapshot(result.snapshot) : null,
          filesChanged: result.filesChanged,
          memoryEntriesAppended: result.memoryEntriesAppended,
          createdCount: result.createdCount,
          updatedCount: result.updatedCount,
        });
        return;
      }

      console.log(pc.bold(`Created ${name}`));
      console.log(pc.dim(`${workspace.target.rootPath} · initialized new workspace`));
      console.log();

      console.log(pc.bold("Seed files"));
      for (const file of workspace.createdFiles) {
        const color = file.status === "create" ? pc.green : pc.dim;
        console.log(`- ${color(file.status)} ${file.fileName}`);
      }

      console.log();
      console.log(pc.bold("Applied role pack"));
      console.log(`- ${pc.cyan(`${pack.name} v${pack.version}`)}`);
      console.log(`- ${pack.role}${pack.description ? ` — ${pack.description}` : ""}`);

      if (result.snapshot) {
        console.log(`- Snapshot: ${pc.cyan(result.snapshot.directory)}`);
      }

      console.log();
      console.log(pc.bold("Workspace files changed"));
      for (const file of result.filesChanged) {
        const statusColor = file.status === "create" ? pc.green : pc.yellow;
        console.log(`- ${statusColor(file.status)} ${file.fileName}`);
      }

      console.log();
      console.log(pc.bold("Next steps"));
      console.log(`- Preview another role: clawmorph preview --path ${workspace.target.rootPath} --role founder`);
      console.log(`- List snapshots: clawmorph snapshots --path ${workspace.target.rootPath}`);
      console.log(`- Roll back: clawmorph rollback --path ${workspace.target.rootPath}`);
    });
}
