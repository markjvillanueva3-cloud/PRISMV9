# pdf-corpus session f6b6d9da (2026-06-15, 32.3MB, spine 187KB, 3 slice(s), model gpt-oss:20b)

**SHIPPED**  
- `54a7183de0`: Agent‑fanout‑pressure‑gate denies mechanical fan‑outs → `ollama-fanout`; 17/17 tests + live E2E.  
- `U-SFLC-NOTE-CORRECT`: removed stale “not fixed” note for loop auto‑continuation.  
- `scripts/ask-hermes.mjs`: OpenAI‑compatible proxy bridge to Hermes (`:8645/v1`) with xai OAuth, auto‑fallback to local Ollama; 20/20 unit tests + live E2E pass.  
- Commit `b56ef64c7e`: added `tallyUsage()` at all exit points (26/26 tests).  
- `hermes-proxy-ensure.mjs` + `install-hermes-proxy-task.ps1`: keep‑alive scheduled task “PRISM Hermes Proxy” running (`Ready`, `LastResult = 0`).  
- `/ask-hermes` slash command committed to `.claude/commands/`; available in every Claude Code slot.  
- Hermes desktop app (Electron) visible and functional; path `C:\Users\wompu\AppData\Local\hermes\hermes-agent`.  
- All 21 per‑slot profiles repointed to local Ollama (`provider: ollama`, `base_url: http://127.0.0.1:11434/v1`).  
- Commit `b1ff295da7`: delegation.provider pinned to local Ollama, model `gpt‑oss:120b`.  
- Updated `config.yaml`: `credential_pool_strategies.anthropic = round_robin`.

**DECISIONS**  
- Keep dashboard PKCE backups; add 6 fresh Claude Code captures.  
- Use Hermes proxy (`:8645`) for managed OAuth; default to Ollama when Hermes fails.  
- Enforce mechanical fan‑outs via `agent-fanout-pressure-gate`; leave main-loop reads unforced (harness limit).  
- Do not add new vault write hooks – existing 8 Stop-hooks saturate space.  
- Bridge and proxy finished; keep‑alive guarantees always‑on operation.  
- Hybrid offload: Hermes agent loop runs on local Ollama for free token savings; fallback to Grok if needed.  
- Desktop app launch remains manual (no automated launcher).  
- Root `config.yaml` left with `provider: auto, base_url: ''`; no active_profile set – agent loop will fall back to root model if not overridden.  
- Activation policy opt‑in; decide whether to auto‑invoke Hermes or keep on‑demand.  
- Escalation knob: set `experimental.auto_invocation_router=false` or raise `claude_escalation_threshold` (currently 0.65) to avoid silent paid‑Claude escalation.

**OPERATOR DIRECTIVES**  
1. Launch Hermes desktop app to expose proxy on `:8645`.  
2. Verify bridge by sending test request through `ask-hermes.mjs`; expect PRISM_HERMES_LOCAL_OK.  
3. Ensure keep‑alive task running (`sc query "PRISM Hermes Proxy"`).  
4. Use `/ask-hermes` in any Claude Code slot to invoke Hermes via proxy.  
5. Verify agent loop uses local Ollama: `hermes chat -Q -q "test prompt"`. If paid-model response, set an active profile in `config.yaml` (e.g., `active_profile: bravo`) or edit root model block to point explicitly at `provider: ollama`.  
6. Decide on escalation knob and activation policy per above.

**FINDINGS/BUGS**  
- Interrupted update left `.update-incomplete` marker; cleared without killing agents.  
- SyntaxError in `toolsets.py` resolved by git pull; backend imports clean at v0.16.0.  
- Proxy defaults to port `:8645`, not `:9120`.  
- Anthropic billing policy blocks third‑party OAuth calls (HTTP 400); use xai or Ollama instead.  
- Main-loop reads cannot be hook‑forced; only tool‑call boundaries enforceable.  
- MCP bridge “down” banner caused by harness init latency (~11 s) under heavy load; not a PRISM defect.  
- No functional bugs in Hermes bridge, proxy, slash command.  
- Agent loop provider may default to paid if root config unchanged.  
- Latent paid‑path exposure: `auto_invocation_router=true` + threshold 0.65 may auto‑escalate tasks > 0.65 to paid Claude/cloud.  
- Delegation.provider now pinned locally; residual risk if not fully covered.  
- Aux sub‑roles provider=`auto` unbound to cloud resolution.  
- Full Hermes agentic chat loop non‑functional under Anthropic third‑party billing (only proxy completion path works).

**DOMAIN SPECIFICS**  
- Hermes desktop: `C:\Users\wompu\AppData\Local\hermes\hermes-agent`.  
- Credential pool in `auth.json` (anthropic entries).  
- PRISM scripts: `capture-claude-credentials.mjs`, `sync-claude-accounts-to-hermes.mjs`, `agent-fanout-pressure-gate.mjs`, `ask-hermes.mjs`.  
- Proxy endpoint: `127.0.0.1:8645/v1` (xai OAuth).  
- Per‑slot profiles repointed to local Ollama (`provider: ollama`, `base_url: http://127.0.0.1:11434/v1`).  
- MCP server, scheduled tasks (“PRISM Hermes Proxy”), routing infrastructure.  
- Utilization metrics: `byHook["ask-hermes"]` (`fired`, `offloaded`, `bySource:{hermes}`, `byMode`).  
- Engines: local Ollama `gpt‑oss:120b`; fallback to Grok.

**TOOLS USED**  
- Hermes CLI (`hermes`, `hermes proxy`) and desktop app.  
- PRISM node scripts (`capture‑claude‑credentials.mjs`, `sync‑claude‑accounts‑to-hermes.mjs`, `ask-hermes.mjs`).  
- Windows PowerShell for scheduled task creation (`install-hermes-proxy-task.ps1`).  
- ruamel.yaml / YAML editing (`config.yaml`).  
- Node unit tests (`node test`) and Python import checks.  
- Ultracode evaluation workflow `wf_b36ab40c-3b2`; test suite 26/26.

**OPEN THREADS**  
- Agent‑loop provider confirmation: ensure active profile or edit root model block to guarantee local Ollama usage.  
- Desktop app automation: optional script to launch Electron GUI on boot.  
- MCP bridge latency monitoring: add lightweight health check for prolonged `/ready` times under load.  
- Activation policy decision (auto‑invoke Hermes vs. manual).  
- Escalation knob decision (`experimental.auto_invocation_router` / `claude_escalation_threshold`).  
- Potential need for cloud fallback for aux sub‑roles if required by future use cases.  
- Full agentic chat loop functionality under Anthropic billing constraints.
