# PRISM Skill-Marketplace Scan — 2026-05-12

> @eng_khairallah1 Phase-1: *"There are over 80,000 community Skills… most people have never installed a single one."* This scans the major collections, scores each listing against PRISM's domain vocabulary, and dedup-checks it against the existing 501-skill library. **It only recommends — installing a community skill is a human/forge action that goes through `harness-security-audit`.**

*Generated 2026-05-12T14:54:56.981Z · schema 1.0.0*

## Sources

- Scanned: anthropics-skills, wshobson-agents, obra-superpowers
- Skipped:
  - `skillsmp` — fetch failed: JS-rendered SPA — a raw fetch returns only the app shell; needs the Playwright MCP. Skipped.

## Candidates by recommendation

| Recommendation | Count |
|---|---:|
| ⭐ install (relevant + novel + strong) | 0 |
| 📖 study (relevant + novel/partial) | 1 |
| ✅ already-covered (a PRISM skill does this) | 0 |
| ⏭️ skip (off-domain) | 203 |
| total listings scanned | 204 (of which 1 cleared the relevance floor) |

## Advisories

- skillsmp.com is a JS-rendered SPA — a raw fetch returns only the app shell. Run this scan with the Playwright MCP available to include skillsmp.com, or accept the GitHub-collections-only view.

## Shortlist — 1 install/study candidate(s)

| Skill | Source | Rec | Relevance | Domain hits | Dedup | Covered by | Description |
|---|---|---|---:|---|---|---|---|
| `CI/CD (4 skills)` | wshobson-agents | study | 0.67 | ci/cd, github actions | partial-overlap | `qodo-skills:qodo-pr-resolver` | pipeline design, GitHub Actions, GitLab CI, secrets management |

## How to act on this

1. For an `install` candidate you want: clone/copy the SKILL.md from its source URL into `~/.claude/commands/` (or a plugin dir), then run `/harness-security-audit` and `/skill-lint` on it — never run a community skill's body unreviewed.
2. For a `study` candidate: read it for ideas; if it overlaps a PRISM skill (`partial-overlap`), fold the good parts into ours rather than installing a near-duplicate.
3. `already-covered` / `skip`: no action.

*Re-run: `node scripts/skill-marketplace-scan.mjs` · monthly cron `0 10 1 * *` (cron id `skill-marketplace-scan-monthly`) · dispatcher `prism_knowledge:skill_marketplace_scan`. skillsmp.com requires the Playwright MCP; the GitHub collections fetch fine without it.*
