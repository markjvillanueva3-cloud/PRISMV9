# PER-SLOT-CLAUDEMD-MS0/U-PSCM-ENFORCE — [MAIN-FORCE] [PER-SLOT-CLAUDEMD-MS0]/U-PSCM-ENFORCE (slot:alpha): activate + extend the dormant CLAUDE.md edit-guard -- "edit your galaxy file, not main"

**Commit:** `94ae4ded5153` · **By:** markjvillanueva3-cloud · **At:** 2026-06-13T15:00:17-05:00
**Tags:** per-slot-claudemd-ms0, u-pscm-enforce, auto-distilled

## Subject
[MAIN-FORCE] [PER-SLOT-CLAUDEMD-MS0]/U-PSCM-ENFORCE (slot:alpha): activate + extend the dormant CLAUDE.md edit-guard -- "edit your galaxy file, not main"

## Body
```
[MAIN-FORCE] [PER-SLOT-CLAUDEMD-MS0]/U-PSCM-ENFORCE (slot:alpha): activate + extend the dormant CLAUDE.md edit-guard -- "edit your galaxy file, not main"

Phase B enforcement of the per-slot-domain-CLAUDE.md directive ("hard enforce the
chat slots to use and edit their own claude.md files not the main one").

ACTIVATED the dormant claude-md-golf-only-guard.mjs (was 0 refs in settings.json) +
extended it, wired PreToolUse Edit|Write|MultiEdit in both settings.json (mirrored):
 - DOCREFLECT allowance: a non-golf chat may edit ONLY within a "## Recent ..."
   section (regression/shipments inbox); golf drains it. Makes the block message's
   long-standing "(a) append to the inbox" promise REAL (it previously contradicted
   itself by blocking that append).
 - galaxy-redirect: the block message now names the slot's OWN galaxy CLAUDE.md
   (via galaxyForSlot) as the place to put domain doctrine -- pairs with the
   U-PSCM-LOADER inject. Root CLAUDE.md = universal rails, golf-maintained.
 - crash-safety: top-level try/catch -> emitAllow (a blocking hook must never brick
   every CLAUDE.md edit fleet-wide on an unexpected throw); the intentional
   fail-CLOSED golf-identity path is untouched.

SECURITY (per-file 2-arm scrutiny, A PASS / B FAIL->fix->FAIL->fix->PASS):
 - P1 (live-exploitable, caught+fixed): the inbox allowance checked only the START
   index of old_string -> a non-golf chat could anchor at an inbox bullet but extend
   old_string PAST the section boundary into doctrine and rewrite it. FIX: end-inclusive
   span check (idx >= a && idx+len <= b) -- the WHOLE span must stay in one region.
 - P2 (a fix that became a worse bypass, caught+reverted): fence-aware region detection
   was fail-OPEN -- an unterminated fence swallowed every following "## " header,
   ran the region to EOF, re-exposing doctrine (two-step: poison via allowed append,
   then exploit). REVERTED to pure column-0 "## " boundaries: a spurious boundary can
   only SHRINK a region (fail-safe over-block), never extend it.
 - 48/48 tests incl. the live span-escape exploit (BLOCK) + unterminated-fence
   (region stops at real header) + adversarial sweep (before/after/cross-gap/whole-file/
   short-token/mixed-MultiEdit all BLOCK) + original golf-only + DOCREFLECT append intact.

Knobs unchanged: PRISM_CLAUDE_MD_GUARD_{BYPASS,DISABLE,FAIL_OPEN}=1.
NOT done here (follow-up): cross-galaxy ownership (mill editing lathe CLAUDE.md) =
WARN-first; cascade KNOWN_GALAXIES 22->34; wire galaxy-completeness-advisory.
```

## Files touched (3)
- .claude/hooks/claude-md-golf-only-guard.mjs      | 445 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- .claude/hooks/claude-md-golf-only-guard.test.mjs | 476 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 921 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 94ae4ded5153`
- Milestone envelope: `mcp-server/data/milestones/PER-SLOT-CLAUDEMD-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._