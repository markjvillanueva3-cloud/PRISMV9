// Tests for stop-extraction-intake-drain.mjs pure logic (EXTRACTION-INTAKE-MS0, slot:bravo 2026-06-12).
// Verifies INTENT (R9): the cheap mtime gate fires ONLY when a new extraction entry exists
// (so the heavy 537MB index load is avoided otherwise); debounce suppresses per-Stop thrash;
// the intake script is resolved only when present.
import { test } from "node:test";
import assert from "node:assert/strict";
import { hasNewExtractionSince, isDebounced, resolveIntakeScript } from "./stop-extraction-intake-drain.mjs";

test("hasNewExtractionSince: true only when a NEW extraction md exists past the stamp", () => {
  const stamp = 1000;
  // a youtube md newer than the stamp -> drain
  assert.equal(hasNewExtractionSince([{ name: "youtube-a.md", mtimeMs: 2000 }], stamp), true);
  // all older than the stamp -> no drain (cheap gate avoids the heavy index load)
  assert.equal(hasNewExtractionSince([{ name: "youtube-a.md", mtimeMs: 500 }], stamp), false);
  // newer file but NOT an extraction entry (wrong prefix) -> no drain
  assert.equal(hasNewExtractionSince([{ name: "mill-cutting-forces.md", mtimeMs: 9999 }], stamp), false);
  // newer file but not .md -> no drain
  assert.equal(hasNewExtractionSince([{ name: "youtube-a.json", mtimeMs: 9999 }], stamp), false);
  // stamp 0/NaN (never drained) + any extraction entry -> drain
  assert.equal(hasNewExtractionSince([{ name: "youtube-a.md", mtimeMs: 1 }], 0), true);
  assert.equal(hasNewExtractionSince([{ name: "youtube-a.md", mtimeMs: 1 }], NaN), true);
  // mixed: one new among old -> drain
  assert.equal(hasNewExtractionSince(
    [{ name: "youtube-a.md", mtimeMs: 500 }, { name: "youtube-b.md", mtimeMs: 2000 }], stamp), true);
  // empty / null -> no drain
  assert.equal(hasNewExtractionSince([], stamp), false);
  assert.equal(hasNewExtractionSince(null, stamp), false);
});

test("isDebounced: suppresses within the 10-min window, fires outside", () => {
  const now = 10_000_000;
  const win = 600_000;
  assert.equal(isDebounced(now - 60_000, now, win), true, "1 min ago is within a 10-min window");
  assert.equal(isDebounced(now - 600_000, now, win), false, "exactly the window is not debounced");
  assert.equal(isDebounced(now - 900_000, now, win), false, "15 min ago is outside");
  assert.equal(isDebounced(0, now, win), false);
  assert.equal(isDebounced(NaN, now, win), false);
});

test("resolveIntakeScript: integration tree resolved only when the script exists", () => {
  const has = () => true;
  const none = () => false;
  assert.equal(resolveIntakeScript({}, has).root, "H:/prism");
  assert.equal(resolveIntakeScript({ PRISM_EXTRACTION_INTAKE_ROOT: "H:/prism-z" }, has).root, "H:/prism-z");
  assert.equal(resolveIntakeScript({}, none), null, "absent script -> null (no broken spawn)");
});
