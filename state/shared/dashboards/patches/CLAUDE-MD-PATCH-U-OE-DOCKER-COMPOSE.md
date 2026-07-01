# CLAUDE.md PATCH — U-OE-DOCKER-COMPOSE (slot echo, 2026-05-18)

> Peer-locked surface (CLAUDE.md = golf-only). This patch sibling is for the
> golf F1 drain to apply. PATCH-SIBLING convention per JULIETT-12CHAT-ALLOCATION-MS0.

**Target:** `CLAUDE.md` § `## OLLAMA-EXPAND-MS0 (2026-05-18, slot charlie)` — the closing clause of the single paragraph (line ~592).

**Reason:** L2b + U-OE-DOCKER-COMPOSE shipped 2026-05-18; the existing clause still says L2b "blocked on resolving the port-3100 transport surface) + L3 ... queued" — stale and factually wrong (the transport was never actually blocked; foxtrot proved it live).

**FIND (exact):**

```
 Skill `/ollama-bridge`. L2b (live `prism_calc`/`prism_session` MCP-dispatcher tools — blocked on resolving the port-3100 transport surface) + L3 (full agent loop) queued. Design: [`state/shared/specs/OLLAMA-PRISM-MCP-BRIDGE-DESIGN.md`]. Wiki: [`knowledge/wiki/architecture/ollama-expand-ms0.md`] · [`knowledge/wiki/architecture/ollama-prism-bridge.md`]. Memory: [[reference_ollama_expand_ms0]] · [[reference_ollama_prism_bridge_l2]].
```

**REPLACE WITH:**

```
 Skill `/ollama-bridge`. **L2b SHIPPED 2026-05-18 (foxtrot, `2518aa3514`+`90103705e8`)** — live `mcp_call` tool, 14 curated read-only `prism_calc`/`prism_session` actions over Streamable HTTP `:3100/mcp` (the "port-3100 transport blocker" was empirically false — the surface was already live). **U-OE-DOCKER-COMPOSE SHIPPED 2026-05-18 (echo)** — `docker-compose.ollama-bridge.yml` (additive override: prism-server→`TRANSPORT=http`+`PRISM_BIND_HOST=0.0.0.0`, profile-gated one-shot `ollama-bridge` service wired to `ollama:11434`+`prism-server:3000/mcp`, repo `:ro`) + 8/8 `ollama-bridge-compose.test.mjs` — answers the Docker half of the operator question. **L3 (full agent loop) is the only remaining OLLAMA-EXPAND unit and is DEFERRED** (needs a local model > the installed 3B). Design: [`state/shared/specs/OLLAMA-PRISM-MCP-BRIDGE-DESIGN.md`]. Wiki: [`knowledge/wiki/architecture/ollama-expand-ms0.md`] · [`knowledge/wiki/architecture/ollama-prism-bridge.md`] · [`knowledge/wiki/architecture/u-oe-docker-compose-2026-05-18.md`]. Memory: [[reference_ollama_expand_ms0]] · [[reference_ollama_prism_bridge_l2]] · [[reference_u_oe_docker_compose_2026_05_18]].
```

Verify after apply: `grep -c "U-OE-DOCKER-COMPOSE SHIPPED" CLAUDE.md` → 1; `grep -c "blocked on resolving the port-3100" CLAUDE.md` → 0.
