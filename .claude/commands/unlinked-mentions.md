---
name: unlinked-mentions
description: Scan memory + wiki vault for unlinked mentions of known note-slug names. Emits state/shared/UNLINKED-MENTIONS.{json,md}. Implements cyrilXBT's "Unlinked Mentions" pattern (PSN-ENHANCE-MS0/U-PSN-UNLINKED-MENTIONS). Advisory only — never auto-wraps `[[…]]`.
---

# /unlinked-mentions — PSN link-density audit

Runs `scripts/find-unlinked-mentions.mjs` over the memory + wiki vault. Finds every bare reference to a known note-slug name that isn't already `[[wrapped]]`, then surfaces the host-file → mentioned-slug pairs (with mention counts + context windows) so an operator can wrap the ones that warrant a real link.

Closes the cyrilXBT "Unlinked Mentions" pattern (2026-05-22 X article — "How to Link Notes Together in Obsidian and Why It Changes Everything"). Densifies the PSN graph by converting accidental references into formal links.

## Usage

```bash
node H:/prism/scripts/find-unlinked-mentions.mjs
```

Knobs:
- `PRISM_UNLINKED_MENTIONS_REPO=H:/prism` — override repo root
- `PRISM_UNLINKED_MENTIONS_LIMIT=N` — top-N hosts in the MD output (default 200)

Outputs:
- `state/shared/UNLINKED-MENTIONS.json` — full machine-readable candidate list
- `state/shared/UNLINKED-MENTIONS.md` — human-readable by-host ranking

## When to fire

- Weekly hygiene sweep (golf-slot cron candidate).
- After a doc-reflection batch that lands many new memory/wiki leaves.
- Before publishing a wiki page — verify intentional connections are formal links.

## Advisory only

Bare-name matches CAN be coincidental (a slug "PSN" in prose narration vs a deliberate reference). Every candidate must be operator-reviewed. The scanner already filters:
- Self-references (host slug → itself)
- Already-linked `[[…]]` spans
- Inline `code` and fenced code blocks
- Markdown URL link text `[text](url)`
- Word-boundary matches only (no substring partial-name hits)
- 4-char minimum slug length (cuts noise from short common words)

## Architecture

Pure scanner library at `scripts/lib/unlinked-mentions-scan.mjs` — no I/O, no side effects, fully testable (21 node:test cases). CLI runner does the filesystem walk + frontmatter parse (recognizes `name:` + `aliases:`). Longest-name-wins alternation regex so multi-token slugs beat single-token prefixes.

PSN leg: System-Viz graph ← Wiki ← Memory vault → backlink density ↑

Wiki: `knowledge/wiki/architecture/unlinked-mentions-scan.md` (pending).
Memory pointer: `reference_unlinked_mentions_scan_2026_05_23` (pending).
