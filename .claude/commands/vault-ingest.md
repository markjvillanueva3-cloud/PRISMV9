---
policy:
  tier: 2
  triggers:
    - "vault-ingest"
    - "save to vault"
    - "add to wiki"
    - "document this"
    - "capture learning"
---
# Vault Ingest — Push Session Learnings to Obsidian

Take new tribal tips, formulas, decisions, or working-notes captured during this session and append them to the Obsidian vault at `H:/prism/knowledge/wiki/` with proper frontmatter, links, and a wiki-index update so future sessions can find them.

## Args: $ARGUMENTS
- `<topic>` (optional): scope the ingest to entries about this topic (default: all session capture)
- `--category=<cat>`: target wiki category (`concepts | decisions | playbooks | code-tribal | architecture`)
- `--dry-run`: render the markdown that would be written; do not touch disk
- `--source=<id>`: provenance tag (e.g., `--source=session-claude-iooms0-87e9bcc0`)

## Trigger policy
```yaml
policy:
  tier: 2
  triggers:
    - keyword:"save to vault"
    - keyword:"add to wiki"
    - keyword:"document this"
    - keyword:"capture learning"
    - on:Stop  # opt-in via session metadata flag
```

## What gets ingested
1. **Tribal tips**: rules-of-thumb learned during work (e.g., "always check Kienzle mc against material registry before tightening DOC")
2. **Formulas**: any new equation derivations the user confirmed correct
3. **Decisions**: ADR-style architectural choices with the rationale and trade-offs
4. **Working notes**: free-form observations about machines, customers, parts the user wants persisted

## Output format
Each ingest writes one file per entry under the chosen category:
```markdown
---
title: <Title from session>
category: <cat>
source: <provenance>
last_verified: <iso-date>
confidence: <0..1>
sources: <int>
---

# <Title>

<Body — extracted from session, cleaned of conversational filler.>

## Provenance
- Session: <session-id>
- Captured: <ts>
- Author: hybrid (human + Claude)
```

After all entries write, the vault `index.md` gets re-built (via `node mcp-server/scripts/embed-wiki-index.mjs`) so semantic search picks up the new entries.

## MCP wiring
- Ingest action: `prism_memory:remember` (with `kind:"wiki"` payload) — already wired
- Index refresh: `mcp-server/scripts/embed-wiki-index.mjs --build`

## Safety
- `--dry-run` is the default for first invocation if more than 5 entries would be written — prevents runaway capture
- Each entry's `source` field cites the session, never overwriting LLM-curated `source:bootstrap` rows (per WIKI_SCHEMA.md §4.1)

## Related
- `/wiki-query` — read-side counterpart
- `/learned-patterns-apply` — extracts recurring patterns from across many sessions
