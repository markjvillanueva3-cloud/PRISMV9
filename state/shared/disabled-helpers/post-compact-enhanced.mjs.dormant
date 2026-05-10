import { promises as fs } from "node:fs";
import { spawnSync } from "node:child_process";
import process from "node:process";

const PATHS = {
  prismRoot: "H:\\prism",
  mcpRoot: "H:\\prism\\mcp-server",
  handoff: "H:\\prism\\state\\HANDOFF.md",
  handoffLatest: "H:\\prism\\state\\shared\\handoffs\\HANDOFF-latest.md",
  editCounter: "H:\\prism\\state\\session-edit-counter.json",
  autoCompactTracker: "H:\\prism\\state\\auto-compact-tracker.json",
  compactLog: "H:\\prism\\state\\shared\\post-compact-log.json",
  artifactsFile: "H:\\prism\\state\\shared\\SESSION_ARTIFACTS.json",
  sviCompact: "H:\\prism\\state\\shared\\SVI-compact.md",
  survivalFile: "H:\\prism\\.claude\\helpers\\.compaction-survival.md",
};

async function readJson(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return null;
  }
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function countEngines() {
  try {
    const result = spawnSync("bash", ["-c", "find H:/prism/mcp-server/src/engines -name '*.ts' ! -name '*.test.*' ! -name '*.spec.*' | wc -l"], {
      encoding: "utf8",
      windowsHide: true,
      timeout: 5000,
    });
    return parseInt(result.stdout?.trim() || "0", 10);
  } catch {
    return 0;
  }
}

async function countDispatchers() {
  try {
    const result = spawnSync("bash", ["-c", "find H:/prism/mcp-server/src/tools/dispatchers -name '*Dispatcher.ts' -o -name '*dispatcher.ts' | wc -l"], {
      encoding: "utf8",
      windowsHide: true,
      timeout: 5000,
    });
    return parseInt(result.stdout?.trim() || "0", 10);
  } catch {
    return 0;
  }
}

async function countTests() {
  try {
    const result = spawnSync("bash", ["-c", "find H:/prism/mcp-server/src/__tests__ -name '*.test.ts' | wc -l"], {
      encoding: "utf8",
      windowsHide: true,
      timeout: 5000,
    });
    return parseInt(result.stdout?.trim() || "0", 10);
  } catch {
    return 0;
  }
}

async function getRecentNewFiles() {
  try {
    // Check if git repo exists first
    const gitCheck = spawnSync("git", ["rev-parse", "--git-dir"], {
      cwd: PATHS.prismRoot,
      encoding: "utf8",
      windowsHide: true,
      timeout: 2000,
    });
    if (gitCheck.status !== 0) {
      return { engines: [], hooks: [], skills: [], dispatchers: [], total: 0 };
    }
    const result = spawnSync("git", ["log", "--diff-filter=A", "--name-only", "--pretty=format:", "-20"], {
      cwd: PATHS.prismRoot,
      encoding: "utf8",
      windowsHide: true,
      timeout: 5000,
    });
    if (result.status !== 0) {
      return { engines: [], hooks: [], skills: [], dispatchers: [], total: 0 };
    }
    const files = (result.stdout || "").split(/\r?\n/).filter(Boolean);
    const engines = files.filter(f => f.includes("src/engines/") && f.endsWith(".ts") && !f.includes(".test."));
    const hooks = files.filter(f => f.includes(".claude/hooks/") || f.includes(".claude/helpers/"));
    const skills = files.filter(f => f.includes("skills-consolidated/") || f.includes(".claude/commands/"));
    const dispatchers = files.filter(f => f.includes("dispatchers/") && f.endsWith(".ts"));
    return { engines, hooks, skills, dispatchers, total: files.length };
  } catch {
    return { engines: [], hooks: [], skills: [], dispatchers: [], total: 0 };
  }
}

async function main() {
  const timestamp = new Date().toISOString();

  // 1. Reset session trackers
  await writeJson(PATHS.editCounter, { engine_edits_since_review: 0, total_edits: 0, last_reset: timestamp });
  await writeJson(PATHS.autoCompactTracker, { edits: 0, engines_written: 0, last_reset: timestamp });

  // 2. Copy HANDOFF to shared
  if (await exists(PATHS.handoff)) {
    try {
      await fs.copyFile(PATHS.handoff, PATHS.handoffLatest);
    } catch { /* ok */ }
  }

  // 3. Get live system counts
  const [engineCount, dispatcherCount, testCount, newFiles] = await Promise.all([
    countEngines(),
    countDispatchers(),
    countTests(),
    getRecentNewFiles(),
  ]);

  // 4. Build session artifacts summary
  const artifacts = {
    schemaVersion: "1.0.0",
    timestamp,
    event: "post_compact",
    system_counts: {
      engines: engineCount,
      dispatchers: dispatcherCount,
      tests: testCount,
    },
    recent_additions: {
      new_engines: newFiles.engines.map(f => f.split("/").pop()),
      new_hooks: newFiles.hooks.map(f => f.split("/").pop()),
      new_skills: newFiles.skills.map(f => f.split("/").pop()),
      new_dispatchers: newFiles.dispatchers.map(f => f.split("/").pop()),
    },
    feature_cascade: {
      engines_available: engineCount,
      dispatchers_available: dispatcherCount,
      note: "Next session should reference any new_engines/hooks/skills in KNOWLEDGE SOURCES",
    },
  };
  await writeJson(PATHS.artifactsFile, artifacts);

  // 5. Log compaction event
  let log = await readJson(PATHS.compactLog);
  if (!log || !Array.isArray(log.events)) log = { schemaVersion: "1.0.0", events: [] };
  if (!log.schemaVersion) log.schemaVersion = "1.0.0";
  log.events.push({
    timestamp,
    engines: engineCount,
    dispatchers: dispatcherCount,
    tests: testCount,
    new_engines: newFiles.engines.length,
    new_hooks: newFiles.hooks.length,
  });
  // Keep last 50 events
  if (log.events.length > 50) log.events = log.events.slice(-50);
  await writeJson(PATHS.compactLog, log);

  // 6. Sync roadmap state (async call)
  try {
    spawnSync("node", ["H:/prism/.claude/helpers/roadmap-sync.mjs", "sync"], {
      cwd: PATHS.prismRoot,
      encoding: "utf8",
      windowsHide: true,
      timeout: 5000,
    });
  } catch { /* ok */ }

  // 7. Output context for next session
  const parts = [];
  parts.push(`POST-COMPACT: Session trackers reset. System: ${engineCount} engines, ${dispatcherCount} dispatchers, ${testCount} test files.`);
  if (newFiles.engines.length > 0) {
    parts.push(`NEW ENGINES since last compact: ${newFiles.engines.map(f => f.split("/").pop()).join(", ")}. Add to downstream KNOWLEDGE SOURCES.`);
  }
  if (newFiles.hooks.length > 0) {
    parts.push(`NEW HOOKS: ${newFiles.hooks.map(f => f.split("/").pop()).join(", ")}.`);
  }
  if (newFiles.skills.length > 0) {
    parts.push(`NEW SKILLS: ${newFiles.skills.map(f => f.split("/").pop()).join(", ")}.`);
  }
  parts.push("Feature cascade: SESSION_ARTIFACTS.json updated. Next session should inherit these capabilities.");
  parts.push("Read HANDOFF.md RESUME section, then continue working without summarizing.");
  parts.push("AI PROTOCOL: Before creating assets, check DuplicationGuardEngine.checkBeforeCreating(). For hybrid solutions, use PRISMCreativeReasoningEngine.explore('optimal'). Cross-domain synthesis: 15 disciplines, 120+ formulas.");

  process.stdout.write(JSON.stringify({ additionalContext: parts.join(" ") }));
}

main().catch((err) => {
  // Log error to stderr for debugging, output fallback to stdout
  process.stderr.write(`POST-COMPACT ERROR: ${err?.message || err}\n${err?.stack || ""}\n`);
  process.stdout.write(JSON.stringify({
    additionalContext: `POST-COMPACT: handler error (${err?.message || "unknown"}). Basic reset done. Read HANDOFF.md to resume.`
  }));
});
