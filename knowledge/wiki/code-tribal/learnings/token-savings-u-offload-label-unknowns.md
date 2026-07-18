# TOKEN-SAVINGS/U-OFFLOAD-LABEL-UNKNOWNS — [MAIN] [TOKEN-SAVINGS]/U-OFFLOAD-LABEL-UNKNOWNS (slot:delta): label 80 unknown-keep prompts via 10 KEEP_ON_CLAUDE patterns

**Commit:** `c9dd4a4f8526` · **By:** markjvillanueva3-cloud · **At:** 2026-05-20T12:23:05-05:00
**Tags:** token-savings, u-offload-label-unknowns, auto-distilled

## Subject
[MAIN] [TOKEN-SAVINGS]/U-OFFLOAD-LABEL-UNKNOWNS (slot:delta): label 80 unknown-keep prompts via 10 KEEP_ON_CLAUDE patterns

## Body
```
[MAIN] [TOKEN-SAVINGS]/U-OFFLOAD-LABEL-UNKNOWNS (slot:delta): label 80 unknown-keep prompts via 10 KEEP_ON_CLAUDE patterns

Audit found 82 of 156 keeps landed in 'unknown' category (53% mis-label rate)
in ollama-task-offloader telemetry — 10/10 sampled were operator-coordination
or deep-context tasks that correctly belong on Claude, just lacked labels.

Adds 10 conservative additive patterns to KEEP_ON_CLAUDE covering the
recurring shapes from the event log:
- slot-binding (check back into <nato>, /startup-<nato>)
- cleanup (kill/reap zombie|orphan|stale)
- deep-reasoning verbs (assess whether, look into how)
- tool directives (use playwright|the mcp to)
- system-level synergy (synergize|optimize|consolidate the X)
- search-with-judgment (find high-roi)
- build directives (keep building, build out the X)
- sequencing (a then b, first do X then)

Smoke-test: 18/18 PASS (12 previously-unknown samples now classify, 6
negative controls unchanged). NO change to OFFLOADABLE_PATTERNS — direct
offload rate untouched; dashboard label accuracy improves.

Per AUDIT-TOKEN-SAVINGS-2026-05-17 F3 (offload at 20% live vs 30% target)
and complements U-OLLAMA-R2-R4 (b459870a28).
```

## Files touched (2)
- .claude/hooks/ollama-task-offloader.mjs | 23 +++++++++++++++++++++++
- 1 file changed, 23 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c9dd4a4f8526`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-SAVINGS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._