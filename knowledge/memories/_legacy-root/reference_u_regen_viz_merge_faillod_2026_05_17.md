---
name: reference-u-regen-viz-merge-faillod-2026-05-17
description: U-REGEN-VIZ-MERGE-FAILLOUD shipped 2026-05-17 lima — aborts post-merge stages when merge-augmentations.mjs fails or silently no-ops, stopping stale-graph corruption of EXECUTIVE-BRIEFING/WIKI-DEBT/obsidian artifacts
source: prism-memory
synced: 2026-05-18T01:02:10.181Z
aliases: reference_u_regen_viz_merge_faillod_2026_05_17
---


**U-REGEN-VIZ-MERGE-FAILLOUD** — shipped 2026-05-17 lima slot, commit `f9dc218d78`. Closes a Karpathy R12 silent-corruption class in `scripts/regen-viz.mjs --full`: when `merge-augmentations.mjs` SIGKILLed under host memory pressure (97% commit), the parent emitted `[regen-viz] ✗ merge failed` with **zero captured stderr** (signal-kill, no V8 message) and **continued** through 7 post-merge stages (`repair-graph-engine-classification` → `dedup-graph-nodes` → `reparent-viz-categories` → `add-parent-contains-edges` → `system-viz-obsidian-bridge-v2` → `generate-executive-briefing` → `generate-wiki-debt-worklist` → drift-gate), ALL reading the **stale pre-merge graph**. `EXECUTIVE-BRIEFING.md` / `WIKI-DEBT-WORKLIST.md` / `obsidian-augmentation.json` published with stale data; drift-gate falsely certified "clean" because stale ≠ truncated. Script exited 1 (already fail-loud on counter) — cron caught the *signal* but the *artifacts* were already corrupted.

**Spec correction** (prior session via /precompact handoff): the spec at `state/shared/specs/U-REGEN-VIZ-MERGE-FAILLOUD-FIX-PLAN-2026-05-17.md` claimed 4 fixes needed. Three were ALREADY in place when re-checked:
- `--max-old-space-size=16384` already passed via NODE_ARGS (line 143) — heap arg WAS correct.
- `stdio: "inherit"` already set — stderr-capture wasn't the problem; the subprocess simply produced no output before SIGKILL.
- `process.exit(failed > 0 || driftFail ? 1 : 0)` already fail-loud (line 265).

Only the **post-merge-continues-after-fail** bug was real. Lesson: read the actual code before writing a spec; the spec's repro of "exit 0" came from a prior version. **Verify against current HEAD before treating handoff RESUMEs as ground truth.**

**Architecture:** pure decision helper `scripts/lib/regen-viz-merge-guard.mjs` exposes `decideMergePostState({mergeStatus, mergeSignal, preMergeNodeCount, postMergeNodeCount, augTotalBytes}) → {abort, exitCode, reason, message}`. Four decision paths:
1. `mergeStatus !== 0` (incl. `null` for signal-kill on Windows) → `abort:true, exitCode:2, reason:"merge-failed"`.
2. `mergeStatus === 0 && augTotalBytes ≥ AUG_BYTE_THRESHOLD (1MB) && preMergeNodeCount > 0 && postMergeNodeCount ≤ preMergeNodeCount` → `abort:true, exitCode:3, reason:"merge-no-op"`. Catches silent-no-op variant.
3. `preMergeNodeCount === 0` (first-run regen, graph file missing) → fall-through, never blocks. Verified via dedicated test.
4. Default → `abort:false, exitCode:0`.

I/O helpers `readGraphNodeCount(graphPath)` and `readAugmentationByteTotal(dir)` use top-level ESM imports (NOT `require()` — first-pass had that bug, caught by syntax-check pre-test-run). Both return 0 on any fs/JSON error so a missing graph doesn't mask a real merge failure with a spurious no-op-abort.

**Test coverage:** 19/19 via `node --test`. Pure-logic: happy, merge-fail (exit ≠0), SIGKILL signal surface, exit-fail precedence over no-op, silent no-op, shrunk-graph, threshold-eq (fires), threshold-just-below (continues), pre-count 0 fall-through, single-node growth, NaN defensive, negative-bytes defensive. I/O: real fs roundtrip with `mkdtempSync`, missing file, malformed JSON, missing nodes field, only `*-augmentation.json` files counted, missing dir, empty dir.

**Per-file 2-reviewer scrutiny gate:** both arms PASS, 0 P0/P1.
- Arm A (`code-analyzer`): "Decision logic correct. NaN fall-through verified. Signal handling on Windows works (`spawnSync.signal` is `null` on Windows but `null !== 0` still routes through merge-fail). First-run-regen false-positive prevented by `preMergeNodeCount > 0`."
- Arm B (independent `reviewer`): "No P0/P1. No test-passes-by-luck (real fixtures roundtrip through helper, no mocks-as-truth). No hostile-payload escalation (JSON.parse bounded by file size; catch saves us; OOM during our parse fails-closed which is safer than continuing). Approve commit."

**P2 follow-ups (separate units, NOT in this commit):**
- Streaming node-count reader to avoid 2× JSON.parse on 153MB graph under memory pressure (current impl uses catch→0 fall-through, fails-closed if it OOMs — acceptable).
- Atomic write (tmp + rename) in `merge-augmentations.mjs:1430` — currently `fs.writeFileSync(graphPath, JSON.stringify(G))` non-atomic. Latent partial-write hazard.
- Extend fail-loud pattern to repair/dedup/reparent/parent-edges/executive-briefing stages (same class of silent-continuation, less critical seam).

**Collateral-staging incident:** pre-commit hook chain re-staged 2 peer files (`.claude/helpers/precompact-handoff.mjs` + `.claude/hooks/session-start-terminal-pin.mjs`, both claimed by `claude-339c8ff7`) — same class as the U-FEEDBACK-FORCING worktree-route incident. The chain's own peer-detector then unstaged everything (incl. my files) because the only staged content belonged to peers. Fix: `git commit ... -- <my paths>` with explicit pathspecs as the final arg — atomic + skips the index-mutation phase the auto-add ran in. Memory: this is the **right invocation pattern** for shared-tree commits when a recovery hook keeps auto-adding peer WIP.

**Recovery context:** lima resumed from a /compact-summary boundary; the spec was written pre-compact, the fix was implemented post-compact. The post-compact Read of `regen-viz.mjs` invalidated 3 of 4 spec claims — a reminder that spec → impl is NOT mechanical; the spec is a working hypothesis, the code is the truth.


## Related
[[skills/regen-viz|/regen-viz]] • [[skills/precompact|/precompact]] • [[skills/shared|/shared]] • [[skills/specs|/specs]] • [[skills/lib|/lib]] • [[skills/regen-viz-merge-guard|/regen-viz-merge-guard]] • [[skills/dedup|/dedup]] • [[skills/reparent|/reparent]] • [[skills/parent-edges|/parent-edges]] • [[skills/executive-briefing|/executive-briefing]]