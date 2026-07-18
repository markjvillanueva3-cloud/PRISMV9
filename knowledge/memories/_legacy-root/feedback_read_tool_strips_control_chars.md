---
name: feedback_read_tool_strips_control_chars
description: "The Read tool renders U+001F (and likely other low-control chars) as empty, so a reviewer agent reading source can mis-conclude that a constant like `const X = \"\x1f\"` is `const X = \"\"`. Verify byte content with a node script when scrutiny disagrees with execution."
metadata:  
source: prism-memory
synced: 2026-05-18T01:02:09.042Z
aliases: feedback_read_tool_strips_control_chars
---


# Read-tool strips control chars when rendering

When a literal U+001F (Unit-Separator) appears inside a JavaScript string in source code (e.g. `const ID_HASH_SEP = ""`), the Read tool's rendering removes the control char from the visible output. A reviewer agent reading the file via Read concludes the constant is the empty string and may file a P0 "constant is empty" finding when in fact the byte is present and runtime behavior is correct.

**Why:** Read tool's renderer strips C0 control chars (0x00-0x1F minus 0x09/0x0A/0x0D) for display safety. The bytes are still on disk and JS still parses them. Verify with `node -e "const c=fs.readFileSync(p,'utf8'); const m=c.match(/.../); console.log([...m[0]].map(c=>c.charCodeAt(0)))"`.

**How to apply:**
1. When a reviewer agent flags a P0 like "constant is empty / docstring lies", before fixing, verify the file's actual bytes via `node`/`PowerShell -c "Get-Content -Raw | %{[char[]]$_}"`. Trust the bytes over the agent's render.
2. When AUTHORING such code, prefer the explicit escape form `"\x1f"` or `String.fromCharCode(0x1f)` in source — it survives reviewer-tool rendering, Edit-tool match operations, and copy-paste through editors. Reserve raw control-char literals for tests that need byte-exact input.
3. The Edit tool's `old_string` matcher CAN match U+001F as a byte but the visible-string comparison fails on copy-from-Read. Use `Bash + node` for surgical replacements when Edit's match fails on invisible bytes.

Observed 2026-05-15 (OBSIDIAN-INTELLIGENCE-MS3 / E1 per-file scrutiny). The U+001F separator in `IdeaBlockExtractorEngine.ts` was correctly present + functionally tested (collision-resistance test passing), but Arm A reviewer rendered the file via Read and filed a P0 on what was already correct. Cost: one wasted edit cycle + Bash node-script byte verification before realizing the agent's premise was wrong.

Sister memo: [[feedback_alpha_owns_reaper]] — same pattern of "verify before fixing" — except here the verification target is bytes, not slot ownership.


## Related
[[engines/IdeaBlockExtractorEngine|IdeaBlockExtractorEngine]]