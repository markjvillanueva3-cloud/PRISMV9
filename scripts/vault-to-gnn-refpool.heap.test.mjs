// vault-to-gnn-refpool.heap.test.mjs (U-ALPHA-REFPOOL-HEAP-GUARD)
// Regression-locks the self-reexec heap guard: --apply/--revert load the 542MB graph and OOM at the
// default heap, so they must re-exec with a bump; the dry-run must NOT (it never loads the graph).
import { test } from "node:test";
import assert from "node:assert/strict";
import { shouldReexecForHeap, hasHeapFlag, nodeArgsWithHeap } from "./vault-to-gnn-refpool.mjs";

test("shouldReexecForHeap: graph-writing modes re-exec; dry-run does not", () => {
  assert.equal(shouldReexecForHeap(["--apply"], {}, []), true, "--apply loads graph -> re-exec");
  assert.equal(shouldReexecForHeap(["--revert"], {}, []), true, "--revert loads graph -> re-exec");
  assert.equal(shouldReexecForHeap([], {}, []), false, "dry-run -> no graph load -> no re-exec");
  assert.equal(shouldReexecForHeap(["--json"], {}, []), false, "--json dry-run -> no re-exec");
});

test("shouldReexecForHeap: child / opt-out / already-bumped suppress the re-exec (no infinite loop, no double-wrap)", () => {
  assert.equal(shouldReexecForHeap(["--apply"], { PRISM_VAULT_REFPOOL_REEXEC: "1" }, []), false, "inside child -> stop");
  assert.equal(shouldReexecForHeap(["--apply"], { PRISM_VAULT_REFPOOL_NO_REEXEC: "1" }, []), false, "opt-out");
  assert.equal(shouldReexecForHeap(["--apply"], {}, ["--max-old-space-size=8192"]), false, "already heap-bumped");
});

test("hasHeapFlag: detects the V8 heap flag in execArgv", () => {
  assert.equal(hasHeapFlag(["--max-old-space-size=4096"]), true);
  assert.equal(hasHeapFlag(["--enable-source-maps"]), false);
  assert.equal(hasHeapFlag([]), false);
  assert.equal(hasHeapFlag(null), false, "non-array fail-soft");
});

test("nodeArgsWithHeap: flag precedes script path (node consumes V8 flags before the script arg)", () => {
  assert.deepEqual(nodeArgsWithHeap("s.mjs", 2048, ["--apply"]), ["--max-old-space-size=2048", "s.mjs", "--apply"]);
  assert.deepEqual(nodeArgsWithHeap("s.mjs", 4096), ["--max-old-space-size=4096", "s.mjs"], "no script args");
});

test("adversarial: empty/garbage argv never throws + never re-execs", () => {
  assert.equal(shouldReexecForHeap(null, {}, []), false);
  assert.equal(shouldReexecForHeap(undefined, {}, undefined), false);
  assert.equal(shouldReexecForHeap(["--unknown-flag"], {}, []), false, "unknown flag is not a graph-writer");
});
