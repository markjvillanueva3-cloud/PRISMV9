---
name: reference_post_ship_obsidian-vault-synergy-u-obs-link-audit-phantom-filter
description: Auto-distilled learnings from shipping OBSIDIAN-VAULT-SYNERGY/U-OBS-LINK-AUDIT-PHANTOM-FILTER (commit 134895d84). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.597Z
aliases: reference_post_ship_obsidian-vault-synergy-u-obs-link-audit-phantom-filter
---


# OBSIDIAN-VAULT-SYNERGY/U-OBS-LINK-AUDIT-PHANTOM-FILTER

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-SYNERGY]/U-OBS-LINK-AUDIT-PHANTOM-FILTER (slot:alpha): filter phantom non-wikilink targets from knowledge-link-audit (R4-C1, 3rd verified survivor from ultracode discovery w3qho9bc3). extractLinks captured any [[...]] incl path/glob fragments ([[src/foo.ts]], [[scripts/*.mjs]]) which normalizeName last-segmented into phantom keys counted as BROKEN. Added pure isPhantomLinkTarget (glob char OR repo-path first-segment + slash) skipped before the tally with a transparent linksSkippedPhantom stat. Requires slash+repo-prefix so intentional [[galaxy/mill]] recall links are PRESERVED. LIVE: 1448 phantoms removed, broken 9334->7886 (-15.5% false positives), 0 leaked into broken, galaxy/* preserved. 14/14 tests (+4 R9: glob/prefix/no-over-filter/audit-skip). Cleaner signal to the system-viz roost + inject hook + broken-link stub generator.

**Shipped:** 2026-06-09T08:43:20-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[obsidian-vault-synergy-u-obs-link-audit-phantom-filter]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._