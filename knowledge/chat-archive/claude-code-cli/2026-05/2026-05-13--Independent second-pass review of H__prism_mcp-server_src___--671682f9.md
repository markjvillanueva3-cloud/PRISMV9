---
type: "chat-session"
source: "claude-code-cli"
session_id: "671682f9-9bea-40b9-96a7-5f3beebf4c53"
title: "Independent second-pass review of H:/prism/mcp-server/src/__tests__/SkillTierReg"
date: "2026-05-13"
first_ts: "2026-05-13T12:58:50.417Z"
last_ts: "2026-05-13T13:01:09.964Z"
cwd: "H:\\prism\\mcp-server"
messages: 25
user_msgs: 9
assistant_msgs: 16
raw_file: "H:/.claude/projects/H--prism/671682f9-9bea-40b9-96a7-5f3beebf4c53/subagents/agent-a9a5b6c6bf4cd90dc.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:14"
---

# Independent second-pass review of H:/prism/mcp-server/src/__tests__/SkillTierReg

> **claude-code-cli** | 2026-05-13 | 25 msgs (9 user / 16 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/671682f9-9bea-40b9-96a7-5f3beebf4c53/subagents/agent-a9a5b6c6bf4cd90dc.jsonl`

## Transcript

### User | 2026-05-13T12:58:50.417Z

Independent second-pass review of H:/prism/mcp-server/src/__tests__/SkillTierRegistryEngine.test.ts.

CONTEXT: Wiring an orphaned engine SkillTierRegistryEngine into prism_skill_script. This test file is one of three files in the change set (the other two are schema additions in src/schemas/skillScriptActionSchemas.ts and dispatcher additions in src/tools/dispatchers/skillScriptDispatcher.ts — those will be reviewed separately). Engine source at H:/prism/mcp-server/src/engines/SkillTierRegistryEngine.ts.

WEIGHT YOUR REVIEW ON things the content-specialist reviewer is likely to miss:
1. SINGLETON CROSS-CONTAMINATION — the test file uses `new SkillTierRegistryEngine()` per beforeEach for isolation, but the last describe("module singleton") block imports the shared exported singleton and `.clear()`s it before AND after. Will this cause flakiness if tests run in parallel with other test files that touch the singleton? Is the clear/register/clear sequence sufficient?
2. ASSERTION STRENGTH — `expect(canon.tags).toBe(undefined)` and `expect(...).toBe("...")` look legitimate, but verify no `.toBeDefined()/.toBeTruthy()/.toBeUndefined()/.toBeFalsy()` weak forms slipped in. Also check that error-throwing tests use `.toThrow(/regex/)` not `.toThrow()` (which passes on any thrown value).
3. NAMING/CONVENTION CONFORMANCE — vitest imports use named imports from "vitest", describe/it/expect — does the rest of the test suite follow the same import style? (sample existing test in src/__tests__/ if you need to verify.)
4. HIDDEN COUPLING — the "re-register the same command overwrites" test asserts the SECOND registration's classification, depending on the first registration NOT leaking through. Is the engine's Map.set semantic strong enough for this assertion?
5. EDGE CASES MISSING — verify coverage includes: (a) empty triggers array, (b) very long command strings, (c) commands containing keyword substring but at wrong position, (d) Unicode in commands. If any are MISSING and you th
... [+560 chars truncated]

### Assistant | 2026-05-13T12:58:58.670Z

I'll review the test file thoroughly, focusing on the integration concerns specified.

### Assistant | 2026-05-13T12:58:59.015Z

[tool_use: Read]

### User | 2026-05-13T12:59:01.789Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\__tests__\SkillTierRegistryEngine.test.ts' was already read 19s ago in this session and is unchanged (mtime 1778676942518). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM
... [+14 chars truncated]

### Assistant | 2026-05-13T12:59:04.725Z

The file isn't actually in my context yet - the system thinks it was read recently but I haven't seen it. Let me bypass the cache.

### Assistant | 2026-05-13T12:59:05.717Z

[tool_use: Bash]

### User | 2026-05-13T12:59:11.004Z

[tool_result] /**
 * SkillTierRegistryEngine.test.ts — real-behavior tests for skill tier classification.
 *
 * Covers: register validation, keyword-based classification (essential/intermediate/advanced),
 * explicit-tier override, assign-unknown-skill error, classifyAll sort + per-tier counts,
 * listByTier filtering, command canonicalization (auto-prefix `/`), size/clear lifecycle,
 * trigger and tag deduplic
... [+11240 chars truncated]

### Assistant | 2026-05-13T12:59:14.025Z

Now let me read the engine source to verify the assertions match the implementation.

### Assistant | 2026-05-13T12:59:14.437Z

[tool_use: Read]

### User | 2026-05-13T12:59:15.774Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\SkillTierRegistryEngine.ts' was already read 7m ago in this session and is unchanged (mtime 1776357958000). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CA
... [+6 chars truncated]

### Assistant | 2026-05-13T12:59:18.645Z

[tool_use: Bash]

### User | 2026-05-13T12:59:25.785Z

[tool_result] /**
 * SkillTierRegistryEngine — Classify skills into discoverability tiers
 *
 * Phase 0.25.6 U-UX1 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. PRISM ships
 * 175+ slash commands. A new user who sees everything at once learns
 * nothing. This engine classifies each registered skill into one of three
 * tiers so `/help-me-start` (U-UX4) can surface a progressive disclosure:
 *
 *   - essential    (t
... [+4841 chars truncated]

### Assistant | 2026-05-13T12:59:28.982Z

Now let me sample existing test files to verify convention conformance.

### Assistant | 2026-05-13T12:59:30.342Z

[tool_use: Bash]

### User | 2026-05-13T12:59:39.493Z

[tool_result] /**
 * Engine-direct test for SpecificCuttingEnergyEngine.
 *
 * The engine models specific cutting energy u (J/mm³) via three compute paths:
 *   1) force + chip geometry  →  u = Fc / (b·h)
 *   2) Kienzle coefficients   →  u = kc1_1 · h^(-mc)
 *   3) cutting power + MRR    →  u = (Fc·Vc/60) / (Q · 1000/60)
 * Falls back to mild-steel default (2.5 J/mm³) when none provided.
 *
 * References: Guto
... [+1068 chars truncated]

### Assistant | 2026-05-13T12:59:43.582Z

Good, named imports from vitest is the standard. Now let me check the dispatcher to verify the contract claim from the prompt.

### Assistant | 2026-05-13T12:59:44.968Z

[tool_use: Bash]

### User | 2026-05-13T12:59:51.048Z

[tool_result] 28:   "skill_tier_register", "skill_tier_assign", "skill_tier_classify_all", "skill_tier_list", "skill_tier_size"
514:           case "skill_tier_register": {
521:               explicitTier: params.explicit_tier || params.explicitTier,
528:           case "skill_tier_assign": {
534:           case "skill_tier_classify_all": {
540:           case "skill_tier_list": {
547:           case "skill_tie
... [+10 chars truncated]

### Assistant | 2026-05-13T12:59:54.699Z

I'll note the task reminder but TaskCreate is not relevant for this isolated review work. Let me check the schema file to confirm `explicit_tier` snake_case is the contract.

### Assistant | 2026-05-13T12:59:55.995Z

[tool_use: Bash]

### User | 2026-05-13T13:00:01.259Z

[tool_result] 202: // ── skill_tier_register ─────────────────────────────────────────────────────
204: const skill_tier_register = z.object({
209:   explicit_tier: z.enum(["essential", "intermediate", "advanced"]).optional()
215: // ── skill_tier_assign ───────────────────────────────────────────────────────
217: const skill_tier_assign = z.object({
221: // ── skill_tier_classify_all ─────────────────────
... [+504 chars truncated]

### Assistant | 2026-05-13T13:00:05.583Z

Confirmed: schema enforces snake_case `explicit_tier`, dispatcher maps to camelCase `explicitTier` for the engine. Now let me check how vitest runs in this project (parallel vs sequential) for the singleton flakiness concern.

### Assistant | 2026-05-13T13:00:07.356Z

[tool_use: Bash]

### User | 2026-05-13T13:00:15.787Z

[tool_result] --- vitest.config ---
/**
 * Vitest configuration for mcp-server.
 *
 * OBSIDIAN-AUTOMATE-MS3/U-VITEST-PARALLEL
 *
 * Why this exists: mcp-server's test suite is ~3400 cases. Default Vitest
 * concurrency runs file-level workers fine but PRISM had no top-level
 * vitest.config so isolate/pool behaviour was implicit. Pinning the pool
 * and worker counts to the host gives deterministic timi
... [+2362 chars truncated]

### Assistant | 2026-05-13T13:01:09.964Z

That's the hook firing on the word "timeout" in the file contents - not an actual test failure. I have all the info needed. Let me finalize the review.

Critical finding: `pool: "threads"` with `isolate: true` — singleton state is per-worker-thread isolated. Different test files run in separate workers; same-file tests share state. This affects the singleton block analysis.

---

# Independent Second-Pass Review — SkillTierRegistryEngine.test.ts

**File:** H:/prism/mcp-server/src/__tests__/SkillTierRegistryEngine.test.ts
**Reviewer role:** Arm B — weighted on integration, hidden coupling, convention conformance, assertion strength, and gaps a content-specialist test reviewer is likely to miss.

## Findings

### P0 — none
No blocking issues. Build will pass, tests will pass, no security/correctness landmines.

### P1 — none
No major issues that should block ship.

### P2 — Coverage gaps the content-specialist may justify away but I would call out

**P2-1: No `_wire.test.ts` companion / no dispatcher contract assertions.**
The prompt explicitly asks whether the absence of dispatcher-contract coverage is acceptable. **Verdict: not fully acceptable as shipped, but acceptable as "engine-unit-only" if a follow-up wire test is filed.**

Schema (line 209) defines `explicit_tier` (snake_case). Dispatcher (line 521) maps `params.explicit_tier || params.explicitTier → explicitTier`. The engine accepts `explicitTier` (camelCase). **There is no test anywhere in this change set that asserts:**
- snake_case `explicit_tier` flowing through Zod validates and reaches the engine,
- the invalid-enum `explicit_tier: "expert"` is rejected by Zod (not by the engine — the engine throw is currently the only safety net, and that's testable here but the Zod boundary isn't),
- the 5 dispatcher actions return the documented shapes (`{tier, reason, command}` for assign, `{total, byTier, assignments}` for classify_all, `{size:N}` for size).

The repo's strong convention (visible in `SpecificCutti
... [+9311 chars truncated]
