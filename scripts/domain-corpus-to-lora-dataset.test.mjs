// Tests for domain-corpus-to-lora-dataset.mjs pure functions + injectable pdftotext.
// Real reference-value + invariant assertions, no toBeDefined stubs (R9). (slot:papa 2026-06-24)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  loadRescued, isUsableText, cleanText, synthInstruction, toAlpacaPairs, pdfToText,
  distillPrompt, parseDistilled, distillViaOllama, buildPairsForEntry,
  parseCursorDoneSet, partitionByResumeCursor, parseCursorState, partitionForDistill,
  snapshotRawBaselineBeforeTruncate,
  MIN_TEXT_CHARS, MAX_OUTPUT_CHARS, ADVISORY_WEIGHT, SOURCE_TAG, MAX_DISTILL_ATTEMPTS,
} from "./domain-corpus-to-lora-dataset.mjs";

// In-memory fs so the snapshot helper is tested purely (no disk, no Ollama). filter(Boolean) row-count.
function memFs(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    store,
    readImpl: (p) => { if (!store.has(p)) throw new Error("ENOENT " + p); return store.get(p); },
    writeImpl: (p, c) => { store.set(p, c); },
    existsImpl: (p) => store.has(p),
  };
}
const ROWS = (n) => Array.from({ length: n }, (_, i) => JSON.stringify({ r: i })).join("\n") + "\n";

const REAL_TEXT = "The CIMCO post processor manual describes how to configure G-code output for Fanuc and Siemens controllers. " +
  "Section one covers the post processor structure, macros, and NC block formatting for milling and turning operations. " +
  "Each controller dialect defines tool change, spindle speed, and coolant commands used by the machine.";

// ----------------------------------------------------------------- loadRescued
test("loadRescued keeps only conf>=0.7 entries with non-empty domains", () => {
  const ovr = { decided: {
    a: { domains: ["mill"], conf: 0.9 },
    b: { domains: ["post-processor", "mill"], conf: 0.8 },
    c: { domains: ["mill"], conf: 0.5 },   // below conf -> drop
    d: { domains: [], conf: 1.0 },          // neither -> drop
  } };
  const r = loadRescued(ovr);
  assert.equal(r.length, 2);
  assert.deepEqual(r.map((x) => x.slug).sort(), ["a", "b"]);
  assert.deepEqual(r.find((x) => x.slug === "b").domains, ["post-processor", "mill"]);
});

test("loadRescued returns [] for empty/malformed overrides (failure + adversarial)", () => {
  assert.deepEqual(loadRescued({ decided: {} }), []);
  assert.deepEqual(loadRescued({}), []);
  assert.deepEqual(loadRescued(null), []);
  assert.deepEqual(loadRescued({ decided: { x: { conf: 0.9 } } }), []); // no domains key
});

// ----------------------------------------------------------------- isUsableText
test("isUsableText accepts real prose, rejects short/garbage/non-string", () => {
  assert.equal(isUsableText(REAL_TEXT), true);
  assert.equal(isUsableText("too short"), false);                       // < MIN_TEXT_CHARS
  assert.equal(isUsableText("@#$%^&*()".repeat(40)), false);            // symbol wall, < 30 words
  assert.equal(isUsableText(null), false);
  assert.equal(isUsableText(123), false);
  assert.equal(isUsableText(""), false);
});

test("isUsableText threshold is anchored to MIN_TEXT_CHARS (boundary)", () => {
  const justUnder = "ab ".repeat(Math.floor(MIN_TEXT_CHARS / 3) - 5);
  assert.equal(justUnder.length < MIN_TEXT_CHARS, true);
  assert.equal(isUsableText(justUnder), false);
});

// ----------------------------------------------------------------- cleanText
test("cleanText normalizes whitespace + form-feeds and bounds length", () => {
  assert.equal(cleanText("a\r\n\r\n\r\nb"), "a\n\nb");
  assert.equal(cleanText("x\f y"), "x\n y");
  assert.equal(cleanText("  spaced   out  "), "spaced out");
  const big = "word ".repeat(2000);
  const clipped = cleanText(big);
  assert.ok(clipped.length <= MAX_OUTPUT_CHARS + 4, `clipped ${clipped.length}`);
  assert.ok(clipped.endsWith("..."), "bounded text is ellipsized");
});

test("cleanText handles non-string (adversarial)", () => {
  assert.equal(cleanText(null), "");
  assert.equal(cleanText(undefined), "");
  assert.equal(cleanText(42), "");
});

// ------------------------------------------------------------- synthInstruction
test("synthInstruction is domain-aware, includes title, strips .pdf", () => {
  const ins = synthInstruction("post-processor", "Post Processor Manual.pdf", "manual-pdf");
  assert.ok(/post-processor \/ G-code/i.test(ins), "post-proc label");
  assert.ok(ins.includes("Post Processor Manual"), "title");
  assert.ok(!ins.includes(".pdf"), "no .pdf extension leaked");
  // unknown domain falls back to the raw domain token (no throw)
  assert.ok(synthInstruction("frobnicate", "X", "k").includes("frobnicate"));
});

// --------------------------------------------------------------- toAlpacaPairs
test("toAlpacaPairs emits ONE Alpaca pair per domain (multi-label) with the full schema", () => {
  const entry = { slug: "cimco_pp", domains: ["post-processor", "mill"] };
  const sig = { title: "Post Processor Manual", kind: "manual-pdf", source: "H:/x/pp.pdf" };
  const pairs = toAlpacaPairs(entry, sig, REAL_TEXT);
  assert.equal(pairs.length, 2);
  const domains = pairs.map((p) => p.domain).sort();
  assert.deepEqual(domains, ["mill", "post-processor"]);
  for (const p of pairs) {
    assert.equal(typeof p.instruction, "string");
    assert.ok(p.instruction.length > 0);
    assert.ok(p.input.includes(`domain=${p.domain}`));
    assert.ok(p.output.includes("CIMCO post processor"), "output carries the real text");
    assert.equal(p.advisory, true);
    assert.equal(p.weight, ADVISORY_WEIGHT);
    assert.equal(p.spawned_by, SOURCE_TAG);
    assert.equal(p.slug, "cimco_pp");
  }
});

test("toAlpacaPairs emits NOTHING when text is unusable (GIGO-safe failure mode)", () => {
  const entry = { slug: "s", domains: ["mill"] };
  const sig = { title: "T", kind: "k", source: "x" };
  assert.deepEqual(toAlpacaPairs(entry, sig, "short"), []);   // below MIN_TEXT_CHARS
  assert.deepEqual(toAlpacaPairs(entry, sig, ""), []);
  assert.deepEqual(toAlpacaPairs(entry, sig, null), []);
});

// ------------------------------------------------------------------- pdfToText
test("pdfToText returns '' on non-zero exit / missing file (injected spawn, no real PDF)", () => {
  // missing file -> '' without spawning
  assert.equal(pdfToText("H:/does/not/exist.pdf", 3, () => { throw new Error("should not spawn"); }), "");
});

test("pdfToText returns stdout on success, '' on failure (injected spawn)", () => {
  // Use an existing file path (this test file itself) so the existsSync guard passes,
  // then drive the spawn result via the injected impl.
  const self = new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
  const okSpawn = () => ({ status: 0, stdout: REAL_TEXT });
  const failSpawn = () => ({ status: 1, stdout: "" });
  assert.equal(pdfToText(self, 6, okSpawn), REAL_TEXT);
  assert.equal(pdfToText(self, 6, failSpawn), "");
  assert.equal(pdfToText(self, 6, () => ({ status: 0, stdout: "" })), "");
});

test("pdfToText catches a spawn THROW on an existing file -> '' (covers the try/catch, not just existsSync)", () => {
  const self = new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
  assert.equal(pdfToText(self, 6, () => { throw new Error("spawn boom"); }), "");
});

// ---------------------------------------- control-byte GIGO (3-of-3 arm C P1: training-data poison)
const CTRL = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;
test("cleanText strips C0/C1/DEL control bytes (no binary noise reaches a LoRA row)", () => {
  const dirty = "Fanuc\x00 post\x07 manual\x1F line\x7F end\x0B here and more real words to pass the gate";
  const out = cleanText(dirty);
  assert.equal(CTRL.test(out), false, "no control bytes survive cleanText");
  assert.ok(out.includes("Fanuc") && out.includes("manual"), "real words preserved");
});

test("synthInstruction strips control bytes from the title (instruction never carries them)", () => {
  const ins = synthInstruction("post-processor", "Fanuc\x00Post\x07Manual.pdf", "manual-pdf");
  assert.equal(CTRL.test(ins), false, "no control bytes in instruction");
  assert.ok(ins.includes("Fanuc"), "title content preserved");
});

test("toAlpacaPairs output + instruction are control-byte-free even from dirty PDF text/title (GIGO)", () => {
  const entry = { slug: "s", domains: ["mill"] };
  const sig = { title: "Dirty\x07Title", kind: "k", source: "x" };
  const dirtyText = REAL_TEXT + "\x00\x07\x1F\x7F" + REAL_TEXT;   // long enough to pass isUsableText
  const pairs = toAlpacaPairs(entry, sig, dirtyText);
  assert.equal(pairs.length, 1);
  assert.equal(CTRL.test(pairs[0].output), false, "output is control-byte-free");
  assert.equal(CTRL.test(pairs[0].instruction), false, "instruction is control-byte-free");
});

// ---------------------------------------------- distill mode (--distill, local Ollama Q&A)
test("distillPrompt embeds domain label + title + bounded source text + asks for JSON Q&A", () => {
  const p = distillPrompt("post-processor", "CIMCO Manual", REAL_TEXT);
  assert.ok(/post-processor \/ G-code/.test(p), "domain label present");
  assert.ok(p.includes("CIMCO Manual"), "title present");
  assert.ok(p.includes("SOURCE TEXT:"), "source section present");
  assert.ok(/JSON/.test(p) && p.includes("instruction") && p.includes("answer"), "asks for JSON Q&A");
});

test("parseDistilled accepts a valid pair, sanitizes control bytes, rejects weak/garbage (GIGO)", () => {
  const ok = parseDistilled(JSON.stringify({ instruction: "How does the CIMCO post format G-code blocks?", answer: REAL_TEXT }));
  assert.equal(typeof ok.instruction, "string");
  assert.ok(ok.output.includes("CIMCO"), "answer carried into output");
  assert.equal(CTRL.test(ok.output + ok.instruction), false, "control-byte-free");
  assert.equal(parseDistilled(JSON.stringify({ instruction: "Q?" })), null, "missing answer -> null");
  assert.equal(parseDistilled(JSON.stringify({ instruction: "x", answer: "short" })), null, "too short -> null");
  assert.equal(parseDistilled("not json"), null, "non-json -> null");
  assert.equal(parseDistilled(null), null, "null -> null");
});

test("parseDistilled strips control bytes from a dirty distilled answer", () => {
  const r = parseDistilled(JSON.stringify({ instruction: "A real question about the post processor here?", answer: "Real\x00 grounded\x07 answer with enough real words present to pass the distill floor and stay factual content." }));
  assert.equal(CTRL.test(r.output), false, "control bytes stripped");
});

test("distillViaOllama returns the parsed pair on a good response, null on fetch failure (injected fetch)", async () => {
  const good = async () => ({ json: async () => ({ response: JSON.stringify({ instruction: "What controllers does the CIMCO post support?", answer: REAL_TEXT }) }) });
  const r = await distillViaOllama(REAL_TEXT, "post-processor", "CIMCO", { fetchImpl: good });
  assert.equal(typeof r.instruction, "string");
  assert.ok(r.output.includes("CIMCO"), "distilled answer carried");
  const bad = async () => { throw new Error("ollama down"); };
  assert.equal(await distillViaOllama(REAL_TEXT, "mill", "X", { fetchImpl: bad, sleepImpl: () => {} }), null, "fetch throw (after retries) -> null");
});

// --------------------- distill keep_alive + in-call retry (the VRAM-eviction wedge ROOT fix)
test("distillViaOllama retries a transient failure then succeeds in-call (VRAM-evict self-heal)", async () => {
  let calls = 0;
  const flaky = async () => {
    if (++calls < 3) throw new Error("model evicted / loading");   // 2 transient failures, then succeed
    return { json: async () => ({ response: JSON.stringify({ instruction: "What does the CIMCO post define for the tool-change block?", answer: REAL_TEXT }) }) };
  };
  const r = await distillViaOllama(REAL_TEXT, "post-processor", "CIMCO", { fetchImpl: flaky, sleepImpl: () => {}, retries: 3 });
  assert.ok(r && r.output.includes("CIMCO"), "recovers after the transient eviction");
  assert.equal(calls, 3, "retried until the model was resident");
});

test("distillViaOllama sets keep_alive in the request body (keeps the model resident)", async () => {
  let body = "";
  const spy = async (_url, opts) => { body = String(opts.body); return { json: async () => ({ response: JSON.stringify({ instruction: "A real post-processor question about NC block output?", answer: REAL_TEXT }) }) }; };
  await distillViaOllama(REAL_TEXT, "post-processor", "X", { fetchImpl: spy, sleepImpl: () => {} });
  assert.ok(body.includes("keep_alive"), "request body carries keep_alive");
});

test("buildPairsForEntry: raw when distill=false; distilled when ok; RAW FALLBACK when Ollama fails (GIGO)", async () => {
  const entry = { slug: "s", domains: ["post-processor"] };
  const sig = { title: "CIMCO Manual", kind: "manual-pdf", source: "x" };
  const rawOnly = await buildPairsForEntry(entry, sig, REAL_TEXT, { distill: false });
  assert.equal(rawOnly[0].distilled, undefined, "raw mode = no distilled flag");

  const ok = async () => ({ json: async () => ({ response: JSON.stringify({ instruction: "How does the CIMCO post handle tool change blocks?", answer: REAL_TEXT }) }) });
  const distilled = await buildPairsForEntry(entry, sig, REAL_TEXT, { distill: true, fetchImpl: ok });
  assert.equal(distilled[0].distilled, true, "distill mode flags the pair");
  assert.ok(distilled[0].instruction.includes("tool change"), "uses the distilled instruction");

  const fail = async () => { throw new Error("down"); };
  const fallback = await buildPairsForEntry(entry, sig, REAL_TEXT, { distill: true, fetchImpl: fail, sleepImpl: () => {} });
  assert.equal(fallback[0].distilled, undefined, "Ollama failure -> raw fallback (never blocks)");
});

// ------------------------------- reap-resumable streaming (--distill survives the fleet-reaper kill)
test("parseCursorDoneSet collects every recorded slug, tolerates a torn final line + blanks (R12)", () => {
  const txt = [
    JSON.stringify({ slug: "a", n: 2, ts: "t" }),
    JSON.stringify({ slug: "b", n: 0, ts: "t" }),   // no-text spec is still 'done' -> no re-distill
    "",                                              // blank line tolerated
    '{"slug":"c","n":1,ts',                          // torn last line on a kill -> skipped, not fatal
  ].join("\n");
  const done = parseCursorDoneSet(txt);
  assert.ok(done instanceof Set);
  assert.equal(done.size, 2);
  assert.ok(done.has("a") && done.has("b"));
  assert.equal(done.has("c"), false, "torn line did not register -> c re-processes (safe, idempotent)");
});

test("parseCursorDoneSet returns an empty Set for empty/non-string/garbage (fresh run + adversarial)", () => {
  assert.equal(parseCursorDoneSet("").size, 0);
  assert.equal(parseCursorDoneSet(null).size, 0);
  assert.equal(parseCursorDoneSet(undefined).size, 0);
  assert.equal(parseCursorDoneSet(12345).size, 0);
  assert.equal(parseCursorDoneSet("not json\n{bad").size, 0);
  assert.equal(parseCursorDoneSet(JSON.stringify({ n: 1 })).size, 0, "a row with no slug contributes nothing");
});

test("partitionByResumeCursor splits rescued into todo/skipped by the done set (resume invariant)", () => {
  const rescued = [{ slug: "a", domains: ["mill"] }, { slug: "b", domains: ["lathe"] }, { slug: "c", domains: ["wedm"] }];
  const { todo, skipped } = partitionByResumeCursor(rescued, new Set(["b"]));
  assert.deepEqual(todo.map((e) => e.slug), ["a", "c"], "already-done 'b' is skipped, the rest re-run");
  assert.deepEqual(skipped.map((e) => e.slug), ["b"]);
  // partition is total + disjoint: every rescued entry lands in exactly one bucket
  assert.equal(todo.length + skipped.length, rescued.length);
});

test("partitionByResumeCursor: empty done -> all todo (fresh run); full done -> all skipped (run complete)", () => {
  const rescued = [{ slug: "a", domains: ["mill"] }, { slug: "b", domains: ["lathe"] }];
  assert.equal(partitionByResumeCursor(rescued, new Set()).todo.length, 2, "fresh: everything to do");
  assert.equal(partitionByResumeCursor(rescued, new Set(["a", "b"])).skipped.length, 2, "complete: nothing left");
  // adversarial: non-Set doneSet + non-array rescued never throw
  assert.deepEqual(partitionByResumeCursor(rescued, null).todo.map((e) => e.slug), ["a", "b"]);
  assert.deepEqual(partitionByResumeCursor(null, new Set()).todo, []);
});

test("partitionByResumeCursor: an orphan cursor slug (in cursor, NOT in rescued) is a safe no-op", () => {
  // The overrides sidecar can shrink between runs -> a cursor may name a slug no longer rescued.
  // partition only iterates `rescued`, so the orphan simply never appears in either bucket (no throw, no drop).
  const rescued = [{ slug: "a", domains: ["mill"] }];
  const { todo, skipped } = partitionByResumeCursor(rescued, new Set(["a", "ghost-removed-slug"]));
  assert.deepEqual(todo.map((e) => e.slug), []);
  assert.deepEqual(skipped.map((e) => e.slug), ["a"]);
  assert.equal(todo.length + skipped.length, rescued.length, "orphan does not inflate either bucket");
});

test("parseCursorDoneSet collapses a duplicate slug (a crash-window re-append is idempotent via Set)", () => {
  // data-first at-least-once: a killed+resumed run can write a slug's cursor line twice -> the Set
  // collapses it, so the done-set stays correct and the slug is not double-skipped/double-counted.
  const txt = [
    JSON.stringify({ slug: "dup", n: 2, ts: "t1" }),
    JSON.stringify({ slug: "dup", n: 2, ts: "t2" }),
    JSON.stringify({ slug: "other", n: 1, ts: "t3" }),
  ].join("\n");
  const done = parseCursorDoneSet(txt);
  assert.equal(done.size, 2, "duplicate 'dup' counted once");
  assert.ok(done.has("dup") && done.has("other"));
});

// ----------------- distill-retry: a raw-fallback spec retries until it distils OR hits the cap
test("parseCursorState tracks distilled-ever + attempts-count per slug (multi-line aggregation)", () => {
  const txt = [
    JSON.stringify({ slug: "a", n: 0, distilled: false, attempts: 1, ts: "t1" }),   // a: fallback attempt 1
    JSON.stringify({ slug: "a", n: 2, distilled: 2, attempts: 2, ts: "t2" }),        // a: distilled on attempt 2
    JSON.stringify({ slug: "b", n: 0, distilled: false, attempts: 1, ts: "t3" }),    // b: fallback once
  ].join("\n");
  const st = parseCursorState(txt);
  assert.equal(st.get("a").distilled, true, "a distilled on a later attempt -> sticky true");
  assert.equal(st.get("a").attempts, 2, "a seen twice -> 2 attempts");
  assert.equal(st.get("b").distilled, false, "b never distilled");
  assert.equal(st.get("b").attempts, 1);
  // distilled accepts the boolean form too (true), not only the numeric count
  const st2 = parseCursorState(JSON.stringify({ slug: "c", distilled: true, attempts: 1 }));
  assert.equal(st2.get("c").distilled, true);
});

test("partitionForDistill: distilled OR attempts>=cap is done; a raw fallback under cap is retried", () => {
  const rescued = [{ slug: "got" }, { slug: "retry" }, { slug: "capped" }, { slug: "fresh" }];
  const state = new Map([
    ["got", { distilled: true, attempts: 1 }],                          // distilled -> done
    ["retry", { distilled: false, attempts: 1 }],                       // fallback, under cap -> retry
    ["capped", { distilled: false, attempts: MAX_DISTILL_ATTEMPTS }],   // exhausted -> done (keep raw)
    // "fresh" absent from cursor -> todo
  ]);
  const { todo, done } = partitionForDistill(rescued, state);
  assert.deepEqual(todo.map((e) => e.slug).sort(), ["fresh", "retry"], "only the still-distillable fallback + the fresh spec are re-run");
  assert.deepEqual(done.map((e) => e.slug).sort(), ["capped", "got"]);
  assert.equal(todo.length + done.length, rescued.length, "total + disjoint");
});

test("partitionForDistill honors a custom cap + survives non-Map/non-array adversarial inputs", () => {
  const rescued = [{ slug: "x" }];
  assert.equal(partitionForDistill(rescued, new Map([["x", { distilled: false, attempts: 1 }]]), 1).done.length, 1, "cap=1 -> 1 attempt is already done");
  assert.equal(partitionForDistill(rescued, new Map([["x", { distilled: false, attempts: 1 }]]), 2).todo.length, 1, "cap=2 -> still retried");
  assert.deepEqual(partitionForDistill(rescued, null).todo.map((e) => e.slug), ["x"], "no cursor -> retry/fresh");
  assert.deepEqual(partitionForDistill(null, new Map()).todo, []);
});

// --------------------------------------------------- snapshotRawBaselineBeforeTruncate
const OUT = "/x/lora/domain-knowledge-dataset.jsonl";
const BASE = "/x/lora/domain-knowledge-dataset.raw-baseline.jsonl";

test("snapshot: happy path snapshots a populated output before truncate (byte-identical)", () => {
  const m = memFs({ [OUT]: ROWS(3) });
  const r = snapshotRawBaselineBeforeTruncate(OUT, m);
  assert.equal(r.snapshotted, true);
  assert.equal(r.reason, "snapshotted");
  assert.equal(r.rows, 3, "rows = non-blank line count");
  assert.equal(r.baselinePath, BASE, ".jsonl suffix replaced, not duplicated");
  assert.equal(m.store.get(BASE), ROWS(3), "baseline is a byte-identical copy of the live output");
});

test("snapshot: no-op when output is absent (no baseline written)", () => {
  const m = memFs({});
  const r = snapshotRawBaselineBeforeTruncate(OUT, m);
  assert.equal(r.snapshotted, false);
  assert.equal(r.reason, "no-existing-output");
  assert.equal(m.store.has(BASE), false, "nothing written when there is nothing to preserve");
});

test("snapshot: no-op when output exists but has zero data rows (blank/whitespace)", () => {
  const m = memFs({ [OUT]: "\n  \n\n" });
  const r = snapshotRawBaselineBeforeTruncate(OUT, m);
  assert.equal(r.snapshotted, false);
  assert.equal(r.reason, "empty-output");
  assert.equal(m.store.has(BASE), false, "an empty output is not a baseline worth keeping");
});

test("snapshot SHRINK-GUARD: a smaller current output must NOT clobber a larger existing baseline (the P0-adjacent footgun)", () => {
  // 2nd fresh-cursor run over an already-partial output (2 rows) must preserve the good 5-row baseline.
  const m = memFs({ [OUT]: ROWS(2), [BASE]: ROWS(5) });
  const r = snapshotRawBaselineBeforeTruncate(OUT, m);
  assert.equal(r.snapshotted, false);
  assert.equal(r.reason, "kept-larger-baseline");
  assert.equal(r.rows, 5, "reports the preserved baseline's row count");
  assert.equal(m.store.get(BASE), ROWS(5), "the larger baseline is untouched -- a partial re-run cannot destroy recovery");
});

test("snapshot: an equal-or-larger current output DOES refresh the baseline", () => {
  const mEqual = memFs({ [OUT]: ROWS(3), [BASE]: ROWS(3) });
  assert.equal(snapshotRawBaselineBeforeTruncate(OUT, mEqual).snapshotted, true, "equal rows -> refresh allowed (prevRows>curRows is false)");
  const mLarger = memFs({ [OUT]: ROWS(7), [BASE]: ROWS(4) });
  const r = snapshotRawBaselineBeforeTruncate(OUT, mLarger);
  assert.equal(r.snapshotted, true);
  assert.equal(r.rows, 7);
  assert.equal(mLarger.store.get(BASE), ROWS(7), "a fuller current output updates the baseline forward");
});

test("snapshot: baselinePath derivation handles a non-.jsonl outPath without dropping chars", () => {
  const m = memFs({ "/x/data": ROWS(1) });
  const r = snapshotRawBaselineBeforeTruncate("/x/data", m);
  assert.equal(r.baselinePath, "/x/data.raw-baseline.jsonl", "no .jsonl -> suffix appended, base name intact");
  assert.equal(m.store.get("/x/data.raw-baseline.jsonl"), ROWS(1));
});

test("snapshot FAIL-SOFT: an I/O throw (e.g. V8 string cap, ENOSPC) must NOT propagate -- the safety net never blocks the distill it protects", () => {
  // existsImpl says the output is there, but readImpl throws (the exact destructive class: a >512MiB
  // utf8 readFileSync). The helper must swallow it and report -- NOT throw, so the caller truncates on.
  const boom = () => { throw new Error("Cannot create a string longer than 0x1fffffe8 characters"); };
  let r;
  assert.doesNotThrow(() => { r = snapshotRawBaselineBeforeTruncate(OUT, { existsImpl: () => true, readImpl: boom, writeImpl: () => {} }); });
  assert.equal(r.snapshotted, false);
  assert.equal(r.reason, "snapshot-error");
  assert.match(r.error, /0x1fffffe8|longer than/, "carries the underlying error message for the loud warn");
  // a writeImpl failure (read-only dir / ENOSPC) is also swallowed, not propagated
  let r2;
  assert.doesNotThrow(() => { r2 = snapshotRawBaselineBeforeTruncate(OUT, { existsImpl: (p) => p === OUT, readImpl: () => ROWS(3), writeImpl: () => { throw new Error("EROFS read-only"); } }); });
  assert.equal(r2.reason, "snapshot-error");
});
