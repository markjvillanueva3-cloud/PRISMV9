# DOMAIN-KNOWLEDGE/U-PAPA-DOMAIN-RECLASSIFY-OLLAMA — [MAIN-FORCE] [DOMAIN-KNOWLEDGE]/U-PAPA-DOMAIN-RECLASSIFY-OLLAMA (slot:papa): generalized Ollama reclassifier for zulu's 769 keyword-unclassified residual (R16 -- gap zulu's keyword pass left; cadcam-reclassify only did cad/cam on a different corpus). Multi-labels each residual spec from title+kind+path+build-target engines/formulas via local qwen2.5-coder:32b (R5 lane), resumable conf-gated sidecar; feeder resolveDomains applies high-conf overrides (GIGO-safe + ownership-guard intact). 17/17 new + feeder 11/11 intact; non-regressive baseline.

**Commit:** `bdffb53c2cd5` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T19:45:42-05:00
**Tags:** domain-knowledge, u-papa-domain-reclassify-ollama, auto-distilled

## Subject
[MAIN-FORCE] [DOMAIN-KNOWLEDGE]/U-PAPA-DOMAIN-RECLASSIFY-OLLAMA (slot:papa): generalized Ollama reclassifier for zulu's 769 keyword-unclassified residual (R16 -- gap zulu's keyword pass left; cadcam-reclassify only did cad/cam on a different corpus). Multi-labels each residual spec from title+kind+path+build-target engines/formulas via local qwen2.5-coder:32b (R5 lane), resumable conf-gated sidecar; feeder resolveDomains applies high-conf overrides (GIGO-safe + ownership-guard intact). 17/17 new + feeder 11/11 intact; non-regressive baseline.

## Body
```
[MAIN-FORCE] [DOMAIN-KNOWLEDGE]/U-PAPA-DOMAIN-RECLASSIFY-OLLAMA (slot:papa): generalized Ollama reclassifier for zulu's 769 keyword-unclassified residual (R16 -- gap zulu's keyword pass left; cadcam-reclassify only did cad/cam on a different corpus). Multi-labels each residual spec from title+kind+path+build-target engines/formulas via local qwen2.5-coder:32b (R5 lane), resumable conf-gated sidecar; feeder resolveDomains applies high-conf overrides (GIGO-safe + ownership-guard intact). 17/17 new + feeder 11/11 intact; non-regressive baseline.
```

## Files touched (4)
- scripts/build-domain-knowledge-feeders.mjs        |  42 +++++++++++++++++++++---
- scripts/reclassify-domain-feeders-ollama.mjs      | 225 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/reclassify-domain-feeders-ollama.test.mjs | 174 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 3 files changed, 437 insertions(+), 4 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show bdffb53c2cd5`
- Milestone envelope: `mcp-server/data/milestones/DOMAIN-KNOWLEDGE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._