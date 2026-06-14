---
name: reference_obsidian_wikilink_dangling_fix_2026_06_09
description: "Fixed obsidian-memory-sync.mjs extractWikilinks — the dangling-link factory generating ~15,819 broken vault links (67% of 23,658) into non-existent namespaces on every Stop sync. Existence-gated engine/dispatcher links + dropped the greedy /([a-z-]+)/g skill regex. 3-of-3 scrutiny PASS. Discovery queue item #3."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.234Z
aliases: reference_obsidian_wikilink_dangling_fix_2026_06_09
---


# extractWikilinks dangling-link factory fix (2026-06-09, slot:alpha)

Commit `d579626848` ([OBSIDIAN-VAULT-SYNERGY]/U-OBS-WIKILINK-DANGLING-FIX). Item #3
of the 4-surface discovery queue ([[reference_obsidian_multisurface_discovery_2026_06_09]]).

## The bug (vault-value / fully-wired clause)
`scripts/obsidian-memory-sync.mjs:extractWikilinks` (the LIVE C:->H: feed converter,
runs every Stop sync via `convertToObsidian`) emitted three link types
UNCONDITIONALLY into vault namespaces that don't exist:
- `[[engines/X]]` — `knowledge/engines/` ABSENT
- `[[dispatchers/prism_X]]` — `knowledge/dispatchers/` ABSENT
- `[[skills/X]]` via greedy `/([a-z-]+)/g` — matched EVERY slash-word in file paths
  (`state/shared`→shared), code (`/null`), slash-commands (`/goal`) → pure noise
`knowledge-link-audit --json`: **23,571+ broken links, ~15,819 (67%) from this one fn**,
re-written into every memo's `## Related` block on every sync.

## The fix
Existence-gate engine/dispatcher links (emit ONLY when `knowledge/<ns>/<name>.md`
exists → self-heals if real namespaced notes are ever added; [[feedback_never_delete_only_disable]]),
and DROP the skill regex. Verified `knowledge/skills/` holds 41 COURSE/academy notes
(`data-structures.md`, `coding-patterns.md`…), NOT slash-command targets (dedup/goal/
loop/handoff all absent) — so the skill branch had no valid namespace AND existence-
gating it would risk wrong-linking a `/data-structures` mention to a course note.
**Drop, don't gate** was the correct call (R13 — verified recoverability before removing).
Made the fn injectable (`vaultRoot`, `noteExists`) + exported for tests.

## Validation
27/27 tests (7 new R9 wikilinks incl mutation-proven oracles — revert-gate + greedy-
readd each fail a test — + a default-closure test against a real tmp vault [closed the
reviewers' unanimous P2] + 21 existing galaxy-mirror/resilience regression). LIVE: a
realistic memo body that the old fn turned into ~7 dangling links now yields `[]`
(0 skills/*, engines/dispatchers gated out). **3-of-3 scrutiny PASS** (no P0/P1; the
one P2 closed in-session). Second-order verified: `h-to-c-obsidian-mirror.mjs:63`
strips `## Related` anyway, so empty-Related is strictly better than dangling-Related.

## Scoping (honest, R12)
This STOPS new dangling-link generation (the dependency root, R13) but does NOT
remediate the ~15,819 EXISTING broken links — that's a separate `knowledge-link-audit
--fix` pass, correctly DEFERRED (pointless to run while the generator re-creates them
every sync). Next queue: #4 wiki-recall-counts RMW race, #5 finish ~8 live memory-path
hooks through `resolveObsidianMemDir()`. Pairs with this fire's session:
[[reference_obsidian_recall_node_exclude_2026_06_09]], [[reference_obsidian_memdir_homedir_fix_2026_06_09]].
