# AI-SYNERGY-AUDIT-MS0/U-RAG-PARTIAL-DENSE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [AI-SYNERGY-AUDIT-MS0]/U-RAG-PARTIAL-DENSE (slot:charlie): opt-in graceful partial-dense for the fleet RAG hybrid -- one starved embed no longer collapses the whole dense arm

**Commit:** `86e7e6b77ee7` · **By:** markjvillanueva3-cloud · **At:** 2026-06-11T00:09:48-05:00
**Tags:** ai-synergy-audit-ms0, u-rag-partial-dense, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [AI-SYNERGY-AUDIT-MS0]/U-RAG-PARTIAL-DENSE (slot:charlie): opt-in graceful partial-dense for the fleet RAG hybrid -- one starved embed no longer collapses the whole dense arm

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [AI-SYNERGY-AUDIT-MS0]/U-RAG-PARTIAL-DENSE (slot:charlie): opt-in graceful partial-dense for the fleet RAG hybrid -- one starved embed no longer collapses the whole dense arm

OBSERVED LIVE this session: the galaxy-reasoning-bridge (build-once CAG+RAG hybrid serving all
34 galaxies) reported sources:[...,"dense-degraded"] for quoting -- the hybrid RAG fell back to
sparse-only. Root cause (code is CORRECT, not a bug): hybridRetrieve does
Promise.all(candidates.map(embed)) then `if (vecs.some(v=>!v)) return null` -- ALL-OR-NOTHING,
so ONE slow/cold embed (nomic-embed-text starved while gpt-oss:120b is resident under concurrent
load) drops the ENTIRE dense arm to sparse, fleet-wide, for every galaxy.

FIX (additive, R8-safe, default-OFF): opt-in opts.partialDense / env PRISM_GALAXY_RAG_PARTIAL_DENSE=1.
When >=2 candidate embeds succeed, rerank the survivors and RRF-fuse against the FULL sparse list
(un-embedded candidates keep sparse-only weight) instead of dropping dense entirely. <2 survivors
-> still bails to sparse. Gate OFF = byte-identical to prior behavior (proven by a no-op test).
One build-once change improves the RAG hybrid for ALL 34 galaxies (R15 apply-to-all).

TEST: 15/15 (was 12) -- +3 R9 intent tests: graceful-survivor-fusion (happy) + regression-lock
(default still bails to null) + <2-survivors guard + no-op-when-all-succeed.
VALIDATE: live bridge with gate ON -> {ok:true, degraded:false} for quoting (no regression).
Remaining india/sierra design options (prewarm embed model / bound embed concurrency) noted in
reference_quoting_vault_ai_synergy_live_2026_06_11 FINDING 4.
```

## Files touched (3)
- scripts/lib/galaxy-dense-rerank.mjs      | 21 ++++++++++++++++++++-
- scripts/lib/galaxy-dense-rerank.test.mjs | 45 +++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 65 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- till bails to sparse. Gate OFF = byte-identical to prior behavior (proven by a no-op test).
- till bails to null) + <2-survivors guard + no-op-when-all-succeed.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 86e7e6b77ee7`
- Milestone envelope: `mcp-server/data/milestones/AI-SYNERGY-AUDIT-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._