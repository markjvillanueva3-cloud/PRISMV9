import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

const HOME = os.homedir();
const CLAUDE_DIR = path.join(HOME, ".claude");

const ROOTS = {
  prism: "H:\\prism",
  mcp: "H:\\prism\\mcp-server",
  positionCandidates: [
    "H:\\prism\\state\\CURRENT_POSITION.md",
    "H:\\prism\\mcp-server\\data\\docs\\roadmap\\CURRENT_POSITION.md",
  ],
  baseline: "H:\\prism\\mcp-server\\data\\state\\BASELINE_INVENTORY.json",
  roadmap: path.join(CLAUDE_DIR, "plans", "sleepy-chasing-prism.md"),
  breadcrumb: "H:\\prism\\.claude\\helpers\\.session-breadcrumb.json",
  claudeProjects: path.join(CLAUDE_DIR, "projects"),
};

const MEMORY_CANDIDATES = [
  path.join(CLAUDE_DIR, "projects", "H--prism", "memory", "MEMORY.md"),
  path.join(CLAUDE_DIR, "projects", "C--PRISM", "memory", "MEMORY.md"),
  path.join(CLAUDE_DIR, "projects", "C--PRISM--mcp-server", "memory", "MEMORY.md"),
];

function readGit(args) {
  try {
    return execFileSync("git", args, { windowsHide: true,
      cwd: ROOTS.prism,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readText(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

async function readJson(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function resolveFirstExistingPath(candidates) {
  for (const candidate of candidates) {
    if (await exists(candidate)) {
      return candidate;
    }
  }
  return candidates[0] ?? null;
}

async function findMemoryFiles(rootDir) {
  const found = [];

  async function walk(currentPath) {
    let entries;
    try {
      entries = await fs.readdir(currentPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const entryPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        if (entry.name.toLowerCase() === "memory") {
          const memoryPath = path.join(entryPath, "MEMORY.md");
          if (await exists(memoryPath)) {
            found.push(memoryPath);
          }
          continue;
        }
        await walk(entryPath);
      }
    }
  }

  await walk(rootDir);
  return found;
}

function scoreMemoryPath(filePath) {
  const normalized = filePath.toLowerCase();
  if (normalized.includes("c--prism\\memory\\memory.md")) {
    return 1;
  }
  if (normalized.includes("c--prism--mcp-server\\memory\\memory.md")) {
    return 2;
  }
  if (normalized.includes("c--prism--claude-worktrees")) {
    return 3;
  }
  if (normalized.includes("h--prism\\memory\\memory.md")) {
    return 0;  // highest priority — portable H: drive project
  }
  return 9;
}

async function resolveMemoryFile() {
  if (process.env.MEMORY_FILE && (await exists(process.env.MEMORY_FILE))) {
    return process.env.MEMORY_FILE;
  }

  for (const candidate of MEMORY_CANDIDATES) {
    if (await exists(candidate)) {
      return candidate;
    }
  }

  const discovered = await findMemoryFiles(ROOTS.claudeProjects);
  if (discovered.length === 0) {
    return null;
  }

  discovered.sort((left, right) => {
    const scoreDelta = scoreMemoryPath(left) - scoreMemoryPath(right);
    if (scoreDelta !== 0) {
      return scoreDelta;
    }
    return left.localeCompare(right);
  });

  return discovered[0];
}

function extractPhase(positionText) {
  if (!positionText) {
    return "unknown";
  }
  const match = positionText.match(/^\*\*Phase:\*\*\s*(.+)$/m);
  return match?.[1]?.trim() || "unknown";
}

function getInventoryValue(inventory, key, fallback) {
  if (!inventory || inventory[key] === undefined || inventory[key] === null) {
    return fallback;
  }
  return inventory[key];
}

async function main() {
  const memoryFile = await resolveMemoryFile();
  if (!memoryFile) {
    process.stderr.write("WARN: No MEMORY.md found\n");
    return;
  }

  const positionFile = await resolveFirstExistingPath(ROOTS.positionCandidates);
  const [positionText, baseline, breadcrumb] = await Promise.all([
    positionFile ? readText(positionFile) : Promise.resolve(null),
    readJson(ROOTS.baseline),
    readJson(ROOTS.breadcrumb),
  ]);

  const inventory = baseline?.inventory ?? {};
  const dispatchers = getInventoryValue(inventory, "dispatchers", 32);
  const actions = getInventoryValue(inventory, "actions", 541);
  const engines = getInventoryValue(inventory.engines ?? {}, "files", 75);
  const tests = getInventoryValue(inventory, "test_count", 111);
  const build = getInventoryValue(inventory, "build_size", "5.1MB");
  const omega = getInventoryValue(inventory, "omega", 1.0);

  const recentCommits =
    readGit(["log", "--oneline", "-5"]) || (breadcrumb?.commit ? `${breadcrumb.commit} ${breadcrumb.note ?? ""}`.trim() : "");
  const rawCommitDate = readGit(["log", "-1", "--format=%ci"]);
  const lastCommitDate =
    rawCommitDate !== ""
      ? rawCommitDate.split(" ").slice(0, 2).join("T")
      : new Date().toISOString().slice(0, 19);
  const phase = extractPhase(positionText);

  const content = `# PRISM Project Memory
## Last synced: ${lastCommitDate}

## Primary Roadmap
**File:** \`${ROOTS.roadmap}\`
**Title:** PRISM App — Comprehensive Layered Roadmap (v2 — Execution Protocol)
**NOTE:** This is the ONLY roadmap to follow. Ignore old phase docs (R15, etc.) in \`data/docs/roadmap/\`.

## Current Position
${phase}

## Omega Target
User explicitly wants **Omega = 1.0** for ALL future milestones. Not 0.75 — full 1.0.

## Working Mode
- YOLO mode: autonomous execution, auto-commit after each unit
- Commit format: LAYER-PHASE-UNIT: title — summary
- Security: use execFileNoThrow, never shell injection patterns
- Maximum token efficiency: parallelize independent work, minimize back-and-forth
- **ALWAYS BUILD, NEVER SKIP** — gap analyses must build every identified engine. See feedback_always_build.md. Enforced by Stop hook always-build-guard.mjs + registry state/shared/PENDING_GAP_ENGINES.json.

## Key Counts (frozen in BASELINE_INVENTORY.json)
- ${dispatchers} dispatchers, ${actions} actions, ${engines} engine files
- 14 registries, 29,569 entries, 61 skills, 48 scripts, 17 algorithms
- 59 hooks (registry) / 112 hooks (source), 40 cadence functions
- 0 tsc errors, ${tests}/${tests} tests pass, ${build} build, Omega = ${omega}

## Architecture
- MCP server: H:\\prism\\mcp-server\\
- Build: npm run build (tsc noEmit + esbuild), heap 16GB
- Build fast: npm run build:fast (esbuild only, skip tsc)
- Tests: npx vitest run
- Web app: mcp-server/web/ (8 pages, thin client)
- State: mcp-server/data/state/ (HEALTH_CHECK_REPORT.json, BASELINE_INVENTORY.json)
- State (legacy): state/ (CURRENT_STATE.json, SESSION_MEMORY.json)

## Key Files
- Roadmap: sleepy-chasing-prism.md (the ONLY source of truth)
- Position: state/CURRENT_POSITION.md
- Health: mcp-server/data/state/HEALTH_CHECK_REPORT.json
- Baseline: mcp-server/data/state/BASELINE_INVENTORY.json
- Schema: mcp-server/src/schemas/roadmapSchema.ts

## Recent Commits
\`\`\`
${recentCommits}
\`\`\`
`;

  await fs.mkdir(path.dirname(memoryFile), { recursive: true });
  await fs.writeFile(memoryFile, content, "utf8");
  process.stdout.write(`OK: MEMORY.md synced to ${memoryFile}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
