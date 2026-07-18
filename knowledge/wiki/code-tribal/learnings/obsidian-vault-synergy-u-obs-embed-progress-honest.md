# OBSIDIAN-VAULT-SYNERGY/U-OBS-EMBED-PROGRESS-HONEST — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-SYNERGY]/U-OBS-EMBED-PROGRESS-HONEST (slot:alpha): fix the lying embed-progress marker (Q2 honesty)

**Commit:** `89146678bf80` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T11:55:16-05:00
**Tags:** obsidian-vault-synergy, u-obs-embed-progress-honest, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-SYNERGY]/U-OBS-EMBED-PROGRESS-HONEST (slot:alpha): fix the lying embed-progress marker (Q2 honesty)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-SYNERGY]/U-OBS-EMBED-PROGRESS-HONEST (slot:alpha): fix the lying embed-progress marker (Q2 honesty)

Q2 of the OBSIDIAN-VAULT-SYNERGY queue (reference_obsidian_vault_synergy_queue_2026_06_09). The /goal context-retention clause: the wiki-embed pipeline's progress sidecar lies.

ROOT CAUSE: embed-all-wiki.mjs writes progress('running') at start + per batch and progress('aborted') ONLY in the Ollama-error catch. A fleet-reaper SIGKILL or crash before the first batch flush leaves state:'running' done:0 FOREVER (the catch never fires on SIGKILL). The live marker was 24.5h stale (updatedAt 2026-06-08T16:25, done:0) yet read 'running' -- same reaper-kill class as the OCR-resumable regression.

FIX (self-describing marker, no behavior change to the embed run): (1) stamp pid + bump schemaVersion 1->2; (2) export pure classifyEmbedProgress(marker,{nowMs,isPidAlive,stalenessMs}) -- a 'running' marker with a DEAD pid (SIGKILL-robust) OR a heartbeat older than stalenessMs (15m default; fallback for pid-less v1 markers) classifies as 'stale', terminal done/aborted verbatim; (3) export isPidAlive (process.kill(pid,0), EPERM=alive); (4) --status CLI consumer prints the honest state.

VERIFIED: 11 tests pass incl. a repro of the exact 24h-stale marker -> stale; node --check clean; LIVE node scripts/embed-all-wiki.mjs --status now reports {state:stale, stale:true, reason:'heartbeat older than stalenessMs', ageMs:88104198} for the real sidecar. Backward compatible (v1 markers fall back to time-staleness).
```

## Files touched (3)
- scripts/embed-all-wiki-progress.test.mjs | 94 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/embed-all-wiki.mjs               | 60 +++++++++++++++++++++++++++++++++++++++++++++++++++++++--
- 2 files changed, 152 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 89146678bf80`
- Milestone envelope: `mcp-server/data/milestones/OBSIDIAN-VAULT-SYNERGY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._