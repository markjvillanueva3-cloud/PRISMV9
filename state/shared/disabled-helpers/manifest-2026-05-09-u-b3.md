# Disabled Helpers Manifest — U-B3 (2026-05-09)

Archived from `.claude/helpers/` to here as `*.mjs.dormant` because:

- **No settings.json registration** in either C: or H: layer
- **No imports** by any hook, helper, or script (grep confirmed)
- **Overlap** with the canonical wired pipeline (`helpers/precompact-handoff.mjs` + the 4 PreCompact hooks: `claude-brief-precompact`, `compression-precompact`, `precompact-pending-guard`, plus the auto-trigger pair)

Each was a parallel experimental implementation from earlier compaction-discipline work (CPP-MS3-U-CPP23 / CPP-MS4-U-CPP32 era markers in source). The work was useful for design exploration; the canonical files won; these never replaced them. Dormant tracked code accumulating in `helpers/` confuses future readers about which is canonical.

## Files moved

| Original path | LOC | New path | Original purpose |
|---|---:|---|---|
| `.claude/helpers/pre-compact.mjs` | 317 | `state/shared/disabled-helpers/pre-compact.mjs.dormant` | per-instance survival paths (CPP-MS3) |
| `.claude/helpers/compact-restore.mjs` | 413 | `.../compact-restore.mjs.dormant` | post-compact restore w/ Zod schema validation (CPP-MS4) |
| `.claude/helpers/compaction-survival.mjs` | 456 | `.../compaction-survival.mjs.dormant` | per-terminal compaction survival (CPP-MS3) |
| `.claude/helpers/post-compact-enhanced.mjs` | 207 | `.../post-compact-enhanced.mjs.dormant` | post-compact handler |

Total LOC moved out of active helpers/: 1,393

## Canonical pipeline (unchanged)

PreCompact event fires these 4 hooks in order (settings.json):
1. `hooks/claude-brief-precompact.mjs` (85 LOC) — protect CLAUDE-BRIEF awareness
2. `helpers/precompact-handoff.mjs` (402 LOC) — write per-agent handoff (THE canonical writer)
3. `hooks/compression-precompact.mjs` (154 LOC) — tier-1 summaries via ContextCompressionEngine
4. `hooks/precompact-pending-guard.mjs` (67 LOC) — warn about pending work

Plus PreToolUse `precompact-auto-trigger.mjs --pre` and PostToolUse `--post` for auto-fire detection.

## Recovery

To restore any of these (e.g., to harvest specific code), `git mv` it back to `.claude/helpers/` and re-register in settings.json if needed.

## Provenance

- Spec: `state/shared/specs/2026-05-09-prism-stabilization-design.md` § B3
- Roadmap: `state/shared/specs/2026-05-09-prism-stabilization-roadmap.md` § U-B3
- Promoted in commit: `0411e45dc` (U-A2)
- Archived in commit: pending (U-B3-light)
