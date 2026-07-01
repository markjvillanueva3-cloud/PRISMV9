# INFRA-DEVTOOLS/U-COLD-ARCHIVE-VALIDATION — [MAIN] [INFRA-DEVTOOLS]/U-COLD-ARCHIVE-VALIDATION: archive 7 cold scripts/validation/* (115+d old)

**Commit:** `ac8ebbd099a4` · **By:** markjvillanueva3-cloud · **At:** 2026-05-18T14:22:54-05:00
**Tags:** infra-devtools, u-cold-archive-validation, auto-distilled

## Subject
[MAIN] [INFRA-DEVTOOLS]/U-COLD-ARCHIVE-VALIDATION: archive 7 cold scripts/validation/* (115+d old)

## Body
```
[MAIN] [INFRA-DEVTOOLS]/U-COLD-ARCHIVE-VALIDATION: archive 7 cold scripts/validation/* (115+d old)

Cold-script-rank classified all 7 .py files in scripts/validation/ as cold
(no strong refs, no self-test). Moved to scripts/_archive/validation/ per
the cold-script-rank.mjs:30 convention. Verified zero live callers via Grep
across .claude/ + mcp-server/src/ + scripts/ before the move.

Files: batch_validator.py, data_validator.py, integrate_validation.py,
material_schema.py, material_validator.py, physics_consistency.py,
prism_validator.py.

__init__.py left in place (package marker). Reversible via 'git mv' from
_archive/ per feedback_never_delete_only_disable.

PIVOT-3 progress: 17/498 (3.4%). Cumulative this session: 17 archived.
```

## Files touched (9)
- scripts/_archive/validation/batch_validator.py     |  623 ++++++++
- scripts/_archive/validation/data_validator.py      |  908 ++++++++++++
- .../_archive/validation/integrate_validation.py    |  326 ++++
- scripts/_archive/validation/material_schema.py     | 1561 ++++++++++++++++++++
- scripts/_archive/validation/material_validator.py  |  550 +++++++
- scripts/_archive/validation/physics_consistency.py |  604 ++++++++
- scripts/_archive/validation/prism_validator.py     |  758 ++++++++++
- scripts/validation/__init__.py                     |   53 +
- 8 files changed, 5383 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ac8ebbd099a4`
- Milestone envelope: `mcp-server/data/milestones/INFRA-DEVTOOLS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._