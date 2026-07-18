---
name: reference_galaxy_canonical_kit_2026_05_29
description: The canonical per-slot galaxy kit (nodes/memories/skills/scripts/hooks/docs every galaxy should have) + the gaps real galaxies share + the recommended enforcement generator
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.584Z
aliases: reference_galaxy_canonical_kit_2026_05_29
---


2026-05-29 (slot:bravo, workflow wvyt0yg9x, 13 galaxies inventoried on-disk vs the buildout protocol). Full spec: `state/shared/specs/GALAXY-CANONICAL-KIT-2026-05-29.md`.

**The kit (by category):**
- **Doc files** (`engines/<g>/`): CLAUDE.md, MEMORY.md, PATHS.md, TOOLBELT.md [all U, 13/13]; GSD.md [prescribed by the hook probe but absent from ALL 13 — orphan].
- **Nodes:** slot-soul `slot-souls/<slot>.md`; SLOT_GALAXY_MAP entry; CLAUDE.md `## Related galaxies` + `## Closed-loop integration with india`; L5 `eng.<domain>` graph node; 8-pillar roost JSON (4/13 missing); flat-engine layout (docs-only galaxy dir).
- **Memories:** MEMORY.md `## Master-brain link`+stamp (CONN-1/2); master `[galaxy:<g>]` row (CONN-4); ≥10 pushed `<type>_<slot>_*.md` (CONN-3); sections High-ROI/Indexed/Known-failure-modes/Cross-galaxy-bridges/Initial-state; ≥3 wiki; ≥5 tribal; the 4 shared specs.
- **Skills:** checkin/precompact/handoff/startup-<slot> [all 26]; galaxy-buildout-/smart-<slot> [25/26]; galaxy-verify-<slot> [only 2, no generator]; ≥1 custom domain skill.
- **Scripts:** generate-per-slot-{wrappers,skill-wrappers,galaxy-buildout-files}.mjs; generate-galaxy-{features,constituents}.mjs; memory-search.mjs; `<domain>-awareness-snapshot.mjs` [only alpha+oscar].
- **Hooks:** slot-context-bundle-inject, [[reference_slot_bind_enforce_2026_05_18|slot-bind-enforce]], slot-soul-inject, stop-obsidian-memory-feed, [[reference_tribal_by_domain_inject|tribal-by-domain-inject]] [all U]; outcome-bus-auto-tap, zulu-advisory-inject [C]; custom per-domain hook [conditional].

**Verdict:** the kit is structurally present in all 13 galaxies (files exist) but DEEPLY under-populated — High-ROI/Indexed/Known-failure-modes/Initial-state/Cross-galaxy-bridges sections are substantive ONLY in post-processor (partly token-optimization); business/quoting/lathe MEMORY.md are self-declared stubs; wiki <3 in 7/13. File-existence gates pass while content is empty.

**Top structural fragility:** SLOT_GALAXY_MAP is triplicated across `slot-context-bundle-inject.mjs` + `generate-per-slot-galaxy-buildout-files.mjs` + `generate-per-slot-skill-wrappers.mjs` with NO shared import → caused the yankee gap (no brief, no smart-/galaxy-buildout- skill). **Recommended fix:** extract to `scripts/lib/slot-galaxy-map.mjs` (single source) + build `generate-per-slot-galaxy-verify.mjs` emitting `/galaxy-verify-<slot>` with content-level checks + advisory Stop hook. Related: [[reference_bravo_master_brain_template_clone]], [[reference_bravo_galaxy_buildout_2026_05_28]].
