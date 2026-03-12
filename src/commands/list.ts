import { Command } from "commander";
import pc from "picocolors";

import { formatRolePackSummary, loadRolePacks, resolveRolePacksDir } from "../core/role-pack";
import { printJson, serializeRolePack } from "../utils/output";

export function createListCommand(): Command {
  return new Command("list")
    .description("List available role packs")
    .option("-d, --dir <path>", "role packs directory")
    .option("--json", "output machine-readable JSON")
    .action(async (options: { dir?: string; json?: boolean }) => {
      const directory = await resolveRolePacksDir(options.dir);
      const packs = await loadRolePacks(options.dir);

      if (options.json) {
        printJson({
          directory,
          packs: packs.map((pack) => serializeRolePack(pack)),
        });
        return;
      }

      if (packs.length === 0) {
        console.log(pc.yellow(`No role packs found in ${directory}`));
        return;
      }

      console.log(pc.bold(`Role packs in ${directory}`));

      for (const pack of packs) {
        console.log(`- ${pc.cyan(formatRolePackSummary(pack))}`);
      }
    });
}
