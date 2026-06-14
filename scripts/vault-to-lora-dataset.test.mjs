/**
 * vault-to-lora-dataset.test.mjs -- unit tests for the vault->LoRA extractor
 * (OBSIDIAN-AI-SYNERGY, slot:kilo 2026-06-09).
 *
 * R9: every test encodes WHY the behavior matters, with real reference values --
 * no toBeDefined() stubs. Covers happy path + >=3 failure modes + >=2 adversarial
 * + a live-vault scan (R15 step-3 validation in the suite itself).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  splitFrontmatter,
  frontmatterField,
  instructionFromName,
  buildExampleFromFeedback,
  collectFeedbackExamples,
  summarize,
  parseSynthesisSections,
  bulletTopicAndRest,
  buildExamplesFromSynthesis,
  galaxyFromSynthesisFile,
  collectGalaxySynthesisExamples,
  resolveGalaxyOutPath,
  DEFAULT_OUT,
  DEFAULT_SYNTH_OUT,
} from "./vault-to-lora-dataset.mjs";
import path from "node:path";

// ---- splitFrontmatter -------------------------------------------------------

test("splitFrontmatter separates YAML block from body", () => {
  const md = `---\nname: foo\ndescription: bar\n---\nThe body text.`;
  const { frontmatter, body } = splitFrontmatter(md);
  assert.match(frontmatter, /name: foo/);
  assert.equal(body, "The body text.");
});

test("splitFrontmatter handles CRLF line endings (windows vault files)", () => {
  // WHY: ~half the feedback notes are CRLF (authored on Windows); a \n-only
  // regex would treat the whole file as body and lose the frontmatter.
  const md = `---\r\nname: foo\r\n---\r\nBody here.`;
  const { frontmatter, body } = splitFrontmatter(md);
  assert.match(frontmatter, /name: foo/);
  assert.equal(body, "Body here.");
});

test("splitFrontmatter normalizes interior CRLF in a multi-line body to LF", () => {
  // WHY: ~half the vault notes are CRLF; a retained interior \r flows verbatim
  // into the `output` training pair as JSON-escaped \r noise the model learns as
  // signal (measured 2260 stray \r across 53/245 pairs before the fix). Body
  // must be pure LF.
  const md = `---\r\nname: foo\r\n---\r\nline one\r\nline two\r\nline three`;
  const { body } = splitFrontmatter(md);
  assert.equal(body, "line one\nline two\nline three");
  assert.equal((body.match(/\r/g) || []).length, 0, "no carriage returns may survive");
});

test("splitFrontmatter with no frontmatter returns whole text as body", () => {
  const { frontmatter, body } = splitFrontmatter("just a body, no fm");
  assert.equal(frontmatter, "");
  assert.equal(body, "just a body, no fm");
});

test("splitFrontmatter non-string input does not throw (adversarial)", () => {
  assert.deepEqual(splitFrontmatter(null), { frontmatter: "", body: "" });
  assert.deepEqual(splitFrontmatter(undefined), { frontmatter: "", body: "" });
  assert.deepEqual(splitFrontmatter(42), { frontmatter: "", body: "" });
});

// ---- frontmatterField -------------------------------------------------------

test("frontmatterField reads bare, double-quoted, and single-quoted values", () => {
  assert.equal(frontmatterField("description: bare value", "description"), "bare value");
  assert.equal(frontmatterField(`description: "quoted value"`, "description"), "quoted value");
  assert.equal(frontmatterField(`description: 'single value'`, "description"), "single value");
});

test("frontmatterField returns '' for missing key (failure mode)", () => {
  assert.equal(frontmatterField("name: foo", "description"), "");
  assert.equal(frontmatterField("", "description"), "");
  assert.equal(frontmatterField(null, "description"), "");
});

test("frontmatterField reads a value indented under metadata: (nested shape B)", () => {
  // WHY: two frontmatter shapes coexist (flat `type:` vs nested
  // `metadata:\n  type:`). The type-gate must see the value under BOTH; a
  // \s-eats-newline regex returned "" for the nested form, silently bypassing
  // the gate. [ \t]* (non-newline) leading-ws is what makes this match.
  const fm = "name: x\nmetadata:\n  type: feedback\n  domain: cam";
  assert.equal(frontmatterField(fm, "type"), "feedback");
});

test("frontmatterField does NOT steal the next line for a blank value (failure mode)", () => {
  // WHY: a \s* after the key eats the newline and (.*) then captures the FOLLOWING
  // frontmatter line -> a blank `description:` would inject `type: feedback` as the
  // training pair's `input`. The [ \t]* + non-greedy bare branch keeps it empty.
  const fm = "name: x\ndescription:\ntype: feedback";
  assert.equal(frontmatterField(fm, "description"), "");
});

// ---- instructionFromName ----------------------------------------------------

test("instructionFromName turns a feedback slug into a natural question", () => {
  // WHY: the synthesized instruction is what the model is trained to answer;
  // it must read as a real question about the rule's topic, not the raw slug.
  assert.equal(
    instructionFromName("feedback_check_units_first", "x"),
    "What is PRISM's rule about check units first, and how should I apply it?",
  );
});

test("instructionFromName strips a trailing .md from a filename-fallback slug (failure mode)", () => {
  // WHY: when a note has no `name:` frontmatter, the raw filename
  // ("feedback_check_units_first.md") reaches this fn; without the .md strip the
  // extension leaks into the question ("...units first.md..."). The strip must
  // live HERE so the fn is correct regardless of whether the caller pre-stripped.
  assert.equal(
    instructionFromName("feedback_check_units_first.md", ""),
    "What is PRISM's rule about check units first, and how should I apply it?",
  );
});

test("instructionFromName falls back to a generic prompt for an empty slug (failure mode)", () => {
  // WHY: a note with no name AND no derivable topic still must yield a usable
  // instruction -- never an empty string the trainer would choke on.
  assert.equal(
    instructionFromName("", ""),
    "Explain this PRISM convention and how to apply it.",
  );
  assert.equal(
    instructionFromName("", "some description"),
    "Explain this PRISM convention and how to apply it.",
  );
});

// ---- buildExampleFromFeedback ----------------------------------------------

test("buildExampleFromFeedback builds a full Alpaca triple from a real-shaped note", () => {
  const md = [
    "---",
    "name: feedback_demo_rule",
    'description: "A one-line rule summary."',
    "metadata:",
    "  type: feedback",
    "---",
    "## Rule",
    "Do the thing.",
    "",
    "**Why:** because it matters in a way that is at least one hundred and twenty characters long so the body clears the MIN_BODY_CHARS gate easily.",
    "",
    "**How to apply:** step one, step two.",
  ].join("\n");
  const ex = buildExampleFromFeedback(md, "feedback_demo_rule.md");
  assert.ok(ex, "expected a non-null example");
  assert.equal(ex.instruction, "What is PRISM's rule about demo rule, and how should I apply it?");
  assert.equal(ex.input, "A one-line rule summary.");
  assert.match(ex.output, /^## Rule/);
  assert.match(ex.output, /How to apply/);
  assert.equal(ex._source, "feedback_demo_rule.md");
});

test("buildExampleFromFeedback skips a thin-body note (failure mode)", () => {
  // WHY: a 1-line stub teaches the model nothing and dilutes the set; it must be
  // dropped, not emitted as a degenerate pair.
  const md = `---\nname: feedback_stub\ndescription: "x"\n---\nshort`;
  assert.equal(buildExampleFromFeedback(md, "feedback_stub.md"), null);
});

test("buildExampleFromFeedback skips a non-feedback typed note (adversarial)", () => {
  // WHY: a `reference`/`user`/`project` note that happens to live in or get
  // passed to the feedback scan must NOT become a doctrine training pair --
  // it isn't a rule. Body is long enough to prove the type-gate (not the
  // length-gate) is what rejects it.
  const longBody = "x".repeat(200);
  const md = `---\nname: ref_note\ndescription: "d"\nmetadata:\n  type: reference\n---\n${longBody}`;
  assert.equal(buildExampleFromFeedback(md, "ref_note.md"), null);
});

test("buildExampleFromFeedback derives name from filename when frontmatter omits it", () => {
  // WHY: some older notes have no `name:` field; the filename is the fallback
  // source for the instruction topic.
  const longBody = "y".repeat(200);
  const md = `---\ndescription: "d"\n---\n${longBody}`;
  const ex = buildExampleFromFeedback(md, "feedback_no_name_field.md");
  assert.ok(ex);
  assert.equal(ex.instruction, "What is PRISM's rule about no name field, and how should I apply it?");
});

// ---- summarize --------------------------------------------------------------

test("summarize reports zeroed counts for an empty set (edge case)", () => {
  assert.deepEqual(summarize([]), { count: 0, avg_instruction_length: 0, avg_output_length: 0 });
});

test("summarize computes real averages", () => {
  const ex = [
    { instruction: "abcd", input: "", output: "12345678" },     // 4 / 8
    { instruction: "abcdef", input: "", output: "1234" },        // 6 / 4
  ];
  // (4+6)/2 = 5 ; (8+4)/2 = 6
  assert.deepEqual(summarize(ex), { count: 2, avg_instruction_length: 5, avg_output_length: 6 });
});

// ---- live vault scan (R15 step-3 validation in-suite) -----------------------

test("collectFeedbackExamples extracts a meaningful corpus from the live vault", () => {
  // WHY: this is the validation gate -- if the feedback dir layout or the note
  // shape drifts, the extractor must still find the bulk of the corpus. The
  // 2026-06-09 live measurement was 245/247; we assert a conservative floor so
  // a real regression (e.g. frontmatter parser break -> 0 examples) fails loud
  // while normal corpus growth does not.
  const { examples, scanned, skipped } = collectFeedbackExamples();
  assert.ok(scanned >= 200, `expected >=200 feedback notes scanned, got ${scanned}`);
  assert.ok(examples.length >= 200, `expected >=200 LoRA pairs, got ${examples.length}`);
  // Every emitted pair must be a complete triple (no empty instruction/output).
  for (const ex of examples) {
    assert.ok(ex.instruction.length > 0, "instruction must be non-empty");
    assert.ok(ex.output.length >= 120, "output must clear the MIN_BODY_CHARS floor");
  }
  // skipped count is small (thin stubs / mistyped) -- not the bulk.
  assert.ok(skipped < examples.length, "skipped should be a small minority");
});

// ===========================================================================
// Galaxy-synthesis source (U-LORA-GALAXY-SYNTHESIS, slot:india 2026-06-10)
// ===========================================================================

// ---- parseSynthesisSections ------------------------------------------------

test("parseSynthesisSections collects bullets under the 3 canonical sections only", () => {
  // WHY: the synthesis files carry an advisory blockquote + title + the 3
  // canonical sections; only the canonical bullets are training signal. A bullet
  // under any other heading (or the header preamble) must be ignored.
  const body = [
    "> advisory blockquote -- ignore this",
    "## Recurring patterns",
    "- **Alpha** -- first recurring thing in the domain, long enough to be kept here.",
    "- **Beta** -- second recurring thing, also clearly long enough to be kept here.",
    "## Key decisions & rules",
    "- **Gate** -- promote only on real metrics; a decision rule that is long enough.",
    "## Open threads",
    "- **Open** -- an unresolved thread that still needs attention and is long enough.",
    "## Some other heading",
    "- this must NOT be collected since the heading is not canonical at all here.",
  ].join("\n");
  const s = parseSynthesisSections(body);
  assert.equal(s["Recurring patterns"].length, 2);
  assert.equal(s["Key decisions & rules"].length, 1);
  assert.equal(s["Open threads"].length, 1);
  assert.match(s["Recurring patterns"][0], /^\*\*Alpha\*\*/);
});

test("parseSynthesisSections appends a wrapped continuation line to its bullet", () => {
  // WHY: a rule that wraps across physical lines must stay ONE training pair, not
  // be split into a bullet + an orphan fragment.
  const body = [
    "## Recurring patterns",
    "- **Wrapped** -- the rule starts here",
    "  and continues on the next physical line which joins the same bullet.",
  ].join("\n");
  const s = parseSynthesisSections(body);
  assert.equal(s["Recurring patterns"].length, 1);
  assert.match(s["Recurring patterns"][0], /starts here and continues/);
});

test("parseSynthesisSections on non-string returns empty sections (adversarial)", () => {
  assert.deepEqual(parseSynthesisSections(null),
    { "Recurring patterns": [], "Key decisions & rules": [], "Open threads": [] });
});

// ---- bulletTopicAndRest -----------------------------------------------------

test("bulletTopicAndRest extracts the bold lead topic", () => {
  const { topic } = bulletTopicAndRest("**Gate rule** -- promote only on real metrics [9].");
  assert.equal(topic, "Gate rule");
});

test("bulletTopicAndRest with no bold lead returns empty topic + whole bullet (failure mode)", () => {
  const { topic, rest } = bulletTopicAndRest("a plain bullet with no bold lead at all");
  assert.equal(topic, "");
  assert.equal(rest, "a plain bullet with no bold lead at all");
});

// ---- buildExamplesFromSynthesis --------------------------------------------

test("buildExamplesFromSynthesis builds galaxy-tagged advisory triples, one per bullet", () => {
  // WHY: each galaxy bullet becomes a section-aware question whose answer is the
  // full bullet, tagged with the galaxy + advisory provenance so a model never
  // confuses it with verified doctrine.
  const md = [
    "---", "metadata:", "  galaxy: speed-feed", "---",
    "## Recurring patterns",
    "- **Kienzle force model** -- the SFC core uses the Kienzle specific-force law for cuts.",
    "## Key decisions & rules",
    "- **Import constants** -- never inline physics constants; import from constants.ts always.",
    "## Open threads",
    "- **Vendor parity** -- close the remaining gap vs HSMAdvisor on a few exotic alloys here.",
  ].join("\n");
  const ex = buildExamplesFromSynthesis(md, "speed-feed");
  assert.equal(ex.length, 3);
  assert.equal(ex[0].instruction, "What recurring pattern does the speed-feed domain follow regarding Kienzle force model?");
  assert.equal(ex[1].instruction, "What is the speed-feed domain's rule or decision about Import constants?");
  assert.equal(ex[2].instruction, "What open thread or unresolved work remains in the speed-feed domain regarding Vendor parity?");
  assert.match(ex[0].input, /speed-feed domain synthesis \(advisory/);
  assert.match(ex[0].output, /^\*\*Kienzle force model\*\*/);
  assert.equal(ex[0]._galaxy, "speed-feed");
  assert.equal(ex[0]._advisory, true);
});

test("buildExamplesFromSynthesis skips a too-thin bullet (failure mode)", () => {
  // WHY: a 5-char rule teaches nothing; it dilutes the set and must be dropped.
  const md = ["## Recurring patterns", "- **x** -- short"].join("\n");
  assert.equal(buildExamplesFromSynthesis(md, "mill").length, 0);
});

test("buildExamplesFromSynthesis returns [] for empty galaxy or empty body (adversarial)", () => {
  const md = ["## Recurring patterns", "- **Long enough** -- this bullet is plenty long enough to keep."].join("\n");
  assert.deepEqual(buildExamplesFromSynthesis(md, ""), []);
  assert.deepEqual(buildExamplesFromSynthesis("---\nx\n---\n", "mill"), []);
});

// ---- galaxyFromSynthesisFile -----------------------------------------------

test("galaxyFromSynthesisFile maps a galaxy synthesis filename to its slug", () => {
  assert.equal(galaxyFromSynthesisFile("speed-feed_synthesis.md"), "speed-feed");
  assert.equal(galaxyFromSynthesisFile("ai-training_synthesis.md"), "ai-training");
});

test("galaxyFromSynthesisFile excludes _meta + non-synthesis files (failure mode)", () => {
  // WHY: _meta_synthesis.md is the FLEET meta-synthesis, not a galaxy -- training
  // a per-galaxy signal on it would mislabel cross-galaxy content as one galaxy.
  assert.equal(galaxyFromSynthesisFile("_meta_synthesis.md"), null);
  assert.equal(galaxyFromSynthesisFile("feedback_check_units.md"), null);
  assert.equal(galaxyFromSynthesisFile(""), null);
  assert.equal(galaxyFromSynthesisFile(null), null);
});

// ---- live vault scan (R15 step-3 validation in-suite) -----------------------

test("collectGalaxySynthesisExamples extracts galaxy-tagged pairs from the live vault", () => {
  // WHY: the validation gate. 2026-06-10 live: 35 synthesis files (34 galaxies +
  // _meta). Assert conservative floors so a parser break (-> 0) fails loud while
  // normal corpus growth does not.
  const { examples, galaxies, scanned, skipped } = collectGalaxySynthesisExamples();
  assert.ok(scanned >= 30, `expected >=30 synthesis files scanned, got ${scanned}`);
  assert.ok(galaxies >= 25, `expected >=25 galaxies with pairs, got ${galaxies}`);
  assert.ok(examples.length >= 100, `expected >=100 galaxy pairs, got ${examples.length}`);
  assert.ok(!examples.some((e) => e._galaxy === "_meta"), "_meta_synthesis must not yield pairs");
  assert.ok(skipped <= scanned, "skipped cannot exceed files scanned");
  for (const e of examples) {
    assert.ok(e.instruction.length > 0, "instruction must be non-empty");
    assert.ok(e.output.length >= 40, "output must clear the bullet floor");
    assert.equal(e._advisory, true, "galaxy pairs must be tagged advisory");
    assert.ok(e._galaxy && e._galaxy.length > 0, "galaxy tag must be present");
    assert.match(e.input, /advisory/, "advisory provenance must live in the input");
  }
});

test("galaxy + feedback sources stay distinct (no cross-contamination)", () => {
  // WHY: the verified-feedback pair MUST NOT carry the advisory/galaxy tags, so a
  // downstream merge or filter can always tell the two signals apart.
  const fb = buildExampleFromFeedback(
    "---\nname: feedback_x\ndescription: d\nmetadata:\n  type: feedback\n---\n" + "z".repeat(200),
    "feedback_x.md",
  );
  assert.ok(fb);
  assert.equal(fb._galaxy, undefined, "feedback pairs must not carry a galaxy tag");
  assert.equal(fb._advisory, undefined, "feedback pairs must not be advisory");
});

// ---- resolveGalaxyOutPath (clobber-guard, U-LORA-GALAXY-SYNTHESIS-GUARD-TEST) --

test("resolveGalaxyOutPath redirects a bare --out (DEFAULT_OUT) to the galaxy dataset", () => {
  // WHY: the single most safety-critical line. A bare `--out` in --source galaxy
  // resolves to the FEEDBACK file (DEFAULT_OUT); galaxy (advisory) pairs must be
  // redirected to DEFAULT_SYNTH_OUT so they can never clobber verified doctrine.
  assert.equal(resolveGalaxyOutPath(DEFAULT_OUT), DEFAULT_SYNTH_OUT);
});

test("resolveGalaxyOutPath passes a distinct explicit path through unchanged", () => {
  const explicit = path.join(path.dirname(DEFAULT_SYNTH_OUT), "my-custom-galaxy.jsonl");
  assert.equal(resolveGalaxyOutPath(explicit), explicit);
});

test("resolveGalaxyOutPath catches an ALIASED path that resolves to the feedback file (adversarial)", () => {
  // WHY: a string-equality guard (the original) misses a path that is a DIFFERENT
  // string but resolves to the SAME file (e.g. a redundant ./ segment, a relative
  // form, a `..` traversal). The canonical path.resolve compare catches it. This
  // test FAILS under the old `outPath === DEFAULT_OUT` guard -> proves the hardening.
  const dir = DEFAULT_OUT.slice(0, DEFAULT_OUT.lastIndexOf(path.sep));
  const alias = dir + path.sep + "." + path.sep + path.basename(DEFAULT_OUT);
  assert.notEqual(alias, DEFAULT_OUT, "alias must be a different string than DEFAULT_OUT");
  assert.equal(path.resolve(alias), path.resolve(DEFAULT_OUT), "alias must resolve to the same file");
  assert.equal(resolveGalaxyOutPath(alias), DEFAULT_SYNTH_OUT, "an alias of the feedback file must still be redirected");
});

test("resolveGalaxyOutPath returns falsy input unchanged (dry-run path, edge case)", () => {
  // WHY: no --out (dry-run) passes null/undefined through; the resolver must not
  // coerce that into a write path.
  assert.equal(resolveGalaxyOutPath(null), null);
  assert.equal(resolveGalaxyOutPath(undefined), undefined);
  assert.equal(resolveGalaxyOutPath(""), "");
});
