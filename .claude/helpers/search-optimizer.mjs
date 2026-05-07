/**
 * search-optimizer.mjs — PreToolUse hook for Glob/Grep
 *
 * Reference-First Protocol: Injects PRISM reference data into context
 * so Claude can make informed search decisions without wasting tokens.
 *
 * First broad search of a session: injects the full quick lookup table.
 * Subsequent broad searches: injects a brief reminder + pattern-specific hint.
 * Narrow searches: pattern-specific hints only.
 *
 * SEARCH CACHE: Detects duplicate searches within 60 seconds and warns.
 */
import process from "node:process";
import { promises as fs } from "node:fs";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import crypto from "node:crypto";

const SESSION_FLAG = join("H:/prism/.claude/cache", "ref-first-injected.flag");
const SEARCH_CACHE_FILE = join("H:/prism/.claude/cache", "search-cache.json");
const SESSION_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours
const SEARCH_CACHE_TTL_MS = 60 * 1000; // 60 seconds

// Parse stdin for hook input
let stdinInput = {};
try {
  const stdin = readFileSync(0, "utf-8").trim();
  if (stdin) stdinInput = JSON.parse(stdin);
} catch { /* No stdin */ }

// ─── Quick Lookup Table (~250 tokens) ────────────────────────────
// Static, zero IO. Gives Claude the system map directly.
const QUICK_LOOKUP = `STOP — READ DIGESTS FIRST (saves 10K+ tokens vs searching):
MANDATORY: Read the appropriate digest file BEFORE this search. If the digest answers your question, CANCEL this search.

DIGEST FILES (answer most questions without searching):
  ENGINE_DIGEST.md      → mcp-server/data/docs/ENGINE_DIGEST.md (1,304 engines, 1-line each)
  DISPATCHER_DIGEST.md  → mcp-server/data/docs/DISPATCHER_DIGEST.md (79 dispatchers + action counts)
  DIRECTORY_DIGEST.md   → mcp-server/data/docs/DIRECTORY_DIGEST.md (domain→path routing)
  MASTER_INDEX_COMPACT  → mcp-server/src/data/docs/MASTER_INDEX_COMPACT.md (system overview)

PATH LOOKUP (go directly, skip searching):
  Engines → mcp-server/src/engines/
  Dispatchers → mcp-server/src/tools/dispatchers/
  Registries → mcp-server/src/registries/ (24)
  Algorithms → mcp-server/src/algorithms/ (51)
  Physics → mcp-server/src/physics/constants.ts (CANONICAL)
  Tests → mcp-server/src/__tests__/
  Schemas → mcp-server/src/schemas/
  Hooks → mcp-server/src/hooks/
  Web UI → mcp-server/web/src/pages/
  Catalogs → mcp-server/src/data/
  Claude hooks → .claude/helpers/  |  Skills → .claude/skills/  |  Commands → .claude/commands/

DOMAIN ROUTING (pick the right path without searching):
  cutting/force/speed/feed → src/engines/*, src/algorithms/
  tool selection/catalog → src/data/ tool catalogs, src/registries/ToolCatalog*
  G-code/post-processor → src/engines/*PostProcess*, *GCode*
  machine profiles → src/data/machine-*-catalog*.ts
  material properties → src/registries/MaterialDatabase*, data/materials/
  quoting/costing → src/engines/*Cost*, *Quote*, *Economic*
  quality/SPC → src/engines/*Quality*, *Statistical*
  safety → src/engines/*Safety*, src/hooks/SafetyChain*
  thermal/wear → src/engines/*Thermal*, *Wear*, *Temperature*
  chatter/vibration → src/engines/*Chatter*, *Stability*, *Vibrat*
  deflection → src/engines/*Deflect*
  surface finish → src/engines/*Surface*, *Finish*, *Roughness*

WHEN TO USE: Digests answer WHERE/WHAT-EXISTS questions. For HOW/IMPLEMENTATION, use the digest to find the file path, then Read it directly.
ACTION: Read the appropriate digest file FIRST. Only Glob/Grep if the digest doesn't answer it.`;

// ─── Search Cache (duplicate detection) ─────────────────────────

function hashPattern(pattern, path) {
  return crypto.createHash("md5").update(`${pattern}|${path || ""}`).digest("hex");
}

async function readSearchCache() {
  try {
    const data = await fs.readFile(SEARCH_CACHE_FILE, "utf8");
    return JSON.parse(data);
  } catch {
    return { searches: [] };
  }
}

async function writeSearchCache(cache) {
  try {
    await fs.writeFile(SEARCH_CACHE_FILE, JSON.stringify(cache, null, 2), "utf8");
  } catch { /* non-critical */ }
}

async function checkDuplicateSearch(pattern, path) {
  const cache = await readSearchCache();
  const now = Date.now();
  const hash = hashPattern(pattern, path);

  // Clean expired entries
  cache.searches = cache.searches.filter(s => now - s.ts < SEARCH_CACHE_TTL_MS);

  // Check for duplicate
  const duplicate = cache.searches.find(s => s.hash === hash);
  if (duplicate) {
    const agoSec = Math.round((now - duplicate.ts) / 1000);
    return { isDuplicate: true, agoSec, pattern: duplicate.pattern };
  }

  // Record this search
  cache.searches.push({ hash, pattern, path: path || "", ts: now });
  // Keep max 50 entries
  if (cache.searches.length > 50) {
    cache.searches = cache.searches.slice(-50);
  }
  await writeSearchCache(cache);
  return { isDuplicate: false };
}

// ─── Helpers ─────────────────────────────────────────────────────

function printContext(additionalContext) {
  process.stdout.write(
    `${JSON.stringify(additionalContext ? { continue: true, hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext } } : { continue: true })}`,
  );
}

function normalizePath(inputPath) {
  if (!inputPath) return "";
  return inputPath.replaceAll("/", "\\").toLowerCase();
}

async function wasInjectedRecently() {
  try {
    const stat = await fs.stat(SESSION_FLAG);
    return Date.now() - stat.mtimeMs < SESSION_TTL_MS;
  } catch {
    return false;
  }
}

async function markInjected() {
  try {
    await fs.writeFile(SESSION_FLAG, new Date().toISOString(), "utf8");
  } catch {
    // non-critical — worst case we inject twice
  }
}

// ─── Pattern-Specific Hints ─────────────────────────────────────

function getPatternHint(pattern) {
  const value = pattern.toLowerCase();

  if (value.includes("dispatcher")) {
    return "READ mcp-server/data/docs/DISPATCHER_DIGEST.md — has every dispatcher name, domain, and action count.";
  }
  if (value.includes("engine")) {
    return "READ mcp-server/data/docs/ENGINE_DIGEST.md — has all 1,304 engines with 1-line descriptions.";
  }
  if (value.includes("registry") || value.includes("registr")) {
    return "Registries are in mcp-server/src/registries/ (24 total). Check DIRECTORY_DIGEST.md for the full list.";
  }
  if (value.includes("schema")) {
    return "Schemas are in mcp-server/src/schemas/. Check DIRECTORY_DIGEST.md for specific schema files.";
  }
  if (value.includes("hook")) {
    return "Hook scripts: .claude/helpers/. Hook config: .claude/settings.json. Safety hooks: mcp-server/src/hooks/.";
  }
  if (value.includes("test") || value.includes("spec")) {
    return "Tests in mcp-server/src/__tests__/. Narrow to the specific module's test file.";
  }
  if (value.includes("roadmap")) {
    return "Active roadmap: CAMX-RESTRUCTURED-ROADMAP-v24.md. Position: state/HANDOFF.md.";
  }
  if (value.includes("skill")) {
    return "Skills are in .claude/skills/. Commands are in .claude/commands/.";
  }
  if (value.includes("material") || value.includes("iso group")) {
    return "Materials: src/registries/MaterialDatabase*, data/materials/. 2,957 materials indexed.";
  }
  if (value.includes("tool") && !value.includes("toolpath")) {
    return "Tool catalogs: src/data/tool-*-catalog*.ts. Tool registry: src/registries/ToolCatalog*. 95K tools indexed.";
  }
  if (value.includes("machine") || value.includes("cnc")) {
    return "Machine profiles: src/data/machine-*-catalog*.ts. Machine registry: src/registries/Machine*. 910 machines.";
  }
  if (value.includes("constant") || value.includes("kienzle") || value.includes("taylor")) {
    return "Physics constants: mcp-server/src/physics/constants.ts — CANONICAL source. Never inline.";
  }

  return null;
}

// ─── Main ────────────────────────────────────────────────────────

async function main() {
  const toolInput = stdinInput.tool_input || {};
  const pattern = (toolInput.pattern || process.env.TOOL_INPUT_pattern || "").trim();
  const toolPath = normalizePath(toolInput.path || process.env.TOOL_INPUT_path || "");

  if (!pattern) {
    printContext(null);
    return;
  }

  // Check for duplicate search within TTL
  const dupCheck = await checkDuplicateSearch(pattern, toolPath);
  if (dupCheck.isDuplicate) {
    printContext(
      `⚠️ DUPLICATE SEARCH: "${dupCheck.pattern}" was searched ${dupCheck.agoSec}s ago. Consider using the previous result or narrowing your search.`
    );
    return;
  }

  const isBroadSearch =
    !toolPath ||
    toolPath === "\\" ||
    toolPath === "." ||
    toolPath === "h:\\prism" ||
    toolPath === "h:/prism" ||
    toolPath.startsWith("h:\\prism\\") ||
    toolPath.startsWith("h:/prism/");

  if (isBroadSearch) {
    const alreadyInjected = await wasInjectedRecently();
    if (!alreadyInjected) {
      // First broad search this session — inject full reference map
      await markInjected();
      const patternHint = getPatternHint(pattern);
      const hint = patternHint
        ? `${QUICK_LOOKUP}\n\nFOR THIS SEARCH: ${patternHint}`
        : QUICK_LOOKUP;
      printContext(hint);
      return;
    }
    // Subsequent broad searches — brief reminder + specific hint
    const patternHint = getPatternHint(pattern);
    printContext(
      patternHint ||
        "REMINDER: Check digest files (ENGINE_DIGEST.md, DISPATCHER_DIGEST.md, DIRECTORY_DIGEST.md) before broad search. Narrow to mcp-server/src/ to avoid node_modules/dist.",
    );
    return;
  }

  // Narrow search — only pattern-specific hint
  const patternHint = getPatternHint(pattern);
  printContext(patternHint);
}

main().catch(() => {
  printContext(null);
});
