---
name: reference_ultimatespeedfeed_calculate_slow_2026_06_01
description: "UltimateSpeedFeedEngine.calculate() is ~2.5s PER CALL (playbook scan), so any per-cell SFC sweep is slow (9x6 grounding = ~135s). Memoize deterministic groundings. Found 2026-06-01."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.981Z
aliases: reference_ultimatespeedfeed_calculate_slow_2026_06_01
---


# UltimateSpeedFeed.calculate is ~2.5s/call — memoize per-cell SFC sweeps (slot foxtrot, 2026-06-01)

**Finding:** `ultimateSpeedFeedEngine.calculate({iso_group, tool_diameter_mm, flutes, operation})` takes **~2.5 seconds per call** (measured: call1 2703ms, call2 2940ms, 10 calls 24524ms ≈ 2.45s/call — NOT first-call init; every call is slow). For a single speed/feed calc (algebra: Vc→RPM, fz→feed) this is ~1000× slower than it should be — almost certainly the MachiningPlaybookEngine / tribal scan run inside `calculate` (scanning ~10,899 categorized tips per call). **Oscar/SFC-domain perf bug** — the computed VALUES are correct, only the latency is wrong.

**Impact:** Any surface that grounds many cells via `calculate` is slow: the mill template SFC-grounding (`generateSFCGroundedLibrary` / `generateLibrary({sfc_ground:true})`) over the full 9×6 matrix = ~135s; a fleet training sweep re-grounding 9×6 per machine = 5×135 = ~11 min. This timed out the 30s vitest budget (`STACK_TRACE_ERROR` masking a timeout).

**Mitigation shipped (in-lane, foxtrot):** memoized `groundCell(op,iso)` in `MillToolpathTemplateLibraryEngine` with a module-scoped `Map` keyed `${op}|${iso}` — the (op,iso)→conditions is deterministic for the op's fixed default tool, so caching is sound. A fleet sweep re-grounding the same cells per machine drops 5×270→54 calls; re-runs are instant. Failures are NOT cached (could be transient).

**For oscar (the real fix):** profile `UltimateSpeedFeedEngine.calculate` — the playbook/tribal query per call should be cached or made lazy/optional. A 2.5s speed/feed calc is unusable interactively.

## How to apply
- Any loop that calls `ultimateSpeedFeedEngine.calculate` per item WILL be slow (~2.5s × N). Memoize on the deterministic input key, or batch, or make the playbook query opt-in.
- A vitest `STACK_TRACE_ERROR` with no message on a heavy test is usually a **timeout** — time the SUT directly (tsx probe) before assuming a logic bug.
- Relates: [[reference_tapping_feed_pitch_locked_2026_06_01]] · [[reference_mill_program_enhance_contract_2026_06_01]] · [[reference_oscar_sfc_domain_map_2026_05_27]]
