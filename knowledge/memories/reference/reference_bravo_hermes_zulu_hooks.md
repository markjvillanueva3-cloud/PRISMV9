---
name: reference_bravo_hermes_zulu_hooks
description: The hermes-zulu galaxy's hooks + their events (.claude/hooks/)
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.486Z
aliases: reference_bravo_hermes_zulu_hooks
---


Verified 2026-05-28 (`H:/prism/.claude/hooks/`):

- `slot-context-bundle-inject.mjs` — UserPromptSubmit: SLOT_GALAXY_MAP + galaxy/soul/bridge inject (ZULU-OMNISCIENT-MS0). `SLOT_GALAXY_MAP` already maps `bravo: 'hermes-zulu'`.
- `slot-soul-inject.mjs` — UserPromptSubmit: per-prompt soul personality (U-HERMES02). Parses `state/shared/slot-souls/<slot>.md` frontmatter.
- `zulu-advisory-inject.mjs` — UserPromptSubmit: zulu cross-slot advisory.
- `stop-slot-task-claims-advisory.mjs` — Stop: surfaces held slot-task claims.
- `stop-wiki-stub-stager.mjs` — Stop: stages wiki stubs for bug findings.
- `lib/enforce-stub-detector.py` — shared lib: stub-pattern detector.

Hooks for this domain are ADDITIVE only — never disable a fleet-wide hook.
