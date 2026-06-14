---
name: duplication-guard-discipline
category: code-tribal
domain: backend-dev
tags: [duplication, dedup, r8, duplicationGuardEngine, prism-development, ai-development]
last_updated: 2026-05-18
---

# Duplication-Guard Discipline — R8 in practice

Karpathy R8 ("Read before you write") in PRISM is enforced by `duplicationGuardEngine.mustCheckBeforeCreating()` — a THROW-on-duplicate API. Skipping it is the #1 cause of "I built X but X already exists" waste in the codebase. The discipline is mandatory.

## The single mandatory call

Before creating ANY new engine, algorithm, formula, hook, or skill:

```ts
import { duplicationGuardEngine } from "mcp-server/src/engines/DuplicationGuardEngine.js";

const check = duplicationGuardEngine.checkBeforeCreating({
  assetType: "engine",         // | "algorithm" | "formula" | "hook" | "skill" | "action"
  proposedName: "MyEngine",
  keywords: ["chatter", "stability", "thin-wall"],
  description: "Detects chatter in thin-wall pocket milling",
});

if (!check.shouldProceed) {
  // USE the existing asset:
  const existing = check.matches[0];  // {name, path, similarity}
  // Decide: extend it, or abandon the new asset
}
```

The hard-throw variants:
- `mustCheckBeforeCreating(...)` — THROWS on duplicate; cannot bypass
- `mustNotReExtract({source})` — THROWS if attempting to re-extract an already-extracted source

These bypass-proof variants are the load-bearing rails.

## Already-extracted sources (do NOT re-extract)

PRISM has extracted from these sources; re-extraction is rejected:

- Mastercam (45 docs)
- hyperMILL (25)
- Okuma (63)
- Fanuc (35)
- Haas (28)
- Titans (42)

Full log: `mcp-server/data/state/extraction-log.json`. Before extracting from a new doc, grep for its checksum in the log.

## Cross-session registry

`mcp-server/data/state/cross-session-asset-registry.json` carries every asset created across all chats. The guard reads it on every check. New assets register on commit (via post-commit hook).

If you're working on the same milestone as a peer chat, their newly-created assets MAY not be in the registry yet (registration lags by ~30s). For active multi-chat work in the same area, also `prism_context:chat_read --since 1h` to see in-flight creations.

## Similarity scoring

The guard uses three signals:
1. **Name match** — exact + fuzzy (Levenshtein distance, case-insensitive)
2. **Keyword overlap** — Jaccard on the keyword set
3. **Description cosine** — Ollama-embed of description vs all existing descriptions

If ANY signal crosses threshold, `shouldProceed: false` + the top-3 matches in `check.matches[]`.

Default thresholds:
- Name fuzzy: 0.85 (anything beyond a 1-char typo)
- Keyword Jaccard: 0.50
- Description cosine: 0.80

Override via `--strict` for stricter (returns more potential dupes) or `--lenient` for fewer false-positives.

## ENGINE_DIGEST.md as the by-hand cross-check

The 3274-engine 1-line-each digest at `mcp-server/data/docs/ENGINE_DIGEST.md`. Before any new engine:

```bash
grep -i "<noun>" mcp-server/data/docs/ENGINE_DIGEST.md
```

A by-hand grep catches names the guard might miss (e.g. abbreviations, alternative phrasings). Use IN ADDITION to the guard, not instead.

## When the guard says "duplicate" but the work is genuinely new

Three cases:

1. **Same noun, different operation** — `ForceCalculator` vs `ForceValidator`. Both exist; the new one is genuinely separate. Pass `--allow-similar` with explicit justification (logged).
2. **Same operation, different domain** — `MillForce` vs `LatheForce`. Domain-specific wrappers around a shared base. OK, but consider refactoring to a shared abstraction.
3. **Same operation, refinement** — `ForceCalculator` (legacy) vs `KienzleForceEngine` (canonical). RETIRE the legacy; don't ship the new one alongside. Coordinate via chat-bus before any retire-and-replace.

When in doubt: extend the existing engine. Three similar lines is better than two engines with overlapping scope.

## The "duplication is OK if 3x rule" exception

The 3x rule (from doc-reflection-rule context): duplicate freely until a pattern emerges across 3 use cases, THEN abstract. For pre-3x work, two similar engines is fine. The guard's threshold of "any of 3 signals" is intentionally conservative so it catches genuine duplication, not 3x-rule local duplication.

## What the guard's threshold MISSES

- Renamed-but-equivalent engines (different name, same logic) — by-hand grep catches
- Cross-domain duplicates (Mill + Lathe versions of the same op) — wiki cross-link discovery catches
- Algorithm vs Engine duplication (a generic-purpose engine wrapping the same algorithm) — manual review

The guard is a sieve, not a complete oracle. Use it as the first pass; complement with by-hand checks for high-stakes creations.

## R8 + R12 composition

R8 (read before write) prevents creation duplication. R12 (fail-loud) ensures the guard's "duplicate found" message is acted on, not silently bypassed.

Tempting anti-pattern: get the guard's "duplicate" message, dismiss it as "false positive", build anyway. The guard's false-positive rate is ~5-10%; the genuine-duplicate rate is ~30%. Default to "duplicate is real" unless you've SPECIFICALLY verified the existing asset doesn't fit.

## Verification before any new file

```bash
# Step 1: ENGINE_DIGEST grep
grep -i "<topic>" mcp-server/data/docs/ENGINE_DIGEST.md

# Step 2: Wiki cross-check
node H:/prism/scripts/wiki-query.mjs "<topic>"  # or /wiki-query

# Step 3: Programmatic guard
node -e "import('./mcp-server/src/engines/DuplicationGuardEngine.js').then(m => console.log(m.duplicationGuardEngine.checkBeforeCreating({...})))"
```

All three return zero hits = safe to create. Any returns hits = read them before deciding.

## Related

- [[karpathy-12-rule-discipline]] — R8 is the source rule
- [[engine-creation-playbook]] — Step 1 is the guard call
- [[code-archaeology-patterns]] — the 5-tool stack for finding prior work
- CLAUDE.md "MANDATORY SELF-AWARENESS"
- `mcp-server/src/engines/DuplicationGuardEngine.ts`
- `mcp-server/data/state/cross-session-asset-registry.json`
