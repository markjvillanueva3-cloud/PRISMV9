import { promises as fs } from "node:fs";
import process from "node:process";
import { spawnSync } from "node:child_process";

const PRISM_ROOT = "H:\\prism";
const BREADCRUMB_FILE = "H:\\prism\\.claude\\helpers\\.session-breadcrumb.json";

function runGit(args) {
  const result = spawnSync("git", args, {
    cwd: PRISM_ROOT,
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.status !== 0) {
    return "unknown";
  }
  return (result.stdout ?? "").trim() || "unknown";
}

async function main() {
  const command = process.env.TOOL_INPUT_command ?? "";
  if (!command.includes("git commit")) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const payload = {
    timestamp: new Date().toISOString(),
    commit: runGit(["log", "-1", "--format=%h"]),
    note: runGit(["log", "-1", "--format=%s"]),
  };

  await fs.writeFile(BREADCRUMB_FILE, `${JSON.stringify(payload)}\n`, "utf8");
  process.stdout.write("OK: breadcrumb written");
}

main().catch(() => {
  process.stdout.write(JSON.stringify({ continue: true }));
});
