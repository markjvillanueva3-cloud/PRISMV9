---
name: reference_post_ship_fleet-hygiene-u-llama-orphan-reaper
description: Auto-distilled learnings from shipping FLEET-HYGIENE/U-LLAMA-ORPHAN-REAPER (commit f4a681e98). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.853Z
aliases: reference_post_ship_fleet-hygiene-u-llama-orphan-reaper
---


# FLEET-HYGIENE/U-LLAMA-ORPHAN-REAPER

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-HYGIENE]/U-LLAMA-ORPHAN-REAPER (slot:india): new reaper for leaked Ollama llama-server orphans -- closes the gap that fired a 97.4%-commit crash gate this session (model reload left an 18:44 llama-server orphaned ~2h holding ~22GB; existing node/tsserver reapers all missed it). Dry-run-by-default, kills ONLY a same-model-blob dup older than --min-age(300s) keeping the newest, never single-instance/different-model/clock-skewed. 18/18 tests (pure decision core incl the real incident + false-positive guards) + 2-reviewer PASS; live-validated (enumerationOk JSON, 0 false-positives on the live 120b/20b pair). R12: enumeration failure reported distinctly, not as '0 orphans'

**Shipped:** 2026-06-09T21:16:08-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[fleet-hygiene-u-llama-orphan-reaper]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._