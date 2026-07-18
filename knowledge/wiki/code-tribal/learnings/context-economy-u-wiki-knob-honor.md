# CONTEXT-ECONOMY/U-WIKI-KNOB-HONOR — [MAIN] [CONTEXT-ECONOMY]/U-WIKI-KNOB-HONOR (slot:golf): wiki-precheck-inject now honors PRISM_WIKI_PRECHECK_INJECT — closes a per-prompt context leak across the fleet

**Commit:** `1b52f99194a1` · **By:** markjvillanueva3-cloud · **At:** 2026-06-01T11:08:14-05:00
**Tags:** context-economy, u-wiki-knob-honor, auto-distilled

## Subject
[MAIN] [CONTEXT-ECONOMY]/U-WIKI-KNOB-HONOR (slot:golf): wiki-precheck-inject now honors PRISM_WIKI_PRECHECK_INJECT — closes a per-prompt context leak across the fleet

## Body
```
[MAIN] [CONTEXT-ECONOMY]/U-WIKI-KNOB-HONOR (slot:golf): wiki-precheck-inject now honors PRISM_WIKI_PRECHECK_INJECT — closes a per-prompt context leak across the fleet

ROOT CAUSE: settings.json disables a CLUSTER of 3 per-prompt injectors for context
economy — PRISM_MASTER_INDEX_INJECT=0, PRISM_MEMORY_INDEX_INJECT=0,
PRISM_WIKI_PRECHECK_INJECT=0. master-index + memory-index honor their _INJECT knob and
are correctly off. But wiki-precheck-inject gated on PRISM_WIKI_PRECHECK (no _INJECT
suffix), so PRISM_WIKI_PRECHECK_INJECT was a DEAD knob (referenced by no hook) and the
wiki injector kept firing EVERY prompt across all 26 chats — burning context the operator
believed they had disabled.

FIX: the disable gate now also honors PRISM_WIKI_PRECHECK_INJECT==='0' (aligning with the
sibling _INJECT convention) while keeping the legacy PRISM_WIKI_PRECHECK knob. Pure
OR-addition to the disable condition — when neither env is '0' the enabled path is
byte-identical (provably cannot disable a default chat).

IMPACT: realizes the operator's evident intent; compounding per-prompt token savings
(top-3 wiki entries x every qualifying prompt x 26 chats). Reversible: set
PRISM_WIKI_PRECHECK_INJECT=1 (or remove the setting) to re-enable.

VERIFIED (smoke): PRISM_WIKI_PRECHECK_INJECT=0 -> disabled; legacy PRISM_WIKI_PRECHECK=0
-> disabled; neither -> enabled path unchanged. Parse OK. Edited via documented
PRISM_CROSS_WORKTREE_BYPASS (harness-exec tier), committed atomically.
```

## Files touched (2)
- .claude/hooks/wiki-precheck-inject.mjs | 4 ++--
- 1 file changed, 2 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 1b52f99194a1`
- Milestone envelope: `mcp-server/data/milestones/CONTEXT-ECONOMY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._