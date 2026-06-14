---
name: mike-closeout-phases-envelope-fix-2026-05-22
description: 2026-05-22 mike /loop — closed INFRA-AGI-ROUTER-MS2 + RGS-TOOL-AUTOINVOKE-MS1 drift; fixed build-milestone-progress phases-envelope crediting blind spot (+444 units recovered fleetwide).
aliases: reference_mike_closeout_phases_envelope_fix_2026_05_22
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.208Z
---


# mike /loop close-out — phases-envelope crediting bug (2026-05-22)

Session `claude-e5840fb7`, slot mike, `/goal complete all remaining mike tasks`.

## What shipped
- **INFRA-AGI-ROUTER-MS2** closed out — all 5 P0 units shipped (slot:charlie, commits `76073333d3` `58345a0a74` `e7883b0360` `6d9430f27e` `b7673b012e`). Envelope `in_progress`→`complete`. Commit `[CLOSE-OUT]/INFRA-AGI-ROUTER-MS2`.
- **[[reference_rgs_tool_autoinvoke_ms1_2026_05_16|RGS-TOOL-AUTOINVOKE-MS1]]** closed out — U-RIE-ADAPTER/U-CALIBRATION/U-TRANSFER shipped under *aliased* commit IDs `U-LIMA-A6/A7/A8` (lima slot). 8/8 git-proven. Commit `[CLOSE-OUT]/RGS-TOOL-AUTOINVOKE-MS1`.

## The bug (build-milestone-progress.mjs)
`loadMilestones()` has 3 envelope-shape branches: `phases[].units[]`, flat `ms.units[]`, object-map `ms.units{}`. The flat + object-map branches read each unit's OWN `status`/`commits`. The **phases branch read them ONLY from the top-level `ms.units{}` overlay** — which is `{}` for any pure-`phases` envelope. So close-out flips that write `status`/`commits` onto `phases[].units[]` were **silently dropped** — phases-shaped envelopes could never use the envelope-commit / envelope-status fallbacks.

**Fix:** phases branch now reads `u.status`/`u.commits` first, overlay as fallback (consistent with the other two branches). Added `asStr()` string-coercion on all 4 envelopeStatus sites + per-milestone `envelopeAssertedCount` + `totals.envelopeAsserted` proof-surface (distinguishes git-proven from envelope-claimed shipments). Recovered **+444 units fleetwide** (2107→2552 shipped); 1044 now flagged envelope-asserted. 2-of-2 per-file scrutiny PASS.

## Deferred (not single-session completable)
- **U-CK11** (COMMAND-KERNEL-MS0) — 13-category × 2-reviewer scrutiny pass (~26 agent dispatches). Multi-session.
- **U-DOCKER-HOOK-BROKER** (OBSIDIAN-INTELLIGENCE-MS3 A1) — effort 180, persistent Docker hooks container.
- **U-OE-L3** ([[reference_ollama_expand_ms0|OLLAMA-EXPAND-MS0]]) — envelope status already `deferred` (effort 240). Correctly stays pending.
- `U-FR-MS3-A` — phantom priority-queue ID, absent from [[reference_fleet_reaper|FLEET-REAPER]]-MS3.json phases.

## Lesson
Priority-queue / pick-unit surfaced mostly close-out-drift false positives. Verify candidate units against `git log` (and check for *aliased* commit IDs) before building. Envelope unit IDs and commit unit IDs diverge when a different slot ships the work. See [[feedback_roadmap_close_out]].
