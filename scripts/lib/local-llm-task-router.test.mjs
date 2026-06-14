// tier: T4
// Tests for scripts/lib/local-llm-task-router.mjs (HERMES-EFFICIENCY-ROUTER U1).
//
// node:test — hermetic where it must be (DI stubs for fetch/host), but the
// "real composition" tests use the ACTUAL routeModelForTask so the wiring is
// proven, not mocked (R9: a test that passes against a hardcoded return is
// worthless). No real Ollama/GPU/network is touched.
//
// Run: node --test H:/prism/scripts/lib/local-llm-task-router.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  routeTask,
  classifyTaskClass,
  isSafetyCritical,
  SAFETY_PATTERNS,
} from "./local-llm-task-router.mjs";
import { routeModelForTask } from "../../.claude/hooks/lib/ollama-cost-router.mjs";

// Realistic post-retirement Blackwell install (no small coders; 32b floor + gpt-oss).
const BLACKWELL = ["qwen2.5-coder:32b", "gpt-oss:120b", "gpt-oss:20b", "nomic-embed-text:latest"];
const FLOOR_ONLY = ["qwen2.5-coder:32b", "nomic-embed-text:latest"];

// ── INVARIANT 1: safety is NEVER judged by a local model ──────────────────────

test("INVARIANT safety-never-local: cutting-parameter validation escalates to Claude", async () => {
  const r = await routeTask({ task: "validate cutting parameters for Ti-6Al-4V, S(x) gate", available: BLACKWELL, hardware: "home_blackwell" });
  assert.equal(r.taskClass, "safety_critical");
  assert.equal(r.runLocal, false);
  assert.equal(r.escalateTo, "claude");
  assert.equal(r.ollamaModel, null);
  assert.equal(r.qualityBar, 0.98);
});

test("safety spans multiple phrasings (feeds/speeds, g-code validate, tolerance gate) — all escalate", async () => {
  for (const t of [
    "compute the feeds and speeds for this 4140 roughing pass",
    "validate the NC program toolpath for collisions",
    "run the tolerance gate on this stack-up",
    "check the S(x) safety gate for these spindle loads",
  ]) {
    const r = await routeTask({ task: t, available: BLACKWELL, hardware: "home_blackwell" });
    assert.equal(r.runLocal, false, `should escalate: "${t}"`);
    assert.equal(r.escalateTo, "claude", `should escalate: "${t}"`);
  }
});

test("isSafetyCritical: positive on safety, negative on a plain summarize", () => {
  assert.equal(isSafetyCritical("validate cutting parameters, S(x) gate"), true);
  assert.equal(isSafetyCritical("summarize this 30KB build log"), false);
  assert.equal(isSafetyCritical(null), false);
});

test("INVARIANT safety-vocabulary breadth: common real phrasings ALL escalate (per-file scrutiny P0 regression guard)", async () => {
  // These are the phrasings the original narrow patterns MISSED (a safety task
  // wrongly run local is the one dangerous failure mode). Every one must escalate.
  const mustEscalate = [
    "optimize the feedrate for this pocket",
    "what RPM should I run for 6061 with a 1/2 endmill",
    "recommend a depth of cut and stepover for this slot",
    "is this toolpath safe to run on the VMC",
    "review the G-code before I post it to the machine",
    "calculate surface speed for carbide on Inconel",
    "speed and feed for 4140",
    "compute the IPM for this drill cycle",
    "validate this CNC program",
    "does this program crash the machine",
    "check for rapid moves through the stock",
    "what plunge rate for this drill",
    "DOC and WOC for the finishing pass",
  ];
  for (const t of mustEscalate) {
    assert.equal(isSafetyCritical(t), true, `must be safety-critical: "${t}"`);
    const r = await routeTask({ task: t, available: BLACKWELL, hardware: "home_blackwell", routeModelForTaskFn: routeModelForTask });
    assert.equal(r.runLocal, false, `must NOT run local: "${t}"`);
    assert.equal(r.escalateTo, "claude", `must escalate: "${t}"`);
    assert.equal(r.ollamaModel, null, `no local model on safety: "${t}"`);
  }
});

test("safety FALSE-POSITIVE guard: non-machining 'speed'/'build' phrasings stay LOCAL (do not over-escalate)", async () => {
  for (const t of [
    "summarize how to speed up the webpack build",
    "explain why the deploy is slow",
    "classify these support tickets by topic",
    // check/verify + web-"feed" / perf-"speed" — the P1 over-escalation collision
    "check the RSS feed parser speed",
    "verify the API response speed",
    "validate the news feed URL before saving",
  ]) {
    assert.equal(isSafetyCritical(t), false, `must NOT be safety: "${t}"`);
    const r = await routeTask({ task: t, available: BLACKWELL, hardware: "home_blackwell", routeModelForTaskFn: routeModelForTask });
    assert.equal(r.runLocal, true, `must run local (no over-escalation): "${t}"`);
  }
});

test("safety verdict carries category:null (consumers must tolerate it without NPE)", async () => {
  const r = await routeTask({ task: "validate the feeds and speeds, S(x) gate", available: BLACKWELL, hardware: "home_blackwell" });
  assert.equal(r.category, null);
  assert.equal(r.runLocal, false);
});

// ── INVARIANT 2: a returned model is ALWAYS in the installed set (real composition) ──

test("INVARIANT model-∈-installed: summarize routes local to a model that IS installed (real cost-router)", async () => {
  const r = await routeTask({ task: "summarize this 30KB build log", available: BLACKWELL, hardware: "home_blackwell", routeModelForTaskFn: routeModelForTask });
  assert.equal(r.runLocal, true);
  assert.ok(BLACKWELL.includes(r.ollamaModel), `ollamaModel ${r.ollamaModel} must be installed`);
  assert.equal(r.escalateTo, null);
});

test("real composition: codegen → best tier picks the strongest installed (gpt-oss:120b on Blackwell)", async () => {
  const r = await routeTask({ task: "write a function to parse the NC header", available: BLACKWELL, hardware: "home_blackwell", routeModelForTaskFn: routeModelForTask });
  assert.equal(r.taskClass, "codegen");
  assert.equal(r.category, "search_synthesis");
  assert.equal(r.runLocal, true);
  // best tier leads with gpt-oss:120b; with it installed it must be chosen.
  assert.equal(r.ollamaModel, "gpt-oss:120b");
  assert.ok(BLACKWELL.includes(r.ollamaModel));
});

test("real composition: floor-only host still resolves to the 32b (no phantom), runs local", async () => {
  const r = await routeTask({ task: "explain what this regex does", available: FLOOR_ONLY, hardware: "home_blackwell", routeModelForTaskFn: routeModelForTask });
  assert.equal(r.runLocal, true);
  assert.equal(r.ollamaModel, "qwen2.5-coder:32b");
  assert.ok(FLOOR_ONLY.includes(r.ollamaModel));
});

test("drift guard: across many task types, a local route NEVER returns an uninstalled model (real cost-router)", async () => {
  const tasks = ["summarize x", "classify these tags", "convert this to json", "write code to sort", "synthesize these notes", "explain the design", "document this function", "reason about the tradeoff"];
  for (const t of tasks) {
    const r = await routeTask({ task: t, available: BLACKWELL, hardware: "home_blackwell", routeModelForTaskFn: routeModelForTask });
    if (r.runLocal) assert.ok(BLACKWELL.includes(r.ollamaModel), `"${t}" → uninstalled model ${r.ollamaModel}`);
  }
});

// ── INVARIANT 3: IP stays local — extraction of a customer print runs local ──

test("INVARIANT IP-stays-local: extracting dims from a customer print runs local (never cloud)", async () => {
  const r = await routeTask({ task: "extract the dimensions from this customer print PDF", available: BLACKWELL, hardware: "home_blackwell", routeModelForTaskFn: routeModelForTask });
  assert.equal(r.taskClass, "extract");
  assert.equal(r.runLocal, true);
  assert.equal(r.escalateTo, null);
});

// ── failure modes ──

test("FAILURE ollama down (no installed models) → fail-loud escalate, never a phantom model", async () => {
  const r = await routeTask({ task: "summarize this", fetchModelsFn: async () => [], hardware: "home_blackwell" });
  assert.equal(r.runLocal, false);
  assert.equal(r.escalateTo, "claude");
  assert.equal(r.ollamaModel, null);
  assert.match(r.reason.join(" "), /no installed models/);
});

test("FAILURE fetch throws (ollama unreachable) → fail-soft to escalate, no crash", async () => {
  const r = await routeTask({ task: "summarize this", fetchModelsFn: async () => { throw new Error("ECONNREFUSED"); } });
  assert.equal(r.runLocal, false);
  assert.equal(r.escalateTo, "claude");
});

test("FAILURE picker returns a phantom (not in installed) → escalate, defends invariant 2", async () => {
  const r = await routeTask({
    task: "summarize this",
    available: BLACKWELL,
    hardware: "home_blackwell",
    routeModelForTaskFn: () => ({ model: "qwen2.5-coder:7b", tier: "balanced", reason: "stale phantom" }), // deleted model
  });
  assert.equal(r.runLocal, false, "a model not in the installed set must NOT be run");
  assert.equal(r.escalateTo, "claude");
  assert.equal(r.ollamaModel, null);
});

// ── regression: classify-stem fix (U-CLASSIFY-STEM-FIX, india 2026-06-11) ──

test("REGRESSION the full verbs 'classify'/'categorize'/'classification' classify as classify (trailing-\\b stem bug)", () => {
  // Before the fix, `classif\b`/`categoriz\b` never matched the whole word (word-char follows the
  // stem) -> these fell to "unknown" -> the most common classification verbs were never offloaded.
  for (const t of ["classify this part", "categorize this operation", "classification of the material"]) {
    assert.equal(classifyTaskClass(t).taskClass, "classify", `"${t}" must classify`);
  }
  // whole-word anchors for the rest still hold
  assert.equal(classifyTaskClass("triage this error").taskClass, "classify");
  assert.equal(classifyTaskClass("label it red").taskClass, "classify");
});

test("REGRESSION-2 synthesize/consolidate/analyze are JUDGMENT, not mis-routed local (U-CLASSIFY-STEM-FIX-2)", () => {
  // The 2026-06-11 fix left synthesiz/consolidat/analyz/summar with the same trailing-\b bug. These
  // are JUDGMENT verbs (synthesize/consolidate -> synthesize class; analyze -> reason class) that were
  // silently falling to "unknown" and routing to the LOCAL lane. They MUST classify as judgment so a
  // smart-fanout keeps them on Claude.
  for (const t of ["synthesize the findings", "synthesizes these notes", "consolidate the reports", "consolidated the data"]) {
    assert.equal(classifyTaskClass(t).taskClass, "synthesize", `"${t}" must be synthesize (judgment)`);
  }
  for (const t of ["analyze the failure", "analyzes the tradeoffs", "analyzing the regression"]) {
    assert.equal(classifyTaskClass(t).taskClass, "reason", `"${t}" must be reason (judgment)`);
  }
  // summarize stem now labels correctly (was already mechanical via "unknown", but the label was wrong)
  for (const t of ["summarize the log", "summary of the build", "summarizing the changes"]) {
    assert.equal(classifyTaskClass(t).taskClass, "summarize", `"${t}" must be summarize`);
  }
});

// ── adversarial / edge ──

test("ADVERSARIAL empty / null / non-string task → classified unknown, does not crash", async () => {
  assert.deepEqual(classifyTaskClass(""), { taskClass: "unknown", category: "summary" });
  assert.deepEqual(classifyTaskClass(null), { taskClass: "unknown", category: "summary" });
  const r = await routeTask({ task: "", available: BLACKWELL, hardware: "home_blackwell", routeModelForTaskFn: routeModelForTask });
  assert.equal(r.taskClass, "unknown");
  assert.ok([true, false].includes(r.runLocal)); // resolves to a decision, no throw
});

test("ADVERSARIAL a benign 'speed' mention that is NOT machine feeds/speeds does not false-trigger safety", async () => {
  // "speed up the build" must NOT be misread as cutting feeds/speeds.
  const r = await routeTask({ task: "summarize how to speed up the webpack build", available: BLACKWELL, hardware: "home_blackwell", routeModelForTaskFn: routeModelForTask });
  assert.equal(r.runLocal, true);
  assert.notEqual(r.taskClass, "safety_critical");
});

test("fallbackChain always ends in 'claude' (last-resort reviewer) on a local route", async () => {
  const r = await routeTask({ task: "summarize this", available: BLACKWELL, hardware: "home_blackwell", routeModelForTaskFn: routeModelForTask });
  assert.equal(r.fallbackChain[r.fallbackChain.length - 1], "claude");
  assert.ok(r.fallbackChain.includes(r.ollamaModel));
});

test("SAFETY_PATTERNS is a non-empty frozen-ish array of RegExp", () => {
  assert.ok(Array.isArray(SAFETY_PATTERNS) && SAFETY_PATTERNS.length >= 5);
  for (const re of SAFETY_PATTERNS) assert.ok(re instanceof RegExp);
});
