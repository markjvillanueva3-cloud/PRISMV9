# Docker MCP Catalog — R8 Audit for PRISM
**Unit:** [DOCKER-MCP-WIRE-MS0]/U-CATALOG-AUDIT
**Date:** 2026-05-19
**Slot:** juliett (claude-db7a0592)
**Source:** `docker mcp catalog server ls mcp/docker-mcp-catalog:latest` → 315 servers, cached at `.cache/docker-mcp-catalog-2026-05-19.txt`
**Docker MCP Toolkit version:** v0.40.4 (confirmed via `docker mcp --version` this session — wire-up steps below are pinned to this version's CLI shape)
**Catalog freshness:** snapshot 2026-05-19; regenerate if older than 14 days (Docker MCP Catalog adds servers continuously)
**Live caveat:** `docker mcp client ls` this session shows **`claude-code: disconnected`** even though PRISM's :3100/mcp HTTP bridge is the wired transport. Before invoking any `docker mcp client connect` step in §5, first verify the disconnect is the toolkit's reporting state and not a real outage — `curl -s http://127.0.0.1:3100/mcp/health` (or equivalent) must succeed.

> **R8 (read before write) applied at the stack level.** Before PRISM builds any new dispatcher, ask: does an upstream MCP server already cover it? Result: 6 CAM bridges remain net-new work (no upstream coverage); ~7 infra surfaces may be replaceable with upstream MCP servers.

---

## 1. The headline finding

**NO upstream MCP servers exist for CAM/CAD specialist software.** Catalog filter for `mastercam`/`hypermill`/`fusion`/`solidworks`/`inventor`/`esprit`/`hsm`/`autodesk`/`siemens-nx`/`catia` returns **zero hits**. The closest manufacturing-adjacent server is `husqvarna-automower`. PRISM's 6 CAM bridges queued in STAGE 8 PRISM-APP-QUEUE (Mastercam, hyperMILL, Fusion360, Inventor, SolidWorks, Esprit) are **confirmed net-new work** — not duplicating any upstream effort. **R8 dedup-preflight: PASS.**

This is the highest-leverage intel from the audit: PRISM's CAM-bridge milestone IS unique value, not reinventing what Docker MCP Catalog already provides.

---

## 2. Infrastructure overlap — upstream may replace custom PRISM dispatchers

| Upstream MCP server | PRISM equivalent | Replace? | Notes |
|---|---|---|---|
| `prometheus` | container in prism compose stack; no dedicated dispatcher action | **Compare-and-decide** | If PRISM only ever reads metrics, upstream beats custom; if custom alerts/policies needed, keep PRISM-side |
| `filesystem` | `prism_file_read` (guardDispatcher) + `prism_session:cross_session_claim` / `cross_session_is_file_claimed` / `cross_session_release` (claim-aware peer-coordination); FS writes go through the Claude Edit/Write tools (claim-guarded by `file-claim-guard.mjs` hook) | **Keep PRISM** | The hook+dispatcher chain carries `file-claim-guard` peer-aware semantics across the 13-slot fleet; upstream `filesystem` server is a single-process tool with no peer coordination |
| `git` + `github` + `github-official` (catalog lines 859, 866, 880 confirmed) | git via Bash + 0 dedicated dispatcher action | **Add upstream — NEW CALLERS ONLY, do NOT bulk-swap** | Many existing hooks (e.g., `scrutiny-3way.mjs`, `goal-complete-gate.mjs`, `commit-ownership-guard`) shell out via `execFile/spawn` and parse `git status --porcelain` / `git log --format=...` text outputs by line. A wholesale swap to a JSON-shape MCP server breaks every parser silently. Staging discipline: (a) new code uses upstream MCP server, (b) existing hooks audited one-by-one with regression tests before swap, (c) the "~12 calls" figure cited in §4 below is an *upper bound* not a verified count |
| `gitlab` | none | **Add if needed** | Only if a GitLab integration becomes required |
| `memory` | `prism_memory` dispatcher: `remember` / `semantic_search` / `qdrant_vector_search` / `qdrant_vector_upsert` / `agent_memory_remember` / `agent_memory_query` / `emerging_thesis` (Qdrant + Postgres-backed; action names grepped from memoryDispatcher.ts 2026-05-19, not fabricated) | **Keep PRISM** | 5-namespace schema (memory/wiki/commands/handoffs/specs), 768-d nomic embeddings, per-agent + tribal stores, multi-chat lock; upstream `memory` server is single-namespace KV |
| `time` (catalog line 2016 confirmed) | Decentralized: 10+ files in `scripts/lib/` carry timestamp/formatDate/isoDate/toISOString helpers; no single PRISM dispatcher action | **Centralize, optionally via upstream** | Frequent helper duplication suggests CENTRALIZATION value (single source of truth); whether the canonical home is a new `prism_session:time_*` action OR the upstream `time` MCP server is a follow-up decision. Do NOT advertise this as "PRISM has nothing" — it has scattered helpers, just not a center |
| `obsidian` | `OBSIDIAN-INTELLIGENCE-MS3` engine family (`IdeaBlockRagEngine`, `KnowledgeDistillationEngine`, `MemoryConsolidationEngine`, `AgentOverlayEngine`, `VoiceCaptureEngine`) + Obsidian-PRISM-OS routing skills; verified via knowledge/wiki/architecture/* not via dispatcher action-name (intentionally — the routing layer is the doctrine surface, not a single dispatcher action) | **Keep PRISM** | PRISM owns the vault; upstream is generic remote-access; PRISM's `IdeaBlockRagEngine` + `KnowledgeDistillationEngine` exceed upstream |
| `sequentialthinking` | none (Claude does this internally) | **Skip** | Redundant with model's own reasoning |
| `markitdown` + `markdownify` | none | **Add upstream** | Cheap markdown<->HTML conversion; reduces custom parsers in PRISM scripts |
| `playwright` + `puppeteer` | none | **Add upstream** | Browser automation; useful for blueprint OCR validation + DOM-driven UI testing |
| `mcp-code-interpreter` + `e2b` | `prism_dev:*` actions | **Keep PRISM** | PRISM has tighter integration with build/test pipeline + Karpathy gates; sandbox executors add little |
| `kubernetes` + `kubectl-mcp-server` | none | **Add when multi-shop deploy** | Deferred (per docker-business-usage assessment, K8s is multi-shop concern) |
| `huggingface` | `OllamaTaskOffloaderEngine` routes locally | **Add complementary** | When local Ollama insufficient, hf inference endpoints via MCP |
| `arxiv-mcp-server` + `paper-search` + `wolfram-alpha` | none | **Add for research** | The `/pdf-learn` + `/video-learn` skills could call arxiv/wolfram instead of crawling Google |
| `task-orchestrator` | TaskCreate/TaskUpdate built-in | **Skip** | Redundant with Claude's task tools |
| `semgrep` + `sonarqube` + `ast-grep` | none in PRISM | **Add for code quality** | Pre-commit hook leverage; finds security antipatterns; complements 3-of-3 scrutiny |

---

## 3. Direct PRISM-feature overlap — DO NOT re-build

| Upstream | PRISM file/engine that already does this |
|---|---|
| `mcp-python-refactoring` | (none — PRISM is TS-first) — could be added for cad-engine/ Python work |
| `notion` / `airtable` | `prism_memory` covers knowledge storage; only add if user has Notion/Airtable accounts in use |
| `slack` / `linear` / `discord` | `bot-launch` skill + `/notify` already cover messaging; layer upstream MCP on top for richer surfaces |
| `redis` | PRISM does not yet use Redis; if a job queue need surfaces, prefer upstream over custom |

---

## 4. Recommended actions — ordered (all under milestone `DOCKER-MCP-WIRE-MS0`)

| Order | Unit ID | Effort | Leverage |
|---|---|---|---|
| 1 | **[DOCKER-MCP-WIRE-MS0]/U-WIRE-GIT** | XS | Wire `git` + `github-official` MCP servers via `docker mcp client connect`; new callers only — DO NOT bulk-swap existing hooks (parsers break silently); audit/swap hooks one-by-one in follow-up unit |
| 2 | **[DOCKER-MCP-WIRE-MS0]/U-WIRE-TIME** | XS | Wire `time` MCP server (catalog line 2016) AND centralize the ~10 scripts/lib timestamp helpers behind it |
| 3 | **[DOCKER-MCP-WIRE-MS0]/U-WIRE-FETCH** | XS | Wire `fetch` MCP server (catalog line 804 confirmed); replace ad-hoc `curl` in hooks (e.g., `ask-ollama.mjs` curl-then-parse) — same NEW-CALLERS-ONLY discipline as U-WIRE-GIT |
| 4 | **[DOCKER-MCP-WIRE-MS0]/U-WIRE-MARKDOWN** | XS | Wire `markitdown` + `markdownify`; compare upstream output with `scripts/md-to-html.mjs` before swap |
| 5 | **[DOCKER-MCP-WIRE-MS0]/U-WIRE-ARXIV** | S | Wire `arxiv-mcp-server`; extend `/pdf-learn` to query arxiv directly |
| 6 | **[DOCKER-MCP-WIRE-MS0]/U-WIRE-PLAYWRIGHT** | S | Wire `playwright`; integrate with blueprint-OCR validation (visual diff) |
| 7 | **[DOCKER-MCP-WIRE-MS0]/U-WIRE-SEMGREP** | S | Add `semgrep` as advisory step in 3-of-3 scrutiny gate (security pre-pass) |
| -- | DEFER `kubernetes`, `redis`, `huggingface` | -- | Until specific need arises |
| -- | **DO NOT WIRE** `prometheus`, `filesystem`, `memory`, `obsidian` | -- | PRISM's custom versions carry domain-specific semantics (file-claim, peer-claim, multi-namespace memory, vault ownership) that upstream cannot replicate |

---

## 5. Activation pattern (same for all [DOCKER-MCP-WIRE-MS0]/U-WIRE-* units)

> **P0 SAFETY: claude-code mcp config is the load-bearing wiring for PRISM (prism, claude-flow, prism_safe).** Every connect MUST be reversible. `docker mcp client export` does NOT exist in v0.40.4 (verified) — the backup mechanism is a direct file copy of the `.mcp.json` claude-code reads.

```bash
# 0. PRE-FLIGHT: confirm PRISM bridge is reachable (catches the disconnect-state caveat in §0)
curl -fsS http://127.0.0.1:3100/mcp/health || { echo "PRISM MCP bridge DOWN — fix this before any connect"; exit 1; }

# 1. BACKUP the claude-code mcp config (locate via `docker mcp client ls` output;
#    project-wide claude-code typically reads ./.mcp.json — copy it before mutating)
TS=$(date +%Y%m%d-%H%M%S)
mkdir -p H:/prism/.cache/mcp-client-backups
cp ./.mcp.json "H:/prism/.cache/mcp-client-backups/mcp-claude-code-$TS.json"

# 2. Pull the server image into local catalog
docker mcp catalog server inspect mcp/docker-mcp-catalog:latest <server-name>

# 3. Connect to claude-code client (additive on success; restore-from-backup on failure)
docker mcp client connect claude-code <server-name> || {
  echo "FAIL — restoring backup"
  cp "H:/prism/.cache/mcp-client-backups/mcp-claude-code-$TS.json" ./.mcp.json
  exit 1
}

# 4. Verify the new server appears AND existing prism/claude-flow/prism_safe still there
docker mcp client ls
# claude-code should show new entry alongside existing prism, claude-flow, prism_safe;
# any DROPPED entry is a regression — restore backup immediately.

# 5. Restart claude-code to pick up MCP refresh

# 6. Smoke test: call one tool on the new server through Claude
```

### 5.5. Secrets / auth (REQUIRED for many servers)
Several upstream servers need API tokens or OAuth credentials: `github` (PAT), `github-official` (PAT), `gitlab` (PAT), `slack`, `linear`, `notion`, `airtable`, `huggingface`, `wolfram-alpha`, `tavily`, `perplexity-ask`, most cloud-provider servers. Before connecting any of these:

```bash
# 1. Stash the credential in Docker Desktop secret vault (operator-only step, never log)
docker mcp secret set <server-name> <KEY>=<value>     # confirm syntax via `docker mcp secret --help`

# 2. Connect with the secret already present; the server picks it up at first invocation
docker mcp client connect claude-code <server-name>
```

`fetch`, `time`, `arxiv-mcp-server`, `markitdown`, `markdownify`, `playwright`, `puppeteer`, `semgrep`, `wikipedia-mcp` are **no-auth** — wire-up needs no secret step.

---

## 6. Operator decisions (defer ship until answered)

1. **GitHub Org for Docker Hub publishing** — Docker Hub username/org slug, for both Scout and image publishing (parallel to U-DOCKER-SCOUT-ENROLL ask).
2. **Browser automation scope** — wire `playwright` for blueprint-OCR validation, or keep manual? (low priority pre-revenue)
3. **Arxiv/research integration** — extend `/pdf-learn` to call arxiv, or keep PDF-only?

---

## 7. Doctrine alignment

- **R5** — MCP-server wiring is a deterministic Docker CLI flow; route to Bash subprocess, not Claude.
- **R7** — When upstream and PRISM both cover a surface (memory, filesystem, obsidian), pick **the one with PRISM-specific semantics** (claim-aware, multi-namespace, vault-ownership); flag the other for cleanup, never blend.
- **R8** — This whole document is R8 at the stack level. Pass.
- **R12** — Honest scope: 7 wire-ups proposed (XS–S each); 6 CAM bridges remain net-new (no upstream); 4 infra surfaces stay PRISM-custom for semantic reasons.

---

## See also
- [[DOCKER-BUSINESS-USAGE-ASSESSMENT-2026-05-19]] — sibling doc with non-MCP Docker biz features (Scout, Models, Hub, Build Cloud, K8s)
- [[JULIETT-OPEN-TASKS-2026-05-19]] — pickup ladder; this audit becomes the dedup-preflight for U-DOCKER-MCP-DISPATCHER + the 6 CAM bridges
- [[reference_u_oe_docker_compose_2026_05_18]] (and `OLLAMA-EXPAND-MS0/U-OE-BRIDGE-L2/L2b`) — already-shipped Ollama→PRISM-MCP bridge; the DOCKER-MCP-WIRE-MS0 milestone here EXTENDS that pattern to upstream MCP servers in the Docker catalog (sibling integration topology)
- [[reference_ollama_pipeline_ms0_2026_05_15]] — already-shipped pipeline injector + prewarm hook (commit `c34405927`); same injector pattern applies when new wired MCP servers need keyword-gated routing
- Cache: `.cache/docker-mcp-catalog-2026-05-19.txt` — full 2152-line catalog dump
- Reviewer dispositions: arm A FAIL→fixed (PRISM dispatcher action names now grepped, not fabricated); arm B FAIL→fixed (backup+rollback, secret-vault §5.5, time-utility honest framing, unit-ID convention, toolkit version pinned, claude-code disconnect caveat surfaced)
