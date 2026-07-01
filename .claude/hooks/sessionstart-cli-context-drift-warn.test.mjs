// Tests for sessionstart-cli-context-drift-warn.mjs findDivergedMirrors -- MULTI-CLI-SYNC-HOOK-MS28/P0-U02.
// Run: node .claude/hooks/sessionstart-cli-context-drift-warn.test.mjs (node:test auto-runs on exit).
import { test } from "node:test";
import assert from "node:assert/strict";
import { findDivergedMirrors } from "./sessionstart-cli-context-drift-warn.mjs";
import { CODEX_ADDENDA } from "../helpers/sync-cli-context-files.mjs";

// A realistic auto-mirror header (3 comment lines + blank) that stripExistingHeader removes.
const HDR = "<!-- AUTO-MIRRORED FROM /s by sync -->\n<!-- Mirror sync: t -->\n<!-- To update: edit /s -->\n\n";
// readFn oracle: path -> content; absent key => null (file missing).
const mk = (map) => (p) => (Object.prototype.hasOwnProperty.call(map, p) ? map[p] : null);

test("mirror body matches source (no header) -> not diverged", () => {
  const r = findDivergedMirrors([{ src: "/s", dst: "/d", target: "T" }], mk({ "/s": "DOC", "/d": "DOC" }));
  assert.equal(r.length, 0);
});

test("CORRUPT mirror (content diverged from source) -> flagged [the P0-U02 exit condition]", () => {
  const r = findDivergedMirrors([{ src: "/s", dst: "/d", target: "T" }], mk({ "/s": "DOC v2", "/d": HDR + "DOC v1 STALE" }));
  assert.equal(r.length, 1);
  assert.equal(r[0].dst, "/d");
  assert.equal(r[0].target, "T");
});

test("mirror = header + matching body -> not diverged (header stripped before compare)", () => {
  const r = findDivergedMirrors([{ src: "/s", dst: "/d", target: "T" }], mk({ "/s": "DOC", "/d": HDR + "DOC" }));
  assert.equal(r.length, 0);
});

test("codexAddenda mirror WITH addenda -> not diverged", () => {
  const r = findDivergedMirrors(
    [{ src: "/s", dst: "/d", target: "T", codexAddenda: true }],
    mk({ "/s": "DOC", "/d": HDR + "DOC" + CODEX_ADDENDA }),
  );
  assert.equal(r.length, 0);
});

test("codexAddenda mirror MISSING the addenda -> diverged", () => {
  const r = findDivergedMirrors(
    [{ src: "/s", dst: "/d", target: "T", codexAddenda: true }],
    mk({ "/s": "DOC", "/d": HDR + "DOC" }),
  );
  assert.equal(r.length, 1);
});

test("missing SOURCE -> skipped (not the detector's concern)", () => {
  const r = findDivergedMirrors([{ src: "/s", dst: "/d", target: "T" }], mk({ "/d": HDR + "anything" }));
  assert.equal(r.length, 0);
});

test("missing MIRROR -> skipped (staleness, the Stop-hook sync recreates it)", () => {
  const r = findDivergedMirrors([{ src: "/s", dst: "/d", target: "T" }], mk({ "/s": "DOC" }));
  assert.equal(r.length, 0);
});

test("multiple mirrors, only one corrupted -> only that one flagged", () => {
  const r = findDivergedMirrors(
    [{ src: "/s1", dst: "/d1", target: "T1" }, { src: "/s2", dst: "/d2", target: "T2" }],
    mk({ "/s1": "A", "/d1": "A", "/s2": "B", "/d2": HDR + "B-CORRUPT" }),
  );
  assert.equal(r.length, 1);
  assert.equal(r[0].dst, "/d2");
});

test("adversarial: empty mirror list -> empty", () => {
  assert.deepEqual(findDivergedMirrors([], mk({})), []);
});

test("adversarial: multi-line body, header + identical body -> not diverged", () => {
  const body = "Line1\nLine2\nLine3\n";
  const r = findDivergedMirrors([{ src: "/s", dst: "/d", target: "T" }], mk({ "/s": body, "/d": HDR + body }));
  assert.equal(r.length, 0);
});
