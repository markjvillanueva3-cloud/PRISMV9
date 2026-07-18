---
name: reference_zebra_zulu_orphaned_importers_2026_06_12
description: "Regression found + fixed during U-LINK-ZULU-CORPUS (slot:sierra, 2026-06-12, commit 81bb2b9920): a file RENAME (zebra-context-bundle.mjs -> zulu-context-bundle.mjs, the Zebra->Zulu orchestrator rename) left 4 importers pointing at the now-dead path. They were DORMANT/broken and passed silently until invoked: the test suite was 0/130 (module-not-found), zulu-context-load.mjs + zulu-context-fleet-dashboard.mjs threw ERR_MODULE_NOT_FOUND at runtime, and generate-chat-slot-nodes-features.mjs failed-soft its dynamic import (slot nodes rendered WITHOUT context). The live hook was fine (it dynamic-imports the NEW path). Lesson: a rename is not done until you grep EVERY importer -- functional imports, dynamic file:// imports, test imports, AND comments -- because a renamed-away module leaves dormant consumers that stay green-until-run."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.280Z
aliases: reference_zebra_zulu_orphaned_importers_2026_06_12
---


# zebra->zulu rename left 4 orphaned importers (dormant-until-invoked) -- 2026-06-12

**Found during:** SIERRA-VAULT-OPS/U-LINK-ZULU-CORPUS (slot:sierra, commit `81bb2b9920`),
while wiring the corpus/vault-atlas surface into the zulu/Hermes context bundle.

## The regression
The Zebra->Zulu orchestrator rename moved `scripts/lib/zebra-context-bundle.mjs` ->
`scripts/lib/zulu-context-bundle.mjs`, but **4 consumers kept importing the dead path**:
1. `scripts/lib/zulu-context-bundle.test.mjs` -- static import -> **test suite 0/130** (module-not-found; the WHOLE suite was dead, masking any real regression in the 130 cases).
2. `scripts/zulu-context-load.mjs` -- static import -> CLI threw `ERR_MODULE_NOT_FOUND` on every run.
3. `scripts/zulu-context-fleet-dashboard.mjs` -- static import -> same runtime throw.
4. `scripts/generate-chat-slot-nodes-features.mjs` -- DYNAMIC `pathToFileURL(...zebra...).href` import inside a try/catch -> **failed SOFT**: it emitted slot nodes into the 548MB system-viz graph WITHOUT the per-slot context (the worst kind -- no error, just silently degraded data).

The live per-prompt hook `slot-context-bundle-inject.mjs` was UNAFFECTED -- it already
dynamic-imports the NEW `zulu-context-bundle.mjs` path. So the rename DID update the
one hot consumer, which masked the breakage of the 4 cold ones (nobody noticed the CLI/
dashboard/test were dead because the live injection still worked).

## Why it stayed hidden
A renamed-away module throws only WHEN the importer is invoked. The hot path (the hook)
was fixed, so day-to-day everything looked fine. The cold paths (CLI/dashboard/test/
graph-generator) are run rarely or fail-soft, so they rotted green-until-run. This is the
"existence != works" class applied to a rename: the new file EXISTS, the rename LOOKED
complete, but 4 consumers were silently severed.

## The rule (how to apply)
**A file rename is not done until `grep -rn '<old-basename>'` is clean across code AND
comments AND tests AND dynamic-import string literals.** Specifically:
- static `import ... from "<old>"` (obvious)
- dynamic `import(pathToFileURL(... "<old>" ...))` (string literals -- grep, not the type system)
- test-file imports (a dead test import = a SILENTLY DISABLED suite, not a loud failure)
- doc/JSDoc comments naming the old path (accuracy + they mislead the next maintainer)
After a rename, RUN each consumer once (CLI/dashboard) + the test suite -- a 0/N suite is the
tell. `node --test <file>` printing `# pass 0 # fail 1` on a module-not-found is the signature.

## Fixed
All 4 importers + 2 comments repointed to `zulu-context-bundle.mjs`. Test suite 0/130 -> 140/140
(130 revived + 10 new corpus cases). CLI runs again. Same commit shipped the corpus surface.

Pairs with [[feedback_read_full_content_not_titles]] (existence != works) +
[[feedback_never_claim_absence_without_deep_search]] (grep DEEP -- include dynamic + comments) +
[[reference_sierra_open_threads_context_map_2026_06_10]] (the ROI thread this closed).
