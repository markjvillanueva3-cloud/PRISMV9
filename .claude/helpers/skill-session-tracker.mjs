import { promises as fs } from "node:fs";
import process from "node:process";
import { cachePath, ensureCacheDir, readLines } from "./hook-cache.mjs";

const SKILL_LOG = cachePath("skill-invocations");
const SKILL_STATS_FILE = "H:\\prism\\.claude\\cache\\skill-session-stats.json";

async function main() {
  await ensureCacheDir();

  const lines = await readLines(SKILL_LOG);
  if (lines.length === 0) {
    process.stdout.write(JSON.stringify({ skills_used: 0 }));
    return;
  }

  // Parse skill invocation lines: "timestamp|skill_name|duration_ms|advisor_used"
  const invocations = lines.map((line) => {
    const parts = line.split("|");
    return {
      timestamp: parts[0] || "",
      skill: parts[1] || "unknown",
      duration_ms: parseInt(parts[2] || "0", 10),
      advisor_used: parts[3] === "true",
    };
  });

  // Aggregate stats per skill
  const skillStats = {};
  for (const inv of invocations) {
    if (!skillStats[inv.skill]) {
      skillStats[inv.skill] = {
        count: 0,
        total_duration_ms: 0,
        advisor_count: 0,
      };
    }
    skillStats[inv.skill].count++;
    skillStats[inv.skill].total_duration_ms += inv.duration_ms;
    if (inv.advisor_used) {
      skillStats[inv.skill].advisor_count++;
    }
  }

  const summary = {
    session_end: new Date().toISOString(),
    skills_used: Object.keys(skillStats).length,
    total_invocations: invocations.length,
    advisor_invocations: invocations.filter((i) => i.advisor_used).length,
    skills: skillStats,
  };

  // Merge with existing stats file (rolling history)
  let history = [];
  try {
    const raw = await fs.readFile(SKILL_STATS_FILE, "utf8");
    history = JSON.parse(raw);
    if (!Array.isArray(history)) history = [];
  } catch {
    // first run
  }

  history.push(summary);
  // Keep last 50 sessions
  if (history.length > 50) {
    history = history.slice(-50);
  }

  await fs.writeFile(SKILL_STATS_FILE, JSON.stringify(history, null, 2), "utf8");

  // Clear the session log
  await fs.writeFile(SKILL_LOG, "", "utf8");

  process.stdout.write(
    JSON.stringify({
      skills_used: summary.skills_used,
      total_invocations: summary.total_invocations,
      advisor_pct: summary.total_invocations > 0
        ? Math.round((summary.advisor_invocations / summary.total_invocations) * 100)
        : 0,
    }),
  );
}

main().catch(() => {
  process.stdout.write(JSON.stringify({ continue: true }));
});
