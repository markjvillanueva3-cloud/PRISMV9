---
title: JM Die Company — Canonical Test Shop Profile
slug: jm-die-profile
category: reference
status: canonical
owner: CLEANUP-MS0/U-CLEANUP-D4
created_at: 2026-05-13
schema_version: 1
extracted_from: H:/prism/CLAUDE.md § TEST SHOP — JM Die Company
---

# JM Die Company — PRISM Test Shop

JM Die Company is the **canonical test shop** for ALL PRISM development. Every engine,
dispatcher, post-processor, and end-to-end pipeline is validated against this shop's
real machines, materials, customers, and tribal-knowledge corpus before shipping. If
a change works for JM Die, it ships; if it doesn't, the change blocks.

## Source-of-truth locations

| Resource | Path |
|----------|------|
| Shop profile (TypeScript) | `mcp-server/src/data/jm-die-profile.ts` |
| Shop configuration (21 machines) | `mcp-server/src/engines/ShopConfigurationEngine.ts` |
| Program archive (24,545 files, 100+ customers) | `JM DIE/` |
| Tribal-knowledge corpus | `mcp-server/data/jm-die/tribal-tips.json` (and per-customer subdirs under `JM DIE/`) |
| Self-awareness API | `mcp-server/src/engines/PRISMSelfAwarenessEngine.ts` |

## Headline customers (subset of 100+)

ITW · Alcoa · Optimas · SFS · Holo-Krome (full list lives in `prismSelfAwarenessEngine.listJMDieCustomers()`).

## Direct API — what to call from an engine, hook, or skill

```typescript
import { prismSelfAwarenessEngine } from "mcp-server/src/engines/PRISMSelfAwarenessEngine";

// Resolve a customer's program-archive path:
prismSelfAwarenessEngine.getJMDieCustomerPath("ALCOA");        // → absolute file path under JM DIE/

// Search the tribal-knowledge corpus by free-text symptom or topic:
prismSelfAwarenessEngine.searchTribalKnowledge("thin wall");   // → ranked tips (operator wisdom)

// Search the playbook (process-planning rules):
prismSelfAwarenessEngine.searchPlaybookRules("roughing");      // → applicable rule set

// Multi-agent strategy recommendation for a task:
prismSelfAwarenessEngine.recommendAIFeatures("build new engine"); // → coordinated agent + memory plan
```

All four methods are pure-read, mtime-cached, and safe to call from any session.

## How JM Die plugs into the rest of PRISM

- **`prism_dev:capability_census`** counts JM Die assets when reporting test-shop coverage.
- **`prism_session:master_index_query`** surfaces JM Die files and tribal tips in the unified search index (joined with wiki + memory entries).
- **CAM bridges** (Mastercam, hyperMILL, Fusion, etc.) validate post-processor output against actual JM Die NC programs in `JM DIE/`.
- **Speed/Feed Calculator (SFC) + Master Post** (the two saleable subscription products) use JM Die's machine envelopes + chip-load tables as their default validation set.

## When to extend this profile

- Adding a new customer: drop the corpus under `JM DIE/<customer-name>/` AND update
  `jm-die-profile.ts` `customers[]`. The self-awareness engine picks up both.
- Adding a new machine: append to `ShopConfigurationEngine.ts` `MACHINES` constant.
  The shop config is the source of truth — don't sprinkle machine IDs across engines.
- Adding a new tribal tip: append to `mcp-server/data/jm-die/tribal-tips.json` with
  schema `{symptom, fix, source, confidence, validated_against_customer?}`. Tips are
  searched via `searchTribalKnowledge()` and validated against playbook rules.

## Cross-links

- [[shared-directives-index]] — coordination directives for multi-agent JM Die work
- [[golf-slot]] — hygiene chat that maintains JM Die dashboards + ledgers
- Project doctrine: `H:/prism/CLAUDE.md` § TEST SHOP — JM Die Company (now 2-line pointer)
