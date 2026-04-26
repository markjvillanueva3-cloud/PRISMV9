import { promises as fs } from "node:fs";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { cachePath, readLines } from "./hook-cache.mjs";

const POSITION_FILES = [
  "H:\\prism\\state\\CURRENT_POSITION.md",
  "H:\\prism\\mcp-server\\data\\docs\\roadmap\\CURRENT_POSITION.md",
];

function runGit(args, timeoutMs = 5000) {
  const result = spawnSync("git", args, {
    cwd: "H:\\prism",
    encoding: "utf8",
    timeout: timeoutMs,
    windowsHide: true,
  });
  if (result.status !== 0) {
    return "";
  }
  return (result.stdout ?? "").trim();
}

async function readPosition() {
  for (const filePath of POSITION_FILES) {
    try {
      const raw = await fs.readFile(filePath, "utf8");
      return raw
        .split(/\r?\n/)
        .slice(0, 3)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 120);
    } catch {
      // continue
    }
  }
  return "unknown";
}

async function main() {
  const [position, history] = await Promise.all([
    readPosition(),
    readLines(cachePath("tool-history")),
  ]);
  const uncommitted = runGit(["status", "--porcelain"])
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean).length;
  const lastEntry = history.at(-1) ?? "unknown";
  const lastTool = lastEntry.includes(":") ? lastEntry.split(":")[0] : lastEntry;

  process.stdout.write(
    JSON.stringify({
      additionalContext: `IDLE REMINDER: Position: ${position}. ${uncommitted} uncommitted files. Last action: ${lastTool}.`,
    }),
  );
}

main().catch(() => {
  process.stdout.write(JSON.stringify({ continue: true }));
});
