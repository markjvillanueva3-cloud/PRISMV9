---
type: "chat-session"
source: "claude-code-cli"
session_id: "672ceaa6-621b-4191-94de-3323e96f3faf"
title: "Adversarial regression/silent-breakage analysis. Read fully, grade PASS/FAIL wit"
date: "2026-06-26"
first_ts: "2026-06-26T01:01:50.320Z"
last_ts: "2026-06-26T01:05:07.129Z"
cwd: "H:\\prism\\mcp-server"
messages: 45
user_msgs: 17
assistant_msgs: 28
raw_file: "H:/.claude/projects/H--prism/672ceaa6-621b-4191-94de-3323e96f3faf/subagents/agent-a8efdde08cfa657c7.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:14"
---

# Adversarial regression/silent-breakage analysis. Read fully, grade PASS/FAIL wit

> **claude-code-cli** | 2026-06-26 | 45 msgs (17 user / 28 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/672ceaa6-621b-4191-94de-3323e96f3faf/subagents/agent-a8efdde08cfa657c7.jsonl`

## Transcript

### User | 2026-06-26T01:01:50.320Z

Adversarial regression/silent-breakage analysis. Read fully, grade PASS/FAIL with P0/P1 + file:line.

- H:/prism/mcp-server/src/engines/EventBusEngine.ts (additive edit to a WIRED engine, 9 infraDispatcher consumers)
- H:/prism/mcp-server/src/engines/RedisStreamSink.ts (new fail-soft Redis Streams client)
- H:/prism/mcp-server/src/__tests__/EventBusEngine.test.ts + src/__tests__/RedisStreamSink.test.ts

The edit adds a default-OFF durable backend to EventBusEngine.publish(). Scrutinize the regression surface hardest:
1. EventBusStats gained a `durable_dropped_count` field and `mode` is now conditional. Could ANY of the 9 consumers (infraDispatcher event_bus_stats / summary.event_bus) break on the new field or the conditional mode? Is the new field always present?
2. publish() now does `await this.durableSink.append(...)` when flag=redis. Does this change publish() latency/ordering for the in-memory path in a way that could surprise a consumer? Confirm the in-memory fan-out + return id are unchanged and the durable await happens AFTER them.
3. Could `process.env.PRISM_EVENT_BUS` being read on every publish be a problem (a consumer that sets it globally)? Is the default ("file") safe?
4. RedisStreamSink: any way append() reports ok:true without a real write? Any unhandled-rejection / floating promise? Is the timer/abort handled (note: this client has no per-call timeout unlike SearchIndexEngine -- is that a gap)?
5. Test R9: do the durable tests actually fail if the integration were reverted? Does any test leak process.env.PRISM_EVENT_BUS across tests?

Report only real issues. Grade PASS or FAIL.

### Assistant | 2026-06-26T01:01:53.792Z

I'll analyze the regression surface of these changes. Let me start by reading all the relevant files.

### Assistant | 2026-06-26T01:01:54.309Z

[tool_use: Read]

### Assistant | 2026-06-26T01:01:54.404Z

[tool_use: Read]

### User | 2026-06-26T01:01:54.826Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\EventBusEngine.ts' was already read 3s ago in this session and is unchanged (mtime 1782435517379). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-26T01:01:54.933Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\RedisStreamSink.ts' was already read 4s ago in this session and is unchanged (mtime 1782435390984). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-26T01:01:57.056Z

The read-once guard says these were already read, but I don't actually have them in my context (this is a fresh session). Let me bypass the cache.

### Assistant | 2026-06-26T01:01:58.056Z

[tool_use: Bash]

### Assistant | 2026-06-26T01:01:58.488Z

[tool_use: Bash]

### User | 2026-06-26T01:02:04.274Z

[tool_result] /**
 * EventBusEngine — in-memory typed pub/sub bus with bounded ring-buffer history.
 *
 * STUB-RESCUE (slot:bravo 2026-05-27, U-STUB-HUNT-05). Original was tagged
 * as a U-EFF25 stub but had partial publish/getRecentEvents/getStats
 * implementations and hardcoded `subscribers: 0`. infraDispatcher routes 4
 * actions here (`event_bus_publish`, `event_bus_events`, `event_bus_stats`,
 * summary.e
... [+6313 chars truncated]

### User | 2026-06-26T01:02:05.384Z

[tool_result] /**
 * RedisStreamSink -- fail-soft Redis Streams durable transport for EventBusEngine.
 *
 * Phase 3 of INFRA-SYNERGY-RESEARCH-2026-06-25 (slot:bravo). This is the
 * durable BACKEND that the in-memory EventBusEngine optionally fans out to (it
 * is NOT a competing event bus -- the wired EventBusEngine stays the one bus;
 * see INFRA-SYNERGY-PHASE3-EVENTBUS-DESIGN.md). Redis Streams consumer grou
... [+10341 chars truncated]

### Assistant | 2026-06-26T01:02:07.478Z

Now let me read the test files and trace the consumers.

### Assistant | 2026-06-26T01:02:08.453Z

[tool_use: Bash]

### Assistant | 2026-06-26T01:02:09.499Z

[tool_use: Bash]

### User | 2026-06-26T01:02:14.015Z

[tool_result] /**
 * EventBusEngine tests — restoration coverage (U-STUB-HUNT-05).
 *
 * Slot:bravo 2026-05-27. Real concrete-value assertions only.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { EventBusEngine, eventBusEngine } from "../engines/EventBusEngine.js";

describe("EventBusEngine.publish", () => {
  it("returns a unique id per publish", async () => {
    const bus = new Ev
... [+7392 chars truncated]

### User | 2026-06-26T01:02:15.200Z

[tool_result] /**
 * RedisStreamSink tests -- Phase 3 of INFRA-SYNERGY-RESEARCH-2026-06-25.
 *
 * Validates the fail-soft Redis Streams durable sink against a MOCKED ioredis
 * client (no live Redis). R15 matrix: happy round-trip + >=3 failure modes +
 * >=2 adversarial + input-validation. The live round-trip is opt-in
 * (PRISM_EVENT_BUS_LIVE=1) so Docker/Redis-down runs skip it.
 *
 * NOTE (R12): with no live
... [+6396 chars truncated]

### Assistant | 2026-06-26T01:02:18.221Z

Now let me trace the consumers. The CLAUDE.md notes 9 infraDispatcher consumers. Let me find them and check how they read EventBusStats and call publish().

### Assistant | 2026-06-26T01:02:20.113Z

[tool_use: Grep]

### Assistant | 2026-06-26T01:02:21.293Z

[tool_use: Grep]

### User | 2026-06-26T01:02:22.839Z

[tool_result] src\__tests__\ai-dispatcher-p3-wire.test.ts:11:import { confidenceCommitEventBusEngine } from "../engines/ConfidenceCommitEventBusEngine.js";
src\__tests__\ai-dispatcher-p3-wire.test.ts:47:    confidenceCommitEventBusEngine.reset();
src\tools\dispatchers\infraDispatcher.ts:57:        // WIRE-UNWIRED-MS0/U-WIRE-EVENT-ENGINE: EventEngine in-process pub/sub (distinct from eventBusEngine — subscribe/u
... [+10558 chars truncated]

### User | 2026-06-26T01:02:23.079Z

[tool_result] Found 250 files limit: 250
src\__tests__\EventBusEngine.test.ts
src\engines\EventBusEngine.ts
src\engines\RedisStreamSink.ts
src\tools\dispatchers\businessDispatcher.ts
src\engines\MultiModelConsensusEngine.ts
src\tools\dispatchers\cadDispatcher.ts
src\engines\OkumaB250LatheMasterPostEngine.ts
src\__tests__\OkumaB250LatheMasterPostEngine.test.ts
src\tools\dispatchers\aiReasoningDispatcher.ts
src\_
... [+10918 chars truncated]

### Assistant | 2026-06-26T01:02:25.948Z

The actual `eventBusEngine` consumers are all in `infraDispatcher.ts`. Let me read the relevant sections of that dispatcher to verify the consumers and how they read stats.

### Assistant | 2026-06-26T01:02:26.540Z

[tool_use: Read]

### User | 2026-06-26T01:02:27.463Z

[tool_result] 200	            if (connected) {
201	              try {
202	                const { getAppliedMigrations } = await import("../../db/migration-runner.js");
203	                const applied = await getAppliedMigrations(db);
204	                summary.migrations = { applied: applied.length, last: applied[applied.length - 1]?.name ?? null };
205	              } catch { summary.migrations = { error:
... [+4770 chars truncated]

### Assistant | 2026-06-26T01:02:33.472Z

I now have the complete picture of the consumers. The dispatcher reads `getStats()` and passes the result straight through to the client (`summary.event_bus = eventBusEngine.getStats()` and `result = eventBusEngine.getStats()`). Let me verify a couple of remaining concerns: whether `getStats().mode` is read/compared anywhere as a fixed string, and whether the `publish()` signature change (it was already `async` before this edit, per the test using `await`) is consistent. Let me also check the `infraActionSchemas.ts` to see if `event_stats` output is schema-validated (which would break on a new field).

### Assistant | 2026-06-26T01:02:34.883Z

[tool_use: Read]

### User | 2026-06-26T01:02:35.967Z

[tool_result] 195	   *  Auto-redacts secret values per engine policy. */
196	  config_get_with_meta: z.object({
197	    key: z.string().min(1).describe("Config key to fetch"),
198	  }),
199	  /** Read-only — list config entries. Optional `prefix` filters to keys starting with that string. */
200	  config_list: z.object({
201	    prefix: z.string().optional().describe("If set, return only keys starting with this
... [+3340 chars truncated]

### Assistant | 2026-06-26T01:02:36.292Z

[tool_use: Grep]

### User | 2026-06-26T01:02:37.444Z

[tool_result] <persisted-output>
Output too large (30.2KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\672ceaa6-621b-4191-94de-3323e96f3faf\tool-results\toolu_01T1KKtQr8gcfxgBK7DjuAgt.txt

Preview (first 2KB):
scripts\calculator-live-audit.ts:517:  for (const programming of PROGRAMMING_ENVIRONMENTS.filter((item) => item.mode === mode)) {
scripts\calculator-live-audit.ts:602:  const millConfi
... [+1788 chars truncated]

### Assistant | 2026-06-26T01:02:42.616Z

The schema for `event_stats` (and the publish/stats output) is input-only; there's no output schema validating the stats shape, so the new `durable_dropped_count` field and conditional `mode` won't trip any Zod parse. The `event_bus.mode` grep matched only unrelated `mode` fields (coder-mode, machine.mode), confirming no consumer compares `event_bus.mode` to a fixed string. Let me grep specifically for any consumer reading `.mode` off the event_bus stats or destructuring stats fields, and verify there's no output-schema validation on `system_summary`.

### Assistant | 2026-06-26T01:02:45.066Z

[tool_use: Bash]

### User | 2026-06-26T01:03:24.090Z

[tool_result] ---WEB-MODE-CHECKS---
mcp-server/dist/engines/EventBusEngine.d.ts:7: * actions here (`event_bus_publish`, `event_bus_events`, `event_bus_stats`,
mcp-server/dist/engines/EventBusEngine.d.ts:8: * summary.event_bus). Real implementation adds:
mcp-server/dist.bak-vclever/engines/EventBusEngine.d.ts:7: * actions here (`event_bus_publish`, `event_bus_events`, `event_bus_stats`,
mcp-server/dist.bak-vclev
... [+81 chars truncated]

### Assistant | 2026-06-26T01:03:31.592Z

No frontend or other backend consumer reads the `event_bus` stats shape — only `infraDispatcher` produces it and passes it straight through to the MCP client as opaque JSON. The new field is purely additive to the wire output. Now let me verify the git diff to confirm exactly what changed (so I can confirm `publish()` was already async before this edit, and that the in-memory fan-out path is genuinely unchanged), and check for floating promises around `publish()` callers.

### Assistant | 2026-06-26T01:03:33.350Z

[tool_use: Bash]

### User | 2026-06-26T01:03:39.116Z

[tool_result]  mcp-server/src/__tests__/EventBusEngine.test.ts | 64 ++++++++++++++++++++++++-
 mcp-server/src/engines/EventBusEngine.ts        | 43 ++++++++++++++++-
 2 files changed, 105 insertions(+), 2 deletions(-)
===EVENTBUS DIFF===
diff --git a/mcp-server/src/engines/EventBusEngine.ts b/mcp-server/src/engines/EventBusEngine.ts
index 749d4764c8..ef6e04db43 100644
--- a/mcp-server/src/engines/EventBusEngine
... [+3313 chars truncated]

### Assistant | 2026-06-26T01:03:48.678Z

The diff confirms the precise changes. Key findings from the diff:

1. **`publish()` was already `async`** before this edit (the `+` lines don't touch the `async publish(): Promise<string>` signature — only the body inside the `if (this.durableSink && ...)` block is added). The diff only adds the durable block AFTER the synchronous fan-out and BEFORE `return id`. The in-memory fan-out (`dispatchTo` calls), the id generation, the history push/shift, and `publishCount++` are all unchanged and execute before the durable await.

2. **`RedisStreamSink.ts` is fully new** (not in the diff-stat because it's untracked/new — confirmed it's a new file). Let me confirm it's a new untracked file and check the `mode` field default-present concern one more time, plus verify the `getStats()` `mode` semantics: the new conditional is `this.durableSink ? "in-memory+redis" : "in-memory"`. Note this keys off **sink attachment**, NOT the flag — so if a sink is attached but `PRISM_EVENT_BUS!=redis`, `mode` reports `"in-memory+redis"` while publishes do NOT actually go to redis. Let me check this is benign and confirm the new file is untracked.

### Assistant | 2026-06-26T01:03:52.054Z

[tool_use: Bash]

### User | 2026-06-26T01:04:13.052Z

[tool_result] ?? mcp-server/src/__tests__/RedisStreamSink.test.ts
?? mcp-server/src/engines/RedisStreamSink.ts
===attach callers===
===any caller sets PRISM_EVENT_BUS===
mcp-server/c/tmp/prism-build-check.js:81807:      PRISM_EVENT_BUS: {
mcp-server/c/tmp/prism-build-check.js:81808:        filename: "PRISM_EVENT_BUS.js",
mcp-server/c/tmp/prism-build-check.js:356983:      PRISM_EVENT_BUS: {
mcp-server/c/tmp/pris
... [+635 chars truncated]

### Assistant | 2026-06-26T01:04:20.510Z

Important findings confirmed:

1. **No caller anywhere attaches a durable sink** (`attachDurableSink` / `redisStreamSink` / `attachClient` have zero non-test, non-definition references). So in production today, `this.durableSink` is always `null` → the durable block is fully dead → `mode` always reports `"in-memory"`, `durable_dropped_count` always `0`. This is the strongest evidence of zero regression: the entire feature is unreachable until someone wires `attachDurableSink`, which is not in this diff. RedisStreamSink is a brand-new untracked file with no importers.

2. The `PRISM_EVENT_BUS` references in `EventBus.ts` / `ScriptExecutor.ts` / `EventBus.ts:1597` are an **unrelated** environment-variable allowlist registry entry (a `filename: "PRISM_EVENT_BUS.js"` config map), not the bus flag — so there's no conflicting global writer of `process.env.PRISM_EVENT_BUS`. Let me verify that quickly to rule out concern #3.

### Assistant | 2026-06-26T01:04:21.066Z

[tool_use: Read]

### User | 2026-06-26T01:04:22.186Z

[tool_result] 1592	    category: "infrastructure",
1593	    lines: 2198,
1594	    safety_class: "LOW",
1595	    description: "Deep comparison utilities for objects, arrays, and nested structures with diff output",
1596	  },
1597	  PRISM_EVENT_BUS: {
1598	    filename: "PRISM_EVENT_BUS.js",
1599	    source_dir: "extracted/infrastructure",
1600	    category: "infrastructure",
1601	    lines: 154,
1602	    safety_
... [+116 chars truncated]

### Assistant | 2026-06-26T01:04:37.731Z

Confirmed: that `PRISM_EVENT_BUS` in `EventBus.ts:1597` is just an entry in an extracted-engine catalog map (`filename: "PRISM_EVENT_BUS.js"`, a legacy event-bus implementation description) — completely unrelated to `process.env.PRISM_EVENT_BUS`. There is no global writer of the env var. The default (env unset → not "redis") is safe.

Now I have everything I need. Let me address each of the 5 specified concerns precisely, then assemble the verdict.

**Concern 1 — EventBusStats new field / conditional mode breaking consumers:** The `durable_dropped_count` field is set unconditionally in the `getStats()` return literal (line 178), so it is **always present**. The only consumers are 2 sites in `infraDispatcher.ts` (`summary.event_bus = eventBusEngine.getStats()` at line 222, `result = eventBusEngine.getStats()` at line 285), both of which pass the object through opaquely to the MCP client — no destructuring, no field access, no equality check on `mode`. No output Zod schema validates the stats shape (verified — `infraActionSchemas` are input-only). No frontend reads it. Additive, no break.

**Concern 2 — publish() latency/ordering:** `publish()` was already `async` before the edit. The durable `await` is appended strictly AFTER both `dispatchTo` fan-out calls and before `return id` — the synchronous in-memory fan-out and returned id are byte-identical. For the default path (no sink attached), the `if` is false so there is zero added latency. When a sink IS attached + flag=redis, the durable append adds one awaited microtask before `return`, but in-memory subscribers have already been notified synchronously. No ordering surprise for in-memory consumers.

**Concern 3 — reading `process.env.PRISM_EVENT_BUS` every publish:** Cheap, no global writer exists, default (unset) is safe → durable block skipped. No problem.

**Concern 4 — RedisStreamSink correctness:** `append()` returns `ok: id !== null` — it cannot report `ok:true` without xadd returning a non-null id. No floati
... [+526 chars truncated]

### Assistant | 2026-06-26T01:04:38.439Z

[tool_use: Read]

### User | 2026-06-26T01:04:39.551Z

[tool_result] 132	describe("EventBusEngine durable sink (Phase 3, additive default-off)", () => {
133	  const RESTORE = process.env.PRISM_EVENT_BUS;
134	  afterEach(() => {
135	    if (RESTORE === undefined) delete process.env.PRISM_EVENT_BUS;
136	    else process.env.PRISM_EVENT_BUS = RESTORE;
137	  });
138	
139	  it("no sink -> mode stays in-memory, durable_dropped_count 0 (zero regression)", async () => {
14
... [+1357 chars truncated]

### Assistant | 2026-06-26T01:05:07.129Z

I have everything verified. The env-restore `afterEach` correctly captures the original `PRISM_EVENT_BUS` value once at describe-block evaluation and restores after each test, so no leak across files. The durable tests set the env var inside each `it`, and the `afterEach` cleans up — no cross-test pollution within the suite either.

One last nuance to confirm for the verdict: the `mode` field keys off **sink attachment** (`this.durableSink ? ...`), while the actual durable *write* keys off **sink AND flag=redis**. This is a benign cosmetic mismatch (mode can say "in-memory+redis" while writes are off if a sink is attached without the flag), but since nothing in production attaches a sink and no consumer reads `mode`, it has zero blast radius. I'll note it as P2.

Here is my analysis.

---

VERDICT: PASS

summary: The durable-sink addition to `EventBusEngine.publish()` is genuinely additive and inert in production — no code path anywhere attaches a sink (`attachDurableSink`/`redisStreamSink` have zero non-test callers), so `durableSink` is always `null`, the new `await` block is dead, `mode` always reports `"in-memory"`, and `durable_dropped_count` is always `0`. The new `durable_dropped_count` field is unconditionally present in the `getStats()` return literal, and the only two consumers (`infraDispatcher.ts:222` and `:285`) pass the stats object through opaquely to the MCP client with no field access, no `mode` equality check, and no output Zod schema — so neither the new field nor the conditional `mode` can break any consumer. In-memory fan-out, the returned id, and `publish()`'s pre-existing `async` signature are byte-identical.

findings:
- [P2] `H:/prism/mcp-server/src/engines/EventBusEngine.ts:170` -- `getStats().mode` is computed from sink *attachment* (`this.durableSink ? "in-memory+redis" : "in-memory"`) but the actual durable write at line 103 is gated on attachment *AND* `process.env.PRISM_EVENT_BUS === "redis"`. A sink attached with the flag unset/`"file
... [+2933 chars truncated]
