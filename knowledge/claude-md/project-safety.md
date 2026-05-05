---
schema_version: 1.0.0
source: project
section: SAFETY
slug: safety
start_line: 229
end_line: 235
indexed_at: 2026-05-05T13:49:55.479Z
content_hash: 312f262df59f566d0b4b67e514fab75b83f30aaccf02a94dc3baebdc1af32147
mirror_engine: ClaudeMdChunkerEngine
---
## SAFETY
- **NEVER inline Kienzle/Taylor/material constants** — import from `mcp-server/src/physics/constants.ts`.
- Canonical kc1.1 per ISO group: P=1800, M=2100, K=1100, N=700, S=2800, H=3200.
- NEVER create stub engines — enforcement hook blocks placeholder returns.
- Always run affected tests after engine modifications (hook suggests which).
- Always check `ENGINE_DIGEST.md` before creating new engines.
