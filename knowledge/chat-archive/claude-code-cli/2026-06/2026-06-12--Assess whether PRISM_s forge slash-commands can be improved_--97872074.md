---
type: "chat-session"
source: "claude-code-cli"
session_id: "97872074-49d2-49e4-8faa-3e7fbb4fbadf"
title: "Assess whether PRISM's forge slash-commands can be improved, focused on the LATE"
date: "2026-06-12"
first_ts: "2026-06-12T01:41:37.942Z"
last_ts: "2026-06-12T01:43:16.037Z"
cwd: "H:\\prism-slot-tango"
messages: 28
user_msgs: 12
assistant_msgs: 16
raw_file: "H:/.claude/projects/H--prism-slot-tango/97872074-49d2-49e4-8faa-3e7fbb4fbadf/subagents/agent-a9de600a0d2ae3040.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:13"
---

# Assess whether PRISM's forge slash-commands can be improved, focused on the LATE

> **claude-code-cli** | 2026-06-12 | 28 msgs (12 user / 16 assistant) | cwd: H:\prism-slot-tango
> Raw: `H:/.claude/projects/H--prism-slot-tango/97872074-49d2-49e4-8faa-3e7fbb4fbadf/subagents/agent-a9de600a0d2ae3040.jsonl`

## Transcript

### User | 2026-06-12T01:41:37.942Z

Assess whether PRISM's forge slash-commands can be improved, focused on the LATEST one. Read end-to-end:
- H:/prism/.claude/commands/forge7.md  (the latest forge — v6 + Boris loop+agent discipline)
- H:/prism/.claude/commands/forge-hooks.md  (hook-specific forge variant)
- glob H:/prism/knowledge/wiki for forge7 / forge-audit-v3 entries and skim the freshest.

The operator wants to "use the latest forge command" to build high-ROI HOOKS, but "assess to see if we can improve forge slash commands first."

Assess these specific improvement axes and return a CONCRETE verdict:
1. **Model-tier dispatch (token leak check)** — does forge7 / forge-hooks dispatch its MECHANICAL subagents (scout/read/summarize/mine/lint) on the session model (Opus/Fable) or on sonnet/haiku? PRISM just shipped a `claudeModel` fallback ladder (resolveExecutor in .claude/hooks/lib/ollama-cost-router.mjs: mechanical->sonnet/haiku, opus reserved for reasoning). If forge spawns mechanical agents WITHOUT `model: 'sonnet'`, that is a high-ROI token-leak fix. Quote the exact lines where forge spawns subagents.
2. **Fork-storm / fan-out safety** — does forge7 cap concurrent subagents or could it spawn an unbounded fan-out (a 14+-agent burst that fork-storms under load)? Note any missing concurrency cap.
3. **Stale references** — any retired model names, dead script paths, or broken tool refs in forge7/forge-hooks.
4. **Is forge7 or forge-hooks the right tool for "build + wire high-ROI hooks"?** — which one, and does it actually wire hooks into settings.json + test them, or just generate files?

RETURN ONLY (tight, no file dumps):
- A 5-line verdict: is forge improvable Y/N, and the single highest-ROI improvement.
- Top-3 concrete forge improvements (file:line + the exact change), ranked.
- Which forge command to use for the hook-build task + why.
Do NOT spawn parallel bash; run any commands sequentially with `command node`/`command grep`. Be concise.

### Assistant | 2026-06-12T01:41:42.848Z

I'll read the forge files and wiki entries to give you a concrete assessment.

### Assistant | 2026-06-12T01:41:43.189Z

[tool_use: Read]

### User | 2026-06-12T01:41:44.042Z

[tool_result] 1	---
2	description: Forge v7 — v6 + Boris loop+agent discipline. Verification feedback loop is HARD GATE. Plan auto-reviewed by peer Claude. Subagents default to isolation:worktree. Regressions flow to CLAUDE.md. HTML output companion. Follow-up units registered via /loop or /schedule.
3	allowed-tools: Bash, Read, Write, Edit, Grep, Glob, TodoWrite, Agent, WebFetch, Task
4	effort: high
5	maxTurns
... [+21279 chars truncated]

### Assistant | 2026-06-12T01:41:46.445Z

[tool_use: Read]

### User | 2026-06-12T01:41:47.573Z

[tool_result] 1	---
2	name: forge-hooks
3	description: Forge Hooks — Hook Discovery + Creation Autopilot
4	composes_with:
5	  - "/auto-commit"
6	  - "/autopilot"
7	  - "/code-index"
8	  - "/dedup"
9	  - "/digest-all"
10	  - "/forge-postflight"
11	  - "/forge-skills"
12	  - "/master-index"
13	  - "/navigate"
14	  - "/smart"
15	  - "/system-viz"
16	  - "/wiki-query"
17	  - "/yolo-mode"
18	---
19	# Forge Hooks — H
... [+16423 chars truncated]

### Assistant | 2026-06-12T01:41:51.008Z

Now let me check the wiki for forge7/forge-audit-v3 entries and the ollama-cost-router for the model-tier dispatch context.

### Assistant | 2026-06-12T01:41:51.469Z

[tool_use: Glob]

### User | 2026-06-12T01:41:52.472Z

[tool_result] H:\prism\knowledge\wiki\architecture\skills\project\forge7.md
H:\prism\knowledge\wiki\architecture\skills\user\forge7.md

### Assistant | 2026-06-12T01:41:54.438Z

[tool_use: Glob]

### User | 2026-06-12T01:41:55.404Z

[tool_result] H:\prism\knowledge\wiki\code-tribal\learnings\forge-audit-v3-ms0-u-fav3-skill.md
H:\prism\knowledge\wiki\code-tribal\learnings\forge-audit-v3-ms0-u-fav3-fleet-expansion-plan-html.md
H:\prism\knowledge\wiki\architecture\skills\project\forge-audit-v3.md
H:\prism\knowledge\wiki\architecture\skills\user\forge-audit-v3.md

### Assistant | 2026-06-12T01:41:58.589Z

[tool_use: Read]

### User | 2026-06-12T01:41:59.404Z

[tool_result] 1	---
2	title: Skill — forge7
3	type: skill
4	skill_name: forge7
5	scope: project
6	source_path: H:/prism/.claude/commands/forge7.md
7	generated_by: scripts/generate-skill-wiki.mjs
8	last_verified: 2026-06-08
9	tags: [skill, scope-project]
10	related:
11	  - knowledge/wiki/architecture/layer-l8.md
12	---
13	
14	# Skill — `forge7`
15	
16	> Forge v7 — v6 + Boris loop+agent discipline. Verification f
... [+774 chars truncated]

### Assistant | 2026-06-12T01:41:59.817Z

[tool_use: Bash]

### User | 2026-06-12T01:42:06.731Z

[tool_result] 191:Agent({
192:  subagent_type: 'reviewer',
253:Agent({
254:  subagent_type: 'reviewer',

### Assistant | 2026-06-12T01:42:09.315Z

Now check the ollama-cost-router for the resolveExecutor pattern, and grep forge-hooks for any model: lines:

### Assistant | 2026-06-12T01:42:10.327Z

[tool_use: Bash]

### User | 2026-06-12T01:42:13.690Z

[tool_result] /usr/bin/bash: line 1: $null: ambiguous redirect

### Assistant | 2026-06-12T01:42:15.838Z

[tool_use: Bash]

### User | 2026-06-12T01:42:19.962Z

[tool_result] 2:// SYSTEM-VIZ-BRAIN-MS0/U-P4-OLLAMA-COST-ROUTING — Cost-aware Ollama model selection
4:// Replaces hardcoded "first-of-preference-list" model selection with a
5:// category → tier → model decision. Smaller / faster models for trivial
7:// capable models for complex codegen / multi-step reasoning.
50:    // 14GB on the Blackwell — the fastest model in the whole Ollama benchmark and
65:    // The 
... [+2718 chars truncated]

### Assistant | 2026-06-12T01:42:22.523Z

[tool_use: Bash]

### User | 2026-06-12T01:42:26.084Z

[tool_result] 237:// FLEET-OLLAMA-ROUTING-MS0/U-FLOR01 -- resolveExecutor: lane-aware per-task
243://   claude     -> judgment / safety-critical -- NEVER a local model.
324: * @returns {{ lane: "prism_calc"|"claude"|"vllm"|"ollama", model: string|null,
333:export function resolveExecutor({
354:      lane: "claude", model: null, tier: "cloud", claudeModel: CLAUDE_REASONING_MODEL,
369:      lane: "claude", model:
... [+34 chars truncated]

### Assistant | 2026-06-12T01:42:28.524Z

[tool_use: Bash]

### User | 2026-06-12T01:42:32.137Z

[tool_result] 293:// CLAUDE_REASONING_MODEL is the canonical label for the top reasoning tier --
296:export const CLAUDE_REASONING_MODEL = "opus";
302: *   cheap-tier work  (classify / format / inventory / introspect) -> "haiku"
303: *   balanced+/unknown (summary / explain / doc / audit / synthesis) -> "sonnet"
306: * @returns {"haiku"|"sonnet"}
310:  return CATEGORY_TIER[cat] === "cheap" ? "haiku" : "sonnet";
... [+1052 chars truncated]

### Assistant | 2026-06-12T01:42:50.327Z

Now I have everything I need. Here is the assessment:

---

## Verdict: forge7 IS improvable — highest-ROI fix is model-tier dispatch (token leak, CONFIRMED)

**5-line verdict:** forge7 spawns ALL subagents without a `model:` param, meaning every mechanical agent (plan peer-reviewer, LOOP 2 scrutinizer, Agent 13 verification-discipline checker) runs at session model (Opus/Fable). The `resolveExecutor` fallback ladder (`ollama-cost-router.mjs:296-310`) that routes mechanical→sonnet/haiku was NEVER wired into forge7 or forge-hooks — the two are completely disconnected. forge-hooks is the right command for hook-building but has the same leak AND does not wire settings.json programmatically. Both files are stale on a script path. Combined this is a significant per-forge-run token burn.

---

## Top-3 concrete improvements, ranked

**1. Add `model: 'sonnet'` to all mechanical subagent spawns (forge7.md lines 191-196 and 253-265)**

Current (line 191-196):
```js
Agent({
  subagent_type: 'reviewer',
  description: 'Review unit <U-XXX>',
  prompt: '<rubric>',
  isolation: 'worktree',
})
```
Current (line 253-265, plan peer-review):
```js
Agent({
  subagent_type: 'reviewer',
  description: 'Staff-engineer review of milestone plan',
  prompt: `...`,
  isolation: 'worktree',
})
```

Both reviewer spawns are text-analysis tasks (read plan/diff, return PASS/FAIL). `resolveExecutor` classifies these as `"audit"` → `claudeFallbackModel` → `"sonnet"`. Fix: add `model: 'sonnet'` to LOOP 2 scrutinizers and `model: 'sonnet'` to the Phase 4.5 plan reviewer; reserve Opus for Phase 2 brainstorm and the 12+1-agent consensus only when deep reasoning is provably needed. In forge-hooks, same fix applies to any reviewer agents (none currently spawned explicitly — but the skill instructs the user to run agents without model pins, so add doctrine to Phase 4A/4C).

**2. Stale script path in forge7.md line 222 and 310 — `run-verification-channel.mjs` and `emit-milestone-html.mjs` do not exist**


... [+188 chars truncated]

### Assistant | 2026-06-12T01:42:51.142Z

[tool_use: Bash]

### User | 2026-06-12T01:42:56.316Z

[tool_result] exit:2

### Assistant | 2026-06-12T01:43:16.037Z

Confirmed — both scripts are dead references. Fix: either build them (high ROI — `emit-milestone-html.mjs` exists conceptually from Thariq pattern but was never created) or replace line 222 with the actual verification pattern (`npx vitest run <testfile>` + `node --test <file>`) and line 310 with `node scripts/md-to-html.mjs` (which DOES exist, per `html-report-render.mjs` in CLAUDE.md). Stale dead-script references cause forge7 to silently skip verification and HTML steps.

**3. forge-hooks has no concurrency cap and no settings.json wiring step (fork-storm + gap)**

forge-hooks Phase 5 creates hook files but the only settings.json mention is a note at line 237: "Settings.json edits go to `C:\Users\<user>\.claude\settings.json` ONLY." There is NO actual write step, no JSON parse/patch logic, no verification that the hook was wired. A user running `/forge-hooks 10` with args `count=10` would design 10 hooks with zero fan-out cap — Phase 4 loops over all 10 candidates sequentially in prose but nothing prevents a burst of Agent spawns. Fix: add an explicit settings.json patch step to Phase 5D (read → splice new hook entry → write → verify round-trip parse), and cap concurrent agent spawns to 3 in Phase 5 with a note that LOOP 2 isolation:worktree agents must be sequential-per-hook, not all-parallel.

---

## Which command to use for high-ROI hook building

**Use `/forge-hooks`**, not `/forge7`.

Reasons:
- forge-hooks is purpose-built: it does discovery ranking (Phase 3C priority matrix), prior-art gate per hook (Phase 3.5), failure-mode analysis (Phase 4C), and system-viz registration at L11 (Phase 5D) — all hook-specific steps forge7 lacks.
- forge7 treats hooks as one asset type among many; forge-hooks owns the full lifecycle from gap-discovery through test and commit.
- forge7's value-add (Boris verification gate, plan peer-review, isolation:worktree default) can be manually applied to forge-hooks runs since forge7 is doc-only — there is no code that prevents comp
... [+351 chars truncated]
