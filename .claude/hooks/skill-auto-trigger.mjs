#!/usr/bin/env node
// tier: T2
/**
 * skill-auto-trigger.mjs — UserPromptSubmit hook (Phase D.2 of DEV-VELOCITY-AUTOTRIGGER-MS0).
 *
 * Reads `knowledge/wiki/architecture/_skill-triggers.jsonl` (the stage-22 extract
 * of every skill's `triggers:` frontmatter — see Phase D.3). For each UserPromptSubmit
 * event, scores the prompt against every trigger and emits top-K suggestions as
 * additionalContext. Pure suggest-only: never blocks, never executes.
 *
 * Pairs with: /skill-auto-trigger plan §P3 (this hook is the "orchestrator" line item).
 * Compatible with: master-index-precheck-inject (sister T2 surface that does the
 * SAME pattern but over the unified system graph; this hook focuses specifically on
 * SKILLS while master-index handles engines/actions/hooks/etc).
 *
 * Trigger schema (per line in JSONL):
 *   {
 *     "name": "<skill-name>",
 *     "type": "skill",
 *     "matcher": { "type": "keyword", "value": "regex|alternation" },
 *     "score": 0.80,                  // base confidence
 *     "action": "suggest"             // always suggest for now
 *   }
 *
 * Scoring: matched skills get base score × BM25-like keyword density boost.
 * Top-K dedup against state/shared/.skill-auto-trigger-recent.json (last 5 prompts).
 * Suppression: if a skill was suggested in the last 3 prompts, don't re-surface
 * (the operator is either using it or actively ignoring it).
 *
 * Knobs:
 *   PRISM_SKILL_AUTO_TRIGGER_DISABLE=1  — full bypass
 *   PRISM_SKILL_AUTO_TRIGGER_K=<N>      — top-K (default 3)
 *   PRISM_SKILL_AUTO_TRIGGER_MIN=<0..1> — score floor (default 0.65)
 *   PRISM_SKILL_AUTO_TRIGGER_VERBOSE=1  — log to stderr
 *
 * Telemetry: appends to mcp-server/data/state/hook-fire-counts.jsonl with
 *   { ts, hook: "skill-auto-trigger", decision: "matched"|"empty", topK: [...] }
 * for downstream calibration (similar to archived-skill-suggest).
 */
import { readFileSync, existsSync, appendFileSync, writeFileSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

const PRISM_ROOT = "H:/prism";
const TRIGGERS_PATH = join(PRISM_ROOT, "knowledge/wiki/architecture/_skill-triggers.jsonl");
const RECENT_PATH = join(PRISM_ROOT, "state/shared/.skill-auto-trigger-recent.json");
const TELEMETRY_PATH = join(PRISM_ROOT, "mcp-server/data/state/hook-fire-counts.jsonl");

const K = parseInt(process.env.PRISM_SKILL_AUTO_TRIGGER_K || "3", 10);
const MIN_SCORE = parseFloat(process.env.PRISM_SKILL_AUTO_TRIGGER_MIN || "0.65");
const VERBOSE = process.env.PRISM_SKILL_AUTO_TRIGGER_VERBOSE === "1";
const DISABLED = process.env.PRISM_SKILL_AUTO_TRIGGER_DISABLE === "1";
const RECENT_WINDOW = 3;                // suppress if surfaced in last N prompts
const RECENT_CAP = 5;                   // keep last N prompt-keys in recent file
const MAX_TRIGGER_LINES = 5000;         // hard cap for safety
const PROMPT_TOKEN_CAP = 500;           // tokenize at most N words

function readStdin() {
  return new Promise((res) => {
    let buf = "";
    let done = false;
    const fin = () => { if (!done) { done = true; try { res(JSON.parse(buf || "{}")); } catch { res({}); } } };
    process.stdin.on("data", (c) => { buf += c; });
    process.stdin.on("end", fin);
    setTimeout(fin, 250);
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

function readTriggers() {
  if (!existsSync(TRIGGERS_PATH)) {
    safeStderr(`triggers file missing: ${TRIGGERS_PATH} (Phase D.3 not yet shipped — bypass)`);
    return null;
  }
  try {
    const lines = readFileSync(TRIGGERS_PATH, "utf8").split("\n").filter(Boolean).slice(0, MAX_TRIGGER_LINES);
    const out = [];
    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        if (obj && obj.name && obj.matcher && obj.matcher.value) out.push(obj);
      } catch { /* malformed line; skip */ }
    }
    return out;
  } catch (e) {
    safeStderr(`read failed: ${e.message}`);
    return null;
  }
}

function loadRecent() {
  try {
    if (!existsSync(RECENT_PATH)) return { entries: [] };
    const j = JSON.parse(readFileSync(RECENT_PATH, "utf8"));
    if (!j || !Array.isArray(j.entries)) return { entries: [] };
    return j;
  } catch { return { entries: [] }; }
}

function saveRecent(rec) {
  try {
    const tmp = RECENT_PATH + "." + process.pid + ".tmp";
    writeFileSync(tmp, JSON.stringify(rec));
    // atomic rename
    const fs = require("node:fs");
    fs.renameSync(tmp, RECENT_PATH);
  } catch (e) { safeStderr(`recent save failed: ${e.message}`); }
}

function recentlySurfaced(rec, name) {
  // Walk last RECENT_WINDOW entries and check if `name` appears
  const slice = rec.entries.slice(-RECENT_WINDOW);
  for (const e of slice) {
    if (Array.isArray(e.surfaced) && e.surfaced.includes(name)) return true;
  }
  return false;
}

function recordRecent(rec, promptKey, surfaced) {
  rec.entries.push({ ts: Date.now(), promptKey, surfaced });
  if (rec.entries.length > RECENT_CAP) rec.entries = rec.entries.slice(-RECENT_CAP);
  saveRecent(rec);
}

function scoreMatch(promptTokens, trigger) {
  // matcher.value is a "|"-alternation regex like "dispatcher coverage|wiring breakdown"
  // Score = base_score × density boost (hits / phrase_terms).
  const base = typeof trigger.score === "number" ? trigger.score : 0.7;
  const phrases = String(trigger.matcher.value).split("|").map(s => s.trim().toLowerCase()).filter(Boolean);
  let bestHit = 0;
  const promptStr = promptTokens.join(" ");
  for (const phrase of phrases) {
    if (!phrase) continue;
    // exact phrase hit
    if (promptStr.includes(phrase)) {
      bestHit = Math.max(bestHit, 1.0);
      continue;
    }
    // partial: count words from the phrase that appear in the prompt
    const phraseWords = phrase.split(/\s+/).filter(w => w.length >= 2);
    if (!phraseWords.length) continue;
    let hits = 0;
    for (const w of phraseWords) {
      if (promptTokens.includes(w)) hits++;
    }
    const density = hits / phraseWords.length;
    bestHit = Math.max(bestHit, density);
  }
  return base * bestHit;
}

function djb2(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16);
}

function emit(obj) {
  try { process.stdout.write(JSON.stringify(obj)); } catch { /* ignore */ }
}

async function main() {
  if (DISABLED) { emit({ continue: true }); return; }
  const payload = await readStdin();

  // Only fire on UserPromptSubmit
  const event = payload.hook_event_name || payload.hookEventName || "";
  if (event !== "UserPromptSubmit") { emit({ continue: true }); return; }

  const prompt = String(payload.prompt || payload.user_prompt || "").trim();
  if (!prompt || prompt.length < 8) { emit({ continue: true }); return; }

  const triggers = readTriggers();
  if (!triggers || triggers.length === 0) { emit({ continue: true }); return; }

  const tokens = tokenize(prompt);
  if (!tokens.length) { emit({ continue: true }); return; }

  // Score every trigger
  const scored = [];
  for (const t of triggers) {
    if (t.action && t.action !== "suggest") continue;
    const s = scoreMatch(tokens, t);
    if (s >= MIN_SCORE) scored.push({ name: t.name, score: s, type: t.type || "skill" });
  }
  if (scored.length === 0) {
    // telemetry: empty result
    try {
      appendFileSync(TELEMETRY_PATH,
        JSON.stringify({ ts: new Date().toISOString(), hook: "skill-auto-trigger", decision: "empty", scanned: triggers.length }) + "\n",
        { flag: "a" });
    } catch { /* ignore */ }
    emit({ continue: true });
    return;
  }

  // Sort, dedup, suppress recently-surfaced
  scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  const recent = loadRecent();
  const promptKey = djb2(prompt.slice(0, 200));
  const filtered = [];
  for (const s of scored) {
    if (filtered.length >= K) break;
    if (recentlySurfaced(recent, s.name)) continue;
    filtered.push(s);
  }
  if (filtered.length === 0) { emit({ continue: true }); return; }

  recordRecent(recent, promptKey, filtered.map(f => f.name));

  // Build advisory context
  const lines = filtered.map(s => `  /${s.name}   (score ${s.score.toFixed(2)})`);
  const ctx = `🔔 Skill auto-trigger — top-${filtered.length} match${filtered.length > 1 ? "es" : ""} for this prompt:\n${lines.join("\n")}\n\nInvoke explicitly if relevant — these are suggestions, not auto-runs.\nKnobs: PRISM_SKILL_AUTO_TRIGGER_DISABLE=1 | PRISM_SKILL_AUTO_TRIGGER_K=N | PRISM_SKILL_AUTO_TRIGGER_MIN=0..1`;

  // Telemetry: matched
  try {
    appendFileSync(TELEMETRY_PATH,
      JSON.stringify({
        ts: new Date().toISOString(),
        hook: "skill-auto-trigger",
        decision: "matched",
        scanned: triggers.length,
        topK: filtered.map(f => ({ name: f.name, score: Number(f.score.toFixed(3)) })),
      }) + "\n",
      { flag: "a" });
  } catch { /* ignore */ }

  emit({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: ctx,
    },
  });
}

main().catch((e) => {
  safeStderr(`fatal: ${e.message}`);
  emit({ continue: true });
});
