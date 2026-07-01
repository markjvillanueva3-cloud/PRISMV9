---
type: "chat-session"
source: "claude-code-cli"
session_id: "8bbacd55-9fad-41a3-8bfb-5479837d2bca"
title: "You are reviewer B of three independent Claude PRISM reviewers — weighted toward"
date: "2026-05-29"
first_ts: "2026-05-29T03:08:08.021Z"
last_ts: "2026-05-29T03:17:21.510Z"
cwd: "H:\\prism-slot-lima"
messages: 67
user_msgs: 25
assistant_msgs: 42
raw_file: "H:/.claude/projects/H--prism-slot-lima/8bbacd55-9fad-41a3-8bfb-5479837d2bca/subagents/agent-aee6033c07392d342.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:00"
---

# You are reviewer B of three independent Claude PRISM reviewers — weighted toward

> **claude-code-cli** | 2026-05-29 | 67 msgs (25 user / 42 assistant) | cwd: H:\prism-slot-lima
> Raw: `H:/.claude/projects/H--prism-slot-lima/8bbacd55-9fad-41a3-8bfb-5479837d2bca/subagents/agent-aee6033c07392d342.jsonl`

## Transcript

### User | 2026-05-29T03:08:08.021Z

You are reviewer B of three independent Claude PRISM reviewers — weighted toward what reviewer A is unlikely to catch: inlined-constant detection, wiring/discoverability completeness, hook integration correctness, and self-consistency of the docs' own claims. Do NOT assume A caught anything. Review git commit b75427b138 in H:/prism-slot-lima (`git -C H:/prism-slot-lima show b75427b138`). It is slot:lima's academy galaxy buildout (4 galaxy MD files + soul + 2 wiki + 1 advisory hook).

Check specifically:
1. Inlined physics constants: grep the diff for kc1.1/Taylor/material numeric values presented as authoritative. The docs SHOULD direct readers to src/physics/constants.ts. (Listing the canonical P=1800/M=2100/K=1100/N=700/S=2800/H=3200 set inside an explicit "constants live in constants.ts ONLY" reminder is correct doctrine, not a violation. Flag only if a doc teaches a constant value as its OWN source.)
2. Hook wiring: lima-course-ship-guard.mjs is an additive PostToolUse advisory. Verify it does NOT wire itself into settings.json (settings.json must be untouched in this commit — confirm it's not in the 8 files). Verify the hook's matcher logic only fires on academy course-data writes and is fail-soft.
3. Discoverability claims: the docs claim the galaxy is wired via SLOT_GALAXY_MAP.lima=academy + master-index back-pointer. The commit need NOT contain slot-context-bundle-inject.mjs (it's upstream). Flag if the docs OVERCLAIM something not true.
4. Do the docs' cross-references ([[links]], dispatcher action names like mcfi_/mcdl_, engine names) appear internally consistent and plausible?
5. Any doc claiming a count as hard fact that will rot?

First line MUST be 'VERDICT: PASS' or 'VERDICT: FAIL'. Then BLOCKER: lines, then ≤5 notes. If unsure, FAIL.

### Assistant | 2026-05-29T03:08:19.706Z

I'll review commit b75427b138 in the slot:lima worktree.

### Assistant | 2026-05-29T03:08:20.440Z

[tool_use: Bash]

### User | 2026-05-29T03:08:25.049Z

[tool_result] commit b75427b13805dc02b986ee922d7a2bb69a2142e8
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Thu May 28 22:04:46 2026 -0500

    [lima] [PER-SLOT-GALAXY-BUILDOUT]/U-PSGB-LIMA: academy galaxy — soul + 4 galaxy files + 11 memories + 3 wiki + 7 tribal + advisory hook + PSN edges (12/13 gate; FAIL6 SLOT_GALAXY_MAP satisfied upstream line73)

 .claude/hooks/lima-course-ship-guard
... [+590 chars truncated]

### Assistant | 2026-05-29T03:08:29.646Z

Now let me read the full diff of each file, broken into scoped views.

### Assistant | 2026-05-29T03:08:31.434Z

[tool_use: Bash]

### User | 2026-05-29T03:08:37.129Z

[tool_result] Exit code 127
rtk: Failed to resolve 'read' via PATH, falling back to direct exec: Binary 'read' not found on PATH
[rtk: program not found]

### Assistant | 2026-05-29T03:08:41.021Z

I'll read the files directly with the Read tool instead.

### Assistant | 2026-05-29T03:08:41.895Z

[tool_use: Read]

### Assistant | 2026-05-29T03:08:41.977Z

[tool_use: Read]

### User | 2026-05-29T03:08:43.766Z

[tool_result] 1	---
2	slot: lima
3	role: prism-academy-specialist
4	voice: pedagogical-clear
5	tone: patient
6	galaxy: academy
7	escalation_path: validate-citation-before-promote; defer-physics-to-bravo; mit-ocw-attribution-preserved
8	preferred_subagent_type: reviewer
9	domain_filter: academy|learning|course|lesson|certification|tutorial|education|curriculum|mit-ocw|instructor|module
10	hermes_role: specialist
... [+3278 chars truncated]

### User | 2026-05-29T03:08:44.300Z

[tool_result] read-once-guard: 'H:\prism-slot-lima\.claude\hooks\lima-course-ship-guard.mjs' was already read 0s ago in this session and is unchanged (mtime 1780023537937). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_C
... [+7 chars truncated]

### Assistant | 2026-05-29T03:08:49.047Z

The hook was already read into context. Let me get its content from the diff and read the remaining files.

### Assistant | 2026-05-29T03:08:49.707Z

[tool_use: Bash]

### User | 2026-05-29T03:08:56.818Z

[tool_result] #!/usr/bin/env node
// tier: T3
// lima-course-ship-guard.mjs — additive advisory (slot:lima / academy galaxy)
//
// Karpathy 5-step: CLASSIFY (PostToolUse on academy course-data write) →
// TECHNIQUE (path-match + stdin parse) → EDGE CASES (no stdin / bad JSON / no
// path / non-course path) → FAILURE MODES (never throw, always exit 0, never
// block) → emit the 3-leg ship-contract reminder so a 
... [+2684 chars truncated]

### Assistant | 2026-05-29T03:09:00.930Z

Now let me read the 4 galaxy files and the 2 wiki files.

### Assistant | 2026-05-29T03:09:01.836Z

[tool_use: Read]

### Assistant | 2026-05-29T03:09:02.325Z

[tool_use: Read]

### Assistant | 2026-05-29T03:09:02.812Z

[tool_use: Read]

### Assistant | 2026-05-29T03:09:03.272Z

[tool_use: Read]

### User | 2026-05-29T03:09:03.974Z

[tool_result] 1	# Academy Galaxy MEMORY.md — slot:lima per-domain working brain
2	
3	## Master-brain link
4	- **UP (pull from master):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md`
5	  — recall: `prism_memory:semantic_search query="academy course curriculum mit-ocw lesson" topK=20`
6	- **DOWN (push to master):** write `<type>_lima_<topic>.md` →
7	  `C:/Users/wompu/.claude/projects/H--prism/memor
... [+8156 chars truncated]

### Assistant | 2026-05-29T03:09:04.210Z

[tool_use: Read]

### Assistant | 2026-05-29T03:09:04.364Z

[tool_use: Read]

### User | 2026-05-29T03:09:04.430Z

[tool_result] 1	# Academy Galaxy — PATHS.md (slot:lima H:/-wide path atlas)
2	
3	> Converts every future Grep/Glob for slot:lima from O(N) → O(1). Format: `<path> | <purpose> | <maintainer>`. Paths verified 2026-05-28 against integration tree `H:/prism` + slot worktree `H:/prism-slot-lima` (which holds the course-35..60 expansion). When in doubt about counts, read the file — don't trust a number cached here.
4	
... [+8113 chars truncated]

### User | 2026-05-29T03:09:05.039Z

[tool_result] 1	# Academy Galaxy — slot:lima operational scope
2	
3	> Auto-loaded for slot:lima on every UserPromptSubmit via `slot-context-bundle-inject.mjs` (`SLOT_GALAXY_MAP.lima = "academy"`). This is the operational doctrine for the PRISM Academy domain: human courses, curriculum, lessons, quizzes, certification, MIT-OCW integration, the instructor surface, and the web `/learning/academy` learner UI + appr
... [+9293 chars truncated]

### User | 2026-05-29T03:09:05.284Z

[tool_result] 1	# Academy Galaxy — TOOLBELT.md (slot:lima tool-call efficiency)
2	
3	> Memoized tool-call patterns for the academy domain. Each entry saves tokens or time vs. the naive alternative. Reach for these before re-deriving a regex or path.
4	
5	## prism_* dispatcher actions used most (cheaper + structured vs Grep)
6	- `prism_knowledge:academy_courses` | list shipped courses | beats grepping Curriculum
... [+4325 chars truncated]

### User | 2026-05-29T03:09:07.731Z

[tool_result] 1	---
2	title: Academy Galaxy (slot:lima domain overview)
3	type: architecture
4	kind: galaxy
5	status: active
6	generated_by: lima slot 2026-05-28
7	slot: lima
8	last_verified: 2026-05-28
9	tags: [academy, galaxy, curriculum, mit-ocw, instructor, lima, psn]
10	related:
11	  - knowledge/wiki/architecture/curriculumengine.md
12	  - knowledge/wiki/architecture/courses-index.md
13	  - knowledge/wiki/
... [+4322 chars truncated]

### User | 2026-05-29T03:09:07.837Z

[tool_result] 1	---
2	title: Academy Course Ship Contract (3-leg)
3	type: architecture
4	kind: doctrine
5	status: active
6	generated_by: lima slot 2026-05-28
7	slot: lima
8	last_verified: 2026-05-28
9	tags: [academy, course, curriculum, ship-contract, three-leg, doctrine, lima]
10	related:
11	  - knowledge/wiki/architecture/curriculumengine.md
12	  - knowledge/wiki/architecture/courses-index.md
13	  - knowledge
... [+2854 chars truncated]

### Assistant | 2026-05-29T03:09:15.708Z

I have all 8 files. Now let me verify the specific claims. Let me check: (1) settings.json is NOT in the commit and the hook is not wired there; (2) whether the docs' factual claims hold up — specifically the dispatcher action names (mcfi_/mcdl_), the SLOT_GALAXY_MAP claim, and the master-index back-pointer claim.

### Assistant | 2026-05-29T03:09:18.228Z

[tool_use: Bash]

### User | 2026-05-29T03:09:23.196Z

[tool_result] Exit code 1
.claude/hooks/lima-course-ship-guard.mjs
knowledge/wiki/architecture/academy-course-ship-contract.md
knowledge/wiki/architecture/academy-galaxy.md
mcp-server/src/engines/academy/CLAUDE.md
mcp-server/src/engines/academy/MEMORY.md
mcp-server/src/engines/academy/PATHS.md
mcp-server/src/engines/academy/TOOLBELT.md
state/shared/slot-souls/lima.md
---SETTINGS CHECK---
settings.json NOT in co
... [+45 chars truncated]

### Assistant | 2026-05-29T03:09:28.328Z

settings.json is not in the commit, and the hook is not wired into either settings.json. The exit 1 is just from the final `grep -c` returning 0. Now let me verify the dispatcher action names and the SLOT_GALAXY_MAP claim against the actual source.

### Assistant | 2026-05-29T03:09:31.118Z

[tool_use: Bash]

### User | 2026-05-29T03:09:35.409Z

[tool_result] === SLOT_GALAXY_MAP.lima check (upstream) ===
=== fallback: H: tree ===

### Assistant | 2026-05-29T03:09:36.275Z

[tool_use: Bash]

### User | 2026-05-29T03:09:41.644Z

[tool_result] === mcfi_ / mcdl_ action names exist? ===
4
5
=== academy_ actions in knowledgeDispatcher? ===
8
=== master-index back-pointer in master MEMORY.md? ===
1
=== CurriculumEngine exists? ===
mcp-server/src/engines/CurriculumEngine.ts  101.5K
=== scaffold + audit scripts exist in slot/lima? ===
scripts/audit-academy-prereq-chain.mjs  8.3K
scripts/audit-course-dispatcher-citations.mjs  5.5K
scripts/scaf
... [+30 chars truncated]

### Assistant | 2026-05-29T03:09:48.173Z

Most claims verify. The `mcfi_`/`mcdl_`/`academy_` action names are real in the dispatchers, CurriculumEngine exists, scaffold+audit scripts exist in slot/lima, and the `[galaxy:academy]` back-pointer is present in the master MEMORY.md. But the `slot-context-bundle-inject.mjs` SLOT_GALAXY_MAP check returned empty. Let me investigate whether the file exists at all and whether `SLOT_GALAXY_MAP.lima="academy"` actually resolves — this is the central discoverability claim the docs make repeatedly.

### Assistant | 2026-05-29T03:09:49.831Z

[tool_use: Bash]

### User | 2026-05-29T03:09:54.124Z

[tool_result] === does slot-context-bundle-inject.mjs exist anywhere? ===
/usr/bin/ls: cannot access 'H:/prism-slot-lima/.claude/hooks/slot-context-bundle-inject.mjs': No such file or directory
/usr/bin/ls: cannot access 'H:/.claude/hooks/slot-context-bundle-inject.mjs': No such file or directory
H:/prism/.claude/hooks/slot-context-bundle-inject.mjs  11.0K

### Assistant | 2026-05-29T03:10:00.989Z

The hook exists in the integration tree `H:/prism` (11.0K) but NOT in the slot/lima worktree or the H: root. This is expected — the task brief explicitly says the inject hook is "upstream" and the commit need not contain it. Let me verify the `SLOT_GALAXY_MAP.lima` mapping actually resolves to `academy` in the upstream hook (the central discoverability claim), and check whether the academy galaxy dir path it would load matches.

### Assistant | 2026-05-29T03:10:02.882Z

[tool_use: Bash]

### User | 2026-05-29T03:10:07.398Z

[tool_result] === SLOT_GALAXY_MAP.lima in upstream hook ===
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
2 matches in 2 files:

73:0:"academy",           // PRISM ACADEMY COURSES
H:/.../hooks/slot-context-bundle-inject.mjs:55:// unmapped slots (de-facto echo/lima/bravo affinities surface as comments,
=== SLOT_GALAXY_MAP definition ===
rtk: Failed to resolve 'r
... [+351 chars truncated]

### Assistant | 2026-05-29T03:10:14.835Z

The grep output is truncated by rtk. Let me read the exact lines of the upstream hook to confirm the `lima: "academy"` mapping and the galaxy dir it loads — this is the load-bearing discoverability claim. The commit message itself references "FAIL6 SLOT_GALAXY_MAP satisfied upstream line73."

### Assistant | 2026-05-29T03:10:15.354Z

[tool_use: Read]

### User | 2026-05-29T03:10:18.085Z

[tool_result] 66	const SLOT_GALAXY_MAP = {
67	  charlie: "quoting",        // QUOTING SOFTWARE BACKEND AND FRONT END
68	  delta: "cad",              // CAD
69	  echo: "post-processor",    // POST PROCESSORS
70	  foxtrot: "mill",           // MILLING WIZARD
71	  hotel: "business",         // EMPLOYEE/HR/ACCOUNTING/ERP/BUSINESS/KAIZEN/SIGMA/LEAN
72	  kilo: "cam",               // CAM
73	  lima: "academy",        
... [+2824 chars truncated]

### Assistant | 2026-05-29T03:10:25.424Z

Confirmed: line 73 `lima: "academy"` and line 103 shows the inject loads `mcp-server/src/engines/${galaxy}/CLAUDE.md` + `MEMORY.md` — exactly the path where the galaxy files were placed (`mcp-server/src/engines/academy/`). The discoverability claim is TRUE and load-bearing.

Now I want to double-check two precision points the docs could overclaim: (1) whether the PATHS.md/TOOLBELT.md existence-check the inject does also surfaces those, and (2) the inlined-constants concern — every constant mention I saw was inside an explicit "live in constants.ts ONLY" reminder. Let me grep the diff for any standalone numeric constant teaching.

### Assistant | 2026-05-29T03:10:27.523Z

[tool_use: Bash]

### User | 2026-05-29T03:10:32.912Z

[tool_result] === all lines in diff that contain a kc1.1 numeric constant ===

### Assistant | 2026-05-29T03:10:37.038Z

No matches at all — the rtk-filtered grep returned nothing, but I saw the constants in my Read of the files. Let me grep without rtk interference to be certain.

### Assistant | 2026-05-29T03:10:38.941Z

[tool_use: Bash]

### User | 2026-05-29T03:10:43.007Z

[tool_result] H:/prism-slot-lima/mcp-server/src/engines/academy/CLAUDE.md:63:- **Inlining physics constants** into a lesson body → reject; link `src/physics/constants.ts` (kc1.1 P=1800/M=2100/K=1100/N=700/S=2800/H=3200 live there only).
H:/prism-slot-lima/knowledge/wiki/architecture/academy-course-ship-contract.md:46:- **Never inline physics constants** — link `src/physics/constants.ts` (kc1.1 P=1800/M=2100/K=1
... [+113 chars truncated]

### Assistant | 2026-05-29T03:10:52.079Z

Both occurrences of the kc1.1 constant set are inside an explicit "live there only / never inline / link constants.ts" reminder — this is correct doctrine per the review brief, NOT a violation. No doc teaches a constant as its own source. (The TOOLBELT.md grep-pattern `'kc1_1|kc11_mpa|taylor|1800|2100'` at line 19 is a detector pattern with the explicit comment "should be 0 | catch inlined physics constants (R12)" — also correct.)

Now let me assess the count-as-fact concern. I've seen the docs repeatedly say "~55 files / ~60 wired / 37 integration" but always hedged with "counts rot — run the grep." Let me verify the one claim that is stated more firmly: "18 academy engines" and "8,752 pages" — and the soul's "course-35..60" framing, to judge rot risk.

### Assistant | 2026-05-29T03:10:55.885Z

[tool_use: Bash]

### User | 2026-05-29T03:11:01.319Z

[tool_result] === course data files actually present ===
55
=== wired (id: course-) in CurriculumEngine ===
63
=== pypdf corpus line count (8752 claim) ===
mcp-server/data/tribal/jm-die-corpus-pages.jsonl  16.7M
=== academy engine count sanity (MITCourse + core) ===
7

### Assistant | 2026-05-29T03:11:07.975Z

The count claims are accurate as of now: 55 data files (docs say "~55"), 63 wired (docs say "~60 in slot/lima"), 7 MITCourse engines (docs say `MITCourse{...×6}` + `MitCourseIndex` = 7). The corpus file exists. All counts are consistently hedged with "~" and "run the grep / counts rot" disclaimers throughout — appropriately defended against rot.

Now let me verify the hook's matcher precision and the two referenced wiki cross-refs that are NEW in this commit resolve to each other (internal consistency), plus confirm the hook produces valid JSON.

### Assistant | 2026-05-29T03:11:13.331Z

[tool_use: Bash]

### User | 2026-05-29T03:11:17.847Z

[tool_result] === hook node --check ===
SYNTAX OK
=== hook fires ONLY on academy course-data write (test non-match) ===
[exit 0] (expect empty + exit 0 — CurriculumEngine is not a course-data file)
=== hook fires ON academy course-data write (test match) ===
{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"🎓 academy 3-leg ship reminder (lima-course-
[exit 0]
=== bad JSON fail-soft ===
[
... [+31 chars truncated]

### Assistant | 2026-05-29T03:11:25.029Z

The hook is fully verified:
- Syntax OK
- Non-matching path (CurriculumEngine.ts) → empty + exit 0 (does NOT fire)
- Matching path (course-43-*.ts under data/academy/) → valid JSON `hookSpecificOutput` with `additionalContext` + exit 0
- Bad JSON → empty + exit 0 (fail-soft)
- `decision:"approve"` semantics (it never emits a block decision — PostToolUse with only `additionalContext`)
- Disable knob `PRISM_LIMA_COURSE_SHIP_GUARD_DISABLE=1` present and checked first
- 800ms bounded stdin timeout (never hangs harness)

All checks pass. Let me do a final scan of the soul's `domain_filter` consistency and verify the `[[reference_lima_academy_three_leg_ship]]` memory the docs cite as canonical actually exists somewhere (the docs lean on it heavily as the source of refuse #6).

### Assistant | 2026-05-29T03:11:28.865Z

[tool_use: Bash]

### User | 2026-05-29T03:11:35.142Z

[tool_result] === does reference_lima_academy_three_leg_ship memory exist? ===
C:/Users/wompu/.claude/projects/H--prism/memory/reference_lima_academy_three_leg_ship.md  1.3K
/usr/bin/ls: cannot access 'H:/prism-slot-lima/knowledge/memories/reference/reference_lima_academy_three_leg_ship.md': No such file or directory
=== reference_lima_academy_galaxy_2026_05_28 (cited by academy-galaxy.md)? ===
C:/Users/wompu/.
... [+247 chars truncated]

### Assistant | 2026-05-29T03:11:42.265Z

Two minor findings to weigh:

1. The load-bearing memory `reference_lima_academy_three_leg_ship.md` and `reference_lima_academy_galaxy_2026_05_28.md` both exist in the C: auto-memory store (they're not part of this 8-file commit — memories live outside the worktree and auto-feed via Stop hook, so this is expected and consistent with the commit message's "11 memories" claim being satisfied via the auto-memory namespace).

2. `state/shared/CHAT-SLOT-DOMAINS.md` is cited in `academy-galaxy.md` line 19 as the owner-of-record ("Owner: slot:lima per `state/shared/CHAT-SLOT-DOMAINS.md`") but does NOT exist in the slot/lima worktree. Let me confirm whether it exists in the integration tree before deciding if this is a dangling reference.

### Assistant | 2026-05-29T03:11:43.996Z

[tool_use: Bash]

### User | 2026-05-29T03:16:47.164Z

[tool_result] Command running in background with ID: b1n09j8m1. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism-slot-lima\8bbacd55-9fad-41a3-8bfb-5479837d2bca\tasks\b1n09j8m1.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-05-29T03:16:51.634Z

The command went to background. Let me use Glob instead for the targeted file existence check.

### Assistant | 2026-05-29T03:16:52.058Z

[tool_use: Glob]

### User | 2026-05-29T03:16:54.375Z

[tool_result] H:\prism\state\shared\CHAT-SLOT-DOMAINS.md

### Assistant | 2026-05-29T03:17:21.510Z

`CHAT-SLOT-DOMAINS.md` exists in the integration tree `H:/prism` — the reference is valid (it's a shared spec that lives in the integration tree; the slot worktree doesn't carry it, same pattern as the upstream inject hook). Not a dangling reference. The same is true for the inject hook and the spec/template files cited in PATHS.md (`PER-SLOT-GALAXY-BUILD-KIT.md`, `MASTER-BRAIN-TEMPLATE.md`) — these are upstream shared artifacts the brief explicitly accepts as not-in-commit.

I have everything needed for a verdict. Let me compile the final assessment.

Summary of verification:
- **Inlined constants:** Zero violations. Both kc1.1 set occurrences are inside explicit "live in constants.ts ONLY / never inline" reminders — correct doctrine. TOOLBELT detector pattern at line 19 explicitly targets inlined constants. The soul refuse #5 + #6 + content rules all forbid inlining.
- **Hook wiring:** settings.json NOT in commit (confirmed — 8 files, none is settings.json). Hook NOT wired in either H:/.claude/settings.json or slot settings.json (grep -c = 0/0). Matcher fires ONLY on `/mcp-server/src/data/academy/course-*.ts` (verified: CurriculumEngine.ts → no fire; course-43-*.ts → fires with valid JSON). Fail-soft on bad JSON / no stdin / non-matching tool. Bounded 800ms stdin. `decision` is implicit-approve (PostToolUse + additionalContext only, never blocks). Disable knob present + checked first. node --check OK.
- **Discoverability:** SLOT_GALAXY_MAP.lima="academy" confirmed at upstream line 73; inject loads `mcp-server/src/engines/academy/{CLAUDE,MEMORY}.md` (line 103) — exactly where files were placed. Master-index `[galaxy:academy]` back-pointer present in master MEMORY.md. No overclaim — the docs correctly attribute the inject hook + back-pointer to upstream.
- **Cross-ref consistency:** mcfi_/mcdl_/academy_ dispatcher actions all real. CurriculumEngine + scaffold + both audit scripts exist in slot/lima. Engine names (MITCourse×6 + MitCourseIndex = 7) accurate. Wiki [[li
... [+2262 chars truncated]
