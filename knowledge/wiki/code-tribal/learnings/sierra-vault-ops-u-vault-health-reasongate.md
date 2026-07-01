# SIERRA-VAULT-OPS/U-VAULT-HEALTH-REASONGATE — [MAIN-FORCE] [SIERRA-VAULT-OPS]/U-VAULT-HEALTH-REASONGATE (slot:sierra): confidence-gate the contradiction WARN -- count only REASONED NLI verdicts, surface reason-less ones as low-confidence.

**Commit:** `c5e135a52813` · **By:** markjvillanueva3-cloud · **At:** 2026-06-18T01:08:21-05:00
**Tags:** sierra-vault-ops, u-vault-health-reasongate, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-VAULT-OPS]/U-VAULT-HEALTH-REASONGATE (slot:sierra): confidence-gate the contradiction WARN -- count only REASONED NLI verdicts, surface reason-less ones as low-confidence.

## Body
```
[MAIN-FORCE] [SIERRA-VAULT-OPS]/U-VAULT-HEALTH-REASONGATE (slot:sierra): confidence-gate the contradiction WARN -- count only REASONED NLI verdicts, surface reason-less ones as low-confidence.

The doctrine-contradiction NLI lint sometimes emits a 'contradict' verdict with an EMPTY/trivial reason (observed live: feedback_ai_upgrade_broadcast_protocol <> feedback_sierra_no_gates -- a mild semantic tension, NOT a contradiction, flagged with reason:''). The prompt MANDATES a one-line reason, so an empty one is non-compliant low-confidence output -- a false positive. Previously vault-health WARNed on the raw totals.contradictions count, so these false positives drove spurious WARNs + operator-decisions.

Fix: the contradiction headline reads the report's per-finding contradictions[] array and counts only findings whose reason.trim().length >= MIN_REASON_LEN(10) as CONFIRMED (the WARN value); reason-less ones are surfaced in the detail as '; N low-confidence' but never escalate. Falls back to totals.contradictions when no per-finding array is present (back-compat -- all 17 prior tests unchanged). Live-verified: a real 2-contradiction report (1 reasoned edit-tool A<>B + 1 empty-reason) now reads WARN(1) + '1 low-confidence' (was WARN(2)).

+4 tests (21 total): reasoned-WARNs, all-reason-less->ok-not-warn, no-array-fallback, MIN_REASON_LEN boundary. Independent code-analyzer review PASS 0 P0/P1 (backward-compat airtight via Array.isArray guard; no crash on malformed arrays; detail-text-only, no schema change).
```

## Files touched (3)
- scripts/vault-health.mjs      | 16 ++++++++++++++--
- scripts/vault-health.test.mjs | 47 +++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 61 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c5e135a52813`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-VAULT-OPS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._