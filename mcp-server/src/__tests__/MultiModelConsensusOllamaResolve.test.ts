/**
 * MultiModelConsensusOllamaResolve.test.ts
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS1 / OCTOPUS-CONSENSUS.
 *
 * Covers the pure Ollama-model resolution helpers that keep the consensus
 * Ollama voice alive when the hard-coded 14b defaults are not pulled on the
 * host (observed live: a `consensus_decide` run failed every Ollama voice with
 * "model 'deepseek-r1:14b' not found" / "qwen2.5-coder:14b not found" on a
 * machine that only had mistral:7b / codellama:7b / qwen2.5-coder:3b).
 */

import { describe, it, expect } from "vitest";
import {
  pickBestOllamaModel,
  resolveOllamaModels,
  resolveDiverseOllamaPanel,
  CODER_ENSEMBLE_MODELS,
} from "../engines/MultiModelConsensusEngine.js";

describe("pickBestOllamaModel", () => {
  it("returns null for an empty list", () => {
    expect(pickBestOllamaModel([])).toBeNull();
  });

  it("returns null for a non-array input (defensive)", () => {
    expect(pickBestOllamaModel(undefined as never)).toBeNull();
  });

  it("excludes embedding models — they cannot chat-generate", () => {
    expect(pickBestOllamaModel(["nomic-embed-text:latest"])).toBeNull();
    expect(pickBestOllamaModel(["nomic-embed-text:latest", "mistral:7b"])).toBe("mistral:7b");
  });

  it("prefers the larger parameter count", () => {
    // mistral:7b (score 7) beats qwen2.5-coder:3b (3 + 0.5 coder bonus = 3.5).
    expect(pickBestOllamaModel(["qwen2.5-coder:3b", "mistral:7b"])).toBe("mistral:7b");
  });

  it("breaks an equal-size tie with the coder/reasoning bonus", () => {
    // both 7b: codellama gets +0.5 for "code", mistral does not.
    expect(pickBestOllamaModel(["mistral:7b", "codellama:7b"])).toBe("codellama:7b");
  });

  it("picks the best from the real observed machine inventory", () => {
    const installed = ["mistral:7b", "codellama:7b", "qwen2.5-coder:3b", "nomic-embed-text:latest"];
    // codellama:7b = 7.5, mistral:7b = 7, qwen2.5-coder:3b = 3.5, embed excluded.
    expect(pickBestOllamaModel(installed)).toBe("codellama:7b");
  });

  it("honors the `exclude` argument when picking a distinct second voice", () => {
    const installed = ["mistral:7b", "codellama:7b", "qwen2.5-coder:3b"];
    expect(pickBestOllamaModel(installed, "codellama:7b")).toBe("mistral:7b");
  });

  it("ranks the 14b defaults correctly when both are present", () => {
    // qwen2.5-coder:14b = 14.5 (coder bonus) beats deepseek-r1:14b = 14.
    expect(pickBestOllamaModel(["deepseek-r1:14b", "qwen2.5-coder:14b"])).toBe("qwen2.5-coder:14b");
  });

  it("is deterministic — equal scores tiebreak by name", () => {
    // two distinct 7b non-coder models → alphabetical first.
    const a = pickBestOllamaModel(["zulu:7b", "alpha:7b"]);
    const b = pickBestOllamaModel(["alpha:7b", "zulu:7b"]);
    expect(a).toBe("alpha:7b");
    expect(b).toBe(a);
  });

  it("treats a model with no :Nb size tag as size 0", () => {
    // "llama3:latest" → size 0; "mistral:7b" → 7 → mistral wins.
    expect(pickBestOllamaModel(["llama3:latest", "mistral:7b"])).toBe("mistral:7b");
  });

  // ── BLACKWELL-MODEL-UPGRADE: vision-model exclusion ───────────────────────
  // After alpha retired the small TEXT models (3b/7b/14b), a host's installed
  // set is mostly VLMs + the qwen2.5-coder:32b floor. Vision models are weak
  // text reasoners (and reserved for OCR/blueprint), so they must NOT be seated
  // as a consensus text voice — else pickBestOllamaModel would hand a 1.8B
  // vision model a reasoning seat the instant the 32b model is the `exclude`d
  // primary. These assertions pin the exclusion against the REAL current host.
  it("excludes vision/VLM models — never a text-consensus voice", () => {
    // moondream:1.8b, *-vl, *vl:, *vision all excluded → only the coder wins.
    expect(pickBestOllamaModel(["qwen2.5vl:7b", "qwen2.5-coder:32b"])).toBe("qwen2.5-coder:32b");
    expect(pickBestOllamaModel(["moondream:1.8b", "qwen2.5-coder:32b"])).toBe("qwen2.5-coder:32b");
    expect(pickBestOllamaModel(["llama3.2-vision:11b", "qwen2.5-coder:32b"])).toBe("qwen2.5-coder:32b");
    expect(pickBestOllamaModel(["qwen3-vl:8b", "qwen3-vl:8b-instruct", "qwen2.5-coder:32b"])).toBe("qwen2.5-coder:32b");
  });

  it("an all-vision installed set yields NO text voice (null, not a VLM seat)", () => {
    expect(pickBestOllamaModel(["qwen2.5vl:7b", "llama3.2-vision:11b", "moondream:1.8b"])).toBeNull();
    // even paired with an embedder, still null — both classes are non-chat.
    expect(pickBestOllamaModel(["qwen3-vl:8b", "nomic-embed-text:latest"])).toBeNull();
  });

  it("picks the 32b coder from the REAL current-host inventory (post-purge)", () => {
    // The exact `ollama list` on this machine 2026-06-04 after alpha's purge:
    const installed = [
      "llama3.2-vision:11b", "moondream:1.8b", "nomic-embed-text:latest",
      "qwen2.5-coder:32b", "qwen2.5vl:7b", "qwen3-vl:8b", "qwen3-vl:8b-instruct",
    ];
    // Only one chat-capable text model survives the embed+vision filter.
    expect(pickBestOllamaModel(installed)).toBe("qwen2.5-coder:32b");
  });
});

describe("resolveOllamaModels", () => {
  const REAL = ["mistral:7b", "codellama:7b", "qwen2.5-coder:3b", "nomic-embed-text:latest"];

  it("returns the requested names unchanged when the installed list is empty (daemon down)", () => {
    const r = resolveOllamaModels("deepseek-r1:14b", "qwen2.5-coder:14b", true, []);
    expect(r).toEqual({ primary: "deepseek-r1:14b", secondary: "qwen2.5-coder:14b" });
  });

  it("returns requested unchanged for a non-array installed list (defensive)", () => {
    const r = resolveOllamaModels("a:7b", "b:7b", true, undefined as never);
    expect(r).toEqual({ primary: "a:7b", secondary: "b:7b" });
  });

  it("keeps a requested primary that IS installed", () => {
    const r = resolveOllamaModels("codellama:7b", "qwen2.5-coder:14b", false, REAL);
    expect(r.primary).toBe("codellama:7b");
  });

  it("substitutes a requested primary that is NOT installed", () => {
    // deepseek-r1:14b not on this host → best installed = codellama:7b.
    const r = resolveOllamaModels("deepseek-r1:14b", "qwen2.5-coder:14b", false, REAL);
    expect(r.primary).toBe("codellama:7b");
  });

  it("leaves the secondary untouched when dual is not wanted", () => {
    const r = resolveOllamaModels("deepseek-r1:14b", "qwen2.5-coder:14b", false, REAL);
    expect(r.secondary).toBe("qwen2.5-coder:14b");
  });

  it("substitutes BOTH voices to distinct installed models for dual-Ollama", () => {
    const r = resolveOllamaModels("deepseek-r1:14b", "qwen2.5-coder:14b", true, REAL);
    expect(r.primary).toBe("codellama:7b");
    expect(r.secondary).toBe("mistral:7b");
    expect(r.secondary).not.toBe(r.primary);
  });

  it("keeps requested dual voices when both are installed and distinct", () => {
    const installed = ["deepseek-r1:14b", "qwen2.5-coder:14b", "mistral:7b"];
    const r = resolveOllamaModels("deepseek-r1:14b", "qwen2.5-coder:14b", true, installed);
    expect(r).toEqual({ primary: "deepseek-r1:14b", secondary: "qwen2.5-coder:14b" });
  });

  it("collapses secondary to primary when only one generation model is installed", () => {
    // single non-embedding model → secondary === primary → the engine's
    // `secondaryOllama !== primaryOllama` guard then disables the dual voice
    // (never two identical models — that would fabricate agreement).
    const r = resolveOllamaModels("deepseek-r1:14b", "qwen2.5-coder:14b", true, ["mistral:7b"]);
    expect(r.primary).toBe("mistral:7b");
    expect(r.secondary).toBe("mistral:7b");
  });

  it("forces the secondary distinct even when the requested secondary equals the resolved primary", () => {
    // requested secondary "codellama:7b" would collide with the resolved
    // primary → must pick a different installed model.
    const r = resolveOllamaModels("deepseek-r1:14b", "codellama:7b", true, REAL);
    expect(r.primary).toBe("codellama:7b");
    expect(r.secondary).not.toBe("codellama:7b");
    expect(r.secondary).toBe("mistral:7b");
  });

  it("substitutes a not-installed secondary while keeping an installed primary (distinct branch)", () => {
    // primary "codellama:7b" IS installed → kept. secondary "nonexistent:99b"
    // is NOT installed → substituted with the best remaining model.
    const r = resolveOllamaModels("codellama:7b", "nonexistent:99b", true, REAL);
    expect(r.primary).toBe("codellama:7b");
    expect(r.secondary).toBe("mistral:7b");
    expect(r.secondary).not.toBe(r.primary);
  });
});

describe("OllamaClientEngine.listModels — producer-contract guard", () => {
  it("returns the {ok, value} envelope the consensus ask() glue depends on", async () => {
    // The glue in MultiModelConsensusEngine.ask() does:
    //   const lm = await ollamaClientEngine.listModels();
    //   if (lm.ok && Array.isArray(lm.value)) installedOllama = lm.value;
    // If listModels() ever renames `.ok`/`.value`, installedOllama silently
    // degrades to [] and the whole Ollama-substitution feature dies while the
    // pure-function tests above stay green. This pins the producer contract so
    // such a rename fails loudly here instead. (Runs regardless of daemon
    // state — OllamaResult<T> always carries {ok,value,error,wallMs}.)
    const { ollamaClientEngine } = await import("../engines/OllamaClientEngine.js");
    try { await ollamaClientEngine.connect(); } catch { /* daemon may be down — shape still holds */ }
    const r = await ollamaClientEngine.listModels();
    expect(r).toHaveProperty("ok");
    expect(typeof r.ok).toBe("boolean");
    expect(r).toHaveProperty("value");
    if (r.ok) {
      expect(Array.isArray(r.value)).toBe(true);
      for (const m of r.value ?? []) expect(typeof m).toBe("string");
    }
  }, 10_000);
});

// ── BLACKWELL-MODEL-INTEGRATION-MS0 — octopus diverse local panel ─────────────
// resolveDiverseOllamaPanel wires N distinct-family Ollama voices on this
// Blackwell RTX PRO 6000 96GB host, each install-gated. The panel default is
// ["gpt-oss:120b","gemma4:31b","qwen2.5-coder:32b"]; today only
// qwen2.5-coder:32b (+ gpt-oss:20b, nomic-embed-text) is pulled, so the live
// resolution must collapse to exactly ["qwen2.5-coder:32b"]. These pin the
// request-order, install-gating, vision/embed exclusion, fallback, and
// daemon-down semantics with REAL reference values.
describe("resolveDiverseOllamaPanel", () => {
  const PANEL = ["gpt-oss:120b", "gemma4:31b", "qwen2.5-coder:32b"];

  it("returns all requested models in REQUEST order when every one is installed", () => {
    const installed = ["qwen2.5-coder:32b", "gemma4:31b", "gpt-oss:120b", "nomic-embed-text:latest"];
    // request order preserved (synthesis tier first), NOT installed-list order.
    expect(resolveDiverseOllamaPanel(PANEL, installed)).toEqual([
      "gpt-oss:120b", "gemma4:31b", "qwen2.5-coder:32b",
    ]);
  });

  it("skips absent models and preserves request order of the present ones", () => {
    // gpt-oss:120b absent → drop it; keep gemma4 then qwen in request order.
    const installed = ["qwen2.5-coder:32b", "gemma4:31b", "nomic-embed-text:latest"];
    expect(resolveDiverseOllamaPanel(PANEL, installed)).toEqual([
      "gemma4:31b", "qwen2.5-coder:32b",
    ]);
  });

  it("falls back to pickBestOllamaModel(installed) when ALL requested are absent", () => {
    // none of the panel installed, but mistral:7b is a usable chat model → it
    // becomes the single fallback voice (embed excluded by pickBest).
    const installed = ["mistral:7b", "nomic-embed-text:latest"];
    expect(resolveDiverseOllamaPanel(PANEL, installed)).toEqual(["mistral:7b"]);
  });

  it("returns the single best installed model when all requested absent (size ranking)", () => {
    // codellama:7b (7.5 w/ coder bonus) beats mistral:7b (7.0) → exactly one voice.
    const installed = ["mistral:7b", "codellama:7b"];
    expect(resolveDiverseOllamaPanel(PANEL, installed)).toEqual(["codellama:7b"]);
  });

  it("returns [] for an empty requested panel", () => {
    expect(resolveDiverseOllamaPanel([], ["qwen2.5-coder:32b"])).toEqual([]);
  });

  // CODER ENSEMBLE (operator 2026-06-18 coderEnsemble flag): a CODING consensus seats the dedicated
  // two-coder panel, NOT the size-ranked default (which would put gpt-oss:120b as primary + one
  // coder). These pin that the live 16-model roster resolves CODER_ENSEMBLE_MODELS to exactly the
  // two distinct coders -- the behavior that lets the graph flip localEnsembleWired:false -> true.
  describe("CODER_ENSEMBLE_MODELS (coding-task panel)", () => {
    it("is exactly the two live exact-tag coders (qwen2.5-coder:32b + qwen3-coder:30b), no dead bare tags", () => {
      expect([...CODER_ENSEMBLE_MODELS]).toEqual(["qwen2.5-coder:32b", "qwen3-coder:30b"]);
      // every entry carries an explicit :Nb size tag (so resolveDiverseOllamaPanel's exact match can seat it)
      for (const m of CODER_ENSEMBLE_MODELS) expect(m).toMatch(/:\d+(?:\.\d+)?b$/i);
    });
    it("seats BOTH coders together (not gpt-oss + one coder) on the live roster", () => {
      const installed = ["gpt-oss:120b", "gpt-oss:20b", "qwen2.5-coder:32b", "qwen3-coder:30b", "qwen2.5-coder:7b", "nomic-embed-text:latest"];
      const panel = resolveDiverseOllamaPanel(CODER_ENSEMBLE_MODELS, installed);
      expect(panel).toEqual(["qwen2.5-coder:32b", "qwen3-coder:30b"]); // two distinct coders, request order
      expect(panel).not.toContain("gpt-oss:120b");                     // the key win: NOT the synthesis model
      expect(panel.length).toBe(2);
    });
    it("install-gates each coder: only the present one seats when the other is absent", () => {
      // qwen3-coder:30b not pulled -> panel collapses to the single live coder (no fabricated voice)
      expect(resolveDiverseOllamaPanel(CODER_ENSEMBLE_MODELS, ["qwen2.5-coder:32b", "gpt-oss:120b"]))
        .toEqual(["qwen2.5-coder:32b"]);
    });
  });

  it("returns [] for a non-array requested panel (defensive)", () => {
    expect(resolveDiverseOllamaPanel(undefined as never, ["qwen2.5-coder:32b"])).toEqual([]);
  });

  it("passes requested through unchanged when the installed list is empty (daemon down)", () => {
    // installed=[] (listModels failed) → callOllama degrades; clean panel passes
    // through verbatim so the requested target list is preserved.
    expect(resolveDiverseOllamaPanel(PANEL, [])).toEqual([
      "gpt-oss:120b", "gemma4:31b", "qwen2.5-coder:32b",
    ]);
  });

  it("passes requested through for a non-array installed list (defensive)", () => {
    expect(resolveDiverseOllamaPanel(PANEL, undefined as never)).toEqual([
      "gpt-oss:120b", "gemma4:31b", "qwen2.5-coder:32b",
    ]);
  });

  it("strips a vision/embed tag from the daemon-down passthrough (never seat a VLM)", () => {
    // even with the daemon down, a VLM/embedder in the panel must not be seated
    // as a text voice — only the chat-capable model survives.
    const dirty = ["gpt-oss:120b", "nomic-embed-text:latest", "qwen2.5vl:7b"];
    expect(resolveDiverseOllamaPanel(dirty, [])).toEqual(["gpt-oss:120b"]);
  });

  it("filters an embedding tag out of an otherwise-installed panel", () => {
    // ["gpt-oss:120b","nomic-embed-text"] both installed → embedder excluded,
    // only gpt-oss:120b seated as a text voice.
    const dirty = ["gpt-oss:120b", "nomic-embed-text"];
    const installed = ["gpt-oss:120b", "nomic-embed-text", "qwen2.5-coder:32b"];
    expect(resolveDiverseOllamaPanel(dirty, installed)).toEqual(["gpt-oss:120b"]);
  });

  it("filters a vision tag out of an otherwise-installed panel", () => {
    // a host that pulled a VLM into the panel slot → VLM dropped, coder kept.
    const dirty = ["qwen2.5vl:7b", "qwen2.5-coder:32b"];
    const installed = ["qwen2.5vl:7b", "qwen2.5-coder:32b"];
    expect(resolveDiverseOllamaPanel(dirty, installed)).toEqual(["qwen2.5-coder:32b"]);
  });

  it("resolves the LIVE Blackwell-today inventory to exactly [qwen2.5-coder:32b]", () => {
    // The default panel ∩ what is actually pulled on this host right now
    // (gpt-oss:120b still pulling, gemma4:31b queued) → only the 32b floor.
    const installedToday = ["gpt-oss:20b", "qwen2.5-coder:32b", "nomic-embed-text"];
    expect(resolveDiverseOllamaPanel(PANEL, installedToday)).toEqual(["qwen2.5-coder:32b"]);
  });

  // ── U-OCTOPUS-DIVERSE-PROBE: optional 3rd arg = cap-probe runnable set ───────
  it("back-compat: undefined runnable arg behaves exactly like the 2-arg call", () => {
    const installed = ["qwen2.5-coder:32b", "gemma4:31b", "gpt-oss:120b"];
    expect(resolveDiverseOllamaPanel(PANEL, installed, undefined)).toEqual(
      resolveDiverseOllamaPanel(PANEL, installed),
    );
  });

  it("intersects with the runnable set — drops an installed-but-not-runnable model", () => {
    // All 3 installed, but the probe reports only the 32b runnable RIGHT NOW
    // (gpt-oss:120b + gemma4:31b present but VRAM-starved / wrong profile).
    const installed = ["qwen2.5-coder:32b", "gemma4:31b", "gpt-oss:120b"];
    const runnable = ["qwen2.5-coder:32b", "nomic-embed-text"]; // probe runnableModelIds
    expect(resolveDiverseOllamaPanel(PANEL, installed, runnable)).toEqual(["qwen2.5-coder:32b"]);
  });

  it("keeps request order among the runnable subset", () => {
    const installed = ["gpt-oss:120b", "gemma4:31b", "qwen2.5-coder:32b"];
    const runnable = ["qwen2.5-coder:32b", "gpt-oss:120b"]; // 2 runnable, gemma4 not
    // request order (gpt-oss before qwen in PANEL) preserved, gemma4 dropped.
    expect(resolveDiverseOllamaPanel(PANEL, installed, runnable)).toEqual([
      "gpt-oss:120b", "qwen2.5-coder:32b",
    ]);
  });

  it("empty panel + runnable set → falls back to a usable+installed runnable model", () => {
    // None of PANEL is runnable, but mistral:7b is installed AND runnable → fb.
    const installed = ["mistral:7b", "nomic-embed-text"];
    const runnable = ["mistral:7b", "nomic-embed-text"]; // embedder excluded by usable()
    expect(resolveDiverseOllamaPanel(PANEL, installed, runnable)).toEqual(["mistral:7b"]);
  });

  it("runnable set gates even when listModels is empty (probe is the stronger authority)", () => {
    // Daemon-down install list ([]) but the probe knows qwen is runnable → keep
    // only the requested models the probe confirms runnable.
    const runnable = ["qwen2.5-coder:32b"];
    expect(resolveDiverseOllamaPanel(PANEL, [], runnable)).toEqual(["qwen2.5-coder:32b"]);
  });

  it("empty runnable [] is treated as NO-probe-signal → falls through to install-gate (NOT seat-nothing)", () => {
    // INTENTIONAL fail-OPEN: an empty runnableModelIds is indistinguishable from
    // "no probe ran" (hasRunnable=false → install-gate, same as undefined). The
    // probe is a VRAM-FIT oracle, not a can-this-process-execute oracle: it
    // returns [] on a cloud_only/CPU host where Ollama models genuinely DO run
    // (on CPU), and on the documented WDDM free-VRAM artifact where a 96GB idle
    // card reports [] runnable. Honoring [] literally would silence the local
    // octopus voice on every GPU-less host — strictly worse than today. So [] →
    // fall through to the install-gate; callOllama is the final authority on load.
    const installed = ["qwen2.5-coder:32b", "gemma4:31b"];
    expect(resolveDiverseOllamaPanel(PANEL, installed, [])).toEqual(
      resolveDiverseOllamaPanel(PANEL, installed),
    );
  });
});
