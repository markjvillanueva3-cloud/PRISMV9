# TypeScript engine wiring template — `.mjs` → TS engine integration

Operator (or next session): integrate the 7 production `.mjs` engines built this whiskey session
into the existing TypeScript engine architecture (`mcp-server/src/engines/Lathe*.ts`).

## The integration gap

This session's engines live as ES modules in `scripts/lib/lathe-*.mjs`. PRISM's primary engine
surface is TypeScript at `mcp-server/src/engines/`. Three viable integration paths:

### Path A: Direct port (cleanest)

Re-implement each `.mjs` as a TypeScript class extending the existing engine base:

```typescript
// mcp-server/src/engines/LatheShopToolLibraryBridgeEngine.ts
import { ShopToolEntry } from "../types/lathe.js";

export class LatheShopToolLibraryBridgeEngine {
  constructor(
    private layer1: Layer1Map,
    private layer2?: Layer2Map,
    private machineDefaults?: MachineDefaultsMap
  ) {}

  resolve(input: { customer: string; jobId?: string; toolNumber: string; controller?: string; machineModel?: string }): ShopToolEntry {
    // Port logic from scripts/lib/lathe-shop-tool-library-bridge.mjs
    // Re-use the 9 hermetic test cases from .test.mjs as TS tests
  }
}
```

**Pros**: type-safe, single source of truth, integrates with existing dispatchers.
**Cons**: ~200 LOC × 7 engines = ~1400 LOC port + ~500 LOC test port = ~1900 LOC work.

### Path B: Dynamic import bridge (minimal change)

Keep `.mjs` engines; have TS engines `import("...")` them:

```typescript
// mcp-server/src/engines/LatheWizardOrchestratorEngine.ts
async function runStage4(programReport, partSpec) {
  const { runStage4_Reason } = await import("../../../scripts/lib/lathe-training-loop-stage-4-reason.mjs");
  return runStage4_Reason(programReport, partSpec, this.engines);
}
```

**Pros**: zero LOC port, .mjs tests stay authoritative.
**Cons**: TS type inference falls back to `any` at the bridge; async penalty on first import.

### Path C: Child-process bridge (loose coupling)

TS dispatcher spawns `node scripts/...` for each call:

```typescript
const { stdout } = await execFile("node", ["scripts/lib/lathe-tribal-query-engine-cli.mjs", "--json", JSON.stringify(query)]);
return JSON.parse(stdout);
```

**Pros**: complete isolation, easy to swap implementations.
**Cons**: spawn cost per call (~50ms), JSON serialization overhead, error-handling complexity.

## Recommendation

**Path B (dynamic import)** for the first integration pass:
- Minimal risk — engines are tested + verified
- Preserves the 102 hermetic tests as authoritative
- Future Path A port can happen per-engine as priority allows
- Aligns with [[feedback_verify_actual_contract_not_proxy]] (don't rewrite tested code blindly)

## Engines to integrate (priority order)

| # | .mjs engine | Likely TS dispatcher | Action name |
|---|-------------|----------------------|-------------|
| 1 | lathe-tribal-query-engine.mjs | prism_lathe | query_vendor_tribal (iter196 template) |
| 2 | lathe-shop-tool-library-bridge.mjs | prism_lathe | resolve_shop_tool |
| 3 | lathe-wizard-vendor-lookup.mjs | prism_lathe / prism_cam | select_insert |
| 4 | lathe-g76-thread-validator.mjs | prism_calc / prism_safety | validate_thread |
| 5 | lathe-training-loop-stage-4-reason.mjs | prism_ai | wizard_reason |
| 6 | lathe-training-loop-stage-5-generate.mjs | prism_ai | wizard_generate |
| 7 | lathe-ab-version-locator.mjs | prism_dev | scan_ab_pairs |

## Wiring checklist per engine

For each `.mjs` engine being wired:

- [ ] Identify target TS dispatcher
- [ ] Define zod schema for action input
- [ ] Define TypeScript interface for action output (matching .mjs return shape)
- [ ] Add lazy-load + caching pattern (avoid repeat fs reads)
- [ ] Wire action handler with input validation
- [ ] Add to dispatcher action enum
- [ ] Update DISPATCHER_DIGEST.md
- [ ] Add round-trip hermetic test at `mcp-server/src/__tests__/<dispatcher>-<action>.test.ts`
- [ ] Smoke test via MCP stdio
- [ ] Update PRISM-INVENTORY-LATEST.md dispatcher actions tally

## Type interfaces required (sketch)

```typescript
// mcp-server/src/types/lathe.ts (new file)

export interface ShopToolEntry {
  insertAnsi: string;
  geometry: "C" | "W" | "D" | "S" | "T" | "V" | "R" | "K";
  noseRadiusMm: number | null;
  vendor: string;
  grade: string;
  coating: string | null;
  lifeMinutesAtTargetVc: number;
  suggestedVcSfm: [number, number];
  suggestedFzIpr: [number, number];
  isoGroupFit: string[];
  substitutionOptions: string[];
  sourceLayer: 1 | 2 | 3;
  confidence: number;
  warnings?: string[];
}

export interface ReasonReport {
  current_score: number;
  target_score: number;
  improvement_recommendations: Recommendation[];
  expected_delta_score: number;
  confidence: number;
}

export interface Recommendation {
  category: "safety" | "tooling" | "canned_cycle" | "speed_feed" | "structure";
  severity: "P0" | "P1" | "P2";
  what: string;
  why: string;
  delta_score: number;
  lever: string;
}

export interface ProposedProgram {
  text: string;
  diff_from_original: string;
  changes_applied: ChangeRecord[];
  estimated_new_score: number;
  unapplied_recommendations: Recommendation[];
  needs_operator_review: boolean;
}
```

## R12 fail-loud requirements

Each TS wiring must preserve the `.mjs` engine's R12 behavior:
- Empty corpus → throws (don't silently return)
- No-match query → returns `hits: []` + `confidence: 0` (explicit empty, not undefined)
- Missing required spec field → throws with field name
- CRLF preservation per iter154 fix
- Controller-aware dialect handling per iter159 fix

## Estimated effort

- Path B (dynamic import): ~3-4 hours total for all 7 engines + 1 round-trip test per engine
- Path A (full TS port): ~20-30 hours (cleaner but larger)

## Related

- All 7 .mjs engines in `scripts/lib/lathe-*.mjs`
- `scripts/lib/README-whiskey-lathe.md` — engine index
- `[[reference_whiskey_session_final_iter167_2026_05_27]]` — session-final pickup
- `mcp-server/data/ingestion_cache/MCP-DISPATCHER-ACTION-TEMPLATE.md` — first concrete wiring example (iter196)
