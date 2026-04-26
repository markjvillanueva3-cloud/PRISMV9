#!/usr/bin/env node
/**
 * build-cache-manager.mjs — Manages incremental build cache
 *
 * Responsibilities:
 * 1. Invalidates build cache on tsconfig.json or package.json changes
 * 2. Tracks build times for optimization decisions
 * 3. Provides cache status to other hooks
 *
 * Usage:
 *   node build-cache-manager.mjs          # standalone status check
 *   node build-cache-manager.mjs --check  # check if cache is valid
 *   node build-cache-manager.mjs --invalidate  # force invalidation
 *   node build-cache-manager.mjs --stats  # show build statistics
 *
 * Stdin (hook mode): receives tool event JSON
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { CACHE_DIR, ensureCacheDir } from "./hook-cache.mjs";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const MCP = path.join(ROOT, "mcp-server");
const CACHE_FILE = path.join(CACHE_DIR, "build-cache-state.json");
const SESSION_WRITES_FILE = path.join(CACHE_DIR, "session-write-set.json");

// Files that trigger full cache invalidation
const CRITICAL_FILES = [
  path.join(MCP, "tsconfig.json"),
  path.join(MCP, "package.json"),
  path.join(MCP, "package-lock.json"),
  path.join(ROOT, "tsconfig.json"),
  path.join(ROOT, "package.json"),
];

// Build artifacts to track
const BUILD_ARTIFACTS = [
  path.join(MCP, "dist", "index.js"),
  path.join(MCP, "dist", "index.cjs"),
];

/**
 * Get file mtime or 0 if missing.
 */
async function getMtime(filePath) {
  try {
    const stat = await fs.stat(filePath);
    return stat.mtimeMs;
  } catch {
    return 0;
  }
}

/**
 * Get current state of critical files.
 */
async function getCriticalFileState() {
  const state = {};
  for (const file of CRITICAL_FILES) {
    state[file] = await getMtime(file);
  }
  return state;
}

/**
 * Load cached state.
 */
async function loadCacheState() {
  try {
    const raw = await fs.readFile(CACHE_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return {
      criticalFiles: {},
      lastBuildTime: 0,
      lastBuildDuration: 0,
      buildHistory: [],
      invalidationCount: 0,
      lastInvalidation: null,
    };
  }
}

/**
 * Save cache state.
 */
async function saveCacheState(state) {
  await ensureCacheDir();
  await fs.writeFile(CACHE_FILE, JSON.stringify(state, null, 2), "utf8");
}

async function loadSessionWrites() {
  try {
    const raw = await fs.readFile(SESSION_WRITES_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return { files: {} };
  }
}

async function recordSessionWrite(filePath) {
  if (!filePath) return;
  const normalized = path.relative(ROOT, path.resolve(filePath)).replace(/\\/g, "/");
  const state = await loadSessionWrites();
  state.files = state.files || {};
  state.files[normalized] = Date.now();
  await ensureCacheDir();
  await fs.writeFile(SESSION_WRITES_FILE, JSON.stringify(state, null, 2), "utf8");
}

/**
 * Check if cache needs invalidation.
 * Returns { valid: boolean, reason?: string }
 */
async function checkCacheValidity() {
  const state = await loadCacheState();
  const currentFiles = await getCriticalFileState();

  // Check each critical file for changes
  for (const file of CRITICAL_FILES) {
    const cached = state.criticalFiles[file] || 0;
    const current = currentFiles[file];

    if (current > cached && cached > 0) {
      const filename = path.basename(file);
      return {
        valid: false,
        reason: `${filename} changed (mtime ${new Date(cached).toISOString()} -> ${new Date(current).toISOString()})`,
      };
    }
  }

  // Check if build artifacts are missing
  for (const artifact of BUILD_ARTIFACTS) {
    const mtime = await getMtime(artifact);
    if (mtime === 0) {
      return {
        valid: false,
        reason: `Build artifact missing: ${path.basename(artifact)}`,
      };
    }
  }

  // Check if build artifacts are older than source
  const lastSourceChange = Math.max(...Object.values(currentFiles).filter(t => t > 0));
  const lastBuildArtifact = Math.min(
    ...(await Promise.all(BUILD_ARTIFACTS.map(getMtime))).filter(t => t > 0)
  );

  if (lastBuildArtifact < lastSourceChange) {
    return {
      valid: false,
      reason: "Build artifacts older than config files",
    };
  }

  return { valid: true };
}

/**
 * Invalidate all build caches.
 */
async function invalidateCaches(reason) {
  const state = await loadCacheState();

  // Clear temp caches used by other hooks
  const cachesToClear = [
    "/tmp/prism-build-cache",
    "/tmp/prism-test-cache",
    "/tmp/prism-tsc-cache",
  ];

  for (const cache of cachesToClear) {
    try {
      await fs.unlink(cache);
    } catch {
      // File may not exist — OK
    }
  }

  // Update state
  state.invalidationCount = (state.invalidationCount || 0) + 1;
  state.lastInvalidation = {
    time: Date.now(),
    reason,
  };
  state.criticalFiles = await getCriticalFileState();

  await saveCacheState(state);

  return state;
}

/**
 * Record a build completion.
 */
async function recordBuild(durationMs, success) {
  const state = await loadCacheState();

  const record = {
    time: Date.now(),
    duration: durationMs,
    success,
  };

  state.buildHistory = state.buildHistory || [];
  state.buildHistory.push(record);

  // Keep last 50 builds only
  if (state.buildHistory.length > 50) {
    state.buildHistory = state.buildHistory.slice(-50);
  }

  state.lastBuildTime = record.time;
  state.lastBuildDuration = durationMs;
  state.criticalFiles = await getCriticalFileState();

  await saveCacheState(state);

  return state;
}

/**
 * Get build statistics.
 */
async function getBuildStats() {
  const state = await loadCacheState();
  const history = state.buildHistory || [];

  if (history.length === 0) {
    return {
      totalBuilds: 0,
      avgDuration: 0,
      successRate: 0,
      lastBuild: null,
      trend: "unknown",
    };
  }

  const successfulBuilds = history.filter((b) => b.success);
  const recentBuilds = history.slice(-10);
  const olderBuilds = history.slice(-20, -10);

  const avgRecent = recentBuilds.length > 0
    ? recentBuilds.reduce((s, b) => s + b.duration, 0) / recentBuilds.length
    : 0;

  const avgOlder = olderBuilds.length > 0
    ? olderBuilds.reduce((s, b) => s + b.duration, 0) / olderBuilds.length
    : avgRecent;

  let trend = "stable";
  if (avgRecent > avgOlder * 1.1) {
    trend = "slowing";
  } else if (avgRecent < avgOlder * 0.9) {
    trend = "improving";
  }

  return {
    totalBuilds: history.length,
    avgDuration: Math.round(history.reduce((s, b) => s + b.duration, 0) / history.length),
    successRate: Math.round((successfulBuilds.length / history.length) * 100),
    lastBuild: history[history.length - 1],
    trend,
    invalidations: state.invalidationCount || 0,
    lastInvalidation: state.lastInvalidation,
  };
}

/**
 * Read stdin for hook mode.
 */
function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      resolve("");
      return;
    }
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => { data += c; });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", () => resolve(""));
    setTimeout(() => resolve(data), 150);
  });
}

/**
 * Main entry point.
 */
async function main() {
  const args = process.argv.slice(2);

  // CLI mode
  if (args.includes("--check")) {
    const validity = await checkCacheValidity();
    console.log(JSON.stringify(validity));
    process.exit(validity.valid ? 0 : 1);
    return;
  }

  if (args.includes("--invalidate")) {
    const reason = args.find((a) => a.startsWith("--reason="))?.slice(9) || "manual";
    const state = await invalidateCaches(reason);
    console.log(JSON.stringify({ invalidated: true, reason, count: state.invalidationCount }));
    return;
  }

  if (args.includes("--stats")) {
    const stats = await getBuildStats();
    console.log(JSON.stringify(stats, null, 2));
    return;
  }

  if (args.includes("--record")) {
    const durationArg = args.find((a) => a.startsWith("--duration="));
    const duration = durationArg ? parseInt(durationArg.slice(11), 10) : 0;
    const success = !args.includes("--failed");
    const state = await recordBuild(duration, success);
    console.log(JSON.stringify({ recorded: true, duration, success }));
    return;
  }

  // Hook mode: check for critical file changes
  const raw = await readStdin();
  let filePath = "";

  try {
    const parsed = typeof raw === "string" && raw.trim() ? JSON.parse(raw) : {};
    filePath = (parsed.tool_input?.file_path || parsed.file_path || "").replace(/\\/g, "/");
  } catch {
    // Non-JSON input — continue without file path
  }

  // Check if edited file is critical
  if (filePath) {
    await recordSessionWrite(filePath);
    const normalizedPath = path.resolve(filePath);
    const isCritical = CRITICAL_FILES.some((cf) =>
      path.resolve(cf).toLowerCase() === normalizedPath.toLowerCase()
    );

    if (isCritical) {
      await invalidateCaches(`${path.basename(filePath)} edited`);
      process.stdout.write(JSON.stringify({
        continue: true,
        hookSpecificOutput: {
          hookEventName: "PostToolUse",
          additionalContext: `BUILD CACHE INVALIDATED: ${path.basename(filePath)} changed. Next build will be full rebuild.`,
        },
      }));
      process.exit(0);
      return;
    }
  }

  // Default: check validity and report
  const validity = await checkCacheValidity();
  if (!validity.valid) {
    await invalidateCaches(validity.reason);
    process.stdout.write(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: `BUILD CACHE INVALID: ${validity.reason}`,
      },
    }));
  } else {
    process.stdout.write(JSON.stringify({ continue: true }));
  }
}

main().catch((err) => {
  // Silent failure — never block on cache manager errors
  process.stderr.write(`[build-cache-manager] Error: ${err.message}\n`);
  process.stdout.write(JSON.stringify({ continue: true }));
});
