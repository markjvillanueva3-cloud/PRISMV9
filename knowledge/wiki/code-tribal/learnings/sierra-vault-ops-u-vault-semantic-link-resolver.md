# SIERRA-VAULT-OPS/U-VAULT-SEMANTIC-LINK-RESOLVER — [MAIN-FORCE] [SIERRA-VAULT-OPS]/U-VAULT-SEMANTIC-LINK-RESOLVER (slot:sierra): memory-safe Ollama broken-wikilink resolver + anti-poison + token-coverage precision guard

**Commit:** `546704bfe969` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T09:27:28-05:00
**Tags:** sierra-vault-ops, u-vault-semantic-link-resolver, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-VAULT-OPS]/U-VAULT-SEMANTIC-LINK-RESOLVER (slot:sierra): memory-safe Ollama broken-wikilink resolver + anti-poison + token-coverage precision guard

## Body
```
[MAIN-FORCE] [SIERRA-VAULT-OPS]/U-VAULT-SEMANTIC-LINK-RESOLVER (slot:sierra): memory-safe Ollama broken-wikilink resolver + anti-poison + token-coverage precision guard

Net-new semantic DECISION+EXECUTION layer over the two existing PURE string-distance
link tools (fix-broken-wikilinks.mjs = case-variant classifier; wiki-broken-link-propose-fix.mjs
= Levenshtein proposer) -- neither decides, runs Ollama, or resolves. Resolves each of the
26,165 broken [[wikilinks]] to an EXISTING note only:
 - Levenshtein pre-filter -> candidate set of existing notes
 - token-coverage precision guard: every significant token of the broken link must appear in
   the candidate (rejects dropped-qualifier false matches: cad-knowledge-index->knowledgeindex,
   prism_telemetry->telemetry; keeps telemetry-engine->telemetryengine)
 - Ollama (local gpt-oss:20b, $0, routed via ask-ollama.mjs -> recorded as executedOffloads)
   picks ONE candidate or NONE
 - ANTI-POISON: pick accepted ONLY if it is an exact member of the pre-validated candidate set
   (validateResolution) -> invention is impossible
 - dry-run by default (advisory proposals JSON); --apply is capped + .bak backup; resumable cursor

HEALTH-ISSUE FIX (R12, self-caused): the first build pass computed Levenshtein candidates for
ALL ~24K broken links x ~40K existing slugs BEFORE applying the cap (~1e9 ops) and retained all
~39K file bodies in memory -> CPU hang + memory pressure -> run reaped (exit 255), golf cleaned
it up; my --max-old-space-size=8192 retry made it worse (Windows commit reservation,
[[windows-commit-reservation-hook-heap]]). Redesigned to STREAM the walk (no body retention) and
run Levenshtein ONLY for the capped batch. Now 11-125s, exit 0, default heap, no spike.

Tests: scripts/wiki-link-semantic-resolve.test.mjs 14/14 (anti-poison off-menu rejection,
token-coverage 3 live-regression cases, NONE/empty/garbled fail-safe, rewriteLink, cursor resume,
end-to-end pipeline). Live: 1 correct resolution, 0 wrong, 0 invented, 3 recorded Ollama executions.
```

## Files touched (3)
- scripts/wiki-link-semantic-resolve.mjs      | 416 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/wiki-link-semantic-resolve.test.mjs | 170 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 586 insertions(+)

## Lessons surfaced in commit body
- wrong, 0 invented, 3 recorded Ollama executions.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 546704bfe969`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-VAULT-OPS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._