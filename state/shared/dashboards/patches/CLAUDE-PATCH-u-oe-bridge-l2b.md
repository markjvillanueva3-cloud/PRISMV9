# CLAUDE.md patch sibling — U-OE-BRIDGE-L2B (foxtrot, 2026-05-18)

CLAUDE.md is peer-locked. This patch sibling is the durable record of the
update; a future chat owning the lock applies it.

## Target section

`## OLLAMA-EXPAND-MS0` — append L2b SHIPPED status to the existing description
of the layered ladder.

## Diff

```diff
 ## OLLAMA-EXPAND-MS0 (2026-05-18, slot charlie) — `ask-ollama` local query service
 ...
-**L2b (live `prism_calc`/`prism_session` MCP-dispatcher tools — blocked on resolving the port-3100 transport surface)** + L3 (full agent loop) queued.
+**L2b (live `prism_calc`/`prism_session` MCP-dispatcher tools) SHIPPED 2026-05-18 (slot foxtrot, `2518aa3514`, U-OE-BRIDGE-L2B)** — JSON-RPC over MCP Streamable HTTP at http://127.0.0.1:3100/mcp; 14 read-only actions (prism_calc 10 + prism_session 4); frozen MCP_ALLOWLIST + MCP_DENYLIST regression guard; per-action live probe 14/14 OK; 199 tests (198/1/0); per-file 2-reviewer gate Arm A PASS 0 P0/P1, Arm B PASS with 2 P1 both addressed in-session (allowlist over-claim → live per-action probe; graphCache closure-local → root-keyed Map). L3 (full agent loop) queued.
```

## Also add a Recent regressions entry

```
- 2026-05-18 | **U-OE-BRIDGE-L2B live MCP-dispatcher tools** | commit `2518aa3514` | verify: `node --test scripts/__tests__/ollama-prism-bridge.test.mjs` → 199 tests, 198/1/0
```

## Apply when

CLAUDE.md becomes editable (current owner releases peer-claim). Wiki entry
[[u-oe-bridge-l2b]] holds the same content for the unlocked surface.
