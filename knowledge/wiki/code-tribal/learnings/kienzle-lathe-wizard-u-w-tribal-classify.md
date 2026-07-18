# KIENZLE-LATHE-WIZARD/U-W-TRIBAL-CLASSIFY — [MAIN-FORCE] [KIENZLE-LATHE-WIZARD]/U-W-TRIBAL-CLASSIFY (slot:whiskey): [SCOPED] tribal free-text -> structured LatheTribalSignal classifier (core+runner)

**Commit:** `a4655f3c02f0` · **By:** markjvillanueva3-cloud · **At:** 2026-06-26T12:17:06-05:00
**Tags:** kienzle-lathe-wizard, u-w-tribal-classify, auto-distilled

## Subject
[MAIN-FORCE] [KIENZLE-LATHE-WIZARD]/U-W-TRIBAL-CLASSIFY (slot:whiskey): [SCOPED] tribal free-text -> structured LatheTribalSignal classifier (core+runner)

## Body
```
[MAIN-FORCE] [KIENZLE-LATHE-WIZARD]/U-W-TRIBAL-CLASSIFY (slot:whiskey): [SCOPED] tribal free-text -> structured LatheTribalSignal classifier (core+runner)

Step 1 (dependency-ordered, R13) of the deeper "tribal factored into GENERATION" unit: turn the
675 free-text tips into structured LatheTribalSignal-shaped signals (op/material/clamped factors)
the existing LatheTribalIntegrationEngine can consume. [SCOPED] -- this ships the PRODUCER; wiring
the signals into sourceCorpusTips so they bias generation is the NEXT unit (the signals .jsonl is
the seam). Honestly NOT "tribal in generation" yet (advisory surfacing already shipped U-W-TRIBAL-ADVISORY).

- scripts/lib/lathe-tip-classify.mjs (pure, 16/16) -- parse+validate+clamp a model classification to
  LatheTribalSignal: factors clamped [0.25,2.5] (== engine FACTOR_MIN/MAX); sfm_max in FT/MIN bounded
  [20,3000] (units-matched to the consumer -- a m/min cap would be a 3.28x safety error); no-op/NaN/
  out-of-enum dropped; advisory_only fallback never fabricates an adjustment; emits confidence+rationale
  (non-optional on LatheTribalSignal).
- scripts/lathe-tribal-classify.mjs -- resumable $0-Ollama runner (curl, qwen2.5-coder) -> lathe-tribal-signals.jsonl.

PROVEN: 9 real tips classified end-to-end (0 failures warm) -> all advisory_only (Okuma OSP manual
front-matter is genuinely non-parametric -- confirms the LOW parametric yield: catalog/manual tips are
mostly tool/holding/safety advice, not speed/feed signals; the parametric path is verified by 16 unit tests).

Per-file 2-arm scrutiny BOTH PASS; 3 P1 contract bugs fixed pre-commit (sfm_max units ft/min, sfm_max
band-bound, confidence+rationale) so the wiring unit inherits a clean seam.
```

## Files touched (4)
- scripts/lathe-tribal-classify.mjs       | 124 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/lathe-tip-classify.mjs      | 122 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/lathe-tip-classify.test.mjs | 119 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 3 files changed, 365 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show a4655f3c02f0`
- Milestone envelope: `mcp-server/data/milestones/KIENZLE-LATHE-WIZARD.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._