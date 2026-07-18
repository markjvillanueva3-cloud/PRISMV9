---
name: feedback-whiskey-feed-ipr-ipm-dialect
description: Lathe feed mode IPR vs IPM is controller-dialect-dependent. A 10× confusion = broken insert or crash. Always confirm.
type: feedback
slot: whiskey
source: prism-memory
synced: 2026-06-27T20:30:46.452Z
aliases: feedback_whiskey_feed_ipr_ipm_dialect
---


Lathe feed is normally per-revolution (IPR / mm/rev), but some controllers/blocks accept per-minute (IPM / mm/min). Fanuc defaults IPR (G99); Haas-NGC can run IPM (G94). Mixing them is a 10× feed error.

**Why:** feeding an IPR value as IPM (or vice versa) on a turning move is a 10×-off feed = instantly broken insert, possibly a crash.

**How to apply:** confirm feed mode against the controller dialect before trusting any F-value; the quality rubric scores an IPR/IPM confusion −25 (a program-killer). Resolve dialect via `box_okuma_dialect_*` / `tnr_lookup_p_code` / `cam_lathe_*_dialect`. JM Die is 100% Okuma OSP (G95 feed/rev) — see [[feedback_whiskey_okuma_first_corpus]].
