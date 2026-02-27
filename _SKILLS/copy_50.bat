@echo off
set SRC=C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\_SKILLS\UPLOAD_ALL
set DST=C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\_SKILLS\UPLOAD_50

REM Core Workflow (8)
copy "%SRC%\prism-sp-brainstorm_SKILL.md" "%DST%\"
copy "%SRC%\prism-sp-planning_SKILL.md" "%DST%\"
copy "%SRC%\prism-sp-execution_SKILL.md" "%DST%\"
copy "%SRC%\prism-sp-debugging_SKILL.md" "%DST%\"
copy "%SRC%\prism-sp-review-spec_SKILL.md" "%DST%\"
copy "%SRC%\prism-sp-review-quality_SKILL.md" "%DST%\"
copy "%SRC%\prism-sp-verification_SKILL.md" "%DST%\"
copy "%SRC%\prism-sp-handoff_SKILL.md" "%DST%\"

REM Cognitive (7)
copy "%SRC%\prism-cognitive-core_SKILL.md" "%DST%\"
copy "%SRC%\prism-reasoning-engine_SKILL.md" "%DST%\"
copy "%SRC%\prism-safety-framework_SKILL.md" "%DST%\"
copy "%SRC%\prism-code-perfection_SKILL.md" "%DST%\"
copy "%SRC%\prism-process-optimizer_SKILL.md" "%DST%\"
copy "%SRC%\prism-master-equation_SKILL.md" "%DST%\"
copy "%SRC%\prism-universal-formulas_SKILL.md" "%DST%\"

REM Session (5)
copy "%SRC%\prism-session-master_SKILL.md" "%DST%\"
copy "%SRC%\prism-session-buffer_SKILL.md" "%DST%\"
copy "%SRC%\prism-state-manager_SKILL.md" "%DST%\"
copy "%SRC%\prism-quick-start_SKILL.md" "%DST%\"
copy "%SRC%\prism-task-continuity_SKILL.md" "%DST%\"

REM Masters (7)
copy "%SRC%\prism-quality-master_SKILL.md" "%DST%\"
copy "%SRC%\prism-code-master_SKILL.md" "%DST%\"
copy "%SRC%\prism-expert-master_SKILL.md" "%DST%\"
copy "%SRC%\prism-knowledge-master_SKILL.md" "%DST%\"
copy "%SRC%\prism-ai-ml-master_SKILL.md" "%DST%\"
copy "%SRC%\prism-dev-utilities_SKILL.md" "%DST%\"
copy "%SRC%\prism-skill-orchestrator_v6_SKILL.md" "%DST%\"

REM Materials (5)
copy "%SRC%\prism-material-schema_SKILL.md" "%DST%\"
copy "%SRC%\prism-material-physics_SKILL.md" "%DST%\"
copy "%SRC%\prism-material-lookup_SKILL.md" "%DST%\"
copy "%SRC%\prism-material-enhancer_SKILL.md" "%DST%\"
copy "%SRC%\prism-material-validator_SKILL.md" "%DST%\"

REM Monolith (4)
copy "%SRC%\prism-monolith-index_SKILL.md" "%DST%\"
copy "%SRC%\prism-monolith-navigator_SKILL.md" "%DST%\"
copy "%SRC%\prism-monolith-extractor_SKILL.md" "%DST%\"
copy "%SRC%\prism-extraction-orchestrator_SKILL.md" "%DST%\"

REM Controllers (4)
copy "%SRC%\prism-fanuc-programming_SKILL.md" "%DST%\"
copy "%SRC%\prism-siemens-programming_SKILL.md" "%DST%\"
copy "%SRC%\prism-heidenhain-programming_SKILL.md" "%DST%\"
copy "%SRC%\prism-gcode-reference_SKILL.md" "%DST%\"

REM Reference (5)
copy "%SRC%\prism-api-contracts_SKILL.md" "%DST%\"
copy "%SRC%\prism-error-catalog_SKILL.md" "%DST%\"
copy "%SRC%\prism-manufacturing-tables_SKILL.md" "%DST%\"
copy "%SRC%\prism-algorithm-selector_SKILL.md" "%DST%\"
copy "%SRC%\prism-coding-patterns_SKILL.md" "%DST%\"

REM Other critical (5)
copy "%SRC%\prism-all-skills_SKILL.md" "%DST%\"
copy "%SRC%\prism-validator_SKILL.md" "%DST%\"
copy "%SRC%\prism-tdd_SKILL.md" "%DST%\"
copy "%SRC%\prism-debugging_SKILL.md" "%DST%\"
copy "%SRC%\prism-error-recovery_SKILL.md" "%DST%\"

echo.
echo Done! Copied 50 priority skills.
