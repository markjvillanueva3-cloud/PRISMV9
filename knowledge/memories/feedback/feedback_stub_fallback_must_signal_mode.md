---
name: feedback_stub_fallback_must_signal_mode
description: Any engine that gracefully degrades to a stub/default MUST expose a machine-readable mode flag + honest headline -- never pose stub output as a real answer (R12 engine-output sibling)
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.446Z
aliases: feedback_stub_fallback_must_signal_mode
---


# An engine that falls back to a stub MUST signal stub-vs-real in its output

When an engine/pipeline gracefully degrades to a stub/placeholder/default (because a real dependency isn't wired/available yet), it MUST: (1) expose a **machine-readable mode flag** in its output so consumers can branch on it; (2) make the **headline/primary field honest** in degraded mode -- never format placeholder output with the same confident wording as a real result; (3) ship the fix **additive** so real-path consumers/tests are untouched.

**Why:** A graceful-degradation stub that returns its output in the SAME shape + wording as a real answer is a silent-trust hazard. Consumers (and humans reading the headline) trust a lie. Verified live 2026-06-23: `CrossProcessHierarchicalNeuralOrchestratorEngine.orchestrate()` ran a `defaultInvoker` placeholder echo whenever no `tier_invoker` was supplied but returned `primary_answer.headline = "Primary answer from T8-03 at confidence X"` -- and because functions can't cross the MCP/JSON boundary, EVERY `prism_intelligence`/`aiReasoning` consumer always hit the stub and silently trusted echoes. This is the engine-output sibling of R12 "fail loud": "here is the answer" is a lie if the answer is a stub.

**How to apply:** Add the mode flag (`fan_out_mode`/`source`/`degraded:true`) + honest degraded headline in the SAME commit as any stub fallback. Keep it additive (existing real-path tests stay green; add tests pinning each mode). The real dependency's wiring must be done where it CAN be (e.g. engine-side construction, not caller-passed over MCP). The flag then doubles as a live progress metric for the deferred real-wiring unit. Shipped as U-XPROC-ORCH-FANOUT-HONESTY (`884542bc`); wiki [[stub-fallback-must-signal-mode-not-pose-as-real]]; sibling honesty pattern [[gnn-selective-deploy]] (abstain-below-gate). Related: [[feedback_read_full_content_not_titles]] (existence != working).
