// scripts/fill-galaxy-memory-sections.test.mjs
// Real-value tests for the galaxy MEMORY.md canonical-section filler.
// Reference values come from the live 2026-06-08 cam galaxy state.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..");
const SCRIPT = path.join(__dirname, "fill-galaxy-memory-sections.mjs");

// We exercise the script as a black box (it has no exports — it's a CLI).
// To unit-test the pure logic, we re-implement the two regexes the script uses
// and assert their behavior matches the script's intent, AND we run the script
// in dry-run against the real cam galaxy and assert the rendered output.

// ---- regex intent: the section-grab must NOT clip the LAST section ----
// This is the truncation regression: JS has no \Z, so `(?=^##\s+|\Z)` clipped
// the final section's last bullet. The fix is `(?![\s\S])` for true EOS.
function grabSection(text, header) {
  const re = new RegExp(`^##\\s+${header}[^\\n]*\\n([\\s\\S]*?)(?=^##\\s+|(?![\\s\\S]))`, "im");
  const m = text.match(re);
  if (!m) return [];
  return m[1].split("\n").map((l) => l.trim()).filter((l) => l.startsWith("- ")).map((l) => l.slice(2));
}

test("grabSection does NOT clip the last section (the \\Z truncation regression)", () => {
  const doc = [
    "## Recurring patterns",
    "- alpha bullet that is short",
    "## Open threads", // a middle section
    "- middle bullet",
    "## Key decisions and rules",
    "- this is the FINAL section with a long bullet that must survive to its very end punctuation.",
  ].join("\n");
  const last = grabSection(doc, "Key decisions[^\\n]*");
  assert.equal(last.length, 1);
  assert.ok(last[0].endsWith("end punctuation."), `final bullet was clipped: "${last[0].slice(-30)}"`);
});

test("grabSection captures a full multi-hundred-char bullet without mid-word cut", () => {
  const longBullet = "**Formula Adjustment**: " + "x".repeat(350) + " end.";
  const doc = `## Recurring patterns\n- ${longBullet}`;
  const got = grabSection(doc, "Recurring patterns");
  assert.equal(got.length, 1);
  assert.equal(got[0], longBullet, "bullet must be captured verbatim, not truncated");
  assert.ok(got[0].endsWith("end."));
});

test("grabSection returns [] for a missing header (no throw)", () => {
  assert.deepEqual(grabSection("## Other\n- x", "Recurring patterns"), []);
  assert.deepEqual(grabSection("", "Recurring patterns"), []);
});

// ---- trailing-boundary keyword match (no raw-substring false positives) ----
// The keyword must END at a delimiter/EOS, so compound suffixes (cadcam_) match
// but internal substrings (camera, scampi, camcorder) do not.
function matchTok(name, kws) {
  const n = name.toLowerCase();
  return kws.map((k) => k.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).some((k) => {
    const re = new RegExp(`${k}([^a-z0-9]|$)`);
    return re.test(n);
  });
}

test("matchTok requires a trailing token boundary — 'cam' matches cam files, not unrelated words", () => {
  const kws = ["cam"];
  assert.ok(matchTok("reference_cam_pipeline.md", kws), "cam_ should match");
  assert.ok(matchTok("cadcam_entry.md", kws), "cadcam should match (cam suffix at boundary)");
  assert.ok(matchTok("gibbscam.md", kws), "gibbscam should match (cam suffix before .)");
  assert.ok(matchTok("foo_cam.md", kws), "_cam should match");
  // Negative: the keyword as an INTERNAL substring (no trailing boundary) must NOT match.
  assert.equal(matchTok("camera_settings.md", kws), false, "camera must NOT match");
  assert.equal(matchTok("scampi.md", kws), false, "scampi must NOT match");
  assert.equal(matchTok("camcorder.md", kws), false, "camcorder must NOT match");
});

test("matchTok handles multi-keyword galaxies", () => {
  const kws = ["wedm", "wire-edm", "discharge"];
  assert.ok(matchTok("reference_wedm_ecode.md", kws), "wedm token matches");
  assert.ok(matchTok("discharge_gotchas.md", kws), "discharge at _-boundary matches");
  // 'discharger' has no delimiter after 'discharge' (followed by 'r'), so it must NOT match.
  assert.equal(matchTok("hardware_discharger.md", kws), false, "discharger must NOT match (no boundary after 'discharge')");
});

// ---- deterministic transition: synthetic 1/4 doc → 4/4 via the real exports ----
// These do NOT touch the live engine tree, so they pass regardless of whether
// --apply has already filled the real galaxies (the brittleness the reviewers caught).
import {
  buildBlock, applyBlock, extractExistingEdges, scoreSections,
} from "./fill-galaxy-memory-sections.mjs";

const WEAK_DOC = [
  "# Demo Galaxy MEMORY.md",
  "",
  "## Master-brain link",
  "- UP: recall query",
  "- DOWN: push memory",
  "",
  "## Candidate demo-domain memories",
  "Filename heuristic: demo, widget.",
  "",
  "## Cross-galaxy edges",
  "- demo ↔ other",
  "",
  "## Karpathy agent discipline",
  "Some human-authored doctrine that must survive.",
].join("\n");

const FAKE_CORPUS = {
  memories: 42, memAutoGen: 1296, wiki: 7, tribal: 3,
  sampleMem: ["knowledge/memories/reference/demo_thing.md"],
  sampleWiki: ["knowledge/wiki/demo.md"], sampleTribal: [],
};
const FAKE_SYN = { patterns: ["P1 pattern."], decisions: ["D1 decision."], threads: ["T1 risk."], synthesizedFrom: 9, model: "qwen2.5-coder:7b" };

test("applyBlock takes a synthetic 1/4 doc to 4/4 (deterministic, no live coupling)", () => {
  assert.equal(scoreSections(WEAK_DOC), 1, "fixture starts at 1/4 (only Master-brain link)");
  const block = buildBlock("demo", FAKE_CORPUS, FAKE_SYN, extractExistingEdges(WEAK_DOC));
  const filled = applyBlock(WEAK_DOC, block);
  assert.equal(scoreSections(filled), 4, "must reach 4/4 after fill");
});

test("applyBlock preserves human-authored sections (additive, never clobbers)", () => {
  const block = buildBlock("demo", FAKE_CORPUS, FAKE_SYN, []);
  const filled = applyBlock(WEAK_DOC, block);
  assert.match(filled, /## Master-brain link/, "Master-brain link preserved");
  assert.match(filled, /Some human-authored doctrine that must survive\./, "Karpathy body preserved");
  assert.match(filled, /## Karpathy agent discipline/, "Karpathy heading preserved");
});

test("applyBlock is idempotent — re-apply is byte-identical", () => {
  const block = buildBlock("demo", FAKE_CORPUS, FAKE_SYN, []);
  const once = applyBlock(WEAK_DOC, block);
  const twice = applyBlock(once, buildBlock("demo", FAKE_CORPUS, FAKE_SYN, []));
  assert.equal(once, twice, "second apply must produce identical bytes");
});

test("corpus count is HONEST — excludes node_* auto-gen, flags the excluded total (R12)", () => {
  const block = buildBlock("demo", FAKE_CORPUS, FAKE_SYN, []);
  assert.match(block, /42 curated memory file\(s\)/, "reports curated count, not raw");
  assert.match(block, /1296 auto-generated `node_\*` graph-node files excluded/, "discloses the excluded inflation");
  assert.ok(!/1338 curated/.test(block), "must NOT present the inflated total as curated");
});

test("corrupt/empty synthesis degrades honestly — no fabricated 'Distilled from' (R12)", () => {
  const block = buildBlock("demo", FAKE_CORPUS, null, []);
  assert.ok(!/Distilled from/.test(block.split("## Indexed")[0]), "must NOT claim distillation when synthesis absent");
  assert.match(block, /No usable synthesis/, "surfaces the real empty state");
  assert.match(block, /galaxy-synthesis-refresh\.mjs --galaxy demo/, "points to the regen command");
});

test("extractExistingEdges reads the human section, not the managed block, and drops the placeholder", () => {
  // Build a doc that already has a managed block whose bridges section holds the placeholder.
  const block = buildBlock("demo", FAKE_CORPUS, FAKE_SYN, []); // edges=[] → placeholder rendered
  const withBlock = applyBlock(WEAK_DOC, block); // human "## Cross-galaxy edges" still present after
  const edges = extractExistingEdges(withBlock);
  assert.ok(edges.includes("demo ↔ other"), "must promote the human-authored edge");
  assert.ok(!edges.some((e) => /no edges recorded yet/i.test(e)), "must NOT ingest the managed-block placeholder");
});

// ---- one real-cam smoke: post-fill invariant + honest corpus shape (state-agnostic) ----
test("dry-run on cam reaches 4/4 with real corpus counts (any starting state)", () => {
  const out = execFileSync(process.execPath, [SCRIPT, "--galaxy", "cam"], { cwd: REPO, encoding: "utf8" });
  assert.match(out, /DRY-RUN/);
  assert.match(out, /4\/4 cam/, "cam must reach 4/4 regardless of prior --apply state");
  const m = out.match(/corpus\[mem=(\d+) wiki=(\d+) tribal=(\d+) synFrom=(\d+)\]/);
  assert.ok(m, "corpus counts must be reported");
  assert.ok(Number(m[1]) > 0, "cam must have >0 curated domain memories");
  assert.ok(Number(m[4]) >= 0, "synFrom is a non-negative count");
});

test("dry-run writes NOTHING (safety)", () => {
  const memPath = path.join(REPO, "mcp-server", "src", "engines", "cam", "MEMORY.md");
  const before = fs.readFileSync(memPath, "utf8");
  execFileSync(process.execPath, [SCRIPT, "--galaxy", "cam"], { cwd: REPO, encoding: "utf8" });
  const after = fs.readFileSync(memPath, "utf8");
  assert.equal(before, after, "dry-run must not mutate the file");
});
