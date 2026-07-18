// Tests for cad-part-decipher-hermes.mjs -- parallel-Hermes decipher of the residual
// (U-DELTA-CAD-DECIPHER-HERMES, slot:delta). The live Hermes call is validated separately (R15);
// here askImpl/probeImpl are injected so the logic is deterministic, offline, and fail-loud.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  buildDecipherMessages, parseHermesDecipher, loadResidual, runHermesResidual, defaultAsk, __test,
} from "./cad-part-decipher-hermes.mjs";

// A fake fetch returning a chat-completion body with the given content (or a status).
const fakeFetch = (content, { status = 200 } = {}) => async () => ({
  ok: status >= 200 && status < 300, status,
  json: async () => ({ choices: [{ message: { content } }] }),
});

// ---- buildDecipherMessages --------------------------------------------------------------------

test("buildDecipherMessages: system+user, label + sorted bbox + two-equal hint", () => {
  const msgs = buildDecipherMessages({ label: "CASING WITH SINGLE SIDE BORE", partClass: "casing", bbox: [63.88, 50.93, 50.93] });
  assert.equal(msgs.length, 2);
  assert.equal(msgs[0].role, "system");
  assert.match(msgs[1].content, /CASING WITH SINGLE SIDE BORE/);
  assert.match(msgs[1].content, /63.88, 50.93, 50.93/); // sorted descending
  assert.match(msgs[1].content, /~equal \(50.93, 50.93\)/); // two-equal hint fires
});
test("buildDecipherMessages: all-unequal bbox -> prismatic-leaning hint (no false diameter cue)", () => {
  const msgs = buildDecipherMessages({ label: "BLOB", partClass: "general", bbox: [80, 40, 10] });
  assert.match(msgs[1].content, /No two extents are equal/);
});

// ---- parseHermesDecipher: robust extraction, NO fabrication -----------------------------------

test("parseHermesDecipher: clean JSON -> all fields, confidence preserved", () => {
  const r = parseHermesDecipher('{"family":"round","confidence":0.92,"reason":"two equal extents","workholding":"3-jaw chuck OD","finish_stock_mm_per_side":0.5}');
  assert.equal(r.family, "round");
  assert.equal(r.confidence, 0.92);
  assert.equal(r.reason, "two equal extents");
  assert.equal(r.workholding, "3-jaw chuck OD");
  assert.equal(r.finishStockMmPerSide, 0.5);
});
test("parseHermesDecipher: markdown-fenced JSON is unwrapped", () => {
  const r = parseHermesDecipher('```json\n{"family":"prismatic","confidence":0.8}\n```');
  assert.equal(r.family, "prismatic");
  assert.equal(r.confidence, 0.8);
});
test("parseHermesDecipher: JSON embedded in prose is extracted", () => {
  const r = parseHermesDecipher('Here is my answer: {"family":"round","confidence":0.7} -- hope that helps');
  assert.equal(r.family, "round");
});
test("parseHermesDecipher: confidence clamped to [0,1]; non-number -> null", () => {
  assert.equal(parseHermesDecipher('{"family":"round","confidence":1.5}').confidence, 1);
  assert.equal(parseHermesDecipher('{"family":"round","confidence":"high"}').confidence, null);
});
test("parseHermesDecipher: OFF-VOCABULARY family -> null (never accept a fabricated shape family)", () => {
  assert.equal(parseHermesDecipher('{"family":"cube","confidence":0.9}'), null);
  assert.equal(parseHermesDecipher('{"family":"","confidence":0.9}'), null);
});
test("parseHermesDecipher: null / empty / non-JSON content -> null (reasoning-only reply, no crash)", () => {
  assert.equal(parseHermesDecipher(null), null);
  assert.equal(parseHermesDecipher(""), null);
  assert.equal(parseHermesDecipher("I need more information about the part."), null);
});

// ---- loadResidual ------------------------------------------------------------------------------

test("loadResidual: returns ONLY needsReasoning rows from a decipher dataset", () => {
  const p = path.join(os.tmpdir(), `dec-${process.pid}.jsonl`);
  fs.writeFileSync(p, [
    JSON.stringify({ label: "DIE A", bboxMm: [50, 50, 10], classification: { needsReasoning: false } }),
    JSON.stringify({ label: "MYSTERY", partClass: "general", bboxMm: [60, 60, 20], classification: { needsReasoning: true } }),
  ].join("\n") + "\n");
  const res = loadResidual(p);
  fs.unlinkSync(p);
  assert.equal(res.length, 1);
  assert.equal(res[0].label, "MYSTERY");
  assert.deepEqual(res[0].bbox, [60, 60, 20]);
});

// ---- runHermesResidual: injected ask, fail-loud, dark-safe ------------------------------------

const fakeAsk = (canned) => async (part) => canned[part.label] ?? null;

test("runHermesResidual: resolves families, counts resolved/unsure/unparsed, dedups, writes", async () => {
  const residual = [
    { label: "A", partClass: "general", bbox: [60, 60, 20] },
    { label: "B", partClass: "casing", bbox: [80, 40, 10] },
    { label: "C", partClass: "general", bbox: [50, 50, 50] },
    { label: "A", partClass: "general", bbox: [60, 60, 20] }, // duplicate
  ];
  const ask = fakeAsk({
    A: { family: "round", confidence: 0.9, workholding: "chuck OD" },
    B: { family: "prismatic", confidence: 0.8, workholding: "vise" },
    C: { family: "unsure", confidence: 0.4 },
    // (duplicate A never re-asked)
  });
  const out = path.join(os.tmpdir(), `herm-${process.pid}.jsonl`);
  const s = await runHermesResidual(residual, { askImpl: ask, outPath: out, skipProbe: true, concurrency: 2 });
  const written = fs.readFileSync(out, "utf8").trim().split("\n").map((l) => JSON.parse(l));
  fs.unlinkSync(out);
  assert.equal(s.skippedDuplicate, 1);
  assert.equal(s.considered, 3);
  assert.equal(s.resolved, 2); // A round + B prismatic
  assert.equal(s.unsure, 1);   // C
  assert.equal(s.unparsed, 0);
  assert.deepEqual(s.byFamily, { round: 1, prismatic: 1, unsure: 1 });
  assert.equal(written.length, 3);
  assert.equal(written[0].decipheredBy, "hermes");
});

test("runHermesResidual: an unparsable Hermes reply is counted `unparsed`, never fabricated", async () => {
  const s = await runHermesResidual(
    [{ label: "X", bbox: [10, 20, 30] }],
    { askImpl: async () => null, skipProbe: true },
  );
  assert.equal(s.considered, 1);
  assert.equal(s.unparsed, 1);
  assert.equal(s.resolved, 0);
});

test("runHermesResidual: lane DOWN -> no-op with laneDown:true, zero asked (never fabricates a decipher)", async () => {
  let asked = 0;
  const s = await runHermesResidual(
    [{ label: "X", bbox: [10, 20, 30] }],
    { askImpl: async () => { asked++; return { family: "round" }; }, probeImpl: async () => false },
  );
  assert.equal(s.laneDown, true);
  assert.equal(s.considered, 0);
  assert.equal(asked, 0, "no part is asked when the lane is down");
});

test("runHermesResidual: resume skips already-deciphered labels", async () => {
  const out = path.join(os.tmpdir(), `herm-resume-${process.pid}.jsonl`);
  fs.writeFileSync(out, JSON.stringify({ label: "DONE", hermes: { family: "round" } }) + "\n");
  let asked = [];
  const s = await runHermesResidual(
    [{ label: "DONE", bbox: [1, 1, 1] }, { label: "NEW", bbox: [2, 2, 2] }],
    { askImpl: async (p) => { asked.push(p.label); return { family: "prismatic", confidence: 0.9 }; }, outPath: out, resume: true, skipProbe: true },
  );
  const lines = fs.readFileSync(out, "utf8").trim().split("\n");
  fs.unlinkSync(out);
  assert.deepEqual(asked, ["NEW"], "only the un-deciphered label is asked");
  assert.equal(s.skippedDuplicate, 1);
  assert.equal(lines.length, 2, "appended NEW to the existing DONE");
});

// ---- defaultAsk: HTTP failure modes (hermetic, injected fetchImpl, retries:0 for speed) --------

test("defaultAsk: 200 with clean JSON content -> parsed decipher", async () => {
  const r = await defaultAsk({ label: "P", bbox: [50, 50, 20] }, {
    fetchImpl: fakeFetch('{"family":"round","confidence":0.9}'), key: "k", retries: 0,
  });
  assert.equal(r.family, "round");
  assert.equal(r.confidence, 0.9);
});
test("defaultAsk: 200 with null content (reasoning-only reply) -> null, no crash", async () => {
  const r = await defaultAsk({ label: "P", bbox: [1, 2, 3] }, { fetchImpl: fakeFetch(null), key: "k", retries: 0 });
  assert.equal(r, null);
});
test("defaultAsk: non-ok status (404) -> null (not a throw that aborts the pass)", async () => {
  const r = await defaultAsk({ label: "P", bbox: [1, 2, 3] }, { fetchImpl: fakeFetch("{}", { status: 404 }), key: "k", retries: 0 });
  assert.equal(r, null);
});
test("defaultAsk: network throw -> null after retries exhausted (retries:0 = one attempt)", async () => {
  const r = await defaultAsk({ label: "P", bbox: [1, 2, 3] }, {
    fetchImpl: async () => { throw new Error("ECONNREFUSED"); }, key: "k", retries: 0,
  });
  assert.equal(r, null);
});
test("defaultAsk: 429 then 200 -> retries and resolves (one backoff)", async () => {
  let calls = 0;
  const flaky = async () => {
    calls++;
    if (calls === 1) return { ok: false, status: 429, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: '{"family":"prismatic","confidence":0.8}' } }] }) };
  };
  const r = await defaultAsk({ label: "P", bbox: [9, 9, 2] }, { fetchImpl: flaky, key: "k", retries: 1 });
  assert.equal(calls, 2);
  assert.equal(r.family, "prismatic");
});

test("runHermesResidual: a throwing askImpl is counted `errored`, distinct from `unparsed`", async () => {
  const s = await runHermesResidual(
    [{ label: "T", bbox: [1, 1, 1] }],
    { askImpl: async () => { throw new Error("boom"); }, skipProbe: true },
  );
  assert.equal(s.considered, 1);
  assert.equal(s.errored, 1);
  assert.equal(s.unparsed, 0);
  assert.equal(s.resolved, 0);
});

test("runHermesResidual: flushEvery persists in chunks -- earlier chunks are on disk before a later chunk runs (kill-safe)", async () => {
  const out = path.join(os.tmpdir(), `herm-flush-${process.pid}.jsonl`);
  const residual = [1, 2, 3, 4, 5].map((n) => ({ label: `P${n}`, bbox: [n, n, 2] }));
  let sawOnDiskBeforeLast = -1;
  const ask = async (part) => {
    // when the LAST part is asked, the earlier chunks must already be flushed to disk
    if (part.label === "P5") sawOnDiskBeforeLast = fs.existsSync(out) ? fs.readFileSync(out, "utf8").trim().split("\n").filter(Boolean).length : 0;
    return { family: "prismatic", confidence: 0.8 };
  };
  const s = await runHermesResidual(residual, { askImpl: ask, outPath: out, skipProbe: true, concurrency: 1, flushEvery: 2 });
  const final = fs.readFileSync(out, "utf8").trim().split("\n").filter(Boolean).length;
  fs.unlinkSync(out);
  assert.equal(s.considered, 5);
  assert.equal(final, 5, "all 5 written across 3 chunks (2+2+1)");
  assert.ok(sawOnDiskBeforeLast >= 2, `earlier chunks flushed before the last part ran (saw ${sawOnDiskBeforeLast} on disk)`);
});

test("runHermesResidual: fresh (non-resume) run truncates stale output before writing chunks", async () => {
  const out = path.join(os.tmpdir(), `herm-fresh-${process.pid}.jsonl`);
  fs.writeFileSync(out, JSON.stringify({ label: "STALE", hermes: { family: "round" } }) + "\n");
  const s = await runHermesResidual([{ label: "NEW", bbox: [3, 3, 1] }], {
    askImpl: async () => ({ family: "round", confidence: 0.9 }), outPath: out, skipProbe: true, // no resume
  });
  const lines = fs.readFileSync(out, "utf8").trim().split("\n").map((l) => JSON.parse(l));
  fs.unlinkSync(out);
  assert.equal(lines.length, 1, "the stale record was truncated, not appended to");
  assert.equal(lines[0].label, "NEW");
  assert.equal(s.considered, 1);
});

test("parseHermesDecipher: whitespace-padded family ('round ') is trimmed + resolved", () => {
  assert.equal(parseHermesDecipher('{"family":"round ","confidence":0.9}').family, "round");
  assert.equal(parseHermesDecipher('{"family":" Prismatic","confidence":0.5}').family, "prismatic");
});

test("FAMILIES vocabulary is exactly {round, prismatic, unsure}", () => {
  assert.deepEqual([...__test.FAMILIES].sort(), ["prismatic", "round", "unsure"]);
});
