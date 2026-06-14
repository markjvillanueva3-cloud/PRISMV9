---
title: U-GALAXY-MS1-B3-HMEMV06-DISPATCHER-WIRE close-out (slot:alpha, 2026-05-28)
created: 2026-05-28T01:20:00Z
created_by: claude-168624b9 (slot:alpha /loop iter1 /goal)
type: code-tribal/learnings
milestone: DOMAIN-GALAXY-DOCTRINE-MS1
units_closed:
  - U-GALAXY-MS1-B1-HMEMV04-DREAM-CYCLE
  - U-GALAXY-MS1-B2-HMEMV05-MEMORY-ROUTER-INTERCEPT
  - U-GALAXY-MS1-B3-HMEMV06-REFLECT-ON-OWN-MEMORY
commit: f3dce73b8d
tags: [hermes, weekly-synthesis, memory, dispatcher, close-out, psn-leg-1, psn-leg-2]
---

# B3-HMEMV06 dispatcher-wire close-out + silent close-out debt recovery

Three DOMAIN-GALAXY-DOCTRINE-MS1 units had their CODE shipped over the prior 24h (some by alpha, B3 dispatcher-wire peer-tucked by sierra in MMO-MS0 E2E commit `618184b818`) but their milestone envelope still said `not_started`. This is the silent close-out debt class CLAUDE.md §CLOSE-OUT AUTOMATION exists to surface.

## Net-new this session (alpha)

`memoryDispatcher-namespace-routing.test.ts`: +2 happy-path tests for the `hermes_reflection` sidecar attached to `weekly_synthesis_get` (PSN leg #2 surface). Prior coverage: error-path + not-yet-populated. Missing: happy-path (file PRESENT) + snap-formula anti-regression. Both added. 32/32 PASS.

The snap-formula test originally had a **1-in-604,800 false-pass window** (per arm-B P1): test computed `expectedAnchor` before the async call, dispatcher computed its own anchor inside the call. If the test crossed midnight-UTC-Sunday mid-call, the dispatcher would land on the NEXT week's anchor and the test would false-pass. Fix: snapshot anchor BEFORE + AFTER the await. If both agree → pin one. If they disagree → R12 fail-loud assert path matches one of two valid suffixes. Never silently pass a wrong assertion.

## Close-out doctrine — what arm-B scrutiny found

The 4-surface close-out doctrine ([[feedback_roadmap_close_out]]) names: envelope + MILESTONE_PROGRESS + BUILD_STATE + roadmap-index + chat-bus. My initial commit touched 2 of 5. Arm-B FAILED round 1 with three findings:

1. **P0 — 4-surface incomplete.** Skipped MILESTONE_PROGRESS + BUILD_STATE + roadmap-index + chat-bus. The canonical tool `scripts/close-out-milestone.mjs` requires the WHOLE milestone to be marked complete (3 of 26 units doesn't qualify) — per-unit close-out runs the same 5 downstream sub-actions manually. Fix: ran each one manually.
2. **P1 — non-atomic write.** Used `fs.writeFileSync` directly. `scripts/lib/atomic-json.mjs` exists and is used by 29 scripts (incl. close-out-milestone.mjs). Fix: re-wrote via `atomicWriteJson`.
3. **P1 — owner credited to auditor, not shipper.** Field `completed_by: claude-168624b9 (slot:alpha close-out audit)` conflates ship with audit. Fix: split into `completed_by` (who shipped code) + `closed_out_by` (who audited+flipped envelope) — orthogonal facts.

Arm-B round 2 FAILED with NEW P0:

4. **P0 — milestone invisible to MILESTONE_PROGRESS regen.** Envelope's `id` field was missing (only had `milestone_id`); `scripts/build-milestone-progress.mjs:174` does `if (!ms?.id) continue;` which silently skipped my milestone. The chat-bus post and envelope edit were correct but cosmetic without registry visibility. Fix: added `id` field to envelope (mirrors `milestone_id`) + registered milestone in `roadmap-index.json` at key 758. Re-regen now shows `shipped=8/26 drift=claims_not_started_but_has_shipped_units` (more units shipped beyond my 3 explicit closures — the regen detected them from git commits).

## Systemic infra finds (registered as deferred follow-ups)

- `DISPATCHER-HYGIENE::U-DISPATCHER-WEEKLY-ASYNC-STAT` — `statSync` (line 738 of `memoryDispatcher.ts`) inside the async `weekly_synthesis_get` case. Pre-existing. Surfaced by sync-fs-in-async hook + arm-B P2. Fix: convert to `await fs.promises.stat()`. Effort 10 P3.
- `MILESTONE-PROGRESS-INFRA::U-MPP-FALLBACK-MILESTONE-ID` — `scripts/build-milestone-progress.mjs:174` silently skips 22 envelopes lacking top-level `id` (only `milestone_id`). Affected: `AHMAD-LLM-CURRICULUM-ACADEMY-MS0`, `BOX-AUDIT`, `DEV-VELOCITY-AUTOTRIGGER-MS0`, `HERMES-AGI-ARCHITECTURE-MS0`, +17 more. Fix: `const msId = ms.id || ms.milestone_id;` fallback throughout. Effort 15 P2.

## PSN synergy contribution

PSN leg #1 (Obsidian brain — 7-day memo aggregation populater) ↔ PSN leg #2 (PRISM OS — `prism_memory:weekly_synthesis_get` dispatcher surface). Without the dispatcher-wire and its test coverage, the populater file at `${vaultRoot}/weekly-hermes-reflection-<anchor>.md` was orphaned — written but unreadable through the canonical surface. The sidecar now attaches deterministically + fail-soft + with regression-guarded tests.

## Lessons (R-numbers)

- **R8 — Read before you write.** Sierra's MMO E2E commit (`618184b818`) silently shipped my unit's code as a side-effect. `git log -S "hermes_reflection" -- mcp-server/src/tools/dispatchers/memoryDispatcher.ts` surfaced it. Always check git for the function/symbol you're about to build before writing.
- **R10 — Checkpoint after every significant step.** 2 rounds of arm-B FAIL exposed two distinct doctrine gaps. Without re-dispatching, I would have shipped both invisible to downstream consumers.
- **R12 — Fail loud.** The snap-formula boundary-race fix would have looked OK ~99.9998% of the time; the R12 path makes the rare crossing surface, not silently pass.

## Verify

```bash
# Test coverage
cd H:/prism/mcp-server && npx vitest run src/__tests__/memoryDispatcher-namespace-routing.test.ts
# → 32 passed (32) including 3 B3 sidecar tests

# Envelope close-out
node -e "const j=require('H:/prism/mcp-server/data/milestones/DOMAIN-GALAXY-DOCTRINE-MS1.json'); console.log((j.units||[]).filter(u=>u.id.includes('HMEMV')).map(u=>[u.id,u.status]))"
# → all 3 HMEMV units now status:complete

# Visibility
node -e "const j=require('H:/prism/state/shared/MILESTONE_PROGRESS.json'); console.log((j.milestones||[]).filter(m=>m.id.includes('DOMAIN-GALAXY')))"
# → 1 entry: shipped=8/26 drift=claims_not_started_but_has_shipped_units
```

Commit: `f3dce73b8d` ([MAIN] [BOOTSTRAP-SLOT-ENFORCE] [DOMAIN-GALAXY-DOCTRINE-MS1]/U-GALAXY-MS1-B3-HMEMV06-DISPATCHER-WIRE)

Memory: [[reference_b3_hmemv06_dispatcher_wire_closeout_2026_05_28]] · Sister: [[reference_b2_universal_unreachable_2026_05_27]] (same MS1 chain) · Patch-sibling: `state/shared/dashboards/patches/CLAUDE-MD-PATCH-u-galaxy-ms1-b3-hmemv06.md`
