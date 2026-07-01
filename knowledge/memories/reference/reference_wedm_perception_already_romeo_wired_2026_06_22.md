---
name: reference_wedm_perception_already_romeo_wired_2026_06_22
description: "WEDM perception engines (WEDMKalmanFusionEngine + WEDMMachineStateEngine) are ALREADY dispatcher-wired via the romeo wire (WIRING/U-ROMEO-WIRE-WEDM-STATE-FUSION) in edmDispatcher: actions wedm_fuse_sensors/wedm_fuse_reset + wedm_machine_state_ingest/wedm_machine_state_get, tested 10/10 in dispatcher.romeoWireSwissWedm.test.ts. DO NOT re-wire them. The unwired-engine audit (audit-unwired-engines.mjs) flags both as UNWIRED ONLY because the romeo wire is UNCOMMITTED in the shared H:/prism tree (added by a concurrent peer host DESKTOP--22832); HEAD lacks it, so the audit reads HEAD and mis-reports. india /loop 2026-06-22 caught this as a duplication before shipping a parallel wedm_signal_fusion/wedm_machine_state_classify API (reverted, R16/R7)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.254Z
aliases: reference_wedm_perception_already_romeo_wired_2026_06_22
---


# WEDM perception is already romeo-wired -- do NOT duplicate

**Context:** india /loop 2026-06-22. The unwired-engine audit
(`scripts/audit-unwired-engines.mjs`) reported `WEDMKalmanFusionEngine` +
`WEDMMachineStateEngine` as **UNWIRED** (2 of 7 total). They are genuine, complete,
tested (31 unit tests) AI/estimation engines in the wire domain -- looked like a clean
WIRE target.

**The catch (R16 -- compare against ALL existing systems before declaring done):** they
are **already wired** into `edmDispatcher` (`prism_edm`) via the **romeo wire**
(`WIRING/U-ROMEO-WIRE-WEDM-STATE-FUSION`):

| action | engine method |
|---|---|
| `wedm_fuse_sensors` | `WEDMKalmanFusionEngine.fuse` |
| `wedm_fuse_reset` | `WEDMKalmanFusionEngine.reset` |
| `wedm_machine_state_ingest` | `WEDMMachineStateEngine.ingest` |
| `wedm_machine_state_get` | `WEDMMachineStateEngine.getState` |

Round-trip tested **10/10** in `dispatcher.romeoWireSwissWedm.test.ts`. The romeo API is
a **stateful streaming** surface (singleton, one reading per call, explicit reset).

**Why the audit mis-fired (the real lesson):** the romeo wire is **UNCOMMITTED in the
shared `H:/prism` working tree** -- added by a concurrent peer host (`DESKTOP--22832`, per
live `[WorkClaim]` warnings). `git show HEAD:edmDispatcher.ts | grep -c wedm_fuse_sensors`
= **0**; the working copy = HEAD + peer's uncommitted romeo. `audit-unwired-engines.mjs`
scans HEAD-committed wiring, so it correctly reports UNWIRED *for HEAD* while the live tree
already has the wire. This is the **shared-tree multi-host uncommitted-peer-work hazard**,
not an audit bug.

**What I did:** I had begun adding a parallel stateless-batch API
(`wedm_signal_fusion` + `wedm_machine_state_classify`, fresh-instance-per-call). On
discovering romeo, I **reverted all of it surgically** (4 edmDispatcher edits + a schema
file) -- leaving the peer's uncommitted romeo changes untouched -- rather than ship a
duplicate parallel API (R7: surface conflicts, pick one; don't blend).

**Takeaways:**
1. Before wiring an engine, grep the dispatcher for the engine's *methods/singleton* AND
   for existing test files that drive it -- an action can be named differently than the
   engine (romeo named them `wedm_fuse_*`, not `*kalman*`/`*fusion*`).
2. `audit-unwired-engines.mjs` reads HEAD; in the shared tree, cross-check the WORKING copy
   + the engine's test files before trusting an UNWIRED verdict.
3. The romeo singleton design has a latent concurrency note (shared filter state across
   dispatcher calls; `wedm_fuse_reset` mitigates) -- a fresh-instance refactor of romeo is
   a possible future improvement, but that is an EDIT to romeo, never a parallel duplicate.
