#!/usr/bin/env node
// tier: T0
/**
 * claude-md-golf-only-guard.test.mjs — pure-fn coverage + subprocess oracle
 *
 * Covers:
 *   - normalizeRelativePath: relative/absolute/escape paths, sep handling
 *   - stripRenameSuffix: atomic-rename variants
 *   - isProjectClaudeMd: positive + negatives (subdir CLAUDE.md, suffixed, escape)
 *   - extractFilePath: tool_input shape variations
 *   - main() subprocess oracle: stdin-fed hook, non-edit tools, malformed JSON,
 *     CLAUDE.md target, non-CLAUDE.md target, disable knob
 *
 * Pattern: pure-core + subprocess. The pure tests prove the decision primitives;
 * the subprocess tests prove the wiring of main() (which is the bug class that
 * pure-only suites miss — see [[reference_slot_bind_enforce_2026_05_18]] +
 * [[reference_u_regen_viz_merge_faillod_2026_05_17]]).
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";

import { _internals } from "./claude-md-golf-only-guard.mjs";
const {
  normalizeRelativePath,
  stripRenameSuffix,
  isProjectClaudeMd,
  extractFilePath,
  inboxRegions,
  oldStringsForTool,
  isInboxOnlyEdit,
  CLAUDE_MD_REL,
  RENAME_SUFFIX_RE,
} = _internals;

const HOOK = resolve(import.meta.dirname, "claude-md-golf-only-guard.mjs");
const NODE = process.execPath;

// ─── normalizeRelativePath ────────────────────────────────────────────────

test("normalize: project CLAUDE.md absolute → 'CLAUDE.md'", () => {
  assert.equal(normalizeRelativePath("H:/prism/CLAUDE.md"), "CLAUDE.md");
});

test("normalize: backslash-style path normalizes to forward slashes", () => {
  // Should accept Windows backslash inputs and emit forward-slash output
  const r = normalizeRelativePath("H:\\prism\\CLAUDE.md");
  // On non-Windows path.resolve, backslashes are literal — accept either outcome
  // as long as the function doesn't throw and result is null OR forward-slash.
  assert.ok(r === "CLAUDE.md" || r === null || !r.includes("\\"));
});

test("normalize: subdir path returns subdir-relative", () => {
  assert.equal(normalizeRelativePath("H:/prism/state/shared/foo.json"), "state/shared/foo.json");
});

test("normalize: escape via .. returns null", () => {
  assert.equal(normalizeRelativePath("H:/some-other-dir/CLAUDE.md"), null);
});

test("normalize: null/undefined/empty input returns null", () => {
  assert.equal(normalizeRelativePath(null), null);
  assert.equal(normalizeRelativePath(undefined), null);
  assert.equal(normalizeRelativePath(""), null);
});

test("normalize: non-string input returns null (defensive)", () => {
  assert.equal(normalizeRelativePath(123), null);
  assert.equal(normalizeRelativePath({}), null);
});

// ─── stripRenameSuffix ────────────────────────────────────────────────────

test("strip: .tmp.<pid>.<ts> removed", () => {
  assert.equal(stripRenameSuffix("CLAUDE.md.tmp.12345.6789"), "CLAUDE.md");
});

test("strip: .tmp.<pid> removed", () => {
  assert.equal(stripRenameSuffix("CLAUDE.md.tmp.12345"), "CLAUDE.md");
});

test("strip: bare .tmp removed", () => {
  assert.equal(stripRenameSuffix("CLAUDE.md.tmp"), "CLAUDE.md");
});

test("strip: .swp/.swo (vim) removed", () => {
  assert.equal(stripRenameSuffix("CLAUDE.md.swp"), "CLAUDE.md");
  assert.equal(stripRenameSuffix("CLAUDE.md.swo"), "CLAUDE.md");
});

test("strip: tilde (emacs backup) removed", () => {
  assert.equal(stripRenameSuffix("CLAUDE.md~"), "CLAUDE.md");
});

test("strip: no suffix leaves path unchanged", () => {
  assert.equal(stripRenameSuffix("CLAUDE.md"), "CLAUDE.md");
});

test("strip: only matches at end (regex anchored)", () => {
  // .tmp in the middle of a path is left alone
  assert.equal(stripRenameSuffix("state/.tmp/foo.md"), "state/.tmp/foo.md");
});

// ─── isProjectClaudeMd ────────────────────────────────────────────────────

test("isCLAUDE: exact match → true", () => {
  assert.equal(isProjectClaudeMd("CLAUDE.md"), true);
});

test("isCLAUDE: .tmp suffix variants → true (under rename window)", () => {
  assert.equal(isProjectClaudeMd("CLAUDE.md.tmp"), true);
  assert.equal(isProjectClaudeMd("CLAUDE.md.tmp.12345.6789"), true);
  assert.equal(isProjectClaudeMd("CLAUDE.md~"), true);
});

test("isCLAUDE: subdir CLAUDE.md → false (only root file is guarded)", () => {
  assert.equal(isProjectClaudeMd("mcp-server/CLAUDE.md"), false);
  assert.equal(isProjectClaudeMd("knowledge/CLAUDE.md"), false);
});

test("isCLAUDE: null/empty → false", () => {
  assert.equal(isProjectClaudeMd(null), false);
  assert.equal(isProjectClaudeMd(""), false);
});

test("isCLAUDE: similar names → false", () => {
  assert.equal(isProjectClaudeMd("CLAUDE.html"), false);
  assert.equal(isProjectClaudeMd("CLAUDE.md.html"), false);
  assert.equal(isProjectClaudeMd("not-CLAUDE.md"), false);
});

// ─── extractFilePath ──────────────────────────────────────────────────────

test("extract: Edit/Write/MultiEdit tool_input.file_path", () => {
  assert.equal(extractFilePath({ file_path: "/x/CLAUDE.md" }), "/x/CLAUDE.md");
});

test("extract: NotebookEdit tool_input.notebook_path", () => {
  assert.equal(extractFilePath({ notebook_path: "/x/foo.ipynb" }), "/x/foo.ipynb");
});

test("extract: null/empty/non-object inputs return null", () => {
  assert.equal(extractFilePath(null), null);
  assert.equal(extractFilePath(undefined), null);
  assert.equal(extractFilePath("string-not-object"), null);
  assert.equal(extractFilePath({}), null);
});

// ─── Constants exported ───────────────────────────────────────────────────

test("constants: CLAUDE_MD_REL is 'CLAUDE.md'", () => {
  assert.equal(CLAUDE_MD_REL, "CLAUDE.md");
});

test("constants: RENAME_SUFFIX_RE matches typical atomic-rename suffixes", () => {
  assert.ok(RENAME_SUFFIX_RE.test("foo.md.tmp.12345"));
  assert.ok(RENAME_SUFFIX_RE.test("foo.md.swp"));
  assert.ok(!RENAME_SUFFIX_RE.test("foo.md"));
});

// ─── main() subprocess oracle ─────────────────────────────────────────────
// These tests fork the hook and feed real stdin. They prove the FULL wiring
// (stdin parse → tool filter → path normalize → CLAUDE.md detect → slot check)
// which the pure tests above cannot cover.

function runHook(stdinJson, envOverride = {}) {
  const env = {
    ...process.env,
    // Force-disable the slot lookup so subprocess tests don't depend on the
    // live chat-slots.json or stable-session-id (which is undefined in CI).
    // Instead we use the BYPASS / DISABLE knobs to drive the branches.
    PRISM_CLAUDE_MD_GUARD_FAIL_OPEN: "0",
    ...envOverride,
  };
  return spawnSync(NODE, [HOOK], {
    input: stdinJson,
    env,
    encoding: "utf8",
    timeout: 10000,
  });
}

test("main: no stdin → allow (exit 0)", () => {
  const r = spawnSync(NODE, [HOOK], { encoding: "utf8", timeout: 5000, stdio: ["ignore", "pipe", "pipe"] });
  assert.equal(r.status, 0);
});

test("main: non-edit tool (Read) → allow", () => {
  const r = runHook(JSON.stringify({ tool_name: "Read", tool_input: { file_path: "H:/prism/CLAUDE.md" } }));
  assert.equal(r.status, 0);
  assert.equal(r.stdout, "");
});

test("main: malformed JSON → allow (don't block)", () => {
  const r = runHook("{not valid json");
  assert.equal(r.status, 0);
});

test("main: Edit on non-CLAUDE.md target → allow", () => {
  const r = runHook(JSON.stringify({ tool_name: "Edit", tool_input: { file_path: "H:/prism/state/shared/foo.json" } }));
  assert.equal(r.status, 0);
});

test("main: DISABLE env → allow even for CLAUDE.md", () => {
  const r = runHook(
    JSON.stringify({ tool_name: "Edit", tool_input: { file_path: "H:/prism/CLAUDE.md" } }),
    { PRISM_CLAUDE_MD_GUARD_DISABLE: "1" },
  );
  assert.equal(r.status, 0);
  assert.equal(r.stdout, "");
});

test("main: BYPASS env → allow but log to stderr", () => {
  const r = runHook(
    JSON.stringify({ tool_name: "Edit", tool_input: { file_path: "H:/prism/CLAUDE.md" } }),
    { PRISM_CLAUDE_MD_GUARD_BYPASS: "1" },
  );
  assert.equal(r.status, 0);
  assert.match(r.stderr, /BYPASS/);
});

test("main: CLAUDE.md Edit from non-golf → BLOCK (exit 2 + JSON reason)", () => {
  // No bypass, no disable. If chat-slots.json doesn't have THIS pid as golf
  // (which it won't in a subprocess test), the hook should block.
  const r = runHook(
    JSON.stringify({ tool_name: "Edit", tool_input: { file_path: "H:/prism/CLAUDE.md" } }),
  );
  assert.equal(r.status, 2);
  const out = JSON.parse(r.stdout);
  assert.equal(out.continue, false);
  assert.equal(out.decision, "block");
  assert.match(out.reason, /CLAUDE\.md/);
  assert.match(out.reason, /golf/);
});

test("main: CLAUDE.md Write from non-golf → BLOCK", () => {
  const r = runHook(
    JSON.stringify({ tool_name: "Write", tool_input: { file_path: "H:/prism/CLAUDE.md", content: "x" } }),
  );
  assert.equal(r.status, 2);
});

test("main: CLAUDE.md MultiEdit from non-golf → BLOCK", () => {
  const r = runHook(
    JSON.stringify({ tool_name: "MultiEdit", tool_input: { file_path: "H:/prism/CLAUDE.md", edits: [] } }),
  );
  assert.equal(r.status, 2);
});

test("main: CLAUDE.md.tmp.<pid> rename target → BLOCK (atomic-rename tolerance)", () => {
  const r = runHook(
    JSON.stringify({ tool_name: "Write", tool_input: { file_path: "H:/prism/CLAUDE.md.tmp.12345" } }),
  );
  assert.equal(r.status, 2);
});

test("main: subdir CLAUDE.md (e.g. mcp-server/CLAUDE.md) → allow (only root is guarded)", () => {
  const r = runHook(
    JSON.stringify({ tool_name: "Edit", tool_input: { file_path: "H:/prism/mcp-server/CLAUDE.md" } }),
  );
  assert.equal(r.status, 0);
});

test("main: escape path (..\\..\\..\\some-other\\CLAUDE.md) → allow (outside repo)", () => {
  const r = runHook(
    JSON.stringify({ tool_name: "Edit", tool_input: { file_path: "C:/Users/wompu/.claude/CLAUDE.md" } }),
  );
  // User-global CLAUDE.md is OUTSIDE H:/prism — must NOT be guarded.
  assert.equal(r.status, 0);
});

// ─── inbox-boundary / inbox-only-edit (PER-SLOT-CLAUDEMD-MS0 DOCREFLECT allowance) ───

// NOTE: §Recent regressions is NOT the last section -- a doctrine section
// (## RTK DOCTRINE) follows it, mirroring the live CLAUDE.md layout. The
// allowance must scope to the regressions SECTION, not "everything after it".
const DOC = [
  "# PRISM",
  "## EXPERT ROLE",
  "doctrine body line",
  "## SAFETY RAILS",
  "more doctrine",
  "## Recent regressions",       // <- inbox section start
  "- 2026-06-13 | **a bug** | observed-in: abc | fix: see commit",
  "- 2026-06-12 | **another** | observed-in: def | fix: see commit",
  "## RTK DOCTRINE",             // <- inbox section END; doctrine again
  "rtk prefix all bash AFTER the regressions section",
].join("\n");

test("inboxRegions: finds the '## Recent ...' section [start,end) bounded by next header", () => {
  const regions = inboxRegions(DOC);
  assert.equal(regions.length, 1);
  const [start, end] = regions[0];
  assert.ok(DOC.slice(start).startsWith("## Recent regressions"));
  // end must stop AT the next "## " header (RTK), not run to EOF
  assert.ok(DOC.slice(end).startsWith("## RTK DOCTRINE"));
});

test("inboxRegions: absent header gives empty; non-string gives empty; multiple sections counted", () => {
  assert.deepEqual(inboxRegions("## EXPERT ROLE\nno inbox here"), []);
  assert.deepEqual(inboxRegions(null), []);
  const two = "## Recent regressions\na\n## Mid\nb\n## Recent shipments\nc";
  assert.equal(inboxRegions(two).length, 2);
});

test("oldStringsForTool: Edit→[old_string], MultiEdit→[N], Write/Notebook→[]", () => {
  assert.deepEqual(oldStringsForTool("Edit", { old_string: "x" }), ["x"]);
  assert.deepEqual(oldStringsForTool("Edit", { content: "x" }), []); // no old_string
  assert.deepEqual(
    oldStringsForTool("MultiEdit", { edits: [{ old_string: "a" }, { old_string: "b" }, { foo: 1 }] }),
    ["a", "b"],
  );
  assert.deepEqual(oldStringsForTool("Write", { content: "whole file" }), []);
  assert.deepEqual(oldStringsForTool("NotebookEdit", { new_source: "x" }), []);
  assert.deepEqual(oldStringsForTool("Edit", null), []);
});

test("isInboxOnlyEdit: TRUE when old_string is in the trailing inbox region", () => {
  // a real regression-append anchors on an existing bullet (after the boundary)
  assert.equal(isInboxOnlyEdit(["- 2026-06-12 | **another** | observed-in: def | fix: see commit"], DOC), true);
  // anchoring on the header itself is also within the region
  assert.equal(isInboxOnlyEdit(["## Recent regressions"], DOC), true);
});

test("isInboxOnlyEdit: FALSE for a doctrine edit ABOVE or BELOW the regressions section", () => {
  // doctrine ABOVE the section
  assert.equal(isInboxOnlyEdit(["## EXPERT ROLE"], DOC), false);
  assert.equal(isInboxOnlyEdit(["doctrine body line"], DOC), false);
  assert.equal(isInboxOnlyEdit(["more doctrine"], DOC), false);
  // doctrine BELOW the section (the bug the live-CLAUDE.md E2E caught: RTK/WIKI
  // sit AFTER §Recent regressions and must NOT be editable as an "inbox append")
  assert.equal(isInboxOnlyEdit(["## RTK DOCTRINE"], DOC), false);
  assert.equal(isInboxOnlyEdit(["rtk prefix all bash AFTER the regressions section"], DOC), false);
});

test("isInboxOnlyEdit: FALSE for absent string, empty list, empty string, no-boundary content", () => {
  assert.equal(isInboxOnlyEdit(["not present anywhere"], DOC), false);
  assert.equal(isInboxOnlyEdit([], DOC), false);          // Write/Notebook -> [] -> blocked
  assert.equal(isInboxOnlyEdit([""], DOC), false);        // empty old_string -> blocked
  assert.equal(isInboxOnlyEdit(["## EXPERT ROLE"], "no inbox header at all"), false);
});

test("isInboxOnlyEdit: MultiEdit TRUE only if EVERY old_string is in-region", () => {
  const allIn = ["- 2026-06-13 | **a bug** | observed-in: abc | fix: see commit", "## Recent regressions"];
  const oneOut = ["- 2026-06-13 | **a bug** | observed-in: abc | fix: see commit", "## EXPERT ROLE"];
  assert.equal(isInboxOnlyEdit(allIn, DOC), true);
  assert.equal(isInboxOnlyEdit(oneOut, DOC), false); // one edit touches doctrine -> whole thing blocked
});

// ─── E2E against LIVE CLAUDE.md: doctrine edit BLOCKS, inbox append ALLOWS ───
// Stable anchors: "## EXPERT ROLE" lives in the doctrine body (top); the
// "## Recent regressions" header lives in the trailing inbox. These prove the
// DOCREFLECT flow is preserved (append allowed) without un-gating doctrine edits.

test("main: non-golf Edit anchored on a real in-section regression bullet → ALLOW (DOCREFLECT preserved)", () => {
  // Derive the anchor from the LIVE file: a dated regression bullet only ever
  // occurs INSIDE the §Recent regressions section (never in prose), so its first
  // occurrence is guaranteed in-region. (The header text itself appears earlier
  // in prose -- "sister pattern to `## Recent regressions`" -- which is exactly
  // why a header anchor is wrong and a bullet anchor is right.)
  const c = readFileSync(resolve("H:/prism/CLAUDE.md"), "utf8");
  const secStart = c.search(/^## Recent regressions/m);
  assert.ok(secStart >= 0, "live CLAUDE.md must have a ## Recent regressions section");
  const bullet = c.slice(secStart).match(/^- 20\d\d-\d\d-\d\d \| [^\n]+/m);
  assert.ok(bullet, "regressions section must contain a dated bullet to anchor on");
  const anchor = bullet[0];
  assert.ok(c.indexOf(anchor) >= secStart, "anchor's first occurrence must be inside the section");
  const r = runHook(
    JSON.stringify({
      tool_name: "Edit",
      tool_input: {
        file_path: "H:/prism/CLAUDE.md",
        old_string: anchor,
        new_string: anchor + "\n- 2026-06-13 | **probe entry** | observed-in: x | fix: y",
      },
    }),
  );
  assert.equal(r.status, 0, `expected ALLOW for in-section regression-bullet edit; got status ${r.status} stdout=${r.stdout}`);
});

test("main: non-golf Edit on a DOCTRINE-body anchor (## EXPERT ROLE) → BLOCK (doctrine stays golf-only)", () => {
  const r = runHook(
    JSON.stringify({
      tool_name: "Edit",
      tool_input: {
        file_path: "H:/prism/CLAUDE.md",
        old_string: "## EXPERT ROLE",
        new_string: "## EXPERT ROLE (tampered)",
      },
    }),
  );
  assert.equal(r.status, 2, "a doctrine-body edit from a non-golf chat must still BLOCK");
});

// ─── P1 (per-file scrutiny arm B): span-escape bypass must be CLOSED ───
// An old_string that STARTS inside the inbox section but EXTENDS past the
// boundary into doctrine must NOT be treated as an inbox append (else a
// non-golf chat rewrites doctrine via new_string). Requires end-inclusive span.

test("isInboxOnlyEdit: FALSE when old_string starts in-region but SPANS into doctrine (P1 fix)", () => {
  // "see commit\n## RTK DOCTRINE" first-occurs at the LAST bullet (in-region)
  // but its span crosses the boundary into the RTK section -> must be blocked.
  const spanning = "see commit\n## RTK DOCTRINE";
  assert.ok(DOC.indexOf(spanning) >= 0, "fixture must contain the spanning string");
  assert.equal(isInboxOnlyEdit([spanning], DOC), false);
});

test("main: non-golf Edit whose old_string SPANS inbox→doctrine → BLOCK (P1 live-exploit closed)", () => {
  const c = readFileSync(resolve("H:/prism/CLAUDE.md"), "utf8");
  const regions = inboxRegions(c);
  assert.ok(regions.length >= 1, "live CLAUDE.md must have an inbox section");
  const [a, b] = regions[0];
  // Build a real spanning old_string: the last ~120 in-region bytes + the first
  // ~120 doctrine bytes after the boundary (exactly arm B's confirmed exploit).
  const spanning = c.slice(Math.max(a, b - 120), b + 120);
  assert.ok(c.indexOf(spanning) < b && c.indexOf(spanning) + spanning.length > b, "span must cross the boundary");
  const r = runHook(
    JSON.stringify({
      tool_name: "Edit",
      tool_input: { file_path: "H:/prism/CLAUDE.md", old_string: spanning, new_string: "TAMPERED DOCTRINE" },
    }),
  );
  assert.equal(r.status, 2, `a boundary-spanning edit must BLOCK; got ${r.status} ${r.stdout.slice(0, 200)}`);
});

// ─── P2 re-scrutiny: fences are NOT honored (the SECURE direction) ───
// Honoring ``` fences is strictly fail-OPEN in a boundary gate: an unterminated
// fence would swallow every following "## " header and run the region to EOF,
// re-exposing the doctrine BELOW the inbox. So EVERY column-0 "## " ends the
// region regardless of fences. The only cost is over-blocking (fail-safe).

test("inboxRegions: a column-0 '## ' ENDS the region even inside a ``` fence (fail-safe, not fail-open)", () => {
  const docFence = [
    "## Recent regressions",
    "- 2026-06-13 | **bug** | fix:",
    "```sh",
    "## a shell comment that LOOKS like a header",
    "```",
    "- 2026-06-12 | **later bullet**",
    "## RTK DOCTRINE",
  ].join("\n");
  const regions = inboxRegions(docFence);
  assert.ok(regions.length >= 1);
  const [start, end] = regions[0];
  assert.ok(docFence.slice(start).startsWith("## Recent regressions"));
  // region ENDS at the fenced "## a shell comment" (first col-0 ## after the
  // header) -- shrinking is safe; it must NEVER run past a ## into doctrine.
  assert.ok(
    docFence.slice(end).startsWith("## a shell comment"),
    "region must end at the first column-0 ## (fence ignored), never extend past it",
  );
});

test("inboxRegions: an UNTERMINATED fence CANNOT extend the region to EOF (the reverted-fence-fix bypass stays closed)", () => {
  // The exact two-step exploit re-scrutiny found: poison the file with an
  // unclosed ``` in an allowed append, then a fence-aware region would run to
  // EOF and expose doctrine. With pure col-0 boundaries there is no fence state.
  const poisoned = [
    "## Recent regressions",
    "- 2026-06-13 | **bug** | fix:",
    "```sh",                       // <- never closed
    "some code",
    "## ONE-GLANCE CHECKLIST",     // a REAL doctrine header below the inbox
    "doctrine to protect",
  ].join("\n");
  const [, end] = inboxRegions(poisoned)[0];
  assert.ok(
    poisoned.slice(end).startsWith("## ONE-GLANCE CHECKLIST"),
    "region must STOP at the real doctrine header, never run to EOF via an unterminated fence",
  );
  // therefore the doctrine line is NOT editable as an inbox append
  assert.equal(isInboxOnlyEdit(["doctrine to protect"], poisoned), false);
});
