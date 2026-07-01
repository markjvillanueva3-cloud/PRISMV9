# Docker Business Account — Usage Assessment REFRESH

**Date:** 2026-06-15
**Slot:** alpha (claude-ad9c3041)
**Trigger:** operator ask — "can we utilize Docker any further than what we're already doing with it? I have a paid business subscription which I don't think we're taking advantage of" → "do it all if you can"
**Supersedes status of:** `DOCKER-BUSINESS-USAGE-ASSESSMENT-2026-05-19.md` (juliett) — that analysis is still correct; this refresh marks DONE-vs-OPEN ~4 weeks later and adds the Scout wiring shipped this session.

> Verified live this session: Docker Desktop **29.4.3 running**, MCP toolkit **v0.42.0**, Scout **1.20.4 installed but config EMPTY**, **not logged in** (`user=`), 5 stack containers running (ollama, prometheus, qdrant, grafana, postgres).

---

## Bottom line
You are using **resilience + read-only** Docker features (Models fallback, MCP reader, hooks-broker) but **none of the Business-tier marquee features** (Scout CVE/SBOM, Hub private registry, MCP-catalog consumption). The single highest-value untapped lever — **Docker Scout** — is now **WIRED and ready**; it just needs your one-time `docker login` + org enroll to go live. Build Cloud + Kubernetes remain correctly deferred (no cross-arch / multi-shop need yet).

## Status matrix (vs the 6 units juliett proposed 2026-05-19)

| Feature / Unit | Status (2026-06-15) | Detail |
|---|---|---|
| **Docker Models fallback** (U-DOCKER-MODELS-FALLBACK) | ✅ **DONE** | `ask-ollama.mjs` `callDockerModel`/`mapOllamaToDockerModel` → `docker model run gemma3` when the Ollama daemon is down. Resilience for the local-LLM offload lane. |
| **Docker MCP reader** (U-DOCKER-MCP-READER) | ✅ **DONE** | `scripts/docker-mcp.mjs` — read-only toolkit reader (status/version/clients/catalog). |
| **prism-hooks-broker** container | ✅ **DONE** (new) | `scripts/docker/prism-hooks-broker.Dockerfile` — containerized hook execution on :9876 (OBSIDIAN-INTELLIGENCE-MS3). |
| **Docker Scout** (U-DOCKER-SCOUT-WIRE) | 🟡 **WIRED — ready-on-enroll** (this session) | `scripts/docker-scout.mjs` (read-only, org-gated, 18 tests). Inert + fail-loud until you enroll. **THE operator action below.** |
| **Docker MCP Catalog consumption** | ⬜ **OPEN** | One catalog registered (`mcp/docker-mcp-catalog:latest`); PRISM consumes **0** of its 100+ prebuilt servers. Opportunity: wire filesystem/git/postgres MCP servers as upstream tools instead of building engines (R8). CLI enumeration was flaky this session — needs a focused audit pass. |
| **Docker Hub private registry** (U-DOCKER-HUB-PUBLISH) | ⬜ **OPEN — needs login** | Cross-PC fleet sync (PC-B `docker pull` vs git+rebuild). Needs `docker login` + a `.dockerignore` pre-push lint (must exclude handoffs/state/memories). |
| Build Cloud (U-DOCKER-BUILD-CLOUD) | ⏸ **DEFERRED** | Bills per build-minute; no cross-arch ask yet. |
| Kubernetes / Helm (U-DOCKER-K8S-HELM) | ⏸ **DEFERRED** | No multi-shop deploy yet. |

## THE one operator action (unblocks the biggest lever)
```bash
docker login -u <user>                          # Business PAT: hub.docker.com -> Settings -> Security
docker scout config organization <your-org>     # your Docker Business org slug
```
Then `node scripts/docker-scout.mjs config` flips to "enrolled: YES" and:
- `node scripts/docker-scout.mjs scan-all` → CVE quickview of all 5 stack images → dated JSONL ledger at `state/shared/scout-reports/`.
- The same login also unblocks Hub private-registry publish.

## What I shipped this session ("do it all I can", keyless)
- **U-DOCKER-SCOUT-WIRE** — the Scout wrapper above (built+tested+live-validated the pre-enroll paths).
- **This refresh** — the current done/open map.

## Honestly NOT done (needs operator or is cross-domain — flagged, not silently dropped)
- **Scout enroll + Hub publish** — gated on your `docker login` (your Business credentials; I can't and shouldn't).
- **MCP-catalog audit** — `docker mcp catalog show` CLI was flaky/slow this session; deferred to a focused pass (juliett's Docker domain or a follow-up).
- **`prism_dev:docker_scout_*` / `docker_mcp_*` dispatcher wiring** — both readers are CLIs today; wiring them into the MCP dispatcher is a cross-domain follow-up (juliett owns the Docker stack).

## See also
- `DOCKER-BUSINESS-USAGE-ASSESSMENT-2026-05-19.md` — the original (juliett) analysis (still valid).
- `scripts/docker-scout.mjs` · `scripts/docker-mcp.mjs` — the read-only wrappers.
- `[[reference_docker_mcp_wire_ms0_2026_05_19]]` — the Models-fallback + reader memory.
