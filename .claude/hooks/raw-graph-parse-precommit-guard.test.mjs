// raw-graph-parse-precommit-guard.test.mjs
//
// Verifies the PreToolUse(Bash) commit gate's pure decision logic:
//   - isGitCommit triggers on real `git commit` subcommands ONLY (not the
//     substring "commit" in `git show <commit>` / `git log`).
//   - decideFromViolations blocks IFF the scanner found >=1 violation, and the
//     reason names the cap-safe reader (so the operator knows the fix).
// Intent (R9): a non-commit must never trigger the scan; a real violation must
// always block; a clean repo must always allow.

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { isGitCommit, decideFromViolations, resolveRepoRoot } from "./raw-graph-parse-precommit-guard.mjs";

const HOOK = fileURLToPath(new URL("./raw-graph-parse-precommit-guard.mjs", import.meta.url));
const REPO_ROOT = join(dirname(HOOK), "..", "..");        // .claude/hooks -> repo root
const SCRIPTS_LIB = join(REPO_ROOT, "scripts", "lib");

/** Spawn the hook process with a stdin payload; return {status, stdout}. */
function runHook(payload, env = {}) {
  const r = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify(payload),
    encoding: "utf8",
    env: { ...process.env, ...env },
    windowsHide: true,
  });
  return { status: r.status, stdout: (r.stdout || "").trim() };
}

// -- isGitCommit: triggers on real commits -------------------------------

test("isGitCommit: plain `git commit`", () => {
  assert.equal(isGitCommit('git commit -m "x"'), true);
});

test("isGitCommit: rtk-prefixed `rtk git commit`", () => {
  assert.equal(isGitCommit("rtk git commit -F /tmp/msg"), true);
});

test("isGitCommit: `cd ... && git commit` chain", () => {
  assert.equal(isGitCommit("cd H:/prism && git add . && git commit -m y"), true);
});

// -- isGitCommit: does NOT trigger on look-alikes (substring "commit") ----

test("isGitCommit: `git show <commit>` does NOT trigger", () => {
  assert.equal(isGitCommit("git show 1ffd8c2299"), false);
});

test("isGitCommit: `git log` does NOT trigger", () => {
  assert.equal(isGitCommit("git log --oneline -5"), false);
});

test("isGitCommit: a command merely containing the word commit does NOT trigger", () => {
  assert.equal(isGitCommit("echo 'remember to commit later'"), false);
});

test("isGitCommit: empty / null / non-string -> false", () => {
  for (const bad of ["", null, undefined, 42, {}]) {
    assert.equal(isGitCommit(bad), false);
  }
});

// -- decideFromViolations: blocks IFF violations exist --------------------

test("decideFromViolations: empty list -> allow (null)", () => {
  assert.equal(decideFromViolations([]), null);
});

test("decideFromViolations: non-array -> allow (null)", () => {
  assert.equal(decideFromViolations(null), null);
  assert.equal(decideFromViolations(undefined), null);
});

test("decideFromViolations: one violation -> block, reason names the cap-safe reader", () => {
  const d = decideFromViolations([
    'scripts/bad.mjs: raw JSON.parse(readFileSync(SG, "utf8")) on the MERGED system-graph.json',
  ]);
  assert.ok(d);
  assert.equal(d.decision, "block");
  assert.match(d.reason, /readGraphStreaming/);
  assert.match(d.reason, /system-graph\.json/);
  assert.match(d.reason, /scripts\/bad\.mjs/);
});

test("decideFromViolations: caps the listed violations and reports the overflow count", () => {
  const many = Array.from({ length: 15 }, (_, i) => `scripts/f${i}.mjs: raw parse`);
  const d = decideFromViolations(many);
  assert.ok(d);
  // 12 listed + an overflow marker for the remaining 3.
  assert.match(d.reason, /\.\.\.\(\+3 more\)/);
  assert.ok(!d.reason.includes("scripts/f12.mjs")); // 13th is past the cap
});

// -- integration shape: the two pures compose into the gate's behavior ----

test("gate behavior: non-commit short-circuits before any scan/decision", () => {
  // The hook's main() returns early when !isGitCommit(cmd); decideFromViolations
  // is never consulted. Encode that contract: a non-commit never blocks.
  const cmd = "git log --oneline";
  const wouldScan = isGitCommit(cmd);
  assert.equal(wouldScan, false);
});

test("gate behavior: a commit with a clean repo (no violations) allows", () => {
  const cmd = 'git commit -m "feat"';
  assert.equal(isGitCommit(cmd), true);
  assert.equal(decideFromViolations([]), null); // clean scan -> allow
});

// -- resolveRepoRoot: slot-worktree root resolution (DI'd gitToplevel) ----

test("resolveRepoRoot: gitToplevel result wins (slot-worktree commit scans its own tree)", () => {
  const r = resolveRepoRoot('git commit -m x', "H:/prism-slot-sierra", () => "H:/prism-slot-sierra");
  assert.equal(r, "H:/prism-slot-sierra");
});

test("resolveRepoRoot: a leading `cd` sets the cwd handed to gitToplevel", () => {
  let seen = null;
  resolveRepoRoot("cd /h/prism-slot-bravo && git commit -m y", "H:/prism", (cwd) => { seen = cwd; return null; });
  assert.match(String(seen), /prism-slot-bravo/);
});

test("resolveRepoRoot: normalizes backslashes + trailing slash", () => {
  const r = resolveRepoRoot('git commit -m x', "x", () => "H:\\prism-slot-echo\\");
  assert.equal(r, "H:/prism-slot-echo");
});

test("resolveRepoRoot: gitToplevel null -> DEFAULT_REPO_ROOT (fail-safe to shared tree)", () => {
  assert.equal(resolveRepoRoot('git commit -m x', "H:/prism", () => null), "H:/prism");
});

test("resolveRepoRoot: gitToplevel throw -> DEFAULT_REPO_ROOT (fail-safe)", () => {
  assert.equal(resolveRepoRoot('git commit -m x', "H:/prism", () => { throw new Error("nope"); }), "H:/prism");
});

// -- process-level E2E: spawn the real hook, drive main() via stdin -------
// Covers the main() wiring the pure tests cannot reach (stdin parse -> tool
// branch -> scan -> stdout emission / exit), per arm-B per-file scrutiny P2.

test("E2E: non-Bash tool -> exit 0, no output (skip)", () => {
  const r = runHook({ tool_name: "Read", tool_input: { file_path: "x" } });
  assert.equal(r.status, 0);
  assert.equal(r.stdout, "");
});

test("E2E: non-commit Bash -> exit 0, no output (fast-path short-circuit)", () => {
  const r = runHook({ tool_name: "Bash", tool_input: { command: "git log --oneline -3" } });
  assert.equal(r.status, 0);
  assert.equal(r.stdout, "");
});

test("E2E: kill switch + commit -> exit 0, no output (never scans)", () => {
  const r = runHook(
    { tool_name: "Bash", tool_input: { command: 'git commit -m x' } },
    { PRISM_RAW_GRAPH_GUARD_DISABLE: "1" },
  );
  assert.equal(r.status, 0);
  assert.equal(r.stdout, "");
});

test("E2E: commit on a clean repo -> exit 0, no output (allow)", () => {
  const r = runHook({ tool_name: "Bash", tool_input: { command: 'git commit -m x' } });
  assert.equal(r.status, 0);
  assert.equal(r.stdout, ""); // FLEET LOCK is green -> no violation -> allow
});

test("E2E: commit WITH a real violation present -> emits block JSON to stdout", () => {
  // Inject a synthetic raw-parse into scripts/lib so the live scan finds it.
  // finally{} guarantees cleanup so we never leave a file that trips the
  // FLEET LOCK test or blocks real commits.
  const probe = join(SCRIPTS_LIB, "zz_e2e_probe_precommit_guard.mjs");
  try {
    writeFileSync(
      probe,
      'const SG = "/x/system-graph.json";\nconst j = JSON.parse(readFileSync(SG, "utf8"));\n',
    );
    const r = runHook({ tool_name: "Bash", tool_input: { command: 'git commit -m x' } });
    assert.equal(r.status, 0);
    const out = JSON.parse(r.stdout);
    assert.equal(out.decision, "block");
    assert.match(out.reason, /readGraphStreaming/);
    assert.match(out.reason, /zz_e2e_probe_precommit_guard\.mjs/);
  } finally {
    rmSync(probe, { force: true });
  }
});
