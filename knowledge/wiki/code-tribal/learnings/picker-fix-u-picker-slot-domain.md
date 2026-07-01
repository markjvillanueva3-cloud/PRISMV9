# PICKER-FIX/U-PICKER-SLOT-DOMAIN — [MAIN] [PICKER-FIX]/U-PICKER-SLOT-DOMAIN: slot-domain filter + SSOT extraction

**Commit:** `a9f1df58078a` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T19:38:53-05:00
**Tags:** picker-fix, u-picker-slot-domain, auto-distilled

## Subject
[MAIN] [PICKER-FIX]/U-PICKER-SLOT-DOMAIN: slot-domain filter + SSOT extraction

## Body
```
[MAIN] [PICKER-FIX]/U-PICKER-SLOT-DOMAIN: slot-domain filter + SSOT extraction

Iter 3 closes the deferred P2 from iter-1 scrutiny: priority-queue --pick
--slot echo returned random hygiene units (U-CLEANUP-*) instead of echo's
domain (cam) per JULIETT-12CHAT-ALLOCATION.

NEW scripts/lib/domain-classifier.mjs — single source of truth for slot↔
domain mapping + unit→domain classification. Extracted from the inline
DOMAIN_RULES that lived only in allocate-domains-to-slots.mjs so the
allocator and the pickup picker can't drift. Frozen exports (Object.freeze
on rules/maps/default). 16 tests incl. order-invariant oracles (HYPERMILL→
cam not mill; WEDM→wire not lathe), bijectivity, frozen-mutation-throws.

allocate-domains-to-slots.mjs refactored to import the lib — behavior-
identical (rule order byte-verified; sole callsite destructures {domain,
slot}; old classify() never read rule.rx). Live dry-run unchanged: 3238
units → 13 domains, echo=181 cam.

priority-queue.mjs pickNextUnit({slot}) now domain-filters: echo→cam,
alpha→mill, etc. R12 fallback — if a slot's lane has zero eligible work,
returns global ranking flagged _crossDomain:true (NOT empty — a chat
always needs a task). CLI now emits a stderr ⚠CROSS-DOMAIN warning AND a
per-line [domain] / ⚠CROSS-DOMAIN(domain) marker so a chat can never
silently work off-lane (closes reviewer-B P1).

Per-file scrutiny: code-analyzer PASS (9/10, 0 P0/P1, 3 P2 deferred).
Independent reviewer PASS with 2 P1s — BOTH fixed this iter:
  P1-a: _crossDomain was a silent object field → added stderr + CLI marker.
  P1-b: 5 integration tests silent-skipped on empty picks (a picker→[]
        regression would pass vacuously) → added a LOUD GUARD test that
        fails if ROADMAP-CONSOLIDATED.json exists but picker returns [].

Verified live: priority-queue --pick --slot echo now returns
U-BRIDGE-CAD-CAM-HANDOFF (cam-domain, high-leverage CAM bridge) instead of
U-CLEANUP-B9 (hygiene). echo is back in its lane.

Tests: 55/55 PASS (16 domain-classifier + 26 shipped-units + 13 priority-
queue). iters 1-2 (c84a0c7cbc, 9cdc2db2e1) verified intact in git log.

Deferred P2 (logged): slot-queue.mjs vs priority-queue.mjs are two slot-
scoping sources of truth — domain SSOT governs only the fallback picker;
the curated slot-task-queues.json partition still comes from the allocator.
Document the precedence (curated wins) as a follow-up.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (6)
- .claude/helpers/priority-queue.mjs      |  33 +++++++-
- .claude/helpers/priority-queue.test.mjs |  73 +++++++++++++++++-
- scripts/allocate-domains-to-slots.mjs   |  50 ++++--------
- scripts/lib/domain-classifier.mjs       | 110 ++++++++++++++++++++++++++
- scripts/lib/domain-classifier.test.mjs  | 133 ++++++++++++++++++++++++++++++++
- 5 files changed, 359 insertions(+), 40 deletions(-)

## Lessons surfaced in commit body
- till comes from the allocator.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show a9f1df58078a`
- Milestone envelope: `mcp-server/data/milestones/PICKER-FIX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._