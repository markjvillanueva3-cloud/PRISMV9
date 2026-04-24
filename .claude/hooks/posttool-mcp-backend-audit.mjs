#!/usr/bin/env node
/**
 * posttool-mcp-backend-audit.mjs
 * ------------------------------
 * PostToolUse hook that runs the H-drive source-backed dev audit chain for
 * meaningful mcp-server backend edits and returns a compact summary.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

const CACHE_DIR = "H:/PRISM/.claude/cache";
const CACHE_FILE = join(CACHE_DIR, "mcp-backend-audit-cache.json");
const MCP_ROOT = "H:/PRISM/mcp-server";
const AUDIT_TIMEOUT_MS = 45000;
const COOLDOWN_MS = 90000;

function safeJsonParse(text, fallback) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function normalize(value) {
  return String(value || "").replace(/\\/g, "/");
}

function isTargetFile(filePath) {
  return /^h:\/prism\/mcp-server\/src\/(?:engines|tools\/dispatchers|schemas|routes|hooks|services|utils)\/.+\.(?:ts|js)$/i.test(
    filePath,
  );
}

function loadCache() {
  if (!existsSync(CACHE_FILE)) return {};
  return safeJsonParse(readFileSync(CACHE_FILE, "utf8"), {});
}

function saveCache(cache) {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

function summarize(report) {
  const smoke = report?.steps?.test_smoke?.total_tests ?? 0;
  const wiringGaps = report?.steps?.auto_wiring_analyze?.gaps ?? 0;
  const schemaCoverage = report?.steps?.schema_gap_scan?.schema_coverage ?? 0;
  const systemQ = report?.steps?.quality_dashboard?.system_Q ?? 0;
  const buildGuard = report?.steps?.build_guard_chain?.overall_status ?? "unknown";
  const firstRecommendation =
    report?.steps?.build_guard_chain?.recommendations?.[0] ||
    report?.steps?.auto_wiring_analyze?.gap_details?.[0]?.reason ||
    "";

  const parts = [
    `MCP backend audit: smoke=${smoke}`,
    `wiring_gaps=${wiringGaps}`,
    `schema=${schemaCoverage}%`,
    `Q=${systemQ}`,
    `guard=${buildGuard}`,
  ];
  if (firstRecommendation) parts.push(`next=${firstRecommendation}`);
  return parts.join(" | ");
}

const input = safeJsonParse(readFileSync(0, "utf8"), {});
const toolName = input.tool_name || input.toolName || "";
const toolInput = input.tool_input || input.input || {};

if (!["Edit", "Write", "MultiEdit"].includes(toolName)) {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

const filePath = normalize(toolInput.file_path || toolInput.filePath || "");
if (!isTargetFile(filePath)) {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

const cache = loadCache();
const lastRunAt = Number(cache[filePath]?.ts || 0);
if (Date.now() - lastRunAt < COOLDOWN_MS) {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

const result =
  process.platform === "win32"
    ? spawnSync(
        process.env.ComSpec || "cmd.exe",
        ["/d", "/s", "/c", `npx tsx .\\scripts\\run-dev-audit-chain.ts --edited-file "${filePath}"`],
        {
          cwd: MCP_ROOT,
          encoding: "utf8",
          timeout: AUDIT_TIMEOUT_MS,
          windowsHide: true,
        },
      )
    : spawnSync("npx", ["tsx", "./scripts/run-dev-audit-chain.ts", "--edited-file", filePath], {
        cwd: MCP_ROOT,
        encoding: "utf8",
        timeout: AUDIT_TIMEOUT_MS,
        windowsHide: true,
      });

cache[filePath] = { ts: Date.now() };
saveCache(cache);

if (result.status !== 0) {
  const errorText = String(result.error?.message || result.stderr || result.stdout || "").trim();
  console.log(
    JSON.stringify({ continue: true, hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: `MCP backend audit failed for ${filePath } }: ${errorText.slice(0, 280)}`,
    }),
  );
  process.exit(0);
}

const report = safeJsonParse(result.stdout || "{}", null);
if (!report) {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

console.log(
  JSON.stringify({ continue: true, hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: summarize(report), } }),
);
