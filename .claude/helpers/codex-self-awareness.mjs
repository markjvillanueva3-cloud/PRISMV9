#!/usr/bin/env node
/**
 * codex-self-awareness.mjs
 *
 * Stable Node entrypoint for Codex to access the live PRISM self-awareness
 * engine without requiring the caller to know the TypeScript runtime details.
 */

import { execFileSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const prismRoot = path.resolve(__dirname, "..", "..");
const mcpServerRoot = path.join(prismRoot, "mcp-server");
const tsxCliPath = path.join(mcpServerRoot, "node_modules", "tsx", "dist", "cli.mjs");
const runnerPath = path.join(__dirname, "lib", "codex-self-awareness-runner.ts");

function main() {
  try {
    const output = execFileSync(
      process.execPath,
      [tsxCliPath, runnerPath, ...process.argv.slice(2)],
      { windowsHide: true,
        cwd: mcpServerRoot,
        encoding: "utf8",
        stdio: ["inherit", "pipe", "pipe"]
      }
    );

    process.stdout.write(output);
  } catch (error) {
    const stdout = typeof error?.stdout === "string" ? error.stdout : "";
    const stderr = typeof error?.stderr === "string" ? error.stderr : "";

    if (stdout) {
      process.stdout.write(stdout);
    }

    if (stderr) {
      process.stderr.write(stderr);
    } else {
      process.stderr.write("Failed to run PRISM Codex self-awareness helper.\n");
    }

    process.exit(typeof error?.status === "number" ? error.status : 1);
  }
}

main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); });
