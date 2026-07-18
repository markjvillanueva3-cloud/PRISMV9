# Per-Domain Training — fleet-wide synergy entry point

**Owners:** all 13 PRISM domain chats (charlie, delta, echo, foxtrot, hotel, kilo, mike, whiskey, papa, sierra, quebec, tango, oscar).
**Coordinator:** india.
**Master spec:** `state/shared/specs/FULL-FLEET-COORDINATION-SELF-IMPROVING-AI-LOOP-2026-05-25.md`
**Contract:** `state/shared/specs/PSN-SELF-IMPROVING-LOOP-COORDINATION-CONTRACT-2026-05-25.md`

## What this directory is

The wiring point between each domain chat's training pipeline and the **PSN self-improving loop substrate** (shipped 2026-05-25, slot:india). If your chat trains a model, runs an evaluation, or produces a shop-floor outcome — emit it here as JSONL and the loop picks it up automatically.

## How to wire YOUR domain training pipeline in 3 lines

```js
import { appendOutcome } from "scripts/training/emit-outcome-template.mjs";
appendOutcome({
  domain_ledger: `state/shared/training/${YOUR_DOMAIN}-outcomes.jsonl`,
  record: {
    observed_at: new Date().toISOString(),
    shop_id: "jm-die",
    category: "lathe",       // one of: lathe|mill|wedm|sinker_edm|5axis|swiss|grinding|mill_turn
    domain: "time",          // one of: rate|time|quality|yield
    estimated: 10.5,         // your model's prediction
    actual: 12.3,            // measured truth
    unit: "min",
    s_of_x: 0.92,            // optional, [0,1]; <0.70 routes to anomalies
    // evidence_id: opaque-hash // optional; NEVER raw customer/part name
  },
});
```

That's it. Once emitted, india's processor consumes the ledger, the shared substrate folds the outcome via EWMA, and the per-shop multipliers become queryable via MCP:

```
prism_shop.loop_shop_summary({ shop_id: "jm-die" })
prism_shop.loop_shop_deltas({ shop_id: "jm-die" })
```

## Per-domain ledger paths (recommended)

| Slot | Domain | Ledger path |
|---|---|---|
| charlie | wire/WEDM | `state/shared/training/wedm-outcomes.jsonl` |
| delta | CAD | `state/shared/training/cad-outcomes.jsonl` |
| echo | CAM | `state/shared/training/cam-outcomes.jsonl` |
| foxtrot | mill | `state/shared/training/mill-outcomes.jsonl` |
| hotel | ERP | `state/shared/training/erp-outcomes.jsonl` |
| kilo | print-to-program | `state/shared/training/p2p-outcomes.jsonl` |
| mike | misc | `state/shared/training/misc-outcomes.jsonl` |
| whiskey | lathe | `state/shared/training/lathe-outcomes.jsonl` |
| papa | NN/GNN core | `state/shared/training/nn-gnn-outcomes.jsonl` |
| sierra | /system-viz | `state/shared/training/viz-outcomes.jsonl` |
| quebec | quality/SPC | `state/shared/training/quality-outcomes.jsonl` |
| tango | telemetry | `state/shared/training/telemetry-outcomes.jsonl` |
| oscar | orchestration | `state/shared/training/orchestration-outcomes.jsonl` |

## Run the JM Die end-to-end demo

```bash
# (after `npm run build:fast` in mcp-server)
node scripts/training/jm-die-loop-demo.mjs
```

Generates 17 synthetic JM Die lathe outcomes, runs the full loop, prints adapter state. Verifies the substrate works without needing real shop data.

## The 8-layer AI stack each domain owns

Per the master spec, every domain chat ships:

1. **Data layer** — this directory + emit-outcome-template
2. **RAG** — per-domain Qdrant collection + GraphRAG + hierarchical
3. **NN head** — domain regression/classification
4. **GNN** — HGT (queued via HGT-MIGRATION-MS0; GraphSAGE today)
5. **Transformer fine-tune** — qwen2.5-coder on domain corpus
6. **LoRA adapter** — per-domain (S-LoRA stack — S-LORA-DOMAIN-STACK-MS0)
7. **Deep reasoning** — CoV substrate + Plan-Solve + ToT + Best-of-N
8. **Custom algorithms** — domain physics + tribal engines

Layer 1 is non-negotiable and immediate. Layers 2-8 ship per domain envelope (`AI-STACK-PER-DOMAIN-MS0` lists 104 units across all 13 domains).

## Privacy gate (HARD)

Per `feedback_no_public_h_drive`:
- `evidence_id` MUST be a hash if provided. Never raw customer or part names.
- Internal JM Die data stays internal. Audit your JSONL emits before opening a sink directory to external tools.

## When in doubt

Read the master spec at `state/shared/specs/FULL-FLEET-COORDINATION-SELF-IMPROVING-AI-LOOP-2026-05-25.md`. If your domain doesn't fit, post on `AGENT_CHAT.jsonl` and india will extend the contract within 1 /loop iter.

## Substrate engines (composition surface — do NOT re-derive)

- `mcp-server/src/engines/PSNSelfImprovingLoopEngine.ts` — the loop closer
- `mcp-server/src/engines/ShopProfileAdapterEngine.ts` — EWMA delta learning
- `mcp-server/src/engines/ShopOutcomeIngestProcessorEngine.ts` — JSONL automation
- `mcp-server/src/engines/ChainOfVerificationEngine.ts` — CoV substrate
- `mcp-server/src/engines/PSNAutonomyLoopEngine.ts` — psi_delta accumulator

## Memory references

- `[[reference_psn_self_improving_loop_ms0_iter1to3_2026_05_25]]` — substrate ship memo
- `[[reference_cov_engine_2026_05_25]]` — CoV primitive
- `[[reference_psn_training_substrate_2026_05_25]]` — data-side substrate spec
- `[[reference_psn_r4_deep_stack_2026_05_25]]` — R4 deep-research (50+ systems)
- `[[feedback_psn_definition]]` — 11-leg PSN taxonomy
