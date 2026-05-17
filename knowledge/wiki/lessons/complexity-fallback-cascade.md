---
title: Multi-signal cascade for missing-effort roadmap units
tags: [lesson, heuristic, fallback-cascade, rgs-tool-planner, regex-word-boundary]
created: 2026-05-17
slot: lima
chat: claude-77971357
shipped-with: U-COMPLEXITY-FALLBACK
commit: 3d416cb040
---

# Lesson: design fallback cascades when a single signal is unreliable

## Symptom

The MS0 `complexityFor()` heuristic at `rgs-tool-planner.mjs:64` defaulted 57.6% of roadmap units to tier=M because most upstream feeds emit `effort: 0` or omit the field entirely. The downstream `/rgs` tool-plan generator then routed half the pool through the same generic-M pipeline — drowning real tier-distinguished signal in noise.

The verdict regex `/integrat|reuse|existing|wire|compose/i` also miscategorised common integrate-shaped work (doc renames, audits, typo fixes, cleanup) as "build" — routing them through build-shaped pipelines that allocated time + tools + scrutiny disproportionate to the actual work.

## Root cause

Single-signal heuristics fail when the signal is upstream-controlled and the upstream is unreliable. The MS0 design assumed the roadmap-units feed would always carry an `effort` field — empirically it does so for ~40% of units. The remaining 60% silently fall through to the `: 120` default, producing a uniform-M misclassification.

The verdict regex had a different shape of bug: it captured the *primary* integrate vocabulary (`integrate`/`reuse`/etc.) but missed common doc/maintenance work that is logically integrate-class (no new code, just hooking existing code differently).

## Detection

Detection signal A — tier homogeneity:
```bash
node -e "const p = require('H:/prism/state/shared/roadmap-tool-plans.json').plans;
  const c = {};
  for (const v of Object.values(p)) c[v.complexityTier||'?'] = (c[v.complexityTier||'?']||0)+1;
  console.log(c);"
```
If any single tier dominates >50%, the heuristic is degenerate — fix the upstream signal OR add a fallback cascade.

Detection signal B — verdict precision:
- Count plans where `verdict='build'` AND title matches `/rename|doc|audit|cleanup|review/i` — those are likely miscategorised as build when they should be integrate.

## Prevention

**Cascade pattern** (applied in `scripts/lib/rgs-complexity.mjs`):
```
1. explicit effort minutes > 0       — authoritative
2. estimated_hours × 60               — alt-schema fallback
3. estimated_minutes                  — alt-schema fallback
4. title keyword markers (S/L/XL)     — semantic fallback
5. description-length proxy (S/M/L/XL) — last resort
6. default M                          — preserve MS0 behavior on empty units
```

Each level only fires when the higher levels are absent. **Earliest signal wins.** MS0 back-compat invariant: any unit that DID have explicit effort produces identical {tier, verdict} → identical sourceHash → no checkpoint stampede.

**Verdict regex word-boundary trap** (this was the gotcha that cost ~3 turns to debug):
- `/integrat|reuse|.../i` (MS0 — no boundaries) matches "integrate" via substring. Loose but works.
- `/\b(integrat|reuse|...)\b/i` (refactored attempt) **FAILS on "integrate"** because the trailing `\b` after `integrat` requires a word boundary, but the 'e' suffix continues the word.
- Correct: `/\b(integrat|reuse|...)/i` — leading `\b` only. Prevents false positives like "rewire" matching `wire` (rewire has no internal word boundary at the 'w'), but still allows prefix-stems like `integrat` to match "integrate"/"integration"/"integrating".

## Prevention check (operational)

When you refactor a "loose substring" regex to a "word-boundary precise" one, test EVERY existing positive match. The bug above passed 40 of 41 tests because most positive matches were full-word patterns (`rename`, `audit`, `wire`) where leading+trailing `\b` works. Only `integrat` (a truncated stem) broke. **A test that asserts "the MS0 positive matches still match" is the load-bearing back-compat assertion.**

## Cross-refs

- Commit: `3d416cb040` ([MAIN] [RGS-TOOL-AUTOINVOKE-MS1]/U-COMPLEXITY-FALLBACK)
- Source: `H:/prism/scripts/lib/rgs-complexity.mjs` (152 LOC, pure function)
- Tests: `H:/prism/scripts/lib/rgs-complexity.test.mjs` (41 cases, including the back-compat invariant assertion)
- Punch list: `H:/prism/docs/superpowers/specs/2026-05-16-rgs-tool-autoinvoke-MS1-punchlist.md:29`
- Sibling lesson: [[bug-findings-wiki-gate]] (the doctrine)
- Sibling lesson: [[regen-viz-merge-faillod]] · [[sourcehash-control-byte-doc-drift]] (same lima session)

## What still needs work (separate units)

- **U-RIE-ADAPTER** (M-sized, pending) — the *full* RoadmapIntelligenceEngine adapter swap (LLM-backed chain-of-thought complexity + per-MS cache + ESM↔TS bridge). This cascade is the deterministic-fallback layer; the LLM-backed layer is still TBD.
- **U-CALIBRATION** — wire `CAMConfidenceCalibrationEngine` once ≥50 outcomes accumulate.
- **U-TRANSFER** — cross-milestone transfer priors via `prism_ai:xproc_transfer_*`.
