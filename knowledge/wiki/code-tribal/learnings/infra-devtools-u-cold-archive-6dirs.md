# INFRA-DEVTOOLS/U-COLD-ARCHIVE-6DIRS — [MAIN] [INFRA-DEVTOOLS]/U-COLD-ARCHIVE-6DIRS: archive 27 cold scripts across 6 subdirs (~80-120d old)

**Commit:** `5b10fd9bb371` · **By:** markjvillanueva3-cloud · **At:** 2026-05-18T14:27:58-05:00
**Tags:** infra-devtools, u-cold-archive-6dirs, auto-distilled

## Subject
[MAIN] [INFRA-DEVTOOLS]/U-COLD-ARCHIVE-6DIRS: archive 27 cold scripts across 6 subdirs (~80-120d old)

## Body
```
[MAIN] [INFRA-DEVTOOLS]/U-COLD-ARCHIVE-6DIRS: archive 27 cold scripts across 6 subdirs (~80-120d old)

Cold-script-rank classified 27 .py files across testing/, state/, batch/,
automation/, extraction/, hypermill/ as cold (no strong refs, no self-test).
Moved to scripts/_archive/<subdir>/ per cold-script-rank.mjs:30 convention.

Per-dir breakdown:
  testing/    : 9 files (generate_improvements, fix_utilization_gaps/v2, utilizability_suite_v4, utilization_suite_v3, regression_tests, maximize_utilization, ralph_loop_tester, diag_combination_engine)
  state/      : 4 files (state_manager, checkpoint_system, session_logger, progress_tracker)
  batch/      : 3 files (enhance_127_params_swarm, jc_enhancement_swarm, jc_enhancement_swarm_v2)
  automation/ : 4 files (template_generator, git_manager, script_cleanup, auto_context)
  extraction/ : 3 files (extraction_auditor, monolith_indexer, module_extractor)
  hypermill/  : 4 files (version_check, tool_export_sql, project_template, setup_job)

All __init__.py package markers left in place. Reversible per
feedback_never_delete_only_disable via 'git mv scripts/_archive/<dir>/<file>
scripts/<dir>/'.

PIVOT-3 progress: 44/498 (8.8%). Cumulative this session: 44 archived (audit:10
+ validation:7 + 6dirs:27).
```

## Files touched (45)
- scripts/_archive/automation/auto_context.py        |   192 +
- scripts/_archive/automation/git_manager.py         |   411 +
- scripts/_archive/automation/script_cleanup.py      |   322 +
- scripts/_archive/automation/template_generator.py  |   598 +
- scripts/_archive/batch/enhance_127_params_swarm.py |   654 +
- scripts/_archive/batch/jc_enhancement_swarm.py     |   404 +
- scripts/_archive/batch/jc_enhancement_swarm_v2.py  |   293 +
- scripts/_archive/extraction/extraction_auditor.py  |   498 +
- scripts/_archive/extraction/module_extractor.py    |   351 +
- scripts/_archive/extraction/monolith_indexer.py    |   398 +
_(+35 more)_

## Lessons surfaced in commit body
- tilization_gaps/v2, utilizability_suite_v4, utilization_suite_v3, regression_tests, maximize_utilization, ralph_loop_tester, diag_combination_engine)

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 5b10fd9bb371`
- Milestone envelope: `mcp-server/data/milestones/INFRA-DEVTOOLS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._