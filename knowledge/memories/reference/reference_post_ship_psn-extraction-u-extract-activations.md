---
name: reference_post_ship_psn-extraction-u-extract-activations
description: Auto-distilled learnings from shipping PSN-EXTRACTION/U-EXTRACT-ACTIVATIONS (commit 6b3764c87). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.993Z
aliases: reference_post_ship_psn-extraction-u-extract-activations
---


# PSN-EXTRACTION/U-EXTRACT-ACTIVATIONS

[MAIN] [PSN-EXTRACTION]/U-EXTRACT-ACTIVATIONS (slot:golf iter16): canonical 17-function neural-network activation library extracted from extracted_modules/ai_ml_engines/PRISM_ACTIVATIONS_ENGINE.js. Verified zero pre-existing implementation in src/engines/ or src/algorithms/ (grep returned 0 hits for relu/sigmoid/tanh/softmax). Ships ActivationFunctionsAlgorithm.ts with static class + 17 activations + 9 derivatives + numerical-stability hardening (sigmoid clamps to ±500, softplus x>20 shortcut, softmax max-shift). 29/29 vitest PASS covering canonical values + derivative-finite-difference consistency + extreme-input stability + apply() dispatcher + fail-loud on unknown name. Source: MIT 6.036 + Stanford CS 231N. Genuine high-ROI gap closure for ML/DL subsystems.

**Shipped:** 2026-05-24T14:50:02-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[psn-extraction-u-extract-activations]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._