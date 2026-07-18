# MCP dispatcher action wiring template — `prism_lathe:query_vendor_tribal`

Operator (or next session): wire the iter132 tribal-query engine to the MCP dispatcher surface
so Claude + Codex + Ollama can query the lathe tribal corpus via a standard MCP action.

## Target dispatcher

`mcp-server/src/tools/dispatchers/prism_lathe.ts` — create if absent, extend if present.

Per [[reference_lathe_tribal_query_dispatcher_design_2026_05_27]] iter111 design memo.

## Action skeleton (TypeScript)

```typescript
// New action in prism_lathe dispatcher
import { createTribalQueryEngine } from "../../../scripts/lib/lathe-tribal-query-engine.mjs";
// OR (if .mjs → TS port shipped): import { createTribalQueryEngine } from "../engines/LatheTribalQueryEngine.js";
import { z } from "zod";
import fs from "node:fs";

const queryVendorTribalSchema = z.object({
  iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).optional(),
  operation: z.enum(["facing", "roughing", "finishing", "grooving", "threading", "parting", "boring", "drilling"]).optional(),
  material: z.string().optional(),
  insert_geometry: z.enum(["C", "W", "D", "S", "T", "V", "R", "K"]).optional(),
  coating: z.string().optional(),
  vendor: z.string().optional(),
  controller: z.enum(["fanuc", "haas", "okuma", "mazak", "doosan"]).optional(),
  topic: z.string().optional(),
  top_k: z.number().int().min(1).max(50).default(5),
});

// Lazy-load corpus at first call (avoid blocking dispatcher init)
let cachedEngine: ReturnType<typeof createTribalQueryEngine> | null = null;
function getEngine() {
  if (cachedEngine) return cachedEngine;
  const corpus = JSON.parse(fs.readFileSync("mcp-server/data/ingestion_cache/lathe-tribal-master-index-2026-05-26.json", "utf8"));
  // Adapt corpus shape: master-index → tribal-query corpus format
  const adapted = adaptMasterIndexToCorpus(corpus);
  cachedEngine = createTribalQueryEngine(adapted);
  return cachedEngine;
}

function adaptMasterIndexToCorpus(masterIndex: any) {
  // Flatten vendors[].grades[] into vendor_grades[]
  const vendor_grades: any[] = [];
  for (const [vendorName, vendorData] of Object.entries(masterIndex.vendors || {})) {
    for (const grade of (vendorData as any).grades || []) {
      vendor_grades.push({ vendor: vendorName, ...grade });
    }
  }
  return {
    vendor_grades,
    video_segments: masterIndex.video_segments || [],
    tribal_tips: masterIndex.tribal_tips || []
  };
}

// In the action switch:
case "query_vendor_tribal": {
  const parsed = queryVendorTribalSchema.parse(args.query || args);
  const engine = getEngine();
  const result = engine.query(parsed);
  return {
    hits: result.hits,
    total_corpus_size: result.total_corpus_size,
    query_latency_ms: result.query_latency_ms,
    confidence: result.confidence,
    schemaVersion: "1.0.0"
  };
}
```

## Action enum addition

```typescript
const PRISM_LATHE_ACTIONS = z.enum([
  // ... existing actions ...
  "query_vendor_tribal",   // NEW per iter111 design
]);
```

## Dispatcher digest entry

Add to `mcp-server/data/docs/DISPATCHER_DIGEST.md`:

```
| prism_lathe | query_vendor_tribal | Query the lathe tribal corpus (vendors + grades + video segments + tribal tips) via structured filters or free-text topic. Returns top-K hits with relevance scores. |
```

## Testing requirements

Per iter111 design + general PRISM testing doctrine:
1. **Round-trip MCP test** — invoke action via stdin → assert response shape matches contract
2. **Hermetic test** — feed synthetic master-index → assert hits filter correctly
3. **Performance assertion** — `query_latency_ms < 100` per design memo Tier 1 target
4. **R12 fail-loud** — empty corpus throws, no-match returns `hits: []` + `confidence: 0`

## Test fixture location

`mcp-server/src/__tests__/prism-lathe-query-vendor-tribal.test.ts`

## Wiring checklist

- [ ] Create/extend `mcp-server/src/tools/dispatchers/prism_lathe.ts`
- [ ] Add `query_vendor_tribal` to action enum
- [ ] Implement action handler with zod schema validation
- [ ] Wire engine lazy-load + caching
- [ ] Add adaptMasterIndexToCorpus shape converter
- [ ] Update DISPATCHER_DIGEST.md
- [ ] Hermetic test 30+ cases (per iter111 design — each query path + edge cases)
- [ ] Smoke test via MCP stdio
- [ ] Add to PRISM-INVENTORY-LATEST.md dispatcher actions tally

## R12 acknowledgments

This is a template; actual implementation requires:
1. `.mjs` → TS port OR child-process bridge from TS dispatcher to `.mjs` module
2. Existing `prism_lathe.ts` dispatcher file (may not yet exist)
3. Updated dispatcher schema export
4. Test fixture matching the real master-index shape

Operator/next-session must verify these assumptions per [[feedback_verify_actual_contract_not_proxy]].

## Related

- `[[reference_lathe_tribal_query_dispatcher_design_2026_05_27]]` — iter111 full design memo
- `scripts/lib/lathe-tribal-query-engine.mjs` — engine to wire
- `scripts/lib/lathe-tribal-query-engine.test.mjs` — 12/12 hermetic tests (engine-level)
- `mcp-server/data/ingestion_cache/lathe-tribal-master-index-2026-05-26.json` — corpus source
