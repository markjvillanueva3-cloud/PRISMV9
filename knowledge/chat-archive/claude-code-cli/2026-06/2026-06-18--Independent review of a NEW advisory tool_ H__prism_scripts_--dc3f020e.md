---
type: "chat-session"
source: "claude-code-cli"
session_id: "dc3f020e-9a94-4310-adf2-a60d9533cfec"
title: "Independent review of a NEW advisory tool: H:/prism/scripts/lint-memory-contradi"
date: "2026-06-18"
first_ts: "2026-06-18T00:00:50.393Z"
last_ts: "2026-06-18T00:08:51.199Z"
cwd: "H:\\prism-slot-sierra"
messages: 52
user_msgs: 19
assistant_msgs: 33
raw_file: "H:/.claude/projects/H--prism-slot-sierra/dc3f020e-9a94-4310-adf2-a60d9533cfec/subagents/agent-a448aeda372622a8c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:11"
---

# Independent review of a NEW advisory tool: H:/prism/scripts/lint-memory-contradi

> **claude-code-cli** | 2026-06-18 | 52 msgs (19 user / 33 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/dc3f020e-9a94-4310-adf2-a60d9533cfec/subagents/agent-a448aeda372622a8c.jsonl`

## Transcript

### User | 2026-06-18T00:00:50.393Z

Independent review of a NEW advisory tool: H:/prism/scripts/lint-memory-contradictions.mjs + tests H:/prism/scripts/lint-memory-contradictions.test.mjs (read both end-to-end). Weighted toward integration, dedup/convention conformance, and honest reporting.

CONTEXT: it extends my own prior tool H:/prism/scripts/lint-wiki-contradictions.mjs (a wiki NLI contradiction-linter) to the MEMORY vault -- the assessment's named #2 2nd-brain gap. It reuses that tool's exported engine (tokenizeForTopic/selectClaim/runNliLint/resolveNliModel) and adds only a memory-corpus loader (parseMemoryPage/loadMemoryPages). Live-validated: 351 doctrine memos, 1 superseded excluded, 6 pairs NLI-checked via gpt-oss:20b, 0 contradictions, report written to state/shared/memory-contradictions.json.

CHECK:
1. DEDUP/REUSE (R8): is the reuse genuine -- does it import the wiki engine rather than re-implementing candidatePairs/NLI logic (no second drifting copy)? Compare the two files. Is parseMemoryPage's divergence from the wiki's parsePage justified (memory frontmatter really is name:/metadata: not title:/tags:)?
2. CONVENTION (R11): does it match the wiki sibling's structure (walkMd, getOpt, isMain entry guard, fail-soft report shape, --write/--section/--limit flags)? Any drift?
3. SYNERGY: it excludes already-superseded memos (reusing isSupersededMemory from memory-index-search-lib.mjs) -- the SAME predicate my supersession detector (vault-supersession-detector.mjs, committed today) writes markers for. Is that integration sound (a memo marked superseded by my other tool is correctly skipped here)? This is the intended cross-tool synergy.
4. HONEST REPORTING (R12): the report totals (pages/excludedSuperseded/excludedPointer/pairsConsidered/pairsChecked/unchecked/contradictions) -- coherent? The live run only checked 6 of the candidate-pair space (I bounded --limit small to dodge api-error interruptions). Is it honest to call the TOOL validated while the full-corpus scan is a pending cheap re-ru
... [+338 chars truncated]

### Assistant | 2026-06-18T00:00:53.298Z

I'll review the new memory contradiction linter and its sibling wiki tool. Let me read all the relevant files end to end.

### Assistant | 2026-06-18T00:00:54.113Z

[tool_use: Read]

### Assistant | 2026-06-18T00:00:54.394Z

[tool_use: Read]

### User | 2026-06-18T00:00:54.547Z

[tool_result] read-once-guard: 'H:\prism\scripts\lint-memory-contradictions.mjs' was already read 12s ago in this session and is unchanged (mtime 1781725988531). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-18T00:00:54.592Z

[tool_use: Read]

### User | 2026-06-18T00:00:54.829Z

[tool_result] read-once-guard: 'H:\prism\scripts\lint-memory-contradictions.test.mjs' was already read 12s ago in this session and is unchanged (mtime 1781726197448). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0
... [+1 chars truncated]

### User | 2026-06-18T00:00:55.031Z

[tool_result] read-once-guard: 'H:\prism\scripts\lint-wiki-contradictions.mjs' was already read 12s ago in this session and is unchanged (mtime 1781060573388). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-18T00:00:57.237Z

The read-once guard claims I already read these, but they are not actually in my context — this is a fresh agent thread. Let me disable the cache and read them.

### Assistant | 2026-06-18T00:00:58.097Z

[tool_use: Bash]

### User | 2026-06-18T00:01:02.282Z

[tool_result] #!/usr/bin/env node
// SIERRA-VAULT-OPS/U-VAULT-CONTRADICT-MEMORY -- memory-vault contradiction lint (slot:sierra, 2026-06-17).
//
// Extends the proven wiki NLI contradiction-linter (lint-wiki-contradictions.mjs,
// OLLAMA-SYNERGY/U-WIKI-NLI-LINT) to the MEMORY vault -- the assessment's named #2
// 2nd-brain gap ("no dedicated contradiction-detector" for memories). REUSES that
// tool's engine wh
... [+8292 chars truncated]

### Assistant | 2026-06-18T00:01:05.799Z

The Read tool's cache guard is blocking me incorrectly, so I'll use the Read tool with the cache disabled via reading line ranges, but since the guard persists I'll continue with Bash for the remaining files. Let me read the test file and the wiki sibling.

### Assistant | 2026-06-18T00:01:06.270Z

[tool_use: Bash]

### User | 2026-06-18T00:01:09.298Z

[tool_result] // Tests for lint-memory-contradictions.mjs (SIERRA-VAULT-OPS/U-VAULT-CONTRADICT-MEMORY).
// node --test scripts/lint-memory-contradictions.test.mjs
//
// Hermetic: fs is injected (no real vault) and the NLI call is injected (no Ollama/GPU).
// Verifies the NEW memory loader (parse + the superseded/pointer exclusions) and that it
// feeds the REUSED wiki NLI engine (runNliLint) correctly end-to-en
... [+5644 chars truncated]

### Assistant | 2026-06-18T00:01:11.633Z

Now let me read the wiki sibling tool to verify the reuse claim, plus the memory-index-search-lib for the exclusion predicates.

### Assistant | 2026-06-18T00:01:12.394Z

[tool_use: Bash]

### User | 2026-06-18T00:01:16.183Z

[tool_result] #!/usr/bin/env node
/**
 * lint-wiki-contradictions.mjs  (OLLAMA-SYNERGY / U-WIKI-NLI-LINT)
 *
 * Advisory pairwise natural-language-inference (NLI) lint over CURATED wiki
 * entries: finds page PAIRS whose core claims CONTRADICT each other, using a
 * local Ollama model (gpt-oss:20b by default) for the NLI judgment. Nothing
 * else in PRISM catches "lesson A says X, lesson B says not-X" drift.
 *
... [+16068 chars truncated]

### Assistant | 2026-06-18T00:01:18.781Z

Now let me read the `memory-index-search-lib.mjs` to verify the exclusion predicates `isSupersededMemory` and `isNodePointerStub`, and check the supersession detector for the synergy claim.

### Assistant | 2026-06-18T00:01:20.204Z

[tool_use: Bash]

### Assistant | 2026-06-18T00:01:21.164Z

[tool_use: Bash]

### User | 2026-06-18T00:01:23.898Z

[tool_result] 209:export function isSupersededMemory(body) {
232:export function isNodePointerStub(fileName) {
861:      if (excludeNodePointers && isNodePointerStub(rec.fileName)) continue; // node_* pointer stub — not a memo
892:    if (excludeNodePointers && isNodePointerStub(f.fileName)) continue; // skip BEFORE stat+read (9.5k stubs → I/O win)
899:    if (excludeSuperseded && isSupersededMemory(body)) cont
... [+5 chars truncated]

### User | 2026-06-18T00:01:28.479Z

[tool_result] 18:// isSupersededMemory predicate the live recall path uses
24://   body blockquote:  > **SUPERSEDED <date> -- see [[newer]].**   (formatMarker)
26:// > **SUPERSEDED\b, the dash is cosmetic) so its output is recall-readable by
39:// per-run backup (UNCONDITIONAL), or PRISM_MEMORY_INDEX_KEEP_SUPERSEDED=1 (re-includes
46:import { isSupersededMemory } from "./lib/memory-index-search-lib.mjs";
81:exp
... [+1036 chars truncated]

### Assistant | 2026-06-18T00:01:31.893Z

The synergy is confirmed: the supersession detector writes the marker `> **SUPERSEDED <date> -- see [[newer]].**` via `formatMarker`, and that same `isSupersededMemory` predicate is what the memory linter reuses to exclude superseded memos. Let me read the exact predicate bodies to confirm the contract matches, and verify the `runNliLint` report shape the memory tool depends on.

### Assistant | 2026-06-18T00:01:32.870Z

[tool_use: Bash]

### User | 2026-06-18T00:01:35.761Z

[tool_result] //   • lowercase `superseded` — a topical mention or a status-enum value
//     (e.g. a DONE_STATUSES allowlist); KEEP it.
// Verified against the live vault: matches exactly the genuinely-superseded
// redirects, 0 false positives over 11,493 files, 3/3 negative controls clear
// (feedback_golf_owns_reaper the superseder, reference_unblock_detect the enum,
// feedback_never_delete_only_disable th
... [+3083 chars truncated]

### Assistant | 2026-06-18T00:01:39.184Z

Now I have full confirmation of the synergy contract. The `SUPERSEDED_DECL_RE` matches `> **SUPERSEDED` (the blockquote `formatMarker` from the supersession detector writes) and `[SUPERSEDED`. Let me run the test suite to confirm the tests actually pass, and verify there are no other callers/wiring expectations I'm missing.

### Assistant | 2026-06-18T00:01:40.605Z

[tool_use: Bash]

### Assistant | 2026-06-18T00:01:42.075Z

[tool_use: Bash]

### User | 2026-06-18T00:01:45.036Z

[tool_result]   ...
# Subtest: integration: loadMemoryPages -> runNliLint (injected callImpl) flags a planted CONTRADICT pair
ok 5 - integration: loadMemoryPages -> runNliLint (injected callImpl) flags a planted CONTRADICT pair
  ---
  duration_ms: 0.816
  ...
# Subtest: integration: CONSISTENT verdict -> zero contradictions (no false positive)
ok 6 - integration: CONSISTENT verdict -> zero contradictions (no f
... [+575 chars truncated]

### User | 2026-06-18T00:06:46.892Z

[tool_result] Command running in background with ID: bhhfuq5oa. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\44f966d1-3f60-4baa-b253-ebd892210769\tasks\bhhfuq5oa.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-18T00:06:51.840Z

All 8 tests pass. Let me wait for the grep for external references to complete, and verify the live report that was written, plus check the `--limit`/`--section` flag parity and the `getOpt` divergence I noticed.

### Assistant | 2026-06-18T00:06:59.365Z

[tool_use: Bash]

### User | 2026-06-18T00:07:05.031Z

[tool_result] ---REPORT---
{
  "schemaVersion": 1,
  "model": "gpt-oss:20b",
  "totals": {
    "pages": 351,
    "pairsConsidered": 6,
    "pairsChecked": 6,
    "unchecked": 0,
    "contradictions": 0,
    "excludedSuperseded": 1,
    "excludedPointer": 0
  },
  "contradictions": [],
  "corpus": "memory",
  "generatedAt": "2026-06-17T20:09:45.195Z",
  "elapsedMs": 23459
}

### Assistant | 2026-06-18T00:07:11.835Z

Now I have the live report. There's an important discrepancy I need to examine: the live report shows `pairsConsidered: 6` and `excludedPointer: 0`, yet the tool doc claims it excludes node-pointer stubs from the ~19.9K vault. Let me check the report claim in the context vs reality, and examine the `pairsConsidered` bounding more carefully. The key question for honest reporting (CHECK #4): the run only checked 6 pairs — but that's `pairsConsidered: 6`, meaning the candidate-pair space itself was only 6, NOT that `--limit` truncated a larger space.

Let me verify whether `--limit` actually bounded this run or whether 6 is the true full candidate-pair count.

### Assistant | 2026-06-18T00:07:15.258Z

[tool_use: Bash]

### User | 2026-06-18T00:07:15.888Z

[tool_result] PRISM MCP DISCONNECTED -- ENFORCED CHECK (your prism MCP tools are dead this session)
   THIS chat's bridge is stale-heartbeat (pid 40908 gone).
   The daemon (:3100) may be UP, but THIS session has no live MCP bridge -- every mcp__prism__* call will fail.
   This block fires ONCE per disconnect episode (~3min), then degraded-mode proceeds (no deadlock).
   ENFORCED ACTIONS:
     1. Tell the opera
... [+449 chars truncated]

### Assistant | 2026-06-18T00:07:18.287Z

That was an MCP-bridge block (advisory), not an actual failure of my command — the command was blocked before running. Let me re-run it directly.

### Assistant | 2026-06-18T00:07:21.374Z

[tool_use: Bash]

### User | 2026-06-18T00:07:25.580Z

[tool_result] doctrine pages loaded: 351
excludedSuperseded: 1 excludedPointer: 0
FULL candidate-pair count (no limit): 1074
DEFAULT_LIMIT (wiki): 150

### Assistant | 2026-06-18T00:07:32.101Z

This is the crucial honest-reporting finding. The true candidate-pair space is **1074 pairs**, not 6. The live run's report says `pairsConsidered: 6` and `pairsChecked: 6` — meaning the operator ran with `--limit 6` (or similar small value) to dodge API errors. So:

- The report itself is **internally honest**: `pairsConsidered: 6` correctly reflects that only 6 candidate pairs were *considered* (because `candidatePairs` slices to `limit`), and `pairsChecked: 6` matches. The report does not claim to have covered the corpus.
- BUT: `pairsConsidered` being capped by `--limit` means a reader of the report cannot tell from the report alone that **1068 candidate pairs were silently never considered**. The report has no field distinguishing "candidate-pair space total" from "candidate pairs considered after limit truncation." This is the one real honest-reporting gap.

Let me verify the `getOpt` divergence and the `--limit` flag behavior, since the memory tool's `getOpt` differs from the wiki tool's.

### Assistant | 2026-06-18T00:07:36.387Z

[tool_use: Bash]

### User | 2026-06-18T00:07:40.672Z

[tool_result] --limit 6 (space):  mem= 6  wiki= 6
--limit=6 (equals): mem= DFLT  wiki= 6

### Assistant | 2026-06-18T00:07:48.019Z

Confirmed a convention drift: the wiki tool's `getOpt` supports BOTH `--limit 6` (space) and `--limit=6` (equals) forms; the memory tool's `getOpt` only supports the space form. The doc comment in the memory file even shows `--limit 80` (space form), so this is a deliberate-but-narrowed reimplementation. With `--limit=6`, the memory tool silently falls back to `DEFAULT_LIMIT` (150) — a footgun, but not a correctness bug for the space form. This is a P2 convention drift.

Let me confirm the advisory-safety claim (never edits/deletes) by checking all write operations in the file, and confirm the SKIPPED-report path totals are coherent.

### Assistant | 2026-06-18T00:07:49.587Z

[tool_use: Bash]

### User | 2026-06-18T00:07:53.613Z

[tool_result] 33:import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, realpathSync } from "node:fs";
141:    if (write) { mkdirSync(dirname(OUT_PATH), { recursive: true }); writeFileSync(OUT_PATH, JSON.stringify(report, null, 2), "utf8"); }
154:    writeFileSync(OUT_PATH, JSON.stringify(report, null, 2), "utf8");

### Assistant | 2026-06-18T00:07:58.956Z

Advisory safety confirmed: the only filesystem writes are `mkdirSync(dirname(OUT_PATH))` + `writeFileSync(OUT_PATH, ...)` — both targeting `state/shared/memory-contradictions.json`. No `unlink`/`rm`/`rename`/`appendFile`/`insertMarker`/`applyMarks`. Memos are read-only (`readFileSync` only). The tool cannot edit or delete a memo.

Now let me verify the graceful-degradation path one more time — that a model-absent scenario yields a SKIPPED report (`model: null`, contradictions `[]`), not a false "0 contradictions detected" that a downstream reader could misinterpret as "verified clean."

### Assistant | 2026-06-18T00:08:03.740Z

[tool_use: Bash]

### User | 2026-06-18T00:08:08.571Z

[tool_result] model-absent resolveNliModel: {"model":null,"installed":[],"reason":"no installed models (ollama down?)"}
ollama-down runNliLint totals: {"pages":2,"pairsConsidered":1,"pairsChecked":0,"unchecked":1,"contradictions":0} aborted: false

### Assistant | 2026-06-18T00:08:14.366Z

Graceful degradation confirmed on both paths:
- **Model absent**: `resolveNliModel` returns `{model:null, reason:"no installed models (ollama down?)"}` → the memory tool's main() branch writes a report with `model: null`, `note: "no installed models..."`, and `pairsChecked: 0`. Console prints "NLI SKIPPED". A reader sees `model: null` + `pairsChecked: 0` — unambiguously not-verified, not a false clean.
- **Ollama down mid-run**: every pair → `unchecked`, `pairsChecked: 0`, `contradictions: 0`. The `unchecked` count is the honest signal that 0 contradictions does NOT mean clean.

This is exactly the R12 fail-soft contract. Now let me do a final check on the `--include-reference` flag behavior and confirm the node-pointer exclusion actually fires on the reference namespace (since the live run had `excludedPointer: 0` — because feedback/patterns have no node_* stubs, which is correct).

### Assistant | 2026-06-18T00:08:17.208Z

[tool_use: Bash]

### User | 2026-06-18T00:08:22.488Z

[tool_result] WITH reference/: pages= 6200 excludedSuperseded= 97 excludedPointer= 12858

### Assistant | 2026-06-18T00:08:51.199Z

This confirms the full behavior: with `--include-reference`, the node-pointer exclusion fires hard — **12,858 pointer stubs excluded**, 97 superseded excluded, leaving 6,200 substantive pages. The `excludedPointer: 0` in the live doctrine-only run is correct (feedback/patterns contain no `node_*` files). The exclusion machinery works and is wired to the same predicates the supersession detector and recall path use.

I have everything I need. Let me compile the verdict.

---

VERDICT: PASS

summary: The memory contradiction linter is a genuine, minimal extension of the proven wiki NLI linter — it imports the wiki engine wholesale (`tokenizeForTopic`/`selectClaim`/`runNliLint`/`resolveNliModel`/`candidatePairs`/`DEFAULT_LIMIT`) and adds only a memory-corpus loader, so the NLI/pairing/fail-soft logic stays single-sourced with no drifting second copy. The cross-tool synergy is sound: it reuses the exact `isSupersededMemory` predicate (`SUPERSEDED_DECL_RE` matching the `> **SUPERSEDED` blockquote that `vault-supersession-detector.mjs`'s `formatMarker` writes), so a memo marked by your other tool is correctly skipped here. Advisory safety, graceful Ollama degradation, and all 8 hermetic tests are verified clean; the only real gap is a reporting one — the report cannot express that `--limit` truncated the candidate space.

findings:
- [P2] `H:/prism/scripts/lint-memory-contradictions.mjs:135` (and the live report `state/shared/memory-contradictions.json`) -- HONEST-REPORTING GAP: when `--limit` is below the true candidate-pair count, the report shows `pairsConsidered` == the truncated value (6), with no field for the FULL candidate-pair space. I verified the live doctrine corpus actually generates **1074** candidate pairs (`candidatePairs(pages, {limit:Infinity}).length === 1074`), so the `--limit 6` live run silently dropped 1068 pairs. A reader of `memory-contradictions.json` cannot tell `contradictions: 0` is over 6/1074 pairs vs the full space — it reads like a clean f
... [+3340 chars truncated]
