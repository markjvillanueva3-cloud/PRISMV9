---
type: "chat-session"
source: "claude-code-cli"
session_id: "087e5978-f3ed-4657-820e-aed49ae8aa0d"
title: "You are rewriting the PRISM \"mit-curriculum\" galaxy CLAUDE.md to the LOCKED cano"
date: "2026-06-13"
first_ts: "2026-06-13T21:53:06.270Z"
last_ts: "2026-06-13T21:57:37.022Z"
cwd: "H:\\PRISM"
messages: 48
user_msgs: 21
assistant_msgs: 27
raw_file: "H:/.claude/projects/H--prism/087e5978-f3ed-4657-820e-aed49ae8aa0d/subagents/workflows/wf_d3067214-b5f/agent-a5eeee69c0a9fb800.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:04"
---

# You are rewriting the PRISM "mit-curriculum" galaxy CLAUDE.md to the LOCKED cano

> **claude-code-cli** | 2026-06-13 | 48 msgs (21 user / 27 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/087e5978-f3ed-4657-820e-aed49ae8aa0d/subagents/workflows/wf_d3067214-b5f/agent-a5eeee69c0a9fb800.jsonl`

## Transcript

### User | 2026-06-13T21:53:06.270Z

You are rewriting the PRISM "mit-curriculum" galaxy CLAUDE.md to the LOCKED canonical template. This is a REFACTOR of an existing good file, NOT a from-scratch rewrite -- preserve accurate domain content, restructure to the template, apply the assessment's KEEP/DROP/ADD.

READ ALL THREE (absolute paths):
1. The LOCKED template: H:/prism/state/shared/slot-claude-md-assessment/_TEMPLATE.md (the 14-section skeleton + section-by-section guidance + the universal-core set). The output MUST follow its section order + rules.
2. The Phase-A assessment for THIS galaxy: H:/prism/state/shared/slot-claude-md-assessment/mit-curriculum.md (its KEEP / DROP / ADD / IDEAL SECTION OUTLINE -- already done with verified-symbol discipline; this is your spec).
3. The CURRENT galaxy file: H:/prism/mcp-server/src/engines/mit-curriculum/CLAUDE.md (preserve its accurate KEEP content; drop what the assessment marks DROP).

HARD RULES (R12 / safety):
- VERIFIED SYMBOLS ONLY. Every engine / dispatcher action / file path / hook you name MUST be confirmed to exist -- Grep/Glob/Read it (e.g. Glob mcp-server/src/engines/mit-curriculum/*.ts; grep the dispatcher source for an action). If you cannot verify it, OMIT it or mark it "// UNVERIFIED". NEVER fabricate. The #1 failure across the 34 assessments was fabricated names -- do not add new ones.
- NEVER DROP the safety-bearing sections: §0 (header + universal-core pointer to H:/prism/CLAUDE.md), §4 (canonical constants + data paths / NEVER-inline rule), §5 (domain gotchas / safety rails), §6 (what NOT to do / domain refuses). These carry units/physics/safety numerics that have NO other home. They may be tightened but never removed.
- TOKEN-LEAN: target 80-160 lines (this replaces a 530-line monolith per slot). Collapse the 4 boilerplate blocks (cross-cutting methodology / AI-SYSTEMS-STATE / CRITIC-KEEPWORKING / verbatim india closed-loop prose) into the single §0 universal pointer + the 2-line §10 closed-loop callout, exactly as the template's §0 WHY 
... [+440 chars truncated]

### Assistant | 2026-06-13T21:53:13.604Z

I'll read all three source files in parallel before writing anything.

### Assistant | 2026-06-13T21:53:13.992Z

[tool_use: Read]

### Assistant | 2026-06-13T21:53:14.479Z

[tool_use: Read]

### Assistant | 2026-06-13T21:53:14.482Z

[tool_use: Read]

### User | 2026-06-13T21:53:30.214Z

[tool_result] 1	# MIT-Curriculum Galaxy — Domain-local CLAUDE.md (P1 Galactic Center, 2026-05-27 — populated 2026-06-09)
2	
3	> Auto-loads when editing under `engines/mit-curriculum/`. **Populated 2026-06-09** (domain-knowledge core grounded from PATHS/MEMORY/synthesis). Canonical slot: india (de-facto active per MIT-OCW extraction history). Adjacent to academy + knowledge-conversion galaxies.
4	
5	## 1. Domain
... [+8325 chars truncated]

### User | 2026-06-13T21:53:30.215Z

[tool_result] 1	## mit-curriculum — fleet-managed
2	
3	### Current state
4	
5	**Size:** 95 lines / ~4,400 bytes (CLAUDE.md as read 2026-06-13).
6	**Quality grade:** PARTIAL
7	
8	**Stale / inaccurate / fabricated content found:**
9	
10	1. **§2 Constants reference** cites `mcp-server/src/data/mit-courses-registry.ts` — this file does NOT exist on disk (confirmed by MEMORY.md §Key engines note: "does NOT exist on 
... [+13668 chars truncated]

### User | 2026-06-13T21:53:30.357Z

[tool_result] 1	# CANONICAL PER-SLOT GALAXY CLAUDE.md TEMPLATE
2	
3	> Synthesis lead output, 2026-06-13. Source: 34 domain-expert galaxy assessments in this directory
4	> (`state/shared/slot-claude-md-assessment/*.md`), every one read end-to-end.
5	> This file is the LOCKED skeleton every galaxy `mcp-server/src/engines/<galaxy>/CLAUDE.md` is rewritten to.
6	> Target per-galaxy size: **80–160 lines** (replaces t
... [+31609 chars truncated]

### Assistant | 2026-06-13T21:53:34.807Z

Now I need to verify the engine files and corpus paths before writing. Let me check what actually exists.

### Assistant | 2026-06-13T21:53:34.807Z

[tool_use: Glob]

### Assistant | 2026-06-13T21:53:34.808Z

[tool_use: Glob]

### Assistant | 2026-06-13T21:53:34.978Z

[tool_use: Glob]

### User | 2026-06-13T21:53:59.089Z

[tool_result] No files found

### User | 2026-06-13T21:53:59.156Z

[tool_result] No files found

### User | 2026-06-13T21:53:59.220Z

[tool_result] No files found

### Assistant | 2026-06-13T21:54:01.355Z

[tool_use: Glob]

### Assistant | 2026-06-13T21:54:01.742Z

[tool_use: Glob]

### Assistant | 2026-06-13T21:54:02.143Z

[tool_use: Glob]

### User | 2026-06-13T21:54:23.718Z

[tool_result] No files found

### User | 2026-06-13T21:54:23.741Z

[tool_result] No files found

### User | 2026-06-13T21:54:23.778Z

[tool_result] No files found

### Assistant | 2026-06-13T21:54:26.708Z

[tool_use: Glob]

### Assistant | 2026-06-13T21:54:26.851Z

[tool_use: Glob]

### User | 2026-06-13T21:54:44.738Z

[tool_result] No files found

### User | 2026-06-13T21:54:44.833Z

[tool_result] No files found

### Assistant | 2026-06-13T21:54:47.216Z

[tool_use: Bash]

### Assistant | 2026-06-13T21:54:48.061Z

[tool_use: Bash]

### User | 2026-06-13T21:54:59.006Z

[tool_result] __tests__
A2AProtocolEngine.ts
AbrasiveJetMachiningEngine.ts
AbsorptionChillerEngine.ts
AbstractionHierarchyEngine.ts
academy
AccessControlListEngine.ts
AccessibilityAnalysisEngine.ts
AccountingHardeningEngine.ts
AccumulatorEngine.ts
AcoSequencerEngine.ts
AcousticEmissionMonitoringEngine.ts
AcquisitionRecommendationEngine.ts
ActionableErrorTemplateEngine.ts
ActionSchemaCacheEngine.ts
ActionSequenc
... [+752 chars truncated]

### User | 2026-06-13T21:54:59.009Z

[tool_result] AWARENESS.md
CLAUDE.md
MEMORY.md
PATHS.md
SOUL.md
TOOLBELT.md

### Assistant | 2026-06-13T21:55:02.757Z

The engines are flat (not in subdirs). Let me search for MIT/Course/Curriculum engines in the flat structure.

### Assistant | 2026-06-13T21:55:04.375Z

[tool_use: Bash]

### Assistant | 2026-06-13T21:55:04.705Z

[tool_use: Bash]

### User | 2026-06-13T21:55:18.149Z

[tool_result] CourseBuilderEngine.ts
CurriculumEngine.ts
KnowledgeCurriculumBridgeEngine.ts
MITCourseDeepLearningEngine.ts
MITCourseExpansionEngine.ts
MITCourseFullIntegrationEngine.ts
MitCourseIndexEngine.ts
MITCourseIntegrationEngine.ts
MITCourseKnowledgeEngine.ts
MITCourseRegistryEngine.ts
mit-curriculum
MitOcwResourceResolverEngine.ts
MitsubishiMV1200RWireEDMMasterPostEngine.ts

### User | 2026-06-13T21:55:18.167Z

[tool_result] CADFunctionParameterEmitterEngine.ts
ConfidenceCommitEventBusEngine.ts
HyperMill5AxisTiltLimitHook.ts
LathePrintProgramEmitterEngine.ts
LatheProofCarryingEmitEngine.ts
LocalCommitMessageEngine.ts
MachineForceLimitValidationEngine.ts
MacroBulkEmitOrchestratorEngine.ts
MacroPerMachineEmitterEngine.ts
MITCourseDeepLearningEngine.ts
MITCourseExpansionEngine.ts
MITCourseFullIntegrationEngine.ts
MitCour
... [+400 chars truncated]

### Assistant | 2026-06-13T21:55:21.266Z

Good — 11 MIT-domain engines verified. Now check corpus paths and wiki entries.

### Assistant | 2026-06-13T21:55:22.569Z

[tool_use: Bash]

### Assistant | 2026-06-13T21:55:23.717Z

[tool_use: Bash]

### Assistant | 2026-06-13T21:55:24.587Z

[tool_use: Bash]

### User | 2026-06-13T21:55:28.929Z

[tool_result] 1.060-spring-2006.zip
10.34-fall-2015
10.34-fall-2015.zip
16.410-fall-2010.zip
16.852j-fall-2005.zip
16.885j-fall-2004.zip
2.003-spring-2005.zip
2.14-spring-2014.zip
2.43-spring-2024.zip
6.046j-spring-2015
6.837-fall-2012
9.40-spring-2018.zip
ALGORITHM_REGISTRY.json
esd.342-spring-2006.zip
MIT COURSES 2
MIT COURSES 3
MIT COURSES 4
MIT COURSES 5
MIT_COURSE_INDEX.json
PRISM_COURSE_CATALOG.json
sts.0
... [+27 chars truncated]

### User | 2026-06-13T21:55:32.002Z

[tool_result] (Bash completed with no output)

### User | 2026-06-13T21:55:35.405Z

[tool_result] college-course-autogen-specs.md
college-courses-psn-incorporation.md
course-forge-conversions.md
course-forge-stubs-emitter.md
courses
courses-index.md
curriculumengine.md
mit-curriculum-galaxy.md
peer-commit-auditor.md

### Assistant | 2026-06-13T21:55:39.312Z

All facts verified. Corpus root confirmed, extracted-knowledge dir is empty/missing (write target only), wiki entries confirmed. Now I have everything needed to write the draft.

### Assistant | 2026-06-13T21:55:40.369Z

[tool_use: Bash]

### User | 2026-06-13T21:55:48.416Z

[tool_result] academy.md
ai-training.md
business.md
cad.md
cam.md

### Assistant | 2026-06-13T21:55:50.370Z

Good. Now writing the draft.

### Assistant | 2026-06-13T21:57:00.861Z

[tool_use: Write]

### User | 2026-06-13T21:57:32.034Z

[tool_result] File created successfully at: H:/prism/state/shared/slot-claude-md-drafts/mit-curriculum.md (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-13T21:57:37.022Z

galaxy=mit-curriculum | lines=152 | grade-was=PARTIAL | key-changes=dropped 18 false-positive engines + fabricated dispatcher + wrong 7-algo attribution; added 11 verified engines, confirmed corpus paths, explicit NO-DISPATCHER rule, harvest-on-demand pipeline contract
