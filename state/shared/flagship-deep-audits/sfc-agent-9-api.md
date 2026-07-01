# SFC Deep Audit — Agent 9: API / Router

## Router Registration Status
**FULLY REGISTERED** — SFC has **dedicated routes**:
- `/api/v1/sfc/` routed via `createSfcRouter()` (index.ts:114)
- `/api/v1/speed-feed/` routed via `createSpeedFeedRouter()` (index.ts:115)
- Both routers mounted on global middleware stack (CORS, security headers, rate limit, optional token)

Mill router: NOT registered (noted in context; outstanding fix)
Lathe/EDM: registered

## Endpoint Inventory

| Method | Path | Auth | Rate Limit | Target Tool |
|--------|------|------|-----------|-------------|
| POST | `/api/v1/sfc/calculate` | Optional | Global RL | `prism_product:sfc_calculate` |
| POST | `/api/v1/sfc/cycle-time` | Optional | Global RL | `prism_calc:cycle_time` |
| POST | `/api/v1/sfc/engagement` | Optional | Global RL | `prism_calc:engagement` |
| POST | `/api/v1/sfc/deflection` | Optional | Global RL | `prism_calc:deflection` |
| POST | `/api/v1/sfc/power-torque` | Optional | Global RL | `prism_calc:power_torque` |
| POST | `/api/v1/sfc/surface-finish` | Optional | Global RL | `prism_calc:surface_finish` |
| POST | `/api/v1/sfc/tool-life` | Optional | Global RL | `prism_calc:tool_life` |
| POST | `/api/v1/speed-feed/orchestrate` | Optional | Global RL | `prism_calc:sf_orchestrate` |
| POST | `/api/v1/speed-feed/quick` | Optional | Global RL | `prism_calc:sf_quick` |
| POST | `/api/v1/speed-feed/stochastic` | Optional | Global RL | `prism_calc:sf_stochastic` |
| POST | `/api/v1/speed-feed/resolve/machine` | Optional | Global RL | `prism_calc:sf_resolve_machine` |
| POST | `/api/v1/speed-feed/resolve/tool` | Optional | Global RL | `prism_calc:sf_resolve_tool` |
| POST | `/api/v1/speed-feed/resolve/material` | Optional | Global RL | `prism_calc:sf_resolve_material` |
| POST | `/api/v1/speed-feed/compare` | Optional | Global RL | `prism_calc:sf_compare` |
| POST | `/api/v1/speed-feed/optimize` | Optional | Global RL | `prism_calc:sf_optimize` |
| POST | `/api/v1/speed-feed/inventory-select` | Optional | Global RL | `prism_calc:inventory_tool_select` |
| POST | `/api/v1/speed-feed/tool-roi` | Optional | Global RL | `prism_calc:tool_roi_analysis` |

**Total: 17 endpoints** (7 SFC + 10 SpeedFeed)

## Auth Status
- **No endpoint-level auth enforcement** — all use `optionalToken` middleware (line 109)
- Request validation: Only `/sfc/calculate` has field validation (`requireFields("material", "operation")`)
- No role/permission checks
- Suitable for B2B API (shop floor terminals, mobile apps) but risky for public SaaS

## Strengths
✓ Clean router separation (SFC vs SpeedFeed deliberate split)
✓ Global middleware stack handles CORS, security headers, rate limiting
✓ Proper error handling via `next(e)` delegation
✓ Response shape consistent: `{ result, safety?, meta? }` or `{ result }`
✓ Tool invocation pattern clean (callTool interface)

## Gaps
✗ **No endpoint-level auth** — attackers can brute-force speed/feed calculations for competitor's tooling/material
✗ **No field validation** except `/calculate` — risk of null/undefined propagation into physics engines
✗ **No request schema** — OpenAPI docs not auto-generated; clients reverse-engineer via trial
✗ **No response versioning** — clients can't distinguish old vs new response shapes
✗ **No endpoint-level rate limiting** — could DOS `/optimize` (MOPSO is CPU-heavy)
✗ **No request/response logging** — audit trail missing (callTool logs only)

## Score: 62/100
| Aspect | Rating | Notes |
|--------|--------|-------|
| Router registration | 100 | Proper dedicated routers |
| Middleware coverage | 80 | Global stack covers basics; no endpoint-level throttling |
| Auth enforcement | 20 | Optional only; no permission model |
| Request validation | 30 | Only 1/17 endpoints validate input |
| Error handling | 75 | Delegates to next(e); no custom error codes |
| Response shape | 80 | Consistent but undocumented |
| **Overall** | **62** | **Functional for internal shop use; not SaaS-ready** |

## Recommendations (Priority)
1. **Add request schemas** (Zod) per endpoint → auto-validate + OpenAPI generation
2. **Add endpoint-level rate limiting** for CPU-heavy ops (optimize, stochastic)
3. **Require auth for material/tool lookups** — IP-restricted or API key gated
4. **Standardize error codes** (INVALID_INPUT, UNSUPPORTED_MATERIAL, etc.)
5. **Add response versioning** (Accept: application/vnd.prism.v1+json)
