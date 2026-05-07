import { promises as fs } from "node:fs";
import process from "node:process";
import { cachePath, ensureCacheDir, readLines } from "./hook-cache.mjs";

const ADVISOR_LOG = cachePath("advisor-recommendations");
const ADVISOR_STATS_FILE = "H:\\prism\\.claude\\cache\\advisor-session-stats.json";

async function main() {
  await ensureCacheDir();

  const lines = await readLines(ADVISOR_LOG);
  if (lines.length === 0) {
    process.stdout.write(JSON.stringify({ recommendations: 0 }));
    return;
  }

  // Parse: "timestamp|command|complexity|model_recommended|action_taken|user_accepted"
  const entries = lines.map((line) => {
    const parts = line.split("|");
    return {
      timestamp: parts[0] || "",
      command: parts[1] || "unknown",
      complexity: parts[2] || "MODERATE",
      model_recommended: parts[3] || "sonnet",
      action_taken: parts[4] || "execute",
      user_accepted: parts[5] !== "false",
    };
  });

  // Aggregate
  const commandStats = {};
  let accepted = 0;
  let rejected = 0;

  for (const entry of entries) {
    if (!commandStats[entry.command]) {
      commandStats[entry.command] = { count: 0, accepted: 0, rejected: 0 };
    }
    commandStats[entry.command].count++;
    if (entry.user_accepted) {
      commandStats[entry.command].accepted++;
      accepted++;
    } else {
      commandStats[entry.command].rejected++;
      rejected++;
    }
  }

  const summary = {
    session_end: new Date().toISOString(),
    total_recommendations: entries.length,
    accepted,
    rejected,
    acceptance_rate: entries.length > 0 ? Math.round((accepted / entries.length) * 100) : 0,
    commands: commandStats,
  };

  // Merge with rolling history
  let history = [];
  try {
    const raw = await fs.readFile(ADVISOR_STATS_FILE, "utf8");
    history = JSON.parse(raw);
    if (!Array.isArray(history)) history = [];
  } catch {
    // first run
  }

  history.push(summary);
  if (history.length > 50) {
    history = history.slice(-50);
  }

  await fs.writeFile(ADVISOR_STATS_FILE, JSON.stringify(history, null, 2), "utf8");
  await fs.writeFile(ADVISOR_LOG, "", "utf8");

  process.stdout.write(
    JSON.stringify({
      recommendations: summary.total_recommendations,
      acceptance_rate: summary.acceptance_rate,
    }),
  );
}

main().catch(() => {
  process.stdout.write(JSON.stringify({ continue: true }));
});
