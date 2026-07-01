---
name: reference_stale_cron_actuation_gate_2026_06_19
description: "stale-slot-cron advisory now flags only FORCE-CLAIM crons (/startup-,/checkin-,--preferSlot+--force), not operator build-loop crons — fixed a false-positive that told golf to delete 4 live operator crons"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.210Z
aliases: reference_stale_cron_actuation_gate_2026_06_19
---


**FLEET-HYGIENE/U-STALE-CRON-ACTUATION-GATE (2026-06-19, slot:golf).** `.claude/hooks/stale-slot-cron-advisory.mjs` (SessionStart) was telling a golf session to review/delete **4 legitimate operator-armed autonomous build-loop crons** (`[ZULU AUTONOMOUS BUILD LOOP]`, `[AUTONOMOUS BUILD + PC-HEALTH MONITOR — golf]`, `Autonomous JM CAM tooling continuity (slot:romeo)`, `[AUTONOMOUS BUILD LOOP — sierra]`). Deleting them would halt the fleet's autonomous building (high blast radius).

**Root cause:** `findStaleSlotCrons` gated on the loose `parseTargetSlot` REFERENCE parser (matched a bare slot name or `slot:` attribution anywhere in the prompt). But the "keep checking back into <slot>" thrash is caused ONLY by crons that ACTUATE a force-claim. A cron that merely *labels* a slot just injects "continue building" into an idle session — the intended fleet mechanism per the operator "use harnesses, loops and crons" directive — and never claims a slot. The original author's mental model ("every loop cron is `/startup-<slot> /loop`") was wrong for operator build-loop crons. The live test passed only because its fixture had all slots claimed; real state (zulu/romeo unclaimed) exposed it.

**Fix:** new pure exported `actuatesSlotClaim(prompt, slotSet)` matches ONLY the force-claim actuators — `/startup-<slot>`, `/checkin-<slot>`, and the bare `--preferSlot <slot> ... --force` form they expand to. `findStaleSlotCrons` gates on it; non-actuating crons are never flagged. The real `/startup-papa` rebound regression ([[reference_papa_rebind_resolver_cron_fix_2026_06_18]]) is still caught + still emits `CronDelete`. `parseTargetSlot` retained (exported+tested) with a do-not-rewire docstring note. 36/36 tests (was 28); live hook emits `{}` against the real 5-cron fleet; 2-arm per-file scrutiny PASS (2 P2s closed inline). Commit on `cad-fusion-live-ms0`.

**Lesson (R7/R12):** an advisory that emits a destructive plan (`CronDelete`) must key on the precise *actuating* signal, not a loose *reference* match — a slot LABEL is not a force-claim. Sibling of [[reference_papa_rebind_resolver_cron_fix_2026_06_18]] (which fixed the resolver + a real thrash cron; this fixes the advisory that over-flags the legit ones).

**Open backlog surfaced same pass (domain-owned, NOT golf):** 7 built-but-UNWIRED CAD/CAM seat bridges — `CreoToolkitBridgeEngine`, `CATIACAAV5BridgeEngine`, `RhinoCommonBridgeEngine`, `OnshapeAPIBridgeEngine`, `OnshapeLiveCollabAdapter`, `NXOpenAssemblyDrawingEngine` (→ cadDispatcher, delta), `HyperMillACBridgeEngine` (→ camDispatcher, kilo). They are dependency-injected (`constructor({transport,clock})`), NOT ready singletons like the wired `fusion360LiveBridgeEngine` — so they need a live seat-transport layer built before dispatcher wiring is meaningful (blind-wiring would force a stub transport = R12 violation). Owners: delta/kilo/echo. Tracked in `state/shared/UNWIRED-ENGINE-AUDIT-2026-06-19.json`.
