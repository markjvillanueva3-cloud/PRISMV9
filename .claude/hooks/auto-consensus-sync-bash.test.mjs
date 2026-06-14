import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { classifyDestructiveBash, renderVerdict } from "./auto-consensus-sync-bash.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.join(__dirname, "auto-consensus-sync-bash.mjs");

// Write a stub engine .mjs to a fresh temp dir. The stub exports a
// multiModelConsensusEngine whose .ask() returns/throws/delays per the
// requested mode — lets us hermetically test each sync-consensus branch
// (accept→allow, escalate→ask, timeout→ask, throw→ask) without needing
// the real MCP dist or any LLM voice. Closes Arm B P0+P1.
function makeStubEnginePath(mode, payload) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-octopus-stub-"));
  const file = path.join(dir, "stub-engine.mjs");
  let askBody;
  switch (mode) {
    case "accept":
      askBody = `return { recommendation: "accept", agreementScore: 0.95, consensus: { voters: ["anthropic","ollama","google"] } };`;
      break;
    case "escalate":
      askBody = `return { recommendation: "escalate", agreementScore: 0.4, consensus: { voters: ["anthropic"] } };`;
      break;
    case "throw":
      askBody = `throw new Error("stub-engine: simulated ask() throw");`;
      break;
    case "hang":
      // Never resolves — forces the Promise.race timer to win.
      askBody = `return new Promise(() => {});`;
      break;
    default:
      askBody = `return ${JSON.stringify(payload ?? null)};`;
  }
  fs.writeFileSync(file, `
export const multiModelConsensusEngine = {
  async ask(_opts) {
    ${askBody}
  }
};
`, "utf-8");
  return file;
}

// ── classifyDestructiveBash — pure, per-trigger-class coverage ─────────────

test("classify: null/empty/non-string input → null", () => {
  assert.equal(classifyDestructiveBash(null), null);
  assert.equal(classifyDestructiveBash(undefined), null);
  assert.equal(classifyDestructiveBash(""), null);
  assert.equal(classifyDestructiveBash(123), null);
});

test("classify: a non-destructive bash command → null (the 99% case)", () => {
  assert.equal(classifyDestructiveBash("git status"), null);
  assert.equal(classifyDestructiveBash("ls -la"), null);
  assert.equal(classifyDestructiveBash("npm run build"), null);
  assert.equal(classifyDestructiveBash("git push origin main"), null);
  assert.equal(classifyDestructiveBash("git reset HEAD~1"), null);
  assert.equal(classifyDestructiveBash("git branch -d feature"), null); // -d (soft) not -D
  assert.equal(classifyDestructiveBash("rm -f .git/index.lock"), null); // -f alone, not -rf
  assert.equal(classifyDestructiveBash("git clean -n"), null); // dry-run
});

test("classify: TRIGGER CLASS 1 — git-force-push (3 variants)", () => {
  assert.equal(classifyDestructiveBash("git push -f origin main"), "git-force-push");
  assert.equal(classifyDestructiveBash("git push --force"), "git-force-push");
  assert.equal(classifyDestructiveBash("git push --force-with-lease origin feature"), "git-force-push");
});

test("classify: TRIGGER CLASS 2 — git-hard-reset", () => {
  assert.equal(classifyDestructiveBash("git reset --hard HEAD~3"), "git-hard-reset");
  assert.equal(classifyDestructiveBash("git reset --hard origin/main"), "git-hard-reset");
});

test("classify: TRIGGER CLASS 3 — git-branch-force-delete", () => {
  assert.equal(classifyDestructiveBash("git branch -D feature-old"), "git-branch-force-delete");
  assert.equal(classifyDestructiveBash("git branch --delete-force foo"), "git-branch-force-delete");
});

test("classify: TRIGGER CLASS 4 — rm-recursive-force (3 variants)", () => {
  assert.equal(classifyDestructiveBash("rm -rf node_modules"), "rm-recursive-force");
  assert.equal(classifyDestructiveBash("rm -fr build"), "rm-recursive-force");
  assert.equal(classifyDestructiveBash("rm --recursive --force build"), "rm-recursive-force");
});

test("classify: TRIGGER CLASS 5 — git-clean-force (force without dry-run)", () => {
  assert.equal(classifyDestructiveBash("git clean -f"), "git-clean-force");
  assert.equal(classifyDestructiveBash("git clean -fd"), "git-clean-force");
  assert.equal(classifyDestructiveBash("git clean -fdx"), "git-clean-force");
  // Dry-run -n should suppress the class match even with -f:
  assert.equal(classifyDestructiveBash("git clean -nf"), null);
  assert.equal(classifyDestructiveBash("git clean -f --dry-run"), null);
});

test("classify: walks past env-var prefixes", () => {
  assert.equal(classifyDestructiveBash("FOO=bar BAZ=qux git push --force"), "git-force-push");
  assert.equal(classifyDestructiveBash("NODE_OPTIONS=--max-old-space-size=8192 rm -rf dist"), "rm-recursive-force");
});

test("classify: walks past the rtk wrapper", () => {
  assert.equal(classifyDestructiveBash("rtk git push --force origin main"), "git-force-push");
  assert.equal(classifyDestructiveBash("rtk rm -rf build"), "rm-recursive-force");
});

test("classify: multi-command chain — classifies on the FIRST sub-command", () => {
  // Conservative under-trigger: a chain starting with safe → destructive
  // would NOT classify the chain. Documented behavior (no false positives).
  assert.equal(classifyDestructiveBash("git status && git push --force"), null);
  // But if the chain STARTS destructive, we DO classify:
  assert.equal(classifyDestructiveBash("git push --force && git status"), "git-force-push");
  assert.equal(classifyDestructiveBash("rm -rf node_modules; npm install"), "rm-recursive-force");
});

// ── renderVerdict — pure, defensive coverage ───────────────────────────────

test("render: null/non-object verdict → fallback ASK reason", () => {
  const r1 = renderVerdict("rm-recursive-force", null);
  assert.match(r1, /rm-recursive-force/);
  assert.match(r1, /no verdict/);
  const r2 = renderVerdict("rm-recursive-force", "not-an-object");
  assert.match(r2, /no verdict/);
});

test("render: accept verdict gets the ✅ icon", () => {
  const r = renderVerdict("git-force-push", {
    recommendation: "accept",
    agreementScore: 0.9,
    consensus: { voters: ["anthropic", "ollama", "google"] },
  });
  assert.match(r, /✅/);
  assert.match(r, /git-force-push/);
  assert.match(r, /rec=accept/);
  assert.match(r, /agreement=0.9/);
  assert.match(r, /anthropic,ollama,google/);
});

test("render: escalate verdict gets the 🛑 icon", () => {
  const r = renderVerdict("rm-recursive-force", { recommendation: "escalate" });
  assert.match(r, /🛑/);
  assert.match(r, /rec=escalate/);
});

test("render: review (and unknown rec) gets the ⚠️ icon", () => {
  const rReview = renderVerdict("git-clean-force", { recommendation: "review" });
  assert.match(rReview, /⚠️/);
  const rUnknown = renderVerdict("git-clean-force", { recommendation: "weird-string" });
  assert.match(rUnknown, /⚠️/);
});

test("render: tolerates missing agreementScore + voters", () => {
  const r = renderVerdict("git-hard-reset", { recommendation: "escalate" });
  assert.match(r, /agreement=n\/a/);
  assert.match(r, /voters=\[n\/a\]/);
});

// ── hook E2E — real subprocess ─────────────────────────────────────────────

function runHook(stdinObj, env) {
  return spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify(stdinObj), encoding: "utf8",
    env: { ...process.env, ...env },
  });
}

test("hook E2E: PRISM_AUTO_CONSENSUS_SYNC_DISABLE=1 + NON-matching command → allow silently", () => {
  // Non-match path: disable knob is irrelevant, allow is the right outcome.
  const r = runHook(
    { tool_name: "Bash", tool_input: { command: "git status" } },
    { PRISM_AUTO_CONSENSUS_SYNC_DISABLE: "1" },
  );
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.hookSpecificOutput.permissionDecision, "allow");
});

test("hook E2E: SAFETY INVARIANT — disable knob + MATCHED destructive command STILL asks (closes Arm A P0)", () => {
  // Pre-fix this was a silent allow — a P0 safety breach. After the
  // classify-first reorder, disable knob only suppresses the LLM call;
  // ASK still fires on every match.
  const r = runHook(
    { tool_name: "Bash", tool_input: { command: "rm -rf node_modules" } },
    { PRISM_AUTO_CONSENSUS_SYNC_DISABLE: "1" },
  );
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.hookSpecificOutput.permissionDecision, "ask",
    "matched destructive bash MUST ask even with disable knob set");
  assert.match(out.hookSpecificOutput.permissionDecisionReason, /rm-recursive-force/);
  assert.match(out.hookSpecificOutput.permissionDecisionReason, /PRISM_AUTO_CONSENSUS_SYNC_DISABLE=1/);
});

test("hook E2E: missing command → allow silently", () => {
  const r = runHook({ tool_name: "Bash", tool_input: {} }, {});
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.hookSpecificOutput.permissionDecision, "allow");
});

test("hook E2E: non-Bash tool → allow silently", () => {
  const r = runHook({ tool_name: "Write", tool_input: { file_path: "x", content: "rm -rf /" } }, {});
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.hookSpecificOutput.permissionDecision, "allow");
});

test("hook E2E: non-destructive bash → allow silently", () => {
  const r = runHook({ tool_name: "Bash", tool_input: { command: "git status" } }, {});
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.hookSpecificOutput.permissionDecision, "allow");
  assert.equal(out.hookSpecificOutput.permissionDecisionReason, "");
});

test("hook E2E: DEFAULT — destructive bash without opt-in env → ASK with class reason", () => {
  // No env set → no LLM call (safe + fast path).
  const r = runHook({ tool_name: "Bash", tool_input: { command: "rm -rf node_modules" } }, {});
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.hookSpecificOutput.permissionDecision, "ask");
  assert.match(out.hookSpecificOutput.permissionDecisionReason, /rm-recursive-force/);
  assert.match(out.hookSpecificOutput.permissionDecisionReason, /PRISM_AUTO_CONSENSUS_SYNC_BASH=1/);
});

test("hook E2E: OPT-IN + ENGINE UNREACHABLE → MUST ask (deterministic via PRISM_AUTO_CONSENSUS_SYNC_ENGINE_PATH; closes Arm B P0)", () => {
  // Force the engine loader to fail by pointing at a guaranteed-nonexistent
  // path. This deterministically exercises the engine-missing fallback
  // branch — replaces the earlier tautological ask|allow assertion.
  const r = runHook(
    { tool_name: "Bash", tool_input: { command: "git push --force origin main" } },
    {
      PRISM_AUTO_CONSENSUS_SYNC_BASH: "1",
      PRISM_AUTO_CONSENSUS_SYNC_ENGINE_PATH: "/__nonexistent__/engine.mjs",
      PRISM_AUTO_CONSENSUS_SYNC_TIMEOUT_MS: "2000",
    },
  );
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  // HARD assertion (not ask||allow): engine-missing MUST end in ask.
  assert.equal(out.hookSpecificOutput.permissionDecision, "ask",
    "engine-unreachable MUST end in ask on a destructive class");
  assert.match(out.hookSpecificOutput.permissionDecisionReason, /git-force-push/);
  assert.match(out.hookSpecificOutput.permissionDecisionReason, /engine not loadable/);
});

test("hook E2E: OPT-IN + STUB ENGINE returns ACCEPT → allow with rendered verdict (closes Arm B P1)", () => {
  // The ONLY legitimate match→allow path: rec === "accept" from a live
  // engine. Locks the safety invariant from the positive side.
  const enginePath = makeStubEnginePath("accept");
  const r = runHook(
    { tool_name: "Bash", tool_input: { command: "git push --force origin main" } },
    {
      PRISM_AUTO_CONSENSUS_SYNC_BASH: "1",
      PRISM_AUTO_CONSENSUS_SYNC_ENGINE_PATH: enginePath,
      PRISM_AUTO_CONSENSUS_SYNC_TIMEOUT_MS: "5000",
    },
  );
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.hookSpecificOutput.permissionDecision, "allow",
    "rec === 'accept' MUST translate to permissionDecision='allow'");
  assert.match(out.hookSpecificOutput.permissionDecisionReason, /✅/);
  assert.match(out.hookSpecificOutput.permissionDecisionReason, /git-force-push/);
  assert.match(out.hookSpecificOutput.permissionDecisionReason, /rec=accept/);
});

test("hook E2E: OPT-IN + STUB ENGINE returns ESCALATE → ask with rendered verdict (closes Arm B P1)", () => {
  const enginePath = makeStubEnginePath("escalate");
  const r = runHook(
    { tool_name: "Bash", tool_input: { command: "rm -rf node_modules" } },
    {
      PRISM_AUTO_CONSENSUS_SYNC_BASH: "1",
      PRISM_AUTO_CONSENSUS_SYNC_ENGINE_PATH: enginePath,
      PRISM_AUTO_CONSENSUS_SYNC_TIMEOUT_MS: "5000",
    },
  );
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.hookSpecificOutput.permissionDecision, "ask");
  assert.match(out.hookSpecificOutput.permissionDecisionReason, /🛑/);
  assert.match(out.hookSpecificOutput.permissionDecisionReason, /rec=escalate/);
});

test("hook E2E: OPT-IN + STUB ENGINE throws → ask with throw fallback (closes Arm B P1)", () => {
  const enginePath = makeStubEnginePath("throw");
  const r = runHook(
    { tool_name: "Bash", tool_input: { command: "rm -rf build" } },
    {
      PRISM_AUTO_CONSENSUS_SYNC_BASH: "1",
      PRISM_AUTO_CONSENSUS_SYNC_ENGINE_PATH: enginePath,
      PRISM_AUTO_CONSENSUS_SYNC_TIMEOUT_MS: "5000",
    },
  );
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.hookSpecificOutput.permissionDecision, "ask",
    "engine throw MUST end in ask");
  assert.match(out.hookSpecificOutput.permissionDecisionReason, /threw/);
});

test("hook E2E: OPT-IN + STUB ENGINE hangs → ask after timeout (closes Arm B P1)", () => {
  // Stub returns a never-resolving promise — Promise.race wins via the
  // timer; the hook must fall through to the timeout fallback ASK.
  const enginePath = makeStubEnginePath("hang");
  const r = runHook(
    { tool_name: "Bash", tool_input: { command: "git reset --hard HEAD~1" } },
    {
      PRISM_AUTO_CONSENSUS_SYNC_BASH: "1",
      PRISM_AUTO_CONSENSUS_SYNC_ENGINE_PATH: enginePath,
      PRISM_AUTO_CONSENSUS_SYNC_TIMEOUT_MS: "2000", // MIN_TIMEOUT_MS
    },
  );
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.hookSpecificOutput.permissionDecision, "ask",
    "consensus timeout MUST end in ask");
  assert.match(out.hookSpecificOutput.permissionDecisionReason, /timed out/);
  assert.match(out.hookSpecificOutput.permissionDecisionReason, /git-hard-reset/);
});
