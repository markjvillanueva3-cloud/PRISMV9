---
name: Tribal knowledge access — JM Die test shop + 3,700+ machinist tips
description: How and when to query operator wisdom before deriving answers from physics
type: reference
originSessionId: cee63f1f-130d-4ed3-baf2-1d8812d9acb2
---
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
