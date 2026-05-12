# CAD Regression Test Runbook — Operator Guide

> **Milestone:** CAD-INFRA-MS0 / U-CINF15
> **Subsystem:** `prism_cad_regression` MCP dispatcher (25 actions, 9 engines, 7 safety hooks)
> **Purpose:** Run, monitor, and interpret the 20,006-file CAD regression test corpus end-to-end.
> **Version:** 1.0 — first live wiring (2026-05-12). Prior to this date, the dispatcher and 7 safety hooks existed on disk but were not registered with the MCP entry point. If older docs/handoffs describe `prism_cad_regression` as "broken" or "missing", they pre-date this commit.
> **Last verified:** 2026-05-12

> ### ⚠️ Critical hazards (read before first run)
> 1. **No mutex.** Two concurrent `cad_regression_run` calls on the same `batchId` silently corrupt state. Operator discipline is the only safeguard. See §3a.
> 2. **The call BLOCKS for hours.** There is no async-fire option. Plan transport accordingly. See §3a.
> 3. **`cad_artifact_prune` has no active-batch check** — running it during a live batch can delete the in-flight state file. See §3d and §12.
> 4. **The stuck-batch guard reads caller-supplied timestamps**, not filesystem state. Naive callers (no timestamp) bypass it silently. See §10.
> 5. **The `comparison` failure category depends on the WorkerThreadRunner** (separate unit). The orchestrator in this build accepts an injected runner — no default. See §6 and §16.

This runbook covers everything an operator needs to drive a regression batch over JM Die's full CAD corpus (currently 20,006 files; the indexer auto-grows). Read top-to-bottom on first run; later runs you can jump to the "Standard workflow" section.

---

## 1. What this system does

The CAD regression pipeline answers one question: **"If we changed the CAD/CAM stack today, does it still produce equivalent toolpaths for every CAD file we've ever seen?"**

Mechanism:
1. **Index** every CAD file under the corpus root (recursive, idempotent, dedup by SHA-256). → `cad_index_run`
2. **Classify** each file into part / assembly / drawing / CAM by extension. → `cad_classify_run`
3. **Run** the regression batch — parallel workers (default 8) generate a STEP for each file, diff against a baseline. Atomic per-file state, resumable on crash. → `cad_regression_run`
4. **Triage** failures into 6 categories (format / parse / generation / comparison / timeout / crash). → `cad_failure_triage_group`
5. **Analyze** pass-rate by customer / format / machine category; detect trends and hotspots. → `cad_regression_analyzer_*`
6. **Report** in plain-text or PDF/HTML for stakeholder review. → `cad_regression_report_summary`
7. **Live dashboard** in the web UI (`/cad-regression`) for in-flight progress.

Throughout, **7 safety hooks** (3 blocking + 2 warning + 2 logging) guard against malformed batches, stuck runs, retry storms, and silent corruption. See §10.

---

## 2. Prerequisites

- **MCP server up.** Verify with `curl localhost:3100/health` or check that `prism_cad_regression` appears in the tool list (`prism_session:dispatcher_map_compact`).
- **Disk space.** A 20K-file batch produces ~500 MB–2 GB of state + artifacts depending on diff retention. Default state dir: `mcp-server/data/state/cad-regression-tests/`. Default artifact root: `mcp-server/data/cad-test-artifacts/`. Provision at least 5× headroom.
- **CAD corpus root.** Configurable via the `rootDir` parameter to `cad_index_run`. The canonical corpus is `H:/prism/JM DIE/`.
- **Baseline batch (optional but recommended).** Diff/trend/hotspot analyses require at least one prior "golden" batch to compare against. The first run is its own baseline — keep its `batchId` for future diffs.
- **Worker count.** Default 8. Override per-batch via `OrchestratorOptions.workerCount`. Set lower on shared machines; the orchestrator does not throttle CPU automatically.

---

## 3. Standard workflow — first-time 20K run

### 3.0. Pre-flight (mandatory on a fresh branch or machine)

Before invoking your first full 20K run, run the smoke test from §13:

```bash
cd H:/prism/mcp-server
npx vitest run src/__tests__/cadRegressionOrchestrator.test.ts
```

It must pass green in under 30 s. If it does not, **do not proceed** — your runner-bridge or fixture setup is misconfigured, and hours of compute will fail in surprising ways. The smoke test is the cheapest possible signal.

If you are on a fresh branch that touched any CAD engine, also run:
```bash
npx vitest run src/__tests__/cadRegression
```
(all 8 cadRegression test files — ~30 s total).

### 3a. Kickoff (4 actions, ~5 min wall clock to "running")

> **⚠️ Concurrent execution is unsafe.** The orchestrator has no mutex / no lockfile / no PID stamp in the state JSON. Two `cad_regression_run` calls with the same `batchId` will silently corrupt state via interleaved load→update→save cycles (each `atomicWrite` is atomic; the surrounding read-mutate-write loop is not). Never fire `cad_regression_run` twice for the same `batchId` from different MCP clients, sessions, or processes. If you are unsure whether a previous orchestrator is still alive, run the Windows verification recipe in §4 before starting.

> **⚠️ The MCP call blocks for the full duration.** There is no async-fire option in this build. The MCP server holds the connection open until the orchestrator returns. Most MCP clients (Claude Desktop ~5 min, HTTP defaults) will time out long before the orchestrator finishes. The Node process keeps running after the client times out. **Do not cancel and retry** — that creates two orchestrators on the same state (see hazard above). Best practice: invoke from a detached Node process / nohup-style shell job that you are willing to leave running for hours. Monitor progress via §3b from a *second* MCP client.

```jsonc
// 1. Build the master index — ~2 min for 20K files (one-time, idempotent)
{ "tool": "prism_cad_regression", "action": "cad_index_run",
  "params": { "rootDir": "H:/prism/JM DIE" } }
// → MasterIndex { runId, files: [{fileId, absolutePath, format, sizeBytes, ...}] }
// (All examples below use tool: prism_cad_regression; omitted for brevity.)

// 2. Classify formats — parts vs assemblies vs drawings vs CAM
{ "action": "cad_classify_run", "params": { "runId": "<from step 1>" } }
// → ClassificationSummary { byType: { part: N, assembly: N, drawing: N, cam: N } }

// EXTRACT fileIds from step 1's result before step 3:
//   Typed client:    index.files.map(f => f.fileId)
//   jq:              jq '.files[].fileId' < index-result.json
// The list has ~20K entries.

// 3. Generate a stable batchId (MUST be UUID v4 — see §11) and kick off the regression
{ "action": "cad_regression_run",
  "params": {
    "batchId": "<uuid-v4>",                   // pin this, you'll need it everywhere
    "fileIds": ["<sha-1>", "<sha-2>", "..."], // ~20K entries from step 1's index
    "stateDir": "mcp-server/data/state/cad-regression-tests"
  } }
// → TestBatch — response is ~5-20 MB of JSON (one entry per file). Pipe to a file:
//   `> batch-result.json` — stdout will be unreadable.
//
// CALL BEHAVIOR:
//   - The MCP transport holds open until the orchestrator finishes (hours for 20K).
//   - Your client will likely time out; the Node orchestrator keeps running.
//   - Monitor via §3b from a separate MCP session.
//   - Do NOT cancel + retry — creates concurrent orchestrators, corrupts state.
```

### 3b. Monitor — live dashboard (2 actions)

```jsonc
// Live snapshot for one batch — counts, error breakdown, recent failures, throughput, ETA
{ "action": "cad_regression_dashboard_snapshot",
  "params": { "batchId": "<uuid>", "windowMinutes": 5, "recentLimit": 10 } }

// One-row-per-batch summary across all known batches (sorted newest-first)
{ "action": "cad_regression_dashboard_list" }
```

The web UI at `/cad-regression` polls `cad_regression_dashboard_snapshot` every 5 s and renders:
- Progress bar (`pctComplete`)
- Error-type pie chart (6 categories)
- Recent failures table with drill-down → artifact viewer
- Throughput estimate + ETA

**Trigger condition to stop watching:** `lifecycle === "completed"` on the snapshot.

### 3c. Interpret (5 actions)

Once the batch is `completed`:

```jsonc
// Pass-rate breakdown — by customer, format, machine category, complexity tier
{ "action": "cad_regression_analyzer_diff",
  "params": { "baseBatchId": "<golden>", "candidateBatchId": "<this run>" } }
// → DiffReport { transitions: [...], summary: { regressed: N, fixed: N, ... } }

// Trend across multiple batches over time
{ "action": "cad_regression_analyzer_trend",
  "params": { "batchIds": ["<oldest>", ..., "<newest>"] } }
// → TrendReport { points: [{ batchId, passRate, completedAt }] }

// Files that fail across many runs — refactor candidates
{ "action": "cad_regression_analyzer_hotspots",
  "params": { "batchIds": [...], "threshold": 0.5, "minAppearances": 3 } }
// → HotspotReport { hotspots: [{ fileId, failureRate, appearances }] }

// Aggregate executive summary in plain text
{ "action": "cad_regression_report_summary",
  "params": { "snapshot": <from snapshot>, "diff": <from diff>,
              "trend": <from trend>, "hotspots": <from hotspots>,
              "rowLimit": 50 } }
// → formatted markdown for stakeholder distribution
```

### 3d. Cleanup

The orchestrator persists state to `<stateDir>/<batchId>.json` and artifacts to `<artifactRoot>/<batchId>/<fileId>/`. Both are kept indefinitely by default — set retention via:

```jsonc
{ "action": "cad_artifact_prune",
  "params": { "maxBatches": 5 } }
// → RetentionReport { kept: [...], removed: [...] }
```

The default retention is 5 most-recent batches. State JSON is not pruned automatically — back it up to long-term storage before pruning manually.

> **⚠️ Do NOT run `cad_artifact_prune` while any batch is active.** `pruneRetention` walks the artifact directory by `mtimeMs` alone with no check on whether the matching `<stateDir>/<batchId>.json` is currently being mutated. If a live batch falls outside the retention window (e.g. you started a new run while an older long-running one is still on the books), the live state file gets deleted; the running orchestrator's next `atomicWrite` recreates it as a fresh batch, **losing all `pass|fail|skip` transitions since the last checkpoint**. Before pruning manually or via cron, confirm via `cad_regression_dashboard_list` that no batch has `lifecycle: "running"`.

**Backup recipe before pruning** (Windows PowerShell — back up state AND artifacts together):
```powershell
$bid = "<batchId>"
$stamp = Get-Date -Format yyyyMMdd-HHmmss
Compress-Archive `
  -Path "data/state/cad-regression-tests/$bid.json", "data/cad-test-artifacts/$bid/" `
  -DestinationPath "archive/cad-regression-$bid-$stamp.zip"
# verify the zip listing
Get-ChildItem "archive/cad-regression-$bid-$stamp.zip" | Format-List
```
Verify the archive listing before any `Remove-Item` — naive deletion of `data/state/...` orphans artifacts the analyzer still expects to find.

---

## 4. Resume from interruption

The orchestrator checkpoints every 100 files (or every 60 s, whichever comes first). If the process dies — power loss, OOM, `kill -9` — restart resumes within 1 file of the last checkpoint.

```jsonc
// 1. See what's left to do for this batchId
{ "action": "cad_checkpoint_resume_diff", "params": { "batchId": "<uuid>" } }
// → ResumeDiff { pending: N, running: N, completed: N, total: N }

// 2. Restart the orchestrator — same batchId, same fileIds, same stateDir
//    The orchestrator loads the existing state and only processes pending/running entries.
{ "action": "cad_regression_run",
  "params": { "batchId": "<same uuid>", "fileIds": [...], "stateDir": "..." } }
```

**Stuck-batch guard fires automatically** (see §10). If the resume_diff reports the batch hasn't advanced in >30 min, the `cad-regression-stuck-batch-guard` hook will BLOCK the resume unless you explicitly override:

```jsonc
{ "action": "cad_regression_run",
  "params": { "batchId": "<uuid>", "fileIds": [...], "force": true } }
```

Only set `force: true` after confirming via filesystem inspection that the previous run actually died. Otherwise you risk two orchestrators racing on the same state file (there is no lockfile — see §3a hazard).

**Windows verification recipe** (this repo is win32, no `lsof`/`fuser`):

```powershell
# Identify all Node processes older than 30 minutes (the stuck threshold).
# The orchestrator runs as 'node' — confirm none are still alive.
Get-Process node -ErrorAction SilentlyContinue |
  Where-Object { $_.StartTime -lt (Get-Date).AddMinutes(-30) } |
  Format-Table Id, StartTime, CPU, WorkingSet, Path
```

If the list is empty (or contains only your current shell's helpers), the old orchestrator is genuinely dead and `force: true` is safe. Otherwise: `Stop-Process -Id <pid> -Force`, wait 10 s for the OS to release the file handle, then resume.

**Why this matters:** the stuck-batch guard (§10) only inspects timestamps the caller supplies — it does NOT independently read filesystem state or detect live processes. A naive resume can race a still-running orchestrator without any safety net firing.

---

## 5. Abort

There is no in-band "abort" action — the orchestrator runs to completion or until killed. To abort:

1. Kill the orchestrator process (`taskkill /F /PID <pid>` or equivalent).
2. The state file remains at the last checkpoint — `lifecycle` will read as `running` even though nothing is running.
3. Either:
   - **Resume** later (§4), OR
   - **Discard** the batch: delete `<stateDir>/<batchId>.json` and `<artifactRoot>/<batchId>/`. Be aware no audit trail of the partial run survives.

For a graceful early-stop without losing partial results, the safety hook `cad-regression-stuck-batch-guard` will eventually block the run after 30 min of no progress, effectively halting it. Use this if you don't have process access.

---

## 6. Failure triage workflow

After a batch completes (or for a still-running batch), classify failures:

```jsonc
// One file at a time — useful from the UI drill-down
{ "action": "cad_failure_triage_one",
  "params": { "fileId": "<sha>", "errorMessage": "<from log>" } }
// → TriageResult { fileId, category, signature, suggestedActions[] }

// Whole batch — produces a TriageGroup[] grouped by signature
{ "action": "cad_failure_triage_group",
  "params": { "batchId": "<uuid>" } }
// → TriageGroup[]  e.g. [{ signature: "STEP parse: unexpected token", count: 23, files: [...] }]
```

Categories (from `cadRegressionTestSchema.ts`):

| Category | Meaning | First action |
|----------|---------|--------------|
| `format` | File unreadable / unsupported format | Check the extension is in the classifier's accept list |
| `parse` | CAD kernel could not parse | Try opening manually in source CAD app; may be corrupt file |
| `generation` | Toolpath / CAM generation failed | Check the CAM strategy used; recent regression in CAM engine |
| `comparison` | Diff exceeded tolerance | Tolerance is set by the injected `TestRunner` — the production `WorkerThreadRunner` ships in a separate unit (see §16). In this build the orchestrator accepts any injected runner; callers without a runner hit `validate()` failure. Tolerance too tight, or real geometry change. |
| `timeout` | Worker exceeded wall-clock limit | File is pathological — increase per-file timeout or isolate |
| `crash` | Unhandled exception / OOM | Bug in code path; capture stack from artifact log |

**Hotspot warning:** if a file appears in the analyzer's hotspot list and you triage it again, the `cad-regression-hotspot-warning` hook will surface a warning — recurring regression risk, prioritize manual investigation over another re-run.

---

## 7. Artifacts (per-file inspection)

Every failed file gets up to 4 artifacts under `<artifactRoot>/<batchId>/<fileId>/`:

| Kind | What it is |
|------|------------|
| `expected_step` | Baseline (golden) STEP output |
| `actual_step` | What this run actually produced |
| `diff_png` | Rendered diff overlay image |
| `error_log` | Captured stderr / stack trace |

```jsonc
// Write an artifact (orchestrator does this automatically; rarely called manually)
{ "action": "cad_artifact_write",
  "params": { "batchId": "<uuid>", "fileId": "<sha>",
              "kind": "diff_png", "data": "<base64>" } }

// List every artifact in a batch — useful for archive scripting
{ "action": "cad_artifact_list", "params": { "batchId": "<uuid>" } }

// Prune old batches per retention policy
{ "action": "cad_artifact_prune", "params": { "maxBatches": 5 } }
```

The `cad-regression-artifact-log` hook records every artifact write in the audit log — `(batchId, fileId, kind)` triplet. Useful for forensics after a disputed result.

---

## 8. Generate reports

```jsonc
// Single-aspect render
{ "action": "cad_regression_report_snapshot",  "params": { "snapshot": <dashboard snapshot> } }
{ "action": "cad_regression_report_diff",      "params": { "diff": <analyzer diff>, "rowLimit": 50 } }
{ "action": "cad_regression_report_trend",     "params": { "trend": <analyzer trend> } }
{ "action": "cad_regression_report_hotspots",  "params": { "hotspots": <analyzer hotspots> } }

// Combined executive summary — pass all four, get one markdown doc
{ "action": "cad_regression_report_summary",
  "params": { "snapshot": ..., "diff": ..., "trend": ..., "hotspots": ..., "rowLimit": 50 } }
```

Output is markdown. For PDF/HTML export, pipe the markdown through your existing report pipeline (PRISM exports are not yet wired through this dispatcher — separate scope).

---

## 9. MCP action reference (all 25 actions)

Grouped by engine. All actions live under the `prism_cad_regression` MCP tool. Schemas in `mcp-server/src/schemas/cadRegressionActionSchemas.ts`.

| Engine | Actions |
|--------|---------|
| **Indexer** (CINF01) | `cad_index_run`, `cad_index_diff`, `cad_index_load` |
| **Classifier** (CINF02) | `cad_classify_run`, `cad_classify_one` |
| **Orchestrator** (CINF04) | `cad_regression_run`, `cad_regression_load` |
| **Checkpoint** (CINF05) | `cad_checkpoint_save`, `cad_checkpoint_load`, `cad_checkpoint_resume_diff` |
| **Failure Triage** (CINF06) | `cad_failure_triage_one`, `cad_failure_triage_group` |
| **Artifact Storage** (CINF07) | `cad_artifact_write`, `cad_artifact_list`, `cad_artifact_prune` |
| **Dashboard** (CINF08) | `cad_regression_dashboard_snapshot`, `cad_regression_dashboard_list` |
| **Analyzer** (CINF10) | `cad_regression_analyzer_diff`, `cad_regression_analyzer_trend`, `cad_regression_analyzer_hotspots` |
| **Report** (CINF11) | `cad_regression_report_snapshot`, `cad_regression_report_diff`, `cad_regression_report_trend`, `cad_regression_report_hotspots`, `cad_regression_report_summary` |

All schemas are Zod v4. Invalid params return `dispatcherError` with the Zod path. Missing required fields fail loud — see §10 for the validation hook stack.

---

## 10. Safety hook behavior

7 hooks fire on every CAD-regression action via `HookExecutor`. Defined in `mcp-server/src/hooks/CADRegressionSafetyHooks.ts`, registered in `mcp-server/src/hooks/index.ts` as part of `allHooks` + `hooksByCategory.cadRegressionSafety`.

### Blocking (3) — fail loud, no override except `force`

| ID | Triggers on | Blocks when |
|----|-------------|-------------|
| `cad-regression-batch-id-format` | All 20 state-carrying actions | `batchId` (or `baseBatchId` / `candidateBatchId` / each entry of `batchIds[]`) doesn't match `/^[A-Za-z0-9][A-Za-z0-9._-]{2,127}$/`. UUIDs and slug-style IDs pass; whitespace, empty, or wildcard fails. |
| `cad-regression-state-guard` | `cad_checkpoint_save`, `cad_failure_triage_group`, `cad_regression_load` | Inline `batch` payload has wrong `schemaVersion` (must be 1), missing/empty `batchId`, non-object `files` or `stats`. |
| `cad-regression-stuck-batch-guard` | `cad_regression_run`, `cad_checkpoint_resume_diff`, `cad_checkpoint_save` | The **caller-supplied** `lastCheckpoint` (or `lastUpdate`, or `lastHeartbeat`) is older than `stuckThresholdMinutes` (default 30). **⚠️ Reads from request params, not filesystem.** Callers omitting the field pass silently; malformed timestamps also pass silently. Override via `stuckThresholdMinutes: N`, or bypass entirely with `force: true` / `allowStuck: true`. Treat as advisory, not a true safety rail. |

### Warning (2) — surface but don't block

| ID | Triggers on | Warns when |
|----|-------------|-----------|
| `cad-regression-retry-warning` | `cad_regression_run`, `cad_checkpoint_resume_diff` | `retryCount > 3` for a file — recommend manual triage instead of another rerun. |
| `cad-regression-hotspot-warning` | `cad_regression_run`, `cad_failure_triage_one`, `cad_failure_triage_group` | The current `fileId` appears in the caller-supplied `hotspotFileIds` list. |

### Logging (2) — audit only

| ID | Triggers on | Logs |
|----|-------------|------|
| `cad-regression-lifecycle-log` | `cad_regression_run`, `cad_regression_load`, `cad_checkpoint_save`, `cad_checkpoint_load`, `cad_checkpoint_resume_diff` | One structured line per lifecycle transition: `action` + `batchId`. |
| `cad-regression-artifact-log` | `cad_artifact_write`, `cad_artifact_prune` | `(batchId, fileId, kind)` per artifact mutation. |

All hooks are listed in `hookCounts.cadRegressionSafety` (count = 7) and queryable via `getHooksByCategory("cadRegressionSafety")` or `getHooksByCategory("cad-regression-safety")`.

---

## 11. Troubleshooting

### Symptom: "Batch has not advanced for X.X min"
**Hook:** `cad-regression-stuck-batch-guard` blocked the action.
**Diagnosis:**
1. Run `cad_checkpoint_resume_diff` (read-only, doesn't trigger the guard) — see how many files are `pending` vs `running`.
2. Check the orchestrator process is actually alive — `tasklist | findstr node` (or platform equivalent).
3. If the process is gone but state says `running`, that's a zombie state.
**Fix:**
- If you have orchestrator access and it's hung: kill it, then resume with `cad_regression_run` (hook will allow because >30 min stale).
- If you don't have process access and the state is genuinely stuck: pass `force: true` to override the guard. *Do not* set `force: true` blindly — confirm via filesystem the state file's `lastCheckpoint` timestamp is genuinely stale.

### Symptom: "Corrupt CAD regression state payload"
**Hook:** `cad-regression-state-guard` blocked.
**Diagnosis:** The state file at `<stateDir>/<batchId>.json` has wrong `schemaVersion`, missing `batchId`, or malformed `files`/`stats`.
**Fix:**
1. Run `validateTestBatch(<contents>)` (from `cadRegressionTestSchema.ts`) to get the exact field error.
2. If `schemaVersion` is wrong, you may need a migration — check `src/migrations/`. If no migration exists, the only safe option is to abandon this batch and re-run from scratch.
3. If the file is truncated (disk filled mid-write), restore from the previous checkpoint backup.

### Symptom: Workers stuck on a single file for >30 s
**Cause:** That file hit the per-file timeout (default 30 s). The orchestrator will mark it `error` with `errorType: timeout` and move on.
**Verify:** Check the `error_log` artifact for that fileId.
**Fix:** If the file legitimately needs more time (large assembly), raise `OrchestratorOptions.perFileTimeoutMs` for the batch. Otherwise, the file is pathological — triage manually.

### Symptom: Disk fills up mid-batch
**Cause:** Default retention keeps 5 batches × ~1 GB each = 5 GB minimum. Artifact dirs can balloon if many failures.
**Fix:**
1. Immediately: `cad_artifact_prune --maxBatches=2` to free space.
2. Stop the orchestrator if it's hard-stuck on disk full — its writes will fail and corrupt state.
3. Move artifacts to long-term storage before resuming.
4. Going forward: cron a daily prune, or lower `maxBatches` to 3.

### Symptom: OOM kill mid-batch
**Cause:** Worker pool too wide for available RAM, or a specific file is pathological.
**Fix:**
1. Restart with `OrchestratorOptions.workerCount: 4` (or less) until the corpus is more characterized.
2. Resume normally — only un-processed files re-run.
3. Identify the OOM-triggering file from the `crash`-category triage group; isolate and report upstream.

### Symptom: All files report `errorType: format`
**Cause:** Classifier or indexer mis-configuration — the orchestrator is being handed file paths it can't open.
**Diagnosis:** Spot-check a file path from the failure list — does it exist on disk? Is it readable by the MCP server user?
**Fix:** Re-run `cad_index_run` (idempotent) to rebuild the index. If the corpus root moved, update `rootDir`.

### Symptom: Hotspot warnings on files I just fixed
**Cause:** The hotspot list is computed from the most recent batches; a fix doesn't retroactively clear it.
**Fix:** Run a fresh batch, then re-run `cad_regression_analyzer_hotspots` with that new batch in the `batchIds` list. The fixed file's `failureRate` will drop below the threshold (default 0.5) within 2–3 clean runs.

### Symptom: "Malformed CAD regression batch id"
**Hook:** `cad-regression-batch-id-format` blocked.
**Cause:** Passed a batchId that's empty, has whitespace, starts with a special char, or is >128 chars.
**Fix:** Use a UUID v4 (`crypto.randomUUID()`).

> **⚠️ Slug vs UUID divergence:** the safety hook regex `/^[A-Za-z0-9][A-Za-z0-9._-]{2,127}$/` accepts a slug like `batch-2026-05-12-jm-die`, but the persisted `TestBatch` Zod schema (in `cadRegressionTestSchema.ts`) requires `batchId: z.string().uuid()`. A slug passes the hook gate but fails at checkpoint write with a ZodError, after potentially hours of compute. **Always use a real UUID v4** (PowerShell: `[guid]::NewGuid().ToString()` · Node: `crypto.randomUUID()` · bash: `uuidgen`).

### Symptom: "Tool not found: prism_cad_regression"
**Cause:** Dispatcher not registered with the running MCP server (dead-wiring scenario the v1.0 commit fixed).
**Fix:**
1. Verify `H:/prism/mcp-server/src/index.ts` imports `registerCADRegressionDispatcher` and calls it in the registration block.
2. Verify the running server is built from a commit at or after the v1.0 stamp at top of this runbook.
3. Rebuild + restart: `cd mcp-server && npm run build:fast` then restart your MCP host.

### Symptom: Hook keeps blocking even after fixing the underlying issue
**Cause:** Hooks inspect the current request's inline payload. If you re-pass the same corrupt state object, the hook will block again — fixing the file on disk does not change what your client is sending.
**Fix:** After repairing the on-disk state file, invoke `cad_regression_load` (which reads from disk, doesn't accept an inline batch) before retrying the failing action. The `cad-regression-state-guard` accepts payload at either `batch` or `testBatch` keys — confirm your client is not still passing a stale copy at either name.

### Symptom: `fileIds: []` or fewer than 1 fileId
**Cause:** Schema requires `z.array(z.string().min(1)).min(1)` — at least one non-empty string.
**Fix:** Pass the full list from `cad_index_run` (`.files.map(f => f.fileId)`) or a non-empty slice. Empty arrays will not be silently accepted.

### Symptom: Cancelled / timed-out MCP call, want to retry
**Cause:** The MCP client timed out (default ~5 min on most clients) but the Node orchestrator is still running in the background. Retrying creates a SECOND orchestrator on the same state — silent corruption.
**Fix:**
1. **Do not retry yet.** Confirm via §4's PowerShell recipe whether the old `node` process is still alive.
2. If alive: monitor via §3b from a separate MCP client. The orchestrator will finish; do not interrupt.
3. If dead: resume per §4 (`cad_regression_run` with same batchId + same fileIds). Set `force: true` only if §4's verification confirms no live process.

---

## 12. Operations — recommended cron / cadence

| Cadence | Action | Purpose |
|---------|--------|---------|
| Nightly (after midnight, **only if** dashboard shows no `running` batches) | `cad_artifact_prune --maxBatches=5` | Cap disk usage |
| Weekly (Sun 02:00) | Full `cad_regression_run` over the index | Drift detection vs the prior Sunday |
| Weekly (Mon 09:00) | `cad_regression_analyzer_diff` (sun-vs-prior-sun) → `cad_regression_report_summary` → email/Slack | Stakeholder digest |
| Monthly | Archive `<stateDir>` and `<artifactRoot>` to cold storage | Audit trail |
| On CAD/CAM stack change (any commit touching `src/engines/CAD*.ts` or related) | Trigger `cad_regression_run` over a smoke subset (~100 files) | CI gate before merge |

Wire these via `cron-manage` skill or PRISM's `prism_business:schedule_*` actions.

> **⚠️ Prune cadence must gate on dashboard state.** Always run `cad_regression_dashboard_list` first; if any batch returns `lifecycle: "running"`, skip the prune (see §3d). A naive cron firing `cad_artifact_prune` blindly will eventually overlap a long-running batch and delete its in-flight state file.

**Disk budget at default retention:** 5 batches × ~1–2 GB per batch (state + artifacts combined) ≈ **5–10 GB sustained**. Confirm the `data/state/` and `data/cad-test-artifacts/` partitions have ≥20 GB free before enabling weekly cron, or lower `--maxBatches` to 3. State JSON alone is ~50 MB for a 20K-file batch; the artifact directory dominates the budget when failure rates are non-trivial.

**Expected runtime for the weekly full run:** at 8 workers × 30 s per-file timeout × 20,006 files, theoretical maximum is ~21 h walltime if every file hits the timeout. Realistic mean is **4–12 h** depending on per-file complexity and runner overhead. If a Sunday run is not completing by the Monday digest window, widen the gap (Sun 02:00 → Mon 18:00) before re-tuning workers — adding workers without RAM headroom causes OOM (see §11). The cron task should NOT auto-retry on failure; failed weekly runs deserve operator triage.

---

## 13. Smoke test (100-file subset for fast validation)

For CI / fast feedback, run against a smoke corpus instead of the full 20K. The orchestrator unit test (`cadRegressionOrchestrator.test.ts`) verifies:
- State persists across simulated restarts (resume skips terminal files, reverts crash-time `running` entries to `pending`)
- Workers parallelize correctly (concurrency bounded by `options.workers`)
- Resume picks up within 1 file of the last checkpoint

**Dashboard updates and artifact capture are verified in companion tests:**
- `cadRegressionDashboard.test.ts` — snapshot freshness, listBatches behavior
- `cadRegressionPipeline.test.ts` — full end-to-end integration including artifact emission
- `cadRegressionDispatcher.test.ts` — MCP routing for all 25 actions
- `cadRegressionSafetyHooks.test.ts` — the 7 hooks' block/warn/log behavior
- 3 more (Schema, ResultsAnalyzer, ReportGenerator)

Run them all (8 files, ~30 s total):
```bash
cd H:/prism/mcp-server
npx vitest run src/__tests__/cadRegression
```

Expected: green in seconds (unit tests use mocked sub-second task durations). The `<2 minutes` target in `CAD-INFRA-MS0.json` applies to U-CINF04's exit criterion (100-file smoke batch through the *real* runner) — not this unit test alone. The real-runner smoke depends on the WorkerThreadRunner (see §16).

---

## 14. Where things live

| Concern | Path |
|---------|------|
| Engines | `mcp-server/src/engines/CAD{FileIndexer,FileClassifier,RegressionTestOrchestrator,TestCheckpoint,FailureTriage,ArtifactStorage,RegressionDashboard,RegressionResultsAnalyzer,RegressionReportGenerator}Engine.ts` |
| Schemas | `mcp-server/src/schemas/cadRegressionTestSchema.ts`, `cadRegressionActionSchemas.ts` |
| Dispatcher | `mcp-server/src/tools/dispatchers/cadRegressionDispatcher.ts` |
| Safety hooks | `mcp-server/src/hooks/CADRegressionSafetyHooks.ts` |
| Unit tests | `mcp-server/src/__tests__/cadRegression*.test.ts` (8 files) |
| UI page | `mcp-server/web/src/pages/CADRegressionDashboardPage.tsx` |
| UI API client | `mcp-server/web/src/api/cadRegressionDashboard.ts` |
| State default dir | `mcp-server/data/state/cad-regression-tests/` |
| Artifact default root | `mcp-server/data/cad-test-artifacts/` |
| This runbook | `mcp-server/data/docs/CAD_REGRESSION_RUNBOOK.md` |
| Milestone envelope | `mcp-server/data/milestones/CAD-INFRA-MS0.json` |

---

## 15. Quick-reference command cheat sheet

```bash
# Build + test before any large run
cd H:/prism/mcp-server && npm run build:fast && npx vitest run src/__tests__/cadRegression

# Tail the lifecycle log
tail -f H:/prism/mcp-server/logs/*.log | rg cad-regression-lifecycle

# Force-resume a stuck batch
# (in MCP client)
{ "tool": "prism_cad_regression", "action": "cad_regression_run",
  "params": { "batchId": "<uuid>", "fileIds": [...], "force": true } }

# Emergency prune (free disk now)
{ "action": "cad_artifact_prune", "params": { "maxBatches": 2 } }
```

---

## 16. Escalation

If something here doesn't match reality:
1. Re-read the dispatcher (`src/tools/dispatchers/cadRegressionDispatcher.ts`) — it is the source of truth for the 25 actions and their routing.
2. Re-read the schemas (`src/schemas/cadRegressionActionSchemas.ts`) — source of truth for valid params.
3. Re-read the safety hooks (`src/hooks/CADRegressionSafetyHooks.ts`) — source of truth for block / warn / log conditions.
4. If those disagree with this runbook, **the code wins** — file a PR to fix the runbook.

For the next milestone after CAD-INFRA-MS0: `CAD-DRAW-EVERY-MS0` consumes this infrastructure to actually run the 20K-file regression as a recurring gate (see `blocks` field in `CAD-INFRA-MS0.json`). The runbook above is its operations layer.

**Deferred to separate units (known gaps as of v1.0):**
- **`WorkerThreadRunner`** — the production `TestRunner` implementation that actually generates STEP output per file and diffs against baseline. In v1.0 the orchestrator accepts any injected runner; callers without one fail at `OrchestratorEngine.validate()`. Tracking unit: U-CINF04.x (separate roadmap entry).
- **Concurrent-execution lockfile** — no mutex on `<stateDir>/<batchId>.json`. Operator discipline is the only safeguard. Tracking unit: candidate for U-WIRE-LATHE-SAFETY-HOOKS sweep (see lathe-safety-hooks chat-bus finding) or its own unit.
- **Active-batch prune protection** — `cad_artifact_prune` does not check `updatedAt` recency. Tracking: candidate engine-level fix to skip batches with `updatedAt < now - 1h`.
- **Stuck-batch guard hardening** — current implementation trusts caller-supplied timestamps. Hardening would read state-file mtime directly. Tracking: hook-level fix.

These are documented here so a reader is not surprised by the v1.0 limits. Each is its own follow-up scope, not a CAD-INFRA-MS0 deliverable.
