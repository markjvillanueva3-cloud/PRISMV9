# FEATURE-GAP-AUDIT-MS0/U-GAP-POST-JMDIE-LEARNING — [MAIN] [FEATURE-GAP-AUDIT-MS0]/U-GAP-POST-JMDIE-LEARNING (slot:india): learn from JM Die's 12 PRISM-modified .cps post-processors

**Commit:** `398e671a45bb` · **By:** markjvillanueva3-cloud · **At:** 2026-05-20T19:59:15-05:00
**Tags:** feature-gap-audit-ms0, u-gap-post-jmdie-learning, auto-distilled

## Subject
[MAIN] [FEATURE-GAP-AUDIT-MS0]/U-GAP-POST-JMDIE-LEARNING (slot:india): learn from JM Die's 12 PRISM-modified .cps post-processors

## Body
```
[MAIN] [FEATURE-GAP-AUDIT-MS0]/U-GAP-POST-JMDIE-LEARNING (slot:india): learn from JM Die's 12 PRISM-modified .cps post-processors

Real .cps parser + corpus aggregator that extracts learnable enhancement
patterns from JM Die's 12 hand-modified Fusion 360 post sources
(Haas / Hurco / Okuma / Roku-Roku). No fabricated data, no randomness —
every field is read from the actual `.cps` source (contrast the pre-existing
JMDieProgramLearningEngine, whose loadPatterns() is a Math.random stub for
a different corpus of G-code programs).

JMDiePostProcessorLearningEngine extracts per-post:
  - declarative globals (description / vendor / extension / certificationLevel
    / FORKID / $Revision)
  - controller family (haas / hurco / okuma / roku-roku) from filename
  - process type (mill / lathe / mill-turn) from CAPABILITY_* + filename keys
  - top-level properties (brace-matched on a comment/string/template-literal-
    blanked copy, depth-tracked to skip nested object keys)
  - 15 curated PRISM/AI enhancement markers (iMachining, chip thinning, G05.3
    smoothing, SSV, rigid tapping, adaptive feed, deflection, load monitor, …)
  - distinct G/M dialect codes (controller fingerprint)

aggregate() rolls profiles into a corpus with per-family enhancement support
≥50% emitted as LearnedPatterns, sorted descending by confidence.
Real-corpus E2E: learns 12 posts and 36 patterns from the live JM Die set.

Wired into prism_knowledge (6 actions):
  jmdie_post_learn / jmdie_post_corpus / jmdie_post_query /
  jmdie_post_catalog / jmdie_post_stats / jmdie_post_reset

query and catalog propagate corpus.warning so callers can distinguish
"family has zero posts" from "corpus unreachable" (slimResponse strips
empty profile arrays from the envelope). _reset clears the process-global
cache for explicit consumer control over the cross-call coupling.

Tests: 39/39 PASS (29 engine + 10 dispatcher round-trip).
  - parseCpsContent edge cases: empty / non-string / unbalanced braces /
    nested object keys / backtick template literals / escaped quotes /
    NaN+Infinity sizeBytes
  - aggregate: frequency, family roll-up, ≥50% pattern thresholding,
    confidence sorting, non-array adversarial input
  - learn() with injected temp corpus + missing-directory fail-soft path
  - real-corpus E2E gated on Eng.resolveSourceDir() (12 posts, 36 patterns)
  - determinism anti-regression (identical aggregates on re-run)
  - dispatcher round-trip per action + warning-propagation-on-missing-corpus
  - reset clears the cache so subsequent calls re-discover from disk

Engine designed for fail-soft: never throws; missing dir / read failure /
malformed input all return structured results with a `warning` field.
resolveSourceDir(explicit) honors the explicit path exactly — no silent
fallback to discovery (fail-loud per R12, caught by self-written test).

Per-file scrutiny: 8 reviewers across 4 files. Engine + engine-test PASS;
dispatcher + dispatcher-test FAILED initial review (warning-propagation
gap + weak invalid-family assertion) → both fixed in this commit.

Refs: ISO 13399, Sandvik dialect references, internal JM Die corpus.
```

## Files touched (4)
- .../knowledgeDispatcher.jmdie-post-wire.test.ts    | 216 ++++++++
- .../engines/JMDiePostProcessorLearningEngine.ts    | 576 +++++++++++++++++++++
- .../src/tools/dispatchers/knowledgeDispatcher.ts   |  64 +++
- 3 files changed, 856 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 398e671a45bb`
- Milestone envelope: `mcp-server/data/milestones/FEATURE-GAP-AUDIT-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._