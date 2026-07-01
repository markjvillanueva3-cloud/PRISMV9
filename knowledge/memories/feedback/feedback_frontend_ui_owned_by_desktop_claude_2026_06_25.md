---
name: feedback_frontend_ui_owned_by_desktop_claude_2026_06_25
description: "Operator 2026-06-25 FLEET-WIDE: front-end UI design is now owned by Claude in the Claude DESKTOP APP, not the build slots. Backend slots (esp. oscar/SFC) focus ONLY on testing calculations + backend correctness/100% accuracy. Also: the PRISM name is being rebranded (Sandvik owns 'PRISM')."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.426Z
aliases: feedback_frontend_ui_owned_by_desktop_claude_2026_06_25
---


**Operator directive 2026-06-25 (FLEET-WIDE):** "claude design in the claude desktop app is now handling front end ui design. we had to change names and design due to sandvik already owning the prism name. therefore focus on testing calculations and making sure everything back end is built properly and 100% accurrate."

**What changed:**
- **Front-end UI design → owned by Claude in the Claude DESKTOP APP.** The Claude Code build slots (oscar and the fleet) should NOT spend effort building/finishing front-end UI, the SFC web page UI, or the electron/iOS/Android shells. That surface is now driven from the desktop-app Claude design workflow. This SUPERSEDES the 2026-06-18 grant that let oscar own the SFC web/page/electron/mobile build ([[reference_oscar_sfc_frontend_build_plan_2026_06_18]], [[sfc-frontend-ownership-u-sfc-fe-degate]]) — UI design moved out of the slots.
- **Rebrand:** the "PRISM" name is owned by Sandvik, so the product is being renamed (names + design changed in the desktop-app side). This is INFORMATIONAL — do NOT execute a repo-wide rename unless the operator explicitly scopes it; the codebase/dispatchers/`prism_*` keep working. Just don't assume "PRISM" is the customer-facing brand.

**Why:** clear division of labor — desktop-app Claude does design/UI; Claude Code slots do backend engineering + verification. Avoids two surfaces fighting over the same frontend.

**How to apply (backend slots, esp. oscar):**
- PRIORITIZE: testing the calculations (exhaustive logical input/cutting-parameter combinations vs ALL JM Die parts + programs — amateur JM speeds/feeds are the GUIDELINE to test against, not trusted truth), backend correctness, wiring, and proving 100% accuracy. Closed-loop gauntlet (`sfc-variability-*`, `sfc-jm-*`), crons that never stop, Ollama/Hermes offload, parallel agents, harnesses.
- DE-EMPHASIZE: front-end build/UI work + the electron/ios/android shells (desktop-app Claude / quebec app-infra own those). A backend fix surfaced THROUGH the frontend (e.g. an API route or dispatcher defect the web page hits) is STILL backend work and in scope — see [[reference_oscar_sfc_product_bridge_2026_06_25]] (the SFC web calc was 100% blocked by a backend dispatcher gate; that was ours to fix).
