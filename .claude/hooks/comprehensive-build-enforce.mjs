#!/usr/bin/env node
// tier: T0
/**
 * comprehensive-build-enforce.mjs — UserPromptSubmit enforcement hook
 *
 * WHY: The user has repeatedly been shipped partial work — gap analyses
 * that identify 20 engines but build 3, roadmap execution that stops at
 * the first unit, "max variability" claims that only cover the happy
 * path. This hook fires BEFORE the model reads the user's prompt and
 * injects a hard directive whenever the prompt contains planning /
 * roadmap / execution / build / code language.
 *
 * FIRES ON:  UserPromptSubmit
 * BLOCKING:  never (injects additionalContext only — model still free to
 *            ask clarifying questions)
 * SCOPE:     global — lives in H:\prism\.claude\hooks\
 *
 * DETECTION: Regex union on the raw prompt text. Case-insensitive. We
 * deliberately over-match — a false positive just appends ~300 tokens
 * of directive; a false negative lets the model ship half-built work.
 *
 * DIRECTIVE INJECTED (verbatim to the model):
 *   • Enumerate the ENTIRE solution space before writing code (list all
 *     N items, not the first 3).
 *   • Cover happy path + ≥3 failure modes + ≥2 adversarial inputs.
 *   • Build all identified assets in the same session — no "deferred to
 *     later" unless user explicitly scopes down.
 *   • Every engine gets real tests (reference values, invariants) — no
 *     toBeDefined() stubs.
 *   • Wiring: import + call + surfaced in dispatcher AND tested E2E.
 *   • Escape hatch: user can write "[SCOPED]" or "[MINIMAL]" in their
 *     prompt to opt out of the full-variability directive.
 *
 * SIDE EFFECTS: none. Does not write state files, does not spawn
 * subprocesses, does not touch network.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import os from "node:os";
import { exit } from "node:process";

// Emit the minimum valid hook JSON before exit. Claude Code validates every
// hook's stdout; bare exit(0) with no output fails the schema with
// "(root): Invalid input". Every early-return path must call this.
function silentOk() {
  process.stdout.write(JSON.stringify({ continue: true }));
  exit(0);
}

// ── Rate-limit: inject at most once every RATE_WINDOW_MS per bucket ──
// The directive is ~500 tokens. Firing every prompt during an iterative
// build session burns 10–20k tokens over a turn-rich loop with no new
// information for the model. Once per 5-minute window per bucket keeps
// the reminder live without the tax.
const RATE_WINDOW_MS = 5 * 60 * 1000;
const RATE_FILE = join(os.tmpdir(), "prism-hook-state", "comprehensive-build-enforce.last.json");
function loadRate() { try { return JSON.parse(readFileSync(RATE_FILE, "utf8")); } catch { return {}; } }
function saveRate(s) {
  try {
    const d = dirname(RATE_FILE);
    if (!existsSync(d)) mkdirSync(d, { recursive: true });
    writeFileSync(RATE_FILE, JSON.stringify(s));
  } catch { /* ignore */ }
}

// ── Parse stdin ────────────────────────────────────────────────────────
let payload;
try {
  payload = JSON.parse(readFileSync(0, "utf-8"));
} catch {
  silentOk(); // malformed input → emit valid continue:true
}

const prompt = String(payload?.prompt ?? "");
if (!prompt.trim()) silentOk();

// ── Explicit opt-out ──────────────────────────────────────────────────
// A user who wants a minimal one-shot fix can signal so. We respect it.
const OPTOUT_RE = /\[\s*(?:SCOPED|MINIMAL|QUICKFIX|NARROW)\s*\]/i;
if (OPTOUT_RE.test(prompt)) silentOk();

// ── Meta-task suppression (AUTO-INVOCATION-MS0/U-AIM01, 2026-05-16) ───
// Audit/inventory/hook/skill/dispatcher/settings/slot/fleet/etc prompts
// are about PRISM machinery itself, not domain build work. The build-
// enforcement directive is pure noise for those — silently skip.
// Knob: PRISM_META_SUPPRESS_DISABLE=1 disables the suppressor globally.
try {
  const { isMetaTask } = await import("../helpers/meta-task-suppressor.mjs");
  if (isMetaTask(prompt).suppress) silentOk();
} catch { /* helper missing — fall through to normal flow */ }

// ── Slash-invocation suppression (SLOT-DRIFT-FIX-MS0/U-SDF08, 2026-05-17) ─
// Pure slash invocations (/checkin-bravo, /loop, /handoff) are PRISM
// machinery — not a build directive. Inject saves ~400 tokens per such
// invocation. Knob: PRISM_SLASH_SUPPRESS_DISABLE=1.
try {
  const { isPureSlashInvocation } = await import("../helpers/slash-invocation-suppressor.mjs");
  if (isPureSlashInvocation(prompt).suppress) silentOk();
} catch { /* helper missing — fall through to normal flow */ }

// ── Trigger detection ─────────────────────────────────────────────────
// Split into two intent buckets so we can tailor the injection:
//   PLAN  = roadmap / plan / architecture — requires exhaustive enumeration
//   BUILD = code / engine / wire / implement — requires full coverage + tests
// A single regex union would collapse these into one message; we want the
// model to *see* which bucket fired (it changes the discipline).

const PLAN_RE = new RegExp(
  [
    "\\broadmap\\b",
    "\\bplan\\b",
    "\\bplanning\\b",
    "\\barchitect(?:ure|ing)?\\b",
    "\\bdesign\\b",
    "\\bscope\\b",
    "\\bgap\\s*(?:analysis|fill)\\b",
    "\\bmilestone\\b",
    "\\bphase\\b",
    "\\bbreak\\s*down\\b",
    "\\bdecompose\\b",
    "\\benumerate\\b",
  ].join("|"),
  "i",
);

const BUILD_RE = new RegExp(
  [
    "\\bbuild(?:ing)?\\b",
    "\\bimplement(?:ing|ation)?\\b",
    "\\bcreate\\b",
    "\\bwire\\b",
    "\\bwiring\\b",
    "\\brefactor\\b",
    "\\bwrite\\b",
    "\\bcode\\b",
    "\\bcoding\\b",
    "\\bengine(?:s)?\\b",
    "\\bdispatcher\\b",
    "\\baction(?:s)?\\b",
    "\\bhook(?:s)?\\b",
    "\\bscript(?:s)?\\b",
    "\\bskill(?:s)?\\b",
    "\\bneural\\b",
    "\\bai\\s*system\\b",
    "\\bcontinue\\b", // "continue X" in this project almost always means "keep building"
    "\\bfinish\\b",
    "\\bcomplete\\b",
    "\\bship\\b",
    "\\bproduction[-\\s]*ready\\b",
  ].join("|"),
  "i",
);

const planHit = PLAN_RE.test(prompt);
const buildHit = BUILD_RE.test(prompt);

if (!planHit && !buildHit) silentOk();

// Rate-limit: skip if we've already injected this bucket recently.
const now = Date.now();
const rateState = loadRate();
const bucket = planHit && buildHit ? "plan+build" : planHit ? "plan" : "build";
const lastAt = rateState[bucket] ?? 0;
if (now - lastAt < RATE_WINDOW_MS) silentOk();
rateState[bucket] = now;
for (const k of Object.keys(rateState)) {
  if (now - rateState[k] > RATE_WINDOW_MS * 10) delete rateState[k];
}
saveRate(rateState);

// ── Compose directive ─────────────────────────────────────────────────
// Keep it tight — every token here comes out of the model's context
// budget. Target: ~280 tokens.

const lines = [];
lines.push("━".repeat(70));
lines.push("COMPREHENSIVE-BUILD ENFORCEMENT — injected by UserPromptSubmit hook");
lines.push("━".repeat(70));
lines.push("");
lines.push(
  "The user has repeatedly been shipped partial work. For THIS prompt, " +
    "apply the following discipline (escape hatch: user may write " +
    "[SCOPED] to opt out):",
);
lines.push("");

if (planHit) {
  lines.push("PLANNING / ROADMAP SCOPE:");
  lines.push(
    "  1. Enumerate the ENTIRE solution space before narrowing. If you " +
      "identify N items, list all N — do not mention 'and others' or " +
      "'the first 3'.",
  );
  lines.push(
    "  2. For each identified asset, state: (a) why it's needed, " +
      "(b) what it depends on, (c) what it blocks. No orphan planning.",
  );
  lines.push(
    "  3. Surface the full variability axis: inputs × states × " +
      "failure modes × adversarial cases. Do not silently prune.",
  );
  lines.push("");
}

if (buildHit) {
  lines.push("BUILD / IMPLEMENTATION SCOPE:");
  lines.push(
    "  1. Build EVERY identified asset in this session — no 'deferred to " +
      "follow-up' unless the user explicitly scopes the work down.",
  );
  lines.push(
    "  2. Every new engine ships with: real tests (reference values or " +
      "algebraic invariants — NEVER toBeDefined() stubs), dispatcher " +
      "wiring (import + call + action enum + schema), and a " +
      "round-trip E2E assertion.",
  );
  lines.push(
    "  3. Coverage floor: happy path + ≥3 failure modes " +
      "(bad input, boundary, resource exhaustion) + ≥2 adversarial " +
      "inputs (NaN, Infinity, empty, oversize).",
  );
  lines.push(
    "  4. Variability floor: if the domain has N configurations " +
      "(materials, dialects, machine types, CAM systems), exercise ≥3 " +
      "spanning ones in tests — not just the canonical default.",
  );
  lines.push(
    "  5. Wiring verification: confirm the dispatcher schema, action " +
      "enum, and lazy import all match. A test must invoke through the " +
      "dispatcher, not only the engine singleton.",
  );
  lines.push("");
}

lines.push("CUT-OFF RULES:");
lines.push(
  "  • If context is insufficient, do ALL the enumeration work first, " +
    "then stop at the first write and check in — do not half-build.",
);
lines.push(
  "  • If tests fail, fix the code or fix the test — never comment out, " +
    "skip with .skip, or weaken the assertion to make it pass.",
);
lines.push(
  "  • Use the duplication guard before creating anything " +
    "(duplicationGuardEngine.checkBeforeCreating).",
);
lines.push("━".repeat(70));

const additionalContext = lines.join("\n");

// ── Emit ───────────────────────────────────────────────────────────────
process.stdout.write(
  JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext,
    },
  }),
);
exit(0);
