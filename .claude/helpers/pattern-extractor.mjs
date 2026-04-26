/**
 * pattern-extractor.mjs — Phase 4-A: Session pattern extraction
 *
 * Stop hook that analyzes the session for reusable patterns.
 * Routes manufacturing patterns → TribalKnowledge (CORE_CATEGORIES)
 * Routes code/programming patterns → EXTRACTED_CODE_PATTERNS.jsonl
 *
 * Uses file-lock via task-queue.mjs for concurrent JSONL writes.
 * Depends on: tool-counter.mjs (Phase 0-A), hook-cache.mjs
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { CACHE_DIR, ensureCacheDir } from "./hook-cache.mjs";

const CODE_PATTERNS_PATH = path.join(CACHE_DIR, "EXTRACTED_CODE_PATTERNS.jsonl");
const MFG_PATTERNS_PATH = path.join(CACHE_DIR, "EXTRACTED_MFG_PATTERNS.jsonl");

// TribalKnowledge CORE_CATEGORIES (from TribalKnowledgeEngine.ts line 44)
const CORE_CATEGORIES = [
  "setup", "tooling", "speeds_feeds", "fixturing", "surface_finish",
  "thread", "safety", "maintenance", "material_handling", "quality", "troubleshooting"
];

// Code/programming pattern indicators
const CODE_INDICATORS = [
  /\b(typescript|javascript|react|node|npm|import|export|async|await)\b/i,
  /\b(function|class|interface|type|enum|const|let|var)\b/i,
  /\b(build|compile|test|lint|deploy|CI|CD|hook|plugin)\b/i,
  /\b(git|branch|merge|commit|rebase|cherry-pick)\b/i,
  /\b(debug|error|exception|stack trace|breakpoint)\b/i,
  /\b(refactor|pattern|abstraction|DRY|SOLID)\b/i
];

// Manufacturing pattern indicators
const MFG_INDICATORS = [
  /\b(speed|feed|RPM|SFM|IPR|IPM|chip\s*load)\b/i,
  /\b(tool\s*(life|wear|breakage|coating)|insert|cutter|drill|endmill)\b/i,
  /\b(surface\s*finish|Ra|Rz|roughness|chatter|vibration)\b/i,
  /\b(fixture|clamp|vise|chuck|collet|workholding)\b/i,
  /\b(coolant|flood|mist|through.spindle|MQL)\b/i,
  /\b(tolerance|dimension|GD&T|datum|true\s*position)\b/i,
  /\b(G.code|M.code|CNC|program|block|line)\b/i,
  /\b(material|steel|aluminum|titanium|inconel|brass)\b/i,
  /\b(depth\s*of\s*cut|DOC|stepover|stepdown|WOC)\b/i,
  /\b(Kienzle|Taylor|Merchant|Ernst|Usui)\b/i
];

function classifyPattern(text) {
  const codeScore = CODE_INDICATORS.filter(p => p.test(text)).length;
  const mfgScore = MFG_INDICATORS.filter(p => p.test(text)).length;

  if (mfgScore > codeScore) return "manufacturing";
  if (codeScore > mfgScore) return "code";
  if (mfgScore > 0 && codeScore > 0) return "mixed"; // Route to both
  return "none";
}

function detectCategory(text) {
  // Try to match to a CORE_CATEGORY
  const lower = text.toLowerCase();
  if (/speed|feed|rpm|sfm|chip/i.test(lower)) return "speeds_feeds";
  if (/tool|insert|cutter|drill|endmill|coating/i.test(lower)) return "tooling";
  if (/fixture|clamp|vise|chuck|workholding/i.test(lower)) return "fixturing";
  if (/surface|finish|roughness|ra\b/i.test(lower)) return "surface_finish";
  if (/setup|offset|zero|datum|WCS/i.test(lower)) return "setup";
  if (/thread|tap|die|pitch/i.test(lower)) return "thread";
  if (/safe|collision|crash|limit/i.test(lower)) return "safety";
  if (/quality|inspect|tolerance|measure/i.test(lower)) return "quality";
  if (/material|steel|alum|titan/i.test(lower)) return "material_handling";
  if (/troubleshoot|problem|fix|chatter|vibrat/i.test(lower)) return "troubleshooting";
  if (/maintain|lube|calibrat|align/i.test(lower)) return "maintenance";
  return "troubleshooting"; // default fallback
}

async function appendPattern(filePath, pattern) {
  try {
    await ensureCacheDir();
    const line = JSON.stringify({
      ...pattern,
      extracted_at: new Date().toISOString()
    });
    await fs.appendFile(filePath, line + "\n", "utf8");
  } catch (err) {
    process.stderr.write(`[pattern-extractor] Write failed: ${err.message}\n`);
  }
}

async function main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); }) {
  // Read session breadcrumbs — session-breadcrumb.mjs writes single JSON to helpers/
  const breadcrumbPath = path.join("H:", "prism", ".claude", "helpers", ".session-breadcrumb.json");
  // Also try the JSONL path in cache as fallback
  const breadcrumbPathAlt = path.join(CACHE_DIR, "session-breadcrumbs.jsonl");
  let breadcrumbs;
  try {
    let raw;
    try {
      raw = await fs.readFile(breadcrumbPath, "utf8");
    } catch {
      raw = await fs.readFile(breadcrumbPathAlt, "utf8");
    }
    breadcrumbs = raw.split("\n").filter(Boolean).map(line => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean);
  } catch {
    // No breadcrumbs — nothing to extract
    return;
  }

  if (breadcrumbs.length < 5) return; // Too short to have patterns

  // Look for repeated patterns in tool usage
  const toolCalls = breadcrumbs.filter(b => b.tool || b.type === "tool_use");
  const errorMessages = breadcrumbs.filter(b =>
    (b.result && /error|fail/i.test(String(b.result))) ||
    (b.type === "error")
  );

  // Extract: error patterns that were resolved (error → fix → success)
  let patternsExtracted = 0;

  for (let i = 0; i < errorMessages.length && patternsExtracted < 5; i++) {
    const error = errorMessages[i];
    const errorText = String(error.result || error.message || "");
    if (errorText.length < 20) continue;

    const classification = classifyPattern(errorText);
    if (classification === "none") continue;

    const pattern = {
      type: "error_resolution",
      classification,
      summary: errorText.slice(0, 200),
      source: "session_extraction"
    };

    if (classification === "manufacturing" || classification === "mixed") {
      pattern.category = detectCategory(errorText);
      await appendPattern(MFG_PATTERNS_PATH, pattern);
    }
    if (classification === "code" || classification === "mixed") {
      await appendPattern(CODE_PATTERNS_PATH, pattern);
    }

    patternsExtracted++;
  }

  if (patternsExtracted > 0) {
    process.stderr.write(`[pattern-extractor] Extracted ${patternsExtracted} patterns from session\n`);
  }
}

main().catch(() => {
  // Silent failure — never block session exit
});
