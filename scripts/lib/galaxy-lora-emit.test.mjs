/**
 * Tests for galaxy-lora-emit.mjs (AI-SYNERGY-AUDIT-MS0/U-AISYN-LORA-EMIT).
 * Reference-value tests for the Alpaca pair builder + fail-soft id-deduped append. Run:
 *   node --test scripts/lib/galaxy-lora-emit.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loraPairId, buildLoraPair, appendLoraPair } from "./galaxy-lora-emit.mjs";

const SAMPLE = {
  galaxy: "mill",
  query: "How is cutting force computed?",
  retrieved: [
    { source: "mill/CLAUDE.md", heading: "Speed and feed", text: "Kienzle force model; kc1.1 per ISO group." },
    { source: "mill/MEMORY.md", heading: "Gotchas", text: "Units first; inch vs mm is a 25.4x error." },
  ],
  answer: "Cutting force uses the Kienzle model: Fc = kc1.1 * b * h^(1-mc).",
  model: "qwen2.5-coder:32b",
  sources: ["CLAUDE.md", "retrieved:2", "ai-synergy-audit"],
};

// --- loraPairId ---
test("loraPairId: deterministic + normalizes whitespace/case; differs by galaxy/query", () => {
  assert.equal(loraPairId("mill", "How is force computed?"), loraPairId("mill", "how is   FORCE computed?"));
  assert.notEqual(loraPairId("mill", "a"), loraPairId("lathe", "a"));
  assert.notEqual(loraPairId("mill", "a"), loraPairId("mill", "b"));
  assert.ok(loraPairId("mill", "a").startsWith("bridge::mill::"));
});

// --- buildLoraPair ---
test("buildLoraPair: Alpaca shape {id,instruction,input,output,metadata} grounded in retrieval", () => {
  const p = buildLoraPair(SAMPLE);
  assert.equal(p.id, loraPairId("mill", SAMPLE.query));
  assert.ok(p.instruction.includes("mill galaxy"));
  assert.ok(p.instruction.includes("How is cutting force computed?"));
  assert.ok(p.input.includes("[mill/CLAUDE.md # Speed and feed]")); // input encodes the RAG grounding
  assert.ok(p.input.includes("Kienzle force model"));
  assert.ok(p.output.includes("Kienzle model"));
  assert.equal(p.metadata.galaxy, "mill");
  assert.equal(p.metadata.source, "galaxy-reasoning-bridge");
  assert.equal(p.metadata.advisoryOnly, true);
  assert.equal(p.metadata.mustHumanVerify, true);
  assert.deepEqual(p.metadata.groundingSources, SAMPLE.sources);
});

test("buildLoraPair: REDACTS secrets in input + output (no secret reaches the dataset)", () => {
  const p = buildLoraPair({
    ...SAMPLE,
    answer: "Use the key sk-abcdef0123456789abcdef0123456789 to authenticate.",
    retrieved: [{ source: "s", heading: "h", text: "token ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789" }],
  });
  assert.ok(!p.output.includes("sk-abcdef0123456789abcdef0123456789"));
  assert.ok(!p.input.includes("ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"));
});

test("buildLoraPair: FAILURE returns null on missing galaxy / empty query / empty answer", () => {
  assert.equal(buildLoraPair(null), null);
  assert.equal(buildLoraPair({ galaxy: "", query: "q", answer: "a" }), null);
  assert.equal(buildLoraPair({ galaxy: "mill", query: "  ", answer: "a" }), null);
  assert.equal(buildLoraPair({ galaxy: "mill", query: "q", answer: "" }), null);
});

test("buildLoraPair: deterministic -- same input twice byte-identical (PURE)", () => {
  assert.deepEqual(buildLoraPair(SAMPLE), buildLoraPair(SAMPLE));
});

// --- appendLoraPair (fail-soft, id-deduped) ---
test("appendLoraPair: writes once, DEDUPS the second identical pair (id-keyed)", () => {
  const file = path.join(os.tmpdir(), `prism-lora-emit-test-${process.pid}-${SAMPLE.query.length}.jsonl`);
  try {
    fs.rmSync(file, { force: true });
  } catch {
    /* fresh */
  }
  const p = buildLoraPair(SAMPLE);
  assert.equal(appendLoraPair(file, p), true); // first write
  assert.equal(appendLoraPair(file, p), false); // duplicate id -> skipped
  const lines = fs.readFileSync(file, "utf8").trim().split("\n").filter(Boolean);
  assert.equal(lines.length, 1); // exactly one line
  const parsed = JSON.parse(lines[0]);
  assert.equal(parsed.id, p.id);
  // a DIFFERENT question appends a new line
  assert.equal(appendLoraPair(file, buildLoraPair({ ...SAMPLE, query: "different question?" })), true);
  assert.equal(fs.readFileSync(file, "utf8").trim().split("\n").filter(Boolean).length, 2);
  fs.rmSync(file, { force: true });
});

test("appendLoraPair: ADVERSARIAL null pair / bad path -> false (never throws)", () => {
  assert.equal(appendLoraPair("/x/y/z.jsonl", null), false);
  assert.equal(appendLoraPair(path.join(os.tmpdir(), "ok.jsonl"), { foo: 1 }), false); // no id
});
