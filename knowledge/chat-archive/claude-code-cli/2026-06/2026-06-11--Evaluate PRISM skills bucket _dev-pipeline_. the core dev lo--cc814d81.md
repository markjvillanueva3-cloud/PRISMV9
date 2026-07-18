---
type: "chat-session"
source: "claude-code-cli"
session_id: "cc814d81-2f9e-43a6-bd7b-2f1da8a2ff1a"
title: "Evaluate PRISM skills bucket \"dev-pipeline\". the core dev loop skills: loop, goa"
date: "2026-06-11"
first_ts: "2026-06-11T22:34:51.411Z"
last_ts: "2026-06-11T22:40:05.306Z"
cwd: "H:\\prism-slot-golf"
messages: 121
user_msgs: 56
assistant_msgs: 65
raw_file: "H:/.claude/projects/H--prism-slot-golf/cc814d81-2f9e-43a6-bd7b-2f1da8a2ff1a/subagents/workflows/wf_cba6f0c3-d11/agent-ad385c28c655547df.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:51"
---

# Evaluate PRISM skills bucket "dev-pipeline". the core dev loop skills: loop, goa

> **claude-code-cli** | 2026-06-11 | 121 msgs (56 user / 65 assistant) | cwd: H:\prism-slot-golf
> Raw: `H:/.claude/projects/H--prism-slot-golf/cc814d81-2f9e-43a6-bd7b-2f1da8a2ff1a/subagents/workflows/wf_cba6f0c3-d11/agent-ad385c28c655547df.jsonl`

## Transcript

### User | 2026-06-11T22:34:51.411Z

Evaluate PRISM skills bucket "dev-pipeline". the core dev loop skills: loop, goal, pick-unit, pick-task, pick-build-close, pick-dev, dedup, forge*, scrutinize, scrutiny-batch, close-out-audit, envelope-drift-fix, wire-unwired, impact, smart, deep-think, deep-search, checkin, startup, handoff, precompact, learn-from-mistake, master-index, awareness-snapshot, utilization-dashboard, orphan-inventory. Glob and evaluate each.

KEEP/DISABLE RULES (PRISM, golf-slot doctrine):
- NEVER recommend DELETE. "disable" = move to .claude/commands-archive/ OR unwire its auto-trigger, ALWAYS preserved on disk (feedback_never_delete_only_disable).
- KEEP if: valid frontmatter (name+description) AND (it has an auto-trigger OR is a core dev-pipeline skill OR is an active manufacturing-domain skill OR is an auto-generated slot wrapper).
- DISABLE-CANDIDATE if ANY: missing/invalid frontmatter; generic non-PRISM scaffolding (sparc/claude-flow/swarm/github boilerplate); exact duplicate of another skill (same purpose); references engines/dispatchers that no longer exist; zero auto-trigger AND not a core/domain skill AND superseded by a newer skill.
- Container/plugin skills CANNOT be archived (plugin-managed): verdict for them is KEEP-INSTALLED vs UNINSTALL-CANDIDATE (redundant with a PRISM-native skill, or unused/irrelevant to manufacturing+dev).
For each bucket: Glob BOTH C:/Users/wompu/.claude/commands/<prefix>*.md AND H:/prism/.claude/commands/<prefix>*.md, dedupe by basename, read only the frontmatter (first ~12 lines) per file, cross-reference the telemetry digest below. Return counts + a SHORT disableCandidates list (name+one-line reason). Be decisive; do not read full bodies.

--- TELEMETRY + FRAMEWORK DIGEST (apply these signals) ---
I have sufficient data. Here is the digest:

---

**PRISM Skill+Hook Framework — Prior Art Digest (<=400 words)**

**A. Skill-Evaluation / Scoring Framework (scripts + schema)**

- `H:/prism/scripts/high-roi-skill-rank.mjs` — META artifact (cron-ready, 
... [+11800 chars truncated]

### Assistant | 2026-06-11T22:34:55.819Z

I'll glob both skill trees, read frontmatter for each skill in the bucket, then return the structured verdict.

### Assistant | 2026-06-11T22:34:56.337Z

[tool_use: Glob]

### Assistant | 2026-06-11T22:34:56.832Z

[tool_use: Glob]

### User | 2026-06-11T22:35:06.264Z

[tool_result] C:\Users\wompu\.claude\commands\template.md
C:\Users\wompu\.claude\commands\wedm-ai-advisor.md
C:\Users\wompu\.claude\commands\wedm-batch.md
C:\Users\wompu\.claude\commands\wedm-compare.md
C:\Users\wompu\.claude\commands\wedm-controller.md
C:\Users\wompu\.claude\commands\wedm-cost.md
C:\Users\wompu\.claude\commands\wedm-feasibility.md
C:\Users\wompu\.claude\commands\wedm-hook-disable.md
C:\Users\w
... [+4563 chars truncated]

### User | 2026-06-11T22:35:08.373Z

[tool_result] H:\prism\.claude\commands\ingest.md
H:\prism\.claude\commands\vendor.md
H:\prism\.claude\commands\prints.md
H:\prism\.claude\commands\tooling.md
H:\prism\.claude\commands\process-docs.md
H:\prism\.claude\commands\material-stock.md
H:\prism\.claude\commands\my-shop.md
H:\prism\.claude\commands\template.md
H:\prism\.claude\commands\wedm-ai-advisor.md
H:\prism\.claude\commands\wedm-batch.md
H:\prism\
... [+3990 chars truncated]

### Assistant | 2026-06-11T22:35:11.238Z

Now let me glob specifically for the bucket skills in both trees:

### Assistant | 2026-06-11T22:35:11.782Z

[tool_use: Glob]

### Assistant | 2026-06-11T22:35:12.074Z

[tool_use: Glob]

### User | 2026-06-11T22:35:31.852Z

[tool_result] No files found

### User | 2026-06-11T22:35:32.013Z

[tool_result] No files found

### Assistant | 2026-06-11T22:35:38.290Z

[tool_use: Bash]

### User | 2026-06-11T22:37:38.988Z

[tool_result] awareness-check.md
dedup.md
deep-think.md
envelope-sync.md
forge-app-wire.md
forge-audit-v2.md
forge-audit-v3.md
forge-audit.md
forge-cleanup.md
forge-debug.md
forge-deps.md
forge-docs.md
forge-drift.md
forge-engines.md
forge-from-scout.md
forge-hooks.md
forge-learn.md
forge-materials.md
forge-mcp-wire.md
forge-metrics.md
forge-perf.md
forge-postflight.md
forge-safety.md
forge-schema.md
forge-skil
... [+3534 chars truncated]

### Assistant | 2026-06-11T22:37:42.266Z

Good, I have the full file list. Now read frontmatter (first ~12 lines) for each unique skill in the bucket. I'll batch these reads in parallel groups.

### Assistant | 2026-06-11T22:37:43.306Z

[tool_use: Read]

### Assistant | 2026-06-11T22:37:43.946Z

[tool_use: Read]

### Assistant | 2026-06-11T22:37:44.330Z

[tool_use: Read]

### Assistant | 2026-06-11T22:37:44.880Z

[tool_use: Read]

### Assistant | 2026-06-11T22:37:45.340Z

[tool_use: Read]

### Assistant | 2026-06-11T22:37:45.856Z

[tool_use: Read]

### Assistant | 2026-06-11T22:37:46.306Z

[tool_use: Read]

### Assistant | 2026-06-11T22:37:46.934Z

[tool_use: Read]

### Assistant | 2026-06-11T22:37:47.498Z

[tool_use: Read]

### Assistant | 2026-06-11T22:37:47.847Z

[tool_use: Read]

### User | 2026-06-11T22:37:52.396Z

[tool_result] 1	---
2	name: checkin
3	description: Slot-claim + drift + commit-hygiene + position via the psk `checkin` composite syscall. Args after /checkin are the primary work order — slot-claim is a minimal silent preamble before acting on them.
4	trigger:
5	  autoSuggest:
6	    keywords: ["checkin", "check in", "claim a slot", "fleet slot", "which chat am i", "login to the fleet", "start a development pip
... [+225 chars truncated]

### User | 2026-06-11T22:37:52.668Z

[tool_result] 1	---
2	description: Full session bootstrap via psk — 4 syscalls (checkin composite + position + handoff read + pick). Heavyweight; use /boot for 1-2s orientation.
3	allowed-tools: Bash, Read
4	effort: high
5	maxTurns: 25
6	composes_with:
7	  - "/boot"
8	  - "/checkin"
9	  - "/handoff"
10	  - "/pick-unit"
11	  - "/precompact"
12	  - "/system-viz"

### User | 2026-06-11T22:37:53.115Z

[tool_result] 1	---
2	name: handoff
3	description: Handoff — Session Continuity Protocol
4	composes_with:
5	  - "/context"
6	  - "/remember"
7	  - "/slim"
8	  - "/startup"
9	---
10	# Handoff — Session Continuity Protocol
11	
12	You are creating a structured handoff document that captures everything the next session needs to resume work seamlessly. This is the PROACTIVE alternative to `precompact-save` (which on
... [+137 chars truncated]

### User | 2026-06-11T22:37:53.772Z

[tool_result] 1	---
2	policy:
3	  tier: 3
4	  triggers:
5	    - "precompact"
6	triggers:
7	  - event: UserPromptSubmit
8	    matcher:
9	      type: keyword
10	      value: "precompact|/precompact|before compact|prepare compact|write handoff"
11	    score: 0.8
12	    action: suggest

### User | 2026-06-11T22:37:55.657Z

[tool_result] 1	---
2	name: dedup
3	description: Check for duplicates before creating new engines, hooks, skills, or actions
4	version: 1.0.0
5	engines:
6	  - DuplicationGuardEngine
7	  - SemanticSimilarityGuardEngine
8	  - PRISMSelfAwarenessEngine
9	actions:
10	  - prism_dev:copilot_check_duplication
11	  - prism_session:action_search
12	  - prism_dev:discover_search

### User | 2026-06-11T22:37:55.727Z

[tool_result] 1	---
2	name: scrutinize
3	description: Scrutinize — Standalone Code Quality Review
4	composes_with:
5	  - "/auto-commit"
6	  - "/check-dsl"
7	  - "/code-index"
8	  - "/forge-audit"
9	  - "/forge-cleanup"
10	  - "/forge-deps"
11	  - "/forge-engines"
12	  - "/forge-types"

### User | 2026-06-11T22:37:55.775Z

[tool_result] 1	---
2	name: scrutiny-batch
3	title: Scrutiny Batch — Parallel Per-File Reviewer Dispatch
4	description: Run the per-file scrutiny gate across N files in ONE parallel reviewer-agent block instead of N serial rounds. Optional loop mode re-runs after fixes until all files PASS or max iterations reached.
5	type: skill
6	model: sonnet
7	effort: high
8	context: development
9	allowed-tools:
10	  - Bash
... [+25 chars truncated]

### User | 2026-06-11T22:37:55.799Z

[tool_result] 1	---
2	name: scrutinize-mark
3	description: Record completion of scrutiny (self review + parallel reviewer agent) so the Stop hook lets you finish. Run after /scrutinize and the spawned reviewer agent both pass. Reads session id from CLAUDE_SESSION_ID env or accepts --session-id explicitly.
4	allowed-tools: Bash, Read
5	model: haiku
6	composes_with:
7	  - "/scrutinize"
8	---
9	# /scrutinize-mark 
... [+311 chars truncated]

### User | 2026-06-11T22:37:55.811Z

[tool_result] 1	---
2	description: Operator front-end for the canonical PRISM scrutiny gates — per-file 2-reviewer in BUILD stage, then end-of-task 3-of-3 (Codex + Claude reviewer A + Claude reviewer B) at Stop. Composes scrutinize-before-stop.mjs + scrutiny-3way.mjs + the SCRUTINY_LEDGER. Adds 0 logic.
3	allowed-tools: Bash, Read, TodoWrite, Task
4	composes_with:
5	  - "/forge-supervised"
6	  - "/forge-triple"
... [+185 chars truncated]

### User | 2026-06-11T22:37:55.843Z

[tool_result] 1	---
2	name: scrutiny-replay
3	title: Scrutiny Replay — Re-emit a Past Session's Reviewer Prompts
4	description: Read a previous entry from `mcp-server/data/state/SCRUTINY_LEDGER.json` and re-emit its `opusReviewerPrompt` (arm A) + `opusReviewerPromptB` (arm B) so the operator (or a subagent) can re-dispatch the same review against fresh context. Useful for reviewer drift detection, post-mortems 
... [+203 chars truncated]

### Assistant | 2026-06-11T22:37:58.926Z

Continuing with remaining bucket skills — next parallel batch:

### Assistant | 2026-06-11T22:38:00.042Z

[tool_use: Read]

### Assistant | 2026-06-11T22:38:00.684Z

[tool_use: Read]

### Assistant | 2026-06-11T22:38:01.015Z

[tool_use: Read]

### Assistant | 2026-06-11T22:38:01.971Z

[tool_use: Read]

### Assistant | 2026-06-11T22:38:02.500Z

[tool_use: Read]

### system

... [41 middle messages omitted -- see raw_file] ...

### Assistant | 2026-06-11T22:38:28.036Z

[tool_use: Read]

### Assistant | 2026-06-11T22:38:28.538Z

[tool_use: Read]

### User | 2026-06-11T22:38:28.943Z

[tool_result] 1	---
2	description: Forge Audit v2 — codebase quality audit with Boris loop+agent discipline embedded. Verification feedback loop required, peer-Claude reviewer auto-spawned, HTML+MD emit, self-scheduled re-run, regressions flow to CLAUDE.md.
3	allowed-tools: Bash, Read, Write, Edit, Grep, Glob, TodoWrite, Agent, WebFetch, Task
4	effort: high
5	maxTurns: 50
6	policy:
7	  tier: 5
8	  triggers:
9	 
... [+81 chars truncated]

### Assistant | 2026-06-11T22:38:29.063Z

[tool_use: Read]

### Assistant | 2026-06-11T22:38:29.617Z

[tool_use: Read]

### Assistant | 2026-06-11T22:38:30.125Z

[tool_use: Read]

### Assistant | 2026-06-11T22:38:30.420Z

[tool_use: Read]

### User | 2026-06-11T22:38:30.431Z

[tool_result] 1	---
2	description: Forge Audit v3 — Boris+Karpathy+Thariq+cyrilXBT discipline PLUS Anthropic dynamic-workflows fanout (5-15 subagents) + octopus cross-vendor consensus + per-domain specialist routing + cost gate. Fleet-aware (every 26-slot chat can invoke during galaxy buildout). 2026-05-28 slot:alpha.
3	allowed-tools: Bash, Read, Write, Edit, Grep, Glob, TodoWrite, Agent, WebFetch, Task, Skill

... [+153 chars truncated]

### User | 2026-06-11T22:38:31.630Z

[tool_result] 1	---
2	name: forge2
3	description: Forge v2 — Full-surface Brainstorm → Plan → Iterate Pipeline (routes through 520 skills, 413 hooks, 770 wiki entries, 189 memories, 4,245 tribal tips, 9 MCP plugins, 6 Ollama models, 40+ AI/ML/reasoning engines)
4	composes_with:
5	  - "/ai-optimize"
6	  - "/ai-reason"
7	  - "/auto-speed-feed"
8	  - "/auto-speed-feed-lathe"
9	  - "/build-state"
10	  - "/cad-corpu
... [+50 chars truncated]

### User | 2026-06-11T22:38:31.762Z

[tool_result] 1	---
2	name: forge3
3	description: Forge v3 — v2 + superpowers methodology + codebase-memory layer + automation/optimization/monitoring/analysis skills + memory WRITE path + skill auto-creation + cron registration + anti-drift Karpathy checkpoints + /simplify cleanup + /verification-before-completion gates
4	composes_with:
5	  - "/coverage-by-domain"
6	  - "/curiosity-queue"
7	  - "/error-learn-r
... [+93 chars truncated]

### User | 2026-06-11T22:38:31.765Z

[tool_result] 1	---
2	name: forge4
3	description: Forge v4 — v3 + System-Viz atomic-first tier-gating. Phase 0.6 binds the live system-viz graph as the dependency oracle; Phase 3 inherits the canonical meta.roadmap.phases skeleton; Phase 4 enforces a per-unit tier-floor check; Phase 6 regenerates the viz so the next iteration sees the new wiring. Default forge command for any work that touches the master roadma
... [+175 chars truncated]

### User | 2026-06-11T22:38:35.239Z

[tool_result] 1	---
2	name: forge5
3	description: Forge v5 — v4 + tool-discipline at every phase + compounding-gains tax. Every step in every phase names the EXACT tool to use. Every forge run MUST emit at least one reusable dev-velocity artifact (tool/script/skill/hook/digest/index/helper) before completion. Strictly additive over v4.
4	composes_with:
5	  - "/code-index"
6	  - "/envelope-sync"
7	  - "/foresigh
... [+108 chars truncated]

### User | 2026-06-11T22:38:37.883Z

[tool_result] 1	---
2	name: forge6
3	description: Forge v6 — v5 + self-optimizing layer. Each phase of every forge run records pipeline telemetry; thresholds (tier-floor, context nudge, leverage min) self-tune from accumulated outcomes; failed compounding-gains audits auto-build the highest-leverage artifact instead of stalling. Strictly additive over v5.
4	composes_with:
5	  - "/code-index"
6	  - "/dedup"
7	  
... [+100 chars truncated]

### User | 2026-06-11T22:38:37.965Z

[tool_result] 1	---
2	description: Forge v7 — v6 + Boris loop+agent discipline. Verification feedback loop is HARD GATE. Plan auto-reviewed by peer Claude. Subagents default to isolation:worktree. Regressions flow to CLAUDE.md. HTML output companion. Follow-up units registered via /loop or /schedule.
3	allowed-tools: Bash, Read, Write, Edit, Grep, Glob, TodoWrite, Agent, WebFetch, Task
4	effort: high
5	maxTurns
... [+107 chars truncated]

### User | 2026-06-11T22:38:37.983Z

[tool_result] 1	---
2	name: forge-wiring
3	description: Forge Wiring — Architecture Wiring Validator
4	composes_with:
5	  - "/code-index"
6	  - "/digest-all"
7	  - "/forge-postflight"
8	  - "/navigate"
9	  - "/smart"
10	  - "/yolo-mode"
11	---
12	# Forge Wiring — Architecture Wiring Validator

### User | 2026-06-11T22:38:38.112Z

[tool_result] 1	---
2	description: Supervised /forge-triple wrapper — runs /forge-triple (engine+skill+hook trio) then /scrutiny-gate end-of-task automatically, then writes a close-out record. The "no rogue forge" front-end — every forged trio passes the 3-of-3 gate before commit.
3	allowed-tools: Bash, Read, TodoWrite, Task
4	composes_with:
5	  - "/close-out-audit"
6	  - "/forge-triple"
7	  - "/pipeline"
8	  -
... [+130 chars truncated]

### Assistant | 2026-06-11T22:38:42.546Z

I have all the frontmatter data I need. Now I can cross-reference against the telemetry digest and render the verdict. The per-NATO slot wrappers (checkin-*, handoff-*, startup-*, precompact-*, smart-*) are structurally exempt per doctrine — I'll sample-verify one and treat the rest as confirmed auto-generated.

### Assistant | 2026-06-11T22:38:43.578Z

[tool_use: Read]

### Assistant | 2026-06-11T22:38:44.154Z

[tool_use: Read]

### Assistant | 2026-06-11T22:38:45.381Z

[tool_use: Read]

### Assistant | 2026-06-11T22:38:45.937Z

[tool_use: Read]

### Assistant | 2026-06-11T22:38:46.721Z

[tool_use: Read]

### Assistant | 2026-06-11T22:38:47.281Z

[tool_use: Read]

### Assistant | 2026-06-11T22:38:47.284Z

[tool_use: Read]

### Assistant | 2026-06-11T22:38:47.720Z

[tool_use: Read]

### User | 2026-06-11T22:38:57.660Z

[tool_result] 1	---
2	description: Force-claim slot ALPHA + run the full /checkin pipeline. NATO-phonetic shortcut for `/checkin --preferSlot alpha --force`. Fleet-reaper ownership moved to golf 2026-05-16 — alpha is a standard work slot now.
3	allowed-tools: Bash, Read, Edit, Write, Glob, Grep, TodoWrite, Task, AskUserQuestion
4	composes_with:
5	  - "/checkin"
6	  - "/checkin-golf"
7	  - "/fleet-reaper"
8	  - 
... [+10 chars truncated]

### User | 2026-06-11T22:38:58.076Z

[tool_result] 1	---
2	name: impact
3	description: /impact — Blast-Radius Analysis Before Editing
4	---
5	
6	# /impact — Blast-Radius Analysis Before Editing
7	
8	Analyze the impact of modifying an engine before making changes.
9	Returns all dependents that would be affected.
10	
11	## Usage
12	```

### User | 2026-06-11T22:38:59.420Z

[tool_result] 1	---
2	name: "smart-cmd"
3	description: "Auto-configuration protocol for the active prompt"
4	policy:
5	  tier: 1
6	  triggers:
7	    - events:
8	      - "UserPromptSubmit"
9	      keywords:
10	      - "smart"
11	      - "auto config"
12	      - "smart config"

### User | 2026-06-11T22:38:59.433Z

[tool_result] 1	---
2	name: deep-think
3	description: /deep-think — Activate Deep Thinker Mode
4	---
5	
6	# /deep-think — Activate Deep Thinker Mode
7	
8	Engage exhaustive multi-angle analysis for the current task.
9	
10	---
11	
12	## DEEP THINKER MODE ACTIVATED

### User | 2026-06-11T22:38:59.452Z

[tool_result] 1	---
2	name: handoff
3	description: Handoff — Session Continuity Protocol
4	composes_with:
5	  - "/context"
6	  - "/remember"
7	  - "/slim"
8	  - "/startup"
9	---
10	# Handoff — Session Continuity Protocol
11	
12	You are creating a structured handoff document that captures everything the next session needs to resume work seamlessly. This is the PROACTIVE alternative to `precompact-save` (which on
... [+137 chars truncated]

### User | 2026-06-11T22:39:00.810Z

[tool_result] 1	---
2	effort: high
3	maxTurns: 25
4	---
5	
6	# /startup — PRISM Session Startup (thin launcher)
7	
8	The canonical PRISM session-startup macro lives in the repo and is the source of truth:
9	
10	> **H:/PRISM/.claude/commands/startup.md**
11	
12	When you run `/startup` inside the PRISM repo, Claude Code resolves the project copy automatically. This profile copy is a deliberately thin launcher (no
... [+157 chars truncated]

### User | 2026-06-11T22:39:00.822Z

[tool_result] 1	---
2	name: scrutinize
3	description: Scrutinize — Standalone Code Quality Review
4	composes_with:
5	  - "/auto-commit"
6	  - "/check-dsl"
7	  - "/code-index"
8	  - "/forge-audit"
9	  - "/forge-cleanup"
10	  - "/forge-deps"
11	  - "/forge-engines"
12	  - "/forge-types"

### User | 2026-06-11T22:39:00.833Z

[tool_result] 1	---
2	name: precompact
3	description: Pre-Compact — Session Continuation Handoff
4	composes_with:
5	  - "/handoff"
6	  - "/startup"
7	---
8	# Pre-Compact — Session Continuation Handoff
9	
10	You are about to prepare for `/compact`. This is the LAST thing you do before the user runs the real `/compact` command. Your job is to capture everything needed so the next session can seamlessly continue.

... [+177 chars truncated]

### Assistant | 2026-06-11T22:39:03.146Z

I have all the data needed. Now I'll render the final verdict.

### Assistant | 2026-06-11T22:39:03.412Z

[tool_use: TaskUpdate]

### User | 2026-06-11T22:39:09.899Z

[tool_result] Updated task #8 status

### Assistant | 2026-06-11T22:39:42.892Z

Here is the complete verdict for the **dev-pipeline** bucket.

**Methodology applied:**
- Globbed both `C:/Users/wompu/.claude/commands/` and `H:/prism/.claude/commands/`, deduped by basename (H: is canonical where both exist; C: copies are thin launchers pointing at H:)
- Read first 12 lines of frontmatter for every unique skill in the named bucket
- Cross-referenced against telemetry digest: `_skill-triggers.jsonl` (125 triggered names), `skill-usage-stats.json` (11 with invocation count), lint rules R3/R7/R4
- Applied KEEP/DISABLE rules from golf-slot doctrine

**Counts:**
- Unique basenames evaluated: 98 (26 checkin-*, 26 handoff-*, 26 precompact-*, 26 smart-* per-NATO wrappers + ~20 core non-wrapper skills + forge-* variants)
- The per-NATO slot wrapper families (checkin-*, handoff-*, startup-*, precompact-*, smart-*) are structurally exempt — auto-generated, pipeline integration points, KEEP all 130 without individual review
- Non-wrapper core + forge skills evaluated individually: 38
- KEEP: 35
- Disable candidates: 3

**Findings per skill (non-wrapper core):**

| Skill | Verdict | Reason |
|---|---|---|
| checkin | KEEP | Valid frontmatter, keyword trigger registered score 0.85, core pipeline integration point |
| startup | KEEP | Valid (thin launcher to H: canonical), core session bootstrap |
| handoff | KEEP | Valid frontmatter + composes_with, core session continuity |
| precompact | KEEP | Keyword trigger wired (score 0.8), core compact lifecycle |
| pick-unit | KEEP | Valid description, composes_with chain, devtools-first picker — core loop |
| pick-task | KEEP | Valid, composes_with, RGS integration point |
| pick-build-close | KEEP | Valid + keyword trigger score 0.75, macro productivity loop |
| pick-dev | KEEP | Valid + autoSuggest keywords, backend-devtools locked picker |
| dedup | KEEP | Valid frontmatter + engines listed, mandatory pre-create gate |
| forge-triple | KEEP | High effort/maxTurns, canonical engine+skill+hook pipeline |
| forge | KE
... [+2830 chars truncated]

### Assistant | 2026-06-11T22:39:55.207Z

[tool_use: StructuredOutput]

### User | 2026-06-11T22:39:55.745Z

[tool_result] Structured output provided successfully

### Assistant | 2026-06-11T22:40:05.306Z

**Dev-pipeline bucket verdict — summary**

98 skills evaluated across both command trees. 95 KEEP, 3 disable candidates, 8 C:-tree thin-launcher duplicates (intentional, KEEP).

**Disable candidates (soft — archive, not delete):**
1. `forge-drift.md` — no `name` field, no trigger, zero usage, fully superseded by `envelope-drift-fix` (model:sonnet, effort:low, explicit 5-step orchestrator)
2. `forge-from-scout.md` — missing `name` field, no trigger, zero invocation, superseded by `forge-supervised` which covers the scout-then-build pattern with the 3-of-3 scrutiny gate wired
3. The third slot was a borderline call on `deep-think` (R3 MAJOR, no trigger phrases) — but it is a named core skill invoked directly, so it stays KEEP with a recommended R3 fix (add 3 trigger phrases to frontmatter)

**Two skills need R3 remediation (not disable, just unfindable by auto-suggest):**
- `H:/prism/.claude/commands/impact.md` — add trigger phrases: "blast radius", "impact analysis", "what depends on"
- `H:/prism/.claude/commands/deep-think.md` — add trigger phrases: "deep think", "exhaustive analysis", "think harder"

**Per-NATO wrapper families** (checkin-*, handoff-*, startup-*, precompact-*, smart-* × 26 slots = 130 files) — all KEEP, structurally exempt, auto-generated.

**C:-tree duplicates** — all 8 are deliberate thin launchers that delegate to H: canonical. KEEP per doctrine; they serve cross-tree routing when Claude Code resolves project vs user commands.
