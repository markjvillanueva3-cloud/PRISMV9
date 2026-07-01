---
type: "chat-session"
source: "claude-code-cli"
session_id: "8b785b10-fc31-4613-8c28-594f7533b4f2"
title: "Independent second-pass review of H:/prism/scripts/lib/local-llm-task-router.mjs"
date: "2026-06-04"
first_ts: "2026-06-04T17:39:11.969Z"
last_ts: "2026-06-04T17:41:41.925Z"
cwd: "H:\\prism"
messages: 25
user_msgs: 10
assistant_msgs: 15
raw_file: "H:/.claude/projects/H--prism/8b785b10-fc31-4613-8c28-594f7533b4f2/subagents/agent-aab8290174dc2bc57.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:17"
---

# Independent second-pass review of H:/prism/scripts/lib/local-llm-task-router.mjs

> **claude-code-cli** | 2026-06-04 | 25 msgs (10 user / 15 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/8b785b10-fc31-4613-8c28-594f7533b4f2/subagents/agent-aab8290174dc2bc57.jsonl`

## Transcript

### User | 2026-06-04T17:39:11.969Z

Independent second-pass review of H:/prism/scripts/lib/local-llm-task-router.mjs + its test H:/prism/scripts/lib/local-llm-task-router.test.mjs (HERMES-EFFICIENCY-ROUTER U1 keystone — a routing-decision composer). Assume the first reviewer covered basic correctness; weight YOUR pass on what they're likely to miss:

- INTEGRATION: it imports `routeModelForTask` from ../../.claude/hooks/lib/ollama-cost-router.mjs and `fetchInstalledModels` from ./host-aware-synthesis-model.mjs — verify those import paths resolve from scripts/lib/ and the named exports actually exist with the signatures used. A wrong relative path = dead on first real call.
- TEST INTEGRITY: do the tests actually FAIL if the behavior breaks, or are any vacuous? Specifically: does the "real composition" test use the real routeModelForTask (not a stub) so it would catch a future cost-router change? Are the safety-escalation assertions strong (assert runLocal:false AND escalateTo:"claude" AND ollamaModel:null)?
- HIDDEN COUPLING / CONVENTION: does it match the sibling .mjs router conventions (host-aware-synthesis-model.mjs, multi-provider-router.mjs)? Any inlined constant that should be imported? Any model tag hardcoded that the BLACKWELL retirement would make stale (the file must reference ZERO of qwen2.5-coder:3b/7b/14b, deepseek-r1:14b as a routing target)?
- The qualityBar values + fallbackChain construction — sane and consumed correctly?

Grade PASS/FAIL with P0/P1 findings (file:line). Do not edit anything.

### Assistant | 2026-06-04T17:39:26.003Z

I'll review the router and its test. Let me start by reading both files plus the two dependencies it imports, so I can verify the integration claims directly.

### Assistant | 2026-06-04T17:39:26.962Z

[tool_use: Read]

### Assistant | 2026-06-04T17:39:27.018Z

[tool_use: Read]

### User | 2026-06-04T17:39:30.747Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\local-llm-task-router.mjs' was already read 5s ago in this session and is unchanged (mtime 1780594692715). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-04T17:39:31.819Z

[tool_result] 1	// tier: T4
2	// Tests for scripts/lib/local-llm-task-router.mjs (HERMES-EFFICIENCY-ROUTER U1).
3	//
4	// node:test — hermetic where it must be (DI stubs for fetch/host), but the
5	// "real composition" tests use the ACTUAL routeModelForTask so the wiring is
6	// proven, not mocked (R9: a test that passes against a hardcoded return is
7	// worthless). No real Ollama/GPU/network is touched.
8	//

... [+8055 chars truncated]

### Assistant | 2026-06-04T17:39:37.288Z

I have the test file. The router source was read moments ago but isn't in my visible context, so let me retrieve it and the two dependencies it imports. I need the actual exports/signatures from both deps to verify the integration claims.

### Assistant | 2026-06-04T17:39:39.025Z

[tool_use: Bash]

### Assistant | 2026-06-04T17:39:39.800Z

[tool_use: Bash]

### Assistant | 2026-06-04T17:39:40.239Z

[tool_use: Bash]

### User | 2026-06-04T17:39:59.118Z

[tool_result] === ollama-cost-router.mjs EXPORTS ===
29:export const TIER_PREFERENCES = Object.freeze({
91:export const CATEGORY_TIER = Object.freeze({
115:export const BLACKWELL_CEILING = Object.freeze({
119:export const TIER_ORDER = Object.freeze(["cheap", "balanced", "strong", "best"]);
142:export function routeModelForTask({ category, available, hardware }) {

### User | 2026-06-04T17:40:00.793Z

[tool_result] === host-aware-synthesis-model.mjs EXPORTS ===
27:export const OLLAMA_TAGS_URL =
39:export async function fetchInstalledModels({
87:export async function resolveSynthesisModel({

### User | 2026-06-04T17:40:04.263Z

[tool_result] // tier: T4
// HERMES-EFFICIENCY-ROUTER / U1 (keystone) — Local-LLM task-routing brain.
//
// composes: ollama-cost-router (routeModelForTask) + host-aware-synthesis-model
//   (fetchInstalledModels) + host-class (detectHostClass). It is a COMPOSER, not a
//   new policy — model-tier selection is DELEGATED to routeModelForTask (the
//   canonical, Blackwell-tuned, install-truthful picker), install
... [+9604 chars truncated]

### Assistant | 2026-06-04T17:40:14.356Z

Both exports exist. Now I need to verify the exact signatures and behaviors that the router and tests depend on. Critical checks: (1) `routeModelForTask` return shape `{model, tier, reason}` and its down-walk behavior, (2) `fetchInstalledModels` signature — the router calls it as `fetchModelsFn()` with zero args, but the grep shows it takes a destructured object, (3) whether the cost-router's `CATEGORY_TIER` has the keys the router maps to, and (4) the BLACKWELL model-tag claim — does the cost-router itself hardcode retired tags as routing targets.

### Assistant | 2026-06-04T17:40:16.197Z

[tool_use: Bash]

### Assistant | 2026-06-04T17:40:16.211Z

[tool_use: Bash]

### User | 2026-06-04T17:40:27.134Z

[tool_result] export const TIER_PREFERENCES = Object.freeze({
  cheap: Object.freeze([
    "qwen2.5-coder:1.5b",
    "llama3.2:3b",
    "qwen2.5:3b",
    "phi3:mini",
  ]),
  balanced: Object.freeze([
    // U-BW-RESEARCH-REFINE (2026-06-04): qwen2.5-coder:7b RETIRED (deleted from the
    // Blackwell host — see BLACKWELL-MODEL-UPGRADE-PLAN). The remaining 7B tags are
    // NOT installed on this host, so a bal
... [+9664 chars truncated]

### User | 2026-06-04T17:40:27.238Z

[tool_result] export const OLLAMA_TAGS_URL =
  process.env.PRISM_OLLAMA_TAGS_URL || "http://127.0.0.1:11434/api/tags";

/**
 * Fetch the list of installed Ollama model names from /api/tags.
 * Fail-soft (R12-honest): returns `[]` on ANY failure (Ollama down, timeout,
 * non-2xx, malformed body) so callers degrade to their conservative fallback
 * rather than crashing a synthesis run.
 *
 * @param {{url?:string,
... [+1914 chars truncated]

### Assistant | 2026-06-04T17:40:32.309Z

I now have everything I need to verify each integration claim directly. Let me check a couple of final details: whether the `detectHostClass` named in the header comment is actually imported (the header says it composes it, but the import list only shows two), and confirm the `extract`→`search_synthesis` claim in the codegen test versus the actual category map. Let me also verify the BLACKWELL anti-revert grep claim against the router file.

### Assistant | 2026-06-04T17:40:36.386Z

[tool_use: Bash]

### User | 2026-06-04T17:40:46.764Z

[tool_result] === retired tags in router source (should be ZERO) ===
NONE in source

=== retired tags in router TEST (3b/7b/14b/deepseek-r1) ===
119:    routeModelForTaskFn: () => ({ model: "qwen2.5-coder:7b", tier: "balanced", reason: "stale phantom" }), // deleted model

=== detectHostClass import? ===
5://   (fetchInstalledModels) + host-class (detectHostClass). It is a COMPOSER, not a
8://   fetchInstalledM
... [+774 chars truncated]

### Assistant | 2026-06-04T17:40:52.257Z

I have everything needed for a complete second-pass verdict. Let me run the test suite to confirm it actually passes as the file claims (load-bearing for the "tests verify intent" assessment).

### Assistant | 2026-06-04T17:40:53.048Z

[tool_use: Bash]

### User | 2026-06-04T17:41:02.927Z

[tool_result]   ...
# Subtest: ADVERSARIAL a benign 'speed' mention that is NOT machine feeds/speeds does not false-trigger safety
ok 13 - ADVERSARIAL a benign 'speed' mention that is NOT machine feeds/speeds does not false-trigger safety
  ---
  duration_ms: 0.1557
  ...
# Subtest: fallbackChain always ends in 'claude' (last-resort reviewer) on a local route
ok 14 - fallbackChain always ends in 'claude' (last-
... [+341 chars truncated]

### Assistant | 2026-06-04T17:41:41.925Z

All 15 tests pass. I have verified every integration claim against the actual dependency source. Here is my independent second-pass verdict.

---

## VERDICT: PASS (no P0; one P1, three P2)

The keystone composer is correctly wired, the dependency contracts are real and matched, and the test suite is non-vacuous — the "real composition" tests exercise the actual `routeModelForTask` (not a stub), so a future cost-router regression that broke the down-walk or shifted a tier would turn them red. Safety escalation is asserted with full strength.

### INTEGRATION — verified against source (PASS)

- `routeModelForTask` import path `../../.claude/hooks/lib/ollama-cost-router.mjs` resolves and the export exists (`ollama-cost-router.mjs:142`). The router calls it as `routeModelForTaskFn({ category, available: installed, hardware: host })` — signature exactly matches `{ category, available, hardware }`. Return shape `{ model, tier, reason }` matches what the router consumes (`picked.model`, `picked.tier`, `picked.reason`). Correct.
- `fetchInstalledModels` import path `./host-aware-synthesis-model.mjs` resolves and the export exists (`host-aware-synthesis-model.mjs:39`). **The zero-arg call `await fetchModelsFn()` is safe** — `fetchInstalledModels({ url, timeoutMs, fetchImpl } = {})` defaults the entire options object, so calling with no args is the intended contract (defaults to `127.0.0.1:11434`, 4 s timeout, fail-soft `[]`). The would-be-fatal mismatch the prompt worried about does not exist.
- Category mapping is sound: every value in `CLASS_TO_CATEGORY` (`summary`, `explanation`, `documentation`, `classification`, `format_convert`, `git_summary`, `prism_audit`, `search_synthesis`) is a real key in the cost-router's `CATEGORY_TIER` table. No dead category that would silently fall through to `balanced` unintentionally.
- The codegen test's `category: "search_synthesis"` → `best` route is real: `BLACKWELL_CEILING.search_synthesis = "best"`, and `gpt-oss:120b` leads the `bes
... [+4285 chars truncated]
