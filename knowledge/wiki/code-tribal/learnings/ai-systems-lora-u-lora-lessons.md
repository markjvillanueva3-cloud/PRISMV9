# AI-SYSTEMS-LORA/U-LORA-LESSONS — [MAIN-FORCE] [AI-SYSTEMS-LORA]/U-LORA-LESSONS (slot:alpha): mine PRISM's failure->fix corpus (wiki code-tribal/learnings) -> 133 non-degenerate symptom->(root-cause+fix) LoRA pairs; R15-wired into the fleet-training corpus (1336->1468 rows)

**Commit:** `87c61851ae0b` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T00:04:18-05:00
**Tags:** ai-systems-lora, u-lora-lessons, auto-distilled

## Subject
[MAIN-FORCE] [AI-SYSTEMS-LORA]/U-LORA-LESSONS (slot:alpha): mine PRISM's failure->fix corpus (wiki code-tribal/learnings) -> 133 non-degenerate symptom->(root-cause+fix) LoRA pairs; R15-wired into the fleet-training corpus (1336->1468 rows)

## Body
```
[MAIN-FORCE] [AI-SYSTEMS-LORA]/U-LORA-LESSONS (slot:alpha): mine PRISM's failure->fix corpus (wiki code-tribal/learnings) -> 133 non-degenerate symptom->(root-cause+fix) LoRA pairs; R15-wired into the fleet-training corpus (1336->1468 rows)

WHY: the existing vault->LoRA feed mined only DOCTRINE (feedback rules + galaxy-synthesis brains). This adds PRISM's richest untapped training signal -- the auto-distilled "symptom -> root cause -> fix" lessons -- as a coding LoRA's debugging-reasoning corpus (teaches the model to diagnose a symptom to its fix + avoid documented silent-failure modes). Reuses splitFrontmatter (R8).

RESULT: signal-gated + structural sentence-anchored symptom/diagnosis split => 133 unique pairs (0 degenerate, 0 prefix-leak, 0 meta-poison, verified live). Honest recall reported: 134/1005 signal-bearing (13.3%), distinguishing low-signal from signal-but-unsplittable rejects (R12). Registered as an advisory (down-weighted, w=0.5) source -> R15 VALIDATED: the assembler's combined fleet LoRA corpus grew 1336->1468 rows; india's rsLoRA run consumes it. 16/16 tests.

SCRUTINY (per-file 2-arm + 3-of-3, every finding fixed + test-pinned): P0 -- a __meta__ JSONL row that neither the assembler NOR fleet_lora_train.py filter -> would train the adapter to emit a stats blob (now console + .meta.json sidecar only). P1 -- PREFIX_RE generalized over 3 review rounds: slot-ed/slot-less/`+`-joined/free-text/dotted("/U-H1.0")/non-U("/P0.3-B-followup") commit-id forms, anchored by a bracket/scope so a bare "/path:" narrative is never stripped. P1 -- first-marker split cut mid-clause + dragged TESTS/tally tails (now structural markers + sentence-boundary anchor + stripTrailingNoise). P2 -- --out clobber guard for the hand-authored set; pid-suffixed tmp (race-safe); .meta.json gitignored.

CONTEXT: operator-authorized alpha cross-domain (fill in for india alongside its live rsLoRA work). The git-add-lane-guard mis-fired on a post-/compact binding drift (alpha->slot/alpha while this chat works on cad-fusion-live-ms0, as its prior commits this session did); slot/alpha is a stale base lacking the splitFrontmatter dependency, so staged via update-index to land on the correct branch. Dataset jsonl + .meta.json gitignored (runtime artifacts; regenerate from the committed script).
```

## Files touched (9)
- .gitignore                                                          |  1 +
- mcp-server/src/engines/CrossProcessAIBridge.ts                      |  6 +++---
- mcp-server/src/engines/CrossProcessCounterfactualPredictorEngine.ts |  2 +-
- mcp-server/src/engines/CrossProcessDoCalculusEngine.ts              |  2 +-
- mcp-server/src/engines/CrossProcessMediationAnalyzerEngine.ts       |  4 ++--
- mcp-server/src/engines/HSMAdvisorComparatorBridgeEngine.ts          |  2 +-
- scripts/vault-lessons-to-lora-dataset.mjs                           | 44 +++++++++++++++++++++++++++++++++++---------
- scripts/vault-lessons-to-lora-dataset.test.mjs                      | 11 +++++++++++
- 8 files changed, 55 insertions(+), 17 deletions(-)

## Lessons surfaced in commit body
- LESSONS (slot:alpha): mine PRISM's failure->fix corpus (wiki code-tribal/learnings) -> 133 non-degenerate symptom->(root-cause+fix) LoRA pairs; R15-wired into the fleet-training corpus (1336->1468 rows)
- tilled "symptom -> root cause -> fix" lessons -- as a coding LoRA's debugging-reasoning corpus (teaches the model to diagnose a symptom to its fix + avoid documented silent-failure modes). Reuses splitFrontmatter (R8).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 87c61851ae0b`
- Milestone envelope: `mcp-server/data/milestones/AI-SYSTEMS-LORA.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._