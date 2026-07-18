---
name: reference_alpha_hermes_health_root_path_fix_2026_06_27
description: Hermes proxy-health SessionStart inject probed /v1/health (404) not root /health -> false fleet-wide HUNG banner; fixed 2026-06-27 (slot:alpha)
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.469Z
aliases: reference_alpha_hermes_health_root_path_fix_2026_06_27
---


**Hermes proxy-health-inject false-HUNG: probed `/v1/health` instead of root `/health` (2026-06-27, slot:alpha, commit 829033c2f5).**

`U-HERMES-PROXY-HEALTH-INJECT` (3531072be8, 25h prior) built the SessionStart liveness probe as `fetch(\`${BASE_URL}/health\`)` where `BASE_URL = http://127.0.0.1:8645/v1` (the OpenAI-compat base). So it actually hit **`/v1/health`**, which the Hermes proxy **404s** (`path_not_allowed` — only `/chat/completions,/completions,/embeddings,/models,/responses` are forwarded under `/v1`). `classifyHealth` returns `"hung"` on `!r.ok` → a **false `🔴 Hermes proxy health -- HUNG` banner on every SessionStart, fleet-wide**, while the real endpoint `GET /health` (origin root) returned `{"status":"ok","authenticated":true}`. The banner told the operator to re-auth xAI OAuth when nothing was actually wrong.

**Fix:** pure `healthUrlFor(baseUrl)` returns `new URL(baseUrl).origin + "/health"` (scheme-less `catch` fallback strips a trailing `/v1`); `probeHealth` fetches the resolved root URL. 4 new R9 tests (25/25 pass); live hook verified SILENT against the healthy proxy.

**Blast-radius checked (R16 fit-the-whole):** the bug did NOT replicate. The two other health-probers were already correct — `scripts/hermes-mcp-server.mjs:41` (`base.replace(/\/v1$/,"")+"/health"`) and `.claude/hooks/octopus-provider-probe.mjs:263`. My `.origin` derivation is marginally MORE robust (also handles a trailing-slash base the regex-strip misses).

**Lesson:** an OpenAI-compat proxy's `/health` (and other ops endpoints) lives at the **origin ROOT**, not under the `/v1` API surface — never concatenate `${apiBase}/health` when `apiBase` carries the version segment. A health probe that 404s reads as "down/hung", manufacturing a false outage signal for a fully-healthy service (the dangerous direction for a fleet-wide SessionStart alarm). Verify a liveness probe against the LIVE endpoint before trusting its verdict.

P2 follow-ups (non-gating, logged by 3-of-3 arms B/C): (1) `healthUrlFor` scheme-less fallback yields an unfetchable URL → could hardenby prepending `http://` (pre-existing; default always has a scheme); (2) `new URL().origin` drops a reverse-proxy sub-path mount (`/hermes/v1` → drops `/hermes`) — switch to a `/v1/?$`-strip if sub-path mounts are ever supported; (3) `hermes-mcp-server.mjs`'s regex-strip would miss a trailing-slash base (`/v1/` → `/v1//health`) — origin-derivation is safer.

Related: [[reference_hermes_proxy_aiohttp_dark_root_cause_2026_06_26]] (the prior aiohttp/visibility meta-fix that built this hook) · [[reference_hermes_bridge_ms0_2026_06_13]].
