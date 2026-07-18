---
name: reference_fleet_rollup_units_first_default_2026_06_09
description: A fleet/batch wrapper that defaults ncUnits to "mm" silently inverts the per-machine bind gate's fail-closed UNITS_UNRESOLVED contract -- the 25.4x trap. Never default units; pass undefined through so it fails closed.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.576Z
aliases: reference_fleet_rollup_units_first_default_2026_06_09
---


# Fleet-rollup units-first default regression (slot:echo, 2026-06-09)

`cimco-sim-fleet.mjs` (U-CIMCO-SIM-7) rolled up per-machine readiness over 15 JM
machines using the SIM-4 bind gate. It defaulted `const ncUnits = opts.ncUnits ?? "mm"`
(and the CLI defaulted to "mm" when --nc-units was omitted). The per-machine bind
gate (assessMachineBind) is fail-closed on absent units -- it returns
UNITS_UNRESOLVED ("units must be declared, never inferred"). The wrapper's silent
"mm" default INVERTED that contract: an operator who omitted --nc-units got 12
machines reading "drive-ready" on an assumed unit instead of fail-closed. That is
exactly PRISM's #1 safety rail (units-first / the 25.4x scale-error trap).

**Why it slipped:** an Ollama pre-flight + 2 of 3 Claude reviewers (A holistic, B
tests) ALL missed it -- they verified the inch-vs-mm MISMATCH path (which blocks)
but not the OMITTED-units default path. Only reviewer C (weighted silent-breakage /
edge-cases) traced that `opts.ncUnits ?? "mm"` re-introduced inference the gate
forbids. **This is why the 3-of-3 Claude gate stays full even with an Ollama
pre-flight** -- the pre-flight + a majority of arms can share a blind spot; the
independent third arm is load-bearing.

**How to apply:**
1. A batch/fleet/wrapper layer must NEVER default a safety-critical input (units,
   tolerance, material) that its per-item gate treats as fail-closed-when-absent.
   Pass the value through (undefined -> the gate fails closed); surface the
   undeclared state in the report, never paper over it. [[feedback_check_units_first]]
2. When you add an Ollama pre-flight, do NOT shrink the 3-of-3 Claude gate -- the
   pre-flight reduces re-review rounds, it does not replace independent arms.
   [[reference_shared_tree_torn_commit_2026_06_09]] (sibling SIM-6 process lesson).
