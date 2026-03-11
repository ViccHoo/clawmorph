import { Command } from "commander";
import pc from "picocolors";

import { rollbackSnapshot } from "../core/snapshots";
import { resolveWorkspaceTarget } from "../core/workspace";

type RollbackOptions = {
  path?: string;
  agent?: string;
};

export function createRollbackCommand(): Command {
  return new Command("rollback")
    .description("Rollback the most recent role-pack change for a workspace")
    .option("-p, --path <path>", "explicit agent/workspace path")
    .option("-a, --agent <name>", "agent name under common workspace paths")
    .action(async (options: RollbackOptions) => {
      const target = await resolveWorkspaceTarget({
        path: options.path,
        agent: options.agent,
      });
      const result = await rollbackSnapshot(target);

      if (!result) {
        console.log(pc.bold("Rollback"));
        console.log(pc.dim("No snapshots were found for this workspace."));
        return;
      }

      console.log(pc.bold("Rollback complete"));
      console.log(
        pc.dim(
          `${target.rootPath} · ${
            target.resolution === "agent"
              ? `resolved from --agent ${target.agentName}`
              : "resolved from --path"
          }`,
        ),
      );
      console.log(pc.dim(`Snapshot: ${result.snapshotDirectory}`));
      console.log(
        `Restored ${pc.bold(String(result.restoredFiles.length))} file(s), ` +
          `removed ${pc.bold(String(result.removedFiles.length))} file(s)`,
      );

      if (result.restoredFiles.length > 0) {
        console.log();
        console.log(pc.bold("Restored files"));
        for (const file of result.restoredFiles) {
          console.log(`- ${pc.green(file.fileName)}`);
        }
      }

      if (result.removedFiles.length > 0) {
        console.log();
        console.log(pc.bold("Removed files"));
        for (const file of result.removedFiles) {
          console.log(`- ${pc.yellow(file.fileName)}`);
        }
      }
    });
}
