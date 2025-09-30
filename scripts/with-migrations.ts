import "dotenv/config";

import { spawn } from "node:child_process";

const [, , ...rawArgs] = process.argv;

if (rawArgs.length === 0) {
  console.error("No command provided to scripts/with-migrations.ts");
  process.exit(1);
}

const isWindows = process.platform === "win32";

function resolveCommand(command: string) {
  if (!isWindows) return command;
  if (command.endsWith(".cmd") || command.endsWith(".exe")) return command;
  return `${command}.cmd`;
}

function runCommand(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(resolveCommand(command), args, {
      stdio: "inherit",
      env: process.env,
      shell: false,
    });

    child.on("error", reject);
    child.on("exit", code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command \"${command} ${args.join(" ")}\" exited with code ${code}`));
      }
    });
  });
}

async function ensureMigrations() {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    console.warn(
      "[with-migrations] DATABASE_URL is not set, skipping Prisma migrations."
    );
    return;
  }

  console.log("[with-migrations] Applying Prisma migrations before continuing...");
  await runCommand(isWindows ? "npx.cmd" : "npx", ["prisma", "migrate", "deploy"]);
}

async function main() {
  const [command, ...commandArgs] = rawArgs;

  try {
    await ensureMigrations();
  } catch (error) {
    console.error("[with-migrations] Prisma migrations failed.");
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }
    process.exit(1);
  }

  await runCommand(command, commandArgs);
}

main().catch(error => {
  console.error("[with-migrations] Unexpected failure.");
  if (error instanceof Error) {
    console.error(error.stack ?? error.message);
  } else {
    console.error(error);
  }
  process.exit(1);
});
