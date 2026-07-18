---
type: "chat-session"
source: "claude-code-cli"
session_id: "e5840fb7-ef73-4b34-a9f0-20822aa90cab"
title: "Review a surgical fix to `H:/prism/scripts/build-milestone-progress.mjs` (a Node"
date: "2026-05-22"
first_ts: "2026-05-22T16:48:39.710Z"
last_ts: "2026-05-22T16:49:21.916Z"
cwd: "H:\\prism"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/e5840fb7-ef73-4b34-a9f0-20822aa90cab/subagents/agent-a460ddfcde50ef7a1.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:30"
---

# Review a surgical fix to `H:/prism/scripts/build-milestone-progress.mjs` (a Node

> **claude-code-cli** | 2026-05-22 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/e5840fb7-ef73-4b34-a9f0-20822aa90cab/subagents/agent-a460ddfcde50ef7a1.jsonl`

## Transcript

### User | 2026-05-22T16:48:39.710Z

Review a surgical fix to `H:/prism/scripts/build-milestone-progress.mjs` (a Node ESM script, ~493 lines). Read the WHOLE file end-to-end.

CONTEXT — the bug being fixed:
This script computes per-milestone shipped/pending counts by matching git commit subjects (`[SCOPE]/U-ID`) against milestone-envelope unit IDs, with two envelope-driven fallbacks: (1) `envelope-commit` — a unit's declared `commits[]` SHA reachable in the git window; (2) `envelope-status` — a unit with `envelopeStatus==='complete'`/`'completed'` and NO declared commits (ops-only units).

The bug: `loadMilestones()` has THREE envelope-shape branches — `phases[].units[]` (lines ~172-186), flat `ms.units[]` (~190-201), object-map `ms.units{}` (~206-217). The flat and object-map branches read each unit's OWN `status` and `commits` fields. But the **phases branch** read `envelopeStatus`/`envelopeCommits` ONLY from the top-level `ms.units{}` object-keyed overlay (`unitOverlay`) — which is `{}` for any envelope that has `phases` but no top-level `ms.units{}` map. Result: for pure-`phases` envelopes, a unit's own `status:"complete"` and `commits:["<sha>"]` written by a close-out flip were silently dropped, so the envelope fallbacks never fired.

THE FIX (already applied — verify it):
In the phases branch, `envelopeStatus` now reads `u.status ?? unitOverlay[u.id]?.status ?? null` and `envelopeCommits` reads `Array.isArray(u.commits) ? u.commits : (Array.isArray(unitOverlay[u.id]?.commits) ? unitOverlay[u.id].commits : [])`. The pre-existing Phase-B enrichment block (~222-229) that fills phase units from the overlay when they lack data is unchanged.

ALSO: an unrelated pre-existing unused-var lint was cleaned — `for (const [key, val] of shipped.entries())` → `for (const val of shipped.values())` near line ~258.

EMPIRICAL RESULT after the fix: total shipped jumped 2107 → 2551 (+444 units credited), drift cases 191→190. RGS-TOOL-AUTOINVOKE-MS1 went pending=3→0 (its 3 units shipped under aliased `U-LIMA-A6/A7/A8
... [+943 chars truncated]

### Assistant | 2026-05-22T16:48:52.462Z

I'll read the file end-to-end to verify the fix.

### Assistant | 2026-05-22T16:48:52.713Z

[tool_use: Read]

### User | 2026-05-22T16:49:09.768Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * build-milestone-progress.mjs
4	 *
5	 * Generates state/shared/MILESTONE_PROGRESS.md + .json — a delta surface
6	 * showing what's actually shipped per milestone vs what the milestone
7	 * envelope JSONs claim.
8	 *
9	 * Why: roadmap-index.json carries `status: "not_started"` for milestones
10	 * we've already shipped 5+ units of (e.g. XPROC-NEURAL-OPTIMIZE-MS0 has

... [+22955 chars truncated]

### Assistant | 2026-05-22T16:49:21.916Z

## Code Quality Analysis Report

### 1. Fix correctness — phases branch consistency
**PASS.** Lines 184-187 now read `u.status ?? unitOverlay[u.id]?.status ?? null` and the `Array.isArray(u.commits) ? u.commits : (overlay-fallback)` pattern. This makes the phases branch read each unit's OWN fields first, identical in intent to the flat branch (203) and object-map branch (218-219). The `?? unitOverlay` fallback is strictly additive — the flat/object-map branches have no overlay because the overlay only exists when a top-level `ms.units{}` map coexists with `phases`. Correct.

### 2. Is +444 over-crediting?
**Legitimate, not over-crediting.** Trace fallback 2 (lines 296-300): `envelope-status` credits ONLY when `envelopeStatus === "complete" || "completed"` AND zero declared commits. This is the *exact same trust model* the flat branch already had — a flat envelope with `status:"complete"` and no commits was already credited before this fix. The phases branch was simply blind to its own `status` field. The +444 is recovering close-out flips that were silently dropped. RGS-TOOL-AUTOINVOKE-MS1 (pending 3→0) shipped via fallback 1 (`envelope-commit`, declared `commits[]` with reachable SHAs) — that is git-verified, not status-trust. Drift dropping 191→190 confirms reconciliation, not inflation.

### 3. Regression — could non-complete status be wrongly credited?
**No.** `envelopeStatus` is consumed in exactly two places: (a) line 296 fallback 2, which strictly tests `=== "complete" || === "completed"` — `in_progress`/`not_started`/null all fail; (b) line 228 Phase-B enrichment, which only *populates* the field, never credits. A unit with `status:"in_progress"` and no commit still resolves `hit=null`, `isShipped=false`. No regression path.

### 4. Phase-B enrichment block (227-234) interaction
**Still correct.** Its guard is `(u.envelopeStatus === null || undefined) && unitOverlay[u.id]`. The phases branch now populates `envelopeStatus` directly from `u.status` when presen
... [+712 chars truncated]
