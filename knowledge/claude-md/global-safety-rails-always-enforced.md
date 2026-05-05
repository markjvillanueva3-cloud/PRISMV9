---
schema_version: 1.0.0
source: global
section: SAFETY RAILS (ALWAYS ENFORCED)
slug: safety-rails-always-enforced
start_line: 112
end_line: 120
indexed_at: 2026-05-05T13:49:55.900Z
content_hash: 53f75b6559f122b1329bf8db76c69d6baff5c062c0580fafd81faabf663463d7
mirror_engine: ClaudeMdChunkerEngine
---
## SAFETY RAILS (ALWAYS ENFORCED)

- **NEVER inline physics constants** — import from `src/physics/constants.ts` (canonical values live there only; do not duplicate in docs)
- **NEVER create stub engines** — hook blocks placeholder returns
- **Run affected tests** after engine modifications
- **Check ENGINE_DIGEST.md** before creating new engines

---
