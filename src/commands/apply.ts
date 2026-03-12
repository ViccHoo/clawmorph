import { Command } from "commander";
import pc from "picocolors";

import { applyRolePack } from "../core/apply";
import { loadRolePackByName } from "../core/role-pack";
import { resolveWorkspaceTarget } from "../core/workspace";
import { printJson, serializeRolePack, serializeTarget, serializeSnapshot } from "../utils/output";

type ApplyOptions = {
  role: string;
  path?: string;
  agent?: string;
  dir?: string;
  json?: boolean;
};

export function createApplyCommand(): Command {
  return new Command("apply")
    .description("Apply a role pack to an OpenClaw workspace")
    .option("-p, --path <path>", "explicit agent/workspace path")
    .option("-a, --agent <name>", "agent name under common workspace paths")
    .requiredOption("-r, --role <name>", "role pack name")
    .option("-d, --dir <path>", "role packs directory")
    .option("--json", "output machine-readable JSON")
    .action(async (options: ApplyOptions) => {
      const pack = await loadRolePackByName(options.role, options.dir);
      const target = await resolveWorkspaceTarget({
        path: options.path,
        agent: options.agent,
      });
      const result = await applyRolePack(pack, target);

      if (options.json) {
        printJson({
          rolePack: serializeRolePack(pack),
          target: serializeTarget(target),
          snapshot: result.snapshot ? serializeSnapshot(result.snapshot) : null,
          filesChanged: result.filesChanged,
          memoryEntriesAppended: result.memoryEntriesAppended,
          createdCount: result.createdCount,
          updatedCount: result.updatedCount,
        });
        return;
      }

      console.log(pc.bold(`Applied ${pack.name}`));
      console.log(
        pc.dim(
          `${target.rootPath} · ${
            target.resolution === "agent"
              ? `resolved from --agent ${target.agentName}`
              : "resolved from --path"
          }`,
        ),
      );
      console.log();

      if (result.filesChanged.length === 0) {
        console.log(pc.dim("No changes were needed."));
        return;
      }

      console.log(
        `Changed ${pc.bold(String(result.filesChanged.length))} file(s) ` +
          `(${pc.green(String(result.createdCount))} created, ` +
          `${pc.yellow(String(result.updatedCount))} updated)`,
      );

      if (result.snapshot) {
        console.log(`Snapshot: ${pc.cyan(result.snapshot.directory)}`);
      }

      console.log();
      console.log(pc.bold("Changed files"));
      for (const file of result.filesChanged) {
        const statusColor = file.status === "create" ? pc.green : pc.yellow;
        console.log(`- ${statusColor(file.status)} ${file.fileName}`);
      }

      console.log();
      console.log(pc.bold("Memory entries appended"));
      if (result.memoryEntriesAppended.length === 0) {
        console.log(pc.dim("- none"));
      } else {
        for (const entry of result.memoryEntriesAppended) {
          console.log(`- ${entry}`);
        }
      }
    });
}
