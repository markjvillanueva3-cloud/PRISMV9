---
name: reference_audit_comment_strip_footgun_2026_06_18
description: Comment-stripper in a code-scanning tool must be string/regex-literal-aware — line-anchor the block-open. 3rd fleet variant of the comment-strip footgun. Scrutiny-caught.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.473Z
aliases: reference_audit_comment_strip_footgun_2026_06_18
---


# Comment-strip footgun: an unanchored block-comment regex eats real code (slot:alpha, 2026-06-18)

`U-AUDIT-COMMENT-STRIP` (`scripts/audit-unwired-engines.mjs`) added comment-stripping to `engineReferencedInConsumer` so a commented-out / JSDoc `import("...Engine.js")` mention can't false-WIRE a real orphan (R16 gap-closure of the arm-C P2 on `U-AUDIT-LAZY-IMPORT-DETECT`).

## The footgun (caught by per-file 2-arm scrutiny, BEFORE ship)
First cut used an **unanchored** block-comment regex: `content.replace(/\/\*[\s\S]*?\*\//g, "")`. This is NOT string/regex-literal-aware. A block-open token sitting MID-LINE **inside a string literal** (e.g. a glob like `"**/" + "*.MIN"`) opens a phantom comment span that the regex closes at the next block-close token — often inside a later **regex literal** (`/G\d+.../`). Everything between is deleted, **including genuine `import()` statements**.

**Reproduced live** by the reviewer: `ppDispatcher.ts` glob (line ~6279) → regex literal (line ~6393) phantom span ate the `import("...OkumaB250LatheMasterPostEngine.js")` at line ~6308 → that engine flipped to **false-UNWIRED**, masked only because `camDispatcher` independently wired it. False-UNWIRED is the *worse* class (a wired engine chased as an orphan) per the file's own SCOPE-HONESTY doctrine.

## The fix
**Line-START anchor the block-open:** `/^\s*\/\*[\s\S]*?\*\//gm`. A `/*` inside a string/regex literal is never at line-start, so the phantom span can never open. Real JSDoc/block comments (which start at line-start, possibly indented) are still removed. Trailing same-line block/line comments on a CODE line are a documented residual (we never mid-line strip — which also defeats the sibling `http://` footgun).

## Generalizable lesson
A comment-stripper inside a **code-scanning / wiring-audit / safety-gate** tool must be string-and-regex-literal-aware, or it flips a false-WIRED-prevention into a **false-UNWIRED code-eater**. The robust-and-cheap technique: **anchor comment-open tokens to line-start** (matches the line-comment policy) instead of a full tokenizer. This is the **3rd fleet variant** of the comment-strip footgun: (1) array-dispatch comment-strip URL-unaware (2026-06-11, `stop_on_unwired_assets`), (2) line-comment inside `http://` (same fix), (3) **block-open inside a string literal** (this). When adding ANY comment-strip to a scanner, line-anchor it + add a fail-on-revert test with an in-string `/*`…`*/` straddling a real import.

## Secondary self-inflicted bug (also caught)
The JSDoc documenting the fix originally contained an example glob with a literal block-close token, which **prematurely closed the doc comment** → `.mjs` syntax error. Lesson: never put literal block-open/close tokens in a JSDoc body; describe them in prose ("block-open token").

Tests 24→28 (+commented-import, +true block-strip discriminator, +in-string footgun guard). Both per-file reviewers PASS on re-verify; `node -c` clean; live audit stable UNWIRED 15.

Related: [[reference_octopus_grok_cli_voice_audit_lazy_import_2026_06_18]] · [[reference_stop_unwired_array_dispatch_fix_2026_06_11]] · [[reference_audit_wired_via_engine_2026_06_10]]
