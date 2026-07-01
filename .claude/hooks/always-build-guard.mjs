#!/usr/bin/env node
// tier: T4
/**
 * always-build-guard.mjs - Stop hook to enforce task completion before session end
 *
 * Checks for:
 * 1. unbuilt pending engines
 * 2. recent high-risk PRISM edits without fresh build/test evidence
 * 3. in-progress goal stack closeout state
 */

import { existsSync, readFileSync } from "node:fs";
import { writeAtomicSync } from "../helpers/atomic-write.mjs";
import path from "node:path";

const ROOT = (process.env.PRISM_ROOT || "H:/prism").replace(/\\/g, "/").replace(/\/$/, "");
const PENDING_PATH = process.env.PRISM_PENDING_ENGINES || `${ROOT}/state/shared/PENDING_GAP_ENGINES.json`;
const GOAL_STACK_PATH = process.env.PRISM_GOAL_STACK || `${ROOT}/mcp-server/data/state/GOAL_STACK.json`;
const SESSION_WRITES_PATH = process.env.PRISM_SESSION_WRITE_SET || `${ROOT}/.claude/cache/session-write-set.json`;
const OWNERSHIP_PATH = process.env.PRISM_SESSION_FILE_OWNERSHIP || `${ROOT}/mcp-server/data/state/session-file-ownership.json`;
const BUILD_CACHE_PATH = process.env.PRISM_BUILD_CACHE_STATE || `${ROOT}/.claude/cache/build-cache-state.json`;
const HEALTH_REPORT_PATH = process.env.PRISM_HEALTH_REPORT || `${ROOT}/mcp-server/data/state/HEALTH_CHECK_REPORT.json`;
const TEST_REPORT_PATH = process.env.PRISM_TEST_REPORT || `${ROOT}/mcp-server/data/state/TEST_COVERAGE_INDEX.json`;

const RECENT_WINDOW_MS = numberFromEnv("PRISM_BUILD_GUARD_WINDOW_MS", 6 * 60 * 60 * 1000);
const FRESH_WINDOW_MS = numberFromEnv("PRISM_BUILD_GUARD_FRESH_MS", 4 * 60 * 60 * 1000);
const FUTURE_CLOCK_SKEW_MS = 10 * 60 * 1000;

const RISK_RANK = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

function numberFromEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function readJson(filePath, fallback) {
  try {
    if (existsSync(filePath)) {
      return JSON.parse(readFileSync(filePath, "utf8"));
    }
  } catch {
    // Stop hooks should never fail closed because of corrupt optional state.
  }
  return fallback;
}

function toMs(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 0 && value < 1_000_000_000_000 ? value * 1000 : value;
  }
  if (typeof value === "string" && value.trim()) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return toMs(numeric);
    }
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function repoRelative(filePath) {
  const normalized = String(filePath || "").replace(/\\/g, "/").replace(/^\.\/+/, "");
  if (!normalized) return "";

  const lowerRoot = ROOT.toLowerCase();
  const lower = normalized.toLowerCase();
  if (lower.startsWith(`${lowerRoot}/`)) {
    return normalized.slice(ROOT.length + 1);
  }

  if (/^[a-z]:\//i.test(normalized)) {
    return path.basename(normalized);
  }

  return normalized;
}

function classifyFile(filePath) {
  const p = repoRelative(filePath).toLowerCase();

  if (!p || p.includes("/node_modules/") || p.includes("/dist/")) {
    return { risk: "none", category: "ignored" };
  }

  if (p.includes("mcp-server/src/__tests__/") || /\.test\.[cm]?[tj]sx?$/.test(p)) {
    return { risk: "low", category: "test" };
  }

  if (p.includes("mcp-server/src/physics/")) {
    return { risk: "critical", category: "physics" };
  }

  if (p.includes("mcp-server/src/engines/")) {
    const category = /(formula|calculator|physics|thermal|force|milling|lathe|wire|edm|speed|feed|reason|awareness|orchestrat)/.test(p)
      ? "engine-core"
      : "engine";
    return { risk: "high", category };
  }

  if (p.includes("mcp-server/src/tools/dispatchers/")) {
    return { risk: "high", category: "dispatcher" };
  }

  if (p.includes("mcp-server/src/schemas/")) {
    return { risk: "high", category: "schema" };
  }

  if (p.includes("mcp-server/data/cam-functions/")) {
    return { risk: "high", category: "cam-data" };
  }

  if (
    p.includes("mcp-server/data/") &&
    /(tool|holder|insert|material|machine|cut|cam|speed|feed|fixture|workholding)/.test(p)
  ) {
    return { risk: "high", category: "manufacturing-data" };
  }

  if (p.includes(".claude/hooks/") || p.includes(".claude/helpers/") || p.endsWith(".claude/settings.json")) {
    return { risk: "high", category: "hook-infra" };
  }

  if (
    p.includes("state/shared/claude-codex") ||
    p.includes("state/shared/prism-self-awareness") ||
    p.includes("state/shared/capability_index.json") ||
    p.includes("state/shared/claude-codex-command-registry.json")
  ) {
    return { risk: "high", category: "coordination-state" };
  }

  if (p.includes("mcp-server/src/routes/") || p.includes("mcp-server/src/algorithms/")) {
    return { risk: "medium", category: "source" };
  }

  if (p.includes("mcp-server/src/") && /\.[cm]?[tj]sx?$/.test(p)) {
    return { risk: "medium", category: "source" };
  }

  return { risk: "none", category: "other" };
}

function collectWriteEntries() {
  const entries = new Map();
  const now = Date.now();

  function merge(filePath, timestamp, source, session) {
    const relative = repoRelative(filePath);
    const ts = toMs(timestamp);
    if (!relative || !ts) return;

    const { risk, category } = classifyFile(relative);
    if (risk === "none") return;

    const age = Math.max(0, now - ts);
    if (age > RECENT_WINDOW_MS || ts > now + FUTURE_CLOCK_SKEW_MS) return;

    const existing = entries.get(relative);
    if (!existing || ts > existing.timestamp || RISK_RANK[risk] > RISK_RANK[existing.risk]) {
      entries.set(relative, {
        file: relative,
        timestamp: ts,
        age,
        risk,
        category,
        source,
        session: session || existing?.session || null,
      });
    }
  }

  const writeSet = readJson(SESSION_WRITES_PATH, { files: {} });
  for (const [file, value] of Object.entries(writeSet.files || {})) {
    const timestamp = typeof value === "object" && value !== null ? value.timestamp || value.time || value.ts : value;
    const session = typeof value === "object" && value !== null ? value.session : null;
    merge(file, timestamp, "session-write-set", session);
  }

  const ownership = readJson(OWNERSHIP_PATH, { files: {} });
  for (const [file, value] of Object.entries(ownership.files || {})) {
    const timestamp = typeof value === "object" && value !== null ? value.timestamp || value.time || value.ts : value;
    const session = typeof value === "object" && value !== null ? value.session : null;
    merge(file, timestamp, "session-file-ownership", session);
  }

  return [...entries.values()].sort((a, b) => b.timestamp - a.timestamp);
}

function latestBuildSignal() {
  const buildState = readJson(BUILD_CACHE_PATH, {});
  const health = readJson(HEALTH_REPORT_PATH, {});
  const history = Array.isArray(buildState.buildHistory) ? buildState.buildHistory : [];
  const latestHistory = history
    .map((record) => ({ time: toMs(record.time || record.timestamp), success: record.success !== false }))
    .filter((record) => record.time > 0)
    .sort((a, b) => b.time - a.time)[0];

  const candidates = [
    { source: "build-cache", time: toMs(buildState.lastBuildTime), success: latestHistory?.success ?? true },
    { source: "build-history", time: latestHistory?.time || 0, success: latestHistory?.success ?? true },
    { source: "health-report", time: toMs(health.timestamp || health.lastBuild), success: (health.tscErrors || health.buildErrors || 0) === 0 },
  ].filter((candidate) => candidate.time > 0);

  return candidates.sort((a, b) => b.time - a.time)[0] || { source: "none", time: 0, success: false };
}

function latestTestSignal() {
  const report = readJson(TEST_REPORT_PATH, {});
  const time = toMs(report.timestamp || report.lastRun || report.time);
  const failing = Number(report.failing || report.failed || report.failures || 0);
  return {
    source: time > 0 ? "test-report" : "none",
    time,
    success: time > 0 && failing === 0,
    failing,
  };
}

function signalStatus(signal) {
  if (!signal.time) return "missing";
  if (signal.success) return "passing";
  if (signal.failing) return `${signal.failing} failing`;
  return "not passing";
}

function ageLabel(ms) {
  if (!ms || ms < 0) return "unknown";
  const minutes = Math.round(ms / 60_000);
  if (minutes < 1) return "under 1m";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  return `${hours}h`;
}

function buildFreshnessWarning() {
  const writes = collectWriteEntries();
  const highRisk = writes.filter((entry) => RISK_RANK[entry.risk] >= RISK_RANK.high);
  if (highRisk.length === 0) return null;

  const newestEdit = highRisk[0];
  const build = latestBuildSignal();
  const tests = latestTestSignal();
  const buildFresh = build.success && build.time >= newestEdit.timestamp && Date.now() - build.time <= FRESH_WINDOW_MS;
  const testsFresh = tests.success && tests.time >= newestEdit.timestamp && Date.now() - tests.time <= FRESH_WINDOW_MS;

  if (buildFresh && testsFresh) return null;

  const categorySummary = [...new Set(highRisk.map((entry) => entry.category))].slice(0, 6).join(", ");
  const files = highRisk.slice(0, 5).map((entry) => `   - ${entry.file} (${entry.risk}/${entry.category}, ${ageLabel(entry.age)} ago)`);
  const lines = [
    `BUILD/TEST FRESHNESS WARNING: ${highRisk.length} recent high-risk PRISM edit(s) detected (${categorySummary}).`,
    `Newest high-risk edit: ${newestEdit.file} (${ageLabel(Date.now() - newestEdit.timestamp)} ago).`,
    `Build signal: ${build.source}, ${build.time ? `${ageLabel(Date.now() - build.time)} ago` : "missing"}, ${signalStatus(build)}.`,
    `Test signal: ${tests.source}, ${tests.time ? `${ageLabel(Date.now() - tests.time)} ago` : "missing"}, ${signalStatus(tests)}.`,
    "Recommended closeout:",
  ];

  if (!buildFresh) {
    lines.push("   - cd H:/PRISM/mcp-server && npm run build");
  }
  if (!testsFresh) {
    lines.push("   - cd H:/PRISM/mcp-server && npx vitest run");
  }
  lines.push("Recent high-risk files:");
  lines.push(...files);

  return lines.join("\n");
}

const pending = readJson(PENDING_PATH, { engines: [], lastUpdated: null });
const goalStack = readJson(GOAL_STACK_PATH, { goals: [], completedToday: 0 });

const contextParts = [];

// Check for pending engines that weren't built
if (pending.engines?.length > 0) {
  const unbuilt = pending.engines.filter(e => !e.built);
  if (unbuilt.length > 0) {
    contextParts.push(`${unbuilt.length} pending engine(s) not built this session:`);
    unbuilt.slice(0, 3).forEach(e => contextParts.push(`   - ${e.name}`));
    if (unbuilt.length > 3) contextParts.push(`   ... and ${unbuilt.length - 3} more`);
  }
}

const freshnessWarning = buildFreshnessWarning();
if (freshnessWarning) {
  contextParts.push(freshnessWarning);
}

// Mark any in-progress goals as potentially complete (user can restart if not)
if (goalStack.goals?.[0]?.turns > 2) {
  goalStack.goals[0].status = "session_ended";
  goalStack.goals[0].endedAt = new Date().toISOString();
  goalStack.completedToday = (goalStack.completedToday || 0) + 1;

  try {
    writeAtomicSync(GOAL_STACK_PATH, JSON.stringify(goalStack, null, 2), { fsync: false });
  } catch { /* ignore write errors */ }
}

if (contextParts.length > 0) {
  console.log(JSON.stringify({
    continue: true,
    systemMessage: contextParts.join("\n\n"),
  }));
} else {
  console.log(JSON.stringify({ continue: true }));
}
