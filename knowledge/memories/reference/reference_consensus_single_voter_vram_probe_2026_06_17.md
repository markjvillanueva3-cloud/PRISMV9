---
name: reference_consensus_single_voter_vram_probe_2026_06_17
description: "Octopus consensus drain records SINGLE-voter \"consensus\" (qwen2.5-coder:32b only, flat agreement 0.5) because the capability probe narrows the diverse panel to 1 under fleet free-VRAM contention -- root cause + fix directions"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.530Z
aliases: reference_consensus_single_voter_vram_probe_2026_06_17
---


# Consensus drain is single-voter under fleet VRAM contention (slot:bravo, 2026-06-17)

## Finding (verified live)
Every entry the consensus-queue drain processes records **voters=[qwen2.5-coder:32b]** only,
with a flat `agreement=0.5` (6/6 recent processed entries; ledger
`state/shared/consensus-queue-processed.jsonl`). A "consensus" with ONE voice is not consensus --
the overnight AI-learning corpus the drain feeds is low-information until this is fixed.

## Root cause (NOT a missing model)
Both panel models ARE installed (`/api/tags`: `qwen2.5-coder:32b` ✓, `gpt-oss:20b` ✓, `gpt-oss:120b` ✓).
The drain (`.claude/scripts/consensus-queue-drain.mjs`) requests the diverse panel
`["qwen2.5-coder:32b","gpt-oss:20b"]` (`buildDrainVoiceBound`, diverseLocalPanel:true). In
`MultiModelConsensusEngine.ask()` (`mcp-server/src/engines/MultiModelConsensusEngine.ts:520+`):
`ollamaVoices = resolveDiverseOllamaPanel(diverseModels, installedOllama, runnableIds)` where
`runnableIds = ollamaCapabilityProbeEngine.probe().runnableModelIds`. `resolveDiverseOllamaPanel`
(`:377`) intersects the request with the probe's **FREE-VRAM runnable set**:
`active = requested.filter(m => installed.includes(m) && usable(m) && (!runnableSet || runnableSet.has(m)))`.
Under the 8-chat fleet, free VRAM is contended, so the probe reports only `qwen2.5-coder:32b`
fits *right now* and **drops `gpt-oss:20b`** -> single voter. The probe checks FREE VRAM, not the
card's 96GB TOTAL -- yet 37GB (qwen) + 13GB (gpt-oss:20b) = 50GB easily co-resides in 96GB; Ollama
would EVICT+load the 2nd as needed. The engine comment itself says "the install-gate + callOllama's
real load attempt is the final authority" -- but a NON-EMPTY runnable set still narrows.

## DISPROVEN drain-local fix (TRIED + REVERTED 2026-06-17 -- do NOT retry the dual-pin)
**Hypothesis:** bypass the probe by PINNING both voices via the dual-Ollama path
(`ollamaModel:"qwen2.5-coder:32b" + secondaryOllamaModel:"gpt-oss:20b" + dualOllama:true`) -- explicit
pins skip the probe, `resolveOllamaModels` keeps both, the engine serial-calls both -> 2 voters.
**RESULT (direct `engine.ask()` diagnostic):** the dual-pin DID seat both voices, but
`qwen2.5-coder:32b ok=true ("OK")` while `gpt-oss:20b ok=false err=TIMEOUT` -- the 13GB non-resident
model cannot cold-load + generate within the 90s timeout while the 8-chat fleet hammers the GPU. So it
STILL yields voters=1 **and wastes ~90s/entry** timing out. The probe's drop was CORRECT; the dual-pin
is a regression. **Reverted** -- `diverseLocalPanel` (fast graceful single-voter under contention) is
the right behavior; this is now documented inline in `buildDrainVoiceBound()` so it is not retried.

## Real fix directions (deferred -- the bottleneck is GPU CONTENTION + cold-load latency, not the code path)
1. **Idle-window scheduling:** run the multi-voice drain when the fleet GPU is idle (few active chats),
   so gpt-oss:20b has the headroom to cold-load + respond. The single-voter degradation only happens
   under contention; an idle drain would naturally get 2 voices.
2. **Prewarm + keep-alive:** keep BOTH panel models resident (`OLLAMA_KEEP_ALIVE` + a prewarm hit) so
   the 2nd voice answers fast. RISK: force-loading 50GB competes with the other chats' models -- unsafe
   unattended at night.
3. **Longer secondary timeout:** raise `timeoutMs` past the cold-load latency (e.g. 180s). Makes each
   entry slow (3+ min) and is still contention-unreliable. Marginal.

## RESOLVED 2026-06-17 -- the real root cause was a STALE PROBE CACHE (forceProbe is the fix)
Later the same session, live diagnosis SUPERSEDED the "GPU-contention-bound / deferred" framing above.
The drain read `ollamaCapabilityProbeEngine`'s **5-MINUTE CACHE**. A stale snapshot taken during fleet
contention (when gpt-oss:20b did not fit free VRAM) kept DROPPING gpt-oss:20b even AFTER the GPU went
idle -> a PERMANENT single-voter. Proof: on a fully idle GPU (~95GB free) the drain STILL recorded
voters=1, but `engine.ask({diverseLocalPanel, forceProbe:true})` recorded BOTH ok=true. So it was never
"the probe is right to drop it" (U-DRAIN-PROBE-IS-RIGHT was INCOMPLETE) -- the probe was reading STALE data.

**FIX (shipped U-DRAIN-FORCEPROBE-2VOICE):** `buildDrainVoiceBound` sets `forceProbe:true` -> every drain
re-probes FRESH. Idle GPU -> both seat -> real 2-voice (live: participants=[qwen2.5-coder:32b, gpt-oss:20b],
both ok=true, they disagreed agree~0.03 -> rec=escalate, the HEALTHY multi-voice signal). Contention -> the
fresh probe gracefully drops the unloadable 2nd voice -> fast 1-voice (NOT the disproven dual-pin timeout).
**Observability:** appendProcessed now records `consensus_participants` (models that ANSWERED) distinct from
`consensus_voters` (winning cluster) -- so the ledger tells real 2-voice DISAGREEMENT (>=2 participants) from
the single-voter bug (1). Overnight = mostly idle -> the octopus corpus now compounds real multi-model consensus.

## Lesson
A capability/feature probe with a TTL cache can silently pin a WRONG decision long after the world changed
(here: a contention-era VRAM snapshot suppressing a voice on an idle GPU). For a latency-tolerant batch job
that wants the CURRENT capability, force a fresh probe. And record PARTICIPANTS, not just the winning cluster,
or healthy disagreement is indistinguishable from a degenerate single-voice bug.
Related: [[reference_consensus_drain_local_2026_06_09]] · [[reference_consensus_drain_scaling_2026_06_09]].
