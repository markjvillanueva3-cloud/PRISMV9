# SIERRA-VAULT-OPS/U-VAULT-SUPERSEDE-DETECT — [MAIN-FORCE] [SIERRA-VAULT-OPS]/U-VAULT-SUPERSEDE-DETECT (slot:sierra): memory supersession detector -- 128 stale-as-current dated memos across 43 stems surfaced (read-only triage)

**Commit:** `b397e08da3ac` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T13:54:06-05:00
**Tags:** sierra-vault-ops, u-vault-supersede-detect, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-VAULT-OPS]/U-VAULT-SUPERSEDE-DETECT (slot:sierra): memory supersession detector -- 128 stale-as-current dated memos across 43 stems surfaced (read-only triage)

## Body
```
[MAIN-FORCE] [SIERRA-VAULT-OPS]/U-VAULT-SUPERSEDE-DETECT (slot:sierra): memory supersession detector -- 128 stale-as-current dated memos across 43 stems surfaced (read-only triage)

Highest-ROI remaining 2nd-brain gap: dated memories (reference_X_2026-06-15.md) whose
topic-stem has a strictly-newer dated sibling surface in recall as CURRENT though stale
(the worst 2nd-brain failure per the PKM articles). scripts/vault-supersession-detector.mjs
groups dated memos by stem, flags every older-with-newer-sibling, points each at the NEWEST.

REUSES isSupersededMemory from memory-index-search-lib.mjs (the live recall-exclusion
predicate) as the SINGLE source of truth -- no second drifting regex. formatMarker emits the
exact recall-readable '> **SUPERSEDED <date> -- see [[newer]].**' blockquote (self-tested
against the real predicate) so a follow-up gated --mark unit wires straight into recall.

READ-ONLY (triage report only, operator decides) -- mirrors vault-rot-sentinel. Live: 19,889
scanned, 128 unmarked candidates (103 C:-sourced), report at state/shared/memory-supersession-report.json.
15 mutation-proof tests. 3-agent scrutiny: code-analyzer PASS + reviewer PASS (live-verified
counts); test-review-agent FAIL DISCARDED (hallucinated a fabricated version of the file --
cited code/markers that don't exist, contradicted by A+C who read the real files). Fixed 3 P2s:
calendar-rollover rejection (Feb-30/Jun-31), readErrors counter (R12), --limit doc.
```

## Files touched (3)
- scripts/vault-supersession-detector.mjs      | 244 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/vault-supersession-detector.test.mjs | 199 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 443 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b397e08da3ac`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-VAULT-OPS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._