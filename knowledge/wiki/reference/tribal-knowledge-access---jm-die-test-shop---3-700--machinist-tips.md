---
title: "Tribal knowledge access — JM Die test shop + 3,700+ machinist tips"
name: tribal-knowledge-access---jm-die-test-shop---3-700--machinist-tips
kind: reference
status: promoted
category: reference
domain: knowledge-vault
promoted_from: knowledge/memories/reference/reference_tribal_knowledge_search.md
promoted_at: 2026-06-06T04:55:56.618Z
source_refs: 3
---

# Tribal knowledge access — JM Die test shop + 3,700+ machinist tips

**JM Die Company** is the canonical test shop. Path: `H:\prism\JM DIE\` (24,545 production NC files, 100+ customers — ITW, Alcoa, Optimas, SFS, Holo-Krome). Profile: `mcp-server/src/data/jm-die-profile.ts`. Shop config: `ShopConfigurationEngine.ts` (21 machines).

**Direct engine API:**
- `prismSelfAwarenessEngine.searchTribalKnowledge("thin wall")` → tips with provenance
- `prismSelfAwarenessEngine.searchPlaybookRules("roughing")` → playbook rules
- `prismSelfAwarenessEngine.getJMDieCustomerPath("ALCOA")` → file path

**Wiki (Karpathy LLM-Wiki pattern):**
- Catalog: `H:\prism\knowledge\wiki\index.md` — 722 entries (575 engines + 90 dispatchers + 57 memories)
- WEDM: 46 tribal tips (20 field + 26 MIT-derived)
- Maintained by `WikiIndexMaintainerEngine`; Ollama owns ≥70% of maintenance

**Skills:**
- `/shop-knowledge` — tribal + playbook unified search
- `/wiki-query` — wiki-specific search
- `/playbook` — best practice advisor
- `/wedm-cite` — surfaces WEDM tips with provenance
- `/tribal-knowledge-guide` — capture/retrieval guidance

**MCP dispatcher routes:**
- `prism_shop_practice:tribal_search` (alt: `tribal_add`, `tribal_get`, `tribal_list`, `tribal_categories`) — 3,700+ tips
- `prism_shop_practice:playbook_advise` — playbook rules
- `prism_knowledge:tribal_search` — alternative entry

**How to apply:**
- BEFORE deriving roughing/finishing/wear/chatter/burr/scallop from physics first principles, query tribal knowledge — JM Die operators may have already solved it.
- If user mentions a customer name (ITW, Alcoa, Optimas, SFS, Holo-Krome), route through `getJMDieCustomerPath` to find the canonical NC file.
- For WEDM specifically: 46 tips are pre-loaded; cite with `/wedm-cite` for traceability.
- Tribal first, physics second — physics validates tribal, not the other way around.

## Source

Promoted from memory [[reference_tribal_knowledge_search]] (referenced 3x across the vault). The memory remains the editable source of truth.
