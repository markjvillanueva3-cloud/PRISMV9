---
title: Slot-token domain hijack (tribal + wiki routing)
type: lessons
domain: token-optimization
tags: [tribal, routing, slot-token, hijack, getDomainTokens, wiki-domain-bias, lesson]
created: 2026-06-01
fixed_by: U-TRIBAL-SLOT-DOMAIN-WIRE (commit 8998f53693)
---

# Slot-token domain hijack — every topicless slot mis-routed to backend-dev

## The bug (fleet-wide, all 26 slots)
`getDomainTokens({chatId})` (`.claude/helpers/wiki-domain-bias.mjs`) derives domain tokens from the active slot's `topic` + `branch` + the shared `CURRENT_POSITION.md` title. In the slot-worktree model, a slot's branch is `slot/<name>` and its `topic` is frequently **undefined** between milestones. `tokenize("slot/oscar")` → `["slot","oscar"]`, and **`"slot"` is a token in the `backend-dev` match set** of `tribal-by-domain-inject.mjs`'s `DOMAIN_MAP` (intentionally, for `SLOT-*-MS#` infra milestones). Under first-match-wins, the only token that matches anything is `"slot"` → **`backend-dev`**.

Result: every topicless domain slot — foxtrot (mill), mike (wedm), whiskey (lathe), oscar (speed-feed), … — got **backend-dev** tribal tips instead of its own domain's. Flagged but mis-rated earlier in [[reference_foxtrot_tribal_slot_fallback_gap_2026_05_28]].

## Why the obvious "fix" was a regression
Adding `speed-feed`/`database`/`business` to `DOMAIN_MAP` (the long-standing patch-sibling) is WORSE: (1) `tribal-rerank.mjs` `VALID_DOMAINS = {mill,lathe,wedm,cad,cam,backend-dev,general}` **fails loud** (exits non-zero) on any other `--domain` → hook injects nothing; (2) the index has **zero** entries tagged those domains (the "182/12497/1569 tips" were keyword-substring miscounts, not `domain`-tagged corpus). See [[reference_tribal_domain_map_premise_false_2026_06_01]].

## The fix (U-TRIBAL-SLOT-DOMAIN-WIRE, commit 8998f53693)
Resolve the domain **authoritatively from the slot identity**, not from hijack-prone branch tokens:
- `wiki-domain-bias.mjs` → new `activeSlotName(chatId)` (returns the chat-slots KEY; fail-soft; chatId-gated, no peer-leak).
- `tribal-by-domain-inject.mjs` → exported `SLOT_TRIBAL_DOMAIN` (23 slots → nearest **valid** rerank domain, per operator-canonical `CHAT-SLOT-DOMAINS.md`), consulted **first** in `main()`; the old token heuristic remains a fallback for unmapped slots. `getDomainTokens` is **unchanged** (its other consumer, `wiki-precheck-inject`'s additive BM25 boost, is unaffected).
- Domains with no manufacturing-tribal corpus (business/quoting/academy/frontend) map to `general` — a broad-corpus hit beats a wrong-domain one.
- E2E: foxtrot's chatId → `domain:"mill"` (was `backend-dev`). 80 tests incl. a `SLOT_TRIBAL_DOMAIN`-validity guard that fails the instant a value leaves `VALID_DOMAINS`.

## Reusable lessons
1. **"corpus exists" (keyword substring) ≠ "corpus is domain-tagged AND the consumer accepts that domain."** Trace the full chain: token source → DOMAIN_MAP first-match → rerank accepted-value set (fail-loud?) → corpus domain tags → inject seam.
2. **"no dedicated domain" ≠ "no routing."** Verify the ACTUAL token→domain resolution against live `chat-slots.json`, not the assumed path. A context-less `echo | hook` smoke test is useless here (no chatId → no slot tokens).
3. Resolve identity-derived routing from the **authoritative identity** (slot→galaxy), not from incidental tokens (branch decorations, shared position files).

## See also
- [[reference_tribal_domain_map_premise_false_2026_06_01]] · [[reference_foxtrot_tribal_slot_fallback_gap_2026_05_28]] · [[reference_tribal_by_domain_inject]] · [[feedback_verify_actual_contract_not_proxy]]
- Patch-sibling (RESOLVED): `state/shared/dashboards/patches/HOOK-PATCH-TRIBAL-DOMAIN-MAP-EXPAND.md`
