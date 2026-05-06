---
policy:
  tier: 1
  triggers:
    - "audit"
    - "audit x"
---
# Audit — Unified Dispatcher

Single entry point for the audit family of skills. Routes to the right specialised audit based on the first argument; preserves all existing specialised skills (`/context-audit`, `/security-audit`, etc.) for direct invocation.

## Args: $ARGUMENTS
- `<scope>`: one of `context | program | harness | security | system | hook | inventory | docker | extractor | drift | wiki | skill`
- `[remainder]`: passed straight through to the routed skill

## Trigger policy
```yaml
policy:
  tier: 1
  triggers:
    - keyword:"audit"
    - keyword:"audit X"
    - on:UserPromptSubmit
```

## Routing table

| `<scope>` | Routes to | Purpose |
|-----------|-----------|---------|
| `context`     | `/context-audit`         | Slim opportunities + budget pressure points |
| `program`     | `/validate-program`      | NC code safety + manufacturability per machine |
| `harness`     | `/harness-security-audit`| Settings.json, hooks, MCP, CLAUDE.md leakage |
| `security`    | `/security-audit`        | Code-level CVE + secret + injection sweep |
| `system`      | `/scrutinize`            | Deep code review and quality audit |
| `hook`        | `/hook-audit`            | Hook timeouts, errors, fired-but-skipped |
| `inventory`   | inventory-refresh.mjs    | PRISM-INVENTORY-LATEST.md re-build |
| `docker`      | `node scripts/docker-audit.mjs --write` | DOCKER-INVENTORY.md (P13-U01) |
| `extractor`   | `node scripts/extractor-audit.mjs --write` | EXTRACTOR-INVENTORY.md (P18-U01) |
| `drift`       | `/cron-status` + drift-alert-surface | Cron drift + alert backlog (P19-U01/U02) |
| `wiki`        | `/wiki-query --audit`    | Wiki entries needing re-verification |
| `skill`       | `/skill-sync-with-mcp`   | Orphan skills + orphan actions |

## Behaviour
- Unknown scope: list all valid scopes and exit
- `audit` with no scope: print this routing table
- Each route is a documented skill that handles its own args + flags
- Cross-cutting "audit everything" mode (planned `audit all`) intentionally NOT exposed here — too noisy without a curated outline

## Why a dispatcher, not a megalith
Specialised skills already exist and are tested individually. This dispatcher gives users a single mnemonic ("/audit X") without forcing every audit to live in one file. New audit categories need only this routing table updated plus the underlying specialised skill.

## Related
- `/review` — code/PR-style review (different axis: subjective quality, not invariant verification)
- `/scrutinize` — deepest single-pass review; `/audit system` routes here
