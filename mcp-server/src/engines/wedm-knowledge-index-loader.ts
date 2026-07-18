/**
 * wedm-knowledge-index-loader — runtime wiring for WEDMKnowledgeIndexEngine.
 *
 * Keeps the engine PURE (entries injected) by doing the I/O here: it imports the
 * canonical tribal tips (`wedm-knowledge-tips.ts`) and reads the generated wiki
 * corpus (`WEDM_WIKI_KNOWLEDGE.json`, produced by
 * scripts/build-wedm-knowledge-index.mjs), then compiles them into one unified
 * index. The dispatcher resolves this cached singleton for the
 * `wedm_knowledge_index_*` actions. If the wiki JSON is absent the index
 * degrades to tribal-only (fail-soft) — never throws on a missing build artifact.
 *
 * slot:mike (Wire Wizard) — galaxy:wedm.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { WEDMKnowledgeIndexEngine, type RawTribalTip, type RawWikiDoc } from "./WEDMKnowledgeIndexEngine.js";
import { WEDM_KNOWLEDGE_TIPS } from "../data/wedm-knowledge-tips.js";

// Resolve relative to THIS module so the lookup never depends on process cwd
// (src/engines under vitest AND dist/engines at runtime both reach mcp-server/data/state).
// PRISM_ROOT overrides for out-of-tree tooling.
const HERE = dirname(fileURLToPath(import.meta.url));
const WIKI_JSON = process.env.PRISM_ROOT
  ? join(process.env.PRISM_ROOT, "mcp-server/data/state/WEDM_WIKI_KNOWLEDGE.json")
  : join(HERE, "..", "..", "data", "state", "WEDM_WIKI_KNOWLEDGE.json");

let cached: WEDMKnowledgeIndexEngine | null = null;

function loadWikiDocs(): RawWikiDoc[] {
  try {
    if (!existsSync(WIKI_JSON)) return [];
    const parsed = JSON.parse(readFileSync(WIKI_JSON, "utf8")) as { docs?: RawWikiDoc[] };
    return Array.isArray(parsed?.docs) ? parsed.docs : [];
  } catch {
    return []; // fail-soft — tribal-only index is still useful
  }
}

/** Build (or return the cached) unified tribal + wiki WEDM knowledge index. */
export function getWedmKnowledgeIndexEngine(forceReload = false): WEDMKnowledgeIndexEngine {
  if (cached && !forceReload) return cached;
  const corpus = WEDMKnowledgeIndexEngine.compile({
    tips: WEDM_KNOWLEDGE_TIPS as readonly RawTribalTip[],
    wikiDocs: loadWikiDocs(),
  });
  cached = new WEDMKnowledgeIndexEngine(corpus);
  return cached;
}

/** Eager singleton for dispatcher lazy-import resolution (mirrors wedmTribalRuntimeEngine). */
export const wedmKnowledgeIndexEngine = getWedmKnowledgeIndexEngine();
