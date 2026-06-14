# U-DOCKER-DAEMON-RECOVERY — triage (2026-05-25)

> Unit: U-DOCKER-DAEMON-RECOVERY (JULIETT-12CHAT-ALLOCATION-MS0, cost=S, roi=9.5). Originally surfaced by JULIETT iter-3.5 CRITICAL alert claiming Docker daemon HTTP 500 + Qdrant/Postgres/Prometheus DOWN. Closed in /loop iter7, slot:golf, claude-9e91d800.

## TL;DR

The JULIETT iter-3.5 alert's premise is **stale**. Current state (2026-05-25 17:10 CST):

| Component | Status |
|---|---|
| Docker daemon (CLI) | `docker info` → v29.4.3, 9 containers, 9 images |
| Docker TCP API `:2375/_ping` | Closed (expected — Windows Docker Desktop uses named pipe by default; not a fault) |
| `prism-qdrant` container | Up 3h healthy, HTTP 200 on :6333 |
| `prism-postgres` container | Up 3h healthy (TCP wire protocol; `docker ps` confirms; HTTP probe expected to fail) |
| `prism-prometheus` container | Up 3h running, HTTP 200 on :9090/-/healthy |
| `prism-ollama` container | Up 3h healthy |
| `nim-embed-e5` container | Up 3h healthy |
| `prism-grafana` container | Up 3h running |

The "HTTP 500 from Docker daemon" detection that triggered JULIETT's alert was almost certainly probing `:2375/_ping` (the TCP daemon endpoint). On Windows Docker Desktop that endpoint is intentionally closed for security; the daemon uses `\\.\pipe\docker_engine` instead. Probing the wrong endpoint surfaces `actively refused` / `HTTP 500`, but the daemon itself is healthy and downstream containers run normally.

The compound "master-index BM25-only fleet-wide" claim was downstream of the false daemon-down signal — Qdrant has been UP throughout, so master-index has had its vector store available the whole time.

## Recommended hardening (deferred)

To prevent this false-positive class going forward:

1. **Health probe should call `docker info` (CLI) OR named-pipe endpoint, NOT TCP `:2375`** — TCP is opt-in on Windows. Today's probe is checking a port that's intentionally closed.
2. **OR** enable TCP on Windows Docker Desktop (Settings → General → Expose daemon on tcp://localhost:2375 without TLS) if a daemon-RPC consumer actually needs it.
3. Add a per-container health gate to the same probe set so that "Docker WEDGED" only fires when at least one container ALSO fails its container-level health check (today the probe is single-shot on the TCP endpoint).

These are minor infrastructure improvements — not blocking. JULIETT can re-file a sharper unit if the false-positive recurs.

## Resolution

Unit closes as **resolved-by-context** (same shape as U-FH03 in iter5). No remediation needed. Diagnostic captured so the next time JULIETT's alerter fires this signal, the operator can disambiguate.

— Triaged 2026-05-25 by claude-9e91d800 (slot:golf, /loop iter7).
