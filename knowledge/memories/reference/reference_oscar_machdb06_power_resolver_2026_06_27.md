---
name: reference_oscar_machdb06_power_resolver_2026_06_27
description: "MACHINE-DB U-MACHDB-06 (slot:oscar) -- single-source resolveSpindlePowerKw extracted from normalizer + first consumer wire; the apply-to-all queue (6 deferred sites) + honest 7-not-12 correction"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.691Z
aliases: reference_oscar_machdb06_power_resolver_2026_06_27
---


# MACHINE-DB U-MACHDB-06: single-source spindle-power resolver + first apply-to-all wire (slot:oscar, 2026-06-27)

Continuation of [[reference_oscar_machdb_enricher_2026_06_27]] (U-MACHDB-03/04). Commits `2af90335b5`
(U-MACHDB-06) + the `U-MACHDB-06-DOC` follow-up. 3-of-3 scrutiny PASS (blockCount 0); build:fast clean;
31/31 tests (13 new + 18 live-registry normalizer suite unchanged).

## What shipped
`resolveSpindlePowerKw(rawSpindle)` -- exported pure helper in `mcp-server/src/registries/machine-normalizer.ts`,
extracted from `normalizeMachine`'s inline 8-candidate power union (power_continuous | power_kW | power_kw |
power_rating | power | continuousPower | continuousHp(hp) | power_hp(hp)). `normalizeMachine` now delegates
to it (byte-identical candidate list/order/`hp` transform/provenance src -- the 18-test live 1015-machine
suite passes unchanged, proving behavior-preservation). First consumer wired:
`MachinePackageSelectionEngine.convertToPackage` (line ~222) resolves power through the helper with the
original `?? power_continuous ?? power ?? 15` chain kept as a STRICT-SUPERSET fallback (a variant-keyed
machine that previously dropped to the 15 kW default now reports its real power).

Test: `mcp-server/src/__tests__/machine-spindle-power-resolve.test.ts` (13, R9 reference values): all 8 keys
resolve, hp->kW at independent literals (40hp=29.828kW, 10hp=7.457kW), union-order determinism, 3 failure
modes (no key / null/undefined / empty -> undefined, never a fabricated default), 3 adversarial
(NaN/Infinity/-Infinity rejected, numeric-string coerced, non-finite primary falls through), single-source
contract (normalizeMachine reaches power via the same helper + provenance `spindle.power_kW` pinned).

## R12 correction: 7 genuine silent-drop sites, NOT 12
The pre-compact notes claimed "12 consumer sites." Grep showed that conflated the `power_continuous_kw`
CAPABILITY-schema reads (a separate already-normalized layer: MachineCapabilityIntelligence:312,
MachineDataAudit, Handbook*, SFC cap path at SpeedFeedOrchestrator:1276) with the raw-registry
`power_continuous` bug. Genuine raw silent-drop sites = **7**; 1 now wired, 6 queued.

## APPLY-TO-ALL QUEUE (next units -- reuse resolveSpindlePowerKw)
In-lane (oscar/machine-domain), reuse the helper directly:
- `IntelligenceEngine.ts:1517` (`?? power_30min ?? 0`)
- `MachineSelectionEngine.ts:114` (`?? 20`; async IIFE loader -- harder to unit-test)
- `MachineEnvelopeGuardEngine.ts:226` (already has partial `?? power_kW`; SAFETY-adjacent power-limit guard -- highest priority of the 6)
- `PipelineRegistryBridge.ts:405` (`?? 15`)
Cross-domain (coordinate lane before editing):
- `MachineRateDatabaseEngine.ts:458` (`?? 0`) -- cost/quoting -> charlie/hotel
- `PostProcessorPipelineEngine.ts:4231` (`?? power_30min ?? 15`) -- echo

Most of these consumer methods are PRIVATE / coupled to the global `machineService` singleton, so they are
hard to unit-test in isolation; the helper is the R9-tested unit + each wire is a behavior-superset 1-liner
verified by tsc + read. Also queued from U-MACHDB-04: U-MACHDB-05 (JM fleet OEM-precision overrides),
P4 (feed enriched FRF into the EXISTING ChatterStabilityLobeEngine -- DEDUP, known 0-lobe regression,
foxtrot domain), P1 (missing brands).

## Process notes
- An active multi-host claim STORM on `machine-enricher.ts` + its test + the verify script + the spec +
  the enricher memory (DESKTOP--NNNNN hosts, 17:42-18:14) made the enricher core OFF-LIMITS this turn
  (session hook says this PC is sole active user of H:, so the claims are likely anomalous/replayed, but
  unverifiable -> treated as claimed). This unit deliberately touched only the normalizer source (clean,
  uncontested) + a new test file + one clean consumer -- never the enricher core, never the DIRTY
  `machine-normalizer.test.ts` (foreign uncommitted hunks -> would bundle, per [[feedback_stage_own_hunks_not_whole_file]]).
- The 8-vs-7 key-count label was caught by 2 scrutiny arms as a P2 and fixed in `U-MACHDB-06-DOC`.

See [[feedback_stage_own_hunks_not_whole_file]] · [[reference_oscar_machdb_enricher_2026_06_27]].
