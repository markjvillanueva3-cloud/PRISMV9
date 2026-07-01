// Tests for backfill-memory-aliases.mjs.
// Run: node --test scripts/backfill-memory-aliases.test.mjs
// @milestone PSN-ENHANCE-MS0/U-PSN-ALIASES-BACKFILL
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  generateAliases,
  injectAliasesLine,
  planBackfillFile,
  runBackfill,
} from "./backfill-memory-aliases.mjs";

// ----- generateAliases ---------------------------------------------------

test("generateAliases: psk_kernel.md from feedback ns → kebab + Title (UPPER dedups against kebab)", () => {
  const a = generateAliases({
    slug: "feedback_psk_kernel",
    namespace: "feedback",
    name: "feedback-psk-kernel",
    description: "PSK syscall kernel",
  });
  // Case-insensitive dedupe (per spec) → kebab "psk-kernel" wins; UPPER form
  // "PSK-KERNEL" collides on lowercase key and gets dropped. Title-case
  // "PSK Kernel" survives because it has a space (different lowercase key).
  assert.ok(a.includes("psk-kernel"), `kebab present: ${a.join(", ")}`);
  assert.ok(a.includes("PSK Kernel"), `title-case w/ acronym: ${a.join(", ")}`);
  // The `name:` frontmatter form is also a slug match — should NOT add.
  // Only true alias-distinct forms get through.
});

test("generateAliases: strips date suffix _YYYY_MM_DD", () => {
  const a = generateAliases({
    slug: "reference_some_event_2026_05_23",
    namespace: "reference",
  });
  assert.ok(a.includes("some-event"));
  assert.ok(!a.some((x) => /2026/.test(x)), "date suffix should be stripped");
});

test("generateAliases: strips date suffix _YYYY-MM-DD too", () => {
  const a = generateAliases({
    slug: "reference_other_event_2026-05-23",
    namespace: "reference",
  });
  assert.ok(a.includes("other-event"));
});

test("generateAliases: never produces an alias equal to the bare slug", () => {
  const a = generateAliases({
    slug: "feedback_simple",
    namespace: "feedback",
  });
  assert.ok(!a.includes("feedback_simple"), `should not echo slug, got: ${a.join(", ")}`);
});

test("generateAliases: case-insensitive dedupe", () => {
  const a = generateAliases({
    slug: "feedback_PSN",  // already all-caps short token
    namespace: "feedback",
  });
  // kebab=PSN, upper=PSN, title=PSN, lower=psn → after dedupe should leave ≤2
  const lower = a.map((x) => x.toLowerCase());
  assert.equal(new Set(lower).size, lower.length, `dupes present: ${a.join(", ")}`);
});

test("generateAliases: includes name: frontmatter if differs from slug", () => {
  const a = generateAliases({
    slug: "feedback_always_build",
    namespace: "feedback",
    name: "Always build, never skip",
  });
  assert.ok(a.includes("Always build, never skip"), `got: ${a.join(", ")}`);
});

test("generateAliases: empty slug → []", () => {
  assert.deepEqual(generateAliases({ slug: "", namespace: "feedback" }), []);
});

test("generateAliases: caps at MAX_ALIASES_PER_FILE", () => {
  const a = generateAliases({
    slug: "reference_a_b_c_d_e_f_g_h_i_j",
    namespace: "reference",
    name: "name-one",
  });
  assert.ok(a.length <= 6, `over cap: ${a.length}`);
});

test("generateAliases: acronym detection — short tokens uppercase", () => {
  const a = generateAliases({
    slug: "feedback_psk_psn_ms0",
    namespace: "feedback",
  });
  assert.ok(a.includes("PSK PSN MS0"), `acronym title-case wrong: ${a.join(", ")}`);
});

test("generateAliases: common-word exclusion keeps Title-case for stop words", () => {
  const a = generateAliases({
    slug: "feedback_auto_close_out",
    namespace: "feedback",
  });
  // "auto" is in COMMON_WORDS → Auto not AUTO; close-out has hyphens; out is 3-char acronym? out is 3-char + NOT in COMMON_WORDS → OUT
  assert.ok(a.some((x) => /Auto/.test(x)), `got: ${a.join(", ")}`);
});

// ----- injectAliasesLine -------------------------------------------------

test("injectAliasesLine: inserts after description: line", () => {
  const body = `---
name: x
description: short summary
metadata:
  type: feedback
---

Body text here.`;
  const out = injectAliasesLine(body, ["a", "b"]);
  assert.ok(out.includes("aliases: [a, b]"));
  const lines = out.split("\n");
  const descIdx = lines.findIndex((l) => /^description:/.test(l));
  const aliasIdx = lines.findIndex((l) => /^aliases:/.test(l));
  assert.equal(aliasIdx, descIdx + 1, "should be on the line right after description:");
});

test("injectAliasesLine: falls back to name: line if no description:", () => {
  const body = `---\nname: x\ntype: feedback\n---\nbody`;
  const out = injectAliasesLine(body, ["a"]);
  const lines = out.split("\n");
  const nameIdx = lines.findIndex((l) => /^name:/.test(l));
  const aliasIdx = lines.findIndex((l) => /^aliases:/.test(l));
  assert.equal(aliasIdx, nameIdx + 1);
});

test("injectAliasesLine: empty aliases → no-op", () => {
  const body = `---\nname: x\n---\nbody`;
  assert.equal(injectAliasesLine(body, []), body);
});

test("injectAliasesLine: no frontmatter → no-op", () => {
  const body = `Just a plain body, no frontmatter.`;
  assert.equal(injectAliasesLine(body, ["a"]), body);
});

// ----- planBackfillFile (via injected readImpl) --------------------------

function fakeRead(map) {
  return (p) => {
    const v = map[p.replace(/\\/g, "/")];
    if (v === undefined) throw new Error("ENOENT");
    return v;
  };
}

test("planBackfillFile: already-aliased → skipped", () => {
  const r = planBackfillFile({
    fullPath: "/v/feedback/x.md",
    namespace: "feedback",
    fileName: "x.md",
    readImpl: fakeRead({ "/v/feedback/x.md": `---\nname: x\naliases: [a]\n---\nbody` }),
  });
  assert.equal(r.skipped, "already-aliased");
});

test("planBackfillFile: no-frontmatter → skipped", () => {
  const r = planBackfillFile({
    fullPath: "/v/feedback/x.md",
    namespace: "feedback",
    fileName: "x.md",
    readImpl: fakeRead({ "/v/feedback/x.md": "plain body only" }),
  });
  assert.equal(r.skipped, "no-frontmatter");
});

test("planBackfillFile: happy path returns aliases + newBody", () => {
  const r = planBackfillFile({
    fullPath: "/v/feedback/feedback_psk_kernel.md",
    namespace: "feedback",
    fileName: "feedback_psk_kernel.md",
    readImpl: fakeRead({
      "/v/feedback/feedback_psk_kernel.md":
        `---\nname: feedback-psk-kernel\ndescription: PSK syscall kernel\n---\nThe kernel body.`,
    }),
  });
  assert.ok(Array.isArray(r.aliases));
  assert.ok(r.aliases.length >= 2);
  assert.ok(r.newBody.includes("aliases: ["));
});

// ----- runBackfill (E2E with injected fs) --------------------------------

test("runBackfill: dryRun does not call writeImpl", () => {
  let writes = 0;
  const renamer = () => { throw new Error("rename should not fire in dryRun"); };
  const writer = () => { writes++; };
  const fakeFs = {
    "/v/feedback": ["feedback_alpha.md", "feedback_already.md"],
  };
  const fakeBodies = {
    "/v/feedback/feedback_alpha.md": "---\nname: alpha\n---\nbody",
    "/v/feedback/feedback_already.md": "---\nname: already\naliases: [pre-curated]\n---\nbody",
  };
  const result = runBackfill({
    vaultRoot: "/v",
    namespaces: ["feedback"],
    dryRun: true,
    readdirImpl: (p) => fakeFs[p.replace(/\\/g, "/")] || [],
    readImpl: (p) => fakeBodies[p.replace(/\\/g, "/")] || "",
    writeImpl: writer,
    renameImpl: renamer,
    existsImpl: (p) => Object.prototype.hasOwnProperty.call(fakeFs, p.replace(/\\/g, "/")),
  });
  assert.equal(writes, 0, "no writes in dry-run");
  assert.equal(result.stats.scanned, 2);
  assert.equal(result.stats.written, 1);
  assert.equal(result.stats.skippedAlreadyAliased, 1);
});

test("runBackfill: respects --limit", () => {
  // Slugs MUST be ≥3 chars after namespace+date strip to clear the
  // generateAliases() empty-guard — using realistic names mirrors prod.
  const fakeFs = { "/v/feedback": ["feedback_one_alpha.md", "feedback_two_beta.md", "feedback_three_gamma.md", "feedback_four_delta.md"] };
  const fakeBodies = {
    "/v/feedback/feedback_one_alpha.md": "---\nname: one\n---\nbody",
    "/v/feedback/feedback_two_beta.md": "---\nname: two\n---\nbody",
    "/v/feedback/feedback_three_gamma.md": "---\nname: three\n---\nbody",
    "/v/feedback/feedback_four_delta.md": "---\nname: four\n---\nbody",
  };
  const result = runBackfill({
    vaultRoot: "/v",
    namespaces: ["feedback"],
    dryRun: true,
    limit: 2,
    readdirImpl: (p) => fakeFs[p.replace(/\\/g, "/")] || [],
    readImpl: (p) => fakeBodies[p.replace(/\\/g, "/")] || "",
    writeImpl: () => {},
    renameImpl: () => {},
    existsImpl: (p) => Object.prototype.hasOwnProperty.call(fakeFs, p.replace(/\\/g, "/")),
  });
  assert.equal(result.stats.written, 2, "should stop after 2 writes");
});

test("runBackfill: missing namespace dir → silent skip", () => {
  const result = runBackfill({
    vaultRoot: "/v",
    namespaces: ["nonexistent"],
    readdirImpl: () => [],
    readImpl: () => "",
    writeImpl: () => {},
    renameImpl: () => {},
    existsImpl: () => false,
  });
  assert.equal(result.stats.scanned, 0);
});

test("runBackfill: skips MEMORY.md and MEMORY-ARCHIVE.md (index, not memory)", () => {
  const fakeFs = { "/v/feedback": ["MEMORY.md", "MEMORY-ARCHIVE.md", "feedback_real.md"] };
  const fakeBodies = {
    "/v/feedback/MEMORY.md": "---\nname: idx\n---\nbody",
    "/v/feedback/MEMORY-ARCHIVE.md": "---\nname: idx\n---\nbody",
    "/v/feedback/feedback_real.md": "---\nname: real\n---\nbody",
  };
  const result = runBackfill({
    vaultRoot: "/v",
    namespaces: ["feedback"],
    dryRun: true,
    readdirImpl: (p) => fakeFs[p.replace(/\\/g, "/")] || [],
    readImpl: (p) => fakeBodies[p.replace(/\\/g, "/")] || "",
    writeImpl: () => {},
    renameImpl: () => {},
    existsImpl: (p) => Object.prototype.hasOwnProperty.call(fakeFs, p.replace(/\\/g, "/")),
  });
  assert.equal(result.stats.scanned, 1, "MEMORY.md + MEMORY-ARCHIVE.md should not be scanned");
});
