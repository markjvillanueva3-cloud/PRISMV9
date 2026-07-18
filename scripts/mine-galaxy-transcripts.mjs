#!/usr/bin/env node
/**
 * mine-galaxy-transcripts.mjs -- generalized Ollama transcript miner for ALL 34
 * PRISM galaxies (GALAXY-TRANSCRIPT-MINE, slot:kilo 2026-06-09).
 *
 * Operator /goal 2026-06-09: "utilize ollama local llm to read through all session
 * transcripts ... populate corresponding domains and galaxies with data and knowledge
 * within their systems (memories, wiki, tribal, claude.md, gsd, prism awareness) so
 * they have full current context on what they're building, what's left, how, what
 * tools to use. goal clear: every galaxy/domain is accounted for."
 *
 * WHY generalized, not 34 clones: hotel + india each got a hand-cloned per-domain
 * miner (mine-hotel/india-transcripts.mjs). Cloning 32 more drifts (R8). This runs
 * the SAME proven pipeline once per galaxy, driven by `lib/galaxy-mining-registry.mjs`
 * (each galaxy supplies a topic-regex + a domain `vocab` that specializes the prompts).
 *
 * PIPELINE (identical to india's reviewer-hardened pattern, per galaxy):
 *   discover transcripts (HANDOFF topic-regex OR owning-slot match, via classifyHandoff)
 *   -> stream-parse JSONL spine (readline; files exceed V8's string cap, never readFileSync)
 *   -> drop harness noise -> Ollama MAP (chunk-summarize, concurrent, limiter-gated)
 *   -> Ollama REDUCE (merge per-session) -> per-session digest (RESUMABLE: skip if exists)
 *   -> cross-session SYNTHESIS (frontier local model) -> per-galaxy vault memory.
 *
 * OUTPUT (per galaxy G):
 *   state/shared/galaxy-transcript-mining/<G>/<shortid>.md   (per-session digests, resumable)
 *   state/shared/galaxy-transcript-mining/<G>/_SYNTHESIS.md   (cross-session synthesis)
 *   knowledge/memories/reference/reference_<G>_transcript_synthesis.md  (THE vault feed)
 *
 * HOW IT REACHES THE BRAIN (verified mechanism -- R12, do not overstate):
 * galaxy-synthesis-refresh.mjs does NOT read the `galaxy:` frontmatter. It retrieves
 * each galaxy's memory cluster via a BM25 query == `${galaxy} ${domainText}`
 * (galaxy-reflection-synthesis.mjs buildGalaxyQuery/gatherGalaxyMemories). The mined
 * memo is retrieved into the RIGHT cluster because the galaxy SLUG is in its FILENAME
 * (`reference_<G>_transcript_synthesis.md`) -- the slug scores on W_NAME -- AND because
 * the `reference_` prefix dodges the NODE_POINTER_RE exclusion. The `galaxy:<G>`
 * frontmatter is provenance/audit only for THIS consumer, not the routing key. So the
 * filename slug is load-bearing; keep it. Then synthesis-refresh compounds the cluster
 * into <G>/MEMORY.md, and downstream auto-embed propagates to wiki/tribal. A vault memo
 * per galaxy with the slug-in-filename = that galaxy is accounted for in the brain
 * substrate the goal names.
 *
 * COVERAGE CEILING (R12 honesty): discovery keys off HANDOFF filenames, so a session
 * with no topic/slot-matching handoff (crash / /compact-without-/handoff / off-keyword
 * topic) is not discoverable. Every output reports "<mined> of <mineable>" + an
 * unclassified-handoff count; the vault doc carries coverage_sessions/mineable_sessions
 * + a shrink-guard. A partial run never presents itself as complete.
 *
 * LOCAL-LLM ROUTING: direct PRISM-canonical Ollama endpoint by default; opt-in route
 * through the MCP server's prism_local local_generate (PRISM_LOCAL_LLM_VIA_MCP=1) which
 * forwards numCtx so the 32768-sized slices are not truncated, fail-soft to the direct
 * path on ANY MCP failure (U-NUMCTX-GALAXY-MINER-ROUTE, 2026-06-09 -- clone of india's
 * U-NUMCTX-MINER-ROUTE; the local_generate numCtx param shipped 47e38e4fb9).
 *
 * USAGE:
 *   node scripts/mine-galaxy-transcripts.mjs --dry-run [--json]        # classify only, no Ollama, no writes
 *   node scripts/mine-galaxy-transcripts.mjs --galaxy mill [--limit N] # mine ONE galaxy
 *   node scripts/mine-galaxy-transcripts.mjs --all [--limit N]         # mine EVERY galaxy (heavy: operator-gated)
 *   flags: --map-model <n> --synth-model <n> --since YYYY-MM-DD --concurrency N --force --force-vault --no-vault
 */
import { createReadStream, existsSync, mkdirSync, readdirSync, statSync, writeFileSync, readFileSync, renameSync } from "node:fs";
import { createInterface } from "node:readline";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { GALAXY_REGISTRY, GALAXY_KEYS, classifyHandoff, getGalaxy, classifyTranscriptContent, extractSlotHint } from "./lib/galaxy-mining-registry.mjs";
// U-NUMCTX-GALAXY-MINER-ROUTE (clone of mine-india-transcripts.mjs's U-NUMCTX-MINER-ROUTE): opt-in route through the
// PRISM MCP server (prism_local local_generate), fail-soft to the direct /api/generate
// path. callViaMcp forwards numCtx so the 32768-sized slices are not truncated. (ask-ollama.mjs
// has a main-guard, so importing it here never runs its CLI.)
import { callViaMcp, mcpRoutingEnabled } from "./ask-ollama.mjs";

// Transcripts live under multiple project dirs (the main tree + per-slot worktrees).
// The main H--prism dir holds the bulk (589); H-- holds 299. We scan both bulk dirs.
const PROJECT_DIRS = [
  "C:/Users/wompu/.claude/projects/H--prism",
  "C:/Users/wompu/.claude/projects/H--",
];
const HANDOFF_DIRS = ["H:/prism/state/shared/handoffs", "H:/prism/state/shared/handoffs/archive"];
const OUT_ROOT = "H:/prism/state/shared/galaxy-transcript-mining";
const VAULT_DIR = "H:/prism/knowledge/memories/reference";
const OLLAMA = process.env.OLLAMA_URL ? `${process.env.OLLAMA_URL}/api/generate` : "http://127.0.0.1:11434/api/generate";

const args = process.argv.slice(2);
const flag = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const has = (name) => args.includes(name);
const DRY_RUN = has("--dry-run");
const JSON_OUT = has("--json");
const ALL = has("--all");
const CONTENT = has("--content"); // discover by transcript CONTENT, not handoff filenames
const ONE_GALAXY = flag("--galaxy", null);
// --next-unpopulated: pick the highest-ROI galaxy that has NO vault memo yet and mine
// just that one. Lets a scheduled task drain the backlog one galaxy per run, in ROI order,
// without re-specifying the target each time. --next-count N mines N such galaxies in a run.
const NEXT_UNPOP = has("--next-unpopulated");
const NEXT_COUNT = Math.max(1, parseInt(flag("--next-count", "1"), 10) || 1);
// Backend-infra galaxies (user directive 2026-06-09: populate BACKEND first, THEN app domains).
// --backend-only restricts --next-unpopulated to this set so ROI-greedy selection still honors
// the ordering (cad/business etc. are app domains and must wait).
const BACKEND_GALAXIES = new Set([
  "backend-helper", "wiring", "discovery", "database-expansion", "system-viz",
  "agent-orchestration", "token-optimization", "tribal-knowledge", "knowledge-conversion",
  "bug-hunting", "fleet-hygiene", "corpus-aggregation", "dormant-data",
]);
const BACKEND_ONLY = has("--backend-only");
const LIMIT = parseInt(flag("--limit", "0"), 10) || 0;
const MAP_MODEL = flag("--map-model", flag("--model", "gpt-oss:20b"));
const SYNTH_MODEL = flag("--synth-model", "gpt-oss:120b");
const CONCURRENCY = Math.max(1, parseInt(flag("--concurrency", "4"), 10) || 4);
const VAULT = !has("--no-vault");
const FORCE_VAULT = has("--force-vault");
const SINCE = flag("--since", "2026-05-01");
const FORCE = has("--force");
const CHUNK_CHARS = 90_000;
// Per-transcript slice cap: a live mega-session can be 40+MB of spine -> ~500 slices ->
// ~500 MAP calls, which alone dominates a turn. Cap the MAP fan-out per transcript by
// HEAD+TAIL sampling (session start = what it set out to do; session end = what it landed
// on; the middle is mostly tool-call churn already noise-filtered). Override: --max-slices N.
const MAX_SLICES_PER_TX = Math.max(2, parseInt(flag("--max-slices", "14"), 10) || 14);
const NUM_CTX = 32768;
const GEN_TIMEOUT_MS = 240_000;
// Output cap for the MCP route ONLY (prism_local local_generate requires maxTokens; the
// direct /api/generate path stays uncapped). 16384 (~64KB) is a CEILING not a target -- the
// model emits EOS when done, so terse MAP slices cost nothing, while a dense-galaxy cross-
// session SYNTHESIS (the case most likely to exceed a terse cap) is not output-truncated. The
// route exists to STOP silent truncation, so its own cap must not reintroduce it (R12).
const MCP_NUM_PREDICT = 16384;
// The cross-session SYNTHESIS runs on the big SYNTH_MODEL (gpt-oss:120b, ~64GB) over the
// joined per-session digests; dense galaxies (token-optimization, tribal-knowledge) push it
// past the 240s MAP budget -> "operation aborted". Give synthesis a larger ceiling.
const SYNTH_TIMEOUT_MS = parseInt(flag("--synth-timeout-ms", "900000"), 10) || 900_000;
const TEXT_BLOCK_CAP = 4000;
const MIN_SPINE_CHARS = 200;

/**
 * Build a map shortid -> {file, mb, mtime} across all project dirs, >= SINCE.
 * First dir wins (main tree preferred). Also returns `preSince`: the set of ids
 * whose .jsonl EXISTS ON DISK but predates SINCE -- so discoverPerGalaxy can
 * distinguish "excluded by the date cutoff (re-includable via --since)" from
 * "transcript genuinely gone" instead of conflating both into one opaque count
 * (R12 -- the operator can see how much recoverable older context the cutoff hides).
 * The returned `byId` carries a non-enumerable `.preSince` Set alongside the map.
 */
export function indexTranscripts({ projectDirs = PROJECT_DIRS, since = SINCE, statImpl = statSync, readdirImpl = readdirSync, existsImpl = existsSync } = {}) {
  const byId = new Map();
  const preSince = new Set();
  for (const dir of projectDirs) {
    if (!existsImpl(dir)) continue;
    let files;
    try { files = readdirImpl(dir).filter((f) => f.endsWith(".jsonl")); } catch { continue; }
    for (const f of files) {
      const id = f.slice(0, 8).toLowerCase();
      if (byId.has(id)) continue; // first dir wins (main tree preferred)
      let st;
      try { st = statImpl(path.join(dir, f)); } catch { continue; }
      const mtime = st.mtime.toISOString().slice(0, 10);
      if (mtime < since) { preSince.add(id); continue; } // exists on disk, just older than the cutoff
      byId.set(id, { id, file: path.join(dir, f), mb: +(st.size / 1048576).toFixed(1), mtime });
    }
  }
  Object.defineProperty(byId, "preSince", { value: preSince, enumerable: false });
  return byId;
}

/**
 * Discover, per galaxy, the set of mineable transcripts. Returns:
 *   { perGalaxy: Map<galaxy, rows[]>, unclassified: number, totalHandoffs: number }
 * A handoff routes to every galaxy classifyHandoff() matches; a row is mineable only
 * if its .jsonl exists >= SINCE. unclassified = handoffs that matched NO galaxy.
 */
export function discoverPerGalaxy({ handoffDirs = HANDOFF_DIRS, registry = GALAXY_REGISTRY, transcripts = null, readdirImpl = readdirSync, existsImpl = existsSync } = {}) {
  const idx = transcripts || indexTranscripts();
  const preSinceSet = idx.preSince instanceof Set ? idx.preSince : new Set();
  const perGalaxy = new Map(registry.map((g) => [g.galaxy, []]));
  const seenPerGalaxy = new Map(registry.map((g) => [g.galaxy, new Set()]));
  // Honest counters (R12): a topic-bearing handoff is exactly one of --
  //   unclassified : matched no galaxy
  //   classifyOnly : galaxy known but no short-id (slot-keyed) -> transcript unfindable
  //   preSince     : id known, .jsonl EXISTS but predates SINCE -> excluded by the cutoff (re-includable)
  //   missingFile  : id known, .jsonl genuinely gone
  //   mined-in     : added to >=1 galaxy
  // preSince vs missingFile are split so the operator sees recoverable-older-context
  // separately from genuinely-lost (was one opaque "noTranscript" bucket).
  let unclassified = 0, totalHandoffs = 0, classifyOnly = 0, preSince = 0, missingFile = 0;
  for (const dir of handoffDirs) {
    if (!existsImpl(dir)) continue;
    let files;
    try { files = readdirImpl(dir); } catch { continue; }
    for (const f of files) {
      const c = classifyHandoff(f, registry);
      if (!c) continue; // no topic at all (pid/session/timestamp) -> not counted as a handoff for coverage
      totalHandoffs++;
      if (c.galaxies.length === 0) { unclassified++; continue; }
      if (!c.mineable || c.id === null) { classifyOnly++; continue; } // slot-keyed: galaxy known, transcript unfindable
      const row = idx.get(c.id);
      if (!row) { if (preSinceSet.has(c.id)) preSince++; else missingFile++; continue; }
      for (const g of c.galaxies) {
        const seen = seenPerGalaxy.get(g);
        if (seen.has(c.id)) continue; // a galaxy mines each session once even if 2 handoffs matched
        seen.add(c.id);
        perGalaxy.get(g).push({ ...row, topic: c.topic });
      }
    }
  }
  // newest-first per galaxy
  for (const rows of perGalaxy.values()) rows.sort((a, b) => b.mtime.localeCompare(a.mtime));
  return { perGalaxy, unclassified, totalHandoffs, classifyOnly, preSince, missingFile };
}

// Cap how much of each transcript we read just to CLASSIFY it (content discovery).
// We don't need the whole 4-55MB file to know which galaxy it is -- a generous
// prefix of the conversational spine carries the slot signal + topic density.
const CLASSIFY_SPINE_CAP = 300_000; // chars (~75K tokens of spine -- plenty to classify)

/**
 * Stream a transcript far enough to (a) extract a slot hint (git-branch/cwd signal)
 * and (b) collect a spine SAMPLE for content classification. Stops early once it has
 * a slot hint AND enough spine -- never reads the whole file just to classify.
 * Returns { slotHint, spineSample }.
 */
async function sampleSpineAndSlot(file) {
  let slotHint = null;
  const parts = [];
  let chars = 0;
  const rl = createInterface({ input: createReadStream(file, { encoding: "utf8" }), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    if (!slotHint) { const s = extractSlotHint(line); if (s) slotHint = s; }
    let o;
    try { o = JSON.parse(line); } catch { continue; }
    if (o.type !== "user" && o.type !== "assistant") continue;
    const content = o.message?.content;
    if (typeof content === "string") {
      if (!isNoise(content)) { parts.push(content.slice(0, TEXT_BLOCK_CAP)); chars += Math.min(content.length, TEXT_BLOCK_CAP); }
    } else if (Array.isArray(content)) {
      for (const block of content) {
        if (block?.type === "text" && !isNoise(block.text)) { parts.push(block.text.slice(0, TEXT_BLOCK_CAP)); chars += Math.min(block.text.length, TEXT_BLOCK_CAP); }
      }
    }
    if (chars >= CLASSIFY_SPINE_CAP && slotHint) break; // have enough to classify
  }
  rl.close();
  return { slotHint, spineSample: parts.join("\n") };
}

/**
 * Discover, per galaxy, the mineable transcripts by reading each transcript's OWN
 * CONTENT (user directive 2026-06-09: the handoff system stubs -- read full transcripts).
 * Scans EVERY .jsonl in the index, samples its spine + slot hint, classifies via
 * classifyTranscriptContent, and assigns the session to every galaxy it scores into.
 * Returns { perGalaxy: Map<galaxy, rows[]>, scanned, unclassified }.
 * Slower than handoff discovery (reads a prefix of every file) but COMPLETE -- no
 * session is invisible for lacking a topic-matching handoff.
 */
// Classification cache: the 602-transcript content scan (a prefix-read of every
// .jsonl) is the slow part (~minutes). Caching it means the scan runs ONCE and
// every subsequent per-galaxy mining run reuses the assignments. Keyed by id ->
// {galaxies, slotHint}; invalidated per-id when the transcript mtime changes.
const CLASSIFY_CACHE = "H:/prism/state/shared/galaxy-transcript-mining/_classify-cache.json";

/** Load the classification cache (id -> {mtime, galaxies, slotHint}). {} if absent/corrupt. */
function loadClassifyCache() {
  try { return JSON.parse(readFileSync(CLASSIFY_CACHE, "utf8")); } catch { return {}; }
}
/** Atomically persist the classification cache. */
function saveClassifyCache(cache) {
  try {
    mkdirSync(path.dirname(CLASSIFY_CACHE), { recursive: true });
    const tmp = `${CLASSIFY_CACHE}.tmp-${process.pid}`;
    writeFileSync(tmp, JSON.stringify(cache), "utf8");
    renameSync(tmp, CLASSIFY_CACHE);
  } catch { /* cache is an optimization; a write failure is non-fatal */ }
}

export async function discoverByContent({ transcripts = null, registry = GALAXY_REGISTRY, minScore = 2, useCache = true, logImpl = (s) => process.stderr.write(s) } = {}) {
  const idx = transcripts || indexTranscripts();
  const perGalaxy = new Map(registry.map((g) => [g.galaxy, []]));
  let scanned = 0, unclassified = 0, cacheHits = 0;
  const rows = [...idx.values()];
  const cache = useCache ? loadClassifyCache() : {};
  let cacheDirty = false;
  for (const row of rows) {
    scanned++;
    let galaxies, slotHint;
    const cached = cache[row.id];
    // Reuse the cached classification when the transcript hasn't changed (mtime match).
    if (cached && cached.mtime === row.mtime && Array.isArray(cached.galaxies)) {
      galaxies = cached.galaxies; slotHint = cached.slotHint || null; cacheHits++;
    } else {
      let spineSample = "";
      try { ({ slotHint, spineSample } = await sampleSpineAndSlot(row.file)); }
      catch (e) { logImpl(`[mine-galaxy] classify-read FAILED ${row.id}: ${e.message}\n`); continue; }
      galaxies = classifyTranscriptContent(spineSample, { slotHint, registry, minScore }).galaxies.map((g) => g.galaxy);
      cache[row.id] = { mtime: row.mtime, galaxies, slotHint: slotHint || null };
      cacheDirty = true;
      if (scanned % 50 === 0) logImpl(`[mine-galaxy] content-classified ${scanned}/${rows.length} (${cacheHits} cached)...\n`);
    }
    if (galaxies.length === 0) { unclassified++; continue; }
    // perGalaxy is seeded from the CURRENT registry; a cache hit may carry a galaxy
    // string the registry has since dropped/renamed -> skip it (don't .push() onto undefined).
    for (const galaxy of galaxies) { const bucket = perGalaxy.get(galaxy); if (bucket) bucket.push({ ...row, slotHint }); }
  }
  if (useCache && cacheDirty) saveClassifyCache(cache);
  for (const list of perGalaxy.values()) list.sort((a, b) => b.mtime.localeCompare(a.mtime));
  return { perGalaxy, scanned, unclassified, cacheHits };
}

// ---- spine extraction + noise filter (cloned from the india/hotel pattern) ----

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

const ollamaLimit = makeLimiter(CONCURRENCY);

export async function ollamaCallOnce(prompt, model, timeoutMs = GEN_TIMEOUT_MS, opts = {}) {
  const {
    mcpEnabled = mcpRoutingEnabled(),
    callViaMcpImpl = callViaMcp,
    fetchImpl = fetch,
  } = opts;
  // Opt-in MCP overlay (PRISM_LOCAL_LLM_VIA_MCP): route through prism_local local_generate with
  // numCtx=NUM_CTX so the 32768-sized slices are not truncated, fail-soft to the direct path on
  // ANY MCP failure -- enabling the route can never break a working mine.
  if (mcpEnabled) {
    const r = await callViaMcpImpl(model, prompt, { numCtx: NUM_CTX, numPredict: MCP_NUM_PREDICT, timeoutMs });
    if (r && r.ok && typeof r.text === "string" && r.text.trim()) return r.text.trim();
    // fall through to the direct /api/generate path below (unchanged behavior)
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
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
    // skip-if-exists resume then treats as complete (india's reviewer P0; R12 silent-data-loss).
    if (!text) throw new Error(`ollama returned an empty response (model ${model}); failing rather than writing a partial digest`);
    return text;
  } finally {
    clearTimeout(timer);
  }
}

// Connection-class failures (503/502 load contention, fetch failed / connection reset from
// model-swap churn) are TRANSIENT on a fleet-shared GPU -- 8 concurrent chats hit the same
// Ollama; a single 503 must not fail a whole galaxy's synthesis. Bounded retry w/ backoff
// (intentionally sequential -- backoff IS the point). Genuine app errors (empty response,
// 4xx) are NOT retried -- they fail loud immediately.
const RETRYABLE_RE = /HTTP 50[23]|fetch failed|operation was aborted|ECONNRESET|ECONNREFUSED|socket hang up/i;
const OLLAMA_RETRIES = 3;
const RETRY_BACKOFF_MS = [15_000, 45_000, 90_000];

async function ollamaCall(prompt, model, timeoutMs = GEN_TIMEOUT_MS) {
  let lastErr;
  for (let attempt = 0; attempt <= OLLAMA_RETRIES; attempt++) {
    try {
      return await ollamaCallOnce(prompt, model, timeoutMs);
    } catch (e) {
      lastErr = e;
      if (attempt === OLLAMA_RETRIES || !RETRYABLE_RE.test(e.message || "")) throw e;
      const wait = RETRY_BACKOFF_MS[attempt] ?? 90_000;
      process.stderr.write(`[mine-galaxy] ollama transient (${e.message}) -- retry ${attempt + 1}/${OLLAMA_RETRIES} in ${wait / 1000}s\n`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

function ollama(prompt, model = MAP_MODEL, timeoutMs = GEN_TIMEOUT_MS) {
  return ollamaLimit(() => ollamaCall(prompt, model, timeoutMs));
}

function chunk(s, size) {
  const out = [];
  for (let i = 0; i < s.length; i += size) out.push(s.slice(i, i + size));
  return out;
}

// ---- per-galaxy prompts (specialized by the registry `vocab`) ----

const MAP_PROMPT = (vocab, slice) =>
  `You are mining a PRISM ${vocab} Claude-Code session transcript slice. Extract ONLY what matters for ` +
  `resuming this galaxy's work, as terse bullets under these headers (omit empty headers): ` +
  `SHIPPED (builds/commits), DECISIONS (architecture/scope + why), OPERATOR DIRECTIVES (verbatim asks), ` +
  `FINDINGS/BUGS, DOMAIN SPECIFICS (engines/actions/dispatchers/metrics/paths unique to this galaxy), ` +
  `TOOLS USED (which PRISM tools/dispatchers/skills/scripts/hooks), OPEN THREADS (what is still to build). ` +
  `No preamble.\n\nTRANSCRIPT SLICE:\n${slice}`;

const REDUCE_PROMPT = (id, vocab, parts) =>
  `Merge these slice-summaries from ONE PRISM ${vocab} session (${id}) into a single deduplicated session digest.\n` +
  `Same headers (SHIPPED, DECISIONS, OPERATOR DIRECTIVES, FINDINGS/BUGS, DOMAIN SPECIFICS, TOOLS USED, OPEN THREADS).\n` +
  `Terse bullets, drop duplicates, keep the most concrete (metric values, engine/action names, commit subjects, paths). No preamble.\n\n` +
  parts.map((p, i) => `--- slice ${i + 1} ---\n${p}`).join("\n\n");

const SYNTHESIS_PROMPT = (vocab, text) =>
  `Synthesize MULTIPLE PRISM ${vocab} session digests into ONE cross-session knowledge digest that gives this ` +
  `galaxy FULL CURRENT CONTEXT. Deduplicate aggressively. Output exactly these sections (omit one only if truly ` +
  `empty): ## What this galaxy is building, ## Shipped capabilities, ## Key decisions + rationale, ` +
  `## Standing operator directives, ## What is still to build (open threads), ## How to build it (patterns/sequence), ` +
  `## Tools to use (dispatchers/skills/scripts/hooks/system-viz/AI-systems/qdrant/obsidian/ollama), ` +
  `## Recurring findings + bugs. Terse bullets, concrete (metric values, engine/action names, commit subjects, paths). ` +
  `No preamble.\n\nSESSION DIGESTS:\n${text}`;

const SYNTHESIS_MERGE_PROMPT = (parts) =>
  `Merge these partial cross-session syntheses into ONE, same sections, deduplicated, terse. No preamble.\n\n` +
  parts.map((p, i) => `--- part ${i + 1} ---\n${p}`).join("\n\n");

async function mineOne(galaxy, vocab, row, outDir) {
  const outFile = path.join(outDir, `${row.id}.md`);
  if (existsSync(outFile) && !FORCE) return { id: row.id, status: "skipped(exists)" };
  const spine = await extractSpine(row.file);
  if (spine.length < MIN_SPINE_CHARS) {
    writeFileSync(outFile, `# ${galaxy} session ${row.id} (${row.mtime})\n\n_(no conversational content extracted)_\n`);
    return { id: row.id, status: "empty", spineKB: 0 };
  }
  const allSlices = chunk(spine, CHUNK_CHARS);
  // Bound the MAP fan-out: if a transcript exceeds the cap, sample HEAD+TAIL slices so a
  // giant live session costs MAX_SLICES_PER_TX calls, not one-per-90KB. sampled<total flagged.
  let slices = allSlices, sampled = false;
  if (allSlices.length > MAX_SLICES_PER_TX) {
    const head = Math.ceil(MAX_SLICES_PER_TX / 2), tail = MAX_SLICES_PER_TX - head;
    slices = [...allSlices.slice(0, head), ...allSlices.slice(allSlices.length - tail)];
    sampled = true;
  }
  const partSummaries = await Promise.all(slices.map((sl) => ollama(MAP_PROMPT(vocab, sl), MAP_MODEL)));
  const digest = partSummaries.length === 1 ? partSummaries[0] : await ollama(REDUCE_PROMPT(row.id, vocab, partSummaries), MAP_MODEL);
  const sliceNote = sampled ? `${slices.length} of ${allSlices.length} slice(s), HEAD+TAIL sampled` : `${slices.length} slice(s)`;
  writeFileSync(
    outFile,
    `# ${galaxy} session ${row.id} (${row.mtime}, ${row.mb}MB, spine ${(spine.length / 1024).toFixed(0)}KB, ${sliceNote}, model ${MAP_MODEL})\n\n${digest}\n`
  );
  return { id: row.id, status: "mined", spineKB: +(spine.length / 1024).toFixed(0), slices: slices.length, sampled };
}

async function synthesize(vocab, digests) {
  const joined = digests.join("\n\n---\n\n");
  if (joined.length <= CHUNK_CHARS) return ollama(SYNTHESIS_PROMPT(vocab, joined), SYNTH_MODEL, SYNTH_TIMEOUT_MS);
  const parts = await Promise.all(chunk(joined, CHUNK_CHARS).map((c) => ollama(SYNTHESIS_PROMPT(vocab, c), SYNTH_MODEL, SYNTH_TIMEOUT_MS)));
  return ollama(SYNTHESIS_MERGE_PROMPT(parts), SYNTH_MODEL, SYNTH_TIMEOUT_MS);
}

/** Build the per-galaxy vault memory doc (frontmatter + body). Pure -- exported for tests. */
export function buildVaultDoc(galaxy, synthesis, n, mineable, date) {
  const fm =
    `---\n` +
    `name: reference_${galaxy}_transcript_synthesis\n` +
    `description: "Ollama-mined cross-session synthesis of ${galaxy}-galaxy transcripts (${n} of ${mineable} mineable sessions, ${date}): what it is building, shipped capabilities, decisions, standing directives, what is still to build, how, and which tools. Auto-generated by scripts/mine-galaxy-transcripts.mjs."\n` +
    `metadata:\n  node_type: memory\n  type: reference\n  galaxy: ${galaxy}\n  auto_generated: true\n  coverage_sessions: ${n}\n  mineable_sessions: ${mineable}\n---\n\n`;
  return `${fm}# ${galaxy} galaxy cross-session synthesis (${n} of ${mineable} mineable sessions, ${date})\n\n${synthesis}\n`;
}

/** Read coverage_sessions from an existing vault doc (0 if absent/unreadable). Pure -- exported for tests. */
export function parseCoverage(text) {
  if (typeof text !== "string") return 0;
  const m = text.match(/coverage_sessions:\s*(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

/** Feed a galaxy's synthesis into the vault. SHRINK-GUARD (the 2026-06-08 clobber class):
 *  refuse to overwrite a larger-coverage synthesis with a smaller one unless --force-vault. */
function writeVaultMemory(galaxy, synthesis, n, mineable, date) {
  mkdirSync(VAULT_DIR, { recursive: true });
  const vaultFile = path.join(VAULT_DIR, `reference_${galaxy}_transcript_synthesis.md`);
  const prev = existsSync(vaultFile) ? parseCoverage(readFileSync(vaultFile, "utf8")) : 0;
  if (n < prev && !FORCE_VAULT) {
    console.log(`[mine-galaxy] ${galaxy} VAULT SKIP -- refusing to clobber a ${prev}-session synthesis with a smaller ${n}-session one (shrink-guard; --force-vault to override)`);
    return false;
  }
  writeFileSync(vaultFile, buildVaultDoc(galaxy, synthesis, n, mineable, date));
  return true;
}

/** Mine one galaxy end-to-end: per-session digests -> synthesis -> vault. */
async function mineGalaxy(galaxyKey, rows, mineable) {
  const entry = getGalaxy(galaxyKey);
  const vocab = entry ? entry.vocab : galaxyKey;
  const outDir = path.join(OUT_ROOT, galaxyKey);
  mkdirSync(outDir, { recursive: true });
  const attempt = LIMIT ? rows.slice(0, LIMIT) : rows;
  console.log(`[mine-galaxy] ${galaxyKey}: ${mineable} mineable >= ${SINCE}; mining ${attempt.length}${LIMIT ? ` (--limit ${LIMIT})` : ""}, ${attempt.reduce((s, r) => s + r.mb, 0).toFixed(0)}MB`);
  const results = [];
  for (const row of attempt) {
    const t0 = Date.now();
    try {
      const r = await mineOne(galaxyKey, vocab, row, outDir);
      console.log(`[mine-galaxy] ${galaxyKey}/${row.id} ${r.status} ${r.spineKB ? `spine=${r.spineKB}KB` : ""} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
      results.push(r);
    } catch (e) {
      console.log(`[mine-galaxy] ${galaxyKey}/${row.id} ERROR ${e.message}`);
      results.push({ id: row.id, status: "error", error: e.message });
    }
  }
  // Coverage = sessions that produced REAL content. "empty" digests (spine < 200 chars,
  // a "(no content)" placeholder) are NOT counted -- counting them would inflate
  // coverage_sessions and feed placeholder text into the synthesis (R12 honesty; the
  // shrink-guard reads coverage_sessions, so an honest count keeps the guard honest).
  const okIds = new Set(results.filter((r) => r.status === "mined" || r.status === "skipped(exists)").map((r) => r.id));
  const okRows = attempt.filter((r) => okIds.has(r.id) && existsSync(path.join(outDir, `${r.id}.md`)));
  if (okRows.length === 0) { console.log(`[mine-galaxy] ${galaxyKey}: nothing mined, no synthesis`); return { galaxy: galaxyKey, mined: 0, wrote: false }; }
  const date = new Date().toISOString().slice(0, 10);
  const digests = okRows.map((r) => readFileSync(path.join(outDir, `${r.id}.md`), "utf8"));
  try {
    const synthesis = await synthesize(vocab, digests);
    writeFileSync(path.join(outDir, "_SYNTHESIS.md"), `# ${galaxyKey} galaxy CROSS-SESSION SYNTHESIS (${okRows.length} of ${mineable} mineable, model ${SYNTH_MODEL}, ${date})\n\n${synthesis}\n`);
    const wrote = VAULT ? writeVaultMemory(galaxyKey, synthesis, okRows.length, mineable, date) : false;
    console.log(`[mine-galaxy] ${galaxyKey} SYNTHESIS -> _SYNTHESIS.md${wrote ? ` + vault` : ""}`);
    return { galaxy: galaxyKey, mined: okRows.length, wrote };
  } catch (e) {
    console.log(`[mine-galaxy] ${galaxyKey} SYNTHESIS ERROR ${e.message}`);
    return { galaxy: galaxyKey, mined: okRows.length, wrote: false, error: e.message };
  }
}

async function main() {
  // Discovery mode: --content reads every transcript's OWN content (complete, no
  // handoff-stub coverage hole -- user directive 2026-06-09); default keys off
  // handoff filenames (faster, but ceilinged by handoff coverage).
  let perGalaxy, discoveryMeta;
  // --next-unpopulated needs full per-galaxy mineable counts -> always use content discovery
  // (the cache makes it ~50ms warm), regardless of whether --content was passed explicitly.
  if (CONTENT || NEXT_UNPOP) {
    const r = await discoverByContent();
    perGalaxy = r.perGalaxy;
    discoveryMeta = { mode: "content", scanned: r.scanned, unclassified: r.unclassified, cacheHits: r.cacheHits };
  } else {
    const r = discoverPerGalaxy();
    perGalaxy = r.perGalaxy;
    discoveryMeta = { mode: "handoff", totalHandoffs: r.totalHandoffs, unclassified: r.unclassified, classifyOnly: r.classifyOnly, preSince: r.preSince, missingFile: r.missingFile };
  }

  if (DRY_RUN) {
    const summary = GALAXY_KEYS.map((g) => ({ galaxy: g, mineable: perGalaxy.get(g).length })).sort((a, b) => b.mineable - a.mineable);
    const covered = summary.filter((s) => s.mineable > 0).length;
    const zero = summary.filter((s) => s.mineable === 0).map((s) => s.galaxy);
    if (JSON_OUT) {
      console.log(JSON.stringify({ ...discoveryMeta, galaxiesCovered: covered, totalGalaxies: GALAXY_KEYS.length, zeroCoverage: zero, perGalaxy: summary }, null, 2));
    } else {
      if (discoveryMeta.mode === "content") {
        console.log(`[mine-galaxy] DRY-RUN (content): ${discoveryMeta.scanned} transcripts scanned | ${discoveryMeta.unclassified} matched NO galaxy | ${covered}/${GALAXY_KEYS.length} galaxies have >=1 mineable transcript`);
      } else {
        console.log(`[mine-galaxy] DRY-RUN (handoff): ${discoveryMeta.totalHandoffs} topic-bearing handoffs | ${discoveryMeta.unclassified} matched NO galaxy | ${discoveryMeta.classifyOnly} classify-only (slot-keyed) | ${discoveryMeta.preSince} excluded by SINCE>=${SINCE} | ${discoveryMeta.missingFile} transcript genuinely gone | ${covered}/${GALAXY_KEYS.length} galaxies have >=1 mineable transcript`);
      }
      for (const s of summary) console.log(`  ${s.galaxy.padEnd(22)} ${s.mineable}`);
      if (zero.length) console.log(`[mine-galaxy] ZERO-COVERAGE galaxies (no mineable transcript -> no vault memo will be written): ${zero.join(", ")}`);
    }
    return;
  }

  // Which galaxies to mine: --all, --next-unpopulated (highest-ROI memo-less galaxies), or a single --galaxy.
  const hasVaultMemo = (g) => existsSync(path.join(VAULT_DIR, `reference_${g}_transcript_synthesis.md`));
  let targets;
  if (NEXT_UNPOP) {
    // Highest mineable-count first; skip galaxies that already have a vault memo or 0 transcripts.
    const ranked = GALAXY_KEYS
      .map((g) => ({ g, n: perGalaxy.get(g).length }))
      .filter((x) => x.n > 0 && !hasVaultMemo(x.g) && (!BACKEND_ONLY || BACKEND_GALAXIES.has(x.g)))
      .sort((a, b) => b.n - a.n);
    if (ranked.length === 0) { console.log(`[mine-galaxy] --next-unpopulated: every galaxy with mineable transcripts already has a vault memo. Nothing to do.`); return; }
    targets = ranked.slice(0, NEXT_COUNT).map((x) => x.g);
    console.log(`[mine-galaxy] --next-unpopulated: ${ranked.length} galaxies still memo-less; mining top ${targets.length} by ROI: ${targets.map((g) => `${g}(${perGalaxy.get(g).length})`).join(", ")}`);
  } else if (ALL) targets = GALAXY_KEYS;
  else if (ONE_GALAXY) {
    if (!GALAXY_KEYS.includes(ONE_GALAXY)) { console.error(`[mine-galaxy] FAIL-LOUD: unknown galaxy "${ONE_GALAXY}". Known: ${GALAXY_KEYS.join(", ")}`); process.exit(1); }
    targets = [ONE_GALAXY];
  } else {
    console.error(`[mine-galaxy] no target. Use --dry-run, --galaxy <name>, --next-unpopulated, or --all. Known galaxies: ${GALAXY_KEYS.join(", ")}`);
    process.exit(1);
  }

  mkdirSync(OUT_ROOT, { recursive: true });
  const runResults = [];
  for (const g of targets) {
    const rows = perGalaxy.get(g);
    if (rows.length === 0) { console.log(`[mine-galaxy] ${g}: 0 mineable transcripts -- skipping`); runResults.push({ galaxy: g, mined: 0, wrote: false }); continue; }
    runResults.push(await mineGalaxy(g, rows, rows.length));
  }
  const wrote = runResults.filter((r) => r.wrote).length;
  const mined = runResults.reduce((s, r) => s + r.mined, 0);
  // P1-B (R12): roll up the galaxies that wrote NOTHING at the SUMMARY level, so a
  // 0-coverage galaxy can never silently pass under "done". "Every galaxy accounted
  // for" is only TRUE if this list is empty OR every entry is structurally-empty.
  const noWrite = runResults.filter((r) => !r.wrote).map((r) => r.galaxy);
  console.log(`[mine-galaxy] DONE -- ${targets.length} galaxy(ies) targeted, ${mined} session-digests, ${wrote} vault syntheses written. Discovery: ${discoveryMeta.mode}, ${discoveryMeta.unclassified} unclassified.`);
  if (noWrite.length) {
    console.log(`[mine-galaxy] ${noWrite.length} of ${targets.length} galaxies wrote NO synthesis (zero mineable or all-failed): ${noWrite.join(", ")}`);
    console.log(`[mine-galaxy] -> those galaxies retain their PRIOR brain context (not updated this run). 'dormant-data' is structurally empty (slot 'victor' unassigned).`);
  } else {
    console.log(`[mine-galaxy] every targeted galaxy wrote a synthesis -- full coverage for this run.`);
  }
  // R12: the compounding is NOT automatic. A freshly-written vault memo is invisible
  // to galaxy-synthesis-refresh until the recall sidecars are rebuilt (its staleness
  // check clusters on embedding-recall topK; a memo absent from the index never changes
  // the cluster hash -> the galaxy reads 'fresh' and the memo is never compounded).
  // PROVEN (slot:kilo 2026-06-09): speed-feed memo entered its cluster ONLY after the
  // index + embeddings rebuild below; then synthesis-refresh sees it. Run, in order:
  if (wrote > 0) {
    console.log(`[mine-galaxy] Next (REQUIRED to compound into the brains -- run in order):`);
    console.log(`  1. node scripts/build-memory-index-sidecar.mjs        # BM25 index sees the new memos`);
    console.log(`  2. node scripts/build-memory-embeddings-sidecar.mjs --resume   # dense recall arm embeds them`);
    console.log(`  3. node scripts/galaxy-synthesis-refresh.mjs          # detects changed clusters -> compounds into <galaxy>/MEMORY.md (+ its own cascade re-indexes)`);
    console.log(`[mine-galaxy] Without steps 1-2 the memos are written to the vault but galaxy-synthesis-refresh will read every galaxy as 'fresh' and compound nothing.`);
  }
}

const __isMain = (() => { try { return import.meta.url === pathToFileURL(process.argv[1] || "").href; } catch { return false; } })();
if (__isMain) main().catch((e) => { console.error("[mine-galaxy] FATAL", e); process.exit(1); });
