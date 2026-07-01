#!/usr/bin/env node
/**
 * mine-hotel-transcripts.mjs -- Ollama-powered miner for slot:hotel session transcripts.
 *
 * WHY: hotel session .jsonl transcripts (4-55 MB each) hold dense conversational context --
 * operator directives, dead-ends, un-promoted tribal knowledge -- that never reaches wiki/memory.
 * Reading them raw into the Claude context window is infeasible (hundreds of MB). This routes the
 * heavy read + summarization to LOCAL Ollama ($0, on-GPU) so only the compact digest returns to
 * Claude -- the OLLAMA-EXPAND token-economy pattern (R5: mechanical summarization -> local model).
 *
 * PIPELINE (per transcript):
 *   1. stream-parse the JSONL (readline -- never readFileSync; files exceed V8's string cap)
 *   2. extract the CONVERSATIONAL SPINE: user-prompt text + assistant text blocks + git-commit
 *      subjects from Bash tool_use. Drop tool_result bodies, system-reminders, tool inputs (~90% of bytes).
 *   3. map: chunk the spine (~90 KB, a 24 K-token window) and Ollama-summarize each chunk
 *   4. reduce: Ollama-merge the chunk summaries into one session digest
 *   5. write the per-session digest (RESUMABLE -- skip if it already exists; a reaper kill loses nothing)
 *
 * Then a combined digest concatenates all per-session digests for Claude to synthesize.
 *
 * USAGE:
 *   node scripts/mine-hotel-transcripts.mjs [--limit N] [--model <name>] [--since YYYY-MM-DD] [--force]
 *
 * OUTPUT: state/shared/hotel-transcript-mining/<shortid>.md  +  _COMBINED.md
 */
import { createReadStream, existsSync, mkdirSync, readdirSync, statSync, writeFileSync, readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import path from "node:path";
import { pathToFileURL } from "node:url";
// U-NUMCTX-HOTEL-MINER-ROUTE (clone of the india/galaxy miner overlay): opt-in route through
// the PRISM MCP server (prism_local local_generate), fail-soft to the direct /api/generate path.
// callViaMcp forwards numCtx so the 32768-sized slices are not truncated. (ask-ollama.mjs has a
// main-guard, so importing it here never runs its CLI.)
import { callViaMcp, mcpRoutingEnabled } from "./ask-ollama.mjs";

const PROJECT_DIR = "C:/Users/wompu/.claude/projects/H--prism";
const HANDOFF_DIRS = ["H:/prism/state/shared/handoffs", "H:/prism/state/shared/handoffs/archive"];
const OUT_DIR = "H:/prism/state/shared/hotel-transcript-mining";
const OLLAMA = "http://127.0.0.1:11434/api/generate";

const args = process.argv.slice(2);
const flag = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const has = (name) => args.includes(name);
const LIMIT = parseInt(flag("--limit", "0"), 10) || 0;
const MODEL = flag("--model", "gpt-oss:20b");          // fast strong summarizer; override e.g. qwen2.5-coder:32b
const SINCE = flag("--since", "2026-05-19");
const FORCE = has("--force");
const CHUNK_CHARS = 90_000;                            // ~24 K tokens; fits num_ctx 32768
const NUM_CTX = 32768;
const GEN_TIMEOUT_MS = 240_000;
// Output cap for the MCP route ONLY (prism_local local_generate requires maxTokens; the direct
// /api/generate path below stays uncapped). 16384 (~64KB) is a CEILING not a target -- the model
// emits EOS when done, so a terse bullet digest costs nothing while the densest synthesis is not
// output-truncated. The route exists to STOP silent truncation, so its own cap must not reintroduce it (R12).
const MCP_NUM_PREDICT = 16384;
const TEXT_BLOCK_CAP = 4000;                           // cap any single text block (defends vs a pasted dump)
const MIN_SPINE_CHARS = 200;                           // below this = no real conversation extracted

/** Discover hotel session short-ids from handoff filenames (active + archive). */
function hotelShortIds() {
  const ids = new Set();
  for (const dir of HANDOFF_DIRS) {
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)) {
      const m = f.match(/^HANDOFF-claude-([0-9a-f]{8})-.*hotel/i);
      if (m) ids.add(m[1].toLowerCase());
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

// Harness-injected boilerplate is recognized by its ANCHORED start, never a free `includes` --
// a free substring match drops real assistant prose that merely MENTIONS the phrase (e.g. an
// analysis paragraph discussing "hook additional context"), which is exactly the tribal reasoning
// this miner exists to capture (reviewer P1, 2026-06-09).
const NOISE_PREFIXES = [
  "<system-reminder>",
  "<command-message>",
  "<command-name>",
  "<command-args>",
  "<task-notification>",
  "<local-command-stdout>",
  "Caveat:",
  "# claudeMd",
];
// Hook-injected context blocks start with the lifecycle-event name + ":" or " hook additional context".
const HOOK_INJECT_RE = /^(UserPromptSubmit|PreToolUse|PostToolUse|Stop|SessionStart|Notification|PreCompact|SubagentStop)\b/;

/** True if a text block is pure harness boilerplate (system-reminder / injected context), not real conversation. */
function isNoise(text) {
  if (!text) return true;
  const t = text.trim();
  if (!t) return true;
  if (NOISE_PREFIXES.some((p) => t.startsWith(p))) return true;
  if (HOOK_INJECT_RE.test(t)) return true; // anchored, not a free includes (see note above)
  return false;
}

/** Stream a JSONL transcript to a conversational spine (role-labeled text + commit subjects). */
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
      } else if (block?.type === "tool_use" && block?.name === "Bash") {
        const cmd = String(block.input?.command ?? "");
        const m = cmd.match(/git commit[\s\S]*?-m\s+["'$]+\s*([^\n"']{0,180})/);
        if (m) out.push(`[commit] ${m[1].trim()}`);
      }
    }
  }
  rl.close();
  return out.join("\n");
}

export async function ollama(prompt, model = MODEL, opts = {}) {
  const {
    mcpEnabled = mcpRoutingEnabled(),
    callViaMcpImpl = callViaMcp,
    fetchImpl = fetch,
  } = opts;
  // Opt-in MCP overlay (PRISM_LOCAL_LLM_VIA_MCP): route through prism_local local_generate with
  // numCtx=NUM_CTX so the 32768-sized slices are not truncated, fail-soft to the direct path on
  // ANY MCP failure -- enabling the route can never break a working mine.
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
    // P0 fix (reviewer 2026-06-09): an empty 200-OK response must FAIL LOUD, not silently yield a
    // content-missing digest that the skip-if-exists resume then treats as complete. Throwing aborts
    // mineOne -> no file written -> the session is re-mined on the next run. R12: a partial map summary
    // folded into a confident "mined" digest is the silent-data-loss class.
    if (!text) throw new Error(`ollama returned an empty response (model ${model}); failing rather than writing a partial digest`);
    return text;
  } finally {
    clearTimeout(timer);
  }
}

const MAP_PROMPT = (slice) =>
  `You are mining a slot:hotel (ERP/HR/accounting/payroll/quoting) Claude-Code session transcript slice.\n` +
  `Extract ONLY what matters for resuming hotel work, as terse bullets under these headers (omit empty headers):\n` +
  `SHIPPED (builds/commits), DECISIONS (architecture/scope choices + why), OPERATOR DIRECTIVES (verbatim asks),\n` +
  `FINDINGS/BUGS, ERP-DOMAIN SPECIFICS (engines/actions/financial rules), OPEN THREADS. No preamble.\n\n` +
  `TRANSCRIPT SLICE:\n${slice}`;

const REDUCE_PROMPT = (id, parts) =>
  `Merge these slice-summaries from ONE hotel session (${id}) into a single deduplicated session digest.\n` +
  `Same headers (SHIPPED, DECISIONS, OPERATOR DIRECTIVES, FINDINGS/BUGS, ERP-DOMAIN SPECIFICS, OPEN THREADS).\n` +
  `Terse bullets, drop duplicates, keep the most concrete (dollar figures, engine/action names, commit subjects). No preamble.\n\n` +
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
    writeFileSync(outFile, `# hotel session ${row.id} (${row.mtime})\n\n_(no conversational content extracted)_\n`);
    return { id: row.id, status: "empty", spineKB: 0 };
  }
  const slices = chunk(spine, CHUNK_CHARS);
  const partSummaries = [];
  for (const sl of slices) partSummaries.push(await ollama(MAP_PROMPT(sl)));
  const digest = partSummaries.length === 1 ? partSummaries[0] : await ollama(REDUCE_PROMPT(row.id, partSummaries));
  writeFileSync(
    outFile,
    `# hotel session ${row.id} (${row.mtime}, ${row.mb}MB, spine ${(spine.length / 1024).toFixed(0)}KB, ${slices.length} slice(s), model ${MODEL})\n\n${digest}\n`
  );
  return { id: row.id, status: "mined", spineKB: +(spine.length / 1024).toFixed(0), slices: slices.length };
}

// _COMBINED is built from THIS run's non-error results that actually produced a file -- NOT a blind
// disk glob (a session that errored this run must not silently fold a stale/partial prior file while
// the console reports it as "error"; reviewer P1 2026-06-09). Pure + injectable existsImpl so the
// fold policy is unit-testable without a real mine.
export function selectCombinedRows(rows, results, existsImpl) {
  const exists = existsImpl || ((id) => existsSync(path.join(OUT_DIR, `${id}.md`)));
  const okIds = new Set(results.filter((r) => r.status !== "error").map((r) => r.id));
  return rows.filter((r) => okIds.has(r.id) && exists(r.id));
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const ids = hotelShortIds();
  let rows = resolveTranscripts(ids);
  if (LIMIT) rows = rows.slice(0, LIMIT);
  console.log(`[mine] ${rows.length} hotel transcript(s) >= ${SINCE}, model=${MODEL}, total ${rows.reduce((s, r) => s + r.mb, 0).toFixed(0)}MB`);
  const results = [];
  for (const row of rows) {
    const t0 = Date.now();
    try {
      const r = await mineOne(row);
      console.log(`[mine] ${row.id} (${row.mtime}) ${r.status} ${r.spineKB ? `spine=${r.spineKB}KB slices=${r.slices}` : ""} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
      results.push(r);
    } catch (e) {
      console.log(`[mine] ${row.id} ERROR ${e.message}`);
      results.push({ id: row.id, status: "error", error: e.message });
    }
  }
  // _COMBINED folds only THIS run's non-error, file-present results (policy + rationale live in
  // selectCombinedRows, where it is unit-tested). A session that errored this run is never folded.
  const combinedRows = selectCombinedRows(rows, results);
  const combined = combinedRows.map((r) => readFileSync(path.join(OUT_DIR, `${r.id}.md`), "utf8")).join("\n\n---\n\n");
  writeFileSync(
    path.join(OUT_DIR, "_COMBINED.md"),
    `# Hotel transcript mining -- ${combinedRows.length} of ${rows.length} sessions since ${SINCE}\n\n${combined}\n`
  );
  console.log(`[mine] DONE -- ${results.filter((r) => r.status === "mined").length} mined, ${results.filter((r) => r.status.startsWith("skipped")).length} skipped, ${results.filter((r) => r.status === "error").length} error. Combined: ${OUT_DIR}/_COMBINED.md`);
}

const __isMain = (() => { try { return import.meta.url === pathToFileURL(process.argv[1] || "").href; } catch { return false; } })();
if (__isMain) main().catch((e) => { console.error("[mine] FATAL", e); process.exit(1); });
