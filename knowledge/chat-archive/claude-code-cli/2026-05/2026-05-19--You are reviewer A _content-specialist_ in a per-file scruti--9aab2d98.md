---
type: "chat-session"
source: "claude-code-cli"
session_id: "9aab2d98-78ae-4a9b-9dd7-d941b46c3453"
title: "You are reviewer A (content-specialist) in a per-file scrutiny gate for PRISM un"
date: "2026-05-19"
first_ts: "2026-05-19T16:57:41.045Z"
last_ts: "2026-05-19T16:58:39.311Z"
cwd: "H:\\PRISM"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/9aab2d98-78ae-4a9b-9dd7-d941b46c3453/subagents/agent-a6b8327abc9ed634b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:19"
---

# You are reviewer A (content-specialist) in a per-file scrutiny gate for PRISM un

> **claude-code-cli** | 2026-05-19 | 5 msgs (2 user / 3 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/9aab2d98-78ae-4a9b-9dd7-d941b46c3453/subagents/agent-a6b8327abc9ed634b.jsonl`

## Transcript

### User | 2026-05-19T16:57:41.045Z

You are reviewer A (content-specialist) in a per-file scrutiny gate for PRISM unit U-AITRAIN-POST-CNC-CONTROLLER-DL-STEP3-4.

CONTEXT: This unit adds the *consumer* half of an AI-training pipeline. A prior commit (75e6ad694e) shipped a corpus-mining extractor (`scripts/train-cnc-controller-from-corpus.mjs`) that emits a learned-patterns JSON ledger at `mcp-server/data/state/learned-cnc-controller-patterns.json`. This commit makes `CNCControllerDeepLearningEngine` *consume* that ledger.

FILE TO REVIEW (read it end-to-end): `H:/prism/mcp-server/src/engines/CNCControllerDeepLearningEngine.ts`

WHAT CHANGED in this file (review ONLY these additions for correctness; the rest is pre-existing):
1. New import `readFileSync` from `node:fs`.
2. New exported interfaces: `LearnedToolSlotConvention`, `LearnedVVariableIdiom`, `LearnedMacroLabel`, `LearnedControllerPatterns`, `IngestLearnedPatternsResult`, `LearnedPatternStats`.
3. New private field `learnedPatterns: LearnedControllerPatterns | null = null`.
4. New method `ingestLearnedPatterns(jsonPath)` — reads + parses + validates a learned-patterns JSON ledger, filters entries to known ControllerFamily values, stores into `this.learnedPatterns`, returns a summary. MUST throw descriptive errors on bad input (engine convention: `H:/.claude/rules/engines.md` says "throw descriptive errors, never silentCatch in engines").
5. New method `getLearnedPatternStats()` — read-only snapshot.
6. New private method `synthesizeLearnedMacro(operation, controller)` — builds a MacroPattern from learned data.
7. Augmented `recommendMacro()` — falls back to `synthesizeLearnedMacro` when no built-in pattern matches.
8. Augmented `generateMacro()` okuma_osp branch — uses learned V-variables when a corpus is ingested, else the original generic VC1/VC2 template.

The on-disk ledger shape (what `ingestLearnedPatterns` must parse) is:
```
{ schemaVersion, sourceCorpus, fileCount, controllerCounts, ledger: {
    tool_slot_conventions: [{controller, too
... [+1760 chars truncated]

### Assistant | 2026-05-19T16:57:55.306Z

I'll review the file end-to-end, focusing on the additions described.

### Assistant | 2026-05-19T16:57:55.309Z

[tool_use: Read]

### User | 2026-05-19T16:58:08.475Z

[tool_result] 1	/**
2	 * CNCControllerDeepLearningEngine — Deep AI Intelligence for CNC Controllers
3	 *
4	 * Extracts controller-specific knowledge from:
5	 * - H:/prism/Resources/WinMax Mill CUTTER COMPENSATION.pdf
6	 * - H:/prism/Resources/WinMax Mill RECOVERY AND RESTART.pdf
7	 * - Post processor documentation
8	 * - JM Die controller inventory (7 Okuma, 1 Haas, 2 Hurco, 3 Mitsubishi)
9	 *
10	 * Provides de
... [+44045 chars truncated]

### Assistant | 2026-05-19T16:58:39.311Z

I've read the file end-to-end. Here are my findings for the additions in this commit.

## Findings

**P2 — `synthesizeLearnedMacro` operation-word filter silently drops valid short-token operations** (`CNCControllerDeepLearningEngine.ts:914,920`)
`opWords` filters to `w.length >= 3`. For an operation like `"od"` (outside-diameter turn — a real machinist abbreviation) or `"id"` (inside diameter), `op` is non-empty so the early `op === ""` guard passes, but `opWords` becomes `[]`. The filter then degrades to `so.includes(op)` only — which is actually still correct (the full-string `includes` survives), so short ops are *not* fully dropped. The defect is narrower: a *multi-word* op where every word is short (`"od id"`) loses the per-word fallback and matches only on the rare exact-substring `"od id"`. Low-impact edge case. Fix: drop the `>= 3` floor to `>= 2`, or keep all words and rely on the slot-operation corpus being noise-free. Not blocking.

**P2 — `Number(r.digits ?? 0)` / `Number(r.frequency ?? 0)` can store `NaN`** (`CNCControllerDeepLearningEngine.ts:813,815,829,843`)
If a ledger row has `digits: "abc"` or `frequency: "many"`, `Number()` yields `NaN`. `NaN` is then stored in `LearnedToolSlotConvention.digits` / `.frequency`. Downstream impact is benign — `digits` is never read, and `frequency` only feeds `.sort((a,b) => b.frequency - a.frequency)` where a `NaN` comparand makes the comparator return `NaN` (treated as `0`, leaving order unstable but not crashing) and `(observed ${topSlot.frequency}×)` would render `observed NaN×`. Note `fileCount` at line 849 *is* guarded with `Number.isFinite`, so the inconsistency is real — `digits`/`frequency` should get the same treatment. Fix: `const num = (v) => { const n = Number(v ?? 0); return Number.isFinite(n) ? n : 0; };` and use it for all three. Cosmetic-tier defect, not blocking.

## Verified correct (no issue)

- **Path/file/JSON/root/ledger validation** (753–793): rejects non-string + empty-trimmed path, wraps 
... [+2452 chars truncated]
