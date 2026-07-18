---
name: feedback_build_comprehensive_route
description: "Standing rule (FLEET-WIDE, all slots/galaxies): at any build crossroads — pick the MOST COMPREHENSIVE route, never the shortcut. No stubs, no partials, no 'good enough', no deferring the hard half. The thorough option is the default; a lesser option needs explicit operator scope-down."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.416Z
aliases: feedback_build_comprehensive_route
---


**Standing rule (operator directive 2026-05-29): at a build crossroads, ALWAYS build the most comprehensive route. NO SHORTCUTS EVER. FLEET-WIDE — every slot, every galaxy.**

Whenever a build presents options — a quick path vs a thorough one, a stub vs a real implementation, "cover the happy case" vs "cover all cases", "wire one consumer" vs "wire every consumer", "approximate" vs "exact physics" — the comprehensive route is the **default**, not a nice-to-have. The lesser option is only acceptable when the operator **explicitly** scopes the work down (e.g. writes `[SCOPED]`).

**Why:** shortcuts are debt that compounds. A stub becomes a silent gap a downstream chat trusts; a half-covered edge case becomes a field failure; "good enough" physics becomes a wrong number a machinist runs. The comprehensive route costs more now but is the only route that actually closes the task — anything less is a future re-open plus the cost of discovering it was incomplete. The whole fleet inherits each chat's shortcuts, so one shortcut multiplies across slots. PRISM's expert-role mandate ("never good enough — optimal with justification") and the comprehensive-build-enforce hook both encode this; this rule makes it an explicit, fleet-wide build-decision default.

**How to apply (at every crossroads):**
1. **Name the options out loud**, then pick the most thorough one by default. Only ask the operator if the comprehensive route has a real, material cost the operator should weigh — never to seek permission to take a shortcut.
2. **No stubs / placeholders / `?.()??"not-callable"` sentinels / `toBeDefined()` tests** — they are the canonical shortcut and are hook-rejected anyway.
3. **Exact over approximate** when the data exists (real physics, canonical constants, byte-equivalence — not a fudge factor). Faithful port over "close enough".
4. **Cover the whole surface**: happy path + all failure modes + adversarial inputs + the spanning configurations (materials/dialects/machines), and wire to EVERY consumer, not just one.
5. **Don't defer the hard half.** If a unit has an easy part and a hard part, the hard part is still in scope. "Deferred to follow-up" is only legitimate with explicit operator scope-down.
6. **Pairs with:** [[feedback_build_in_logical_order]] (build the comprehensive route IN dependency order) + [[feedback_always_build]] (never skip) + [[feedback_always_close_out]] (finish) + [[feedback_mathematical_exhaustive_completeness]] (CIs not scalars, exhaust the surface). Comprehensive-route answers *which option*; logical-order answers *what sequence*.
