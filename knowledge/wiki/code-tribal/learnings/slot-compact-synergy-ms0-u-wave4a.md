# SLOT-COMPACT-SYNERGY-MS0/U-WAVE4a — [MAIN] [SLOT-COMPACT-SYNERGY-MS0]/U-WAVE4a (slot:echo): re-add _disabled/README — closes Wave 4a retire cycle for linear-roadmap-sync + supabase-state-sync

**Commit:** `7e91a892b73b` · **By:** markjvillanueva3-cloud · **At:** 2026-05-19T10:33:23-05:00
**Tags:** slot-compact-synergy-ms0, u-wave4a, auto-distilled

## Subject
[MAIN] [SLOT-COMPACT-SYNERGY-MS0]/U-WAVE4a (slot:echo): re-add _disabled/README — closes Wave 4a retire cycle for linear-roadmap-sync + supabase-state-sync

## Body
```
[MAIN] [SLOT-COMPACT-SYNERGY-MS0]/U-WAVE4a (slot:echo): re-add _disabled/README — closes Wave 4a retire cycle for linear-roadmap-sync + supabase-state-sync

The .mjs RENAMES + original README were shipped in peer juliett's commit
e330343ee7 (sweep absorbed my staged work during a git index.lock
contention on the shared main tree — same class as
[[reference_cross_chat_commit_misattribution_2026_05_18]]). A subsequent
peer commit c020ebb7b6 deleted the README from HEAD while leaving the
.mjs renames intact, so the inventory was incomplete. This commit
restores the README only — the .mjs files remain at their juliett-
attributed paths in HEAD (verified via git ls-files .claude/hooks/_disabled/).

Work itself is correct + complete:
- linear-roadmap-sync.mjs: SessionStart+Stop hook gated on a `linear` MCP
  server entry in .mcp.json which is absent (only prism-mcp-server +
  claude-flow are configured globally + at H:). Hook also has a latent
  JSON-shape bug — emits {decision:"approve", reason:"..."} instead of
  hookSpecificOutput.additionalContext, so even when its conditions are
  met the chat sees nothing.
- supabase-state-sync.mjs: same JSON-shape bug + SUPABASE_PROJECT_URL="" /
  SUPABASE_ANON_KEY="" in H:/.claude/settings.json (verified empty), so
  isSupabaseConfigured() returns false universally.

Settings.json unwire (4 entries: 2 SessionStart, 2 Stop) was applied to
C:'s settings.json earlier this session and auto-mirrored to H: by
c-to-h-mirror — verified by grep returning exit 1.

Per [[feedback_never_delete_only_disable]]: file preservation + 1-move
restoration if dependency is later configured. README documents how.

U-WAVE3 collision note: peer golf shipped a DIFFERENT
[SLOT-COMPACT-SYNERGY-MS0]/U-WAVE3 in ba04aff4c1 (fleet-reaper Tier-3)
BEFORE my own b343b6bfd7 ([SLOT-COMPACT-SYNERGY-MS0]/U-WAVE3 audit-viz
rate-gate) landed. Same U-ID, different scope-internal work. Both
shipped, both correct. Echo continues with U-WAVE4a → 4b → 5.
```

## Files touched (2)
- .claude/hooks/_disabled/README.md | 50 +++++++++++++++++++++++++++++++++++++++
- 1 file changed, 50 insertions(+)

## Lessons surfaced in commit body
- note: peer golf shipped a DIFFERENT

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7e91a892b73b`
- Milestone envelope: `mcp-server/data/milestones/SLOT-COMPACT-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._