// Tests for ollama-search-rerank.mjs (verified ollama re-rank of search candidates).
// R9: real candidate fixtures; `run` (model) and `resolves` injected so the verified
// offload is exercised deterministically. Happy + >=3 failure + >=2 adversarial.
// node:test.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildRerankPrompt, parseRerankIds, verifyRerank, rerankCandidates,
} from "./ollama-search-rerank.mjs";

const CANDS = [
  { id: "eng.kienzle", label: "Kienzle Force", info: "cutting force model" },
  { id: "eng.taylor", label: "Taylor Tool Life", info: "tool wear" },
  { id: "eng.merchant", label: "Merchant Circle", info: "shear angle" },
  { id: "eng.sld", label: "Stability Lobe", info: "chatter avoidance" },
];
const IDSET = new Set(CANDS.map((c) => c.id));
const ids = (list) => list.map((c) => c.id);

// ---- buildRerankPrompt (pure) ----
test("buildRerankPrompt embeds the query and every candidate id in brackets", () => {
  const p = buildRerankPrompt("cutting force", CANDS);
  assert.match(p, /QUERY: cutting force/);
  for (const c of CANDS) assert.ok(p.includes(`[${c.id}]`), `prompt missing [${c.id}]`);
  assert.match(p, /RANKED IDS/);
});

// ---- parseRerankIds (pure) ----
test("parseRerankIds: bracketed ids, in order, members only, deduped", () => {
  const raw = "[eng.sld]\n[eng.kienzle]\n[eng.kienzle]\n[eng.HALLUCINATED]";
  assert.deepEqual(parseRerankIds(raw, IDSET), ["eng.sld", "eng.kienzle"]);
});
test("parseRerankIds: bare-token fallback when no brackets (strips list numbering)", () => {
  const raw = "1. eng.taylor\n2. eng.merchant";
  assert.deepEqual(parseRerankIds(raw, IDSET), ["eng.taylor", "eng.merchant"]);
});
test("parseRerankIds: only hallucinated ids -> empty", () => {
  assert.deepEqual(parseRerankIds("[nope.one] [nope.two]", IDSET), []);
});

// ---- verifyRerank (pure) ----
test("verifyRerank: valid full reorder -> ok, value reordered", () => {
  const v = verifyRerank("[eng.sld] [eng.merchant] [eng.taylor] [eng.kienzle]", CANDS, IDSET);
  assert.equal(v.ok, true);
  assert.deepEqual(ids(v.value), ["eng.sld", "eng.merchant", "eng.taylor", "eng.kienzle"]);
});
test("verifyRerank: subset reorder -> ok, omitted appended in original order (nothing dropped)", () => {
  const v = verifyRerank("[eng.sld] [eng.kienzle]", CANDS, IDSET);
  assert.equal(v.ok, true);
  assert.deepEqual(ids(v.value), ["eng.sld", "eng.kienzle", "eng.taylor", "eng.merchant"]);
});
test("verifyRerank: no parseable ids -> not ok (fallback)", () => {
  assert.equal(verifyRerank("the answer is unclear", CANDS, IDSET).ok, false);
});
test("verifyRerank: resolves predicate rejects an id -> not ok (fallback)", () => {
  const resolves = (id) => id !== "eng.sld"; // sld is "unresolvable"
  assert.equal(verifyRerank("[eng.sld] [eng.kienzle]", CANDS, IDSET, resolves).ok, false);
});
test("verifyRerank: resolves accepts all -> ok", () => {
  const v = verifyRerank("[eng.kienzle] [eng.taylor]", CANDS, IDSET, () => true);
  assert.equal(v.ok, true);
  assert.deepEqual(ids(v.value), ["eng.kienzle", "eng.taylor", "eng.merchant", "eng.sld"]);
});

// ---- rerankCandidates (integration via verifiedOffload, injected run/resolves) ----
test("rerank HAPPY: valid model reorder -> source ollama, verified, reordered", async () => {
  const run = async () => "[eng.sld]\n[eng.merchant]\n[eng.taylor]\n[eng.kienzle]";
  const r = await rerankCandidates({ query: "chatter", candidates: CANDS, run });
  assert.equal(r.source, "ollama");
  assert.equal(r.verified, true);
  assert.equal(r.fellBack, false);
  assert.deepEqual(ids(r.ranked), ["eng.sld", "eng.merchant", "eng.taylor", "eng.kienzle"]);
});
test("rerank FAILURE: model throws -> fallback to lexical order", async () => {
  const run = async () => { throw new Error("ollama down"); };
  const r = await rerankCandidates({ query: "x", candidates: CANDS, run });
  assert.equal(r.source, "fallback");
  assert.equal(r.fellBack, true);
  assert.deepEqual(ids(r.ranked), ids(CANDS)); // unchanged
});
test("rerank FAILURE: model returns empty -> fallback", async () => {
  const r = await rerankCandidates({ query: "x", candidates: CANDS, run: async () => "" });
  assert.equal(r.source, "fallback");
  assert.deepEqual(ids(r.ranked), ids(CANDS));
});
test("rerank FAILURE: model returns only hallucinated ids -> fallback", async () => {
  const r = await rerankCandidates({ query: "x", candidates: CANDS, run: async () => "[ghost.a] [ghost.b]" });
  assert.equal(r.source, "fallback");
  assert.deepEqual(ids(r.ranked), ids(CANDS));
});
test("rerank FAILURE: resolves rejects a cited id -> fallback (lexical order preserved)", async () => {
  const run = async () => "[eng.taylor] [eng.kienzle]";
  const r = await rerankCandidates({ query: "x", candidates: CANDS, run, resolves: (id) => id !== "eng.taylor" });
  assert.equal(r.source, "fallback");
  assert.deepEqual(ids(r.ranked), ids(CANDS));
});
test("rerank ADVERSARIAL: model adds prose + one ghost id -> keeps valid ids, verified", async () => {
  const run = async () => "Here is my ranking:\n[eng.merchant] (most relevant)\n[ghost.x]\n[eng.sld]";
  const r = await rerankCandidates({ query: "shear", candidates: CANDS, run });
  assert.equal(r.source, "ollama");
  assert.equal(r.verified, true);
  // ghost.x filtered; merchant+sld promoted; kienzle+taylor appended in orig order
  assert.deepEqual(ids(r.ranked), ["eng.merchant", "eng.sld", "eng.kienzle", "eng.taylor"]);
});
test("rerank ADVERSARIAL: <2 candidates -> no model call, fallback", async () => {
  let called = false;
  const run = async () => { called = true; return "[only.one]"; };
  const r = await rerankCandidates({ query: "x", candidates: [{ id: "only.one", label: "x" }], run });
  assert.equal(called, false, "run must NOT be called for a trivial set");
  assert.equal(r.source, "fallback");
  assert.equal(r.reason, "too-few-candidates");
});
test("rerank: no run injected -> fallback (no-run)", async () => {
  const r = await rerankCandidates({ query: "x", candidates: CANDS });
  assert.equal(r.source, "fallback");
  assert.equal(r.reason, "no-run");
  assert.deepEqual(ids(r.ranked), ids(CANDS));
});
test("rerank: topK caps the candidate set before offload", async () => {
  let promptSeen = "";
  const run = async () => { promptSeen = "called"; return "[eng.taylor] [eng.kienzle]"; };
  const r = await rerankCandidates({ query: "x", candidates: CANDS, run, topK: 2 });
  assert.equal(promptSeen, "called");
  // only the first 2 candidates (kienzle, taylor) are in scope; reordered to taylor,kienzle
  assert.deepEqual(ids(r.ranked), ["eng.taylor", "eng.kienzle"]);
});
test("rerank: onResult telemetry sink receives a record", async () => {
  const recs = [];
  await rerankCandidates({ query: "x", candidates: CANDS, run: async () => "[eng.sld]", onResult: (rec) => recs.push(rec) });
  assert.equal(recs.length, 1);
  assert.equal(recs[0].source, "ollama");
});
