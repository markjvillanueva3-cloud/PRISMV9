// scripts/trigger-command-pipeline.test.mjs
//
// Tests for the command→Ollama route registry (scripts/lib/command-ollama-routes.mjs)
// AND the trigger runner (scripts/trigger-command-pipeline.mjs). node:test.
//
// Covers: the anti-drift contract (registry modes == ask-ollama's real modes),
// every cited backing script existing on disk (R12 real-data check), the pure
// plan builders, and runStep with an INJECTED exec impl (happy + 3 failure modes
// + adversarial: missing arg, exec throw, non-JSON stdout). Never spawns Ollama.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

import {
  OLLAMA_MODES,
  FILE_MODES,
  COMMAND_ROUTES,
  getRoute,
  routeSavings,
  listRoutes,
  routableCommands,
} from "./lib/command-ollama-routes.mjs";
import { ALL_MODES } from "./ask-ollama.mjs";
import {
  resolveStepInput,
  buildStepArgv,
  planPipeline,
  renderPlan,
  renderList,
  runStep,
  renderHitsCompact,
  parseArgs,
} from "./trigger-command-pipeline.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..");

// ── Registry: anti-drift contract ────────────────────────────────────────────
test("OLLAMA_MODES exactly equals ask-ollama's real ALL_MODES (no dead-mode drift)", () => {
  assert.deepEqual(new Set(OLLAMA_MODES), ALL_MODES,
    "registry modes drifted from ask-ollama.mjs — a route may point at a removed mode");
});

test("every route step uses a real ask-ollama mode", () => {
  for (const r of COMMAND_ROUTES) {
    for (const s of r.ollamaSteps) {
      assert.ok(OLLAMA_MODES.includes(s.mode), `route ${r.command} step '${s.label}' has unknown mode ${s.mode}`);
    }
  }
});

test("every route is well-formed (command, aliases array, ≥1 step, claudeKeeps, saves>0)", () => {
  for (const r of COMMAND_ROUTES) {
    assert.ok(typeof r.command === "string" && r.command.length, "command must be a non-empty string");
    assert.ok(Array.isArray(r.aliases), "aliases must be an array");
    assert.ok(Array.isArray(r.ollamaSteps) && r.ollamaSteps.length >= 1, "must have ≥1 ollama step");
    assert.ok(typeof r.claudeKeeps === "string" && r.claudeKeeps.length, "claudeKeeps must be described (honesty)");
    for (const s of r.ollamaSteps) {
      assert.ok(Number.isFinite(s.saves) && s.saves > 0, `step '${s.label}' must claim positive savings`);
      assert.ok(s.input && (s.input.kind === "cli-arg" || s.input.kind === "path"), "step input.kind must be cli-arg|path");
      if (s.input.kind === "path") assert.ok(s.input.value, "path-input step needs a value");
    }
  }
});

// R12/R15 LIVE-DATA CHECK: a cited backing script that vanished is a silent lie.
test("every non-null backing script exists on disk", () => {
  for (const r of COMMAND_ROUTES) {
    if (r.script == null) continue;
    const abs = join(REPO_ROOT, r.script);
    assert.ok(existsSync(abs) && statSync(abs).isFile(), `route ${r.command}: backing script missing on disk — ${r.script}`);
  }
});

test("command names + aliases are globally unique (no two routes collide)", () => {
  const seen = new Map();
  for (const r of COMMAND_ROUTES) {
    for (const name of [r.command, ...r.aliases]) {
      assert.ok(!seen.has(name), `'${name}' is claimed by both ${seen.get(name)} and ${r.command}`);
      seen.set(name, r.command);
    }
  }
});

// ── Registry: lookups ────────────────────────────────────────────────────────
test("getRoute resolves by command, alias, leading-slash, case-insensitively", () => {
  assert.equal(getRoute("find").command, "find");
  assert.equal(getRoute("/find").command, "find");
  assert.equal(getRoute("FIND").command, "find");
  assert.equal(getRoute("deep-search").command, "find", "alias resolves to its canonical route");
  assert.equal(getRoute("master-index").command, "find");
});

test("getRoute returns null on unknown / empty / non-string", () => {
  assert.equal(getRoute("no-such-command"), null);
  assert.equal(getRoute(""), null);
  assert.equal(getRoute("   "), null);
  assert.equal(getRoute(null), null);
  assert.equal(getRoute(undefined), null);
  assert.equal(getRoute(42), null);
});

test("routeSavings sums step savings; listRoutes ranks descending", () => {
  const find = getRoute("find");
  assert.equal(routeSavings(find), find.ollamaSteps.reduce((a, s) => a + s.saves, 0));
  const ranked = listRoutes();
  for (let i = 1; i < ranked.length; i++) {
    assert.ok(routeSavings(ranked[i - 1]) >= routeSavings(ranked[i]), "listRoutes not sorted descending by savings");
  }
});

test("routableCommands is deduped, sorted, and includes aliases", () => {
  const names = routableCommands();
  assert.deepEqual(names, [...new Set(names)].sort(), "must be deduped + sorted");
  assert.ok(names.includes("find") && names.includes("deep-search"), "includes command + alias");
});

// ── Runner: resolveStepInput ─────────────────────────────────────────────────
test("resolveStepInput: path kind returns the fixed value (no CLI arg needed)", () => {
  const r = resolveStepInput({ label: "x", mode: "summarize", input: { kind: "path", value: "state/foo.md" } }, undefined);
  assert.deepEqual(r, { ok: true, input: "state/foo.md" });
});

test("resolveStepInput: cli-arg kind requires an arg, fails loud when missing", () => {
  const step = { label: "search", mode: "viz", input: { kind: "cli-arg" } };
  assert.equal(resolveStepInput(step, "kienzle force").input, "kienzle force");
  assert.equal(resolveStepInput(step, "  trimmed  ").input, "trimmed");
  assert.equal(resolveStepInput(step, undefined).ok, false);
  assert.equal(resolveStepInput(step, "").ok, false);
  assert.equal(resolveStepInput(step, "   ").ok, false);
});

test("resolveStepInput: unknown kind / missing path value fail loud", () => {
  assert.equal(resolveStepInput({ label: "x", mode: "ask", input: { kind: "bogus" } }, "q").ok, false);
  assert.equal(resolveStepInput({ label: "x", mode: "summarize", input: { kind: "path" } }, undefined).ok, false);
});

// ── Runner: buildStepArgv ────────────────────────────────────────────────────
test("buildStepArgv always emits mode + input + --json; --model only when pinned", () => {
  assert.deepEqual(buildStepArgv({ mode: "summarize", model: null }, "f.md"), ["summarize", "f.md", "--json"]);
  assert.deepEqual(
    buildStepArgv({ mode: "explain", model: "qwen2.5-coder:32b" }, "f.ts"),
    ["explain", "f.ts", "--json", "--model", "qwen2.5-coder:32b"],
  );
});

// ── Runner: planPipeline ─────────────────────────────────────────────────────
test("planPipeline: unknown command → ok:false + known list", () => {
  const p = planPipeline("totally-unknown", null);
  assert.equal(p.ok, false);
  assert.ok(Array.isArray(p.known) && p.known.includes("find"));
});

test("planPipeline: cli-arg command with an arg builds runnable argv per step", () => {
  const p = planPipeline("find", "kienzle force");
  assert.equal(p.ok, true);
  assert.equal(p.command, "find");
  assert.equal(p.steps.length, 1);
  assert.deepEqual(p.steps[0].argv, ["viz", "kienzle force", "--json"]);
  assert.equal(p.steps[0].error, undefined);
});

test("planPipeline: path-kind command resolves with NO cli arg (uses fixed path)", () => {
  const p = planPipeline("close-out-audit", undefined);
  assert.equal(p.ok, true);
  assert.equal(p.steps[0].error, undefined, "path-kind step must resolve without a CLI arg");
  assert.ok(p.steps[0].argv.includes("state/shared/CLOSE-OUT-CANDIDATES.md"));
});

test("planPipeline: cli-arg command WITHOUT an arg surfaces a per-step error (not a crash)", () => {
  const p = planPipeline("explain", undefined); // explain is cli-arg
  assert.equal(p.ok, true);
  assert.ok(p.steps[0].error, "missing-arg must be a step error, not a thrown exception");
  assert.equal(p.steps[0].argv, undefined);
});

// ── Runner: renderers ────────────────────────────────────────────────────────
test("renderPlan prints the concrete ask-ollama command for a runnable step", () => {
  const txt = renderPlan(planPipeline("find", "kienzle"));
  assert.match(txt, /node scripts\/ask-ollama\.mjs viz kienzle --json/);
  assert.match(txt, /Claude keeps:/);
});

test("renderPlan on an unknown command lists the routable set", () => {
  const txt = renderPlan(planPipeline("nope", null));
  assert.match(txt, /Routable commands:/);
  assert.match(txt, /find/);
});

test("renderList shows ranked rows with savings + modes", () => {
  const txt = renderList();
  assert.match(txt, /Ollama-routable commands/);
  assert.match(txt, /\/find/);
  assert.match(txt, /tok/);
});

// ── Runner: runStep with INJECTED exec (no real Ollama) ──────────────────────
test("runStep: file-mode JSON {answer} → ok + answer + source(model)", async () => {
  const execStub = async () => ({ stdout: JSON.stringify({ answer: "it parses the config", model: "qwen2.5-coder:32b" }) });
  const r = await runStep(["explain", "f.ts", "--json"], { execFileImpl: execStub });
  assert.equal(r.ok, true);
  assert.equal(r.answer, "it parses the config");
  assert.equal(r.source, "qwen2.5-coder:32b");
});

test("runStep: viz JSON {hits} → ok + compact rendered hits", async () => {
  const hits = [{ id: "eng.mill", label: "Mill Engine", info: "milling physics" }];
  const execStub = async () => ({ stdout: JSON.stringify({ mode: "viz", hits }) });
  const r = await runStep(["viz", "mill", "--json"], { execFileImpl: execStub });
  assert.equal(r.ok, true);
  assert.match(r.answer, /\[eng\.mill\] Mill Engine — milling physics/);
});

test("runStep: ask-ollama non-zero exit → ok:false with the stderr reason (fail loud)", async () => {
  const execStub = async () => { const e = new Error("exit 3"); e.stderr = "[ask-ollama] Ollama unreachable: ECONNREFUSED"; throw e; };
  const r = await runStep(["summarize", "big.md", "--json"], { execFileImpl: execStub });
  assert.equal(r.ok, false);
  assert.match(r.error, /Ollama unreachable/);
});

test("runStep: --json Ollama-down fallback signal on stderr → clean reason + fallback:claude (P0-3)", async () => {
  // ask-ollama --json now emits a STRUCTURED Sonnet-fallback signal on stderr
  // when local generation fails (OLLAMA-FLEET-AUDIT P0-3). runStep parses it:
  // surfaces the clean reason (not a raw JSON blob) AND propagates the lane so
  // the pipeline knows this step must escalate to Claude.
  const sig = JSON.stringify({
    ollamaUnavailable: true, lane: "claude", fellBack: true, mode: "summarize",
    reason: "local Ollama generation failed (Ollama unreachable)", directive: "you are the fallback",
  });
  const execStub = async () => { const e = new Error("exit 3"); e.stderr = sig; throw e; };
  const r = await runStep(["summarize", "big.md", "--json"], { execFileImpl: execStub });
  assert.equal(r.ok, false);
  assert.match(r.error, /local Ollama generation failed/);
  assert.equal(r.fallback, "claude"); // operator-directed Claude escalation propagated through the pipeline
});

test("runStep: --synth degraded shape {ollamaError} → ok:false", async () => {
  const execStub = async () => ({ stdout: JSON.stringify({ mode: "viz", ollamaError: "timed out", hits: [] }) });
  const r = await runStep(["viz", "x", "--json", "--synth"], { execFileImpl: execStub });
  assert.equal(r.ok, false);
  assert.match(r.error, /timed out/);
});

test("runStep: non-JSON stdout degrades to raw (never throws)", async () => {
  const execStub = async () => ({ stdout: "plain text answer" });
  const r = await runStep(["ask", "hi", "--json"], { execFileImpl: execStub });
  assert.equal(r.ok, true);
  assert.equal(r.source, "raw");
  assert.equal(r.answer, "plain text answer");
});

// ── Runner: small pure helpers ───────────────────────────────────────────────
test("renderHitsCompact: empty → placeholder; hits → numbered", () => {
  assert.equal(renderHitsCompact([]), "(no matching graph nodes)");
  assert.equal(renderHitsCompact(null), "(no matching graph nodes)");
  assert.match(renderHitsCompact([{ id: "a", label: "A" }, { id: "b", label: "B" }]), /^1\. \[a\] A\n2\. \[b\] B$/);
});

test("parseArgs: flags + command + multi-word arg", () => {
  assert.deepEqual(parseArgs(["--list"]), { list: true, plan: false, json: false, command: null, arg: null });
  assert.deepEqual(parseArgs(["--plan", "find", "kienzle", "force"]),
    { list: false, plan: true, json: false, command: "find", arg: "kienzle force" });
  assert.deepEqual(parseArgs(["explain", "src/foo.ts", "--json"]),
    { list: false, plan: false, json: true, command: "explain", arg: "src/foo.ts" });
});

// FILE_MODES is the contract the runner's error message keys on — assert it's the real set.
test("FILE_MODES matches ask-ollama's file-path modes", () => {
  assert.deepEqual(new Set(FILE_MODES), new Set(["summarize", "explain", "triage"]));
});
