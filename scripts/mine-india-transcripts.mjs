#!/usr/bin/env node
/**
 * mine-india-transcripts.mjs -- Ollama-powered miner for india / PRISM-AI-systems session transcripts.
 *
 * Follows slot:hotel's footsteps (scripts/mine-hotel-transcripts.mjs, commit bb1640e2f) -- a clone of
 * its reviewer-hardened pattern, GENERALIZED for india's domain. Operator directive 2026-06-09:
 * "use ollama to read through all previous session transcripts for india and anything related to
 *  prism ai systems, deep learning, deep reasoning, lora, nn, gnn, PSN, system-viz, then ensure it's
 *  fully synergized with the Obsidian vault."
 *
 * WHY: session .jsonl transcripts (4-55 MB each) hold dense conversational context -- operator
 * directives, dead-ends, un-promoted AI-systems tribal knowledge -- that never reaches wiki/memory.
 * Reading them raw into Claude is infeasible (hundreds of MB). This routes the heavy read +
 * summarization to LOCAL Ollama ($0, on the Blackwell GPU) so only the compact digest returns to
 * Claude -- the OLLAMA-EXPAND token-economy pattern (R5: mechanical summarization -> local model).
 *
 * DELTAS vs the hotel miner (the two requirements hotel's slot-only miner does not meet):
 *   1. DISCOVERY spans india-slot handoffs UNION any handoff whose topic matches the AI-systems
 *      keyword set (nn/gnn/graphsage/lora/rag/psn/system-viz/...), so AI work done under any slot's
 *      handoff is captured -- "anything related to prism ai systems", not just slot:india.
 *   2. MODEL is host-aware (Blackwell): defaults to gpt-oss:20b (fast strong summarizer, hotel-proven,
 *      verified installed) -- override --model gpt-oss:120b for deeper synthesis (fits the 96GB GPU).
 *
 * COVERAGE CEILING (R12 honesty): discovery keys off HANDOFF-claude-<id>-<topic>.md filenames, so a
 * session with NO topic-matching handoff (crash / /compact-without-/handoff / off-keyword topic) is NOT
 * discoverable. Every output reports "<mined> of <mineable>" + the discovered-id count, and --limit is
 * reflected in the count (never hidden), so a partial run NEVER presents itself as complete. The vault
 * synthesis carries coverage_sessions/mineable_sessions frontmatter + a shrink-guard (a smaller-coverage
 * run cannot clobber a larger one without --force-vault).
 *
 * SPINE: user/assistant TEXT only (harness noise dropped). Unlike hotel's miner this does NOT parse
 * tool_use blocks for commit subjects -- commit subjects are already cheaply available from `git log`,
 * and the transcript's UNIQUE value is the conversational reasoning. Pair the digest with `git log`
 * for the shipped-commit list.
 *
 * LOCAL-LLM ROUTING (directive: "route through the PRISM MCP server"): there is NO MCP local-LLM
 * dispatcher action today (verified 2026-06-09 -- ask-ollama.mjs + this miner both call the local
 * Ollama endpoint directly, which IS the current PRISM-canonical local route). A `prism_ai:local_llm`
 * dispatcher action that all local-LLM callers route through is the queued follow-up unit (see the
 * spec emitted alongside this commit); when it lands, swap the `ollama()` body to call it. Not
 * fabricating MCP-routing that does not exist (R12).
 *
 * PIPELINE (per transcript): stream-parse JSONL (readline -- never readFileSync, files exceed V8's
 * string cap) -> extract conversational spine -> Ollama map (chunk-summarize) -> Ollama reduce
 * (merge) -> per-session digest (RESUMABLE: skip if it exists; a reaper kill loses nothing) -> _COMBINED.md.
 *
 * USAGE:
 *   node scripts/mine-india-transcripts.mjs [--limit N] [--model <name>] [--since YYYY-MM-DD] [--force]
 *
 * OUTPUT: H:/prism/state/shared/india-transcript-mining/<shortid>.md  +  _COMBINED.md
 *   (_COMBINED.md is the Obsidian-synergy feed -- promote it to memory/wiki in the follow-up unit)
 */
import { createReadStream, existsSync, mkdirSync, readdirSync, statSync, writeFileSync, readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { pathToFileURL } from "node:url";
import path from "node:path";
// U-NUMCTX-MINER-ROUTE: opt-in route through the PRISM MCP server (prism_local
// local_generate), fail-soft to the existing direct /api/generate path. callViaMcp
// forwards numCtx so the 32768-sized slices are not truncated. (ask-ollama.mjs has a
// main-guard, so importing it here never runs its CLI.)
import { callViaMcp, mcpRoutingEnabled } from "./ask-ollama.mjs";

const PROJECT_DIR = "C:/Users/wompu/.claude/projects/H--prism";
const HANDOFF_DIRS = ["H:/prism/state/shared/handoffs", "H:/prism/state/shared/handoffs/archive"];
const OUT_DIR = "H:/prism/state/shared/india-transcript-mining";
const OLLAMA = process.env.OLLAMA_URL ? `${process.env.OLLAMA_URL}/api/generate` : "http://127.0.0.1:11434/api/generate";

const args = process.argv.slice(2);
const flag = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const has = (name) => args.includes(name);
const LIMIT = parseInt(flag("--limit", "0"), 10) || 0;
// 2-tier (Blackwell): fast strong summarizer for the per-slice MAP; frontier local model for the
// cross-session SYNTHESIS (gpt-oss:120b = 65GB, fits the 96GB GPU). --model overrides both for back-compat.
const MAP_MODEL = flag("--map-model", flag("--model", "gpt-oss:20b"));
const SYNTH_MODEL = flag("--synth-model", "gpt-oss:120b");
// Concurrent Ollama calls -- matches OLLAMA_NUM_PARALLEL=4 on the host (more would queue/thrash VRAM).
const CONCURRENCY = Math.max(1, parseInt(flag("--concurrency", "4"), 10) || 4);
const VAULT = !has("--no-vault");                      // feed the synthesis into the Obsidian vault (default on)
const FORCE_VAULT = has("--force-vault");              // override the vault shrink-guard (allow a smaller-coverage overwrite)
const SINCE = flag("--since", "2026-05-01");
const FORCE = has("--force");
const CHUNK_CHARS = 90_000;                            // ~24 K tokens; fits num_ctx 32768
const NUM_CTX = 32768;
// Output cap for the MCP route ONLY (prism_local local_generate requires maxTokens; the
// direct /api/generate path below stays uncapped). 16384 (~64KB) is a CEILING not a target --
// the model emits EOS when done, so a terse bullet digest costs nothing, while the densest
// cross-session synthesis is not output-truncated. The route exists to STOP silent truncation,
// so its own cap must not reintroduce it (R12).
const MCP_NUM_PREDICT = 16384;
const GEN_TIMEOUT_MS = 240_000;
const TEXT_BLOCK_CAP = 4000;
const MIN_SPINE_CHARS = 200;

// india-slot OR any handoff topic about PRISM AI systems. Exported for tests.
export const INDIA_TOPIC_RE =
  /(^|[-_])(india|blackwell-ai|nn-graph|nng|gnn|graphsage|lora|rag|psn|ai-ms|ai-training|deep-learning|deep-reasoning|neural|octopus|consensus|machine-learning|pattern-recognition|system-viz|embedding)([-_]|$)/i;

/** Short-id if a handoff filename belongs to india / a PRISM-AI-systems topic, else null. Exported for tests. */
export function isIndiaTopic(filename) {
  const m = /^HANDOFF-claude-([0-9a-f]{8})-(.+?)\.md$/i.exec(filename);
  if (!m) return null;
  const [, id, topic] = m;
  if (/(^|[-_])india([-_]|$)/i.test(topic) || INDIA_TOPIC_RE.test(topic)) return id.toLowerCase();
  return null;
}

/** Discover india / AI-systems session short-ids from handoff filenames (active + archive). */
function indiaShortIds() {
  const ids = new Set();
  for (const dir of HANDOFF_DIRS) {
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)) {
      const id = isIndiaTopic(f);
      if (id) ids.add(id);
    }
  }
  return [...ids];
}

/** Map short-ids to {id, file, mb, mtime}, filtered to >= SINCE, newest first. */
function resolveTranscripts(ids) {
  const files = readdirSync(PROJECT_DIR).filter((f) => f.endsWith(".jsonl"));
  const rows = [];
  for (const id of ids) {
    const m = files.find((f) => f.startsWith(id));
    if (!m) continue;
    const st = statSync(path.join(PROJECT_DIR, m));
    const mtime = st.mtime.toISOString().slice(0, 10);
    if (mtime < SINCE) continue;
    rows.push({ id, file: path.join(PROJECT_DIR, m), mb: +(st.size / 1048576).toFixed(1), mtime });
  }
  rows.sort((a, b) => b.mtime.localeCompare(a.mtime));
  return rows;
}

// Harness boilerplate recognized by ANCHORED start, never a free `includes` -- a free substring drops
// real assistant prose that merely MENTIONS a phrase (the tribal reasoning this miner exists to capture).
const NOISE_PREFIXES = [
  "<system-reminder>", "<command-message>", "<command-name>", "<command-args>",
  "<task-notification>", "<local-command-stdout>", "Caveat:", "# claudeMd",
];
const HOOK_INJECT_RE = /^(UserPromptSubmit|PreToolUse|PostToolUse|Stop|SessionStart|Notification|PreCompact|SubagentStop)\b/;

/** True if a text block is pure harness boilerplate, not real conversation. Exported for tests. */
export function isNoise(text) {
  if (!text) return true;
  const t = text.trim();
  if (!t) return true;
  if (NOISE_PREFIXES.some((p) => t.startsWith(p))) return true;
  if (HOOK_INJECT_RE.test(t)) return true;
  return false;
}

/** Stream a JSONL transcript to a conversational spine (role-labeled user/assistant text). */
async function extractSpine(file) {
  const out = [];
  const rl = createInterface({ input: createReadStream(file, { encoding: "utf8" }), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    let o;
    try { o = JSON.parse(line); } catch { continue; }
    if (o.type !== "user" && o.type !== "assistant") continue;
    const role = o.type;
    const content = o.message?.content;
    if (typeof content === "string") {
      if (!isNoise(content)) out.push(`[${role}] ${content.slice(0, TEXT_BLOCK_CAP)}`);
      continue;
    }
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (block?.type === "text" && !isNoise(block.text)) {
        out.push(`[${role}] ${block.text.slice(0, TEXT_BLOCK_CAP)}`);
      }
    }
  }
  rl.close();
  return out.join("\n");
}

/** Concurrency limiter: at most `max` in-flight fn() calls; queues the rest. FIFO. Exported for tests. */
export function makeLimiter(max) {
  let active = 0;
  const queue = [];
  const pump = () => {
    if (active >= max || queue.length === 0) return;
    active++;
    const { fn, resolve, reject } = queue.shift();
    Promise.resolve().then(fn).then(resolve, reject).finally(() => { active--; pump(); });
  };
  return (fn) => new Promise((resolve, reject) => { queue.push({ fn, resolve, reject }); pump(); });
}

// All Ollama generate calls flow through ONE limiter so concurrent slices/transcripts never exceed
// OLLAMA_NUM_PARALLEL on the host (more in-flight = VRAM thrash + queue stalls on the Blackwell).
const ollamaLimit = makeLimiter(CONCURRENCY);

export async function ollamaCall(prompt, model, opts = {}) {
  const {
    mcpEnabled = mcpRoutingEnabled(),
    callViaMcpImpl = callViaMcp,
    fetchImpl = fetch,
  } = opts;
  // Opt-in MCP overlay (PRISM_LOCAL_LLM_VIA_MCP): route through prism_local local_generate
  // with numCtx=NUM_CTX so the 32768-sized slices are not truncated, fail-soft to the direct
  // path on ANY MCP failure -- enabling the route can never break a working mine.
  if (mcpEnabled) {
    const r = await callViaMcpImpl(model, prompt, { numCtx: NUM_CTX, numPredict: MCP_NUM_PREDICT, timeoutMs: GEN_TIMEOUT_MS });
    if (r && r.ok && typeof r.text === "string" && r.text.trim()) return r.text.trim();
    // fall through to the direct /api/generate path below (unchanged behavior)
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), GEN_TIMEOUT_MS);
  try {
    const res = await fetchImpl(OLLAMA, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, prompt, stream: false, keep_alive: "10m", options: { num_ctx: NUM_CTX, temperature: 0.2 } }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`ollama HTTP ${res.status}`);
    const j = await res.json();
    const text = (j.response ?? "").trim();
    // An empty 200-OK must FAIL LOUD, not silently yield a content-missing digest that the
    // skip-if-exists resume then treats as complete (hotel's reviewer P0; R12 silent-data-loss class).
    if (!text) throw new Error(`ollama returned an empty response (model ${model}); failing rather than writing a partial digest`);
    return text;
  } finally {
    clearTimeout(timer);
  }
}

/** Globally rate-limited Ollama generate (<= CONCURRENCY concurrent). */
function ollama(prompt, model = MAP_MODEL) {
  return ollamaLimit(() => ollamaCall(prompt, model));
}

const MAP_PROMPT = (slice) =>
  `You are mining a PRISM AI-systems (slot:india -- NN/GNN/GraphSAGE/LoRA/RAG/PSN/system-viz/deep-learning) ` +
  `Claude-Code session transcript slice. Extract ONLY what matters for resuming AI-systems work, as terse ` +
  `bullets under these headers (omit empty headers): SHIPPED (builds/commits), DECISIONS (architecture/scope + why), ` +
  `OPERATOR DIRECTIVES (verbatim asks), FINDINGS/BUGS, AI-SYSTEM SPECIFICS (engines/actions/metrics -- AUROC/Brier/F1, ` +
  `deploy gates, model names, dataset/corpus paths), OPEN THREADS. No preamble.\n\nTRANSCRIPT SLICE:\n${slice}`;

const REDUCE_PROMPT = (id, parts) =>
  `Merge these slice-summaries from ONE PRISM AI-systems session (${id}) into a single deduplicated session digest.\n` +
  `Same headers (SHIPPED, DECISIONS, OPERATOR DIRECTIVES, FINDINGS/BUGS, AI-SYSTEM SPECIFICS, OPEN THREADS).\n` +
  `Terse bullets, drop duplicates, keep the most concrete (metric values, engine/action names, commit subjects, paths). No preamble.\n\n` +
  parts.map((p, i) => `--- slice ${i + 1} ---\n${p}`).join("\n\n");

function chunk(s, size) {
  const out = [];
  for (let i = 0; i < s.length; i += size) out.push(s.slice(i, i + size));
  return out;
}

async function mineOne(row) {
  const outFile = path.join(OUT_DIR, `${row.id}.md`);
  if (existsSync(outFile) && !FORCE) return { id: row.id, status: "skipped(exists)" };
  const spine = await extractSpine(row.file);
  if (spine.length < MIN_SPINE_CHARS) {
    writeFileSync(outFile, `# india session ${row.id} (${row.mtime})\n\n_(no conversational content extracted)_\n`);
    return { id: row.id, status: "empty", spineKB: 0 };
  }
  const slices = chunk(spine, CHUNK_CHARS);
  // Concurrent per-slice MAP (the global ollama limiter caps in-flight calls to CONCURRENCY).
  const partSummaries = await Promise.all(slices.map((sl) => ollama(MAP_PROMPT(sl), MAP_MODEL)));
  const digest = partSummaries.length === 1 ? partSummaries[0] : await ollama(REDUCE_PROMPT(row.id, partSummaries), MAP_MODEL);
  writeFileSync(
    outFile,
    `# india session ${row.id} (${row.mtime}, ${row.mb}MB, spine ${(spine.length / 1024).toFixed(0)}KB, ${slices.length} slice(s), model ${MAP_MODEL})\n\n${digest}\n`
  );
  return { id: row.id, status: "mined", spineKB: +(spine.length / 1024).toFixed(0), slices: slices.length };
}

const SYNTHESIS_PROMPT = (text) =>
  `Synthesize MULTIPLE PRISM AI-systems (NN/GNN/GraphSAGE/LoRA/RAG/PSN/system-viz/deep-learning) session ` +
  `digests into ONE cross-session knowledge digest. Deduplicate aggressively across sessions. Output exactly ` +
  `these sections (omit one only if truly empty): ## Shipped capabilities, ## Key decisions + rationale, ` +
  `## Standing operator directives, ## Open threads / next levers, ## Recurring findings + bugs, ` +
  `## AI-system metrics + deploy-gate state. Terse bullets, concrete (metric values, engine/action names, ` +
  `commit subjects, paths). No preamble.\n\nSESSION DIGESTS:\n${text}`;

const SYNTHESIS_MERGE_PROMPT = (parts) =>
  `Merge these partial cross-session syntheses into ONE, same sections, deduplicated, terse. No preamble.\n\n` +
  parts.map((p, i) => `--- part ${i + 1} ---\n${p}`).join("\n\n");

/** Merge per-session digests into one cross-session synthesis via the frontier local model. */
async function synthesize(digests) {
  const joined = digests.join("\n\n---\n\n");
  if (joined.length <= CHUNK_CHARS) return ollama(SYNTHESIS_PROMPT(joined), SYNTH_MODEL);
  // Too large for one window: synthesize per-chunk (concurrent, limiter-gated) then merge.
  const parts = await Promise.all(chunk(joined, CHUNK_CHARS).map((c) => ollama(SYNTHESIS_PROMPT(c), SYNTH_MODEL)));
  return ollama(SYNTHESIS_MERGE_PROMPT(parts), SYNTH_MODEL);
}

const VAULT_DIR = "H:/prism/knowledge/memories/reference";
const VAULT_FILE = path.join(VAULT_DIR, "reference_india_transcript_synthesis.md");

/** Build the Obsidian vault memory doc (frontmatter + body). Pure -- exported for tests.
 *  coverage_sessions/mineable_sessions make the partial coverage HONEST + machine-readable
 *  (the shrink-guard reads coverage_sessions to refuse a smaller-coverage overwrite). */
export function buildVaultDoc(synthesis, n, mineable, date) {
  const fm =
    `---\n` +
    `name: reference_india_transcript_synthesis\n` +
    `description: "Ollama-mined cross-session synthesis of india / PRISM-AI-systems transcripts (${n} of ${mineable} mineable sessions, ${date}): shipped capabilities, decisions, standing directives, open levers, deploy-gate state. Auto-generated by scripts/mine-india-transcripts.mjs."\n` +
    `metadata:\n  node_type: memory\n  type: reference\n  galaxy: ai-training\n  auto_generated: true\n  coverage_sessions: ${n}\n  mineable_sessions: ${mineable}\n---\n\n`;
  return `${fm}# India / PRISM-AI-systems cross-session synthesis (${n} of ${mineable} mineable sessions, ${date})\n\n${synthesis}\n`;
}

/** Read coverage_sessions from an existing vault doc (0 if absent/unreadable). Pure -- exported for tests. */
export function parseCoverage(text) {
  if (typeof text !== "string") return 0;
  const m = text.match(/coverage_sessions:\s*(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

/** Feed the synthesis into the Obsidian vault (tribal-embeddable + semantic-recallable). SHRINK-GUARD:
 *  refuse to clobber a larger-coverage synthesis with a smaller one (the 2026-06-08 tribal-brain
 *  clobber class) unless --force-vault. Writes the H: vault copy directly (regenerated artifact, no C:
 *  source -- it is reproducible from the transcripts, not authored). Returns true if written. */
function writeVaultMemory(synthesis, n, mineable, date) {
  mkdirSync(VAULT_DIR, { recursive: true });
  const prev = existsSync(VAULT_FILE) ? parseCoverage(readFileSync(VAULT_FILE, "utf8")) : 0;
  if (n < prev && !FORCE_VAULT) {
    console.log(`[mine-india] VAULT SKIP -- refusing to clobber a ${prev}-session synthesis with a smaller ${n}-session one (shrink-guard; --force-vault to override)`);
    return false;
  }
  writeFileSync(VAULT_FILE, buildVaultDoc(synthesis, n, mineable, date));
  return true;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const ids = indiaShortIds();
  let rows = resolveTranscripts(ids);
  const mineable = rows.length; // BEFORE --limit, so "N of M" never masks a partial run (R12 honesty)
  if (LIMIT) rows = rows.slice(0, LIMIT);
  const gap = ids.length - mineable; // discovered ids whose .jsonl is gone or predates SINCE
  console.log(`[mine-india] discovered ${ids.length} india/AI session id(s) via handoffs; ${mineable} mineable >= ${SINCE}${gap > 0 ? ` (${gap} had no surviving transcript or predate SINCE)` : ""}; mining ${rows.length}${LIMIT ? ` (--limit ${LIMIT})` : ""}. map=${MAP_MODEL} synth=${SYNTH_MODEL} concurrency=${CONCURRENCY}, total ${rows.reduce((s, r) => s + r.mb, 0).toFixed(0)}MB`);
  const results = [];
  for (const row of rows) {
    const t0 = Date.now();
    try {
      const r = await mineOne(row);
      console.log(`[mine-india] ${row.id} (${row.mtime}) ${r.status} ${r.spineKB ? `spine=${r.spineKB}KB slices=${r.slices}` : ""} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
      results.push(r);
    } catch (e) {
      console.log(`[mine-india] ${row.id} ERROR ${e.message}`);
      results.push({ id: row.id, status: "error", error: e.message });
    }
  }
  // Build _COMBINED from THIS run's non-error results, not a blind disk glob (hotel's reviewer P1):
  // a session that errored this run must not silently fold a stale/partial file into the combined digest.
  const okIds = new Set(results.filter((r) => r.status !== "error").map((r) => r.id));
  const combinedRows = rows.filter((r) => okIds.has(r.id) && existsSync(path.join(OUT_DIR, `${r.id}.md`)));
  const combined = combinedRows.map((r) => readFileSync(path.join(OUT_DIR, `${r.id}.md`), "utf8")).join("\n\n---\n\n");
  writeFileSync(
    path.join(OUT_DIR, "_COMBINED.md"),
    `# India / PRISM-AI-systems transcript mining -- ${combinedRows.length} mined of ${rows.length} attempted (${mineable} mineable >= ${SINCE}; discovery via handoff filenames only)\n\n${combined}\n`
  );
  console.log(`[mine-india] DONE -- ${results.filter((r) => r.status === "mined").length} mined, ${results.filter((r) => r.status.startsWith("skipped")).length} skipped, ${results.filter((r) => r.status === "error").length} error. Combined: ${OUT_DIR}/_COMBINED.md`);

  // CROSS-SESSION SYNTHESIS + Obsidian vault feed -- the "fully synergized with Obsidian" deliverable:
  // merge every per-session digest into ONE deduplicated AI-systems knowledge digest (frontier local
  // model) and write it into the vault so tribal-embed + semantic recall index it (Ollama RAG retrievable).
  if (combinedRows.length > 0) {
    try {
      const date = new Date().toISOString().slice(0, 10);
      const digests = combinedRows.map((r) => readFileSync(path.join(OUT_DIR, `${r.id}.md`), "utf8"));
      const synthesis = await synthesize(digests);
      writeFileSync(
        path.join(OUT_DIR, "_SYNTHESIS.md"),
        `# India / PRISM-AI-systems CROSS-SESSION SYNTHESIS (${combinedRows.length} of ${mineable} mineable sessions, model ${SYNTH_MODEL}, ${date})\n\n${synthesis}\n`
      );
      const wrote = VAULT ? writeVaultMemory(synthesis, combinedRows.length, mineable, date) : false;
      console.log(`[mine-india] SYNTHESIS -> ${OUT_DIR}/_SYNTHESIS.md${wrote ? ` + ${VAULT_FILE}` : VAULT ? " (vault shrink-guard skipped)" : ""}`);
    } catch (e) {
      console.log(`[mine-india] SYNTHESIS ERROR ${e.message}`);
    }
  }
}

const __isMain = (() => { try { return import.meta.url === pathToFileURL(process.argv[1] || "").href; } catch { return false; } })();
if (__isMain) main().catch((e) => { console.error("[mine-india] FATAL", e); process.exit(1); });
