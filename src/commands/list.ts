import { Command } from "commander";
import pc from "picocolors";

import { formatRolePackSummary, loadRolePacks, resolveRolePacksDir } from "../core/role-pack";

export function createListCommand(): Command {
  return new Command("list")
    .description("List available role packs")
    .option("-d, --dir <path>", "role packs directory")
    .action(async (options: { dir?: string }) => {
      const directory = await resolveRolePacksDir(options.dir);
      const packs = await loadRolePacks(options.dir);

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
