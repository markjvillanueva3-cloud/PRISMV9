/**
 * vault-lessons-to-lora-dataset.mjs -- turn PRISM's failure->fix corpus (the
 * wiki code-tribal/learnings/*.md auto-distilled lessons) into LoRA
 * instruction-tuning pairs. (AI-SYSTEMS-LORA, slot:alpha 2026-06-17.)
 *
 * WHY (the gap this closes):
 *   The existing vault->LoRA feed (vault-to-lora-dataset.mjs) mines two DOCTRINE
 *   sources: feedback/*.md (313 rule pairs) and <galaxy>_synthesis.md brains.
 *   Neither reads PRISM's richest training signal: the ~2,625 auto-distilled
 *   code-tribal LEARNINGS -- each a real "symptom -> root cause -> fix" narrative
 *   captured the moment a bug/regression was closed. For a CODING LoRA this is
 *   premium data: it teaches the model to recognize a symptom and reason to the
 *   root cause + the fix (and to AVOID the documented silent-failure modes),
 *   which doctrine rules alone do not.
 *
 * R8 (reuse, don't reinvent): imports splitFrontmatter + the Alpaca schema
 *   convention from vault-to-lora-dataset.mjs. Emits the SAME
 *   { instruction, input, output } shape so the pairs drop into the same
 *   training pipeline india's rsLoRA run consumes (and registers with the same
 *   fleet-training corpus manifest -- see scripts/assemble-fleet-lora-corpus.mjs).
 *
 * R12 (quality over volume -- a low-signal pair dilutes the adapter): only
 *   entries with a genuine failure-signal marker (root cause / regression /
 *   silent / fix: / lesson / fail-loud / race / corruption / leak / OOM / "->")
 *   AND a meaningful narrative length pass the gate. The node-pointer reference
 *   memories (auto-generated "indexed pointer" stubs) are NOT a source -- they
 *   carry no lesson body.
 *
 * SOURCE SEPARATION: writes its OWN dataset file (vault-lessons-dataset.jsonl),
 *   never merged with the hand-authored verified-feedback set -- mirrors the way
 *   the galaxy-synthesis source keeps its own file (a distilled-from-prose pair
 *   is a different trust tier than a hand-authored rule).
 *
 * USAGE:
 *   node scripts/vault-lessons-to-lora-dataset.mjs                  # dry-run: counts + sample + rejection rate
 *   node scripts/vault-lessons-to-lora-dataset.mjs --out <path>     # write the JSONL dataset
 *   node scripts/vault-lessons-to-lora-dataset.mjs --limit N        # cap entries scanned (debug)
 *
 * Pure-export contract (for tests): parseLearningEntry, stripLessonNoise,
 *   isHighSignalLesson, instructionForLesson, lessonToAlpaca, dedupPairs,
 *   collectLessonExamples.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { splitFrontmatter } from "./vault-to-lora-dataset.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const LEARNINGS_DIR = path.join(ROOT, "knowledge", "wiki", "code-tribal", "learnings");
export const DEFAULT_OUT = path.join(ROOT, "state", "shared", "lora", "vault-lessons-dataset.jsonl");

// A lesson narrative shorter than this is a one-line subject echo, not a real
// symptom->root-cause->fix story -- too thin to teach anything.
export const MIN_LESSON_CHARS = 200;

// Failure-signal markers: a learning that teaches a debugging lesson names a
// failure mode and/or a fix. Routine additive commits (a field rename, a doc
// tweak) lack these -- excluding them keeps the corpus high-signal. Case-insensitive.
const SIGNAL_RE =
  /\b(root cause|regression|silent|fail[- ]?loud|race condition|deadlock|corrupt|clobber|leak|OOM|out[- ]of[- ]memory|miscount|false[- ](positive|negative)|over[- ]?count|fix:|lesson:|the fix\b|the bug\b|poison)/i;

/**
 * The commit-subject boilerplate prefix every distilled learning carries, e.g.
 * "[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [SCOPE-MS0]/U-ID (slot:alpha): ". Stripping it
 * leaves the actual narrative as the training target (the bracket tags + slot
 * are PRISM-process noise, not a transferable lesson). ASCII-only pattern.
 */
// The scope token is the LAST bracketed tag, directly followed by `/U-ID`:
// "[MAIN] [BOOTSTRAP] [SCOPE-MS0]/U-ID (slot:alpha): ". The bracket sequence is
// one-or-more; a bare (unbracketed) scope is also tolerated. The `(slot:x)`
// segment is OPTIONAL -- ~971 corpus learnings use the slot-less form
// "[MAIN] [SCOPE]/U-ID: text" (scrutiny arm-A P1: a mandatory slot group left
// the boilerplate in 34% of pairs). The slot paren also tolerates trailing text
// like "(slot:alpha, taking over for lima)".
// From the bracket/scope tags + `/U-<id>` the prefix runs to the terminating
// ": " (colon-space). The U-id can be `+`-joined ("/U-A+U-B"), carry free text
// ("/U-A7 close-out"), and/or a "(slot:...)" paren whose INTERNAL colon must not
// end the match -- all real corpus shapes that a simpler pattern leaked
// (scrutiny arm-A). Terminator is `:` followed by whitespace.
// The unit id after `/` is NOT always "U-" prefixed: "/U-FOO", "/P0.3-B-followup",
// "/U-H1.0-BUNDLE-AWARE" all occur (3-of-3 arm-A P1 + the P0.3 follow-up). So the id
// is any token `[A-Za-z0-9._+-]+`. To avoid stripping a real narrative that merely
// starts with "/word: ", the prefix MUST be anchored by >=1 bracket tag OR a bare
// uppercase scope before the `/id`. Tolerates `+`-joined ids, free text, and a
// "(slot:...)" paren (internal colon) before the terminating ": ".
const PREFIX_RE = /^(?:(?:\[[^\]]*\]\s*)+(?:[A-Z0-9][A-Z0-9-]*)?|[A-Z0-9][A-Z0-9-]*)\/[A-Za-z0-9._+-]+(?:\s+[^:()\n]*)?(?:\([^)]*\)\s*)?:\s+/;

/**
 * Parse a code-tribal learning .md into { title, subject, body }.
 *   title   = the first `# ...` heading line (one-line summary)
 *   subject = the `## Subject` section text (the symptom / what changed)
 *   body    = the `## Body` fenced narrative (the lesson: root cause + fix)
 * Robust to a missing section (returns "" for it). Strips a leading frontmatter
 * block if present (these files usually have none).
 */
export function parseLearningEntry(md) {
  if (typeof md !== "string" || md.length === 0) return { title: "", subject: "", body: "" };
  const { body: afterFm } = splitFrontmatter(md);
  const text = (afterFm && afterFm.length ? afterFm : md).replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const titleMatch = text.match(/^#\s+(.+?)\s*$/m);
  const title = titleMatch ? titleMatch[1].trim() : "";

  const section = (heading) => {
    // Capture from "## <heading>" up to the next "## " heading or end-of-doc.
    // Slice-based (NOT a single regex): a multiline `$` lookahead matches every
    // line-end, which would truncate a lazy capture to the first line -- the bug
    // that made the first cut of this parser accept 0/2625. Find the heading,
    // then slice to the next "## " heading (search returns -1 -> to EOF).
    const startRe = new RegExp(`(^|\\n)##\\s+${heading}\\s*\\n`);
    const sm = text.match(startRe);
    if (!sm) return "";
    const rest = text.slice(sm.index + sm[0].length);
    const nextIdx = rest.search(/\n##\s/);
    return (nextIdx === -1 ? rest : rest.slice(0, nextIdx)).trim();
  };

  let subject = section("Subject");
  let body = section("Body");
  // The Body is usually wrapped in a ``` code fence -- unwrap it.
  const fence = body.match(/^```[a-z]*\n([\s\S]*?)\n```$/);
  if (fence) body = fence[1].trim();
  return { title, subject, body };
}

/**
 * Strip PRISM-process noise so the training target is the transferable lesson:
 *   - the "[TAGS] SCOPE/U-ID (slot:x): " commit-subject prefix
 *   - surrounding code-fence markers
 * Conservative: only removes known-boilerplate shapes, never mid-narrative text.
 */
export function stripLessonNoise(text) {
  if (typeof text !== "string") return "";
  let out = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  out = out.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
  out = out.replace(PREFIX_RE, "").trim();
  return out;
}

/**
 * A lesson is high-signal IFF its narrative names a failure mode / fix AND is
 * long enough to carry the reasoning. Gate input is the STRIPPED body.
 */
export function isHighSignalLesson(body) {
  if (typeof body !== "string") return false;
  const b = body.trim();
  if (b.length < MIN_LESSON_CHARS) return false;
  return SIGNAL_RE.test(b);
}

/**
 * Choose an instruction phrasing by the lesson's own content, so 2,600+ pairs
 * do NOT all share one instruction (which would teach the model to ignore the
 * instruction field). Deterministic -- keyed on which markers the body carries.
 */
export function instructionForLesson(body) {
  const b = typeof body === "string" ? body : "";
  if (/\broot cause\b/i.test(b))
    return "Diagnose the root cause of this PRISM engineering issue and explain the fix.";
  if (/\b(regression|silent|fail[- ]?loud|false[- ](positive|negative))\b/i.test(b))
    return "What failure mode did this PRISM change address, and how was it fixed without weakening any gate?";
  if (/\blesson:?\b/i.test(b))
    return "What engineering lesson does this PRISM change teach, and how should it be applied in future work?";
  return "Explain what was changed in this PRISM fix and why it matters.";
}

// Diagnosis markers: the point in a lesson where the SYMPTOM narrative turns
// into the ROOT-CAUSE / FIX explanation. STRUCTURAL only -- "root cause", "fix:",
// "lesson:" reliably START a diagnosis clause. Weak phrases ("the fix", "the real
// bug") were DROPPED as split points (scrutiny arm-B P1: "the fix protects..."
// matched mid-sentence and cut the narrative incoherently); they remain in the
// acceptance SIGNAL_RE, just not as split anchors.
const DIAGNOSIS_RE = /\b(root cause|fix:|lesson:?)\b/i;

// Trailing process-noise tails that a commit message accretes AFTER the lesson:
// test tallies, scrutiny verdicts, memory/wiki/report pointers. Stripped from the
// diagnosis so the training target ends on the lesson, not on "17/17 tests pass"
// (scrutiny arm-B P1).
// No trailing \b after the group: markers ending in ":" (TESTS:, Report:) have a
// non-word ":" so a following \b never matches (the bug that left tails in).
const TRAILING_NOISE_RE =
  /(?:^|\n|\.\s|;\s)\s*(TESTS?:|Tests?:|Test:|Scrutiny\b|3-of-3\b|per-file\b|Memory\s|Memory:|Wiki\b|Wiki:|Report:|Round auto-captured|Commit:|Files? touched)[\s\S]*$/i;

export function stripTrailingNoise(text) {
  if (typeof text !== "string") return "";
  return text.replace(TRAILING_NOISE_RE, "").trim();
}

/**
 * Split a lesson narrative at the first structural diagnosis marker into
 * { symptom, diagnosis }, or null if there is no clean split (both sides must
 * carry real content). The marker is anchored to a SENTENCE BOUNDARY: the
 * symptom keeps the complete leading sentence(s) and the diagnosis starts at the
 * sentence that introduces the marker -- so the cut is never mid-clause (scrutiny
 * arm-B P1). Trailing test/scrutiny tails are stripped off the diagnosis. This is
 * what makes the pair teach symptom->diagnosis REASONING rather than verbatim echo
 * (R9: a pair whose output is its input is worthless / teaches copying).
 */
export function splitSymptomDiagnosis(narrative) {
  if (typeof narrative !== "string") return null;
  const m = narrative.match(DIAGNOSIS_RE);
  if (!m) return null;
  // Back up to the sentence boundary preceding the marker so the diagnosis starts
  // at a clause start (not mid-sentence). lastIndexOf over ". " / "\n" in the head.
  const head = narrative.slice(0, m.index);
  const dot = head.lastIndexOf(". ");
  const nl = head.lastIndexOf("\n");
  const boundary = Math.max(dot, nl);
  const cut = boundary > 30 ? boundary + 1 : m.index;
  const symptom = narrative.slice(0, cut).trim().replace(/[\s:;,-]+$/, "");
  const diagnosis = stripTrailingNoise(narrative.slice(cut).trim());
  // Both halves must be substantial: a 3-word symptom or a 1-line "fix:" tail is
  // not a teachable reasoning pair.
  if (symptom.length < 40 || diagnosis.length < 60) return null;
  return { symptom, diagnosis };
}

/**
 * Map a parsed learning to an Alpaca pair, or null if it fails the quality gate.
 *   instruction = a debugging task prompt (the input carries the specific case)
 *   input       = the SYMPTOM (the narrative before the root-cause/fix marker)
 *   output      = the DIAGNOSIS + FIX (from the marker to the end)
 * Requires a clean symptom->diagnosis split so the pair teaches reasoning, never
 * an input==output echo. Uses the body; falls back to the subject as the source
 * narrative if the body is empty.
 */
export function lessonToAlpaca(entry) {
  if (!entry || typeof entry !== "object") return null;
  let narrative = stripLessonNoise(entry.body || "");
  if (!isHighSignalLesson(narrative)) {
    const subj = stripLessonNoise(entry.subject || "");
    if (isHighSignalLesson(subj)) narrative = subj;
    else return null;
  }
  const split = splitSymptomDiagnosis(narrative);
  if (!split) return null;
  // Belt-and-suspenders: re-strip a residual leading prefix off the symptom (the
  // prefix sits at the body start = symptom start). A mid-narrative "[MAIN-FORCE]"
  // mention deeper in the text is legitimate CONTENT and is left alone.
  const input = stripLessonNoise(split.symptom);
  if (input.length < 40) return null;
  return {
    instruction: instructionForLesson(split.diagnosis),
    input,
    output: split.diagnosis,
  };
}

/**
 * Dedup pairs by normalized output (the lesson narrative). The distiller can emit
 * near-identical learnings for sibling commits; collapsing them keeps the adapter
 * from over-weighting one lesson. Normalization: lowercase + collapse whitespace.
 */
export function dedupPairs(pairs) {
  if (!Array.isArray(pairs)) return [];
  const seen = new Set();
  const out = [];
  for (const p of pairs) {
    if (!p || typeof p.output !== "string") continue;
    const key = p.output.toLowerCase().replace(/\s+/g, " ").trim();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

/**
 * Scan the learnings dir, parse + gate + dedup. Returns
 * { examples, scanned, accepted, rejected, deduped }.
 */
export function collectLessonExamples(dir = LEARNINGS_DIR, opts = {}) {
  const limit = Number.isFinite(opts.limit) ? opts.limit : Infinity;
  let files = [];
  try { files = fs.readdirSync(dir).filter((f) => f.endsWith(".md")); }
  catch { return { examples: [], scanned: 0, accepted: 0, rejected: 0, deduped: 0 }; }

  const raw = [];
  let scanned = 0, rejected = 0, lowSignal = 0, signalButUnsplittable = 0;
  for (const f of files) {
    if (scanned >= limit) break;
    scanned++;
    let md = "";
    try { md = fs.readFileSync(path.join(dir, f), "utf8"); }
    catch { rejected++; lowSignal++; continue; }
    const entry = parseLearningEntry(md);
    const pair = lessonToAlpaca(entry);
    if (!pair) {
      // R12 honesty (3-of-3 arm-B P2): a reject is "low-signal" only if the
      // narrative carries no failure marker. A narrative that PASSED the signal
      // gate but had no clean symptom/diagnosis split is "signal-but-unsplittable"
      // -- a real lesson conservatively dropped, NOT noise. Report them apart so
      // the true recall ceiling is visible.
      const body = stripLessonNoise(entry.body || "");
      const subj = stripLessonNoise(entry.subject || "");
      if (isHighSignalLesson(body) || isHighSignalLesson(subj)) signalButUnsplittable++;
      else lowSignal++;
      rejected++;
      continue;
    }
    raw.push(pair);
  }
  const examples = dedupPairs(raw);
  return {
    examples,
    scanned,
    accepted: raw.length,
    rejected,
    lowSignal,
    signalButUnsplittable,
    deduped: raw.length - examples.length,
  };
}

function parseArgs(argv) {
  const out = { write: false, out: DEFAULT_OUT, limit: Infinity };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out") { out.write = true; out.out = argv[++i] || DEFAULT_OUT; }
    else if (a === "--limit") { out.limit = Number(argv[++i]) || Infinity; }
    else if (a === "--help" || a === "-h") {
      console.error("usage: vault-lessons-to-lora-dataset [--out <path>] [--limit N]");
      process.exit(0);
    }
  }
  return out;
}

export function main() {
  const opts = parseArgs(process.argv.slice(2));
  const { examples, scanned, accepted, rejected, lowSignal, signalButUnsplittable, deduped } = collectLessonExamples(LEARNINGS_DIR, { limit: opts.limit });
  const acceptRate = scanned > 0 ? (accepted / scanned) : 0;
  const signalBearing = accepted + signalButUnsplittable;
  const recall = signalBearing > 0 ? (accepted / signalBearing) : 0;

  console.log(`vault-lessons-to-lora-dataset:`);
  console.log(`  scanned   : ${scanned} learning files`);
  console.log(`  accepted  : ${accepted} (${(acceptRate * 100).toFixed(1)}% of scanned)`);
  console.log(`  rejected  : ${rejected} = ${lowSignal} low-signal (no failure marker) + ${signalButUnsplittable} signal-but-unsplittable (real lesson, no clean symptom/diagnosis split)`);
  console.log(`  recall    : ${accepted}/${signalBearing} signal-bearing = ${(recall * 100).toFixed(1)}% (the honest yield ceiling, NOT the ${(acceptRate * 100).toFixed(1)}% scanned rate)`);
  console.log(`  deduped   : ${deduped} near-duplicate outputs collapsed`);
  console.log(`  FINAL     : ${examples.length} unique high-signal Alpaca pairs`);
  if (examples.length) {
    const s = examples[0];
    console.log(`  sample    : instruction="${s.instruction}"`);
    console.log(`              input="${s.input.slice(0, 90)}..."`);
    console.log(`              output="${s.output.slice(0, 90)}..."`);
  }

  if (!opts.write) {
    console.log(`  (dry-run -- pass --out to write ${path.relative(ROOT, opts.out)})`);
    return;
  }

  // CLOBBER GUARD (scrutiny arm-B P2): never write over a hand-authored verified
  // dataset -- those are a different (full-weight) trust tier and are not regenerable.
  const PROTECTED = new Set(["vault-feedback-dataset.jsonl"]);
  if (PROTECTED.has(path.basename(opts.out))) {
    throw new Error(`refusing to write the hand-authored verified set ${path.basename(opts.out)} -- pick a different --out`);
  }

  // The JSONL contains ONLY training pairs. The meta/stats go to a .meta.json
  // SIDECAR + console, never an inline row (scrutiny arm-B P0: an inline
  // {instruction:"__meta__", output:<json>} row is NOT filtered by the assembler
  // or fleet_lora_train.py -> it becomes a real training pair teaching the adapter
  // to emit a stats blob. The sibling feeders write examples-only too).
  const meta = {
    source: "knowledge/wiki/code-tribal/learnings",
    generator: "vault-lessons-to-lora-dataset.mjs",
    generated_at: new Date().toISOString(),
    scanned, accepted, rejected, deduped, pairs: examples.length,
    schema: "alpaca-instruction-input-output",
    trust_tier: "distilled-failure-fix (NOT hand-authored doctrine; keep separate)",
  };
  fs.mkdirSync(path.dirname(opts.out), { recursive: true });
  const lines = examples.map((e) => JSON.stringify(e)).join("\n") + "\n";
  // pid-suffixed tmp so a concurrent run (cron + manual) cannot race on one tmp
  // path and rename a partially-written file (3-of-3 arm-C P2).
  const tmp = `${opts.out}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, lines);
  fs.renameSync(tmp, opts.out);
  fs.writeFileSync(opts.out.replace(/\.jsonl$/i, "") + ".meta.json", JSON.stringify(meta, null, 2));
  console.log(`  WROTE ${examples.length} pairs -> ${path.relative(ROOT, opts.out)} (+ .meta.json sidecar, NO inline meta row)`);
}

const isMain = (() => {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
})();
if (isMain) main();
