# Academy Galaxy — TOOLBELT.md (slot:lima tool-call efficiency)

> Memoized tool-call patterns for the academy domain. Each entry saves tokens or time vs. the naive alternative. Reach for these before re-deriving a regex or path.

## prism_* dispatcher actions used most (cheaper + structured vs Grep)
- `prism_knowledge:academy_courses` | list shipped courses | beats grepping CurriculumEngine for `id: "course-`
- `prism_knowledge:academy_course_detail {courseId}` | modules + prereqs + lessons | structured, no file read
- `prism_knowledge:learn_course_from_source {source}` | corpus → course | canonical builder, never freelance
- `prism_dev:mcdl_cite_sources {courseId}` | MIT-OCW attribution | preserves provenance through conversion
- `prism_dev:mcfi_query {topic}` | MIT-OCW course/algorithm lookup | OCW lives in prism_dev, not prism_ai
- `prism_session:master_index_query keyword=academy` | find any academy node | FIRST, before Grep/Glob (search-first)
- `prism_session:dispatcher_map_compact` | confirm action exists before building | the route-nudge target

## Grep patterns
- `'id: "course-'` | CurriculumEngine.ts | ~60 (slot/lima) | count WIRED courses (NOT catalog) — never hardcode
- `'import.*COURSE_.*_MODULES'` | CurriculumEngine.ts | per-wired-course | find what's actually imported
- `'prismDispatcherActions'` | data/academy/course-*.ts | per-course | citation-audit input (which actions a course claims)
- `'\\bcite|source:|per [A-Z]'` | data/academy/course-*.ts | citation density | spot uncited lessons
- `'kc1_1|kc11_mpa|taylor|1800|2100'` | data/academy/course-*.ts | should be 0 | catch inlined physics constants (R12)

## Glob patterns
- `mcp-server/src/data/academy/course-*.ts` | catalog | ~55 files | enumerate full catalog
- `mcp-server/src/engines/MITCourse*.ts` | MIT engines | 6 | OCW engine surface
- `mcp-server/src/engines/{Curriculum,CourseBuilder,Instructor,Lesson,InteractiveLearning}*.ts` | core | ~5 | core academy engines
- `web/src/components/learning/*.tsx` | web surface | ~8 | learner UI components

## Bash one-liners (RTK-wrapped — rtk prefix saves 60-90% on noisy stdout)
- `rtk node scripts/audit-academy-prereq-chain.mjs` | prereq integrity (6 classes) | run BEFORE reporting a course done
- `rtk node scripts/audit-course-dispatcher-citations.mjs` | citation coverage % | catches aspirational actions
- `rtk node scripts/scaffold-academy-course.mjs --num N --topic "<t>"` | 3-leg scaffold | replaces 4 manual edits
- `ls mcp-server/src/data/academy/course-*.ts | wc -l` | catalog count | live, no hardcode
- `grep -c 'id: "course-' mcp-server/src/engines/CurriculumEngine.ts` | wired count | the SHIPPED set
- `rtk node scripts/generate-courses-wiki.mjs --prism-root . --academy-dir mcp-server/src/data/academy --wiki-dir knowledge/wiki` | regen wiki frontmatter (worktree-safe overrides)

## Read offset+limit cheatsheet (CurriculumEngine is large — never full-read)
- `CurriculumEngine.ts` | offset 1 limit 120 | head: see RICH_MODULES + courseDefinitions wiring pattern, skip module bodies
- `web/src/data/academy.ts` | offset 1380 limit 80 | COURSE_BLUEPRINTS array start (~line 1395)
- `course-N-*.ts` | full | small per-course files; full-read is fine (modules + citations)

## git (RTK-wrapped; commit with explicit pathspec — slot-worktree safety)
- `rtk git -C H:/prism-slot-lima status` | what's dirty in slot/lima | 60% vs raw
- `rtk git -C H:/prism-slot-lima add mcp-server/src/engines/academy/ && rtk git -C H:/prism-slot-lima commit -- mcp-server/src/engines/academy/ -m "..."` | scoped commit | `-- <pathspec>` on commit too (per [[reference_git_commit_pathspec_2026_05_20]]) — prevents peer-file absorption

## Loop bookend (autonomous /loop)
- `rtk node H:/prism/.claude/helpers/loop-state.mjs {start,tick,end} --session <sid>` | resumable loop state across /compact

## Custom skills (lima)
- `/ship-course-lima <num> <topic>` | scaffold → wire → blueprint → both audits → 3-leg verify (the full course-ship workflow)
- `/galaxy-buildout-lima` | re-run this galaxy buildout brief
- `/smart-lima` | lima model-router

## Anti-patterns (token waste this slot keeps re-learning)
- Don't Grep the whole engines/ for "learning" — pulls india's ML engines. Filter to academy/course/curriculum/lesson/instructor.
- Don't full-read CurriculumEngine.ts — it's huge; head-read the wiring section.
- Don't trust a course count from a doc — run the ls/grep; counts rot + trees drift.
- Don't assume MIT-OCW corpus is on disk — it's harvest-on-demand (empty dir); use mcfi_/mcdl_/mit-courses-harvest.

<!-- OPERATIONAL-CONTEXT (auto-wired by scripts/wire-galaxies-to-operational-context.mjs -- regenerate, do not hand-edit) -->
## OPERATIONAL CONTEXT (PC specs / Ollama / loops / vault / LoRA-CAG-RAG -- auto-wired)
- **Hardware (size every build to it):** RTX PRO 6000 Blackwell 96GB VRAM, Ryzen 9 9950X3D 32T, ~127GB RAM. Canonical: `state/shared/specs/CANONICAL-HOST-FACTS-2026-06-09.md` (cite, do not restate -- it drifts otherwise).
- **Ollama utilization (offload here; reserve Claude for deep reasoning + safety):** code explain/review/lint -> `qwen2.5-coder:32b`; deep local reasoning -> `gpt-oss:120b` (65GB, fits resident on the 96GB card); trivial -> `qwen2.5-coder:1.5b`. Full roster + when-to-use each tier: [[prism-methodology-foundations]] section 1.
- **How to run loops:** [[agent-loop-design-rules]] (CLOSED-loop, eval-gate every iter, each pass feeds the next, BUDGET is a stop condition). **Obsidian vault (PSN brain):** [[feedback-obsidian-brain]] (recall before re-deriving; auto-fed every Stop). **Harnesses / LoRA / CAG / RAG:** [[prism-methodology-foundations]] (orchestrator/specialist/subagent split; arXiv-grounded).
- **Tool stack + on-disk versions (tool upgrades / features):** see this galaxy's PATHS.md / TOOLBELT.md for its tool + library stack.
- **This domain's knowledge layers (auto-invoked via wiki-precheck-inject when relevant):** [[academy-foundations]] / [[academy-source-atlas]] / [[academy-applied-practice]].
- **Resource roots (easy access):** this galaxy's PATHS.md + `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.json` (H:/PRISM/resources, JM DIE, Docustrata) (owner: lima).
<!-- /OPERATIONAL-CONTEXT -->
