#!/usr/bin/env node
// tier: T0
/**
 * jm-die-provenance-guard.mjs — CAM-UIX-INFRA-00/U-JMDP01 guard hook
 *
 * PostToolUse(Write|Edit) hook that enforces provenance tagging on JM Die
 * program ingestion records. Per CAM-UIX-MS0 jm_die_training_data_policy:
 *
 * JM Die's 24,545 programs are REAL-WORLD SHOP PROGRAMS — they are NOT
 * optimized. They represent empirical shop reality, not physics-optimal.
 *
 * When a Write targets data/ingestion_cache/** and the content references
 * JM DIE source paths (H:/prism/JM DIE/ or resources/.../JMDie/):
 *
 *   1. VALIDATE: source_quality MUST be 'empirical_shop_reality_unoptimized'
 *   2. REJECT: if source_quality claims 'vendor_published_recommended' or
 *      'physics_derived_canonical' when sourced from JMDie — these are LIES
 *   3. LOG: emit to data/state/jm_die_provenance_audit.ndjson
 *
 * This hook does NOT auto-inject fields (that's the engine's job). It only
 * validates that records claiming JMDie provenance have correct tags.
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

const INGESTION_CACHE_REL = "mcp-server/data/ingestion_cache";
const AUDIT_LOG_PATH = "H:/prism/mcp-server/data/state/jm_die_provenance_audit.ndjson";

const JMDIE_SOURCE_PATTERNS = [
  /H:[/\\]prism[/\\]JM DIE[/\\]/i,
  /H:[/\\]PRISM[/\\]JM DIE[/\\]/i,
  /JM[\s_-]?DIE/i,
  /resources[/\\].*[/\\]JMDie[/\\]/i,
  /jm_die_program/i,
  /jmdie/i,
];

const VALID_SOURCE_QUALITY_FOR_JMDIE = "empirical_shop_reality_unoptimized";
const INVALID_CLAIMS = [
  "vendor_published_recommended",
  "physics_derived_canonical",
  "benchmark_competition",
  "ground_truth_labeled",
];

function log(level, msg) {
  const ts = new Date().toISOString();
  const line = `[jm-die-provenance-guard] ${level}: ${msg}`;
  (level === "ERROR" ? process.stderr : process.stdout).write(line + "\n");
}

function auditLog(record) {
  try {
    const dir = path.dirname(AUDIT_LOG_PATH);
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(AUDIT_LOG_PATH, JSON.stringify(record) + "\n", "utf8");
  } catch {
    // non-fatal
  }
}

function isIngestionCachePath(filePath) {
  if (!filePath) return false;
  const normalized = filePath.replace(/\\/g, "/").toLowerCase();
  return normalized.includes(INGESTION_CACHE_REL.toLowerCase()) ||
         normalized.includes("ingestion_cache") ||
         normalized.includes("ingestion-cache");
}

function referencesJmDie(content) {
  if (!content) return false;
  return JMDIE_SOURCE_PATTERNS.some((re) => re.test(content));
}

function extractSourceQuality(content) {
  const match = content.match(/"source_quality"\s*:\s*"([^"]+)"/);
  return match ? match[1] : null;
}

function extractSourcePaths(content) {
  const paths = [];
  const regex = /"source(?:_path|Path|_file|File|_url|Url)?"\s*:\s*"([^"]+)"/g;
  let m;
  while ((m = regex.exec(content)) !== null) {
    paths.push(m[1]);
  }
  return paths;
}

function pathIsJmDie(p) {
  return JMDIE_SOURCE_PATTERNS.some((re) => re.test(p));
}

function validateIngestionContent(content, filePath) {
  const errors = [];
  const warnings = [];

  const sourceQuality = extractSourceQuality(content);
  const sourcePaths = extractSourcePaths(content);
  const hasJmDieRef = referencesJmDie(content);
  const hasJmDiePath = sourcePaths.some(pathIsJmDie);

  if (hasJmDieRef || hasJmDiePath) {
    if (!sourceQuality) {
      warnings.push(`JMDie-sourced record missing source_quality field — should be '${VALID_SOURCE_QUALITY_FOR_JMDIE}'`);
    } else if (sourceQuality !== VALID_SOURCE_QUALITY_FOR_JMDIE) {
      if (INVALID_CLAIMS.includes(sourceQuality)) {
        errors.push(
          `PROVENANCE VIOLATION: JMDie-sourced record claims source_quality='${sourceQuality}' — ` +
          `JMDie programs are empirical shop reality, not ${sourceQuality}. ` +
          `MUST use '${VALID_SOURCE_QUALITY_FOR_JMDIE}'.`
        );
      } else {
        warnings.push(`JMDie-sourced record has unexpected source_quality='${sourceQuality}' — expected '${VALID_SOURCE_QUALITY_FOR_JMDIE}'`);
      }
    }

    const hasOptimizationStatus = content.includes('"optimization_status"');
    if (!hasOptimizationStatus) {
      warnings.push("JMDie-sourced record missing optimization_status — should be 'unoptimized_shop_baseline'");
    }
  }

  return { errors, warnings, hasJmDieRef: hasJmDieRef || hasJmDiePath, sourceQuality };
}

export default async function jmDieProvenanceGuard({ tool, input, result }) {
  if (!["Write", "Edit", "MultiEdit"].includes(tool)) {
    return { continue: true };
  }

  const filePath = input?.file_path || "";
  if (!isIngestionCachePath(filePath)) {
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

  if (!content) {
    return { continue: true };
  }

  const { errors, warnings, hasJmDieRef, sourceQuality } = validateIngestionContent(content, filePath);

  if (hasJmDieRef) {
    auditLog({
      timestamp: new Date().toISOString(),
      file_path: filePath,
      tool,
      has_jmdie_ref: hasJmDieRef,
      source_quality_found: sourceQuality,
      valid: errors.length === 0,
      errors,
      warnings,
    });
  }

  if (errors.length > 0) {
    log("ERROR", errors.join("; "));
    return {
      continue: false,
      decision: "block",
      reason: `JM Die provenance violation: ${errors.join("; ")}`,
    };
  }

  if (warnings.length > 0) {
    log("WARN", warnings.join("; "));
  }

  return { continue: true };
}

async function main() {
  const input = readStdinSafe();

  try {
    const data = JSON.parse(input);
    const result = await jmDieProvenanceGuard({
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
    console.error(`[jm-die-provenance-guard] parse error: ${e.message}`);
    process.exit(0);
  }
}

main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); });
