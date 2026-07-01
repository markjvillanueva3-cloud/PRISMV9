---
title: "feedback-karpathy-discipline"
name: feedback-karpathy-discipline
kind: reference
status: promoted
category: lessons
domain: knowledge-vault
promoted_from: knowledge/memories/feedback/feedback_karpathy_discipline.md
promoted_at: 2026-06-06T04:55:47.770Z
source_refs: 5
---

# Karpathy discipline — the 5-step pre-coding checklist

The single most-referenced PRISM doctrine. Cited by every `// tier: T#` hook header in this repo and every code-review pass. Until now had no dedicated memo — same orphan pattern as [[feedback_psn_definition]].

## The 5 steps (in order, every time)

> **Before writing ANY code:**
>
> 1. **CLASSIFY** — Problem type? (search, state, async, parse, cache, validate, transform, …)
> 2. **TECHNIQUE** — Hash vs tree? FSM vs reducer? Promise.all vs sequential?
> 3. **EDGE CASES** — Empty, null, overflow, concurrent, NaN, unicode, timeout, partial input
> 4. **FAILURE MODES** — Network, disk, OOM, race condition, invalid state, hostile payload
> 5. **THEN WRITE** — Code that handles ALL of the above from line 1
>
> *Source: CLAUDE.md §KARPATHY DISCIPLINE*

## The anti-drift checkpoint (every ~5 tasks)

Independent companion check — fires periodically during a /loop:

- Am I still on the user's goal or did I wander?
- Is this the simplest solution or am I over-engineering?
- Did I check existing assets before building new? (R8)
- Have I made any assumptions I haven't verified? (R12)

## Where to find it in PRISM hooks

The "Karpathy discipline" comment block appears at the head of every safety-relevant hook. Standard template:

```js
// Karpathy discipline:
//   CLASSIFY: <hook type, e.g. PreToolUse:Bash sync gate>
//   TECHNIQUE: <one-line algorithm>
//   EDGE CASES: <list every input shape that could surprise>
//   FAILURE MODES: <what happens when each dependency fails>
```

Examples in this repo (good reference points):
- `.claude/hooks/auto-consensus-sync-bash.mjs` — sync-by-opt-in safety hook
- `.claude/hooks/pre-bash-graph-inject.mjs` — narrow file-search verb gate
- `.claude/hooks/stop-graph-staleness-backstop.mjs` — Stop-hook 3h staleness backstop
- `scripts/lib/graph-key-derive.mjs` — per-tool key derivation

## When the discipline is skipped (failure modes you've already seen)

- **Skipping CLASSIFY** → wrong technique, e.g. using sequential `await` in a loop when `Promise.all` was the right call.
- **Skipping EDGE CASES** → safety-invariant breaches like U-GO-C2's first-pass scrutiny FAIL (disable knob bypassed classification).
- **Skipping FAILURE MODES** → silent allow on engine-missing instead of fail-SAFE ASK.
- **Skipping ANTI-DRIFT** → 5 tasks deep into a refactor, no longer working on the original /goal.

## The rule that makes the rule work

Karpathy R10 (Checkpoint after every significant step) is what enforces R1 over multi-step tasks. Without checkpointing, the 5-step discipline degrades into "did 5-step on step 1, forgot by step 4". Per [[feedback_parallel_scrutiny_per_file]] the per-file scrutiny gate is the enforcement mechanism for multi-file builds.

## Cross-refs

- [[feedback_r5_thru_r12_doctrine]] — the full R1-R12 doctrine (this is R1's mechanism)
- [[feedback_psn_definition]] — orphan-promotion sibling
- [[feedback_parallel_scrutiny_per_file]] — the per-file 2-of-2 scrutiny gate (R9 + R10 enforcement)
- [[feedback_always_close_out]] — R10 applied to task close-out
- [[feedback_verify_actual_contract_not_proxy]] — R9 + R12 applied to repros

## Source

Promoted from memory [[feedback_karpathy_discipline]] (referenced 5x across the vault). The memory remains the editable source of truth.
