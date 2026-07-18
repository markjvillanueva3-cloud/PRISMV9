# OCTOPUS/U-ZULU-PROBE-RESIDENT-CREDIT — [MAIN-FORCE] [OCTOPUS]/U-ZULU-PROBE-RESIDENT-CREDIT (slot:zulu): credit /api/ps-resident models as 0-marginal in the capability probe -- fixes the octopus chronic single-voter (a big resident voice was dropped when free VRAM < its nominal size)

**Commit:** `8eb9d4dadfa5` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T21:24:44-05:00
**Tags:** octopus, u-zulu-probe-resident-credit, auto-distilled

## Subject
[MAIN-FORCE] [OCTOPUS]/U-ZULU-PROBE-RESIDENT-CREDIT (slot:zulu): credit /api/ps-resident models as 0-marginal in the capability probe -- fixes the octopus chronic single-voter (a big resident voice was dropped when free VRAM < its nominal size)

## Body
```
[MAIN-FORCE] [OCTOPUS]/U-ZULU-PROBE-RESIDENT-CREDIT (slot:zulu): credit /api/ps-resident models as 0-marginal in the capability probe -- fixes the octopus chronic single-voter (a big resident voice was dropped when free VRAM < its nominal size)

ROOT CAUSE (verified live 2026-06-25): OllamaCapabilityProbeEngine.#computeRunnable
decided a model was "runnable" iff `nominal vramGB*MIB_PER_GB <= gpu.freeMiB`, with NO
credit for residency. So an ALREADY-LOADED model (in /api/ps) whose nominal size
exceeds current free VRAM was wrongly dropped from runnableModelIds -> resolveDiverse
OllamaPanel intersected it out -> the octopus 2-voice local panel collapsed to 1
whenever one big voice was resident and free < its nominal. A 1-voice "consensus"
agrees with itself (agreement=1) = no real consensus. LIVE proof: with qwen2.5-coder
:32b RESIDENT (54GB) + 24GB free, `octopus-first-live-record --require-min-voices 2`
seated only gpt-oss:20b (meetsFloor:false).

FIX (surgical, OOM-safe): thread a residentIds set (from loadedModels = /api/ps) into
#computeRunnable; a model is runnable if `residentIds.has(id) || needMiB <= freeMiB`.
A resident model costs 0 marginal VRAM -- its bytes are ALREADY subtracted from
gpu.freeMiB on every #correctFreeVram path (plausible/non-win32/ps-unavailable -> raw
nvidia-smi free which excludes used; win32+ps -> total-loaded-reserve), so crediting
it can NEVER double-spend. Non-resident models still require nominal<=free (the OOM
gate for NEW loads is unchanged). Id-mismatch (e.g. :latest) is fail-safe: no credit
-> falls back to the nominal check (no regression).

VALIDATE: 31/31 probe tests (+2: resident-oversize SEATED at free 1528 vs the existing
non-resident-oversize DROPPED; + non-resident-oversize stays dropped = OOM gate intact)
+ 51/51 MultiModelConsensusEngine. Changed files type-clean (the 2 tsc errors in
ReinforcementLearningCAMFeedbackEngine.ts:302/373 are pre-existing, india/kilo). Built
dist (build:fast). LIVE after fix: 2-voice octopus with qwen2.5-coder:32b resident ->
successCount:2 voiceCount:2 meetsFloor:true ok:true. OOM invariant self-verified
against all 4 freeMiB paths (the planned 3-agent adversarial verify was blocked by the
account session limit; self-review substitutes, R12). Pairs with the iter-6 consumer
quorum gate (U-ZULU-CONSENSUS-QUORUM-GATE) -- producer now seats the real panel, consumer
no longer trusts a degraded one.
```

## Files touched (3)
- mcp-server/src/__tests__/OllamaCapabilityProbeEngine.test.ts | 33 +++++++++++++++++++++++++++++++++
- mcp-server/src/engines/OllamaCapabilityProbeEngine.ts        | 14 +++++++++++++-
- 2 files changed, 46 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- wrongly dropped from runnableModelIds -> resolveDiverse
- till require nominal<=free (the OOM

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 8eb9d4dadfa5`
- Milestone envelope: `mcp-server/data/milestones/OCTOPUS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._