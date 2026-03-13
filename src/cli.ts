#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { Command } from "commander";
import pc from "picocolors";

import { createApplyCommand } from "./commands/apply";
import { createNewCommand } from "./commands/new";
import { createListCommand } from "./commands/list";
import { createPreviewCommand } from "./commands/preview";
import { createRollbackCommand } from "./commands/rollback";
import { createSnapshotsCommand } from "./commands/snapshots";

function getPackageVersion(): string {
  const packageJsonPath = path.resolve(__dirname, "..", "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as {
    version?: string;
  };

  return packageJson.version ?? "0.0.0";
}

async function main(): Promise<void> {
  const program = new Command();

  program
    .name("clawmorph")
    .description("CLI for browsing and applying OpenClaw role packs")
    .version(getPackageVersion())
    .showHelpAfterError();

  program.addCommand(createListCommand());
  program.addCommand(createNewCommand());
  program.addCommand(createPreviewCommand());
  program.addCommand(createApplyCommand());
  program.addCommand(createRollbackCommand());
  program.addCommand(createSnapshotsCommand());

  program.configureOutput({
    outputError: (message, write) => {
      write(pc.red(message));
    },
  });

  if (process.argv.length <= 2) {
    program.outputHelp();
    return;
  }

  await program.parseAsync(process.argv);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(pc.red(`Error: ${message}`));
  process.exitCode = 1;
});
