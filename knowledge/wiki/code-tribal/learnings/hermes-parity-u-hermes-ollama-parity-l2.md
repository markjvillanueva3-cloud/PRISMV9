# HERMES-PARITY/U-HERMES-OLLAMA-PARITY-L2 — [MAIN-FORCE] [HERMES-PARITY]/U-HERMES-OLLAMA-PARITY-L2 (slot:alpha): /hermes-* task-skill family (12) via idempotent generator

**Commit:** `9d11596a086e` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T14:20:33-05:00
**Tags:** hermes-parity, u-hermes-ollama-parity-l2, auto-distilled

## Subject
[MAIN-FORCE] [HERMES-PARITY]/U-HERMES-OLLAMA-PARITY-L2 (slot:alpha): /hermes-* task-skill family (12) via idempotent generator

## Body
```
[MAIN-FORCE] [HERMES-PARITY]/U-HERMES-OLLAMA-PARITY-L2 (slot:alpha): /hermes-* task-skill family (12) via idempotent generator

Clone the 12 /ollama-* task skills to /hermes-* equivalents -- the operator's
'full parity (clone the skills too)' scope. Emitted by a tracked, idempotent
generator (canonical+generate pattern, mirroring generate-per-slot-wrappers.mjs),
regenerable on any worktree -- DURABLE source of truth, not 12 hand-edited gitignored
leaves (the ollama-* family is itself gitignored+untracked; the generator survives a fresh checkout).

12 skills (1:1 ollama-* siblings): explain summarize classify error-triage diff-summary
docstring extract boilerplate test-stub architecture-plan route-check bridge.

- Every skill calls CANONICAL scripts/ask-hermes.mjs -- NOT raw curl / retired :7b tag
  (inherits L1a/L1b NC-guard + file cap + timeout scaling + Ollama fallback).
- HONEST cost framing (R12): every paid skill declares PAID + 'NOT a $0 default' + points
  at its free /ollama-<sib>. Hermes = escalation tier above free local Ollama, never a default.
- bridge = POINTER to /hermes-workflow + /ask-hermes (no fork of the local harness; R8/R16).
  route-check = health probe (proxy + byHook ledger), not a paid ask. ASCII-only, idempotent.

Materialize: node scripts/generate-hermes-skills.mjs (12/12, 0 drift).
LIVE: route-check ledger shows 851 real ask-hermes answers. Tests 14/14. 2-arm scrutiny PASS.
```

## Files touched (3)
- scripts/generate-hermes-skills.mjs      | 335 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/generate-hermes-skills.test.mjs | 129 +++++++++++++++++++++++++++++++++++
- 2 files changed, 464 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 9d11596a086e`
- Milestone envelope: `mcp-server/data/milestones/HERMES-PARITY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._