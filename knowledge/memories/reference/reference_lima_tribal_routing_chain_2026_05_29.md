---
name: reference_lima_tribal_routing_chain_2026_05_29
description: Why academy tribal is 🔴 — the full 4-link routing chain; the deepest break is getDomainTokens(lima) yielding garbage, not the missing DOMAIN_MAP entry.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.199Z
aliases: reference_lima_tribal_routing_chain_2026_05_29
---


The academy Tribal PSN leg is 🔴 (audit-found 2026-05-29). The audit's headline ("academy not in tribal DOMAIN_MAP") is only ONE link — the real fix is a **4-link chain**, and the deepest break is upstream of DOMAIN_MAP:

**L0 — slot→domain-token derivation (the deepest break).** `tribal-by-domain-inject.mjs` calls `getDomainTokens({chatId})` (`.claude/helpers/wiki-domain-bias.mjs`) → `inferTribalDomain(tokens)`. For lima, `getDomainTokens('claude-8bbacd55')` returns **`["current","position"]`** — garbage (it's parsing a "Current Position" heading, not the slot's galaxy). So `inferTribalDomain` returns `"general"` regardless of DOMAIN_MAP. **Adding academy to DOMAIN_MAP is DEAD CONFIG until L0 maps lima→academy tokens** (e.g. via SLOT_GALAXY_MAP.lima="academy" or chat-slots topic). Verify: `node -e "import('./.claude/helpers/wiki-domain-bias.mjs').then(m=>console.log(m.getDomainTokens({chatId:'claude-8bbacd55'})))"`.

**L1 — DOMAIN_MAP entry.** `tribal-by-domain-inject.mjs` `DOMAIN_MAP` = `[{mill},{lathe},{wedm},{cad},{cam},{backend-dev}]` — no `academy`. Add `{domain:"academy", match: new Set(["academy","course","courses","curriculum","lesson","lessons","instructor","certification","syllabus","apprentice","coursework","pedagogy"])}`. **Do NOT include "learning"** (backend-dev owns it; academy/india "learning" polysemy).

**L2 — tribal-rerank VALID_DOMAINS (the regression trap).** `tribal-rerank.mjs` has `VALID_DOMAINS = {mill,lathe,wedm,cad,cam,backend-dev,general}` and **fail-loud rejects** an unknown `--domain`. So L1 WITHOUT L2 makes academy prompts route to `--domain academy` → rerank ERRORS → hook emits **zero** tribal hits (worse than today's "general" fallback). L1+L2 must land together. Add `"academy"` to VALID_DOMAINS + the 2 usage-doc comment lines.

**L3 — embedded academy-tagged tips.** The 2× in-domain boost is `e.domain === "academy"` over `state/shared/tribal-embed-index.json`. No academy-tagged entries exist; embedding new tips needs **Ollama** (`tribal-rerank` embeds the query via Ollama). **BLOCKED while Ollama `/api/chat` is down.** Without L3, L0-L2 give academy a valid route returning text-relevant (un-boosted) cosine hits — non-regressing, just not boosted.

**Status (2026-05-29, slot:lima):** `academy-awareness.mjs` Tribal leg now reports this full chain honestly (🔴, names L0-L3). The structural edits (L1+L2) are queued (T18) — deferred because (a) L0 is a separate fleet bug in `wiki-domain-bias.mjs`, (b) L3 needs Ollama, (c) the live effect is golf-merge-gated, so shipping L1+L2 alone is dead config + untestable E2E now. Do all four when Ollama recovers + L0 is fixed.

Related: [[reference_lima_academy_awareness_surface_2026_05_29]] · [[reference_tribal_by_domain_inject]] · [[feedback_verify_actual_contract_not_proxy]] (the L0 garbage-token discovery came from verifying the actual getDomainTokens output, not assuming the DOMAIN_MAP was the only break).
