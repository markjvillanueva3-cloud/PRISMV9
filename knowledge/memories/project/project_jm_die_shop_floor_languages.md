---
name: project-jm-die-shop-floor-languages
description: "JM Die Company test shop — majority of floor operators speak Polish or Spanish, not English-first. Operator-facing PRISM surfaces must localize."
type: project
source: prism-memory
synced: 2026-06-27T20:30:46.458Z
aliases: project_jm_die_shop_floor_languages
---


The majority of JM Die's shop-floor operators speak Polish or Spanish as their primary language. English-only operator-facing PRISM features will under-serve most of the shop.

**Why:** JM Die is PRISM's canonical test shop (24,545 files / 100+ customer programs / 21 machines). Every operator-facing capability we build — shop-floor query, voice assistants, alarm displays, setup sheets, tribal-knowledge capture prompts, traveler docs, ergonomic guidance, error explanations — gets validated against this shop first. If the operator can't read it, the validation is performative. The operator demographic was surfaced directly by the operator on 2026-05-27 during the JM Die folder-consolidation session; treat it as ground truth.

**How to apply:**
- New operator-facing UI strings → flag for i18n at design time (en + pl + es minimum). Don't ship English-only and "translate later" — that locks the test-shop UX as second-class.
- Voice-assistant features → must accept and respond in Polish + Spanish (not just English). Wake words and TTS voices need locale coverage.
- Tribal-knowledge capture forms → accept any-language input; let the AI translate at storage time so the operator's words aren't lost in translation.
- Alarm / safety-critical strings → translate FIRST (Polish + Spanish before English ships), because the safety stakes are highest where comprehension is lowest.
- Setup sheets / travelers / drawings annotations → support side-by-side English + (pl|es) rendering, operator's choice.
- Quote-to-ship workflows facing the shop floor (not the customer) → same rule.
- Customer-facing surfaces (quotes, sales decks, ERP exports) → English-first is fine; those are read by office staff, not the floor.

Related: [[customer-air-industries-company]] · [[reference_jm_die_shop_floor_languages_demographics]] (if extended later) · CLAUDE.md §TEST SHOP — JM Die Company · `mcp-server/src/engines/ShopConfigurationEngine.ts` · `knowledge/wiki/reference/jm-die-profile.md`.
