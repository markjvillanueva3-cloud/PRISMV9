# OLLAMA-SYNERGY/U-OLLAMA-NAV-ENFORCE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OLLAMA-SYNERGY]/U-OLLAMA-NAV-ENFORCE (slot:alpha): auto-surface dormant ollama-prism-bridge on codebase-nav intent

**Commit:** `36105372ec95` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T13:41:26-05:00
**Tags:** ollama-synergy, u-ollama-nav-enforce, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OLLAMA-SYNERGY]/U-OLLAMA-NAV-ENFORCE (slot:alpha): auto-surface dormant ollama-prism-bridge on codebase-nav intent

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OLLAMA-SYNERGY]/U-OLLAMA-NAV-ENFORCE (slot:alpha): auto-surface dormant ollama-prism-bridge on codebase-nav intent

Capability (ollama-prism-bridge.mjs, 7 read-only tools, local-LLM codebase nav
at ~0 Claude tokens) + /ollama-bridge skill existed but were DORMANT (route
take-rate ~0.4%, offload ~7% vs 30% target). New UserPromptSubmit hook fires
ONLY on high-confidence nav-intent (nav-verb AND codebase-noun -- 'how does a
lathe work' never fires; 'how does the slot-claim system work, which files'
does), injects the ready-to-run bridge command, dedups per-session per-question
via session-once-gate, bumps byHook[ollama-nav-enforce].suggested telemetry.
Advisory, never a hard block (no-quality-loss). Clone of wiki-read-offload-
advisory pattern. Individual UserPromptSubmit wiring. Out of bravo's U3-U7.
Also fixes 3 doc-drift lies in /ollama-bridge (3 tools->7, 3b->32b, no-MCP->mcp_call).

Tests 8/8; live: nav->inject, dup->dedup, domain->skip, disable->suppress, 1 bump/4 calls.
```

## Files touched (3)
- .claude/hooks/__tests__/ollama-nav-enforce-inject.test.mjs | 114 +++++++++++++++++++++++++++++++++
- .claude/hooks/ollama-nav-enforce-inject.mjs                | 244 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 358 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 36105372ec95`
- Milestone envelope: `mcp-server/data/milestones/OLLAMA-SYNERGY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._