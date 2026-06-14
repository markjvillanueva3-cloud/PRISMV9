# B2 — HMEMV05 memory-router intercept wire-in spec

**Status:** lib shipped + 13/13 tested (`scripts/lib/memory-namespace-classifier.mjs`); wire-in deferred from alpha session 2026-05-27 (YELLOW context, deeper edit than safe to push).
**Owner pickup:** sierra (HMEMV specialist) OR alpha-next-session (clean budget).
**Effort:** ~90 min careful surgical wire-in across 3 files + 1 new test.

---

## What's already done

- `scripts/lib/memory-namespace-classifier.mjs` (113 LOC, 4 namespace kinds: universal/galaxy/slot-soul/ephemeral, 13-galaxy keyword map)
- `scripts/lib/memory-namespace-classifier.test.mjs` (13/13 PASS via `node --test`)
- Empirical validation: ran live against 10089 memos → 8032 classified + 2057 cross-galaxy + 0 unclassified.

## What's needed

### File 1: `mcp-server/src/tools/dispatchers/memoryDispatcher.ts`

Find the action handler for `agent_memory_remember` (line ~63 of action enum). Inject classifier call BEFORE the engine write:

```typescript
// Existing path (pseudocode based on Read of lines 1-100):
case "agent_memory_remember": {
  const { key, value, namespace, slot, sessionId } = validatedInput;
  // ADD BEFORE engine call:
  const { classifyNamespace } = await import("../../../scripts/lib/memory-namespace-classifier.mjs");
  const routing = classifyNamespace({ key, value, slot, sessionId });
  const effectiveNamespace = routing.target; // overrides "default" → real namespace
  const result = await agentMemoryFabricEngine.remember({
    ...validatedInput,
    namespace: effectiveNamespace,
  });
  return slimResponse({ success: true, data: { ...result, routingMeta: routing } });
}
```

**Anti-regression:** `routing.namespace` must be one of `NAMESPACE_KINDS` (4 values). If caller explicitly passes a non-default namespace, RESPECT it (skip override). Pattern:
```typescript
const effectiveNamespace = (namespace && namespace !== "default") ? namespace : routing.target;
```

### File 2: `mcp-server/src/schemas/memoryActionSchemas.ts`

Find `ACTION_MEMORY_SCHEMAS.agent_memory_remember` response schema. Add optional `routingMeta` field:
```typescript
routingMeta: z.object({
  namespace: z.enum(["universal", "galaxy", "slot-soul", "ephemeral"]),
  target: z.string(),
  confidence: z.number(),
  reason: z.string(),
}).optional(),
```

### File 3: NEW `mcp-server/src/__tests__/memoryDispatcher-namespace-routing.test.ts`

E2E test invoking through dispatcher (not just engine singleton — per CLAUDE.md §ENGINE WIRING):
```typescript
describe("memoryDispatcher namespace routing (B2 wire)", () => {
  it("routes feedback_karpathy_discipline → universal", async () => {
    const result = await callDispatcher("prism_memory", {
      action: "agent_memory_remember",
      key: "feedback_karpathy_discipline",
      value: "think simplify surgical",
    });
    expect(result.data.routingMeta.namespace).toBe("universal");
    expect(result.data.routingMeta.target).toMatch(/^universal:/);
  });

  it("routes kienzle-keyword content → galaxy:mill", async () => {
    const result = await callDispatcher("prism_memory", {
      action: "agent_memory_remember",
      key: "ref_mill_force",
      value: "kienzle force compute spindle",
    });
    expect(result.data.routingMeta.target).toMatch(/^galaxy:mill:/);
  });

  it("routes scratch_ prefix → ephemeral", async () => {
    const result = await callDispatcher("prism_memory", {
      action: "agent_memory_remember",
      key: "scratch_throwaway",
      value: "anything",
      sessionId: "abc",
    });
    expect(result.data.routingMeta.target).toMatch(/^ephemeral:abc:/);
  });

  it("respects explicit non-default namespace (no override)", async () => {
    const result = await callDispatcher("prism_memory", {
      action: "agent_memory_remember",
      key: "feedback_karpathy_discipline",
      value: "x",
      namespace: "my-custom-ns",
    });
    expect(result.data.routingMeta).toBeUndefined(); // no override happened
  });

  // ≥3 failure modes per comprehensive-build-enforce floor:
  it("missing key throws schema validation error", async () => { /* ... */ });
  it("oversized value (>10MB) returns bounded error", async () => { /* ... */ });
  it("NaN sessionId still classifies correctly (cast to string)", async () => { /* ... */ });
});
```

## Wiring verification checklist

- [ ] `z.enum` array unchanged (action `agent_memory_remember` already present)
- [ ] Lazy import path resolves: `../../../scripts/lib/memory-namespace-classifier.mjs`
- [ ] Schema response field optional (no breakage of existing callers)
- [ ] Round-trip test invokes via `callDispatcher` not direct engine
- [ ] Per-file scrutiny pass before next file
- [ ] 3-of-3 scrutiny at Stop

## Risks

- `agentMemoryFabricEngine.remember` may not accept arbitrary namespaces — verify it persists per-namespace separately (some engines collapse all writes into a single table regardless of namespace param).
- The classifier expects `value` as string OR JSON-stringifiable; engine may pass binary blobs.
- `qdrant_vector_search`/`qdrant_vector_upsert` paths may also need the classifier — confirm scope (this spec only covers `agent_memory_remember`).

## Cross-refs

- Classifier lib: `H:/prism/scripts/lib/memory-namespace-classifier.mjs`
- Classifier tests: `H:/prism/scripts/lib/memory-namespace-classifier.test.mjs`
- Empirical run: `H:/prism/state/shared/memory-galaxy-routing.json` (10089 entries)
- Doctrine: `H:/prism/state/shared/specs/DOMAIN-GALAXY-DOCTRINE-2026-05-26.md`
- Envelope: `mcp-server/data/milestones/DOMAIN-GALAXY-DOCTRINE-MS1.json` (unit B2)
