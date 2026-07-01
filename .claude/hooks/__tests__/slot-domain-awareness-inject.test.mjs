// Tests for slot-domain-awareness-inject.mjs ANY_DOMAIN_SLOTS support
// (operator override 2026-06-18 -- 9 slots expand to any domain when own queue dry).
//
// Covers the pure exports parseAnyDomainSlots + formatAnyDomainNotice:
//   - happy: real marker format yields exactly the 9 sanctioned slots
//   - absent / malformed marker -> [] (fail-soft, never throws)
//   - ADVERSARIAL: a doc containing BOTH the free-prose list ("... and xray")
//     AND the marker line yields exactly 9 clean names (no "and", no prose
//     bleed) -- guards the "token-anywhere regex over prose" over-count class
//   - notice: my-slot-in-9 -> personalized line; not-in-9 -> general list; empty -> ""
//   - notice output is ASCII-only (ascii-guard compliance)
//   - LIVE DATA: the real CHAT-SLOT-DOMAINS.md carries the 9 via the marker
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parseAnyDomainSlots, formatAnyDomainNotice, resolveRoot } from "../slot-domain-awareness-inject.mjs";

const NINE = ["alpha", "bravo", "golf", "sierra", "zulu", "india", "papa", "romeo", "xray"];

test("parseAnyDomainSlots: real marker format -> exactly the 9 slots", () => {
  const md = "## Any-domain fallback slots\n\n**ANY_DOMAIN_SLOTS:** alpha, bravo, golf, sierra, zulu, india, papa, romeo, xray\n\nMechanism: ...";
  assert.deepEqual(parseAnyDomainSlots(md), NINE);
});

test("parseAnyDomainSlots: absent marker -> []", () => {
  assert.deepEqual(parseAnyDomainSlots("# Some doc with no marker\n| Slot | Domain |\n"), []);
});

test("parseAnyDomainSlots: empty/garbage input -> [] (fail-soft, no throw)", () => {
  assert.deepEqual(parseAnyDomainSlots(""), []);
  assert.deepEqual(parseAnyDomainSlots(null), []);
  assert.deepEqual(parseAnyDomainSlots(undefined), []);
  assert.deepEqual(parseAnyDomainSlots(12345), []);
});

test("parseAnyDomainSlots: ADVERSARIAL prose+marker -> only marker line, no 'and' bleed", () => {
  // The registry has BOTH a free-prose sentence ("change alpha, bravo ... and xray")
  // AND the authoritative marker. The regex must anchor on the marker only -- a
  // token-anywhere match would slurp the prose "and" or duplicate names.
  const md = [
    'Verbatim: "change alpha, bravo, golf, sierra, zulu, india, papa, romeo and xray to work in any domain."',
    "",
    "**ANY_DOMAIN_SLOTS:** alpha, bravo, golf, sierra, zulu, india, papa, romeo, xray",
  ].join("\n");
  const got = parseAnyDomainSlots(md);
  assert.deepEqual(got, NINE);
  assert.ok(!got.includes("and"), "must not capture the prose conjunction 'and'");
  assert.equal(got.length, 9, "exactly 9, no duplicates from the prose line");
});

test("parseAnyDomainSlots: tolerates no surrounding bold + extra whitespace", () => {
  assert.deepEqual(parseAnyDomainSlots("ANY_DOMAIN_SLOTS:   alpha,   bravo ,golf"), ["alpha", "bravo", "golf"]);
});

test("formatAnyDomainNotice: my slot is in the 9 -> personalized any-domain line", () => {
  const out = formatAnyDomainNotice(NINE, "papa");
  assert.match(out, /\*\*papa\*\*/);
  assert.match(out, /ANY-DOMAIN slot/);
  assert.match(out, /never idle/);
});

test("formatAnyDomainNotice: my slot NOT in the 9 -> general list (not personalized)", () => {
  const out = formatAnyDomainNotice(NINE, "foxtrot");
  assert.doesNotMatch(out, /\*\*foxtrot\*\*/);
  assert.match(out, /Any-domain fallback slots/);
  assert.match(out, /alpha, bravo, golf/);
});

test("formatAnyDomainNotice: empty slots -> empty string (no injection)", () => {
  assert.equal(formatAnyDomainNotice([], "alpha"), "");
  assert.equal(formatAnyDomainNotice(null, "alpha"), "");
});

test("formatAnyDomainNotice: case-insensitive my-slot match", () => {
  const out = formatAnyDomainNotice(NINE, "ALPHA");
  assert.match(out, /\*\*ALPHA\*\*/);
  assert.match(out, /ANY-DOMAIN slot/);
});

test("formatAnyDomainNotice: output is ASCII-only (ascii-guard compliance)", () => {
  for (const slot of ["papa", "foxtrot"]) {
    const out = formatAnyDomainNotice(NINE, slot);
    // eslint-disable-next-line no-control-regex
    assert.ok(/^[\x00-\x7F]*$/.test(out), `notice for ${slot} must be pure ASCII`);
  }
});

test("LIVE (runtime-faithful): the registry the hook ACTUALLY resolves carries all 9", () => {
  // Read through the hook's OWN resolveRoot so test + runtime agree on WHICH
  // CHAT-SLOT-DOMAINS.md is read. Prevents the false-confidence gap where the test
  // reads H:/prism while the hook resolves a different (stale) worktree copy.
  const root = resolveRoot();
  if (!root) { return; } // no registry anywhere in this checkout -> skip
  const reg = join(root, "state", "shared", "CHAT-SLOT-DOMAINS.md");
  if (!existsSync(reg)) { return; }
  const slots = parseAnyDomainSlots(readFileSync(reg, "utf8"));
  for (const s of NINE) assert.ok(slots.includes(s), `runtime-resolved registry must list ${s}`);
});
