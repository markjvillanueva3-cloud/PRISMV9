---
name: reference_post_ship_slot-compact-synergy-ms0-u-wave3
description: Auto-distilled learnings from shipping SLOT-COMPACT-SYNERGY-MS0/U-WAVE3 (commit b343b6bfd). Full content in wiki.
aliases: reference_post_ship_slot-compact-synergy-ms0-u-wave3
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.751Z
---


# SLOT-COMPACT-SYNERGY-MS0/U-WAVE3

[MAIN] [SLOT-COMPACT-SYNERGY-MS0]/U-WAVE3 (slot:echo): audit-viz-first-inject rate-gate — split AUDIT_KEYWORDS into STRONG (9: audit/inventory/orphan/duplicate/unwired/survey/reconcile/enumerate/gap-analysis — always fire on noun-match) + WEAK (8: find-all/list-all/where-is/check-for/how-many/what-exists/are-there-any/missing — require PRISM-shaped noun, NOT fallback any-non-stopword token). New pure exported shouldFire(matched, nounResult, strictFilter) predicate; STRONG/WEAK/MIN_NOUN_LEN named exports for testing; extractNoun returns {noun, source} with source ∈ {quoted, camel, kebab, fallback, null}; main() gated behind import.meta.url === pathToFileURL(resolve(argv[1])).href so the file is both CLI hook AND ESM-importable module. Knob PRISM_AUDIT_VIZ_FIRST_STRICT_FILTER=0 restores legacy fire-on-any-match (MIN_NOUN_LEN=3 floor preserved under both modes — was present in the original gate, intentionally kept). Closes Wave 3 of SESSIONSTART-HOOK-AUDIT-2026-05-19 spec (target: halve audit-viz-first per-prompt fire rate — currently 1112B × ~150 prompts/session ≈ 165KB; expected post-fix ≈ 80KB savings). 31/31 node:test cases (29 + 2 added per Agent B P2 feedback: first-match-wins multi-keyword pin + typeof-noun defensive guard). Per-file 2-agent scrutiny PASS/PASS (Agent A code-analyzer; Agent B independent reviewer); Agent A's P1 was a false-positive misread (the original code had the same MIN_NOUN_LEN floor — verified, no behavior change in strictFilter=0 path; added doc note for clarity).

**Shipped:** 2026-05-19T10:08:24-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[slot-compact-synergy-ms0-u-wave3]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._