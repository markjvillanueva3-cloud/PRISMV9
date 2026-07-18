# OBSIDIAN-HERMES-ACCEL/U-HERMES-CRON-PREWARM — [MAIN] [OBSIDIAN-HERMES-ACCEL]/U-HERMES-CRON-PREWARM (slot:zulu): pre-warm the Ollama model before each Hermes cron tick (kills cold-load stall)

**Commit:** `4c3fa42da126` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T12:10:58-05:00
**Tags:** obsidian-hermes-accel, u-hermes-cron-prewarm, auto-distilled

## Subject
[MAIN] [OBSIDIAN-HERMES-ACCEL]/U-HERMES-CRON-PREWARM (slot:zulu): pre-warm the Ollama model before each Hermes cron tick (kills cold-load stall)

## Body
```
[MAIN] [OBSIDIAN-HERMES-ACCEL]/U-HERMES-CRON-PREWARM (slot:zulu): pre-warm the Ollama model before each Hermes cron tick (kills cold-load stall)

Hermes cron jobs run local models (morning-brief gpt-oss:120b ~60GB, inbox-sweep gpt-oss:20b). On the Blackwell box the fleet cycles many models through VRAM (offload route gate warms qwen2.5-coder:32b, vision OCR models load), so the cron's model is frequently COLD at tick time -> tens of seconds of cold-load stall on the chained run.

scripts/hermes-cron-prewarm.mjs reads cron/jobs.json, selects every ENABLED local-model job whose next_run_at is within --lead-minutes (default 15), and fires a detached 1-token /api/generate with a keep_alive covering the window. Clone-don't-fork of .claude/hooks/ollama-prewarm-on-pipeline.mjs (same detached-curl warm + warm-check), keyed to cron schedule instead of pipeline keyword. Skips the claude-opus fallback model (NON_OLLAMA_RE), dedups models, fail-soft (no jobs/ollama-down -> no-op exit 0). Kill switch PRISM_HERMES_PREWARM_DISABLE=1.

WIRE-TEST-VALIDATE (R15): WIRED as user-level scheduled task 'PRISM Hermes Cron Prewarm' (10-min cadence, NO UAC needed -- registers for current user). TESTED 11/11 (pure selectModelsToWarm + keepAliveFor: happy + due-beyond-lead + disabled + non-ollama + dedup + past-tick + 60s-grace + malformed + empty/null + mixed-fleet). VALIDATED live: dry-run on real jobs.json selects gpt-oss:120b+20b within 24h lead, none within 15m (next tick 20:23) -- correct. Scoped to Hermes (only galaxy with cron jobs); no clone needed.
```

## Files touched (3)
- scripts/hermes-cron-prewarm.mjs      | 155 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/hermes-cron-prewarm.test.mjs |  77 ++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 232 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4c3fa42da126`
- Milestone envelope: `mcp-server/data/milestones/OBSIDIAN-HERMES-ACCEL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._