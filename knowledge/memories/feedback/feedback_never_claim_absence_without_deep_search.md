---
name: feedback-never-claim-absence-without-deep-search
description: "NEVER assert 'X does not exist in <folder>' without a FULL Glob enumeration of that folder first. On 2026-06-10 delta repeatedly claimed 'no turbine/blisk reference model exists in resources/' as a goal BLOCKER -- based only on a shallow `find | head -10` + a rate-limited Workflow that returned nothing. A single `Glob **/*.stp` on H:/PRISM/resources/CAD FILES instantly found blisk.stp (4.9MB), Impeller turbine.stp (3MB), TURBO SLD.step, assembly of jet.STEP (44MB), ROTOR SHAFT.STEP, AEROSPACE VALVE BODY.STP. The false-absence claim wasted multiple loop iterations. ALSO: the 'ollama-searches-first' path was NOT used because the Ollama daemon was DOWN (:11434) and the routing SILENTLY falls back to Claude."
type: feedback
slot: delta
source: prism-memory
synced: 2026-06-27T20:30:46.435Z
aliases: feedback_never_claim_absence_without_deep_search
---


# Never claim a file/asset is ABSENT without a full deep search first (2026-06-10, slot:delta)

## What happened (the failure)
During the autonomous /goal "prove a 100%-accurate turbine/blisk vs a resource-folder reference", delta repeatedly asserted -- as the load-bearing BLOCKER -- that "no turbine/blisk reference model exists in resources/". This was FALSE and UNVERIFIED. Evidence base for the false claim: a shallow `find ... | head -10` (early) + a rate-limited ultracode Workflow whose resource-targets agent returned nothing (throttled). I never ran a plain `Glob` on the folder. When the operator pushed back ("what can we do to fix you not searching deep enough?") a single `Glob **/*.{stp,step}` on `H:/PRISM/resources/CAD FILES` instantly returned:
- **blisk.stp (4,908,613 B)** <- a literal blisk
- **Impeller turbine.stp (3,030,548 B)** <- turbine impeller
- TURBO SLD.step (3.9MB), assembly of jet.STEP (44MB), ROTOR SHAFT.STEP (2MB), AEROSPACE VALVE BODY.STP
The reference models were there the whole time. The false-absence claim mis-scoped the goal as "environment-gated / needs operator to provide a reference" for multiple iterations.

## Why (root causes)
1. **Shallow search + asserted absence.** `head -10` truncates; a throttled Workflow returning nothing is NOT evidence of absence. Treating "I didn't find it" as "it doesn't exist" violates the honesty rule (verify before claiming; "I don't know / I didn't check" beats a confident false claim).
2. **Ollama-first search path was dark.** The hardcoded "ollama searches first for free" routing (ask-ollama / route-suggest / CAG-router) did NOT fire because the Ollama daemon was DOWN (`:11434 UNREACHABLE`). When it's down the routing SILENTLY falls back to Claude (Stop hook warns "silently falling back to Claude -- token-economy degraded"). The silent fallback hid that the free path wasn't running.

## How to apply (the fix)
1. **Before claiming any asset is absent from a folder/scope: `Glob **/*.{ext}` the FULL tree (no head-N).** Report the count. "Not found in a head-10 / a throttled agent" is NEVER "does not exist." [[feedback_enumerate_before_read]] is the sibling rule.
2. **Search tool order:** Glob (free, exhaustive file enumeration) FIRST -> Ollama for semantic/content classification of the hits (when daemon up) -> Claude only for synthesis. File ENUMERATION is a Glob job, not an LLM job.
3. **Make the ollama-down fallback LOUD, not silent.** When `:11434` is unreachable, the route should surface "ollama down -> using Claude (degraded)" so the operator/agent knows the free path isn't available -- and restart the "PRISM Ollama Serve" task. Silent fallback = invisible token burn + the operator's assumption ("ollama searches first") silently violated.

## Consequence for the CAD goal
The turbine/blisk reference EXISTS (blisk.stp 4.9MB). The "no reference" blocker is GONE -- the closed-loop-vs-REAL-reference proof (extractMetrics(blisk.stp) as target -> converge BliskCADEngine spec to match, or compare a generated blisk) is now headless-achievable once memory pressure clears. Corrects [[reference_delta_blisk_closed_loop_converged_2026_06_10]] + [[reference_delta_closed_loop_measure_proven_2026_06_10]] which wrongly said "no confirmed blisk reference in resources/".

See [[feedback_enumerate_before_read]] · [[feedback_use_lima_pypdf_page_extractor]] · the Ollama-down silent-fallback gap.
