---
name: mike-osp-profile-engine-2026-05-23
description: "2026-05-23 mike /goal session — OkumaLatheOSPProfileEngine ships india HURCO physics-gate (Kienzle/Taylor/stickout) + echo P2P consensus + Omega/S(x) safety gate, applied to the 6-family Okuma OSP controller fleet (P200LA / P300L / P300LA / P300SA / P500 / U10L) covering all 7 JM Die lathes. 32/32 tests PASS. Closes parts (1) and (2) of the user /goal."
aliases: reference_mike_osp_profile_engine_2026_05_23
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.213Z
---


# OkumaLatheOSPProfileEngine — mike 2026-05-23

## Mandate

Third of the 3 mike-shipments closing the lathe /goal trilogy (audit → backbone → engine):
1. [[jm-lathe-post-audit-2026-05-23]] — 7-lathe post-processor classification (advisory punch list)
2. [[fusion-tooling-catalog-2026-05-23]] — `.hsmlib` XML extractor + 712-tool / 329-preset speed/feed backbone
3. **This entry** — `OkumaLatheOSPProfileEngine.ts` — production engine combining india's physics gates + echo's consensus pattern, applied to the JM Die Okuma fleet.

User /goal explicitly named two patterns to follow ("follow echo and india example") and one PSN-extraction surface (OSP coding / macros / material × stickout × tool × stickout matrix). This unit ships both.

## Shipped (slot/mike)

Commit subject: `[MIKE-OSP-PROFILE-MS0]/U-MIKE-OSP-PROFILE-ENGINE`
- `mcp-server/src/engines/OkumaLatheOSPProfileEngine.ts` (~340 LOC)
- `mcp-server/src/__tests__/OkumaLatheOSPProfileEngine.test.ts` (32 vitest cases, **32/32 PASS**)

## INDIA HURCO pattern follow-through (Group D physics gates)

Mirror of india's `HurcoV11MillMasterPost` group-D physics checks (commit `ae0f634ae4`), now applied to Okuma instead of Hurco:

| Gate | Formula | Reference |
|------|---------|-----------|
| `applyKienzleGate` | Fc = kc1_1 × b × fz^(1-mc) × ap | Sandvik General Turning 2024 |
| `applyTaylorGate` | T = (C / Vc)^(1/n) | Taylor 1907 / ISO 3685:1993 |
| `applyStickoutGate` | δ ∝ L³/(3·E·I); cubic falloff per (L/D) | Industry turning practice |

All three import from `CANONICAL_KIENZLE` + `CANONICAL_TAYLOR` (zero inlined constants). R12 fail-loud: every gate validates via Zod and **THROWS** on out-of-range input (`ap > 50 mm`, `vc = 0`, `D = 0`, etc.) — same pattern as india's material override validation that rejected `kc1_1 < 200 || > 6000` and `mc < 0.10 || > 0.45`.

## ECHO P2P pattern follow-through (consensus + safety gate)

Mirror of echo's `LATHE-P2P-CONSENSUS-MS4` pattern (commit `d6a975d987`):

- `consensusParameters(iso_group, machine, dialect, stickout, target_life_min)` — generates **3 candidates** (`conservative` / `balanced` / `aggressive`) by scaling `vc × {0.8, 1.0, 1.2}`, `fz × {0.75, 1.0, 1.2}`, `ap × {0.75, 1.0, 1.15}`. Each candidate is gated by both physics checks; confidence drops 0.4 per failed gate. Recommended = max-confidence (ties → balanced).
- Cross-candidate `Omega` = mean confidence; `S(x)` = recommended.confidence × dialect-capability (iMachining + AI-adaptive feedrate gates).
- `enforceSafetyGate({omega, sx, tier})` — `SafetyGateRejection` class with `omega_threshold` + `sx_threshold` + actuals exposed for audit-log consumption. Shop-floor default = Omega≥0.95, S(x)≥0.98 (matches CLAUDE.md doctrine + echo's P1-U03).

## OSP controller dialect coverage (6 families → 7 JM Die machines)

| Family | Gen | iMachining | AI-adaptive | Live tool | C-axis | Spindle max | JM Die mapping |
|--------|----:|:----------:|:-----------:|:---------:|:------:|------------:|----------------|
| P200LA | 3 | ✓ | ✓ |   |   | 5000 | LTH-02 GENOS L200E-M |
| P300L  | 4 | ✓ | ✓ | ✓ | ✓ | 4000 | LTH-01 GENOS L300-M |
| P300LA | 4 | ✓ | ✓ | ✓ | ✓ | 4500 | LTH-05 GENOS L400II-E |
| P300SA | 5 | ✓ | ✓ | ✓ | ✓ | 6000 | LTH-07 Multus B250II |
| P500   | 5 | ✓ | ✓ | ✓ | ✓ | 3500 | LTH-06 LB 3000EX |
| **U10L** | **1** | **✗** | **✗** |   |   | 4500 | LTH-03 LNC8, LTH-04 Crown L1060 |

**Key finding:** the U10L legacy controller (2 of 7 lathes — LTH-03 + LTH-04) cannot accept iMachining or AI-adaptive-feedrate posts without a controller swap. The audit's recommendation to "Rebuild with Ai-Enhanced + iMachining" applies cleanly to LTH-01 / LTH-02 / LTH-05 / LTH-06 (all modern OSP). LTH-03 / LTH-04 need a different upgrade strategy (post-only optimizations within U10L's capability envelope, or hardware-side controller refresh).

This is **exactly the kind of capability surface that justified the engine** — the audit alone said "all 4 plain posts → rebuild with Ai-Enhanced + iMachining" without knowing the controller could refuse. Now the engine's `classifyController().imachining_capable` gate catches the impossibility automatically.

## Material × stickout matrix (user's "tooling parameters relative to...")

`buildMaterialStickoutMatrix(machine, dialect, materials[], stickouts[])` enumerates every cell and returns `{ "<ISO>_<L>x<D>": ConsensusResult }`. Each cell has the 3-candidate fanout + recommended + Omega + S(x) + safety-gate verdict.

Example fan-out for LTH-07 Multus B250II + 3 materials (P/M/N) × 2 stickouts (25x16 rigid, 50x16 compliant) = 6 cells, each carrying 3 candidate parameter sets = 18 candidate recommendations ready for downstream `.cps` post-template feeding.

## Cross-dialect S(x) ordering (anti-regression invariant)

Locked by test `"U10L legacy dialect produces LOWER S(x) than P300SA modern dialect (same material)"`:

```
S(x)[P300SA, steel, 40x16] > S(x)[U10L, steel, 40x16]
```

If a future refactor accidentally flattens the dialect-capability multiplier, this test fails — the upgrade-ROI signal would otherwise silently vanish.

## PSN synergy touched

- **Engines** — `OkumaLatheOSPProfileEngine` shipped (new, no duplicate per dedup grep — `lathe-tooling-catalog` is a wiki doc node, not a code engine)
- **Physics** — references `CANONICAL_KIENZLE` + `CANONICAL_TAYLOR` (canonical-only, zero inlining)
- **System-viz** — next regen indexes `OkumaLatheOSPProfileEngine` as L11 engine node + 6 `OSPFamily` profile leaves
- **Wiki** — companion entry `knowledge/wiki/architecture/okuma-osp-profile-engine.md` (next commit)
- **Memory** — this memo
- **Tests** — 32/32 vitest PASS

## Domain handoff (bravo + india)

The engine is now consumable by:
1. **Bravo** (lathe-domain) — when seeding `OKUMA_LATHE_*.hsmlib` libraries per the Fusion-backbone unit, call `consensusParameters` per (material, stickout) bucket to pre-fill speed/feed presets.
2. **India** (post-processor domain) — when extending the 4 plain `.cps` posts (LTH-01..04) with iMachining + AI-adaptive markers, first call `classifyController(controller_model).imachining_capable` to verify the underlying controller can execute. LTH-03 / LTH-04 (U10L) will return `false` — those need a different upgrade path.

## Verification commands

```bash
cd H:/prism-slot-mike/mcp-server && npx vitest run src/__tests__/OkumaLatheOSPProfileEngine.test.ts
# expect: 32 PASS / 0 FAIL
```

## Cross-refs

- Sister units: [[jm-lathe-post-audit-2026-05-23]] · [[fusion-tooling-catalog-2026-05-23]]
- Pattern sources: india `HurcoV11MillMasterPost` (commit `ae0f634ae4`), echo `LATHE-P2P-CONSENSUS-MS4` (commit `d6a975d987`)
- Race-mitigation patterns used: [[mike-bridge-wiring-race-mitigation-2026-05-23]]
- Slot soul context: [[reference_juliett_12chat_allocation_2026_05_17|JULIETT-12CHAT-ALLOCATION]]-MS0 in CLAUDE.md (mike = misc-catcher; user /goal explicit override authorizes this lathe-domain work)
