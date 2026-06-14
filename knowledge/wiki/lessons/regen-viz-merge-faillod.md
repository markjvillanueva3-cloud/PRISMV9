---
title: regen-viz silent-continue-after-merge-fail
tags: [lesson, bug, regen-viz, fail-loud, karpathy-r12, orchestrator-discipline]
created: 2026-05-17
slot: lima
chat: claude-77971357
shipped-with: U-REGEN-VIZ-MERGE-FAILLOUD
sibling-memory: reference_u_regen_viz_merge_faillod_2026_05_17
commit: f9dc218d78
domain: backend-dev
---

# Lesson: orchestrators must not continue past a failed sub-stage

## Symptom

`scripts/regen-viz.mjs --full` exited 1 with `failed=1 driftFail=false` but **all 7 downstream artifacts** (`EXECUTIVE-BRIEFING.md`, `WIKI-DEBT-WORKLIST.md`, `obsidian-augmentation.json`, the dedup'd graph, the repaired graph, the reparented graph, the parent-contains-edges graph) were produced against a *stale pre-merge* `system-graph.json` (~99K nodes instead of the expected ~145K). The drift-gate then **falsely certified "clean"** because stale ≠ truncated. Cron caught the non-zero exit, but the artifacts were already corrupted and other chats' system-viz queries returned stale data.

## Root cause

When `merge-augmentations.mjs` SIGKILLed under 97% commit-mem pressure, the parent orchestrator's `if (m.status !== 0) { console.error('merge failed'); failed++; }` block was followed by **8 more `spawnSync()` calls** that all assumed merge had succeeded. Each downstream script reads `system-graph.json` from disk — they had no way to know it was stale. The `failed > 0` exit code was honest at the process level but dishonest at the artifact level: failure propagated as "this regen wasn't clean" without surfacing that artifacts were *actively wrong*.

Three things that LOOKED like the bug but weren't:
- Heap size — `--max-old-space-size=16384` was already passed (NODE_ARGS line 143). Not a heap shortfall.
- stderr capture — `stdio: "inherit"` was already set. The subprocess just produced zero output before SIGKILL (signal-kill leaves no V8 message).
- Exit code — `process.exit(failed > 0 || driftFail ? 1 : 0)` was already fail-loud at exit.

The actual bug was structural: post-merge stages ran regardless of merge success.

## Detection

A merge failure should be detectable via TWO signals:
1. **Subprocess exit !== 0** (or signal !== null) — direct.
2. **Pre/post node-count delta of zero with non-trivial augmentation bytes on disk** — catches the silent-no-op variant where merge runs to exit 0 but writes the same graph.

Detection pattern in code: `scripts/lib/regen-viz-merge-guard.mjs` exports `decideMergePostState({mergeStatus, mergeSignal, preMergeNodeCount, postMergeNodeCount, augTotalBytes})` returning `{abort, exitCode, reason, message}`. Four explicit paths:
- `mergeStatus !== 0` → abort with EXIT_MERGE_FAILED (2)
- `augTotalBytes >= 1MB && preMergeNodeCount > 0 && postMergeNodeCount <= preMergeNodeCount` → abort with EXIT_MERGE_NO_OP (3)
- `preMergeNodeCount === 0` (first-run / no prior graph) → continue (don't false-positive)
- otherwise → continue

## Prevention

1. **Orchestrators with a load-bearing pivot stage**: pivot stage failure MUST `process.exit()` immediately. Do not allow downstream stages to run against the unpivoted state.
2. **Add a pre/post sanity assert** for any stage whose contract is "this WILL change observable state." If the state didn't change and the input data exists, the stage no-op'd silently — fail loud.
3. **Karpathy R12** applies: every silent failure costs the team weeks. Treat "exit 1 with stale artifacts" as a bug class, not a corner case.
4. **Test pattern**: pure decision logic in a `lib/<name>-guard.mjs` module, exhaustively tested. The orchestrator stays straight-line; the guard owns the policy.

## Cross-refs

- Commit: `f9dc218d78` ([MAIN] [REGEN-VIZ-FAILLOUD]/U-REGEN-VIZ-MERGE-FAILLOUD)
- Memory: [[reference_u_regen_viz_merge_faillod_2026_05_17]]
- Source: `H:/prism/scripts/lib/regen-viz-merge-guard.mjs` (110 LOC)
- Tests: `H:/prism/scripts/lib/regen-viz-merge-guard.test.mjs` (19 cases)
- Sibling lesson: [[bug-findings-wiki-gate]] (the doctrine that wrote this file into existence)
- Sibling bug class: same family as the `precompact-handoff.mjs` bare-`node` spawnSync regression (CLAUDE.md 2026-05-16, commit `5c4778b59`).
- CLAUDE.md regression entry: 2026-05-17 line (added in commit `9c5377a2a7`).

## P2 follow-ups (separate units, not in this lesson's scope)

- Streaming node-count reader to avoid 2× JSON.parse of 153MB graph under memory pressure.
- Atomic write (tmp + rename) in `merge-augmentations.mjs:1430` — currently `fs.writeFileSync` non-atomic.
- Extend the same fail-loud-on-stage-failure pattern to repair/dedup/reparent/parent-edges/executive-briefing/obsidian-bridge stages (same class of silent-continuation, less critical seam).
