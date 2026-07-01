#!/usr/bin/env node
/**
 * build-node-embeddings.test.mjs — tests for NN-GRAPH-MS0/U-NNG-NODE-EMBED-INGEST
 * Run: node --test scripts/build-node-embeddings.test.mjs
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  nodeEmbedText,
  nodeContentHash,
  embedTextFor,
  embedResumeHash,
  quantize,
  dequantize,
  pMap,
  tokenizeForIdf,
  buildIdfMap,
  salientLead,
  appendActionSurface,
} from "./build-node-embeddings.mjs";

describe("nodeEmbedText", () => {
  test("joins kind | label | info", () => {
    const t = nodeEmbedText({ kind: "engine", label: "MillForceEngine", info: "Kienzle force model" });
    assert.equal(t, "engine | MillForceEngine | Kienzle force model");
  });

  test("falls back to id when label missing", () => {
    const t = nodeEmbedText({ kind: "engine", id: "engine.Foo" });
    assert.equal(t, "engine | engine.Foo");
  });

  test("omits empty fields", () => {
    const t = nodeEmbedText({ kind: "engine", label: "X" });
    assert.equal(t, "engine | X");
  });

  test("empty/invalid input → empty string", () => {
    assert.equal(nodeEmbedText(null), "");
    assert.equal(nodeEmbedText(undefined), "");
    assert.equal(nodeEmbedText("not an object"), "");
    assert.equal(nodeEmbedText({}), "");
  });

  test("truncates to 1200 chars", () => {
    const t = nodeEmbedText({ kind: "e", label: "L", info: "x".repeat(5000) });
    assert.ok(t.length <= 1200);
  });
});

describe("nodeContentHash", () => {
  test("deterministic for same node", () => {
    const n = { id: "engine.A", kind: "engine", label: "A", info: "desc" };
    assert.equal(nodeContentHash(n), nodeContentHash(n));
  });

  test("changes when embed text changes", () => {
    const h1 = nodeContentHash({ id: "engine.A", kind: "engine", label: "A", info: "v1" });
    const h2 = nodeContentHash({ id: "engine.A", kind: "engine", label: "A", info: "v2" });
    assert.notEqual(h1, h2);
  });

  test("changes when id changes", () => {
    const h1 = nodeContentHash({ id: "engine.A", label: "X" });
    const h2 = nodeContentHash({ id: "engine.B", label: "X" });
    assert.notEqual(h1, h2);
  });

  test("returns 12-char hex", () => {
    const h = nodeContentHash({ id: "x", label: "y" });
    assert.equal(h.length, 12);
    assert.match(h, /^[0-9a-f]{12}$/);
  });
});

describe("embedTextFor / embedResumeHash — resume-skip invariant", () => {
  const ghost = { id: "ghost.unwired.MillForceEngine", kind: "ghost.unwired-engine", label: "MillForceEngine", info: "Unwired engine — proposed wiring: prism_calc (confidence 0.7)" };
  const plain = { id: "engine.X", kind: "engine", label: "X", info: "desc" };

  test("non-ghost embedResumeHash EXACTLY equals nodeContentHash (full-graph resume cache not invalidated)", () => {
    // This is the invariant the dcb2c86bb8 hashFor swap silently broke: hashFor
    // omitted the \\x1F id/text delimiter that nodeContentHash uses, so a future full
    // run would re-embed all ~372k nodes instead of resuming. Lock it.
    assert.equal(embedResumeHash(plain, { ghostsOnly: false }), nodeContentHash(plain));
    assert.equal(embedResumeHash(plain), nodeContentHash(plain), "default opts == non-ghost mode");
  });

  test("embedTextFor routes by mode: ghost → ghostEmbedText (source signal honored), else nodeEmbedText", () => {
    assert.equal(embedTextFor(plain, { ghostsOnly: false }), nodeEmbedText(plain));
    const t = embedTextFor(ghost, { ghostsOnly: true, sourceSignal: "Kienzle cutting force model | class MillForceEngine" });
    assert.ok(t.includes("MillForceEngine") && /Kienzle/.test(t), "ghost text carries the source signal");
    assert.ok(!/proposed wiring:/i.test(t) && !t.includes("prism_calc"), "ghost text stays leak-free");
  });

  test("a CHANGED source signal changes the resume hash (forces re-embed, no stale skip)", () => {
    const hA = embedResumeHash(ghost, { ghostsOnly: true, sourceSignal: "signal A" });
    const hB = embedResumeHash(ghost, { ghostsOnly: true, sourceSignal: "signal B" });
    const hNone = embedResumeHash(ghost, { ghostsOnly: true, sourceSignal: "" });
    assert.notEqual(hA, hB, "different source signal → different hash");
    assert.notEqual(hA, hNone, "adding a source signal → different hash than name-only");
  });

  test("the \\x1F delimiter keeps id|text boundaries collision-safe", () => {
    // Without a delimiter, ('ab','') and ('a','b') would hash identically.
    const h1 = embedResumeHash({ id: "ab", kind: "", label: "" }, { ghostsOnly: false });
    const h2 = embedResumeHash({ id: "a", kind: "", label: "b" }, { ghostsOnly: false });
    assert.notEqual(h1, h2, "id/text boundary must not collide");
  });
});

describe("quantize / dequantize", () => {
  test("quantize returns {s, q} with int8 range", () => {
    const vec = [0.5, -0.3, 0.8, -0.1];
    const { s, q } = quantize(vec);
    assert.equal(typeof s, "number");
    assert.equal(q.length, vec.length);
    for (const x of q) assert.ok(x >= -127 && x <= 127 && Number.isInteger(x));
  });

  test("dequantize approximately reconstructs unit-normalized vector", () => {
    const vec = [3, 4, 0, 0]; // norm = 5 → unit = [0.6, 0.8, 0, 0]
    const rec = quantize(vec);
    const back = dequantize({ ...rec, q: rec.q });
    // cosine of reconstructed vs unit should be ~1
    const unit = [0.6, 0.8, 0, 0];
    let dot = 0, nb = 0, nu = 0;
    for (let i = 0; i < 4; i++) { dot += back[i] * unit[i]; nb += back[i] ** 2; nu += unit[i] ** 2; }
    const cos = dot / (Math.sqrt(nb) * Math.sqrt(nu) || 1);
    assert.ok(cos > 0.99, `cosine ${cos} should be >0.99`);
  });

  test("dequantize handles invalid record → null", () => {
    assert.equal(dequantize(null), null);
    assert.equal(dequantize({}), null);
    assert.equal(dequantize({ q: "not array", s: 1 }), null);
    assert.equal(dequantize({ q: [1, 2], s: "not number" }), null);
  });

  test("quantize handles zero vector without NaN", () => {
    const { s, q } = quantize([0, 0, 0]);
    assert.ok(Number.isFinite(s));
    for (const x of q) assert.ok(Number.isFinite(x));
  });
});

describe("pMap — bounded concurrency", () => {
  test("preserves order", async () => {
    const r = await pMap([1, 2, 3, 4, 5], 2, async (x) => x * 10);
    assert.deepEqual(r, [10, 20, 30, 40, 50]);
  });

  test("respects concurrency limit", async () => {
    let active = 0, maxActive = 0;
    await pMap([1, 2, 3, 4, 5, 6, 7, 8], 3, async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise(r => setTimeout(r, 10));
      active--;
    });
    assert.ok(maxActive <= 3, `maxActive=${maxActive} should be <=3`);
  });

  test("empty array → empty result", async () => {
    const r = await pMap([], 4, async (x) => x);
    assert.deepEqual(r, []);
  });

  test("concurrency larger than array size works", async () => {
    const r = await pMap([1, 2], 100, async (x) => x + 1);
    assert.deepEqual(r, [2, 3]);
  });

  test("propagates fn results including async work", async () => {
    const r = await pMap([1, 2, 3], 2, async (x) => {
      await new Promise(res => setTimeout(res, 1));
      return x * x;
    });
    assert.deepEqual(r, [1, 4, 9]);
  });
});

// GNN-F0/2d: leak-free ghost embed text (the graph `info` embeds the answer label).
import { ghostEmbedText } from "./build-node-embeddings.mjs";
test("ghostEmbedText strips the leaking proposed_wiring clause (no answer in the embed text)", () => {
  const node = {
    kind: "ghost.unwired-engine",
    label: "AbstractionHierarchyEngine",
    info: "Unwired engine — proposed wiring: prism_intelligence (confidence 0.68, reason: abstract/cognitive intelligence keyword)",
    proposed_wiring: "prism_intelligence",
  };
  const t = ghostEmbedText(node);
  assert.ok(t.includes("AbstractionHierarchyEngine"), "keeps the engine name (the legitimate signal)");
  assert.ok(!t.includes("prism_intelligence"), "MUST NOT leak the proposed_wiring answer label");
  assert.ok(!/proposed wiring:/i.test(t), "MUST strip the proposed-wiring clause");
});
test("ghostEmbedText keeps a real description but drops the answer clause", () => {
  const node = { kind: "ghost.unwired-engine", label: "MillForceEngine",
    info: "Computes cutting force. proposed wiring: prism_calc (confidence 0.7)", proposed_wiring: "prism_calc" };
  const t = ghostEmbedText(node);
  assert.ok(t.includes("MillForceEngine"));
  assert.ok(!t.includes("prism_calc"), "no answer leak");
});

test("ghostEmbedText strips the UNKNOWN sentinel clause too (not just prism_*)", () => {
  const node = { kind: "ghost.unwired-engine", label: "MysteryEngine",
    info: "Unwired engine — proposed wiring: UNKNOWN (confidence 0.00, reason: no keyword match)", proposed_wiring: "UNKNOWN" };
  const t = ghostEmbedText(node);
  assert.ok(t.includes("MysteryEngine"));
  assert.ok(!/proposed wiring:/i.test(t), "UNKNOWN clause stripped");
  assert.ok(!t.includes("UNKNOWN"), "no UNKNOWN sentinel leaks into the embed text");
});

// GNN-F0 macroF1-lift: leak-free engine SOURCE signal enrichment.
import { engineSourceSignal } from "./build-node-embeddings.mjs";

describe("engineSourceSignal", () => {
  const CAM_BRIDGE_SRC = `
/**
 * MastercamMillTurnBridge — translates Mastercam mill-turn toolpaths into PRISM's
 * canonical CAM operation model. Handles posted NCI, tool tables, and work offsets.
 * @milestone CAM-BRIDGE-MS0
 */
import { foo } from "./foo.js";
export class MastercamMillTurnBridge {
  constructor(cfg) { this.cfg = cfg; }
  async parseNci(text) { return text; }
  buildToolpath(ops) { return ops; }
  private _normalize(x) { return x; }
}
`;

  test("captures the docblock domain words (the disambiguating cue)", () => {
    const sig = engineSourceSignal(CAM_BRIDGE_SRC);
    assert.ok(/Mastercam/i.test(sig), "carries vendor/domain word that pulls toward prism_cam");
    assert.ok(/toolpath/i.test(sig), "carries CAM domain vocabulary");
  });

  test("extracts class name and public method names, DROPS private/protected + reserved noise", () => {
    const sig = engineSourceSignal(CAM_BRIDGE_SRC);
    assert.ok(sig.includes("class MastercamMillTurnBridge"), "names the class");
    assert.ok(/parseNci/.test(sig) && /buildToolpath/.test(sig), "lists public methods");
    assert.ok(!/\bconstructor\b/.test(sig), "filters the constructor keyword");
    assert.ok(!/_normalize/.test(sig), "drops the private method (implementation noise) — P1-1");
  });

  test("strips JSDoc @tags and leading asterisks (clean prose)", () => {
    const sig = engineSourceSignal(CAM_BRIDGE_SRC);
    assert.ok(!sig.includes("@milestone"), "drops @tags");
    assert.ok(!/^\s*\*/m.test(sig), "no leading JSDoc asterisks");
  });

  test("defensively strips any proposed-wiring phrasing even from source (belt-and-suspenders)", () => {
    const sig = engineSourceSignal("/** does things. proposed wiring: prism_cam */ class X {}");
    assert.ok(!/proposed wiring:/i.test(sig), "never re-introduces the leak from source");
    assert.ok(!sig.includes("prism_cam"), "answer label cannot ride in via source");
  });

  test("strips a bare prism_* dispatcher token from a docblock but keeps the domain words (P1-2)", () => {
    // A docblock that names its dispatcher WITHOUT the 'proposed wiring:' phrasing
    // would otherwise restate the truth label. The domain word must survive.
    const sig = engineSourceSignal("/** Routes to prism_cam for all toolpath posting. */ class TurnBridge { go(){} }");
    assert.ok(!/prism_cam/.test(sig), "the dispatcher answer token is stripped");
    assert.ok(/toolpath/i.test(sig), "the disambiguating domain word survives");
    assert.ok(sig.includes("class TurnBridge"), "class identity survives");
  });

  test("empty / invalid input → empty string", () => {
    assert.equal(engineSourceSignal(null), "");
    assert.equal(engineSourceSignal(""), "");
    assert.equal(engineSourceSignal(12345), "");
    assert.equal(engineSourceSignal("const x = 1; // no docblock, no class"), "");
  });

  test("respects maxChars cap", () => {
    const big = "/**\n * " + "word ".repeat(1000) + "\n */\nclass Big {}";
    assert.ok(engineSourceSignal(big, { maxChars: 300 }).length <= 300);
  });
});

describe("ghostEmbedText + source signal", () => {
  const node = {
    kind: "ghost.unwired-engine", label: "MastercamMillTurnBridge",
    info: "Unwired engine — proposed wiring: prism_ai (confidence 0.49)", proposed_wiring: "prism_ai",
  };

  test("appends the source signal after the leak-stripped fields", () => {
    const sig = "Mastercam mill-turn toolpath bridge | class MastercamMillTurnBridge | methods: parseNci, buildToolpath";
    const t = ghostEmbedText(node, sig);
    assert.ok(t.includes("MastercamMillTurnBridge"), "keeps the name");
    assert.ok(/toolpath/i.test(t), "carries the source domain signal");
    assert.ok(!/proposed wiring:/i.test(t), "still strips the leak");
    assert.ok(!t.includes("prism_ai"), "the wrong-answer label never leaks");
  });

  test("backward compatible: no signal arg behaves like before", () => {
    const t = ghostEmbedText(node);
    assert.ok(t.includes("MastercamMillTurnBridge"));
    assert.ok(!t.includes("prism_ai"));
  });

  test("respects the 1600 cap with a large source signal", () => {
    const t = ghostEmbedText(node, "x".repeat(5000));
    assert.ok(t.length <= 1600);
  });
});

// --- SHARP-mode IDF salience (tier-5 coverage lever, slot:india) ---
describe("tokenizeForIdf", () => {
  test("lowercases, keeps >=3-char alnum, drops structural stopwords", () => {
    assert.deepEqual(tokenizeForIdf("Mastercam ToolPath x12 if engine return"), ["mastercam", "toolpath", "x12"]);
    // "engine"/"return" are stopwords; "if"/"x" are <3 chars
  });
  test("non-string / empty -> []", () => {
    assert.deepEqual(tokenizeForIdf(null), []);
    assert.deepEqual(tokenizeForIdf(""), []);
    assert.deepEqual(tokenizeForIdf(123), []);
  });
});

describe("buildIdfMap", () => {
  test("token in EVERY doc -> idf 0; token in 1 of N -> ln(N) (real values)", () => {
    const m = buildIdfMap(["mastercam toolpath", "toolpath fanuc"]);
    assert.ok(Math.abs(m.get("toolpath") - 0) < 1e-9, "shared token suppressed to 0");
    assert.ok(Math.abs(m.get("mastercam") - Math.log(2)) < 1e-9, "rare token -> ln(2)");
    assert.ok(Math.abs(m.get("fanuc") - Math.log(2)) < 1e-9);
  });
  test("empty / non-array corpus -> empty map", () => {
    assert.equal(buildIdfMap([]).size, 0);
    assert.equal(buildIdfMap(null).size, 0);
  });
});

describe("salientLead", () => {
  const idf = buildIdfMap(["mastercam toolpath", "toolpath fanuc"]);
  test("orders by IDF desc, drops idf<=0 (shared) + absent tokens, ties by first occurrence", () => {
    // toolpath idf 0 -> dropped; mastercam & fanuc tie at ln2 -> first-occurrence order; "zzz" absent -> dropped
    assert.equal(salientLead("mastercam toolpath fanuc zzz", idf, 12), "mastercam fanuc");
    assert.equal(salientLead("fanuc toolpath mastercam", idf, 12), "fanuc mastercam", "tie keeps input order");
  });
  test("respects k cap", () => {
    assert.equal(salientLead("mastercam fanuc", idf, 1), "mastercam");
    assert.equal(salientLead("mastercam fanuc", idf, 0), "");
  });
  test("non-Map idf -> empty string (guard)", () => {
    assert.equal(salientLead("mastercam", null, 12), "");
    assert.equal(salientLead("mastercam", {}, 12), "");
  });
});

describe("ghostEmbedText SHARP mode", () => {
  const node = { kind: "ghost.unwired-engine", label: "MastercamBridge", info: "Unwired engine -" };
  const sig = "mastercam toolpath fanuc";
  const idf = buildIdfMap(["mastercam toolpath", "toolpath fanuc"]);

  test("default (no opts) keeps the constant kind prefix -- byte-identical baseline", () => {
    const t = ghostEmbedText(node, sig);
    assert.ok(t.startsWith("ghost.unwired-engine |"), "kind leads in the deployed path");
  });
  test("sharp+idf DROPS the constant kind and LEADS with the rarest tokens", () => {
    const t = ghostEmbedText(node, sig, { sharp: true, idf, leadK: 12 });
    assert.ok(!t.includes("ghost.unwired-engine"), "constant kind dropped (crowding reducer)");
    assert.ok(t.startsWith("mastercam fanuc |"), "leads with salient (rare) tokens, shared 'toolpath' not in lead");
    assert.ok(t.includes("MastercamBridge"), "name still present");
  });
  test("sharp flag but idf absent / non-Map -> byte-identical to default (guarded)", () => {
    const base = ghostEmbedText(node, sig);
    assert.equal(ghostEmbedText(node, sig, { sharp: true, idf: null }), base);
    assert.equal(ghostEmbedText(node, sig, { sharp: true, idf: {} }), base);
    assert.equal(ghostEmbedText(node, sig, { sharp: false, idf }), base, "sharp:false ignores idf");
  });
  test("embedTextFor forwards sharp opts to ghostEmbedText", () => {
    const sharp = embedTextFor(node, { ghostsOnly: true, sourceSignal: sig, sharp: true, idf, leadK: 12 });
    assert.ok(!sharp.includes("ghost.unwired-engine"));
    const plain = embedTextFor(node, { ghostsOnly: true, sourceSignal: sig });
    assert.ok(plain.startsWith("ghost.unwired-engine |"), "default forwarding stays byte-identical");
  });
});

// --- action-surface lever (GNN tier-5 coverage, slot:india 2026-06-21) ---
// appendActionSurface appends an engine's dispatcher ACTION-SURFACE text to its source signal.
// The load-bearing invariant: empty surface (a truly-unwired ghost) -> identity, so the
// deployed-355 ghosts stay byte-identical while only the codebase-wired refs gain signal.
describe("appendActionSurface", () => {
  test("happy: appends the action vocab after the source signal with an 'actions:' tag", () => {
    const sig = "Kienzle cutting force model | class KienzleEngine | methods: compute";
    const out = appendActionSurface(sig, "deflection calc force calc");
    assert.equal(out, "Kienzle cutting force model | class KienzleEngine | methods: compute | actions: deflection calc force calc");
  });

  test("failure 1 (THE leak-free contract): empty surface -> source signal UNCHANGED (unwired-ghost no-op)", () => {
    const sig = "some engine source signal | class FooEngine";
    assert.equal(appendActionSurface(sig, ""), sig, "an unwired ghost backs no action -> identity (deployed-355 stay byte-identical)");
    assert.equal(appendActionSurface(sig, null), sig, "non-string surf -> identity");
    assert.equal(appendActionSurface(sig, undefined), sig);
  });

  test("failure 2: non-string sig -> treated as empty base; surf alone becomes the tail", () => {
    assert.equal(appendActionSurface(null, "force calc"), "actions: force calc");
    assert.equal(appendActionSurface(undefined, "force calc"), "actions: force calc");
    assert.equal(appendActionSurface(123, "force calc"), "actions: force calc");
  });

  test("failure 3: both empty / non-string -> empty string (no spurious 'actions:' tail)", () => {
    assert.equal(appendActionSurface(null, null), "");
    assert.equal(appendActionSurface("", ""), "");
    assert.equal(appendActionSurface("", "   "), "", "whitespace-only surface collapses to empty -> no tail");
  });

  test("adversarial 1 (leak-strip): a prism_* dispatcher token in the surface is stripped, domain words survive", () => {
    const out = appendActionSurface("class X", "force calc prism_calc deflection");
    assert.ok(!/prism_calc/.test(out), "the dispatcher answer token never rides in via the action surface");
    assert.ok(/force calc/.test(out) && /deflection/.test(out), "the real action vocab survives");
    assert.equal(out, "class X | actions: force calc deflection", "stripped token leaves clean single-spaced text");
  });

  test("adversarial 2: whitespace/newline-laden surface is normalized to single spaces", () => {
    const out = appendActionSurface("class Y", "  force\n\tcalc   deflection  ");
    assert.equal(out, "class Y | actions: force calc deflection");
  });

  test("respects the maxChars cap (action tail cannot crowd out the source prose unboundedly)", () => {
    const out = appendActionSurface("base", "x ".repeat(2000), { maxChars: 300 });
    assert.ok(out.length <= 300, `combined length ${out.length} must be <= 300`);
    assert.ok(out.startsWith("base | actions:"), "the source prose leads, the action tail is what gets truncated");
  });
});
