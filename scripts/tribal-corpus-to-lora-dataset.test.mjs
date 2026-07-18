#!/usr/bin/env node
/**
 * Tests for tribal-corpus-to-lora-dataset.mjs (slot:papa 2026-06-25).
 *
 * R9 intent under test (each test fails if the business rule breaks):
 *  - the POINTER tip is NEVER the LoRA output -- the output comes from the source PDF text, so a
 *    "read X.md" tribal tip can never poison a training row (the whole reason this converter exists);
 *  - the overlap-guard keeps it strictly ADDITIVE vs domain-knowledge-lora (no duplicate (slug,domain) row);
 *  - tribal rows are grouped by slug into the multi-domain entry shape so the slug-keyed cursor + the
 *    multi-label emit both hold;
 *  - GIGO: a structurally-bad row (no slug/domain/source) and unusable PDF text emit NOTHING;
 *  - provenance is re-tagged to this converter.
 *
 * Run: node scripts/tribal-corpus-to-lora-dataset.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPairsForEntry } from "./domain-corpus-to-lora-dataset.mjs";
import {
  tribalCorpusFiles, tribalRowToAdapter, loadOverlapKeys, loadTribalEntries, retagTribal, cursorPathFor,
  clobberLostDomains, progressLine, PROGRESS_EVERY, DEFAULT_DOMAINS, SOURCE_TAG,
} from "./tribal-corpus-to-lora-dataset.mjs";

// real pointer-tip + real-looking PDF body, drawn from the live cam-tribal-corpus.jsonl shape
const POINTER_TIP = "CAM training reference (kind=other-pdf): read AUTOGEN-EXTRACT-SPEC-cimco_post.md for extraction plan, then ingest source file. Bridges 1 engine(s) + 1 dispatcher(s).";
const PDF_BODY = "The CNC-Calc post processor basic configuration defines the line termination sequence as carriage-return line-feed. " +
  "The program number block uses the O-word address. Tool change calls M6 after the T word selects the pocket. " +
  "Coolant is commanded by M8 (flood) and cancelled by M9. Rapid moves use G0 and feed moves use G1 with an F word in millimetres per minute.";

function camRow(over = {}) {
  return {
    ts: "2026-06-24T17:50:28.107Z", schemaVersion: "1.0.0", domain: "cam",
    slug: "cimco_post", id: "cimco-2025/CNC-Calc Post.pdf", kind: "other-pdf",
    source: "H:\\PRISM\\resources\\cimco-2025\\CNC-Calc Post.pdf",
    source_type: "pdf", tip: POINTER_TIP, advisory: true, must_human_verify: true, ...over,
  };
}

// ---- tribalCorpusFiles ----
test("tribalCorpusFiles: default -> only cad,cam corpus files (operator tick #2b)", () => {
  const fake = ["cam-tribal-corpus.jsonl", "cad-tribal-corpus.jsonl", "mill-tribal-corpus.jsonl", "README.md", "notes.txt"];
  const got = tribalCorpusFiles("/x", null, () => fake).map((f) => f.domain).sort();
  assert.deepEqual(got, ["cad", "cam"]);
  assert.deepEqual([...DEFAULT_DOMAINS].sort(), ["cad", "cam"]);
});

test("tribalCorpusFiles: 'all' -> every *-tribal-corpus.jsonl (all-means-all widening)", () => {
  const fake = ["cam-tribal-corpus.jsonl", "mill-tribal-corpus.jsonl", "wedm-tribal-corpus.jsonl", "x.jsonl"];
  const got = tribalCorpusFiles("/x", "all", () => fake).map((f) => f.domain).sort();
  assert.deepEqual(got, ["cam", "mill", "wedm"]);
});

test("tribalCorpusFiles: explicit domain filter + missing dir -> []", () => {
  const fake = ["cam-tribal-corpus.jsonl", "mill-tribal-corpus.jsonl"];
  assert.deepEqual(tribalCorpusFiles("/x", ["mill"], () => fake).map((f) => f.domain), ["mill"]);
  assert.deepEqual(tribalCorpusFiles("/x", null, () => { throw new Error("ENOENT"); }), []);
});

// ---- tribalRowToAdapter ----
test("tribalRowToAdapter: valid row -> adapter with backslash source normalized + id as title", () => {
  const a = tribalRowToAdapter(camRow());
  assert.equal(a.slug, "cimco_post");
  assert.equal(a.domain, "cam");
  assert.equal(a.signal.source, "H:/PRISM/resources/cimco-2025/CNC-Calc Post.pdf"); // backslashes -> forward
  assert.equal(a.signal.title, "cimco-2025/CNC-Calc Post.pdf");
  assert.equal(a.signal.kind, "other-pdf");
});

test("tribalRowToAdapter: structurally-bad rows -> null (GIGO at the gate)", () => {
  assert.equal(tribalRowToAdapter(null), null);
  assert.equal(tribalRowToAdapter({ domain: "cam", source: "x.pdf" }), null);          // no slug
  assert.equal(tribalRowToAdapter({ slug: "s", source: "x.pdf" }), null);              // no domain
  assert.equal(tribalRowToAdapter({ slug: "s", domain: "cam" }), null);                // no source
  assert.equal(tribalRowToAdapter({ slug: "s", domain: "cam", source: "" }), null);    // empty source
});

test("tribalRowToAdapter: falls back to slug as title when id missing", () => {
  const a = tribalRowToAdapter(camRow({ id: undefined }));
  assert.equal(a.signal.title, "cimco_post");
});

// ---- loadOverlapKeys ----
test("loadOverlapKeys: reads (slug|domain) keys from domain-knowledge dataset; missing -> empty", () => {
  const ds = [
    JSON.stringify({ slug: "a", domain: "cam", output: "x" }),
    JSON.stringify({ slug: "b", domain: "post-processor", output: "y" }),
    "   ", "{torn", // blank + torn lines tolerated
  ].join("\n");
  const keys = loadOverlapKeys("/ds", () => ds);
  assert.ok(keys.has("a|cam"));
  assert.ok(keys.has("b|post-processor"));
  assert.equal(keys.size, 2);
  assert.equal(loadOverlapKeys("/missing", () => { throw new Error("ENOENT"); }).size, 0);
});

// ---- loadTribalEntries ----
test("loadTribalEntries: groups by slug into multi-domain entry shape", () => {
  const camFile = [JSON.stringify(camRow()), JSON.stringify(camRow({ domain: "post-processor" }))].join("\n");
  const files = [{ domain: "cam", path: "/cam" }];
  const entries = loadTribalEntries(files, { readImpl: () => camFile });
  assert.equal(entries.length, 1);                              // one slug
  assert.deepEqual(entries[0].entry.domains.sort(), ["cam", "post-processor"]); // both domains grouped
  assert.equal(entries[0].entry.slug, "cimco_post");
  assert.equal(entries[0].signal.source, "H:/PRISM/resources/cimco-2025/CNC-Calc Post.pdf");
});

test("loadTribalEntries: overlap-guard drops a (slug,domain) already in domain-knowledge-lora", () => {
  const camFile = [JSON.stringify(camRow()), JSON.stringify(camRow({ domain: "post-processor" }))].join("\n");
  const files = [{ domain: "cam", path: "/cam" }];
  // post-processor for this slug is already covered by domain-knowledge-lora -> only cam survives
  const overlapKeys = new Set(["cimco_post|post-processor"]);
  const entries = loadTribalEntries(files, { overlapKeys, readImpl: () => camFile });
  assert.equal(entries.length, 1);
  assert.deepEqual(entries[0].entry.domains, ["cam"]);          // post-processor dropped (additive)
});

test("loadTribalEntries: a slug whose EVERY domain overlaps is dropped entirely", () => {
  const camFile = JSON.stringify(camRow());
  const files = [{ domain: "cam", path: "/cam" }];
  const entries = loadTribalEntries(files, { overlapKeys: new Set(["cimco_post|cam"]), readImpl: () => camFile });
  assert.equal(entries.length, 0);
});

test("loadTribalEntries: within-corpus duplicate (slug,domain) de-duped; bad rows skipped", () => {
  const camFile = [
    JSON.stringify(camRow()), JSON.stringify(camRow()),             // exact dup
    JSON.stringify({ slug: "s2", domain: "cam" }),                  // no source -> skipped
    "{not json", "",
  ].join("\n");
  const entries = loadTribalEntries([{ domain: "cam", path: "/cam" }], { readImpl: () => camFile });
  assert.equal(entries.length, 1);
  assert.deepEqual(entries[0].entry.domains, ["cam"]);
});

test("loadTribalEntries: unreadable file is skipped, not fatal", () => {
  const files = [{ domain: "cam", path: "/bad" }, { domain: "cad", path: "/good" }];
  const readImpl = (p) => { if (p === "/bad") throw new Error("EACCES"); return JSON.stringify(camRow({ domain: "cad", slug: "draw1" })); };
  const entries = loadTribalEntries(files, { readImpl });
  assert.equal(entries.length, 1);
  assert.equal(entries[0].entry.slug, "draw1");
});

// ---- retagTribal ----
test("retagTribal: overrides provenance to this converter (behaviour-neutral)", () => {
  const out = retagTribal([{ instruction: "i", output: "o", domain: "cam", spawned_by: "domain-corpus-to-lora-dataset.mjs" }]);
  assert.equal(out[0].spawned_by, SOURCE_TAG);
  assert.equal(out[0].from, "tribal-corpus");
  assert.equal(out[0].instruction, "i"); // payload untouched
  assert.deepEqual(retagTribal(null), []);
});

// ---- cursorPathFor: domain-set-keyed resume cursor (arm-A P2 fix: no silent label drop on widening) ----
test("cursorPathFor: default + explicit cad,cam share one cursor; widening gets its own (no silent drop)", () => {
  const out = "/x/tribal-knowledge-dataset.jsonl";
  // default (no --domains) and explicit cad,cam -> SAME cursor (same sorted set) so they resume together
  assert.equal(cursorPathFor(out, null), "/x/tribal-knowledge-dataset.jsonl.cad-cam.cursor.jsonl");
  assert.equal(cursorPathFor(out, ["cad", "cam"]), cursorPathFor(out, null));
  assert.equal(cursorPathFor(out, ["cam", "cad"]), cursorPathFor(out, null)); // order-independent (sorted)
  // a WIDER set gets a DISTINCT cursor -> --domains all does NOT reuse the cad/cam cursor (the P2 bug)
  assert.notEqual(cursorPathFor(out, ["all"]), cursorPathFor(out, null));
  assert.equal(cursorPathFor(out, ["all"]), "/x/tribal-knowledge-dataset.jsonl.all.cursor.jsonl");
  assert.notEqual(cursorPathFor(out, ["cad", "cam", "mill"]), cursorPathFor(out, ["cad", "cam"]));
  assert.deepEqual([...DEFAULT_DOMAINS].sort(), ["cad", "cam"]);
});

// ---- clobberLostDomains: R12 loud-clobber guard (reverse-order misuse, residual P2) ----
test("clobberLostDomains: a narrower set after a wider output surfaces the at-risk domains", () => {
  const wider = [
    JSON.stringify({ domain: "cam", output: "x" }),
    JSON.stringify({ domain: "post-processor", output: "y" }),
    JSON.stringify({ domain: "mill", output: "z" }),
    JSON.stringify({ domain: "cad", output: "w" }),
  ];
  // default/cad,cam run truncating an all-domains output -> mill + post-processor would be discarded
  assert.deepEqual(clobberLostDomains(wider, null), ["mill", "post-processor"]);
  assert.deepEqual(clobberLostDomains(wider, ["cad", "cam"]), ["mill", "post-processor"]);
  // "all" covers everything -> never a clobber warning
  assert.deepEqual(clobberLostDomains(wider, ["all"]), []);
  // same-or-wider set -> nothing lost
  assert.deepEqual(clobberLostDomains(wider, ["cad", "cam", "mill", "post-processor"]), []);
  // forward order (cad/cam output, then cad/cam re-run) -> nothing lost
  assert.deepEqual(clobberLostDomains([JSON.stringify({ domain: "cam", output: "x" })], ["cad", "cam"]), []);
  // empty / torn lines tolerated
  assert.deepEqual(clobberLostDomains(["", "{torn", JSON.stringify({ domain: "wedm", output: "q" })], ["cad", "cam"]), ["wedm"]);
});

// ---- progressLine: long --distill run observability (silent-run / idle-kill resistance) ----
test("progressLine: formats a counts+percent progress line; PROGRESS_EVERY is a positive int", () => {
  assert.equal(
    progressLine(50, 398, 24, 6, 20),
    "  distill progress: 50/398 entries (13%) -- distilled 24, raw-fallback 6, no-text 20",
  );
  assert.equal(progressLine(0, 0, 0, 0, 0), "  distill progress: 0/0 entries (0%) -- distilled 0, raw-fallback 0, no-text 0"); // no divide-by-zero
  assert.equal(progressLine(398, 398, 390, 8, 0).includes("398/398 entries (100%)"), true);
  assert.ok(Number.isInteger(PROGRESS_EVERY) && PROGRESS_EVERY > 0);
});

// ---- integration: the POINTER tip never becomes the output; output is the PDF text ----
test("integration: raw pairs use the PDF body as output, NEVER the pointer tip (anti-GIGO)", async () => {
  const a = tribalRowToAdapter(camRow());
  const entry = { slug: a.slug, domains: ["cam", "post-processor"] };
  const pairs = retagTribal(await buildPairsForEntry(entry, a.signal, PDF_BODY, {})); // distill=false -> raw
  assert.equal(pairs.length, 2);                               // multi-label: one per domain
  for (const p of pairs) {
    assert.ok(p.output.includes("post processor basic configuration") || p.output.includes("line termination"));
    assert.ok(!p.output.includes("AUTOGEN-EXTRACT-SPEC"));     // pointer tip text NEVER leaks into output
    assert.ok(!p.output.includes("read AUTOGEN"));
    assert.equal(p.spawned_by, SOURCE_TAG);
    assert.equal(p.from, "tribal-corpus");
    assert.equal(p.advisory, true);
  }
  assert.deepEqual(pairs.map((p) => p.domain).sort(), ["cam", "post-processor"]);
});

test("integration: unusable PDF text emits NOTHING (GIGO -- short/garbage extraction)", async () => {
  const a = tribalRowToAdapter(camRow());
  const entry = { slug: a.slug, domains: ["cam"] };
  assert.deepEqual(await buildPairsForEntry(entry, a.signal, "x x x", {}), []);          // too short
  assert.deepEqual(await buildPairsForEntry(entry, a.signal, "", {}), []);               // empty
  assert.deepEqual(await buildPairsForEntry(entry, a.signal, POINTER_TIP, {}), []);      // pointer-only short text -> gated out
});

test("integration: --distill path yields a grounded Q&A pair, tagged tribal", async () => {
  const a = tribalRowToAdapter(camRow());
  const entry = { slug: a.slug, domains: ["cam"] };
  // injected Ollama: returns a valid distilled {instruction, answer}
  const fetchImpl = async () => ({
    json: async () => ({ response: JSON.stringify({ instruction: "What sequence terminates a line in the CNC-Calc post?", answer: "The post terminates each line with a carriage-return line-feed sequence per its basic configuration." }) }),
  });
  const pairs = retagTribal(await buildPairsForEntry(entry, a.signal, PDF_BODY, { distill: true, fetchImpl }));
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].distilled, true);
  assert.match(pairs[0].instruction, /terminates a line/);
  assert.ok(!pairs[0].output.includes("AUTOGEN"));
  assert.equal(pairs[0].spawned_by, SOURCE_TAG);
});
