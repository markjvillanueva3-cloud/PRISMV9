// mine-hotel-transcripts-combine.test.mjs -- LOCAL-LLM-MS1/U-HOTEL-COMBINE-TEST
// Unit-tests the _COMBINED fold policy (selectCombinedRows), extracted pure from main() so the
// reviewer-flagged P1 logic is verifiable without a real mine. The policy: fold ONLY this run's
// non-error results that actually produced a file -- never a blind disk glob (an errored session
// must not silently fold a stale/partial prior file while the console reports "error"). existsImpl
// is injected, so no disk I/O.
import { test } from "node:test";
import assert from "node:assert/strict";
import { selectCombinedRows } from "../mine-hotel-transcripts.mjs";

const rows = (ids) => ids.map((id) => ({ id }));

test("selectCombinedRows: includes non-error rows whose file exists (mined/skipped/empty)", () => {
  const results = [
    { id: "a", status: "mined" },
    { id: "b", status: "skipped(exists)" },
    { id: "c", status: "empty" },
  ];
  const out = selectCombinedRows(rows(["a", "b", "c"]), results, () => true);
  assert.deepEqual(out.map((x) => x.id), ["a", "b", "c"]);
});

test("selectCombinedRows: EXCLUDES an errored row even if its file is present on disk (the P1 fix)", () => {
  const results = [
    { id: "a", status: "mined" },
    { id: "b", status: "error", error: "ollama HTTP 503" },
  ];
  // file for 'b' exists (a stale digest from a prior run) -- it must STILL be excluded.
  const out = selectCombinedRows(rows(["a", "b"]), results, () => true);
  assert.deepEqual(out.map((x) => x.id), ["a"]);
});

test("selectCombinedRows: EXCLUDES a non-error row whose file is missing (no phantom fold)", () => {
  const results = [
    { id: "a", status: "mined" },
    { id: "b", status: "mined" }, // claims mined but produced no file -> must not fold
  ];
  const out = selectCombinedRows(rows(["a", "b"]), results, (id) => id === "a");
  assert.deepEqual(out.map((x) => x.id), ["a"]);
});

test("selectCombinedRows: a row with no matching result this run is excluded", () => {
  const results = [{ id: "a", status: "mined" }]; // 'ghost' row had no result this run
  const out = selectCombinedRows(rows(["a", "ghost"]), results, () => true);
  assert.deepEqual(out.map((x) => x.id), ["a"]);
});

test("selectCombinedRows: empty results => empty fold (nothing to combine)", () => {
  const out = selectCombinedRows(rows(["a", "b"]), [], () => true);
  assert.deepEqual(out, []);
});

test("selectCombinedRows: preserves input row order", () => {
  const results = [
    { id: "c", status: "mined" },
    { id: "a", status: "mined" },
    { id: "b", status: "mined" },
  ];
  const out = selectCombinedRows(rows(["a", "b", "c"]), results, () => true);
  assert.deepEqual(out.map((x) => x.id), ["a", "b", "c"]); // follows rows order, not results order
});
