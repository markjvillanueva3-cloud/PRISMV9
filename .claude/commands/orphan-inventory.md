---
description: Generate the built-but-unwired audit punch list. Reads system-graph orphans (low in/out-degree but documented) + groups by suggested dispatcher (heuristic name match) + by layer. Outputs state/shared/ORPHAN-INVENTORY.md.
allowed-tools: Bash, Read
composes_with:
  - "/awareness-snapshot"
  - "/deep-search"
  - "/master-index"
  - "/utilization-dashboard"
---
# /orphan-inventory — Audit punch list for built-but-unwired nodes

Generates `state/shared/ORPHAN-INVENTORY.md` from `system-graph.json`:

- Finds nodes with low in-degree (≤1) AND low out-degree (≤1) AND documented (has wiki/memory entries)
- For each, runs **name-based heuristic** to suggest a candidate dispatcher (e.g. "Cutting/Force/Kienzle" → `prism_calc`, "Lathe/Turning" → `prism_turning`)
- Groups by suggested dispatcher + by layer
- Writes Markdown punch list ready for a wiring sweep

## When to use

- Roadmap planning: ask "what cheap wins are sitting on the floor?"
- After a build wave: ensure new engines actually got wired in
- Before declaring a milestone done: scan for orphan engines you forgot
- Companion to `/utilization-dashboard` (full classifier) — this one focuses on the **actionable subset** (orphans only) + adds the dispatcher hint

## How to run

```
/orphan-inventory             # writes state/shared/ORPHAN-INVENTORY.md
```

Under the hood:

```bash
node H:/prism/scripts/orphan-inventory.mjs            # human-readable, writes md
node H:/prism/scripts/orphan-inventory.mjs --json     # machine-readable, no write
node H:/prism/scripts/orphan-inventory.mjs --top 50   # cap (default 100)
```

## Output shape

```markdown
## By suggested dispatcher

### **prism_calc** — 14 orphan(s)
- `L5/built` **KienzleStochasticForce** — id=`engine.KienzleStochasticForceEngine` _(force/physics)_
  - docs: kienzle-force-stochastic, feedback_force_engine_atomic
- ...

### **prism_turning** — 8 orphan(s)
- ...

### (no heuristic match — manual review) — 64 orphan(s)
- ...

## By layer
- L4: 0 orphan(s)
- L5: 23 orphan(s)
- L7: 38 orphan(s)
- ...
```

## Heuristics (name-based)

| Pattern | Suggested dispatcher | Reason |
|---------|---------------------|--------|
| `kienzle`, `cutting force`, `mrr` | `prism_calc` | force/physics |
| `lathe`, `turning`, `okuma` | `prism_turning` | turning domain |
| `5-axis`, `multi-axis` | `prism_5axis` | 5-axis |
| `cad`, `geometry`, `nurbs` | `prism_cad` | CAD/geometry |
| `safety`, `collision` | `prism_safety` | safety gate |
| `quote`, `cost`, `business` | `prism_intelligence` | business/ERP |
| `material`, `registry` | `prism_data` | data/registry |
| `memory`, `qdrant`, `embed` | `prism_memory` | memory layer |
| `reason`, `neural`, `llm` | `prism_ai` | reasoning/ML |
| ...full list in `scripts/orphan-inventory.mjs` | | |

Heuristic hint rate is typically 5-15% — the rest fall under "manual review" (registry entries like `Agent`, `Base`, `Coolant` which are too generic to auto-route).

## Why this exists

Built 2026-05-13 OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-INVENTORY (slot alpha, loop iter 6). Dogfoods iter 2's utilization classifier. The PRISM graph has ~86 orphan nodes (built + documented + unwired) — this skill turns that abstract number into a concrete punch list with dispatcher hints, so a wiring sweep can move down the list without re-reasoning each entry from scratch.

Companion to `/master-index` (search), `/utilization-dashboard` (full classifier), `/awareness-snapshot` (rolled-up digest). The chain: `/awareness-snapshot` → notices 86 orphans → `/orphan-inventory` → lists them with hints → manual or `/deep-search`-aided wiring sweep moves them.
