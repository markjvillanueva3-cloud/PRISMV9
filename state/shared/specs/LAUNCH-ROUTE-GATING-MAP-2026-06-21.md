# Launch Route Tier-Gating Map — 2026-06-21

> **Author:** slot:quebec. **Why:** the entitlement layer (U-COMM-03/05) is built + enforced, but `requireTier` is wired onto only ONE route (`sfc.ts /calculate`). Every other PAID product feature route is still **ungated** — a free user can call it. This maps each paid route → its enforceable `requireTier` key → owning slot, so each gate lands WITH that feature's FE auth/plan wiring (never blind — flipping a gate 403s current free/anon callers).
>
> **Enforceable keys** (`GATED_FEATURES`, tierGate.ts): `speed_feed, program_generate, simulation, dfm, stochastic, api_access, print_to_program, edm_program, laser_program, waterjet_program`. Only these enforce today; richer product keys (sfc.nine_axis, quoting, cadcam, wizard.*) need a key added to `GATED_FEATURES` + `checkTierAccess` first.

## Gating map (route → key → tier floor → owner)
| Route | requireTier key | Tier floor (per pricing matrix) | Owner slot | Notes |
|-------|-----------------|----------------------------------|-----------|-------|
| `sfc.ts /calculate` | `speed_feed` | free (10/day) | quebec/oscar | DONE (a48018838b) |
| `speedfeed.ts /orchestrate` | `speed_feed` | free (10/day) | oscar | full pipeline; meter on success |
| `speedfeed.ts /stochastic` | `stochastic` | shop+ | oscar | free/starter/pro = denied |
| `cam.ts /toolpath/generate` | `program_generate` | pro+ (free/starter=0/day) | kilo | core paid CAM feature |
| `cam.ts /auto-print-to-program` | `print_to_program` | pro+ | kilo | print→program |
| `cam.ts /simulate` | `simulation` | pro+ | kilo | |
| `cam.ts /post-process` | `program_generate` | pro+ | echo/kilo | post emit |
| `cad.ts /features`,`/transform` | (needs `cadcam` key added) | shop+ | delta | add key to GATED_FEATURES+checkTierAccess first |
| quoting routes | (needs `quoting` key added) | shop add-on | charlie | Wave 2 |
| wedm/edm program routes | `edm_program` | pro+ | mike | key already exists |

## How to gate ONE route (the pattern, from sfc.ts)
```ts
import { requireTier } from "../middleware/tierGate.js";
import { recordFeatureUse } from "../middleware/attachUserPlan.js";
router.post("/x", requireTier("<key>"), async (req,res,next)=>{
  try { const result = await callTool(...);
        if (result && !(result as {error?:unknown}).error) recordFeatureUse(req,"<key>");
        res.json({result}); } catch(e){ next(e); }
});
```
`attachUserPlan` is already global (routes/index.ts), so `req.user.plan/usage/overrides` are populated — no per-route auth needed.

## SEQUENCING RULE (R12 — do not flip blind)
A gate 403s current free/anon callers of that route. So each gate lands **together with** the FE change that (a) requires the user to be signed in for that feature and (b) shows an upgrade prompt on 403. Owning slot gates the route + quebec wires the FE 403→upgrade handling. Do NOT gate a route while its FE page still calls it anonymously in the live app.

## To add a richer product key (e.g. cadcam, quoting)
1. Add the key to the `GatedFeature` union + `GATED_FEATURES` (tierGate.ts).
2. Add a `case` in `checkTierAccess` mapping it to a TierLimits field (add the field to TierLimits + pricing-registry PLAN_LIMITS for all 5 plans).
3. Then the route can `requireTier("<key>")` and the override admin endpoint accepts it.

---
_slot:quebec 2026-06-21. Companion to U-COMM-BACKEND-IMPL-SPEC + reference_u_comm_05_entitlement_overrides_2026_06_21. The entitlement ENGINE is done; this is the per-route ROLLOUT, owned per-slot + sequenced with FE._
