---
name: reference_zulu_bare_node_spawn_codemod_2026_06_23
description: U-BARE-NODE-SPAWN-FIX (2026-06-23, slot:zulu) — fixed 10 silently-broken bare spawnSync("node") spawns across 7 core hooks/helpers to process.execPath. Same Windows-spawn-ENOENT silent-degradation family as the octopus-drain + hermes-proxy fixes. R15 apply-to-all of the bug class.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.281Z
aliases: reference_zulu_bare_node_spawn_codemod_2026_06_23
---


# Bare spawnSync("node") ENOENT codemod — 10 sites / 7 files (slot:zulu, 2026-06-23)

Found via the octopus wiki lesson's own prescribed audit ("grep for spawn(...portable-node ...") while doing R15 APPLY-TO-ALL of the silent-spawn bug class I fixed earlier this session (octopus drain cp.spawn ENOENT + hermes proxy stdio:ignore).

## The class (confirmed LIVE)
On this host, **bare `spawnSync("node", ...)` ENOENTs even with the full current PATH** — `spawnSync("node",["--version"])` → ENOENT; `spawnSync(process.execPath,...)` → status 0 (v22.12.0). The harness runs hooks via portable-node, whose spawned-child PATH has no resolvable `node`. The spawn sits in a fail-soft `try/catch` (advisory hook) → the ENOENT is swallowed → the hook's function silently never runs. This is the SAME silent-degradation shape as the shim case (extensionless `.../bin/portable-node` can't be CreateProcess'd) — different mechanism (PATH vs extension), same outcome. Memory [[reference_precompact_bare_node_enoent_2026_05_16]] records it once broke `/compact`→precompact for the operator.

## Fixed (10 spawns / 7 files → process.execPath, commit U-BARE-NODE-SPAWN-FIX)
- `stop-force-handoff.mjs:186` (forced-handoff append never wrote) · `stop-psn-autonomy-tick.mjs:80` (PSN ingest skipped) · `slot-commit-worktree-enforce.mjs:134` + `stop_on_session_mistake_digest.mjs:96` (session-id resolution → fail-soft fallback) · `tier1-data-refresh.mjs:45` (refresh skipped) · `commit-pressure-stop-gate.mjs:86` (non-ps1 relief; the powershell.exe branch was correctly left) · `portability-setup.mjs:57,62,71,83` (cross-PC installer ENOENT'd at step 1/3).
- **process.execPath** = the running node.exe, always spawnable, no PATH/extension dependency. The proven fleet pattern (stop-goal-clear-advance / stop-bg-runner / stop-wiki-from-nodes already use it). `.cmd` would need `shell:true` on modern Node.

## Scrutiny + validation
Live: bare→ENOENT, process.execPath→status 0 (stable-session-id round-trip returns the real chatId). 7 files syntax-checked, 0 bare-node spawns remain, stop-force-handoff companion test 15/15. Per-file 2-arm: arm A PASS; **arm B caught a P1** — portability-setup had 3 MORE bare-node spawns (57/62/71) the first grep-driven pass missed (it only fixed the one line the grep surfaced, 83) → all 4 fixed + deterministically re-verified. **Lesson: a grep-driven codemod fixes only what the grep surfaces — re-scan EACH touched file for sibling occurrences (a `run(step, "node", ...)` wrapper hides the bare-node behind a helper).** KNOWN P2 (deferred, R12): the stop-force-handoff test asserts only the never-block contract, not the spawn path — its green ≠ fix-coverage; the fix is proven by the live repro, a driving test is a follow-up.

## Audit the whole class (two greps, same bug)
`spawn.*portable-node` (no `.cmd`/`shell:true`) AND `(spawn|spawnSync|execFile|execFileSync)\(\s*["']node["']`. settings.json `command` strings are SAFE (shell-resolved); only `cp.*` JS spawn targets are at risk. Wiki [[windows-cp-spawn-extensionless-shim-enoent-2026-06-23]] (unified class lesson). Siblings: [[reference_precompact_bare_node_enoent_2026_05_16]], [[reference_zulu_meta_systems_utilization_probe_2026_06_22]].
