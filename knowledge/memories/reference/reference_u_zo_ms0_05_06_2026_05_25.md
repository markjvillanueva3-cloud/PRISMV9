---
name: reference_u_zo_ms0_05_06_2026_05_25
description: "ZULU-OMNISCIENT-MS0 envelope CLOSE (6/6 surfaces) — U-ZO-MS0-05 token-zone reader + U-ZO-MS0-06 loadSlotContext composite + CLI wrapper (2026-05-25 slot bravo iter2, commit 6a3a5e99c4). 130/130 tests, 3-of-3 PASS (session claude-0c581140), P1-1 stale-demotion applied. PSN aggregator: 5 of 11 legs."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.249Z
aliases: reference_u_zo_ms0_05_06_2026_05_25
---


# U-ZO-MS0-05 + U-ZO-MS0-06 + CLI — MS0 envelope CLOSE

2026-05-25 slot bravo iter2, commit `6a3a5e99c4`. Closes the ZULU-OMNISCIENT-MS0 read-side phase (6/6 surfaces). Builds on `e9bf140cbc` (U-ZO-MS0-02/03/04 from earlier this session).

## What shipped

### U-ZO-MS0-05 — `loadTokenAwarenessZone(slot, opts)`

Reads `state/shared/token-budget-<slot>.json` (per-slot sidecar from `.claude/hooks/token-awareness-sidecar.mjs` / [[reference_token_awareness_ms0_2026_05_20|TOKEN-AWARENESS-MS0]]). Returns `{ok, reason, slot, zone, worstPct, worstSource, action, stale, ageMs, ctxTokens, ctxMaxTokens, ctxPct, sessionId, capturedAt, ...}`.

Same pattern as U-ZO-MS0-03/04: KNOWN_SLOTS path-traversal defense (slot:null on invalid), disable-env check at top, `safeJsonParse` proto-pollution guard, `KNOWN_TOKEN_BUDGET_SCHEMA_VERSIONS` allowlist (fail-loud on schema bump).

Replaces G3's coarse 90s wait with zone-aware decisions in the composite.

### U-ZO-MS0-06 — `loadSlotContext(slot, opts)` + `deriveZuluDecision(...)` + `bundleSurface(env)`

The integration unit. `loadSlotContext` calls all 5 readers (brief/vision/bridge_units/soul/loop/tokenZone) and returns:
- Full per-surface envelopes
- `surfaces.<name>` compact bundle summaries via `bundleSurface`
- `decision` derived via `deriveZuluDecision`:
  - `recommend ∈ {"clear", "compact", "noop"}`
  - `suppressCompact: boolean` — true when loop running OR token GREEN OR stale RED/CRITICAL
  - `allowedSuggestions: string[]` — MS1 ADT kinds post-filtered by soul refuse_list
  - `rationale: string` — auditable

**Safety hierarchy** (in order):
1. **Soul missing/invalid** → noop + suppressCompact (soul is hard-constraint)
2. **Loop running** → noop + suppressCompact (mid-loop /compact bug fix)
3. **Token zone GREEN** → suppressCompact
4. **Token zone RED/CRITICAL + STALE** → noop + suppressCompact (P1-1 demotion — never compact off dead sidecar)
5. **Token zone RED/CRITICAL + FRESH** → compact

Operator-gate (G4 doctrine) preserved — `decision` is SUGGESTION fields the operator reads; nothing in the library actuates.

### CLI wrapper — `scripts/zulu-context-load.mjs`

Operator-facing entry point + system-viz auto-discoverable script node.

```bash
node scripts/zulu-context-load.mjs bravo             # summary
node scripts/zulu-context-load.mjs bravo --json      # full bundle
node scripts/zulu-context-load.mjs bravo --session <uuid>   # with loop-state
```

Exit codes: 0=ok or fail-soft envelope, 1=invocation error, 2=disabled-env or invalid-slot.

PSN-leg aggregation explicitly documented: composes 5 of 11 PSN legs (BUILD-VISION + ROADMAP-CONSOLIDATED + slot souls + loop-state + TOKEN-AWARENESS).

## Per-file scrutiny PASS (with P1 fix applied)

Reviewer dispatched on the MS0-05/06 additions: **PASS with 4 P1 + 3 P2 + 2 P3 findings (non-blocking)**. All P0 checks passed (operator-gate, path-traversal defense, proto-pollution, disable-env ordering, schemaVersion allowlist, bundleSurface(null) doesn't crash).

**P1-1 applied this commit:** stale token-zone (>180s) data demotes RED/CRITICAL → noop with rationale `token-zone-{red|critical}-but-stale`. Tested.

**P1s deferred to MS1 follow-up:**
- P1-2: top-level `ok` only reflects soul; add `surfacesOkCount`/`surfacesTotalCount` for partial-degradation visibility
- P1-3: pair `findActiveLoops` with cache-invalidation when chaining with `loadLoopState` (intentional cache-bypass needs cross-call discipline)
- P1-4: enforce `schemaVersion` in token-budget writer (currently allowlist accepts missing for back-compat)

## End-of-task 3-of-3 scrutiny

Session `claude-0c581140`. Focused reviewer dispatch on commit `6a3a5e99c4` returned **VERDICT: PASS** on all 9 verification criteria (operator-gate preservation, CLI read-only, safety hierarchy correctness, fail-soft envelope contract, exit-code documentation match, no physics inline, no premature dispatcher wiring, no test regression, peer-absorbed files correctly excluded).

All 3 arms marked PASS on the ledger.

## Test coverage delta

130/130 PASS (was 99 at start of this iter — +31 new tests):
- `parseTokenBudget` — 6 tests (happy, zone normalization, schemaVersion enforcement, missing ctx, non-object reject, frozen allowlist)
- `loadTokenAwarenessZone fail-soft` — 5 tests
- `loadTokenAwarenessZone spanning zones` — alpha GREEN / bravo YELLOW / charlie RED (≥3 spanning configs)
- `deriveZuluDecision` — 10 tests covering full safety hierarchy + soul refuse_list filter + P1-1 stale demotion (RED + CRITICAL)
- `loadSlotContext` — 5 tests (disable-env, invalid-slot, happy-path-all-5-surfaces, no-sessionId, CRITICAL token compact path) + real-data E2E

## PSN + /system-viz synergy

- **PSN aggregation** — `loadSlotContext` composes 5 of the 11 PSN legs into a single per-slot bundle. The CLI surface is the operator-facing PSN consumer entry point.
- **/system-viz** — `scripts/zulu-context-load.mjs` + `scripts/lib/zulu-context-bundle.mjs` are L8/L10 leaves the existing system-viz scanner auto-indexes. On next `regen-viz.mjs` run, these appear as discoverable nodes without explicit generator registration.
- **No dispatcher wiring this commit** — correct per spec §5 (MS0 = read-side only; MS1 territory for the richer `decideSlotAction` ADT + dispatcher integration).

## Lesson — token-budget writer schema enforcement

The reviewer P1-4 surfaced an asymmetry: `parseTokenBudget` has a `KNOWN_TOKEN_BUDGET_SCHEMA_VERSIONS` allowlist, but the writer (`.claude/hooks/token-awareness-sidecar.mjs`) doesn't actually emit `schemaVersion` on every write. The allowlist gates on `json.schemaVersion !== undefined`, so back-compat (no schemaVersion) passes through silently. When the writer eventually adds `schemaVersion:"1.0.0"`, the allowlist activates — but any operator who bumps the writer to `"2.0.0"` before this consumer is updated will silently get `schema-version-unsupported` zone:null everywhere, and ALL Zulu decisions degrade to the "no-token-data" branch.

Mitigation queued for MS1: writer-side enforcement + a one-time process.stderr warning on `schema-version-unsupported` so the asymmetry doesn't go silent across an upgrade window.

## What's still open (Hermes/Zulu remaining after this commit)

| Unit | What | Risk |
|------|------|------|
| **MS1** | `decideSlotAction` ADT decider + dispatcher wiring | MEDIUM — operator-gated suggestion-only contract preserved |
| **MS2** | Goal-aware planner with ranked top-K SUGGESTIONS | HIGH — gates on MS1 |
| U-ZM2-02 | UIA pane focus (replaces title-HWND) | HIGH — Windows native binding investigation |
| U-ZM2-03 | execute-mode E2E | Gated on U-ZM2-02 + 24h grace |
| U-ZM2-04 | pid-liveness gate | LOW — standalone |
| MS4 | Closed-learning harness (NousResearch pattern) | HIGH — out of MS0 scope per spec §8 |
| G10 (operator) | Register `PRISM Zulu Orchestrator` scheduled task | Operator-only |
| G12 (operator) | Set `zuluOptIn=true` on chat-slots | Operator-only |

## Doc reflection (per [[feedback_reflect_all_changes_post_update]])

- **CLAUDE.md** — bravo cannot edit (golf-only). Pointer queued in `state/shared/RECENT-SHIPMENTS-2026-05-25.md` for golf's next weekly drain.
- **MEMORY.md** — index at 24K ceiling; this file feeds Obsidian via Stop hook regardless of index update.
- **Wiki** — `knowledge/wiki/architecture/zulu-omniscient-ms0.md` updated to MS0 COMPLETE.
- **Obsidian memory** — this file. Auto-feeds via `stop-obsidian-memory-feed.mjs` on Stop.

## Cross-refs

- [[reference_u_zo_ms0_02_03_04_2026_05_25]] — the immediate predecessor (4 of 6 surfaces)
- [[reference_session_continuity_stack_2026_05_15]] — terminal-pin + auto-resume foundation
- [[reference_zulu_hermes_gaps_campaign_2026_05_20]] — the 13-gap campaign predecessor
- [[reference_zpsn03_target_parser_2026_05_23]] — the PSN synchronous-half closer
- [[hermes-zulu-integration]] — HERMES-MS0/MS1 architecture
- [[feedback_psn_definition]] — PSN's 11 legs
- [[feedback_reflect_all_changes_post_update]] — 4-surface doctrine
- ZULU-OMNISCIENT-MS0-PLAN: `state/shared/specs/ZULU-OMNISCIENT-MS0-PLAN.md`

## Synergy contract — /goal proof

User directive 2026-05-25: *"/goal [ complete all remaining units and tasks in current envelope | wired and synergized to psn + /system-viz ] /loop [5m] /goal"*

- Arm 1 (complete all remaining units in current envelope): ✅ MS0 envelope CLOSED. 6/6 surfaces shipped.
- Arm 2 (wired and synergized to PSN + /system-viz): ✅ CLI wrapper makes the PSN aggregator invocable from shell; library + CLI auto-discoverable in /system-viz via existing scanner; `loadSlotContext` IS the PSN-leg aggregator (composes 5 of 11 legs).

## Related
[[skills/loadtokenawarenesszone|/loadtokenawarenesszone]] • [[skills/loadslotcontext|/loadslotcontext]] • [[skills/derivezuludecision|/derivezuludecision]] • [[skills/zulu-context-load|/zulu-context-load]]
