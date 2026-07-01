---
name: reference_oscar_sfc_awareness_surface_2026_05_28
description: Custom SFC-domain awareness surface (sfc-awareness-snapshot.mjs → SFC-AWARENESS.md) — the live 11-leg PSN synergy audit; first run found + fixed 2 inlined-kc P0 violations.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.695Z
aliases: reference_oscar_sfc_awareness_surface_2026_05_28
---


# Custom SFC domain awareness surface + synergy audit (2026-05-28, slot:oscar)

Operator goal (the SFC synergy-audit /loop): *"maximize potential of your domain… make a custom one tailored to your domain so you always have context on your domain | goal clear: synergize your domain, wired, tested and validated."*

## What shipped
- **`scripts/sfc-awareness-snapshot.mjs`** — pure-node (NO MCP/Ollama) generator. Scans the filesystem via targeted flat `readdirSync` (NOT recursive glob — that timed out on the ~865-behind worktree) and computes the **live 11-leg PSN synergy audit** for the SFC domain. Running it IS the audit (never stale). Emits `mcp-server/src/engines/speed-feed/SFC-AWARENESS.md` (co-located in the galaxy → auto-surfaced when the galaxy CLAUDE.md loads on every oscar UserPromptSubmit). Flags: `--json`, `--stdout`, `--frozen-time`. Knobs: `PRISM_OSCAR_MEMORY_DIR`, `PRISM_AWARENESS_FROZEN_TIME`.
- **`scripts/sfc-awareness-snapshot.test.mjs`** — node:test, 8/8 PASS. R9 intent test: the constants-inline scan MUST find 0 offenders (goes RED if any SFC engine ever inlines a kc1.1/Taylor constant — the whole point); deterministic renderer; 10-row leg taxonomy; engine-count floor.
- Wired into galaxy `CLAUDE.md` (`## Always-on domain awareness` pointer) + `MEMORY.md` (High-ROI pointer).

## The synergy audit found 2 real P0s (and fixed them)
First run verdict was **NEEDS-FIX (🔴1)** — the Formulas/constants-discipline leg. The constants-inline scan flagged 3 engines; verified the actual lines (R12, don't trust the comment):
- **`AutoSpeedFeedEngine.ts:867`** — `const kc = { P:1800, M:2100, K:1100, N:700, S:2800, H:3200 }` inlined. **TRUE P0.** Fixed → `import { CANONICAL_KIENZLE }` + `CANONICAL_KIENZLE[iso]?.kc1_1 ?? CANONICAL_KIENZLE.P.kc1_1`.
- **`SpeedFeedChatterStabilityAdapterEngine.ts:176`** — same inlined table; comment on :173 **lied** ("from constants.ts (NOT inlined here)"). **TRUE P0.** Same fix + comment corrected.
- **`SpeedFeedMinerEngine.ts`** — `speed_sfm:[300,700]` SFM *ranges* near a "Kienzle" comment. **FALSE POSITIVE.** Eliminated by tightening the detector from a bare-literal scan to the precise ISO-map shape regex `/\bP\s*:\s*1800\b[\s\S]{0,120}\bM\s*:\s*2100\b/`.

After fix: verdict **SYNERGIZED (🟢8/🟡1/🔴0/⚪1)**. 🟡 = tribal (mcpDeferred, awaiting MCP ingest), ⚪ = system-viz (graph absent in worktree → golf-merge verify). Both legitimate deferred items, not defects.

## Validation
- gen node:test 8/8 · the 2 edited engines' vitest 34/34 (constants fix is behaviorally identical — canonical kc1.1 P1800 M2100 K1100 N700 S2800 H3200 ARE what was inlined — now single-sourced).
- Live metrics at audit time: 29 SFC engines · 27 test files · 42 sfc_/speed_feed dispatcher actions · 3 wiki entries · galaxy gates 11/11.

## Lessons
- A domain awareness generator that performs its own audit on each run is self-validating + never-stale, and immediately earned its keep by surfacing 2 P0s the galaxy buildout missed.
- Constants discipline (`feedback_oscar_sfc_physics_discipline`) had 2 live violations in shipped SFC engines — the inline-detection must use the **map SHAPE**, not bare literals, to avoid SFM-range false positives. See [[feedback_oscar_sfc_physics_discipline]] · [[reference_oscar_sfc_galaxy_2026_05_28]] · [[reference_oscar_sfc_canonical_kc_per_iso]].
