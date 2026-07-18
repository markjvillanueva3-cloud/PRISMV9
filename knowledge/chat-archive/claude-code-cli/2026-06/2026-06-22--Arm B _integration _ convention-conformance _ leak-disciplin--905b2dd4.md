---
type: "chat-session"
source: "claude-code-cli"
session_id: "905b2dd4-3c0c-4201-92ed-f8a0effe134a"
title: "Arm B (integration / convention-conformance / leak-discipline / test integrity) "
date: "2026-06-22"
first_ts: "2026-06-22T02:29:52.103Z"
last_ts: "2026-06-22T02:33:40.404Z"
cwd: "H:\\prism"
messages: 51
user_msgs: 19
assistant_msgs: 32
raw_file: "H:/.claude/projects/H--prism/905b2dd4-3c0c-4201-92ed-f8a0effe134a/subagents/agent-abd0b83361a6b7ecc.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:17"
---

# Arm B (integration / convention-conformance / leak-discipline / test integrity) 

> **claude-code-cli** | 2026-06-22 | 51 msgs (19 user / 32 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/905b2dd4-3c0c-4201-92ed-f8a0effe134a/subagents/agent-abd0b83361a6b7ecc.jsonl`

## Transcript

### User | 2026-06-22T02:29:52.103Z

Arm B (integration / convention-conformance / leak-discipline / test integrity) of PRISM's per-file scrutiny gate. Read-only. Grade PASS/FAIL with P0/P1/P2 + file:line. Do NOT assume the other reviewer caught everything.

CONTEXT: slot:india GNN tier-5. Adds an OPT-IN DEFAULT-OFF dense node feature — the "non-engine import fingerprint" (IDF-weighted set of each engine's non-engine module import paths) — into the embedding pipeline, to lift dispatcher-class separability with a signal independent of the (exhausted) text signal. Spec: H:/prism/state/shared/specs/GNN-NEXT-LEVER-IMPORT-FINGERPRINT-2026-06-21.md.

Review ONLY:
- H:/prism/scripts/lib/engine-import-fingerprint.mjs (NEW)
- H:/prism/scripts/lib/engine-import-fingerprint.test.mjs (NEW)
- H:/prism/scripts/build-node-embeddings.mjs wire (diff: `git -C H:/prism --no-pager diff -- scripts/build-node-embeddings.mjs`)
Compare against the sibling it mirrors: H:/prism/scripts/lib/engine-action-surface.mjs (+ .test.mjs) and the action-surface wire pattern.

VERIFY (cite file:line, PASS/FAIL each):
1. CONVENTION: the lib mirrors engine-action-surface.mjs (pure exports, DI'd fs, fail-soft, JSDoc density, ASCII-only — no em dashes). The 4 exports match the spec (extractNonEngineImports / buildImportFingerprintMap / buildImportIdfMap / importFingerprintText).
2. SPEC FIDELITY: normalization per spec (drop /engines/, strip ./../ + suffix, lowercase, last 1-2 segments); buildImportIdfMap uses the same ln(N/df) formula as buildIdfMap in build-node-embeddings.mjs; importFingerprintText top-K by IDF, drop idf<=0, ties by occurrence.
3. INTEGRATION: the wire builds importFpMap/importIdfMap ONCE (not per-node) inside the `if (args.ghostsOnly && GHOST_SOURCE)` block, appends per node, mirrors the action-surface append exactly; report line gated by the flag; default-OFF a true no-op.
4. LEAK-FREE (R12): argue the import fingerprint cannot leak the dispatcher label (paths are structural, computable for an unwired ghost). 
5. TEST IN
... [+514 chars truncated]

### Assistant | 2026-06-22T02:29:56.224Z

I'll review the three files against the spec and the sibling pattern. Let me start by reading everything end to end.

### Assistant | 2026-06-22T02:29:56.697Z

[tool_use: Read]

### User | 2026-06-22T02:29:57.143Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\engine-import-fingerprint.mjs' was already read 52s ago in this session and is unchanged (mtime 1782095226253). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-22T02:29:57.164Z

[tool_use: Read]

### Assistant | 2026-06-22T02:29:57.506Z

[tool_use: Read]

### User | 2026-06-22T02:29:57.680Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\engine-import-fingerprint.test.mjs' was already read 8s ago in this session and is unchanged (mtime 1782095259572). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE
... [+3 chars truncated]

### User | 2026-06-22T02:29:58.398Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\engine-action-surface.mjs' was already read 18m ago in this session and is unchanged (mtime 1782081176939). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-22T02:30:00.988Z

The read-once guard says these were already read in this session, but I don't actually have that content in my context (this is a fresh agent thread). Let me disable the cache and read them.

### Assistant | 2026-06-22T02:30:01.810Z

[tool_use: Bash]

### User | 2026-06-22T02:30:06.638Z

[tool_result] #!/usr/bin/env node
/**
 * engine-import-fingerprint.mjs -- per-engine NON-ENGINE import-fingerprint extractor.
 * (AI-SYSTEMS-GNN, slot:india 2026-06-21.)
 *
 * WHY: the GNN tier-5 text embeddings give 23/43 dispatcher-class separability
 * @ meanMargin 0.0527 (post action-surface). Adding more TEXT/action vocab is
 * exhausted (action-surface measured +0.0018, redundant --
 * [[reference_gnn_act
... [+9089 chars truncated]

### Assistant | 2026-06-22T02:30:09.133Z

The cat output lacks line numbers. Let me get the test file and the action-surface sibling with line numbers, plus the wire diff.

### Assistant | 2026-06-22T02:30:10.547Z

[tool_use: Bash]

### Assistant | 2026-06-22T02:30:11.112Z

[tool_use: Bash]

### User | 2026-06-22T02:30:20.113Z

[tool_result]      1	/**
     2	 * Tests for engine-import-fingerprint.mjs (AI-SYSTEMS-GNN, slot:india 2026-06-21).
     3	 * Real reference-value / algebraic-invariant assertions (R9): every test fails if
     4	 * the import-parse, normalization, IDF formula, or text-projection regresses.
     5	 * Pure functions tested on synthetic source; one live-data invariant test against
     6	 * the real mcp-server/sr
... [+20015 chars truncated]

### User | 2026-06-22T02:30:27.369Z

[tool_result] diff --git a/scripts/build-node-embeddings.mjs b/scripts/build-node-embeddings.mjs
index 1419c6ec75..f5eaf16213 100644
--- a/scripts/build-node-embeddings.mjs
+++ b/scripts/build-node-embeddings.mjs
@@ -50,6 +50,7 @@ import { fileURLToPath } from "node:url";
 import { readGraphStreaming } from "./lib/graph-io.mjs";
 import { nicifySelf } from "./lib/batch-self-nice.mjs";
 import { buildActionSurfa
... [+5300 chars truncated]

### Assistant | 2026-06-22T02:30:33.277Z

Now I have the full picture. Let me read the action-surface sibling to compare the wire pattern and the buildIdfMap formula in build-node-embeddings.mjs.

### Assistant | 2026-06-22T02:30:34.978Z

[tool_use: Bash]

### Assistant | 2026-06-22T02:30:36.142Z

[tool_use: Grep]

### User | 2026-06-22T02:30:40.894Z

[tool_result]      1	#!/usr/bin/env node
     2	/**
     3	 * engine-action-surface.mjs -- per-engine dispatcher ACTION-SURFACE extractor.
     4	 * (AI-SYSTEMS-GNN, slot:india 2026-06-21.)
     5	 *
     6	 * WHY: the GNN tier-5's 768-d nomic TEXT embeddings separate only 1/7 dispatcher
     7	 * classes (meanMargin 0.0263; only prism_turning clears the bar) -- an engine's
     8	 * DESCRIPTION text is near-no
... [+8608 chars truncated]

### User | 2026-06-22T02:30:43.575Z

[tool_result] 226:export function appendActionSurface(sig, surfText, { maxChars = 1400 } = {}) {
227-  const base = typeof sig === "string" ? sig : "";
228-  const surf = typeof surfText === "string"
229-    ? surfText.replace(/\bprism_[a-z0-9_]+/gi, " ").replace(/\s+/g, " ").trim()
230-    : "";
231-  if (!surf) return base; // unwired ghost / no surface -> identity (the leak-free contract)
232-  const tail = 
... [+2093 chars truncated]

### Assistant | 2026-06-22T02:30:47.336Z

I have everything needed. Let me verify a few load-bearing claims: the `walkEngineSources` basename keying (the wire collision logic), how `sig` is built before the append, and run the test suite to confirm 24 tests pass and none are skipped.

### Assistant | 2026-06-22T02:30:48.290Z

[tool_use: Read]

### Assistant | 2026-06-22T02:30:49.425Z

[tool_use: Bash]

### User | 2026-06-22T02:30:52.161Z

[tool_result] 494	  // embed text — otherwise a richer-text re-run would be wrongly skipped as "already
495	  // embedded" (the prior bug: nodeContentHash keyed off name-only nodeEmbedText).
496	  const sourceSignalById = new Map();
497	  let sourceResolved = 0, sourceMissing = 0, sourceCollisions = 0, actionSurfaceApplied = 0, importFpApplied = 0;
498	  if (args.ghostsOnly && GHOST_SOURCE) {
499	    const name
... [+2415 chars truncated]

### User | 2026-06-22T02:30:58.574Z

[tool_result]   ...
# Subtest: importFingerprintText: non-Map idfMap -> ''
ok 19 - importFingerprintText: non-Map idfMap -> ''
  ---
  duration_ms: 0.0582
  ...
# Subtest: importFingerprintText: empty importPaths -> ''
ok 20 - importFingerprintText: empty importPaths -> ''
  ---
  duration_ms: 0.0477
  ...
# Subtest: importFingerprintText: k=0 -> ''
ok 21 - importFingerprintText: k=0 -> ''
  ---
  duration_ms: 
... [+806 chars truncated]

### Assistant | 2026-06-22T02:31:08.161Z

24/24 pass, 0 skipped. Now let me verify two specific integration concerns: (1) the `walkEngineSources` keys `nameToPath` by file BASENAME (not lowercased stem), while the import-fp map keys by lowercased stem — there's a potential case/suffix mismatch worth checking; (2) confirm there are no em-dashes/non-ASCII in the new lib.

### Assistant | 2026-06-22T02:31:10.811Z

[tool_use: Bash]

### User | 2026-06-22T02:31:15.785Z

[tool_result] === non-ASCII in import-fingerprint.mjs ===
grep: -P supports only unibyte and UTF-8 locales
(none)
=== non-ASCII in test ===
grep: -P supports only unibyte and UTF-8 locales
(none)
=== .skip/.only in test ===
(none)
=== em-dash literal check ===
(none)

### Assistant | 2026-06-22T02:31:19.014Z

`-P` failed under this locale. Let me verify ASCII-only with a node check and confirm the name-to-stem keying behavior.

### Assistant | 2026-06-22T02:31:22.852Z

[tool_use: Bash]

### User | 2026-06-22T02:31:28.077Z

[tool_result] scripts/lib/engine-import-fingerprint.mjs -> ASCII-only OK
scripts/lib/engine-import-fingerprint.test.mjs -> ASCII-only OK

### Assistant | 2026-06-22T02:31:35.475Z

ASCII-only confirmed for both. Now the key integration concern: the wire keys the import-fp map by `String(name).toLowerCase()`, but `walkEngineSources` keys `nameToPath` by file BASENAME (case-preserved, suffix-stripped), and the import-fp map keys by `e.name.replace(/\.ts$/,"").toLowerCase()`. Let me verify the node `name` value (`n.label ?? n.id`) matches the lowercased file stem in practice. The action-surface wire also uses `String(name).toLowerCase()` against a map keyed `enginestem`/`enginestemengine`, so this mirrors. Let me confirm node labels are typically the PascalCase engine class name (so lowercasing reconciles with the lowercased stem key).

### Assistant | 2026-06-22T02:31:38.399Z

[tool_use: Bash]

### User | 2026-06-22T02:31:43.512Z

[tool_result] (node:62720) ExperimentalWarning: CommonJS module H:\prism\[eval] is loading ES Module H:\prism\scripts\lib\engine-import-fingerprint.mjs using require().
Support for loading ES Module in require() is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
--- mjs require check (ESM) above may fail; that is fine ---

### Assistant | 2026-06-22T02:31:48.894Z

The speed-feed glob returned nothing (engines may live elsewhere). Let me confirm the actual key reconciliation by running the real map build and checking that node labels resolve — i.e., the lowercased map keys match what the wire looks up. The action-surface sibling uses the identical `String(name).toLowerCase()` lookup, so if it works there it works here. Let me verify the map key format from the real build directly.

### Assistant | 2026-06-22T02:31:53.003Z

[tool_use: Bash]

### User | 2026-06-22T02:31:56.918Z

[tool_result] map size: 3847
sample keys: [
  'a2aprotocolengine',
  'abrasivejetmachiningengine',
  'absorptionchillerengine',
  'abstractionhierarchyengine',
  'accesscontrollistengine',
  'accessibilityanalysisengine',
  'accountinghardeningengine',
  'accumulatorengine'
]
non-lowercase keys: 0
idf size: 1546
negative idf count: 0
   a2aprotocolengine -> zod
   accesscontrollistengine -> crypto utils/logger

... [+54 chars truncated]

### Assistant | 2026-06-22T02:32:01.348Z

Live data confirms: 3847 engines mapped, all keys lowercase, IDF map of 1546 tokens with zero negative values, and real fingerprints produced. One interesting observation: `accessibilityanalysisengine -> workpiecestateengine` — that survivor looks like an engine-ish token. Let me check whether that's an actual `/engines/` path that escaped the drop, or a non-engine lib that happens to be named `workpiecestateengine`.

### Assistant | 2026-06-22T02:32:04.155Z

[tool_use: Bash]

### User | 2026-06-22T02:32:10.376Z

[tool_result] --- find the AccessibilityAnalysisEngine file imports ---
FILE: mcp-server/src/engines/AccessibilityAnalysisEngine.ts
21:import type {
24:} from "./WorkpieceStateEngine.js";

### Assistant | 2026-06-22T02:32:15.139Z

Found a real finding. The import is `import type { ... } from "./WorkpieceStateEngine.js";` — this is an engine-to-engine import that the `/engines/` drop did NOT catch, because the path is a **same-directory relative import** (`./WorkpieceStateEngine.js`) with no `/engines/` segment in the literal. The normalization strips the `./` prefix and the suffix, leaving `workpiecestateengine`.

Let me quantify how widespread this leakage is — engine-to-engine imports surviving as tokens — since the spec's entire premise is that this feature is an INDEPENDENT structural signal that drops engine adjacency (which was ruled out).

### Assistant | 2026-06-22T02:32:23.064Z

[tool_use: Bash]

### User | 2026-06-22T02:32:27.592Z

[tool_result] total tokens across corpus: 6120
engine-adjacency leak tokens (token matches a real engine stem): 2198
engines whose fingerprint contains >=1 engine-adjacency token: 1024 / 3847
samples:
   accessibilityanalysisengine <- workpiecestateengine
   acquisitionrecommendationengine <- machineconsumerbindingengine
   acquisitionrecommendationengine <- calculatorprismmodeengine
   actualcostengine <- time
... [+343 chars truncated]

### Assistant | 2026-06-22T02:32:36.791Z

This is a significant, verified spec-fidelity defect. The numbers are unambiguous:

- **2198 of 6120 corpus tokens (36%)** are engine-to-engine adjacency tokens (token equals a real engine stem).
- **1024 of 3847 engines (27%)** have at least one such token in their fingerprint.
- **2054 of these survive** into the embedded top-12 text (1022 engines).

The root cause: engines in `mcp-server/src/engines/` are largely **flat** (3847 stems, and the sample keys show no subdir nesting in the stem). So engine-to-engine imports are written as same-directory relative paths like `./WorkpieceStateEngine.js` — which contain **no `/engines/` segment**. The `normalizePath` guard at line 56 (`if (raw.includes("/engines/")) return "";`) only catches imports written as `../../engines/...` (the cross-subdir form the test fixtures use). The far more common same-dir form sails straight through.

Let me confirm the spec's stated intent so I can grade this precisely against what was promised, and verify how the action-surface sibling (which the doc/commit leans on as the leak-free precedent) handles this is not relevant here — this is a structural drop, not a label drop. Let me read the spec's normalization section.

### Assistant | 2026-06-22T02:32:39.873Z

[tool_use: Bash]

### User | 2026-06-22T02:32:44.880Z

[tool_result] 7:The deployed GHOST_SOURCE text embedding already gives **23/43 dispatcher-class separability @ meanMargin 0.0527** (min-class 5). Adding more TEXT/action vocab is exhausted (action-surface measured **+0.0018, redundant** — `reference_gnn_action_surface_insitu_measure_2026_06_21`). Coverage is **feature-limited, not pool-limited** (cap=20 ref-pool growth REGRESSED live coverage 27.4%→5.5% — `refe
... [+1983 chars truncated]

### Assistant | 2026-06-22T02:33:00.564Z

The spec is explicit and self-consistent in its intent, which confirms the defect:

- Line 9: "the engine→engine 1-hop import adjacency, which is ALREADY RULED OUT... **Do NOT rebuild it.**"
- Line 12: "the set of **NON-engine** module imports... everything EXCEPT `./engines/` paths"
- Line 13: "Coverage ~100%... **vs the 28% of the dead engine→engine adjacency**"
- Line 21: "DROP any path **containing `/engines/`**"

There is a tension between line 21 (drop paths *containing `/engines/`*) and lines 9/12/13 (the *intent* is to drop ALL engine→engine adjacency and rebuild NOTHING of it). The implementation followed line 21 literally (`raw.includes("/engines/")`), but because the engines dir is flat, the dominant engine→engine import form is the same-dir `./WorkpieceStateEngine.js` which contains no `/engines/` substring. Result: the implementation **rebuilds 27% of exactly the dead adjacency signal the spec says NOT to rebuild**, contaminating the new feature with the very signal it was designed to be independent of. The "INDEPENDENT structural signal" premise (line 7, 30) is violated for 1022/3847 engines.

Note the leak-FREE claim (R12) is technically still intact: a same-dir engine import is still a structural property of the .ts file and contains no dispatcher label — so VERIFY #4 passes. The problem is **feature efficacy/spec-fidelity**, not label leakage: the feature is supposed to be independent of the ruled-out adjacency, and for 27% of engines it is not.

I have enough to grade. Let me do a final confirmation that the `normalizePath` engine-stem detection isn't somehow handled elsewhere (e.g., the map keys could be used to filter) — confirming no post-filter exists in the lib.

### Assistant | 2026-06-22T02:33:02.252Z

[tool_use: Bash]

### User | 2026-06-22T02:33:08.658Z

[tool_result] 25: * Pure-export contract (for tests): extractNonEngineImports, buildImportFingerprintMap,
68:// extractNonEngineImports
89:export function extractNonEngineImports(src) {
116: * *.d.ts), call extractNonEngineImports per file, and return
130:  _walkEngineFiles(enginesDir, map, fsImpl);
134:/** Recursive walker. Mirrors walkEngineSources in build-node-embeddings.mjs. */
135:function _walkEngineFile
... [+433 chars truncated]

### Assistant | 2026-06-22T02:33:40.404Z

Confirmed: no engine-stem post-filter exists — the only adjacency guard is the `/engines/` substring check in `normalizePath` (line 56), which is structurally insufficient for the flat engines dir. My review is complete.

---

VERDICT: FAIL

summary: The lib is clean, well-documented, ASCII-only, faithfully mirrors the action-surface sibling, and its 24 tests are real assertions (24/24 pass, 0 skipped). The IDF formula and wire integration are byte-identical-safe and default-OFF as claimed, and the leak-free (no-label) contract holds. BUT there is one P1 spec-fidelity defect: the engine→engine adjacency drop is incomplete — it catches only `/engines/`-substring paths, missing the dominant same-directory `./XEngine.js` form, so the feature rebuilds ~27% of the exact "ruled-out" adjacency signal the spec forbids, contaminating the "INDEPENDENT structural signal" premise.

findings:

- [P1] `H:/prism/scripts/lib/engine-import-fingerprint.mjs:56` — `normalizePath` drops engine→engine adjacency only via `raw.includes("/engines/")`, but the `mcp-server/src/engines/` tree is effectively FLAT (3847 stems, no subdir nesting in keys), so engine→engine imports are written as same-dir relatives like `import type {...} from "./WorkpieceStateEngine.js"` which contain NO `/engines/` substring and survive normalization as the token `workpiecestateengine`. Live measurement against the real engines dir: **2198 of 6120 corpus tokens (36%) match a real engine stem; 1024/3847 engines (27%) carry >=1 such token; 2054 of them survive into the embedded top-12 text (1022 engines)**. This is the precise signal the spec says is RULED OUT and must NOT be rebuilt (spec lines 9 "Do NOT rebuild it", 12 "everything EXCEPT engine paths", 13 "vs the 28% dead engine→engine adjacency"). The feature's stated value — an INDEPENDENT structural signal the text embeddings cannot see (spec line 7) — is violated for 27% of engines, and the OFF-vs-ON separability measurement (the declared next step) will be c
... [+3486 chars truncated]
