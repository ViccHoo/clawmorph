import { Command } from "commander";
import pc from "picocolors";

import { listSnapshots } from "../core/snapshots";
import { resolveWorkspaceTarget } from "../core/workspace";
import { printJson, serializeSnapshot, serializeTarget } from "../utils/output";

type SnapshotsOptions = {
  path?: string;
  agent?: string;
  json?: boolean;
};

export function createSnapshotsCommand(): Command {
  return new Command("snapshots")
    .description("List snapshots for an OpenClaw workspace")
    .option("-p, --path <path>", "explicit agent/workspace path")
    .option("-a, --agent <name>", "agent name under common workspace paths")
    .option("--json", "output machine-readable JSON")
    .action(async (options: SnapshotsOptions) => {
      const target = await resolveWorkspaceTarget({
        path: options.path,
        agent: options.agent,
      });
      const snapshots = await listSnapshots(target);

      if (options.json) {
        printJson({
          target: serializeTarget(target),
          snapshots: snapshots.map((snapshot) => serializeSnapshot(snapshot)),
        });
        return;
      }

      console.log(pc.bold("Snapshots"));
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

      if (snapshots.length === 0) {
        console.log(pc.dim("No snapshots were found for this workspace."));
        return;
      }

      for (const snapshot of snapshots) {
        console.log(
          `- ${pc.cyan(snapshot.id)} · ${snapshot.metadata.role.name} v${snapshot.metadata.role.version}`,
        );
        console.log(
          pc.dim(
            `  ${snapshot.metadata.timestamp} · ${snapshot.metadata.changedFiles.length} changed file(s)`,
          ),
        );
      }
    });
}
