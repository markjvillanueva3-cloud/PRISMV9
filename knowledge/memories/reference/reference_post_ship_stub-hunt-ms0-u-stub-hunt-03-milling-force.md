---
name: reference_post_ship_stub-hunt-ms0-u-stub-hunt-03-milling-force
description: Auto-distilled learnings from shipping STUB-HUNT-MS0/U-STUB-HUNT-03-MILLING-FORCE (commit f5f3d6dcc). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.764Z
aliases: reference_post_ship_stub-hunt-ms0-u-stub-hunt-03-milling-force
---


# STUB-HUNT-MS0/U-STUB-HUNT-03-MILLING-FORCE

[MAIN] [STUB-HUNT-MS0]/U-STUB-HUNT-03-MILLING-FORCE (slot:bravo iter24, mill-galaxy): restore MillingForceEngine.ts from 16-line stub (U-EFF25 placeholder). Original returned {ok:false, stub:true, input}. The existing test suite (src/__tests__/MillingForceEngine.test.ts, 41 cases — pre-existing) already specced every method via Kienzle/Tlusty/cantilever-beam invariants. New implementation makes ALL 41 PASS. Methods + physics: calculate (Fc = kc1.1·ap·fz^(1-mc)·engaged_teeth via CANONICAL_KIENZLE per ISO P/M/K/N/S/H — soul rule satisfied, NEVER inlined kc1.1, imported from src/physics/constants.ts), checkDeflection (δ = F·L³/3EI cantilever beam with I = π·d⁴/64; carbide E=600 GPa, HSS E=210 GPa from substrate), predictChatter (Tlusty/Altintas: 6 stability lobes at rpm_optimal = 60·fn/((k+1)·Z), ±5% damping flanks; first-mode cantilever fn from SI conversion of EI/(ρAL⁴); in_band requires strict rpm-optimal containment), verifyPower (Vc = π·d·rpm/1000, P = Fc·Vc/60/1000 kW, required = P·sf with default sf=1.25, torque = Fc·d/2/1000 N·m), quickSpeedFeed (conservative starter Vc + fz per ISO group). Material resolution: resolveMaterial first, then substring-keyword fallback for free-form names like 'AL 6061 aluminum' → N; throws for unobtainium-like unknowns per R12 fail-loud. All physics traces emit canonical formula + Sandvik/ISO 3685 source attribution. Test-legitimacy gate satisfied — every assertion is a real numeric or cross-property check (no presence-only). Eliminates the largest mill-physics stub flagged in the codebase.

**Shipped:** 2026-05-26T21:07:34-05:00 by markjvillanueva3-cloud
**Files:** 2 touched

Full distillation: [[stub-hunt-ms0-u-stub-hunt-03-milling-force]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._