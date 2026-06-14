---
name: reference_post_ship_blackwell-ai-ms0-u-cap-probe
description: Auto-distilled learnings from shipping BLACKWELL-AI-MS0/U-CAP-PROBE (commit 86716f4aa). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.294Z
aliases: reference_post_ship_blackwell-ai-ms0-u-cap-probe
---


# BLACKWELL-AI-MS0/U-CAP-PROBE

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-AI-MS0]/U-CAP-PROBE (slot:india): OllamaCapabilityProbeEngine — runtime host capability probe (keystone). The I/O layer ModelRoutingEngine (pure scorer) delegates: detects HardwareProfile from nvidia-smi, lists present/loaded models from Ollama /api/tags+/api/ps, computes runnable set, feeds route() via toRoutingContext/routableCatalog so route() can NEVER pick an absent model (the deepseek-r1:14b problem). WDDM-aware free VRAM (Windows-only correction + ps-null conservative fallback — verified: nvidia-smi free unreliable on WDDM). Fail-soft, injectable readers/platform/clock. Wired prism_ai:capability_probe (type-enforced exhaustive). 19 tests (happy+WDDM+3 failure modes+adversarial+4-profile+cache+route-roundtrip+real-data E2E+dispatcher roundtrip+2 P1-fix). 2-reviewer per-file scrutiny PASS, 2 P1s fixed. tsc-clean (my files).

**Shipped:** 2026-06-03T14:27:30-05:00 by markjvillanueva3-cloud
**Files:** 4 touched

Full distillation: [[blackwell-ai-ms0-u-cap-probe]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._