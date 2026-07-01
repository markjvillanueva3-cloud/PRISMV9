# INFRA-DEVTOOLS/U-COLD-ARCHIVE-CORE-PY — [MAIN] [INFRA-DEVTOOLS]/U-COLD-ARCHIVE-CORE-PY: archive 15 legacy Python orchestrators/MCP shims from scripts/core/

**Commit:** `cbc9825a5c7d` · **By:** markjvillanueva3-cloud · **At:** 2026-05-18T14:30:31-05:00
**Tags:** infra-devtools, u-cold-archive-core-py, auto-distilled

## Subject
[MAIN] [INFRA-DEVTOOLS]/U-COLD-ARCHIVE-CORE-PY: archive 15 legacy Python orchestrators/MCP shims from scripts/core/

## Body
```
[MAIN] [INFRA-DEVTOOLS]/U-COLD-ARCHIVE-CORE-PY: archive 15 legacy Python orchestrators/MCP shims from scripts/core/

Cold-script-rank flagged 62 files in scripts/core/ as cold; this batch
archives the 15 most obviously-legacy ones (versioned dups + Python MCP
shims that the TypeScript mcp-server/src/* replaced).

Files:
  Orchestrators:     master_orchestrator.py, master_orchestrator_v2.py
  Python MCP shims:  formula_mcp.py, handoff_mcp.py, resume_mcp.py,
                     batch_mcp.py, error_mcp.py, agent_mcp_proxy.py
  Versioned dups:    skill_generator_v2.py, skill_loader.py,
                     skill_preloader.py
  State (Python):    state_server.py, state_rollback.py, state_version.py
  Workflow:          workflow_tracker.py

These were superseded by mcp-server/src/index.ts (canonical MCP server) +
the TypeScript engine layer. Verified all carry the docstring 'MCP Tools'
or 'PRISM v1/v2' marker indicating legacy Python era pre-TS-MCP migration.

Reversible per feedback_never_delete_only_disable. 47 more cold files
remain in scripts/core/ (mostly utilities) — those need per-file judgment
and are deferred to a future batch.

PIVOT-3 progress: 59/498 (11.8%). Cumulative this session: 59 archived.
```

## Files touched (76)
- scripts/_archive/core/agent_mcp_proxy.py        | 1000 +++++++++++++++
- scripts/_archive/core/batch_mcp.py              |  385 ++++++
- scripts/_archive/core/error_mcp.py              |  348 ++++++
- scripts/_archive/core/formula_mcp.py            |  422 +++++++
- scripts/_archive/core/handoff_mcp.py            |  358 ++++++
- scripts/_archive/core/master_orchestrator.py    |  525 ++++++++
- scripts/_archive/core/master_orchestrator_v2.py |  640 ++++++++++
- scripts/_archive/core/resume_mcp.py             |  432 +++++++
- scripts/_archive/core/skill_generator_v2.py     |  519 ++++++++
- scripts/_archive/core/skill_loader.py           |  487 ++++++++
_(+66 more)_

## Lessons surfaced in commit body
- tilities) — those need per-file judgment

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show cbc9825a5c7d`
- Milestone envelope: `mcp-server/data/milestones/INFRA-DEVTOOLS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._