---
name: feedback_any_domain_fallback_slots
description: "9 slots (alpha, bravo, golf, sierra, zulu, india, papa, romeo, xray) expand to work ANY domain when their own domain queue is dry, instead of idling. Operator override 2026-06-18 of the 'no work outside domain' rule. The other 17 slots stay domain-bound on fallback."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.398Z
aliases: feedback_any_domain_fallback_slots
---


**ANY-DOMAIN FALLBACK SLOTS (operator override 2026-06-18, FLEET-WIDE, auto-enforced).**

Verbatim operator directive: *"make it so all chats fall back to roadmap work, left over tasks and units relative to their domain. if they don't have domain work, change alpha, bravo, golf, sierra, zulu, india, papa, romeo and xray to work in any domain."*

Two rules, one for ALL slots and one for these 9:
- **ALL 26 slots** fall back to work **relative to their domain** when a task finishes/exhausts — ladder: (1) leftover/deferred tasks from this + prior sessions in the slot, (2) slot-task / priority queue, (3) backlogged domain roadmaps + plans. Never answer "Idle" while any of those is non-empty and budget is not RED. (This half is [[feedback_loop_exhaustion_domain_fallback]] — re-affirmed 2026-06-17.)
- **These 9 slots — alpha, bravo, golf, sierra, zulu, india, papa, romeo, xray —** when their OWN domain ladder is fully dry, EXPAND to ANY domain's roadmap / leftover units rather than idling. This is the explicit operator override that `state/shared/CHAT-SLOT-DOMAINS.md`'s cross-slot doctrine ("no work outside domain without explicit operator override") requires. The other 17 slots stay in their specialty on fallback (the resolver's fleet-fallback still prevents a hard idle for them too, but they prefer their domain).

**Why:** the operator's standing value is anti-idle — a chat with budget must keep delivering. Domain specialists (the 17) keep their expertise focused; the 9 generalist/infra slots are sanctioned to absorb any remaining fleet work so no roadmap unit starves while a capable slot sits idle. Prefer-own-domain-first still holds for all — any-domain is the fallback, never a license to abandon a slot's specialty.

**How to apply:**
- The mechanism is ALREADY wired (no code change): `loop-state.mjs cmdNext -> pickUnitTop` resolves own-lane first (`pick-unit --slot <slot>`), then on empty falls back fleet-wide (`pick-unit` no `--slot`, peer-claim-filtered) = ANY domain's next unit. The directive's gap was the GOVERNANCE sanction + fleet-wide awareness, not the resolver.
- Registry: `state/shared/CHAT-SLOT-DOMAINS.md` (hook-read) + `H:/CHAT-SLOT-DOMAINS.md` (authoritative root) carry the `ANY_DOMAIN_SLOTS:` marker + the override section.
- Auto-enforced fleet-wide: `slot-domain-awareness-inject.mjs` (UserPromptSubmit) parses the marker and surfaces the any-domain notice in every chat's prompt context — a slot in the 9 sees "you may expand to any domain when your queue is dry."
- A slot in the 9 should still PREFER its own domain; reach for cross-domain only when its own ladder is empty.

Sibling: [[feedback_loop_exhaustion_domain_fallback]] (the all-slots fallback ladder this builds on). Several of the 9 already had partial all-galaxy grants ([[feedback_bravo_all_galaxy_navigate_build]], [[feedback_sierra_no_gates_full_reign_2026_06_10]], [[feedback_papa_no_gates_full_pathways]], [[feedback_primary_backend_builders_no_galaxy_gate_block]]) — this directive unifies + canonizes the set to exactly these 9.
