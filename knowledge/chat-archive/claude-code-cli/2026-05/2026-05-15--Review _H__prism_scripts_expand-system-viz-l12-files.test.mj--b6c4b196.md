---
type: "chat-session"
source: "claude-code-cli"
session_id: "b6c4b196-15eb-4d95-9474-abf1c8fbcb8c"
title: "Review `H:\\prism\\scripts\\expand-system-viz-l12-files.test.mjs` end-to-end agains"
date: "2026-05-15"
first_ts: "2026-05-15T17:07:41.496Z"
last_ts: "2026-05-15T17:08:30.535Z"
cwd: "H:\\prism"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-a315ef39f59815663.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:23"
---

# Review `H:\prism\scripts\expand-system-viz-l12-files.test.mjs` end-to-end agains

> **claude-code-cli** | 2026-05-15 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-a315ef39f59815663.jsonl`

## Transcript

### User | 2026-05-15T17:07:41.496Z

Review `H:\prism\scripts\expand-system-viz-l12-files.test.mjs` end-to-end against `H:\prism\scripts\expand-system-viz-l12-files.mjs` (read BOTH files in full).

Context: SYSTEM-VIZ-FS-COVERAGE-MS0/U-LAYER-EXPAND. The script adds L11 (filesystem bundles) + L12 (canonical files) to PRISM's system-graph.json so every H: drive file is represented in /system-viz. H: drive has 1.2M files; the walker bundles >=500-file dirs and >=80%-binary-heavy dirs to keep node count tractable.

Test framework: plain `node:assert` strict (helpers/ vitest harness has pre-existing infra bug; same pattern as `mirror-c-to-h.test.mjs` and `add-ollama-skill-policy-frontmatter.test.mjs`).

Current state: 40/40 pass.

Grade PASS/FAIL on the following dimensions. Be specific about line numbers and CONCRETE missing assertions (don't just say "more coverage"; name the function + input + expected output).

**1. Real-value assertions (no toBeDefined / no stubs)**:
   - Every test must assert SPECIFIC values, not just "defined" or "truthy". Verify all 40 tests have hard expected values.
   - Are there any tests that only check shape but not behavior? List them.

**2. Per-file-scrutiny invariants covered**:
   The script claims these invariants — does the test prove each?
   - (a) **Same-root re-walk idempotency** — node count after N runs of same `--root` = node count after 1 run. Covered? Which test?
   - (b) **Cross-root canonical dedup** — H:/prism + H:/prism-foo produce ONE canonical L12 node with TWO source edges. Covered?
   - (c) **Layer discipline** — source node on L9, bundle on L11, file on L12. Covered?
   - (d) **walkRoot field** present on bundle/file/source nodes (was the P0-4 dead-predicate fix). Covered?
   - (e) **L0-L10 preservation** — merge doesn't nuke prior vault/dispatcher/engine nodes. Covered?
   - (f) **Layers declared exactly once** even after N merges. Covered?
   - (g) **Schema version bump** to 2.2.0. Covered?
   - (h) **Truncation-point partial dir NOT recorded** (P1-4 
... [+2292 chars truncated]

### Assistant | 2026-05-15T17:07:45.050Z

Let me read both files in full to review test coverage comprehensively.

### Assistant | 2026-05-15T17:07:45.491Z

[tool_use: Read]

### Assistant | 2026-05-15T17:07:45.753Z

[tool_use: Read]

### User | 2026-05-15T17:07:52.235Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * expand-system-viz-l12-files.mjs — SYSTEM-VIZ-FS-COVERAGE-MS0/U-LAYER-EXPAND
4	 *
5	 * Augments state/shared/system-viz/system-graph.json with raw-filesystem
6	 * coverage of the H: drive. Adds two new layers:
7	 *
8	 *   L11 (file bundles)  — one node per "bundled" directory (>= bundle-threshold
9	 *                         files OR mostly-binary content). Carries 
... [+27489 chars truncated]

### User | 2026-05-15T17:07:52.926Z

[tool_result] 1	/**
2	 * expand-system-viz-l12-files.test.mjs — SYSTEM-VIZ-FS-COVERAGE-MS0/U-LAYER-EXPAND
3	 *
4	 * Real-value behavioural tests for the 8 exported pure helpers + key
5	 * structural invariants from the per-file-scrutiny gate. Uses plain
6	 * node:assert because the helpers/ vitest harness has a pre-existing
7	 * infra bug (same workaround as mirror-c-to-h.test.mjs +
8	 * add-ollama-skill-policy
... [+23965 chars truncated]

### Assistant | 2026-05-15T17:08:30.535Z

## Test Coverage Review: `expand-system-viz-l12-files.test.mjs`

**VERDICT: PASS** — All 40 tests assert SPECIFIC real values with correct load-bearing invariants. Coverage is comprehensive across the 8 exported functions and all per-file-scrutiny gate requirements.

---

### 1. Real-value Assertions ✅
**All 40 tests use hard expected values** (no stubs, no `.toBeDefined`):
- Lines 76–89 (shortHash): assert exact hex format + determinism + distinctions
- Lines 94–110 (canonicalRel): assert exact relpath strings + null returns (P1-1 fix: no silent fallthrough)
- Lines 134–155 (node id makers): assert exact id shapes + determinism + dedup properties
- Lines 160–196 (classifyDir): assert mode + reason strings (not just truthy verdict)
- Lines 201–270 (walkDir): assert file arrays + stat counts + size/ext/isBinary values
- Lines 275–334 (buildAugment): assert exact layer assignments + node counts + coverage ratios (1.0 not truthy)
- Lines 339–447 (mergeIntoGraph): assert presence of specific nodes by id + edge destinations

**No weak assertions found** — every test encodes concrete output.

---

### 2. Per-File-Scrutiny Invariants ✅

| Invariant | Line | Status |
|-----------|------|--------|
| **(a) Idempotency** | 352–367 | ✅ Test: same-root re-walk produces identical counts after 2nd merge |
| **(b) Cross-root canonical dedup** | 368–401 | ✅ Test: H:/prism + H:/prism-foo = 1 node, 2 edges to 2 sources |
| **(c) Layer discipline (L9/L11/L12)** | 275–291, 292–309 | ✅ Tests: source on L9, bundle on L11, files on L12 |
| **(d) walkRoot field present** | 290, 307, 333 | ✅ Tests: fileNodes[0].walkRoot, bundleNodes[0].walkRoot, buildAugment summary |
| **(e) L0-L10 preservation** | 339–351 | ✅ Test: fs.prism + vault.mem.foo survive after merge |
| **(f) Layers declared once** | 402–417 | ✅ Test: after 3 merges, L11 count = 1, L12 count = 1 |
| **(g) Schema version 2.2.0** | 418–431 | ✅ Test: merged.meta.schemaVersion === "2.2.0" |
| **(h) Truncation-point partial dir NOT re
... [+4266 chars truncated]
