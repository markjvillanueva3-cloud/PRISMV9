---
type: "chat-session"
source: "claude-code-cli"
session_id: "b502aa8d-3a90-4735-9eed-98f2a773f4e2"
title: "Independent second-pass review of a PRISM unit that makes the Ollama offload pat"
date: "2026-06-03"
first_ts: "2026-06-03T18:23:28.085Z"
last_ts: "2026-06-03T18:28:38.222Z"
cwd: "H:\\prism"
messages: 34
user_msgs: 13
assistant_msgs: 21
raw_file: "H:/.claude/projects/H--prism/b502aa8d-3a90-4735-9eed-98f2a773f4e2/subagents/agent-ad6860e256999b861.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:22"
---

# Independent second-pass review of a PRISM unit that makes the Ollama offload pat

> **claude-code-cli** | 2026-06-03 | 34 msgs (13 user / 21 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b502aa8d-3a90-4735-9eed-98f2a773f4e2/subagents/agent-ad6860e256999b861.jsonl`

## Transcript

### User | 2026-06-03T18:23:28.085Z

Independent second-pass review of a PRISM unit that makes the Ollama offload path hardware-aware for a new Blackwell GPU. Focus on TEST INTEGRITY, BACK-COMPAT, and FLEET-WIDE-HOOK RISK — do not assume the other reviewer caught everything. Read END-TO-END:

1. H:\prism\.claude\hooks\lib\host-class.test.mjs  (NEW, node:test — 12 tests)
2. H:\prism\.claude\hooks\__tests__\ollama-cost-router.test.mjs  (5 new "blackwell" tests appended; the rest pre-existing)
3. H:\prism\.claude\hooks\lib\host-class.mjs  (the unit under test)
4. H:\prism\.claude\hooks\lib\ollama-cost-router.mjs  (the unit under test)
5. H:\prism\.claude\hooks\ollama-task-offloader.mjs  (LIVE UserPromptSubmit hook — the consumer)

CONTEXT: All 39 node:tests across files 1+2 currently PASS. The cost-router is PURE; the offloader fetches /api/tags and now calls detectHostClass() then passes `hardware` to routeModelForTask. On home_blackwell, balanced-tier categories (summary/explanation/documentation/git_summary/prism_audit/search_synthesis) promote to the strong (14B) tier; cheap categories stay cheap; other hosts unchanged.

VERIFY (flag P0/P1):
1. TEST INTENT (Karpathy R9): each test fails if the behavior breaks — no tautologies. Specifically the back-compat tests ("non-blackwell keeps balanced", "omitting hardware = pre-Blackwell behavior") genuinely lock that the fleet-wide default is unchanged. The promotion tests assert the exact model+tier+reason (incl the "[blackwell:balanced→strong]" suffix) — confirm those reason strings actually match what ollama-cost-router.mjs produces (trace the code path: target-tier hit vs escalated).
2. host-class.test.mjs hermeticity: it injects readFile/fileExists/host/env so it never touches the real disk/hostname. Confirm the corrupt-JSON and missing-file cases assert null (degradation, not throw). Confirm the case-insensitive-host test is meaningful.
3. BACK-COMPAT proof: is there any host value (undefined, null, "", "cloud_only", "work_3080", "home_4080") for which r
... [+692 chars truncated]

### Assistant | 2026-06-03T18:23:41.375Z

I'll review this Blackwell GPU hardware-aware Ollama offload unit end-to-end. Let me read all five files.

### Assistant | 2026-06-03T18:23:41.750Z

[tool_use: Read]

### Assistant | 2026-06-03T18:23:42.728Z

[tool_use: Read]

### Assistant | 2026-06-03T18:23:43.156Z

[tool_use: Read]

### Assistant | 2026-06-03T18:23:43.623Z

[tool_use: Read]

### Assistant | 2026-06-03T18:23:43.785Z

[tool_use: Read]

### User | 2026-06-03T18:23:54.507Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\lib\host-class.mjs' was already read 27s ago in this session and is unchanged (mtime 1780510458296). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-03T18:24:02.590Z

[tool_result] 1	// tier: T4
2	// Tests for .claude/hooks/lib/host-class.mjs (BLACKWELL-TOKEN-SYNERGY-MS0/U-BW-HW-DETECT).
3	//
4	// Uses node:test (vite-bug-immune in this repo — see ollama-cost-router.test.mjs).
5	// All IO is injected (env / host / readFile / fileExists) so the resolver is
6	// exercised without touching disk or the real hostname.
7	//
8	// Run: node --test H:/prism/.claude/hooks/lib/host-cla
... [+4378 chars truncated]

### User | 2026-06-03T18:24:04.510Z

[tool_result] 1	// tier: T4
2	// Tests for .claude/hooks/lib/ollama-cost-router.mjs (U-P4-OLLAMA-COST-ROUTING).
3	//
4	// Uses node:test (vite-bug-immune) — the `.claude/helpers/vitest.config.mjs`
5	// import of `vitest/config` is currently failing to resolve in this repo
6	// (documented in [[reference_fleet_reaper_ms1]]). Behaviour is identical to
7	// the equivalent vitest spec.
8	//
9	// Run: node --test H:
... [+13125 chars truncated]

### User | 2026-06-03T18:24:06.038Z

[tool_result] 1	// tier: T4
2	// SYSTEM-VIZ-BRAIN-MS0/U-P4-OLLAMA-COST-ROUTING — Cost-aware Ollama model selection
3	//
4	// Replaces hardcoded "first-of-preference-list" model selection with a
5	// category → tier → model decision. Smaller / faster models for trivial
6	// tasks (classify, format-convert, prism-inventory); larger / more
7	// capable models for complex codegen / multi-step reasoning.
8	//
9	// C
... [+6226 chars truncated]

### User | 2026-06-03T18:24:06.535Z

[tool_result] 1	// tier: T4
2	// NOTE: no shebang. The hook runs via explicit `node X.mjs` in the harness's
3	// UserPromptSubmit chain — never chmod+x. vite's SSR transform does not strip
4	// a line-1 `#!` and injects its preamble above, stranding the `#!` mid-file
5	// and breaking vitest's import of this file. Removing it is the cleanest fix.
6	/**
7	 * ollama-task-offloader.mjs — UserPromptSubmit hook
8	 *
... [+32363 chars truncated]

### Assistant | 2026-06-03T18:24:14.506Z

I have files 1, 2, 4, and 5. The read-once guard blocked file 3 (host-class.mjs) because it was read earlier in this session. Let me retrieve it — I need the actual source to verify the test claims and the offloader's `detectHostClass()` call signature.

### Assistant | 2026-06-03T18:24:15.252Z

[tool_use: Bash]

### User | 2026-06-03T18:25:22.964Z

[tool_result] // tier: T4
// BLACKWELL-TOKEN-SYNERGY-MS0/U-BW-HW-DETECT — detect THIS host's GPU class
// for hardware-aware local-model routing.
//
// Bridges golf's hostname-keyed `fleet-reaper-host-presets.json`
// (label: "blackwell" | "home" | "work") to the ModelRoutingEngine
// HardwareProfile vocabulary ("home_blackwell" | "home_4080" | "work_3080" |
// "cloud_only") so any offload hook can pick a model
... [+2485 chars truncated]

### Assistant | 2026-06-03T18:25:27.339Z

I now have all five files. Let me trace the dependency `getPresetForHost`/`loadPresetFile` to confirm the case-insensitivity claim and corrupt-JSON degradation are actually backed by the underlying golf reader, since the host-class tests inject through it.

### Assistant | 2026-06-03T18:25:27.714Z

[tool_use: Read]

### User | 2026-06-03T18:25:33.076Z

[tool_result] read-once-guard: 'H:\prism\.claude\helpers\fleet-reaper-host-presets.mjs' was already read 13m ago in this session and is unchanged (mtime 1780503604823). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE
... [+3 chars truncated]

### Assistant | 2026-06-03T18:25:40.342Z

The guard says it's already in my context from earlier this session. Let me retrieve the two key functions to verify the case-insensitivity and corrupt-JSON claims.

### Assistant | 2026-06-03T18:25:40.344Z

[tool_use: Bash]

### User | 2026-06-03T18:26:02.549Z

[tool_result] 77:export function loadPresetFile(opts = {}) {
78-  const path = opts.path || PRESETS_PATH;
79-  const readFile = opts.readFile || ((p) => readFileSync(p, "utf8"));
80-  const fileExists = opts.fileExists || existsSync;
81-  if (!fileExists(path)) return { presets: {}, advisoryReason: "file-missing" };
82-  try {
83-    const doc = JSON.parse(readFile(path));
84-    if (!doc || typeof doc !== "obj
... [+1798 chars truncated]

### Assistant | 2026-06-03T18:26:09.025Z

This confirms the critical claim #1 (`SCHEMA_VERSION` check). The host-class tests inject `JSON.stringify({ schemaVersion: 1, presets })` — I need to verify `SCHEMA_VERSION === 1` so the tests don't silently degrade to empty presets (which would make several tests pass for the WRONG reason — a tautology). Let me check.

### Assistant | 2026-06-03T18:26:10.657Z

[tool_use: Bash]

### User | 2026-06-03T18:26:39.044Z

[tool_result] 28:export const PRESETS_PATH = "H:/prism/state/shared/dashboards/fleet-reaper-host-presets.json";
29:export const SCHEMA_VERSION = 1;
30:export const ALLOWED_ENV_PREFIX = "PRISM_FLEET_REAPER_";
78:  const path = opts.path || PRESETS_PATH;
85:    if (doc.schemaVersion !== SCHEMA_VERSION) {
86:      return { presets: {}, advisoryReason: `schema-mismatch (have=${doc.schemaVersion}, want=${SCHEMA_VERS
... [+319 chars truncated]

### Assistant | 2026-06-03T18:26:44.204Z

`SCHEMA_VERSION === 1` confirmed. The test fixtures stamp `schemaVersion: 1`, so the injected presets pass the schema gate and reach the real lookup logic — the tests are NOT silently passing on an empty preset set. Now I'll run both test files to confirm the 39/39 PASS claim, then complete the verification.

### Assistant | 2026-06-03T18:26:44.865Z

[tool_use: Bash]

### User | 2026-06-03T18:26:54.477Z

[tool_result]   ...
# Subtest: corrupt preset JSON degrades to null, does not throw
ok 37 - corrupt preset JSON degrades to null, does not throw
  ---
  duration_ms: 0.4867
  ...
# Subtest: VALID_PROFILES is the ModelRoutingEngine HardwareProfile vocabulary
ok 38 - VALID_PROFILES is the ModelRoutingEngine HardwareProfile vocabulary
  ---
  duration_ms: 1.2662
  ...
# Subtest: LABEL_TO_PROFILE maps every golf la
... [+227 chars truncated]

### Assistant | 2026-06-03T18:27:16.622Z

39/39 PASS confirmed. Now let me trace the two most critical assertions in detail, since the brief asks me to confirm the exact reason strings match the code path.

**Reason-string trace for the two promotion tests:**

Test at line 262 (`summary` + blackwell, has 7b/14b/32b): `requestedTier` = "balanced" → promoted to "strong", `blackwellPromoted=true`, `promo=" [blackwell:balanced→strong]"`. `startIdx = TIER_ORDER.indexOf("strong") = 2`. Loop starts at i=2 (strong); `qwen2.5-coder:14b` is first in strong prefs and is available → returns at `i===startIdx`, so `reason = "target tier" + promo = "target tier [blackwell:balanced→strong]"`. Matches the test exactly. ✓

Test at line 306 (`explanation` + blackwell, only 32b): promoted to "strong", `startIdx=2`. i=2 (strong): no strong model available. i=3 (best): `qwen2.5-coder:32b` available → `i !== startIdx`, `reason = "escalated strong → best" + promo`. But note `requestedTier` is now "strong" (it was reassigned at line 116), so the template renders `escalated strong → best`. Matches `"escalated strong → best [blackwell:balanced→strong]"`. ✓

This is a subtle point worth flagging: the escalation message uses the **promoted** `requestedTier` ("strong"), not the original ("balanced"). The promo suffix records the true origin, so the combined string is unambiguous — but the two parts could appear contradictory to a casual dashboard reader ("escalated strong → best" yet origin was balanced). This is cosmetic/audit-only, not a behavioral bug. P2 at most.

Now the back-compat divergence proof. Let me enumerate every non-blackwell `hardware` value through the code path:

The ONLY code that reads `hardware` is line 115: `if (hardware === "home_blackwell" && requestedTier === "balanced")`. For any value `!== "home_blackwell"` (`undefined`, `null`, `""`, `"cloud_only"`, `"work_3080"`, `"home_4080"`, garbage), the condition is false → `blackwellPromoted` stays false → `promo` is `""` → identical to pre-Blackwell. Strict `===` mea
... [+1599 chars truncated]

### Assistant | 2026-06-03T18:27:21.752Z

[tool_use: Bash]

### User | 2026-06-03T18:27:32.296Z

[tool_result] unknown+blackwell: {"model":"qwen2.5-coder:14b","tier":"strong","reason":"target tier [blackwell:balanced→strong]"}
undefined-cat+blackwell: {"model":"qwen2.5-coder:14b","tier":"strong","reason":"target tier [blackwell:balanced→strong]"}
blackwell promoted, only cheap avail: {"model":"qwen2.5-coder:1.5b","tier":"fallback","reason":"no preferred model in any tier [blackwell:balanced→strong]"}
black
... [+146 chars truncated]

### Assistant | 2026-06-03T18:27:56.665Z

These probes surface the most important coverage gap. Let me analyze the last two results carefully — they reveal a real behavioral regression on Blackwell.

**The `blackwell promoted, only 7b avail` case is a P1 back-compat / quality regression.**

Trace it: `category: "summary"`, `available: ["qwen2.5-coder:7b"]`, `hardware: "home_blackwell"`.
- Base tier = balanced → promoted to **strong**, `startIdx=2`.
- Loop i=2 (strong): no strong model. i=3 (best): no best model. Loop exhausts.
- Falls to line 148: `{ model: av[0]="qwen2.5-coder:7b", tier: "fallback", reason: "no preferred model in any tier [blackwell:balanced→strong]" }`.

Compare to the **non-blackwell** path (same inputs, `hardware` omitted): base tier balanced, `startIdx=1`. Loop i=1 (balanced): `qwen2.5-coder:7b` is available → returns `{ model: "qwen2.5-coder:7b", tier: "balanced", reason: "target tier" }`.

So on a Blackwell host that happens to have **only the 7b model pulled** (a plausible transient state — e.g. mid-`ollama pull` of the 14b, or before U-BW-CATALOG-REALIGN finishes), the promotion makes the router **skip the perfectly-good balanced 7b it would have used** and brand the result `tier: "fallback"`. The model returned is identical (7b), but:
1. The `tier` flips from `"balanced"` (a clean target hit) to `"fallback"` — which the dashboard interprets as "the host did NOT hold the model the task wanted." That telemetry is now misleading: the host DID hold a fine balanced model; the router chose to step over it because of the promotion, then reported a tier-miss.
2. The promotion's stated rationale ("the 14B is free with headroom") does not hold when the 14B isn't installed — yet the promotion still fires and degrades the audit signal.

This is a genuine divergence on `home_blackwell` beyond the intended "promote balanced→strong when the strong model is present." The promotion is **unconditional on tier, not conditional on the strong model being available**. The router never de-escalates, so 
... [+568 chars truncated]

### Assistant | 2026-06-03T18:27:56.666Z

[tool_use: Grep]

### User | 2026-06-03T18:28:03.799Z

[tool_result] 519:  const model = route.model;
528:    modelTier: route.tier,
529:    modelReason: route.reason,

### Assistant | 2026-06-03T18:28:38.222Z

Confirmed blast radius: `route.tier`/`route.reason` are used **only for telemetry** (`modelTier`/`modelReason` in `costExtras`). `route.model` is what the user actually gets. So the "only 7b on Blackwell" case returns the same 7b model — the regression is confined to **misleading telemetry** (`tier: "fallback"` instead of `"balanced"`), not a wrong model served. That downgrades it from a model-selection bug to a telemetry-integrity issue. Still a real divergence on `home_blackwell` vs the omitted-hardware path, and worth flagging because the dashboard's whole purpose (per the code comments) is to "audit whether the host actually held the model the task wanted."

I have everything needed. Final assessment.

---

## Review: BLACKWELL-TOKEN-SYNERGY-MS0 / U-BW-OFFLOAD-TIER + U-BW-HW-DETECT (independent second pass)

**Scope verified:** all 5 files end-to-end; 39/39 node:tests re-run green locally; dependency `fleet-reaper-host-presets.mjs` (`SCHEMA_VERSION=1`, `getPresetForHost` case-insensitivity) traced; 4 untested edge cases probed live.

### P0 — none
No fleet-wide regression in **model selection**. Verified every non-blackwell `hardware` value (`undefined`, `null`, `""`, `"cloud_only"`, `"work_3080"`, `"home_4080"`, garbage) hits the same `===` guard at `ollama-cost-router.mjs:115` → `blackwellPromoted=false` → byte-identical output to pre-Blackwell. The offloader passes `hardware: detectHostClass()` which returns `null` on every non-Blackwell host, and `null !== "home_blackwell"` is handled identically to `undefined`. Claim #3 and #5 confirmed clean.

### P1 — Blackwell promotion is unconditional on tier, not conditional on the strong model being installed
`ollama-cost-router.mjs:115-118` + fallback at `:148`. On a `home_blackwell` host that holds **only `qwen2.5-coder:7b`** (no 14b/32b), a balanced task is promoted to `strong`, both strong and best tiers come up empty, and it lands in the last-resort fallback:
- Blackwell: `{ model: "qwen2.5-coder:7b", tier: "fal
... [+3523 chars truncated]
