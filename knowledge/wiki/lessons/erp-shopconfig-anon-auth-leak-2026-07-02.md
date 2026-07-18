---
title: ERP shop-config anon-auth leak (U-ERP-SHOPCONFIG-AUTH)
type: lesson
tags: [security, auth, erp, anon-leak, hotel, scrutiny]
created: 2026-07-02
commits: [43ee311923, 6cf403a10e, ba02e7a1ef]
slot: hotel
---

# ERP shop-config anon-auth leak — the ERP-side sibling of the fleet anon-leak-close class

## The bug (P0)

`app.use("/api", optionalToken)` (`mcp-server/src/routes/index.ts:144`) populates `req.userId` from a valid Bearer but **never rejects anon**. Four ERP routers carried **zero** auth of their own and so were fully anonymously reachable:

| Router | Mount | Anon exposure |
|---|---|---|
| `shopProfile.ts` | `/api/v1/shop` | `GET /profile` + `/preferences` leaked the shop rate card + `overhead_pct`/`margin_floor_pct`/`material_markup_pct`; `PUT /profile` + machine/magazine CRUD were anon **config-tamper** writes to `data/shop/shop-profile.json` (rewrites the rate card all costing reads). |
| `traveler.ts` | `/api/v1/dispatch` | whole-shop dispatch board read + anon assign/reorder/remove mutations. |
| `shopLive.ts` | `/api/shop` | customer/part/job state + anon job/labor/quantity/approval mutations. |
| `operating-system.ts` | `/api/v1/operating-system` | anon `GET /search` across employee/invoice/PO indices (cross-entity PII/financial). |

Same class the fleet closed on quoting (charlie), `hotel-portal.ts` (`18f8da8ed9`), `wedm-erp.ts`, `inbox/integrations/doc.ts` — just never applied to the shop-config / shop-live / operating-system / traveler surface.

## The fix

Router-level `router.use(verifyToken)` on all 4 (mirrors the proven `hotel-portal.ts:49` gate) + `requireRole` on privileged mutations: config writes → `admin`/`lead`; dispatch + job-lifecycle + approval → `lead`+; operating-system → login-only (routes are `:userId`-path-scoped). FE `web/src/api/shopProfile.ts` (the one tokenless client) wired through `getRequestHeaders()`.

## Two scrutiny catches (why the multi-arm gate is load-bearing)

1. **Per-file 2-arm → P1 regression:** gating `shopLive` broke `/shop-tv`, a login-less wall-mounted kiosk (`ShopFloorTVPage`) reading `/shop/snapshot` + `/shop/jobs`. Fixed with a GET-only `KIOSK_ANON_READS` exemption.
2. **End-of-task 3-of-3 arm A → P1 leak the exemption re-opened:** arm A **read the `Job` Zod schema** (`schemas/shop/shopDomain.ts:57`) and found the raw Job carries `customer` (confidential) + `costs.{estimated_total,actual_total}` (latent-zero cost) + `provenance.created_by` (PII). Anon `/shop/jobs` returned all three. **Arms B and C both traced `listJobs()` and concluded "no cost" — they read the handler, not the TYPE.** Fixed with `redactJobForKiosk` (allowlist projection to floor-visible fields for anon; authed callers get the full board via `req.userId` set by the global `optionalToken` before the router mounts).

## Lessons

- **A route returning a typed object is only as safe as the TYPE.** Read the schema, not just the handler — a redaction claim ("no cost/PII") must be checked against every field the return type declares.
- **A kiosk exemption needs redaction, not a pass-through.** Allowlist-project the anon view; don't ship the raw object.
- **A leak-scan test must scan the ACTUAL field names.** Scanning `/rate/`,`/margin/` misses `estimated_total`/`customer`/`created_by` (R9 toothless). Seed a real record with the secret values and assert they're stripped — the test must FAIL on revert.
- **Live probe vs stale bundle:** the running `:3100` served a pre-change in-memory bundle → still 200'd anon. That's a deployment/restart artifact, not a code defect; a shared/unidentified server is not yours to blind-restart. Real-HTTP tests against the production route factories are the stronger, honest proof.

Related: [[hotel-portal-auth-2026-06-24]], the fleet anon-leak-close sweep.
