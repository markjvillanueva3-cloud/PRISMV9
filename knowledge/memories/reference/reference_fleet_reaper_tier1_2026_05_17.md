---
name: reference-fleet-reaper-tier1-2026-05-17
description: FLEET-REAPER-MS1 Tier-1+2 — graduated mem-pressure gate (tierFromPressure) + 256MB critical ballast + critical-pressure service auto-restart (readDockerHealth schema P0 fixed). Shipped 2026-05-17 slot alpha.
aliases: reference_fleet_reaper_tier1_2026_05_17
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.117Z
---


# [[reference_fleet_reaper_ms1|FLEET-REAPER-MS1]] Tier-1 (2026-05-17, slot alpha, claude-23c10eea)

Two strictly-additive units in `H:/prism/scripts/fleet-reaper-sweep.mjs`, both
backward-compatible, both with node:test suites (vitest is blocked under the
`.claude/` infra — these live in `scripts/__tests__/` and run via `node --test`).

## U-FR-TIER1-AGGRESSIVE-THRESHOLDS — commit `f4ab9e01d9`

Replaced the binary reap gate `underPressure ? min(killAfter,1) : killAfter`
with a pure exported `tierFromPressure(usedPct, warnPct, criticalPct, killAfter)`
→ `{tier, effectiveKillAfter}` 3-band machine:
- `usedPct < warnPct` → `normal`, full `killAfter`
- `[warnPct, criticalPct)` → `warn`, `min(killAfter,1)`
- `usedPct >= criticalPct` → `critical`, `0` (reap THIS sweep, no extra confirm tick)

New `DEFAULT_MEM_CRITICAL_PCT=95` + knob `PRISM_FLEET_REAPER_MEM_CRITICAL_PCT`.
warn band = the pre-existing `memPressurePct` (default 90) so behavior below 95%
is **byte-identical** to pre-MS1 (proven by an in-test legacy reimplementation);
only the new ≥95% band diverges. Fail-safe (R12): non-finite/negative usedPct →
`normal`/full killAfter (a blind memory read NEVER escalates reaping);
`criticalPct < warnPct` misconfig clamps critical UP to warn (collapse, never
invert). `underPressure` keeps its pre-MS1 meaning (now `warn|critical`);
critical surfaced additively as `pressureTier`/`criticalPressure`. 16 tests.

## U-FR-TIER1-MEM-BALLAST — second commit (same session)

256MB `Buffer` reserved at CLI boot, released one-shot the first sweep that
reports the critical band. Rationale: on Windows commit charge is taken at
allocation (not first-touch), so the held ballast inflates the very
commit-pressure metric the reaper gates on — and freeing it at the ≥critical
alarm hands ~256MB back exactly when the reaper's own PowerShell enumeration
needs headroom (the documented OOM-blinding failure mode). Pure `ballastAction`
state machine (disabled/noop/allocate/hold/release) + fail-soft `ensureBallast`
(alloc failure surfaced, never thrown) + one-shot latched `releaseBallast`
(never re-reserve → no oscillation). Lives ENTIRELY in the CLI shell
(`main()`/`monitorLoop`) — `runSweep` is byte-untouched, so existing
programmatic callers/tests cannot trigger a 256MB alloc and the layer is
invisible to them. `--status` skips it. Knob `PRISM_FLEET_REAPER_BALLAST_MB`
(0=off). `__resetBallastForTest()` test seam. 20 tests. Also added the CRITICAL
marker to `monitorEvent` (closed a prior reviewer P2).

## U-FR-TIER2-SERVICE-RESTART — third commit (same session)

Under the critical band, a wedged Qdrant/Postgres/Prometheus container is the
highest-leverage relief (a wedged Docker silently degrades master-index to
BM25-only fleet-wide). Pure `serviceRestartAction` (noop/advise/restart) +
fail-soft one-shot-latched `restartWedgedServices`, wired in the coordinator
block. **Advisory by default** — acts only with
`PRISM_FLEET_REAPER_SERVICE_RESTART=1`; the Docker DAEMON is NEVER an
auto-restart target (advise-only — auto kills every container). `result.ok`
stays reap-mission-only. 19 `node:test` (16 pure + 3 real-shape E2E).

**P0 caught by per-file scrutiny Reviewer A (the load-bearing lesson):** the
real `ollama-docker-health.mjs` probe emits `docker`/`ollama` as TOP-LEVEL JSON
keys; `readDockerHealth` mirrored ONLY `parsed.services.*` → `services.docker`
never populated for real payloads → daemon-down safety guard DEAD in production
(would `docker restart` a dead daemon with restart enabled) + `available`
permanently false (latent MS1.1 spurious-caveat bug). The 16 hermetic tests
passed because the fixture fabricated `docker` *inside* `services` — a shape
the producer never emits. Fix: `readDockerHealth` folds top-level
`docker`/`ollama` into `services` (back-compat: explicit `services.docker` not
overwritten); 3 real-producer-shape E2E tests added as the fail-on-revert
oracle. Reviewer B independently verified end-to-end PASS.

## Lessons
- **A pure-core + injected-readers design MUST ship ≥1 real-producer-shape
  E2E.** Hermetic fakes of the WRONG contract pass 100% while production is
  100% broken — identical class to [[reference_rgs_tool_autoinvoke_ms1_2026_05_16|RGS-TOOL-AUTOINVOKE-MS1]]
  ([[reference_rgs_tool_autoinvoke_ms1_2026_05_16]]). The per-file scrutiny
  2-reviewer gate caught it pre-ship (Reviewer A = code-analyzer reading the
  REAL producer, not the test fixture) — the gate working as designed.
- Wiring at the CLI shell (not inside the hot `runSweep`) is the
  zero-regression seam: every existing test/caller is unaffected by construction.
- A pure decision fn + thin imperative shell makes a side-effecting feature
  (process memory) fully unit-testable without the side effect (mb=1, never 256).
- Both per-file 2-reviewer scrutiny rounds PASS, 0 P0/P1; all P2s fixed in-session.

Related: [[reference_fleet_reaper_ms1]] (Phase 2) · [[reference_fleet_reaper_autonomy_robust_2026_05_16]] · [[feedback_golf_owns_reaper]] (the reaper is run from golf; alpha builds it).
