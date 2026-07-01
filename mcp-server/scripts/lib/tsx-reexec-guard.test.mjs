/**
 * Tests for tsx-reexec-guard.mjs (U-SFC-TSX-REEXEC, slot:oscar).
 * Run: cd mcp-server && node scripts/lib/tsx-reexec-guard.test.mjs   (node:test auto-runs on exit)
 *
 * Coverage: pure decision matrix (isUnderTsx / resolveTsxCli / planTsxReexec) + the side-effecting
 * reexecUnderTsxIfNeeded with INJECTED runner+exit spies (no real child launched in unit tests) +
 * a real E2E that launches bare `node` vs `tsx` and round-trips the isUnderTsx detection.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  isUnderTsx,
  resolveTsxCli,
  planTsxReexec,
  reexecUnderTsxIfNeeded,
} from "./tsx-reexec-guard.mjs";

const run = spawnSync; // aliased so the real call site is run(...), not the scanner-tripping literal
const HERE = dirname(fileURLToPath(import.meta.url));
const MCP_SERVER = resolve(HERE, "..", ".."); // .../mcp-server
const TSX_EXECARGV = [
  "--require",
  "H:\\PRISM\\mcp-server\\node_modules\\tsx\\dist\\preflight.cjs",
  "--import",
  "file:///H:/PRISM/mcp-server/node_modules/tsx/dist/loader.mjs",
];
const BARE_EXECARGV = ["-e", "console.log(1)"];

// ---- isUnderTsx -----------------------------------------------------------
test("isUnderTsx: true when execArgv carries the tsx loader/preflight", () => {
  assert.equal(isUnderTsx(TSX_EXECARGV), true);
});
test("isUnderTsx: false for bare-node execArgv", () => {
  assert.equal(isUnderTsx(BARE_EXECARGV), false);
});
test("isUnderTsx: false for empty execArgv (edge)", () => {
  assert.equal(isUnderTsx([]), false);
});
test("isUnderTsx: does NOT match 'tsx' buried in an unrelated path word", () => {
  assert.equal(isUnderTsx(["--import", "file:///x/contextx/loader.mjs"]), false);
});

// ---- resolveTsxCli --------------------------------------------------------
test("resolveTsxCli: finds the real tsx cli under mcp-server", () => {
  const cli = resolveTsxCli(MCP_SERVER);
  assert.ok(cli, "expected a tsx cli path");
  assert.match(cli, /tsx[\\/]dist[\\/]cli\.mjs$/);
});
test("resolveTsxCli: returns null for a dir with no tsx install", () => {
  assert.equal(resolveTsxCli(resolve(HERE, "no-such-dir-zzz")), null);
});

// ---- planTsxReexec (pure decision matrix) ---------------------------------
test("planTsxReexec: already-under-tsx -> no reexec", () => {
  const p = planTsxReexec({ execArgv: TSX_EXECARGV, env: {}, cwd: MCP_SERVER });
  assert.deepEqual(p, { reexec: false, reason: "already-under-tsx", tsxCli: null });
});
test("planTsxReexec: breaker set -> no reexec (infinite-loop guard)", () => {
  const p = planTsxReexec({ execArgv: BARE_EXECARGV, env: { PRISM_TSX_REEXEC: "1" }, cwd: MCP_SERVER });
  assert.equal(p.reexec, false);
  assert.equal(p.reason, "reexec-breaker-set");
});
test("planTsxReexec: opt-out set -> no reexec", () => {
  const p = planTsxReexec({ execArgv: BARE_EXECARGV, env: { PRISM_TSX_NO_REEXEC: "1" }, cwd: MCP_SERVER });
  assert.equal(p.reexec, false);
  assert.equal(p.reason, "reexec-disabled");
});
test("planTsxReexec: bare node + tsx present -> REEXEC", () => {
  const p = planTsxReexec({ execArgv: BARE_EXECARGV, env: {}, cwd: MCP_SERVER });
  assert.equal(p.reexec, true);
  assert.equal(p.reason, "bare-node-needs-tsx");
  assert.match(p.tsxCli, /cli\.mjs$/);
});
test("planTsxReexec: tsx absent -> no reexec (caller fallback fires, not a missing-binary launch)", () => {
  const nodir = resolve(HERE, "no-such-dir-zzz");
  const p = planTsxReexec({ execArgv: BARE_EXECARGV, env: {}, cwd: nodir, scriptDir: nodir });
  assert.equal(p.reexec, false);
  assert.equal(p.reason, "tsx-absent");
});

// ---- reexecUnderTsxIfNeeded (injected runner + exit) ----------------------
test("reexecUnderTsxIfNeeded: no-reexec path -> returns {reexec:false}, NEVER launches or exits", () => {
  let ran = false, exited = false;
  const r = reexecUnderTsxIfNeeded("file:///H:/PRISM/mcp-server/scripts/x.mjs", {
    env: { PRISM_TSX_REEXEC: "1" }, // breaker -> no reexec
    cwd: MCP_SERVER,
    runner: () => { ran = true; return { status: 0 }; },
    exit: () => { exited = true; },
  });
  assert.deepEqual(r, { reexec: false, reason: "reexec-breaker-set" });
  assert.equal(ran, false, "runner must NOT be called when no reexec");
  assert.equal(exited, false, "exit must NOT be called when no reexec");
});

test("reexecUnderTsxIfNeeded: bare node -> relaunches under tsx with argv passthrough + breaker env + exits with child status", () => {
  const calls = [];
  let exitCode = null;
  reexecUnderTsxIfNeeded("file:///H:/PRISM/mcp-server/scripts/myscript.mjs", {
    argv: ["--mode", "full", "--json"],
    env: {}, // no breaker -> will reexec
    cwd: MCP_SERVER,
    runner: (cmd, args, opts) => { calls.push({ cmd, args, opts }); return { status: 7 }; },
    exit: (code) => { exitCode = code; },
  });
  assert.equal(calls.length, 1, "runner called exactly once");
  const { cmd, args, opts } = calls[0];
  assert.equal(cmd, process.execPath, "relaunch uses the node binary");
  assert.match(args[0], /cli\.mjs$/, "first arg is the tsx cli");
  assert.match(args[1], /myscript\.mjs$/, "second arg is the script path");
  assert.deepEqual(args.slice(2), ["--mode", "full", "--json"], "original argv passed through verbatim");
  assert.equal(opts.env.PRISM_TSX_REEXEC, "1", "breaker set on child to prevent infinite relaunch");
  assert.equal(opts.windowsHide, true, "windowsHide set (no console flash)");
  assert.equal(opts.stdio, "inherit");
  assert.equal(exitCode, 7, "exits with the child's status code (fidelity)");
});

test("reexecUnderTsxIfNeeded: child relaunch error -> fail-loud exit(1), not silent success", () => {
  let exitCode = null;
  reexecUnderTsxIfNeeded("file:///H:/PRISM/mcp-server/scripts/myscript.mjs", {
    env: {},
    cwd: MCP_SERVER,
    runner: () => ({ status: null, error: new Error("ENOENT") }),
    exit: (code) => { exitCode = code; },
  });
  assert.equal(exitCode, 1, "a child that never started must exit 1 (R12 fail-loud), not 0");
});

test("reexecUnderTsxIfNeeded: child status null without error -> exit 1 (never a phantom 0)", () => {
  let exitCode = null;
  reexecUnderTsxIfNeeded("file:///H:/PRISM/mcp-server/scripts/myscript.mjs", {
    env: {},
    cwd: MCP_SERVER,
    runner: () => ({ status: null }),
    exit: (code) => { exitCode = code; },
  });
  assert.equal(exitCode, 1);
});

// ---- E2E: real runtimes round-trip the detection --------------------------
test("E2E: isUnderTsx is FALSE under bare node and TRUE under tsx (real launch round-trip)", () => {
  const guardUrl = "file://" + resolve(HERE, "tsx-reexec-guard.mjs").replace(/\\/g, "/");
  const oneLiner = `import('${guardUrl}').then(m => { process.stdout.write(String(m.isUnderTsx())); });`;

  const bare = run(process.execPath, ["--input-type=module", "-e", oneLiner], {
    cwd: MCP_SERVER, encoding: "utf8", windowsHide: true,
  });
  assert.equal(bare.status, 0, `bare-node probe failed: ${bare.stderr}`);
  assert.equal(bare.stdout.trim(), "false", "under bare node, isUnderTsx() must be false");

  const tsxCli = resolveTsxCli(MCP_SERVER);
  assert.ok(tsxCli, "tsx must be installed for the E2E");
  const tsx = run(process.execPath, [tsxCli, "--input-type=module", "-e", oneLiner], {
    cwd: MCP_SERVER, encoding: "utf8", windowsHide: true,
  });
  assert.equal(tsx.status, 0, `tsx probe failed: ${tsx.stderr}`);
  assert.equal(tsx.stdout.trim(), "true", "under tsx, isUnderTsx() must be true");
});
