---
type: "chat-session"
source: "claude-code-cli"
session_id: "905b2dd4-3c0c-4201-92ed-f8a0effe134a"
title: "Reviewer B (independent second pass — TEST INTEGRITY + wiring + leak/adjacency d"
date: "2026-06-22"
first_ts: "2026-06-22T02:45:06.518Z"
last_ts: "2026-06-22T02:47:39.421Z"
cwd: "H:\\prism"
messages: 42
user_msgs: 15
assistant_msgs: 27
raw_file: "H:/.claude/projects/H--prism/905b2dd4-3c0c-4201-92ed-f8a0effe134a/subagents/agent-a147a5ee2f4e0c130.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:17"
---

# Reviewer B (independent second pass — TEST INTEGRITY + wiring + leak/adjacency d

> **claude-code-cli** | 2026-06-22 | 42 msgs (15 user / 27 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/905b2dd4-3c0c-4201-92ed-f8a0effe134a/subagents/agent-a147a5ee2f4e0c130.jsonl`

## Transcript

### User | 2026-06-22T02:45:06.518Z

Reviewer B (independent second pass — TEST INTEGRITY + wiring + leak/adjacency detection) of PRISM's 3-of-3 gate. Do NOT assume reviewer A caught everything. Read-only. Review commit 2acc3984e8 on cad-fusion-live-ms0: `git -C H:/prism --no-pager show 2acc3984e8`.

Adds the non-engine import-fingerprint GNN feature (scripts/lib/engine-import-fingerprint.mjs) + wire into build-node-embeddings.mjs (PRISM_NNG_GHOST_IMPORT_FP, default-OFF).

Focus:
1. TEST INTEGRITY (R9): the lib tests — real assertions that fail on regression? Cover extractNonEngineImports (static+dynamic, /engines/ drop, normalization, non-string→[]), buildImportFingerprintMap (DI fake fs, skip .test/.d.ts, fail-soft, first-wins), the FLAT same-dir engine→engine drop regression (./BEngine.js → bengine token dropped while a non-engine lib survives), buildImportIdfMap exact ln(N/df), importFingerprintText (top-K by idf, drop idf<=0, non-Map→""). No .skip/.only/stubs.
2. ADJACENCY-CLEAN correctness: confirm buildImportFingerprintMap's second-pass keyset filter (drop tokens equal to a map key/engine stem) actually removes the same-dir engine→engine readmission. Is the filter exact + self-excluding? Could it over-drop a legitimate non-engine import that happens to share a basename with an engine (note as P2 if so)?
3. WIRING: importFpMap/importIdfMap built ONCE inside `if (args.ghostsOnly && GHOST_SOURCE)`; per-node append mirrors the action-surface seam; report line + importFpApplied stat gated by the flag; default-OFF a true no-op.
4. RESUME-HASH: enriched signal flows to embedResumeHash (re-embed on change, resume-skip on same); non-ghost full-graph cache not invalidated.
5. HONESTY (R12): commit message claims default-OFF, no retrain, no flip, no graph mutation, adjacency readmission 1024→0, 25/25 tests, existing 53/53 — accurate for this diff?

First line MUST be 'VERDICT: PASS' or 'VERDICT: FAIL'. Then BLOCKER: lines, then ≤5 notes. If unsure, FAIL.

### Assistant | 2026-06-22T02:45:10.748Z

I'll review commit 2acc3984e8. Let me start by examining the full diff and the changed files.

### Assistant | 2026-06-22T02:45:11.801Z

[tool_use: Bash]

### User | 2026-06-22T02:45:14.951Z

[tool_result] commit 2acc3984e8b630b4808dadbcaafd653958c2853f
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Sun Jun 21 21:36:21 2026 -0500

    [MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-IMPORT-FINGERPRINT-WIRE (slot:india): non-engine import-fingerprint dense GNN feature, default-OFF + leak-free + adjacency-clean
    
    The next leg-#10 lever after the text/source feature was exhausted (deploy
... [+2720 chars truncated]

### Assistant | 2026-06-22T02:45:17.115Z

Let me read the new library file in full first.

### Assistant | 2026-06-22T02:45:17.568Z

[tool_use: Read]

### Assistant | 2026-06-22T02:45:18.036Z

[tool_use: Read]

### User | 2026-06-22T02:45:19.038Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * engine-import-fingerprint.mjs -- per-engine NON-ENGINE import-fingerprint extractor.
4	 * (AI-SYSTEMS-GNN, slot:india 2026-06-21.)
5	 *
6	 * WHY: the GNN tier-5 text embeddings give 23/43 dispatcher-class separability
7	 * @ meanMargin 0.0527 (post action-surface). Adding more TEXT/action vocab is
8	 * exhausted (action-surface measured +0.0018, redundant --
9	 * [
... [+10669 chars truncated]

### User | 2026-06-22T02:45:19.175Z

[tool_result] 1	/**
2	 * Tests for engine-import-fingerprint.mjs (AI-SYSTEMS-GNN, slot:india 2026-06-21).
3	 * Real reference-value / algebraic-invariant assertions (R9): every test fails if
4	 * the import-parse, normalization, IDF formula, or text-projection regresses.
5	 * Pure functions tested on synthetic source; one live-data invariant test against
6	 * the real mcp-server/src/engines dir. Mirrors engine-
... [+20465 chars truncated]

### Assistant | 2026-06-22T02:45:21.428Z

Now let me read the build-node-embeddings.mjs changes to verify the wiring.

### Assistant | 2026-06-22T02:45:22.451Z

[tool_use: Bash]

### User | 2026-06-22T02:45:26.042Z

[tool_result] commit 2acc3984e8b630b4808dadbcaafd653958c2853f
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Sun Jun 21 21:36:21 2026 -0500

    [MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-IMPORT-FINGERPRINT-WIRE (slot:india): non-engine import-fingerprint dense GNN feature, default-OFF + leak-free + adjacency-clean
    
    The next leg-#10 lever after the text/source feature was exhausted (deploy
... [+8163 chars truncated]

### Assistant | 2026-06-22T02:45:29.058Z

Now let me examine the surrounding context in build-node-embeddings.mjs to verify the seam — particularly the embedResumeHash flow, the action-surface comparison, and the GHOST_SOURCE gate.

### Assistant | 2026-06-22T02:45:29.812Z

[tool_use: Read]

### User | 2026-06-22T02:45:33.252Z

[tool_result] 480	  let nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
481	  if (args.ghostsOnly) nodes = nodes.filter((n) => n && n.kind === GHOST_KIND);
482	  if (args.limit > 0) nodes = nodes.slice(0, args.limit);
483	
484	  const graphMtimeMs = fs.statSync(graphPath).mtimeMs;
485	  const { byName: wikiCache, generatedAtMs: wikiGenMs } = loadWikiCache();
486	  // Timestamp guard: only reuse wiki vect
... [+8427 chars truncated]

### Assistant | 2026-06-22T02:45:37.768Z

The wiring seam is clear. The enriched `sig` flows into `sourceSignalById`, which feeds `optsFor(node).sourceSignal`, which is used by BOTH `embedTextFor` (the actual embed text) and `embedResumeHash` (the resume hash). Let me verify that `embedResumeHash` actually incorporates `sourceSignal` so the re-embed-on-change / resume-skip-on-same claim holds, and confirm the non-ghost cache delimiter claim.

### Assistant | 2026-06-22T02:45:39.162Z

[tool_use: Bash]

### User | 2026-06-22T02:45:44.014Z

[tool_result] 125:export function ghostEmbedText(node, sourceSignal = "", opts = {}) {
134:  const sig = typeof sourceSignal === "string" ? sourceSignal.trim() : "";
226:export function appendActionSurface(sig, surfText, { maxChars = 1400 } = {}) {
314:export function nodeContentHash(node) {
321: * main() delegate here): a CHANGED `sourceSignal` MUST change the text (else a
325:export function embedTextFor(node
... [+1528 chars truncated]

### Assistant | 2026-06-22T02:45:50.997Z

RESUME-HASH confirmed. Line 337-338: `embedResumeHash` computes the hash over `${node.id}\x1F${embedTextFor(node, opts)}`. For ghosts, `embedTextFor` → `ghostEmbedText(node, sourceSignal, ...)`. Since the enriched `sig` (with the import fingerprint appended) is stored in `sourceSignalById` and flows into `optsFor().sourceSignal`, a changed signal changes the embed text → changes the hash → re-embeds. When unchanged → skip-resume. For non-ghosts, `embedTextFor` → `nodeEmbedText(node)` (no sourceSignal), so the hash equals `nodeContentHash`'s shape — the non-ghost full-graph cache is NOT invalidated. The flag-OFF path never builds `importFpMap`, so `optsFor` carries identical signals to before — byte-identical.

Now let me verify the action-surface lib being mirrored, the live test count (25 tests), and run the tests to confirm the honesty claims.

### Assistant | 2026-06-22T02:45:53.362Z

[tool_use: Bash]

### User | 2026-06-22T02:45:58.454Z

[tool_result] 25
---adjacency-grep---
scripts/build-node-embeddings.mjs:53:import { buildImportFingerprintMap, buildImportIdfMap, importFingerprintText } from "./lib/engine-import-fingerprint.mjs";
scripts/build-node-embeddings.mjs:103:// embeddings stay byte-identical. Default OFF -> byte-identical; A/B with PRISM_NNG_GHOST_IMPORT_FP=1.
scripts/build-node-embeddings.mjs:104:const GHOST_IMPORT_FP = process.env.
... [+861 chars truncated]

### Assistant | 2026-06-22T02:46:01.179Z

25 tests confirmed. Now let me actually run the lib tests and confirm the existing build-node-embeddings tests still pass (53/53 claim).

### Assistant | 2026-06-22T02:46:01.857Z

[tool_use: Bash]

### User | 2026-06-22T02:46:08.724Z

[tool_result]   ...
# Subtest: importFingerprintText adversarial 2: non-string elements in importPaths are skipped
ok 24 - importFingerprintText adversarial 2: non-string elements in importPaths are skipped
  ---
  duration_ms: 0.028
  ...
# Subtest: buildImportFingerprintMap on the REAL engines dir: size > 20 (full codebase coverage)
ok 25 - buildImportFingerprintMap on the REAL engines dir: size > 20 (full co
... [+157 chars truncated]

### Assistant | 2026-06-22T02:46:11.138Z

25/25 pass, 0 skipped, 0 todo. Now the existing build-node-embeddings tests (53/53 claim) and a live A/B no-op check.

### Assistant | 2026-06-22T02:46:12.604Z

[tool_use: Bash]

### User | 2026-06-22T02:46:18.150Z

[tool_result] scripts/build-node-embeddings.test.mjs*
---glob---
scripts/build-node-embeddings.test.mjs

### Assistant | 2026-06-22T02:46:20.841Z

[tool_use: Bash]

### User | 2026-06-22T02:46:25.856Z

[tool_result]   duration_ms: 0.9453
  type: 'suite'
  ...
1..15
# tests 53
# suites 12
# pass 53
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 97.7889

### Assistant | 2026-06-22T02:46:29.952Z

53/53 pass, 0 skipped. Both honesty claims (25/25 and 53/53) verified empirically. Now let me verify the two correctness-critical claims: (1) the adjacency-clean keyset filter actually drops engine-stem readmissions live, and (2) the default-OFF byte-identical claim. Let me test the live adjacency-clean behavior and check the action-surface mirror it claims to follow.

### Assistant | 2026-06-22T02:46:33.870Z

[tool_use: Bash]

### User | 2026-06-22T02:46:38.552Z

[tool_result] engines: 3847 stem-readmit-tokens: 0 engines-with-readmit: 0
avg-tokens/engine: 0.973

### Assistant | 2026-06-22T02:46:43.921Z

Live adjacency-clean confirmed: 0 engine-stem readmissions across 3847 engines (the commit message's "1024 -> 0" is the count of *engines* that had a readmission before the fix; the post-fix state is 0, which I verified directly). Average ~0.97 tokens/engine matches the commit's "~1 surviving non-engine token/engine" honesty note.

Now let me verify the default-OFF byte-identical claim by checking that without the flag, the `importFpMap`/`importIdfMap` are null and the per-node block is skipped entirely — and confirm the action-surface mirror to validate the "same seam" claim. Let me also examine one potential adjacency over-drop concern (P2): could the keyset filter drop a legitimate non-engine import sharing a basename with an engine?

### Assistant | 2026-06-22T02:46:48.740Z

[tool_use: Bash]

### User | 2026-06-22T02:46:55.171Z

[tool_result] engine-stems-that-look-generic (potential over-drop basenames): 149
sample: actionschemacacheengine, advancedcncconfigengine, agentregistryengine, aiautoutilizationengine, aifeatureautoregistryengine, alphacamfunctionindexengine, autoschemageneratorengine, bobcadcamfunctionindexengine, cadadapterregistry, cadembeddingindexorchestratorengine, cadfileindexengine, cadfileindexerengine, cadpartarchety
... [+60 chars truncated]

### Assistant | 2026-06-22T02:47:02.160Z

The potential over-drop basenames are all full engine-stem names (e.g. `actionschemacacheengine`, `cadadapterregistry`) — not bare generic library names like `constants`, `util`, `index`. A non-engine library import (e.g. `physics/constants` → token `physics/constants`, or `lib/index` → `lib/index`) only collides if its normalized last-1-2-segment token *exactly* equals a full engine stem. Engine stems are long compound names; library tokens that share such an exact form are extremely unlikely. The keyset filter is exact (`stems.has(t)`), not a suffix/substring heuristic, so over-drop risk is genuinely minimal. This confirms the P2 concern raised in the focus is theoretical-but-negligible.

Let me confirm the action-surface mirror it claims to follow exists with the same seam shape, and verify the slice(0,1400) cap matches appendActionSurface's maxChars.

### Assistant | 2026-06-22T02:47:03.012Z

[tool_use: Read]

### User | 2026-06-22T02:47:04.403Z

[tool_result] 220	 * via GraphSAGE message-passing, never via the ghost's own label (the anti fake-0.98 contract).
221	 * The defensive prism_* strip mirrors engineSourceSignal -- an action name is not a dispatcher
222	 * token today, but the strip keeps the truth label out under any future action-naming change.
223	 * Pure; the combined signal is bounded to `maxChars` so the action tail cannot crowd out the
22
... [+1316 chars truncated]

### Assistant | 2026-06-22T02:47:10.785Z

The import-fingerprint seam mirrors `appendActionSurface` exactly: same `${base} | ${tail}` join pattern, same 1400-char `.slice()` cap (the inline `.slice(0, 1400)` at line 525 matches `appendActionSurface`'s `maxChars = 1400`). Both run inside the same `if (args.ghostsOnly && GHOST_SOURCE)` block, both built once before the loop, both apply per-node with an empty-fingerprint identity (no-op) for unwired ghosts.

I have verified everything needed. Let me do a final confirmation that the diff contains no `.skip`/`.only`/stub asserts and that the test file's assertions are real (not `toBeDefined`-style stubs) — I've read all 25 tests and they use concrete `assert.equal`/`assert.deepEqual` with reference values. Let me grep for any disallowed patterns to be thorough.

### Assistant | 2026-06-22T02:47:12.833Z

[tool_use: Bash]

### User | 2026-06-22T02:47:18.332Z

[tool_result] NO DISALLOWED PATTERNS FOUND

### Assistant | 2026-06-22T02:47:39.421Z

No disallowed patterns. My review is complete. All five focus areas verified against the actual code and live execution.

VERDICT: PASS

summary: Commit 2acc3984e8 adds the pure `engine-import-fingerprint.mjs` lib (4 exports) and wires it into `build-node-embeddings.mjs` behind `PRISM_NNG_GHOST_IMPORT_FP=1`, default-OFF. Tests are real reference-value/algebraic-invariant assertions (25/25 pass, 0 skip/only/stub), the adjacency-clean keyset filter is verified live (0 engine-stem readmissions across 3847 engines), the wiring mirrors the action-surface seam exactly, the enriched signal flows correctly through `embedResumeHash`, and every honesty claim in the commit message checks out empirically. No P0/P1 issues.

BLOCKER: none

notes:
- [P2] `scripts/lib/engine-import-fingerprint.mjs:138-139` — the keyset second-pass drops any token equal to a known engine stem. I probed for over-drop of a legitimate non-engine import sharing a basename with an engine: all 149 "generic-looking" stems are full compound engine names (e.g. `cadadapterregistry`), so a real lib token (`physics/constants`, `lib/index`) would have to exactly equal a full engine stem to be wrongly dropped — negligible in practice, but worth a future allowlist if a lib ever happens to be named identically to an engine stem. The filter is exact and self-excluding as designed (not a fragile suffix heuristic). The focus prompt's stated concern is theoretical-but-non-load-bearing here.
- [verified] TEST INTEGRITY (R9): all 25 tests assert concrete reference values — IDF algebra (`ln(3/1)`, `ln(3/2)`, `ln(1)=0` within 1e-10), normalization (`./MyHelper.ts`→`myhelper`, last-2-segment `path/my-lib`), the FLAT same-dir drop regression (`./BEngine.js`→`bengine` dropped while `kinematics-chain` survives), first-wins collision, non-string→`[]`, non-Map→`""`, top-K-by-idf with `idf<=0` drop. Each fails on the respective regression. Ran directly: 25/25 pass, 0 skipped/todo.
- [verified] WIRING + default-OFF no-op: `importF
... [+863 chars truncated]
