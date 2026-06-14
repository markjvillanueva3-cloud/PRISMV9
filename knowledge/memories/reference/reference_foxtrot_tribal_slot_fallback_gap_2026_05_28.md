---
name: reference_foxtrot_tribal_slot_fallback_gap_2026_05_28
description: "Deferred gap — tribal-by-domain-inject.mjs has no slot→domain fallback; a foxtrot prompt with no mill keyword routes to domain=general (no mill tribal). Owner=alpha (context-injection hook lane). Low-value; 3 other surfaces already give \"always have context\"."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.121Z
aliases: reference_foxtrot_tribal_slot_fallback_gap_2026_05_28
---


# Tribal slot→domain fallback gap (foxtrot mill)

> **✅ RESOLVED 2026-06-01 (commit `8998f53693`, U-TRIBAL-SLOT-DOMAIN-WIRE, slot:alpha — the hook owner).** This gap's own "How to apply" (below) predicted the fix; alpha shipped a STRONGER version: `activeSlotName(chatId)` threads the slot NAME to `main()`, and an exported `SLOT_TRIBAL_DOMAIN` map (23 slots → nearest VALID rerank domain) is consulted **FIRST** (not just as a `domain==="general"` fallback) — so foxtrot → `mill` authoritatively, even on a keyword-less prompt. Root cause was deeper than first thought: topicless `slot/<name>` branches tokenize to `"slot"`, which is a `backend-dev` token, so foxtrot was routing to **backend-dev** (not `general` as this memory assumed). E2E verified foxtrot→mill; 80 tests incl. a `SLOT_TRIBAL_DOMAIN`-validity guard. `getDomainTokens` untouched (wiki-precheck unaffected). Full lesson: [[slot-token-domain-hijack]] · [[reference_tribal_domain_map_premise_false_2026_06_01]].

Found in the 2026-05-28 mill-galaxy audit (arm B, rated HIGH at first glance). `tribal-by-domain-inject.mjs` derives its domain from the active chat-slot's **milestone tokens** via `getDomainTokens({chatId})` → `inferTribalDomain(tokens)`. There is **no slot-NAME fallback**: a foxtrot prompt whose milestone/prompt tokens contain no mill keyword (e.g. a bare `continue` or a `/goal` with no mill noun) routes to `domain=general`, so that prompt gets no mill tribal inject.

**Why deferred (not patched this session):**
- The hook is **cross-cutting context-injection infra** — alpha's lane (token/efficiency/obsidian/context), not mill-galaxy polish. Editing it from a foxtrot session is a lane-crossing change (R7 surface-don't-average + lane discipline).
- The "always have context on your domain" ask is **already served without it** by 3 other surfaces: `slot-context-bundle-inject` (injects the galaxy by slot every prompt), `galaxy-cascade` (injects `mill/CLAUDE.md` on edits under `mill/`), and the new `mill/AWARENESS.md`. The tribal fallback is incremental polish on a 4th surface, only for keyword-less prompts.
- Worktree-fire semantics are ambiguous (which `.claude/hooks/tribal-by-domain-inject.mjs` fires — shared `H:/prism` vs `slot/foxtrot` worktree) — adds edit risk under YELLOW budget.

**How to apply (when the hook owner takes it):** clean fix is at the CALL SITE (`main()`, ~line 300) not the pure fn: `let domain = inferTribalDomain(tokens); if (domain === "general") domain = SLOT_DOMAIN_FALLBACK[slot] ?? "general";` with a small map `{foxtrot:"mill", whiskey:"lathe", mike:"wedm", delta:"cad", kilo:"cam", oscar:"mill"}` — requires threading the slot NAME (not chatId) to the call site. Additive, fail-open. Cited in `mcp-server/src/engines/mill/AWARENESS.md` §7. Related: [[reference_mill_domain_atlas_for_foxtrot_2026_05_27]], [[feedback_conflict_fork_rule]].
