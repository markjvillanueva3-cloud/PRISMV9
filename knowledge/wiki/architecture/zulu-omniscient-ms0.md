---
title: ZEBRA-OMNISCIENT-MS0 — Zebra orchestrator read-side substrate
type: architecture
node_id: wiki.architecture.zebra-omniscient-ms0
parent_layer: L8
kind: milestone-progress
status: in_progress
last_verified: 2026-05-25
tags: [architecture, zebra, hermes, orchestrator, omniscient, ms0]
related:
  - knowledge/wiki/architecture/hermes-zebra-integration.md
  - knowledge/wiki/architecture/specs/spec-zebra-hermes-gap-audit-2026-05-20.md
  - knowledge/wiki/architecture/zebra-hermes-gap-audit-campaign.md
spec_file: state/shared/specs/ZEBRA-OMNISCIENT-MS0-PLAN.md
---

# ZEBRA-OMNISCIENT-MS0 — Zebra orchestrator read-side substrate

The MS0 read-side phase of ZEBRA-OMNISCIENT: widen the Zebra orchestrator sweep's input surfaces from the 4-input post-13-gap decider to a 5-surface goal-aware bundle, **without** changing the decider's 2-action output (still `clear` / `compact` advisory). MS1 widens actions to an ADT with `suggest-pick / suggest-handoff / suggest-fork / suggest-skill`; MS2 fuses into a goal-aware planner. MS0 is a read-side-only refactor — backward-compatible, fail-soft, every new surface omittable.

Spec: `state/shared/specs/ZEBRA-OMNISCIENT-MS0-PLAN.md`.

## Progress (2026-05-25) — **MS0 COMPLETE (6/6 surfaces)**

| Unit | Surface | Status | Commit |
|------|---------|--------|--------|
| **U-ZO-MS0-01** | CLAUDE-BRIEF + PRISM-BUILD-VISION (#7) | ✅ shipped 2026-05-20 | `3ae6e458d5` |
| **U-ZO-MS0-02** | ROADMAP-CONSOLIDATED `bridge_units` (#9) | ✅ shipped 2026-05-25 | `e9bf140cbc` |
| **U-ZO-MS0-03** | Slot souls `refuse_list` (#19) | ✅ shipped 2026-05-25 | `e9bf140cbc` |
| **U-ZO-MS0-04** | Loop-state per slot (#29) | ✅ shipped 2026-05-25 | `e9bf140cbc` |
| **U-ZO-MS0-05** | TOKEN-AWARENESS zone (#21) | ✅ shipped 2026-05-25 | `6a3a5e99c4` |
| **U-ZO-MS0-06** | Sweep composition + `loadSlotContext` (integration) | ✅ shipped 2026-05-25 | `6a3a5e99c4` |

**Status:** **MS0 read-side phase COMPLETE — all 6 surfaces shipped.** Read-side library at `scripts/lib/zebra-context-bundle.mjs` (~1400 LOC). CLI wrapper at `scripts/zebra-context-load.mjs` for operator/PSN-consumer access. No dispatcher wiring yet — that lands in MS1 alongside the `decideSlotAction` ADT (richer `clear`/`compact`/`suggest-pick`/`suggest-handoff`/`suggest-fork`/`suggest-skill` decider).

## Library surface — `scripts/lib/zebra-context-bundle.mjs`

All 4 shipped readers share the same `loadFile`-based cache + injected-reader + fail-soft envelope pattern from U-ZO-MS0-01. The envelope shape is stable across all readers: `{ok, reason, …surfaceFields, mtime, ageSeconds, stale, path, source}`.

### `loadBrief(opts)` + `loadVision(opts)` (U-ZO-MS0-01)
Reads `state/shared/CLAUDE-BRIEF.md` + `state/shared/PRISM-BUILD-VISION.md`. Composite: `loadBriefAndVision(opts)`.

### `loadBridgeUnits(opts)` (U-ZO-MS0-02)
Reads `state/shared/specs/ROADMAP-CONSOLIDATED.json` `bridge_units`.

- `opts.kind: "all" | "wiring" | "deep_integration"` (default `"all"`)
- `opts.topK: number` — clamps to `[0, totalAvailable]`; NaN/negative/Infinity → `reason: "invalid-topk"` pre-I/O
- `opts.roadmapPath: ""` (explicit empty) → `reason: "no-path"` (R12 fail-loud)
- Pure helper: `parseBridgeUnits(json)` returns `{ok, reason, wiring, deepIntegration}`

### `loadSlotSoulRefuseList(slot, opts)` (U-ZO-MS0-03)
Reads `state/shared/slot-souls/<slot>.md` (same file `slot-soul-inject` T2 hook consumes).

- `slot` is normalized via `trim().toLowerCase()` then validated against `KNOWN_SLOTS` (26 NATO frozen)
- Invalid slot → `{slot: null, reason: "invalid-slot"}` (NOT reflecting attacker input — P0-C)
- Pure helpers: `extractFrontmatterText(text)` + `parseSoulFrontmatter(fmText)`
- Returns `{refuseList: string[], hermesRole, domainFilter, …}`
- Frontmatter parser handles CRLF, BOM, multi-line YAML lists; inline `[a, b]` form → `malformed: true`

### `loadLoopState(sessionId, opts)` + `findActiveLoops(opts)` (U-ZO-MS0-04)
Reads `state/shared/loop-state/loop-<sid>.json` files written by `.claude/helpers/loop-state.mjs`.

- `sessionId` validated against strict UUID regex; invalid → `{sessionId: null, reason: "invalid-session-id"}`
- `KNOWN_LOOP_SCHEMA_VERSIONS = ["1.0.0"]` allowlist — fail-loud on schema bump (prevents silent decision-drift if writer renames `status` field)
- `loadLoopState` uses `loadFile` cache (single-loop reads OK to cache)
- `findActiveLoops` **intentionally bypasses** `loadFile` cache — fleet-wide scan must see fresh ticks each call (correctness > token cost; explicit comment locks the invariant)
- `findActiveLoops` distinguishes EACCES from ENOENT in readdir default
- `findActiveLoops` per-entry `reader(filePath)` wrapped in try/catch with `skipped` counter — misbehaving reader cannot crash whole scan
- Pure helpers: `parseLoopState(json)` + `isValidSessionId(s)`
- `safeJsonParse(s)` exported — drops `__proto__`/`constructor`/`prototype` via reviver (used at all 3 JSON-parse sites — proto-pollution guard)

## Security invariants

| Surface | Defense | Source |
|---------|---------|--------|
| Path-traversal via `slot` | `KNOWN_SLOTS.includes(norm)` whitelist; `slot: null` on invalid (no log reflection) | reviewer B P0-C |
| Path-traversal via `sessionId` | `isValidSessionId(s)` UUID regex anchored; `sessionId: null` on invalid | reviewer B P0-C |
| Proto-pollution via untrusted JSON | `safeJsonParse(s)` reviver drops `__proto__`/`constructor`/`prototype` | reviewer B P0-A |
| Disable-knob bypass | `PRISM_ZEBRA_CONTEXT_DISABLE === "1"` short-circuit BEFORE input validation in all readers | reviewer B P0-B |
| Schema drift silent-break | `KNOWN_LOOP_SCHEMA_VERSIONS` allowlist; unknown version → `schema-version-unsupported` | reviewer B P1-F |

## Env knobs

| Variable | Default | Effect |
|----------|---------|--------|
| `PRISM_ZEBRA_CONTEXT_DISABLE=1` | unset | Every reader returns `reason: "disabled-env"` |
| `PRISM_ZEBRA_CONTEXT_TTL_MS` | 60000 | Cache TTL per entry |
| `PRISM_ZEBRA_CONTEXT_STALE_HRS` | 24 | Stale-mark threshold |
| `PRISM_ZEBRA_CONTEXT_BRIEF_PATH` | `state/shared/CLAUDE-BRIEF.md` | Override |
| `PRISM_ZEBRA_CONTEXT_VISION_PATH` | `state/shared/PRISM-BUILD-VISION.md` | Override |
| `PRISM_ZEBRA_CONTEXT_ROADMAP_PATH` | `state/shared/specs/ROADMAP-CONSOLIDATED.json` | Override |
| `PRISM_ZEBRA_CONTEXT_SOULS_DIR` | `state/shared/slot-souls/` | Override |
| `PRISM_ZEBRA_CONTEXT_LOOP_DIR` | `state/shared/loop-state/` | Override |

## Tests

`scripts/lib/zebra-context-bundle.test.mjs` — 99/99 PASS. Coverage breakdown:

- `safeJsonParse` — 5 tests (parse, drop __proto__, drop constructor+prototype, malformed JSON, non-string)
- `parseBridgeUnits` — 4 tests (happy, missing key, non-array coerce, non-object reject)
- `loadBridgeUnits fail-soft` — 6 tests (disable-env, no-path, invalid-kind, invalid-topk × 5 adversarials, missing file, parse-error)
- `loadBridgeUnits happy + filters` — 6 tests (kind=all/wiring/deep_integration, topK clamp, topK=0, schema-mismatch)
- `extractFrontmatterText` — 5 tests (standard, CRLF, BOM, no-frontmatter, non-string)
- `parseSoulFrontmatter` — 6 tests (happy, no refuse_list, inline-bracket malformed, quote stripping, empty doc, non-string)
- `loadSlotSoulRefuseList fail-soft` — 5 tests (disable-env, path-traversal, non-NATO, normalization, missing file)
- `loadSlotSoulRefuseList spanning slots` — bravo (3 refuses) / lima (1) / india (2)
- `KNOWN_SLOTS sanity` — count=26, frozen, post-expansion slots present
- `isValidSessionId` — 3 tests
- `parseLoopState` — 7 tests (happy, status normalization, unknown schemaVersion, missing schemaVersion, non-object, missing status, KNOWN_LOOP_SCHEMA_VERSIONS frozen)
- `loadLoopState fail-soft` — 5 tests
- `findActiveLoops` — 8 tests (disable-env, ENOENT, EACCES, legacy array return, running-loop collection + sort, throwing-reader + skipped counter, malformed JSON, __proto__ injection)
- `real-data E2E` — 3 tests (one per new reader)

## Per-file scrutiny gate (per CLAUDE.md §PER-FILE SCRUTINY GATE)

For multi-file builds, 2 parallel reviewers BEFORE the next file.

**Impl file scrutiny:**
- **Arm A — code-analyzer** — PASS with 1 P1 (kind/topK pre-validation order). All 8 hard contract checks PASS.
- **Arm B — independent reviewer** — FAIL → PASS after applying fixes:
  - P0-A: JSON.parse proto-pollution surface (3 sites) → `safeJsonParse` reviver
  - P0-B: `PRISM_ZEBRA_CONTEXT_DISABLE` bypassed in 3 readers' validation paths → early returns
  - P0-C: path-traversal/sessionId reflected in failure envelope → `null` on invalid
  - P1-D: `readdir`/per-entry-reader silent throw + EACCES vs ENOENT distinction
  - P1-E: `findActiveLoops` cache-bypass intentional but undocumented → 1-line invariant comment
  - P1-F: `parseLoopState` ignored `schemaVersion` → KNOWN_LOOP_SCHEMA_VERSIONS allowlist

## End-of-task 3-of-3 scrutiny

Session `claude-3fe8d5b7`. All 3 arms PASS. Ledger marked at `mcp-server/data/state/SCRUTINY_LEDGER.json`.

- Arm A (holistic reviewer) — PASS
- Arm B (independent reviewer) — PASS (7 critical contract checks verified)
- Arm C (code-analyzer) — PASS (2 P3 notes non-blocking)

## Open units after this commit

| Unit | What | Risk |
|------|------|------|
| U-ZO-MS0-05 | TOKEN-AWARENESS zone reader | LOW — same pattern as 02/03/04 |
| U-ZO-MS0-06 | Sweep composition + cache layer (`loadSlotContext(slot)`) | MEDIUM — integration point, sweep wall-time budget ≤ 30s p95 |
| U-ZM2-02 | UIA pane focus (replaces title-HWND from U-ZM1-05) | HIGH — Windows native binding investigation needed |
| U-ZM2-03 | execute-mode E2E | Gated on U-ZM2-02 + 24h grace |
| U-ZM2-04 | pid-liveness gate | LOW — standalone |
| MS4 | Closed-learning harness (NousResearch pattern) | HIGH — out of scope per ZEBRA-OMNISCIENT-MS0-PLAN §8 |
| G10 (operator) | Register `PRISM Zebra Orchestrator` scheduled task | Operator-only |
| G12 (operator) | Set `zebraOptIn=true` on chat-slots | Operator-only |

## See also

- [[hermes-zebra-integration]] — HERMES-MS0/MS1 architecture
- [[zebra-hermes-gap-audit-campaign]] — 13-gap predecessor campaign
- [[spec-zebra-hermes-gap-audit-2026-05-20]] — gap-register source spec
- ZEBRA-OMNISCIENT-MS0-PLAN: `state/shared/specs/ZEBRA-OMNISCIENT-MS0-PLAN.md`
- Library: `scripts/lib/zebra-context-bundle.mjs`
- Tests: `scripts/lib/zebra-context-bundle.test.mjs`
- Memory: [[reference_u_zo_ms0_02_03_04_2026_05_25]] · [[reference_zebra_hermes_gaps_campaign_2026_05_20]] · [[reference_zpsn03_target_parser_2026_05_23]]
