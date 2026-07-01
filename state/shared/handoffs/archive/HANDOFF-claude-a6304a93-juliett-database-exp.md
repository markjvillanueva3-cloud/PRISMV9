---
session: claude-a6304a93
topic: juliett-database-expansion
slot: juliett
written_at: 2026-05-29T14:34:05.549Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-a6304a93
status: active
---

# HANDOFF: claude-a6304a93
Updated: 2026-05-29T14:34:05.549Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-a6304a93

## STATE
## juliett = database-expansion specialist (galaxy mcp-server/src/engines/database-expansion/)
Galaxy files: CLAUDE/MEMORY/PATHS/TOOLBELT + soul state/shared/slot-souls/juliett.md + 3 wiki + 7-tip tribal corpus + /db-audit-juliett skill.
Domain doctrine: atomicWriteJson on multi-writer paths; schema-probe-before-read; migration-with-bump; rotate-never-delete ledgers; read-back smoke test.
OPEN finding: ~16GB tmp-orphan leak (tribal-embed-index.json.<pid>.tmp x51 + now ollama-offload-stats.json.tmp x1) = atomicWriteJson tmp+rename leak. Fix=writer finally-unlink + age+dead-PID janitor sweep (NOT blind delete). See reference_juliett_tmp_orphan_leak_2026_05_29.
Deferred: tribal corpus consume/source_type (P2); STEP-9 regen skipped (regen-viz broken/sierra).

## RESUME
Galaxy buildout COMPLETE (U-PSGB-JULIETT, 13/13 gate green, commits c619d86447 + 83193b2c32). Soul realigned speed-feed->database-expansion. Next: normal database-expansion work — pick a unit (atomic-write hunt, schema-version/migration debt, or the ~16GB tmp-orphan leak fix). Run /db-audit-juliett for a domain sweep. MCP+Ollama were DOWN this session.

## CONTEXT

