/**
 * skill-auto-trigger.test.mjs -- regression oracle for the lifecycle-skill
 * state-gate fix (slot:alpha 2026-06-11).
 *
 * BUG: session-lifecycle skills (precompact/compact/handoff/checkpoint) were in
 * INVOKE_NOW_SKILLS, so a prompt that merely *mentioned* "compaction"/"handoff"
 * as a TOPIC emitted a MANDATORY "INVOKE /precompact NOW" directive -- the
 * "chat pushes back to /compact at 18% context when it should keep working"
 * false-trigger the operator reported. Fix: lifecycle skills are STATE-gated
 * (owned by precompact-auto-trigger.mjs / the Stop event), never keyword-gated.
 *
 * Two layers: (1) white-box assertions on the exported sets; (2) a REAL
 * subprocess oracle that drives the actual hook with an injected triggers
 * fixture (hermetic fakes do not prove the wiring -- repo lesson).
 *
 * node:test (the .claude vitest config has a known transform bug).
 *   Run: node --test H:/prism/.claude/hooks/__tests__/skill-auto-trigger.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { LIFECYCLE_STATE_GATED_SKILLS, INVOKE_NOW_SKILLS } from "../skill-auto-trigger.mjs";

const HOOK = "H:/prism/.claude/hooks/skill-auto-trigger.mjs";

const T = (name, value, score, action) =>
  JSON.stringify({ name, type: "skill", manifest: "x", matcher: { type: "keyword", value }, score, action });

function runHook(prompt, triggersLines) {
  const dir = mkdtempSync(join(tmpdir(), "sat-"));
  const trigPath = join(dir, "triggers.jsonl");
  writeFileSync(trigPath, triggersLines.join("\n") + "\n");
  const env = {
    ...process.env,
    PRISM_SKILL_AUTO_TRIGGER_TRIGGERS_PATH: trigPath,
    PRISM_SKILL_AUTO_TRIGGER_RECENT_PATH: join(dir, "recent.json"),
    PRISM_SKILL_AUTO_TRIGGER_TELEMETRY_PATH: join(dir, "tele.jsonl"),
    PRISM_SKILL_AUTO_TRIGGER_NO_PIPELINES: "1",
    PRISM_SKILL_AUTO_TRIGGER_PIPELINES_DIR: join(dir, "nopipe"),
  };
  const payload = JSON.stringify({ hook_event_name: "UserPromptSubmit", prompt, cwd: "H:/prism" });
  const res = spawnSync(process.execPath, [HOOK], { input: payload, env, encoding: "utf8" });
  rmSync(dir, { recursive: true, force: true });
  let out = {};
  try { out = JSON.parse(res.stdout || "{}"); } catch { out = { _raw: res.stdout }; }
  return { out, ctx: out?.hookSpecificOutput?.additionalContext || "", stderr: res.stderr };
}

// ---- white-box: the two synchronized sets -----------------------------------

test("LIFECYCLE_STATE_GATED_SKILLS holds the 4 session-lifecycle skills", () => {
  for (const s of ["precompact", "compact", "handoff", "checkpoint"])
    assert.ok(LIFECYCLE_STATE_GATED_SKILLS.has(s), `missing ${s}`);
});

test("INVOKE_NOW_SKILLS excludes every lifecycle skill (the bug guard)", () => {
  for (const s of LIFECYCLE_STATE_GATED_SKILLS)
    assert.ok(!INVOKE_NOW_SKILLS.has(s), `${s} must NOT be invoke-now (state-gated)`);
});

// ---- subprocess oracle: real hook behavior ----------------------------------

test("THE BUG: topical compaction/precompact prompt does NOT mandate or surface /precompact", () => {
  const triggers = [T("precompact", "precompact|before compact|write handoff|compaction", 0.85, "invoke")];
  const { out, ctx } = runHook("exhaust all precompaction, compaction, session handoff gap fills", triggers);
  assert.ok(!ctx.includes("INVOKE NOW"), "must not emit a MANDATORY invoke directive");
  assert.ok(!/precompact/i.test(ctx), "precompact must not surface at all (state-gated)");
  assert.equal(out.continue, true, "bare continue when only a lifecycle trigger matched");
});

test("topical 'session handoff' prompt does NOT surface /handoff", () => {
  const triggers = [T("handoff", "handoff|session handoff|write handoff", 0.85, "invoke")];
  const { ctx } = runHook("improve the session handoff system across all slots", triggers);
  assert.ok(!ctx.includes("INVOKE NOW"), "no mandate");
  assert.ok(!ctx.includes("/handoff"), "handoff is state-gated, must not surface");
});

test("POSITIVE CONTROL: non-lifecycle INVOKE_NOW skill (dedup) STILL mandates", () => {
  const triggers = [T("dedup", "dedup|before creating", 0.9, "invoke")];
  const { ctx } = runHook("run dedup before creating a new engine", triggers);
  assert.match(ctx, /SKILL AUTO-INVOKE/, "dedup must still emit the mandatory directive");
  assert.match(ctx, /dedup/);
});

test("POSITIVE CONTROL: non-lifecycle suggest skill still surfaces as advisory", () => {
  const triggers = [T("mill-optimize", "mill optimize", 0.8, "suggest")];
  const { ctx } = runHook("help me mill optimize the feeds and speeds", triggers);
  assert.match(ctx, /mill-optimize/, "suggest path intact for non-lifecycle skills");
  assert.ok(!ctx.includes("INVOKE NOW"), "advisory, not mandatory");
});

test("mixed: lifecycle skipped while a co-matching build skill still mandates", () => {
  const triggers = [
    T("precompact", "precompact|compaction", 0.85, "invoke"),
    T("dedup", "dedup", 0.9, "invoke"),
  ];
  const { ctx } = runHook("dedup check before the compaction refactor", triggers);
  assert.match(ctx, /dedup/, "dedup still mandates");
  assert.ok(!/precompact/i.test(ctx), "precompact still skipped even alongside a live invoke skill");
});
