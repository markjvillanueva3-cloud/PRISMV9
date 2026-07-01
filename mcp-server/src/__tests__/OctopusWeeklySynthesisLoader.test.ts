/**
 * OctopusWeeklySynthesisLoader.test.ts — PSN-OCTOPUS-FLEET-SYNERGY-MS0 / P5
 * (U-FLEET-P5-WEEKLY-SYNTHESIS-OCTOPUS-LOADER).
 *
 * Verifies the SEPARATE loader (scripts/lib/octopus-weekly-synthesis-loader.mjs)
 * that folds the real octopus consensus ledger into the WeeklySynthesisEngine's
 * synthesis sources — composed, not bolted inline, and gated behind a
 * default-OFF knob.
 *
 * Strategy: fixture ledgers written into os.tmpdir(); a TS-side WeeklySource[]
 * loader (the engine's defaultLoader) is composed with the octopus loader; one
 * test drives the COMPOSED loader THROUGH the real WeeklySynthesisEngine (DI on
 * `loader`) with an injected summarizer so it never touches Ollama. Reference
 * values / invariants only — no toBeDefined()/toBeTruthy() stubs.
 *
 * Comprehensive-build floor:
 *   happy:        records folded from a fixture ledger
 *   >=3 failures: missing ledger, empty ledger, all-malformed-JSONL ledger,
 *                 non-octopus-kind-only ledger
 *   >=2 adversarial: oversize single record (byte budget respected),
 *                    malformed JSONL line skipped while valid lines survive,
 *                    knob default-OFF => base loader returned UNCHANGED
 *   through-engine: composed loader drives runWeekly end-to-end
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {
  WeeklySynthesisEngine,
  MAX_SOURCE_BYTES,
  truncateBody,
  hasAllSections,
  WEEKLY_SECTIONS,
  defaultLoader,
  type WeeklySource,
  type SummarizerFn,
  type LoaderFn,
} from "../engines/WeeklySynthesisEngine.js";
import {
  composeOctopusLoader,
  loadOctopusSource,
  buildOctopusBriefBody,
  truncateToBytes,
  renderConsensusRecord,
  OCTOPUS_SOURCE_MAX_BYTES,
  OCTOPUS_SOURCE_SENTINEL_PATH,
  OCTOPUS_SOURCE_DATE_FALLBACK,
  DEFAULT_MAX_RECORDS,
} from "../../../scripts/lib/octopus-weekly-synthesis-loader.mjs";

/* ---------- fixture helpers ---------- */

const KIND = "octopus-consensus";

/** A well-formed octopus ledger record. */
function rec(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: "1.0.0",
    at: "2026-05-29T12:00:00.000Z",
    slot: "bravo",
    chatId: null,
    eligible: true,
    reason: "octopus-completed",
    kind: KIND,
    signature: "octopus:agree=5",
    callCount: 5,
    outcome: "pending",
    prompt: "what is the Kienzle cutting force model?",
    voices: [
      { id: "anthropic", verdict: "agree", score: null, dissent: null },
      { id: "google", verdict: "agree", score: null, dissent: null },
    ],
    consensus: { verdict: "Kienzle: Fc = kc1.1 * b * h^(1-mc)", confidence: 0.91, dissent_items: [] },
    psnExemplars: null,
    routerDecision: "route:octopus",
    semanticSummary: "Kienzle cutting force model",
    ...over,
  };
}

/** Write JSONL lines (already-stringified) into a temp ledger; returns its path. */
async function writeLedger(lines: string[]): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "prism-octo-led-"));
  const p = path.join(dir, "octopus-runs.jsonl");
  await fs.writeFile(p, lines.length ? lines.join("\n") + "\n" : "", "utf8");
  return p;
}

/** A vault with generated/ present (for the through-engine test). */
async function mkVault(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "prism-octo-vault-"));
  await fs.mkdir(path.join(root, "generated"), { recursive: true });
  return root;
}

const VALID_RETRO = WEEKLY_SECTIONS.map((s) => `## ${s}\n- body`).join("\n");
const okSummarizer: SummarizerFn = async () => ({ ok: true, text: VALID_RETRO, model: "test-fake" });

const ANCHOR = "2026-05-31";

/* ===================================================================== */
/* Constant agreement — no silent drift from the engine's byte budget     */
/* ===================================================================== */

describe("OCTOPUS_SOURCE_MAX_BYTES agrees with the engine's MAX_SOURCE_BYTES", () => {
  it("the loader's byte budget is pinned to the engine constant (no drift)", () => {
    expect(OCTOPUS_SOURCE_MAX_BYTES).toBe(MAX_SOURCE_BYTES);
    expect(OCTOPUS_SOURCE_MAX_BYTES).toBe(6_000);
  });
});

/* ===================================================================== */
/* truncateToBytes — mirrors the engine's truncateBody behavior           */
/* ===================================================================== */

describe("truncateToBytes", () => {
  it("returns the body unchanged when within the byte cap", () => {
    expect(truncateToBytes("short", 100)).toBe("short");
  });

  it("caps an ASCII body at max bytes + the [truncated] marker", () => {
    const out = truncateToBytes("a".repeat(500), 300);
    expect(out.startsWith("a".repeat(300))).toBe(true);
    expect(out.endsWith("\n\n[truncated]\n")).toBe(true);
    // exactly the cap bytes of content + the marker
    expect(out).toBe("a".repeat(300) + "\n\n[truncated]\n");
  });

  it("a multibyte body never exceeds the byte cap and leaves no dangling U+FFFD", () => {
    const out = truncateToBytes("\u{1F6E0}".repeat(2000), 300);
    const marker = "\n\n[truncated]\n";
    const content = out.slice(0, out.length - marker.length);
    expect(Buffer.byteLength(content, "utf8")).toBeLessThanOrEqual(300);
    expect(content.endsWith("�")).toBe(false);
    expect(out.endsWith(marker)).toBe(true);
  });

  it("matches the engine's truncateBody for the same input + cap (parity)", () => {
    const body = "x".repeat(7000);
    expect(truncateToBytes(body, 6_000)).toBe(truncateBody(body, 6_000));
  });
});

/* ===================================================================== */
/* renderConsensusRecord — defensive field projection                     */
/* ===================================================================== */

describe("renderConsensusRecord", () => {
  it("renders timestamp, signature, voice count, prompt, and verdict+confidence", () => {
    const out = renderConsensusRecord(rec());
    expect(out).toContain("2026-05-29T12:00:00.000Z");
    expect(out).toContain("octopus:agree=5");
    expect(out).toContain("2 voices");
    expect(out).toContain("Kienzle cutting force model");
    expect(out).toContain("Kienzle: Fc = kc1.1 * b * h^(1-mc)");
    expect(out).toContain("conf=0.91");
  });

  it("coalesces every missing field to a safe placeholder (no throw, no undefined)", () => {
    const out = renderConsensusRecord({});
    expect(out).toContain("(no-timestamp)");
    expect(out).toContain("(no-prompt)");
    expect(out).toContain("(no-consensus)");
    expect(out.includes("undefined")).toBe(false);
    expect(out).toContain("0 voices"); // singular/plural guard: 0 -> "voices"
  });

  it("omits the confidence suffix when confidence is null/absent", () => {
    const out = renderConsensusRecord(rec({ consensus: { verdict: "v", confidence: null, dissent_items: [] } }));
    expect(out).toContain("consensus: v");
    expect(out.includes("conf=")).toBe(false);
  });

  // -- FIX B (P5 data-leak) defense-in-depth: the loader masks secrets at RENDER
  // time too, so even a PRE-FIX ledger line carrying a raw secret in
  // prompt/verdict can never reach the WEEKLY-*.md brief.
  it("redacts secrets embedded in a (pre-fix) raw ledger record at render time", () => {
    const SK = "sk-ABCD1234secretkeyvalue99";
    const GHP = "ghp_SECRETTOKEN1234567890";
    const out = renderConsensusRecord(
      rec({
        prompt: `rotate ${SK} now`,
        semanticSummary: `rotate ${SK} now`,
        consensus: { verdict: `do not log ${GHP}`, confidence: 0.7, dissent_items: [] },
      }),
    );
    expect(out.includes(SK)).toBe(false);
    expect(out.includes(GHP)).toBe(false);
    expect(out).toContain("[redacted-openai-key]");
    expect(out).toContain("[redacted-github-token]");
    // surrounding non-secret text preserved
    expect(out).toContain("rotate");
    expect(out).toContain("do not log");
  });
});

/* ===================================================================== */
/* buildOctopusBriefBody — read + project the ledger                      */
/* ===================================================================== */

describe("buildOctopusBriefBody — happy path", () => {
  it("folds recent consensus records into a single markdown brief", async () => {
    const ledgerPath = await writeLedger([
      JSON.stringify(rec({ at: "2026-05-27T00:00:00.000Z", semanticSummary: "older run" })),
      JSON.stringify(rec({ at: "2026-05-29T00:00:00.000Z", semanticSummary: "newer run" })),
    ]);
    const body = buildOctopusBriefBody({ ledgerPath });
    expect(body).toContain("# Octopus multi-LLM consensus");
    expect(body).toContain("2 of 2 consensus run(s)");
    expect(body).toContain("older run");
    expect(body).toContain("newer run");
    // most-recent first: the 05-29 row must appear before the 05-27 row
    expect(body.indexOf("newer run")).toBeLessThan(body.indexOf("older run"));
  });

  it("caps the fold at the requested maxRecords (recency-ordered)", async () => {
    const lines = Array.from({ length: 5 }, (_, i) =>
      JSON.stringify(rec({ at: `2026-05-2${i}T00:00:00.000Z`, semanticSummary: `run-${i}` })),
    );
    const ledgerPath = await writeLedger(lines);
    const body = buildOctopusBriefBody({ ledgerPath, maxRecords: 2 });
    expect(body).toContain("2 of 5 consensus run(s)");
    // the two most-recent (run-4, run-3); run-0 must be excluded
    expect(body).toContain("run-4");
    expect(body).toContain("run-3");
    expect(body.includes("run-0")).toBe(false);
  });

  // -- FIX B (P5 data-leak) defense-in-depth: a raw-secret-bearing ledger line
  // (e.g. written before the write-time redaction landed) must NOT leak its
  // secrets into the rendered weekly brief.
  it("a raw secret in the ledger never reaches the rendered brief (full-brief redaction)", async () => {
    const SK = "sk-ABCD1234secretkeyvalue99";
    const GHP = "ghp_SECRETTOKEN1234567890";
    const ledgerPath = await writeLedger([
      JSON.stringify(
        rec({
          prompt: `please rotate ${SK}`,
          semanticSummary: `please rotate ${SK}`,
          consensus: { verdict: `never log ${GHP}`, confidence: 0.6, dissent_items: [] },
        }),
      ),
    ]);
    const body = buildOctopusBriefBody({ ledgerPath });
    expect(body.includes(SK)).toBe(false);
    expect(body.includes(GHP)).toBe(false);
    expect(body).toContain("[redacted-openai-key]");
    expect(body).toContain("[redacted-github-token]");
  });
});

/* ===================================================================== */
/* Failure modes (fail-soft => "" / [] / null, never throw)               */
/* ===================================================================== */

describe("buildOctopusBriefBody — failure modes (fail-soft)", () => {
  it("returns '' when the ledger file does not exist", () => {
    const body = buildOctopusBriefBody({
      ledgerPath: path.join(os.tmpdir(), `prism-octo-missing-${Date.now()}.jsonl`),
    });
    expect(body).toBe("");
  });

  it("returns '' for an empty ledger file", async () => {
    const ledgerPath = await writeLedger([]);
    expect(buildOctopusBriefBody({ ledgerPath })).toBe("");
  });

  it("returns '' when the ledger holds ONLY malformed JSONL lines", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "prism-octo-bad-"));
    const p = path.join(dir, "octopus-runs.jsonl");
    await fs.writeFile(p, "{not json\n}}}\nNaN\n", "utf8");
    expect(buildOctopusBriefBody({ ledgerPath: p })).toBe("");
  });

  it("returns '' when no record has kind=octopus-consensus", async () => {
    const ledgerPath = await writeLedger([
      JSON.stringify({ kind: "some-other-kind", at: "2026-05-29T00:00:00.000Z" }),
      JSON.stringify({ kind: "skill-candidate", at: "2026-05-30T00:00:00.000Z" }),
    ]);
    expect(buildOctopusBriefBody({ ledgerPath })).toBe("");
  });
});

/* ===================================================================== */
/* Adversarial — oversize record + malformed-line skip                    */
/* ===================================================================== */

describe("buildOctopusBriefBody — adversarial", () => {
  it("truncation is respected: an oversize single record never exceeds the byte cap", async () => {
    // a giant prompt + verdict that would render far past the budget
    const huge = "Z".repeat(50_000);
    const ledgerPath = await writeLedger([
      JSON.stringify(
        rec({
          prompt: huge,
          semanticSummary: huge,
          consensus: { verdict: huge, confidence: 0.5, dissent_items: [] },
        }),
      ),
    ]);
    const body = buildOctopusBriefBody({ ledgerPath, maxBytes: 1_000 });
    expect(Buffer.byteLength(body, "utf8")).toBeLessThanOrEqual(1_000 + "\n\n[truncated]\n".length);
    expect(body.endsWith("\n\n[truncated]\n")).toBe(true);
  });

  it("skips a malformed JSONL line while still folding the valid records around it", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "prism-octo-mix-"));
    const p = path.join(dir, "octopus-runs.jsonl");
    const good1 = JSON.stringify(rec({ at: "2026-05-28T00:00:00.000Z", semanticSummary: "valid-one" }));
    const good2 = JSON.stringify(rec({ at: "2026-05-29T00:00:00.000Z", semanticSummary: "valid-two" }));
    await fs.writeFile(p, `${good1}\n{ broken json line >>>\n${good2}\n`, "utf8");
    const body = buildOctopusBriefBody({ ledgerPath: p });
    expect(body).toContain("2 of 2 consensus run(s)"); // the broken line was dropped
    expect(body).toContain("valid-one");
    expect(body).toContain("valid-two");
  });
});

/* ===================================================================== */
/* loadOctopusSource — WeeklySource projection                            */
/* ===================================================================== */

describe("loadOctopusSource", () => {
  it("returns a WeeklySource with the anchor date, sentinel path, and accurate bytes", async () => {
    const ledgerPath = await writeLedger([JSON.stringify(rec())]);
    const src = loadOctopusSource({ ledgerPath, anchorDate: ANCHOR });
    expect(src === null).toBe(false);
    const s = src as WeeklySource;
    expect(s.date).toBe(ANCHOR);
    expect(s.path).toBe(OCTOPUS_SOURCE_SENTINEL_PATH);
    expect(s.bytes).toBe(Buffer.byteLength(s.body, "utf8"));
    expect(s.body).toContain("# Octopus multi-LLM consensus");
  });

  it("falls back to the 'octopus' sentinel date when anchorDate is not a YYYY-MM-DD", async () => {
    const ledgerPath = await writeLedger([JSON.stringify(rec())]);
    const src = loadOctopusSource({ ledgerPath, anchorDate: "garbage" });
    expect((src as WeeklySource).date).toBe(OCTOPUS_SOURCE_DATE_FALLBACK);
  });

  it("returns null when the ledger contributes nothing (fail-soft)", () => {
    const src = loadOctopusSource({
      ledgerPath: path.join(os.tmpdir(), `prism-octo-none-${Date.now()}.jsonl`),
    });
    expect(src === null).toBe(true);
  });
});

/* ===================================================================== */
/* composeOctopusLoader — default-OFF knob + composition                  */
/* ===================================================================== */

describe("composeOctopusLoader — default-OFF knob", () => {
  it("returns the base loader UNCHANGED when the knob is unset (zero behavior change)", () => {
    const base: LoaderFn = async () => [];
    const composed = composeOctopusLoader(base, { env: {} });
    expect(composed).toBe(base); // identity — not even wrapped
  });

  it("returns the base loader UNCHANGED when the knob is not exactly '1'", () => {
    const base: LoaderFn = async () => [];
    expect(composeOctopusLoader(base, { env: { PRISM_WEEKLY_SYNTHESIS_OCTOPUS: "0" } })).toBe(base);
    expect(composeOctopusLoader(base, { env: { PRISM_WEEKLY_SYNTHESIS_OCTOPUS: "true" } })).toBe(base);
  });

  it("throws when baseLoader is not a function (fail loud on misuse)", () => {
    // @ts-expect-error — deliberately wrong type to exercise the guard
    expect(() => composeOctopusLoader(null, { env: { PRISM_WEEKLY_SYNTHESIS_OCTOPUS: "1" } })).toThrow();
  });
});

describe("composeOctopusLoader — enabled", () => {
  it("appends the octopus source to the base sources when enabled", async () => {
    const ledgerPath = await writeLedger([JSON.stringify(rec({ semanticSummary: "composed-run" }))]);
    const base: LoaderFn = async () => [
      { date: ANCHOR, path: "/fake/DAILY-CONTEXT.md", body: "daily brief", bytes: 11 },
    ];
    const composed = composeOctopusLoader(base, {
      env: { PRISM_WEEKLY_SYNTHESIS_OCTOPUS: "1" },
      ledgerPath,
    });
    const out = await composed({ vaultRoot: "/x", date: ANCHOR });
    expect(out).toHaveLength(2);
    expect(out[0].body).toBe("daily brief"); // base preserved + first
    expect(out[1].path).toBe(OCTOPUS_SOURCE_SENTINEL_PATH); // octopus appended last
    expect(out[1].body).toContain("composed-run");
  });

  it("returns ONLY the base sources when enabled but the ledger is empty (fail-soft)", async () => {
    const base: LoaderFn = async () => [
      { date: ANCHOR, path: "/fake/DAILY-CONTEXT.md", body: "daily brief", bytes: 11 },
    ];
    const composed = composeOctopusLoader(base, {
      env: { PRISM_WEEKLY_SYNTHESIS_OCTOPUS: "1" },
      ledgerPath: path.join(os.tmpdir(), `prism-octo-empty-${Date.now()}.jsonl`),
    });
    const out = await composed({ vaultRoot: "/x", date: ANCHOR });
    expect(out).toHaveLength(1);
    expect(out[0].body).toBe("daily brief");
  });

  it("a ledger failure never turns a succeeding base load into a failure (fail-soft isolation)", async () => {
    const base: LoaderFn = async () => [
      { date: ANCHOR, path: "/fake/DAILY-CONTEXT.md", body: "daily brief", bytes: 11 },
    ];
    // ledgerPath points at a DIRECTORY — readOctopusLedger fails-soft to [] inside
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "prism-octo-dir-"));
    const composed = composeOctopusLoader(base, {
      env: { PRISM_WEEKLY_SYNTHESIS_OCTOPUS: "1" },
      ledgerPath: dir,
    });
    const out = await composed({ vaultRoot: "/x", date: ANCHOR });
    expect(out).toHaveLength(1); // base survived
    expect(out[0].body).toBe("daily brief");
  });
});

/* ===================================================================== */
/* THROUGH THE ENGINE — composed loader drives runWeekly end-to-end       */
/* ===================================================================== */

describe("WeeklySynthesisEngine + composed octopus loader (through-engine)", () => {
  it("the octopus brief reaches the summarizer as an additional source and the retro is written", async () => {
    const root = await mkVault();
    // one real daily-context so the base defaultLoader yields a source
    await fs.writeFile(
      path.join(root, "generated", `DAILY-CONTEXT-${ANCHOR}.md`),
      "daily brief body",
      "utf8",
    );
    const ledgerPath = await writeLedger([
      JSON.stringify(rec({ at: "2026-05-30T00:00:00.000Z", semanticSummary: "engine-path-consensus" })),
    ]);

    // base loader = the engine's real defaultLoader (exercises the fs window),
    // composed with the octopus loader (knob ON).
    const composed = composeOctopusLoader(defaultLoader, {
      env: { PRISM_WEEKLY_SYNTHESIS_OCTOPUS: "1" },
      ledgerPath,
    });

    // capture what the engine actually handed the summarizer
    let receivedPaths: string[] = [];
    let receivedBodies: string[] = [];
    const capturing: SummarizerFn = async (opts) => {
      receivedPaths = opts.sources.map((s) => s.path);
      receivedBodies = opts.sources.map((s) => s.body);
      return { ok: true, text: VALID_RETRO, model: "test-fake" };
    };

    const engine = new WeeklySynthesisEngine({ loader: composed, summarizer: capturing });
    const r = await engine.runWeekly({ vaultRoot: root, date: ANCHOR });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // the engine saw BOTH the daily brief AND the octopus brief
    expect(r.sources_used).toBe(2);
    expect(receivedPaths).toContain(OCTOPUS_SOURCE_SENTINEL_PATH);
    const octoBody = receivedBodies.find((b) => b.includes("Octopus multi-LLM consensus"));
    expect(typeof octoBody).toBe("string");
    expect(octoBody as string).toContain("engine-path-consensus");

    // the retro file exists and carries all 4 mandatory sections + the octopus source
    const written = await fs.readFile(r.path, "utf8");
    expect(hasAllSections(written)).toBe(true);
    expect(written).toContain(OCTOPUS_SOURCE_SENTINEL_PATH); // listed in Source briefs
  });

  it("with the knob OFF the engine sees ONLY the daily-context briefs (zero behavior change)", async () => {
    const root = await mkVault();
    await fs.writeFile(
      path.join(root, "generated", `DAILY-CONTEXT-${ANCHOR}.md`),
      "daily brief body",
      "utf8",
    );
    const ledgerPath = await writeLedger([JSON.stringify(rec())]);

    // knob OFF => composeOctopusLoader returns base unchanged
    const composed = composeOctopusLoader(defaultLoader, { env: {}, ledgerPath });
    expect(composed).toBe(defaultLoader);

    let receivedPaths: string[] = [];
    const capturing: SummarizerFn = async (opts) => {
      receivedPaths = opts.sources.map((s) => s.path);
      return { ok: true, text: VALID_RETRO };
    };
    const engine = new WeeklySynthesisEngine({ loader: composed, summarizer: capturing });
    const r = await engine.runWeekly({ vaultRoot: root, date: ANCHOR });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.sources_used).toBe(1); // only the daily-context, no octopus brief
    expect(receivedPaths).not.toContain(OCTOPUS_SOURCE_SENTINEL_PATH);
  });
});

/* ===================================================================== */
/* exported defaults                                                      */
/* ===================================================================== */

describe("exported defaults", () => {
  it("DEFAULT_MAX_RECORDS is a positive bounded fold cap", () => {
    expect(DEFAULT_MAX_RECORDS).toBe(40);
    expect(Number.isInteger(DEFAULT_MAX_RECORDS)).toBe(true);
    expect(DEFAULT_MAX_RECORDS).toBeGreaterThan(0);
  });
});
