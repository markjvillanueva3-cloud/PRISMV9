#!/usr/bin/env node
/**
 * position-sync.mjs — Auto-generate CURRENT_POSITION.md from live data sources.
 *
 * Usage:
 *   node position-sync.mjs          # standalone — writes file, prints JSON to stdout
 *   echo '{}' | node position-sync.mjs  # hook mode — writes file, prints hook JSON
 *
 * Data sources:
 *   - mcp-server/data/roadmap-index.json   (version, milestones)
 *   - mcp-server/src/engines/              (Engine.ts file count)
 *   - mcp-server/src/tools/dispatchers/    (Dispatcher.ts file count)
 *   - mcp-server/src/schemas/              (action count from ActionSchemaMap keys)
 *   - mcp-server/src/__tests__/            (test file count)
 *   - mcp-server/src/routes/               (route file count)
 *   - mcp-server/dist/index.js             (build existence check)
 */

import { promises as fs } from "node:fs";
import path from "node:path";

// ── Paths ──────────────────────────────────────────────────────────────────
const ROOT = path.resolve(import.meta.dirname, "..", "..");
const MCP = path.join(ROOT, "mcp-server");
const ROADMAP_INDEX = path.join(MCP, "data", "roadmap-index.json");
const ENGINES_DIR = path.join(MCP, "src", "engines");
const DISPATCHERS_DIR = path.join(MCP, "src", "tools", "dispatchers");
const SCHEMAS_DIR = path.join(MCP, "src", "schemas");
const TESTS_DIR = path.join(MCP, "src", "__tests__");
const ROUTES_DIR = path.join(MCP, "src", "routes");
const DIST_INDEX = path.join(MCP, "dist", "index.js");
const CROSS_TREE = path.join(ROOT, "audits", "cross_tree_reference_inventory.json");
const OUTPUT = path.join(ROOT, "state", "CURRENT_POSITION.md");

// ── Helpers ────────────────────────────────────────────────────────────────

/** Read and parse a JSON file; returns fallback on any error. */
async function readJson(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/** List files in a flat directory matching a filter. Returns count. */
async function countFiles(dir, filter) {
  try {
    const entries = await fs.readdir(dir);
    return entries.filter(filter).length;
  } catch {
    return 0;
  }
}

/**
 * Count action keys across all *ActionSchemas.ts files.
 *
 * Strategy: Find the top-level SCHEMAS export object (ActionSchemaMap or
 * Record<string, z.ZodType>) and count its keys. Keys appear as either
 * bare identifiers (`action_name,`) or quoted strings (`"action_name":`)
 * at the first indent level inside the object.
 */
async function countActions() {
  try {
    const entries = await fs.readdir(SCHEMAS_DIR);
    const schemaFiles = entries.filter(
      (f) => f.endsWith("ActionSchemas.ts") && !f.endsWith(".test.ts")
    );

    const counts = await Promise.all(
      schemaFiles.map(async (file) => {
        try {
          const content = await fs.readFile(
            path.join(SCHEMAS_DIR, file),
            "utf8"
          );
          // Match either ActionSchemaMap or Record<string, z.ZodType> export
          const mapMatch = content.match(
            /(?:ActionSchemaMap|Record<string,\s*z\.ZodType>)\s*=\s*\{([\s\S]*?)\n\};/
          );
          if (!mapMatch) return 0;
          const block = mapMatch[1];
          // Count keys: bare identifiers or quoted strings at the start of lines
          //   `  action_name,`  or  `  action_name:`  or  `  "action-name":`
          let count = 0;
          for (const line of block.split("\n")) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("*")) continue;
            // Bare identifier key (shorthand property):  `action_name,` or `action_name`
            if (/^[a-z_]\w*\s*[,:]?\s*(?:\/\/.*)?$/.test(trimmed)) { count++; continue; }
            // Quoted key:  `"action_name": schema,` or `"action-name": schema`
            if (/^["'][a-z][\w-]*["']\s*:/.test(trimmed)) { count++; continue; }
          }
          return count;
        } catch {
          return 0;
        }
      })
    );

    return counts.reduce((a, b) => a + b, 0);
  } catch {
    return 0;
  }
}

/** Check build existence and freshness. */
async function checkBuild() {
  try {
    const stat = await fs.stat(DIST_INDEX);
    const ageHours = (Date.now() - stat.mtimeMs) / 3_600_000;
    if (ageHours < 24) return "PASS (< 24h old)";
    return `PASS (${Math.round(ageHours)}h old)`;
  } catch {
    return "NOT FOUND";
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  // Parallel data collection
  const [roadmap, engineCount, dispatcherCount, actionCount, testCount, routeCount, buildStatus, crossTree] =
    await Promise.all([
      readJson(ROADMAP_INDEX, { version: "unknown", total_milestones: 0, completed_milestones: 0, milestones: [] }),
      countFiles(ENGINES_DIR, (f) => f.endsWith("Engine.ts") && f !== "index.ts"),
      countFiles(DISPATCHERS_DIR, (f) => f.endsWith("Dispatcher.ts") && f !== "index.ts"),
      countActions(),
      countFiles(TESTS_DIR, (f) => f.endsWith(".test.ts")),
      countFiles(ROUTES_DIR, (f) => f.endsWith(".ts") && f !== "index.ts"),
      checkBuild(),
      readJson(CROSS_TREE, null),
    ]);

  // Cross-tree totals (include archive + external engines)
  const crossTreeEngines = crossTree?.summary?.counts?.engine?.merged ?? engineCount;
  const crossTreeAlgorithms = crossTree?.summary?.counts?.algorithm?.merged ?? 0;
  const outsideMcp = crossTreeEngines - (crossTree?.summary?.active_mcp_engine_count ?? engineCount);

  const version = roadmap.version || "unknown";
  const milestones = roadmap.milestones || [];
  // Use live counts from the milestones array (more accurate than stale index fields)
  const totalMs = milestones.length || roadmap.total_milestones || 0;

  // Derive milestone status buckets
  let completeCount = 0;
  let inProgressCount = 0;
  let notStartedCount = 0;

  /** @type {Map<string, {total: number, complete: number, inProgress: number, milestones: Array<{id: string, title: string, status: string}>}>} */
  const trackMap = new Map();

  for (const ms of milestones) {
    const status = (ms.status || "not_started").toLowerCase();
    if (status === "complete" || status === "completed") {
      completeCount++;
    } else if (status === "in_progress" || status === "in-progress") {
      inProgressCount++;
    } else {
      notStartedCount++;
    }

    const track = ms.track || "UNKNOWN";
    if (!trackMap.has(track)) {
      trackMap.set(track, { total: 0, complete: 0, inProgress: 0, milestones: [] });
    }
    const t = trackMap.get(track);
    t.total++;
    if (status === "complete" || status === "completed") {
      t.complete++;
    } else if (status === "in_progress" || status === "in-progress") {
      t.inProgress++;
    }
    // Store incomplete milestones for the Available Tracks table
    if (status !== "complete" && status !== "completed") {
      t.milestones.push({ id: ms.id, title: ms.title, status });
    }
  }

  // Find the current phase: latest in-progress milestone, or first not-started
  let currentPhase = "All phases complete";
  for (const ms of milestones) {
    const status = (ms.status || "not_started").toLowerCase();
    if (status === "in_progress" || status === "in-progress") {
      currentPhase = `${ms.id} — ${ms.title}`;
      break;
    }
  }
  if (currentPhase === "All phases complete") {
    for (const ms of milestones) {
      const status = (ms.status || "not_started").toLowerCase();
      if (status !== "complete" && status !== "completed") {
        currentPhase = `Next: ${ms.id} — ${ms.title}`;
        break;
      }
    }
  }

  // Build Available Tracks table — only tracks with incomplete milestones
  const remainingTotal = inProgressCount + notStartedCount;
  const trackRows = [];
  for (const [track, data] of trackMap) {
    if (data.milestones.length === 0) continue; // fully complete track
    const remaining = data.total - data.complete;
    const statusSummary = data.inProgress > 0
      ? `${data.inProgress} in progress, ${remaining - data.inProgress} not started`
      : `${remaining} not started`;
    const desc = data.milestones.map((m) => m.id).join(", ");
    trackRows.push(`| ${track} | ${remaining} | ${desc} | ${statusSummary} |`);
  }

  const today = new Date().toISOString().slice(0, 10);

  // Assemble markdown
  const md = `# CURRENT POSITION
## Updated: ${today}

**Phase:** ${currentPhase}
**Build:** ${buildStatus}
**Roadmap Index:** v${version} (${totalMs} milestones, ${completeCount} complete)

## System Counts
| Category | MCP Active | Total (cross-tree) |
|----------|-----------|-------------------|
| Engines | ${engineCount} | ${crossTreeEngines} |
| Algorithms | — | ${crossTreeAlgorithms} |
| Dispatchers | ${dispatcherCount} | ${dispatcherCount} |
| Actions | ${actionCount} | ${actionCount} |
| Tests | ${testCount} | ${testCount} |
| Routes | ${routeCount} | ${routeCount} |
| Outside MCP | — | ${outsideMcp} |

## Milestone Summary
- Complete: ${completeCount} milestones
- In Progress: ${inProgressCount}
- Not Started: ${notStartedCount}

## Available Tracks (${remainingTotal} milestones remaining)
| Track | Milestones | Description | Status |
|-------|-----------|-------------|--------|
${trackRows.join("\n")}
`;

  // Write output
  await fs.writeFile(OUTPUT, md, "utf8");

  return {
    ok: true,
    position: `v${version} ${totalMs}/${completeCount}`,
    engines: engineCount,
    dispatchers: dispatcherCount,
    actions: actionCount,
    tests: testCount,
    routes: routeCount,
  };
}

// ── Entry point: detect hook vs standalone mode ────────────────────────────

function drainStdin(timeoutMs = 150) {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      resolve("");
      return;
    }
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => { data += chunk; });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", () => resolve(data));
    // Critical: timeout prevents indefinite hang if stdin never closes
    setTimeout(() => resolve(data), timeoutMs);
  });
}

if (!process.stdin.isTTY) {
  // Hook mode — drain stdin with timeout, then run, output hook-format JSON
  drainStdin(150).then(async () => {
    try {
      const result = await main();
      process.stdout.write(JSON.stringify({ continue: true, ...result }) + "\n");
    } catch (err) {
      process.stdout.write(
        JSON.stringify({ continue: true, error: err.message }) + "\n"
      );
    }
  });
} else {
  // Standalone mode
  main()
    .then((result) => {
      console.log(JSON.stringify(result));
    })
    .catch((err) => {
      console.error(JSON.stringify({ ok: false, error: err.message }));
      process.exitCode = 1;
    });
}
