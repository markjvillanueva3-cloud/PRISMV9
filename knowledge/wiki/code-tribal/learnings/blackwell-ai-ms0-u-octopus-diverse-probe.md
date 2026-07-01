# BLACKWELL-AI-MS0/U-OCTOPUS-DIVERSE-PROBE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-AI-MS0]/U-OCTOPUS-DIVERSE-PROBE (slot:india): wire the octopus DIVERSE-PANEL branch to the cap-probe oracle (R15 apply-to-all-branches)

**Commit:** `f3f33d756e40` · **By:** markjvillanueva3-cloud · **At:** 2026-06-08T11:24:58-05:00
**Tags:** blackwell-ai-ms0, u-octopus-diverse-probe, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-AI-MS0]/U-OCTOPUS-DIVERSE-PROBE (slot:india): wire the octopus DIVERSE-PANEL branch to the cap-probe oracle (R15 apply-to-all-branches)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-AI-MS0]/U-OCTOPUS-DIVERSE-PROBE (slot:india): wire the octopus DIVERSE-PANEL branch to the cap-probe oracle (R15 apply-to-all-branches)

U-OCTOPUS-PANEL (c1b40183c1) wired the octopus LEGACY branch to the capability probe but left the diverse-panel branch consulting only listModels() + a size-ranked pickBestOllamaModel fallback. This closes that gap — both octopus branches now gate on the single cap-probe oracle.

resolveDiverseOllamaPanel gains an OPTIONAL 3rd param runnable?: readonly string[] (the probe runnableModelIds = present + fits VRAM + runsOn host):
- present → intersect the active panel with it (drops installed-but-not-runnable-now models) + empty-panel fallback prefers a usable+installed runnable model over the size-only heuristic. Request order preserved (filter iterates the panel).
- undefined → BYTE-IDENTICAL to the prior 2-arg behavior (full back-compat; pinned by an equality test).
- INTENTIONAL fail-OPEN: empty [] treated as undefined (no probe signal), NOT seat-nothing. The probe is a VRAM-FIT oracle not a can-execute oracle — it returns [] on cloud_only/CPU hosts (where Ollama runs on CPU) + the documented WDDM free-VRAM artifact (96GB idle card reporting [] runnable). Honoring [] literally would silence the local voice on every GPU-less host. callOllama's real load attempt is the final authority.

Call site (ask diverse branch): probe() in try/catch → snap.runnableModelIds; probe-fail → undefined → install-gate-only. 5-min probe cache shared with the legacy branch's getBest* (no extra cold I/O on repeat asks).

Tests (106/106 green, tsc clean): +6 resolveDiverseOllamaPanel (back-compat equality, intersection-drop, request-order, probe-fallback, daemon-down-probe-authoritative, empty-[]-fail-open) + 1 MMCE integration (diverse panel gated by probe runnableModelIds through ask(), negative-asserts a present-but-not-runnable model is dropped).

2-reviewer per-file scrutiny PASS. Fixed reviewer P1 (test name asserted opposite of its body — renamed to honest empty-[] contract, the R9 trap) + P2-A (mock cast as-unknown-as → satisfies CapabilitySnapshot, compile-time shape check) + P2-B (JSDoc documents the empty-[] fail-open semantic). Both octopus selectors (legacy + diverse) now share one chat-capability rule + one capability oracle.
```

## Files touched (4)
- mcp-server/src/__tests__/MultiModelConsensusEngine.test.ts        | 44 +++++++++++++++++++++++++++++++++++++++++++-
- mcp-server/src/__tests__/MultiModelConsensusOllamaResolve.test.ts | 54 ++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/MultiModelConsensusEngine.ts               | 50 ++++++++++++++++++++++++++++++++++++++++++++++----
- 3 files changed, 143 insertions(+), 5 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f3f33d756e40`
- Milestone envelope: `mcp-server/data/milestones/BLACKWELL-AI-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._