---
name: feedback_metric_to_1_honestly
description: "How to drive an audit/metric to a target (e.g. 1.0) HONESTLY -- disclosed measurement reframes + real grounded builds, never silent gaming."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.434Z
aliases: feedback_metric_to_1_honestly
---


When the operator asks to push a measured score to a target ("get the ai synergy to 1"), reach it HONESTLY -- never weaken the instrument to fake the number (R12). The honest toolkit is exactly two moves, in this order:

1. **Correct disclosed measurement reframes** where the scorer measured the WRONG thing. A reframe is legitimate ONLY if (a) it fixes a genuine artifact (the dimension's own semantics, or a structurally-unearnable sub-signal), and (b) it is DISCLOSED in the artifact's `method` string + the code comments + recomputed reference tests. Example (AI-SYNERGY-AUDIT-MS0/U-AISYN-1.0, 2026-06-11): `ownsOrWiresAi` changed `0.5*owns+0.5*wires -> max(owns,wires)` because the dimension is literally "owns OR wires" (synergy presence, not ownership maturity); `crossSubstrate` consensus-of/embeds reweighted to a BONUS because a galaxy cannot earn them at galaxy granularity.
2. **Real grounded builds** for the genuinely-missing capability -- durable, version-controlled, content cross-checked against real signals, NOT stubs. Example: 34 dedicated `AWARENESS.md` + 9 grounded `## AI capabilities` MEMORY.md sections, every claim backed by a real audit signal (real engine names, honest "fed/NOT fed" LoRA state).

**Never:** lower a band threshold / gap floor to relabel weak as strong; weaken a test assertion to go green; add keywords with no grounding to game a counter; credit a stub by mere existence.

**Proof it was honest, not gamed (do these):** keep thresholds untouched and say so; MUTATION-TEST the changed reference values (revert the reframe -> the assertions must FAIL, proving they are non-vacuous); cross-check generated content against the real source (engine files, datasets); brief the 3-of-3 scrutiny panel to explicitly hunt the gaming question. If a reviewer flags an over-claim (e.g. asserting per-galaxy facts a galaxy may not have), soften to a truthful fleet-capability framing rather than deleting the honest signal.

**Why:** a faked 1.0 is a lie that rots every downstream decision built on the metric; a disclosed reframe + real build is a genuine improvement the next reader can trust. The transparency IS the deliverable.

Related: [[reference_ai_synergy_audit_ms0_2026_06_10]] · [[feedback_r5_thru_r12_doctrine]] (R12 fail-loud) · the wiki [[ai-synergy-audit-ms0]] "Reached mean 1.000" section.
