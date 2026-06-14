// distill-tribal.test.mjs -- tests for the IdeaBlock distiller + Ollama-gated Q-A
// ================================================================================
// U-TRIBAL-QA-LLM-UNBLOCK (slot:sierra, 2026-06-09). Covers:
//   - TF-IDF clustering intent (near-dupes merge, distinct stay apart)
//   - LLM Q-A synthesis gate: ollama-up -> LLM, down/--no-llm -> heuristic
//   - per-cluster fail-soft (model failure or unusable text -> heuristic)
//   - prompt build / response sanitize (adversarial inputs)
//   - a real round-trip through main() redirected to a tmpdir (never the live
//     canonical/ dir) asserting the emitted qa_via reflects the actual method.
//
// Run: node --test scripts/distill-tribal.test.mjs   (rtk node --test ...)

import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
  tokenize,
  cosine,
  buildTfIdf,
  clusterByThreshold,
  slugify,
  deriveQuestion,
  deriveTitle,
  buildQaPrompt,
  sanitizeQuestion,
  deriveQuestionLLM,
  renderIdeaBlock,
  parseArgs,
  main,
} from "./distill-tribal.mjs";

// ---------------------------------------------------------------- helpers
function fakeIndex(tips) {
  const obj = {};
  for (const t of tips) obj[t.id] = t;
  return { schemaVersion: 1, tips: obj };
}

const TIPS = [
  {
    id: "tip-okuma-1",
    sha256: "aaaa1111bbbb2222cccc3333dddd4444eeee5555ffff6666aaaa7777bbbb8888",
    domain: "lathe",
    confidence: 0.9,
    source: "okuma/threadmill.md",
    content: "Okuma thread milling: set the pitch via the G code parameter before the cycle starts to avoid crashing the spindle into the bore.",
  },
  {
    id: "tip-okuma-2",
    sha256: "1111aaaa2222bbbb3333cccc4444dddd5555eeee6666ffff7777aaaa8888bbbb",
    domain: "lathe",
    confidence: 0.7,
    source: "okuma/threadmill-dup.md",
    content: "Okuma thread milling set the pitch via the G code parameter before the cycle to avoid crashing the spindle",
  },
  {
    id: "tip-inconel-1",
    sha256: "9999aaaa8888bbbb7777cccc6666dddd5555eeee4444ffff3333aaaa2222bbbb",
    domain: "mill",
    confidence: 0.8,
    source: "materials/inconel.md",
    content: "Inconel roughing requires low SFM and a constant chip load to prevent work hardening at the cutting edge during the pass.",
  },
];

// ---------------------------------------------------------------- TF-IDF / clustering
test("tokenize drops stopwords, punctuation, and short tokens", () => {
  const toks = tokenize("The Okuma set-up, by far, IS very tricky!");
  assert.ok(toks.includes("okuma"));
  assert.ok(toks.includes("set"));   // 'set-up' -> 'set' 'up'; 'up' is a stopword
  assert.ok(toks.includes("tricky"));
  assert.ok(!toks.includes("the"));  // stopword
  assert.ok(!toks.includes("is"));   // stopword
  assert.ok(!toks.includes("up"));   // stopword
});

test("clustering merges near-duplicate tips and keeps distinct ones apart", () => {
  const docs = TIPS.map(t => tokenize(t.content));
  const vecs = buildTfIdf(docs);
  const clusters = clusterByThreshold(vecs, 0.5);
  // The two Okuma tips are near-dupes -> one cluster; Inconel stands alone.
  assert.equal(clusters.length, 2);
  const sizes = clusters.map(c => c.length).sort();
  assert.deepEqual(sizes, [1, 2]);
});

test("cosine of identical vectors is ~1 and orthogonal is 0", () => {
  const [a] = buildTfIdf([tokenize("mill roughing inconel")]);
  const [b] = buildTfIdf([tokenize("mill roughing inconel")]);
  assert.ok(cosine(a, b) > 0.99);
  const [c] = buildTfIdf([tokenize("lathe threading okuma")]);
  // No shared terms -> dot product 0.
  assert.equal(cosine(a, c), 0);
});

test("slugify is filesystem-safe and never empty", () => {
  assert.equal(slugify("Okuma: Thread/Milling!! pitch"), "okuma-thread-milling-pitch");
  assert.equal(slugify("***"), "untitled");
  assert.ok(slugify("x".repeat(200)).length <= 60);
});

// ---------------------------------------------------------------- heuristic Q-A
test("deriveQuestion produces a How-do-I question; falls back to domain when thin", () => {
  const q = deriveQuestion("Rough Inconel slowly with constant chip load", "mill");
  assert.ok(q.startsWith("How do I "));
  assert.ok(q.endsWith("?"));
  // Thin content -> domain fallback.
  assert.equal(deriveQuestion("ok", "wedm"), "How do I wedm?");
});

// ---------------------------------------------------------------- prompt build
test("buildQaPrompt embeds domain + tip and the single-question instruction; caps tip length", () => {
  const p = buildQaPrompt("a".repeat(5000), "lathe");
  assert.ok(p.includes("Domain: lathe"));
  assert.ok(/ONE concise question/i.test(p));
  assert.ok(/Output ONLY the question/i.test(p));
  // Tip is bounded to ~1200 chars so generation stays fast.
  const tipLine = p.split("\n").find(l => l.startsWith("Tip: "));
  assert.ok(tipLine.length <= 1200 + "Tip: ".length + 5);
});

// ---------------------------------------------------------------- sanitize (adversarial)
test("sanitizeQuestion cleans common model output shapes", () => {
  assert.equal(sanitizeQuestion('"How do I rough Inconel?"'), "How do I rough Inconel?");
  assert.equal(sanitizeQuestion("```\nWhat SFM for Inconel?\n```"), "What SFM for Inconel?");
  assert.equal(sanitizeQuestion("- How do I tap blind holes"), "How do I tap blind holes?"); // list marker + missing ?
  // Trailing chatter after the question mark is dropped.
  assert.equal(
    sanitizeQuestion("How do I set pitch? This question helps machinists."),
    "How do I set pitch?"
  );
});

test("sanitizeQuestion rejects garbage and non-strings (null -> heuristic fallback upstream)", () => {
  assert.equal(sanitizeQuestion(""), null);
  assert.equal(sanitizeQuestion("   "), null);
  assert.equal(sanitizeQuestion("x?"), null);                 // too short
  assert.equal(sanitizeQuestion("12345678?"), null);          // no letters
  assert.equal(sanitizeQuestion(null), null);
  assert.equal(sanitizeQuestion(42), null);
  // Model echoing the instruction back is rejected.
  assert.equal(sanitizeQuestion("Output ONLY the question, max 18 words?"), null);
});

// ---------------------------------------------------------------- deriveQuestionLLM gate
test("deriveQuestionLLM uses the model output when usable (method=llm:<model>)", async () => {
  const calls = [];
  const callImpl = async (model, prompt) => {
    calls.push({ model, prompt });
    return { ok: true, text: "How do I set thread-mill pitch on the Okuma?" };
  };
  const r = await deriveQuestionLLM("Okuma thread milling pitch via G code", "lathe", {
    model: "qwen2.5-coder:32b",
    callImpl,
  });
  assert.equal(r.question, "How do I set thread-mill pitch on the Okuma?");
  assert.equal(r.method, "llm:qwen2.5-coder:32b");
  assert.equal(calls.length, 1);
  assert.ok(calls[0].prompt.includes("Domain: lathe"));
});

test("deriveQuestionLLM falls back to heuristic when the model call fails (ok:false)", async () => {
  const callImpl = async () => ({ ok: false, error: "Ollama unreachable: ECONNREFUSED" });
  const r = await deriveQuestionLLM("Rough Inconel with low SFM and constant chip load", "mill", {
    model: "qwen2.5-coder:32b",
    callImpl,
  });
  assert.equal(r.method, "heuristic-fallback");
  assert.ok(r.question.startsWith("How do I "));
});

test("deriveQuestionLLM falls back when the model returns unusable text", async () => {
  const callImpl = async () => ({ ok: true, text: "```\n\n```" }); // sanitizes to null
  const r = await deriveQuestionLLM("Tap blind holes with peck cycle", "mill", {
    model: "qwen2.5-coder:32b",
    callImpl,
  });
  assert.equal(r.method, "heuristic-fallback");
  assert.ok(r.question.startsWith("How do I "));
});

test("deriveQuestionLLM with no model never calls the LLM (heuristic-fallback)", async () => {
  let called = false;
  const callImpl = async () => { called = true; return { ok: true, text: "x?" }; };
  const r = await deriveQuestionLLM("content here", "mill", { model: null, callImpl });
  assert.equal(called, false);
  assert.equal(r.method, "heuristic-fallback");
});

// ---------------------------------------------------------------- parseArgs
test("parseArgs defaults + flags + env model override", () => {
  const d = parseArgs([]);
  assert.equal(d.threshold, 0.8);
  assert.equal(d.sample, null);
  assert.equal(d.dryRun, false);
  assert.equal(d.noLlm, false);

  const f = parseArgs(["--threshold=0.85", "--sample=50", "--no-llm", "--model=gpt-oss:120b"]);
  assert.equal(f.threshold, 0.85);
  assert.equal(f.sample, 50);
  assert.equal(f.noLlm, true);
  assert.equal(f.model, "gpt-oss:120b");

  const prev = process.env.PRISM_DISTILL_TRIBAL_MODEL;
  process.env.PRISM_DISTILL_TRIBAL_MODEL = "qwen2.5-coder:32b";
  try {
    assert.equal(parseArgs([]).model, "qwen2.5-coder:32b");
    // explicit --model wins over env
    assert.equal(parseArgs(["--model=moondream:1.8b"]).model, "moondream:1.8b");
  } finally {
    if (prev === undefined) delete process.env.PRISM_DISTILL_TRIBAL_MODEL;
    else process.env.PRISM_DISTILL_TRIBAL_MODEL = prev;
  }
});

// ---------------------------------------------------------------- render uses the passed Q-A (non-tautological)
test("renderIdeaBlock emits the passed question + qa_via method (mutation-verified)", () => {
  const record = {
    canonical: TIPS[2],
    members: [TIPS[2]],
    domain: "mill",
    sources: [`${TIPS[2].id}:${TIPS[2].sha256}`],
    confidence: 0.8,
    question: "What SFM keeps Inconel from work hardening?",
    qaMethod: "llm:qwen2.5-coder:32b",
  };
  const md = renderIdeaBlock(record, 0.8);
  assert.ok(md.includes("What SFM keeps Inconel from work hardening?"));
  assert.ok(md.includes('qa_via: "llm:qwen2.5-coder:32b"'));
  assert.ok(md.includes("extracted_via: tf-idf-cosine-0.8"));
  assert.ok(md.includes("- Q-A extraction: llm:qwen2.5-coder:32b"));

  // Mutate the question -> output changes (the assertion is not tautological).
  const md2 = renderIdeaBlock({ ...record, question: "DIFFERENT QUESTION?" }, 0.8);
  assert.ok(md2.includes("DIFFERENT QUESTION?"));
  assert.ok(!md2.includes("What SFM keeps Inconel from work hardening?"));
});

// ---------------------------------------------------------------- main() round-trip (tmpdir-redirected)
async function withTmp(fn) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "distill-test-"));
  const indexPath = path.join(dir, "TRIBAL_TIP_INDEX.json");
  const outputDir = path.join(dir, "canonical");
  await fs.writeFile(indexPath, JSON.stringify(fakeIndex(TIPS)), "utf-8");
  try {
    return await fn({ dir, indexPath, outputDir });
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

test("main(): Ollama UP -> LLM Q-A path, emitted blocks carry qa_via llm:<model>", async () => {
  await withTmp(async ({ indexPath, outputDir }) => {
    const callImpl = async () => ({ ok: true, text: "How do I do this op safely?" });
    const fetchModelsFn = async () => ["qwen2.5-coder:32b", "nomic-embed-text"];
    const resolveModelFn = async () => ({ model: "qwen2.5-coder:32b", source: "blackwell-best", tier: "best" });

    const res = await main(
      { threshold: 0.5, sample: null, dryRun: false, noLlm: false, model: null },
      { indexPath, outputDir, callImpl, fetchModelsFn, resolveModelFn }
    );
    assert.equal(res.useLlm, true);
    assert.equal(res.qaModel, "qwen2.5-coder:32b");
    assert.ok(res.qaCounts.llm >= 1);

    const audit = JSON.parse(await fs.readFile(path.join(outputDir, "_DISTILL_LOG.json"), "utf-8"));
    assert.equal(audit.schemaVersion, 2);
    assert.equal(audit.qaModel, "qwen2.5-coder:32b");
    assert.ok(audit.qaExtractionMethod.startsWith("llm:qwen2.5-coder:32b"));

    // At least one emitted markdown block carries the LLM qa_via.
    const files = (await fs.readdir(outputDir)).filter(f => f.endsWith(".md"));
    assert.ok(files.length >= 1);
    const sample = await fs.readFile(path.join(outputDir, files[0]), "utf-8");
    assert.ok(sample.includes('qa_via: "llm:qwen2.5-coder:32b"'));
  });
});

test("main(): Ollama DOWN -> heuristic Q-A fallback, qaModel null", async () => {
  await withTmp(async ({ indexPath, outputDir }) => {
    let llmCalled = false;
    const callImpl = async () => { llmCalled = true; return { ok: true, text: "x?" }; };
    const fetchModelsFn = async () => [];                 // daemon down / empty roster
    const resolveModelFn = async () => { throw new Error("must not be called when roster empty"); };

    const res = await main(
      { threshold: 0.5, sample: null, dryRun: false, noLlm: false, model: null },
      { indexPath, outputDir, callImpl, fetchModelsFn, resolveModelFn }
    );
    assert.equal(res.useLlm, false);
    assert.equal(res.qaModel, null);
    assert.equal(llmCalled, false);                       // no per-cluster LLM calls when down

    const audit = JSON.parse(await fs.readFile(path.join(outputDir, "_DISTILL_LOG.json"), "utf-8"));
    assert.equal(audit.qaModel, null);
    assert.ok(audit.qaExtractionMethod.includes("ollama down"));
    const files = (await fs.readdir(outputDir)).filter(f => f.endsWith(".md"));
    const sample = await fs.readFile(path.join(outputDir, files[0]), "utf-8");
    assert.ok(sample.includes('qa_via: "heuristic-no-llm"'));
  });
});

test("main(): --no-llm forces heuristic and never probes the daemon", async () => {
  await withTmp(async ({ indexPath, outputDir }) => {
    let probed = false;
    const fetchModelsFn = async () => { probed = true; return ["qwen2.5-coder:32b"]; };
    const res = await main(
      { threshold: 0.5, sample: null, dryRun: false, noLlm: true, model: null },
      { indexPath, outputDir, fetchModelsFn }
    );
    assert.equal(res.useLlm, false);
    assert.equal(probed, false);
    const audit = JSON.parse(await fs.readFile(path.join(outputDir, "_DISTILL_LOG.json"), "utf-8"));
    assert.ok(audit.qaExtractionMethod.includes("--no-llm"));
  });
});

test("main(): per-cluster fail-soft -- one LLM success + one failure -> mixed counts, no abort", async () => {
  await withTmp(async ({ indexPath, outputDir }) => {
    let n = 0;
    const callImpl = async () => {
      n += 1;
      return n === 1
        ? { ok: true, text: "How do I run this cleanly?" }
        : { ok: false, error: "timed out" };
    };
    const fetchModelsFn = async () => ["qwen2.5-coder:32b"];
    const resolveModelFn = async () => ({ model: "qwen2.5-coder:32b", source: "router", tier: "best" });

    const res = await main(
      { threshold: 0.5, sample: null, dryRun: false, noLlm: false, model: null },
      { indexPath, outputDir, callImpl, fetchModelsFn, resolveModelFn }
    );
    // 2 clusters: one llm, one heuristic-fallback.
    assert.equal(res.qaCounts.llm + res.qaCounts.heuristicFallback, 2);
    assert.equal(res.qaCounts.llm, 1);
    assert.equal(res.qaCounts.heuristicFallback, 1);
    assert.equal(res.writeErrors, 0);
  });
});

test("main(): --dry-run writes nothing and never contacts Ollama", async () => {
  await withTmp(async ({ indexPath, outputDir }) => {
    let probed = false;
    const fetchModelsFn = async () => { probed = true; return ["qwen2.5-coder:32b"]; };
    const res = await main(
      { threshold: 0.5, sample: null, dryRun: true, noLlm: false, model: null },
      { indexPath, outputDir, fetchModelsFn }
    );
    assert.equal(res.dryRun, true);
    assert.equal(probed, false);
    // No canonical/ dir created in dry-run.
    const exists = await fs.readdir(outputDir).then(() => true).catch(() => false);
    assert.equal(exists, false);
  });
});
