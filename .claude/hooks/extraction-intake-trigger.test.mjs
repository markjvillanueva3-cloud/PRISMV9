// Tests for extraction-intake-trigger.mjs pure logic (EXTRACTION-INTAKE-MS0, slot:bravo 2026-06-12).
// Verifies INTENT (R9): an extraction command MUST fire the intake; a non-extraction Bash
// command MUST NOT; the intake runs only when the script exists in the integration tree;
// debounce suppresses a batch loop's repeat fires.
import { test } from "node:test";
import assert from "node:assert/strict";
import { qualifies, resolveIntakeScript, isDebounced } from "./extraction-intake-trigger.mjs";

test("qualifies: extraction commands fire, everything else does not", () => {
  // MUST fire
  assert.equal(qualifies("node scripts/youtube-free-extract.mjs 'ytsearch5:milling'"), true);
  assert.equal(qualifies("node scripts/batch-pdf-extract.mjs --max 50"), true);
  assert.equal(qualifies("node scripts/extract-kennametal-milling.py"), true);
  assert.equal(qualifies("rtk node scripts/extract-tungaloy-endmills.py"), true);
  assert.equal(qualifies("/pdf-learn somefile.pdf"), true);
  assert.equal(qualifies("run the video-learn pipeline"), true);
  // MUST NOT fire
  assert.equal(qualifies("git status"), false, "a normal git command is not an extraction");
  assert.equal(qualifies("npx vitest run"), false);
  assert.equal(qualifies("ls scripts/"), false, "listing the dir is not running an extractor");
  assert.equal(qualifies("cat scripts/youtube-notes.txt"), false, "reading a file is not extraction");
  assert.equal(qualifies(""), false);
  assert.equal(qualifies(null), false);
  assert.equal(qualifies(undefined), false);
});

test("resolveIntakeScript: returns the integration tree + script only when present", () => {
  const has = () => true;
  const none = () => false;
  // default root H:/prism, script present
  const r = resolveIntakeScript({}, has);
  assert.equal(r.root, "H:/prism");
  assert.match(r.script.replace(/\\/g, "/"), /H:\/prism\/scripts\/extraction-intake\.mjs$/);
  // env override honored
  assert.equal(resolveIntakeScript({ PRISM_EXTRACTION_INTAKE_ROOT: "H:/prism-x" }, has).root, "H:/prism-x");
  assert.equal(resolveIntakeScript({ PRISM_ROOT: "H:/alt" }, has).root, "H:/alt");
  // script absent (e.g. not merged yet) -> null (fail-soft skip, no broken spawn)
  assert.equal(resolveIntakeScript({}, none), null);
});

test("isDebounced: suppresses within the window, fires outside, ignores bad stamps", () => {
  const now = 1_000_000;
  const win = 45_000;
  assert.equal(isDebounced(now - 1_000, now, win), true, "1s ago is within a 45s window");
  assert.equal(isDebounced(now - 45_000, now, win), false, "exactly the window is NOT debounced");
  assert.equal(isDebounced(now - 60_000, now, win), false, "60s ago is outside");
  assert.equal(isDebounced(0, now, win), false, "no prior run (0) is not debounced");
  assert.equal(isDebounced(NaN, now, win), false);
  assert.equal(isDebounced(undefined, now, win), false);
});
