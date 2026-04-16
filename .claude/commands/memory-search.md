# Memory Search — Semantic Lookup Across PRISM Qdrant Collections

Semantic search over PRISM's long-term memory: past programs, outcomes, tribal tips, formulas, rules, playbooks, operator notes. Returns the closest matches with payloads so the caller can reason over shop history.

## Args: $ARGUMENTS
- `<query>`: natural-language or keyword query (embedded via nomic-embed-text)
- `--kind=<kind>`: one of `program`, `outcome`, `tip`, `formula`, `rule`, `playbook`, `note` (default: all)
- `--limit=<n>`: max hits (default: 10)
- `--filter='<json>'`: Qdrant payload filter (e.g., `{"machineId": "okuma-lt-3"}`)
- `--score-min=<f>`: drop hits below score (default: 0.55)

## Collections (naming: `prism_memory_<kind>`)
| Collection | What's In It | Typical Vector Source |
|------------|--------------|-----------------------|
| `prism_memory_program` | Past G-code programs + embeddings | Program text + metadata |
| `prism_memory_outcome` | Outcome records joined with notes | notes + adjustments text |
| `prism_memory_tip` | 3,700+ tribal tips | Tip body |
| `prism_memory_formula` | Canonical formulas w/ citations | Formula description |
| `prism_memory_rule` | 296 playbook rules | Rule body |
| `prism_memory_playbook` | 8 WEDM + more workflow playbooks | Playbook title + description |
| `prism_memory_note` | Operator free-form notes | Note text |

## Pipeline
1. **Embedder** (pluggable, default nomic-embed-text 768-dim) embeds the query
2. **QdrantMemoryEngine.search()** dispatches to `prism_memory_<kind>` (or all)
3. Hits returned with `{ id, score, payload }`; merged + sorted when multiple kinds requested

## Engines
- `QdrantMemoryEngine` (U-LLM4) — kind routing + embedder glue
- `QdrantVectorStoreEngine` (infra) — underlying REST client
- `OllamaClientEngine` or `LLMEngine` — serves the embedder

## Dispatcher Call (once wired)
```json
{
  "tool": "prism_local_llm",
  "action": "memory_search",
  "params": {
    "query": "thin wall chatter M2 tool steel",
    "kind": "tip",
    "limit": 5
  }
}
```

## Typical Uses
- Before generating a new program: `/memory-search "thin-wall D2 cavity finish"` → find analogous prior runs
- Debugging a scrap: `/memory-search --kind=outcome "chatter cold heading die"`
- Writing quote: `/memory-search --kind=rule "carbide roughing depth tool steel"`
