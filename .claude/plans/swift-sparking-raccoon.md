# Multi-Model Local LLM Integration — Docker Model Runner + Ollama → PRISM

## Context

You pulled 5 models into Docker Model Runner (only `ai/llama3.2:3.2B` actually landed; 4 failed) and want to wire local LLMs into three places:
1. **PRISM AI Tier-3 specialist routing** (`AISystemRouterEngine.route()`)
2. **Multi-model consensus** (`MultiModelConsensusEngine.ask()` — currently 4-way cloud, become 5- to 9-way mixed)
3. **Obsidian/wiki RAG** (`prism_knowledge:wiki_query` — replace small-window retrieval with long-context synthesis)

Adjacent fixes needed:
- Gemini 3 Pro fails because `GeminiClientEngine` uses REST (`generativelanguage.googleapis.com/v1beta`); preview models are `limit:0` on free tier. Per CLAUDE.md, switch to `gemini -p` CLI subprocess.
- `qwen2.5-coder:7b` is the current default Ollama hook model; promote `deepseek-r1:14b` to default for reasoning hooks (you have it pulled, RTX 4080 SUPER fits it comfortably).
- Drop NIM containers from active scope (license-gated; the half-pulled Llama-3.1-8B vhdx data already removed during pruning). Keep `nim-hook-bridge.mjs` dormant for future re-enable.

Decisions you made for this plan:
- **Retry the 4 failed pulls** with corrected Docker Hub catalog names; surface real errors.
- **Promote DeepSeek-r1:14b** to default for general/reasoning hooks; keep qwen2.5-coder for code-specific hooks.
- **Build all three integrations** in one plan, ship sequentially with verification gates.

## Live model inventory (what's actually serving right now)

| Endpoint | Models | Notes |
|---|---|---|
| Docker Model Runner `:12434` | `ai/llama3.2:latest` (3.2B, 1.87 GB) | OpenAI-compat at `/engines/v1/chat/completions` |
| Ollama `:11434` | `deepseek-r1:14b`, `llama3.2-vision:11b`, `qwen2.5-coder:7b`/`14b`/`32b`, `nomic-embed-text:latest` | Already wired via `OllamaClientEngine` |
| NIM `:8000` (NEW, not running) | n/a — license-gated | Bridge code retained but dormant |

## Architecture

```
                      ┌─── PRISM hooks (Stop, UserPromptSubmit, etc.)
                      │
                      ▼
         local-llm-bridge.mjs        (selector: nim | ollama | docker-mr | auto)
            │           │           │
            │           │           └──► docker-model-runner-bridge.mjs  ─► :12434/engines/v1
            │           └──► ollama-hook-bridge.mjs                       ─► :11434/api
            └──► nim-hook-bridge.mjs (dormant)                            ─► :8000/v1
                                                                              ▲
                                                                              │
                                                         routes by TaskClass  │
   PRISM dispatchers ──► AISystemRouterEngine.route()  ────────────────────────┘
                              │
                              ├─ physics_validation     → Claude / docker-physics-agent
                              ├─ code_review            → qwen2.5-coder:32b (Ollama)
                              ├─ code_generation_heavy  → qwen2.5-coder:32b (Ollama)        [NEW]
                              ├─ instruction_generation → ai/llama3.2 (Docker MR) for short prompts; deepseek-r1:14b for long [NEW]
                              ├─ long_context_synthesis → deepseek-r1:14b (128k ctx) — Kimi if pull lands [NEW]
                              ├─ ml_inference / search  → llama3.2-vision:11b (Ollama, multimodal)
                              ├─ reasoning              → deepseek-r1:14b (default for non-code reasoning) [NEW DEFAULT]
                              └─ unknown / general      → deepseek-r1:14b (Tier-3 default) [PROMOTED]

   Multi-model consensus (high-stakes only):
      vote pool = Claude + Codex + Gemini(CLI) + Grok + DockerMR(llama3.2) + Ollama(deepseek-r1) + Ollama(qwen2.5-coder:32b)
      = 7 voters; threshold 5/7 = pipeline-verified, 4/7 = tentative-pass
```

## Implementation Phases (sequential, each gated by verification)

### Phase 0 — Foundation & Diagnostics  *(blocking — finish before Phase 1)*

**0.1 Kick Docker Model Runner.** Daemon hangs every few hours; `docker model ls` is currently broken even though port 12434 responds. Restart procedure already known: kill `docker*` / `com.docker.*` procs, `wsl --shutdown`, relaunch Docker Desktop. Fold this into a new `H:/Tools/nim/restart-docker.ps1` so we don't keep re-typing it.

**0.2 Probe Docker Hub `ai/` catalog.** New `H:/Tools/nim/probe-models.ps1` queries `https://hub.docker.com/v2/repositories/ai/?page_size=100` (Docker Hub API, no auth), prints all `ai/<name>` packages with their tags. This tells us what the user can actually pull (the GUI may show staged/preview names that don't exist on Hub yet).

**0.3 Retry failed pulls.** For each of (DeepSeek, Qwen-coder, Nemotron, Kimi), use the catalog probe to find the exact name, then `docker model pull <name>`. Capture stderr and surface failures. Likely pull syntax forms: `ai/deepseek-r1`, `ai/qwen2.5-coder:32B`, `ai/nemotron-mini`, etc. (Kimi may not be in the Docker AI catalog at all — fall back to HuggingFace via `docker model pull hf.co/moonshot-ai/...`).

**0.4 Fix Gemini 3 Pro.** Open `H:/prism-iooms0/mcp-server/src/engines/GeminiClientEngine.ts` (line 70 `generativelanguage.googleapis.com/v1beta/...`). Replace the REST `fetch()` block with a subprocess call to `gemini -p "<prompt>"` (mirrors `CodexClientEngine` subprocess pattern at lines 38-52 of that file). Keep REST as fallback for non-preview models.

**Phase 0 verification:**
- `pwsh H:/Tools/nim/restart-docker.ps1` returns daemon ready in <30s.
- `pwsh H:/Tools/nim/probe-models.ps1` lists at least 20 `ai/*` packages with their tags.
- `docker model ls` works again.
- `node -e "import('file:///H:/prism-iooms0/mcp-server/dist/engines/GeminiClientEngine.js').then(m => m.geminiClient.exec({prompt:'say OK'}).then(console.log))"` returns success on `gemini-3-pro-preview`.

---

### Phase 1 — Foundation Engines  *(2 new files, 1 modified)*

**1.1 NEW `H:/prism/mcp-server/src/engines/DockerModelRunnerClientEngine.ts`**

Mirror `H:/prism-iooms0/mcp-server/src/engines/GrokClientEngine.ts` (lines 47-200 — OpenAI-compatible HTTP client). Public API:
```ts
export class DockerModelRunnerClientEngine {
  constructor(opts?: { endpoint?: string; defaultModel?: string });
  async listModels(): Promise<string[]>;                  // GET /engines/v1/models
  async exec(opts: DockerMRExecOptions): Promise<DockerMRResult>;  // POST /engines/v1/chat/completions
  async isAvailable(): Promise<boolean>;                  // 60s cached probe
}
```
- Endpoint via env `DOCKER_MR_ENDPOINT` default `http://127.0.0.1:12434`.
- Result shape `{ ok, answer, model, latencyMs, tokens, error }` — uniform with the other 4 client engines so MultiModelConsensusEngine can swap in cleanly.
- 404 fallback: if requested model isn't loaded, retry with `defaultModel` (mirrors `nim-hook-bridge.mjs:queryNim` retry logic).

**1.2 NEW `H:/prism/.claude/hooks/lib/docker-model-runner-bridge.mjs`**

Hook-layer wrapper that mirrors `ollama-hook-bridge.mjs` API exports:
```js
export async function isDockerMRAvailable();
export async function queryDockerMR(prompt, opts);   // signature identical to queryOllama
```
HOOK_MODELS map for Docker MR (initially just `ai/llama3.2:latest` for everything; expanded after Phase 0.3 retries succeed). Body shape: OpenAI-compat `{model, messages: [system, user], max_tokens}`.

**1.3 MODIFY `H:/prism/.claude/hooks/lib/local-llm-bridge.mjs`**

Extend `BACKEND` env values from `auto|nim|ollama` → `auto|nim|ollama|docker-mr`. In `auto` mode, probe order: NIM (dormant, skipped) → Docker MR → Ollama. Add `LOCAL_LLM_PREFER` env so user can override on a per-task basis (e.g. force Ollama for reasoning).

**Phase 1 verification:**
- `node -e "import('file:///H:/prism/.claude/hooks/lib/docker-model-runner-bridge.mjs').then(m => m.queryDockerMR('say OK',{maxTokens:8}).then(console.log))"` returns `{success:true, response:..., backend:'docker-mr'}`.
- Same call through `local-llm-bridge.mjs` with `LOCAL_LLM_BACKEND=docker-mr` produces same result.

---

### Phase 2 — Specialist Routing (PRISM AI Tier-3)  *(2 files modified)*

**2.1 MODIFY `H:/prism/mcp-server/src/engines/AISystemRouterEngine.ts`**

- Lines 35-44 (`TaskClass` enum): add `code_generation_heavy`, `instruction_generation`, `long_context_synthesis`. Total 12 classes.
- Lines 67-94 (`classify()` regex): add patterns for new classes. e.g.
  - `/(wedm|wire edm|sinker|edm)/i` → `instruction_generation`
  - `/(wiki|knowledge|rag|long.?context|synthesi[sz]e)/i` → `long_context_synthesis`
  - `/(generate|write|implement).{0,40}(code|function|engine|class)/i` → `code_generation_heavy`
- Lines 103-157 (`route()` switch): add cases routing each new TaskClass to the right backend (Docker MR for fast turnaround, Ollama deepseek-r1:14b for reasoning, qwen2.5-coder:32b for code-heavy, llama3.2-vision for multimodal).
- Lines 173-219 (backend probing): add `docker-mr` probe (calls `DockerModelRunnerClientEngine.isAvailable()`).

**2.2 MODIFY `H:/prism/.claude/hooks/lib/ollama-hook-bridge.mjs`**

Update `HOOK_MODELS` map (we just read it — currently all qwen2.5-coder:7b/14b):
```js
const HOOK_MODELS = {
  // PROMOTED: deepseek-r1 wins on reasoning + general for the offload tier
  general:        'deepseek-r1:14b',
  mcp_route:      'deepseek-r1:14b',
  ai_feature:     'deepseek-r1:14b',
  validation:     'deepseek-r1:14b',
  // KEPT: qwen2.5-coder is faster on code-shaped queries
  grep_index:     'qwen2.5-coder:7b',
  code_explain:   'qwen2.5-coder:14b',
  pattern_match:  'qwen2.5-coder:7b',
};
```

**Phase 2 verification:**
- Trigger any Stop hook → `mcp-server/data/state/ollama-offload-stats.json` records `model: deepseek-r1:14b` for general/mcp_route/ai_feature events.
- Manually call `aiSystemRouterEngine.route("generate G-code for WEDM rough cut")` → returns `{ class: 'instruction_generation', backend: 'docker-mr', model: 'ai/llama3.2:latest', confidence: ≥0.7 }`.
- Manually call `aiSystemRouterEngine.route("synthesize wiki entries on Kienzle constants")` → returns `{ class: 'long_context_synthesis', backend: 'ollama', model: 'deepseek-r1:14b' }`.

---

### Phase 3 — Multi-Model Consensus Expansion  *(2 files modified)*

**3.1 MODIFY `H:/prism-iooms0/mcp-server/src/engines/MultiModelConsensusEngine.ts`**

- Lines 219-245 (`Promise.all` fan-out block): add 5th and 6th providers:
  - `dockerMrClient.exec({ model: 'ai/llama3.2:latest', prompt })`
  - `ollamaClient.generate({ model: 'qwen2.5-coder:32b', prompt })` (already wired but not in consensus pool)
- Lines 146-147 (thresholds): keep `ACCEPT_THRESHOLD=0.70` semantically but reinterpret over 7 voters: ≥5/7 = accept, 4/7 = review, ≤3/7 = escalate.
- Lines 162-177 (PRISM context budget): add per-provider budget for Docker MR (smaller default, since llama3.2:3.2B has 32k context).

**3.2 MODIFY `H:/prism-iooms0/mcp-server/src/engines/GeminiClientEngine.ts`** (Phase 0.4 fix lands here)

Replace REST block at line 70-90 with subprocess call to `gemini -p "<prompt>"`. Pattern: `child_process.execFile('gemini', ['-p', prompt], { timeout })`. Capture stdout. Keep REST fallback for `gemini-1.5-pro` and earlier models that DO work via REST.

**Phase 3 verification:**
- `node H:/prism-iooms0/scripts/test-consensus-7way-now.mjs "What is 2+2?"` → returns `ConsensusResult` with 7 votes (Claude / Codex / Gemini-CLI / Grok / DockerMR / Ollama-deepseek-r1 / Ollama-qwen2.5-coder:32b), agreement ≥0.85, recommendation "accept".
- One provider down (kill Ollama briefly) → consensus still produces a result with 6 votes, recommendation "review" or "accept" depending on agreement.

---

### Phase 4 — Obsidian / Wiki Long-Context RAG  *(1 dispatcher modified, 1 helper added)*

**4.1 MODIFY `H:/prism/mcp-server/src/tools/dispatchers/knowledgeDispatcher.ts`** (path inferred — to be confirmed during exploration)

For action `wiki_query`:
- Old flow: chunk-and-rerank with small context window.
- New flow: 
  1. Embed query via `nomic-embed-text:latest` (already pulled).
  2. Vector retrieve top-50 candidate chunks from `wiki/index.md` references.
  3. Concatenate top-50 chunks (≈40k tokens) into a single long-context prompt for `deepseek-r1:14b` (128k ctx) — or Kimi if Phase 0.3 lands it.
  4. Synthesis prompt: "Given these wiki entries, answer: {query}".
  5. Return both the synthesis answer AND the retrieved chunks (for verifiability).

**4.2 NEW `H:/prism/mcp-server/src/engines/WikiLongContextRagEngine.ts`**

Encapsulates the retrieve+synthesize loop. Reuses:
- `nomic-embed-text` via OllamaClientEngine
- `WikiIndexMaintainerEngine` for chunk enumeration (per CLAUDE.md, already maintains 722-entry index)
- `DockerModelRunnerClientEngine` or `OllamaClientEngine` for synthesis (whichever has the long-context model loaded)

**4.3 MODIFY `H:/prism/mcp-server/src/engines/OllamaContextFloorEngine.ts`**

Add a `backend: 'docker-mr'` mode so `wrap()` prepends CLAUDE-BRIEF on Docker MR calls too (currently Ollama-only). Single new switch case.

**Phase 4 verification:**
- `prism_knowledge:wiki_query { query: "What's the canonical kc1.1 for AISI 4140?" }` returns the value from `wiki/concepts/kienzle-coefficients.md` (or wherever it lives) with both synthesis answer AND retrieval citations.
- Synthesis token count >5k (proves long-context is engaged, not just keyword match).
- Latency <8s on a warm `deepseek-r1:14b` (cold start may be 30s).

---

## Files to Create / Modify

| Path | Type | Phase | Purpose |
|---|---|---|---|
| `H:/Tools/nim/restart-docker.ps1` | NEW | 0.1 | Folded restart procedure |
| `H:/Tools/nim/probe-models.ps1` | NEW | 0.2 | Docker Hub `ai/*` catalog query |
| `H:/prism/mcp-server/src/engines/DockerModelRunnerClientEngine.ts` | NEW | 1.1 | Tier-3 client (HTTP fetch, OpenAI-compat) |
| `H:/prism/.claude/hooks/lib/docker-model-runner-bridge.mjs` | NEW | 1.2 | Hook-layer bridge mirroring Ollama API |
| `H:/prism/.claude/hooks/lib/local-llm-bridge.mjs` | MODIFY | 1.3 | Add `docker-mr` to backend selector |
| `H:/prism/.claude/hooks/lib/ollama-hook-bridge.mjs` | MODIFY | 2.2 | Promote deepseek-r1:14b in HOOK_MODELS |
| `H:/prism/mcp-server/src/engines/AISystemRouterEngine.ts` | MODIFY | 2.1 | TaskClass enum + classify regex + route switch |
| `H:/prism-iooms0/mcp-server/src/engines/GeminiClientEngine.ts` | MODIFY | 0.4 / 3.2 | REST → `gemini -p` subprocess |
| `H:/prism-iooms0/mcp-server/src/engines/MultiModelConsensusEngine.ts` | MODIFY | 3.1 | Add Docker MR + Ollama-32b as voters |
| `H:/prism/mcp-server/src/engines/WikiLongContextRagEngine.ts` | NEW | 4.2 | Retrieve+synthesize loop for wiki RAG |
| `H:/prism/mcp-server/src/tools/dispatchers/knowledgeDispatcher.ts` | MODIFY | 4.1 | Wire wiki_query to the new RAG engine |
| `H:/prism/mcp-server/src/engines/OllamaContextFloorEngine.ts` | MODIFY | 4.3 | Add docker-mr backend support |
| `H:/prism/state/shared/MODEL_REGISTRY.json` | NEW | 1.x | Per-host model availability + specialist mapping |

## Constraints honored

- **Asset preservation**: existing `ollama-hook-bridge.mjs` and `nim-hook-bridge.mjs` not deleted; bridges grow additively.
- **No physics constants inlined**: this work doesn't touch physics.
- **Multi-chat safety**: MODEL_REGISTRY keyed by hostname; cross-machine reads are safe.
- **Tests required for new engines**: each NEW `.ts` engine ships with a vitest test file containing happy-path + 3 failure modes (timeout, model-not-loaded, malformed-response) + 2 adversarial inputs (empty prompt, oversize prompt).
- **Dispatcher wiring round-trip**: per the comprehensive-build-enforce hook, every NEW engine wires through its dispatcher with a passing E2E test.
- **Chat-bus claims**: I'll claim each touched file before editing.

## Out of scope

- NIM container retry (parked, plan retains `nim-hook-bridge.mjs` for future use).
- Gemini REST fallback for non-preview models (kept; only the `gemini-3-pro-preview` codepath swaps to subprocess).
- Codestral 22B (Mistral commercial-license gate; revisit if you get NVIDIA Inception).
- Any change to the H: drive portability rules.
