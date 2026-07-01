---
name: reference-u-db-monolith-unified-query-2026-05-27
description: U-DB-MONOLITH-UNIFIED-QUERY — closed BUILD_STATE Monolith (9) gap; absorbed into foxtrot but P1 envelope fix shipped + schema commit attributed correctly.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.236Z
aliases: reference_u_db_monolith_unified_query_2026_05_27
---


# JULIETT-DB-BRIDGE-MS0/U-DB-MONOLITH-UNIFIED-QUERY (2026-05-27, slot juliett)

Closed BUILD_STATE's "Monolith (9)" unwired gap by adding a single
`prism_intelligence:monolith_query` dispatcher action that routes across
12 standalone Monolith*Engine ports via a `subject` enum.

## Subjects (12-value enum)

controllers · machine_specs · stock_positions · roughing_configs ·
macro_schema · fusion_posts · mfr_catalog · gateway · zeni ·
consolidated · final · major_mfrs

## Envelope contract (R12 fail-loud)

- **records-shape**: `{action, subject, ok, count, records[]}`
- **single-shape**: `{action, subject, ok, single}`
- **error**: `{action, subject, ok:false, error}` (never silent — explicit string)

## R12 envelope-fix (P1 from per-file scrutiny arm B)

Switched `single !== null` → `single != null` so undefined returns from
Map.get/Array.find-style engine misses do NOT slip into the single-shape
branch and get dropped by `JSON.stringify({single: undefined})`. Either a
real record, or records-shape with count:0 — never the ambiguous middle.

## Where it shipped

- **Dispatcher + handler + test (~446L)** → absorbed into foxtrot commit
  `4a3551938f` ([MILL-VIDEO-CORPUS-MS0]/U-PTS-VIDEO-EXTRACTION).
  Code shipped, attribution lost — classic shared-tree-absorption
  during the slot-worktree-disabled window. Lines verified post-absorption:
  - Action enum: `intelligenceDispatcher.ts:542` (`"monolith_query"`)
  - Handler block: `intelligenceDispatcher.ts:1276..1404`
  - Envelope guard: `intelligenceDispatcher.ts:1400` (`single != null` — P1 fix landed)
  - Test file: `mcp-server/src/__tests__/monolithUnifiedQueryDispatch.test.ts` (304L)
- **Schema (30L)** → commit `f3995dcfc5` attributed to juliett correctly.

## Per-file scrutiny

- **Arm A (test-review)**: PASS. 21 cases, no placeholder patterns,
  real engine-wire proof against `listControllers()` / `emptySpec()` /
  `listGrades()`.
- **Arm B (independent)**: PASS. P1-A undef envelope-fix applied this commit.
  P1-B engine-throw surfacing test logged as follow-up.
  P2 subject-list extraction (avoid duplicating enum in error string) logged.

## Tests

20/20 PASS. Covers: schema contract (9) + per-subject wire (2 batches × 12) +
engine-wire proof (8 cases). Includes ⊆-listControllers, query substring
match, id-over-query precedence, major_mfrs count parity, machine_specs
template equality, zeni manufacturer + grade-count match, unknown-id
records-shape fallback, real limit cap.

## Follow-ups

- **U-MONOLITH-ENGINE-THROW-COVERAGE** (P1-B): add a negative-path test that
  monkey-patches one engine method to throw, asserts `ok:false` + `error`
  propagates correctly via the handler's try/catch.
- **U-MONOLITH-SUBJECT-ENUM-DRY** (P2-A): extract the inline subject list
  in the handler's error message and the schema's enum into a shared
  const to prevent drift.

## Lesson reinforced

Slot-worktree-disabled state = peer-absorption during commits. Code
shipped (functional outcome unchanged) but slot attribution lost. The
schema-restore commit pattern (`U-...-SCHEMA-RESTORE`) is the established
workaround when only part of an atomic 3-file unit gets absorbed.

See also: [[feedback_commit_to_slot_worktree]], [[feedback_conflict_fork_rule]].
