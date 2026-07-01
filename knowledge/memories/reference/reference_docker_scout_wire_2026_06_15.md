---
name: reference_docker_scout_wire_2026_06_15
description: "DOCKER-BUSINESS-MS0 (2026-06-15, slot:alpha): operator asked to use the Docker Business subscription further. Shipped U-DOCKER-SCOUT-WIRE (scripts/docker-scout.mjs read-only Scout wrapper, org-gated, ready-on-enroll, 18 tests) + U-DOCKER-ASSESS-REFRESH (current done/open map). Scout is INSTALLED but UN-enrolled -> the marquee Business lever is wired but inert until the operator runs `docker login` + `docker scout config organization <org>`. Build Cloud/K8s correctly deferred."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.555Z
aliases: reference_docker_scout_wire_2026_06_15
---


# Docker Business further-usage (2026-06-15, slot:alpha)

Operator: "can we utilize Docker further than what we're already doing... paid business subscription I
don't think we're taking advantage of" -> "do it all if you can". Refreshed juliett's 2026-05-19
assessment + shipped the highest-value keyless lever.

## Live state (verified this session)
Docker Desktop 29.4.3 running · MCP toolkit v0.42.0 · Scout 1.20.4 INSTALLED but **config EMPTY** ·
**not logged in** (`user=`) · 5 stack containers (ollama, prometheus, qdrant, grafana, postgres).

## Shipped
- **U-DOCKER-SCOUT-WIRE** (`scripts/docker-scout.mjs` + test, 18): READ-ONLY Scout wrapper. Hard
  allowlist `config/cves/quickview/recommendations/policy` (can NEVER shell `enroll`/`config
  organization`/`push` -- buildScoutArgs throws). Modes: config · images (live `docker ps`) ·
  quickview/cves/recommendations <image> · scan-all (-> dated JSONL ledger `state/shared/scout-reports/`)
  · policy. All Scout-feature modes GATED on enrollment -> fail loud + the exact 2 enroll commands
  (inert+ready-on-enroll, same pattern as the OpenRouter cloud tier). execFile argv-array (no shell
  injection); `--`-positionals rejected pre-flag (no arg injection). 1-arm scrutiny PASS, 2 P2s closed
  (runScout carries stderr+code on non-zero exit; report date-stamped). LIVE: config->'enrolled NO'+hint,
  images->the real 5 containers.
- **U-DOCKER-ASSESS-REFRESH** (`state/shared/specs/DOCKER-BUSINESS-USAGE-ASSESSMENT-2026-06-15.md`):
  done/open map. DONE: Models fallback (ask-ollama callDockerModel), docker-mcp.mjs reader,
  prism-hooks-broker, Scout-wired. OPEN: MCP-catalog consumption (0 of 100+ servers), Hub registry.
  DEFERRED (correct): Build Cloud (no cross-arch), K8s (no multi-shop).

## THE operator action (unblocks Scout + Hub)
`docker login -u <user>` + `docker scout config organization <your-org>` -> then
`node scripts/docker-scout.mjs scan-all` produces a CVE ledger of all 5 stack images.

## Not done (honest, flagged not dropped)
MCP-catalog audit (CLI `docker mcp catalog show` flaky/slow this session); `prism_dev:docker_scout_*`/
`docker_mcp_*` dispatcher wiring (cross-domain -> juliett owns the Docker stack); Hub publish (needs login).

Cross-domain note: Docker infra is juliett's domain; this was operator-directed, new-files-only (no
collision with juliett's docker-mcp.mjs/compose). Related: [[reference_docker_mcp_wire_ms0_2026_05_19]].
