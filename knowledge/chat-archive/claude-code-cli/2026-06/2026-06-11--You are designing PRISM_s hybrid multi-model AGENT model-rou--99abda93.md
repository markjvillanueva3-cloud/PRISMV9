---
type: "chat-session"
source: "claude-code-cli"
session_id: "99abda93-f068-4ff7-84d0-02ca67df3aee"
title: "You are designing PRISM's hybrid multi-model AGENT model-routing PLAN (high-judg"
date: "2026-06-11"
first_ts: "2026-06-11T03:52:41.374Z"
last_ts: "2026-06-11T03:56:05.031Z"
cwd: "H:\\prism-slot-golf"
messages: 23
user_msgs: 9
assistant_msgs: 14
raw_file: "H:/.claude/projects/H--prism-slot-golf/99abda93-f068-4ff7-84d0-02ca67df3aee/subagents/workflows/wf_a930f579-fa7/agent-a9adddbbed3c38b02.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:51"
---

# You are designing PRISM's hybrid multi-model AGENT model-routing PLAN (high-judg

> **claude-code-cli** | 2026-06-11 | 23 msgs (9 user / 14 assistant) | cwd: H:\prism-slot-golf
> Raw: `H:/.claude/projects/H--prism-slot-golf/99abda93-f068-4ff7-84d0-02ca67df3aee/subagents/workflows/wf_a930f579-fa7/agent-a9adddbbed3c38b02.jsonl`

## Transcript

### User | 2026-06-11T03:52:41.374Z

You are designing PRISM's hybrid multi-model AGENT model-routing PLAN (high-judgment synthesis).

IMPORTANT HONESTY CONTEXT: the source article (x.com/sairahul1/status/2064277888216555684) was UNREADABLE (HTTP 402 anti-scraping). Ground this plan in (a) the clearly-requested pattern -- route agent sub-tasks to the CHEAPEST tier that can do them (local Ollama -> Haiku -> Sonnet), reserve Opus for orchestration + hard multi-file/safety reasoning, to cut cost while holding quality -- and (b) PRISM's EXISTING infra below. Do NOT invent article-specific claims; design against the pattern + real PRISM assets.

Operator's question: "Can we do a hybrid of this on top of our current Ollama setup, utilizing Haiku and Sonnet for agents in some instances -- match or come close to matching what the article suggests -- and apply to all galaxies?"

PRISM CURRENT STATE (4 inventories):
[ROUTING INFRA]: {"summary":"PRISM has a multi-layer model-routing infrastructure with 5 distinct assets covering different scopes. Current Ollama offload rate is 9.1% (65 offloaded / 718 total decisions), well below the 30% target. The infrastructure is architecturally complete but the hook-to-actual-execution gap is the primary reason for low real-world offload — hooks SUGGEST but rarely substitute. No systematic agent-dispatch routing (Agent tool calls) exists; every subagent spawned via the Agent tool unconditionally runs on the current Claude tier regardless of task judgment-density.","assets":[{"name":"deep-reasoning-doctrine.md","path":"H:/prism/knowledge/wiki/code-tribal/deep-reasoning-doctrine.md","role":"4-tier doctrine doc (L0 Ollama / L1 Haiku / L2 Sonnet / L3 Opus). Defines the judgment-density selector: 0 decisions→L0, 1-3→L1/L2, 4-10→L2, 10+/safety→L3. Documents the escalate-up-only rail and per-subagent-type default tiers (code-analyzer/reviewer→Sonnet, general-purpose/Plan→Opus, Explore/test-runner→Sonnet). Cites commit 831d04c2b as the implementation of the escalate-up-only rule.","
... [+50872 chars truncated]

### Assistant | 2026-06-11T03:52:45.069Z

I'll analyze the four inventories against the requested hybrid pattern. Let me verify a few load-bearing assets before producing the plan, since the inventories themselves flag several items as "inferred but not independently verified."

### Assistant | 2026-06-11T03:52:47.426Z

[tool_use: Bash]

### Assistant | 2026-06-11T03:52:49.741Z

[tool_use: Bash]

### User | 2026-06-11T03:52:51.590Z

[tool_result] -rw-r--r-- 1 wompu 197611  3779 Apr 16 16:56 H:/prism/.claude/agents/physics-reviewer.md
-rw-r--r-- 1 wompu 197611  3556 Apr 16 16:56 H:/prism/.claude/agents/regression-hunter.md
-rw-r--r-- 1 wompu 197611  3316 Apr 16 16:56 H:/prism/.claude/agents/test-review-agent.md
-rw-r--r-- 1 wompu 197611 17966 Jun 10 21:30 H:/prism/.claude/hooks/lib/ollama-cost-router.mjs
-rw-r--r-- 1 wompu 197611  4725 May 
... [+165 chars truncated]

### User | 2026-06-11T03:52:55.551Z

[tool_result] === current branch / worktree ===
slot/golf
=== regression-hunter model pin ===
model: opus
=== test-review-agent model pin ===
model: haiku
=== physics-reviewer model pin ===
model: opus

### Assistant | 2026-06-11T03:52:59.614Z

Verified: the agent model pins match the inventory claims exactly (regression-hunter=opus, test-review-agent=haiku, physics-reviewer=opus), I'm on slot/golf worktree, and the core routing assets (cost-router, galaxy-bridge, deep-reasoning-doctrine) all exist. Let me verify the resolveExecutor contract and the offload telemetry to ground the architecture.

### Assistant | 2026-06-11T03:53:01.975Z

[tool_use: Bash]

### Assistant | 2026-06-11T03:53:03.871Z

[tool_use: Bash]

### Assistant | 2026-06-11T03:53:05.437Z

[tool_use: Bash]

### User | 2026-06-11T03:53:07.939Z

[tool_result] === resolveExecutor + lane categories in cost-router ===
26:// CATEGORY_TIER here is non-fatal — it falls through to "balanced",
29:export const TIER_PREFERENCES = Object.freeze({
73:    // Synthesis (search_synthesis → BLACKWELL_CEILING `best`) is prose+structure
101:export const CATEGORY_TIER = Object.freeze({
125:export const BLACKWELL_CEILING = Object.freeze({
152:export function routeModelFor
... [+865 chars truncated]

### User | 2026-06-11T03:53:11.954Z

[tool_result] === offload stats top-level ===
offloaded 65 kept 656 rate 9.0% saved 65863

### User | 2026-06-11T03:53:15.286Z

[tool_result] === galaxy bridge DEFAULT_MODEL + entry point ===
14: * call are fail-soft I/O. reasonForGalaxy degrades to context-only when Ollama is
39:const DEFAULT_MODEL = process.env.PRISM_GALAXY_BRIDGE_MODEL || "qwen2.5-coder:32b";
60:export function firstIdentityLine(md, fallback) {
88:export function gatherGalaxyDocs(galaxy, root = DEFAULT_ROOT) {
119:export function assembleGalaxyContext(galaxy, opts = 
... [+1345 chars truncated]

### Assistant | 2026-06-11T03:53:23.355Z

All inventory claims are verified against disk. The `resolveExecutor` 4-lane structure (prism_calc / claude / vllm / ollama) is real at line 296, `CLAUDE_LANE_CATEGORIES` at 261, `VLLM_PREFERRED_CATEGORIES` at 277, and the galaxy bridge `reasonForGalaxy` with Ollama-default + degraded fallback is real at line 249. The offload rate reads 9.0% live. One gap I can now confirm precisely: `resolveExecutor` has NO Haiku lane — it has a binary claude-vs-ollama split, no Haiku/Sonnet distinction within the Claude lane. Let me confirm that.

### Assistant | 2026-06-11T03:53:24.250Z

[tool_use: Read]

### User | 2026-06-11T03:53:26.448Z

[tool_result] 296	export function resolveExecutor({
297	  category,
298	  available = [],
299	  hardware,
300	  vllmEnabled = false,
301	  vllmAvailable = false,
302	  ollamaAvailable = true,
303	} = {}) {
304	  const cat = typeof category === "string" ? category : "";
305	
306	  // 1. Deterministic -- PRISM code answers it; no model spend (R5).
307	  if (DETERMINISTIC_LANE_CATEGORIES.has(cat)) {
308	    return
... [+1865 chars truncated]

### Assistant | 2026-06-11T03:53:31.660Z

Confirmed precisely. `resolveExecutor` returns `lane:"claude", model:null` for the entire CLAUDE_LANE — it does NOT pick Haiku vs Sonnet vs Opus. The Claude lane is model-blind: it hands the task to "whatever the session model is." This is the exact Haiku-lane gap and Agent-dispatch gap the inventory flagged, now verified at source (line 315-320). This is the precise hinge for the net-new work.

I have everything I need. The inventory claims are all verified against disk. Producing the plan.

### Assistant | 2026-06-11T03:55:47.760Z

[tool_use: StructuredOutput]

### User | 2026-06-11T03:55:48.331Z

[tool_result] Structured output provided successfully

### Assistant | 2026-06-11T03:55:51.680Z

I've completed the analysis and delivered the structured plan. The task list shows task #5 (Hybrid model-routing plan) as in_progress — that's the one I just finished, so let me mark it complete.

### Assistant | 2026-06-11T03:55:51.769Z

[tool_use: TaskUpdate]

### User | 2026-06-11T03:55:52.442Z

[tool_result] Updated task #5 status

### Assistant | 2026-06-11T03:56:05.031Z

Plan delivered. Summary of what I produced, grounded in disk-verified assets:

**Assessment:** PRISM can closely approach the hybrid ideal. ~70-75% of the *infrastructure* is built but only ~9% of the *benefit* is realized (offload rate read live at 9.0%, 65 offloaded / 656 kept). The ladder is doctrine + partially wired; the precise hinge I verified at source is `ollama-cost-router.mjs:315-320` — `resolveExecutor`'s Claude lane returns `{lane:'claude', model:null}`, meaning it is **model-blind**: it never distinguishes Haiku/Sonnet/Opus, it just hands off to the session default. That single fact is the root of both the Haiku-lane gap and the agent-dispatch gap.

**Three verified mis-tiered pins** (confirmed on disk, not just claimed): `regression-hunter.md=opus` (doctrine says sonnet), `test-review-agent.md=haiku` (should be sonnet), `physics-reviewer.md=opus` (sonnet for single-file).

**Architecture:** 4-tier judgment-density router sitting ON TOP of the existing `resolveExecutor` + `deep-reasoning-doctrine.md` + agent frontmatter — reusing 12 existing assets, with only 6 genuinely net-new pieces (the Haiku sub-lane being highest-leverage).

**Apply-to-all-galaxies:** ONE shared `resolveAgentTier` helper consumed by the PreToolUse:Agent hook + the `galaxy-reasoning-bridge.mjs` Claude-fallback branch — galaxy name stays a runtime parameter, so all 34 galaxies inherit tiering with zero forks.

**8 ordered units** (U-AT01..08), pure-lib core before consumers.

**Critical honesty flags:**
- This session is on the **slot/golf worktree** — U-AT03/04/05/07/08 touch settings.json, `.claude/agents/*`, and MCP-server source, all **BLOCKED from a slot worktree**. Only the pure libs (U-AT01/02) and telemetry writes (U-AT06) are buildable here; the rest need integrator/live-tree.
- The **R12 quality-regression rail** is mandatory: U-AT06 tier-mismatch telemetry is a hard prerequisite before any tier is auto-downgraded in enforce mode — never silently route a task to a cheaper
... [+197 chars truncated]
