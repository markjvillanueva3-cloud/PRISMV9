---
name: html-companion-activation-2026-05-18
description: HTML-COMPANION-MS0 ghost-milestone activated — 70 spec twins rendered + CLAUDE.html + MEMORY.html + 10 patch HTMLs emitted; drift gate green (slot kilo, 2026-05-18)
metadata:
  type: reference
---

2026-05-18, slot kilo (claude-e8bb7bd7), `/checkin-kilo /loop` triggered by audit prompt *"determine if we're properly utilizing the md to html conversion"*. Audit found infrastructure shipped (HTML-PRIMARY-MS0 — renderer + emitter + a11y + drift guard wired) but the companion ghost milestone HTML-COMPANION-MS0 (4 planned units) was un-activated and 40 specs lacked HTML companions.

## What activated

**Discovery via canonical path** — `scripts/emit-all-spec-html.ts` is the shipped engine-backed batch emitter; uses `SpecHTMLCompanionEngine.render()` with `<meta name="prism-source-hash" content="<sha256>">` for drift detection. Cron path in docstring (`H:/prism/node_modules/tsx/...`) is BROKEN at HEAD — tsx is not installed at repo root. The working path is via `mcp-server`'s tsx: `H:/prism/mcp-server/node_modules/.bin/tsx scripts/emit-all-spec-html.ts`.

**Bulk emit** — single command rendered **70 stale twins** in two passes (69 backfill iter-1 + 1 mid-flight peer-add). Categories detected by emitter: `missing` (no .html), `no-hash-meta` (.html exists but pre-source-hash era), `mtime` (.html older than .md). After emit: 130 scanned, 0 stale.

**Root docs** — `node scripts/md-to-html.mjs CLAUDE.md --toc` rendered `CLAUDE.html` (234KB, 870 src lines) + same for `MEMORY.html` (35KB). These live OUTSIDE the guard's `state/shared/specs/**` + `state/shared/research/**` scope by design — md-to-html.mjs uses `mdToHtml()` from `html-report-render.mjs` which does NOT embed source-hash. Manual re-render needed after edits.

**Patch siblings** — 10 `state/shared/dashboards/patches/*.md` got HTML companions too (per Thariq playbook team-coordination use case).

## Why this matters

The Thariq/Anthropic "HTML is the new markdown" playbook (cited at `scripts/lib/html-report-render.mjs:6`) is fully implemented in PRISM, but adoption was scoped narrowly (specs/research only) and the backfill never ran past initial implementation. This session activated the latent infra.

## Doctrine boundaries

- **In-scope of guard**: `state/shared/specs/**` + `state/shared/research/**` (drift + a11y enforced on `git commit`, warn-only default, `PRISM_HTML_GUARD_BLOCK=1` to harden).
- **Out-of-scope (manual re-render)**: root `CLAUDE.html` + `MEMORY.html`, `state/shared/dashboards/patches/*.html`. These use the simpler `md-to-html.mjs` path (no source-hash, no a11y gate).
- **Permanently MD-only by doctrine**: handoffs (short-lived per-chat-per-topic), wiki leaves (search corpus), skills/hooks/digests (engineering source-of-truth where MD diffs are load-bearing per kurtis-redux counter-arg).

## CLAUDE.md update via patch-sibling

Slot kilo cannot edit CLAUDE.md directly (recent peer-claim cluster from golf/token-savings/OBSIDIAN-BRAIN-FIX MS0 within 12h window). Doctrine reflection lives at `state/shared/dashboards/patches/CLAUDE-MD-PATCH-html-companion-activation-2026-05-18.md` for the next golf integrator to fold in.

## Verification

- `H:/prism/mcp-server/node_modules/.bin/tsx H:/prism/scripts/emit-all-spec-html.ts --check-drift` → exit 0, 0/130 stale
- `H:/prism/CLAUDE.html` + `H:/prism/MEMORY.html` exist
- `state/shared/dashboards/patches/*.html` count = 11 (10 pre-existing + this patch's companion)

## Related

- [[milestone-ghost-ms-html-companion-ms0]]
- [[html-companion-guard]]
- [[spec-html-render]] — dispatcher action `prism_dev:spec_html_render`
- [[feedback_playwright_for_online_sources]] — sister rule (the X article that prompted this audit needed playwright; WebFetch fallback used per fail-loud)
- Thariq @ Anthropic "HTML is the new Markdown" — `https://x.com/trq212/status/2052811606032269638`
