# Nous Hermes Desktop App → PRISM Incorporation Plan

**Date:** 2026-06-02 · **Author:** slot:bravo (claude-5e210e4e) · **Method:** Workflow (4 agents, repo-verified) + Playwright (CyrilXBT article) + on-disk app inspection.
**Status:** PLAN — advisory, must-verify the OPEN QUESTIONS in the running GUI before executing.

The installed app: **Nous Research Hermes** (`com.nousresearch.hermes.setup`), Electron GUI + Python agent at `C:/Users/wompu/AppData/Local/hermes/` (copied to `H:/hermes-install/AppData-Local-hermes`, 2.3GB incl regenerable caches). Built-in **native MCP client** (`skills/mcp/SKILL.md`) connecting stdio OR HTTP/StreamableHTTP, auto-registering discovered tools. 25 skill categories, `cron/` (empty), editable `SOUL.md` persona, `state.db` SQLite, `config.yaml`(61KB)/`.env`(23KB, secrets).

PRISM exposes HTTP MCP at **`http://127.0.0.1:3100/mcp`** (verified: `mcp-server/manifest.json:11`, `DuplicationGuardEngine.ts:246`). `manifest.json` already ships a `psn_leg_mapping` pre-tagging all 103 dispatchers to PSN legs.

## 1. Target architecture
Hermes = **external autonomous runtime** (own GUI/agent/persona/scheduler/state), OUTSIDE the PRISM process tree + 26-chat fleet. Two MCP channels in: (1) **MCP-over-HTTP** to `:3100/mcp` → all 103 `prism_*` dispatchers become `mcp_prism_*` Hermes tools (read/compute across all 11 PSN legs, scoped writes to memory/session); (2) **filesystem-MCP** rooted at `H:/prism/knowledge` (read whole vault), all writes confined to `knowledge/hermes-outputs/`. Hermes is "external agent #8" alongside Cline/Continue/Codex — **never claims a NATO slot**, never `/checkin`, never a `slot/<nato>` branch/worktree.

## 2. Phases
### P0 — Connect PRISM MCP-over-HTTP (foundation)
- Prereq: `pip install --upgrade mcp` in Hermes' Python env (StreamableHTTP needs `mcp.client.streamable_http`).
- Edit `C:/Users/wompu/AppData/Local/hermes/config.yaml` (~line 785, uncomment `mcp_servers:`):
```yaml
mcp_servers:
  prism:
    url: "http://127.0.0.1:3100/mcp"
    timeout: 180
    connect_timeout: 60
    sampling:
      enabled: false   # do NOT let PRISM drive Hermes' LLM
```
- HTTP uses `url` only (never `command/args`; no `Authorization` header — PRISM is unauth localhost). Restart Hermes (no hot-reload). Tools register as `mcp_prism_prism_memory`, `mcp_prism_prism_calc`, etc. PRISM down → Hermes fails soft (5× backoff).

### P1 — Vault outputs lane + filesystem-MCP (parallel to P0)
- Pre-create `H:/prism/knowledge/hermes-outputs/{research,notes,diagrams,scratch,sessions}/` + README. This lane is OUTSIDE every Stop-hook sync target (`memories/*`, `tribal/`, `PRISM Knowledge Vault.md`, `.obsidian/`), so the 3-min auto-feed can't overwrite/delete Hermes files.
- Add filesystem MCP server to config.yaml:
```yaml
  vault-fs:
    command: "npx"
    args: ["-y","@modelcontextprotocol/server-filesystem","H:/prism/knowledge"]
```
  (If the server supports per-path read-only: expose vault RO, grant write only to `hermes-outputs/` → collision protocol-impossible.)
- Hermes frontmatter contract: `source: hermes` (NOT `prism-memory`/`prism-galaxy-index` — sync-reserved), `type: hermes-output`, `created`, `aliases`, `tags:[hermes]`. Use `[[wikilinks]]` to PRISM namespaces.

### P2 — SOUL.md = PRISM manufacturing persona (depends P0+P1)
Edit `C:/Users/wompu/AppData/Local/hermes/SOUL.md` (loads fresh each message): identity = JM Die manufacturing-intelligence agent (mill/lathe/wire-EDM/CAD→CAM→G-code/quoting/scheduling); tool doctrine = query `mcp_prism_*` before answering; **HARD write discipline** = all writes under `hermes-outputs/`, never `memories/`/`tribal/`/MOC/`.obsidian/`/the sync lock; note shop floor is Polish/Spanish-primary.

### P3 — Scheduled shop briefs (manufacturing-first; depends P0+P1+P2)
Populate empty `cron/` with manufacturing skill-files: `daily-shop-brief` (open jobs/quotes/regressions via `master_index_query`+`brain_recall` → `hermes-outputs/research/shop-brief-<date>.md`; analog of existing `daily_flash_generate`), `tribal-digest`, `quote-watch`. Outputs land in `knowledge/` → searchable + auto-fed on next Claude Stop. Offset schedules off `:00`.

### P4 — system-viz roost (visibility)
- New `scripts/generate-hermes-features.mjs` (copy `generate-dream-artifacts-features.mjs`): `ghost.hermes_app` roost under `ghost.planned_features`, child nodes per skill(25)/cron/output + a `hermes-capability` native-MCP node with a `bridges` edge to PRISM's MCP node. Source = **dirs only** (`readdirSync` fail-soft); NEVER read `state.db` (Electron lock) or `.env`/`auth.json`/`config.yaml` (secrets) — names only, trim MAX_INFO 240.
- Sibling test `generate-hermes-features.test.mjs` (node:test).
- Dual-register: `regen-viz.mjs` FAST[] (~line 123) + `merge-augmentations.mjs` 3 edits (loadOptional ~152, versions ~253, splice ~1645 — copy the dream-artifacts block lines 1306-1329). Filename must match byte-for-byte (silent no-op otherwise); write to VIZ_DIR root not staging/.

## 3. Build vs reuse
REUSE: MCP-over-HTTP (config only), filesystem-MCP (off-the-shelf npx), PSN leg wiring (`manifest.json:psn_leg_mapping` pre-tagged). BUILD: outputs lane (mkdir), SOUL persona (text), shop-brief crons (skill files reusing PRISM dispatcher actions), system-viz roost (1 generator + 1 test + 4 edit lines). **Net new code = one generator + one test.**

## 4. Risks + mitigations
- **Vault write collision** (HARD) — confine writes to `hermes-outputs/`; optionally RO filesystem root. The sync is mirror-not-merge (bare `writeFileSync`) → any Hermes file in `memories/<type>/<name>.md` matching a C: source is clobbered next Stop.
- **Lock squat** (HARD) — never touch `.obsidian-memory-sync.lock` (O_EXCL, stalls fleet feed 120s).
- **Secrets** (HARD) — never commit `H:/hermes-install/`; viz generator enumerates dir NAMES only.
- **NATO slot contention** (HARD) — external agent #8, never claims a slot.
- **Unauth :3100** (MED) — keep loopback-bound; `sampling:{enabled:false}`.
- **No feedback loop** — sync is C:→vault one-way, reads only C: source; Hermes vault writes can't round-trip. Flag if anyone proposes reverse sync.

## 5. Open questions (verify in running GUI)
1. Config hot-reload (recon says full restart needed) + does GUI show MCP connection status/tool count?
2. Which Python interpreter does `hermes-agent/` use — does `pip install mcp` target the spawned env?
3. Does `@modelcontextprotocol/server-filesystem` support per-path read-only or single RW root?
4. `cron/*.skill` file format (dir empty, no on-disk template — inspect `hermes-agent/` scheduler).
5. Does Hermes cap auto-registered tool count (103 dispatchers)? Dispatcher-level vs sub-action granularity.
6. Is `acp_adapter`/`acp_registry` (Agent Connect Protocol) a cleaner path than raw MCP, or orthogonal?

Memory: [[reference_hermes_app_incorporation_plan_2026_06_02]]. Source method: [[reference_cyrilxbt_obsidian_hermes_apply_assessment_2026_06_02]].

---

## 6. SOURCE-VERIFIED ADDENDUM (2026-06-16, slot:zulu) — Hermes is FULLY OPEN SOURCE

> Operator directive 2026-06-16: *"hermes is completely open sourced so lets make sure we're taking full advantage of it in our build."* The 6 OPEN QUESTIONS in §5 were framed "verify in the running GUI" because the 2026-06-02 plan treated Hermes as a black box. **It is not** — the full source is a live git repo on disk: `C:/Users/wompu/AppData/Local/hermes/hermes-agent` → `origin = github.com/NousResearch/hermes-agent` (**MIT**), branch `main`, HEAD **`v2026.6.5-810-g7d183f649`**, **exactly 312 commits behind `@{u}`**. So the questions are answerable from source, and the version bump (§Track 2) is a tracked `git pull` + `uv pip install -e .`, not a mystery installer.

### §5 open questions — resolved / corrected from source
1. **Config hot-reload** — NOT fully traced this session (config lives in `config.yaml`; cron is a JSON store, see #4). Bravo ledger unit 3 + install docs imply full restart. STILL: read `agent/` config-watcher to confirm. PARTIAL.
2. **Python interpreter / pip target** — RESOLVED. The exe is `hermes-agent/venv/Scripts/hermes.exe`; install uses `uv` + Python 3.11 (README). Updates: `git pull` then `uv pip install -e .` in that venv.
3. **filesystem-MCP per-path RO** — UNCHANGED (that's the upstream `@modelcontextprotocol/server-filesystem`, orthogonal to Hermes source).
4. **cron `*.skill` format — CORRECTED (was WRONG).** Cron is NOT skill files. It is a **JSON job store** (`~/.hermes/cron/jobs.json` → `output/{job_id}/{ts}.md`) + a `croniter` scheduler (`cron/scheduler.py`, `cron/jobs.py`). Jobs are authored via the CLI: `hermes cron create "<schedule>" "<prompt>" --name <n> --deliver <target> [--script <py>] [--skills <a,b>]`. PRISM's `HermesAutomationBridge.cronList()` already reads `jobs.json` correctly; **§P3 should author `hermes cron create` jobs, not drop `*.skill` files.** (This is now done — see U-HB-ROUTINE-PLAN.)
5. **MCP tool-count cap (103 dispatchers)** — NOT traced this session (MCP client lives in `agent/`). `manifest.json:psn_leg_mapping` pre-tags all dispatchers; trace the registration code before assuming no cap. PARTIAL.
6. **acp_adapter / acp_registry** — present as real modules (Agent Connect Protocol). Potential cleaner channel than raw MCP; not deeply traced. Candidate follow-up.

### NEW capabilities the open source unlocks (the "full advantage")
- **`hermes mcp serve` — Hermes-as-MCP-server (REVERSE channel, the black-box view missed it).** `mcp_serve.py` exposes a 9+1-tool messaging bridge (`conversations_list`, `messages_read/send`, `events_poll/wait`, `permissions_list_open/respond`, `attachments_fetch`, `channels_list`) across **Telegram / Discord / Slack / WhatsApp / Signal**. Claude Code / PRISM can connect to Hermes as an MCP server and **push operator notifications to a phone** — high value with the operator away. (Config: add `hermes` to CC's `mcpServers` as `command:"hermes", args:["mcp","serve"]`.)
- **cron `--deliver` + `--script` + `[SILENT]` + `hermes webhook subscribe`** (GitHub/API event triggers, HMAC-auth) — delivery to Telegram/Discord/Slack/SMS/email/GitHub/webhook/local; the `[SILENT]` no-spam pattern. **First exploited: U-HB-ROUTINE-PLAN** (`prism_hermes:hermes_routine_plan` emits 4 manufacturing routines → operator phone).
- **agentskills.io open-standard compatibility** — PRISM skills can be made Hermes-loadable (and Hermes' self-created skills can feed PRISM).
- **Six terminal backends** (local/Docker/SSH/Singularity/Modal/Daytona) — Daytona/Modal give serverless persistence (idle-cheap overnight agent).
- **Self-improving learning loop** (autonomous skill creation + self-improvement), **FTS5 session recall**, **Honcho user modeling**, **subagent delegation w/ zero-context-cost RPC tool calls** — relevant to PRISM's india AI-training + the awareness loop.

### First concrete exploitation (shipped this session)
**U-HB-ROUTINE-PLAN** (`011a032deb`, slot:zulu) — `HermesAutomationBridge.routinePlan()` + `prism_hermes:hermes_routine_plan`: EMIT-ONLY generator of source-verified `hermes cron create … --deliver telegram` automations (shop-brief / fleet-pulse / regression-watch / closeout-watch) that push PRISM manufacturing intelligence to the operator's phone. 34/34 tests, 2-arm scrutiny PASS. PRISM never auto-deploys — operator runs each emitted command (or via `hermes_run` dual-key).

### Next source-unlocked units (proposed, ROI order)
1. **`hermes mcp serve` reverse channel** — register Hermes as a CC MCP server so PRISM can deliver alerts to the operator's phone directly (pairs with U-HB-ROUTINE-PLAN). *Operator-present (needs platform creds + gateway running).*
2. **Trace OQ #1/#5/#6 from `agent/` + `acp_adapter/`** — close the remaining PARTIALs from source (cheap, read-only).
3. **agentskills.io skill bridge** — make a PRISM skill Hermes-loadable + round-trip.
