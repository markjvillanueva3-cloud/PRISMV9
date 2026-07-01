# PER-SLOT-CLAUDEMD-MS0/U-PSCM-LOADER — [MAIN-FORCE] [PER-SLOT-CLAUDEMD-MS0]/U-PSCM-LOADER (slot:alpha): SessionStart-chain galaxy-CLAUDE.md loader -- each slot loads its OWN domain doctrine

**Commit:** `da3ead84e099` · **By:** markjvillanueva3-cloud · **At:** 2026-06-13T10:45:03-05:00
**Tags:** per-slot-claudemd-ms0, u-pscm-loader, auto-distilled

## Subject
[MAIN-FORCE] [PER-SLOT-CLAUDEMD-MS0]/U-PSCM-LOADER (slot:alpha): SessionStart-chain galaxy-CLAUDE.md loader -- each slot loads its OWN domain doctrine

## Body
```
[MAIN-FORCE] [PER-SLOT-CLAUDEMD-MS0]/U-PSCM-LOADER (slot:alpha): SessionStart-chain galaxy-CLAUDE.md loader -- each slot loads its OWN domain doctrine

Phase B (loader) of the per-slot-domain-CLAUDE.md directive. Each chat slot now loads
its galaxy's mcp-server/src/engines/<galaxy>/CLAUDE.md as PRIMARY domain doctrine, so it
operates from its own domain file instead of re-deriving from the ~530-line root monolith.

 - .claude/hooks/galaxy-claudemd-inject.mjs (UserPromptSubmit) -- cloned from the proven
   slot-soul-inject pattern: chat-slots.json slot matcher -> galaxyForSlot() (the fixed
   single-source map) -> injects the galaxy CLAUDE.md with a header marking it PRIMARY +
   pointing root edits to golf. injection-dedup (30min TTL / content-hash) so the 20KB
   block is emitted once per window, not every prompt; safe-truncate (surrogate-safe) at
   24KB cap; fail-soft (no slot / unmapped / missing file -> inject nothing, degrade to
   universal root, NEVER block the prompt).
 - WIRED: C:\Users\wompu\.claude\settings.json UserPromptSubmit chain after slot-soul-inject
   (slot binding authoritative); auto-mirrored to H:\.claude\settings.json (both valid JSON,
   1 ref each). Individual entry, NOT the bundle (master-index wiring lesson).
 - VALIDATED live: bound slot bravo -> hermes-zulu, real Hermes doctrine injected (this also
   re-proves the map fix -- bravo previously resolved to nonexistent hermes-zebra = ZERO
   context). Dedup verified: full block once, 225B marker on repeat.
 - Knobs: PRISM_GALAXY_CLAUDEMD_INJECT_DISABLE=1, _VERBOSE=1.
 - NOTE (R12): integration-validated (run+emit+dedup) matching the slot-soul-inject sibling
   convention (no .test.mjs); formal 2-arm per-file scrutiny deferred to end-session 3-of-3.
```

## Files touched (2)
- .claude/hooks/galaxy-claudemd-inject.mjs | 138 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 138 insertions(+)

## Lessons surfaced in commit body
- lesson).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show da3ead84e099`
- Milestone envelope: `mcp-server/data/milestones/PER-SLOT-CLAUDEMD-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._