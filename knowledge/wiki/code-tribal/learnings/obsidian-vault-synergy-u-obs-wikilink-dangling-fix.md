# OBSIDIAN-VAULT-SYNERGY/U-OBS-WIKILINK-DANGLING-FIX — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-SYNERGY]/U-OBS-WIKILINK-DANGLING-FIX (slot:alpha): stop the extractWikilinks dangling-link factory (67% of broken vault links)

**Commit:** `128f54dc1040` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T05:24:49-05:00
**Tags:** obsidian-vault-synergy, u-obs-wikilink-dangling-fix, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-SYNERGY]/U-OBS-WIKILINK-DANGLING-FIX (slot:alpha): stop the extractWikilinks dangling-link factory (67% of broken vault links)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-SYNERGY]/U-OBS-WIKILINK-DANGLING-FIX (slot:alpha): stop the extractWikilinks dangling-link factory (67% of broken vault links)

Discovery queue item #3 (4-surface Workflow), premise verified live: the link
audit shows 23,571+ broken vault links, dominated by this one function.
obsidian-memory-sync.mjs:extractWikilinks emitted [[engines/X]]/[[dispatchers/
prism_X]]/[[skills/X]] UNCONDITIONALLY into vault namespaces that do not exist
(knowledge/engines + knowledge/dispatchers absent), re-written into every synced
memo's ## Related section on every Stop sync. The greedy skill regex /([a-z-]+)/g
was the worst — it matched every slash-word in file paths (state/shared->shared),
code (/null), and slash-commands (/goal) -> pure noise (skills/null, skills/prism,
skills/shared, ...).

Fix: existence-gate engine/dispatcher links (emit ONLY when knowledge/<ns>/<name>.md
exists -> self-heals if real namespaced notes are ever added; [[feedback_never_delete_only_disable]]),
and DROP the skill regex entirely. Verified knowledge/skills/ holds 41 course/
academy notes, NOT slash-command targets (dedup/goal/loop/handoff all absent) -
so the skill branch had no valid namespace and gating it would risk wrong-linking
a /data-structures mention to a course note. Allowlisting against the live skill
manifest is a possible future re-add (noted in the code).

Validated: 27/27 (6 new R9 wikilinks tests incl existence-gate + greedy-regex-gone
oracle + 21 existing galaxy-mirror/resilience regression). LIVE: a realistic memo
body that the old fn turned into ~7 dangling links now yields [] (0 skills/*,
engines/dispatchers correctly gated out). Dependency root for the deferred
knowledge-link-audit --fix remediation pass (re-broken every tick until this lands).
```

## Files touched (3)
- scripts/obsidian-memory-sync.mjs                | 29 ++++++++++++++++-------------
- scripts/obsidian-memory-sync.wikilinks.test.mjs | 77 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 93 insertions(+), 13 deletions(-)

## Lessons surfaced in commit body
- wrong-linking
- til this lands).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 128f54dc1040`
- Milestone envelope: `mcp-server/data/milestones/OBSIDIAN-VAULT-SYNERGY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._