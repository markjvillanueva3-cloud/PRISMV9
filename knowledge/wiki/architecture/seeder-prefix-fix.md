---
name: seeder-prefix-fix
description: U-VIZ-G4-SEEDER-FIX — seed-ghost-from-unwired.mjs now emits `disp.<file-derived>` edge targets (canonical graph node ids) instead of `dispatcher.<mcp_tool_name>` (never existed in-graph). Closes ~500 of 569 dead pixels found by G4 sweep.
type: architecture
status: shipped
shipped_at: 2026-05-20
slot: sierra
commit_scope: SYSTEM-VIZ-HIGH-ROI-MS0
unit_ids:
  - U-VIZ-G4-SEEDER-FIX
related:
  - "[[system-viz-dead-pixel-sweep]]"
  - "[[system-viz-type-backfill]]"
  - "[[master-index-query-telemetry]]"
---

# seed-ghost-from-unwired prefix-convention fix (U-VIZ-G4-SEEDER-FIX)

## The bug

`scripts/seed-ghost-from-unwired.mjs` proposes wiring edges from
`ghost.unwired-engine` nodes to dispatchers. For every high-confidence
inference (>= 0.5), `buildGhostFromUnwired` emitted an edge:

```js
edge = { from: node.id, to: `dispatcher.${inf.dispatcher}`, ... }
```

Two compounding errors:

1. **Wrong prefix.** Per the G1 PREFIX_TO_TYPE SSOT, every dispatcher in
   the merged graph uses the `disp.` prefix, not `dispatcher.`.
2. **Wrong name.** `inf.dispatcher` is an MCP **tool name** (`prism_calc`,
   `prism_safety`, ...). Graph node ids are **file-derived** lowercase
   (`disp.calcdispatcher`, `disp.safetydispatcher`, ...). The MCP tool
   names don't exist as graph ids in any form.

Net: every proposed wire pointed at a node id that never existed. The
seeder ran as a `regen-viz` post-merge subprocess on every full regen,
silently emitting hundreds of dead edges into the merged graph.

## The G4 evidence

The 2026-05-20 dead-pixel sweep (sister unit `U-VIZ-G4-DEAD-PIXEL-SWEEP`)
on the 250,497-node / 786,400-edge merged graph found:

- **569 dead edges** (0.07% of total)
- **Top orphan:** `dispatcher.prism_cam` (157 inbound, all from
  `ghost.unwired.*Engine`)
- `dispatcher.prism_dev` (70), `dispatcher.prism_turning` (61),
  `dispatcher.prism_calc` (42), `dispatcher.prism_session` (37),
  `dispatcher.prism_ai` (29), `dispatcher.prism_intelligence` (28)
- **~500 of 569** trace to this seeder bug.

## The fix

`scripts/seed-ghost-from-unwired.mjs`:

1. Add a frozen `MCP_TOOL_TO_DISP_NODE_ID` map — 16 entries, one per
   distinct `dispatcher` value in `DISPATCHER_INFERENCE_RULES`. Every value
   uses the canonical `disp.` prefix.
2. Add `mcpToolToDispNodeId(mcpToolName)` resolver. Uses `Object.hasOwn`
   to guard against prototype-chain hits (e.g. `__proto__`,
   `constructor` — a scrutiny-caught P0 in the test phase that would
   otherwise return `Object.prototype` instead of a string).
3. Replace the edge construction:
   ```js
   to: `dispatcher.${inf.dispatcher}`,   // BEFORE
   to: mcpToolToDispNodeId(inf.dispatcher), // AFTER
   ```

R12 safety property: if a future inference rule introduces a target name
that isn't in the map, the resolver falls through to `disp.<lowercased>`.
That's worse than a real entry — but BETTER than the historical
`dispatcher.<name>` because it (a) uses the canonical prefix and (b)
surfaces as ONE dead pixel on the next G4 sweep instead of propagating
silently as ~500.

## Tests

`scripts/seed-ghost-from-unwired.test.mjs` — adds 11 cases under
`U-VIZ-G4-SEEDER-FIX` describe block:

- map is frozen + ≥16 entries
- every value uses `disp.` prefix, never `dispatcher.`
- every distinct `inf.dispatcher` from DISPATCHER_INFERENCE_RULES has a
  mapping entry (regression catch — adding a new inference rule without a
  matching map entry fails this test)
- `mcpToolToDispNodeId` happy-path 6 canonical mappings
- UNKNOWN inference → `disp.unknown` harmless fallback
- unmapped key → `disp.<lower>` fallback (R12)
- empty / null / undefined / number / object → `disp.unknown`
- adversarial: NaN, Infinity, `__proto__`, `constructor` → fallback path
  (prototype-chain pollution guard)
- `buildGhostFromUnwired` integration on 5 real engine names — edge.to
  uses `disp.*` not `dispatcher.*`
- UNKNOWN inference preserves no-edge contract
- source-grep oracle: the literal `` `dispatcher.${inf.dispatcher}` ``
  must NOT appear; `mcpToolToDispNodeId(inf.dispatcher)` MUST appear

36/36 tests PASS post-fix.

## Verify

```bash
cd H:/prism

# unit tests
node --test scripts/seed-ghost-from-unwired.test.mjs    # 36/36

# behavioral spot-check (5 high-conf samples + 1 UNKNOWN)
node --input-type=module -e "import('./scripts/seed-ghost-from-unwired.mjs').then(m=>{for(const n of['MillForceEngine','CollisionDetectorEngine','GCodeTemplateEngine','LatheGroovePostEngine','NeuralPredictorEngine','XyzzyFooBar']){const r=m.buildGhostFromUnwired({name:n,path:'x',mtime:null,sizeKB:5});console.log(n.padEnd(28),'->',r.edge?r.edge.to:'(no edge)');}});"

# end-to-end (operator-gated; the seeder is a regen-viz post-merge stage
# and acquires F11 lock — run via regen-viz or apply with cross-lock if
# touched standalone; see WIRE-NOTE in the script header)
```

After re-running `node scripts/regen-viz.mjs --full` the next G4 sweep
should show dead-edge count drop from 569 → ~70 (the residual edges are
unrelated — different generator class, separate follow-up).

## Pending follow-up

- `U-VIZ-G4-REGEN-VERIFY`: re-run regen-viz + G4 sweep, confirm dead-edge
  count drop. Operator-gated since regen takes ~minutes on this host.
- `U-VIZ-G4-DEAD-PIXEL-CRON` (queued by sister unit): weekly dated
  dead-pixel report so the next class of "two pieces both pass their own
  tests but assume different conventions" gets caught fast.

## Lesson

Sister to the G1 type-backfill discovery: this is the third confirmation
of the "two pieces both work but assume different conventions" failure
class. Both pieces (the seeder's MCP-tool-name convention + the graph's
file-derived id convention) work in isolation; the failure mode is at
the join. The G4 sweep IS the canary for that class — it's a CI test
that can't easily be written for the seeder alone or the graph alone
because the bug only exists in the cross-product.
