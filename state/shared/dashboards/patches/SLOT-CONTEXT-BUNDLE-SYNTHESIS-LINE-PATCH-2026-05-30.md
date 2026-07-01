> **✅ APPLIED 2026-06-02 (slot:alpha) commit `c47c49a050`.** AMP-CONSUME synthesis-line wired into slot-context-bundle-inject.mjs fmtSummary (the zebra→zulu migration that blocked it has landed; anchor intact). Functional: has-domain-synthesis:true. CLOSED.

# PATCH-SIBLING — slot-context-bundle synthesis-line (deferred to peer claim)

slot: **alpha** (claude-da9aacf5) · 2026-05-30 · unit: AMP-CONSUME (Obsidian-brain compounding consumer)

## Why this is a patch-sibling and NOT a direct commit

The change below is **built + verified-live** but could not be committed from alpha because
`.claude/hooks/slot-context-bundle-inject.mjs` is **peer-CLAIMED and mid-atomic-migration**:

- Chat-bus: `[05:18:06] DESKTOP--67860: claiming H:/PRISM/.claude/hooks/slot-context-bundle-inject.mjs`
- A peer is running `scripts/migrate-zebra-to-zulu.mjs` — a ~90-file atomic rename
  (`zebra`→`zulu`: `hermes-zebra`→`hermes-zulu` engines, all `zulu-*` libs incl.
  `scripts/lib/zebra-context-bundle.mjs`→`zulu-context-bundle.mjs`, specs, wiki, memories).
- This hook carries 7 uncommitted `ZEBRA-OMNISCIENT`→`ZULU-OMNISCIENT` line-replacements
  from that campaign.

Per the multi-chat law ("never commit peer-claimed files; don't entangle with a peer's
in-flight atomic migration"), alpha **backed its edit fully out** (restored the file to the
peer's exact migration state, zero alpha footprint) and routes the change here instead.

**Apply AFTER the zebra→zulu migration lands.** The anchor below contains no `zebra/zulu`
token, so the migration leaves it unchanged → this patch still applies cleanly post-migration.

## What it does (net-benefit, verified)

The slot-context-bundle hook already auto-surfaces each slot's galaxy `CLAUDE.md` / `MEMORY.md`
/ `PATHS.md` / `TOOLBELT.md` / buildout-brief on every prompt — but NOT its
`knowledge/memories/patterns/<galaxy>_synthesis.md` (the B1-compounded domain synthesis).
This adds one existence-gated line so every mapped slot is **deterministically aware** its
distilled domain synthesis exists, even when the A6 recall injector ranks it below top-K.
Path-pointer only — recall still surfaces the CONTENT on domain-relevant prompts, so no
per-prompt content duplication across the fleet.

**Verified live (before back-out):** `echo '{"session_id":"da9aacf5..."}' | node <hook>` →
exit 0, valid JSON, fail-soft (empty stderr), emitted line for alpha:
`- domain synthesis: \`knowledge/memories/patterns/token-optimization_synthesis.md\` -- ...`.
Purely additive (+936 bytes); all 34 galaxies have a synthesis file so it fires for every
slot in `SLOT_GALAXY_MAP`. `node --check` clean.

## The patch

Anchor (exists in `fmtSummary`, inside the `if (galaxy) { ... }` block — `galaxy`, `root`,
`fs`, `lines` all in scope). **Insert the block immediately AFTER this line:**

```js
      } catch { /* no brief — slot in SLOT_GALAXY_MAP but no dispatch yet */ }
```

Block to insert:

```js
      // AMP-CONSUME (2026-05-30, slot:alpha): surface the slot's OWN compounded
      // domain synthesis (B1 -> patterns/<galaxy>_synthesis.md) so every slot is
      // DETERMINISTICALLY aware its distilled domain knowledge exists, even when
      // the recall injector ranks it below top-K. Path-pointer only (recall
      // surfaces the CONTENT on domain-relevant prompts -- no per-prompt content
      // duplication here). Existence-gated; advisory (doc is mustHumanVerify);
      // thin galaxies (no synthesis) silently skip.
      try {
        if (fs.statSync(`${root}/knowledge/memories/patterns/${galaxy}_synthesis.md`).size > 200) {
          lines.push(`- domain synthesis: \`knowledge/memories/patterns/${galaxy}_synthesis.md\` -- your galaxy's compounded patterns/decisions/open-threads (advisory; refresh: \`galaxy-synthesis-refresh.mjs\`)`);
        }
      } catch { /* no synthesis yet (thin galaxy) -- skip */ }
```

## Verify after apply

```bash
node --check H:/prism/.claude/hooks/slot-context-bundle-inject.mjs
printf '{"session_id":"<a-live-alpha-sid>","prompt":"x"}' | node H:/prism/.claude/hooks/slot-context-bundle-inject.mjs
# expect valid JSON whose additionalContext includes a "- domain synthesis:" line for a mapped slot
```

Provenance: Obsidian-brain compounding stack, consumer arm. Sister to the B1/L2/AMP2
amplifiers. Memory: [[feedback_net_benefit_auto_build]] (the standing directive that drove
this) + [[reference_alpha_amp_consume_synthesis_line_2026_05_30]].
