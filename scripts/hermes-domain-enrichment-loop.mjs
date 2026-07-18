#!/usr/bin/env node
/**
 * hermes-domain-enrichment-loop.mjs  (HERMES-KNOWLEDGE / U-HERMES-ENRICHMENT-LOOP, slot:zulu)
 *
 * Engineered per-domain parallel-Hermes knowledge-enrichment loop. Operator directive
 * (2026-06-29): "run loops for each domain with a parallel hermes agent until we
 * physically exhaust all knowledge available within our system and outside sources...
 * utilize engineered loops, harnesses and crons. it has to be usable when needed and
 * logically makes sense to pull the knowledge automatically."
 *
 * WHAT IT DOES (one run = one parallel pass over all 6 domains):
 *   - For each of delta/echo/foxtrot/mike/whiskey/kilo, fires ONE Hermes/Grok agent
 *     on a ROTATING focus axis (so every pass DIVERGES), in parallel (Promise.allSettled).
 *   - Dedups vs the per-domain ledger (normalized-title seen-set = the "exhaustion" cursor).
 *   - NOVELTY-STOP: a run yielding < NOVELTY_FLOOR fresh items increments a dry streak;
 *     after DRY_STREAK_MAX consecutive dry runs the domain is marked EXHAUSTED (skipped
 *     until --reset). This is the "loop until knowledge is exhausted" the operator asked for.
 *   - Re-emits the auto-pullable STAGING tips file (capture-tip schema) every run.
 *
 * SAFETY / BOUNDARY (R12 + shard-clobber discipline):
 *   - Cron-generated items are UNREVIEWED -> conservative confidence + needs_specialist_confirm:true
 *     + tag verify:unreviewed-cron. A specialist (foxtrot/whiskey/mike/kilo/echo/delta) confirms
 *     the threshold vs the cited source before ANY safety gate fires. Never fire an S(x)/machine
 *     gate on LLM assertion alone.
 *   - Writes ONLY to state/shared/hermes-enrichment/<domain>.json ledgers + the staging file.
 *     NEVER the live tribal index (golf/india own the shard-safe embed; [[reference_tribal_shard_read_clobber_2026_06_10]]).
 *   - Dark Hermes lane -> graceful skip (logged), never crash (so the cron is safe unattended).
 *
 * CLI:
 *   node scripts/hermes-domain-enrichment-loop.mjs            # one live parallel pass + emit
 *   node scripts/hermes-domain-enrichment-loop.mjs --domain cad   # single domain
 *   node scripts/hermes-domain-enrichment-loop.mjs --status   # per-domain progress (no calls)
 *   node scripts/hermes-domain-enrichment-loop.mjs --emit     # re-emit staging from ledgers only
 *   node scripts/hermes-domain-enrichment-loop.mjs --reset [domain]   # clear exhausted flag(s)
 *
 * Env knobs: PRISM_HERMES_PROXY_URL (default http://127.0.0.1:8645/v1),
 *   PRISM_HERMES_ENRICH_MODEL, _NOVELTY_FLOOR (2), _DRY_MAX (2), _ITEMS (7).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";

const ROOT = resolve(process.cwd());
const LEDGER_DIR = "state/shared/hermes-enrichment";
const STAGING = "state/shared/staging/hermes-enrichment-loop-tips.json";
const DIGEST = "state/shared/staging/hermes-enrichment-digest.md"; // specialist-readable review surface
// LANE: default to the LOCAL grok proxy (:8645) -- NOT the shared PRISM_HERMES_PROXY_URL, which the
// fleet (alpha HERMES-NVIDIA-LANE 2026-06-30) repointed to NVIDIA NIM cloud (which does NOT serve a
// grok model -> 404). grok-4.20-reasoning is the stronger model for knowledge-gen. To use the NVIDIA
// CLOUD lane instead: set PRISM_HERMES_ENRICH_PROXY_URL=https://integrate.api.nvidia.com/v1 +
// PRISM_HERMES_ENRICH_MODEL=meta/llama-3.3-70b-instruct + NVIDIA_API_KEY (the "local AND cloud" choice).
// AUTO-FAILOVER LANES (no-downtime): probe local grok (:8645, strong+fast) -> NVIDIA cloud (reliable)
// in order; the FIRST lane that probes UP is used. A dark lane never stalls the cron -- it falls through;
// if ALL are dark the run is a safe no-op. Each lane env-overridable. Bearer matches ask-hermes.mjs.
const LOCAL_URL = process.env.PRISM_HERMES_ENRICH_PROXY_URL || "http://127.0.0.1:8645/v1";
const LOCAL_MODEL = process.env.PRISM_HERMES_ENRICH_MODEL || "grok-4.20-0309-reasoning";
const LOCAL_TOKEN = process.env.PRISM_HERMES_TOKEN || "prism";
const CLOUD_URL = process.env.PRISM_HERMES_ENRICH_CLOUD_URL || "https://integrate.api.nvidia.com/v1";
const CLOUD_MODEL = process.env.PRISM_HERMES_ENRICH_CLOUD_MODEL || "meta/llama-3.3-70b-instruct";
const NVIDIA_KEY = process.env.NVIDIA_API_KEY || "";
// Groq cloud (OpenAI-compatible, FAST free tier; operator-suggested 2026-06-30). Env-gated: inert until
// GROQ_API_KEY is set. Faster than NVIDIA llama (which times out >180s), so ordered before it.
const GROQ_KEY = process.env.GROQ_API_KEY || "";
const GROQ_URL = process.env.PRISM_HERMES_ENRICH_GROQ_URL || "https://api.groq.com/openai/v1";
const GROQ_MODEL = process.env.PRISM_HERMES_ENRICH_GROQ_MODEL || "llama-3.3-70b-versatile";
// Google AI Studio (Gemini) -- OpenAI-compat endpoint; env-gated on GOOGLE_API_KEY/GEMINI_API_KEY. Model tunable
// (verify the exact id before relying -- ids drift; gemini-1.5-flash chosen for free-tier throughput over -pro).
const GOOGLE_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "";
const GOOGLE_URL = process.env.PRISM_HERMES_ENRICH_GOOGLE_URL || "https://generativelanguage.googleapis.com/v1beta/openai";
// VERIFIED 2026-06-30: gemini-1.5-flash + -1.5-pro are 404 (deprecated); gemini-2.0-flash is the live id
// (429 free-tier rate-limited but valid). The 429 backoff + per-call failover handle rate limits gracefully.
const GOOGLE_MODEL = process.env.PRISM_HERMES_ENRICH_GOOGLE_MODEL || "gemini-2.0-flash";
// OpenRouter -- OpenAI-compat aggregator (rotated free tiers); env-gated on OPENROUTER_API_KEY.
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_URL = process.env.PRISM_HERMES_ENRICH_OPENROUTER_URL || "https://openrouter.ai/api/v1";
const OPENROUTER_MODEL = process.env.PRISM_HERMES_ENRICH_OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free";
// local Ollama (:11434, OpenAI-compatible) -- ALWAYS UP (Ollama Serve task), free; the no-downtime floor.
// NOTE (R12, tested 2026-06-30): gpt-oss:120b (65GB, fits the 96GB Blackwell) is too SLOW for the per-call
// timeout (>240s for a 7-item gen) -> it just times out and fails over. gpt-oss:20b is the speed/quality floor.
const OLLAMA_URL = process.env.PRISM_HERMES_ENRICH_OLLAMA_URL || "http://127.0.0.1:11434/v1";
// gpt-oss:20b (general reasoning) >> a code model for manufacturing knowledge quality; 13.8GB, fast enough to
// avoid GPU contention with the nightly mine crons. gpt-oss:120b is higher quality but 65GB/slower.
const OLLAMA_MODEL = process.env.PRISM_HERMES_ENRICH_OLLAMA_MODEL || "gpt-oss:20b";
const PROXY = LOCAL_URL; // back-compat default for probeLane(_, proxy)

/**
 * Lane candidates in priority order: local grok (best quality, when up) -> local Ollama (fast, reliable,
 * free, always up) -> NVIDIA cloud (good quality but slow/timeout-prone, last resort). Per-call failover
 * (makeFailoverAsk) tries each in turn, so a lane that is dark / health-200-but-404 / times out is skipped.
 */
export function laneCandidates() {
  const lanes = [{ name: "local-grok", url: LOCAL_URL, model: LOCAL_MODEL, token: LOCAL_TOKEN }];
  lanes.push({ name: "local-ollama", url: OLLAMA_URL, model: OLLAMA_MODEL, token: "ollama" });
  if (GROQ_KEY) lanes.push({ name: "cloud-groq", url: GROQ_URL, model: GROQ_MODEL, token: GROQ_KEY }); // fast; before nvidia
  if (GOOGLE_KEY) lanes.push({ name: "cloud-google", url: GOOGLE_URL, model: GOOGLE_MODEL, token: GOOGLE_KEY });
  if (OPENROUTER_KEY) lanes.push({ name: "cloud-openrouter", url: OPENROUTER_URL, model: OPENROUTER_MODEL, token: OPENROUTER_KEY });
  if (NVIDIA_KEY) lanes.push({ name: "cloud-nvidia", url: CLOUD_URL, model: CLOUD_MODEL, token: NVIDIA_KEY });
  return lanes;
}
const NOVELTY_FLOOR = Number(process.env.PRISM_HERMES_ENRICH_NOVELTY_FLOOR || 2);
const DRY_STREAK_MAX = Number(process.env.PRISM_HERMES_ENRICH_DRY_MAX || 2);
const ITEMS_PER_RUN = Number(process.env.PRISM_HERMES_ENRICH_ITEMS || 7);
// the grok proxy rate-limits ~>2 concurrent (observed live: 6-wide -> 429). Cap concurrency + back off.
const CONCURRENCY = Number(process.env.PRISM_HERMES_ENRICH_CONCURRENCY || 2);
const RETRY_429 = Number(process.env.PRISM_HERMES_ENRICH_RETRY || 3);
// cloud NVIDIA llama-3.3-70b can take >120s for a 7-item generation -> a 120s abort fails it. 180s default.
const CALL_TIMEOUT_MS = Number(process.env.PRISM_HERMES_ENRICH_TIMEOUT_MS || 180000);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Run fn over items with bounded concurrency; a throwing fn yields {__error} (never rejects the pool). */
export async function mapPool(items, concurrency, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      try { out[idx] = await fn(items[idx], idx); }
      catch (e) { out[idx] = { __error: String(e?.message || e) }; }
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, worker));
  return out;
}

export const DOMAINS = [
  { key: "mill", slot: "foxtrot", category: "milling", ops: ["milling"], expert: "CNC milling process engineer" },
  { key: "lathe", slot: "whiskey", category: "turning", ops: ["turning"], expert: "CNC turning/lathe process engineer" },
  { key: "wedm", slot: "mike", category: "wedm", ops: ["wire_edm"], expert: "wire-EDM process engineer" },
  { key: "cam", slot: "kilo", category: "cam", ops: ["cam_strategy"], expert: "CAM toolpath strategy authority" },
  { key: "post-processor", slot: "echo", category: "post_processor", ops: ["post"], expert: "CNC post-processor and controller-dialect authority" },
  { key: "cad", slot: "delta", category: "cad_gdt", ops: ["cad"], expert: "CAD/MBD/GD&T and STEP geometry authority" },
];

// rotating focus axes -> every pass diverges to a fresh slice of the domain
export const AXES = [
  "tooling and holder selection", "thermal and heat management", "cutting force / deflection / stiffness",
  "surface finish and metrology", "fixturing / workholding / clamping", "error compensation and calibration",
  "material-specific (Ti / Inconel / stainless / hardened steel)", "statistical process control and tool-life distribution",
  "feeds and speeds optimization windows", "collision / safety / clearance", "programming / G-code / cycle dialects",
  "cost / cycle-time / economics",
  // expanded for "maximum knowledge" -- categories distinct from the 12 above (not overlaps):
  "chatter / vibration / stability-lobe dynamics and dynamic stiffness", // dynamics, not static force/deflection
  "coolant / lubrication strategy / chip evacuation (flood vs MQL vs through-tool)", // delivery+chip, not thermal
  "tool wear mechanisms (flank / crater / BUE / chipping) and condition monitoring", // wear MODES, not life-SPC
  "in-process inspection / on-machine probing / closed-loop metrology", // during-cut, not post-process finish
  "automation / lights-out / pallet & robot integration / setup reduction",
  "cutting-edge preparation / micro-geometry / coating selection",
];

export function norm(t) { return (t || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 80); }

// ── H-DRIVE GROUNDING (directive: enrich FROM the actual H-drive corpus, not just model training) ──
// Consume each domain's curated, H-drive-derived MEMORY.md (real shop machines, materials, known
// gotchas) as COMPACT grounding so generated tips are PRISM/JM-Die-specific and DIVERGE from what the
// shop already knows -- not generic textbook recall. This closes the directive's first half ("from ALL
// H-drive files") by CONSUMING existing atlas/MEMORY output, never rebuilding a miner. Fail-soft:
// missing file -> "" -> ungrounded generation (no regression). Knob: PRISM_HERMES_ENRICH_GROUND=0.
const GROUND_ENABLED = process.env.PRISM_HERMES_ENRICH_GROUND !== "0";
const GROUND_CAP = Number(process.env.PRISM_HERMES_ENRICH_GROUND_CAP || 1200);
const _groundCache = new Map();
export function loadGrounding(domainKey, opts = {}) {
  if (!GROUND_ENABLED) return "";
  const custom = !!(opts.readFileImpl || opts.existsImpl);
  if (!custom && _groundCache.has(domainKey)) return _groundCache.get(domainKey);
  const readFileImpl = opts.readFileImpl || readFileSync;
  const existsImpl = opts.existsImpl || existsSync;
  const p = resolve(ROOT, `mcp-server/src/engines/${domainKey}/MEMORY.md`);
  let out = "";
  try {
    if (existsImpl(p)) {
      const bullets = readFileImpl(p, "utf8")
        .replace(/<!--[\s\S]*?-->/g, "")   // strip HTML-comment fences (galaxy-brain-fill markers etc.)
        .split("\n")
        .map((l) => l.trim())
        // keep knowledge bullets; drop master-brain/doctrine plumbing AND project-management meta
        // (pivots / workload / team / session bookkeeping) -- neither is shop manufacturing knowledge.
        .filter((l) => l.startsWith("- ") &&
          !/master-?brain|semantic_search|back-?pointer|master-sync|auto-fed|\bpush\b|\bpull\b|stop-obsidian|knowledge\/memories/i.test(l) &&
          !/\bpivot|workload|\bteam'?s?\b|decision was made|workload distribution|sprint|standup|handoff/i.test(l))
        .map((l) => l.replace(/\s+/g, " "));
      out = bullets.join("\n").slice(0, GROUND_CAP);
    }
  } catch { out = ""; }
  if (!custom) _groundCache.set(domainKey, out);
  return out;
}

// CITED-TIPS grounding: the densest H-drive knowledge we have is the page-cited PDF-extraction tip
// corpus (milling-pdf-cited-tips 326 headlines, wedm/controller/lathe/cam *-tips). Surfacing a SAMPLE of
// their titles tells the generator which topics are ALREADY cited -> DIVERGE to new sub-aspects, and
// anchors generation in real shop sources. Robust-by-degradation: matches headline|title across the
// varied .ts schemas; a file with neither contributes nothing (never crashes). 5/6 domains; cad has none.
const CITED_TIPS_SOURCES = {
  mill: ["tribal-tips/milling-pdf-cited-tips.ts"],
  lathe: ["lathe-physics-science-tips.ts"],
  wedm: ["wedm-knowledge-tips.ts"],
  cam: ["fusion360-cam-tips.ts", "mastercam-cam-tips.ts"], // tier-1 CAM priority (Fusion > Mastercam)
  "post-processor": ["controller-knowledge-tips.ts", "tribal-tips/post-pdf-cited-tips.ts"],
  cad: [], // no cited-tips corpus -> composeGrounding falls back to MEMORY.md only
};
const CITED_CAP = Number(process.env.PRISM_HERMES_ENRICH_CITED_CAP || 900);
const CITED_SAMPLE = Number(process.env.PRISM_HERMES_ENRICH_CITED_N || 12);
const GROUND_CAP_TOTAL = Number(process.env.PRISM_HERMES_ENRICH_GROUND_TOTAL || 2000);
const _citedCache = new Map();
export function loadCitedTips(domainKey, opts = {}) {
  if (!GROUND_ENABLED) return "";
  const custom = !!(opts.readFileImpl || opts.existsImpl || opts.sources);
  if (!custom && _citedCache.has(domainKey)) return _citedCache.get(domainKey);
  const readFileImpl = opts.readFileImpl || readFileSync;
  const existsImpl = opts.existsImpl || existsSync;
  const sources = opts.sources || CITED_TIPS_SOURCES[domainKey] || [];
  const titles = [];
  const re = /(?:headline|title):\s*"([^"]{8,140})"/g;  // human-readable tip text across schemas
  for (const rel of sources) {
    if (titles.length >= CITED_SAMPLE) break;
    const p = resolve(ROOT, `mcp-server/src/data/${rel}`);
    try {
      if (!existsImpl(p)) continue;
      for (const m of readFileImpl(p, "utf8").matchAll(re)) {
        if (titles.length >= CITED_SAMPLE) break;
        const t = (m[1] || "").replace(/\s+/g, " ").trim();
        if (t && !titles.includes(t)) titles.push(t);
      }
    } catch { /* fail-soft per source */ }
  }
  const out = titles.map((t) => `- ${t}`).join("\n").slice(0, CITED_CAP);
  if (!custom) _citedCache.set(domainKey, out);
  return out;
}

// Combine the two H-drive grounding sources into one labeled block (cited PDF facts FIRST -- most
// authoritative -- then MEMORY.md domain context), hard-capped. Fail-soft: either source may be empty.
export function composeGrounding(domainKey, opts = {}) {
  const cited = loadCitedTips(domainKey, opts.cited || {});
  const mem = loadGrounding(domainKey, opts.mem || {});
  const parts = [];
  if (cited) parts.push(`Topics ALREADY cited from this shop's H-drive PDF corpus (DIVERGE to new sub-aspects, don't restate):\n${cited}`);
  if (mem) parts.push(`Domain context (machines / materials / known rules):\n${mem}`);
  return parts.join("\n\n").slice(0, GROUND_CAP_TOTAL);
}

export function loadLedger(domainKey) {
  const p = resolve(ROOT, `${LEDGER_DIR}/${domainKey}.json`);
  if (!existsSync(p)) return { domain: domainKey, items: [], seen: [], axisIdx: 0, dryStreak: 0, exhausted: false, runs: 0 };
  try { return JSON.parse(readFileSync(p, "utf8")); }
  catch { return { domain: domainKey, items: [], seen: [], axisIdx: 0, dryStreak: 0, exhausted: false, runs: 0, _recovered: true }; }
}
function saveLedger(L) {
  const p = resolve(ROOT, `${LEDGER_DIR}/${L.domain}.json`);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(L, null, 2) + "\n");
}

/** One call to ONE lane (429/503 backoff). Throws on http error/timeout/empty. fetchImpl injectable for tests. */
async function callLane(lane, { system, prompt }, { attempt = 0, fetchImpl = fetch } = {}) {
  const res = await fetchImpl(`${lane.url}/chat/completions`, {
    method: "POST", headers: { Authorization: `Bearer ${lane.token}`, "content-type": "application/json" },
    body: JSON.stringify({ model: lane.model, messages: [{ role: "system", content: system }, { role: "user", content: prompt }], temperature: 0.4 }),
    signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
  });
  if ((res.status === 429 || res.status === 503) && attempt < RETRY_429) {
    await sleep(5000 * (attempt + 1)); // 5s, 10s, 15s backoff on rate-limit
    return callLane(lane, { system, prompt }, { attempt: attempt + 1, fetchImpl });
  }
  if (!res.ok) throw new Error(`${lane.name} ${res.status}`);
  const j = await res.json();
  const content = j.choices?.[0]?.message?.content || "";
  if (!content.trim()) throw new Error(`${lane.name} empty`);
  return content;
}

/**
 * PER-CALL lane failover (the no-downtime core): try each lane in order; the FIRST to return non-empty
 * content wins. A lane that is dark (refused), health-200-but-404, times out, or returns empty is skipped
 * to the next. Throws only if EVERY lane fails. log(laneName) fires on the winning lane.
 */
export function makeFailoverAsk(lanes = laneCandidates(), { log = () => {}, fetchImpl = fetch } = {}) {
  return async function ask(msg) {
    let lastErr;
    for (const lane of lanes) {
      try {
        const out = await callLane(lane, msg, { fetchImpl });
        log(lane.name);
        return out;
      } catch (e) { lastErr = e; }
    }
    throw lastErr || new Error("all lanes failed");
  };
}

/** Resolve the first UP lane (probe each in priority order). Returns the lane, or null if ALL dark. */
export async function resolveLane(probe = probeLane, candidates = laneCandidates()) {
  for (const lane of candidates) {
    if (await probe(fetch, lane.url)) return lane;
  }
  return null;
}

export async function probeLane(fetchImpl = fetch, proxy = PROXY) {
  const origin = proxy.replace(/\/v1\/?$/, "");
  // cloud endpoints (NVIDIA NIM etc) expose no /health -> assume up; per-call errors are isolated by mapPool.
  if (!/127\.0\.0\.1|localhost|::1/.test(origin)) return true;
  try {
    const r = await fetchImpl(`${origin}/health`, { signal: AbortSignal.timeout(2500) });
    if (!r.ok) return false;
    const j = await r.json().catch(() => ({}));
    return j.authenticated !== false;
  } catch { return false; }
}

// parse a Hermes numbered (a)-(e) block list -> structured items
export function parseItems(text) {
  const blocks = (text || "").split(/\n(?=\s*\d+\.\s)/).map((s) => s.trim()).filter(Boolean);
  const out = [];
  for (const b of blocks) {
    const rule = (b.match(/\(a\)\s*([^\n(]+)/) || [])[1] || b.replace(/^\s*\d+\.\s*/, "").split("\n")[0];
    const formula = (b.match(/\(b\)\s*([^\n]+)/) || [])[1] || "";
    const cite = (b.match(/\(d\)\s*([^\n]+)/) || [])[1] || (b.match(/\(c\)\s*([^\n]+)/) || [])[1] || "";
    const safety = /safety:\s*yes/i.test(b);
    const title = (rule || "").replace(/\.$/, "").trim();
    if (title && title.length > 8) out.push({ title: title.slice(0, 140), formula: formula.trim(), cite: cite.trim(), safety });
  }
  return out;
}

export function domainPrompt(d, axis, seen, grounding = "") {
  const seenList = seen.slice(-40).map((t, i) => `${i + 1}. ${t}`).join("; ") || "(none yet)";
  // GROUNDING block injected ONLY when present -> domainPrompt(d,axis,seen) stays byte-identical (back-compat).
  const groundBlock = grounding && grounding.trim()
    ? `\nREAL PRISM/JM-Die shop context (this shop's actual machines, materials, tooling, and rules it ALREADY knows -- keep your items CONSISTENT with this and prefer knowledge NOT already implied here):\n${grounding.trim()}\n`
    : "";
  return {
    system: `You are a senior ${d.expert}. Output goes into a manufacturing knowledge base for an automated print-to-program system. Cite REAL sources with page/section, give CONCRETE numeric values (not "it depends"), prefer non-obvious knowledge a working programmer gets wrong. No preamble.`,
    prompt: `Domain: ${d.key}. Focus axis THIS pass: ${axis}.${groundBlock}\nAlready captured (do NOT repeat -- DIVERGE from these): ${seenList}.\nGive ${ITEMS_PER_RUN} NEW non-obvious knowledge items for the ${d.key} print-to-program pipeline on the focus axis. For EACH exactly: (a) one-line rule; (b) concrete formula OR numeric threshold with ACTUAL values+units; (c) one-line worked micro-example with numbers; (d) exact source + page/section; (e) safety: yes/no. Number them 1..${ITEMS_PER_RUN}. Plain text.`,
  };
}

// merge fresh items into a ledger (pure-ish: mutates + returns stats). stampDate injectable for determinism.
export function mergeFresh(L, items, axis, stampDate = () => new Date().toISOString()) {
  const fresh = items.filter((it) => !L.seen.includes(norm(it.title)));
  for (const it of fresh) {
    L.seen.push(norm(it.title));
    L.items.push({ ...it, axis, addedRun: L.runs + 1, addedAt: stampDate() });
  }
  L.runs++; L.axisIdx++;
  if (fresh.length < NOVELTY_FLOOR) L.dryStreak++; else L.dryStreak = 0;
  if (L.dryStreak >= DRY_STREAK_MAX) L.exhausted = true;
  return { generated: items.length, fresh: fresh.length, total: L.items.length, dryStreak: L.dryStreak, exhausted: L.exhausted, axis };
}

export async function runOnce({ ask = makeFailoverAsk(), onlyDomain = null, stampDate } = {}) {
  const targets = DOMAINS.filter((d) => !onlyDomain || d.key === onlyDomain);
  const active = targets.map((d) => ({ d, L: loadLedger(d.key) })).filter((x) => !x.L.exhausted);
  // bounded concurrency (CONCURRENCY) + per-call 429 backoff -> "parallel" without saturating the lane
  const results = await mapPool(active, CONCURRENCY, async ({ d, L }) => {
    const axis = AXES[L.axisIdx % AXES.length];
    const { system, prompt } = domainPrompt(d, axis, L.seen, composeGrounding(d.key));
    const text = await ask({ system, prompt });
    const items = parseItems(text);
    const stat = mergeFresh(L, items, axis, stampDate);
    saveLedger(L);
    return { domain: d.key, ...stat };
  });
  return results.map((r) => (r && r.__error ? { error: r.__error } : r));
}

// ── STRUCTURAL QUALITY PRE-SCREEN (directive: knowledge must be USABLE, not "just sitting there") ──
// Pure, STRUCTURAL triage of a parsed tip -- NO physics/domain judgment (specialists own that). Scores
// the signals that make a knowledge item actually actionable: a concrete numeric threshold (the strongest
// "usable" signal), a unit, a real citation, a specific (non-vague) rule. Lets specialists sort the
// ~unreviewed-cron staging by score + see why each is weak, instead of facing raw LLM output.
const QUALITY_HIGH = 70, QUALITY_MID = 45;
export function scoreTip(it = {}) {
  const formula = (it.formula || "").trim();
  const cite = (it.cite || "").trim();
  const title = (it.title || "").trim();
  // the numeric threshold is the "usable" signal -- credit it ANYWHERE in the tip (the floor model often
  // emits a freeform "Rule -- ... <number>" so the value lands in the title, not a separate formula field).
  const hay = `${title} ${formula}`;
  const hasNumber = /\d/.test(hay);
  const hasUnit = /\b(mm|cm|µm|um|nm|in|deg|°|rpm|m\/min|sfm|mm\/(rev|tooth|min)|ipm|ipr|kn|n|kw|hp|hrc|mpa|gpa|sec|min|%)\b/i.test(hay);
  const hasCite = !!cite && !/^n\/?a$/i.test(cite);
  const vague = /\bit depends\b|\bvaries\b|may vary|generally|typically|as needed|consider |be careful|rule of thumb/i.test(`${title} ${formula}`);
  const flags = [];
  if (!formula) flags.push("no-formula");
  if (!hasNumber) flags.push("no-number");
  if (!hasCite) flags.push("no-cite");
  if (title.length < 20) flags.push("short");
  if (vague) flags.push("vague");
  // weighted rubric -- numeric threshold dominates (it's what a machine/specialist can act on)
  let score = 0;
  if (hasNumber) score += 40;
  if (hasUnit) score += 15;
  if (hasCite) score += 25;
  if (formula) score += 10;
  if (title.length >= 20) score += 10;
  if (vague) score -= 15;
  score = Math.max(0, Math.min(100, score));
  return { score, tier: score >= QUALITY_HIGH ? "high" : score >= QUALITY_MID ? "mid" : "low", flags };
}

export function emitStaging() {
  const tips = [];
  const tierCounts = { high: 0, mid: 0, low: 0 };
  for (const d of DOMAINS) {
    const L = loadLedger(d.key);
    L.items.forEach((it, i) => {
      const conf = it.safety ? 45 : 55; // cron-generated = UNREVIEWED -> conservative
      const quality = scoreTip(it);
      tierCounts[quality.tier]++;
      tips.push({
        title: it.title,
        body: [it.title, it.formula ? `formula/threshold: ${it.formula}` : "", "GENERATED BY ENRICHMENT-LOOP (cron) -- specialist must verify vs source before any gate fires"].filter(Boolean).join(" | "),
        category: d.category,
        tags: [`domain:${d.key}`, "hermes:grok-4.20", "source:enrichment-loop", it.safety ? "safety:gate-candidate" : "", "verify:unreviewed-cron"].filter(Boolean),
        material_groups: [], operation_types: d.ops.slice(),
        confidence: conf, source: `hermes:enrichment-loop | cite: ${it.cite || "n/a"}`,
        id: `hkl-${d.key}-${String(i + 1).padStart(3, "0")}`,
        created_at: (it.addedAt || "").slice(0, 10) || "2026-06-29", usage_count: 0,
        safety: !!it.safety, needs_specialist_confirm: true, quality,
      });
    });
  }
  const out = resolve(ROOT, STAGING);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify({
    schemaVersion: 2, artifact: "hermes-enrichment-loop-tips",
    note: "ADVISORY cron-generated staging. ALL items UNREVIEWED -> specialist (foxtrot/whiskey/mike/kilo/echo/delta) verifies vs the cited source before ANY gate fires. golf/india embed via shard-safe writer, NEVER the live index. Each tip carries a STRUCTURAL quality.{score,tier,flags} pre-screen (no physics judgment) -- triage high-tier first; low-tier/flagged items (no-number/no-cite/vague) need the most scrutiny.",
    count: tips.length, qualitySummary: tierCounts, tips,
  }, null, 2) + "\n");
  return tips.length;
}

// ── SPECIALIST REVIEW DIGEST (directive: knowledge must be USABLE -- a readable, triaged review surface) ──
// The staging JSON is machine-format; the specialist who must verify each tip before any gate fires needs a
// per-domain, quality-SORTED markdown surface (HIGH first = structurally complete; LOW collapsed = flagged).
// Pure render so it's hermetically testable; emitDigest does the I/O.
export function renderDigest(staging = {}) {
  staging = staging || {}; // null-safe (default only covers undefined)
  const tips = Array.isArray(staging.tips) ? staging.tips : [];
  const byDomain = new Map();
  for (const t of tips) {
    const dom = (t.tags || []).find((x) => typeof x === "string" && x.startsWith("domain:"))?.slice(7) || t.category || "unknown";
    if (!byDomain.has(dom)) byDomain.set(dom, []);
    byDomain.get(dom).push(t);
  }
  const out = [
    "# Hermes Enrichment -- Specialist Review Digest",
    "",
    "> ADVISORY cron-generated knowledge, ALL UNREVIEWED. Verify each item vs its cited source before ANY machine/safety gate fires.",
    "> Sorted by STRUCTURAL quality (not correctness). Review HIGH first (numeric+cited); LOW (collapsed) carry flags and need the hardest scrutiny.",
    `> Total ${tips.length} tips | ${byDomain.size} domains | quality ${JSON.stringify(staging.qualitySummary || {})}`,
    "",
  ];
  for (const [dom, list] of [...byDomain.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    list.sort((a, b) => (b.quality?.score ?? 0) - (a.quality?.score ?? 0));
    const hi = list.filter((t) => t.quality?.tier === "high");
    const mid = list.filter((t) => t.quality?.tier === "mid");
    const lo = list.filter((t) => t.quality?.tier === "low");
    out.push(`## ${dom} -- ${list.length} tips (high ${hi.length} / mid ${mid.length} / low ${lo.length})`, "");
    for (const t of [...hi, ...mid]) {
      out.push(`- **[${t.quality?.score ?? "?"}] ${t.title}**`);
      if (t.source) out.push(`  - ${t.source}`);
    }
    if (lo.length) {
      out.push("", `<details><summary>(!) ${lo.length} LOW-tier -- hardest scrutiny (missing numeric threshold / citation, or vague)</summary>`, "");
      for (const t of lo) out.push(`- [${t.quality?.score ?? "?"}] ${t.title} -- flags: ${(t.quality?.flags || []).join(", ") || "none"}`);
      out.push("</details>");
    }
    out.push("");
  }
  return out.join("\n");
}

export function emitDigest({ readFileImpl = readFileSync, existsImpl = existsSync } = {}) {
  const stagingPath = resolve(ROOT, STAGING);
  if (!existsImpl(stagingPath)) emitStaging(); // ensure staging exists (fresh ledgers -> JSON first)
  let staging = {};
  try { staging = JSON.parse(readFileImpl(resolve(ROOT, STAGING), "utf8")); } catch { staging = {}; }
  const out = resolve(ROOT, DIGEST);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, renderDigest(staging) + "\n");
  return (staging.tips || []).length;
}

function status() {
  const rows = DOMAINS.map((d) => {
    const L = loadLedger(d.key);
    return { domain: d.key, slot: d.slot, items: L.items.length, runs: L.runs, dryStreak: L.dryStreak, exhausted: L.exhausted };
  });
  console.log(JSON.stringify({ ledgerDir: LEDGER_DIR, staging: STAGING, domains: rows, allExhausted: rows.every((r) => r.exhausted) }, null, 2));
  return rows;
}

/** Best-effort pre-warm of the local Ollama floor model (native /api/generate + keep_alive) so the first
 * real call is not a cold-load. Fail-soft: if Ollama is down/slow, skip silently. Disable: --no-prewarm. */
async function prewarmOllama() {
  try {
    const base = OLLAMA_URL.replace(/\/v1\/?$/, "");
    await fetch(`${base}/api/generate`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: OLLAMA_MODEL, prompt: "ok", stream: false, keep_alive: "30m", options: { num_predict: 1 } }),
      signal: AbortSignal.timeout(Number(process.env.PRISM_HERMES_ENRICH_PREWARM_MS || 90000)),
    });
  } catch { /* warming is best-effort -- never block the run */ }
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--status")) { status(); return; }
  if (argv.includes("--emit")) { console.log(`emitted ${emitStaging()} tips -> ${STAGING}`); return; }
  if (argv.includes("--digest")) { console.log(`digest of ${emitDigest()} tips -> ${DIGEST}`); return; }
  if (argv.includes("--reset")) {
    const dk = argv[argv.indexOf("--reset") + 1];
    for (const d of DOMAINS) {
      if (dk && !dk.startsWith("--") && d.key !== dk) continue;
      const L = loadLedger(d.key); L.exhausted = false; L.dryStreak = 0; saveLedger(L);
    }
    console.log("reset exhausted flags", dk && !dk.startsWith("--") ? `for ${dk}` : "(all)"); return;
  }
  const di = argv.indexOf("--domain");
  const onlyDomain = di >= 0 ? argv[di + 1] : null;
  const lanes = laneCandidates();
  console.error(`[enrichment-loop] lanes (failover order): ${lanes.map((l) => l.name).join(" -> ")}`);
  const usedLanes = new Set();
  if (!argv.includes("--no-prewarm")) await prewarmOllama(); // load the ollama floor model before real calls
  const ask = makeFailoverAsk(lanes, { log: (name) => usedLanes.add(name) });
  const summary = await runOnce({ ask, onlyDomain });
  if (usedLanes.size) console.error(`[enrichment-loop] lanes used this run: ${[...usedLanes].join(", ")}`);
  const n = emitStaging();
  emitDigest(); // refresh the specialist review surface every run (keeps the digest current with staging)
  console.log(JSON.stringify({ ran: true, summary, stagedTips: n, staging: STAGING, digest: DIGEST }, null, 2));
}

// run when invoked directly (not when imported by tests)
const invoked = process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
if (invoked) { main().catch((e) => { console.error("enrichment-loop error:", e?.message || e); process.exitCode = 1; }); }
