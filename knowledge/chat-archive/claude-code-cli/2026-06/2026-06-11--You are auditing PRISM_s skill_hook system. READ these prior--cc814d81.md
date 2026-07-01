---
type: "chat-session"
source: "claude-code-cli"
session_id: "cc814d81-2f9e-43a6-bd7b-2f1da8a2ff1a"
title: "You are auditing PRISM's skill+hook system. READ these prior-art specs (absolute"
date: "2026-06-11"
first_ts: "2026-06-11T20:22:44.996Z"
last_ts: "2026-06-11T20:24:31.032Z"
cwd: "H:\\prism-slot-golf"
messages: 31
user_msgs: 14
assistant_msgs: 17
raw_file: "H:/.claude/projects/H--prism-slot-golf/cc814d81-2f9e-43a6-bd7b-2f1da8a2ff1a/subagents/workflows/wf_cba6f0c3-d11/agent-a22182b887aa0bf6d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:51"
---

# You are auditing PRISM's skill+hook system. READ these prior-art specs (absolute

> **claude-code-cli** | 2026-06-11 | 31 msgs (14 user / 17 assistant) | cwd: H:\prism-slot-golf
> Raw: `H:/.claude/projects/H--prism-slot-golf/cc814d81-2f9e-43a6-bd7b-2f1da8a2ff1a/subagents/workflows/wf_cba6f0c3-d11/agent-a22182b887aa0bf6d.jsonl`

## Transcript

### User | 2026-06-11T20:22:44.996Z

You are auditing PRISM's skill+hook system. READ these prior-art specs (absolute paths; cwd is a slot worktree of H:/prism so relative also works) and produce a CONCISE (<=400 word) bullet digest of what skill/hook framework ALREADY EXISTS and what already SHIPPED, so a later agent never re-derives it:
- H:/prism/state/shared/specs/HIGH-ROI-SKILL-ROUTING-AUDIT-2026-05-17.md
- H:/prism/state/shared/specs/OLLAMA-OBSIDIAN-ROUTING-AUDIT-2026-05-18.md
- grep/glob for HIGH-ROI-HOOKS-MS0 (knowledge/wiki/architecture/high-roi-hooks-ms0.md) and read it
- H:/prism/knowledge/wiki/architecture/specs/ (any skill-synergy / high-roi-skill-synergy entries)
Report: (a) the existing skill-evaluation/scoring framework if any (scripts, schemas), (b) the existing high-ROI hooks already built, (c) the auto-trigger system (_skill-triggers.jsonl, skill-auto-trigger.mjs). Bullet points, name file paths. Your final message IS the digest.

### Assistant | 2026-06-11T20:22:52.927Z

I'll read these files in parallel to produce the digest.

### Assistant | 2026-06-11T20:22:53.792Z

[tool_use: Read]

### Assistant | 2026-06-11T20:22:54.318Z

[tool_use: Read]

### Assistant | 2026-06-11T20:22:54.680Z

[tool_use: Glob]

### Assistant | 2026-06-11T20:22:55.131Z

[tool_use: Glob]

### User | 2026-06-11T20:23:08.083Z

[tool_result] 1	---
2	title: High-ROI Skill Creation + Hook Auto-Injection + Obsidian/Ollama Routing Audit
3	date: 2026-05-17
4	slot: lima
5	session: claude-88486e9e
6	auditor: claude-88486e9e
7	tool: /forge-audit-v2
8	meta_artifact: scripts/high-roi-skill-rank.mjs
9	verdict: FAIL (2 CRITICAL + 2 WARN signals — corrected after peer review)
10	advisoryOnly: true
11	mustHumanVerify: true
12	peerReview: PASS-with-
... [+10853 chars truncated]

### User | 2026-06-11T20:23:08.918Z

[tool_result] 1	# OLLAMA + OBSIDIAN ROUTING AUDIT — 2026-05-18 (slot golf, claude-b23a56ef)
2	
3	**Scope:** find skills/scripts/hooks that **auto-fire and route through Ollama or Obsidian** for token savings, context extension, build quality, and mistake mitigation. **Expand on what already exists** — don't re-build.
4	
5	**Verification channel:** every finding declares its own re-measurement tool. No opinions 
... [+9423 chars truncated]

### User | 2026-06-11T20:23:11.455Z

[tool_result] No files found

### User | 2026-06-11T20:23:11.519Z

[tool_result] No files found

### Assistant | 2026-06-11T20:23:14.588Z

The wiki entry exists in the graph. Let me read it along with the auto-trigger files.

### Assistant | 2026-06-11T20:23:15.967Z

[tool_use: Bash]

### Assistant | 2026-06-11T20:23:16.465Z

[tool_use: Glob]

### Assistant | 2026-06-11T20:23:17.343Z

[tool_use: Glob]

### Assistant | 2026-06-11T20:23:17.578Z

[tool_use: Glob]

### User | 2026-06-11T20:23:24.845Z

[tool_result] (Bash completed with no output)

### User | 2026-06-11T20:23:38.939Z

[tool_result] No files found

### User | 2026-06-11T20:23:38.940Z

[tool_result] No files found

### User | 2026-06-11T20:23:38.988Z

[tool_result] No files found

### Assistant | 2026-06-11T20:23:42.194Z

[tool_use: Bash]

### Assistant | 2026-06-11T20:23:43.208Z

[tool_use: Bash]

### User | 2026-06-11T20:23:50.832Z

[tool_result] _skill-triggers-pathglob.jsonl
_skill-triggers.jsonl
high-roi-hooks-ms0.md
prism-invention-high-roi-engine-ideas.md

### User | 2026-06-11T20:23:51.796Z

[tool_result] archived-skill-suggest.mjs*
ollama-skill-suggester.mjs*
skill-3q-gate.mjs*
skill-auto-trigger.mjs*
skill-candidate-observe.mjs*
skill-chain-suggest.mjs*
skill-lint-stop.mjs*
skill-usage-tracker.mjs*
skill-utilization-index.mjs*
smart-skill-suggest.mjs*
stop-cross-slot-skill-suggest.mjs*
stop_on_skill_unwired.mjs*
userprompt-skill-and-subagent-nudges.mjs*
add-ollama-skill-policy-frontmatter.mjs*
ad
... [+857 chars truncated]

### Assistant | 2026-06-11T20:23:54.425Z

Now read the key files in parallel.

### Assistant | 2026-06-11T20:23:55.313Z

[tool_use: Read]

### Assistant | 2026-06-11T20:23:56.204Z

[tool_use: Read]

### Assistant | 2026-06-11T20:23:56.487Z

[tool_use: Read]

### User | 2026-06-11T20:23:56.669Z

[tool_result] 1	---
2	title: HIGH-ROI-HOOKS-MS0
3	type: architecture
4	status: shipped
5	date: 2026-05-18
6	slot: delta
7	tags: [hooks, token-efficiency, backend-dev, caching]
8	---
9	
10	# HIGH-ROI-HOOKS-MS0
11	
12	Three hook activations targeting **backend-dev token efficiency without quality
13	loss**. Shipped 2026-05-18 (slot delta, `/checkin-delta /loop`). The PRISM hook
14	surface is saturated (533 hooks 
... [+4030 chars truncated]

### User | 2026-06-11T20:23:57.960Z

[tool_result] 1	{"name":"audit-viz-first","type":"skill","manifest":"H:/prism/.claude/commands/audit-viz-first.md","matcher":{"type":"keyword","value":"audit|inventory|find all|where is|orphan|duplicate|unwired|gap analysis|are there any|how many|list all"},"score":0.8,"action":"suggest"}
2	{"name":"awareness-check","type":"skill","manifest":"H:/.claude/commands/awareness-check.md","matcher":{"type":"keyword","
... [+5536 chars truncated]

### User | 2026-06-11T20:23:58.217Z

[tool_result] 1	{"name":"mill-studio","pathGlob":"mcp-server/src/engines/{mill,hypermill}/**","galaxy":"mill","provenance":"U-GALAXY-MS1-E1 2026-05-27 slot:alpha"}
2	{"name":"mill-master","pathGlob":"mcp-server/src/engines/mill/**","galaxy":"mill","provenance":"U-GALAXY-MS1-E1 2026-05-27 slot:alpha"}
3	{"name":"mill-harden","pathGlob":"mcp-server/src/engines/mill/**","galaxy":"mill","provenance":"U-GALAXY-MS1-E
... [+2466 chars truncated]

### Assistant | 2026-06-11T20:24:31.032Z

I have sufficient data. Here is the digest:

---

**PRISM Skill+Hook Framework — Prior Art Digest (<=400 words)**

**A. Skill-Evaluation / Scoring Framework (scripts + schema)**

- `H:/prism/scripts/high-roi-skill-rank.mjs` — META artifact (cron-ready, exit 0/1/2). Measures: trigger-ledger coverage ratio, `model:`/`effort:` frontmatter coverage, Ollama offload ratio. Telemetry appended to `state/shared/high-roi-skill-history.jsonl` for week-over-week drift. Run: `node scripts/high-roi-skill-rank.mjs [--json]`.
- `H:/prism/scripts/extract-skill-triggers.mjs` — populates `_skill-triggers.jsonl` from skill frontmatter `triggers:` field. **Known gap (F3):** only scans `H:/prism/.claude/commands/`, drops ~90 user-tree skills with `triggers:`. Fix is a one-liner scope extension.
- `H:/prism/scripts/skill-trigger-coverage.mjs` + `.test.mjs` — coverage measurement tool.
- `H:/prism/scripts/skill-library-audit.mjs`, `skill-utilization-scan.mjs`, `skill-marketplace-scan.mjs`, `skill-refinement-digest.mjs` — additional audit/measurement tooling already on disk.
- `H:/prism/scripts/add-ollama-skill-policy-frontmatter.mjs` — batch-adds `model:`/`effort:` frontmatter to skills for tier-routing. Coverage was 4.4% (`model:`) / 8.1% (`effort:`) as of 2026-05-17 audit.
- `H:/prism/scripts/populate_skill_triggers.py`, `expand-skill-triggers.mjs`, `skill-trigger-backfill.mjs` — additional backfill tooling.

**B. High-ROI Hooks Already Shipped (HIGH-ROI-HOOKS-MS0, slot:delta, 2026-05-18)**

- `H:/prism/.claude/hooks/build-cache-guard.mjs` (U-HRH01) — PreToolUse:Bash denies redundant `npm run build`/`vitest`/`tsc` re-runs when cached PASS is valid + no source edit since. PostToolUse captures result; Edit/Write/MultiEdit invalidates. 34 tests. Knobs: `PRISM_BUILD_CACHE_TTL_MS` (300s), `PRISM_BUILD_CACHE_GUARD_DISABLE`.
- `H:/prism/.claude/hooks/mcp-readonly-cache.mjs` (U-HRH02) — PreToolUse:`mcp__prism*` denies identical re-calls of read-only dispatcher actions within TTL. 95-verb mutatin
... [+1878 chars truncated]
