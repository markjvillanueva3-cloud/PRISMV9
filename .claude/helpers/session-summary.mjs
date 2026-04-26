import { promises as fs } from "node:fs";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { cachePath, countLines } from "./hook-cache.mjs";

const PATHS = {
  prismRoot: "H:\\prism",
  statePosition: "H:\\prism\\state\\CURRENT_POSITION.md",
  fallbackPosition: "H:\\prism\\mcp-server\\data\\docs\\roadmap\\CURRENT_POSITION.md",
  summaryFile: "H:\\prism\\.claude\\helpers\\.session-summary.md",
};

function runGit(args) {
  const result = spawnSync("git", args, {
    cwd: PATHS.prismRoot,
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.status !== 0) {
    return "";
  }
  return (result.stdout ?? "").trim();
}

async function readPhase() {
  for (const filePath of [PATHS.statePosition, PATHS.fallbackPosition]) {
    try {
      const raw = await fs.readFile(filePath, "utf8");
      const match = raw.match(/^\*\*Phase:\*\*\s*(.+)$/m);
      if (match?.[1]) {
        return match[1].trim();
      }
    } catch {
      // continue
    }
  }
  return "unknown";
}

async function main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); }) {
  const timestamp = new Date().toISOString();
  const [phase, filesRead, toolCalls, errorCount, agentCount] = await Promise.all([
    readPhase(),
    countLines(cachePath("files-read")),
    countLines(cachePath("tool-history")),
    countLines(cachePath("error-log")),
    countLines(cachePath("agent-results")),
  ]);

  const commits = runGit(["log", "--oneline", "-20", "--since=8 hours ago"]) || "none";
  const unitCount = (commits.match(/P[0-9]*-U[0-9]*:/g) || []).length;
  const diffBase = unitCount > 0 ? `HEAD~${unitCount}` : "HEAD~1";
  const filesChanged =
    runGit(["diff", "--stat", diffBase]).split(/\r?\n/).filter(Boolean).at(-1) || "unknown";
  const agentStats = agentCount > 0 ? `${agentCount} agents spawned` : "none";

  const summary = [
    `# Session Summary -- ${timestamp}`,
    "",
    "## Current Phase",
    phase,
    "",
    "## Work Done (last 8h)",
    `Units completed: ${unitCount}`,
    commits,
    "",
    "## Files Changed",
    filesChanged,
    "",
    "## Session Metrics",
    `- Files read: ${filesRead}`,
    `- Tool calls tracked: ${toolCalls}`,
    `- Errors encountered: ${errorCount}`,
    `- Agents: ${agentStats}`,
    "",
  ].join("\n");

  await fs.writeFile(PATHS.summaryFile, summary, "utf8");
  process.stdout.write(JSON.stringify({ continue: true }));
}

main().catch(() => {
  process.stdout.write(JSON.stringify({ continue: true }));
});
