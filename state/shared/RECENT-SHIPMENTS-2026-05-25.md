# RECENT-SHIPMENTS — 2026-05-25

> Inbox for shipments that need CLAUDE.md `## Recent regressions` / milestone-summary entries
> on the next golf-slot weekly drain. Bravo + other non-golf slots write here; golf authors the
> full CLAUDE.md sections from this queue.

## ZEBRA-OMNISCIENT-MS0 — U-ZO-MS0-02 + U-ZO-MS0-03 + U-ZO-MS0-04 (slot:bravo iter1)

**Commit:** `e9bf140cbc` · **Date:** 2026-05-25 · **Slot:** bravo (`claude-7979e425`) · **Tests:** 99/99 PASS · **Scrutiny:** 3-of-3 PASS

Three read-side library extensions on `scripts/lib/zebra-context-bundle.mjs` closing 4 of 6 ZEBRA-OMNISCIENT-MS0 surfaces:

- **U-ZO-MS0-02** `loadBridgeUnits()` + `parseBridgeUnits()` + `safeJsonParse()` — reads `state/shared/specs/ROADMAP-CONSOLIDATED.json` `bridge_units` (wiring + deep_integration), kind/topK filters pre-validated BEFORE disk I/O (R12 fail-loud), proto-pollution guard via JSON.parse reviver.
- **U-ZO-MS0-03** `loadSlotSoulRefuseList(slot)` + `parseSoulFrontmatter()` + `extractFrontmatterText()` — reads `state/shared/slot-souls/<slot>.md` YAML frontmatter, KNOWN_SLOTS 26-NATO whitelist defends path-traversal, slot:null on invalid (no log-channel reflection — P0-C).
- **U-ZO-MS0-04** `loadLoopState(sessionId)` + `findActiveLoops()` + `parseLoopState()` — reads `state/shared/loop-state/loop-<sid>.json`, KNOWN_LOOP_SCHEMA_VERSIONS allowlist fail-loud, findActiveLoops intentionally bypasses cache (fleet-wide scan must see fresh ticks), EACCES distinguished from ENOENT, throwing-reader try/catch with skipped counter.

All 3 readers honor `PRISM_ZEBRA_CONTEXT_DISABLE=1` BEFORE input validation (P0-B fix).

**Per-file scrutiny** — Reviewer A (code-analyzer) PASS with 1 P1 (kind/topK pre-validation order); Reviewer B (independent) FAIL→PASS after fixing 3 P0s + 3 P1s (proto-pollution, disable-env bypass, input reflection, EACCES distinction, cache-bypass documentation, schemaVersion validation).

**End-of-task 3-of-3** — Session `claude-3fe8d5b7`. All 3 arms PASS. Ledger marked.

**Open Hermes/Zebra remaining:** U-ZO-MS0-05 (TOKEN-AWARENESS zone), U-ZO-MS0-06 (sweep composition+cache integration), U-ZM2-02/03/04 (UIA path), MS4 closed-learning harness, G10+G12 operator-action items.

**Memory:** [[reference_u_zo_ms0_02_03_04_2026_05_25]]

**Suggested CLAUDE.md section:** add under `## ZEBRA-OMNISCIENT-MS0` (or create) as a pointer line noting 4/6 surfaces shipped + remaining 2 MS0 + 3 ZM2 + MS4 still open. Suggested wording:

> **ZEBRA-OMNISCIENT-MS0 progress (2026-05-25):** 4 of 6 read surfaces shipped — U-ZO-MS0-01 (brief+vision, prior), U-ZO-MS0-02 (bridge_units), U-ZO-MS0-03 (slot souls refuse_list), U-ZO-MS0-04 (loop-state + findActiveLoops). All read-side library on `scripts/lib/zebra-context-bundle.mjs`; no dispatcher wiring yet per spec §5 (integration is U-ZO-MS0-06). 99/99 tests, 3-of-3 PASS, proto-pollution guard via safeJsonParse reviver. Wiki: [[zebra-omniscient-ms0]]. Memory: [[reference_u_zo_ms0_02_03_04_2026_05_25]].

---

## ZEBRA-OMNISCIENT-MS0 — U-ZO-MS0-05 + U-ZO-MS0-06 + CLI (slot:bravo iter2) — **MS0 COMPLETE**

**Commit:** `6a3a5e99c4` · **Date:** 2026-05-25 · **Slot:** bravo · **Tests:** 130/130 PASS · **Scrutiny:** 3-of-3 PASS (session `claude-0c581140`) · **Per-file scrutiny:** PASS (4 P1s found; P1-1 stale-demotion applied; 3 P2 + 2 P3 deferred to MS1)

Closes the MS0 read-side phase. 2 readers + composite + CLI:

- **U-ZO-MS0-05** `loadTokenAwarenessZone(slot)` + `parseTokenBudget(json)` + `KNOWN_TOKEN_BUDGET_SCHEMA_VERSIONS` allowlist — reads `state/shared/token-budget-<slot>.json` (per-slot sidecar written by TOKEN-AWARENESS-MS0/U-TA01..12). Replaces G3's coarse 90s wait with zone-aware decisions: GREEN suppresses /compact, RED/CRITICAL recommends /compact (unless stale per P1-1 demotion).
- **U-ZO-MS0-06** `loadSlotContext(slot, {sessionId})` composite — calls all 5 readers (brief/vision/bridge_units/soul/loop/tokenZone), returns full bundle + per-surface envelope summaries + `decision` (recommend/suppressCompact/rationale/allowedSuggestions). `deriveZebraDecision` pure suggestion derivation with safety hierarchy: soul (hard-constraint) > loop-running (mid-loop /compact bug fix) > token-zone (RED/CRITICAL→compact unless stale). Soul refuse_list post-filters allowedSuggestions (operator-gate G4 preserved: SUGGESTIONS only).
- **CLI wrapper** `scripts/zebra-context-load.mjs` — operator-facing entry point. `node scripts/zebra-context-load.mjs bravo` → summary; `--json` → full bundle; `--session <sid>` → enables loop-state read. PSN-leg aggregator: composes 5 of 11 PSN legs (BUILD-VISION + ROADMAP-CONSOLIDATED + slot souls + loop-state + TOKEN-AWARENESS).

**P1-1 from per-file scrutiny applied this commit:** stale token-zone data (>180s) demotes RED/CRITICAL → noop with rationale `token-zone-{red|critical}-but-stale`. Prevents pinning a slot in "always compact" off a dead sidecar reading.

**Open follow-ups (deferred from per-file scrutiny):**
- P1-2: top-level `ok` is single-surface (soul only); add `surfacesOkCount`/`surfacesTotalCount` for partial-degradation visibility
- P1-3: pair `findActiveLoops` with cache-invalidation when chaining with `loadLoopState`
- P1-4: enforce schema version in token-budget writer (currently optional)
- P2/P3: pure-helper extraction, regex anchor robustness, allowed-suggestion export const

**Memory:** [[reference_u_zo_ms0_05_06_2026_05_25]]

**Suggested CLAUDE.md update:** the prior section's pointer should now read "MS0 COMPLETE (6/6 surfaces)" with `6a3a5e99c4` as the close-out commit. Open work moves to MS1 (richer ADT decider).
