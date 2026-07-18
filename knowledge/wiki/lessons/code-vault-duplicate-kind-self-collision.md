---
title: "Lesson: a repeated --kind double-walked the tree and self-collided into 3995 spurious notes"
type: lesson
created: 2026-07-02
slot: sierra
tags: [bug, regression, code-vault, collision, idempotency, R12]
---

# Duplicate `--kind` -> double-walk -> spurious 8-hex duplicate notes

**What happened (2026-07-02, slot:sierra):** while live-testing the `isFullRun` set-uniqueness
guard, a `code-to-vault.mjs --kind engine --kind engine ...` invocation **wrote ~3995
spurious duplicate engine notes** into the vault. Every engine ended up with BOTH a bare
note (`reference_code_engine_<slug>.md`) and an 8-hex-suffixed twin
(`..._<hash>.md`) pointing at the SAME source file. The engine note count doubled 3997 -> 7992.

**Root cause:** `main()` enumerated candidates with `for (const kind of a.kinds)` and
`parseArgs` did NOT dedupe `a.kinds`. Passing `--kind engine` twice put `"engine"` in the
list twice, so `walkCode(engines)` ran twice -> every engine file appeared twice in
`candidates` -> `buildNoteNameMap` saw each basename as a 2-member group -> member[1] got a
path-hash suffix. The collision-disambiguation logic (built to prevent *cross-file* clobber)
mis-fired on a file colliding with *itself*.

**The tell:** a real collision has two DIFFERENT `sourcePath`s (e.g. `engines/mill/X.ts` vs
`engines/wedm/X.ts`); a spurious self-collision has the SAME `sourcePath` on the bare note
and its suffixed twin. That distinction drove a safe cleanup: delete only suffixed notes
whose `sourcePath` equals their bare sibling's (3995 deleted); keep the 13 genuine
collisions (2 engine + 10 hook active-vs-`.deprecated` + 1 service `index` vs
`interfaces/index`).

**Fix:** dedupe kinds in `parseArgs` -> `a.kinds = [...new Set(a.kinds)]`. A repeated
`--kind` is now idempotent (one walk). Regression test in `code-to-vault.test.mjs`.

**Lessons:**
- **A batch generator's inputs must be idempotent.** Any list that drives a filesystem walk
  (kinds, roots, globs) needs dedup, or a repeated flag silently multiplies output.
- **Collision logic must exclude self-collision.** Group-by-name disambiguation should key on
  the identity that makes members distinct (here: `sourcePath`), not just count.
- **Live-verify write-side tools on the REAL store (R12/R15).** The unit tests were green;
  only running the actual command against the vault + counting files on disk exposed the
  pollution. `wc -l` on the output dir is a cheap, load-bearing check for a bulk emitter.
- **Recovery must distinguish real from spurious before deleting** — the `sourcePath`-equality
  rule preserved every legitimate note.

Related: [[code-vault-bridge]] · `scripts/code-to-vault.mjs` (`parseArgs`, `buildNoteNameMap`).
