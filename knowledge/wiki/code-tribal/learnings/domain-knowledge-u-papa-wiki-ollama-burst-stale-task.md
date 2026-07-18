# DOMAIN-KNOWLEDGE/U-PAPA-WIKI-OLLAMA-BURST-STALE-TASK — [MAIN-FORCE] [DOMAIN-KNOWLEDGE]/U-PAPA-WIKI-OLLAMA-BURST-STALE-TASK (slot:papa): wiki code-tribal entry for two overnight infra-diagnosis lessons -- (1) a BURST of rapid local-LLM calls wedges Ollama even when single calls work -> route through ollama-fanout bounded-concurrency, not a hand-rolled pacer; (2) 'stale' task-health is an AGE signal + state=Running>>interval is a HUNG-RUN signal distinct from overdue (decision tree before recommending re-register/trigger/stop). Compounds the burst+stale-task memories into the Karpathy LLM-wiki; cross-refs ollama-wedge-guard + tribal-index-clobber.

**Commit:** `c6a7059b9d04` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T22:03:25-05:00
**Tags:** domain-knowledge, u-papa-wiki-ollama-burst-stale-task, auto-distilled

## Subject
[MAIN-FORCE] [DOMAIN-KNOWLEDGE]/U-PAPA-WIKI-OLLAMA-BURST-STALE-TASK (slot:papa): wiki code-tribal entry for two overnight infra-diagnosis lessons -- (1) a BURST of rapid local-LLM calls wedges Ollama even when single calls work -> route through ollama-fanout bounded-concurrency, not a hand-rolled pacer; (2) 'stale' task-health is an AGE signal + state=Running>>interval is a HUNG-RUN signal distinct from overdue (decision tree before recommending re-register/trigger/stop). Compounds the burst+stale-task memories into the Karpathy LLM-wiki; cross-refs ollama-wedge-guard + tribal-index-clobber.

## Body
```
[MAIN-FORCE] [DOMAIN-KNOWLEDGE]/U-PAPA-WIKI-OLLAMA-BURST-STALE-TASK (slot:papa): wiki code-tribal entry for two overnight infra-diagnosis lessons -- (1) a BURST of rapid local-LLM calls wedges Ollama even when single calls work -> route through ollama-fanout bounded-concurrency, not a hand-rolled pacer; (2) 'stale' task-health is an AGE signal + state=Running>>interval is a HUNG-RUN signal distinct from overdue (decision tree before recommending re-register/trigger/stop). Compounds the burst+stale-task memories into the Karpathy LLM-wiki; cross-refs ollama-wedge-guard + tribal-index-clobber.
```

## Files touched (2)
- knowledge/wiki/code-tribal/learnings/ollama-burst-wedge-and-stale-vs-hung-task-signals.md | 60 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 60 insertions(+)

## Lessons surfaced in commit body
- lessons -- (1) a BURST of rapid local-LLM calls wedges Ollama even when single calls work -> route through ollama-fanout bounded-concurrency, not a hand-rolled pacer; (2) 'stale' task-health is an AGE signal + state=Running>>interval is a HUNG-RUN signal distinct from overdue (decision tree before recommending re-register/trigger/stop). Compounds the burst+stale-task memories into the Karpathy LLM-wiki;

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c6a7059b9d04`
- Milestone envelope: `mcp-server/data/milestones/DOMAIN-KNOWLEDGE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._