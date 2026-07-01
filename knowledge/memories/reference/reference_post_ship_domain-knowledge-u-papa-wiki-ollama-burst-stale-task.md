---
name: reference_post_ship_domain-knowledge-u-papa-wiki-ollama-burst-stale-task
description: Auto-distilled learnings from shipping DOMAIN-KNOWLEDGE/U-PAPA-WIKI-OLLAMA-BURST-STALE-TASK (commit c6a7059b9). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.839Z
aliases: reference_post_ship_domain-knowledge-u-papa-wiki-ollama-burst-stale-task
---


# DOMAIN-KNOWLEDGE/U-PAPA-WIKI-OLLAMA-BURST-STALE-TASK

[MAIN-FORCE] [DOMAIN-KNOWLEDGE]/U-PAPA-WIKI-OLLAMA-BURST-STALE-TASK (slot:papa): wiki code-tribal entry for two overnight infra-diagnosis lessons -- (1) a BURST of rapid local-LLM calls wedges Ollama even when single calls work -> route through ollama-fanout bounded-concurrency, not a hand-rolled pacer; (2) 'stale' task-health is an AGE signal + state=Running>>interval is a HUNG-RUN signal distinct from overdue (decision tree before recommending re-register/trigger/stop). Compounds the burst+stale-task memories into the Karpathy LLM-wiki; cross-refs ollama-wedge-guard + tribal-index-clobber.

**Shipped:** 2026-06-24T22:03:25-05:00 by markjvillanueva3-cloud
**Files:** 2 touched

Full distillation: [[domain-knowledge-u-papa-wiki-ollama-burst-stale-task]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._