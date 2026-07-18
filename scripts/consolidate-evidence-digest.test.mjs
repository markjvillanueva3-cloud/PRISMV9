// consolidate-evidence-digest.test.mjs (U-ALPHA-SONNET-MINE)
// Tests the section extraction + global dedup + chatter filter that build the slim deferred digest.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sectionItems, consolidate } from "./consolidate-evidence-digest.mjs";

const PACK = `# Session evidence pack: aaaa1111
- date: 2026-05-14  topic: x  size: 9MB  turns: 100

## USER PROMPTS (operator intent + asks) (1)
- do the thing

## COMMIT SUBJECTS (what shipped) (2)
- [MS0]/U-A: shipped a
- [MS0]/U-B: shipped b

## DEFERRED / UNFINISHED / UNWIRED markers (3)
- 4 routing hooks NOT wired in settings.json
- Both reviewers returned VERDICT: PASS
- M#### shortcodes deferred to next session

## ARTICLES / REFS FED (1)
- https://x.com/akshay_pachaar/status/123 Hermes Masterclass

## ASSISTANT TAIL (end-of-session status)
done.
`;

test("sectionItems: extracts only the named section's bullets, drops (none) placeholder", () => {
  const def = sectionItems(PACK, "DEFERRED");
  assert.ok(def.includes("4 routing hooks NOT wired in settings.json"));
  assert.ok(def.includes("M#### shortcodes deferred to next session"));
  // must NOT leak from other sections
  assert.ok(!def.some((d) => d.includes("shipped a")), "COMMIT bullets not in DEFERRED");
  assert.ok(!def.some((d) => d.includes("do the thing")), "USER bullets not in DEFERRED");
});

test("sectionItems: none-placeholder + empty section -> []", () => {
  const none = `## DEFERRED / UNFINISHED / UNWIRED markers (0)\n_(none found)_\n`;
  assert.deepEqual(sectionItems(none, "DEFERRED"), []);
  assert.deepEqual(sectionItems("# no sections here", "DEFERRED"), []);
});

test("consolidate: real-dir pass drops chatter, keeps genuine deferred + articles", () => {
  const dir = mkdtempSync(join(tmpdir(), "consol-"));
  writeFileSync(join(dir, "aaaa1111.md"), PACK);
  try {
    const r = consolidate(dir);
    assert.equal(r.files, 1);
    assert.equal(r.sessions.length, 1, "session with signal kept");
    const s = r.sessions[0];
    assert.ok(s.def.includes("4 routing hooks NOT wired in settings.json"), "genuine deferred kept");
    assert.ok(!s.def.some((d) => /VERDICT: ?PASS/i.test(d)), "scrutiny chatter dropped");
    assert.ok(s.art.some((a) => a.includes("Hermes Masterclass")), "article kept");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("consolidate: global dedup across two sessions collapses the repeated marker", () => {
  const dir = mkdtempSync(join(tmpdir(), "consol-"));
  const p2 = PACK.replace("aaaa1111", "bbbb2222"); // same deferred lines in a 2nd session
  writeFileSync(join(dir, "aaaa1111.md"), PACK);
  writeFileSync(join(dir, "bbbb2222.md"), p2);
  try {
    const r = consolidate(dir);
    // the shared "4 routing hooks..." marker is counted ONCE globally, not twice
    assert.equal(r.nDef, 2, "2 uniq deferred total (routing-hooks + M####), deduped across both sessions");
    // second session has no NEW signal -> excluded from sessions[]
    assert.equal(r.sessions.length, 1, "duplicate-only session not emitted");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("adversarial: chatter-only deferred section yields a no-signal session (excluded)", () => {
  const dir = mkdtempSync(join(tmpdir(), "consol-"));
  const chatterOnly = `# Session evidence pack: cccc3333\n- date: 2026-05-14  topic: y  size: 1MB  turns: 5\n\n## DEFERRED / UNFINISHED / UNWIRED markers (2)\n- Both PASS, 0 P0/P1\n- iter 3/20 committing U-X\n\n## ARTICLES / REFS FED (0)\n_(none found)_\n`;
  writeFileSync(join(dir, "cccc3333.md"), chatterOnly);
  try {
    const r = consolidate(dir);
    assert.equal(r.nDef, 0, "all chatter filtered -> 0 deferred");
    assert.equal(r.sessions.length, 0, "no-signal session excluded");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
