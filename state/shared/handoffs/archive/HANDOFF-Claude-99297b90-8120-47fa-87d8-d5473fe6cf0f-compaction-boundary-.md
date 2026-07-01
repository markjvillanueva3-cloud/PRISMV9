---
session: Claude-99297b90-8120-47fa-87d8-d5473fe6cf0f
topic: compaction-boundary-fix
written_at: 2026-06-11T05:05:59.841Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: 99297b90-8120-47fa-87d8-d5473fe6cf0f
status: active
---

# HANDOFF: Claude-99297b90-8120-47fa-87d8-d5473fe6cf0f
Updated: 2026-06-11T05:05:59.841Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: 99297b90-8120-47fa-87d8-d5473fe6cf0f

## STATE
Compaction fix across 5 byte-estimators + drift guard. 3-of-3 PASS; 48/48+16/16+39/39+49/49. --post wiring de-duped in user settings. Drift guard catches the next format change in CI.

## RESUME
Compaction-boundary fix SHIPPED (U-CBF01 0a966b5696 + U-CBF02 drift-guard 0dda52f7de). Root cause: Claude Code changed its transcript compact marker isCompactSummary->compact_boundary, breaking every byte ctx estimator -> constant /compact loop (alpha worst-hit). Fix live + protects this session (verified: precompact verdict=continue, no block). NEXT alpha-thread: OLLAMA-VERIFIED-OFFLOAD next consumer (#6 search-rerank 61a6288d0e, #9 files-digest b79ef2bb01 shipped); P2 followups: recover-today-context.mjs legacy-marker (low pri, not block-path, summaries still co-exist), stale header comment precompact-auto-trigger.mjs:4 (160K->880K/940K). Wiki [[compact-boundary-format-change-constant-compaction]]; memory reference_compact_boundary_format_fix_2026_06_10.

## CONTEXT

