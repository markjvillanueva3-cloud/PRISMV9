---
type: "chat-session"
source: "claude-code-cli"
session_id: "2206bcad-6734-4e2e-8a8c-13a0e23fae56"
title: "Independent analyst review (silent-breakage / regression / blast-radius focus) o"
date: "2026-06-19"
first_ts: "2026-06-19T19:57:11.406Z"
last_ts: "2026-06-19T20:03:44.360Z"
cwd: "H:\\prism\\mcp-server"
messages: 96
user_msgs: 40
assistant_msgs: 56
raw_file: "H:/.claude/projects/H--prism/2206bcad-6734-4e2e-8a8c-13a0e23fae56/subagents/agent-a1a07481acd782b05.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:08"
---

# Independent analyst review (silent-breakage / regression / blast-radius focus) o

> **claude-code-cli** | 2026-06-19 | 96 msgs (40 user / 56 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/2206bcad-6734-4e2e-8a8c-13a0e23fae56/subagents/agent-a1a07481acd782b05.jsonl`

## Transcript

### User | 2026-06-19T19:57:11.406Z

Independent analyst review (silent-breakage / regression / blast-radius focus) of an uncommitted 3-file change in H:/prism. Inspect: `cd /h/prism && git diff -- mcp-server/src/engines/OfflineRLOrchestratorEngine.ts mcp-server/src/engines/PolicyExperienceLedgerEngine.ts mcp-server/src/__tests__/OfflineRLOrchestratorEngine.test.ts`.

The change applies the existing `toOutcomeDomain()` mapper at OfflineRLOrchestratorEngine.ts:92 (was raw `parsed.domain`), adds a TEST-ONLY `clear()` to PolicyExperienceLedgerEngine (rm the gitignored ledger file), and calls it in the OfflineRL test's beforeEach.

Focus on:
1. BLAST RADIUS of the new `clear()` method: grep `policyExperienceLedgerEngine.clear` AND `.clear()` on any ledger reference across ALL of mcp-server/src (engines, dispatchers, routes, tests). It MUST be test-only. If ANY production/dispatcher/route path can reach it, that's a P0 (append-only store wiped in prod).
2. BEHAVIORAL CHANGE of the mapper application: for domains mill/lathe/wedm/grinder/welder the mapper is identity (no behavior change); only sinker->sinker_edm and general->other change. Is that the intended/correct semantic? Confirm no OfflineRL test or consumer relies on querying the RAW `sinker`/`general` (which would have returned empty before and now returns sinker_edm/other tuples).
3. Does `clear()` rm-ing `state/policy/experience.jsonl` interfere with OTHER test files that share the singleton ledger (test-ordering hazard — a concurrent/sequential test relying on ledger contents)? Grep which test files touch policyExperienceLedgerEngine.
4. Confirm `git diff --stat` is exactly these 3 files (no unrelated changes).

Verified: tsc 10->9, OfflineRL 10/10, PolicyExperienceLedger 20/20. Read-only. Grade PASS or FAIL with file:line.

### Assistant | 2026-06-19T19:57:15.372Z

I'll investigate this change systematically, focusing on blast radius and silent breakage.

### Assistant | 2026-06-19T19:57:16.790Z

[tool_use: Bash]

### Assistant | 2026-06-19T19:57:17.223Z

[tool_use: Bash]

### User | 2026-06-19T19:57:17.568Z

[tool_result] Bash result cached (<3min) for this command. The result is already in session context — summarize from it instead of re-running. If you need fresh data, modify the command (different flags, different path).

### User | 2026-06-19T19:57:23.135Z

[tool_result] <persisted-output>
Output too large (262.1KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\2206bcad-6734-4e2e-8a8c-13a0e23fae56\tool-results\byhwrxt1l.txt

Preview (first 2KB):
warning: in the working copy of 'knowledge/memories/reference/plugin_architecture.md', CRLF will be replaced by LF the next time Git touches it
warning: in the working copy of 'knowledge/memories/referenc
... [+1673 chars truncated]

### Assistant | 2026-06-19T19:57:25.767Z

The `--stat` got the full session diff (huge). Let me scope it to the 3 files and get the targeted diff.

### Assistant | 2026-06-19T19:57:27.778Z

[tool_use: Bash]

### Assistant | 2026-06-19T19:57:28.955Z

[tool_use: Bash]

### User | 2026-06-19T19:57:36.744Z

[tool_result]  .../__tests__/OfflineRLOrchestratorEngine.test.ts  |  4 ++++
 .../src/engines/OfflineRLOrchestratorEngine.ts     | 27 +++++++++++++++++++++-
 .../src/engines/PolicyExperienceLedgerEngine.ts    | 20 ++++++++++++++++
 3 files changed, 50 insertions(+), 1 deletion(-)

### User | 2026-06-19T19:57:44.022Z

[tool_result] diff --git a/mcp-server/src/__tests__/OfflineRLOrchestratorEngine.test.ts b/mcp-server/src/__tests__/OfflineRLOrchestratorEngine.test.ts
index 4a67311373..70bc4b79ea 100644
--- a/mcp-server/src/__tests__/OfflineRLOrchestratorEngine.test.ts
+++ b/mcp-server/src/__tests__/OfflineRLOrchestratorEngine.test.ts
@@ -6,6 +6,7 @@ import { offlineRLOrchestratorEngine } from "../engines/OfflineRLOrchestrator
... [+4306 chars truncated]

### Assistant | 2026-06-19T19:57:47.655Z

Confirmed: the scoped diff is exactly these 3 files. Now let me investigate the blast radius of `clear()` and the mapper semantics. Let me run the key greps in parallel.

### Assistant | 2026-06-19T19:57:49.087Z

[tool_use: Grep]

### Assistant | 2026-06-19T19:57:50.017Z

[tool_use: Grep]

### Assistant | 2026-06-19T19:57:50.482Z

[tool_use: Grep]

### User | 2026-06-19T19:57:54.844Z

[tool_result] src\__tests__\OfflineRLOrchestratorEngine.test.ts:19:    policyExperienceLedgerEngine.clear();

### User | 2026-06-19T19:57:56.047Z

[tool_result] Found 6 files
src\__tests__\OfflineRLOrchestratorEngine.test.ts
src\engines\PolicyExperienceLedgerEngine.ts
src\engines\OfflineRLOrchestratorEngine.ts
src\tools\dispatchers\aiReasoningDispatcher.ts
src\__tests__\ai-dispatcher-ledger-wire.test.ts
src\engines\OutcomeTraceEngine.ts

### User | 2026-06-19T19:57:56.308Z

[tool_result] Found 23 files
src\__tests__\OfflineRLOrchestratorEngine.test.ts
src\engines\PolicyExperienceLedgerEngine.ts
src\engines\OfflineRLOrchestratorEngine.ts
src\tools\dispatchers\aiReasoningDispatcher.ts
src\__tests__\ai-dispatcher-ledger-wire.test.ts
src\engines\ai-training\CLAUDE.md
src\engines\ai-training\MEMORY.md
src\engines\dormant-data\PATHS.md
src\engines\OutcomeCaptureBusEngine.ts
src\engines\
... [+560 chars truncated]

### Assistant | 2026-06-19T19:58:01.874Z

`policyExperienceLedgerEngine.clear()` appears in exactly ONE place: the OfflineRL test's `beforeEach`. That's the only call site. Now I need to verify there's no `.clear()` reachable via any aliased reference, and check the `.clear()` pattern broadly on ledger references. Let me also dig into the consumers and other test files that share the singleton.

### Assistant | 2026-06-19T19:58:03.392Z

[tool_use: Grep]

### Assistant | 2026-06-19T19:58:04.681Z

[tool_use: Grep]

### Assistant | 2026-06-19T19:58:05.715Z

[tool_use: Grep]

### User | 2026-06-19T19:58:07.284Z

[tool_result] 4638-      // ----------------------------------------------------------------------
4639-      case "policy_experience_stats": {
4640:        const { policyExperienceLedgerEngine } = await import("../../engines/PolicyExperienceLedgerEngine.js");
4641:        result = { success: true, ...policyExperienceLedgerEngine.stats() };
4642-        break;
4643-      }
4644-      case "policy_experience_que
... [+561 chars truncated]

### User | 2026-06-19T19:58:08.299Z

[tool_result] 22-} from "../schemas/policyExperienceSchema.js";
23-import {
24:  policyExperienceLedgerEngine,
25-  PolicyExperienceLedgerEngine,
26-  type AppendResult,
--
41-export class OutcomeTraceEngine {
42-  constructor(
43:    private readonly ledger: PolicyExperienceLedgerEngine = policyExperienceLedgerEngine,
44-    private readonly lineage: MLLineageEngine = mlLineageEngine,
45-  ) {}

### User | 2026-06-19T19:58:08.705Z

[tool_result] src\engines\EmployeePTOAccrualEngine.ts:395:    this.ledger.clear();

### Assistant | 2026-06-19T19:58:13.069Z

The `OutcomeTraceEngine` holds a `ledger` reference (the singleton by default) but I need to check whether `OutcomeTraceEngine` or its consumers ever call `.clear()` on it. The `EmployeePTOAccrualEngine.ts:395` `this.ledger.clear()` is a DIFFERENT ledger (PTO accrual) — let me verify that's unrelated. Let me also check the dispatcher action enum doesn't expose a `clear`/`reset` action, and inspect the OutcomeTraceEngine for any `.clear()` on its ledger.

### Assistant | 2026-06-19T19:58:14.431Z

[tool_use: Grep]

### Assistant | 2026-06-19T19:58:15.398Z

[tool_use: Bash]

### Assistant | 2026-06-19T19:58:16.537Z

[tool_use: Grep]

### User | 2026-06-19T19:58:18.034Z

[tool_result] No matches found

### User | 2026-06-19T19:58:23.549Z

[tool_result] No matches found

### User | 2026-06-19T19:58:35.465Z

[tool_result]     for (const e of this.ledger.values()) {
      if (e.employee_id === employee_id) out.push(Object.freeze({ ...e }));
    }
    return Object.freeze(out);
  }

  reset(): void {
    this.ledger.clear();
    this.requests.clear();
    this.nextLedgerId = 1;
    this.nextRequestId = 1;

### Assistant | 2026-06-19T19:58:40.986Z

Confirmed:
- `OutcomeTraceEngine` never calls `.clear()` on its `ledger` reference (the `.clear(` grep there returned nothing).
- `EmployeePTOAccrualEngine.ts:395` `this.ledger.clear()` is an in-memory `Map().clear()` (PTO accrual map, `this.ledger.values()`), completely unrelated to `PolicyExperienceLedgerEngine`.
- No dispatcher action (`policy_experience_*`) exposes clear/reset/truncate. Only `policy_experience_stats` and `policy_experience_query` exist.

Now let me verify the mapper semantics. I need to read the OfflineRL input schema (domain enum), the OutcomeDomain schema, and confirm what `query()` does with the domain — and check the cross-test sharing of the singleton (the test-ordering hazard).

### Assistant | 2026-06-19T19:58:41.936Z

[tool_use: Bash]

### Assistant | 2026-06-19T19:58:43.397Z

[tool_use: Bash]

### Assistant | 2026-06-19T19:58:44.526Z

[tool_use: Bash]

### User | 2026-06-19T19:58:59.216Z

[tool_result] 67:      domain: OutcomeDomain,
110:  domain: OutcomeDomain,
132:  domain: OutcomeDomain,
146:  domain: OutcomeDomain.optional(),
162:  domain: OutcomeDomain,

### User | 2026-06-19T19:59:00.867Z

[tool_result] 26:  OfflineRLTrainInputSchema,
30:  type OfflineRLTrainInput,
47: * Map OfflineRL training domain enum -> OutcomeDomain accepted by
59:  domain: OfflineRLTrainInput["domain"],
61:  switch (domain) {
64:    default:        return domain; // mill, lathe, wedm, grinder, welder are identical
70:  domain: string;
87:  train(input: OfflineRLTrainInput): OfflineRLTrainResult {
89:    const parsed = Offl
... [+334 chars truncated]

### User | 2026-06-19T19:59:03.271Z

[tool_result] 105: * Domains the bus knows about. Expandable — unknown domain falls back to "other"
108:export const OutcomeDomain = z.enum([
112:  "sinker_edm",
128:  "other",
163:  "other",
183:  "other",
308:  domain: OutcomeDomain,
386:export type OutcomeDomainT = z.infer<typeof OutcomeDomain>;
395:  domain: OutcomeDomain.optional(),

### Assistant | 2026-06-19T19:59:06.864Z

Let me see the full `OutcomeDomain` enum and the OfflineRL `domain` enum to confirm the mapper's exhaustiveness, and verify `query()` does an exact-match filter on `domain`.

### system

... [16 middle messages omitted -- see raw_file] ...

### User | 2026-06-19T20:00:07.400Z

[tool_result] === ai-dispatcher-ledger-wire.test.ts ledger usage ===
14:import { policyExperienceLedgerEngine } from "../engines/PolicyExperienceLedgerEngine.js";
304:    const orig = policyExperienceLedgerEngine.stats;
305:    (policyExperienceLedgerEngine as any).stats = () => ({
319:      (policyExperienceLedgerEngine as any).stats = orig;
324:    const orig = policyExperienceLedgerEngine.query;
326:    (pol
... [+583 chars truncated]

### User | 2026-06-19T20:00:08.630Z

[tool_result] === LatheP2PMS4Acceptance ===
341:      "PolicyExperienceLedger + CrossProcessNeuralLearningEngine.",
=== businessDispatcherPolicyLedger ===
2: * Tests for businessDispatcher PolicyExperienceLedger + OutcomeTrace actions
32:describe("businessDispatcher — PolicyExperienceLedger + OutcomeTrace (U-LEARN-09)", () => {

### Assistant | 2026-06-19T20:00:14.890Z

Now I have a clear picture of the test-ordering hazard. Let me confirm:
- `PolicyExperienceLedgerEngine.test.ts` and `OutcomeTraceEngine.test.ts` use **isolated tmpRoot instances** — NOT the singleton. They cannot be affected by `clear()` on the singleton.
- `ai-dispatcher-ledger-wire.test.ts` uses the **singleton** but only **stubs `stats`/`query`** (mock and restore) — it does NOT read real ledger contents that the OfflineRL `clear()` would delete.
- `LatheP2PMS4Acceptance` and `businessDispatcherPolicyLedger` only reference the name in strings/comments.

Let me confirm the singleton's `rootDir` (what file `clear()` actually deletes) and check the `businessDispatcherPolicyLedger.test.ts` deeper since it tests the dispatcher action that reaches the singleton — to verify it doesn't depend on pre-seeded singleton state.

### Assistant | 2026-06-19T20:00:17.261Z

[tool_use: Bash]

### Assistant | 2026-06-19T20:00:18.424Z

[tool_use: Bash]

### User | 2026-06-19T20:00:31.001Z

[tool_result] 24:import fs from "node:fs";
25:import path from "node:path";
37:const LEDGER_DIR = path.resolve(process.cwd(), "state/policy");
38:const LEDGER_FILE = "experience.jsonl";
51:  private readonly rootDir: string;
53:  constructor(rootDir: string = LEDGER_DIR) {
54:    this.rootDir = rootDir;
131:    const filePath = path.join(this.rootDir, LEDGER_FILE);
176:   * in the gitignored `state/policy/exper
... [+259 chars truncated]

### User | 2026-06-19T20:00:31.292Z

[tool_result] 6:import { describe, it, expect, beforeAll, afterAll } from "vitest";
21:  action: "policy_experience_append" as const,
36:  it("policy_experience_append: writes a valid tuple", async () => {
38:      action: "policy_experience_append",
52:    expect(r.success).toBe(true);
54:    expect(d.ok).toBe(true);
55:    expect(d.experience_id).toBeTruthy();
58:  it("policy_experience_append: rejects empty 
... [+1727 chars truncated]

### Assistant | 2026-06-19T20:00:39.933Z

This surfaces the real test-ordering hazard. The key facts:

1. **The singleton's `rootDir` = `path.resolve(process.cwd(), "state/policy")`** (line 37, 53). So `policyExperienceLedgerEngine.clear()` deletes the REAL `state/policy/experience.jsonl` relative to cwd — the **same file** the `businessDispatcherPolicyLedger.test.ts` writes to and reads back via the singleton-backed dispatcher.

2. **`businessDispatcherPolicyLedger.test.ts` SEEDS the singleton ledger** (`policy_experience_append` in `beforeAll`) then asserts:
   - `policy_experience_query: returns tuples` → `expect(d.tuples.length).toBeGreaterThan(0)` (line 94)
   - `policy_experience_stats` → `expect(d.total).toBeGreaterThan(0)` (line 112)

These assertions depend on the singleton-backed `state/policy/experience.jsonl` containing the seeded tuples. **If the OfflineRL test's `beforeEach` runs `clear()` and deletes that file mid-run while the business test relies on its own appends**, there's a potential cross-file interference — BUT only if the two suites run concurrently against the same cwd-relative file. Let me verify the business test seeds in `beforeAll` (its own appends, self-contained) and whether vitest runs test files in isolated processes/workers. Let me check the business test's seeding and the vitest config for isolation.

### Assistant | 2026-06-19T20:00:41.432Z

[tool_use: Bash]

### Assistant | 2026-06-19T20:00:43.211Z

[tool_use: Bash]

### User | 2026-06-19T20:00:49.539Z

[tool_result] describe("businessDispatcher — PolicyExperienceLedger + OutcomeTrace (U-LEARN-09)", () => {
  beforeAll(backup);
  afterAll(restore);

  it("policy_experience_append: writes a valid tuple", async () => {
    const r = await businessDispatch({
      action: "policy_experience_append",
      lineage_id: "BD-LNG-1",
      domain: "mill",
      state: { context: { material: "D2" }, inline: { sfm: 120 
... [+369 chars truncated]

### User | 2026-06-19T20:00:51.599Z

[tool_result] mcp-server/vitest.config.ts
---config isolation/pool settings---
mcp-server/vitest.config.ts:8: * vitest.config so isolate/pool behaviour was implicit. Pinning the pool
mcp-server/vitest.config.ts:12: * Hardware target: AMD Ryzen 9 9950X3D2 — 16 physical cores, 32 threads,
mcp-server/vitest.config.ts:19: * core and they fight the front-end. minThreads = 4 keeps a warm pool for
mcp-server/vitest.co
... [+726 chars truncated]

### Assistant | 2026-06-19T20:00:57.214Z

Critical finding. The business test wraps its mutations in `beforeAll(backup)` / `afterAll(restore)` — it backs up and restores `state/policy/experience.jsonl`. This is the existing convention precisely because the singleton ledger is a **real shared cwd-relative file**, and vitest runs test FILES in parallel worker threads (`pool: "threads"`, `maxConcurrency: 16`) — but `isolate: true` only isolates the **module/V8 state**, NOT the **shared filesystem**. The `state/policy/experience.jsonl` is one physical file on disk shared across all worker threads.

Let me confirm what `backup`/`restore` do and verify the OfflineRL test does NOT have the same backup/restore guard — which is the test-ordering hazard. This is the central question (#3).

### Assistant | 2026-06-19T20:00:59.576Z

[tool_use: Bash]

### Assistant | 2026-06-19T20:01:00.382Z

[tool_use: Bash]

### User | 2026-06-19T20:01:03.631Z

[tool_result] 12:const POLICY_BACKUP = POLICY_FILE + ".psau-test-backup";
14:function backup(): void { if (fs.existsSync(POLICY_FILE)) fs.renameSync(POLICY_FILE, POLICY_BACKUP); }
15:function restore(): void {
16:  if (fs.existsSync(POLICY_FILE)) fs.rmSync(POLICY_FILE);
17:  if (fs.existsSync(POLICY_BACKUP)) fs.renameSync(POLICY_BACKUP, POLICY_FILE);
33:  beforeAll(backup);
34:  afterAll(restore);
=== backup/re
... [+1040 chars truncated]

### User | 2026-06-19T20:01:04.985Z

[tool_result] /**
 * OfflineRL Orchestrator Engine Tests — U-LEARN-08
 */
import { describe, it, expect, beforeEach } from "vitest";
import { offlineRLOrchestratorEngine } from "../engines/OfflineRLOrchestratorEngine.js";
import { iqlEngine } from "../engines/IQLEngine.js";
import { maxEntIRLEngine } from "../engines/MaxEntIRLEngine.js";
import { safetyShieldEngine } from "../engines/SafetyShieldEngine.js";
imp
... [+1477 chars truncated]

### Assistant | 2026-06-19T20:01:15.059Z

Now I have the complete picture. This is a genuine test-ordering hazard, but I must assess its actual severity given vitest's isolation model. Key facts:

- `businessDispatcherPolicyLedger.test.ts` uses `beforeAll(backup)`/`afterAll(restore)` — it **moves** `state/policy/experience.jsonl` to a `.psau-test-backup` sidecar (via `renameSync`), runs against a clean file, then restores the original.
- The new OfflineRL `beforeEach` calls `policyExperienceLedgerEngine.clear()` which **`fs.rmSync`** the real `state/policy/experience.jsonl` — with NO backup/restore.

Now the cross-file race question. Both test files target the **same physical file** (`process.cwd()/state/policy/experience.jsonl`). Vitest `pool: "threads"` with `maxConcurrency: 16` and `fileParallelism` default-on runs separate test FILES in parallel worker threads sharing one process cwd → one shared physical file. Let me verify `fileParallelism` isn't disabled, and check whether any OTHER test that does NOT back up writes to the singleton and asserts on contents (the real victims of a mid-run `rmSync`).

### Assistant | 2026-06-19T20:01:16.473Z

[tool_use: Bash]

### Assistant | 2026-06-19T20:01:17.429Z

[tool_use: Grep]

### User | 2026-06-19T20:01:18.657Z

[tool_result] Found 5 files
src\__tests__\OfflineRLOrchestratorEngine.test.ts
src\engines\PolicyExperienceLedgerEngine.ts
src\schemas\policyExperienceSchema.ts
src\__tests__\dispatchers\businessDispatcherPolicyLedger.test.ts
src\engines\OutcomeTraceEngine.ts

### Assistant | 2026-06-19T20:01:18.802Z

[tool_use: Grep]

### User | 2026-06-19T20:01:20.543Z

[tool_result] Found 2 files
src\__tests__\ai-dispatcher-ledger-wire.test.ts
src\__tests__\dispatchers\businessDispatcherPolicyLedger.test.ts

### User | 2026-06-19T20:01:21.461Z

[tool_result] import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    pool: "threads",
    // Vitest 4 removed `poolOptions` — maxThreads/minThreads/isolate/singleThread
    // are now TOP-LEVEL `test` options. (Before this migration the whole
    // poolOptions block was silently IGNORED under vitest 4.1.5, so the
    // worker-count tuning had no effect. HARDWARE-DRIVE-SYNC-
... [+1177 chars truncated]

### Assistant | 2026-06-19T20:01:32.378Z

Now let me assess the actual severity of the cross-file race. The two test files that touch the singleton-backed real file `state/policy/experience.jsonl`:

1. `OfflineRLOrchestratorEngine.test.ts` — now `clear()` (`rmSync`) in `beforeEach`, NO backup.
2. `businessDispatcherPolicyLedger.test.ts` — `backup()` (renames the real file away) in `beforeAll`, then appends its own tuples, restores in `afterAll`.

With `pool: "threads"` + `fileParallelism` default-on, these two files run in **parallel worker threads sharing one process cwd → one physical file**. The race scenario:

- Business test: `beforeAll` renames `experience.jsonl` → `.psau-test-backup`, then appends BD tuples to a fresh `experience.jsonl`, then asserts `tuples.length > 0` / `total > 0`.
- OfflineRL test (parallel): each `beforeEach` `rmSync(experience.jsonl)`.

If the OfflineRL `rmSync` fires **between** the business test's append and its query/stats assert, the business test's `expect(d.tuples.length).toBeGreaterThan(0)` / `expect(d.total).toBeGreaterThan(0)` would see an empty/missing file and **fail flakily**. Let me confirm one detail: whether vitest threads share cwd (they do — worker_threads share the parent process working directory) and whether the business append happens per-`it` or once in `beforeAll`. The appends are per-`it` (line 36 onward), and the query/stats `it`s (lines 85, 107) depend on file contents written by earlier `it`s in the SAME file. Let me verify the business test relies on append-then-query ordering within the file and whether `restore()` in afterAll would clobber a concurrent OfflineRL state.

### Assistant | 2026-06-19T20:01:34.254Z

[tool_use: Bash]

### Assistant | 2026-06-19T20:01:35.663Z

[tool_use: Bash]

### User | 2026-06-19T20:01:40.545Z

[tool_result]   it("policy_experience_query: returns tuples", async () => {
    const r = await businessDispatch({
      action: "policy_experience_query",
      domain: "mill",
      limit: 100,
    });
    expect(r.success).toBe(true);
    const d = r.data as any;
    expect(Array.isArray(d.tuples)).toBe(true);
    expect(d.tuples.length).toBeGreaterThan(0);
  });

  it("policy_experience_query: filters by li
... [+641 chars truncated]

### User | 2026-06-19T20:02:22.453Z

[tool_result] --- is fileParallelism disabled anywhere? ---

### Assistant | 2026-06-19T20:02:32.598Z

This confirms the hazard precisely. The business test's `policy_experience_query` (line 94: `expect(d.tuples.length).toBeGreaterThan(0)`) and `policy_experience_stats` (line 112: `expect(d.total).toBeGreaterThan(0)`) read the shared `state/policy/experience.jsonl` and assert non-empty contents that earlier `it`s in the same file appended.

`fileParallelism` is NOT disabled → it defaults to `true`. So `OfflineRLOrchestratorEngine.test.ts` and `businessDispatcherPolicyLedger.test.ts` run in parallel worker threads sharing one cwd → one physical `state/policy/experience.jsonl`. An OfflineRL `beforeEach` `rmSync` interleaved between the business append and its query/stats assert deletes those rows → flaky failure of the business test.

But I must weigh this honestly: this is a **pre-existing class of hazard** — the business test already had to `backup`/`restore` precisely because the singleton file is shared, and it can ALREADY race against itself if any other parallel test wrote there. The new `clear()` adds a NEW concurrent `rmSync` writer that the business test's backup/restore does NOT protect against (backup only saves pre-existing content; it cannot prevent a concurrent `rmSync` of the file the business test is actively populating). 

Let me do a final reality check: confirm there's no global vitest setup that serializes these, and verify whether the OfflineRL test actually NEEDS clear() given it reads via the singleton (i.e., the fix is real, just the isolation method is filesystem-racy). Let me also double-check the OutcomeTrace/dispatcher singleton append path that could repopulate the file.

### Assistant | 2026-06-19T20:02:34.491Z

[tool_use: Bash]

### Assistant | 2026-06-19T20:02:36.708Z

[tool_use: Bash]

### User | 2026-06-19T20:02:43.796Z

[tool_result] Exit code 2
--- any test setup that serializes policy ledger? ---

### User | 2026-06-19T20:02:46.559Z

[tool_result] --- does ai-dispatcher write to the real singleton file? ---

### Assistant | 2026-06-19T20:02:52.289Z

The first command errored (grep exit 2 on the `sequence` part, no matches). Let me re-run cleanly to confirm no global serialization, and confirm the `ai-dispatcher-ledger-wire.test.ts` only stubs (doesn't write the real file).

### Assistant | 2026-06-19T20:02:54.406Z

[tool_use: Bash]

### User | 2026-06-19T20:03:02.598Z

[tool_result] NO setupFiles/globalSetup
===
68:  it("ledger_ingest appends and echoes entry", async () => {

### Assistant | 2026-06-19T20:03:05.829Z

[tool_use: Bash]

### User | 2026-06-19T20:03:10.078Z

[tool_result]     handler = await createServer().handler;
  });

  beforeEach(() => {
    masterAITrainingLedgerEngine.reset();
    loRADriftCoordinatorEngine.reset();
  });

  it("ledger_ingest appends and echoes entry", async () => {
    const r = await call(handler, "ledger_ingest", sampleEntry("r1"));
    expect(r.data.entry?.runId).toBe("r1");
    expect(r.data.entry?.schemaVersion).toBe(1);
  });

  it("l
... [+1025 chars truncated]

### Assistant | 2026-06-19T20:03:44.360Z

Confirmed: `ai-dispatcher-ledger-wire.test.ts`'s `ledger_ingest` uses `masterAITrainingLedgerEngine` (a DIFFERENT ledger), and its only touch of `policyExperienceLedgerEngine` is stubbing `.stats`/`.query` (lines 304-338) which it restores. It does NOT write or read the real `state/policy/experience.jsonl`, so it is NOT a victim of `clear()`.

So the **only** cross-file victim of the new `clear()` is `businessDispatcherPolicyLedger.test.ts`, via the shared-physical-file race under `fileParallelism: true`.

I have everything I need. Let me consolidate my verdict.

## Summary of investigation

**Q1 — Blast radius of `clear()` (P0 check):** `policyExperienceLedgerEngine.clear()` has exactly ONE call site fleet-wide: `OfflineRLOrchestratorEngine.test.ts:19` (test `beforeEach`). No dispatcher action (`aiReasoningDispatcher` exposes only `policy_experience_stats` + `policy_experience_query`; no `*_clear/reset/truncate` action exists), no route, no production engine reaches it. `OutcomeTraceEngine` holds the singleton as `this.ledger` but only ever calls `.append()`/`.query()`, never `.clear()`. The `this.ledger.clear()` at `EmployeePTOAccrualEngine.ts:395` is an in-memory `Map.clear()` on an unrelated PTO map. **No production path can wipe the append-only store. Q1 PASSES.**

**Q2 — Mapper semantics:** Verified against both enums. OfflineRL domain (`offlineRLSchema.ts:222`) = `mill|lathe|wedm|sinker|grinder|welder|general`; OutcomeDomain (`outcomeEventSchema.ts:108`) contains `sinker_edm` and `other` but NOT `sinker`/`general`. `query()` does an exact-string match (`PolicyExperienceLedgerEngine.ts:153 if (filter.domain && t.domain !== filter.domain) continue;`). Therefore the pre-change `domain: parsed.domain` was a **latent silent bug**: a `sinker`/`general` train request would query for a domain string that can never exist in the store → always-empty experience. The mapper is identity for the 5 shared domains (no behavior change) and correctly fixes the 2 mismatched one
... [+4423 chars truncated]
