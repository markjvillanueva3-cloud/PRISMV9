# U-P5-COORD-SQLITE-LIVE-SWAP — Cutover De-Risk Plan

**Status:** advisory · `mustHumanVerify` · operator-supervised execution
**Author:** claude-a61bbf34 (slot echo) · 2026-05-17
**Milestone:** SYSTEM-VIZ-BRAIN-MS0 (last open unit; 25/26 shipped/closed)
**Why this doc:** the `/loop` autonomous scope cannot safely execute this unit
(see §Risk). This plan makes it executable by an operator and bounds the blast
radius. Producing the plan is autonomous-safe (a doc); executing it is not.

---

## 1. Premise correction (verified against HEAD, not the unit title)

The unit name says "swap coord store to live SQLite" and implies a
`WORK_CLAIMS.json → SQLite` migration. **That migration already happened** under
`HOOK-SYNERGY-MS0/H8` (2026-05-13, `CoordinationStoreEngine`, 41 tests). Verified
2026-05-17:

- `mcp-server/data/state/WORK_CLAIMS.json` — **does not exist**.
- Zero references to `WORK_CLAIMS\.json` anywhere in `.claude/`, `scripts/`,
  `mcp-server/src/`.
- `CoordinationStoreEngine.ts` exists, wired into `contextDispatcher.ts:1164`
  (`coord_sqlite` action). API: `claim/release/findClaim/liveClaims/allClaims/`
  `activeSessions/findPresence/prune/counts/migrateFromJson/health`.

**The real remaining swap** is different from the title: the *live file-claim
hot path* still uses a JSON store `mcp-server/data/state/session-file-ownership.json`,
NOT the SQLite engine. The SQLite engine is dispatcher-wired but off the live
path. U-P5 = repoint the live claim hooks at the SQLite store.

## 2. Endpoints

**Live source (authoritative today):** `mcp-server/data/state/session-file-ownership.json`
shape `{ files: {}, sessions: {} }`.

| Hook | Role | Trigger |
|------|------|---------|
| `.claude/hooks/file-ownership-tracker.mjs` | **writer** | PreToolUse Edit/Write/MultiEdit |
| `.claude/hooks/commit-ownership-guard.mjs` | reader | PreToolUse (commit path) |
| `.claude/hooks/scrutinize-before-stop.mjs` | reader | Stop |
| `.claude/hooks/always-build-guard.mjs` | reader | Stop |
| `.claude/hooks/stale-claim-sweeper.mjs` | reader+sweeper | scheduled / Stop |

**Target:** `CoordinationStoreEngine` SQLite WAL. Note its `migrateFromJson()`
defaults to `LEGACY_WORK_CLAIMS_PATH` — for this swap it must be pointed at
`session-file-ownership.json` (different shape: `{files,sessions}` vs ClaimRow),
so a shape adapter is required, not a raw `migrateFromJson` call.

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
**zero behavior change**). The 5 hooks import the shim instead of touching the
store directly. Rollback at every phase = flip the env var back.

| Phase | Mode | Fleet | Gate to advance |
|-------|------|-------|-----------------|
| **0 Prep** *(operator, low-risk)* | build shim, default `json`, NOT wired | any | shim unit tests green vs both backends; rollback drill |
| **1 Dual-write** | `dual` (write json+sqlite, read json) | full | reconcile script diffs json vs sqlite every 5 min → **0 divergence for 24h** |
| **2 Read-shadow** | `shadow` (read sqlite, json authoritative on mismatch, log mismatch) | full | **0 mismatch for 24h** |
| **3 Cutover** | `sqlite` (json kept cold) | quiescent / single-chat | all 5 hooks pass existing tests vs sqlite; smoke a real cross-chat claim/release |
| **4 Decommission** *(+7d clean)* | remove json branch | any | rename `session-file-ownership.json` → `.archive.<date>` (NEVER delete, per [[feedback_never_delete_only_disable]]) |

Phase 0 builds the shim but **does not wire it into the 5 hooks** — wiring is
Phase 1. No destructive action before Phase 4 (+7d clean window).

## 5. Acceptance criteria

- `file-ownership-tracker`, `commit-ownership-guard`, `scrutinize-before-stop`,
  `always-build-guard`, `stale-claim-sweeper` all pass their existing test
  suites against the `sqlite` backend.
- 0 json↔sqlite divergence across the 24h dual-write **and** 24h read-shadow
  windows (reconcile script is the oracle, not eyeballing).
- One rollback drill executed and logged during Phase 1.
- Shape adapter (`{files,sessions}` ↔ ClaimRow) has its own unit tests incl.
  the empty-store and concurrent-claim cases.

## 6. Autonomous boundary (explicit)

- **Autonomous-safe:** this plan (done). Optionally Phase 0 shim build — but
  ONLY when the coordination subsystem is not peer-claimed (it is, right now),
  so even Phase 0 is deferred to operator here.
- **Operator-only:** Phases 1–4 (live hot-path, multi-chat, hard-to-reverse).

Operator entry point: build the Phase 0 shim + adapter + tests when
`chat-slots.mjs` / `process-slot-map.mjs` are not peer-claimed, then proceed
phase-by-phase with the gates above.
