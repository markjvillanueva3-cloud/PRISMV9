# OLLAMA-OFFLOAD/U-NIGHT-BATCH — [MAIN-FORCE] [OLLAMA-OFFLOAD]/U-NIGHT-BATCH (slot:zulu): off-hours Ollama work lane -- registry-driven night runner + scheduled task (operator: 'more background tasks running during off hours').

**Commit:** `ba4468454d8d` · **By:** markjvillanueva3-cloud · **At:** 2026-06-12T10:50:03-05:00
**Tags:** ollama-offload, u-night-batch, auto-distilled

## Subject
[MAIN-FORCE] [OLLAMA-OFFLOAD]/U-NIGHT-BATCH (slot:zulu): off-hours Ollama work lane -- registry-driven night runner + scheduled task (operator: 'more background tasks running during off hours').

## Body
```
[MAIN-FORCE] [OLLAMA-OFFLOAD]/U-NIGHT-BATCH (slot:zulu): off-hours Ollama work lane -- registry-driven night runner + scheduled task (operator: 'more background tasks running during off hours').

- scripts/ollama-night-batch.mjs: window-gated (22..6 wraps midnight; --force; PRISM_NIGHT_BATCH_DISABLE=1), schemaVersion'd registry FAILS LOUD on any defect running nothing, no-shell spawnSync(file,args[]) with repo-script confinement (cmd[1] must match scripts/<name>.mjs|.js -- node -e / absolute / ../ all rejected, scrutiny P1), atomic wx lock w/ 4h stale-break (TOCTOU fixed), Ollama /api/tags pre-check aborts loud, per-job fail-soft + JSONL log w/ spawn-error forensics (ETIMEDOUT/ENOBUFS/ENOENT distinguishable, scrutiny P1), 64MiB maxBuffer (1MiB default would kill the 2h miner, scrutiny P1).
- Registry seeded w/ 2 VERIFIED jobs: capability-probe --out (nightly (task,model) auto-offload-safety matrix refresh) + mine-galaxy-transcripts --next-unpopulated --next-count 2 (self-rotating Ollama knowledge mining into the least-populated galaxies). Header documents the miner's creation-only live vault memo truthfully (scrutiny P1 -- was overclaimed as staging-only) + no-detached-children constraint (reaper protection is name-pattern based).
- ollama-capability-probe.mjs: clobber-guard -- an ALL-ZERO matrix (outage signature; callOllama swallows failures) REFUSES to overwrite the good matrix + generatedAt now set (was null) (scrutiny P1; probe runs unattended nightly now).
- Scheduled task 'PRISM Ollama Night Batch' REGISTERED (node.exe, daily 22:23, 7h limit, StartWhenAvailable) + live-validated: manual Start-ScheduledTask -> LastResult 0 (clean window-gated exit through the real launch chain). 12/12 tests incl adversarial confinement + degenerate-window + script-existence real-data checks; live dry-run plans both jobs.
- 2-arm scrutiny PASS (4 P1s fixed pre-commit); P2s logged: between-jobs window re-check, lock heartbeat, impure-shell test coverage, miner torn-write on timeout-kill.
```

## Files touched (5)
- scripts/ollama-capability-probe.mjs           |  18 +++++-
- scripts/ollama-night-batch.mjs                | 275 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/ollama-night-batch.test.mjs           | 167 +++++++++++++++++++++++++++++++++++++++++++++++++++
- state/shared/ollama-night-batch-registry.json |  21 +++++++
- 4 files changed, 478 insertions(+), 3 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ba4468454d8d`
- Milestone envelope: `mcp-server/data/milestones/OLLAMA-OFFLOAD.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._