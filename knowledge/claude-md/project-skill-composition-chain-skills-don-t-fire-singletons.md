---
source: project
section: SKILL COMPOSITION — chain skills, don't fire singletons
slug: skill-composition-chain-skills-don-t-fire-singletons
indexed_at: 2026-04-30T17:01:39.554Z
---

## SKILL COMPOSITION — chain skills, don't fire singletons

| Task | Chain | Trigger |
|------|-------|---------|
| New engine | `/dedup` → `/forge-triple` → `/verify-loop` → `/scrutinize` | "build engine", "create algorithm" |
| Bug fix | `superpowers:systematic-debugging` → `/impact` → `/simulate-change` → `/verify-loop` | "bug", "regression" |
| PDF ingest | `/pdf-learn` → `/wiki-ingest` → `/wiki-lint` → `/generalize` | "PDF", "manual" |
| Quote→ship | `/quote-job` → `/quote-review` → `/quote-to-ship` → `/ship-confirm` | "RFQ", "quote" |
| Print→program | `/print-to-program` → `/cam-strategy` → `/cam-toolpath-check` → `/physics-verify` → `/safety-audit` | "blueprint", "STEP" |
| Lathe job | `/lathe-print-to-program` → `/lathe-validate` → `/lathe-optimize` → `/ship-lathe` | "turn", "lathe" |
| WEDM job | `/wedm-feasibility` → `/wedm-program` → `/wedm-validate` → `/wedm-cost` | "wire EDM" |
| Session end | `/precompact` → `/handoff` | `/compact`, end-of-session |

**Rules:** never `/forge*` without `/dedup` first; never `/scrutinize` without `/verify-loop` first; never `/ship*` without a review skill.
