# SYSTEM-VIZ-BRAIN-MS0/U-P1-TRIBAL-BY-DOMAIN-INJECT — UserPromptSubmit tribal precontext keyed on slot milestone domain

**Commit:** `173291ff7598` · **By:** markjvillanueva3-cloud · **At:** 2026-05-15T14:05:52-05:00
**Tags:** system-viz-brain-ms0, u-p1-tribal-by-domain-inject, auto-distilled

## Subject
[SYSTEM-VIZ-BRAIN-MS0]/U-P1-TRIBAL-BY-DOMAIN-INJECT: UserPromptSubmit tribal precontext keyed on slot milestone domain

## Body
```
[SYSTEM-VIZ-BRAIN-MS0]/U-P1-TRIBAL-BY-DOMAIN-INJECT: UserPromptSubmit tribal precontext keyed on slot milestone domain

Sibling of U-P1-WIKI-PRELOAD-BY-DOMAIN (commit 590ba4a77) — same pattern,
different surface. wiki version biases wiki BM25 ranking; this version
surfaces top-3 tribal hits via tribal-rerank --domain.

Reuses:
- .claude/helpers/wiki-domain-bias.mjs getDomainTokens/chatIdFromInput
- .claude/scripts/tribal-rerank.mjs (--domain --json --no-cite --k)
- state/shared/tribal-embed-index.json (nomic-embed-text vectors)

Files:
- .claude/hooks/tribal-by-domain-inject.mjs (138 LOC, T2 advisory)
- .claude/hooks/tribal-by-domain-inject.test.mjs (38 hermetic node:test)

Wired in C:/Users/<user>/.claude/settings.json UserPromptSubmit chain
after master-index-precheck-inject, timeout 5000ms (subprocess cap 2500ms
default, harness has 2.5s headroom). Auto-mirrored to H: by c-to-h-mirror.

Live smoke-tested: returns 3 cad-domain hits when slot=delta on
cad-fusion-live-ms0 branch (cad+fusion tokens match DOMAIN_MAP).

Per-file scrutiny gate PASS/PASS:
- Reviewer A (reviewer): PASS, only P2 polish
- Reviewer B (code-analyzer): PASS with 2 P1s — both addressed:
  * P1-A prototype-pollution: ownStr() guard rejects __proto__-injected keys
  * P1-B DOMAIN_MAP completeness: extended with swiss/5axis/grinder/sinker
    /pcd/blueprint-ocr/etc. (15 new tokens)
  * P2-B timeout: lowered default 4000ms→2500ms (tail-latency)
  * P2-C declaration-order: documented in DOMAIN_MAP doc comment
  * P2-A module-load: added smoke test asserting clean import

Knobs: PRISM_TRIBAL_DOMAIN_INJECT_{DISABLE,K,TIMEOUT_MS,VERBOSE}

Closes-out: 10/26 units in SYSTEM-VIZ-BRAIN-MS0 complete.
```

## Files touched (3)
- .claude/hooks/tribal-by-domain-inject.mjs      | 196 +++++++++++++++++
- .claude/hooks/tribal-by-domain-inject.test.mjs | 282 +++++++++++++++++++++++++
- 2 files changed, 478 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 173291ff7598`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-VIZ-BRAIN-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._