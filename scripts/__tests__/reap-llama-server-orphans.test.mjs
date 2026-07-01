// reap-llama-server-orphans.test.mjs -- tests the PURE decision core of the llama-server orphan
// reaper. This is process-killing logic, so the "which PID is an orphan" decision must be exactly
// right: never reap a single-instance model, never reap the newest of a dup group, never reap a
// brief reload-overlap. Mirrors the real 2026-06-09 incident (live 20:46 + orphan 18:44, same blob).
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseLlamaServers, selectLlamaOrphans, resolveMinAgeSec } from "../system-health/reap-llama-server-orphans.mjs";

// --- parseLlamaServers ---

test("parseLlamaServers: parses well-formed pid|age|port|model lines", () => {
  const raw = "38920|480|17234|sha256-e7b273f9636\n44636|449|28571|sha256-6be6d66a3f5";
  const out = parseLlamaServers(raw);
  assert.equal(out.length, 2);
  assert.deepEqual(out[0], { pid: 38920, age: 480, port: "17234", model: "sha256-e7b273f9636" });
  assert.equal(out[1].pid, 44636);
});

test("parseLlamaServers: skips blank + malformed lines, never throws", () => {
  const raw = "\n  \n38920|480|17234|sha256-abc\nGARBAGE\n|||\n99|notanumber|p|m\n";
  const out = parseLlamaServers(raw);
  assert.deepEqual(out.map((s) => s.pid), [38920]); // only the one valid row survives
});

test("parseLlamaServers: null/empty/non-string input -> []", () => {
  assert.deepEqual(parseLlamaServers(null), []);
  assert.deepEqual(parseLlamaServers(""), []);
  assert.deepEqual(parseLlamaServers(undefined), []);
  assert.deepEqual(parseLlamaServers(42), []);
});

test("parseLlamaServers: a row with empty port still parses (port optional)", () => {
  const out = parseLlamaServers("123|60||sha256-xyz");
  assert.equal(out.length, 1);
  assert.equal(out[0].port, "");
  assert.equal(out[0].model, "sha256-xyz");
});

// --- selectLlamaOrphans ---

test("selectLlamaOrphans: single instance per model -> NO orphans (never reap the only server)", () => {
  const servers = [
    { pid: 1, age: 9999, model: "blobA" },
    { pid: 2, age: 9999, model: "blobB" },
  ];
  assert.deepEqual(selectLlamaOrphans(servers, { minOrphanAgeSec: 300 }), []);
});

test("selectLlamaOrphans: the real incident -- live (young) + same-blob orphan (133min) -> reap older, keep newer", () => {
  const servers = [
    { pid: 38920, age: 480, model: "sha256-e7b273f9636" },   // 20:46 live reload
    { pid: 129048, age: 7980, model: "sha256-e7b273f9636" },  // 18:44 orphan (~133min)
  ];
  const orphans = selectLlamaOrphans(servers, { minOrphanAgeSec: 300 });
  assert.equal(orphans.length, 1);
  assert.equal(orphans[0].pid, 129048);  // the OLDER one is reaped
  assert.equal(orphans[0].livePid, 38920); // the NEWER one is identified as live
});

test("selectLlamaOrphans: two same-blob but BOTH younger than min-age -> NO orphans (reload-overlap guard)", () => {
  const servers = [
    { pid: 1, age: 5, model: "blobA" },
    { pid: 2, age: 8, model: "blobA" }, // a legitimate few-second reload handoff
  ];
  assert.deepEqual(selectLlamaOrphans(servers, { minOrphanAgeSec: 300 }), []);
});

test("selectLlamaOrphans: three same-blob -> two older orphaned, newest kept", () => {
  const servers = [
    { pid: 1, age: 10, model: "blobA" },   // newest = live
    { pid: 2, age: 600, model: "blobA" },  // orphan
    { pid: 3, age: 9000, model: "blobA" }, // orphan
  ];
  const orphans = selectLlamaOrphans(servers, { minOrphanAgeSec: 300 });
  assert.deepEqual(orphans.map((o) => o.pid).sort((a, b) => a - b), [2, 3]);
  assert.ok(orphans.every((o) => o.livePid === 1));
});

test("selectLlamaOrphans: two DIFFERENT models (the 120b + 20b real case) -> NO orphans", () => {
  const servers = [
    { pid: 44636, age: 449, model: "sha256-120b-blob" },
    { pid: 38920, age: 480, model: "sha256-20b-blob" },
  ];
  assert.deepEqual(selectLlamaOrphans(servers, { minOrphanAgeSec: 300 }), []);
});

test("selectLlamaOrphans: malformed entries (missing model/pid/age) are skipped, no crash", () => {
  const servers = [
    { pid: 1, age: 10, model: "blobA" },
    { pid: 2, age: 9000, model: "blobA" },
    { pid: NaN, age: 9000, model: "blobA" }, // bad pid
    { age: 9000, model: "blobA" },           // no pid
    { pid: 5, age: 9000 },                    // no model
    null,
  ];
  const orphans = selectLlamaOrphans(servers, { minOrphanAgeSec: 300 });
  assert.deepEqual(orphans.map((o) => o.pid), [2]); // only the valid older dup
});

test("selectLlamaOrphans: a future-dated (negative-age, clock-skew) process never decides a kill", () => {
  const servers = [
    { pid: 1, age: -50, model: "blobA" },   // skewed future timestamp -> dropped entirely
    { pid: 2, age: 9000, model: "blobA" },   // a real old process, now the ONLY valid one -> single instance
  ];
  // pid 1 is dropped, so pid 2 is the only server for blobA -> NOT reaped (no live newer anchor).
  assert.deepEqual(selectLlamaOrphans(servers, { minOrphanAgeSec: 300 }), []);
});

// --- resolveMinAgeSec (the safety-critical CLI guard) ---

test("resolveMinAgeSec: --min-age <positive> is honored", () => {
  assert.equal(resolveMinAgeSec(["--min-age", "600"]), 600);
});

test("resolveMinAgeSec: missing flag -> default 300", () => {
  assert.equal(resolveMinAgeSec(["--apply", "--json"]), 300);
});

test("resolveMinAgeSec: 0 and negative fall back to default (NEVER lets a young dup be reaped)", () => {
  assert.equal(resolveMinAgeSec(["--min-age", "0"]), 300);
  assert.equal(resolveMinAgeSec(["--min-age", "-5"]), 300);
});

test("resolveMinAgeSec: non-numeric -> default 300", () => {
  assert.equal(resolveMinAgeSec(["--min-age", "abc"]), 300);
  assert.equal(resolveMinAgeSec(["--min-age"]), 300); // flag with no value
});

test("selectLlamaOrphans: a min-age larger than the older dup's age SPARES it (the knob spares, not only reaps)", () => {
  const servers = [
    { pid: 1, age: 10, model: "blobA" },
    { pid: 2, age: 600, model: "blobA" }, // an orphan at min 300...
  ];
  assert.deepEqual(selectLlamaOrphans(servers, { minOrphanAgeSec: 9999 }), []); // ...spared at min 9999
});

test("selectLlamaOrphans: equal-age same-blob pair is deterministic (stable sort keeps first-enumerated as live)", () => {
  const servers = [
    { pid: 100, age: 500, model: "blobA" },
    { pid: 200, age: 500, model: "blobA" },
  ];
  const orphans = selectLlamaOrphans(servers, { minOrphanAgeSec: 300 });
  assert.deepEqual(orphans.map((o) => o.pid), [200]); // pid 100 (first) stays live; 200 = orphan
  assert.equal(orphans[0].livePid, 100);
});

test("selectLlamaOrphans: default min-age (300s) applies when opts omitted", () => {
  const servers = [
    { pid: 1, age: 10, model: "blobA" },
    { pid: 2, age: 299, model: "blobA" }, // just under default 300 -> NOT an orphan
  ];
  assert.deepEqual(selectLlamaOrphans(servers), []);
  const servers2 = [
    { pid: 1, age: 10, model: "blobA" },
    { pid: 2, age: 300, model: "blobA" }, // exactly 300 -> orphan
  ];
  assert.deepEqual(selectLlamaOrphans(servers2).map((o) => o.pid), [2]);
});
