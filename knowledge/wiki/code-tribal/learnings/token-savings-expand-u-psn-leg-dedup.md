# TOKEN-SAVINGS-EXPAND/U-PSN-LEG-DEDUP — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TOKEN-SAVINGS-EXPAND]/U-PSN-LEG-DEDUP (slot:alpha): adopt injection-dedup in psn-leg-state-inject — HIGHVALUE-DISCOVERY queue #1 (partial)

**Commit:** `eefef0359a77` · **By:** markjvillanueva3-cloud · **At:** 2026-06-08T23:06:25-05:00
**Tags:** token-savings-expand, u-psn-leg-dedup, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TOKEN-SAVINGS-EXPAND]/U-PSN-LEG-DEDUP (slot:alpha): adopt injection-dedup in psn-leg-state-inject — HIGHVALUE-DISCOVERY queue #1 (partial)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TOKEN-SAVINGS-EXPAND]/U-PSN-LEG-DEDUP (slot:alpha): adopt injection-dedup in psn-leg-state-inject — HIGHVALUE-DISCOVERY queue #1 (partial)

Third adoption of the proven injection-dedup pattern this session (after slot-soul
+ slot-domain). psn-leg-state-inject fires every prompt and re-injects the same
concerning-leg block byte-identically (the NN/GNN leg has been identical all
session). Now emits full block on first-emit / 5min-TTL / content-change, else a
114-char marker (~82% cut on repeats). Content-keyed → a real leg-health change
re-emits fresh. Fail-soft: sidecar error / PRISM_INJECTION_DEDUP_DISABLE=1 /
missing session_id → full block (zero regression).

From state/shared/specs/HIGHVALUE-DISCOVERY-2026-06-08.md item #1 (the ultracode
discovery deliverable). Remaining per-slot domain injectors (foxtrot/whiskey/delta/
xray/echo/charlie) queued for next fires.

Tests: existing 75/75 pass (zero regression). Live: fresh sid=645ch full →
repeat=114ch marker → disabled=645ch full.
```

## Files touched (2)
- .claude/hooks/psn-leg-state-inject.mjs | 42 ++++++++++++++++++++++++++++++++++++++++--
- 1 file changed, 40 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show eefef0359a77`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-SAVINGS-EXPAND.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._