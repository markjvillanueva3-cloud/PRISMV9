# HIGH-ROI-HOOKS/U-ROUTE-DECAY-KEYSTONE — [MAIN] [HIGH-ROI-HOOKS]/U-ROUTE-DECAY-KEYSTONE (slot:golf): advisory-decay keystone lib + skills/hooks audit spec + bravo splice patch

**Commit:** `e7fb25bb8aa9` · **By:** markjvillanueva3-cloud · **At:** 2026-06-11T17:49:23-05:00
**Tags:** high-roi-hooks, u-route-decay-keystone, auto-distilled

## Subject
[MAIN] [HIGH-ROI-HOOKS]/U-ROUTE-DECAY-KEYSTONE (slot:golf): advisory-decay keystone lib + skills/hooks audit spec + bravo splice patch

## Body
```
[MAIN] [HIGH-ROI-HOOKS]/U-ROUTE-DECAY-KEYSTONE (slot:golf): advisory-decay keystone lib + skills/hooks audit spec + bravo splice patch

Skills+hooks audit (ultracode wf_cba6f0c3-d11, 18 agents, 532 skills/12 buckets):
- ~446 keep / ~12 high-confidence functional disable-candidates (advisory, per-skill
  verification required) + generic-scaffold bucket (92 claude-flow/sparc boilerplate).
- R8 CORRECTION: synthesis falsely proposed HRH-NEW-1 CAG-inject as novel; it is
  already built+wired+firing (cag-router-inject.mjs). 2 novel hooks survive
  (regression-lock-enforce, write-time-tsc) but are .claude/hooks firewall-gated.

Advisory-decay keystone (the one golf-R8-verified novel item; operator headline
token-savings lever): scripts/lib/route-suggest-decay.mjs consumes the existing
audit-mcp-route-takerate.mjs 'suppress' verdict to mute proven-noise classifiers.
16/16 tests. LIVE-VALIDATED: suppress-set = doctrineSurface(4360f/0.48%)+
backendAuditChain(4108f/0.07%) = ~81% of 10473 route-suggest fires, safety guards
correctly protect verify-wiring(0-take) + retune(<30% share). 2-line hook splice
firewall-gated -> ready patch routed to bravo (route-suggest-decay-splice-patch.md).
```

## Files touched (5)
- scripts/lib/route-suggest-decay.mjs                    | 124 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/route-suggest-decay.test.mjs               | 159 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- state/shared/specs/SKILLS-HOOKS-AUDIT-2026-06-11.md    |  53 ++++++++++++++++++++++++++++++++++++++++++
- state/shared/specs/route-suggest-decay-splice-patch.md |  32 +++++++++++++++++++++++++
- 4 files changed, 368 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e7fb25bb8aa9`
- Milestone envelope: `mcp-server/data/milestones/HIGH-ROI-HOOKS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._