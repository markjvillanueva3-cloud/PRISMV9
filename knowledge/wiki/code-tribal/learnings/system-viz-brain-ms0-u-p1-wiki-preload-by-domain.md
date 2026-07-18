# SYSTEM-VIZ-BRAIN-MS0/U-P1-WIKI-PRELOAD-BY-DOMAIN — [MAIN] [SYSTEM-VIZ-BRAIN-MS0]/U-P1-WIKI-PRELOAD-BY-DOMAIN: bias wiki injector toward active milestone domain

**Commit:** `590ba4a77c6a` · **By:** markjvillanueva3-cloud · **At:** 2026-05-15T13:11:49-05:00
**Tags:** system-viz-brain-ms0, u-p1-wiki-preload-by-domain, auto-distilled

## Subject
[MAIN] [SYSTEM-VIZ-BRAIN-MS0]/U-P1-WIKI-PRELOAD-BY-DOMAIN: bias wiki injector toward active milestone domain

## Body
```
[MAIN] [SYSTEM-VIZ-BRAIN-MS0]/U-P1-WIKI-PRELOAD-BY-DOMAIN: bias wiki injector toward active milestone domain

Helper resolves domain tokens from the active chat-slot's topic + branch +
state/CURRENT_POSITION.md H1, then domainBoostFor() adds a capped (+4.5)
additive boost to BM25 candidate scores in wiki-precheck-inject so a chat
working on SYSTEM-VIZ-BRAIN-MS0 sees system-viz wiki entries ranked above
generically-matching ones.

Cap stays below curated boost_keywords tier (BOOST_BASE_SCORE=12) so
deliberate hand-curation always wins over coincidental domain overlap.

Default-on; knob PRISM_WIKI_DOMAIN_BIAS_DISABLE=1 to disable.

Files:
- NEW .claude/helpers/wiki-domain-bias.mjs (~120 LOC, 3 exports)
- NEW .claude/helpers/wiki-domain-bias.test.mjs (26 hermetic tests, all green)
- EDIT .claude/hooks/wiki-precheck-inject.mjs (import + 12-line surgical insert)

Tests: 26/26 pass via node --test (vitest harness broken in helpers/ tree).
Smoke-tested: hook returns valid JSON, surfaces system-viz wiki match on
system-viz-themed prompts (domain bias firing).

Per-file scrutiny: 2 parallel reviewer agents (code-analyzer + reviewer)
ran on helper file before tests written; both P1 findings addressed
(no cross-contamination fallback when chatId unmatched + MAX_DOMAIN_BOOST cap).
```

## Files touched (4)
- .claude/helpers/wiki-domain-bias.mjs      | 141 +++++++++++++++++
- .claude/helpers/wiki-domain-bias.test.mjs | 251 ++++++++++++++++++++++++++++++
- .claude/hooks/wiki-precheck-inject.mjs    |  20 ++-
- 3 files changed, 411 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 590ba4a77c6a`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-VIZ-BRAIN-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._