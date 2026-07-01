# frontend-app session b2bcf85e (2026-05-26, 38.4MB, spine 199KB, 3 slice(s), model gpt-oss:20b)

**SHIPPED**  
- `8ad9044f3e`: GPU‑OFFLOAD‑MAXIMIZE‑MS0 envelope v1.0.1 (4 units, 2‑round scrutiny) – `mcp-server/data/milestones/GPU-OFFLOAD-MAXIMIZE-MS0.json`.  
- `29708e0128`: Hook patch & 35 tests for `ollama-route-pretooluse.mjs`; config `ollama-route-config.json`.  
- `3151aba8e7`: U‑GLOB‑TELEMETRY – telemetry sink + CLI gate in `glob-narrow-path.mjs` (9/9 tests).  
- `7a6a9e0438`: U‑CONTAINER‑SKILLS‑BATCH1 – `/route-take`, `/dispatcher-search`, `/doctrine-lookup`, `/cutting-force-quick`.  
- `1a2fdc7e2d`: U‑CONTAINER‑SKILLS‑BATCH2 – `/svi-pick`, `/atcs-tick`, `/psk-call`, `/memory-recent`.  
- `0763e315ea`: U‑CONTAINER‑SKILLS‑BATCH3 – `/rtk-suggest`, `/hook-cost-now`, `/subagent-triage`, `/read-large`.  
- `4314880d67`: U‑SVIZ‑AUTO‑REGEN – self‑heal Stop hook for stale system‑viz (>12 h).  
- `U‑SVIZ‑SYNERGY‑BATCH`: `/agent‑factory` skill + memory‑ontology spec (`SPEC‑MEMORY‑ENTITY‑ONTOLOGY‑2026‑05‑25.md`).  
- `3426272a04`: U‑FEATURE‑UTIL‑METER – primary per‑feature utilization meter.  
- `a97415271f`: U‑HOOK‑TELEMETRY‑LIB – shared `recordHookFire()` primitive.  
- `ecebb1a38a`: U‑FEATURE‑UTIL‑METER‑SECONDARY – secondary readers for wiki, memory, Docker, Qdrant, NN_EVAL.json, tribal docs, HTML.

**DECISIONS**  
- Keep system‑viz separate from GNN; share graph artifact.  
- Enable `ollama-route-pretooluse.mjs` auto‑mode only after telemetry row appears in `ollama-offload-stats.json`.  
- Ship config with `mode:"suggest"`; operator flips to `"auto"` post‑validation.  
- Drop chat‑model NIM (`nim‑llama32‑3b`) to free ~6 GB VRAM, enabling Qwen2.5‑Coder 7B Q8 on Ollama.  
- Route offload at task level (code‑explain, lint, diff‑summary) rather than slash‑command only.  
- Wrap high‑traffic MCP actions in container skills; add `.gitignore` exceptions for `! .claude/commands/*`.  
- Use self‑heal Stop hook to keep system‑viz fresh; lock prevents duplicate spawns.  
- Formalize Researcher→Story→Spec pipeline via `/agent‑factory`; adopt Pydantic‑typed memory ontology spec.

**OPERATOR DIRECTIVES (verbatim asks)**  
- `/startup-sierra /loop [5m] /goal`.  
- “continue” → next loop iteration; “continue next loop” → advance to iter 2.  
- After `/compact`, retry U2 (perf knobs) and flip config to `auto` after telemetry.  
- “lets do your suggestions then”; “high priority on token saving skills”.  
- “Goal clear: all features fully functional with full token‑saving synergy for highest efficiency and utilization hit rate.”  

**FINDINGS/BUGS**  
- GPU compute idle (~7 %); VRAM saturated by NIM chat model – resolved by dropping it.  
- Offload rate ~8 %; routing defaults to `mode:"auto"` fleet‑wide, causing raw reads to bypass Ollama.  
- Telemetry written to `.claude/cache/hook-telemetry.jsonl` instead of unified `ollama-offload-stats.json`.  
- `docker-compose.yml` locked by peer; U2 deferred until release.  
- Git index lock contention during commits – resolved with `git commit -- <files>` and background retry.  
- API errors from Claude Code due to policy‑classifier triggers (rate‑limited, content‑filter).  
- `regen‑viz.mjs` exits 255 (OOM at merge‑augmentations) – script fix needed.  
- 16 of 18 core features had UNKNOWN utilization; secondary readers reduced to 7.  
- WikiInject stale (`wiki/log.md` >5 days); cron broken due to Ollama backend timeout.  
- NN_EVAL.json stale 9 days → PSN‑LEG‑STATE injector shows AUROC not finite.  
- `glob‑narrow‑path.mjs` reverted to pre‑iter2 state; cross‑tree collision.

**DOMAIN SPECIFICS**  
- **Engines/Actions/Dispatchers**: PreToolUse:Read (`ollama-route-pretooluse.mjs`), Glob‑Narrow‑Path, container skills (`/route-take`, `/dispatcher-search`, etc.), system‑viz, PSN, Ollama, Docker, NN, GNN, LoRA, RAG (Qdrant), deep learning, wiki injection, memory injection, HTMLOverMD, tribal knowledge, Obsidian, PRISMA awareness, claude.md, octopus, NVIDIA NIM.  
- **Metrics**: `ollama-offload-stats.json`, `byHook[ollama-route-pretooluse]`, feature‑utilization meter outputs (HIGH/MEDIUM/LOW/UNKNOWN), take‑rate, RTK miss‑rate.  
- **Key Paths**: `/rtk-suggest`, `/hook-cost-now`, `/subagent-triage`, `/read-large`, `mcp-route-takerate-audit.json`, `/mcp-route-best`, `/chat-bus-summary`, `/handoff-quick`.

**TOOLS USED**  
- PRISM helpers: `chat-slots.mjs`, `slot-bind-enforce.mjs`, `per-agent-handoff.mjs`.  
- Hook framework: `.claude/hooks/*.mjs`, `.claude/commands/*`.  
- Docker Compose (`docker compose up -d`, `docker stop`).  
- Ollama CLI (`ollama pull`, config via `ollama-route-config.json`).  
- Git (`git commit -- <files>`, lock‑retry background).  
- CronCreate for recurring `/loop` jobs.  
- Test harness: `node:test`.  

**OPEN THREADS**  
1. Ship Ollama perf knobs (env vars in `docker-compose.yml`) once peer releases file lock.  
2. Pull Qwen2.5‑Coder 7B Q8, restart Ollama; verify via `/api/tags`.  
3. Stop chat‑model NIM (`nim-llama32‑3b`); confirm offload rate climbs >30 %.  
4. Flip `ollama-route-config.json` from `"suggest"` → `"auto"` after telemetry row appears in dashboard.  
5. Wire remaining UNKNOWN features (PSN, SystemViz, Docker, NN_GNN, LoRA, RAG_Qdrant, DeepLearning, WikiInject, MemoryInject, HTMLOverMD, TribalInject, Obsidian, PRISMA awareness, CLAUDE_md, Octopus, NVIDIA_NIM).  
6. Investigate/fix wiki‑cron / wiki‑bootstrap (Ollama backend timeout).  
7. Resolve `glob-narrow-path.mjs` revert issue; merge shared telemetry lib into main tree.  
8. Monitor 24 h/7 d measurement windows for deferred milestones (`GPU-OFFLOAD-MAXIMIZE-MS0`, PSN synergies).
