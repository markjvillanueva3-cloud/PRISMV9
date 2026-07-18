---
name: reference_dark_facade_action_class_2026_06_23
description: "FLEET-WIDE dark-facade dispatcher-action class: 85 actions silently return {note:'method not callable'} because the bulk-sweep facade probes method names that don't exist on the engine. Harness + 4 exemplar fixes shipped 2026-06-23 (slot:india)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.535Z
aliases: reference_dark_facade_action_class_2026_06_23
---


**Dark-facade dispatcher actions — a fleet-wide silent-breakage class (slot:india, 2026-06-23).**

## The pattern
An "iter8/bulk-sweep" auto-wire gave many dispatcher actions a method-probe facade:
```ts
result = (eng as any).probe1?.(params) ?? (eng as any).probe2?.(params) ?? ... ?? { engine: "X", note: "method not callable" };
```
When NONE of the probed names is a real method on the target engine, the action
ALWAYS returns the `"method not callable"` stub -> **silently dark** (the AI/compute
capability never runs). Three root causes seen:
1. the real method is **STATIC** -> not on the singleton instance the probe calls;
2. the real method is **named differently** than every probe;
3. the real method takes **positional args**, not a single `params` object.
These actions were ALSO **unvalidated** (no Zod schema) -> would crash on bad input once wired.

## Evidence (harness)
`mcp-server/scripts/audit-dark-facade-actions.mjs` (tested, 9/9; `--json`) scans all
dispatchers, extracts each facade case's probed names + engine, and flags DARK when
none of the probes is a real engine method. Result 2026-06-23: **324 facade cases,
85 CONFIRMED DARK, 0 unresolved.** Top: calc 27, dev 13, quality 11, cam 10,
orchestration 9, aiReasoning 4. Snapshot: `state/shared/specs/DARK-FACADE-AUDIT-2026-06-23.json`.
HEURISTIC/ADVISORY (R12): a flag is a strong candidate; verify the engine before fixing
(a method reachable only via inheritance/wrapper can be a false positive).

## Fix recipe (4 exemplars shipped this session, fiveAxis + xproc)
1. confirm dark (probed names absent on the called object);
2. find the real method + its input interface;
3. rewire: static -> call on the CLASS; instance -> the singleton; positional -> destructure params;
4. add a STRICT crash-guard schema requiring every PARENT object the call-tree derefs
   (e.g. deepReason needed machine + material.kc11_mpa; decision needed machine.axis_limits);
5. mock-server handler-capture test (capture the 4th arg of `server.tool`) — the real-path
   test surfaces unguarded derefs the schema misses (it caught 2 crash/NaN fields this session);
6. tsc --noEmit with the 16GB heap; per-file 2-arm scrutiny.

Commits: `5f61238333` xproc orchestrateLive · `50143ece3c` five_axis_deep_learn ·
`85f9f6fe8d` five_axis_decision · `00f68e9997` fusion_5axis_strategy · U-DARK-FACADE-AUDIT (harness).

## How to apply (distribute the campaign)
The 85 are best fixed by the OWNING slot per domain (calc/physics->oscar, quality->SPC owner,
cam->kilo, etc.) — each verifies its engine's real method. Run the harness, take your
dispatcher's dark list, apply the recipe. Sibling: [[feedback_never_assume_data_file_contents]]
(existence != works) · the dispatcher-ghost-action audit ([[reference_dispatcher_ghost_audit_2026_06_18]])
is the COMPLEMENTARY class (enum action with NO handler; this class is handler-present-but-dark).
