---
type: master-synthesis
date: 2026-06-25
author: ZULU (hermes-zebra / slot:bravo)
topic: hermes-cli ↔ obsidian vault synergy — permanent-context audit of every submitted article vs built/wired reality
tags: [PRISM, hermes, obsidian, vault, articles, synthesis, permanent-context, app, ios-redesign, zulu]
sources_verified: 2026-06-25
---

# ZULU Master Synthesis — Hermes CLI ⇄ Obsidian Vault, Applied-vs-Not, + App Sync

> **Mandate (operator, 2026-06-25):** synergize Hermes CLI to the Obsidian vault; read every
> article ever submitted and confirm we applied EVERYTHING across the full doctrine surface;
> read all chats/sessions/CLI/desktop/plans/roadmaps/units; hold permanent context of what is
> planned / built / wired / not-built / needs-wiring, including web + Electron + iOS/Android app
> features, and how it all syncs to today's Claude-Design ("Kienzle Academy" iOS redesign) build.
>
> **Method (R12 honesty):** every claim below is grounded in a file/path/command verified THIS run.
> Where the corpus already synthesized something, I cite it rather than re-mine. Where I could not
> verify, I say so. The article corpus was NOT re-mined raw — the fleet's existing topic-memos
> (`state/shared/articles/_topic-memos-2026-06-10/`) and assessment memos already did that with
> citations; this note reconciles them against current reality and fills the deltas.

---

## 0. Corpus snapshot (verified this run)

| Surface | State | Evidence |
|---|---|---|
| Chat archive (permanent memory) | **15,672 session notes / 2,014,123 messages** | `ingest.py --stats` |
| — claude-code-cli | 14,948 notes / 1,257,702 msgs | manifest |
| — codex | 675 notes / 756,372 msgs | manifest |
| — claude-desktop | **49 notes / 49 msgs (FIXED this run — was 0)** | manifest; see §5 |
| Article corpus (full-text) | 7 captured-full + 7 topic-memos + 4 assess-memos = 18 files | `state/shared/articles/` |
| Memory vault (.md) | ~17,471 memory files | `knowledge/memories/` |
| Wiki | 722-entry index | `knowledge/wiki/index.md` |
| Hermes cron | 3 jobs, last_status ok (inbox 20b / brief+weekly 120b) | `~/.hermes/cron/jobs.json` |
| Hermes scheduled tasks | 8 tasks, **all Ready** incl. Obsidian Bridge | `Get-ScheduledTask 'PRISM Hermes*'` |
| App shell | web + Electron + Capacitor iOS/Android, one Vite build | `mcp-server/web/` |

---

## 1. The submitted-article doctrine surface — every topic, applied-status

The operator treats X/Substack/Medium articles as a literal input stream: pastes URLs into
`/loop [Nm] /goal read these articles to incorporate into system`, a Workflow captures them to
`state/shared/articles/`, fan-out agents synthesize gaps. The canonical topic clusters (each has a
verified topic-memo at `_topic-memos-2026-06-10/`):

| Topic (your list) | Built? | Wired? | Where | Gap / needs-wiring |
|---|---|---|---|---|
| **Hermes agentic coding** | ✅ | ✅ | ReAct loop, 90-turn cap, SOUL.md, 3-tier memory, self-evolving skills, Curator, GEPA-lite (`scripts/hermes-skill-gepa.mjs`) | none structural; GEPA candidates are operator-PR-gated (correct) |
| **Harnesses (dynamic workflows)** | ✅ | ◑ | Workflow tool wired; 6 composable patterns mapped (classify-act, fan-out, adversarial-verify, generate-filter, tournament, loop-until-done) | journaled RESUME of workflows = verify; `ultracode` trigger is desktop-only (sessionSettings) |
| **Ollama offloading** | ✅ | ✅ | `ask-ollama.mjs` judged ladder (1.5b/7b/14b/32b), `OLLAMA_CONTEXT_LENGTH=65536`, offload dashboard, cron on gpt-oss:20b/120b | offload ratio target 30% — measure via `ollama-offload-dashboard.mjs` |
| **Crons / engineered loops** | ✅ | ✅ | Hermes cron (3 jobs + context_from chaining), `prism-vault-loop` skill, dream-cycle + weekly-reflect tasks Ready | `context_from` chaining lives only in off-repo `jobs.json` (true; by design) |
| **CAG** | ✅ | ◑ | `PromptCachingEngine.buildCachedSystem()` → `prism_dev:pc_build_cached_system` (28 tests); `cag-cold-cache-anchor.mjs` | **#1 cost lever still dormant:** ~8 per-turn injectors re-emit static doctrine every turn; `buildCachedSystem` is NOT in the injection layer (0 hook refs). No cold-hit telemetry. |
| **RAG** | ✅ | ✅ | Hybrid BM25 + dense (nomic-embed-text 768d int8) + RRF; `memory-index-precheck-inject.mjs` LIVE (`PRISM_MEMORY_INDEX_INJECT=1`); 17,010-record sidecar | none; recall is enabled fleet-wide |
| **LoRA** | ✅ | ◑ | Domain-knowledge LoRA training (papa slot), QLoRA path for ≤32B | research-grade; live training is operator-gated GPU work |
| **Deep learning / NN-GNN** | ✅ | ◑ | GraphSAGE 5th wiring-inference tier; selective-deploy at minConf 0.7 (Brier 0.041, macro-F1 1.0, 32% coverage) | full-coverage AUROC gated on ref-pool growth + H2GCN, NOT calibration (measured dead-end) |
| **Deep reasoning** | ✅ | ✅ | `PRISMCreativeReasoningEngine` (15 domains, 120+ formulas), octopus multi-model consensus (now runs for real — ledger 522B→9244B) | octopus per-galaxy corpus tuning is wave-3 work |
| **Parallel agents** | ✅ | ✅ | 26-slot NATO fleet, slot-worktrees, `delegate_task`, per-file 2-arm + 3-of-3 scrutiny gates (INDEPENDENT reviewers — kills self-preferential bias per Anthropic harness article) | none |
| **Workflows** | ✅ | ✅ | brainstorm-path-forward (5-lens), octopus, article-ingest, fan-out galaxy mining | none |
| **2nd brain** | ✅ | ✅ | `knowledge/` vault = permanent memory; nightly dream synth + weekly reflection; 34 galaxy brains | repeat-correction→confirmed-preference w/ confidence = the one genuine cognitive gap |
| **Obsidian vault** | ✅ | ◑ | Filesystem IS the vault; read-only REST bridge (`ObsidianRestBridgeEngine` → 3 session actions); C:→H:→vault auto-feed; H:→C: reverse mirror (bidirectional write-back SHIPPED 2026-06-04) | REST bridge needs the desktop plugin live on :27123 (was DOWN this run — filesystem path unaffected) |
| **PSN (11-leg)** | ✅ | ✅ | `feedback_psn_definition`; attribution ledger LIVE-writing (`psn-attribution.jsonl`); octopus reads 5 PSN text legs | wave-3 per-galaxy leg coverage tuning |
| **System-viz / graphs** | ✅ | ✅ | 644MB system graph + cheap node-card access (offset index, ~98.7% token cut), cross-substrate typed edges (owned-by-slot / documented-by / embeds), ghost roosts | full graph regen is 24GB-RAM gated (run on demand) |

**Verdict:** Every topic on your list is BUILT. The genuine remaining levers are **wiring/activation**,
not net-new builds — concentrated in **(a) CAG cold-cache injection wiring** (biggest measured cost
lever, pure R8 wiring), **(b) repeat-correction→confirmed-preference confidence loop** (the one true
2nd-brain cognitive gap), and **(c) per-galaxy octopus/PSN corpus tuning** (wave-3).

---

## 2. The Hermes ⇄ Obsidian closed loop — live, not paper

READ → ACT → WRITE-BACK is genuinely closed on this box (verified `loop-eng-gaps.md` + tasks Ready):

- **READ-before-act:** recall injectors (memory-relevance, wiki-precheck, galaxy-brain, master-index,
  obsidian-vault-precheck) — all wired, 1 settings ref each.
- **ACT:** 3 Hermes cron jobs run ZULU against `prism-vault-loop`; output to `hermes-outputs/notes/`.
- **WRITE-BACK:** post-ship distillation (`reference_post_ship_*`), `tribal_capture`, the
  H:→C: reverse mirror (`h-to-c-obsidian-mirror.mjs`, PostToolUse).
- **Idle/nightly:** dream-cycle synth (`2026-06-*.md` produced nightly) + weekly reflection.

**Delta since the 2026-06-10 assessment:** the `PRISM Hermes-Obsidian Bridge` task (Hermes desktop's
own siloed memory → `knowledge/hermes-brain/` as vault nodes) was **Disabled** then; it is **Ready now**
— the write-back bridge is live. The memory-index recall cluster (`PRISM_MEMORY_INDEX_INJECT`) flipped
ON. Both contradict older stale memos; this note supersedes them on those two points.

---

## 3. The app — one build, three form factors (web / Electron / iOS+Android)

`mcp-server/web/` is the real shipping app (NOT the repo-root `web/`, which is a sibling dashboard):

- **One Vite build** → `mcp-server/dist/web`. Web serves same-origin `/api/v1`; Electron wraps it
  (`electron/main.cjs`, electron-builder, productName **"Kienzle Academy"**); Capacitor wraps the SAME
  bundle into iOS+Android (`capacitor.config.json` appId `tools.prism.app`, appName "Kienzle").
- **No per-platform fork** — a relative `/api/...` path is rewritten by the global fetch proxy
  (`APP_ARCHITECTURE.md`). Add a page + lazy-route it + `npm run cap:sync` → tri-platform.
- **Status:** web is the mature surface (161 pages, 136 wired); Electron shell built; **Capacitor is an
  UNVERIFIED activation-gated scaffold** (`CAPACITOR.md`) — `npx cap add ios/android` + a device build
  must run before it's a real mobile app. iOS bundle-id is a placeholder to confirm pre-store-submission.

### Today's Claude-Design build = the Kienzle Academy iOS redesign
- **Driver doctrine:** `state/shared/specs/FLEET-IOS-REDESIGN-DOCTRINE-2026-06-09.md` (operator decision)
  — supersedes the "Calculator Studio industrial-HUD" default. Frontend owner **quebec**; foundation by hotel.
- **Today's commits (slot:quebec, FRONTEND-APP):** PRISM→**Kienzle Academy** rebrand across 10
  customer-facing surfaces (electron productName/appId, capacitor bundle-id, html title, icon wordmarks);
  routed orphan pages (LatheStudio/MillStudio/MillTurn/Swiss/CADRegen) with honest sample-data notices;
  wired ShopDashboard + LatheERP + ValueStreamMap onto real data; killed Math.random() fake-live ticks.
- **Design language:** dark canonical KEPT + 5-color status spectrum KEPT; CHANGED toward iOS — SF
  typography with -0.02em title tracking, critically-damped press springs (settle, no overshoot), soft
  directionless shadows as default (glow → opt-in accent), segmented controls, 44pt tap targets,
  focus-visible rings. Keystone = a NEW `:root` CSS-var token layer enabling per-user theme override
  without rebuild (`documentElement.style.setProperty()`).

### How it all syncs to the new build
1. **Vault → app:** the app's manufacturing intelligence (SFC, EDM, ERP, academy) is served by the
   prism MCP / `:3100` backend, which reads the same `knowledge/` vault + engines this synthesis audits.
2. **App → vault:** quote/job/program outcomes flow back through `shop_outcome_ingest` → tribal/vault.
3. **One design source of truth:** the iOS redesign doctrine + DESIGN.md tokens are the single visual
   contract across web/Electron/mobile — a feature built once renders identically on all three.
4. **Permanent context:** this note + the chat archive + reorientation check-in
   (`_index/REORIENTATION-2026-06-25.md`) give any future ZULU session the full planned/built/wired map
   without re-mining 2M messages.

---

## 4. Permanent-context ledger — planned / built / wired / not-built / needs-wiring

- **PLANNED & SHIPPED:** all 14 doctrine topics (§1); 26-slot fleet; vault loop; chat archive; iOS
  redesign foundation; tri-platform app shell; octopus (now real); cross-substrate edges; cheap node access.
- **BUILT, NEEDS-WIRING (the actionable backlog):**
  1. CAG `buildCachedSystem()` → route the ~8 static per-turn injectors through it + add cold-hit telemetry (R8, biggest cost lever).
  2. Repeat-correction → confirmed-preference confidence loop (the 2nd-brain cognitive gap; no equivalent today).
  3. Workflow journaled-RESUME verification (Anthropic harness pattern — confirm PRISM workflows resume mid-flight).
  4. Capacitor activation: `npx cap add ios/android` + device build + real bundle-id before store submission.
- **RESEARCH-GATED (not idle gaps):** NN-GNN full-coverage AUROC (ref-pool growth + GPU H2GCN retrain);
  LoRA live training (operator GPU); per-galaxy octopus/PSN corpus tuning (wave-3).
- **NOT-BUILT (intentional / external):** Obsidian REST write method (read-only by design; filesystem is
  the write path); turn-counter memory/skill review triggers (PRISM uses event-hooks, not accumulation counters — a design choice, not a gap).

---

## 5. What I fixed this run (concrete delivery, not a description)

**Claude Desktop conversations were being silently dropped from permanent memory.** The chat-archive
`parse_desktop` returned 0 notes from 49 files (`claude-desktop {'empty': (49,0)}`). Root cause: the
desktop `local_*.json` files are session-METADATA records (title/model/effort/`ultracode`/planPath/cwd/
completedTurns/remoteMcpServersConfig/enabledMcpTools + a `cliSessionId`), NOT inline transcripts — the
parser looked for a `messages` array that does not exist. The conversation itself lives in
`H:/.claude/projects/**/<cliSessionId>.jsonl` (already ingested under claude-code-cli).

**Fix (`knowledge/chat-archive/_pipeline/ingest.py`):** rewrote `parse_desktop` to emit a metadata-rich
note (model/effort/ultracode/plan/MCP-surface + a backlink to the CLI transcript), added `_epoch_to_iso`
(desktop stores ms-epoch) and `_cli_transcript_for` (resolves cliSessionId → ingested .jsonl), kept a
legacy inline-array path for forward-compat, added `import glob`. Ran `--source claude-desktop --force`:
**49/49 now ingest (was 0)**, rebuilt indexes (`MOC-claude-desktop` now 49 sessions across 2026-02..06)
and the reorientation check-in. Skill `chat-archive-permanent-memory` patched with the format pitfall so
the nightly cron never regresses.

---

## 6. For the next ZULU session (re-entry)

- Permanent context now lives in: this note + `_index/REORIENTATION-2026-06-25.md` +
  `_index/Plans-and-Roadmaps.md` (538 plan-notes) + the topic-memos.
- Highest-leverage next action (operator-gated): **CAG cold-cache injection wiring** — pure R8, the
  single biggest measured token-cost lever, fully scoped in `_topic-memos-2026-06-10/cag-rag.md`.
- The chat-archive cron (`164f3cb91569`, daily 06:00) now correctly captures desktop sessions.
