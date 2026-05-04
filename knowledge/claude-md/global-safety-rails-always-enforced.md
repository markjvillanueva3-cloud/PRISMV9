---
source: global
section: SAFETY RAILS (ALWAYS ENFORCED)
slug: safety-rails-always-enforced
indexed_at: 2026-05-02T20:38:22.594Z
---

## SAFETY RAILS (ALWAYS ENFORCED)

- **NEVER inline physics constants** — import from `src/physics/constants.ts` (canonical values live there only; do not duplicate in docs)
- **NEVER create stub engines** — hook blocks placeholder returns
- **Run affected tests** after engine modifications
- **Check ENGINE_DIGEST.md** before creating new engines

---
