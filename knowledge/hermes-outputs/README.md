# hermes-outputs/ — the ZULU master's write-confined vault lane

The Hermes app (the slot-less ZULU master orchestrator, see
[[reference_hermes_master_orchestrator_arch_2026_06_02]]) writes its synthesized
artifacts — fleet directives, cross-slot specs, distilled lessons, octopus
consensus summaries, teaching bundles — **only here**.

## Why a confined lane

Hermes reads the whole PRISM brain (via the `prism_*` MCP dispatchers it connects
to over HTTP — semantic_search, master_index_query, wiki/tribal retrieval). But its
WRITES must never land in `knowledge/memories/` (the auto-memory Stop-feed is
mirror-not-merge — a name collision would clobber a real memory) or in any other
chat's lane. Confining Hermes' writes to `knowledge/hermes-outputs/` makes
collisions structurally impossible.

This is also why the P0 Hermes↔PRISM integration wires **only** the HTTP MCP server
(read + lane-confined coordination-write via `prism_context:slot_brief_write`) and
**defers** a broad filesystem-MCP mount of the vault — reads go through the richer
dispatchers; targeted writes go through the brief channel; free-form outputs land
here.

## Convention

- One subdirectory or dated file per artifact kind: `directives/`, `specs/`,
  `lessons/`, `consensus/`, `briefs-archive/`.
- Markdown, dated, attributed (`from: hermes` / `from: zulu`).
- Nothing here is consumed by the auto-memory feed or the wiki indexer unless a
  human/Claude promotes it (fleeting → memory → wiki, the standard promotion path).

## Related

- Targeted work orders to a single slot go through the **brief channel**, not here:
  `prism_context:slot_brief_write` → `state/shared/slot-briefs/<slot>.md` →
  `slot-brief-inject.mjs`. See [[reference_slot_brief_channel_2026_06_02]].
- Broadcast to all slots: `prism_context:chat_post` (the chat-bus).
- Architecture: `state/shared/specs/HERMES-MASTER-ORCHESTRATOR-ARCHITECTURE-2026-06-02.md`.
