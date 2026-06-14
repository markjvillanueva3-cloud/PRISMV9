---
name: jm-die-test-shop-pattern
category: code-tribal
domain: backend-dev
tags: [jm-die, test-shop, customer-corpus, closed-loop, training, prism-development, ai-development]
last_updated: 2026-05-18
---

# JM Die Test Shop Pattern — canonical training + validation corpus

JM Die Company is PRISM's test shop. Every CAM/material/post engine ships against JM Die's real production NC as the ground truth. The pattern is load-bearing: without a real test shop, PRISM's safety claims are hypothetical.

## What JM Die provides

- **24,545+ production NC programs** across 100+ customers (ITW, Alcoa, Optimas, SFS, Holo-Krome, etc.)
- **21 machines** (mill, lathe, WEDM, sinker EDM, grinders, swiss) in `ShopConfigurationEngine`
- **Operator tribal knowledge** — 4245 tribal-tip entries in PRISM's wiki tree
- **First-article validation records** — actual cycle time + dimensional outcomes per program

Archive: `H:/prism/JM DIE/` (production NC, NOT canonical — these are real operator-shipped files, used as TRAINING DATA, not as PRISM-canonical patterns).

## What JM Die does NOT provide

- A canonical "right answer" for every CAM strategy (operators chose what worked for them; PRISM aims to compute the optimal)
- Comprehensive coverage of every material × tool × feature combination
- Auto-clean data (programs have operator notes, machine-specific quirks, post-processor variations)
- Schema consistency (decades of NC accumulated under varying conventions)

PRISM treats JM Die data as REFERENCE, not SPEC. The CAM strategy that JM Die actually used may not be optimal; PRISM aims to recommend better while respecting safety + cost realities.

## The closed-loop learning architecture

```
1. PRISM recommends program for new part
        ↓
2. JM Die operator reviews + adjusts
        ↓
3. Final program runs on machine
        ↓
4. Outcome captured (cycle time, dim, finish, tool wear)
        ↓
5. ML metrics update (Bayesian posterior + LoRA gradient)
        ↓
6. Next recommendation incorporates learning
        ↓ (back to step 1)
```

The operator-in-the-loop is UNCONDITIONAL — PRISM never auto-ships a program. Per JM Die's process, every program is reviewed before machine load.

## Per-customer LoRAs from JM Die data

100+ customer folders in `JM DIE/` → 100+ candidate per-customer LoRAs. Each captures customer-specific patterns:
- Preferred fixture style (vise, soft jaws, custom)
- Tolerance interpretation (drawing-spec vs operator-judgment)
- Post-processor flavor (Mastercam X9 vs M-T-T M3, etc.)
- Material grade preferences (e.g. one customer always specifies 17-4 PH H900; never H1075)

The lifecycle: [[lora-fine-tuning-patterns]] applies; customer-folder is the training corpus boundary.

## Direct API access (no inline paths)

```ts
import { prismSelfAwarenessEngine } from "mcp-server/src/engines/PRISMSelfAwarenessEngine.js";

const jmPath = prismSelfAwarenessEngine.getJMDieCustomerPath("ITW");
// returns "H:/prism/JM DIE/ITW" (or null if customer not present)

const tribalTips = prismSelfAwarenessEngine.searchTribalKnowledge({
  domain: "mill",
  material: "1018 steel",
  feature: "thin-wall-pocket",
});

const playbookRules = prismSelfAwarenessEngine.searchPlaybookRules({
  operation: "rough-mill",
  iso_group: "P",
});
```

NEVER inline `H:/prism/JM DIE/<customer>` path strings — they rot when customers are renamed or paths reorganized. Always go through the API.

## JM Die profile config

`mcp-server/src/data/jm-die-profile.ts` — canonical counts + paths. Wiki entry at [[jm-die-profile]] (knowledge/wiki/reference/).

## The "JM Die as ground truth" rail

When a new engine produces a result, validate against JM Die's actual outcomes:

```ts
const recommended = MyEngine.compute(...);
const actualOutcomes = JMDieValidator.findSimilarProductions(...);
const deviation = computeDeviation(recommended, actualOutcomes);
if (deviation > 0.30) {
  // Outside 30% of operator-validated reality
  // EITHER: the engine is wrong (debug)
  // OR: the engine genuinely beats operator practice (still investigate; usually wrong)
}
```

Deviation > 30% is a sign the engine has a bug, not that the operator was wrong. JM Die operators have decades of experience; trust the gap as a diagnostic signal.

## What flows BACK to JM Die

PRISM is NOT a write-back system. Operators see PRISM recommendations; operators choose what runs. PRISM doesn't auto-update JM Die's NC archive.

When PRISM ships a new feature that JM Die wants to adopt, the operator workflow:
1. Run PRISM recommendation in PRISM's UI/CLI
2. Operator reviews
3. Operator copies the program output INTO JM Die's local archive
4. Operator runs the machine

No automation crosses the JM Die boundary inward.

## The "JM DIE as training-data archive, not production target" rule

Code that points AT `H:/prism/JM DIE/` to write/edit files is wrong by construction. The archive is read-only for PRISM. Training scripts read; analysis scripts read; no script writes.

If you need to capture an outcome (operator confirmed program X ran in cycle Y), write to `mcp-server/data/state/jm-die-outcomes.jsonl` (PRISM-side) — not back to `JM DIE/`.

## Customer-folder structure

```
JM DIE/<CustomerName>/
├── Programs/      — *.NC files
├── Drawings/      — *.PDF / *.DWG / *.IPT
├── Inspection/    — CMM reports
└── Setups/        — fixture photos, setup sheets
```

Not all folders exist for all customers (some are programs-only). The `prismSelfAwarenessEngine` API normalizes.

## When you don't have JM Die access (peer chats, audits)

Some peer chats / scrutiny agents won't have read access to `JM DIE/` (path permission). Their analysis should be invariant to JM Die specifics — work from the schema + API, not the file paths.

If an engine NEEDS JM Die data to function correctly, that's a design smell. Pure-core engines compute from primitives (material, tool, feature); JM Die is the validation corpus, not the input.

## Related

- [[lora-fine-tuning-patterns]] — per-customer LoRA training pipeline
- [[engine-creation-playbook]] — validate new engines against JM Die outcomes
- [[regression-prevention-doctrine]] — JM Die deviation > 30% is a regression signal
- CLAUDE.md "TEST SHOP — JM Die Company"
- `mcp-server/src/data/jm-die-profile.ts` — config
- `knowledge/wiki/reference/jm-die-profile.md` — full profile wiki
