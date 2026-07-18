---
name: reference_wiki_tribal_coverage_17pct_2026_06_09
description: "Q5 ran the never-run wiki-tribal coverage audit — TRUE coverage is 17.1% (6,725/39,345 wiki files in tribal), NOT the stale-banner 83.7%. The drop is the 2026-06-08 tribal-index clobber aftermath (restored only the 4,162 baseline). Running the audit self-corrected the SessionStart banner."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.264Z
aliases: reference_wiki_tribal_coverage_17pct_2026_06_09
---


# Wiki↔tribal coverage is 17.1%, not 83.7% — the clobber aftermath (Q5, 2026-06-09)

**Finding.** The SessionStart banner reports "83.7% coverage · 6,401 missing" for
wiki↔tribal embedding. Running the audit it reads from
(`scripts/wiki-tribal-cross-ref-audit.mjs`, the `PRISM Wiki-Tribal Audit Regen`
task = `LastResult=267011` = NEVER executed) gives the REAL number:
- wiki files on disk: **39,345**
- tribal wiki entries: **6,725**
- missing from tribal: **32,630**
- **coverage: 17.1%** (banner said 83.7%)

**Root cause (connects to a known incident).** The tribal-embed-index was
clobbered 33,639→1 entries on 2026-06-08 (fail-OPEN read → empty base → 1-entry
write; see [[reference_tribal_index_v8_string_cap_2026_06_08]] / CLAUDE.md Recent
regressions a3e6d3ca97). The restore recovered only the surviving **4,162-entry
baseline** (2026-05-20), not the full 33,639 — so ~29K wiki embeddings were lost
and not re-embedded. The 83.7% banner is the STALE pre-clobber number; coverage
genuinely collapsed to ~17%. So ~83% of the wiki (32,630 files) is currently DARK
to tribal recall (PSN leg #5).

**Bonus — banner self-corrected.** The audit reads AND writes
`state/shared/.wiki-tribal-cross-ref-audit.json` — the exact file the SessionStart
`wiki-tribal-coverage` banner reads. It had been stale (pre-clobber). Running the
audit refreshed it → the banner now shows the honest 17.1% fleet-wide (was a
never-run task feeding a stale number).

**Fix is cross-lane (routed).** Re-embedding the 32,630 missing wiki files into
the tribal index is the india/sierra embedding-PIPELINE lane (GPU nomic-embed) —
AND it's gated by the tribal index's V8 512MB write-cap (needs sharding before a
full re-embed fits; see the Recent-regressions note). So this is NOT a quick
alpha fix: it needs (1) tribal-index sharding (unblock the write side), then
(2) the GPU re-embed of the 32,630. Routed to india/sierra via chat bus.

**Alpha's deliverable (complete):** measured the TRUE coverage, corrected the
stale fleet-wide banner, root-caused the collapse to the clobber, and routed the
re-embed. Q5 of [[reference_obsidian_vault_synergy_queue_2026_06_09]].
