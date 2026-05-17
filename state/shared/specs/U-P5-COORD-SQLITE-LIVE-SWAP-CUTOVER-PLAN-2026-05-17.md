# U-P5-COORD-SQLITE-LIVE-SWAP — Cutover De-Risk Plan

**Status:** advisory · `mustHumanVerify` · operator-supervised execution
**Author:** claude-a61bbf34 (slot echo) · 2026-05-17
**Milestone:** SYSTEM-VIZ-BRAIN-MS0 (last open unit; 25/26 shipped/closed)
**Why this doc:** the `/loop` autonomous scope cannot safely execute this unit
(see §Risk). This plan makes it executable by an operator and bounds the blast
radius. Producing the plan is autonomous-safe (a doc); executing it is not.

---

## 1. Premise correction (verified against HEAD, not the unit title)

The unit name says "swap coord store to live SQLite" and implies a single
`WORK_CLAIMS.json → SQLite` migration. The reality is more nuanced — there are
**three** coordination JSON stores, only one of which was H8-migrated. Verified
on disk 2026-05-17 (corrected after 3-of-3 reviewer A caught a false
"zero references" claim in the first draft — the original sweep used the wrong
path scope and missed the surviving `state/shared/` store; R12 fail-loud):

| Store | Status 2026-05-17 | Refs | Purpose |
|-------|-------------------|------|---------|
| `mcp-server/data/state/WORK_CLAIMS.json` | **absent** — H8-migrated to SQLite 2026-05-13 | none | (historical) |
| `state/shared/WORK_CLAIMS.json` | **EXISTS** (552 B, mtime 2026-05-17) — NOT migrated | `.claude/hooks/work-claim.mjs:27`, `.claude/hooks/stop_on_open_claim.mjs:12` (env `PRISM_WORK_CLAIMS_FILE`) | work-**unit** claims |
| `mcp-server/data/state/session-file-ownership.json` | **EXISTS** — live, NOT migrated | 5 hot-path hooks (see §2) | **file-ownership** claims |

`CoordinationStoreEngine.ts` exists, wired into `contextDispatcher.ts:1164`
(`coord_sqlite`). API: `claim/release/findClaim/liveClaims/allClaims/`
`activeSessions/findPresence/prune/counts/migrateFromJson/health`. Its
`LEGACY_WORK_CLAIMS_PATH` (CoordinationStoreEngine.ts:52) is exactly
`state/shared/WORK_CLAIMS.json` — i.e. `migrateFromJson()` already targets the
surviving work-unit store by default, but **nothing calls it on the live path**.

**The real remaining swap** is therefore TWO independent live JSON stores, not
the one the title implies:
1. **work-unit claims** — `state/shared/WORK_CLAIMS.json` on 2 hooks
   (`work-claim.mjs`, `stop_on_open_claim.mjs`). `migrateFromJson()` already
   handles the shape; the gap is wiring those 2 hooks at the SQLite engine.
2. **file-ownership claims** — `session-file-ownership.json` on 5 hot-path hooks
   (§2). Different shape (`{files,sessions}` vs ClaimRow) — needs a shape
   adapter, NOT a raw `migrateFromJson`.
The SQLite engine is dispatcher-wired but off BOTH live paths.

## 2. Endpoints

### 2a. File-ownership store (5 hot-path hooks)

**Source:** `mcp-server/data/state/session-file-ownership.json`
shape `{ files: {}, sessions: {} }`.

| Hook | Role | Trigger |
|------|------|---------|
| `.claude/hooks/file-ownership-tracker.mjs` | **writer** | PreToolUse Edit/Write/MultiEdit |
| `.claude/hooks/commit-ownership-guard.mjs` | reader | PreToolUse (commit path) |
| `.claude/hooks/scrutinize-before-stop.mjs` | reader | Stop |
| `.claude/hooks/always-build-guard.mjs` | reader | Stop |
| `.claude/hooks/stale-claim-sweeper.mjs` | reader+sweeper | scheduled / Stop |

Shape `{files,sessions}` ≠ `ClaimRow`, so a **shape adapter** is required —
NOT a raw `migrateFromJson` call.

### 2b. Work-unit-claim store (2 hooks)

**Source:** `state/shared/WORK_CLAIMS.json` (env `PRISM_WORK_CLAIMS_FILE`).

| Hook | Role | Trigger |
|------|------|---------|
| `.claude/hooks/work-claim.mjs:27` | reader+writer | (work-unit claim/release) |
| `.claude/hooks/stop_on_open_claim.mjs:12` | reader+writer | Stop (lines 96, 121 read/write) |

This is exactly `CoordinationStoreEngine`'s `LEGACY_WORK_CLAIMS_PATH`, so
`migrateFromJson()` handles the shape directly — the gap is only repointing
these 2 hooks at `coord_sqlite`.

**Target (both):** `CoordinationStoreEngine` SQLite WAL via the shim in §4.

## 3. Risk — why this is NOT autonomous-/loop-safe

- **Hot path, every chat:** `file-ownership-tracker` fires on *every*
  Edit/Write/MultiEdit across all concurrent chats. A defect → fleet-wide claim
  loss → two chats edit the same file → silent peer clobber (exactly the
  silent-overwrite class CLAUDE.md §PER-CHAT HANDOFF warns about).
- **Live concurrency:** at authoring time 7 peer chats are active; coordination
  subsystem files (`chat-slots.mjs`, `process-slot-map.mjs`) are *peer-claimed
  and being modified concurrently*. Editing adjacent claim infra now risks
  collision-absorption + duplication-guard contention.
- **Hard to reverse mid-flight:** if one chat writes a claim to SQLite while a
  not-yet-swapped chat reads JSON, claim views diverge → lane discipline breaks
  fleet-wide with no clean rollback once writes have split.

Conclusion: execution requires an operator + a quiescent (ideally single-chat)
fleet. The `/loop` delivered this plan only.

## 4. Cutover plan (env-switched, every phase reversible)

A shim `coordBackend` (`.claude/helpers/coord-backend.mjs`) exporting
`loadOwnership/saveOwnership/findClaim/release` with env switch
`PRISM_COORD_BACKEND = json | dual | shadow | sqlite` (default `json` =
**zero behavior change**). All 7 hooks (5 file-ownership §2a + 2 work-unit §2b)
import the shim instead of touching the store directly. Rollback at every phase
= flip the env var back. Sequence the two stores independently: do §2b
(work-unit, 2 hooks, `migrateFromJson` handles shape) before §2a (file-ownership,
5 hot-path hooks, needs adapter) — §2b is lower-risk and validates the shim.

| Phase | Mode | Fleet | Gate to advance |
|-------|------|-------|-----------------|
| **0 Prep** *(operator, low-risk)* | build shim, default `json`, NOT wired | any | shim unit tests green vs both backends; rollback drill |
| **1 Dual-write** | `dual` (write json+sqlite, read json) | full | reconcile script diffs json vs sqlite every 5 min → **0 divergence for 24h** |
| **2 Read-shadow** | `shadow` (read sqlite, json authoritative on mismatch, log mismatch) | full | **0 mismatch for 24h** |
| **3 Cutover** | `sqlite` (json kept cold) | quiescent / single-chat | all 7 hooks pass existing tests vs sqlite; smoke a real cross-chat claim/release on BOTH stores |
| **4 Decommission** *(+7d clean)* | remove json branch | any | rename `session-file-ownership.json` AND `state/shared/WORK_CLAIMS.json` → `.archive.<date>` (NEVER delete, per [[feedback_never_delete_only_disable]]) |

Phase 0 builds the shim but **does not wire it into any of the 7 hooks** —
wiring is Phase 1, §2b store first then §2a. No destructive action before
Phase 4 (+7d clean window).

## 5. Acceptance criteria

- All 7 hooks pass their existing test suites against the `sqlite` backend:
  §2a `file-ownership-tracker`, `commit-ownership-guard`,
  `scrutinize-before-stop`, `always-build-guard`, `stale-claim-sweeper`; §2b
  `work-claim`, `stop_on_open_claim`.
- 0 json↔sqlite divergence across the 24h dual-write **and** 24h read-shadow
  windows, **per store** (reconcile script is the oracle, not eyeballing).
- One rollback drill executed and logged during Phase 1 (run it on the §2b
  store — lower blast radius).
- §2a shape adapter (`{files,sessions}` ↔ ClaimRow) has its own unit tests incl.
  the empty-store and concurrent-claim cases. §2b reuses `migrateFromJson()` —
  assert its output against a known `state/shared/WORK_CLAIMS.json` fixture.

## 6. Autonomous boundary (explicit)

- **Autonomous-safe:** this plan (done). Optionally Phase 0 shim build — but
  ONLY when the coordination subsystem is not peer-claimed (it is, right now),
  so even Phase 0 is deferred to operator here.
- **Operator-only:** Phases 1–4 (live hot-path, multi-chat, hard-to-reverse).

Operator entry point: build the Phase 0 shim + adapter + tests when
`chat-slots.mjs` / `process-slot-map.mjs` are not peer-claimed, then proceed
phase-by-phase with the gates above.
