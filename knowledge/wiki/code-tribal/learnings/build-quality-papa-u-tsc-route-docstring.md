# BUILD-QUALITY-PAPA/U-TSC-ROUTE-DOCSTRING — [MAIN-FORCE] [BUILD-QUALITY-PAPA]/U-TSC-ROUTE-DOCSTRING (slot:papa): docstring-based Ollama classification (effective-Ollama upgrade)

**Commit:** `d18946a41f93` · **By:** markjvillanueva3-cloud · **At:** 2026-06-18T09:45:49-05:00
**Tags:** build-quality-papa, u-tsc-route-docstring, auto-distilled

## Subject
[MAIN-FORCE] [BUILD-QUALITY-PAPA]/U-TSC-ROUTE-DOCSTRING (slot:papa): docstring-based Ollama classification (effective-Ollama upgrade)

## Body
```
[MAIN-FORCE] [BUILD-QUALITY-PAPA]/U-TSC-ROUTE-DOCSTRING (slot:papa): docstring-based Ollama classification (effective-Ollama upgrade)

Improves tsc-route-by-owner's --ollama-classify from filename-only (weak: qwen mis-routed
ProcessIntelligenceRouter->mike from the name alone) to DOCSTRING-based: readEngineDocstring()
reads the engine file's leading header comment (the strongest domain signal -- it literally says
what the engine does) and classifyViaOllama() includes it in the prompt. ollamaReclassify reads
each UNKNOWN file's docstring (candidate-resolved from mcp-server/) and passes it.

Fail-soft throughout (read miss -> '', injectable readImpl). +2 hermetic tests (readEngineDocstring
capped-header/miss/null; classify includes docstring in prompt). 10/10 pass; deterministic routing
unaffected (89->12). No fabrication; uses the local Ollama coder (/usr/bin/bash) more effectively per the
operator's stack directive.
```

## Files touched (3)
- scripts/tsc-route-by-owner.mjs      | 27 +++++++++++++++++++++++++--
- scripts/tsc-route-by-owner.test.mjs | 23 ++++++++++++++++++++++-
- 2 files changed, 47 insertions(+), 3 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d18946a41f93`
- Milestone envelope: `mcp-server/data/milestones/BUILD-QUALITY-PAPA.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._