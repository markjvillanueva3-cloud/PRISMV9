/**
 * Tests for SpeedFeedGpuJudgeEngine (OSCAR-SFC-9AXIS-MS0/U-OSC-GPU-JUDGE).
 *
 * The GPU-in-the-loop judge layer. The pure surfaces — parseLedger, buildPrompt,
 * parseVerdict, the judgeable-row filter, histogram, and the fail-soft fallbacks —
 * are tested deterministically WITHOUT a live GPU. The network path (queryModel /
 * runFromLedgerFile) is tested with the global fetch stubbed, so the test asserts
 * real behavior (R9) — including that an unreachable endpoint produces a LABELED
 * fallback verdict, never a fabricated confident one (R12).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  SpeedFeedGpuJudgeEngine,
  type JudgeLedgerRow,
} from "../engines/SpeedFeedGpuJudgeEngine.js";

function row(p: Partial<JudgeLedgerRow>): JudgeLedgerRow {
  return {
    cell_id: "c",
    domain: "mill",
    iso: "P",
    material: "steel",
    tool_diameter_mm: 10,
    mode: "prism_optimized",
    prism_vc_mpm: 150,
    baseline_vc_mpm: 200,
    ...p,
  };
}

describe("SpeedFeedGpuJudgeEngine — U-OSC-GPU-JUDGE", () => {
  let engine: SpeedFeedGpuJudgeEngine;
  const tmpFiles: string[] = [];

  beforeEach(() => {
    engine = new SpeedFeedGpuJudgeEngine();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    for (const f of tmpFiles.splice(0)) {
      try {
        fs.rmSync(f, { force: true });
      } catch {
        /* ignore */
      }
    }
  });

  // --- parseLedger -------------------------------------------------------

  it("parses valid JSONL and skips blank/torn lines", () => {
    const text =
      JSON.stringify(row({})) + "\n\n{torn json\n" + JSON.stringify(row({ iso: "M" })) + "\n";
    const rows = engine.parseLedger(text);
    expect(rows.length).toBe(2);
    expect(rows.map((r) => r.iso).sort()).toEqual(["M", "P"]);
  });

  // --- buildPrompt -------------------------------------------------------

  it("builds a deterministic machinist prompt carrying the real numbers + delta", () => {
    const p = engine.buildPrompt(row({ prism_vc_mpm: 150, baseline_vc_mpm: 200, material: "304", iso: "M" }));
    expect(p).toContain("304");
    expect(p).toContain("ISO group M");
    expect(p).toContain("150.0 m/min"); // PRISM Vc
    expect(p).toContain("200.0 m/min"); // baseline Vc
    expect(p).toContain("-25.0%"); // conservative delta
    expect(p).toMatch(/Respond ONLY with compact JSON/);
  });

  // --- parseVerdict: real parse + fail-soft ------------------------------

  it("parses a valid model JSON verdict", () => {
    const v = engine.parseVerdict(
      'Sure: {"soundness":"sound_conservative","rationale":"protects tool life on steel"}',
      row({}),
    );
    expect(v.soundness).toBe("sound_conservative");
    expect(v.rationale).toMatch(/protects tool life/);
    expect(v.source).toBe("gpu_model");
  });

  it("REJECTS an out-of-enum soundness (fails soft to uncertain, not fabricated)", () => {
    const v = engine.parseVerdict('{"soundness":"perfect","rationale":"x"}', row({}));
    expect(v.soundness).toBe("uncertain");
    expect(v.source).toBe("fallback_parse_error");
  });

  it("fails soft on non-JSON garbage (never throws)", () => {
    const v = engine.parseVerdict("the model rambled with no json", row({}));
    expect(v.soundness).toBe("uncertain");
    expect(v.source).toBe("fallback_parse_error");
  });

  // --- runFromLedgerFile: happy path with stubbed GPU --------------------

  it("judges every judgeable regime via the (stubbed) GPU model + builds a histogram", async () => {
    const ledger = path.join(os.tmpdir(), `gpu-judge-${process.pid}-${Math.floor(performance.now())}.jsonl`);
    tmpFiles.push(ledger);
    fs.writeFileSync(
      ledger,
      [
        JSON.stringify(row({ cell_id: "a", iso: "P", prism_vc_mpm: 150, baseline_vc_mpm: 200 })),
        JSON.stringify(row({ cell_id: "b", iso: "N", prism_vc_mpm: 300, baseline_vc_mpm: 600 })),
        JSON.stringify(row({ cell_id: "c", iso: "S", prism_vc_mpm: 100, baseline_vc_mpm: null })), // unjudgeable
      ].join("\n") + "\n",
    );
    // Stub fetch: /api/ps → fully GPU-resident; /api/generate → a sound verdict.
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("/api/ps")) {
          return {
            ok: true,
            json: async () => ({ models: [{ name: "qwen2.5-coder:32b", size: 1000, size_vram: 1000 }] }),
          } as unknown as Response;
        }
        return {
          ok: true,
          json: async () => ({ response: '{"soundness":"sound_conservative","rationale":"safe on this regime"}' }),
        } as unknown as Response;
      }),
    );

    const report = await engine.runFromLedgerFile(ledger);
    expect(report.total_rows).toBe(3);
    expect(report.judged_rows).toBe(2); // S/null-baseline excluded
    expect(report.fallback_rows).toBe(0);
    expect(report.gpu_resident).toBe(true);
    expect(report.soundness_histogram.sound_conservative).toBe(2);
    expect(report.apply_policy).toBe("advisory-only");
    expect(report.verdicts.every((v) => v.source === "gpu_model")).toBe(true);
  });

  // --- failure mode: GPU endpoint unreachable ----------------------------

  it("FAILURE: unreachable GPU endpoint → labeled fallback verdicts, never fabricated", async () => {
    const ledger = path.join(os.tmpdir(), `gpu-judge-down-${process.pid}-${Math.floor(performance.now())}.jsonl`);
    tmpFiles.push(ledger);
    fs.writeFileSync(ledger, JSON.stringify(row({ cell_id: "a" })) + "\n");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNREFUSED");
      }),
    );
    const report = await engine.runFromLedgerFile(ledger);
    expect(report.judged_rows).toBe(1);
    expect(report.fallback_rows).toBe(1);
    expect(report.gpu_resident).toBe(null); // /api/ps also unreachable
    expect(report.verdicts[0]!.source).toBe("fallback_unreachable");
    expect(report.verdicts[0]!.soundness).toBe("uncertain");
    expect(report.notes.some((n) => /could not probe GPU residency/i.test(n))).toBe(true);
  });

  // --- failure mode: model present but NOT GPU-resident (CPU split) ------

  it("FAILURE: model on a CPU split → loud WARNING (Blackwell utilization defeated)", async () => {
    const ledger = path.join(os.tmpdir(), `gpu-judge-cpu-${process.pid}-${Math.floor(performance.now())}.jsonl`);
    tmpFiles.push(ledger);
    fs.writeFileSync(ledger, JSON.stringify(row({ cell_id: "a" })) + "\n");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("/api/ps")) {
          // size_vram far below size → CPU offload split.
          return {
            ok: true,
            json: async () => ({ models: [{ name: "qwen2.5-coder:32b", size: 1000, size_vram: 100 }] }),
          } as unknown as Response;
        }
        return {
          ok: true,
          json: async () => ({ response: '{"soundness":"sound_match","rationale":"ok"}' }),
        } as unknown as Response;
      }),
    );
    const report = await engine.runFromLedgerFile(ledger);
    expect(report.gpu_resident).toBe(false);
    expect(report.notes.some((n) => /NOT fully GPU-resident/i.test(n))).toBe(true);
  });

  // --- scrutiny P2: exact-model-match (no prefix false-positive) ----------
  it("does NOT claim residency for a same-family tag (qwen2.5-coder:7b ≠ :32b)", async () => {
    const ledger = path.join(os.tmpdir(), `gpu-judge-prefix-${process.pid}-${Math.floor(performance.now())}.jsonl`);
    tmpFiles.push(ledger);
    fs.writeFileSync(ledger, JSON.stringify(row({ cell_id: "a" })) + "\n");
    // Only the 7b variant is resident; the run requests the (default) 32b.
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("/api/ps")) {
          return {
            ok: true,
            json: async () => ({ models: [{ name: "qwen2.5-coder:7b", size: 1000, size_vram: 1000 }] }),
          } as unknown as Response;
        }
        return { ok: true, json: async () => ({ response: '{"soundness":"sound_match","rationale":"x"}' }) } as unknown as Response;
      }),
    );
    const report = await engine.runFromLedgerFile(ledger, { model: "qwen2.5-coder:32b" });
    // The 7b is resident but the requested 32b is NOT — must report not-resident.
    expect(report.gpu_resident).toBe(false);
    expect(report.matched_model).toBe(""); // no EXACT match for the requested tag
    expect(report.notes.some((n) => /NOT fully GPU-resident/i.test(n))).toBe(true);
  });

  it("surfaces the EXACT matched model name as residency proof", async () => {
    const ledger = path.join(os.tmpdir(), `gpu-judge-exact-${process.pid}-${Math.floor(performance.now())}.jsonl`);
    tmpFiles.push(ledger);
    fs.writeFileSync(ledger, JSON.stringify(row({ cell_id: "a" })) + "\n");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("/api/ps")) {
          return {
            ok: true,
            json: async () => ({
              models: [
                { name: "qwen2.5-coder:7b", size: 100, size_vram: 100 },
                { name: "qwen2.5-coder:32b", size: 1000, size_vram: 1000 },
              ],
            }),
          } as unknown as Response;
        }
        return { ok: true, json: async () => ({ response: '{"soundness":"sound_conservative","rationale":"x"}' }) } as unknown as Response;
      }),
    );
    const report = await engine.runFromLedgerFile(ledger, { model: "qwen2.5-coder:32b" });
    expect(report.gpu_resident).toBe(true);
    expect(report.matched_model).toBe("qwen2.5-coder:32b"); // the exact requested tag, not the 7b
  });

  // --- scrutiny P2: silent-exclusion observability ------------------------
  it("emits a LOUD WARNING when rows parse but ZERO are judgeable (producer drift)", async () => {
    const ledger = path.join(os.tmpdir(), `gpu-judge-wipe-${process.pid}-${Math.floor(performance.now())}.jsonl`);
    tmpFiles.push(ledger);
    // Rows present but all lack a usable baseline → 0 judgeable.
    fs.writeFileSync(
      ledger,
      [JSON.stringify(row({ cell_id: "a", baseline_vc_mpm: null })), JSON.stringify(row({ cell_id: "b", baseline_vc_mpm: 0 }))].join("\n") + "\n",
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("/api/ps")) return { ok: true, json: async () => ({ models: [] }) } as unknown as Response;
        return { ok: true, json: async () => ({ response: '{"soundness":"uncertain","rationale":"x"}' }) } as unknown as Response;
      }),
    );
    const report = await engine.runFromLedgerFile(ledger);
    expect(report.total_rows).toBe(2);
    expect(report.judged_rows).toBe(0);
    expect(report.notes.some((n) => /0 judgeable regimes out of 2/i.test(n))).toBe(true);
  });

  it("does NOT emit the drift WARNING on a deliberate limit:0 probe (judgeable=0 by design)", async () => {
    const ledger = path.join(os.tmpdir(), `gpu-judge-probe-${process.pid}-${Math.floor(performance.now())}.jsonl`);
    tmpFiles.push(ledger);
    // Rows ARE judgeable, but limit:0 slices to none — must NOT be read as drift.
    fs.writeFileSync(ledger, JSON.stringify(row({ cell_id: "a" })) + "\n");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ models: [] }) }) as unknown as Response),
    );
    const report = await engine.runFromLedgerFile(ledger, { limit: 0 });
    expect(report.judged_rows).toBe(0);
    expect(report.notes.some((n) => /0 judgeable regimes/i.test(n))).toBe(false);
  });

  // --- scrutiny P2: limit:0 probe must NOT persist (no clobber) ------------
  it("does NOT persist on a limit:0 probe run (cannot clobber a prior report)", async () => {
    const ledger = path.join(os.tmpdir(), `gpu-judge-noclobber-${process.pid}-${Math.floor(performance.now())}.jsonl`);
    const out = path.join(os.tmpdir(), `gpu-judge-noclobber-out-${process.pid}-${Math.floor(performance.now())}.json`);
    tmpFiles.push(ledger, out);
    fs.writeFileSync(ledger, JSON.stringify(row({ cell_id: "a" })) + "\n");
    // Pre-seed a "real" report at the out path; the limit:0 probe must not overwrite it.
    fs.writeFileSync(out, JSON.stringify({ sentinel: "prior-real-report" }));
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ models: [] }) }) as unknown as Response),
    );
    await engine.runFromLedgerFile(ledger, { limit: 0, outPath: out });
    const after = JSON.parse(fs.readFileSync(out, "utf8"));
    expect(after.sentinel).toBe("prior-real-report"); // untouched
  });

  // --- failure mode: missing ledger fails loud ---------------------------

  it("FAILURE: missing ledger throws (fail-loud, not silent)", async () => {
    await expect(engine.runFromLedgerFile("does-not-exist.jsonl")).rejects.toThrow(/ledger not found/i);
  });

  // --- adversarial: limit honored + unjudgeable rows excluded ------------

  it("honors the limit cap and excludes unjudgeable rows", async () => {
    const ledger = path.join(os.tmpdir(), `gpu-judge-lim-${process.pid}-${Math.floor(performance.now())}.jsonl`);
    tmpFiles.push(ledger);
    fs.writeFileSync(
      ledger,
      [
        JSON.stringify(row({ cell_id: "a" })),
        JSON.stringify(row({ cell_id: "b" })),
        JSON.stringify(row({ cell_id: "c" })),
        JSON.stringify(row({ cell_id: "d", baseline_vc_mpm: 0 })), // unjudgeable
      ].join("\n") + "\n",
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("/api/ps")) return { ok: true, json: async () => ({ models: [] }) } as unknown as Response;
        return { ok: true, json: async () => ({ response: '{"soundness":"uncertain","rationale":"x"}' }) } as unknown as Response;
      }),
    );
    const report = await engine.runFromLedgerFile(ledger, { limit: 2 });
    expect(report.judged_rows).toBe(2); // capped at 2 of 3 judgeable
  });

  // --- persist round-trip ------------------------------------------------

  it("persists a schema-versioned report that round-trips", async () => {
    const ledger = path.join(os.tmpdir(), `gpu-judge-rt-${process.pid}-${Math.floor(performance.now())}.jsonl`);
    const out = path.join(os.tmpdir(), `gpu-judge-out-${process.pid}-${Math.floor(performance.now())}.json`);
    tmpFiles.push(ledger, out);
    fs.writeFileSync(ledger, JSON.stringify(row({ cell_id: "a" })) + "\n");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("/api/ps")) return { ok: true, json: async () => ({ models: [] }) } as unknown as Response;
        return { ok: true, json: async () => ({ response: '{"soundness":"sound_conservative","rationale":"ok"}' }) } as unknown as Response;
      }),
    );
    await engine.runFromLedgerFile(ledger, { outPath: out });
    expect(fs.existsSync(out)).toBe(true);
    const reloaded = JSON.parse(fs.readFileSync(out, "utf8"));
    expect(reloaded.schemaVersion).toBe("1.0.0");
    expect(reloaded.verdicts.length).toBe(1);
  });
});
