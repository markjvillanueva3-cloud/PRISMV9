# BLACKWELL-AI-MS0/U-CAP-PROBE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-AI-MS0]/U-CAP-PROBE (slot:india): OllamaCapabilityProbeEngine — runtime host capability probe (keystone). The I/O layer ModelRoutingEngine (pure scorer) delegates: detects HardwareProfile from nvidia-smi, lists present/loaded models from Ollama /api/tags+/api/ps, computes runnable set, feeds route() via toRoutingContext/routableCatalog so route() can NEVER pick an absent model (the deepseek-r1:14b problem). WDDM-aware free VRAM (Windows-only correction + ps-null conservative fallback — verified: nvidia-smi free unreliable on WDDM). Fail-soft, injectable readers/platform/clock. Wired prism_ai:capability_probe (type-enforced exhaustive). 19 tests (happy+WDDM+3 failure modes+adversarial+4-profile+cache+route-roundtrip+real-data E2E+dispatcher roundtrip+2 P1-fix). 2-reviewer per-file scrutiny PASS, 2 P1s fixed. tsc-clean (my files).

**Commit:** `86716f4aaf84` · **By:** markjvillanueva3-cloud · **At:** 2026-06-03T14:27:30-05:00
**Tags:** blackwell-ai-ms0, u-cap-probe, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-AI-MS0]/U-CAP-PROBE (slot:india): OllamaCapabilityProbeEngine — runtime host capability probe (keystone). The I/O layer ModelRoutingEngine (pure scorer) delegates: detects HardwareProfile from nvidia-smi, lists present/loaded models from Ollama /api/tags+/api/ps, computes runnable set, feeds route() via toRoutingContext/routableCatalog so route() can NEVER pick an absent model (the deepseek-r1:14b problem). WDDM-aware free VRAM (Windows-only correction + ps-null conservative fallback — verified: nvidia-smi free unreliable on WDDM). Fail-soft, injectable readers/platform/clock. Wired prism_ai:capability_probe (type-enforced exhaustive). 19 tests (happy+WDDM+3 failure modes+adversarial+4-profile+cache+route-roundtrip+real-data E2E+dispatcher roundtrip+2 P1-fix). 2-reviewer per-file scrutiny PASS, 2 P1s fixed. tsc-clean (my files).

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-AI-MS0]/U-CAP-PROBE (slot:india): OllamaCapabilityProbeEngine — runtime host capability probe (keystone). The I/O layer ModelRoutingEngine (pure scorer) delegates: detects HardwareProfile from nvidia-smi, lists present/loaded models from Ollama /api/tags+/api/ps, computes runnable set, feeds route() via toRoutingContext/routableCatalog so route() can NEVER pick an absent model (the deepseek-r1:14b problem). WDDM-aware free VRAM (Windows-only correction + ps-null conservative fallback — verified: nvidia-smi free unreliable on WDDM). Fail-soft, injectable readers/platform/clock. Wired prism_ai:capability_probe (type-enforced exhaustive). 19 tests (happy+WDDM+3 failure modes+adversarial+4-profile+cache+route-roundtrip+real-data E2E+dispatcher roundtrip+2 P1-fix). 2-reviewer per-file scrutiny PASS, 2 P1s fixed. tsc-clean (my files).
```

## Files touched (4)
- mcp-server/src/__tests__/OllamaCapabilityProbeEngine.test.ts |  377 ++++
- mcp-server/src/engines/OllamaCapabilityProbeEngine.ts        |  453 ++++
- mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts    | 8279 ++++++++++++++++++++++++++++++++++----------------------------------
- 3 files changed, 5004 insertions(+), 4105 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 86716f4aaf84`
- Milestone envelope: `mcp-server/data/milestones/BLACKWELL-AI-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._