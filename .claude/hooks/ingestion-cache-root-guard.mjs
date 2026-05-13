#!/usr/bin/env node
// tier: T0
/**
 * ingestion-cache-root-guard.mjs — CAM-UIX-INFRA-00/U-CACHEROOT01
 *
 * PostToolUse(Write|Edit) hook that enforces all ingestion-related writes
 * go to data/ingestion_cache/, not scattered across the codebase.
 *
 * Ingestion files include:
 *   - Scraped content (HTML, JSON, XML)
 *   - Extracted tips and parameters
 *   - Checkpoints and cursors
 *   - Quarantined invalid records
 *   - Rate limit state
 *   - Transcripts
 *
 * This prevents:
 *   - Accidental pollution of src/ with scraped data
 *   - Ingestion writes to data/state/ (reserved for curated state)
 *   - Scattered cache files making cleanup difficult
 */
import * as fs from "node:fs";
import * as path from "node:path";

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

const ALLOWED_INGESTION_ROOTS = [
  "mcp-server/data/ingestion_cache",
  "data/ingestion_cache",
];

const INGESTION_CONTENT_PATTERNS = [
  /ingest/i,
  /scrape/i,
  /crawl/i,
  /fetch.*content/i,
  /"source_url"\s*:/,
  /"fetched_at"\s*:/,
  /"crawl_session"/,
  /"ingest_run_id"/,
  /CAMDocScrape/,
  /CAMForum/,
  /CAMTradePress/,
  /CAMCertCurriculum/,
  /CAMSdk/,
  /CAMPostLibrary/,
  /CAMSampleReverse/,
  /CAMPatent/,
  /CAMStandards/,
  /CAMSocialEvent/,
  /CAMVendorTraining/,
];

const EXCLUDED_PATHS = [
  /\.claude\/hooks\//,
  /\.claude\/helpers\//,
  /src\/engines\//,
  /src\/__tests__\//,
  /scripts\//,
  /data\/milestones\//,  // Milestone envelopes may reference ingestion engines
  /roadmap-index\.json$/,  // Roadmap index references milestones
  /\.md$/,
  /\.ts$/,
  /\.mjs$/,
  /settings\.json$/,
];

function log(level, msg) {
  const line = `[ingestion-cache-root-guard] ${level}: ${msg}`;
  (level === "ERROR" ? process.stderr : process.stdout).write(line + "\n");
}

function isIngestionContent(content) {
  if (!content) return false;
  return INGESTION_CONTENT_PATTERNS.some((re) => re.test(content));
}

function isAllowedIngestionPath(filePath) {
  const normalized = filePath.replace(/\\/g, "/").toLowerCase();
  return ALLOWED_INGESTION_ROOTS.some((root) =>
    normalized.includes(root.toLowerCase())
  );
}

function isExcludedPath(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  return EXCLUDED_PATHS.some((re) => re.test(normalized));
}

function isDataStateWrite(filePath) {
  const normalized = filePath.replace(/\\/g, "/").toLowerCase();
  return (
    (normalized.includes("data/state") || normalized.includes("mcp-server/data/state")) &&
    !normalized.includes("ingestion_cache")
  );
}

export default async function ingestionCacheRootGuard({ tool, input, result }) {
  if (!["Write", "Edit", "MultiEdit"].includes(tool)) {
    return { continue: true };
  }

  const filePath = input?.file_path || "";

  if (isExcludedPath(filePath)) {
    return { continue: true };
  }

  let content = "";
  if (tool === "Write") {
    content = input?.content || "";
  } else if (tool === "Edit" || tool === "MultiEdit") {
    content = input?.new_string || "";
    if (Array.isArray(input?.edits)) {
      content = input.edits.map((e) => e.new_string || "").join("\n");
    }
  }

  if (!isIngestionContent(content)) {
    return { continue: true };
  }

  if (isAllowedIngestionPath(filePath)) {
    return { continue: true };
  }

  if (isDataStateWrite(filePath)) {
    log("ERROR", `Ingestion content cannot be written to data/state/ — use data/ingestion_cache/ instead. Path: ${filePath}`);
    return {
      continue: false,
      decision: "block",
      reason: `Ingestion content must go to data/ingestion_cache/, not data/state/. File: ${filePath}`,
    };
  }

  log("ERROR", `Ingestion content must be written to data/ingestion_cache/. Invalid path: ${filePath}`);
  return {
    continue: false,
    decision: "block",
    reason: `Ingestion content scattered outside data/ingestion_cache/. Move to: mcp-server/data/ingestion_cache/. Current path: ${filePath}`,
  };
}

async function main() {
  const input = readStdinSafe();

  try {
    const data = JSON.parse(input);
    const result = await ingestionCacheRootGuard({
      tool: data.tool_name,
      input: data.tool_input,
      result: data.tool_result,
    });

    if (result.decision === "block") {
      console.error(result.reason);
      process.exit(2);
    }

    process.exit(0);
  } catch (e) {
    console.error(`[ingestion-cache-root-guard] parse error: ${e.message}`);
    process.exit(0);
  }
}

main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); });
