# OCTOPUS-HERMES-MULTIMODEL/U-ALPHA-OCT-MULTIMODEL — [MAIN-FORCE] [OCTOPUS-HERMES-MULTIMODEL]/U-ALPHA-OCT-MULTIMODEL (slot:alpha): octopus consensus now seats N DISTINCT Hermes-Grok models as separate voices (was exactly 1)

**Commit:** `2b990d785dc9` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T15:12:00-05:00
**Tags:** octopus-hermes-multimodel, u-alpha-oct-multimodel, auto-distilled

## Subject
[MAIN-FORCE] [OCTOPUS-HERMES-MULTIMODEL]/U-ALPHA-OCT-MULTIMODEL (slot:alpha): octopus consensus now seats N DISTINCT Hermes-Grok models as separate voices (was exactly 1)

## Body
```
[MAIN-FORCE] [OCTOPUS-HERMES-MULTIMODEL]/U-ALPHA-OCT-MULTIMODEL (slot:alpha): octopus consensus now seats N DISTINCT Hermes-Grok models as separate voices (was exactly 1)

The operator goal: "enhance octopus to utilize hermes agents running through
DIFFERENT models with the xAI api key the backbone." Octopus already seated ONE
Grok voice via the free local Hermes OAuth proxy (:8645) since OCTOPUS-HERMES-SYNERGY
(e3080308e8). This extends it to seat ONE voice per DISTINCT Grok model so a single
consensus run gets genuine cross-MODEL diversity at $0 (the operator's managed OAuth).

WIRE (6 source files, all additive / default byte-identical):
- MultiModelConsensusEngine.ts: new exported pure normalizeHermesGrokModels (trim/dedupe
  -- dedupe prevents double-weighting one voice, R7); ConsensusInput.hermesGrokModels?:
  readonly string[]; the ask() grok-voice branch seats one callGrokHermesVoice per distinct
  model ONLY when the list is non-empty AND hermesProxyReachable() (memoized; free without
  the proxy), else the single legacy callGrok (byte-identical). callGrokHermesVoice pins the
  exact model through execViaHermesProxy, fail-soft -> errResponse. Mirrors the diverse-local
  Ollama panel idiom (multiple same-vendor voices).
- octopus-dispatch.mjs (mapConsensusToLedger): GENERALIZED the ollama-only model-tagging --
  now tags vendor:model when a vendor fields 2+ voices, so 2 xai voices -> 2 distinct
  "xai:<model>" ledger ids (single xai stays bare "xai", back-compat; ollama always-tagged).
  Without this the ledger collapsed both Grok voices to "xai" -- silently defeating the goal.
- octopus-first-live-record.mjs (buildLocalOnlyAskOverrides + runLive): thread hermesGrokModels;
  key OMITTED when empty (byte-identical default).
- octopus-utilization-driver.mjs (parseArgs + runUtilizationTick + one-off): new
  --hermes-models a,b,c flag; a non-empty list AUTO-ENABLES the Grok voice.
- install-octopus-utilization-task.ps1: new -HermesModels param so the continuous cron CAN
  drive the multi-model panel (default empty = byte-identical registration).

TEST (18/18): 5 mapper + 7 wiring round-trip + 6 engine normalize. Real reference-value asserts.

VALIDATE (LIVE, $0): real runLive -> dispatch -> src engine via tsx against the live Hermes
proxy. ok:true successCount:3 -- ledger (state/shared/octopus-runs.jsonl) shows 2 DISTINCT Grok
models: ["xai:grok-4.3","xai:grok-4.20-0309-reasoning"] + a local ollama voice. Loss function MET.

R12 caveat: SOURCE + tested + tsx-live-validated. The cron loads the COMPILED dist engine which
is STALE; the multi-model panel goes live for the scheduled task on the next routine fleet
`npm run build` (a full rebuild now risks disrupting ~25 live peers -- same deferral as
OCTOPUS-HERMES-SYNERGY). Until then it fail-softs to a single legacy Grok voice.

2-arm per-file scrutiny PASS (reviewer + code-analyzer); only P2 = the documented dist deferral.
```

## Files touched (9)
- .claude/helpers/install-octopus-utilization-task.ps1           | 12 +++++++
- mcp-server/src/__tests__/MultiModelConsensusMultiModel.test.ts | 51 ++++++++++++++++++++++++++++
- mcp-server/src/engines/MultiModelConsensusEngine.ts            | 78 +++++++++++++++++++++++++++++++++++++++++-
- scripts/lib/octopus-dispatch-multimodel.test.mjs               | 92 ++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/octopus-dispatch.mjs                               | 28 ++++++++++-----
- scripts/octopus-first-live-record.mjs                          | 15 +++++++-
- scripts/octopus-multimodel-wiring.test.mjs                     | 75 ++++++++++++++++++++++++++++++++++++++++
- scripts/octopus-utilization-driver.mjs                         | 22 ++++++++++--
- 8 files changed, 360 insertions(+), 13 deletions(-)

## Lessons surfaced in commit body
- tilize hermes agents running through
- tilization-driver.mjs (parseArgs + runUtilizationTick + one-off): new
- tilization-task.ps1: new -HermesModels param so the continuous cron CAN
- til then it fail-softs to a single legacy Grok voice.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 2b990d785dc9`
- Milestone envelope: `mcp-server/data/milestones/OCTOPUS-HERMES-MULTIMODEL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._