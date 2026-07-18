---
type: "chat-session"
source: "claude-code-cli"
session_id: "ad9c3041-c806-4424-9eed-fea97a4fc64b"
title: "Review an UNCOMMITTED multi-file change to PRISM's live model routers (slot:alph"
date: "2026-06-18"
first_ts: "2026-06-18T02:58:57.715Z"
last_ts: "2026-06-18T03:02:37.528Z"
cwd: "H:\\prism"
messages: 70
user_msgs: 27
assistant_msgs: 43
raw_file: "H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-ada8e51668f4d2050.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:21"
---

# Review an UNCOMMITTED multi-file change to PRISM's live model routers (slot:alph

> **claude-code-cli** | 2026-06-18 | 70 msgs (27 user / 43 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-ada8e51668f4d2050.jsonl`

## Transcript

### User | 2026-06-18T02:58:57.715Z

Review an UNCOMMITTED multi-file change to PRISM's live model routers (slot:alpha, unit "(a) align live router coding→Sonnet", operator directive 2026-06-18). Use `git -C H:/prism diff` to see the working-tree changes. Read each changed file end-to-end. Grade PASS/FAIL with P0/P1/P2 + file:line.

CHANGED (working tree, uncommitted):
1. scripts/lib/claude-tier-router.mjs — renamed OPUS_PATTERNS→CODING_PATTERNS; routeClaudeTier coding branch now returns tier "sonnet" (was "opus"); refineTopTier still returns "opus" for CODING_PATTERNS (the top-tier escalation context); header doc updated.
2. scripts/lib/model-routing-policy.mjs — header doc only (opus→escalation, sonnet=coding default).
3. scripts/lib/effort-tier-router.mjs — added CODING_CLASSES={codegen,audit}; routeEffort now returns effortLevel "high" for a sonnet verdict whose taskClass is coding (was "low"); mechanical sonnet/haiku still "low"; strong-scope still xhigh.
4. scripts/lib/subagent-model-enforce.mjs — NO code change (behavior change is emergent via routeClaudeTier); only its test changed.
5-8. the 4 companion .test.mjs files updated.

THE DIRECTIVE: coding/build DEFAULTS to newest Sonnet @ MAX effort (paired with a local coder ensemble); Opus is ESCALATION-ONLY for deep/novel/architecture coding; safety stays frontier Opus; deep-think stays Fable; reasoning stays Opus. Reverses the 2026-06-11 build→opus split (R7: more-recent operator directive wins).

VERIFY SPECIFICALLY (these are the load-bearing invariants — fail if any is violated):
- SAFETY still routes to opus/frontier (NOT weakened by the coding→sonnet change) — check routeClaudeTier isSafetyCritical→SAFETY_TIER and routePrompt safety branch.
- Deep-think/architecture still → fable (FABLE_PATTERNS unchanged); reasoning never demoted.
- The Opus ESCALATION path for deep/novel coding is preserved (cost-router CLAUDE_LANE_CATEGORIES novel_codegen/multi_file_refactor/architecture — NOT changed here; confirm this change doesn't break it).
- "Sonne
... [+645 chars truncated]

### Assistant | 2026-06-18T02:59:02.150Z

I'll review this multi-file change to PRISM's live model routers. Let me start by getting the full diff and reading each changed file end to end.

### Assistant | 2026-06-18T02:59:02.626Z

[tool_use: Bash]

### Assistant | 2026-06-18T02:59:03.851Z

[tool_use: Bash]

### User | 2026-06-18T02:59:07.756Z

[tool_result] <persisted-output>
Output too large (258.1KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\ad9c3041-c806-4424-9eed-fea97a4fc64b\tool-results\bpy8yi6zf.txt

Preview (first 2KB):
warning: in the working copy of '.claude/scripts/consensus-queue-drain.mjs', CRLF will be replaced by LF the next time Git touches it
warning: in the working copy of 'knowledge/memories/reference/plugin_a
... [+1807 chars truncated]

### User | 2026-06-18T02:59:11.045Z

[tool_result] diff --git a/scripts/lib/claude-tier-router.mjs b/scripts/lib/claude-tier-router.mjs
index e50b84888b..acb235d9cb 100644
--- a/scripts/lib/claude-tier-router.mjs
+++ b/scripts/lib/claude-tier-router.mjs
@@ -16,6 +16,13 @@
  *   - OPUS  = lighter reasoning AND heavy building/coding                              (BUILD)
  * So this router adds EXACTLY ONE new decision: split the top reserved tier fab
... [+5194 chars truncated]

### Assistant | 2026-06-18T02:59:14.193Z

I have the first two files' diffs. Let me get the diffs for the other two lib files and the test files.

### Assistant | 2026-06-18T02:59:15.612Z

[tool_use: Bash]

### Assistant | 2026-06-18T02:59:15.994Z

[tool_use: Bash]

### User | 2026-06-18T02:59:19.583Z

[tool_result] (Bash completed with no output)

### User | 2026-06-18T02:59:26.825Z

[tool_result]  scripts/lib/claude-tier-router.test.mjs         | 19 ++++--
 scripts/lib/galaxy-reasoning-bridge.test.mjs    | 24 ++++++-
 scripts/lib/mcp-bridge-enforce.test.mjs         | 27 ++++++++
 scripts/lib/model-routing-policy.test.mjs       | 13 ++--
 scripts/lib/octopus-consumption-bridge.test.mjs | 32 ++++++++++
 scripts/lib/octopus-record-lib.test.mjs         | 46 ++++++++++++++
 scripts/lib/subagent
... [+171 chars truncated]

### Assistant | 2026-06-18T02:59:30.638Z

The effort-tier-router and subagent-model-enforce diffs came back empty - that may be a path issue. Let me check the working tree status and locate the actual files. Many test files changed beyond the 4 expected; I'll focus on the 4 named ones but verify the others aren't affected by this routing change.

### Assistant | 2026-06-18T02:59:32.217Z

[tool_use: Bash]

### User | 2026-06-18T02:59:36.658Z

[tool_result] =====SUBAGENT=====

### Assistant | 2026-06-18T02:59:38.810Z

Both files show no diff. Let me verify these files exist and check git status for them specifically.

### Assistant | 2026-06-18T02:59:40.652Z

[tool_use: Bash]

### User | 2026-06-18T02:59:45.839Z

[tool_result]  M scripts/lib/claude-tier-router.mjs
 M scripts/lib/model-routing-policy.mjs
?? scripts/lib/effort-tier-router.mjs
=====LS=====
-rw-r--r-- 1 wompu 197611 8216 Jun 17 21:57 scripts/lib/effort-tier-router.mjs
-rw-r--r-- 1 wompu 197611 2769 Jun 12 08:53 scripts/lib/subagent-model-enforce.mjs

### Assistant | 2026-06-18T02:59:49.245Z

Important findings:
- `effort-tier-router.mjs` is `??` (untracked/new file) — so `git diff` shows nothing; it's entirely new.
- `subagent-model-enforce.mjs` is NOT modified at all (no status line) — consistent with the task note "NO code change."

Let me read the full content of all four lib files end to end, plus the effort-tier-router test (since it's the companion). I'll read them in parallel.

### Assistant | 2026-06-18T02:59:49.700Z

[tool_use: Read]

### Assistant | 2026-06-18T02:59:50.655Z

[tool_use: Read]

### User | 2026-06-18T02:59:50.708Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\claude-tier-router.mjs' was already read 22s ago in this session and is unchanged (mtime 1781751276343). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-18T02:59:51.113Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\effort-tier-router.mjs' was already read 22s ago in this session and is unchanged (mtime 1781751465568). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-18T02:59:51.130Z

[tool_use: Read]

### Assistant | 2026-06-18T02:59:51.133Z

[tool_use: Read]

### User | 2026-06-18T02:59:51.640Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\subagent-model-enforce.mjs' was already read 5m ago in this session and is unchanged (mtime 1781272433183). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-18T02:59:51.664Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\model-routing-policy.mjs' was already read 19s ago in this session and is unchanged (mtime 1781751188207). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-18T02:59:54.519Z

The read-once guard is blocking because these were apparently read earlier (likely by the harness pre-loading). But I don't actually have these in my context — the guard is mistaken about my context. Let me disable the cache to read them properly.

### Assistant | 2026-06-18T02:59:55.293Z

[tool_use: Bash]

### User | 2026-06-18T03:00:01.188Z

[tool_result] /**
 * claude-tier-router.mjs -- pure: decide WHICH CLAUDE TIER (fable/opus/sonnet/haiku) a Claude-bound
 * task uses (U-CLAUDE-TIER-ROUTE, slot:india 2026-06-11). The MISSING LAYER above the canonical
 * executor contract.
 *
 * WHAT ALREADY EXISTS (reused here, NOT re-derived -- R7/R8):
 *   - [[local-llm-task-router]] classifyTaskClass(task) -> {taskClass, category} + isSafetyCritical.
 *   - .
... [+6621 chars truncated]

### Assistant | 2026-06-18T03:00:07.518Z

Now the claude-tier-router is fully in context. Key observations:
- `routeClaudeTier` safety branch returns `SAFETY_TIER` = "opus" — preserved.
- `refineTopTier` still returns "opus" for CODING_PATTERNS — preserved (escalation context).
- No dangling `OPUS_PATTERNS` reference in this file.

Let me read the effort-tier-router, subagent-model-enforce, and model-routing-policy files.

### Assistant | 2026-06-18T03:00:07.958Z

[tool_use: Bash]

### User | 2026-06-18T03:00:12.596Z

[tool_result] /**
 * effort-tier-router.mjs -- pure: decide the EFFORT TIER (xhigh / high / low) a prompt should run
 * at, the missing axis above the model router (U-EFFORT-TIER-ROUTE, slot:golf 2026-06-15).
 *
 * WHY (operator 2026-06-15, "API server limiting requests with only 9 chats open"): a fleet-wide
 * settings.json `effortLevel: "xhigh"` makes EVERY chat auto-fan-out a Workflow/subagents per task.
 * 
... [+7815 chars truncated]

### Assistant | 2026-06-18T03:00:18.005Z

effort-tier-router is fully read. Key observations:
- `CODING_CLASSES = new Set(["codegen", "audit"])` added.
- The coding-on-sonnet branch requires BOTH `tier === "sonnet"` AND `CODING_CLASSES.has(v.taskClass)` → returns `high`. Good — narrowly scoped.
- Mechanical sonnet/haiku falls through to `low` — preserved.
- Strong-scope still → xhigh — preserved.

Note: the coding branch checks `tier === "sonnet"` redundantly (already inside `if (tier === "sonnet" || tier === "haiku")`), which means a coding `taskClass` on the haiku tier still goes to low. That's a deliberate guard, not a bug. Let me read the remaining two files.

### Assistant | 2026-06-18T03:00:19.079Z

[tool_use: Bash]

### User | 2026-06-18T03:00:24.523Z

[tool_result] /**
 * subagent-model-enforce.mjs -- pure: decide whether a subagent dispatch's MODEL is policy-correct
 * (U-SUBAGENT-MODEL-ENFORCE, slot:india 2026-06-11). The TRUE-enforcement core (operator: "if we
 * need hooks for true enforcement, build them").
 *
 * WHY THIS IS REAL ENFORCEMENT (vs the advisory main-loop nudge): the main-loop model is NOT
 * hook-forceable, but a PreToolUse hook on the Age
... [+11916 chars truncated]

### Assistant | 2026-06-18T03:00:31.491Z

All four lib files are now fully read. Let me verify the critical invariants:

1. **Safety in model-routing-policy** (`routePrompt`): `isSafetyCritical` branch calls `routeClaudeTier` → for a safety-critical task `routeClaudeTier` returns `SAFETY_TIER="opus"`. So `routePrompt` returns `tier: "opus"` for safety. Preserved.

2. **subagent-model-enforce**: build-on-opus where task is coding → `routeClaudeTier` now returns `sonnet` for coding → `isExpensiveModel("sonnet")` is false → returns `deny` with `recommend: "sonnet"`. Architecture (fable) and safety (opus) still ALLOW. 

Now let me verify there are no other consumers of `OPUS_PATTERNS` across the repo (dangling reference check) and check the cost-router `CLAUDE_LANE_CATEGORIES` escalation path is intact. Let me also read the test files.

### Assistant | 2026-06-18T03:00:31.983Z

[tool_use: Grep]

### Assistant | 2026-06-18T03:00:33.060Z

[tool_use: Grep]

### Assistant | 2026-06-18T03:00:33.641Z

[tool_use: Grep]

### User | 2026-06-18T03:00:46.625Z

[tool_result] scripts\lib\claude-tier-router.mjs:46:// Renamed from OPUS_PATTERNS -- the name was a lie once the coding default moved off Opus.

### User | 2026-06-18T03:00:48.487Z

[tool_result] Found 8 files
scripts\lib\claude-tier-router.mjs
knowledge\memories\reference\reference_u_flor_claude_tier_2026_06_11.md
scripts\lib\feature-routing-graph.mjs
scripts\lib\loop-goal-stack-advisor.test.mjs
scripts\lib\loop-goal-stack-advisor.mjs
scripts\lib\forge-route.mjs
.claude\hooks\__tests__\ollama-cost-router.test.mjs
.claude\hooks\lib\ollama-cost-router.mjs

### User | 2026-06-18T03:00:48.683Z

[tool_result] data\CAPABILITY_MATRIX.json:117:        "id": "SKILL-PRISM_CODING_PATTERNS",
data\CAPABILITY_MATRIX.json:2924:        "id": "SKILL-PRISM_CODING_PATTERNS",
data\CAPABILITY_MATRIX.json:4391:        "id": "SKILL-PRISM_CODING_PATTERNS",
data\CAPABILITY_MATRIX.json:6133:        "id": "SKILL-PRISM_CODING_PATTERNS",
data\CAPABILITY_MATRIX.json:7430:        "id": "SKILL-PRISM_CODING_PATTERNS",
data\CAPABI
... [+6140 chars truncated]

### Assistant | 2026-06-18T03:00:53.642Z

Confirmed:
- The only `OPUS_PATTERNS` reference is the comment on line 46 of claude-tier-router.mjs explaining the rename. No live dangling code reference. No throw risk.
- `CODING_PATTERNS`/`CODING_CLASSES` usage in the changed files is consistent (the other `CODING_PATTERNS` hits are unrelated — registries and `AIDeepKnowledgeIntegrationEngine.ts`, a separate const).

Now let me check the cost-router `CLAUDE_LANE_CATEGORIES` escalation path (the Opus escalation for deep/novel coding) is intact and not touched by this change.

### Assistant | 2026-06-18T03:00:55.070Z

[tool_use: Grep]

### Assistant | 2026-06-18T03:00:56.673Z

[tool_use: Bash]

### User | 2026-06-18T03:00:57.135Z

[tool_result] 261:export const CLAUDE_LANE_CATEGORIES = Object.freeze(new Set([
263:  "tolerance_reasoning", "physics_judgment", "architecture",
264:  "deep_reasoning", "novel_codegen", "multi_file_refactor", "orchestration",
286:// heavy-codegen categories (CLAUDE_LANE_CATEGORIES) -- those ARE the
291:// the same way CLAUDE_LANE_CATEGORIES single-sources "is this Claude-only".
304: * NEVER returns "opus" -- th
... [+185 chars truncated]

### User | 2026-06-18T03:01:01.809Z

[tool_result] (empty = unmodified)

### Assistant | 2026-06-18T03:01:05.981Z

The cost-router `CLAUDE_LANE_CATEGORIES` (containing `novel_codegen`, `multi_file_refactor`, `architecture`) is unmodified — the Opus escalation path for deep/novel coding is preserved and independent of this change. Let me read the surrounding logic in the cost-router to confirm the escalation still routes to opus, and confirm these lane consumers (feature-routing-graph, forge-route, loop-goal-stack-advisor) are all unmodified.

### Assistant | 2026-06-18T03:01:06.778Z

[tool_use: Read]

### User | 2026-06-18T03:01:07.654Z

[tool_result] 255	// empty roster) returns lane:"claude" with an explicit reason -- it does NOT
256	// silently pretend to offload. The caller surfaces the reason.
257	
258	// Judgment / safety categories -- never offloaded to a local model. Single-
259	// sourced here so every consumer (/smart, the hooks, the commands) shares ONE
260	// definition of "Claude-only" instead of re-deriving it.
261	export const CL
... [+5882 chars truncated]

### Assistant | 2026-06-18T03:01:19.392Z

The cost-router escalation path is fully confirmed intact: `CLAUDE_LANE_CATEGORIES` (line 261-265) contains `novel_codegen`, `multi_file_refactor`, `architecture`, and `resolveExecutor` (line 352-357) routes those to `claudeModel: CLAUDE_REASONING_MODEL` ("opus"). This change does not touch that path. The Opus escalation for deep/novel coding is preserved.

Now let me read the 4 test files for the named lib changes to verify tests encode the NEW intent. Let me get their diffs and full content for the new effort-tier-router test.

### Assistant | 2026-06-18T03:01:20.816Z

[tool_use: Bash]

### Assistant | 2026-06-18T03:01:21.981Z

[tool_use: Bash]

### User | 2026-06-18T03:01:24.879Z

[tool_result] diff --git a/scripts/lib/claude-tier-router.test.mjs b/scripts/lib/claude-tier-router.test.mjs
index 2232e2efb8..2ceeb34080 100644
--- a/scripts/lib/claude-tier-router.test.mjs
+++ b/scripts/lib/claude-tier-router.test.mjs
@@ -30,10 +30,21 @@ describe("routeClaudeTier (primary raw-task router)", () => {
     assert.equal(routeClaudeTier({ task: "brainstorm the architecture for the new subsystem" }
... [+5695 chars truncated]

### User | 2026-06-18T03:01:28.480Z

[tool_result] ?? scripts/lib/effort-tier-router.test.mjs
---
-rw-r--r-- 1 wompu 197611 9712 Jun 17 21:58 scripts/lib/effort-tier-router.test.mjs

### Assistant | 2026-06-18T03:01:34.918Z

The three modified test files encode the NEW intent (sonnet/deny with reasons, not removed/weakened). The effort-tier-router test is `??` (new file, like the router itself). Let me read it fully and verify it asserts the high-effort coding bump and the mechanical-stays-low non-leak. Let me also confirm there's a safety assertion and the existing tests weren't gutted in subagent-model-enforce. Let me read the full effort-tier-router test and the relevant sections of the subagent test.

### Assistant | 2026-06-18T03:01:35.557Z

[tool_use: Bash]

### User | 2026-06-18T03:01:39.140Z

[tool_result] // effort-tier-router.test.mjs -- real-assertion tests for the per-task effort-tier router.
// Run: node --test scripts/lib/effort-tier-router.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { routeEffort, routePromptWithEffort, EFFORT_TIERS } from "./effort-tier-router.mjs";

// ---- EFFORT_TIERS contract -------------------------------------------------
... [+9311 chars truncated]

### Assistant | 2026-06-18T03:01:44.281Z

The effort-tier-router test is comprehensive and encodes the new intent with real assertions:
- `CODING on sonnet -> HIGH effort, NOT low` test asserts `high`, `model:"sonnet"`, `fanOut:false`, `escalate:false`, reason match, plus the audit class, plus the critical non-leak assertion: mechanical sonnet (summary) stays `low`.
- Adversarial inputs (null verdict, null/empty prompt, missing tier) — no throw.
- Strong-scope still → xhigh.

Now let me run the four named test suites to confirm they pass (R12 — verify, don't assume). Let me run them.

### Assistant | 2026-06-18T03:01:45.696Z

[tool_use: Bash]

### User | 2026-06-18T03:01:51.170Z

[tool_result]     # Subtest: ALLOW: deep-architecture coding still escalates -- 'architect' -> fable, justified on a top tier
    ok 5 - ALLOW: deep-architecture coding still escalates -- 'architect' -> fable, justified on a top tier
      ---
      duration_ms: 0.2272
      ...
    # Subtest: ALLOW: a mechanical task already on a cheap model (sonnet/haiku) -> never over-spend
    ok 6 - ALLOW: a mechanical tas
... [+976 chars truncated]

### Assistant | 2026-06-18T03:01:56.640Z

All 75 tests pass across the four named suites (9 suites, 0 fail, 0 skipped, 0 todo). The re-anchor note is a fleet awareness refresh, not relevant to this read-only review.

Now let me verify the consumers of `routeClaudeTier` / `routePrompt` that I found earlier (the hooks that actually use these in production) aren't broken by the tier change — specifically the prompt-route-inject hook which is one of the active files. Let me confirm there's a live consumer and that it handles a "sonnet" tier from routeClaudeTier without breaking. Let me also double-check that no production caller hard-codes the old "build->opus" expectation.

### Assistant | 2026-06-18T03:01:57.409Z

[tool_use: Grep]

### User | 2026-06-18T03:01:59.494Z

[tool_result] Found 11 files
scripts\lib\effort-tier-router.test.mjs
scripts\lib\effort-tier-router.mjs
scripts\lib\model-routing-policy.test.mjs
scripts\lib\claude-tier-router.mjs
scripts\lib\claude-tier-router.test.mjs
scripts\lib\model-routing-policy.mjs
scripts\lib\feature-routing-graph.mjs
scripts\generate-feature-routing-graph.mjs
.claude\hooks\model-tier-advisor.mjs
.claude\hooks\agent-fanout-pressure-ga
... [+45 chars truncated]

### Assistant | 2026-06-18T03:02:05.584Z

Let me check the production consumers — `model-tier-advisor.mjs` (which is in the changed git status from the initial snapshot) and `agent-fanout-pressure-gate.mjs` — to confirm they consume the verdict without hard-coding the old opus expectation, and check feature-routing-graph.mjs.

### Assistant | 2026-06-18T03:02:07.011Z

[tool_use: Grep]

### Assistant | 2026-06-18T03:02:08.338Z

[tool_use: Grep]

### User | 2026-06-18T03:02:08.460Z

[tool_result] 10: * directive on every prompt, sourced from the SINGLE policy brain (model-routing-policy.routePrompt)
53:  let routePrompt;
54:  try { ({ routePrompt } = await import("../../scripts/lib/model-routing-policy.mjs")); }
60:  try { v = routePrompt({ prompt, matrix }); } catch { process.exit(0); }
105:  const matchesSession = sessionModel && sessionModel.includes(v.tier);
112:  }[v.tier] || v.tier;

... [+229 chars truncated]

### User | 2026-06-18T03:02:09.992Z

[tool_result] 9: *   - subagent-model-enforce.mjs-> DENIES a MECHANICAL task dispatched to opus/fable (model-tier leak)
41:const TIER = { haiku: 0.25, sonnet: 1, opus: 5, fable: 5 };
42:const UNKNOWN_TIER = 3;            // unspecified model inherits the parent (here: opus-class) -> mild
68:// Claude agents (this session's own 707K-token recon was exactly that). Reuses routeClaudeTier
92:    let tier = "opus"; 
... [+922 chars truncated]

### Assistant | 2026-06-18T03:02:37.528Z

Both production consumers are robust to the tier change:

- **model-tier-advisor.mjs** (line 105-116): consumes `v.tier` generically — `tierBlurb` lookup falls through to `v.tier` for unmapped values, and the recommendation/switch lines just interpolate `v.tier`. A "sonnet" verdict for coding now produces a "switch to sonnet" advisory — exactly the intended new behavior. No hard-coded opus expectation that breaks.

- **agent-fanout-pressure-gate.mjs** (line 92-94): `classifyWorkflowMechanical` now classifies a coding arm's `routeClaudeTier` verdict as "sonnet" → `tier.includes("opus")||tier.includes("fable")` is false → counts as `mech` rather than `judg`. This is a *behavior shift*: coding arms in a fanout now count toward the "mechanical" side of the judgment/mechanical ratio. This is consistent with the directive's intent (coding is no longer top-tier-judgment) and the fail-safe default stays opus. Not a regression — it correctly reflects the new policy. The ladder text (line 187) already says "reserve opus for judgment/synthesis," matching the new policy.

I have now verified every load-bearing invariant. Let me do a final confirmation that the `claude-tier-router.test.mjs` safety/sonnet/explain tests weren't gutted — I saw the diff added the safety+fable test and the SONNET mid-tier test is intact. All checks complete.

## Review Complete

VERDICT: PASS

summary: The coding→Sonnet routing change is correct, surgical, and preserves every load-bearing safety/escalation invariant. The `OPUS_PATTERNS`→`CODING_PATTERNS` rename has no dangling references; safety still routes to Opus frontier; deep-think still routes to Fable; the Opus escalation path (cost-router `CLAUDE_LANE_CATEGORIES`) is untouched and intact; and the tests encode the new intent with real assertions (not weakened to pass). All 75 tests across the four named suites pass.

findings:
- none

What I verified (auditable):

**Invariant 1 — SAFETY still → opus/frontier (NOT weakened):**
- `claude-tier-ro
... [+3170 chars truncated]
