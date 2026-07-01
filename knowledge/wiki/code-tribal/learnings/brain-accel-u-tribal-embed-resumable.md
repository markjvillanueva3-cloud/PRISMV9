# BRAIN-ACCEL/U-TRIBAL-EMBED-RESUMABLE — [MAIN] [BRAIN-ACCEL]/U-TRIBAL-EMBED-RESUMABLE (slot:sierra): checkpoint the embed batch so a reaper-kill resumes instead of losing the whole run

**Commit:** `441a7149fc97` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T04:46:22-05:00
**Tags:** brain-accel, u-tribal-embed-resumable, auto-distilled

## Subject
[MAIN] [BRAIN-ACCEL]/U-TRIBAL-EMBED-RESUMABLE (slot:sierra): checkpoint the embed batch so a reaper-kill resumes instead of losing the whole run

## Body
```
[MAIN] [BRAIN-ACCEL]/U-TRIBAL-EMBED-RESUMABLE (slot:sierra): checkpoint the embed batch so a reaper-kill resumes instead of losing the whole run

The wiki->tribal coverage batch (buildOrUpdate, --update mode) re-embeds the
~13,228 unembedded wiki files -- a 20-40 min Ollama run. The fleet-reaper reaps
long node procs under load, and buildOrUpdate wrote the index ONCE at the end of
the embed loop, so a kill at file N lost ALL N embeds and restarted from zero.
That is the xray-OCR non-resumable-corpus-burn antipattern (CLAUDE.md
Recent-regressions, 2026-06-08) -- a GPU burn that looks like progress.

Fix: checkpoint the index every CHECKPOINT_EVERY (default 500) successful embeds
via a persist() closure (the same idx.entries=[...]; writeIndex(idx) the final
write does). Resume is FREE -- no cursor file needed -- because the existing
hash-skip (if prior.hash === hash) means a restart reads the checkpointed index,
finds the already-embedded entries, and skips them; only the not-yet-embedded
candidates are re-run. writeIndex auto-shards past ~480 MiB (write-tribal-index.mjs)
and is clobber-guarded; the index only GROWS in this loop so the >50%-shrink guard
never trips. Knob PRISM_TRIBAL_CHECKPOINT_EVERY (0 = the prior single end-write).

This is the last prerequisite before the coverage batch (69.2 pct -> 100 pct) is
safe to run; pairs with U-TRIBAL-RERANK-STREAM (17294fc77f), which removed the
per-prompt heap ceiling so the grown/sharded index is still cheap to rerank.

Verified: node --check clean; tribal-embed-index.test.mjs 7/7 still pass; the
checkpoint is purely additive (final persist() unchanged from the prior
single-write). NOTE for the eventual run: serialize against the auto-embed cron /
tribal-autowire hook to avoid a concurrent-grow last-writer-wins race (no lock
today -- run when those are idle, or add a lockfile first).
```

## Files touched (2)
- .claude/scripts/tribal-embed-index.mjs | 26 +++++++++++++++++++++++---
- 1 file changed, 23 insertions(+), 3 deletions(-)

## Lessons surfaced in commit body
- till cheap to rerank.
- till pass; the

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 441a7149fc97`
- Milestone envelope: `mcp-server/data/milestones/BRAIN-ACCEL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._