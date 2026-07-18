# ERP/Business LIVE smoke -- 2026-06-28T00:16:45.375Z

Bridge: `http://127.0.0.1:3100` | route file: `mcp-server/src/routes/erp.ts` | probed: **64** GET reads (read-only).

| status | count |
|---|---|
| OK | 36 |
| EMPTY | 21 |
| DENIED | 0 |
| AUTH | 0 |
| ERROR | 7 |
| UNREACHABLE | 0 |

## ERROR / UNREACHABLE (real dead-wire signal -- 7)
- `GET /erp/a3-report-list` -- **ERROR** -- HTTP 501
- `GET /erp/a3-report/1` -- **ERROR** -- HTTP 501
- `GET /erp/revenue-forecast` -- **ERROR** -- inner error: Unknown business action: revenue_forecast
- `GET /erp/cash-flow` -- **ERROR** -- HTTP 501
- `GET /erp/operations-kpis` -- **ERROR** -- HTTP 501
- `GET /erp/margin-trends` -- **ERROR** -- HTTP 501
- `GET /erp/timecard-audit-log` -- **ERROR** -- HTTP 501

_Re-run: `node scripts/erp-live-smoke.mjs`. EMPTY/DENIED with synthetic params are expected (no seeded resource)._