#!/usr/bin/env node
// tier: T2
/**
 * skill-auto-trigger.mjs — pipeline-aware multi-event suggester.
 *
 * History:
 *   - DEV-VELOCITY-AUTOTRIGGER-MS0 (Phase D.2): UserPromptSubmit-only,
 *     skill-trigger jsonl matching, suggest-only.
 *   - COMMAND-KERNEL-MS0/U-CK16: extended to fire on PostToolUse + Stop
 *     in addition to UserPromptSubmit, AND to suggest pipelines (from
 *     `knowledge/wiki/os/pipelines/*.md`), not just single skills.
 *
 * Three event branches (all suggest-only, never block, never run code):
 *
 *   - UserPromptSubmit: skill-trigger BM25 score (existing) + pipeline
 *     match by /command mention in the prompt (e.g., `/loop` → suggest
 *     the `loop` pipeline).
 *
 *   - PostToolUse: pipeline match by tool_name → suggest pipelines whose
 *     `composed_of` references the just-executed tool/command. Capped
 *     to top-2 to avoid noise (PostToolUse fires per tool call).
 *
 *   - Stop: pipeline match by `trigger:hook` (or `trigger.events`
 *     including "Stop") → surface session-end-relevant pipelines like
 *     `goal-complete`.
 *
 * The existing `_skill-triggers.jsonl` flow is preserved BYTE-IDENTICAL
 * for UserPromptSubmit when no /commands are present (back-compat).
 *
 * Suppression:
 *   - Per-event recent-surface window: `state/shared/.skill-auto-trigger-recent.json`
 *     keyed by event so a Stop suggestion is independent of UserPromptSubmit.
 *
 * Knobs:
 *   PRISM_SKILL_AUTO_TRIGGER_DISABLE=1            — full bypass
 *   PRISM_SKILL_AUTO_TRIGGER_K=<N>                — skill top-K (default 3)
 *   PRISM_SKILL_AUTO_TRIGGER_PIPELINE_K=<N>       — pipeline top-K (default 2)
 *   PRISM_SKILL_AUTO_TRIGGER_MIN=<0..1>           — skill score floor (default 0.65)
 *   PRISM_SKILL_AUTO_TRIGGER_VERBOSE=1            — log to stderr
 *   PRISM_SKILL_AUTO_TRIGGER_NO_PIPELINES=1       — disable pipeline arm only
 *   PRISM_SKILL_AUTO_TRIGGER_TRIGGERS_PATH=<abs>  — override skill-triggers jsonl (TEST)
 *   PRISM_SKILL_AUTO_TRIGGER_PIPELINES_DIR=<abs>  — override pipelines dir   (TEST)
 *   PRISM_SKILL_AUTO_TRIGGER_RECENT_PATH=<abs>    — override recent state    (TEST)
 *   PRISM_SKILL_AUTO_TRIGGER_TELEMETRY_PATH=<abs> — override telemetry       (TEST)
 *
 * Telemetry: appends to `mcp-server/data/state/hook-fire-counts.jsonl` with
 *   { ts, hook, event, decision, scanned, topK }.
 */
import {
  readFileSync, existsSync, appendFileSync, writeFileSync, readdirSync, renameSync, statSync,
} from "node:fs";
import { join } from "node:path";

const PRISM_ROOT = "H:/prism";
// Paths are read at call time (not module load) so tests can swap fixtures
// via env between cases without re-importing the module.
const triggersPath = () => process.env.PRISM_SKILL_AUTO_TRIGGER_TRIGGERS_PATH
  || join(PRISM_ROOT, "knowledge/wiki/architecture/_skill-triggers.jsonl");
const pipelinesDir = () => process.env.PRISM_SKILL_AUTO_TRIGGER_PIPELINES_DIR
  || join(PRISM_ROOT, "knowledge/wiki/os/pipelines");
const recentPath = () => process.env.PRISM_SKILL_AUTO_TRIGGER_RECENT_PATH
  || join(PRISM_ROOT, "state/shared/.skill-auto-trigger-recent.json");
const telemetryPath = () => process.env.PRISM_SKILL_AUTO_TRIGGER_TELEMETRY_PATH
  || join(PRISM_ROOT, "mcp-server/data/state/hook-fire-counts.jsonl");

// Tuning constants (named — no inline magic numbers)
const DEFAULT_SKILL_TOP_K = 3;
const DEFAULT_PIPELINE_TOP_K = 2;
const DEFAULT_MIN_SCORE = 0.65;
// INVOKE_NOW gate (2026-05-28, slot:alpha — operator: "I have to tell you to use
// forge commands and most slash commands, can we automate when needed?"):
// triggers with action:"invoke" + name in INVOKE_NOW_SKILLS + score >= 0.75
// emit a directive-style additionalContext that the model treats as mandatory
// invocation, not advisory. Existing action:"suggest" triggers preserved
// byte-identical (back-compat with 507 entries in _skill-triggers.jsonl).
const DEFAULT_INVOKE_NOW_MIN = 0.75;
// Session-lifecycle skills are governed by SESSION STATE, never by prompt
// keywords (slot:alpha 2026-06-11 -- fixed the "chat pushes back to /precompact
// at 18% context when it should just keep working" false-trigger). precompact/
// compact pressure is owned by the state-aware precompact-auto-trigger.mjs (reads
// the per-slot token-budget sidecar; the ONLY surface allowed to order a
// compaction); handoff fires on the Stop event; checkpoint is user-discretion. A
// prompt that merely MENTIONS compaction/handoff/precompact as a TOPIC (e.g. a
// task to improve the compaction system) must never surface -- let alone
// MANDATORILY invoke -- these. Excluded from BOTH the keyword-suggest and the
// INVOKE_NOW paths. Mirrors extract-skill-triggers.mjs -- keep the two in sync.
export const LIFECYCLE_STATE_GATED_SKILLS = new Set([
  "precompact", "compact", "handoff", "checkpoint",
]);
export const INVOKE_NOW_SKILLS = new Set([
  // Pre-build/anti-duplication gates — Karpathy R8 (read before write)
  "dedup",
  // Build orchestration — operator-facing
  "forge7", "forge-audit-v2", "forge-triple", "scrutinize",
  // Session-lifecycle skills excluded -- state-gated (see LIFECYCLE_STATE_GATED_SKILLS).
  // Domain studios — auto-fire when keyword 100% domain-specific
  "wire-edm-studio", "lathe-studio", "quote-to-ship",
  // Consensus + memory
  "octopus", "wiki-query", "master-index",
  // Pick discipline
  "pick-unit", "pick-build-close",
]);
const RECENT_WINDOW = 3;
const RECENT_CAP = 5;
const RECENT_CAP_TOTAL = RECENT_CAP * 3;     // 3 event classes
const MAX_TRIGGER_LINES = 5000;
const PROMPT_TOKEN_CAP = 500;
const MAX_PIPELINE_FILES = 256;
const STDIN_FINALIZE_MS = 250;
const RECENT_PROMPT_KEY_LEN = 200;
const POSTTOOL_KEY_INPUT_TRUNC = 100;

const K = parseInt(process.env.PRISM_SKILL_AUTO_TRIGGER_K || String(DEFAULT_SKILL_TOP_K), 10);
const PIPELINE_K = parseInt(process.env.PRISM_SKILL_AUTO_TRIGGER_PIPELINE_K || String(DEFAULT_PIPELINE_TOP_K), 10);
const MIN_SCORE = parseFloat(process.env.PRISM_SKILL_AUTO_TRIGGER_MIN || String(DEFAULT_MIN_SCORE));
const VERBOSE = process.env.PRISM_SKILL_AUTO_TRIGGER_VERBOSE === "1";
const DISABLED = process.env.PRISM_SKILL_AUTO_TRIGGER_DISABLE === "1";
const NO_PIPELINES = process.env.PRISM_SKILL_AUTO_TRIGGER_NO_PIPELINES === "1";

const VALID_EVENTS = new Set(["UserPromptSubmit", "PostToolUse", "Stop"]);

function readStdin() {
  return new Promise((res) => {
    let buf = "";
    let done = false;
    const fin = () => { if (!done) { done = true; try { res(JSON.parse(buf || "{}")); } catch { res({}); } } };
    process.stdin.on("data", (c) => { buf += c; });
    process.stdin.on("end", fin);
    setTimeout(fin, STDIN_FINALIZE_MS);
  });
}

function safeStderr(msg) {
  if (!VERBOSE) return;
  try { process.stderr.write(`[skill-auto-trigger] ${msg}\n`); } catch { /* ignore */ }
}

function tokenize(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[`*_~\[\]()<>{}!@#$%^&,.?;:"'\\/+=]/g, " ")
    .split(/\s+/)
    .flatMap(t => t.includes("-") ? [t, ...t.split("-")] : [t])
    .filter(t => t && t.length >= 2)
    .slice(0, PROMPT_TOKEN_CAP);
}

function readSkillTriggers() {
  if (!existsSync(triggersPath())) {
    safeStderr(`triggers file missing: ${triggersPath()}`);
    return null;
  }
  try {
    const lines = readFileSync(triggersPath(), "utf8").split("\n").filter(Boolean).slice(0, MAX_TRIGGER_LINES);
    const out = [];
    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        if (obj && obj.name && obj.matcher && obj.matcher.value) out.push(obj);
      } catch { /* malformed; skip */ }
    }
    return out;
  } catch (e) {
    safeStderr(`triggers read failed: ${e.message}`);
    return null;
  }
}

// -------- Pipeline loader (U-CK16) ---------------------------------------

let _pipelineCache = { mtime: 0, list: null };

/**
 * Extract /slash-command tokens mentioned in a prompt.
 * Uses String.matchAll (NOT regex.exec — distinct from child_process.exec).
 */
function extractCommands(s) {
  const out = new Set();
  const re = /(^|\s)\/([a-z][a-z0-9-]{0,40}(?::[a-z0-9-]+)?)/gi;
  for (const m of String(s || "").matchAll(re)) {
    out.add(m[2].toLowerCase());
  }
  return [...out];
}

/**
 * Parse the leading --- frontmatter block of a pipeline .md file.
 * Returns null on missing/malformed. Handles only the shapes present
 * in the registry today:
 *   - scalar `key: value`
 *   - inline array `key: [a, b, c]`
 *   - quoted/unquoted scalars
 * Nested keys (e.g. `trigger:` followed by indented sub-keys) are
 * collapsed to `parent_subkey` form.
 */
export function parsePipelineFrontmatter(content) {
  if (typeof content !== "string") return null;
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const body = m[1];
  const out = {};
  let nestedKey = null;
  let nestedIndent = -1;
  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+$/, "");
    if (!line) continue;
    const indent = line.match(/^(\s*)/)[1].length;
    const stripped = line.slice(indent);
    if (stripped.startsWith("#")) continue;

    if (nestedKey && indent <= nestedIndent) {
      nestedKey = null;
      nestedIndent = -1;
    }

    const kvm = stripped.match(/^([a-zA-Z_][a-zA-Z0-9_-]*)\s*:\s*(.*)$/);
    if (!kvm) {
      if (nestedKey && stripped.startsWith("- ")) {
        const v = stripped.slice(2).trim().replace(/^["']|["']$/g, "");
        if (!Array.isArray(out[nestedKey])) out[nestedKey] = [];
        out[nestedKey].push(v);
      }
      continue;
    }
    const key = kvm[1];
    const val = kvm[2].trim();

    if (indent === 0) {
      nestedKey = null;
      nestedIndent = -1;
      if (val === "") {
        nestedKey = key;
        nestedIndent = 0;
        out[key] = {};
        continue;
      }
      if (val.startsWith("[") && val.endsWith("]")) {
        const inner = val.slice(1, -1);
        out[key] = inner.split(",").map(s => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
        continue;
      }
      out[key] = val.replace(/^["']|["']$/g, "");
    } else if (nestedKey) {
      const flat = `${nestedKey}_${key}`;
      if (val === "") {
        if (!(flat in out)) out[flat] = [];
      } else if (val.startsWith("[") && val.endsWith("]")) {
        const inner = val.slice(1, -1);
        out[flat] = inner.split(",").map(s => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
      } else {
        out[flat] = val.replace(/^["']|["']$/g, "");
      }
    }
  }
  for (const k of Object.keys(out)) {
    if (out[k] && typeof out[k] === "object" && !Array.isArray(out[k]) && Object.keys(out[k]).length === 0) {
      const hasFlat = Object.keys(out).some(other => other.startsWith(`${k}_`));
      if (hasFlat) delete out[k];
    }
  }
  return out;
}

/**
 * Load pipeline registry (suggest-only). Returns [] on any error.
 * Each entry: { slug, title, status, trigger, triggerKind, triggerEvents,
 *               triggerCommand, composed_of }.
 */
export function readPipelines() {
  try {
    if (NO_PIPELINES) return [];
    if (!existsSync(pipelinesDir())) return [];
    const st = statSync(pipelinesDir());
    if (_pipelineCache.list && st.mtimeMs === _pipelineCache.mtime) {
      return _pipelineCache.list;
    }
    const files = readdirSync(pipelinesDir())
      .filter(f => f.endsWith(".md") && !f.startsWith("_") && !f.startsWith("."))
      .slice(0, MAX_PIPELINE_FILES);
    const out = [];
    for (const f of files) {
      const full = join(pipelinesDir(), f);
      try {
        const content = readFileSync(full, "utf8");
        const fm = parsePipelineFrontmatter(content);
        if (!fm || !fm.slug || fm.kind !== "pipeline") continue;
        if (fm.status === "deprecated") continue;

        let triggerKind = null;
        let triggerEvents = [];
        let triggerCommand = null;
        if (typeof fm.trigger === "string") triggerKind = fm.trigger;
        if (fm.trigger_kind) triggerKind = fm.trigger_kind;
        if (Array.isArray(fm.trigger_events)) triggerEvents = fm.trigger_events;
        if (fm.trigger_command) triggerCommand = fm.trigger_command;

        // Auto-derive `/<slug>` as the operator-typeable handle whenever the
        // frontmatter omits an explicit triggerCommand. Applies regardless of
        // how the pipeline auto-fires (cron/hook/command) — a user typing
        // `/loop` should surface the cron-fired loop pipeline. Only pipelines
        // that explicitly carry `trigger_command: false` opt out (today: none).
        if (!triggerCommand && fm.trigger_command !== false) {
          triggerCommand = `/${fm.slug}`;
        }

        const composed_of = Array.isArray(fm.composed_of) ? fm.composed_of
          : Array.isArray(fm.composes) ? fm.composes : [];

        out.push({
          slug: fm.slug,
          title: fm.title || fm.slug,
          status: fm.status || "draft",
          trigger: fm.trigger,
          triggerKind,
          triggerEvents,
          triggerCommand,
          composed_of,
        });
      } catch (e) { safeStderr(`pipeline parse failed for ${f}: ${e.message}`); }
    }
    _pipelineCache = { mtime: st.mtimeMs, list: out };
    return out;
  } catch (e) {
    safeStderr(`readPipelines failed: ${e.message}`);
    return [];
  }
}

// -------- Per-event matchers (pure, exported for tests) ------------------

/** UserPromptSubmit: pipelines whose `triggerCommand` is mentioned in the prompt. */
export function matchPipelinesForPrompt(pipelines, prompt) {
  const cmds = new Set(extractCommands(prompt));
  if (!cmds.size) return [];
  const out = [];
  for (const p of pipelines) {
    if (!p.triggerCommand) continue;
    const tcSlug = p.triggerCommand.replace(/^\//, "").toLowerCase();
    if (cmds.has(tcSlug)) {
      out.push({ slug: p.slug, title: p.title, reason: `prompt mentioned ${p.triggerCommand}` });
    }
  }
  return out;
}

/** PostToolUse: pipelines whose `composed_of` references the just-used tool. */
export function matchPipelinesForTool(pipelines, toolName, toolInput) {
  if (!toolName) return [];
  const needle = String(toolName).toLowerCase();
  const bashCmd = (toolName === "Bash" && toolInput && typeof toolInput.command === "string")
    ? toolInput.command.toLowerCase() : "";
  const out = [];
  for (const p of pipelines) {
    if (!Array.isArray(p.composed_of) || !p.composed_of.length) continue;
    let hit = false;
    let reason = null;
    for (const step of p.composed_of) {
      const s = String(step).toLowerCase();
      if (s === needle || s.includes(needle)) { hit = true; reason = `recent ${toolName} matches stage '${step}'`; break; }
      if (bashCmd && s.startsWith("/") && bashCmd.includes(s)) { hit = true; reason = `bash invoked ${step}`; break; }
    }
    if (hit) out.push({ slug: p.slug, title: p.title, reason });
  }
  return out;
}

/** Stop: pipelines wired to fire on Stop, or trigger:hook with a Stop-class stage. */
export function matchPipelinesForStop(pipelines) {
  const out = [];
  for (const p of pipelines) {
    if (Array.isArray(p.triggerEvents) && p.triggerEvents.includes("Stop")) {
      out.push({ slug: p.slug, title: p.title, reason: "wired to Stop event" });
      continue;
    }
    if (p.triggerKind === "hook") {
      const hookish = p.composed_of.some(s => /(-gate|-stop|stop-)/i.test(String(s)));
      if (hookish) out.push({ slug: p.slug, title: p.title, reason: "hook-triggered with Stop-class stage" });
    }
  }
  return out;
}

// -------- Recent-surface state (per-event keyed) -------------------------

function loadRecent() {
  try {
    if (!existsSync(recentPath())) return { entries: [] };
    const j = JSON.parse(readFileSync(recentPath(), "utf8"));
    if (!j || !Array.isArray(j.entries)) return { entries: [] };
    return j;
  } catch { return { entries: [] }; }
}

function saveRecent(rec) {
  try {
    const tmp = recentPath() + "." + process.pid + ".tmp";
    writeFileSync(tmp, JSON.stringify(rec));
    renameSync(tmp, recentPath());
  } catch (e) { safeStderr(`recent save failed: ${e.message}`); }
}

function recentlySurfaced(rec, name, event) {
  const sameEvent = rec.entries.filter(e => (e.event || "UserPromptSubmit") === event);
  const slice = sameEvent.slice(-RECENT_WINDOW);
  for (const e of slice) {
    if (Array.isArray(e.surfaced) && e.surfaced.includes(name)) return true;
  }
  return false;
}

function recordRecent(rec, event, key, surfaced) {
  rec.entries.push({ ts: Date.now(), event, key, surfaced });
  if (rec.entries.length > RECENT_CAP_TOTAL) rec.entries = rec.entries.slice(-RECENT_CAP_TOTAL);
  saveRecent(rec);
}

// -------- Scoring (existing skill matcher; preserved) --------------------

function scoreMatch(promptTokens, trigger) {
  const base = typeof trigger.score === "number" ? trigger.score : 0.7;
  const phrases = String(trigger.matcher.value).split("|").map(s => s.trim().toLowerCase()).filter(Boolean);
  let bestHit = 0;
  const promptStr = promptTokens.join(" ");
  for (const phrase of phrases) {
    if (!phrase) continue;
    if (promptStr.includes(phrase)) { bestHit = Math.max(bestHit, 1.0); continue; }
    const phraseWords = phrase.split(/\s+/).filter(w => w.length >= 2);
    if (!phraseWords.length) continue;
    let hits = 0;
    for (const w of phraseWords) if (promptTokens.includes(w)) hits++;
    bestHit = Math.max(bestHit, hits / phraseWords.length);
  }
  return base * bestHit;
}

// -------- pathGlob support (DOMAIN-GALAXY-DOCTRINE-MS1/U-GALAXY-MS1-E1) ----
// Triggers can carry an optional pathGlob string field. When present, the
// trigger only fires when the current cwd (payload.cwd or process.cwd())
// matches the glob. Empty/missing pathGlob = always applicable (back-compat
// with every existing _skill-triggers.jsonl entry that pre-dates E1).
// Glob syntax: ** (any path inc. /), * (any chars no slash), ? (single char
// no slash), {a,b,c} (alternation). Paths normalized to forward-slashes
// (Windows-safe). Returns null on invalid pattern (caller treats as no match).

export function pathGlobToRegex(pattern) {
  if (typeof pattern !== "string" || pattern.length === 0) return null;
  let p = pattern.replace(/\\/g, "/");
  // Extract alternations {a,b,c} into placeholders BEFORE escaping regex specials.
  const placeholders = [];
  p = p.replace(/\{([^}]+)\}/g, (_m, alts) => {
    const idx = placeholders.length;
    placeholders.push(alts.split(",").map(s => s.trim()).filter(Boolean));
    return "\x00" + idx + "\x00";
  });
  // Escape regex specials except the glob meta we want to preserve.
  p = p.replace(/[.+^$()|[\]\\]/g, "\\$&");
  // Restore glob meta: ** -> .*, * -> [^/]*, ? -> [^/]
  p = p
    .replace(/\*\*/g, "\x01")
    .replace(/\*/g, "[^/]*")
    .replace(/\x01/g, ".*")
    .replace(/\?/g, "[^/]");
  // Restore alternations.
  p = p.replace(/\x00(\d+)\x00/g, (_m, idx) => {
    const alts = placeholders[Number(idx)];
    if (!alts || alts.length === 0) return "";
    return "(?:" + alts.map(a => a.replace(/[.+^$()|[\]\\*?]/g, "\\$&")).join("|") + ")";
  });
  try {
    return new RegExp("^" + p + "$");
  } catch {
    return null;
  }
}

export function matchesPathGlob(trigger, cwd) {
  // Back-compat: missing/empty pathGlob => trigger always applicable.
  const pg = trigger && trigger.pathGlob;
  if (!pg) return true;
  // Fail-OPEN when no cwd context: preserve existing trigger surfacing for
  // event types (PostToolUse, Stop) that don't reliably carry cwd. R12-honest:
  // we surface the skill rather than silently hide it.
  if (typeof cwd !== "string" || cwd.length === 0) return true;
  const normCwd = cwd.replace(/\\/g, "/").replace(/\/+$/, "");
  const patterns = Array.isArray(pg) ? pg : [pg];
  for (const pat of patterns) {
    const rx = pathGlobToRegex(pat);
    if (!rx) continue;
    if (rx.test(normCwd)) return true;
  }
  return false;
}

function djb2(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16);
}

function emitTelemetry(payload) {
  try {
    appendFileSync(telemetryPath(),
      JSON.stringify({ ts: new Date().toISOString(), hook: "skill-auto-trigger", ...payload }) + "\n",
      { flag: "a" });
  } catch { /* ignore */ }
}

function emit(obj) {
  try { process.stdout.write(JSON.stringify(obj)); } catch { /* ignore */ }
}

// -------- Event handlers -------------------------------------------------

function handleUserPromptSubmit(payload, recent) {
  const prompt = String(payload.prompt || payload.user_prompt || "").trim();
  if (!prompt || prompt.length < 8) return null;

  // (1) Skill matches (existing path)
  const triggers = readSkillTriggers() || [];
  const tokens = tokenize(prompt);
  const skillHits = [];
  const invokeNowHits = [];   // 2026-05-28 slot:alpha — high-confidence imperative-skill directive bucket
  if (triggers.length && tokens.length) {
    const scored = [];
    for (const t of triggers) {
      // Accept both action:"suggest" (legacy) and action:"invoke" (2026-05-28).
      if (t.action && t.action !== "suggest" && t.action !== "invoke") continue;
      // Session-lifecycle skills are STATE-gated, never keyword-gated -- a topical
      // mention of compaction/handoff must not surface or MANDATORILY invoke them
      // (slot:alpha 2026-06-11). Owned by precompact-auto-trigger.mjs / Stop event.
      if (LIFECYCLE_STATE_GATED_SKILLS.has(t.name)) continue;
      // E1 path-scoped filter: pathGlob (when present on trigger) must match cwd.
      if (!matchesPathGlob(t, payload.cwd)) continue;
      const s = scoreMatch(tokens, t);
      if (s >= MIN_SCORE) scored.push({
        name: t.name,
        score: s,
        type: t.type || "skill",
        action: t.action || "suggest",
      });
    }
    scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
    // Dedup by skill name — a skill with N matching phrases must emit ONCE, not N times.
    const seenNames = new Set();
    for (const s of scored) {
      if (seenNames.has(s.name)) continue;
      // Invoke-now branch: allowlisted skill + score over high-confidence floor.
      // Allowlist match (INVOKE_NOW_SKILLS) is authoritative — extractor sets
      // action:"invoke" for the same set, so the action check is informational
      // only (telemetry) and not a gate. Per reviewer B 2026-05-28 P1-A: drop
      // the action arm to avoid a dead-code predicate.
      const invokeEligible = INVOKE_NOW_SKILLS.has(s.name)
        && s.score >= DEFAULT_INVOKE_NOW_MIN;
      if (invokeEligible) {
        if (recentlySurfaced(recent, `invoke:${s.name}`, "UserPromptSubmit")) continue;
        invokeNowHits.push(s);
        seenNames.add(s.name);
        continue;
      }
      if (skillHits.length >= K) break;
      if (recentlySurfaced(recent, s.name, "UserPromptSubmit")) continue;
      skillHits.push(s);
      seenNames.add(s.name);
    }
  }

  // (2) Pipeline matches by /command mention (U-CK16)
  const pipelines = readPipelines();
  const pipelineHits = [];
  if (pipelines.length) {
    for (const ph of matchPipelinesForPrompt(pipelines, prompt)) {
      if (pipelineHits.length >= PIPELINE_K) break;
      if (recentlySurfaced(recent, `pipeline:${ph.slug}`, "UserPromptSubmit")) continue;
      pipelineHits.push(ph);
    }
  }

  if (!skillHits.length && !pipelineHits.length && !invokeNowHits.length) {
    emitTelemetry({ event: "UserPromptSubmit", decision: "empty", scanned: triggers.length, pipelinesScanned: pipelines.length });
    return null;
  }

  const invokeLines = invokeNowHits.map(s => `  Skill(skill="${s.name}")   ← INVOKE NOW (score ${s.score.toFixed(2)}, allowlisted imperative)`);
  const skillLines = skillHits.map(s => `  /${s.name}   (score ${s.score.toFixed(2)})`);
  const pipelineLines = pipelineHits.map(p => `  ⚙ pipeline /${p.slug}   (${p.reason})`);
  const sections = [];
  if (invokeLines.length) {
    // DIRECTIVE — the model is expected to honor this per CLAUDE.md §SKILL AUTO-INVOKE rule
    // (added 2026-05-28 slot:alpha). Layer-2 hooks cannot themselves invoke skills, so the
    // hook lives or dies on the model treating this section as mandatory, not advisory.
    sections.push(`🚨 SKILL AUTO-INVOKE — high-confidence imperative trigger(s) — INVOKE BEFORE PROCEEDING:\n${invokeLines.join("\n")}\nCLAUDE.md §SKILL AUTO-INVOKE: invoking these via the Skill tool is MANDATORY for this turn.`);
  }
  if (skillLines.length) sections.push(`🔔 Skill auto-trigger — top-${skillLines.length} match${skillLines.length > 1 ? "es" : ""} for this prompt:\n${skillLines.join("\n")}`);
  if (pipelineLines.length) sections.push(`⚙ Pipeline auto-trigger — top-${pipelineLines.length} match${pipelineLines.length > 1 ? "es" : ""}:\n${pipelineLines.join("\n")}`);
  sections.push("Invoke explicitly if relevant — these are suggestions, not auto-runs (except the 🚨 INVOKE block, which is mandatory).\nKnobs: PRISM_SKILL_AUTO_TRIGGER_{DISABLE,K,PIPELINE_K,MIN,NO_PIPELINES}");
  const ctx = sections.join("\n\n");

  const surfaced = [
    ...invokeNowHits.map(s => `invoke:${s.name}`),
    ...skillHits.map(s => s.name),
    ...pipelineHits.map(p => `pipeline:${p.slug}`),
  ];
  recordRecent(recent, "UserPromptSubmit", djb2(prompt.slice(0, RECENT_PROMPT_KEY_LEN)), surfaced);

  emitTelemetry({
    event: "UserPromptSubmit",
    decision: "matched",
    scanned: triggers.length,
    pipelinesScanned: pipelines.length,
    invokeNowK: invokeNowHits.map(f => ({ name: f.name, score: Number(f.score.toFixed(3)) })),
    topK: skillHits.map(f => ({ name: f.name, score: Number(f.score.toFixed(3)) })),
    pipelineTopK: pipelineHits.map(p => p.slug),
  });

  return {
    continue: true,
    hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: ctx },
  };
}

function handlePostToolUse(payload, recent) {
  const toolName = payload.tool_name || payload.toolName || "";
  const toolInput = payload.tool_input || payload.toolInput || null;
  if (!toolName) return null;
  const pipelines = readPipelines();
  if (!pipelines.length) return null;

  const allHits = matchPipelinesForTool(pipelines, toolName, toolInput);
  const filtered = [];
  for (const ph of allHits) {
    if (filtered.length >= PIPELINE_K) break;
    if (recentlySurfaced(recent, `pipeline:${ph.slug}`, "PostToolUse")) continue;
    filtered.push(ph);
  }
  if (!filtered.length) {
    emitTelemetry({ event: "PostToolUse", decision: "empty", pipelinesScanned: pipelines.length, toolName });
    return null;
  }

  const lines = filtered.map(p => `  ⚙ pipeline /${p.slug}   (${p.reason})`);
  const ctx = `⚙ Pipeline auto-trigger (PostToolUse) — top-${filtered.length}:\n${lines.join("\n")}\n\nSuggestion only.`;

  recordRecent(recent, "PostToolUse", djb2(toolName + ":" + JSON.stringify(toolInput || {}).slice(0, POSTTOOL_KEY_INPUT_TRUNC)),
    filtered.map(p => `pipeline:${p.slug}`));

  emitTelemetry({
    event: "PostToolUse",
    decision: "matched",
    pipelinesScanned: pipelines.length,
    toolName,
    pipelineTopK: filtered.map(p => p.slug),
  });

  return {
    continue: true,
    suppressOutput: true,
    hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: ctx },
  };
}

function handleStop(_payload, recent) {
  const pipelines = readPipelines();
  if (!pipelines.length) return null;

  const allHits = matchPipelinesForStop(pipelines);
  const filtered = [];
  for (const ph of allHits) {
    if (filtered.length >= PIPELINE_K) break;
    if (recentlySurfaced(recent, `pipeline:${ph.slug}`, "Stop")) continue;
    filtered.push(ph);
  }
  if (!filtered.length) {
    emitTelemetry({ event: "Stop", decision: "empty", pipelinesScanned: pipelines.length });
    return null;
  }

  const lines = filtered.map(p => `  ⚙ pipeline /${p.slug}   (${p.reason})`);
  const ctx = `⚙ Pipeline auto-trigger (Stop) — top-${filtered.length} session-end pipeline${filtered.length > 1 ? "s" : ""}:\n${lines.join("\n")}\n\nSuggestion only. Consider invoking before /handoff.`;

  recordRecent(recent, "Stop", String(Date.now()), filtered.map(p => `pipeline:${p.slug}`));

  emitTelemetry({
    event: "Stop",
    decision: "matched",
    pipelinesScanned: pipelines.length,
    pipelineTopK: filtered.map(p => p.slug),
  });

  return {
    continue: true,
    suppressOutput: true,
    hookSpecificOutput: { hookEventName: "Stop", additionalContext: ctx },
  };
}

// -------- Entry ---------------------------------------------------------

export async function main() {
  if (DISABLED) { emit({ continue: true }); return; }
  const payload = await readStdin();

  const event = payload.hook_event_name || payload.hookEventName || "";
  if (!VALID_EVENTS.has(event)) { emit({ continue: true }); return; }

  const recent = loadRecent();
  let result = null;
  try {
    if (event === "UserPromptSubmit") result = handleUserPromptSubmit(payload, recent);
    else if (event === "PostToolUse")   result = handlePostToolUse(payload, recent);
    else if (event === "Stop")          result = handleStop(payload, recent);
  } catch (e) {
    safeStderr(`event handler ${event} failed: ${e.message}`);
    result = null;
  }

  if (!result) { emit({ continue: true }); return; }
  emit(result);
}

// Only run when invoked directly (allow imports for tests).
const isDirect = (() => {
  try {
    const argv1 = (process.argv[1] || "").replace(/\\/g, "/").toLowerCase();
    return argv1.endsWith("skill-auto-trigger.mjs");
  } catch { return false; }
})();
if (isDirect) {
  void main().catch((e) => { safeStderr(`fatal: ${e.message}`); emit({ continue: true }); });
}
