// scripts/ollama-nav-rerank.mjs
// U-VERIFIED-OFFLOAD-NAV (2026-06-10, slot:alpha): SEARCH / navigation offload --
// re-rank `/system-viz find` candidates with a local LLM, VERIFIED by node-card
// resolvability. This is the operator's #2 ollama lever (after reads):
// "enforce ollama for searches / navigating the codebase through /system-viz +
// master graph." Built on the verified-offload keystone (model proposes, code
// disposes).
//
// THE CONTRACT: the model RE-RANKS the candidate node-ids by relevance to the
// query; the pure code verifier ACCEPTS an id ONLY when it is BOTH
//   (a) a member of the ORIGINAL candidate set (no hallucinated id leaks), AND
//   (b) RESOLVABLE via node-card-offset seek (a real, live graph node).
// Ids that fail either check are DROPPED (in model order, like file-digest's
// line-anchored verifier). If NONE survive -> fall back to the trusted
// deterministic find-cache order. We therefore NEVER surface a hallucinated or
// dead navigation target -- the accuracy is the verifier's, not the model's.
//
// `run` (ollama caller), `resolve` (id -> bool), and `fallback` are all
// INJECTED, so the lib has zero ollama / fs dependency on the hot test path and
// is hermetically testable (R9). ASCII-only source.

import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { verifiedOffload } from "./lib/ollama-verified-offload.mjs";
import { callOllamaOnce } from "./lib/ollama-fanout.mjs";
import { seekCard } from "./lib/node-card-read.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// gpt-oss:20b = mid-triage: re-ranking a short candidate list is a fast, bounded
// task that does not need the 32b/120b tier. Knob lets an operator raise it.
export const NAV_RERANK_MODEL = process.env.PRISM_NAV_RERANK_MODEL || "gpt-oss:20b";
export const RERANK_TIMEOUT_MS = 20000;
export const MAX_CANDIDATES = 30; // `find` already caps at 30; guard regardless
export const DEFAULT_TOP_K = 10;
const FIND_MAX_BUFFER_BYTES = 32 * 1024 * 1024; // find --json over the 55MB cache
const FIND_TIMEOUT_MS = 30000;

/**
 * buildRerankPrompt -- deterministic, file-first prompt. Lists the candidates
 * (id + first label line) and asks for the topK most query-relevant ids, ids
 * only, most-relevant first. Built by pushing literal lines into an array (no
 * string-concat-with-variable, which trips the [sql-concat] guard).
 *
 * @param {string} query
 * @param {Array<{id:string,label?:string}>} candidates
 * @param {number} topK
 * @returns {string}
 */
export function buildRerankPrompt(query, candidates, topK = DEFAULT_TOP_K) {
  const lines = [];
  lines.push("You are a code-navigation ranker for a manufacturing-intelligence codebase.");
  lines.push("Below is a numbered list of candidate graph nodes (id then label).");
  lines.push("");
  lines.push("QUERY:");
  lines.push(String(query == null ? "" : query).trim());
  lines.push("");
  lines.push("CANDIDATES:");
  const list = Array.isArray(candidates) ? candidates.slice(0, MAX_CANDIDATES) : [];
  for (const c of list) {
    const id = c && c.id != null ? String(c.id) : "";
    const label = c && c.label != null ? String(c.label).split("\n")[0] : "";
    lines.push(`${id}  ${label}`);
  }
  lines.push("");
  lines.push(`Return the ${topK} ids most relevant to the QUERY, most relevant first.`);
  lines.push("Output ids ONLY, one per line, copied EXACTLY from the list above.");
  lines.push("No numbering, no labels, no commentary, no markdown.");
  return lines.join("\n");
}

/**
 * parseRankedIds -- robustly parse a model's ranked-id output. Accepts a JSON
 * array of strings, OR newline / comma separated ids. Strips list numbering,
 * bullets, backticks, and surrounding whitespace. De-dupes, preserves order.
 *
 * @param {string} rawText
 * @returns {string[]}
 */
export function parseRankedIds(rawText) {
  const raw = typeof rawText === "string" ? rawText.trim() : "";
  if (!raw) return [];
  let tokens = [];
  // JSON-array form first (e.g. ["eng.mill","disp.prism_calc"]).
  if (raw.startsWith("[")) {
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) tokens = arr.map((x) => String(x));
    } catch {
      /* not JSON -> line parse below */
    }
  }
  if (tokens.length === 0) {
    tokens = raw
      .split(/[\r\n,]+/)
      .map((s) => s.trim())
      // strip leading list markers: "1.", "1)", "-", "*", and wrapping backticks
      .map((s) => s.replace(/^\s*(?:\d+[.)]\s*|[-*]\s*)/, "").replace(/`/g, "").trim())
      // a model sometimes echoes "id  label" -> keep the first whitespace token
      .map((s) => s.split(/\s+/)[0])
      .filter(Boolean);
  }
  const seen = new Set();
  const out = [];
  for (const t of tokens) {
    const id = t.trim();
    if (id && !seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

/**
 * makeRerankVerifier -- a PURE verify(raw) for verifiedOffload. Keeps ONLY the
 * model-returned ids that are BOTH in the candidate set AND resolvable, in model
 * order. Returns {ok:true, value:keptIds} when >=1 survives, else false (so the
 * offload falls back to the trusted order). A `resolve` throw for one id drops
 * just that id (per-id guarded) rather than discarding the whole ranking.
 *
 * @param {string[]} candidateIds
 * @param {(id:string)=>boolean} resolve  id -> is it a real, live graph node?
 * @returns {(raw:any)=>{ok:boolean,value?:string[]}|false}
 */
export function makeRerankVerifier(candidateIds, resolve) {
  const candidateSet = new Set((candidateIds || []).map((x) => String(x)));
  const resolves = (id) => {
    try {
      return !!resolve(id);
    } catch {
      return false; // a dead/throwing seek drops this id, never the ranking
    }
  };
  return (raw) => {
    const ids = parseRankedIds(raw);
    const kept = [];
    const seen = new Set();
    for (const id of ids) {
      if (seen.has(id)) continue;
      if (candidateSet.has(id) && resolves(id)) {
        seen.add(id);
        kept.push(id);
      }
    }
    return kept.length > 0 ? { ok: true, value: kept } : false;
  };
}

/**
 * rerankNavCandidates -- verified ollama re-rank of a candidate list. ALWAYS
 * returns a trusted ranked id list: the verified ollama order when it passes,
 * else the deterministic fallback (original order, top-K).
 *
 * @param {object} o
 * @param {string} o.query
 * @param {Array<{id:string,label?:string}>} o.candidates
 * @param {number} [o.topK]
 * @param {()=>Promise<string>} [o.run]       injected ollama caller (-> raw text)
 * @param {(id:string)=>boolean} [o.resolve]  injected resolvability check
 * @param {()=>Promise<string[]>} [o.fallback] injected trusted path
 * @param {(rec:object)=>void} [o.onResult]
 * @returns {Promise<{value:string[], source:'ollama'|'fallback', verified:boolean, fellBack:boolean, reason:string}>}
 */
export async function rerankNavCandidates(o = {}) {
  const { query, candidates, onResult } = o;
  const topK = Number.isFinite(o.topK) && o.topK > 0 ? Math.floor(o.topK) : DEFAULT_TOP_K;
  const list = Array.isArray(candidates) ? candidates.slice(0, MAX_CANDIDATES) : [];
  const candidateIds = list.map((c) => String(c && c.id != null ? c.id : "")).filter(Boolean);

  const run =
    typeof o.run === "function"
      ? o.run
      : async () => {
          const res = await callOllamaOnce(buildRerankPrompt(query, list, topK), {
            model: NAV_RERANK_MODEL,
            timeoutMs: RERANK_TIMEOUT_MS,
            temperature: 0,
          });
          return res && res.ok ? res.text : ""; // empty -> verifiedOffload falls back
        };
  const resolve = typeof o.resolve === "function" ? o.resolve : (id) => !!seekCard(id);
  const fallback =
    typeof o.fallback === "function" ? o.fallback : async () => candidateIds.slice(0, topK);

  const verify = makeRerankVerifier(candidateIds, resolve);
  const rec = await verifiedOffload({ run, verify, fallback, label: "nav-rerank", onResult });
  // cap the verified ollama list to topK too (the trusted fallback already is)
  if (Array.isArray(rec.value) && rec.value.length > topK) {
    return { ...rec, value: rec.value.slice(0, topK) };
  }
  return rec;
}

// ---- CLI ----

/**
 * parseCliArgs -- extract query + flags. Pulled out so a flag value (e.g. the
 * number after --top-k) is never mistaken for the query.
 * @param {string[]} argv  process.argv.slice(2)
 */
export function parseCliArgs(argv) {
  const out = { query: "", topK: DEFAULT_TOP_K, json: false };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") out.json = true;
    else if (a === "--top-k" || a === "--topk") {
      const n = Number(argv[++i]);
      if (Number.isFinite(n) && n > 0) out.topK = Math.floor(n);
    } else rest.push(a);
  }
  out.query = rest.join(" ").trim();
  return out;
}

/**
 * findCandidates -- live-proof path: spawn the real `system-viz find <q> --json`
 * and parse its hit array into [{id,label}]. Kept out of the lib so the lib
 * stays decoupled from find-cache internals (R8). Returns [] on any failure.
 */
export function findCandidates(query) {
  try {
    const out = execFileSync(
      process.execPath,
      [path.join(ROOT, "scripts", "system-viz-query.mjs"), "find", query, "--json"],
      { encoding: "utf8", maxBuffer: FIND_MAX_BUFFER_BYTES, timeout: FIND_TIMEOUT_MS },
    );
    const hits = JSON.parse(out);
    return Array.isArray(hits) ? hits.map((h) => ({ id: h.id, label: h.label })) : [];
  } catch {
    return [];
  }
}

async function main() {
  const { query, topK, json } = parseCliArgs(process.argv.slice(2));
  if (!query) {
    console.error('usage: node scripts/ollama-nav-rerank.mjs "<query>" [--top-k N] [--json]');
    process.exit(2);
  }
  const candidates = findCandidates(query);
  if (candidates.length === 0) {
    console.error(`no candidates for "${query}" (system-viz find returned none / find-cache missing)`);
    process.exit(3);
  }
  const rec = await rerankNavCandidates({ query, candidates, topK });
  if (json) {
    console.log(JSON.stringify(rec, null, 2));
  } else {
    console.log(`nav-rerank "${query}" -> source=${rec.source} (verified=${rec.verified})`);
    for (const id of rec.value) console.log(`  ${id}`);
    console.log(`next: node scripts/system-viz-query.mjs node-card ${rec.value[0] || "<id>"}`);
  }
  process.exit(0);
}

// CLI-entry guard: importing exports for tests must NOT run the CLI dispatch.
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((e) => {
    console.error(e && e.message ? e.message : String(e));
    process.exit(1);
  });
}
