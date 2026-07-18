---
name: reference_sierra_obsidian_vault_navigator_2026_06_17
description: "Sierra shipped scripts/obsidian-vault-navigator.mjs (commit bf9cd70b9f, 2026-06-17): a filesystem-native CLI+lib giving Claude Code / PRISM the equivalent of every Obsidian NAVIGATION core-plugin over the vault (H:/prism/knowledge) WITHOUT the Obsidian GUI/REST API running. Verbs: tree/ls(file-explorer), read(note+properties+outlinks+backlinks+tags), search(full-text + tag:/path:/file: operators), links(outgoing), backlinks(note->note), orphans, tags(tag-pane), neighborhood(graph N-hop), canvas(JSON Canvas), status. Metadata-only model (no body retention) -> memory-bounded over 69,399 notes. Wired as the /obsidian-nav skill. Use it BEFORE Grep/Glob over knowledge/. Live: 155,089 links / 9,894 tags / 16,021 orphans / 0 unreadable. The live GUI CONTROL surface (run any command/button, write/create) is the separate U2 = ObsidianRestBridgeEngine extension."
type: reference
galaxy: system-viz
source: prism-memory
synced: 2026-06-27T20:30:47.198Z
aliases: reference_sierra_obsidian_vault_navigator_2026_06_17
---


# Sierra: filesystem-native Obsidian Vault Navigator (2026-06-17, slot:sierra)

Operator: "harden obsidian vault + its usability with Claude Code CLI ... build a bridge
for you to fully navigate the app (every button and function)." Recon (verify-then-build)
found substantial existing Obsidian infra (ObsidianRestBridgeEngine read-only client,
ObsidianPluginBridgeEngine, hermes-obsidian-app-map, vault-backlink-read = a DIFFERENT
vault-doc->graph-node edge) but NO unified note->note navigation surface. Two-sided gap:
filesystem navigation (always-on) + live GUI control (needs the app up).

## U1 shipped (commit bf9cd70b9f): `scripts/obsidian-vault-navigator.mjs`
Lib + CLI. One walk builds a metadata-only model (outlinks resolved to relpaths, inverted
to backlinks, tags from frontmatter+inline; NO bodies retained -> bounded over 69K notes).
Verbs map 1:1 to Obsidian core-plugins: tree/ls=file-explorer, read=open+properties,
search(tag:/path:/file: operators)=global-search, links=outgoing-link, backlinks=backlink,
orphans, tags=tag-pane, neighborhood=graph view, canvas=JSON Canvas, status. `<note>`
resolves by relpath OR bare basename, any case, with/without .md (miss->suggestions,
collision->ambiguous). Wired as the **/obsidian-nav** skill (.claude/commands, gitignored-
by-design, live on disk). USE IT BEFORE Grep/Glob over knowledge/.

## Validated LIVE (R15): 69,399 notes, 155,089 resolved links, 9,894 tags, 16,021 orphans, 0 unreadable, oversize 2. 30 tests green.

## THE lesson: live re-validation caught a self-inflicted regression (R12/R15)
3-agent scrutiny FAILed on 2 real P1s -> fixed: (1) parseFrontmatter was indent-BLIND, so a
nested `metadata:` clobbered a top-level key + the flatten branch was dead -> rewrote indent-
aware (top-level keys win). (2) parseSearchQuery silently DROPPED any `word:value` token whose
prefix wasn't tag/path/file (e.g. "12:30") -> keep the whole token as a literal term.
A scrutiny P2 (extractWikilinks O(n^2) on `[`-dense unclosed .md) I first "fixed" by TRUNCATING
files >512KB -- but the live `status` re-run showed links 155k->142k + 602 FALSE orphans: the
truncation excised REAL links from 2 legitimate large index notes. Reverted truncation;
the correct fix was bounding the regex inner class to `[^\]\r\n]{1,256}` (kills the backtrack,
keeps every real link). **Validate every change on live data with numbers -- a plausible
"hardening" silently degraded the graph; only the live count exposed it.**

## State + next
U1 done. U2 = extend ObsidianRestBridgeEngine into the live CONTROL surface (listCommands/
runCommand=every button, vault CRUD, open, periodic) behind a default-DENY write/command gate
(Telegram path stays read-only); unit-test now, LIVE-VALIDATE when the operator opens Obsidian
(GUI/:27123 is DOWN now). Lane: canonical cad-fusion-live-ms0, [MAIN-FORCE] + git commit by-pathspec.
Sibling: [[reference_sierra_vault_promote_gate_hubsrc_deinflate_2026_06_17]].
