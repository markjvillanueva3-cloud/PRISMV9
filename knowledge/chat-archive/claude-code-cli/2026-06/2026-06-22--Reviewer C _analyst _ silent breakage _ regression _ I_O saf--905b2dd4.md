---
type: "chat-session"
source: "claude-code-cli"
session_id: "905b2dd4-3c0c-4201-92ed-f8a0effe134a"
title: "Reviewer C (analyst — silent breakage / regression / I/O safety / integration co"
date: "2026-06-22"
first_ts: "2026-06-22T02:45:14.479Z"
last_ts: "2026-06-22T02:48:39.081Z"
cwd: "H:\\prism"
messages: 52
user_msgs: 18
assistant_msgs: 34
raw_file: "H:/.claude/projects/H--prism/905b2dd4-3c0c-4201-92ed-f8a0effe134a/subagents/agent-a9a920749a0b8ba0c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:17"
---

# Reviewer C (analyst — silent breakage / regression / I/O safety / integration co

> **claude-code-cli** | 2026-06-22 | 52 msgs (18 user / 34 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/905b2dd4-3c0c-4201-92ed-f8a0effe134a/subagents/agent-a9a920749a0b8ba0c.jsonl`

## Transcript

### User | 2026-06-22T02:45:14.479Z

Reviewer C (analyst — silent breakage / regression / I/O safety / integration coupling) of PRISM's 3-of-3 gate. Do NOT assume A or B caught everything. Read-only. Review commit 2acc3984e8 on cad-fusion-live-ms0: `git -C H:/prism --no-pager show 2acc3984e8`.

Touches build-node-embeddings.mjs (the LOAD-BEARING ~372k-node embedding pipeline feeding the GNN tier-5) by adding a default-OFF non-engine import-fingerprint feature + a new lib scripts/lib/engine-import-fingerprint.mjs.

Hunt for:
1. SILENT BREAKAGE of the deployed path: any way the flag-OFF path differs (the importFpMap/importIdfMap ternary, the if-guard, the stat field, the report line). Flag unset → deployed-355 ghost embeddings + the ~372k full-graph resume hashes must be byte-identical. Any resume-hash change when OFF = P0.
2. SCOPE: importFpApplied declared where stats + report can read it (no ReferenceError / always-0).
3. REGEX safety: STATIC_IMPORT_RE / DYNAMIC_IMPORT_RE — no catastrophic backtracking; global-regex lastIndex reset; cannot span string boundaries.
4. I/O: buildImportFingerprintMap walks engine .ts once, built outside the per-node loop, fail-soft (bad dir → empty map → no-op, not a crash).
5. COUPLING with GHOST_ACTION_SURFACE + GHOST_SHARP when multiple flags on: order-safe, no double-application, consistent maxChars truncation? The SHARP IDF corpus reads sourceSignalById after enrichment — safe?
6. The adjacency-clean second-pass filter: O(n) over the map, correct, no mutation-during-iteration hazard.

First line MUST be 'VERDICT: PASS' or 'VERDICT: FAIL'. Then BLOCKER: lines, then ≤5 notes. If unsure, FAIL.

### Assistant | 2026-06-22T02:45:20.201Z

I'll review commit 2acc3984e8 thoroughly. Let me start by reading the full diff.

### Assistant | 2026-06-22T02:45:20.763Z

[tool_use: Bash]

### User | 2026-06-22T02:45:24.456Z

[tool_result] commit 2acc3984e8b630b4808dadbcaafd653958c2853f
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Sun Jun 21 21:36:21 2026 -0500

    [MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-IMPORT-FINGERPRINT-WIRE (slot:india): non-engine import-fingerprint dense GNN feature, default-OFF + leak-free + adjacency-clean
    
    The next leg-#10 lever after the text/source feature was exhausted (deploy
... [+2720 chars truncated]

### Assistant | 2026-06-22T02:45:30.167Z

Let me read the full diff and the surrounding context of the modified file.

### Assistant | 2026-06-22T02:45:30.518Z

[tool_use: Bash]

### User | 2026-06-22T02:45:37.346Z

[tool_result] commit 2acc3984e8b630b4808dadbcaafd653958c2853f
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Sun Jun 21 21:36:21 2026 -0500

    [MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-IMPORT-FINGERPRINT-WIRE (slot:india): non-engine import-fingerprint dense GNN feature, default-OFF + leak-free + adjacency-clean
    
    The next leg-#10 lever after the text/source feature was exhausted (deploy
... [+8163 chars truncated]

### Assistant | 2026-06-22T02:45:39.345Z

Now let me read the full new lib file.

### Assistant | 2026-06-22T02:45:39.760Z

[tool_use: Read]

### User | 2026-06-22T02:45:40.214Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\engine-import-fingerprint.mjs' was already read 22s ago in this session and is unchanged (mtime 1782095670414). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-22T02:45:42.510Z

The file isn't actually in my context yet (the diff stat doesn't include it). Let me read it via git show to get the full content.

### Assistant | 2026-06-22T02:45:43.252Z

[tool_use: Bash]

### User | 2026-06-22T02:45:50.826Z

[tool_result] #!/usr/bin/env node
/**
 * engine-import-fingerprint.mjs -- per-engine NON-ENGINE import-fingerprint extractor.
 * (AI-SYSTEMS-GNN, slot:india 2026-06-21.)
 *
 * WHY: the GNN tier-5 text embeddings give 23/43 dispatcher-class separability
 * @ meanMargin 0.0527 (post action-surface). Adding more TEXT/action vocab is
 * exhausted (action-surface measured +0.0018, redundant --
 * [[reference_gnn_act
... [+9844 chars truncated]

### Assistant | 2026-06-22T02:45:55.703Z

Now let me read the surrounding context of build-node-embeddings.mjs to verify the flag-OFF path and how GHOST_SOURCE / GHOST_SHARP / GHOST_ACTION_SURFACE interact, especially around the resume-hash and `appendActionSurface`.

### Assistant | 2026-06-22T02:45:56.523Z

[tool_use: Read]

### User | 2026-06-22T02:45:58.022Z

[tool_result] 480	  let nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
481	  if (args.ghostsOnly) nodes = nodes.filter((n) => n && n.kind === GHOST_KIND);
482	  if (args.limit > 0) nodes = nodes.slice(0, args.limit);
483	
484	  const graphMtimeMs = fs.statSync(graphPath).mtimeMs;
485	  const { byName: wikiCache, generatedAtMs: wikiGenMs } = loadWikiCache();
486	  // Timestamp guard: only reuse wiki vect
... [+5228 chars truncated]

### Assistant | 2026-06-22T02:46:04.020Z

Now I have the critical context. The flag-OFF path is clear: when `GHOST_IMPORT_FP` is false, `importFpMap` and `importIdfMap` are both `null`, so the `if (importFpMap && importIdfMap)` guard is never entered. Let me verify the resume-hash path (`embedResumeHash` / `embedTextFor`) uses only `sourceSignalById`, and that nothing else changed. Let me also examine the GHOST_SHARP corpus interaction and the `embedTextFor`/`embedResumeHash` functions.

### Assistant | 2026-06-22T02:46:05.707Z

[tool_use: Grep]

### User | 2026-06-22T02:46:07.400Z

[tool_result] 176:export function engineSourceSignal(src, { maxChars = 900 } = {}) {
226:export function appendActionSurface(sig, surfText, { maxChars = 1400 } = {}) {
260:export function buildIdfMap(docStrings) {
298:function walkEngineSources(dir, map) {
325:export function embedTextFor(node, { ghostsOnly = false, sourceSignal = "", sharp = false, idf = null, leadK } = {}) {
337:export function embedResumeHas
... [+20 chars truncated]

### Assistant | 2026-06-22T02:46:10.485Z

[tool_use: Read]

### User | 2026-06-22T02:46:11.637Z

[tool_result] 226	export function appendActionSurface(sig, surfText, { maxChars = 1400 } = {}) {
227	  const base = typeof sig === "string" ? sig : "";
228	  const surf = typeof surfText === "string"
229	    ? surfText.replace(/\bprism_[a-z0-9_]+/gi, " ").replace(/\s+/g, " ").trim()
230	    : "";
231	  if (!surf) return base; // unwired ghost / no surface -> identity (the leak-free contract)
232	  const tail = 
... [+6083 chars truncated]

### Assistant | 2026-06-22T02:46:16.608Z

Now I understand the full resume-hash chain. The key insight: `embedResumeHash` → `embedTextFor` → `ghostEmbedText(node, sourceSignal, ...)`. The `sourceSignal` comes from `sourceSignalById.get(node.id)`. When `GHOST_IMPORT_FP` is OFF, the import-fp block never runs, so `sig` is unchanged from the deployed path. Critically, the full-graph (~372k node) resume path is NON-ghost (`ghostsOnly=false`), so `embedTextFor` returns `nodeEmbedText(node)` verbatim — completely untouched by this change. 

Let me verify the test file to confirm coverage claims and check for the adversarial/regex cases. Let me also examine the regex safety carefully.

### Assistant | 2026-06-22T02:46:17.560Z

[tool_use: Bash]

### User | 2026-06-22T02:46:21.891Z

[tool_result] /**
 * Tests for engine-import-fingerprint.mjs (AI-SYSTEMS-GNN, slot:india 2026-06-21).
 * Real reference-value / algebraic-invariant assertions (R9): every test fails if
 * the import-parse, normalization, IDF formula, or text-projection regresses.
 * Pure functions tested on synthetic source; one live-data invariant test against
 * the real mcp-server/src/engines dir. Mirrors engine-action-surfa
... [+8946 chars truncated]

### Assistant | 2026-06-22T02:46:25.044Z

Let me see the rest of the test file, particularly the regex-safety / catastrophic-backtracking and live-data invariant tests.

### Assistant | 2026-06-22T02:46:25.946Z

[tool_use: Bash]

### User | 2026-06-22T02:46:30.401Z

[tool_result]     },
  };

  const map = buildImportFingerprintMap("/engines", fakeFs);

  // Two real .ts files should be present (lowercased stems).
  assert.ok(map.has("kienzleengine"), "KienzleEngine.ts stem must be in map");
  assert.ok(map.has("thermalengine"), "ThermalEngine.ts stem must be in map");
  // .test.ts must be skipped.
  assert.ok(!map.has("kienzleengine.test"), ".test.ts must not appear in m
... [+9581 chars truncated]

### Assistant | 2026-06-22T02:46:36.404Z

Now I have a complete picture. Let me carefully analyze the regex safety for catastrophic backtracking, which is my highest-priority I/O/security concern since these regexes run over ~thousands of real `.ts` engine files.

Let me analyze:
- `STATIC_IMPORT_RE = /\bimport\s[^;]*?from\s+(['"])([^'"]+)\1/g`
- `DYNAMIC_IMPORT_RE = /\bimport\s*\(\s*(['"])([^'"]+)\1\s*\)/g`

The `STATIC_IMPORT_RE` has a concern: `\bimport\s[^;]*?from\s+` — the `[^;]*?` is lazy, and if a source has `import` followed by text with no `from` and no `;` for a long stretch, the regex engine will scan ahead char-by-char. Let me test empirically against a worst-case adversarial input to verify there's no catastrophic backtracking.

### Assistant | 2026-06-22T02:46:45.375Z

[tool_use: Bash]

### User | 2026-06-22T02:46:51.491Z

[tool_result] bad1 (no from, no ;): 0 ms, match: null
bad2 (100k valid + 1 unterminated): 5 ms, count: 100000
bad3 (import then 100k lines then from): 0 ms, matched group: y
bad4 (import + 500k a, no from): 1 ms, match: null

### Assistant | 2026-06-22T02:46:57.254Z

No catastrophic backtracking — the lazy `[^;]*?` is linear because `[^;]` and `from` are simple, and there's no nested quantifier that could explode. The regexes are safe. Now let me confirm:

1. The regexes use `\1` backreference for matching quote, and `[^'"]+` cannot span string boundaries (it stops at any quote). Good.
2. `lastIndex` is reset at the start of `extractNonEngineImports`. Good.

Let me now verify the critical OFF-path byte-identity claim by checking how `actionSurfaceText` is structured (to confirm the import-fp block mirrors the same no-op semantics) and verify there's no shared-state mutation. Let me also double-check the `engineSourceSignal` maxChars to understand the truncation coupling concern (note 5).

### Assistant | 2026-06-22T02:46:58.110Z

[tool_use: Read]

### User | 2026-06-22T02:46:59.307Z

[tool_result] 176	export function engineSourceSignal(src, { maxChars = 900 } = {}) {
177	  if (typeof src !== "string" || !src) return "";
178	  const parts = [];
179	  // 1. leading file docblock — the human description of what the engine does
180	  const doc = src.match(/\/\*\*([\s\S]*?)\*\//);
181	  if (doc) {
182	    const text = doc[1]
183	      .replace(/^\s*\*\s?/gm, " ")   // strip JSDoc leading "* "
18
... [+2947 chars truncated]

### Assistant | 2026-06-22T02:47:08.192Z

Now I understand the truncation coupling. Let me analyze the maxChars consistency concern (note 5):

- `engineSourceSignal` produces `sig` capped at 900 chars (default).
- `appendActionSurface(sig, surf)` caps the combined result at 1400 chars.
- The new import-fp block: `sig = (sig ? \`${sig} | imports: ${fpText}\` : \`imports: ${fpText}\`).slice(0, 1400)` — also caps at 1400.

This is consistent. The order is action-surface first (cap 1400), then import-fp (cap 1400 again). Both truncations are 1400. No double-application of either feature. The import-fp block reads `importFpMap.get(stemLower)` (the keyset-cleaned map), independent of the action surface — no cross-contamination.

Now the critical concern for note 5: the SHARP IDF corpus reads `sourceSignalById.get(n.id)` AFTER all enrichment (line 544). When all flags are on, `sourceSignalById` contains the action-surface + import-fp enriched signal, which feeds the SHARP corpus IDF. This is by design (the SHARP lever wants the full embed text). Since `embedTextFor`/`embedResumeHash` also read the same `sourceSignalById`, the SHARP idfMap and the embed text are computed over the same enriched signal — consistent. Let me verify `ghostEmbedText` to confirm the final join cap and that the import-fp text flows through correctly.

### Assistant | 2026-06-22T02:47:09.519Z

[tool_use: Grep]

### User | 2026-06-22T02:47:10.977Z

[tool_result] 125:export function ghostEmbedText(node, sourceSignal = "", opts = {}) {
126-  if (!node || typeof node !== "object") return "";
127-  const kind = node.kind ?? "";
128-  const label = node.label ?? node.id ?? "";
129-  let info = String(node.info ?? "");
130-  \ Strip the leaking "…proposed wiring: <dispatcher> (confidence …, reason: …)"
131-  // clause entirely (covers prism_* AND the UNKNOWN se
... [+3179 chars truncated]

### Assistant | 2026-06-22T02:47:18.782Z

The display is showing some backslash artifacts but the logic is clear. The final `ghostEmbedText` cap is 1600, and the import-fp signal is already capped at 1400 before it enters, so it fits. The deployed path: `GHOST_SHARP` is default-OFF (deploy gate rejected it), so the deployed ghost path is `[kind, label, info, sig].join(" | ").slice(0, 1600)` where `sig` comes from `sourceSignalById` — which, when `GHOST_IMPORT_FP` is OFF, is exactly the action-surface-OR-plain signal, byte-identical to before.

Now let me verify the most critical claim definitively: the full-graph ~372k resume path. The `--ghosts-only` flag gates the entire enrichment block (line 498: `if (args.ghostsOnly && GHOST_SOURCE)`). The full-graph run is NOT `ghostsOnly`, so `embedTextFor` returns `nodeEmbedText(node)` verbatim, and `embedResumeHash` hashes `${node.id}\x1F${nodeEmbedText(node)}` — entirely untouched by this commit. Let me confirm `nodeEmbedText` and `walkEngineSources` were not modified in this commit (only the lines shown in the diff changed).

### Assistant | 2026-06-22T02:47:20.117Z

[tool_use: Bash]

### User | 2026-06-22T02:47:24.483Z

[tool_result] +import { buildImportFingerprintMap, buildImportIdfMap, importFingerprintText } from "./lib/engine-import-fingerprint.mjs";
+// GNN import-fingerprint lever (slot:india 2026-06-21): in --ghosts-only mode, append the
+// IDF-weighted non-engine import-path tokens to each ghost's source signal. Import paths
+// carry domain-structural signal independent of description prose (a calc engine imports
+/
... [+2121 chars truncated]

### Assistant | 2026-06-22T02:47:33.438Z

This confirms the entire change is purely additive and gated. The only non-gated change is the one comment-character swap (`→` → `->`) in the catch comment — cosmetic, no behavioral effect. 

Now let me verify the scope concern (note 2): `importFpApplied` is declared at line 497 (`let` in `main()`), referenced in the stats object (line 555) and the report line (line 641 via `stats.importFpApplied`). All in the same `main()` scope. No ReferenceError, no always-0 risk when ON.

Let me do one final empirical confirmation: run the actual lib tests to confirm 25/25 pass (the commit claims this), and verify the OFF-path byte-identity isn't undermined by anything in the buildImportIdfMap with `null` input (since `buildImportIdfMap(importFpMap)` is only called when ON, but let me confirm the guard `if (importFpMap && importIdfMap)` is robust — if `buildImportFingerprintMap` returns an empty map, `importFpMap` is a truthy empty Map, `buildImportIdfMap` returns empty Map (truthy), the loop runs but every `.get` is undefined → `fpText` is "" → no append → still no-op even when ON with a bad dir). 

Let me run the tests.

### Assistant | 2026-06-22T02:47:34.031Z

[tool_use: Bash]

### User | 2026-06-22T02:47:37.778Z

[tool_result]   ...
# Subtest: importFingerprintText adversarial 2: non-string elements in importPaths are skipped
ok 24 - importFingerprintText adversarial 2: non-string elements in importPaths are skipped
  ---
  duration_ms: 0.028
  ...
# Subtest: buildImportFingerprintMap on the REAL engines dir: size > 20 (full codebase coverage)
ok 25 - buildImportFingerprintMap on the REAL engines dir: size > 20 (full co
... [+157 chars truncated]

### Assistant | 2026-06-22T02:47:41.339Z

25/25 pass. Now let me empirically prove the OFF-path byte-identity of the ghost embed text and run the existing build-node-embeddings test suite to confirm the 53/53 claim. Let me first run a direct OFF-vs-baseline check of the import-fp no-op semantics, and run the existing test suite.

### Assistant | 2026-06-22T02:47:43.504Z

[tool_use: Bash]

### User | 2026-06-22T02:47:46.946Z

[tool_result]   duration_ms: 1.1146
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
# duration_ms 157.871

### Assistant | 2026-06-22T02:47:53.574Z

53/53 pass on the existing build-node-embeddings test suite. Both claims verified empirically. 

Now let me do the final adversarial check on the OFF-path: confirm that with the flag unset, `GHOST_IMPORT_FP` is `false`, so `buildImportFingerprintMap` is never even called (no I/O, no walk), and the ghost embed text is byte-identical. Let me also verify one edge: the regex matching `import` inside larger identifiers — the `\b` word boundary on `\bimport` means `reimport`/`myimport` won't match (the `\b` is before `import`, but `reimport` has no boundary before `import`... actually `reimport` — `e` to `i` is not a word boundary, so `\bimport` won't match mid-identifier). Let me confirm with a quick test, plus the `/engines/` drop safety-net for any false-positive match in comments/strings.

### Assistant | 2026-06-22T02:48:00.490Z

[tool_use: Bash]

### User | 2026-06-22T02:48:04.713Z

[tool_result] mid-identifier import (expect []): []
comment with /engines/ + real (expect [a]): ["lib/a"]
string-embedded dynamic import (broad regex may catch danger): ["lib/ok","lib/danger"]
all-universal -> empty fpText (expect ""): ""

### Assistant | 2026-06-22T02:48:12.926Z

All edge cases behave correctly. Test 3 confirms the regex IS intentionally broad (it caught `lib/danger` from inside a string literal). This is a known/documented design choice (the spec acknowledges "our regex is intentionally broad (it can match import-shaped text in comments/strings) -- the /engines/ drop is the safety net"). 

Is this a finding? Let me assess the blast radius: a false-positive token from a string/comment can only add a NON-`/engines/` token to a ghost's IDF fingerprint. This (a) only occurs when the flag is ON (measurement-only, default-OFF, never deployed), (b) cannot leak the truth label (string-embedded paths don't encode dispatcher routing), and (c) at worst adds slight noise to an experimental separability measurement. It does NOT affect the deployed path. This is a documented P3-at-most design tradeoff in a measurement-only lever, not a silent breakage.

Let me do a final verification that there are no OTHER consumers of `build-node-embeddings.mjs` exports that this commit's new export-surface could break, and confirm `ENGINES_DIR` is defined.

### Assistant | 2026-06-22T02:48:14.848Z

[tool_use: Bash]

### User | 2026-06-22T02:48:19.579Z

[tool_result] 85:const ENGINES_DIR = path.join(REPO_ROOT, "mcp-server/src/engines");
---consumers of engine-import-fingerprint---
scripts/build-node-embeddings.mjs:53:import { buildImportFingerprintMap, buildImportIdfMap, importFingerprintText } from "./lib/engine-import-fingerprint.mjs";

### Assistant | 2026-06-22T02:48:39.081Z

`ENGINES_DIR` is defined at line 85. The new lib is consumed only by `build-node-embeddings.mjs` (the lib file itself adds new exports, no existing export was renamed/removed — confirmed by the diff showing only additions). No other consumer of `build-node-embeddings.mjs` exports is affected since no existing export changed signature.

I have completed my analysis across all six hunt axes. Let me summarize the verification.

VERDICT: PASS

BLOCKER: none

summary: This is a purely-additive, default-OFF measurement lever wired into the load-bearing GNN embedding pipeline at the exact same seam as the existing action-surface feature. I traced every flag-OFF path and the change cannot alter the deployed-355 ghost embeddings or the ~372k full-graph resume hashes: `GHOST_IMPORT_FP` (env `PRISM_NNG_GHOST_IMPORT_FP==="1"`) defaults false, so `importFpMap`/`importIdfMap` are both `null`, the `if (importFpMap && importIdfMap)` guard never fires, no `.ts` walk runs, and `sig` is byte-identical to the prior path. The full-graph resume path is non-ghost (`embedTextFor` returns `nodeEmbedText(node)` verbatim, untouched). Empirically verified: 25/25 lib tests + 53/53 existing build-node-embeddings tests pass; regexes show no catastrophic backtracking on 500k-char adversarial inputs; `importFpApplied` is correctly scoped in `main()`; the keyset second-pass adjacency filter is O(n) with no mutation-during-iteration hazard (it reassigns map values with `.filter`, iterating the same map — safe in JS since keys are unchanged).

notes:
- [P3] `scripts/lib/engine-import-fingerprint.mjs:74-78` (STATIC/DYNAMIC_IMPORT_RE) — the regexes are intentionally broad and DO match import-shaped text inside string literals/comments (empirically confirmed: a `"import('../../lib/danger.js')"` string literal yields token `lib/danger`). The `/engines/` drop is the only safety net. This only adds slight noise to an experimental, default-OFF separability measurement, never the deployed path, and cannot lea
... [+1212 chars truncated]
