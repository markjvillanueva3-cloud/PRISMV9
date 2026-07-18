# FLEET-HYGIENE/U-NEVER-IDLE-HUNT-LADDER — [MAIN-FORCE] [FLEET-HYGIENE]/U-NEVER-IDLE-HUNT-LADDER (slot:golf): codify the fleet-wide "slots never idle, always hunt" rule + ultimate transcript-reconciliation fallback

**Commit:** `0565362ad9f5` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T12:03:11-05:00
**Tags:** fleet-hygiene, u-never-idle-hunt-ladder, auto-distilled

## Subject
[MAIN-FORCE] [FLEET-HYGIENE]/U-NEVER-IDLE-HUNT-LADDER (slot:golf): codify the fleet-wide "slots never idle, always hunt" rule + ultimate transcript-reconciliation fallback

## Body
```
[MAIN-FORCE] [FLEET-HYGIENE]/U-NEVER-IDLE-HUNT-LADDER (slot:golf): codify the fleet-wide "slots never idle, always hunt" rule + ultimate transcript-reconciliation fallback

OPERATOR DIRECTIVE 2026-06-18 (verbatim): "make it a rule that all chat slots
never idle, they must always hunt for work, fixes, wirings, ghost builds, ghost
wirings, or backlog work. ultimate fall back is each chat slot reads ALL
transcripts and chats to ensure we built everything we needed to but need to
compare and assess to current build to ensure it syncs well with current build."

STRENGTHENS the existing never-idle family (feedback_loop_exhaustion_domain_fallback
+ feedback_any_domain_fallback_slots) with (a) an explicit HUNT TAXONOMY beyond
"next roadmap unit" and (b) the ULTIMATE transcript+chat reconciliation fallback.
NOT a duplicate -- it is the parent rule; siblings are facets (cross-linked).

THE HUNT LADDER (descend only when the rung above is dry; prefer own domain first):
  0 finish in-flight work (anti-drift)
  1 own-domain leftover/deferred (handoff/DELTA open-threads)
  2 slot-task/priority queue + backlogged roadmaps (loop-state.mjs next, ROADMAP-CONSOLIDATED)
  3 FIXES (failing tests, tsc errors, ## Recent regressions debt)
  4 WIRINGS (audit-unwired-engines.mjs, BUILD_STATE NEEDS_WIRING, stop_on_unwired_assets)
  5 GHOST builds/wirings (/system-viz ghost roosts, master_index_query)
  6 BACKLOG (MISC-TASKS-INVENTORY; the 9 any-domain slots expand to ANY domain)
  7 ULTIMATE: transcript+chat reconciliation -- run mine-galaxy-transcripts.mjs /
    read the already-mined MISC-TASKS-INVENTORY (912 transcripts + 504 handoffs) +
    ROADMAP-CONSOLIDATED, reconcile promised-vs-shipped against BUILD_STATE /
    ENGINE_DIGEST / system-viz, build/wire the gaps. USE THE EXISTING MINERS --
    never read raw transcripts into Claude context (R5/Ollama-first token discipline).
Idle valid ONLY when every rung is dry AND budget is RED (a spiral is the only
other stop signal; context growth is NOT -- R6).

SURFACES (3, no duplication):
- knowledge/memories/feedback/feedback_slots_never_idle_always_hunt.md (source of
  truth, auto-fed to Obsidian + surfaced in per-prompt memory pre-search fleet-wide)
- CLAUDE.md "## NEVER IDLE -- ALWAYS HUNT" universal-rails section
- state/shared/CHAT-SLOT-DOMAINS.md "## NEVER-IDLE HUNT LADDER" (hook-read registry,
  next to the ANY_DOMAIN_SLOTS marker)

VERIFIED: every cited tool/spec/path exists (R12); 2-arm scrutiny PASS x2 (non-
contradiction R7 -- strictly stronger idle condition; no duplication; ascii-guard
does not gate markdown; slot-domain-awareness-inject parseSlotDomains still emits
all 21 rows + the 9-slot any-domain notice -- the new section sits below the
parse-stop header, table intact). Enforcement (auto-advance) already wired via
stop-goal-clear-advance.mjs + loop-state.mjs next; this canonizes + extends it.
NOTE: out-of-repo /h/CHAT-SLOT-DOMAINS.md root copy is stale (pre-existing, not
hook-read) -- left as-is.
```

## Files touched (3)
- CLAUDE.md                         |  8 ++++++--
- state/shared/CHAT-SLOT-DOMAINS.md | 16 ++++++++++++++++
- 2 files changed, 22 insertions(+), 2 deletions(-)

## Lessons surfaced in commit body
- till emits
- NOTE: out-of-repo /h/CHAT-SLOT-DOMAINS.md root copy is stale (pre-existing, not

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 0565362ad9f5`
- Milestone envelope: `mcp-server/data/milestones/FLEET-HYGIENE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._