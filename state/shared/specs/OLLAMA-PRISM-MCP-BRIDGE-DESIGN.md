# OLLAMA → PRISM-MCP BRIDGE — design + honest scope

**Created:** 2026-05-18 · slot charlie · OLLAMA-EXPAND-MS0
**Updated:** 2026-05-18 · slot hotel · L2b-blocker-cleared (`claude-9c7dcf3e`,
BACKEND-DEV-LOOP iter-3 follow-on) — see §"L2b blocker resolved" below.
**Updated:** 2026-05-18 · slot echo · U-OE-DOCKER-COMPOSE shipped — the Docker
half of the operator question is now answered: `docker-compose.ollama-bridge.yml`
(additive override) runs ollama + prism-mcp + the bridge harness reproducibly.
Only Layer 3 remains, and it is deferred (needs a larger local model).
**Status:** Layer 1 shipped (`ask-ollama.mjs`, U-OE01) · Layer 2 shipped
(`ollama-prism-bridge.mjs`, U-OE-BRIDGE-L2 — read-only KNOWLEDGE-surface agent
loop) · **Layer 2b SHIPPED 2026-05-18 (slot foxtrot, claude-3c737257,
U-OE-BRIDGE-L2B)** — live MCP-dispatcher tools via JSON-RPC over Streamable
HTTP on :3100/mcp. 14 curated read-only actions across prism_calc + prism_session.
14/14 live-routing E2E proven (per-action probe test). Defense-in-depth:
frozen MCP_ALLOWLIST + explicit MCP_DENYLIST regression guard +
validateMcpCall upstream + impl-boundary re-validation. 199 tests (198 pass /
1 skip / 0 fail) · Layer 3 (full agent loop) queued and remains gated on L2b
telemetry.
**Answers the operator questions:** *"can we hook Ollama up to the PRISM MCP
server so it gets access to it like Claude Code? same with Docker?"*

## The honest answer

**Ollama is a model-inference server, not an MCP client.** Its API surface is
`/api/generate`, `/api/chat`, `/api/embeddings`, `/api/tags`. It has no agent
loop, no tool-call orchestration, no concept of "connecting to MCP". You
cannot point Ollama at the PRISM MCP server and have it work — there is no
config flag for it.

**What IS true:** modern Ollama models (qwen2.5-coder, mistral, llama3.x)
support tool/function calling via the `tools` parameter on `/api/chat`. So a
**Node harness** can: (a) act as the MCP client (or import the dispatchers
directly), (b) advertise PRISM's dispatcher actions to an Ollama model as
tools, (c) run the call→execute→feed-back loop. That harness — not Ollama
itself — is what makes Ollama "use PRISM like Claude Code". It is a real
build, not a switch.

**Docker:** the PRISM MCP server (port 3100), Ollama (11434), and the
Qdrant/Postgres/Prometheus containers can all be put on one Docker network
via `docker-compose`. That is configuration, not new code. It does NOT by
itself give Ollama tool access — the harness above is still required. Docker
only matters here for *deployment topology* (running the harness + Ollama +
MCP together, reproducibly).

## Layered ladder (simplest first — each layer ships independently)

### Layer 1 — local query service — **SHIPPED** (U-OE01)
`scripts/ask-ollama.mjs`. Ollama answers questions over the system-viz graph
and over file content with **no MCP tool-calling at all** — direct, reliable,
0 Claude tokens for the heavy lifting. This is the 80% of the value at 5% of
the risk. Done.

### Layer 2 — read-only agent loop — **SHIPPED** (U-OE-BRIDGE-L2)
`scripts/ollama-prism-bridge.mjs` — the Node harness that runs the
call → execute → feed-back loop. It advertises three READ-ONLY tools to an
Ollama model via `/api/chat` `tools`, and the model autonomously chains them
like Claude Code does — locally, ~0 Claude tokens. Tool surface:
- `viz_search` — ranked search of the system-viz graph
- `wiki_lookup` — keyword search of the architecture wiki index
- `read_excerpt` — a byte-capped excerpt of a repo file (`confinePath`-confined)

Realised scope guards:
- **Read-only by construction** — the only three tools are file/graph reads;
  there is no write or exec path a 3B model could be coaxed into. `confinePath`
  (lexical + `realpathSync` symlink hardening) keeps `read_excerpt` inside the
  repo.
- **Frozen 3-tool allowlist** — `TOOL_NAMES` is `Object.freeze`d; an unknown
  tool is rejected before execution and fed back so the model recovers.
- **Hard loop cap** (`MAX_CALLS_CEIL` 12, default 6) + per-call timeout +
  `TOOL_RESULT_MAX_CHARS` cap on every tool result re-entering the context.
- **Fail-loud** — a thrown `chatImpl`, an unreachable Ollama, a malformed
  message all become explicit `{ok:false,error}` (exit 3), never a crash.
86-case `node:test` suite incl. real-data E2E + a `main()` subprocess oracle.

**Honest scope:** this L2 connects Ollama to PRISM's read-only KNOWLEDGE
surface (graph + wiki + files) — the reliable, server-free 80% that delivers
the token-saving win. It does NOT yet wire the live `prism_calc` /
`prism_session` MCP dispatchers as tools — that is **Layer 2b**, a separate
follow-on (the MCP server on port 3100 exposes no plain HTTP route; the
protocol surface must be resolved first, and a small model routing the full
97-dispatcher surface is an unproven empirical risk).

### Layer 2b — live MCP-dispatcher tools — **SHIPPED** 2026-05-18 (slot foxtrot, U-OE-BRIDGE-L2B)
`scripts/ollama-prism-bridge.mjs` `mcp_call` tool — 14 curated read-only
actions across `prism_calc` + `prism_session` over JSON-RPC / Streamable HTTP
at `:3100/mcp`. Frozen `MCP_ALLOWLIST` + `MCP_DENYLIST` regression guard +
`validateMcpCall` + impl-boundary re-validation. 14/14 live-routing E2E.
Commits `2518aa3514` (L2b) + `90103705e8` (4-surface doc reflection). The
narrative below is the original design rationale, retained for the record;
the "blockers" it lists were all resolved in the shipped build.

Extend the L2 harness with a curated, read-only subset of live MCP dispatcher
actions (`prism_calc` physics, `prism_session` queries) as additional tools.

**Prior blocker (CORRECTED 2026-05-18 by hotel `claude-9c7dcf3e`):** the L2
ship-note claimed "the MCP server on port 3100 exposes no plain HTTP route;
the protocol surface must be resolved first." This was empirically false. The
PRISM MCP server uses `StreamableHTTPServerTransport` from
`@modelcontextprotocol/sdk` and exposes JSON-RPC 2.0 at
`http://127.0.0.1:3100/mcp` with `enableJsonResponse: true` (stateless, no
session). Live probe (2026-05-18, hotel):

```
curl -sS -X POST http://127.0.0.1:3100/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
→ {"result":{"tools":[{"name":"prism_data","description":"…","inputSchema":{…}},…]}}
```

Engine source: `mcp-server/src/index.ts:945-955` (POST handler) + `index.ts:1022-1032`
(port binding, default 3000, prod 3100 via `PORT` env). Sibling helper
`.claude/helpers/mcp-http-bridge.mjs` already proves the JSON-RPC pattern works
in the reverse direction (Claude stdio → HTTP MCP server), which means the
HTTP transport has been live and battle-tested at multi-chat fleet scale.

**Real remaining blockers** (none transport-level):
- *Tool surfacing*: curate which dispatcher actions reach the Ollama tool
  registry. The full 97-dispatcher × ~6000-action surface is too wide for a
  3B model to route reliably. Start with a small read-only subset
  (`prism_calc.cutting_force`, `prism_calc.speed_feed`,
  `prism_session.master_index_query`, `prism_session.dispatcher_map_compact`,
  `prism_data.material_search`).
- *Schema validation*: wrap each dispatcher result through Zod schema (the
  dispatcher already validates inputs via Zod, but the harness must validate
  outputs before feeding back to the model — a hostile-shape result must not
  crash the harness loop, only feed the model a structured "bad output" message).
- *Result-token cap*: dispatcher responses can be ~50KB. Re-use L2's
  `TOOL_RESULT_MAX_CHARS` (defaults to 8KB) — anything larger gets truncated
  with a "result truncated, refine query" suffix.

**Effort:** ~1 milestone (3-5 units: U-OE-BRIDGE-L2B-CLIENT for the JSON-RPC
client, U-OE-BRIDGE-L2B-CURATE for the tool whitelist + schemas,
U-OE-BRIDGE-L2B-CAPS for result-size caps + truncation, U-OE-BRIDGE-L2B-TESTS
for ≥30 hermetic + 1 live-server E2E with the dispatcher running). Risk:
medium-low (model reliability on tool selection across more actions remains
the empirical question; transport is no longer one).

### Layer 3 — full agent loop — **QUEUED, NOT SCHEDULED** (U-OE-BRIDGE-L3)
A general Ollama-driven agent that can plan multi-step PRISM work. Requires
Layer 2 proven first + a much larger local model than the 3B currently
installed (tool-calling accuracy scales hard with model size). Honest take:
this is a genuine multi-milestone effort and should not be attempted until
Layer 2 telemetry shows acceptable tool-selection accuracy.

## Docker topology (Layer 2+ deployment, when built)

```
docker-compose: prism-net
  ├─ ollama          11434   (model server, GPU passthrough)
  ├─ prism-mcp       3100    (the dispatcher surface)
  ├─ ollama-bridge           (Layer-2 harness — MCP client + agent loop)
  ├─ qdrant / postgres / prometheus
```
The bridge container is the only one that needs both `ollama` and
`prism-mcp` on its network. This is deployment config authored when Layer 2
lands — not part of this design's code.

## Why not build Layer 2 now

`/loop` autonomous discipline + R12: a flaky agent loop shipped half-built is
worse than no agent loop. Layer 1 delivers the immediate token win reliably.
Layer 2 deserves its own milestone with its own scrutiny — its hard part
(getting a 3B model to reliably pick the right dispatcher) is an empirical
question that needs real measurement, not optimism.

## Queued units

- `U-OE-BRIDGE-L2` — read-only knowledge-surface agent loop. **SHIPPED**
  2026-05-18 (`scripts/ollama-prism-bridge.mjs`, slot charlie).
- `U-OE-BRIDGE-L2B` — live MCP-dispatcher tools. **SHIPPED** 2026-05-18
  (slot foxtrot, commits `2518aa3514` + `90103705e8`). The MCP HTTP surface
  was found already live (Streamable HTTP `:3100/mcp`, no transport blocker).
- `U-OE-DOCKER-COMPOSE` — compose topology for L2b deployment. **SHIPPED**
  2026-05-18 (slot echo) — `docker-compose.ollama-bridge.yml` (additive
  override: flips prism-server to `TRANSPORT=http`+`PRISM_BIND_HOST=0.0.0.0`,
  adds the profile-gated one-shot `ollama-bridge` service wired to
  `ollama:11434` + `prism-server:3000/mcp`, repo `:ro`-mounted) +
  `scripts/__tests__/ollama-bridge-compose.test.mjs` (8/8, docker-config
  merge validation + docker-independent source arm).
- `U-OE-BRIDGE-L3` — full agent loop (priority: **deferred** — needs L2b
  telemetry proven + a larger local model than the installed 3B; tool-call
  accuracy scales hard with model size). Genuine multi-milestone effort;
  NOT loop-completable now. This is the only remaining OLLAMA-EXPAND unit.
