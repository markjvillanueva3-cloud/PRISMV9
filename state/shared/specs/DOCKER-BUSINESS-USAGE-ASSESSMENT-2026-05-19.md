# Docker Business Account — Usage Assessment for PRISM
**Date:** 2026-05-19
**Slot:** juliett (claude-db7a0592)
**Trigger:** user ask — "assess better docker usage (business account: kubernetes, builds, models, containers, docker scout and the mcp toolkit available in the app)"

> Doctrine reminder honored: this assessment verified PRISM's existing MCP command-bridge BEFORE proposing manual workflows (`docker mcp client ls` shows `claude-code` already wired to PRISM via `mcp-http-bridge.mjs` on :3100/mcp).

---

## 0. Local stack — measured this session

| Surface | Status | Version / Detail |
|---|---|---|
| Docker Desktop | ✅ running | 29.4.1 |
| Containers | ✅ 6/6 running | (qdrant, postgres, prism-server, prometheus, ollama, +1) |
| Docker MCP Toolkit | ✅ installed | catalog ref `mcp/docker-mcp-catalog:latest` (digest 89e38a…) |
| Docker Models | ✅ active | `gemma3 3.88B Q4_K_M` resident (2.31 GiB) |
| Docker Scout | ✅ v0.40.4 | **not configured for org** — `--org` flag mandatory for biz features |
| BuildKit / buildx | ✅ v0.29.0 | drivers: `default`, `desktop-linux`; platforms: amd64/arm64/arm/ppc64le |
| Kubernetes | ⚠ Docker Desktop has it but not probed | check via Docker Desktop → Settings → Kubernetes |
| Build Cloud | ⚠ not configured | requires `docker buildx create --driver cloud <org>/<endpoint>` |
| Docker Hub Org | ⚠ not configured | `docker login` w/ PAT + `docker scout config organization <org>` |
| Extensions | (empty list) | none installed |
| PRISM MCP bridge | ✅ live | `claude-code: prism: …mcp-http-bridge.mjs :3100/mcp` (stdio) |

---

## 1. Business-account features — what PRISM can actually use

### 1A. Docker Scout (HIGHEST LEVERAGE — immediate enable)
Org-scope unlocks **SBOM generation + CVE policy + remediation suggestions** for every PRISM image (prism-server, ollama, qdrant, postgres, prometheus). Pre-revenue value: surfaces supply-chain risk before JM Die's compliance audit.

**Activation (~5 min, no rebuild):**
```bash
docker login -u <user>                                       # PAT from hub.docker.com → Settings → Security
docker scout config organization <your-org-name>             # business org slug
docker scout cves prism-server                               # smoke test
docker scout policy list                                     # see auto-attached policies
docker scout enroll <your-org>                               # one-time
```

**Wire-up for PRISM:** new dispatcher action `prism_dev:docker_scout_scan` (sublist: `cves`, `policy`, `quickview`, `recommendations`). Each compose stack image scanned weekly via scheduled task → write JSON report to `state/shared/scout-reports/<image>-<date>.json` → surface critical CVEs as advisories.

### 1B. Docker MCP Toolkit (ALREADY INSTALLED — directly leverageable)
Toolkit provides **server discovery + client wiring + secret-vault-aware credential plumbing**. PRISM is already a custom MCP server (HTTP transport :3100/mcp via `mcp-http-bridge.mjs`); the toolkit can wire it INTO additional clients (cursor, vscode, crush) with one command.

**Quick wins:**
- `docker mcp catalog ls` lists 100+ pre-built MCP servers from Docker MCP Catalog (filesystem, git, postgres, slack, jira, etc.) — PRISM can call them as upstream tools to reduce custom-engine writing.
- `docker mcp client connect <client> <server>` standardizes per-host wiring (replaces manual `mcp_servers.json` edits across .vscode/.kiro/etc.).
- `docker mcp server init` scaffolds new MCP servers with secret-vault integration — ideal pattern for the **MasterPost CAM bridge** + **hyperMILL/Mastercam/Fusion360 bridges** queued under STAGE 8 PRISM-APP-QUEUE.
- Catalog publishing: PRISM MCP server → OCI image → publish to private Docker Hub org → other PRISM machines (PC-A / PC-B) pull instead of rebuilding from git.

**Wire-up:** new `prism_dev:docker_mcp_*` action family:
- `mcp_catalog_search <query>` → JSON list
- `mcp_server_init <name> --secrets <list>` → scaffold + secret declaration
- `mcp_client_connect <client>` → cross-host idempotent wiring
- `mcp_server_publish <image>` → OCI publish for PRISM-fleet sync

### 1C. Docker Models — local LLM inference (immediate offload lever)
`docker model` is Docker's first-party local-LLM runner (parallel to Ollama). Already has `gemma3 3.88B Q4_K_M` resident. PRISM already offloads to Ollama via `ollama-pipeline-injector.mjs`; **Docker Models is a redundant path but supports `keep-alive` + better Windows native** (no separate Ollama install for new machines).

**Decision:** keep Ollama as primary (more models, mature integration); add Docker Models as **fallback when Ollama is wedged** (`fleet-reaper-sweep.mjs` already detects daemon-down). The 113s qwen2.5-coder:3b cold-load on memory-pressured hosts (per [[reference_fleet_reaper_autonomy_robust_2026_05_16]]) would benefit from a parallel warm-model surface.

**Wire-up:** extend `ollama-task-offloader.mjs` with `dockerModelsFallback()` — if Ollama returns 503 / connect-refused, route to `docker model run <model> --prompt "..."` (CLI subprocess, no daemon required beyond Docker Desktop). Single-file patch, ~50 LOC.

### 1D. Build Cloud (only if cross-platform image builds appear)
Build Cloud is **paid per build-minute**; PRISM currently builds entirely on the local box. **No clear win** until: (a) PRISM publishes prism-server as multi-arch OCI for ARM (Apple Silicon devs) OR (b) JM Die deploys to ARM shop-floor edge devices. **Defer until a specific cross-arch ask arrives.** Activation when needed:
```bash
docker buildx create --driver cloud <org>/default --use
docker buildx build --platform linux/amd64,linux/arm64 -t prism-server:latest --push .
```

### 1E. Kubernetes (Docker Desktop integrated)
Single-node K8s in Docker Desktop. Useful for: (a) **PRISM compose stack as Helm chart** (5 services → 1 declarative manifest), (b) testing JM Die multi-shop deployments locally before shipping. Today PRISM uses plain compose + docker-compose.ollama-bridge.yml override; works fine for single-host.

**Recommendation:** **defer** until PRISM ships to a multi-shop deployment (LOW priority pre-revenue). Pattern when needed: `kompose convert` from existing compose → polish → store as Helm chart `infra/charts/prism/`.

### 1F. Hub Org (Docker Hub private registry)
Required to publish PRISM containers privately. Same `docker login` + business-PAT as 1A. Then `docker tag prism-server:latest <org>/prism-server:latest && docker push`. Enables: cross-PC fleet sync (PC-B `docker pull` instead of `git clone + build`), versioned PRISM releases (e.g., `<org>/prism-server:2026-05-19-juliett`).

---

## 2. Recommended PRISM units to ship — ordered by leverage

| Order | Unit ID | Cost | Leverage | Slot |
|---|---|---|---|---|
| 1 | **U-DOCKER-SCOUT-ENROLL** | XS (5 min) | Immediate CVE visibility on prism-server + 4 sidecars; gates revenue-side compliance | juliett |
| 2 | **U-DOCKER-MCP-DISPATCHER** | M (1 session) | New `prism_dev:docker_mcp_*` action family wiring Docker MCP CLI to PRISM dispatchers; unblocks one-command MCP-server scaffolding for 6 CAM bridges in PRISM-APP-QUEUE | juliett |
| 3 | **U-DOCKER-MODELS-FALLBACK** | S (½ session) | Resilience when Ollama wedges; single-file patch to ollama-task-offloader.mjs | juliett |
| 4 | **U-DOCKER-SCOUT-SCHEDULED** | S (½ session) | Weekly CVE scan on all 5 prism images via Windows scheduled task → JSONL ledger → advisory hook | juliett |
| 5 | **U-DOCKER-HUB-PUBLISH** | M (1 session) | Multi-PC fleet sync via `docker pull` instead of git+build; only after #1 lands (Scout signs published image) | juliett |
| 6 | **U-DOCKER-CATALOG-AUDIT** | S (½ session) | One-time scan of `docker mcp catalog ls` → identify upstream MCP servers PRISM could call instead of building (e.g., filesystem, git, postgres MCP servers may obviate parts of `prism_session` / `prism_memory`) | juliett |
| -- | U-DOCKER-BUILD-CLOUD-WIRE | M | DEFERRED — no cross-arch ask yet | -- |
| -- | U-DOCKER-K8S-HELM | L | DEFERRED — no multi-shop deploy yet | -- |

## 3. Cost / risk

- Scout enrollment is **included** in Docker Business; no extra spend.
- MCP toolkit is **free** (Docker Desktop bundle).
- Hub private registry is **included** in Business (unlimited private repos).
- Build Cloud bills per build-minute (~$0.05/min on M-tier); only activate when needed.
- **Risk on Hub publish:** double-check `.dockerignore` excludes `state/shared/handoffs/`, `mcp-server/data/state/`, `knowledge/memories/` BEFORE first push — those carry session-specific operational data. Add a pre-push lint to `U-DOCKER-HUB-PUBLISH`.

## 4. Doctrine alignment

- **R5 (model only for judgment)** — Docker MCP catalog browsing is deterministic; route to bash subprocess, not Claude.
- **R8 (read before write)** — `docker mcp client ls` already showed PRISM is wired; do NOT re-scaffold the prism MCP server, only ADD new servers (CAM bridges) via the toolkit pattern.
- **[[feedback_never_delete_only_disable]]** — when retiring an unused MCP server, use `docker mcp client disconnect`, never `docker mcp server delete`.
- **Pre-revenue: AI training first** ([[feedback_ai_training_first_before_revenue]]) — Docker Scout is supply-chain hygiene, parallel to AI training, not a revenue dependency. Ship it now, deploys cleanly.

## 5. Next actions

1. **Operator (you):** run `docker login` with business PAT + `docker scout config organization <your-org-slug>` → unblocks unit #1 above.
2. **This chat (juliett, /loop 5m):** picks up U-DOCKER-SCOUT-ENROLL once the org slug is set; otherwise proceeds with U-DOCKER-MCP-DISPATCHER (no org dependency).
3. **Cross-reference** — every action above also gets a row in JULIETT-OPEN-TASKS-2026-05-19.md so /pick-unit can find them.

## See also
- `state/shared/specs/JULIETT-OPEN-TASKS-2026-05-19.md` — sibling punch-list
- `state/shared/specs/JULIETT-CONSOLIDATED-WORK-PLAN-V2.md` — broader juliett backlog
- `mcp-server/data/milestones/JULIETT-12CHAT-ALLOCATION-MS0.json` — milestone envelope
- `state/shared/slot-task-queues.json:queues.juliett` — runtime queue (87 units, all unset)
