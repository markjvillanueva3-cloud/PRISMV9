# AI-SYSTEMS-LORA/U-LORA-GALAXY-TAG-ROOTCAUSE — [MAIN-FORCE] [AI-SYSTEMS-LORA]/U-LORA-GALAXY-TAG-ROOTCAUSE (slot:india): wire galaxy-tag recovery into the assembler + respect the untagged-cross-cutting contract

**Commit:** `72235f758ab4` · **By:** markjvillanueva3-cloud · **At:** 2026-06-18T11:53:34-05:00
**Tags:** ai-systems-lora, u-lora-galaxy-tag-rootcause, auto-distilled

## Subject
[MAIN-FORCE] [AI-SYSTEMS-LORA]/U-LORA-GALAXY-TAG-ROOTCAUSE (slot:india): wire galaxy-tag recovery into the assembler + respect the untagged-cross-cutting contract

## Body
```
[MAIN-FORCE] [AI-SYSTEMS-LORA]/U-LORA-GALAXY-TAG-ROOTCAUSE (slot:india): wire galaxy-tag recovery into the assembler + respect the untagged-cross-cutting contract

Root-cause + contract fix for U-LORA-GALAXY-TAG-RECOVER (761cd3b770). Two changes:

1. ROOT-CAUSE WIRING: assemble-fleet-lora-corpus.mjs (the corpus assembler) now imports deriveGalaxy
   and, in assembleCorpus, derives a galaxy-SPECIFIC tag for any row a producer emitted untagged
   (bridge-reasoning instruction names the galaxy; cad-* source; outcome-bus dispatcher). So per-galaxy
   attribution is now recovered AT ASSEMBLY (future regens stay tagged); the post-processor becomes an
   idempotent safety net. Canonical regen: 1469 rows, 741 galaxy-tagged (was 419), 34 galaxies, 0 fleet.

2. CONTRACT FIX (R7/R8): deriveGalaxy now returns null for genuinely CROSS-CUTTING doctrine
   (vault-feedback/wiki-canonical) instead of labeling it 'fleet'. The assembler has an established,
   TESTED contract that cross-cutting stays UNTAGGED -> the splitter's _unclassified track; forcing a
   'fleet' pseudo-galaxy broke that test (assembleCorpus 'cross-cutting carries NO galaxy'). Respect the
   established design: recover ONLY galaxy-specific tags, leave fleet-wide doctrine untagged.

Cleaned all stale 'fleet' comments (3 reviewer-flagged P2/P3). Tagger 7/7 + assembler 27/27 green;
2-of-2 per-file scrutiny PASS (code-analyzer + reviewer), 0 P0/P1. Corpus gitignored (regenerated).
```

## Files touched (4)
- scripts/assemble-fleet-lora-corpus.mjs    | 11 +++++++----
- scripts/tag-lora-corpus-galaxies.mjs      | 30 +++++++++++++++++-------------
- scripts/tag-lora-corpus-galaxies.test.mjs |  8 +++++---
- 3 files changed, 29 insertions(+), 20 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 72235f758ab4`
- Milestone envelope: `mcp-server/data/milestones/AI-SYSTEMS-LORA.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._