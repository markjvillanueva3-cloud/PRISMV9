#!/usr/bin/env node
// tier: T0
/**
 * physics-canonical-constants-guard.mjs — CAM-UIX-INFRA-00/U-PHYSCONST01
 *
 * PreToolUse(Write|Edit) hook that blocks ingestion engines from writing
 * to src/physics/constants.ts.
 *
 * PRINCIPLE: Physics constants are derived from peer-reviewed literature,
 * not from shop-floor observation or vendor documentation. JMDie's S&F
 * observations are empirical shop data (useful as baseline comparisons)
 * but NEVER authoritative physics.
 *
 * This hook ensures:
 *   - Ingestion pipelines cannot modify canonical Kienzle/Taylor constants
 *   - Shop-derived kc back-solves go to vendor_variants.shop_observed slot
 *   - Physics constants can only be updated via explicit physics-review process
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

const PROTECTED_PATHS = [
  "src/physics/constants.ts",
  "mcp-server/src/physics/constants.ts",
  "physics/constants.ts",
];

const INGESTION_CONTEXT_PATTERNS = [
  /ingest/i,
  /scrape/i,
  /crawl/i,
  /JMDie/i,
  /jm_die/i,
  /shop_observed/i,
  /empirical/i,
  /sample_reverse/i,
  /forum/i,
  /vendor_training/i,
  /CAMDoc/i,
  /CAMForum/i,
  /source_quality.*empirical/i,
];

const ALLOWED_PHYSICS_CONTEXTS = [
  /peer.?reviewed/i,
  /ISO\s*\d+/i,
  /DIN\s*\d+/i,
  /Merchant.*circle/i,
  /Shaw.*cutting/i,
  /literature.*citation/i,
  /canonical.*constant/i,
];

function log(level, msg) {
  const line = `[physics-canonical-constants-guard] ${level}: ${msg}`;
  (level === "ERROR" ? process.stderr : process.stdout).write(line + "\n");
}

function isProtectedPath(filePath) {
  const normalized = filePath.replace(/\\/g, "/").toLowerCase();
  return PROTECTED_PATHS.some((p) => normalized.endsWith(p.toLowerCase()));
}

function hasIngestionContext(content) {
  if (!content) return false;
  return INGESTION_CONTEXT_PATTERNS.some((re) => re.test(content));
}

function hasPhysicsContext(content) {
  if (!content) return false;
  return ALLOWED_PHYSICS_CONTEXTS.some((re) => re.test(content));
}

export default async function physicsCanonicalConstantsGuard({ tool, input }) {
  if (!["Write", "Edit", "MultiEdit"].includes(tool)) {
    return { continue: true };
  }

  const filePath = input?.file_path || "";

  if (!isProtectedPath(filePath)) {
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

  if (hasIngestionContext(content)) {
    log("ERROR", `BLOCKED: Attempt to write ingestion-derived data to canonical physics constants.`);
    log("ERROR", `Shop/vendor observations belong in vendor_variants.shop_observed, NOT in constants.ts`);
    return {
      continue: false,
      decision: "block",
      reason: `Physics constants (src/physics/constants.ts) are derived from peer-reviewed literature, not ingestion/shop data. JMDie observations go to vendor_variants.shop_observed slot, not canonical constants.`,
    };
  }

  if (hasPhysicsContext(content)) {
    return { continue: true };
  }

  log("WARN", `Write to constants.ts without clear physics context — proceeding with caution`);
  return { continue: true };
}

async function main() {
  const input = readStdinSafe();

  try {
    const data = JSON.parse(input);
    const result = await physicsCanonicalConstantsGuard({
      tool: data.tool_name,
      input: data.tool_input,
    });

    if (result.decision === "block") {
      console.error(result.reason);
      process.exit(2);
    }

    process.exit(0);
  } catch (e) {
    console.error(`[physics-canonical-constants-guard] parse error: ${e.message}`);
    process.exit(0);
  }
}

main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); });
