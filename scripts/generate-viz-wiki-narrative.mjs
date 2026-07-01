#!/usr/bin/env node
/**
 * generate-viz-wiki-narrative.mjs -- OLLAMA-SYNERGY backlog #1 (sierra).
 *
 * Flag-gated post-pass that enriches the viz->wiki entries
 * (knowledge/wiki/architecture/{layer,domain,dispatcher}-*.md -- otherwise 100%
 * procedural field-dumps) with a 1-2 sentence LOCAL-LLM "what/why" narrative.
 * Runs in the regen-wiki-from-viz chain AFTER the 3 field-dump generators, so the
 * narrative lands before crosslinks/leaf-index pick it up (recall-searchable).
 *
 * Design (the verified-safe choices):
 *  - FLAG-GATED off by default (PRISM_VIZ_WIKI_NARRATIVE=1 to enable) so the
 *    every-commit regen hot path is UNCHANGED unless explicitly turned on.
 *  - $0-Claude: reuses generateBlurb (contextual-blurb.mjs) -> gpt-oss:20b local.
 *  - IDEMPOTENT + fail-soft: injectNarrative (viz-wiki-narrative.mjs) replaces the
 *    marker block in place; a null blurb (Ollama down/timeout) leaves the entry
 *    untouched. Content-hash cache skips unchanged entries on re-runs.
 *  - Ollama-DOWN guard: a single upfront /api/tags probe; if down, no-op exit 0
 *    (never spins 135 fetches).
 *
 * Flags: --dry-run (count only, no write).
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateBlurb, loadBlurbCache, saveBlurbCache } from "./lib/contextual-blurb.mjs";
import { extractContent, injectNarrative, contentHash } from "./lib/viz-wiki-narrative.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRISM_ROOT = resolve(__dirname, "..");
// Dir + cache are overridable for hermetic validation/testing; default to prod paths.
const WIKI_ARCH_DIR = process.env.PRISM_VIZ_WIKI_NARRATIVE_DIR
  ? resolve(process.env.PRISM_VIZ_WIKI_NARRATIVE_DIR)
  : resolve(PRISM_ROOT, "knowledge/wiki/architecture");
const CACHE_PATH = process.env.PRISM_VIZ_WIKI_NARRATIVE_CACHE
  ? resolve(process.env.PRISM_VIZ_WIKI_NARRATIVE_CACHE)
  : resolve(PRISM_ROOT, "state/shared/system-viz/.viz-wiki-narrative-cache.json");
const OLLAMA_URL = process.env.PRISM_OLLAMA_URL || process.env.OLLAMA_URL || "http://127.0.0.1:11434";
// qwen2.5-coder:32b (generateBlurb's own default): VALIDATED warm ~1.25s with a clean
// situating blurb. gpt-oss:20b was rejected live -- it returns an empty `.response`
// (harmony/thinking format) + ~38s cold-load > generateBlurb's 30s timeout -> null.
const MODEL = process.env.PRISM_VIZ_WIKI_NARRATIVE_MODEL || "qwen2.5-coder:32b";
const ENTRY_RE = /^(layer|domain|dispatcher)-.+\.md$/;
// Exclude entries that a LATER generator fully overwrites (no AUTO-marker preserve),
// which would wipe an injected narrative every run -- wasted call + unstable entry.
// layer-stack-overview.md is rewritten wholesale by generate-layer-stack-overview.mjs.
const EXCLUDE = new Set(["layer-stack-overview.md"]);

const DRY_RUN = process.argv.slice(2).includes("--dry-run");
const ENABLED = process.env.PRISM_VIZ_WIKI_NARRATIVE === "1";

function log(s) { process.stdout.write(s + "\n"); }

// Cheap upfront liveness probe so a down daemon is a fast no-op, not 135 fetches.
async function ollamaUp() {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2000);
    const res = await fetch(`${OLLAMA_URL.replace(/\/$/, "")}/api/tags`, { signal: ctrl.signal });
    clearTimeout(t);
    return res.ok;
  } catch { return false; }
}

async function main() {
  if (!ENABLED) {
    log("[viz-wiki-narrative] disabled (set PRISM_VIZ_WIKI_NARRATIVE=1 to enable) -- no-op");
    return;
  }
  if (!existsSync(WIKI_ARCH_DIR)) {
    log(`[viz-wiki-narrative] no wiki arch dir (${WIKI_ARCH_DIR}) -- no-op`);
    return;
  }
  if (!(await ollamaUp())) {
    log(`[viz-wiki-narrative] Ollama unreachable at ${OLLAMA_URL} -- skipped (entries left untouched)`);
    return;
  }

  const files = readdirSync(WIKI_ARCH_DIR).filter((f) => ENTRY_RE.test(f) && !EXCLUDE.has(f)).sort();
  const cache = loadBlurbCache(CACHE_PATH);
  if (!cache.entries) cache.entries = {};

  let enriched = 0, cached = 0, skipped = 0, unchanged = 0, wouldEnrich = 0, dirtyCache = false;
  for (const f of files) {
    const p = join(WIKI_ARCH_DIR, f);
    let md;
    try { md = readFileSync(p, "utf8"); } catch { skipped++; continue; }
    const content = extractContent(md);
    if (!content) { skipped++; continue; }
    const hash = contentHash(content);

    let blurb = null;
    const hit = cache.entries[f];
    if (hit && hit.hash === hash && typeof hit.blurb === "string" && hit.blurb) {
      blurb = hit.blurb;
      cached++;
    } else if (DRY_RUN) {
      // dry-run is count-only -- never call Ollama or write (sibling-generator convention).
      wouldEnrich++;
      continue;
    } else {
      blurb = await generateBlurb(content, { model: MODEL, maxContentChars: 4000 });
      if (blurb) {
        cache.entries[f] = { hash, blurb };
        dirtyCache = true;
        enriched++;
      } else {
        // Ollama returned null mid-run (timeout/blank) -- leave this entry alone.
        skipped++;
        continue;
      }
    }

    const next = injectNarrative(md, blurb);
    if (next !== md) {
      if (!DRY_RUN) { try { writeFileSync(p, next, "utf8"); } catch { skipped++; continue; } }
    } else {
      unchanged++;
    }
  }

  if (dirtyCache && !DRY_RUN) saveBlurbCache(CACHE_PATH, cache);
  log(`[viz-wiki-narrative] ${DRY_RUN ? "(dry-run) " : ""}files=${files.length} enriched=${enriched} would-enrich=${wouldEnrich} cache-hit=${cached} unchanged=${unchanged} skipped=${skipped} model=${MODEL}`);
}

main().catch((e) => { process.stderr.write(`[viz-wiki-narrative] ${e && e.message}\n`); });
