---
name: reference_hermes_app_incorporation_plan_2026_06_02
description: Plan to incorporate the installed Nous Hermes desktop app into PRISM via MCP-over-HTTP (:3100) + filesystem-MCP (vault) + system-viz roost. Hermes = external agent
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.603Z
aliases: reference_hermes_app_incorporation_plan_2026_06_02
---


2026-06-02 slot:bravo. Operator downloaded + installed the **Nous Research Hermes desktop app** (`com.nousresearch.hermes.setup`) and asked to plan incorporating it with Obsidian + PSN + /system-viz, then to copy the install to H:.

**Install copied:** `C:/Users/wompu/AppData/Local/hermes/` → `H:/hermes-install/AppData-Local-hermes` (robocopy, 2.3GB incl regenerable Electron caches — the real agent is config.yaml/`.env`/SOUL.md/skills/cron/hooks/memories/hermes-agent Python runtime). `.env`(23KB)+`auth.json`+`config.yaml` hold SECRETS — never commit `H:/hermes-install/`.

**The integration hinge (verified on disk):** Hermes ships a built-in **native MCP client** (`skills/mcp/SKILL.md`) that connects to MCP servers at startup via stdio OR HTTP/StreamableHTTP and auto-registers their tools as first-class agent tools. PRISM exposes HTTP MCP at **`http://127.0.0.1:3100/mcp`** (`mcp-server/manifest.json:11`). So a 3-line `config.yaml` `mcp_servers:` block makes all 103 `prism_*` dispatchers into `mcp_prism_*` Hermes tools — zero code. `manifest.json` already ships `psn_leg_mapping` pre-tagging every dispatcher to a PSN leg.

**Plan (5 phases, repo-verified via Workflow — 4 agents/545K tokens):** P0 connect PRISM MCP-over-HTTP (`url: http://127.0.0.1:3100/mcp`, `sampling:{enabled:false}`, `pip install --upgrade mcp`). P1 filesystem-MCP rooted at `H:/prism/knowledge` + a collision-free write lane `knowledge/hermes-outputs/` (OUTSIDE every Stop-hook sync target — the sync is mirror-not-merge, would clobber any Hermes file in `memories/<type>/`). P2 SOUL.md = JM Die manufacturing persona + HARD write-discipline. P3 scheduled shop-brief crons (manufacturing-first, reusing `daily_flash_generate`+`master_index_query`+`brain_recall`). P4 `ghost.hermes_app` system-viz roost (copy `generate-dream-artifacts-features.mjs`, dual-register FAST[]+merge splice; dirs-only data source, NEVER read state.db/secrets).

**Key doctrine:** Hermes is an **external runtime / "agent #8"** alongside Cline/Continue/Codex — it must NOT claim a NATO chat-slot, never `/checkin`, never a `slot/<nato>` branch/worktree. It reaches into PSN read-mostly via MCP. Net new PRISM code = **one viz generator + one test**; everything else is Hermes-side config/content.

**Why this matters:** PRISM's bravo galaxy is literally the *hermes-zulu* galaxy — the external Nous Hermes app is the real-world counterpart of PRISM's internal Hermes orchestration concept. Connecting them gives PRISM's knowledge base (Obsidian brain + 11 PSN legs) an autonomous external agent that runs scheduled manufacturing workflows. **How to apply:** execute P0 first (verify tools register in the GUI), then P1-P4 in order; resolve the 6 OPEN QUESTIONS in the running GUI before P3/P4. Full spec: `state/shared/specs/HERMES-APP-INCORPORATION-PLAN-2026-06-02.md`. Source method: [[reference_cyrilxbt_obsidian_hermes_apply_assessment_2026_06_02]].
