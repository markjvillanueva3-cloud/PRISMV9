---
type: "chat-session"
source: "claude-code-cli"
session_id: "3c737257-2eff-42f5-a23a-ca1345246313"
title: "RE-REVIEW (round 2). Read H:\\prism\\scripts\\embed-wiki-into-tribal-index.test.mjs"
date: "2026-05-19"
first_ts: "2026-05-19T00:50:36.238Z"
last_ts: "2026-05-19T00:51:42.252Z"
cwd: "H:\\prism"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/3c737257-2eff-42f5-a23a-ca1345246313/subagents/agent-a9107bc6bdf4802d7.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:11"
---

# RE-REVIEW (round 2). Read H:\prism\scripts\embed-wiki-into-tribal-index.test.mjs

> **claude-code-cli** | 2026-05-19 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/3c737257-2eff-42f5-a23a-ca1345246313/subagents/agent-a9107bc6bdf4802d7.jsonl`

## Transcript

### User | 2026-05-19T00:50:36.238Z

RE-REVIEW (round 2). Read H:\prism\scripts\embed-wiki-into-tribal-index.test.mjs AND H:\prism\scripts\embed-wiki-into-tribal-index.mjs fully.

Round-1 findings now claimed fixed:
- P1 (exit-1 .catch handler untested) → new test "corrupt index JSON → exit 1".
- P1 (--force replace-in-place splice untested) → splice extracted to exported pure `spliceEntries`; new "spliceEntries replaces in place (order-stable)" unit test + "idempotent skip" CLI test.
- P2 (expectedDim fallback / dim wiring untested) → main() now echoes `expectedDim` in JSON; new "P1-c dim wiring" test (dim:1024 flows, omitted→768, 0→768).
- P2 (tmpdir leak) → `after()` hook rmSync's all tracked tmpdirs.
- Arm B P0 (--domain guard false-green) → new "P0 — --domain greedy-consume guard falls back to a VALID default" with the exit-3-not-2 strong proof.
- Arm B P1 (canonical shape missing text-nonempty + numeric-array) → buildEntry test now asserts short.text.length>0 and embedding.every(Number.isFinite).
- Arm B P1 (multi-file all-or-nothing) → new multi-file Ollama-down witness.

Grade PASS/FAIL with any remaining P0/P1. Verify each fix actually closes its gap (would the new test FAIL if the corresponding production logic were reverted?). Specifically confirm: (a) the exit-1 test truly exercises the .catch path; (b) spliceEntries test pins order-stable replace + wikiEmbeddedCount math; (c) the dim-wiring test would fail if main()'s `Number(idx.dim)>0?...:768` line were reverted to a hardcoded 768; (d) the P0 --domain strong proof distinguishes "guard works" from "guard broken but file still planned". Report concrete line numbers + verdict.

### Assistant | 2026-05-19T00:50:44.407Z

I'll conduct a thorough round-2 review of the embed-wiki-into-tribal-index files, verifying each claimed P1/P0 fix with specific line numbers and regression guards.

### Assistant | 2026-05-19T00:50:44.433Z

[tool_use: Read]

### Assistant | 2026-05-19T00:50:44.472Z

[tool_use: Read]

### User | 2026-05-19T00:50:51.609Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * embed-wiki-into-tribal-index.mjs
4	 *
5	 * BACKEND-DEV-LOOP/U-TRIBAL-EMBED-GAP (2026-05-19, slot foxtrot).
6	 *
7	 * Idempotent appender that embeds wiki markdown files into
8	 * `state/shared/tribal-embed-index.json` so they become reachable by the
9	 * automatic tribal-knowledge injection pipeline
10	 * (`tribal-by-domain-inject.mjs` → `tribal-rerank.mjs` → cosin
... [+17405 chars truncated]

### User | 2026-05-19T00:50:51.613Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * Hermetic node:test suite for embed-wiki-into-tribal-index.mjs
4	 * (BACKEND-DEV-LOOP/U-TRIBAL-EMBED-GAP).
5	 *
6	 * No Ollama, no real index mutation — pure helpers + injected fetch +
7	 * tmpdir index. Real-value assertions only (no toBeDefined-style stubs).
8	 * Each block encodes WHY the behavior matters (the non-retrievable-entry
9	 * failure class this unit cl
... [+15923 chars truncated]

### Assistant | 2026-05-19T00:51:42.252Z

# Round-2 Review: embed-wiki-into-tribal-index

## Summary
**GRADE: PASS (with 1 P2 qualifier)**

All claimed fixes are **verified** with concrete regression guards. Four of five claimed fixes pass with strong proof; one (P2: dim fallback) has a logic path gap that should be tightened before ship.

---

## Fix Verification (by claim)

### **Fix 1: P1 — exit-1 .catch handler untested**

**Claim:** New test "corrupt index JSON → exit 1"

**Test code (lines 250–257):**
```javascript
test("main: corrupt index JSON → unhandled path exits 1 with JSON error (the .catch handler)", () => {
  const dir = mkTmp(); const ip = path.join(dir, "i.json");
  fs.writeFileSync(ip, "{ this is not valid json ");
  const wiki = path.join(dir, "w.md"); fs.writeFileSync(wiki, FM + "# W\nbody");
  const r = run([wiki, "--apply", "--json"], { PRISM_TRIBAL_INDEX_PATH: ip });
  assert.equal(r.code, 1, "JSON.parse failure must hit main().catch → exit 1, not a false 0");
  assert.equal(JSON.parse(r.out).ok, false);
});
```

**Regression guard:** The assertion `r.code, 1` would **FAIL** if the production `.catch` handler at lines 380–383 were removed or refactored to not call `process.exit(1)`. The handler is **load-bearing** — it's the ONLY path that exits code 1 in the main contract.

**Verdict:** ✅ **PASS** — Tight witness to the unhandled-exception catch path.

---

### **Fix 2: P1 — --force replace-in-place splice untested**

**Claim:** `spliceEntries` extracted to exported pure fn; new tests for "in-place replace (order-stable)" + "idempotent skip"

**Test code (lines 116–137):**
```javascript
test("spliceEntries replaces in place (order-stable) and appends new", () => {
  const idA = makeId(makeWinPath("a.md"));
  const idC = makeId(makeWinPath("c.md"));
  const idx = { entries: [{ id: idA, title: "OLD-A" }, { id: "B" }], wikiEmbeddedCount: 5 };
  const built = [
    { id: idA, entry: { id: idA, title: "NEW-A" } },                    // replace
    { id: idC, entry: { id: idC, title: "C" }
... [+13315 chars truncated]
