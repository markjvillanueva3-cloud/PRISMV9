# Fusion Instance Coordination — kilo ↔ delta (proposal + kilo-side enforcement)

**Owner:** kilo · **Date:** 2026-06-01 · **Unit:** U-CAM-FUSION-INSTANCE-COORD
**/goal clause #1:** *"coordinate with delta on which instance of fusion you'll be using."* This is the concrete proposal + the code that makes kilo safe to coexist. Addressed to **delta** (CAD) + **operator**.

## ✅ RESOLVED 2026-06-02 (OPERATOR-AUTHORITATIVE) — kilo = :18361 (CAM), delta = :18362 (CAD)
Operator correction 2026-06-02: *"you should be on 18361, 18362 literally says cad so its for delta."* This is the canonical assignment. Memory: [[reference_fusion_port_assignment_kilo_18361_2026_06_02]].

| port | owner | role | state |
|---|---|---|---|
| **:18361** | **kilo** ✅ pinned | CAM (`PRISM_Fusion_Drive` — `/documents`, `/cam/*`, `/doc/close`) | kilo drives SCRATCH docs ONLY here. Live-probe 2026-06-02: up, but still running the OLD add-in (no `/documents`) — operator loads `PRISM_Fusion_Drive` on :18361 before kilo can drive CAM. The pin owns the port regardless. |
| **:18362** | **delta** | CAD (delta's live work — the doc title "literally says CAD") | kilo NEVER drives or closes :18362. Live-probe 2026-06-02 confirms **4 foreign docs present** (delta's live CAD). |

**Claim record:** `state/shared/cam-drive/fusion-kilo-claim.json` (slot=kilo, port=**18361**, `source: operator-pin`). The port is **operator-pinned** via `PRISM_FUSION_KILO_PORT` (default 18361) in `scripts/fusion-claim-instance.mjs`; the pin overrides auto-detect and `:18362` is hard-excluded (`PRISM_FUSION_DELTA_PORTS`, default 18362).

### ⚠ R12 correction — the prior :18362 claim was WRONG
An earlier run of this doc (and commit `d1914afb96`) recorded kilo=:18362 / delta=:18365. That was produced by the resolver's **auto-detect heuristic**, which inferred ownership from `/documents` capability + a saved/modified foreign-doc test — and so picked :18362 because it answered `/documents` and (transiently) reported few foreign docs. **Ownership is operator-assigned, not heuristic-inferred** (which add-in is loaded on a port ≠ which slot owns that Fusion window). The operator corrected it to kilo=:18361, delta=:18362. The auto-detect is now advisory-only; the pin is canonical.

**The underlying conflict (still true):** one Fusion application has ONE active document, so two slots driving one instance race the active-doc state. Solved by separate instances — kilo on :18361, delta on :18362.

## kilo-side enforcement (shipped — `scripts/fusion-claim-instance.mjs` + `scripts/lib/fusion-instance-resolver.mjs`)
kilo's port is **operator-pinned to :18361** (`PRISM_FUSION_KILO_PORT`); the pin is canonical and overrides the auto-detect resolver. `:18362` is **hard-excluded** as delta-owned (`PRISM_FUSION_DELTA_PORTS`, default 18362) — kilo can never claim or drive it, pin or auto-detect.

The auto-detect resolver (`resolveKiloScratchInstance()`) is **advisory-only** now — it still probes for liveness/safety reporting, selecting a port ONLY if **capable** (new add-in, `/documents` 200) AND **clean** (zero foreign docs). It is no longer load-bearing for ownership (it mis-picked :18362 — see the R12 correction above). delta's live CAD docs can never be selected, closed, or disturbed. 10/10 tests.

**kilo's drive SOP (once :18361 runs the new add-in):** confirm :18361 capable → `POST /new {scratch:true}` (kilo's own `PRISM-SCRATCH-N` doc, registered) → drive CAM ops → `POST /doc/close {target:scratch}` (discard) → repeat. The scratch-doc auto-close enforcement (U-FUSION-DOC-CLOSE-ENFORCE) keeps windows from piling up.

## OPERATOR ACTION — load the CAM add-in on :18361
Live-probe 2026-06-02 shows **:18361 is up but running the OLD add-in** (no `/documents`). To unblock kilo's live CAM drive: load/restart `PRISM_Fusion_Drive` on the :18361 instance (or set `PRISM_FUSION_DRIVE_PORT=18361` in that instance's add-in). delta keeps :18362 for live CAD. No active-doc race — separate instances. The offline closed-loop training (`cam-offline-loop-run.mjs`) needs NO live Fusion and runs meanwhile.

## Knobs
`PRISM_FUSION_KILO_PORT` (kilo port pin, default 18361 — operator-authoritative, wins over auto-detect) · `PRISM_FUSION_DELTA_PORTS` (delta-owned hard-exclude, default 18362) · `PRISM_FUSION_DRIVE_PORT` (the add-in's own port, when wired into the bridge) · resolver ports via `resolveKiloScratchInstance({ports})` / env (`parsePorts`).

Pairs with `FUSION-SCRATCH-CLOSE-ENFORCEMENT.md` (window cleanup) + `CLOSED-LOOP-LATHE-TRAINING-REGIMEN.md` (this unblocks #5b/#6). Memory: [[reference_fusion_instance_coordination_2026_06_01]].
