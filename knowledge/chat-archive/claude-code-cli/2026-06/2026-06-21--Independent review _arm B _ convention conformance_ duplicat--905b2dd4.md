---
type: "chat-session"
source: "claude-code-cli"
session_id: "905b2dd4-3c0c-4201-92ed-f8a0effe134a"
title: "Independent review (arm B — convention conformance, duplication, test integrity,"
date: "2026-06-21"
first_ts: "2026-06-21T22:29:42.350Z"
last_ts: "2026-06-21T22:31:14.601Z"
cwd: "H:\\prism"
messages: 36
user_msgs: 14
assistant_msgs: 22
raw_file: "H:/.claude/projects/H--prism/905b2dd4-3c0c-4201-92ed-f8a0effe134a/subagents/agent-a64b808c22962d4fe.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:17"
---

# Independent review (arm B — convention conformance, duplication, test integrity,

> **claude-code-cli** | 2026-06-21 | 36 msgs (14 user / 22 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/905b2dd4-3c0c-4201-92ed-f8a0effe134a/subagents/agent-a64b808c22962d4fe.jsonl`

## Transcript

### User | 2026-06-21T22:29:42.350Z

Independent review (arm B — convention conformance, duplication, test integrity, naming) of a NEW pure library + tests, slot:india. Read both END-TO-END, grade PASS/FAIL with P0/P1/P2 + file:line. Do NOT assume arm A caught anything.

FILES:
1. H:/prism/scripts/lib/engine-action-surface.mjs
2. H:/prism/scripts/lib/engine-action-surface.test.mjs

CONTEXT: extracts per-engine dispatcher action-names as an embeddable feature for the GNN. It deliberately mirrors the case-body parse of H:/prism/scripts/generate-action-engine-edges.mjs (which emits action->engine VIZ EDGES + resolves against graph nodes) but INVERTS to a reusable engine->action-names MAP + text projection. Sibling lib convention: H:/prism/scripts/lib/wired-engine-mapper.mjs.

REVIEW FOR:
- DUPLICATION: is this genuinely distinct from generate-action-engine-edges.mjs and wired-engine-mapper.mjs (engine->dispatcher-namespace)? Confirm it is not re-implementing an existing reusable export. Read those two to verify.
- TEST INTEGRITY (R9): do all 12 tests verify intent (would fail on a real logic change)? Coverage of all 8 exports? Is the DI'd-fs test faithful? Any happy-path-only gap, any toothless assert?
- CONVENTION: matches wired-engine-mapper.mjs structure (pure exports + fsImpl DI + fail-soft)? Naming consistent? Comment-vs-code accuracy (do the docstrings match behavior, esp. the leak-free claim)?
- Inlined magic numbers (CASE_BODY_CAP is named — anything else?); ASCII-only.
- Is this an ORPHAN? It's a feature-extractor lib whose consumer (the GNN embedding integration + separability measurement) is a FOLLOW-UP unit. Judge whether shipping it now as a tested foundation (R13 logical-order: verifiable core before integration) is acceptable, or whether it must ship with its consumer.
Be concise. Grade PASS/FAIL.

### Assistant | 2026-06-21T22:29:46.307Z

I'll review both files end-to-end, plus the two siblings I need to verify against for duplication and convention.

### Assistant | 2026-06-21T22:29:46.777Z

[tool_use: Read]

### Assistant | 2026-06-21T22:29:47.263Z

[tool_use: Read]

### User | 2026-06-21T22:29:47.699Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\engine-action-surface.mjs' was already read 11s ago in this session and is unchanged (mtime 1782080906454). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-21T22:29:47.737Z

[tool_use: Read]

### Assistant | 2026-06-21T22:29:48.033Z

[tool_use: Read]

### User | 2026-06-21T22:29:48.603Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\engine-action-surface.test.mjs' was already read 11s ago in this session and is unchanged (mtime 1782080922497). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-21T22:29:49.128Z

[tool_result] read-once-guard: 'H:\prism\scripts\generate-action-engine-edges.mjs' was already read 7m ago in this session and is unchanged (mtime 1779681338884). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-21T22:29:49.312Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * wired-engine-mapper.mjs — SYSTEM-VIZ-FS-COVERAGE-MS2/U-SIBLING-INFER
4	 *
5	 * Pure helper: scans dispatcher .ts files, extracts engine imports (both static
6	 * `import X from .../engines/Y.js` AND dynamic `await import(".../engines/Y.js")`),
7	 * and returns a map of engine class names → list of dispatcher namespaces that
8	 * import them.
9	 *
10	 * Companion to
... [+6521 chars truncated]

### Assistant | 2026-06-21T22:29:52.750Z

The read-once guard tells me the two main files and `generate-action-engine-edges.mjs` are already in my context. Let me confirm I have the actual content of the two target files, since the guard says they were read this session but I don't see them in my context yet. Let me read them with the cache disabled to be sure.

### Assistant | 2026-06-21T22:29:53.707Z

[tool_use: Read]

### Assistant | 2026-06-21T22:29:54.144Z

[tool_use: Read]

### User | 2026-06-21T22:29:54.938Z

[tool_result] 0	#!/usr/bin/env node
1	/**
2	 * engine-action-surface.mjs -- per-engine dispatcher ACTION-SURFACE extractor.
3	 * (AI-SYSTEMS-GNN, slot:india 2026-06-21.)
4	 *
5	 * WHY: the GNN tier-5's 768-d nomic TEXT embeddings separate only 1/7 dispatcher
6	 * classes (meanMargin 0.0263; only prism_turning clears the bar) -- an engine's
7	 * DESCRIPTION text is near-non-discriminative for which dispatcher it
... [+7113 chars truncated]

### User | 2026-06-21T22:29:55.802Z

[tool_result] 0	/**
1	 * Tests for engine-action-surface.mjs (AI-SYSTEMS-GNN, slot:india 2026-06-21).
2	 * Real reference-value / algebraic-invariant assertions (R9): every test fails if
3	 * the case-body parse, the inverse-map build, the leak-free empty-for-unwired rule,
4	 * or the text projection regresses. Pure functions tested on synthetic dispatcher
5	 * source; one live-data invariant test against the r
... [+8439 chars truncated]

### Assistant | 2026-06-21T22:30:00.295Z

Now I have both target files end-to-end plus `wired-engine-mapper.mjs`. Let me verify the case-body parse fidelity against `generate-action-engine-edges.mjs` (cited as the mirrored source) and check whether the docstring claims about the viz edge-builder match reality.

### Assistant | 2026-06-21T22:30:00.821Z

[tool_use: Read]

### User | 2026-06-21T22:30:02.623Z

[tool_result] 0	#!/usr/bin/env node
1	/**
2	 * generate-action-engine-edges.mjs — for each L4a `action.<disp>.<name>` node,
3	 * scan its dispatcher source for the case-body that handles that action and
4	 * extract engine references. Emit `invokes` edges from action -> engine atom
5	 * so the L4a -> L5 flow shows up live on the viz.
6	 *
7	 * Engine-reference patterns:
8	 *   <engineNameLowerCamel>Engine.<meth
... [+5946 chars truncated]

### Assistant | 2026-06-21T22:30:06.601Z

I now have all four files end-to-end. Let me verify two factual claims in the docstrings before grading: (1) the "getEngine falsely top engine with 2849 actions" claim, and (2) the case-body `stop` regex divergence between the two parsers (the lib uses `[A-Za-z0-9_.]` while the viz builder uses `[a-z_]`). Let me also confirm the test count is actually 12.

### Assistant | 2026-06-21T22:30:07.797Z

[tool_use: Bash]

### User | 2026-06-21T22:30:13.048Z

[tool_result] 12
---exports defined---
38:export const CASE_BODY_CAP = 6000;
49:export const ENGINE_REF_RE = /\b([a-z][A-Za-z0-9_]*Engine)\s*\??\./g;
50:export const NEW_ENGINE_RE = /\bnew\s+([A-Z][A-Za-z0-9_]*Engine)\s*\(/g;
57:export function extractActionLabels(src) {
72:export function actionEngineRefsFromSource(src) {
98:export function buildActionSurfaceMap(dir, fsImpl = fs) {
124:export function engineSt
... [+79 chars truncated]

### Assistant | 2026-06-21T22:30:16.477Z

8 exports, 12 tests confirmed. Now let me verify the divergence I noticed: the lib's `stop` regex (`case\s+["'][A-Za-z0-9_.]`) differs from the viz builder's (`case\s+["'][a-z_]`). This matters for the "mirrors the case-body parse" claim. Let me also check ASCII purity.

### Assistant | 2026-06-21T22:30:19.611Z

[tool_use: Bash]

### User | 2026-06-21T22:30:23.079Z

[tool_result] === non-ASCII in lib ===
grep: -P supports only unibyte and UTF-8 locales
none (ASCII clean)
=== non-ASCII in test ===
grep: -P supports only unibyte and UTF-8 locales
none (ASCII clean)
=== smart quotes / em-dash check (lib) ===
grep: -P supports only unibyte and UTF-8 locales
none

### Assistant | 2026-06-21T22:30:25.655Z

`-P` failed on this locale. Let me use the Grep tool which uses ripgrep for a reliable non-ASCII check.

### Assistant | 2026-06-21T22:30:26.603Z

[tool_use: Grep]

### Assistant | 2026-06-21T22:30:27.508Z

[tool_use: Grep]

### User | 2026-06-21T22:30:28.091Z

[tool_result] No matches found

### User | 2026-06-21T22:30:28.965Z

[tool_result] No matches found

### Assistant | 2026-06-21T22:30:38.233Z

Both files are ASCII-clean (the docstrings use `--` and `->` ASCII forms, not em-dashes/arrows). Now let me analyze the one substantive divergence I found between the two parsers and confirm whether it is a defect or an intentional improvement.

The lib's stop regex at line 80 is `/\n\s*(case\s+["'][A-Za-z0-9_.]|default\s*:)/` — it matches case labels whose first char is `[A-Za-z0-9_.]`. The viz builder's stop regex (line 99) is `/\n\s*(case\s+["'][a-z_]|default\s*:)/` — only `[a-z_]`. The lib's is a strict superset (it also stops at uppercase/digit/dot-starting action names), which is more correct, since the lib's own `extractActionLabels` regex accepts `[A-Za-z0-9_.]+`. This is a deliberate consistency fix, not a regression. The docstring at line 24-26 accurately says "Mirrors the case-body engine-ref parse... but INVERTS it" — "mirrors" not "byte-identical," so the claim holds.

Let me verify one more correctness concern: whether `actionEngineRefsFromSource` could under-count because the first case body's `stop` search starts at `slice` (from `bodyStart`), and the first label in the synthetic single-line test `switch(a){ case "first": ... case "second": ... }` has no `\n` before "second". Let me trace the failure-2 test to confirm it actually passes as asserted.

### Assistant | 2026-06-21T22:30:39.564Z

[tool_use: Bash]

### User | 2026-06-21T22:30:43.686Z

[tool_result] ok 1 - extractActionLabels: finds every case label in order; non-string -> []
ok 2 - actionEngineRefsFromSource happy: lowerCamelEngine + new PascalEngine attributed to the right action
ok 3 - actionEngineRefsFromSource failure 1: an engine ref BEFORE the first case is never attributed
ok 4 - actionEngineRefsFromSource failure 2: a case body stops at the next case (no cross-case leak)
ok 5 - actio
... [+825 chars truncated]

### Assistant | 2026-06-21T22:30:48.014Z

All 12 tests pass, including the live-data invariant against the real dispatcher dir. Now let me trace the failure-2 test (single-line, no `\n` before "second") to understand the `stop` regex behavior — the test asserts `first: []` and `second: ["otherengine"]`, and it passes. Note the test source has `\n case "second"` (there IS a newline). Let me verify the leak-safety claim holds on a genuinely single-line case (no newline separator), which is the real adversarial gap.

### Assistant | 2026-06-21T22:30:50.130Z

[tool_use: Bash]

### User | 2026-06-21T22:30:53.623Z

[tool_result] same-line: {"first":["otherengine"],"second":["otherengine"]}

### Assistant | 2026-06-21T22:31:14.601Z

This confirms a real behavioral gap: the `stop` regex requires a leading `\n` (`/\n\s*(case...)/`), so when two `case` labels share a line, the first case body does NOT stop at the second case and cross-attributes `otherengine` to `first`. This is identical behavior to the viz edge-builder (line 99 also requires `\n`), so it's an inherited, mirrored limitation — not a new defect introduced here. Real dispatcher source is multi-line (one case per line), so this is a non-issue in practice. I'll flag it as P2 (documented limitation, no live impact) since the docstring at line 78-79 explicitly acknowledges "naive top-level limit, as in the viz edge-builder."

I have everything I need. Here is my verdict.

---

VERDICT: PASS

summary: `engine-action-surface.mjs` is a genuinely distinct, well-documented pure library that inverts the viz edge-builder's case-body parse into a reusable engine->action-name map plus an embeddable text projection — it does NOT re-implement `generate-action-engine-edges.mjs` (which emits graph viz EDGES and resolves against graph nodes) nor `wired-engine-mapper.mjs` (which maps engine->dispatcher-NAMESPACE from imports, a different axis). All 12 tests pass and verify intent across all 8 exports including a live-data invariant, an honest DI'd-fs test, and a real R12 precision-regression test. ASCII-clean, matches sibling convention (pure exports + fsImpl DI + fail-soft), docstrings accurately match behavior including the leak-free claim. Shipping the tested core ahead of its GNN-embedding consumer is acceptable R13 logical-order.

findings:
- [P2] `scripts/lib/engine-action-surface.mjs:80` -- the case-body `stop` regex requires a leading `\n` (`/\n\s*(case...)/`), so two `case` labels on the SAME line cross-attribute the second's engine to the first (verified live: `case "first": doThing(); case "second": return otherEngine.go()` attributes `otherengine` to both). This is an INHERITED, mirrored limitation (the viz edge-builder at `generate-action
... [+1895 chars truncated]
