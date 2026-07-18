# PRISM Post Add-in — Platform-Agnostic Contract (Tier-2, slot:echo)

**Operator decision 2026-05-29:** the full add-in tier targets **all 3 CAM platforms** (Fusion 360, Mastercam, hyperMILL) with **live-bridge + cache fallback**. The three platforms use different languages/APIs (Fusion = Python `adsk`, Mastercam = C#/.NET NETHook, hyperMILL = OPEN MIND .NET), so the *shared* asset is THIS contract. Each platform's add-in is a thin adapter that implements the same contract; only the CAM-API glue differs. **Build the contract + reference client FIRST (this is what all 3 adapters depend on — logical order per R13), then the per-platform adapters.**

## 1. What the add-in does (all platforms)
At post time the add-in enriches the operator's job with live PRISM data the standalone Tier-1 post can't reach, then hands the enriched data to the post:
1. Read the active setup's operations from the host CAM (tool numbers, geometry, stock, material if set).
2. For each tool/op, fetch from PRISM: **tool-DB geometry** (41,495-tool catalog), **material cutting data**, **speed/feed** (`cam_speedfeed_compute`), and optionally a **post-gen safety pass** (`PostProcessorPipelineEngine` P1 physics + P5 safety).
3. Write a **cache sidecar** (§4) next to the CAM doc.
4. The **paired post** (Tier-1 base + an add-in-fed branch) reads the sidecar instead of manual property entry, and runs the same shared `prismPaths` feed core (so Tier-1 and Tier-2 produce consistent feeds — Tier-2 just has better *inputs*).

## 2. Transport — live PRISM bridge
- **Endpoint:** `http://127.0.0.1:3100/mcp` (the PRISM MCP server in HTTP mode). Readiness probe: `GET http://127.0.0.1:3100/ready` (200 = up). Configurable via env `MCP_HTTP_URL`.
- **Protocol:** MCP JSON-RPC 2.0. A data request is a `tools/call`:
  ```json
  { "jsonrpc": "2.0", "id": <n>, "method": "tools/call",
    "params": { "name": "<dispatcher>", "arguments": { "action": "<action>", ... } } }
  ```
- **Calls used** (dispatcher → action):
  | Need | dispatcher | action | key args |
  |------|-----------|--------|----------|
  | speed/feed | `prism_cam` | `cam_speedfeed_compute` | toolDia, flutes, material(ISO/HRC), machine(HP,torque,rpm), ae, ap, op |
  | tool geometry | `prism_cam` | `tool_catalog_lookup` (or `cam_tool_library`) | toolNumber / catalogId |
  | material data | `prism_calc` | material cutting-data action | material name/ISO |
  | post-gen safety | `prism_cam` | `master_post_*` / pipeline emit | section payload |
  > Exact action names are resolved against `DISPATCHER_DIGEST.md` at client-build time; the contract fixes the *shape* (tools/call + action), not a frozen action list.
- **Response:** MCP result envelope; the JSON payload is in `result.content[0].text` (parse as JSON) or `result.structuredContent`.

## 3. Live + cache-fallback algorithm (every request)
```
request(action, payload):
  key = sha256(action + canonical_json(payload))
  if bridge_ready (GET /ready within Tready):           # live first
      try:
          resp = POST /mcp tools/call (timeout Tcall)
          data = parse(resp)
          cache_write(key, data, ts=now)                # write-through
          return data, source="live"
      except (timeout, conn-refused, non-2xx, parse-fail):
          pass                                          # fall through
  cached = cache_read(key)                              # fallback
  if cached and (now - cached.ts) <= MAX_STALE:
      return cached.data, source="cache"
  if cached:                                            # stale but present
      return cached.data, source="cache-stale" (warn)
  raise PrismUnavailable(action)                        # no live, no cache → caller decides
```
- Defaults: `Tready=1.5s`, `Tcall=8s`, `MAX_STALE=24h` (configurable). **Fail-soft:** the caller (add-in) on `PrismUnavailable` falls back to the operator's manual Tier-1 entry for that field — never blocks the post, never emits a guessed number silently (R12: surface the degrade as a post comment).

## 4. Cache sidecar schema (`<camdoc>.prism-post-cache.json`)
```json
{
  "schemaVersion": "1.0.0",
  "generatedAt": "<ISO8601>",
  "bridge": "http://127.0.0.1:3100/mcp",
  "entries": {
    "<key>": { "action": "<action>", "payloadHash": "<sha256>", "ts": "<ISO8601>",
               "source": "live|cache", "data": { ... } }
  },
  "tools": { "<toolNumber>": { "dia": 0.5, "flutes": 4, "fluteLength": 1.0, "bodyLength": 2.5,
                               "material": "carbide", "coating": "AlTiN", "catalogId": "..." } },
  "operations": { "<opId>": { "isoGroup": "P", "hrc": 0, "ae": 0.1, "ap": 0.3,
                              "feedCutting": 600, "rpm": 6000, "strategy": "adaptive2d",
                              "prismMultiplier": 0.92, "notes": ["..."] } }
}
```
- `tools`/`operations` are the **post-facing view** the paired post reads (one lookup per section). `entries` is the raw request cache (for live+fallback). Atomic write (temp + rename); `schemaVersion` gated.

## 5. Paired post (add-in-fed) — how the data reaches the post
- The Tier-1 base post (`PRISM-Base-Hurco-3Axis.cps`) grows an **add-in-fed branch**: if `<camdoc>.prism-post-cache.json` exists next to the output, `onSection` reads `tools[toolNumber]` + `operations[opId]` from it and builds the `prismPaths` ctx from *live PRISM data* instead of the manual properties. If absent → identical to standalone Tier-1 (manual). **Same feed core, better inputs.** One post serves both tiers; the add-in is what populates the sidecar.
- For Mastercam/hyperMILL the post is their native format (.pst / OPEN MIND post), but the **sidecar schema + the prismPaths feed math are identical** (the feed core is ported per-post-language but equivalence-tested, same as the Fusion `.cps` ↔ `.mjs` proof).

## 6. Build order (logical; per R13)
- **U-BASE-3a — this contract** ✅ (the shared dependency all adapters implement).
- **U-BASE-3b — reference PRISM client** (Python — Fusion's language; live+cache per §3, cache schema §4) + tests against a mocked bridge + cache file. Serves Fusion directly; the reference for the C# clients.
- **U-BASE-3c — Fusion add-in** (`adsk` Python: run/stop lifecycle, command button, read setup ops, call the client, write the sidecar) + the add-in-fed branch in the `.cps`.
- **U-BASE-3d — Mastercam adapter** (C#/.NET NETHook implementing the same contract + a Mastercam post variant).
- **U-BASE-3e — hyperMILL adapter** (OPEN MIND .NET + hyperMILL post variant).

Owner: slot:echo. Production posts untouched. Re-derive dialect codes from public manuals only (U-LEGAL-13).
