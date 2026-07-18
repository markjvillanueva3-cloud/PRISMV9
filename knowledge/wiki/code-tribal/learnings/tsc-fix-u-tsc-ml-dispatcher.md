# TSC-FIX/U-TSC-ML-DISPATCHER — [MAIN] [TSC-FIX]/U-TSC-ML-DISPATCHER: align mlDispatcher with engine input schemas (-7 errors)

**Commit:** `944aa77a3a51` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T00:41:37-05:00
**Tags:** tsc-fix, u-tsc-ml-dispatcher, auto-distilled

## Subject
[MAIN] [TSC-FIX]/U-TSC-ML-DISPATCHER: align mlDispatcher with engine input schemas (-7 errors)

## Body
```
[MAIN] [TSC-FIX]/U-TSC-ML-DISPATCHER: align mlDispatcher with engine input schemas (-7 errors)

mlDispatcher had drifted from its consuming engines + schemas:

1. validation.error.issues (L202) — narrow optional .error via
   ?.issues with errors-alias fallback. ValidationResult.error is
   typed as optional (z.ZodError | undefined); the dispatcher was
   accessing .issues directly. New form: errors ?? error?.issues ?? []
   (errors compat-alias is populated whenever validation fails per
   dispatcherMiddleware.ts:64 inline doc).

2. corpus_crawl (L214): added include_patterns: string[] field.
   JMDieTrainingCorpusEngine.crawl() input requires it (schema
   default []), Zod input/output mismatch made it required at the
   call site.

3. OutcomeDomain type cast (L531, L546): OutcomeDomain is exported
   as a Zod schema VALUE, not a type. The type alias is
   OutcomeDomainT (line 380 of outcomeEventSchema.ts). Two casts
   updated.

4. maxent_irl_train (L693): added policy_samples field. Default to
   [] — schema has .default([]) but input-type still requires it.

5. offline_rl_train (L761): added eval_interval field. Default 10
   matching schema. Same Zod .default() input/output mismatch.

6. protomaml_register (L1264): meta_lr changed from
   (params.meta_lr as number | undefined) to ((as number) ?? 0.001)
   matching the schema's .default(0.001). The dispatcher was passing
   a potentially-undefined value; the engine signature required number.

esbuild full bundle clean (exit 0). All edits preserve the dispatcher's
`params as any` LLM-tolerance: ?? defaults guard against missing fields.
```

## Files touched (2)
- mcp-server/src/tools/dispatchers/mlDispatcher.ts | 11 +++++++----
- 1 file changed, 7 insertions(+), 4 deletions(-)

## Lessons surfaced in commit body
- till requires it.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 944aa77a3a51`
- Milestone envelope: `mcp-server/data/milestones/TSC-FIX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._