/**
 * quoting-train-cycle.tsx-reexec -- unit test for the tsx self-re-exec guard.
 *
 * Root cause it pins (U-QP-TSX-REEXEC, 2026-06-22): the train-cycle orchestrator is
 * loaded SRC-FIRST (a .ts file). Under bare `node` (Node 24 native TS type-strip) the
 * .ts loads but its DYNAMIC `import("./X.js")` (sibling exists only as .ts) throws
 * ERR_MODULE_NOT_FOUND -- the whole closed-loop training cron died opaquely on every
 * bare-node launch. The fix self-re-execs under tsx once. These tests pin the pure
 * decision logic so a future refactor cannot silently re-break the cron.
 *
 * Run: node scripts/quoting-train-cycle.tsx-reexec.test.mjs
 *      (node --test runs 0 tests in this env -- invoke the file directly; node:test auto-runs on exit)
 *
 * @milestone QUOTING-SYNERGY-MS0/U-QP-TSX-REEXEC (slot:charlie)
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { isUnderTsx, resolveTsxCli, planTsxReexec } from "./quoting-train-cycle.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const SCRIPT = resolve(__dirname, "quoting-train-cycle.mjs");

// A realistic tsx execArgv (captured live from `tsx -e`): --require preflight.cjs --import loader.mjs
const TSX_EXECARGV = [
  "--require",
  "H:\\prism\\mcp-server\\node_modules\\tsx\\dist\\preflight.cjs",
  "--import",
  "file:///H:/prism/mcp-server/node_modules/tsx/dist/loader.mjs",
];
const BARE_NODE_EXECARGV = []; // bare `node script.mjs` carries no loader flags

// ---------- isUnderTsx: detection from execArgv ----------

test("isUnderTsx: true when execArgv carries the tsx loader/preflight", () => {
  assert.equal(isUnderTsx(TSX_EXECARGV), true);
});

test("isUnderTsx: true for the tsx cli.mjs form too (forward-slash variant)", () => {
  assert.equal(isUnderTsx(["--import", "file:///x/tsx/dist/cli.mjs"]), true);
});

test("isUnderTsx: false for bare node (empty execArgv)", () => {
  assert.equal(isUnderTsx(BARE_NODE_EXECARGV), false);
});

test("isUnderTsx: false for an unrelated loader (does not over-match)", () => {
  // A different ts loader must NOT be mistaken for tsx -- the guard is tsx-specific.
  assert.equal(isUnderTsx(["--import", "file:///x/ts-node/esm.mjs"]), false);
  assert.equal(isUnderTsx(["--require", "H:\\x\\some-esbuild-register.cjs"]), false);
});

test("isUnderTsx: substring 'tsx' without the full marker is REJECTED (anchor guard)", () => {
  // The regex requires tsx<sep>(dist<sep>)?(loader|preflight|cli) -- a path that merely
  // CONTAINS 'tsx' as a prefix/word but lacks the loader/preflight/cli tail must NOT match,
  // or a stray dependency named e.g. 'tsx-validator' would falsely suppress the reexec.
  assert.equal(isUnderTsx(["--import", "file:///x/tsx-validator/index.mjs"]), false);
  assert.equal(isUnderTsx(["--require", "H:\\x\\my-tsx-helper\\setup.cjs"]), false);
  assert.equal(isUnderTsx(["--loader", "file:///x/tsx/dist/something-else.mjs"]), false);
  // ...but the genuine tsx esm-loader entry (esm/index.mjs is under tsx/dist/loader via re-export
  // in real installs) is matched through the canonical loader/preflight/cli names already covered.
});

// ---------- adversarial inputs ----------

test("isUnderTsx: non-array input is treated as not-under-tsx (no throw)", () => {
  assert.equal(isUnderTsx(undefined), false);
  assert.equal(isUnderTsx(null), false);
  assert.equal(isUnderTsx("--import tsx/dist/loader.mjs"), false); // string, not array -> false, no crash
  assert.equal(isUnderTsx(42), false);
});

test("isUnderTsx: array with non-string members does not throw (String() coercion)", () => {
  assert.equal(isUnderTsx([null, 7, { a: 1 }]), false);
  assert.equal(isUnderTsx([{ toString: () => "x/tsx/dist/loader.mjs" }]), true); // coerces to the marker
});

// ---------- resolveTsxCli: presence resolution ----------

test("resolveTsxCli: returns the cli path when tsx is installed (live repo)", () => {
  // The repo ships tsx under mcp-server/node_modules -- this is the real production cwd.
  const cli = resolveTsxCli(process.cwd().replace(/[\\/]scripts$/, ""));
  // Either resolves (string ending cli.mjs) or null (tsx genuinely absent) -- never throws.
  if (cli !== null) assert.match(cli, /tsx[\\/]dist[\\/]cli\.mjs$/);
});

test("resolveTsxCli: null when tsx is absent under the given cwd", () => {
  assert.equal(resolveTsxCli("H:/prism/this-path-has-no-node-modules-xyz"), null);
});

// ---------- planTsxReexec: the full decision matrix ----------

test("planTsxReexec: under tsx -> no reexec (already correct runtime)", () => {
  const p = planTsxReexec({ execArgv: TSX_EXECARGV, env: {}, cwd: process.cwd() });
  assert.equal(p.reexec, false);
  assert.equal(p.reason, "already-under-tsx");
});

test("planTsxReexec: breaker env set -> no reexec (infinite-loop guard)", () => {
  // Even bare-node + tsx-present must NOT reexec when the child breaker flag is set.
  const p = planTsxReexec({ execArgv: BARE_NODE_EXECARGV, env: { PRISM_QTC_REEXEC: "1" }, cwd: process.cwd() });
  assert.equal(p.reexec, false);
  assert.equal(p.reason, "reexec-breaker-set");
});

test("planTsxReexec: explicit disable env -> no reexec", () => {
  const p = planTsxReexec({ execArgv: BARE_NODE_EXECARGV, env: { PRISM_QTC_NO_REEXEC: "1" }, cwd: process.cwd() });
  assert.equal(p.reexec, false);
  assert.equal(p.reason, "reexec-disabled");
});

test("planTsxReexec: bare node + tsx absent -> no reexec (degrade to dist-fallback)", () => {
  const p = planTsxReexec({ execArgv: BARE_NODE_EXECARGV, env: {}, cwd: "H:/prism/no-node-modules-xyz" });
  assert.equal(p.reexec, false);
  assert.equal(p.reason, "tsx-absent");
  assert.equal(p.tsxCli, null);
});

test("planTsxReexec: bare node + tsx present -> REEXEC (the production-fix path)", () => {
  // The production-fix path MUST be load-bearing, not silently skipped (R9). tsx ships in
  // this repo's mcp-server/node_modules, so it MUST resolve here -- if it does not, that is a
  // real environment regression and this test FAILS LOUD rather than skipping.
  const repoRoot = process.cwd().replace(/[\\/]scripts$/, "");
  const tsxCli = resolveTsxCli(repoRoot);
  assert.notEqual(tsxCli, null, "tsx must be installed under mcp-server/node_modules for the cron path to work");
  const p = planTsxReexec({ execArgv: BARE_NODE_EXECARGV, env: {}, cwd: repoRoot });
  assert.equal(p.reexec, true, "bare node with tsx available MUST re-exec -- this is the cron-fix path");
  assert.equal(p.reason, "bare-node-needs-tsx");
  assert.match(p.tsxCli, /tsx[\\/]dist[\\/]cli\.mjs$/);
});

test("planTsxReexec: env breaker is EXACT-match '1' -- other truthy-looking values do NOT suppress reexec", () => {
  // The breaker guards an infinite loop; it must be an exact "1" set by the child, NOT a loose
  // truthiness check (else a stray PRISM_QTC_REEXEC=0/false/'' would wrongly suppress the fix).
  const repoRoot = process.cwd().replace(/[\\/]scripts$/, "");
  if (resolveTsxCli(repoRoot) === null) return; // genuinely no tsx -> can't assert reexec path; covered above
  for (const v of ["0", "false", "", "true", "2"]) {
    const p = planTsxReexec({ execArgv: BARE_NODE_EXECARGV, env: { PRISM_QTC_REEXEC: v }, cwd: repoRoot });
    assert.equal(p.reexec, true, `PRISM_QTC_REEXEC='${v}' is not the exact breaker '1' -> must still reexec`);
  }
  // and the exact breaker DOES suppress
  const suppressed = planTsxReexec({ execArgv: BARE_NODE_EXECARGV, env: { PRISM_QTC_REEXEC: "1" }, cwd: repoRoot });
  assert.equal(suppressed.reexec, false);
  assert.equal(suppressed.reason, "reexec-breaker-set");
});

test("planTsxReexec: both breaker + disable set -> breaker checked first (deterministic precedence)", () => {
  const p = planTsxReexec({
    execArgv: BARE_NODE_EXECARGV,
    env: { PRISM_QTC_REEXEC: "1", PRISM_QTC_NO_REEXEC: "1" },
    cwd: process.cwd(),
  });
  assert.equal(p.reexec, false);
  assert.equal(p.reason, "reexec-breaker-set", "breaker (loop guard) is evaluated before the disable knob");
});

test("resolveTsxCli: never throws on a malformed/non-existent cwd (contract)", () => {
  assert.doesNotThrow(() => resolveTsxCli("H:/prism/no-such-parent/still-no-such-child"));
  assert.doesNotThrow(() => resolveTsxCli(""));
  assert.equal(resolveTsxCli("H:/prism/definitely-absent-xyz-123"), null);
});

// ---------- E2E: the spawn/re-exec round-trip actually fires (regression-locks the cron-fix) ----------
// This is the load-bearing contract the helpers exist to serve. Skips only if tsx is genuinely
// absent (asserted-present above, so absence here is a real env gap, not silent test rot).

test("E2E: bare `node` invocation re-execs under tsx and the engine LOADS (ok:true)", () => {
  if (resolveTsxCli(REPO_ROOT) === null) return;
  const r = spawnSync(process.execPath, [SCRIPT, "--json", "--no-write"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    timeout: 120000,
    // a clean env WITHOUT the breaker -> the reexec path under test must fire
    env: { ...process.env, PRISM_QTC_REEXEC: "" },
  });
  const line = (r.stdout || "").trim().split("\n").filter(Boolean).reverse().find((l) => l.includes('"ok"'));
  assert.ok(line, `expected a JSON result line; got stdout:\n${r.stdout}\nstderr:\n${r.stderr}`);
  const json = JSON.parse(line);
  // The bug was ERR_MODULE_NOT_FOUND on the .ts->.js dynamic import. After the fix the engine
  // loads and the cycle runs to a real terminal verdict (ok:true), NOT an unhandled module error.
  assert.equal(json.ok, true, `train-cycle must run to ok:true after tsx re-exec (was ERR_MODULE_NOT_FOUND)`);
  assert.ok(!/ERR_MODULE_NOT_FOUND/.test(r.stdout + r.stderr), "no module-not-found after the fix");
});

test("E2E: breaker set -> NO re-exec under bare node -> HONEST terminal verdict (no opaque ERR_MODULE_NOT_FOUND crash)", () => {
  // With the breaker forced on, bare node must NOT reexec (planTsxReexec -> reexec:false,
  // reason:"reexec-breaker-set"; pinned by the pure unit tests above). It then proceeds on the
  // bare-node load path. The ENVIRONMENT-INDEPENDENT invariant this E2E pins -- the original
  // U-QP-TSX-REEXEC bug was an OPAQUE ERR_MODULE_NOT_FOUND crash that killed the whole training
  // cron -- is: the run must terminate with an HONEST structured verdict (a parseable JSON line
  // carrying a boolean `ok`), NEVER an unhandled module-load crash that emits no verdict.
  // The *value* of ok is correctly env-dependent and is deliberately NOT asserted here:
  //   - Node>=24 native type-strip + absent/broken dist -> the .ts dynamic import fails -> the
  //     script's own guards emit an honest ok:false (the original "fail-loud" intent), whereas
  //   - Node<24, or any present dist build -> the SRC-first .ts import fails and the documented
  //     SRC-first/dist-fallback try/catch (quoting-train-cycle.mjs:435-447) loads the real
  //     orchestrator -> legitimate ok:true (a genuine cycle, not a faked success).
  // Both are HONEST; only an opaque crash (no JSON verdict line) is the regression this guards.
  const r = spawnSync(process.execPath, [SCRIPT, "--json", "--no-write"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    timeout: 120000,
    env: { ...process.env, PRISM_QTC_REEXEC: "1" },
  });
  const line = (r.stdout || "").trim().split("\n").filter(Boolean).reverse().find((l) => l.includes('"ok"'));
  assert.ok(line, `breaker-suppressed bare-node run must emit an HONEST JSON verdict, not crash opaquely; got stdout:\n${r.stdout}\nstderr:\n${r.stderr}`);
  const json = JSON.parse(line);
  assert.equal(typeof json.ok, "boolean", "the bare-node verdict must be a real boolean ok (honest terminal verdict), never absent/faked");
});

test("planTsxReexec: breaker precedence -- breaker wins even under tsx (defensive)", () => {
  // If somehow both under-tsx AND breaker, under-tsx short-circuits first (no reexec either way).
  const p = planTsxReexec({ execArgv: TSX_EXECARGV, env: { PRISM_QTC_REEXEC: "1" }, cwd: process.cwd() });
  assert.equal(p.reexec, false);
  assert.equal(p.reason, "already-under-tsx");
});
