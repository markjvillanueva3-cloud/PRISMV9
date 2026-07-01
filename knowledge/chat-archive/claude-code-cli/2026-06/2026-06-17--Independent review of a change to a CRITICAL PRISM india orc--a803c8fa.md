---
type: "chat-session"
source: "claude-code-cli"
session_id: "a803c8fa-8407-40f0-81d9-0a56f2031bb5"
title: "Independent review of a change to a CRITICAL PRISM india orchestrator. Read both"
date: "2026-06-17"
first_ts: "2026-06-17T04:09:25.639Z"
last_ts: "2026-06-17T04:14:54.789Z"
cwd: "H:\\prism-slot-india"
messages: 68
user_msgs: 24
assistant_msgs: 44
raw_file: "H:/.claude/projects/H--prism-slot-india/a803c8fa-8407-40f0-81d9-0a56f2031bb5/subagents/agent-a5fe5cf6d7031df44.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:57"
---

# Independent review of a change to a CRITICAL PRISM india orchestrator. Read both

> **claude-code-cli** | 2026-06-17 | 68 msgs (24 user / 44 assistant) | cwd: H:\prism-slot-india
> Raw: `H:/.claude/projects/H--prism-slot-india/a803c8fa-8407-40f0-81d9-0a56f2031bb5/subagents/agent-a5fe5cf6d7031df44.jsonl`

## Transcript

### User | 2026-06-17T04:09:25.639Z

Independent review of a change to a CRITICAL PRISM india orchestrator. Read both files fully:
- H:/prism/scripts/nn-graph-retrain-lifecycle.mjs  (new `defaultApplyVaultRefpool` + new pre-fingerprint stage "1a" in `runLifecycle`)
- H:/prism/scripts/__tests__/nn-graph-retrain-lifecycle.test.mjs  (new "vaultRefpool" tests + `vrHarness`)

CONTEXT: makes the vault->GNN reference pool durable across regen-viz rebuilds (which wipe the `ghost.vault-wired.*` refs) by re-applying them at the start of each retrain tick. Relies on `vault-to-gnn-refpool --apply` being content-idempotent (a prior shipped unit: no write when refs unchanged). Full suite is 72/72 green; the 5 new tests run in ~80ms (they stub stage 2b via `vrHarness` to avoid loading the 550MB graph).

Weight toward what arm A is less likely to catch:
1. TEST INTEGRITY (R9): for EACH of the 5 new tests, does it fail if the relevant code is reverted/broken? Especially: does "runs BEFORE the graph fingerprint read" fail if the stage is moved after step 1? Does "opt-out" fail if the env gate is removed? Does "fail-soft" fail if the inner try/catch is removed? Any vacuous test?
2. The `vrHarness` 2b-stub: does stubbing `buildEmbeddingSource` to `{ok:false,matched:0}` change what the vaultRefpool tests verify, or is it purely a speed optimization that leaves the stage-1a behavior intact? Confirm it doesn't mask a real interaction.
3. CONVENTION conformance with the existing 2b/2c stage pattern (opts.<impl>||default, fail-soft errors.push, opt-out env, result telemetry, spawnSync shape). Anything inconsistent?
4. HONEST SCOPE (R12): the durability is for the RETRAIN-LIFECYCLE's fingerprint+eval consumer only -- other graph consumers (gnn-active-pool-select, etc.) reading between a regen and the next lifecycle tick still see absent vault refs. Is that limitation worth flagging in the commit/handoff? Is the commit claim defensible?
5. Blast-radius: any way this stage perturbs the existing drift/train/eval/promote flow or th
... [+67 chars truncated]

### Assistant | 2026-06-17T04:09:32.422Z

I'll review both files end to end. Let me start by reading them fully.

### Assistant | 2026-06-17T04:09:33.462Z

[tool_use: Read]

### Assistant | 2026-06-17T04:09:33.849Z

[tool_use: Read]

### User | 2026-06-17T04:09:33.986Z

[tool_result] read-once-guard: 'H:\prism\scripts\nn-graph-retrain-lifecycle.mjs' was already read 16s ago in this session and is unchanged (mtime 1781668705712). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-17T04:09:34.300Z

[tool_result] read-once-guard: 'H:\prism\scripts\__tests__\nn-graph-retrain-lifecycle.test.mjs' was already read 16s ago in this session and is unchanged (mtime 1781669018326). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_RE
... [+11 chars truncated]

### Assistant | 2026-06-17T04:09:38.468Z

The files are already in my context from the read-once guard. Let me work with what I have. Let me look at the specific sections more carefully to verify my findings.

### Assistant | 2026-06-17T04:09:39.139Z

[tool_use: Read]

### User | 2026-06-17T04:09:39.590Z

[tool_result] read-once-guard: 'H:\prism\scripts\nn-graph-retrain-lifecycle.mjs' (same offset/limit) was already read 16s ago in this session and is unchanged (mtime 1781668705712). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRI
... [+16 chars truncated]

### Assistant | 2026-06-17T04:09:42.142Z

The read-once guard is blocking me but claims the content is in my context. However, I don't actually have the file content yet in this conversation — the guard fired before I received any content. Let me disable the cache to get the actual content.

### Assistant | 2026-06-17T04:09:43.406Z

[tool_use: Bash]

### User | 2026-06-17T04:09:48.701Z

[tool_result] #!/usr/bin/env node
/**
 * nn-graph-retrain-lifecycle.mjs — NN-GRAPH-MS2 / U2-SELF-RETRAIN-LIFECYCLE
 *
 * The autonomous half of the GNN tier-5 wiring classifier. Runs as a Windows

### Assistant | 2026-06-17T04:09:52.316Z

The cat works. The read-once guard is incorrectly claiming content is in my context when it is not. Let me read the full files via Bash with line numbers since the Read tool is blocked.

### Assistant | 2026-06-17T04:09:52.901Z

[tool_use: Bash]

### User | 2026-06-17T04:09:58.489Z

[tool_result] <persisted-output>
Output too large (56.7KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism-slot-india\a803c8fa-8407-40f0-81d9-0a56f2031bb5\tool-results\br69hoc80.txt

Preview (first 2KB):
     1	#!/usr/bin/env node
     2	/**
     3	 * nn-graph-retrain-lifecycle.mjs — NN-GRAPH-MS2 / U2-SELF-RETRAIN-LIFECYCLE
     4	 *
     5	 * The autonomous half of the GNN tier-5 wiring cla
... [+1787 chars truncated]

### Assistant | 2026-06-17T04:10:00.151Z

The output was saved to a file. Let me read it from there.

### Assistant | 2026-06-17T04:10:00.924Z

[tool_use: Read]

### User | 2026-06-17T04:10:04.315Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-891 of 1062 total (25317 tokens, cap 25000). Call Read with offset=892 limit=891 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	     1	#!/usr/bin/env node
2	     2	/**
3	     3	 * nn-graph-retrain-lifecycle.mjs — NN-GRAPH-MS2 / U2-SE
... [+51780 chars truncated]

### Assistant | 2026-06-17T04:10:08.035Z

I have the core lifecycle logic. The key new code is `defaultApplyVaultRefpool` (313-322) and stage 1a (632-655). Let me read the rest of the lifecycle file (CLI section) and the `nodeArgsWithHeap` helper to verify the spawnSync shape, then read the test file.

### Assistant | 2026-06-17T04:10:08.974Z

[tool_use: Read]

### User | 2026-06-17T04:10:14.351Z

[tool_result] 892	   892	    ckptMeta = ck && ck.metadata ? ck.metadata : null;
893	   893	  } catch {
894	   894	    /* no live checkpoint */
895	   895	  }
896	   896	  if (ckptMeta) {
897	   897	    lines.push(`Live checkpoint: trained ${ckptMeta.trainedAt || "?"}`);
898	   898	    lines.push(`  AUROC ${ckptMeta.auroc ?? "n/a"} · epochs ${ckptMeta.epochs ?? "?"} · stratified ${ckptMeta.stratifiedNegatives ? 
... [+8762 chars truncated]

### Assistant | 2026-06-17T04:10:17.493Z

I now have the full lifecycle file. The 1a stage ordering is clear: 1a (vault refpool, 632-655) runs BEFORE step 1 fingerprint (657-668), and crucially BEFORE the `result.action = "skip"` early return at the drift gate (681-685). Now let me read the full test file.

### Assistant | 2026-06-17T04:10:18.394Z

[tool_use: Bash]

### User | 2026-06-17T04:10:26.166Z

[tool_result] 850

### Assistant | 2026-06-17T04:10:29.321Z

[tool_use: Bash]

### User | 2026-06-17T04:10:35.631Z

[tool_result] saved 850 lines

### Assistant | 2026-06-17T04:10:39.189Z

Let me find the relevant new test sections: the vrHarness definition and the vaultRefpool tests.

### Assistant | 2026-06-17T04:10:40.419Z

[tool_use: Grep]

### User | 2026-06-17T04:10:41.428Z

[tool_result] 799: * vaultRefpool durability stage (U-VAULT-REFPOOL-DURABLE, pre-fingerprint)
805:function vrHarness(over = {}) {
809:test("vaultRefpool -- runs as a pre-fingerprint stage on a retrain (telemetry on result)", () => {
811:  const { opts } = vrHarness({ applyVaultRefpool: () => { applyCalls++; return { status: 0, summary: "UP-TO-DATE -- no write" }; } });
814:  assert.equal(result.vaultRefpool.ran
... [+1090 chars truncated]

### Assistant | 2026-06-17T04:10:46.640Z

Now let me read the full new test section (lines 795-850) plus understand the existing harness pattern that vrHarness is built on. Let me read the tail of the test file.

### Assistant | 2026-06-17T04:10:46.930Z

[tool_use: Read]

### User | 2026-06-17T04:10:47.503Z

[tool_result] File does not exist. Note: your current working directory is H:\prism-slot-india.

### Assistant | 2026-06-17T04:10:50.052Z

The /tmp path resolved differently. Let me use the absolute Windows temp path via Bash to dump the section directly.

### Assistant | 2026-06-17T04:10:51.145Z

[tool_use: Bash]

### User | 2026-06-17T04:10:56.152Z

[tool_result]      1	 * promoteDecision -- SELECTIVE-DEPLOY promotion path (opt-in, AI-SYSTEMS)
     2	 * The live tier-5 runs an ancient 0.096 8-dim checkpoint; a robustly deploy-
     3	 * ready-selective candidate is strictly better (consumer abstains below minConf).
     4	 * ------------------------------------------------------------------ */
     5	
     6	// A candidate that FAILS the full-coverage gate
... [+6254 chars truncated]

### Assistant | 2026-06-17T04:10:59.263Z

Now I need to see the base `harness()` function the vrHarness builds on, to verify what `calls.trainArgs`, `force`, default env, etc. are set up as. Let me find it.

### Assistant | 2026-06-17T04:11:00.754Z

[tool_use: Bash]

### User | 2026-06-17T04:11:06.957Z

[tool_result] 43:function harness(over = {}) {

### Assistant | 2026-06-17T04:11:10.566Z

[tool_use: Bash]

### User | 2026-06-17T04:11:15.470Z

[tool_result]      1	/**
     2	 * nn-graph-retrain-lifecycle.test.mjs — NN-GRAPH-MS2 / U2-SELF-RETRAIN-LIFECYCLE
     3	 *
     4	 * Reference-valued node:test suite for the GNN self-retrain lifecycle. The pure
     5	 * decision functions (graphFingerprint / driftDecision / promoteDecision) are
     6	 * tested against concrete expected values; runLifecycle is exercised end-to-end
     7	 * with injected depe
... [+5350 chars truncated]

### Assistant | 2026-06-17T04:11:29.281Z

I now have the full base harness. The harness defaults: `readBaseline: () => null`, which means the drift gate always retrains (no baseline -> first-run path). This is important for understanding the vaultRefpool tests — every vrHarness run hits the `retrain: true` path because there's no baseline.

Now let me verify each of the 5 tests against the code for R9 (does it fail if the code is reverted/broken). Let me trace carefully.

Let me verify a key concern: in the "opt-out" test, `result.vaultRefpool.disabled` is set only in the `if (env...DISABLE === "1")` branch (line 643). Let me also check that the `harness` default env is `{}` and that `runLifecycle` uses `opts.env` not `process.env` for the gate. Confirmed at line 575: `const env = opts.env || process.env;` and gate at 642 reads `env.PRISM_NN_RETRAIN_VAULT_REFPOOL_DISABLE`. Good — the test's `env: { ... }` controls it.

Now let me check one subtle thing: the opt-out gate at line 642 reads from `env` (injectable), but the galaxy-features gate at 715 reads `process.env.PRISM_GNN_GALAXY_NODEFEAT_DISABLE` (real process env). And the `defaultApplyVaultRefpool` heap reads `process.env`. Let me verify whether the vaultRefpool opt-out is consistently `env`-based. Let me also check `nicifySelf` and whether the real-wiring test could be affected. Let me look at whether there's any test verifying the non-disabled `ran:false` default shape.

Let me check the `embeddingBuild.matched` interaction — the vrHarness stubs `buildEmbeddingSource: () => ({ ok: false, matched: 0 })`. With `matched: 0`, line 702 condition `embeddingBuild.matched === 0` is true, so it pushes an error "node-embedding bridge: matched=0". Let me verify this doesn't interfere with the fail-soft test's error assertion (it greps for `/vault ref-pool apply failed/` — distinct string, so OK).

Let me verify there are no other tests that would be the "real-wiring" test touching vault refpool, and confirm the suite count.

### Assistant | 2026-06-17T04:11:31.287Z

[tool_use: Bash]

### User | 2026-06-17T04:11:37.057Z

[tool_result] 8: * inputs. One REAL-WIRING test drives the actual runAssessment() to prove the
14: *   (the heap flag is REQUIRED: one real-wiring test drives runAssessment(), which loads the
36:import { runAssessment } from "../lib/nn-graph-eval.mjs";
543: * REAL-WIRING — drive the actual runAssessment(), not a fake
546:test("real-wiring — runAssessment reads exactly the checkpoint path it is given", () => {
5
... [+1089 chars truncated]

### Assistant | 2026-06-17T04:11:47.730Z

There's no real-wiring test exercising `defaultApplyVaultRefpool` directly (the spawnSync path is never invoked in tests — it's always injected via `applyVaultRefpool`). That's an R15/R9 gap to flag (the spawnSync shape, the `--apply` flag, the heap arg, the summary slicing are uncovered), consistent with how 2b/2c galaxy spawn also lacks a direct test, but worth noting.

Now let me verify the critical R9 claim for the ordering test. The test asserts `order.slice(0,2) === ["apply","readGraph"]`. Let me confirm this would FAIL if stage 1a were moved AFTER step 1 (fingerprint). In the code, 1a (632-655) precedes `readGraph()` (660). If moved after the fingerprint read, `readGraph` would push first -> order would be `["readGraph","apply"]` -> assertion fails. Good, the test is non-vacuous for ordering.

But there's a subtlety worth checking: would the ordering test also pass if stage 1a were moved to run after the fingerprint but the drift gate skipped? No — with no baseline, drift always retrains, so both apply and readGraph run. The test correctly captures order. Good.

Now, a deeper R9 question on the ordering test: the comment says the invariant is "apply must precede the fingerprint read — else the restored ghosts trip the NEXT tick's drift gate." But does the test actually verify the *consequence* (no spurious drift), or just the ordering? It only verifies ordering. The drift-consequence is argued in the comment but not asserted. That's acceptable since ordering is the mechanism, but let me confirm the claim in the source comment (632-639) is internally consistent — content-idempotency is the load-bearing assumption. Let me verify the `vault-to-gnn-refpool.mjs` `--apply` idempotency claim is real, not assumed.

### Assistant | 2026-06-17T04:11:48.661Z

[tool_use: Bash]

### User | 2026-06-17T04:11:55.645Z

[tool_result] -rwxr-xr-x 1 wompu 197611 20884 Jun 16 22:40 H:/prism/scripts/vault-to-gnn-refpool.mjs*
---EXISTS---

### Assistant | 2026-06-17T04:11:59.306Z

The dependency exists. Let me verify the idempotency claim — that `--apply` skips the write when refs are unchanged (the load-bearing assumption for the "doesn't trip the NEXT tick's drift gate" argument).

### Assistant | 2026-06-17T04:12:00.870Z

[tool_use: Bash]

### User | 2026-06-17T04:12:04.753Z

[tool_result] 18: * idempotent graph-merge path as seed-ghost-from-unwired.mjs (imported, NOT
39: *   node scripts/vault-to-gnn-refpool.mjs --apply      # merge ghosts into system-graph.json
42: * The --apply path reads the ~542 MB system-graph.json; run with the big-heap
54:// that broke the tribal index). seed-ghost-from-unwired.mjs's --apply path still
264: * an unchanged ref-pool yields `changed:false` and 
... [+970 chars truncated]

### Assistant | 2026-06-17T04:12:13.917Z

Confirmed: line 264 "an unchanged ref-pool yields `changed:false` and the caller SKIPS the write" and line 349-352 "Idempotent no-op: every vault ref is already present + current. SKIP the [write]... UP-TO-DATE". The content-idempotency claim the new stage relies on is REAL, not assumed. The commit's "content-idempotent" premise is defensible.

Now let me verify one important concurrency/blast-radius concern. The `--apply` path of vault-to-gnn-refpool WRITES system-graph.json (542MB). The lifecycle does this in stage 1a, *then* reads the graph in step 1. Two questions:
1. Does the 1a write happen under the lifecycle's exclusive lock? Yes — 1a is inside the `try` after `acquireLock()` (line 631). But that lock (`retrain.lock`) only serializes lifecycle runs against each other, NOT against regen-viz or other graph writers. So a regen-viz running concurrently could collide. Let me check whether vault-to-gnn-refpool's write is atomic.

2. The drift gate consequence: if 1a writes (restores N ghosts) when refs were wiped, step 1's fingerprint will include those N restored ghosts. The baseline from the last tick (recorded after a prior apply also restored them) also had them. So no spurious drift. Correct. But on the FIRST tick after the feature ships, the baseline predates vault refs entirely — that's a legitimate one-time drift, not spurious. Acceptable.

Let me check the atomicity of the apply write to assess blast-radius on concurrent graph readers.

### Assistant | 2026-06-17T04:12:17.202Z

[tool_use: Bash]

### User | 2026-06-17T04:12:23.352Z

[tool_result]      1	  }
     2	
     3	  // Apply: idempotent merge by id (mirrors seed-ghost-from-unwired.mjs:298-329)
     4	  // but via streaming I/O -- the naive JSON.parse(readFileSync) the seeder's
     5	  // --apply still uses throws ERR_STRING_TOO_LONG on the >512 MB live graph.
     6	  console.log(`Reading graph ${GRAPH_PATH} (streaming)...`);
     7	  const g = readGraphStreaming(GRAPH_PATH);
    
... [+1291 chars truncated]

### Assistant | 2026-06-17T04:12:50.440Z

The write uses `writeGraphStreamingAtomic` (line 357) — atomic, so a concurrent graph reader won't see a torn file. Blast radius to concurrent readers is bounded. Good.

Now let me verify the spawnSync `timeout: 300000` behavior — a concern: if the apply spawn times out (graph is huge, 542MB write), spawnSync returns with `r.status = null` and `r.signal = 'SIGTERM'` (or error). Let me check how `defaultApplyVaultRefpool` handles a timeout: line 321 returns `{ status: r.status, summary, stderr: r.stderr }`. On timeout, `r.status` is `null`, `r.error` is set (ETIMEDOUT). The 1a handler at 649 checks `Number.isFinite(vr.status)` — `null` is not finite, so the non-zero-exit error branch is NOT triggered. The timeout would be silent (only `result.vaultRefpool.status = null` recorded). Let me check: is a timeout silently swallowed? `defaultApplyVaultRefpool` doesn't surface `r.error`. So a 5-min timeout (the apply genuinely needing >5min to write 542MB under load) would record `status:null` with no error pushed. That's a fail-soft-but-quiet edge — worth a P2 note (the 2b galaxy spawn has the same pattern, so it's consistent, not a new divergence).

Now let me confirm the `defaultApplyVaultRefpool` heap/timeout and whether 300000ms (5 min) is enough vs the trainer subprocess which uses no timeout. Let me also double check one R9 concern on the non-zero-exit test: test at 845 returns `{ status: 2, stderr: "partial restore" }`. Code line 649: `Number.isFinite(2) && 2 !== 0` -> pushes error "vault ref-pool apply: exit 2". Test asserts `/vault ref-pool apply: exit 2/`. 

Let me verify the exact error string format matches. Code line 650: `` `vault ref-pool apply: exit ${vr.status} (retrain continues) ...` `` -> "vault ref-pool apply: exit 2 (retrain continues) ...". Regex `/vault ref-pool apply: exit 2/` matches. Good, non-vacuous.

Now the fail-soft test (837): `applyVaultRefpool: () => { throw new Error("graph locked") }`. Code line 652-653 catches and pushes "vault ref-pool
... [+847 chars truncated]

### Assistant | 2026-06-17T04:12:51.345Z

[tool_use: Bash]

### User | 2026-06-17T04:12:52.001Z

[tool_result] PRISM MCP DISCONNECTED -- ENFORCED CHECK (your prism MCP tools are dead this session)
   THIS chat's bridge is stale-heartbeat (pid 50332 gone) | fleet-wide: 0 mcp-http-bridge processes running (enum-cache 35s old).
   The daemon (:3100) may be UP, but THIS session has no live MCP bridge -- every mcp__prism__* call will fail.
   This block fires ONCE per disconnect episode (~3min), then degraded-m
... [+520 chars truncated]

### Assistant | 2026-06-17T04:12:55.119Z

That's an MCP-bridge advisory, not a real failure of my command — but the command output was suppressed. The MCP disconnect doesn't affect my read-only review (I'm not using prism MCP tools). Let me retry the sed.

### Assistant | 2026-06-17T04:12:56.526Z

[tool_use: Bash]

### User | 2026-06-17T04:13:04.951Z

[tool_result] 631:   try {
632:     // 1a (PRE-fingerprint, U-VAULT-REFPOOL-DURABLE slot:india). Restore CONFIRMED
819: 
820:     safeLedger(appendLedger, result, errors);
821:     return result;
822:   } finally {
823:     try {
824:       releaseLock();
825:     } catch (e) {
826:       errors.push(`lock release failed: ${e && e.message ? e.message : e}`);
827:     }
828:   }
829: }

### Assistant | 2026-06-17T04:13:17.484Z

Confirmed: the outer `try` (631) is paired only with `finally` (822) — no `catch`. So the inner try/catch in stage 1a is the ONLY thing preventing an `applyVaultRefpool` throw from propagating out of `runLifecycle`. The fail-soft test is non-vacuous: removing the inner catch makes `runLifecycle(opts)` throw and the test fails. R9 holds.

Now let me verify the opt-out test R9: if the env gate at 642 is removed, the code always calls `applyVaultRefpool`. The test injects `applyVaultRefpool: () => { applyCalls++; ... }` and asserts `applyCalls === 0` plus `result.vaultRefpool.disabled === true`. If the gate is removed, `applyCalls` becomes 1 AND `result.vaultRefpool.disabled` would be undefined (the disabled-branch sets it) -> both assertions fail. Non-vacuous. Good.

Now the telemetry test (809): asserts `applyCalls === 1`, `result.vaultRefpool.ran === true`, `result.vaultRefpool.status === 0`. If 1a were removed entirely, `result.vaultRefpool` would be undefined -> `result.vaultRefpool.ran` throws TypeError -> test fails. Non-vacuous.

Now let me address point 2 (the vrHarness 2b-stub). The vrHarness stubs `buildEmbeddingSource: () => ({ ok: false, matched: 0 })`. Stage 1a runs BEFORE 2b and none of the vaultRefpool assertions inspect embedding-related state. The stub returns `matched: 0`, which routes into the `matched === 0` error push (line 702) — adding a benign error to `result.errors`. Does this contaminate the fail-soft test's error assertion? The fail-soft test asserts `result.errors.some(e => /vault ref-pool apply failed/.test(e))` — a distinct substring. The matched=0 error ("node-embedding bridge: matched=0...") doesn't match that regex, so no false positive/negative. The stub is purely a speed optimization and doesn't mask the stage-1a behavior. Confirmed sound.

One more: with `ok:false`, line 698's condition (`ok && written===1 && matched>0`) is false, so `embeddingSourcePath` stays null, the 2c galaxy block (715, gated on `embeddingSourcePath &&...`) i
... [+302 chars truncated]

### Assistant | 2026-06-17T04:13:18.990Z

[tool_use: Bash]

### User | 2026-06-17T04:13:33.113Z

[tool_result] 313: function defaultApplyVaultRefpool() {
314:   const heapMb = Number(process.env.PRISM_NN_RETRAIN_LIFECYCLE_HEAP_MB) || LIFECYCLE_DEFAULTS.heapMb;
315:   const r = spawnSync(
316:     process.execPath,
317:     nodeArgsWithHeap(path.join(__dirname, "vault-to-gnn-refpool.mjs"), heapMb, ["--apply"]),
318:     { cwd: ROOT, encoding: "utf8", timeout: 300000 },
319:   );
320:   const summary = ((r.s
... [+1117 chars truncated]

### Assistant | 2026-06-17T04:13:48.443Z

The `defaultApplyVaultRefpool` spawn shape is a near-exact match to the 2c galaxy-node-features spawn (720-727): same `process.execPath`, same `nodeArgsWithHeap(...heapMb...)`, same `{ cwd: ROOT, encoding: "utf8", timeout: 300000 }`, same `summary` extraction (`stdout.trim().split("\n").pop().slice(0,200)`). Excellent convention conformance. The only difference is `defaultApplyVaultRefpool` also returns `stderr` (used by the 1a handler) — appropriate.

The telemetry shape `result.vaultRefpool = { ran, status, summary }` (line 648) matches the 2c `result.galaxyNodeFeatures = { ran, status, summary }` (727). The opt-out shape `{ ran:false, disabled:true }` (643) matches the convention. The fail-soft `errors.push(...)` pattern (650, 653) matches 2c (731, 734) and 2b (701-706). All consistent.

One inconsistency worth noting: stage 1a's opt-out gate reads `env.PRISM_NN_RETRAIN_VAULT_REFPOOL_DISABLE` (injectable `env` — line 642), whereas the 2c galaxy gate reads `process.env.PRISM_GNN_GALAXY_NODEFEAT_DISABLE` directly (line 715). The 1a choice (injectable `env`) is actually the *better* one — it's testable, which is exactly why the opt-out test works. So this is a positive divergence (1a improves on 2c's testability), not a defect. Note that the `defaultApplyVaultRefpool` heap read still uses `process.env` (314) — but that's inside the default impl which tests bypass, consistent with 2c's heap read at 720.

Now let me check the non-zero-exit branch one more time for an edge: when `vr.status` is `null` (timeout/spawn-error). Line 649: `Number.isFinite(null)` is false -> branch skipped -> no error pushed. This means a spawn `error` (e.g. ENOENT, timeout SIGTERM) on the apply is recorded as `status:null` with no error surfaced. The 2c galaxy block has the same gap (`gm.status !== 0 && gm.status !== 2` — if `gm.status` is null on timeout, `null !== 0 && null !== 2` is TRUE, so 2c WOULD push an error on a null status, but 1a would NOT because it gates on `Number.isFinite`). 
... [+532 chars truncated]

### Assistant | 2026-06-17T04:13:49.381Z

[tool_use: Bash]

### User | 2026-06-17T04:13:56.946Z

[tool_result] 536:   try {
537:     appendLedger({
538:       schemaVersion: SCHEMA_VERSION,
539:       ts: result.ts,
540:       action: result.action,
541:       ok: result.ok,
542:       drift: result.drift,
543:       fingerprint: result.fingerprint,
544:       trained: result.trained,
545:       trainExitCode: result.trainExitCode,
546:       assessment: result.assessment,
547:       promote: result.promot
... [+88 chars truncated]

### Assistant | 2026-06-17T04:14:06.992Z

`safeLedger` (537-549) emits a fixed allowlist of fields and does NOT include `vaultRefpool`, `embeddingBridge`, `galaxyNodeFeatures`, or `activeWorklist`. So the new `result.vaultRefpool` telemetry is NOT persisted to the ledger — it lives only on the in-memory `result` object. That's consistent with how the *existing* 2b/2c telemetry (`embeddingBridge`, `galaxyNodeFeatures`) is also absent from the ledger, so it's a pre-existing convention, not a new defect. But it does mean a non-zero apply exit (R12 surfacing) reaches the ledger only via the `errors` array (which IS persisted, line 549) — and the error string IS pushed (650), so the durable record does capture the failure. Good: R12 honesty is preserved in the durable ledger via `errors`, even though the structured `vaultRefpool.status` is not. No defect.

Blast-radius summary: stage 1a is strictly additive — it does not touch `baseline`, `drift`, `train`, `eval`, `promote`, the lock, or the candidate/live checkpoints. Its only graph mutation is the idempotent atomic restore of vault refs, which (a) is a no-op in steady state, (b) is atomic so concurrent readers are safe, (c) runs before the fingerprint so it cannot trigger spurious drift. The promote safety invariant (the load-bearing `promoteDecision`) is untouched.

Now let me address point 4 (honest scope, R12). The durability is for the retrain-lifecycle's fingerprint+eval consumer. Let me verify whether `gnn-active-pool-select` (named in the prompt) reads the graph and would see absent vault refs between a regen and the next tick.

### Assistant | 2026-06-17T04:14:09.028Z

[tool_use: Bash]

### User | 2026-06-17T04:14:19.307Z

[tool_result] 70:const GRAPH_PATH = path.join(ROOT, "state", "shared", "system-viz", "system-graph.json");
368:  const out = { graphPath: GRAPH_PATH, topK: ACTIVE_POOL_DEFAULTS.topK, json: false };
---
H:/prism/scripts/nn-graph-retrain-lifecycle.mjs
H:/prism/scripts/vault-to-gnn-refpool.mjs
H:/prism/scripts/vault-to-gnn-refpool.test.mjs

### Assistant | 2026-06-17T04:14:54.789Z

This confirms point 4. `gnn-active-pool-select.mjs` reads the same `GRAPH_PATH` (line 70/368) but does NOT reference `ghost.vault-wired` directly — though it reads the whole graph for ghost selection. More importantly, the grep confirms the durability fix touches only the `nn-graph-retrain-lifecycle` + `vault-to-gnn-refpool` pair. Between a regen-viz rebuild (which wipes vault refs) and the next lifecycle tick, ANY graph consumer reading in that window (active-pool-select, nn-graph-eval invoked standalone, system-viz find, etc.) sees the absent vault refs. The durability is scoped to the lifecycle's own fingerprint+eval, NOT graph-wide.

This IS a real scope limitation worth flagging in the commit/handoff (R12). The truly robust fix would be re-applying vault refs inside regen-viz itself (so the graph is never in a wiped state), but that's a larger change. The lifecycle-tick re-apply is a defensible, bounded choice — it guarantees the *retrain* (the consumer that matters for model quality) always trains/evals on the full ref-pool. The commit claim "makes the vault->GNN reference pool durable across regen-viz rebuilds ... by re-applying them at the start of each retrain tick" is honest about the mechanism (re-apply at retrain tick) but a reader could over-read "durable" as graph-wide. The handoff should state the window limitation explicitly.

I have everything I need. Let me compile the verdict.

## Review Complete

I read both files end to end (the lifecycle `.mjs` 1062 lines and the test `.mjs` 850 lines), plus verified the load-bearing dependency `vault-to-gnn-refpool.mjs` idempotency claim and traced cross-consumer scope. Findings below.

---

VERDICT: PASS

summary: The new pre-fingerprint stage 1a (`H:/prism/scripts/nn-graph-retrain-lifecycle.mjs:632-655`) and `defaultApplyVaultRefpool` (`:313-322`) are correctly ordered, fail-soft, opt-out-gated, and strictly additive — they do not perturb the drift/train/eval/promote/baseline/ledger flow or the load-bearing 
... [+4748 chars truncated]
