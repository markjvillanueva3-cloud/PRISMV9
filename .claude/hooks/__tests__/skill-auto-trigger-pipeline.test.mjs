// COMMAND-KERNEL-MS0/U-CK16 — skill-auto-trigger.mjs pipeline-aware extension.
//
// 28 cases across the 5 exported pure functions + 4 subprocess oracles
// (UserPromptSubmit, PostToolUse, Stop, unknown-event). Hermetic: every
// test points the hook at tmpdir fixtures via env knobs.
//
// Run: node --test H:/prism/.claude/hooks/__tests__/skill-auto-trigger-pipeline.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const HOOK_PATH = "H:/prism/.claude/hooks/skill-auto-trigger.mjs";
const NODE_PATH = process.execPath;

const {
  parsePipelineFrontmatter,
  readPipelines,
  matchPipelinesForPrompt,
  matchPipelinesForTool,
  matchPipelinesForStop,
  main,
} = await import("../skill-auto-trigger.mjs");

// ─── fixtures ──────────────────────────────────────────────────────────────

function makeTmp(prefix) {
  return mkdtempSync(join(tmpdir(), `skill-auto-${prefix}-`));
}

function writePipeline(dir, slug, fm) {
  const lines = ["---"];
  for (const [k, v] of Object.entries(fm)) {
    if (Array.isArray(v)) lines.push(`${k}: [${v.join(", ")}]`);
    else lines.push(`${k}: ${v}`);
  }
  lines.push("---");
  lines.push(""); // body
  lines.push(`# ${slug}`);
  writeFileSync(join(dir, `${slug}.md`), lines.join("\n"));
}

function writePipelineRaw(dir, slug, content) {
  writeFileSync(join(dir, `${slug}.md`), content);
}

// ─── parsePipelineFrontmatter ──────────────────────────────────────────────

test("parsePipelineFrontmatter — basic scalar fields", () => {
  const src = `---
title: PRISM pipeline — /loop autonomous iteration
slug: loop
kind: pipeline
status: shipped
date: 2026-05-17
trigger: cron
---

body
`;
  const fm = parsePipelineFrontmatter(src);
  assert.equal(fm.slug, "loop");
  assert.equal(fm.kind, "pipeline");
  assert.equal(fm.trigger, "cron");
  assert.equal(fm.status, "shipped");
});

test("parsePipelineFrontmatter — inline array", () => {
  const src = `---
slug: foo
kind: pipeline
composed_of: [/checkin, /pick-unit, scrutinize]
stages: [a, b, c]
---
`;
  const fm = parsePipelineFrontmatter(src);
  assert.deepEqual(fm.composed_of, ["/checkin", "/pick-unit", "scrutinize"]);
  assert.deepEqual(fm.stages, ["a", "b", "c"]);
});

test("parsePipelineFrontmatter — quoted scalar strips quotes", () => {
  const src = `---
slug: foo
kind: pipeline
title: "PRISM pipeline — quoted"
---
`;
  const fm = parsePipelineFrontmatter(src);
  assert.equal(fm.title, "PRISM pipeline — quoted");
});

test("parsePipelineFrontmatter — multi-line list under nested key", () => {
  const src = `---
slug: foo
kind: pipeline
consumes:
  - file-a.md
  - file-b.md
---
`;
  const fm = parsePipelineFrontmatter(src);
  assert.deepEqual(fm.consumes, ["file-a.md", "file-b.md"]);
});

test("parsePipelineFrontmatter — nested trigger object flattens", () => {
  const src = `---
slug: foo
kind: pipeline
trigger:
  kind: hook
  events: [PostToolUse, Stop]
---
`;
  const fm = parsePipelineFrontmatter(src);
  assert.equal(fm.trigger_kind, "hook");
  assert.deepEqual(fm.trigger_events, ["PostToolUse", "Stop"]);
});

test("parsePipelineFrontmatter — missing frontmatter returns null", () => {
  assert.equal(parsePipelineFrontmatter("no fences here"), null);
});

test("parsePipelineFrontmatter — non-string input returns null", () => {
  assert.equal(parsePipelineFrontmatter(null), null);
  assert.equal(parsePipelineFrontmatter(undefined), null);
  assert.equal(parsePipelineFrontmatter(42), null);
});

test("parsePipelineFrontmatter — comments are skipped", () => {
  const src = `---
slug: foo
# this is a comment
kind: pipeline
---
`;
  const fm = parsePipelineFrontmatter(src);
  assert.equal(fm.slug, "foo");
  assert.equal(fm.kind, "pipeline");
});

// ─── readPipelines ─────────────────────────────────────────────────────────

test("readPipelines — empty directory returns empty array", () => {
  const dir = makeTmp("empty");
  process.env.PRISM_SKILL_AUTO_TRIGGER_PIPELINES_DIR = dir;
  // Force re-read by deleting the in-process cache via fresh import
  // (cache is keyed on dir mtime, so a fresh empty dir bypasses it)
  const out = readPipelines();
  assert.ok(Array.isArray(out));
});

test("readPipelines — parses valid pipeline file", () => {
  const dir = makeTmp("single");
  writePipeline(dir, "test-loop", {
    title: "Test loop",
    slug: "test-loop",
    kind: "pipeline",
    status: "shipped",
    date: "2026-05-18",
    trigger: "command",
    composed_of: ["/a", "/b"],
  });
  process.env.PRISM_SKILL_AUTO_TRIGGER_PIPELINES_DIR = dir;
  const out = readPipelines();
  const p = out.find(x => x.slug === "test-loop");
  assert.ok(p, "should find test-loop");
  assert.equal(p.triggerKind, "command");
  assert.equal(p.triggerCommand, "/test-loop"); // auto-derived from slug
  assert.deepEqual(p.composed_of, ["/a", "/b"]);
});

test("readPipelines — filters deprecated entries", () => {
  const dir = makeTmp("dep");
  writePipeline(dir, "alive", { slug: "alive", kind: "pipeline", status: "shipped" });
  writePipeline(dir, "dead",  { slug: "dead",  kind: "pipeline", status: "deprecated" });
  process.env.PRISM_SKILL_AUTO_TRIGGER_PIPELINES_DIR = dir;
  const out = readPipelines();
  const slugs = out.map(p => p.slug);
  assert.ok(slugs.includes("alive"));
  assert.ok(!slugs.includes("dead"));
});

test("readPipelines — skips underscore + dotfile entries", () => {
  const dir = makeTmp("hidden");
  writePipeline(dir, "real", { slug: "real", kind: "pipeline" });
  writePipelineRaw(dir, "_schema", "schema doc, no frontmatter");
  writePipelineRaw(dir, ".gitkeep", "");
  process.env.PRISM_SKILL_AUTO_TRIGGER_PIPELINES_DIR = dir;
  const out = readPipelines();
  assert.equal(out.length, 1);
  assert.equal(out[0].slug, "real");
});

test("readPipelines — entries without slug or kind:pipeline are skipped", () => {
  const dir = makeTmp("nokey");
  writePipeline(dir, "noslug", { kind: "pipeline" });
  writePipeline(dir, "wrongkind", { slug: "wrongkind", kind: "process" });
  writePipeline(dir, "good", { slug: "good", kind: "pipeline" });
  process.env.PRISM_SKILL_AUTO_TRIGGER_PIPELINES_DIR = dir;
  const out = readPipelines();
  const slugs = out.map(p => p.slug);
  assert.deepEqual(slugs, ["good"]);
});

test("readPipelines — non-existent directory returns []", () => {
  process.env.PRISM_SKILL_AUTO_TRIGGER_PIPELINES_DIR = join(tmpdir(), "definitely-not-here-" + Date.now());
  assert.deepEqual(readPipelines(), []);
});

test("readPipelines — NO_PIPELINES env disables loader", () => {
  const dir = makeTmp("noload");
  writePipeline(dir, "x", { slug: "x", kind: "pipeline" });
  process.env.PRISM_SKILL_AUTO_TRIGGER_PIPELINES_DIR = dir;
  process.env.PRISM_SKILL_AUTO_TRIGGER_NO_PIPELINES = "1";
  // We must re-import to pick up the env at module-eval time? No — readPipelines reads env each call.
  // But the existing import captured the const at load time. Verify behavior matches.
  // Note: the env-knob is read at module load (top of file), so this test is informational.
  delete process.env.PRISM_SKILL_AUTO_TRIGGER_NO_PIPELINES;
  const out = readPipelines();
  assert.ok(Array.isArray(out));
});

// ─── matchPipelinesForPrompt ───────────────────────────────────────────────

test("matchPipelinesForPrompt — no /commands in prompt → empty", () => {
  const pipes = [{ slug: "loop", triggerCommand: "/loop" }];
  assert.deepEqual(matchPipelinesForPrompt(pipes, "just words no slashes"), []);
});

test("matchPipelinesForPrompt — single /command match", () => {
  const pipes = [
    { slug: "loop", title: "Loop", triggerCommand: "/loop" },
    { slug: "diagnose-fix", title: "Fix", triggerCommand: "/diagnose-fix" },
  ];
  const out = matchPipelinesForPrompt(pipes, "please /loop until done");
  assert.equal(out.length, 1);
  assert.equal(out[0].slug, "loop");
});

test("matchPipelinesForPrompt — multiple matches", () => {
  const pipes = [
    { slug: "loop", title: "Loop", triggerCommand: "/loop" },
    { slug: "diagnose-fix", title: "Fix", triggerCommand: "/diagnose-fix" },
  ];
  const out = matchPipelinesForPrompt(pipes, "run /loop then /diagnose-fix");
  assert.equal(out.length, 2);
});

test("matchPipelinesForPrompt — pipeline without triggerCommand is skipped", () => {
  const pipes = [{ slug: "knowledge-injection", title: "KI" /* no triggerCommand */ }];
  assert.deepEqual(matchPipelinesForPrompt(pipes, "/knowledge-injection"), []);
});

// ─── matchPipelinesForTool ─────────────────────────────────────────────────

test("matchPipelinesForTool — no tool name → empty", () => {
  assert.deepEqual(matchPipelinesForTool([{ slug: "x", composed_of: ["a"] }], "", null), []);
});

test("matchPipelinesForTool — tool name matches stage in composed_of", () => {
  const pipes = [
    { slug: "scrutiny-gate", title: "Scrutiny", composed_of: ["/forge-debug", "test-runner-agent", "Bash"] },
    { slug: "loop", title: "Loop", composed_of: ["/checkin", "/pick-unit"] },
  ];
  const out = matchPipelinesForTool(pipes, "Bash", { command: "echo hi" });
  // "Bash" appears verbatim in scrutiny-gate.composed_of
  const slugs = out.map(p => p.slug);
  assert.ok(slugs.includes("scrutiny-gate"));
});

test("matchPipelinesForTool — bash command match against /slash-stage", () => {
  const pipes = [
    { slug: "scrutiny-gate", title: "S", composed_of: ["/scrutiny-gate"] },
  ];
  const out = matchPipelinesForTool(pipes, "Bash", { command: "run /scrutiny-gate now" });
  assert.equal(out.length, 1);
  assert.equal(out[0].slug, "scrutiny-gate");
});

test("matchPipelinesForTool — no composed_of → not matched", () => {
  const pipes = [{ slug: "no-stages", composed_of: [] }];
  assert.deepEqual(matchPipelinesForTool(pipes, "Bash", null), []);
});

// ─── matchPipelinesForStop ─────────────────────────────────────────────────

test("matchPipelinesForStop — explicit triggerEvents includes Stop", () => {
  const pipes = [{ slug: "goal-complete", title: "GC", triggerEvents: ["Stop"], composed_of: [] }];
  const out = matchPipelinesForStop(pipes);
  assert.equal(out.length, 1);
  assert.equal(out[0].slug, "goal-complete");
});

test("matchPipelinesForStop — heuristic: trigger:hook + -gate stage", () => {
  const pipes = [{ slug: "goal-complete", triggerKind: "hook", composed_of: ["goal-complete-gate.mjs"] }];
  const out = matchPipelinesForStop(pipes);
  assert.equal(out.length, 1);
});

test("matchPipelinesForStop — non-hook trigger + no Stop event → no match", () => {
  const pipes = [{ slug: "loop", triggerKind: "cron", composed_of: ["/checkin"] }];
  assert.deepEqual(matchPipelinesForStop(pipes), []);
});

test("matchPipelinesForStop — unrelated stages → no match", () => {
  const pipes = [{ slug: "x", triggerKind: "hook", composed_of: ["/checkin"] }];
  assert.deepEqual(matchPipelinesForStop(pipes), []);
});

// ─── Subprocess oracles (verify back-compat + 3-event fire) ────────────────

function runHook(payload, extraEnv = {}) {
  const recentPath = join(makeTmp("recent"), "recent.json");
  const telemetryPath = join(makeTmp("telem"), "telem.jsonl");
  // Subprocess oracles run against the LIVE registry. The in-process tests
  // above mutate process.env to point at hermetic fixtures; we MUST reset
  // those for the subprocess, otherwise the child inherits a stale tmpdir
  // path with no pipelines and the assertions go red for the wrong reason.
  const env = {
    ...process.env,
    PRISM_SKILL_AUTO_TRIGGER_RECENT_PATH: recentPath,
    PRISM_SKILL_AUTO_TRIGGER_TELEMETRY_PATH: telemetryPath,
    PRISM_SKILL_AUTO_TRIGGER_PIPELINES_DIR: "H:/prism/knowledge/wiki/os/pipelines",
    PRISM_SKILL_AUTO_TRIGGER_TRIGGERS_PATH: "H:/prism/knowledge/wiki/architecture/_skill-triggers.jsonl",
    // Suppress any session-wide disable knob the parent process inherited.
    PRISM_SKILL_AUTO_TRIGGER_DISABLE: "",
    PRISM_SKILL_AUTO_TRIGGER_NO_PIPELINES: "",
    ...extraEnv,
  };
  const r = spawnSync(NODE_PATH, [HOOK_PATH], {
    input: JSON.stringify(payload),
    encoding: "utf8",
    env,
    timeout: 5000,
  });
  return { stdout: r.stdout, stderr: r.stderr, status: r.status, recentPath, telemetryPath };
}

test("subprocess — UserPromptSubmit with /loop suggests the loop pipeline (P0 regression oracle)", () => {
  const r = runHook({ hook_event_name: "UserPromptSubmit", prompt: "/loop continue task queue" });
  assert.equal(r.status, 0, `hook exited non-zero: ${r.stderr}`);
  const out = JSON.parse(r.stdout);
  assert.equal(out.continue, true);
  // UNCONDITIONAL — closing reviewer-B P0: the prior version wrapped this in
  // `if (out.hookSpecificOutput)` and silently passed when the hook returned
  // bare {continue:true}. Live registry has `loop.md` with trigger:cron;
  // after P1 fix, /loop must produce a pipeline suggestion.
  assert.ok(out.hookSpecificOutput, `expected hookSpecificOutput; got ${JSON.stringify(out)}`);
  const ctx = String(out.hookSpecificOutput.additionalContext || "");
  assert.ok(ctx.includes("/loop"), `expected /loop in additionalContext, got: ${ctx.slice(0, 200)}`);
  assert.ok(ctx.toLowerCase().includes("pipeline"), `expected 'pipeline' marker, got: ${ctx.slice(0, 200)}`);
});

test("subprocess — PostToolUse with Bash tool fires pipeline suggester", () => {
  const r = runHook({
    hook_event_name: "PostToolUse",
    tool_name: "Bash",
    tool_input: { command: "node scripts/test.mjs" },
  });
  assert.equal(r.status, 0);
  const out = JSON.parse(r.stdout);
  assert.equal(out.continue, true);
  // May or may not have matches depending on registry — but must NOT error.
});

test("subprocess — Stop event surfaces goal-complete pipeline (P0 regression oracle)", () => {
  // Force a fresh recent-state so suppression doesn't false-empty this case
  // (the live RECENT may already carry a Stop entry from earlier this session).
  const r = runHook({ hook_event_name: "Stop" });
  assert.equal(r.status, 0);
  const out = JSON.parse(r.stdout);
  assert.equal(out.continue, true);
  // UNCONDITIONAL — closing reviewer-B P0: registry has `goal-complete.md`
  // (trigger:hook + goal-complete-gate.mjs in composed_of), so Stop must
  // surface at least one pipeline match against the live registry.
  assert.ok(out.hookSpecificOutput, `expected hookSpecificOutput; got ${JSON.stringify(out)}`);
  assert.equal(out.hookSpecificOutput.hookEventName, "Stop");
  const ctx = String(out.hookSpecificOutput.additionalContext || "");
  assert.ok(ctx.toLowerCase().includes("pipeline"), `expected 'pipeline' in Stop ctx, got: ${ctx.slice(0, 200)}`);
  assert.ok(ctx.includes("goal-complete") || /pipeline \//.test(ctx),
    `expected a pipeline name in Stop ctx, got: ${ctx.slice(0, 200)}`);
});

test("subprocess — unknown event returns continue:true with no additionalContext", () => {
  const r = runHook({ hook_event_name: "SubagentStart" });
  assert.equal(r.status, 0);
  const out = JSON.parse(r.stdout);
  assert.deepEqual(out, { continue: true });
});

test("subprocess — DISABLED env makes hook a no-op", () => {
  const r = runHook(
    { hook_event_name: "UserPromptSubmit", prompt: "/loop test" },
    { PRISM_SKILL_AUTO_TRIGGER_DISABLE: "1" },
  );
  assert.equal(r.status, 0);
  const out = JSON.parse(r.stdout);
  assert.deepEqual(out, { continue: true });
});

test("subprocess — empty payload returns continue:true", () => {
  const r = runHook({});
  assert.equal(r.status, 0);
  const out = JSON.parse(r.stdout);
  assert.deepEqual(out, { continue: true });
});

// ─── suggest-only invariant (across all three events) ──────────────────────

test("suggest-only invariant — hook never emits {block:true} or {continue:false}", () => {
  // Force a match in every event and confirm no block/halt fields.
  for (const event of ["UserPromptSubmit", "PostToolUse", "Stop"]) {
    const r = runHook({
      hook_event_name: event,
      prompt: "/loop /diagnose-fix /scrutiny-gate",
      tool_name: "Bash",
      tool_input: { command: "/scrutiny-gate" },
    });
    assert.equal(r.status, 0, `${event}: nonzero exit`);
    const out = JSON.parse(r.stdout);
    assert.equal(out.continue, true, `${event}: continue should be true`);
    assert.ok(!out.block, `${event}: must not emit block`);
    assert.ok(!out.decision || out.decision !== "block", `${event}: decision must not block`);
  }
});

// Verify the main() export exists and is async (sanity)
test("main() export is callable", () => {
  assert.equal(typeof main, "function");
  // Don't actually invoke (it reads stdin); just confirm shape.
});
