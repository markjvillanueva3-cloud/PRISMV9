# FE-SPECIALTY-CONTRACT/U-FE-DOC-LEARN-MOUNT — [MAIN-FORCE] [FE-SPECIALTY-CONTRACT]/U-FE-DOC-LEARN-MOUNT (slot:bravo): mount /api/v1/doc-learn (404->200)

**Commit:** `483e517010dd` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T10:01:38-05:00
**Tags:** fe-specialty-contract, u-fe-doc-learn-mount, auto-distilled

## Subject
[MAIN-FORCE] [FE-SPECIALTY-CONTRACT]/U-FE-DOC-LEARN-MOUNT (slot:bravo): mount /api/v1/doc-learn (404->200)

## Body
```
[MAIN-FORCE] [FE-SPECIALTY-CONTRACT]/U-FE-DOC-LEARN-MOUNT (slot:bravo): mount /api/v1/doc-learn (404->200)

Backend-for-frontend (romeo FE<->BE contract-audit gap): the SPA web/src/api/docLearn.ts posts to
/api/v1/doc-learn/{upload,extract,list,:id} and casts the RAW body to its result types, but the
prism_doc_learn dispatcher (registered index.ts:819) was only served by learning.ts at
/api/v1/learning/document/* in an {ok,data} envelope the SPA does not consume -> the SPA 404'd.

New createDocLearnRouter relays the SPA's exact endpoints to prism_doc_learn:{doc_upload,doc_extract,
doc_list,doc_get,doc_delete} and returns the RAW dispatcher result. Verified the dispatcher's real
handler shapes EXACTLY match the SPA result types (DocGetResult={document,knowledge};
DocDeleteResult={deleted,message}; etc.) -- so the raw relay is the correct contract.

Faithful error mapping (SPA does if(!res.ok) throw): a dispatcher error envelope ({error,action},
no domain marker) -> 400; a safety block ({blocked,reason,blocker}) -> 422 (blocker surfaced); but a
doc_extract {document_id,status:"failed",error} is a VALID 200 the SPA renders (domain marker present
-> passes through). /list registered before /:document_id (route ordering). relay typed with express
Response/NextFunction.

Tests: doc-learn-route.test.ts (10/10) round-trip the dispatcher's ACTUAL envelope shapes (read from
documentLearningDispatcher.ts handlers) -- happy per verb + the failed-extract-200 distinction +
dispatch-error-400 + safety-block-422 + not-found-400 (get+delete) + /list-vs-/:id ordering. tsc clean;
FE<->BE audit GAPS 5->4 (doc-learn now covered). Per-file 2-arm scrutiny PASS (after fixing 2 P0
stub-fidelity + P1 marker/typing/blocker findings, re-verified PASS).

Remaining audit gaps (4): /api/operator/feedback (OperatorPreferencesEngine exists; needs route+action),
/api/dispatch/* + /api/prism (generic dispatcher proxy -- SECURITY: needs an action allowlist + operator
input before exposing arbitrary dispatcher calls to the SPA), /api/v1/ai/reasoning.
```

## Files touched (4)
- mcp-server/src/__tests__/doc-learn-route.test.ts | 172 +++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/routes/docLearn.ts                |  73 +++++++++++++++++++
- mcp-server/src/routes/index.ts                   |   5 ++
- 3 files changed, 250 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 483e517010dd`
- Milestone envelope: `mcp-server/data/milestones/FE-SPECIALTY-CONTRACT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._