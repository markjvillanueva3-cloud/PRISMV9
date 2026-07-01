---
type: "chat-session"
source: "claude-code-cli"
session_id: "905b2dd4-3c0c-4201-92ed-f8a0effe134a"
title: "Reviewer A (holistic) of PRISM's 3-of-3 scrutiny gate. Read-only. Review commit "
date: "2026-06-22"
first_ts: "2026-06-22T02:44:54.674Z"
last_ts: "2026-06-22T02:49:12.544Z"
cwd: "H:\\prism"
messages: 60
user_msgs: 21
assistant_msgs: 39
raw_file: "H:/.claude/projects/H--prism/905b2dd4-3c0c-4201-92ed-f8a0effe134a/subagents/agent-a900e2ea0b88e8ec0.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:17"
---

# Reviewer A (holistic) of PRISM's 3-of-3 scrutiny gate. Read-only. Review commit 

> **claude-code-cli** | 2026-06-22 | 60 msgs (21 user / 39 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/905b2dd4-3c0c-4201-92ed-f8a0effe134a/subagents/agent-a900e2ea0b88e8ec0.jsonl`

## Transcript

### User | 2026-06-22T02:44:54.674Z

Reviewer A (holistic) of PRISM's 3-of-3 scrutiny gate. Read-only. Review commit 2acc3984e8 on branch cad-fusion-live-ms0: `git -C H:/prism --no-pager show 2acc3984e8`.

It adds an OPT-IN DEFAULT-OFF dense GNN node feature — the "non-engine import fingerprint" (scripts/lib/engine-import-fingerprint.mjs + .test.mjs) wired into scripts/build-node-embeddings.mjs behind PRISM_NNG_GHOST_IMPORT_FP.

Acceptance criteria:
1. No stubs/TODOs/placeholder returns.
2. Tests are concrete reference-value assertions (no toBeDefined/toBeTruthy stubs); ≥3 failure + ≥2 adversarial for the new lib; includes a regression test that a FLAT same-dir engine import (./XEngine.js) is DROPPED (the ruled-out engine→engine adjacency), and a live-data invariant.
3. No inlined physics constants (N/A).
4. No new floating promises / any-spread anti-patterns.
5. DEFAULT-OFF byte-identical: with PRISM_NNG_GHOST_IMPORT_FP unset, the deployed embed text + resume hash are byte-identical (the new path fully gated).
6. LEAK-FREE: the fingerprint is import paths only (structural, no dispatcher label); a no-import / all-universal engine → empty → no-op; the adjacency-clean keyset filter removes engine-stem tokens.

First line MUST be 'VERDICT: PASS' or 'VERDICT: FAIL'. Then BLOCKER: lines, then ≤5 notes. If unsure, FAIL.

### Assistant | 2026-06-22T02:44:58.454Z

I'll review commit 2acc3984e8 thoroughly. Let me start by reading the commit and all changed files.

### Assistant | 2026-06-22T02:44:58.969Z

[tool_use: Bash]

### User | 2026-06-22T02:45:04.847Z

[tool_result] commit 2acc3984e8b630b4808dadbcaafd653958c2853f
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Sun Jun 21 21:36:21 2026 -0500

    [MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-IMPORT-FINGERPRINT-WIRE (slot:india): non-engine import-fingerprint dense GNN feature, default-OFF + leak-free + adjacency-clean
    
    The next leg-#10 lever after the text/source feature was exhausted (deploy
... [+2720 chars truncated]

### Assistant | 2026-06-22T02:45:26.121Z

Let me read the full files end-to-end. I'll read all three changed files.

### Assistant | 2026-06-22T02:45:27.296Z

[tool_use: Read]

### User | 2026-06-22T02:45:27.808Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\engine-import-fingerprint.mjs' was already read 9s ago in this session and is unchanged (mtime 1782095670414). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-22T02:45:27.824Z

[tool_use: Read]

### User | 2026-06-22T02:45:28.268Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\engine-import-fingerprint.test.mjs' was already read 10s ago in this session and is unchanged (mtime 1782095704168). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACH
... [+4 chars truncated]

### Assistant | 2026-06-22T02:45:35.387Z

The read-once guard says these are already in context, but I haven't actually seen their content yet — only the commit message. Let me get the full diff content via git show, and read the wired build file.

### Assistant | 2026-06-22T02:45:35.969Z

[tool_use: Bash]

### User | 2026-06-22T02:45:41.102Z

[tool_result] commit 2acc3984e8b630b4808dadbcaafd653958c2853f
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Sun Jun 21 21:36:21 2026 -0500

    [MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-IMPORT-FINGERPRINT-WIRE (slot:india): non-engine import-fingerprint dense GNN feature, default-OFF + leak-free + adjacency-clean
    
    The next leg-#10 lever after the text/source feature was exhausted (deploy
... [+13168 chars truncated]

### Assistant | 2026-06-22T02:45:44.725Z

Now the test file and the build wiring diff.

### Assistant | 2026-06-22T02:45:45.772Z

[tool_use: Bash]

### User | 2026-06-22T02:45:52.693Z

[tool_result] commit 2acc3984e8b630b4808dadbcaafd653958c2853f
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Sun Jun 21 21:36:21 2026 -0500

    [MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-IMPORT-FINGERPRINT-WIRE (slot:india): non-engine import-fingerprint dense GNN feature, default-OFF + leak-free + adjacency-clean
    
    The next leg-#10 lever after the text/source feature was exhausted (deploy
... [+22445 chars truncated]

### Assistant | 2026-06-22T02:45:55.330Z

Now let me read the build-node-embeddings.mjs wiring diff and the surrounding context to verify the gate is byte-identical and correctly seamed.

### Assistant | 2026-06-22T02:45:56.318Z

[tool_use: Bash]

### User | 2026-06-22T02:46:00.887Z

[tool_result] commit 2acc3984e8b630b4808dadbcaafd653958c2853f
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Sun Jun 21 21:36:21 2026 -0500

    [MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-IMPORT-FINGERPRINT-WIRE (slot:india): non-engine import-fingerprint dense GNN feature, default-OFF + leak-free + adjacency-clean
    
    The next leg-#10 lever after the text/source feature was exhausted (deploy
... [+8163 chars truncated]

### Assistant | 2026-06-22T02:46:04.518Z

Now let me verify the surrounding context in build-node-embeddings.mjs to confirm the gate is fully default-OFF byte-identical — I need to see the exact insertion point and how `sig` was handled before/after, plus the existing action-surface seam this mirrors. Let me read the relevant region of the live file.

### Assistant | 2026-06-22T02:46:05.091Z

[tool_use: Read]

### User | 2026-06-22T02:46:06.924Z

[tool_result] 488	  const wikiSafe = wikiGenMs > 0 && wikiGenMs <= graphMtimeMs;
489	
490	  const existing = loadExisting();
491	
492	  // GNN-F0 macroF1-lift: resolve a leak-free SOURCE signal per ghost from its .ts.
493	  // Built once before the embed loop so the resume-hash (below) reflects the ACTUAL
494	  // embed text — otherwise a richer-text re-run would be wrongly skipped as "already
495	  // embedded
... [+3147 chars truncated]

### Assistant | 2026-06-22T02:46:11.769Z

The gate is clean: `GHOST_IMPORT_FP` is OFF by default, so both `importFpMap` and `importIdfMap` are `null`, the `if (importFpMap && importIdfMap)` block never executes, and `sig` is byte-identical. Let me verify the resume-hash path uses `sourceSignalById`, confirming the default-OFF byte-identical claim end-to-end, and check the existing action-surface seam (`appendActionSurface`) for the `.slice(0,1400)` parity.

### Assistant | 2026-06-22T02:46:12.754Z

[tool_use: Grep]

### User | 2026-06-22T02:46:14.623Z

[tool_result] 226:export function appendActionSurface(sig, surfText, { maxChars = 1400 } = {}) {
331: * delimiter as nodeContentHash so that for a non-ghost node embedResumeHash EXACTLY
337:export function embedResumeHash(node, opts = {}) {
496:  const sourceSignalById = new Map();
502:    // appendActionSurface is a no-op for a truly-unwired ghost (empty surface) -> the
519:              if (surf) { sig = appe
... [+691 chars truncated]

### Assistant | 2026-06-22T02:46:16.999Z

Let me view `appendActionSurface` and `embedResumeHash` to confirm the import-fp seam mirrors the cap convention and that the resume hash flows through `sourceSignalById`.

### Assistant | 2026-06-22T02:46:17.878Z

[tool_use: Read]

### User | 2026-06-22T02:46:19.303Z

[tool_result] 218	 * returns `sig` UNCHANGED: the no-op for the actual classification target. The signal therefore
219	 * lives only on the codebase-WIRED refs (real backing actions) and generalizes to unwired ghosts
220	 * via GraphSAGE message-passing, never via the ghost's own label (the anti fake-0.98 contract).
221	 * The defensive prism_* strip mirrors engineSourceSignal -- an action name is not a dispatc
... [+1726 chars truncated]

### Assistant | 2026-06-22T02:46:23.003Z

The import-fp seam inlines the `| imports: ...` + `.slice(0, 1400)` directly rather than reusing a helper. This mirrors `appendActionSurface`'s `| actions: ...` + `.slice(0, maxChars=1400)` convention. The cap is applied. Now let me run the tests to verify the 25/25 claim and the default-OFF byte-identical claim.

### Assistant | 2026-06-22T02:46:23.772Z

[tool_use: Bash]

### User | 2026-06-22T02:46:29.483Z

[tool_result]   ...
# Subtest: importFingerprintText adversarial 1: duplicate tokens in input -- only first occurrence scored
ok 23 - importFingerprintText adversarial 1: duplicate tokens in input -- only first occurrence scored
  ---
  duration_ms: 0.0542
  ...
# Subtest: importFingerprintText adversarial 2: non-string elements in importPaths are skipped
ok 24 - importFingerprintText adversarial 2: non-string 
... [+401 chars truncated]

### Assistant | 2026-06-22T02:46:32.172Z

25/25 pass. Now let me verify the existing build-node-embeddings test suite still passes (the 53/53 default-OFF byte-identical claim).

### Assistant | 2026-06-22T02:46:33.459Z

[tool_use: Bash]

### User | 2026-06-22T02:46:38.132Z

[tool_result] Exit code 2
scripts/build-node-embeddings.test.mjs*
---glob---

### Assistant | 2026-06-22T02:46:40.877Z

[tool_use: Bash]

### User | 2026-06-22T02:46:44.769Z

[tool_result]   ...
1..15
# tests 53
# suites 12
# pass 53
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 188.356

### Assistant | 2026-06-22T02:46:48.864Z

53/53 pass. Now let me verify the default-OFF byte-identical claim empirically and check for `.skip`/`.only` and stub assertions in the test file, plus confirm no floating promises in the lib.

### Assistant | 2026-06-22T02:46:51.627Z

[tool_use: Bash]

### User | 2026-06-22T02:46:56.635Z

[tool_result] === .skip/.only/toBeDefined/toBeTruthy in test ===
NONE FOUND (good)

=== TODO/FIXME/stub/placeholder in lib ===
NONE FOUND (good)

=== assert call count in test ===
60

### Assistant | 2026-06-22T02:47:01.185Z

No skips, no stubs, no TODOs, 60 concrete assertions across 25 tests. Now let me empirically prove the default-OFF byte-identical invariant: run the embed text construction with the flag OFF vs unset to confirm the resume hash is unaffected. The strongest proof is that the gate constant resolves to a no-op. Let me verify the env gate semantics and that no other code path references `GHOST_IMPORT_FP` outside the gated block.

### Assistant | 2026-06-22T02:47:02.675Z

[tool_use: Bash]

### User | 2026-06-22T02:47:06.934Z

[tool_result] === all GHOST_IMPORT_FP / importFp refs ===
53:import { buildImportFingerprintMap, buildImportIdfMap, importFingerprintText } from "./lib/engine-import-fingerprint.mjs";
103:// embeddings stay byte-identical. Default OFF -> byte-identical; A/B with PRISM_NNG_GHOST_IMPORT_FP=1.
104:const GHOST_IMPORT_FP = process.env.PRISM_NNG_GHOST_IMPORT_FP === "1";
497:  let sourceResolved = 0, sourceMissing = 0
... [+1002 chars truncated]

### Assistant | 2026-06-22T02:47:13.483Z

The gate is fully contained: when `GHOST_IMPORT_FP` is false, `importFpMap`/`importIdfMap` are both `null`, the `if (importFpMap && importIdfMap)` block is dead, `importFpApplied` stays 0, and the stats line at 641 is not printed. `sig` is computed exactly as before. The `embedResumeHash` flows through `sourceSignalById` (line 548), which is unchanged when OFF — so the resume hash is byte-identical. Let me empirically prove byte-identical by running the dry-run / embed-text path OFF vs ON-with-no-effect. First, let me confirm there's a way to exercise this cheaply and check the leak-free claim more deeply — verify the keyset filter actually drops engine stems and that no dispatcher label leaks.

Let me verify the adjacency-clean second pass and the leak-free invariant directly by exercising the lib against the real engines dir.

### Assistant | 2026-06-22T02:47:21.823Z

[tool_use: Bash]

### User | 2026-06-22T02:47:26.751Z

[tool_result] engines in map: 3848
engines WITH non-engine tokens: 1906
total surviving tokens: 3750  avg/engine: 0.97
STEM READMISSION (must be 0): 0
tokens containing /engines/ substr (must be 0): 0
dispatcher/prism_ label leak (should be 0): 4
idf negative scores (must be 0): 0  idf size: 401
engines -> empty fingerprint (no-op): 1942  -> non-empty: 1906

### Assistant | 2026-06-22T02:47:35.197Z

Interesting — there are 4 tokens that match `prism_` or `dispatcher`. Let me investigate whether these are an actual leak (a dispatcher routing label) or benign (a domain library that happens to contain "dispatcher" in its path, which is structural, not a label).

### Assistant | 2026-06-22T02:47:37.855Z

[tool_use: Bash]

### User | 2026-06-22T02:47:43.436Z

[tool_result] dispatchers/documentlearningdispatcher  <- engine: automatedresourceharvestingpipeline
dispatchers/awarenessmiddleware  <- engine: autoprinttoprogrambridgeengine
dispatchers/awarenessmiddleware  <- engine: wedmmultiagentdispatchengine
dispatchers/awarenessmiddleware  <- engine: wedmprinttoprogramengine

### Assistant | 2026-06-22T02:47:53.940Z

These are import paths to files under `tools/dispatchers/` (e.g. `dispatchers/documentlearningdispatcher`, `dispatchers/awarenessmiddleware`) — i.e. a few engines structurally import a dispatcher module or the awareness middleware. This is a STRUCTURAL import path (which file the engine `import`s), not a routing-classification label. It is the same kind of structural signal as any other import. Critically:

1. It is NOT the dispatcher-class LABEL that the GNN is trying to predict — the GNN target is which dispatcher *routes to* the engine (the `prism_*` action-surface label), not which module the engine `import`s. An engine importing `dispatchers/awarenessmiddleware` does not reveal its routing class.
2. There is no `prism_*` token (those are stripped/never appear as import path segments). The matches are the literal substring "dispatcher" inside a filename, which is structural.

This is consistent with the leak-free contract as documented ("import paths are structural .ts properties, independent of which dispatcher routes to the engine; no label appears in an import path"). The `awarenessmiddleware` import appears on 3 engines from different domains (auto-print, wedm) — so it is a shared utility, not a class-discriminating leak; with IDF it would be low-salience. This is benign and not a P0/P1 leak. Let me confirm those tokens have low IDF (corroborating they're not a discriminating leak) and verify the dynamic-import regex can't over-match across statements.

### Assistant | 2026-06-22T02:48:00.112Z

[tool_use: Bash]

### User | 2026-06-22T02:48:04.826Z

[tool_result] N = 3848  ln(N) = 8.255
dispatchers/awarenessmiddleware  idf= 7.156696523117487
dispatchers/documentlearningdispatcher  idf= 8.255308811785596
two-line parse (must be [lib/one, lib/two]): ["lib/one","lib/two"]
comment-shaped import (broad regex may catch ghost; real must be present): ["lib/ghost","lib/real"]

### Assistant | 2026-06-22T02:48:15.223Z

Two findings to weigh:

1. `dispatchers/documentlearningdispatcher` has idf=8.255 (= ln(N), appears in exactly ONE engine). This is high-salience but it's still a structural import path, not the routing label. The engine `automatedresourceharvestingpipeline` importing `documentlearningdispatcher` is structural — it doesn't reveal which dispatcher routes TO `automatedresourceharvestingpipeline`. So not a leak of the prediction target. However, this surfaces a subtle point: paths under `tools/dispatchers/` are structural imports of dispatcher *modules*, which is arguably noise/borderline for an "import fingerprint" feature, but not a target-label leak. Benign — note-worthy at most.

2. The regex is intentionally broad and catches import-shaped text inside comments (`lib/ghost` from a commented line). The lib's own docstring and adversarial test 1 explicitly acknowledge this ("Our regex is intentionally broad (it can match import-shaped text in comments/strings) -- the /engines/ drop is the safety net"). This means a commented-out `import` could contribute a token. This is a minor precision issue, not a leak (no label leaks via this path), and the author documented it as a known, accepted tradeoff. It does not affect the default-OFF byte-identical guarantee. P2 at most.

Now let me empirically confirm the default-OFF byte-identical guarantee by exercising the actual embed-text resume path OFF vs the gate. Let me check that `engineSourceSignal` / `embedResumeHash` produce identical output when the flag is absent.

### Assistant | 2026-06-22T02:48:21.207Z

[tool_use: Bash]

### User | 2026-06-22T02:48:26.377Z

[tool_result] fpText empty -> ""
sig unchanged when no tokens: true
OFF gate => block dead => byte-identical: TRUE (importFpMap=null short-circuits if)

### Assistant | 2026-06-22T02:48:30.439Z

Now let me verify the test file's claimed acceptance criteria are actually present: (a) a flat same-dir engine import (`./BEngine.js`) DROPPED regression test, (b) ≥3 failure + ≥2 adversarial, (c) a live-data invariant. I've read all three in the test file. Let me also confirm no floating promises / any-spread anti-patterns in the lib (criterion 4) and check the lib has no async functions that could float.

### Assistant | 2026-06-22T02:48:35.293Z

[tool_use: Bash]

### User | 2026-06-22T02:48:40.454Z

[tool_result] === async/await/.then/Promise in lib (criterion 4) ===
76:// Dynamic import: await import("...") or import("...")  -- also multiline
81: * Parse static `import ... from "..."` AND dynamic `await import("...")` from a
185:  const docs = (map instanceof Map) ? [...map.values()] : [];

=== test taxonomy ===
25
failure tests:
3
adversarial tests:
4
live-data test:
2
flat same-dir drop regression:
1

### Assistant | 2026-06-22T02:48:45.826Z

All matches for async/await are in comments/docstrings (lines 76, 81) or a benign `[...map.values()]` array spread (line 185, spreading a Map's values into an array — standard, not an `any`-spread anti-pattern). No actual async functions, no floating promises, no `...any` spread. Criterion 4 satisfied.

Test taxonomy: 25 tests total — 3 explicit "failure N", 4 "adversarial N", 1 flat same-dir drop regression, 2 references to the live-data test (the test name + its body). Exceeds the ≥3 failure + ≥2 adversarial requirement and includes the required regression + live-data invariant.

Let me do a final check on the IDF formula parity with the source `buildIdfMap` it claims to mirror, since a formula mismatch would be a correctness bug.

### Assistant | 2026-06-22T02:48:46.931Z

[tool_use: Bash]

### User | 2026-06-22T02:48:50.322Z

[tool_result] === source buildIdfMap formula ===
260:export function buildIdfMap(docStrings) {
261-  const docs = Array.isArray(docStrings) ? docStrings : [];
262-  const N = docs.length || 1;
263-  const df = new Map();
264-  for (const d of docs) {
265-    for (const t of new Set(tokenizeForIdf(d))) df.set(t, (df.get(t) || 0) + 1);
266-  }
267-  const idf = new Map();
268-  for (const [t, c] of df) idf.set(t,
... [+55 chars truncated]

### Assistant | 2026-06-22T02:49:12.544Z

The IDF formula matches exactly: `Math.log(N / c)` with `N = docs.length || 1`, df counted via `new Set(...)` per document. The `buildImportIdfMap` mirror is faithful — the only intentional difference is it takes a `Map<stem,tokens[]>` (using `[...map.values()]`) instead of doc strings, which is correct for the import-token corpus.

I have everything I need. Let me record the verdict.

## Summary of verification

I read all three changed files end-to-end (`scripts/lib/engine-import-fingerprint.mjs`, its `.test.mjs`, and the `scripts/build-node-embeddings.mjs` wiring), traced the surrounding context at the insertion seam, ran both test suites live, and empirically exercised the lib against the real 3,848-engine corpus to validate the leak-free / adjacency-clean / no-op invariants.

---

VERDICT: PASS

summary: The commit adds a pure, well-documented, default-OFF GNN node feature (non-engine import fingerprint) gated behind `PRISM_NNG_GHOST_IMPORT_FP=1`, mirroring the existing action-surface seam. All 6 acceptance criteria hold: no stubs/TODOs; 25/25 concrete reference-value tests (3 failure + 4 adversarial + flat same-dir drop regression + live-data invariant) plus the existing 53/53 build tests still green; gate is fully contained so default-OFF is byte-identical; leak-free verified on live data (0 engine-stem readmission, 0 `/engines/` substrings, IDF non-negative, 1942 engines → empty fingerprint no-op). I found no P0/P1 issues.

findings:
- [P2] `scripts/lib/engine-import-fingerprint.mjs:106-115` (extractNonEngineImports) -- the import regexes are intentionally broad and match import-shaped text in comments/strings (verified live: a commented `import x from "../../lib/ghost.js"` yields token `lib/ghost`). This is documented and acknowledged in the docstring + adversarial test 1, and it cannot leak the prediction target (the `/engines/` drop is the safety net); it is a minor precision cost, not a correctness or leak bug. -- optional: tighten to skip line-comments,
... [+1784 chars truncated]
