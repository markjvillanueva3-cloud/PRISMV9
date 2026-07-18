---
type: "chat-session"
source: "claude-code-cli"
session_id: "7979e425-2dbf-471a-ad68-c7177d2219a4"
title: "Tight focused review of recent additions to `H:/prism/scripts/lib/zebra-context-"
date: "2026-05-25"
first_ts: "2026-05-25T20:53:09.136Z"
last_ts: "2026-05-25T20:58:44.718Z"
cwd: "H:\\prism"
messages: 40
user_msgs: 16
assistant_msgs: 24
raw_file: "H:/.claude/projects/H--prism/7979e425-2dbf-471a-ad68-c7177d2219a4/subagents/agent-ab4d4687ce74c854a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:15"
---

# Tight focused review of recent additions to `H:/prism/scripts/lib/zebra-context-

> **claude-code-cli** | 2026-05-25 | 40 msgs (16 user / 24 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/7979e425-2dbf-471a-ad68-c7177d2219a4/subagents/agent-ab4d4687ce74c854a.jsonl`

## Transcript

### User | 2026-05-25T20:53:09.136Z

Tight focused review of recent additions to `H:/prism/scripts/lib/zebra-context-bundle.mjs` — ZEBRA-OMNISCIENT-MS0 units U-ZO-MS0-05 + U-ZO-MS0-06.

Added (after existing U-ZO-MS0-01/02/03/04 readers):
- **U-ZO-MS0-05** `loadTokenAwarenessZone(slot, opts)` + `parseTokenBudget(json)` + `KNOWN_TOKEN_BUDGET_SCHEMA_VERSIONS` — reads `state/shared/token-budget-<slot>.json` (per-slot file written by `.claude/hooks/token-awareness-sidecar.mjs` TOKEN-AWARENESS-MS0). Returns zone (GREEN/YELLOW/RED/CRITICAL/UNKNOWN), worstPct, worstSource, ctx fields. Same pattern as 02/03/04: KNOWN_SLOTS path-traversal defense, slot:null on invalid, disable-env check at top, schemaVersion allowlist.
- **U-ZO-MS0-06** `loadSlotContext(slot, opts)` + `deriveZebraDecision({soul, loop, tokenZone, bridgeUnits})` + `bundleSurface(env)` — the COMPOSITE/integration unit. Calls all 5 readers, returns bundle + per-surface envelope + `decision` (recommend/suppressCompact/allowedSuggestions). Pure decision derivation: missing soul → noop+suppress, loop running → suppress (mid-loop /compact bug fix), token GREEN → suppress, token RED/CRITICAL → recommend compact, soul refuse_list post-filters allowedSuggestions.

Test coverage: 128/128 PASS (29 new tests added on top of existing 99).

Acceptance criteria (per ZEBRA-OMNISCIENT-MS0-PLAN §7):
1. Tests pin: loop-state-running suppresses /compact ✓
2. Soul refuse_list filters allowedSuggestions ✓
3. Token-zone overrides G3 coarse wait ✓
4. Composite is fail-soft on every surface (any one missing → degrade to legacy boolean path, never throw) ✓
5. Per-file scrutiny gate per CLAUDE.md §PER-FILE SCRUTINY GATE

Critical contract checks:
1. `loadTokenAwarenessZone("../etc/passwd")` returns `slot:null` not reflected ✓
2. `loadSlotContext` honors `PRISM_ZEBRA_CONTEXT_DISABLE=1` BEFORE slot validation ✓
3. `deriveZebraDecision({soul: {ok: false}})` returns `{recommend:"noop", suppressCompact:true, rationale:"no-soul"}` — soul is hard-constraint
4. `deriveZebraDecisio
... [+785 chars truncated]

### Assistant | 2026-05-25T20:53:21.865Z

I'll perform a thorough code review of the recent additions to `zebra-context-bundle.mjs`. Let me start by reading the file end-to-end.

### Assistant | 2026-05-25T20:53:22.478Z

[tool_use: Read]

### User | 2026-05-25T20:53:28.145Z

[tool_result] 1	// ZEBRA-OMNISCIENT-MS0/U-ZO-MS0-01 — CLAUDE-BRIEF + PRISM-BUILD-VISION reader
2	// with mtime-keyed cache layer for the Zebra orchestrator sweep.
3	//
4	// Purpose: ONE place that reads the 2 highest-leverage goal-anchor files
5	// (CLAUDE-BRIEF.md — what we have, PRISM-BUILD-VISION.md — what we're trying
6	// to build) so the Zebra orchestrator's `planSlotAction` can make
7	// goal-aware decis
... [+49239 chars truncated]

### Assistant | 2026-05-25T20:53:33.122Z

Now let me look at the test file to understand the assertions made against this code:

### Assistant | 2026-05-25T20:53:33.703Z

[tool_use: Glob]

### User | 2026-05-25T20:53:59.968Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-05-25T20:54:04.509Z

[tool_use: Glob]

### User | 2026-05-25T20:54:08.984Z

[tool_result] scripts\lib\zebra-context-bundle.test.mjs

### Assistant | 2026-05-25T20:54:12.857Z

[tool_use: Read]

### User | 2026-05-25T20:54:19.011Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-1099 of 1336 total (25811 tokens, cap 25000). Call Read with offset=1100 limit=1099 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	// ZEBRA-OMNISCIENT-MS0/U-ZO-MS0-01 — tests for the CLAUDE-BRIEF + BUILD-VISION
2	// reader. Hermetic 
... [+49637 chars truncated]

### Assistant | 2026-05-25T20:54:24.547Z

Acknowledged. Let me read the remaining test sections that cover U-ZO-MS0-05 and U-ZO-MS0-06 specifically.

### Assistant | 2026-05-25T20:54:25.721Z

[tool_use: Read]

### User | 2026-05-25T20:54:35.446Z

[tool_result] 1100	  it("non-NATO slot rejected", () => {
1101	    for (const bad of ["", null, undefined, 42, "alphax"]) {
1102	      const env = loadTokenAwarenessZone(bad);
1103	      assert.equal(env.reason, "invalid-slot", `slot=${String(bad)}`);
1104	    }
1105	  });
1106	  it("missing sidecar → missing reason", () => {
1107	    const reader = makeReader({});
1108	    const env = loadTokenAwarenessZone("b
... [+11611 chars truncated]

### Assistant | 2026-05-25T20:54:46.330Z

Now I have the full picture. Let me also verify a couple of cross-cutting concerns by checking the writer that produces `token-budget-<slot>.json` files to validate the schema assumption, then check the `bundleSurface` export discrepancy mentioned in the request.

### Assistant | 2026-05-25T20:54:47.542Z

[tool_use: Bash]

### User | 2026-05-25T20:54:59.396Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
7 matches in 7 files:

943:0:bundleSurface(brief),
944:0:bundleSurface(vision),
945:0:bundleSurface(bridgeUnits),
946:0:bundleSurface(soul),
947:0:bundleSurface(loop),
948:0:bundleSurface(tokenZone),
scripts/lib/zebra-context-bundle.mjs:856:function bundleSurface(surfaceEnv) {

### Assistant | 2026-05-25T20:55:15.671Z

Tasks are already tracked. Let me also check the user request claim that `bundleSurface` should be safe with null — the implementation uses optional chaining (`surfaceEnv?.ok === true`) which IS safe. But the user's contract check #6 expects `bundleSurface(null)` to return `{ok:false, reason:null, stale:false, mtime:null}`. Let me verify the current implementation does this — looking at lines 856-863, it does. Good.

Let me also check the token-awareness sidecar writer to validate the schema field assumption:

### Assistant | 2026-05-25T20:55:16.280Z

[tool_use: Bash]

### User | 2026-05-25T20:55:30.164Z

[tool_result] /usr/bin/bash: line 1: $null: ambiguous redirect

### Assistant | 2026-05-25T20:55:35.745Z

[tool_use: Grep]

### User | 2026-05-25T20:55:42.422Z

[tool_result] No matches found

### Assistant | 2026-05-25T20:55:48.260Z

No matches — the sidecar may use different field names. Let me check the actual file structure directly:

### Assistant | 2026-05-25T20:55:48.722Z

[tool_use: Glob]

### User | 2026-05-25T20:55:53.414Z

[tool_result] .claude\hooks\__tests__\token-awareness-sidecar.test.mjs
.claude\hooks\token-awareness-sidecar.mjs

### Assistant | 2026-05-25T20:55:58.302Z

[tool_use: Grep]

### User | 2026-05-25T20:56:02.862Z

[tool_result] No matches found

### Assistant | 2026-05-25T20:56:08.304Z

[tool_use: Grep]

### User | 2026-05-25T20:56:18.114Z

[tool_result] No matches found

### Assistant | 2026-05-25T20:56:25.169Z

[tool_use: Grep]

### User | 2026-05-25T20:56:38.018Z

[tool_result] 6:// from 4 data sources and writes it to state/shared/token-budget-<slot>.json
236:  const outFile = path.join(SIDECAR_DIR, `token-budget-${slot}.json`);

### Assistant | 2026-05-25T20:56:47.288Z

Good — the sidecar writes to the path the reader expects. Let me check what fields it actually writes for the schema concern:

### Assistant | 2026-05-25T20:56:48.372Z

[tool_use: Read]

### User | 2026-05-25T20:56:53.836Z

[tool_result] 200	  const rateLimits = extractRateLimits(cc);
201	
202	  // Source 3: transcript dedup-cumulative — from the SAME tail read above.
203	  let transcript = null;
204	  if (transcriptPath) {
205	    try {
206	      const a = analyzeTranscriptFromText(tail);
207	      transcript = {
208	        input: a.input,
209	        cache_read: a.cache_read,
210	        cache_creation: a.cache_creation,
211	  
... [+979 chars truncated]

### Assistant | 2026-05-25T20:57:00.630Z

I see — the sidecar uses `mergeFromSources` to build state but doesn't set `schemaVersion` here. Let me find the merge function to verify field assumptions:

### Assistant | 2026-05-25T20:57:02.102Z

[tool_use: Grep]

### User | 2026-05-25T20:57:09.051Z

[tool_result] Found 3 files
.claude\hooks\__tests__\token-awareness-sidecar.test.mjs
.claude\hooks\token-awareness-stop-advisory.mjs
.claude\hooks\__tests__\token-awareness-inject.test.mjs

### Assistant | 2026-05-25T20:57:16.560Z

[tool_use: Grep]

### User | 2026-05-25T20:57:22.952Z

[tool_result] 67-function appendAgentChat(slot, advisory, sessionId, nowIso) {
68-  const event = {
69:    schemaVersion: "1.0.0",
70-    timestamp: nowIso,
71-    from: `token-awareness-stop:${slot}`,

### Assistant | 2026-05-25T20:58:44.718Z

That's the AGENT_CHAT advisory, not the budget file. The actual budget sidecar may NOT include `schemaVersion` — the reader's allowlist gates on `json.schemaVersion !== undefined`, so a sidecar without it would parse fine via the back-compat branch. Acceptable.

I now have enough context. Let me deliver the review.

---

# Code Review — `H:/prism/scripts/lib/zebra-context-bundle.mjs` U-ZO-MS0-05 + U-ZO-MS0-06

## Verdict: PASS WITH 4 P1 + 3 P2 + 2 P3 FINDINGS

Both units satisfy their acceptance criteria. Code is well-structured, fail-soft on every surface, and the safety hierarchy (soul > loop > token-zone) is correctly implemented. The 6 explicit contract checks in your request all pass. Findings below are tightening recommendations, NOT blockers — none falsify the test claims.

---

## P0 (none)
No critical defects. The hard-constraint enforcement (`soul.ok` gate at L973, `loop.running` gate at L981 returns BEFORE token-zone evaluation), the path-traversal slot defense (L775, L792-794), the proto-pollution guard (L98-101 dropping `__proto__`/`constructor`/`prototype` keys), and the disable-env short-circuit ordering (L763, L884) are all correct.

---

## P1 (4 findings)

### P1-1 — `tokenZone.stale=true` does NOT downgrade RED/CRITICAL recommendation (`deriveZebraDecision` L994-1002)
**Lines:** 994-1002 (`zebra-context-bundle.mjs`)

If the sidecar wrote `zone:"CRITICAL"` 200s ago but the writer thread died (sidecar's own `stale:true` is then propagated via `loadTokenAwarenessZone` line 831), the decision still says `recommend:"compact"` with no caveat. A truly-dead sidecar could pin a slot in "always compact" forever based on a stale RED reading. Per the file comment at L716 ("stale (>180s default per TOKEN-AWARENESS-MS0) → ok:true with stale:true so caller can degrade"), the *caller* (this derive fn) is the one supposed to degrade — but it doesn't.

**Fix:** in the token-zone branch, if `tokenZone.stale === true`, demote `compact` → `noop` with rationale `token-
... [+9546 chars truncated]
