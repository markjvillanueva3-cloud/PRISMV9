---
name: feedback-foxtrot-canonical-constants-import
description: Never inline Kienzle/Taylor/material constants in mill engines — import from physics/constants.ts.
type: feedback
slot: foxtrot
galaxy: mill
source: prism-memory
synced: 2026-06-27T20:30:46.425Z
aliases: feedback_foxtrot_canonical_constants_import
---


# Canonical constants only (mill) — import, never inline

Never inline Kienzle kc1.1/mc, Taylor C/n, or material constants in a mill engine. Import from `mcp-server/src/physics/constants.ts` (KIENZLE_KC, KIENZLE_MC, TAYLOR_PARAMS). Enforced by `stop_on_inlined_constants.mjs` (Stop hook) — inlining is a HARD BLOCK.

Canonical kc1.1 per ISO group (lookup shortcut only — source is constants.ts): P=1800, M=2100, K=1100, N=700, S=2800, H=3200.

**Why:** duplicated constants drift; a single canonical source keeps every engine + the safety validator consistent. Inlined values silently rot when the canonical table is tuned.
**How to apply:** `import { KIENZLE_KC } from "../../physics/constants.js"` (`.js` suffix, NodeNext). If a value seems missing, Grep `constants.ts` for the export name first — don't add a local copy.
