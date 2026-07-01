# Quote Deep Audit — Agent 9: Multi-Tenant

## Summary
PRISM's quoting engine exhibits **critical multi-tenant isolation gaps**. While a MultiTenantEngine exists (F5 feature), shop/tenant context is NOT threaded through quote API call paths, exposing data leakage risk in SaaS deployments.

## shop_id Threading Assessment

| Layer | Threaded? | Filtered? | Status |
|-------|-----------|-----------|--------|
| **QuoteEngine.ts** | NO | NO | Ignores shop_id entirely |
| **InstantQuoteEngine.ts** | NO | NO | No tenant parameter in signature |
| **QuoteEstimatorEngine.ts** | NO | NO | Hardcoded default shop rates |
| **Route: /quotes/instant** | NO | NO | Bypasses req.prismAuth.user.tenant_id |
| **Route: POST /api/v1/quote/generate** | NO | NO | No tenant extraction |
| **businessDispatcher (quoting_generate)** | NO | NO | Spreads params, no tenant context |
| **Zod schemas (instant_quote, quoting_generate)** | NO | NO | No shop_id/tenant_id fields defined |

## DB FK Coverage

**CRITICAL GAP**: PostgreSQL schema (schema.sql) has zero tenant/shop isolation:
- `quotes` table: NO shop_id, NO tenant_id
- `quote_line_items`: NO shop_id
- `machines` table: GLOBAL (shared across all shops)
- `materials` table: GLOBAL (shared across all shops)
- No WHERE clause filtering on shop_id in any quote query

Result: Two shops get the same machine rates, material costs, and quote numbering.

## Auth/JWT Carries shop_id?

- **AuthUser type** (src/mcp/auth.ts): Contains `sub` (subject), `role`, `scope` — NO `shop_id` field
- **authMiddleware**: Attaches `req.prismAuth.user` with role-based RBAC — NO tenant/shop context
- **JWT payload**: Validated by PrismOAuthServer but shop_id not extracted
- **MultiTenantEngine exists** but is NOT integrated into quote dispatcher

Quote routes receive `req.body` and call `callTool("prism_business", "instant_quote", req.body)`. The dispatcher never receives tenant context from middleware.

## Isolation Violations

1. **ShopConfigurationEngine** has shop profile support (ShopProfile.id) but QuoteEstimatorEngine ignores it
2. **QuoteEstimatorEngine.estimate()** uses hardcoded DEFAULT_RATES from JobCostingEngine (lines 62–69)
3. **InstantQuoteEngine** accepts `machine_type` override but no `shop_id` or `tenant_id` parameter
4. **Machine rate lookup**: Uses global `machines` table with fixed `hourly_rate` — no shop-specific rates

## Remediation Path

**MUST implement before SaaS go-live**:
1. Add `shop_id UUID FK` to quotes, quote_line_items tables
2. Add `shop_id` to QuoteInput, InstantQuoteInput, QuoteEstimatorInput interfaces
3. Extract `shop_id` from JWT in authMiddleware, attach to req.prismAuth
4. Pass shop_id through businessDispatcher → all quote engines
5. Filter machines/materials by shop_id in queries (or add shop-override table for rates)
6. Update Zod schemas to require/validate shop_id

## Score: 15/100

**Rationale**: MultiTenantEngine exists (F5) but is completely bypassed in quote pipeline. Auth has shop context capability but doesn't use it. Schema has no tenant isolation. High-risk for multi-shop data leakage.

