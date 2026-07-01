# CAD Regression System — Operator Runbook

**Milestone:** CAD-INFRA-MS0 (CINF01..CINF13 delivered; CINF15 = this document)
**Dispatcher:** `prism_cad_regression` (25 actions)
**Surface area:** 9 engines + 1 dispatcher + 7 safety hooks + 1 UI page

This document is the single-source operator reference for the CAD regression
sub-system. It targets two readers:

1. An **operator** running regression batches and triaging failures.
2. A **developer** adding new engines, schema fields, or dispatcher actions.

---

## 1. What this system does

Given a large corpus of CAD files that must round-trip through PRISM's CAD
generation pipeline, the CAD regression system lets you:

- **Index** (CINF01) the corpus on disk — produces a deterministic snapshot
  per `runId` for diffing corpus churn over time.
- **Classify** (CINF02) each file by format family, parseability, and
  complexity so downstream engines can schedule them sanely.
- **Run** (CINF04) a `TestBatch` — an idempotent execution over a set of
  file ids, writing a `TestBatch` state file keyed by `batchId`.
- **Checkpoint** (CINF05) a running batch so it can be resumed across
  operator sessions without losing progress.
- **Triage** (CINF06) failing files: group by root-cause pattern so a single
  operator does not get handed 500 identical "parse error" tickets.
- **Store artifacts** (CINF07) per-file: expected STEP, actual STEP, diff
  PNG, error log — namespaced by batch for audit.
- **Render a dashboard snapshot** (CINF08) with progress, error breakdown,
  throughput, and the most recent failures.
- **Analyze** (CINF10) two batches against each other: diffs, trends across
  N batches, and "hotspot" files that keep regressing.
- **Render Markdown reports** (CINF11) from any analyzer output — shareable
  with the team without the UI.
- **Route all of the above** through one MCP dispatcher, `prism_cad_regression`
  (CINF12), guarded by seven safety hooks (CINF13).

---

## 2. Dispatcher quick reference

All 25 actions live on `prism_cad_regression`. Call shape is always:

```json
{ "action": "<action_name>", "params": { ... action-specific ... } }
```

| Group | Actions |
|-------|---------|
| Indexer (CINF01) | `cad_index_run`, `cad_index_diff`, `cad_index_load` |
| Classifier (CINF02) | `cad_classify_run`, `cad_classify_one` |
| Orchestrator (CINF04) | `cad_regression_run`, `cad_regression_load` |
| Checkpoint (CINF05) | `cad_checkpoint_save`, `cad_checkpoint_load`, `cad_checkpoint_resume_diff` |
| Triage (CINF06) | `cad_failure_triage_one`, `cad_failure_triage_group` |
| Artifact (CINF07) | `cad_artifact_write`, `cad_artifact_list`, `cad_artifact_prune` |
| Dashboard (CINF08) | `cad_regression_dashboard_snapshot`, `cad_regression_dashboard_list` |
| Analyzer (CINF10) | `cad_regression_analyzer_diff`, `cad_regression_analyzer_trend`, `cad_regression_analyzer_hotspots` |
| Report (CINF11) | `cad_regression_report_snapshot`, `cad_regression_report_diff`, `cad_regression_report_trend`, `cad_regression_report_hotspots`, `cad_regression_report_summary` |

Every action has a corresponding Zod schema in
`src/schemas/cadRegressionActionSchemas.ts`. The dispatcher validates before
routing; invalid payloads return an error envelope before any engine runs.

---

## 3. Day-to-day operator flows

### 3.1 Start a new regression batch

```
prism_cad_regression { action: "cad_regression_run",
  params: { batchId: "<slug-or-uuid>", fileIds: [...], stateDir: "data/state/cad" } }
```

- `batchId` must match `^[A-Za-z0-9][A-Za-z0-9._-]{2,127}$` (safety hook
  `cad-regression-batch-id-format` blocks otherwise).
- `stateDir` defaults to `data/state/cad` in the engine; override for test
  fixtures.
- The orchestrator is idempotent — resuming an existing `batchId` picks up
  from the last checkpoint.

### 3.2 Check live progress

**UI**: open the *CAD Regression Dashboard* page (admin-scoped route
`/cad-regression`) — the page polls batch list and snapshot via the
thin API client in `web/src/api/cadRegressionDashboard.ts`.

**CLI / MCP**:

```
prism_cad_regression { action: "cad_regression_dashboard_snapshot",
  params: { batchId: "<id>", windowMinutes: 30, recentLimit: 20 } }
```

Returns `DashboardSnapshot { lifecycle, pctComplete, counts, errorBreakdown,
throughput, recentFailures, createdAt, lastCheckpoint, updatedAt, snapshotAt }`.

### 3.3 Save / resume a checkpoint

Checkpoint during a long run:

```
prism_cad_regression { action: "cad_checkpoint_save",
  params: { batchId: "<id>" } }
```

Resume and compute the delta since the last saved checkpoint:

```
prism_cad_regression { action: "cad_checkpoint_resume_diff",
  params: { batchId: "<id>" } }
```

If the last checkpoint is older than 30 minutes, the
`cad-regression-stuck-batch-guard` hook will block the resume unless you
pass `force: true` (use sparingly — it means you have verified out-of-band
that the worker is still alive).

### 3.4 Compare two batches (regressions vs. recoveries)

```
prism_cad_regression { action: "cad_regression_analyzer_diff",
  params: { baseBatchId: "<yesterday>", candidateBatchId: "<today>" } }
```

The analyzer classifies every file as one of `regression | recovery |
stable_pass | stable_fail | new | removed | other`. **Regression** means the
file was passing in `base` and is failing in `candidate` — that is what the
on-call operator should be looking at first.

Render it to Markdown for a ticket / changelog:

```
prism_cad_regression { action: "cad_regression_report_diff",
  params: { diff: <result from analyzer_diff>, rowLimit: 100 } }
```

### 3.5 Find recurring problem files

```
prism_cad_regression { action: "cad_regression_analyzer_hotspots",
  params: { batchIds: [...recent N...], threshold: 0.5, minAppearances: 3 } }
```

Returns files that fail more than 50% of the time across at least 3 recent
batches — usually the right candidates for an upstream parser fix rather
than another run.

### 3.6 Triage a single failing file

```
prism_cad_regression { action: "cad_failure_triage_one",
  params: { fileId: "<id>", errorMessage: "<from logs>" } }
```

The triage engine returns a category (format / parse / generation /
comparison / timeout / crash) and a suggested next step. The
`cad-regression-hotspot-warning` hook adds a non-blocking warning if the
file is on your recent hotspot list so you know to escalate instead of
rerunning.

### 3.7 Full markdown summary for a ticket

When you want a single pastable report:

```
prism_cad_regression { action: "cad_regression_report_summary",
  params: { snapshot, diff, trend, hotspots, rowLimit: 50 } }
```

Any parameter may be omitted — the report generator simply skips that
section. The engine never throws; empty parts render as empty strings.

---

## 4. State layout on disk

```
data/state/cad/
  index-<runId>.json               # CINF01 file index
  classify-<runId>.json             # CINF02 classification
  batches/
    <batchId>.json                  # CINF04 TestBatch { schemaVersion:1, stats, files, lastCheckpoint }
    <batchId>.checkpoint.json       # CINF05 checkpoint payloads
  artifacts/
    <batchId>/
      <fileId>/
        expected_step
        actual_step
        diff_png
        error_log
```

All state files carry `schemaVersion: 1`. The CINF05 checkpoint format and
CINF04 batch format are decoupled so we can bump one without re-migrating
the other.

---

## 5. Safety hooks (CINF13)

Seven hooks guard the dispatcher surface. All live in
`src/hooks/CADRegressionSafetyHooks.ts`.

| Hook | Mode | What it guards |
|------|------|----------------|
| `cad-regression-batch-id-format` | blocking | `batchId` / `baseBatchId` / `candidateBatchId` / `batchIds[]` shape |
| `cad-regression-state-guard` | blocking | inline batch payloads must be `{ schemaVersion: 1, batchId, files?: object, stats?: object }` |
| `cad-regression-stuck-batch-guard` | blocking | resume-style actions whose `lastCheckpoint` is older than `stuckThresholdMinutes` (default 30) |
| `cad-regression-retry-warning` | warning | `retryCount > 3` on `cad_regression_run` or `cad_checkpoint_resume_diff` |
| `cad-regression-hotspot-warning` | warning | triage/run on a `fileId` that is on `hotspotFileIds[]` |
| `cad-regression-lifecycle-log` | logging (on-audit) | run/save/load/resume audit |
| `cad-regression-artifact-log` | logging (on-audit) | write/prune audit |

Hooks fire **only on matching actions**. For unrelated actions they return
a success envelope with `data: { skipped: true }` so they never interfere.

---

## 6. Common incidents and how to handle them

### 6.1 "Malformed batch id" block

- **Symptom:** dispatcher returns an error envelope with
  `cad-regression-batch-id-format` in the message.
- **Cause:** `batchId` is empty, numeric, or contains characters outside
  the slug pattern.
- **Fix:** use a UUIDv4 or a slug matching
  `^[A-Za-z0-9][A-Za-z0-9._-]{2,127}$`.

### 6.2 "Batch has not advanced for N min" block

- **Symptom:** resume/save actions blocked by
  `cad-regression-stuck-batch-guard`.
- **Cause:** the batch's `lastCheckpoint` is older than the configured
  threshold — usually a dead worker.
- **Fix:** check worker liveness. If the worker really is dead, clear it
  (or rerun with `force: true` only after confirming the worker is gone
  and state is not being concurrently mutated).

### 6.3 Corrupt state payload block

- **Symptom:** `cad-regression-state-guard` blocks with issue list like
  `schemaVersion=2 (expected 1)` or `files must be an object map`.
- **Cause:** inline batch payload has the wrong shape — often a stale
  client or a test fixture that never got migrated.
- **Fix:** discard the inline payload and let the engine read the current
  on-disk `TestBatch` (omit the `batch` param entirely).

### 6.4 Dashboard UI shows "0 batches"

- **Cause:** `/cad-regression` page degrades to an empty state when the
  web API cannot reach the MCP dispatcher (e.g., no backend route yet or
  auth refused).
- **Fix:** inspect browser devtools network tab for the call to
  `/api/cad-regression/...`. The UI is intentionally non-blocking so an
  operator never sees a hard crash.

### 6.5 Hotspot warning on every run

- **Cause:** the analyzer keeps flagging the same 10 files.
- **Fix:** do not rerun. Pipe those file ids into `cad_failure_triage_one`
  and open upstream tickets against the parser/generator rather than
  burning more compute.

---

## 7. Extending the system

Adding a new engine to this family:

1. Name the engine `CAD<Noun>Engine` and place it in `src/engines/`.
2. Extend `BaseEngine`, supply `EngineInfo { name, domain: "cad_infrastructure" }`.
3. Implement `executeImpl(params)` — return plain values; the base class
   wraps them in the `{ success, data, error, source, durationMs }` envelope.
4. Export a singleton: `export const xEngine = new XEngine();`.
5. Add a Zod schema per action to
   `src/schemas/cadRegressionActionSchemas.ts`.
6. Add the action names to `ACTIONS` in
   `src/tools/dispatchers/cadRegressionDispatcher.ts` **and** a `case` in
   `routeCADRegression`.
7. Add vitest coverage in `src/__tests__/` — minimum 10 cases per engine
   (project convention), include edge cases.
8. Update the table in section 2 of this runbook.

If the new action can be abused to start long-running work or read
arbitrary files, add a safety hook in `src/hooks/CADRegressionSafetyHooks.ts`
and wire it into `CAD_REGRESSION_SAFETY_HOOKS[]`.

---

## 8. Reference

- Dispatcher: `src/tools/dispatchers/cadRegressionDispatcher.ts`
- Schemas: `src/schemas/cadRegressionActionSchemas.ts`
- Hooks: `src/hooks/CADRegressionSafetyHooks.ts`
- UI page: `web/src/pages/CADRegressionDashboardPage.tsx`
- UI API: `web/src/api/cadRegressionDashboard.ts`
- Tests: `src/__tests__/cadRegression*.test.ts` (8 files, 131 cases)

**Last updated:** CAD-INFRA-MS0 / U-CINF15.
