# SLOT-COMPACT-SYNERGY-MS0/U-WAVE3 — [MAIN] [SLOT-COMPACT-SYNERGY-MS0]/U-WAVE3 (slot:echo): audit-viz-first-inject rate-gate — split AUDIT_KEYWORDS into STRONG (9: audit/inventory/orphan/duplicate/unwired/survey/reconcile/enumerate/gap-analysis — always fire on noun-match) + WEAK (8: find-all/list-all/where-is/check-for/how-many/what-exists/are-there-any/missing — require PRISM-shaped noun, NOT fallback any-non-stopword token). New pure exported shouldFire(matched, nounResult, strictFilter) predicate; STRONG/WEAK/MIN_NOUN_LEN named exports for testing; extractNoun returns {noun, source} with source ∈ {quoted, camel, kebab, fallback, null}; main() gated behind import.meta.url === pathToFileURL(resolve(argv[1])).href so the file is both CLI hook AND ESM-importable module. Knob PRISM_AUDIT_VIZ_FIRST_STRICT_FILTER=0 restores legacy fire-on-any-match (MIN_NOUN_LEN=3 floor preserved under both modes — was present in the original gate, intentionally kept). Closes Wave 3 of SESSIONSTART-HOOK-AUDIT-2026-05-19 spec (target: halve audit-viz-first per-prompt fire rate — currently 1112B × ~150 prompts/session ≈ 165KB; expected post-fix ≈ 80KB savings). 31/31 node:test cases (29 + 2 added per Agent B P2 feedback: first-match-wins multi-keyword pin + typeof-noun defensive guard). Per-file 2-agent scrutiny PASS/PASS (Agent A code-analyzer; Agent B independent reviewer); Agent A's P1 was a false-positive misread (the original code had the same MIN_NOUN_LEN floor — verified, no behavior change in strictFilter=0 path; added doc note for clarity).

**Commit:** `b343b6bfd7d8` · **By:** markjvillanueva3-cloud · **At:** 2026-05-19T10:08:24-05:00
**Tags:** slot-compact-synergy-ms0, u-wave3, auto-distilled

## Subject
[MAIN] [SLOT-COMPACT-SYNERGY-MS0]/U-WAVE3 (slot:echo): audit-viz-first-inject rate-gate — split AUDIT_KEYWORDS into STRONG (9: audit/inventory/orphan/duplicate/unwired/survey/reconcile/enumerate/gap-analysis — always fire on noun-match) + WEAK (8: find-all/list-all/where-is/check-for/how-many/what-exists/are-there-any/missing — require PRISM-shaped noun, NOT fallback any-non-stopword token). New pure exported shouldFire(matched, nounResult, strictFilter) predicate; STRONG/WEAK/MIN_NOUN_LEN named exports for testing; extractNoun returns {noun, source} with source ∈ {quoted, camel, kebab, fallback, null}; main() gated behind import.meta.url === pathToFileURL(resolve(argv[1])).href so the file is both CLI hook AND ESM-importable module. Knob PRISM_AUDIT_VIZ_FIRST_STRICT_FILTER=0 restores legacy fire-on-any-match (MIN_NOUN_LEN=3 floor preserved under both modes — was present in the original gate, intentionally kept). Closes Wave 3 of SESSIONSTART-HOOK-AUDIT-2026-05-19 spec (target: halve audit-viz-first per-prompt fire rate — currently 1112B × ~150 prompts/session ≈ 165KB; expected post-fix ≈ 80KB savings). 31/31 node:test cases (29 + 2 added per Agent B P2 feedback: first-match-wins multi-keyword pin + typeof-noun defensive guard). Per-file 2-agent scrutiny PASS/PASS (Agent A code-analyzer; Agent B independent reviewer); Agent A's P1 was a false-positive misread (the original code had the same MIN_NOUN_LEN floor — verified, no behavior change in strictFilter=0 path; added doc note for clarity).

## Body
```
[MAIN] [SLOT-COMPACT-SYNERGY-MS0]/U-WAVE3 (slot:echo): audit-viz-first-inject rate-gate — split AUDIT_KEYWORDS into STRONG (9: audit/inventory/orphan/duplicate/unwired/survey/reconcile/enumerate/gap-analysis — always fire on noun-match) + WEAK (8: find-all/list-all/where-is/check-for/how-many/what-exists/are-there-any/missing — require PRISM-shaped noun, NOT fallback any-non-stopword token). New pure exported shouldFire(matched, nounResult, strictFilter) predicate; STRONG/WEAK/MIN_NOUN_LEN named exports for testing; extractNoun returns {noun, source} with source ∈ {quoted, camel, kebab, fallback, null}; main() gated behind import.meta.url === pathToFileURL(resolve(argv[1])).href so the file is both CLI hook AND ESM-importable module. Knob PRISM_AUDIT_VIZ_FIRST_STRICT_FILTER=0 restores legacy fire-on-any-match (MIN_NOUN_LEN=3 floor preserved under both modes — was present in the original gate, intentionally kept). Closes Wave 3 of SESSIONSTART-HOOK-AUDIT-2026-05-19 spec (target: halve audit-viz-first per-prompt fire rate — currently 1112B × ~150 prompts/session ≈ 165KB; expected post-fix ≈ 80KB savings). 31/31 node:test cases (29 + 2 added per Agent B P2 feedback: first-match-wins multi-keyword pin + typeof-noun defensive guard). Per-file 2-agent scrutiny PASS/PASS (Agent A code-analyzer; Agent B independent reviewer); Agent A's P1 was a false-positive misread (the original code had the same MIN_NOUN_LEN floor — verified, no behavior change in strictFilter=0 path; added doc note for clarity).
```

## Files touched (3)
- .../__tests__/audit-viz-first-rate-gate.test.mjs   | 276 +++++++++++++++++++++
- .claude/hooks/audit-viz-first-inject.mjs           |  78 +++++-
- 2 files changed, 341 insertions(+), 13 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b343b6bfd7d8`
- Milestone envelope: `mcp-server/data/milestones/SLOT-COMPACT-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._