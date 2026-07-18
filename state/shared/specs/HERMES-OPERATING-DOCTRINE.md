---
artifact: hermes-operating-doctrine
status: CANONICAL · LIVING · single-source-of-truth for Hermes config + launch + integration
owner: slot:bravo (hermes-zulu galaxy)
created: 2026-06-30 (HERMES-LAUNCH-RELIABILITY-MS0 + HERMES-PRISM-INTEGRATION-MS0)
supersedes_scattered: 70+ reference_hermes_*.md memories + 34 HERMES-*.md specs (read THIS first)
---

# HERMES OPERATING DOCTRINE — the one place to look

> **Why this exists:** Hermes knowledge was scattered across 70+ memories + 34 specs + 180 wiki
> entries, several of them *contradicting each other within the same day* (CPU-only-vs-GPU-works;
> proxy-dark-vs-live). Five+ chat slots each "fixed Hermes" at different layers without seeing each
> other's work, and the config lived only in AppData (not version-controlled), so every fix drifted.
> This doc is the **single source of truth**: read it before touching anything Hermes. If reality
> and this doc disagree, fix the code to match this doc (or update this doc — never fork a third copy).

---

## 1. Architecture — TWO independent layers (this conflation caused every mixup)

| Layer | What it is | Who uses it | Lane |
|---|---|---|---|
| **A. Desktop app + CLI** | `AppData\Local\hermes\` · `hermes gateway run` · the thing the operator launches/chats | the operator | **local Ollama (gpt-oss:120b on the Blackwell GPU)**, NVIDIA cloud as a manual fallback |
| **B. Fleet programmatic lane** | `scripts/ask-hermes.mjs` · `scripts/hermes-mcp-server.mjs` · octopus voices | the 26 PRISM chat slots | NVIDIA NIM cloud (repointed off the dead xAI proxy 2026-06-30, commit `e2579970a6`) |
| **C. `:8645` proxy (legacy)** | `hermes proxy start` → xAI Grok OAuth | nothing critical now | **DEAD** (xAI token revoked + out of credits 2026-06-29). Local+NVIDIA mode does not use it. |

**The mixup rule:** A and B are SEPARATE. "Hermes is down" usually means one layer; check which. The
operator's "works 1 of 10" is layer **A** (desktop launch). The `:8645` health banner is layer **C**
(legacy, expected-dark in local+NVIDIA mode — not an error).

---

## 2. Desired config state (enforced by `hermes-config-apply.py`)

The desktop config (`config.yaml` + `profiles/zulu/config.yaml`) MUST be:
- **Primary:** `provider: ollama`, `default: gpt-oss:120b`, `base_url: http://127.0.0.1:11434/v1`, `ollama_num_ctx: 131072` (gpt-oss:120b's native MAX context; the doctor pre-warms so the big KV loads before launch).
- **Router/MOA OFF (critical — the anti-shuffle):** `experimental.model_router_enabled: false`, `auto_invocation_router: false`, `hybrid_router.enabled: false`, and every `moa.presets.*.enabled: false`. The model-router + MOA DYNAMICALLY build hybrids and (2026-06-30) auto-drifted the primary to `nvidia/nemotron-3` — a `<think>`-emitting reasoning model that HANGS the agent loop ("it built a hybrid model... nemo3, stopped working"). Determinism > cleverness: the pinned gpt-oss:120b must be authoritative, or the config re-shuffles every session.
- **Fallbacks:** LOCAL-ONLY valid chain (`gpt-oss:20b`@131072, `qwen2.5-coder:32b`@131072). **NO cloud auto-fallback.** Any `provider: auto` auxiliary role is pinned to local `gpt-oss:20b` (an empty-base_url `auto` = the null-billing/dead-Nous hang risk).
- **NEVER** a model NVIDIA serves below 64K — e.g. `meta/llama-3.3-70b-instruct` is **32K on NVIDIA** and Hermes HARD-REJECTS <64K (`ollama_runtime_context_too_small`). *This invalid fallback was THE "1 of 10" hard-fail.* NVIDIA stays a documented **manual** lane, never an auto-fallback that can crash a launch.
- **MCP:** `prism` (the lean facade `prism-mcp-for-hermes.mjs`, 6 tools) + `h-drive` (filesystem @ `H:/`). **NOT** the heavy prism :3100 (101 dispatchers / ~6000 tools = the 133K-token init that timed out launch — alpha removed it; do not re-add it to the desktop config).
- **Crons:** the desktop profile fires **ZERO** in-process crons (`cron/jobs.json` all `enabled:false`). Fleet automation belongs on a DEDICATED non-desktop profile (see §6).

Apply / check: `python scripts/hermes-config-apply.py --check` (exit 1 = drift) · `--apply` (fix, backs up).

---

## 3. Launch reliably EVERY time — `hermes-doctor.mjs`

`node H:/prism/scripts/hermes-doctor.mjs` (idempotent, bounded, never hangs) makes the box launch-ready:
reasserts IPv4 preference · re-applies the §2 config if drifted · verifies Ollama GPU + pre-warms
gpt-oss:120b (kills the cold-start race) · reaps a dead `:8645` proxy · warns on enabled desktop crons.

- **Durable drift-guard:** the **`PRISM Hermes Doctor`** scheduled task runs it `--no-warm` every 15 min
  + AtStartup + AtLogOn (install: `.claude/helpers/install-hermes-doctor-task.ps1 -RunNow`, elevated).
  So even if a slot/update corrupts the config, the next tick heals it. **This is the permanence guarantee.**
- **Best first-message latency:** run `node scripts/hermes-doctor.mjs` (with warm) right before launching.
- **Acceptance test:** launch the desktop app + `hermes -z` CLI 5× consecutively — all 5 connect.

---

## 4. Diagnose — the confirmed failure modes (root-caused 2026-06-30)

| Symptom | Root cause | Fix |
|---|---|---|
| "gateway not connected / timed out 60000ms", intermittent | invalid 32K NVIDIA fallback hard-fails when local is slow; **+** cold-start race | §2 config + doctor pre-warm |
| boot/agent-init hangs intermittently | dead IPv6 on this box (Tailscale advertises a non-routable v6 route); Nous resolves IPv6-first | doctor reasserts `netsh ... prefixpolicy ::ffff:0:0/96 60 1` |
| `:8645` DARK banner | legacy xAI proxy (revoked token) | expected in local+NVIDIA mode; doctor reaps the dead listener |
| a cron fires during launch | the **active profile's own** `cron/jobs.json` (NOT root) had an enabled job | §6 decouple; doctor warns |
| "CPU-only / slow" | Ollama < 0.30.11 couldn't use the Blackwell (sm_120) | already fixed: Ollama 0.30.11, models 100% GPU |
| zulu profile `model.default` reverts to gpt-oss:20b | Hermes re-normalizes the active profile's model on gateway load | **benign** (both are valid local >=64K models -- still launches); the doctor restores gpt-oss:120b each tick. NOT a reliability break (the dangerous 32K NVIDIA fallback does NOT come back). |

`node scripts/hermes-doctor.mjs --json` reports each as a PASS / `!!` warn / `XX` fail with the exact fix.

---

## 5. Repair (operator, one-shot)
1. `node H:/prism/scripts/hermes-doctor.mjs` — fixes config + IPv4 + warm + dead proxy in one pass.
2. If a credential lane is genuinely needed beyond local+NVIDIA: that is operator-only (this doc's §8).
3. Restore a prior config from the timestamped `config.yaml.bak-apply-*` backups the applier writes.

---

## 6. Decouple doctrine (the 2026-06-30 desktop-breakage lesson)
The desktop chat app and the fleet's Hermes automation must **NOT share the `zulu` profile**. Fleet
enrichment crons/loops + config rewrites on the desktop's active profile starve the 60s connect window
(that broke the desktop on 2026-06-30). The fleet's `ask-hermes.mjs` / `mcp__hermes` use the NVIDIA env
lane independent of the desktop profile — so fleet automation does not need the desktop profile at all.
**Re-enable fleet crons only on a dedicated non-desktop profile.**

---

## 7. PRISM integration — the layered substrate (HERMES-PRISM-INTEGRATION-MS0)
Hermes's MCP client cannot filter tools at the wire level, so the full prism :3100 cannot be wired
(it would re-bloat init). Instead Hermes reaches ALL of PRISM in 4 layers, cheapest first:
- **L1 — `prism` facade MCP** (`scripts/prism-mcp-for-hermes.mjs`, 8 tools): `prism_search`, `prism_vault_search`, `prism_node_card`, `prism_blast_radius`, `prism_ask_ollama`, `prism_route_model`, `prism_escalate`, `prism_run_skill`. ~1.5K-token init.
- **L2 — `h-drive` filesystem MCP** (`H:/` root): vault + scripts + CLAUDE.md + souls + galaxy MEMORY.md.
- **L3 — Hermes shell:** `node H:/prism/scripts/*.mjs` directly (system-viz-query, ask-ollama).
- **L4 — `prism_run_skill` / `claude.cmd -p "/<skill>"`:** the FULL 101-dispatcher + 440-skill + 700-hook + fleet surface ON DEMAND (incl. orchestration `prism_context:slot_brief_write`/`chat_post`). Use `claude.cmd` NOT `claude.bat` (the `[1m]` headless bug). This is where "hooked up to the full prism MCP" lives — on demand, not at init.

The desktop SOUL (`AppData\Local\hermes\SOUL.md`) teaches Hermes this layering.

### 7.2 All-models picker + subscription proxy (HERMES-MODEL-PICKER-MS0 2026-06-30)
The operator picks ANY of their models from Hermes's native `/model` command + the app picker. It is
CONFIG-DRIVEN (`list_authenticated_providers` reads `custom_providers`; `discover_models:true` -> live
`/v1/models`), enforced durably by `hermes-config-apply.py`:
- **Providers** (`enforce_model_providers`): `Local Ollama` (all 17 local models) + `NVIDIA` (NVIDIA_API_KEY)
  + `PRISM Subscription` (127.0.0.1:8766). `quick_commands`: `/use120b` `/usecoder` `/usevision`.
- **Enforcer is now a VALIDATOR, not a pinner** (`enforce_primary`): it KEEPS whatever model the operator
  picks (so `/model` switches persist across the 15-min doctor); resets to gpt-oss:120b ONLY if the primary
  is broken (empty / cloud-reasoning that hangs / cloud-<64K). A local ollama pick is always kept.
- **Subscription proxy** (`scripts/hermes-subscription-proxy.mjs`, 8/8 tests): a local OpenAI-compatible
  server (:8766) fronting the CLIs so Claude + Codex are NATIVE switchable models -- claude-opus-4-8 /
  claude-sonnet-5 via claude.exe, gpt-5-codex via codex exec. `hermes-doctor` auto-starts it detached (no
  new scheduled task, no elevation) so the picker entry connects.
- **Caveat:** the subscription models spawn a CLI per message (seconds of latency; Claude draws the Max
  programmatic pool, Codex the ChatGPT limits) -- best as "my main model for this task," not fast chat.
  Reasoning/vision/embed models appear in the picker (operator wanted ALL) but aren't ideal as the agent model.

### 7.1 Escalation ladder — `prism_escalate` (opt-in stronger model, HERMES-ESCALATION-LADDER-MS0 2026-06-30)
Local gpt-oss:120b is Hermes's default agent model. For the ~10–20% of tasks beyond it, the `prism_escalate
{tier, prompt, model?, provider?}` facade tool escalates ONE task to a stronger brain. **It is a one-shot
question→answer TOOL, never Hermes's native model** — so it can NEVER hard-fail launch or hang the agent loop
the way the old native cloud-fallback / MOA did. That is the whole design: it adds a frontier brain WITHOUT
re-opening the §2/§4 failure modes (the 64K floor + the reasoning-hang only bite a NATIVE model, not a tool).

| tier | backend | default model | cost | status |
|---|---|---|---|---|
| `claude` | `claude.exe -p` (direct, no cmd.exe) | `claude-opus-4-8` | **$0 marginal** (Claude Max sub) | ready (reuses the proven prism_run_skill spawn) |
| `codex` | `node codex.js exec --sandbox read-only --output-last-message` | `gpt-5.x` (ChatGPT-account default) | **$0 API** (ChatGPT subscription) | built + unit-tested; live E2E DEFERRED (codex-exec stalled on a degraded box; mechanism is PRISM-proven via the scrutiny gate). Operator has NO OpenAI API key — Codex uses ChatGPT-account OAuth (`~/.codex/auth.json`) |
| `nvidia` | NVIDIA NIM (`NVIDIA_API_KEY`) | `qwen/qwen3-next-80b-a3b-instruct` (alias `heavy`→mistral-large-3-675b, `llama4`→llama-4-maverick) | cheap credits | **LIVE-verified 2026-06-30** |
| `frontier` | anthropic / openai / gemini | `claude-sonnet-5` / `gpt-5.5` / `gemini-3-pro` | usage-based | inert until operator sets `PRISM_HERMES_FRONTIER_PROVIDER` + that key in env |

- **Model ids are REAL** — enumerated live from `integrate.api.nvidia.com/v1/models` (121 models). The old MOA
  block's `qwen3.5-397b` / `deepseek-v4-pro` were FABRICATED; do not reuse them.
- **Key handling:** keys are read from env only at the call site, never logged; the resolver returns only the
  key NAME + a `keyPresent` boolean. Claude never enters a frontier key — the operator sets the env var.
- **Sibling:** `prism_route_model` (the deterministic LOCAL router) picks the local tier; `prism_escalate` is
  the OPT-IN cloud/frontier step ABOVE it. Default local; escalate deliberately.
- Assets: `scripts/lib/hermes-escalation.mjs` (+ `.test.mjs`, 14/14); `prism_escalate` + `buildEscalationRequest`
  in `scripts/prism-mcp-for-hermes.mjs` (facade test 17/17). Knobs: `PRISM_HERMES_NVIDIA_MODEL`,
  `PRISM_HERMES_FRONTIER_PROVIDER`, `PRISM_HERMES_ESCALATE_TIMEOUT_MS` / `_MAX_TOKENS`.

---

## 8. Operator-gated (cannot be auto-done)
- **No re-auth needed** for local+NVIDIA (NVIDIA key present; local Ollama needs none). The grok/anthropic/nous
  credential mess is **dropped** by design (it caused the 2026-06-29 cascade).
- Registering the `PRISM Hermes Doctor` task needs one elevated run of the installer (done 2026-06-30).
- Re-enabling autonomous fleet crons → must first decouple to a dedicated profile (§6).

---

## 9. Canonical assets (version-controlled — the orphan is closed)
| Asset | Path | Role |
|---|---|---|
| Config enforcer | `scripts/hermes-config-apply.py` | desired-state applier (model/fallback/mcp); `--check`/`--apply` |
| Launch doctor | `scripts/hermes-doctor.mjs` (+ `.test.mjs`) | idempotent pre-launch verify+repair |
| Drift-guard task | `.claude/helpers/install-hermes-doctor-task.ps1` | registers `PRISM Hermes Doctor` |
| PRISM facade | `scripts/prism-mcp-for-hermes.mjs` (+ `.test.mjs`) | the lean 8-tool Hermes→PRISM MCP server (incl. `prism_route_model`, `prism_escalate`) |
| Escalation resolver | `scripts/lib/hermes-escalation.mjs` (+ `.test.mjs`) | pure tier→target resolver for `prism_escalate` (claude/nvidia/frontier) |
| Config template | `state/shared/specs/hermes-config-template.yaml` | sanitized known-good config (recovery/diff) |
| **This doctrine** | `state/shared/specs/HERMES-OPERATING-DOCTRINE.md` | the single source of truth |

Legacy (layer B/C, still valid): `scripts/ask-hermes.mjs`, `scripts/hermes-mcp-server.mjs` (Claude→Hermes), `scripts/hermes-proxy-ensure.mjs`, `.claude/hooks/hermes-proxy-health-inject.mjs`.

---

## 10. Supersedes (stale — do not act on these)
- `reference_ollama_cannot_use_blackwell_cpu_fallback_2026_06_30` → SUPERSEDED (Ollama 0.30.11 fixed Blackwell GPU).
- `reference_hermes_proxy_stale_auth_2026_06_29` ("do NOT restart / needs re-auth") → SUPERSEDED (lane repointed to NVIDIA + local; the proxy is legacy).
- `reference_hermes_model_config_grok43_2026_06_26` ("default model = grok 4.3 max") → SUPERSEDED (operator chose gpt-oss:120b local 2026-06-30).
- Any guidance to wire the heavy prism :3100 into the **desktop** config → SUPERSEDED (it is the launch-killer; use the lean facade).
