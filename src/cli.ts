#!/usr/bin/env node

import { Command } from "commander";
import pc from "picocolors";

import { createApplyCommand } from "./commands/apply";
import { createListCommand } from "./commands/list";
import { createPreviewCommand } from "./commands/preview";
import { createRollbackCommand } from "./commands/rollback";

async function main(): Promise<void> {
  const program = new Command();

  program
    .name("clawmorph")
    .description("CLI for browsing and applying OpenClaw role packs")
    .version("0.1.0")
    .showHelpAfterError();

  program.addCommand(createListCommand());
  program.addCommand(createPreviewCommand());
  program.addCommand(createApplyCommand());
  program.addCommand(createRollbackCommand());

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
