# BACKEND-DEV-LOOP/U-PRISM-DEV-WIKIS-HIGH-ROI — [MAIN] [BACKEND-DEV-LOOP]/U-PRISM-DEV-WIKIS-HIGH-ROI: 5 high-ROI PRISM-dev wikis [iter1]

**Commit:** `d02e7382d0f1` · **By:** markjvillanueva3-cloud · **At:** 2026-05-18T14:47:28-05:00
**Tags:** backend-dev-loop, u-prism-dev-wikis-high-roi, auto-distilled

## Subject
[MAIN] [BACKEND-DEV-LOOP]/U-PRISM-DEV-WIKIS-HIGH-ROI: 5 high-ROI PRISM-dev wikis [iter1]

## Body
```
[MAIN] [BACKEND-DEV-LOOP]/U-PRISM-DEV-WIKIS-HIGH-ROI: 5 high-ROI PRISM-dev wikis [iter1]

iter1 of new /goal — generate high-ROI auto-injecting wikis that improve PRISM development.

  knowledge/wiki/code-tribal/
    engine-creation-playbook.md          8-step recipe: dedup-preflight → engine → schema → 5-piece dispatcher wiring → tests → per-file scrutiny → wiki → commit. Common failures + WIRE-EXEMPT singleton tag.
    roadmap-pickup-discipline.md         /pick-dev vs /pick-unit vs priority-queue; priority signals (P0/bridge/tier1/domain/age); is-it-actually-pending check; slot-task-claim; DONE_STATUSES allowlist gotcha.
    build-error-fix-patterns.md          Top-10 TS error class taxonomy + recipe per class; unknown-bridge pattern; discriminated-union narrowing; schema-read-first rule; build:fast vs build:incremental vs build; commit hygiene with -N reductions.

  knowledge/wiki/software-engineering/
    slot-worktree-playbook.md            Cutover procedure; 4 common failures + fixes; conflict-fork fallback; integrator (golf) merge protocol; slot-task-claim integration; cross-PC caveat; cleanup; knobs.
    safety-tier-discipline.md            3 tiers (shop_floor/prototype/research) with Omega + S(x) thresholds; the S(x) hard gate; tier-downgrade anti-pattern; tier in dispatcher actions; audit trail.

Pairs with the prior 20-wiki backend-dev meta-doctrine — those covered HOW to think, these cover HOW PRISM SPECIFICALLY operates. Auto-injects via wiki-precheck-inject hook once leaf-index regen runs.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (6)
- .../wiki/code-tribal/build-error-fix-patterns.md   | 106 +++++++++++++++++++++
- .../wiki/code-tribal/engine-creation-playbook.md   |  86 +++++++++++++++++
- .../wiki/code-tribal/roadmap-pickup-discipline.md  |  74 ++++++++++++++
- .../software-engineering/safety-tier-discipline.md |  77 +++++++++++++++
- .../software-engineering/slot-worktree-playbook.md |  77 +++++++++++++++
- 5 files changed, 420 insertions(+)

## Lessons surfaced in commit body
- gotcha.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d02e7382d0f1`
- Milestone envelope: `mcp-server/data/milestones/BACKEND-DEV-LOOP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._