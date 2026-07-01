/*
 * Tests for cad-gen-overnight-loop.mjs (slot:delta). Hermetic: injected genRunner (R9 -- never spawn
 * real Ollama). Run: node scripts/cad-gen-overnight-loop.test.mjs (node:test auto-runs on exit; pipe
 * to tail per the 2026-06-17 env note that `node --test <file>` ran 0 tests here).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseWorklist, readCursorDone, specKey, remainingItems, classifyGen, runLoop, summarize, shouldCursor,
} from "./cad-gen-overnight-loop.mjs";

test("parseWorklist: keeps specs, drops blanks + # comments + trims", () => {
  const specs = parseWorklist("  a cube  \n\n# a comment\nb plate\n   \n#x\nc bushing");
  assert.deepEqual(specs, ["a cube", "b plate", "c bushing"]);
});

test("specKey: stable + distinct (resists worklist reorder)", () => {
  assert.equal(specKey("a cube"), specKey("a cube"));
  assert.notEqual(specKey("a cube"), specKey("a plate"));
});

test("readCursorDone: collects keys, skips torn/invalid lines (fail-soft)", () => {
  const done = readCursorDone('{"key":"s1"}\nNOT JSON\n{"key":"s2"}\n{"nokey":1}\n');
  assert.equal(done.has("s1"), true);
  assert.equal(done.has("s2"), true);
  assert.equal(done.size, 2);
});

test("remainingItems: excludes cursor-done specs", () => {
  const specs = ["a", "b", "c"];
  const done = new Set([specKey("b")]);
  const rem = remainingItems(specs, done);
  assert.deepEqual(rem.map((r) => r.spec), ["a", "c"]);
});

test("classifyGen: exit 0 + staged dir -> staged; exit 0 no dir -> ok; 2 -> usage-error; else error", () => {
  assert.equal(classifyGen("x", "k", { code: 0, out: '{"stagedDir":"/d/foo"}' }).status, "staged");
  assert.equal(classifyGen("x", "k", { code: 0, out: '{"stagedDir":"/d/foo"}' }).staged, "/d/foo");
  assert.equal(classifyGen("x", "k", { code: 0, out: "no json here" }).status, "ok");
  assert.equal(classifyGen("x", "k", { code: 2, out: "" }).status, "usage-error");
  assert.equal(classifyGen("x", "k", { code: 1, out: "" }).status, "error");
});

test("classifyGen: multi-line stdout -> parses the LAST json line (json is the final emit)", () => {
  const r = classifyGen("x", "k", { code: 0, out: "log noise\nmore noise\n{\"stagedDir\":\"/d/bar\"}" });
  assert.equal(r.status, "staged");
  assert.equal(r.staged, "/d/bar");
});

test("classifyGen: executed:true (real STEP) -> staged even without a staged-dir key", () => {
  assert.equal(classifyGen("x", "k", { code: 0, out: '{"executed":true,"stepPath":"/d/model.step"}' }).status, "staged");
  assert.equal(classifyGen("x", "k", { code: 0, out: '{"dir":"/d/foo"}' }).status, "staged"); // j.dir recognized
  assert.equal(classifyGen("x", "k", { code: 0, out: '{"executed":false}' }).status, "ok"); // honest-defer
});

test("shouldCursor: transient error retries (not cursored); success + usage-error are done", () => {
  assert.equal(shouldCursor("error"), false); // exit-4 contention -> retry next run
  assert.equal(shouldCursor("staged"), true);
  assert.equal(shouldCursor("ok"), true);
  assert.equal(shouldCursor("usage-error"), true); // permanent bad-spec -> done
});

test("runLoop: respects limit, only runs remaining, uses injected runner (no real spawn)", () => {
  const specs = ["a", "b", "c", "d"];
  const done = new Set([specKey("a")]); // a already done
  const calls = [];
  const genRunner = (spec) => { calls.push(spec); return { code: 0, out: '{"stagedDir":"/x"}' }; };
  const res = runLoop({ specs, done, genRunner, limit: 2, log: () => {} });
  assert.deepEqual(calls, ["b", "c"]); // skips a (done), caps at 2 (b,c), leaves d
  assert.equal(res.length, 2);
  assert.equal(res.every((r) => r.status === "staged"), true);
});

test("runLoop: a throwing/erroring item is classified error, never stops the loop (fail-soft)", () => {
  const specs = ["ok1", "bad", "ok2"];
  const genRunner = (spec) => (spec === "bad" ? { code: 1, out: "", err: "boom" } : { code: 0, out: '{"stagedDir":"/x"}' });
  const res = runLoop({ specs, done: new Set(), genRunner, limit: 0, log: () => {} });
  assert.equal(res.length, 3);
  assert.equal(res.find((r) => r.spec === "bad").status, "error");
  assert.equal(res.filter((r) => r.status === "staged").length, 2);
});

test("summarize: counts + genSuccessRate (staged+ok over total)", () => {
  const s = summarize([
    { status: "staged" }, { status: "staged" }, { status: "ok" }, { status: "error" },
  ]);
  assert.equal(s.total, 4);
  assert.equal(s.staged, 2);
  assert.equal(s.ok, 1);
  assert.equal(s.errors, 1);
  assert.equal(s.genSuccessRate, 0.75); // (2+1)/4
});

test("summarize: empty -> 0 rate, no divide-by-zero", () => {
  assert.equal(summarize([]).genSuccessRate, 0);
});
