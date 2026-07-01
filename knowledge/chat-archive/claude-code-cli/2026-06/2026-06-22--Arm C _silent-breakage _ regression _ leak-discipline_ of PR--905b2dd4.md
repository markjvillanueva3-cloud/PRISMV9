---
type: "chat-session"
source: "claude-code-cli"
session_id: "905b2dd4-3c0c-4201-92ed-f8a0effe134a"
title: "Arm C (silent-breakage / regression / leak-discipline) of PRISM's per-file scrut"
date: "2026-06-22"
first_ts: "2026-06-22T02:29:39.743Z"
last_ts: "2026-06-22T02:31:34.296Z"
cwd: "H:\\prism"
messages: 34
user_msgs: 13
assistant_msgs: 21
raw_file: "H:/.claude/projects/H--prism/905b2dd4-3c0c-4201-92ed-f8a0effe134a/subagents/agent-a68e8a1b484fa10c4.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:17"
---

# Arm C (silent-breakage / regression / leak-discipline) of PRISM's per-file scrut

> **claude-code-cli** | 2026-06-22 | 34 msgs (13 user / 21 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/905b2dd4-3c0c-4201-92ed-f8a0effe134a/subagents/agent-a68e8a1b484fa10c4.jsonl`

## Transcript

### User | 2026-06-22T02:29:39.743Z

Arm C (silent-breakage / regression / leak-discipline) of PRISM's per-file scrutiny gate. Read-only. Grade PASS/FAIL with P0/P1/P2 + file:line.

CONTEXT: slot:india GNN feature. Uncommitted changes add an OPT-IN, DEFAULT-OFF dense node feature ("non-engine import fingerprint" = IDF-weighted non-engine import paths per engine) to the embedding pipeline. Review ONLY:
- H:/prism/scripts/lib/engine-import-fingerprint.mjs (NEW pure lib)
- H:/prism/scripts/build-node-embeddings.mjs (the wire — only the GHOST_IMPORT_FP additions; the rest is pre-committed)
Diff: `git -C H:/prism --no-pager diff -- scripts/build-node-embeddings.mjs` and read scripts/lib/engine-import-fingerprint.mjs + its test scripts/lib/engine-import-fingerprint.test.mjs in full.

VERIFY (cite file:line, PASS/FAIL each):
1. DEFAULT-OFF byte-identical: with PRISM_NNG_GHOST_IMPORT_FP unset, GHOST_IMPORT_FP=false -> importFpMap/importIdfMap null -> the per-node append block never runs -> the ghost source signal + resume hash are byte-identical to before this wire. Any divergence = P0.
2. LEAK-FREE: the fingerprint is import paths only (no dispatcher label). normalizePath drops /engines/ paths. An engine with no non-engine imports or all-universal (idf=0) imports yields "" -> append is a no-op. Confirm no path injects a label-derived token. Confirm importFingerprintText returns "" on non-Map idf / non-array input.
3. RESUME-HASH: the enriched signal flows through sourceSignalById -> embedTextFor -> embedResumeHash, so a changed signal forces re-embed and unchanged resume-skips; the non-ghost full-graph cache is NOT invalidated.
4. REGEX SAFETY: STATIC_IMPORT_RE / DYNAMIC_IMPORT_RE — no catastrophic backtracking; lastIndex reset (global regex reuse); cannot span string boundaries. Over-match into comments/strings is acceptable noise ONLY if it never injects a label (it can't — paths aren't labels) — note it as P2 if present.
5. SCOPE: importFpApplied declared where stats + report line can read it (no Reference
... [+325 chars truncated]

### Assistant | 2026-06-22T02:29:44.357Z

I'll review the GNN feature additions. Let me start by reading the diff and the new files in parallel.

### Assistant | 2026-06-22T02:29:45.289Z

[tool_use: Bash]

### Assistant | 2026-06-22T02:29:45.821Z

[tool_use: Read]

### Assistant | 2026-06-22T02:29:46.087Z

[tool_use: Read]

### User | 2026-06-22T02:29:48.618Z

[tool_result] diff --git a/scripts/build-node-embeddings.mjs b/scripts/build-node-embeddings.mjs
index 1419c6ec75..f5eaf16213 100644
--- a/scripts/build-node-embeddings.mjs
+++ b/scripts/build-node-embeddings.mjs
@@ -50,6 +50,7 @@ import { fileURLToPath } from "node:url";
 import { readGraphStreaming } from "./lib/graph-io.mjs";
 import { nicifySelf } from "./lib/batch-self-nice.mjs";
 import { buildActionSurfa
... [+5300 chars truncated]

### User | 2026-06-22T02:29:49.170Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\engine-import-fingerprint.mjs' was already read 44s ago in this session and is unchanged (mtime 1782095226253). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-22T02:29:49.667Z

[tool_result] 1	/**
2	 * Tests for engine-import-fingerprint.mjs (AI-SYSTEMS-GNN, slot:india 2026-06-21).
3	 * Real reference-value / algebraic-invariant assertions (R9): every test fails if
4	 * the import-parse, normalization, IDF formula, or text-projection regresses.
5	 * Pure functions tested on synthetic source; one live-data invariant test against
6	 * the real mcp-server/src/engines dir. Mirrors engine-
... [+18769 chars truncated]

### Assistant | 2026-06-22T02:29:54.051Z

The lib file was already in my context. Let me read it now to verify against the test and wire claims.

### Assistant | 2026-06-22T02:29:54.618Z

[tool_use: Read]

### User | 2026-06-22T02:29:55.875Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\engine-import-fingerprint.mjs' was already read 50s ago in this session and is unchanged (mtime 1782095226253). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-22T02:29:58.930Z

The read-once guard says the lib content is in my context, but it actually was blocked on the first parallel call (the error came back, not content). Let me bypass the cache to actually get the lib content.

### Assistant | 2026-06-22T02:29:59.548Z

[tool_use: Read]

### User | 2026-06-22T02:30:00.378Z

[tool_result] 0	#!/usr/bin/env node
1	/**
2	 * engine-import-fingerprint.mjs -- per-engine NON-ENGINE import-fingerprint extractor.
3	 * (AI-SYSTEMS-GNN, slot:india 2026-06-21.)
4	 *
5	 * WHY: the GNN tier-5 text embeddings give 23/43 dispatcher-class separability
6	 * @ meanMargin 0.0527 (post action-surface). Adding more TEXT/action vocab is
7	 * exhausted (action-surface measured +0.0018, redundant --
8	 * [
... [+9876 chars truncated]

### Assistant | 2026-06-22T02:30:04.196Z

Now I have the full lib. Let me verify the surrounding context in the wire file — specifically the byte-identical path, the `appendActionSurface` helper, and the GHOST flags' composition order. Let me read the relevant sections of build-node-embeddings.mjs.

### Assistant | 2026-06-22T02:30:04.719Z

[tool_use: Read]

### User | 2026-06-22T02:30:06.266Z

[tool_result] 480	  let nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
481	  if (args.ghostsOnly) nodes = nodes.filter((n) => n && n.kind === GHOST_KIND);
482	  if (args.limit > 0) nodes = nodes.slice(0, args.limit);
483	
484	  const graphMtimeMs = fs.statSync(graphPath).mtimeMs;
485	  const { byName: wikiCache, generatedAtMs: wikiGenMs } = loadWikiCache();
486	  // Timestamp guard: only reuse wiki vect
... [+4742 chars truncated]

### Assistant | 2026-06-22T02:30:09.774Z

Now I have the full wire context. Let me verify two remaining things: the `embedTextFor`/`embedResumeHash` flow uses `sourceSignal` (confirming the enriched signal reaches the hash), and that the resume hash carries the signal. Let me check those exported helpers.

### Assistant | 2026-06-22T02:30:11.297Z

[tool_use: Bash]

### User | 2026-06-22T02:30:20.044Z

[tool_result] 80:const GHOST_SOURCE = process.env.PRISM_NNG_GHOST_SOURCE !== "0";
125:export function ghostEmbedText(node, sourceSignal = "", opts = {}) {
134:  const sig = typeof sourceSignal === "string" ? sourceSignal.trim() : "";
176:export function engineSourceSignal(src, { maxChars = 900 } = {}) {
226:export function appendActionSurface(sig, surfText, { maxChars = 1400 } = {}) {
321: * main() delegate her
... [+725 chars truncated]

### Assistant | 2026-06-22T02:30:22.646Z

Let me confirm `embedResumeHash` includes the sourceSignal, and verify the test suite actually passes (24 tests, no skips). Let me check both.

### Assistant | 2026-06-22T02:30:24.037Z

[tool_use: Read]

### Assistant | 2026-06-22T02:30:24.681Z

[tool_use: Bash]

### User | 2026-06-22T02:30:25.380Z

[tool_result] 325	export function embedTextFor(node, { ghostsOnly = false, sourceSignal = "", sharp = false, idf = null, leadK } = {}) {
326	  return ghostsOnly ? ghostEmbedText(node, sourceSignal, { sharp, idf, leadK }) : nodeEmbedText(node);
327	}
328	
329	/**
330	 * Resume hash over (id + the ACTUAL embed text). MUST use the SAME \x1F id/text
331	 * delimiter as nodeContentHash so that for a non-ghost node e
... [+1188 chars truncated]

### User | 2026-06-22T02:30:34.814Z

[tool_result]   ...
# Subtest: importFingerprintText adversarial 2: non-string elements in importPaths are skipped
ok 23 - importFingerprintText adversarial 2: non-string elements in importPaths are skipped
  ---
  duration_ms: 0.0291
  ...
# Subtest: buildImportFingerprintMap on the REAL engines dir: size > 20 (full codebase coverage)
ok 24 - buildImportFingerprintMap on the REAL engines dir: size > 20 (full c
... [+158 chars truncated]

### Assistant | 2026-06-22T02:30:39.890Z

24/24 tests pass, 0 skipped. Now let me verify the one subtle point I want to confirm: the `slice(0, 1400)` truncation interaction. The action-surface path uses `appendActionSurface(sig, surf)` which has its own `maxChars=1400`. The import-fp path does its own `.slice(0, 1400)`. Let me check `appendActionSurface` and `engineSourceSignal`/`ghostEmbedText` to confirm composition order-safety and that the truncation can't corrupt the action-surface marker.

### Assistant | 2026-06-22T02:30:40.828Z

[tool_use: Read]

### Assistant | 2026-06-22T02:30:41.461Z

[tool_use: Read]

### User | 2026-06-22T02:30:43.827Z

[tool_result] 120	 * sentence and embed only the legitimate identity signal: kind + engine name +
121	 * any residual non-answer info. The engine NAME is the real classification cue
122	 * (the keyword rule itself derived the label from the name) — this measures
123	 * whether the embedding can reproduce the dispatcher from the name, the real task.
124	 */
125	export function ghostEmbedText(node, sourceSignal =
... [+4129 chars truncated]

### User | 2026-06-22T02:30:43.914Z

[tool_result] 220	 * via GraphSAGE message-passing, never via the ghost's own label (the anti fake-0.98 contract).
221	 * The defensive prism_* strip mirrors engineSourceSignal -- an action name is not a dispatcher
222	 * token today, but the strip keeps the truth label out under any future action-naming change.
223	 * Pure; the combined signal is bounded to `maxChars` so the action tail cannot crowd out the
22
... [+2101 chars truncated]

### Assistant | 2026-06-22T02:30:52.504Z

I now have everything needed. Let me trace through each verification point with full confirmation.

**Composition order trace (point 5):** When all three flags on, per node the order is:
1. `sig = engineSourceSignal(...)` (capped 900)
2. If `surfaceMap`: `sig = appendActionSurface(sig, surf)` → appends `| actions: ...`, capped 1400
3. If `importFpMap`: `sig = sig + " | imports: " + fpText`, capped 1400
4. `ghostEmbedText` joins `[kind,label,info,sig]` with `| `, capped 1600

The import-fp append is **after** action-surface, so a 1400 truncation at step 3 could theoretically chop the action-surface tail — but this is order-stable and deterministic (always source→actions→imports), and truncation is plain `.slice` (no marker corruption that changes leak status; it can only drop trailing path tokens, not inject anything). Note `appendActionSurface` uses `maxChars=1400` while `ghostEmbedText` non-sharp join uses 1600, and the import-fp inline `.slice(0,1400)` matches the action-surface cap, so it's consistent.

Let me do a final empirical byte-identical confirmation: with the flag OFF, `importFpMap`/`importIdfMap` are both `null`, so `if (importFpMap && importIdfMap)` is false and the block never runs.

### Assistant | 2026-06-22T02:30:53.632Z

[tool_use: Bash]

### User | 2026-06-22T02:30:59.479Z

[tool_result] 53:import { buildImportFingerprintMap, buildImportIdfMap, importFingerprintText } from "./lib/engine-import-fingerprint.mjs";
103:// embeddings stay byte-identical. Default OFF -> byte-identical; A/B with PRISM_NNG_GHOST_IMPORT_FP=1.
104:const GHOST_IMPORT_FP = process.env.PRISM_NNG_GHOST_IMPORT_FP === "1";
497:  let sourceResolved = 0, sourceMissing = 0, sourceCollisions = 0, actionSurfaceApplied
... [+863 chars truncated]

### Assistant | 2026-06-22T02:31:34.296Z

All references confirmed flag-gated. I have completed the full trace. Here is my verdict.

---

VERDICT: PASS

summary: The import-fingerprint lever is a clean, opt-in, default-OFF additive feature. With `PRISM_NNG_GHOST_IMPORT_FP` unset, both `importFpMap` and `importIdfMap` are `null` (build-node-embeddings.mjs:508-509), the `if (importFpMap && importIdfMap)` guard (line 521) is dead, and the per-node signal — hence the resume hash — is byte-identical to before the wire. The lib is leak-free (import paths only, `/engines/` paths dropped, no dispatcher label can enter), the enriched signal correctly flows through `sourceSignalById` → `embedTextFor` → `embedResumeHash`, and the 24 tests are real reference-value assertions (verified passing, 0 skipped).

findings:
- **[PASS] 1. DEFAULT-OFF byte-identical** — `GHOST_IMPORT_FP = process.env.PRISM_NNG_GHOST_IMPORT_FP === "1"` (build-node-embeddings.mjs:104). When OFF: `importFpMap`/`importIdfMap` both `null` (508-509); guard `if (importFpMap && importIdfMap)` is false (521) so the append never runs; `sig` is unchanged from the pre-wire path; `importFpApplied` stays 0; the report line at 641 is gated by `GHOST_IMPORT_FP` so no extra stdout. The resume hash `embedResumeHash` (337-339) hashes `id\x1F embedTextFor(...)` which consumes the un-enriched `sig` → byte-identical. No divergence.
- **[PASS] 2. LEAK-FREE** — `normalizePath` drops any specifier containing `/engines/` (engine-import-fingerprint.mjs:53) before extraction, covering static + dynamic + comment/string false-matches (adversarial test 1, lines 146-166 proves the `/engines/` drop is universal incl. deep `something/engines/nested`). The appended text is `imports: <space-joined import-path tokens>` (build:525) — no dispatcher label, no `prism_*` token, no node `label`/`info` is injected into the fingerprint (the stem `name` is used only to *look up* the map key at 522, never written into `fpText`). All-engine imports → `[]` → `importFingerprintText([], idf)` → 
... [+3992 chars truncated]
