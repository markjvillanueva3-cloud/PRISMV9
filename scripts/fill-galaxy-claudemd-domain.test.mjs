// scripts/fill-galaxy-claudemd-domain.test.mjs
// R9 tests for the grounded CLAUDE.md domain filler. Locks the safety-critical
// invariants: never soften an empty stub; idempotent managed block.
import { test } from "node:test";
import assert from "node:assert/strict";
import { retireBanner, extractScope, applyBlock, BEGIN, END } from "./fill-galaxy-claudemd-domain.mjs";

test("retireBanner NEVER softens a stub when there is no real content (R12 safety)", () => {
  const stub = "# Galaxy X\n\n**⚠ HONEST STUB** — awaiting buildout.";
  assert.equal(retireBanner(stub, /*hasContent=*/false), stub, "empty stub must be left untouched");
});

test("retireBanner retires every banner form once real content is present", () => {
  const forms = [
    "**⚠ HONEST STUB.**",
    "intro — Stub Sentinel (2026-05-27)",
    "title (P1 Galactic Center, 2026-05-27 — HONEST STUB)",
    "a bare ⚠ HONEST STUB mention",
  ];
  for (const f of forms) {
    const out = retireBanner(f, true);
    assert.ok(!/HONEST STUB/.test(out), `banner not retired in: ${f} -> ${out}`);
    assert.ok(!/Stub Sentinel/.test(out), `stub sentinel not retired in: ${f} -> ${out}`);
  }
});

test("extractScope returns the first scope line, or null when absent", () => {
  const doc = "# X\n\n## Scope\nthe galaxy does Y things\nmore detail\n\n## Other\nz";
  assert.equal(extractScope(doc), "the galaxy does Y things");
  assert.equal(extractScope("# X\n\nno scope heading"), null);
  assert.equal(extractScope(null), null);
});

test("applyBlock is idempotent — re-applying replaces the managed block, never duplicates", () => {
  const base = "# Galaxy\n\nintro text\n\n## Cross-refs\n- a";
  const block1 = `${BEGIN}\nfirst content\n${END}`;
  const once = applyBlock(base, block1);
  // block inserted before Cross-refs, exactly one BEGIN marker
  assert.equal((once.match(new RegExp(BEGIN, "g")) || []).length, 1);
  assert.ok(once.includes("## Cross-refs"), "Cross-refs tail preserved");
  const block2 = `${BEGIN}\nSECOND content\n${END}`;
  const twice = applyBlock(once, block2);
  assert.equal((twice.match(new RegExp(BEGIN, "g")) || []).length, 1, "still exactly one block (no duplication)");
  assert.ok(twice.includes("SECOND content") && !twice.includes("first content"), "block content replaced");
});

test("applyBlock appends when neither managed block nor Cross-refs tail exists", () => {
  const out = applyBlock("# Bare\n\njust intro", `${BEGIN}\nx\n${END}`);
  assert.ok(out.includes(BEGIN) && out.includes(END));
  assert.ok(out.startsWith("# Bare"));
});
