# AI-RL-CONTRACT/U-TSC-OFFLINERL-DOMAIN-MAP — [MAIN-FORCE] [AI-RL-CONTRACT]/U-TSC-OFFLINERL-DOMAIN-MAP (slot:papa->india): apply existing toOutcomeDomain mapper at ledger query (tsc 10->9)

**Commit:** `5f1496509c5e` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T15:13:53-05:00
**Tags:** ai-rl-contract, u-tsc-offlinerl-domain-map, auto-distilled

## Subject
[MAIN-FORCE] [AI-RL-CONTRACT]/U-TSC-OFFLINERL-DOMAIN-MAP (slot:papa->india): apply existing toOutcomeDomain mapper at ledger query (tsc 10->9)

## Body
```
[MAIN-FORCE] [AI-RL-CONTRACT]/U-TSC-OFFLINERL-DOMAIN-MAP (slot:papa->india): apply existing toOutcomeDomain mapper at ledger query (tsc 10->9)

TS2322 at OfflineRLOrchestratorEngine.ts:92 -- raw parsed.domain (RL enum
mill|lathe|wedm|sinker|grinder|welder|general) was passed to
policyExperienceLedgerEngine.query whose domain param is the OutcomeDomain vocab
(...sinker_edm...other, no sinker/general). The file ALREADY had a purpose-built
toOutcomeDomain() mapper (sinker->sinker_edm, general->other, rest passthrough)
documented 'for query()' but never applied. This was a LATENT SILENT BUG: a
sinker/general train request queried a domain string that can never match a stored
tuple -> always-empty experience. Now mapped correctly. 2-arm scrutiny PASS.

Also fixed the pre-existing flaky 'empty experience' test (was failing because the
cwd-shared gitignored state/policy/experience.jsonl had 3 stale mill tuples and the
test never isolated the persistent ledger). Race-free fix per reviewer guidance:
orchestrator now takes a swappable ledger (setLedgerForTest, prod uses the singleton
default) and the test injects a fresh tmpRoot PolicyExperienceLedgerEngine per test
-- NO shared-file wipe (avoids racing businessDispatcherPolicyLedger.test under
fileParallelism). OfflineRL 10/10, PolicyExperienceLedger 20/20, tsc 10->9, 0 new errors.

NOTE (pre-existing, NOT this change, for follow-up): src/__tests__/dispatchers/
businessDispatcherPolicyLedger.test.ts 11/11 fail with 'businessDispatch is not a
function' -- a broken businessDispatcher.js export, unrelated to OfflineRL/the ledger.
```

## Files touched (3)
- mcp-server/src/__tests__/OfflineRLOrchestratorEngine.test.ts | 17 ++++++++++++++-
- mcp-server/src/engines/OfflineRLOrchestratorEngine.ts        | 40 ++++++++++++++++++++++++++++++++--
- 2 files changed, 54 insertions(+), 3 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 5f1496509c5e`
- Milestone envelope: `mcp-server/data/milestones/AI-RL-CONTRACT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._