#!/usr/bin/env node
/**
 * prism-ai-memo-cross-ref-audit.mjs — producer audit for the prism-ai ⇄
 * obsidian-memo cross-reference substrate.
 *
 * Iter 13 of the /goal synergize loop (echo, 2026-05-21). Producer-only ship
 * (consumer SessionStart digest deferred to iter 14, /system-viz roost
 * deferred to iter 15; pattern mirrors iter-7 wiki-tribal producer).
 *
 * New substrate: which of the 7 PRISM*Engine.ts files (the "prism-ai
 * engines": SelfAwareness, CreativeReasoning, NeuralKnowledgeSynthesis,
 * UnifiedOrchestrator, LoRAAdapter, VerificationPlugin, ContextInjector)
 * are referenced in the 860-file memory vault? An engine with zero memo
 * coverage is a knowledge-vault blind spot — the operator's brain has no
 * notes about that engine's behavior, decisions, or known failure modes.
 *
 * The audit is bidirectional in spirit but unidirectional in mechanics:
 * we walk engines (small set) and for each, count how many memos contain
 * its name as a substring. Engines with zero references are "missing
 * memo coverage". The inverse (memos that reference dead/renamed engines)
 * is left for iter 17's handoff-hygiene cross-check (a deliberate
 * separation to keep the iter-13 producer scope tight).
 *
 * Match rule: case-sensitive substring of the engine class name in the
 * memo content. This is deliberately permissive — a memo that mentions
 * `prismCreativeReasoningEngine.explore(...)` matches `CreativeReasoning`
 * via the parent class name when computed from the file basename
 * (`PRISMCreativeReasoningEngine`). The producer reports BOTH the strict
 * class-name match count AND a lenient substring match count for each
 * engine; consumers + viz can choose which signal to surface.
 *
 * Pure-core / IO shell split:
 *   - listPrismAiEngines(engineDir)            pure: directory scan → engine names
 *   - walkMemoFiles(memoDir)                   pure: recursive .md walk → [{path,content}]
 *   - countEngineRefs(engineName, memos)       pure: refs per engine
 *   - audit(engines, memos)                    pure: aggregate to audit shape
 *   - main()                                   IO: glue
 *
 * Output: state/shared/.prism-ai-memo-cross-ref-audit.json
 * Schema:
 *   {
 *     schemaVersion: "1.0.0",
 *     generatedAt: ISO,
 *     stats: {engineCount, memoCount, missing, coverage},
 *     engines: [{name, strictCount, lenientCount, sampleMemos: [...]}, ...],
 *     missingFromMemos: [engineName, ...] // engines with strictCount === 0
 *   }
 *
 * Schema deliberately mirrors iter-7 wiki-tribal audit shape so future
 * meta-roost wiring (iter 15) can splice this substrate into
 * SUBSTRATE_TO_ROOST without consumer/viz contract drift.
 *
 * Usage:
 *   node scripts/prism-ai-memo-cross-ref-audit.mjs        # write report
 *   node scripts/prism-ai-memo-cross-ref-audit.mjs --json # stdout (no write)
 * Exit: 0 ok (any/all corpora may be empty — emit empty audit) · 2 runtime error
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");
export const SCHEMA_VERSION = "1.0.0";

const ENGINE_DIR = path.join(ROOT, "mcp-server/src/engines");
const MEMO_DIR = path.join(ROOT, "knowledge/memories");
const OUT_PATH = path.join(ROOT, "state/shared/.prism-ai-memo-cross-ref-audit.json");

/** Hard cap on sample memo paths reported per engine (digest cost cap). */
export const SAMPLE_MEMO_CAP = 5;
/** Hard cap on number of "missing" engine names included in the audit (digest cost cap). */
export const MAX_MISSING = 50;

/**
 * Pure: list the PRISM AI engine class names by scanning a directory.
 * Pattern: any file matching /^PRISM.*Engine\.ts$/ (case-sensitive — these
 * are TypeScript class names where casing is contract-load-bearing).
 * Returns sorted array of class names without the .ts suffix.
 */
export function listPrismAiEngines(engineDir) {
  if (!engineDir || !fs.existsSync(engineDir)) return [];
  let entries;
  try { entries = fs.readdirSync(engineDir, { withFileTypes: true }); }
  catch { return []; }
  return entries
    .filter((e) => e.isFile() && /^PRISM.*Engine\.ts$/.test(e.name))
    .map((e) => e.name.replace(/\.ts$/, ""))
    .sort();
}

/**
 * Pure: recursively walk a directory for *.md files. Returns
 * [{path, content}] where path is relative to ROOT (stable across machines)
 * and content is the file's UTF-8 text. Unreadable files are silently
 * skipped (the audit is best-effort, not a permission verifier).
 */
export function walkMemoFiles(memoDir, rootForRelative = ROOT) {
  if (!memoDir || !fs.existsSync(memoDir)) return [];
  const out = [];
  function walk(dir) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch { return; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile() && e.name.endsWith(".md")) {
        try {
          const content = fs.readFileSync(full, "utf8");
          out.push({
            path: path.relative(rootForRelative, full).replace(/\\/g, "/"),
            content,
          });
        } catch { /* skip unreadable */ }
      }
    }
  }
  walk(memoDir);
  return out;
}

/**
 * Pure: count strict + lenient memo references for ONE engine.
 *
 * `strict` is the count of memos containing the full engine class name
 * (`PRISMCreativeReasoningEngine`). `lenient` is the count of memos
 * containing the engine's middle stem with the PRISM prefix + Engine
 * suffix stripped (`CreativeReasoning`) — catches camelCase invocations
 * like `prismCreativeReasoningEngine.explore(...)` AND wikilink-style
 * `[[creative-reasoning]]` style references (case-folded substring).
 *
 * Both counts always satisfy `strict <= lenient` because every strict
 * match also satisfies the lenient pattern; the audit reports both so
 * consumers can choose the appropriate signal (strict = "explicit class
 * reference", lenient = "any topical mention"). Mirrors the iter-7
 * design choice of reporting raw + normalized counts.
 */
export function countEngineRefs(engineName, memos) {
  const strictNeedle = engineName;
  // Strip PRISM prefix + Engine suffix to get the topical stem.
  // Example: "PRISMCreativeReasoningEngine" → "CreativeReasoning"
  const lenientNeedle = engineName.replace(/^PRISM/, "").replace(/Engine$/, "");
  let strict = 0;
  let lenient = 0;
  const sampleMemos = [];
  for (const memo of memos) {
    const c = memo.content;
    const strictHit = c.includes(strictNeedle);
    // Lenient hit is case-folded so `creativeReasoning` matches even though
    // the engine stem is PascalCase. Skipped when lenientNeedle is empty
    // (defensive: a future engine that doesn't fit the PRISM*Engine pattern
    // could yield an empty stem — don't count "every memo contains the
    // empty string" as a coverage hit).
    const lenientHit = lenientNeedle.length > 0 &&
      c.toLowerCase().includes(lenientNeedle.toLowerCase());
    if (strictHit) {
      strict++;
      if (sampleMemos.length < SAMPLE_MEMO_CAP) sampleMemos.push(memo.path);
    }
    if (lenientHit) lenient++;
  }
  return { strict, lenient, sampleMemos };
}

/**
 * Pure: build the audit aggregate from a list of engine names + a list of
 * walked memos. Missing list uses the STRICT count (strict===0 → missing)
 * because the operator's first concern is "explicit class reference in
 * memory" — lenient stem matches are mostly noise from prose mentions.
 *
 * Stats:
 *   engineCount, memoCount: corpus sizes (defensive against empty inputs)
 *   missing:                count of engines with strictCount === 0
 *   coverage:               (engineCount - missing) / engineCount, [0,1]
 *
 * Determinism: engines[] preserves the input order (callers should pass
 * sorted engine names); missingFromMemos[] preserves engine order.
 */
export function audit(engines, memos) {
  const safeEngines = Array.isArray(engines) ? engines : [];
  const safeMemos = Array.isArray(memos) ? memos : [];
  const total = safeEngines.length;

  const enginesAug = [];
  let missing = 0;
  const missingFromMemos = [];
  for (const name of safeEngines) {
    const r = countEngineRefs(name, safeMemos);
    enginesAug.push({
      name,
      strictCount: r.strict,
      lenientCount: r.lenient,
      sampleMemos: r.sampleMemos,
    });
    if (r.strict === 0) {
      missing++;
      if (missingFromMemos.length < MAX_MISSING) missingFromMemos.push(name);
    }
  }
  const coverage = total > 0 ? (total - missing) / total : 0;
  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    stats: {
      engineCount: total,
      memoCount: safeMemos.length,
      missing,
      coverage: Number(coverage.toFixed(4)),
    },
    engines: enginesAug,
    missingFromMemos,
  };
}

export function main(argv = []) {
  const json = argv.includes("--json");
  const engines = listPrismAiEngines(ENGINE_DIR);
  const memos = walkMemoFiles(MEMO_DIR);
  const payload = audit(engines, memos);
  if (json) { console.log(JSON.stringify(payload, null, 2)); return 0; }
  try {
    fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
    fs.writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2));
    console.log(`prism-ai-memo-cross-ref-audit: engines=${payload.stats.engineCount} memos=${payload.stats.memoCount} missing=${payload.stats.missing} coverage=${(payload.stats.coverage * 100).toFixed(1)}%`);
    for (const e of payload.engines) {
      console.log(`  ${e.name}: strict=${e.strictCount} lenient=${e.lenientCount}`);
    }
    console.log(`  wrote ${OUT_PATH}`);
    return 0;
  } catch (e) {
    console.error(`FATAL: write failed — ${e.message}`);
    return 2;
  }
}

const isMain = (() => {
  try { return process.argv[1] && path.normalize(fs.realpathSync(process.argv[1])) === path.normalize(fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (isMain) process.exit(main(process.argv.slice(2)));
