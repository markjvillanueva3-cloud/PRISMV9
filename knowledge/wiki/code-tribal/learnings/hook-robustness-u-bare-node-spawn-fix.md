# HOOK-ROBUSTNESS/U-BARE-NODE-SPAWN-FIX — [MAIN-FORCE] [HOOK-ROBUSTNESS]/U-BARE-NODE-SPAWN-FIX (slot:zulu): fix 10 silently-broken bare-node spawns -> process.execPath (R15 apply-to-all of the silent-spawn bug class)

**Commit:** `c7e2551795ad` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T21:20:59-05:00
**Tags:** hook-robustness, u-bare-node-spawn-fix, auto-distilled

## Subject
[MAIN-FORCE] [HOOK-ROBUSTNESS]/U-BARE-NODE-SPAWN-FIX (slot:zulu): fix 10 silently-broken bare-node spawns -> process.execPath (R15 apply-to-all of the silent-spawn bug class)

## Body
```
[MAIN-FORCE] [HOOK-ROBUSTNESS]/U-BARE-NODE-SPAWN-FIX (slot:zulu): fix 10 silently-broken bare-node spawns -> process.execPath (R15 apply-to-all of the silent-spawn bug class)

CONFIRMED LIVE: on this host bare spawnSync("node",...) ENOENTs even with the full
PATH (spawnSync("node",["--version"]) -> ENOENT; spawnSync(process.execPath,...) ->
status 0 v22.12.0). The harness runs hooks via portable-node, whose child PATH has
no resolvable `node`. So every bare-node spawn in a hook silently failed -- fail-soft
catches swallowed the ENOENT and the hook's function NEVER RAN. Same silent-degradation
family as the octopus-drain (cp.spawn ENOENT) + hermes-proxy (stdio:ignore) fixes this
session. Memory [[reference_precompact_bare_node_enoent_2026_05_16]] records this class
already broke /compact->precompact for the operator once.

FIXED (10 spawns / 7 files) to process.execPath (always the running node.exe; the proven
fleet pattern -- stop-goal-clear-advance/stop-bg-runner/stop-wiki-from-nodes already use
it; .cmd would need shell:true on modern Node):
  - stop-force-handoff.mjs:186      -- forced handoff append silently never wrote
  - stop-psn-autonomy-tick.mjs:80   -- PSN autonomy ingest silently skipped
  - slot-commit-worktree-enforce.mjs:134 + stop_on_session_mistake_digest.mjs:96
                                    -- session-id resolution ENOENT -> fail-soft fallback
  - tier1-data-refresh.mjs:45       -- tier1 data refresh silently skipped
  - commit-pressure-stop-gate.mjs:86 -- non-ps1 relief script never ran (ps1/powershell
                                       branch correctly left intact)
  - portability-setup.mjs:57,62,71,83 -- the cross-PC installer ENOENT'd at step 1/3

VALIDATED: bare->ENOENT, process.execPath->status 0 (live, stable-session-id round-trip
returns claude-817e5568). 7 files syntax-checked, 0 bare-node spawns remain, stop-force-
handoff companion test 15/15. Per-file 2-arm scrutiny: arm A PASS, arm B caught a P1
(portability-setup had 3 MORE bare-node spawns the first pass missed -> now all 4 fixed,
deterministically re-verified). KNOWN P2 (deferred, R12): the stop-force-handoff test
asserts only the never-block contract, not the spawn path, so its green != fix-coverage;
the fix is proven by the live mechanism repro, a driving test is a follow-up.
```

## Files touched (8)
- .claude/helpers/portability-setup.mjs            | 8 ++++----
- .claude/hooks/commit-pressure-stop-gate.mjs      | 2 +-
- .claude/hooks/slot-commit-worktree-enforce.mjs   | 2 +-
- .claude/hooks/stop-force-handoff.mjs             | 2 +-
- .claude/hooks/stop-psn-autonomy-tick.mjs         | 2 +-
- .claude/hooks/stop_on_session_mistake_digest.mjs | 2 +-
- .claude/hooks/tier1-data-refresh.mjs             | 2 +-
- 7 files changed, 10 insertions(+), 10 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c7e2551795ad`
- Milestone envelope: `mcp-server/data/milestones/HOOK-ROBUSTNESS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._