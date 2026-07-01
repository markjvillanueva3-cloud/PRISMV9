/**
 * SpeedFeedGpuJudgeEngine — OSCAR-SFC-9AXIS-MS0 / U-OSC-GPU-JUDGE
 * ============================================================================
 *
 * The GPU-IN-THE-LOOP layer of the SFC closed-loop training pipeline. For each
 * sweep regime (one row of the full-sweep comparison ledger), this engine asks a
 * GPU-resident reasoning model (Ollama on the RTX PRO 6000 Blackwell) to judge —
 * as a master machinist would — whether PRISM's physics-derived Vc is SOUND
 * relative to the vendor baseline, and to classify the gap.
 *
 * Why the GPU matters here (the honest answer to "utilize the Blackwell"):
 * the calibration *arithmetic* (median deltas, factors) is CPU-trivial — but the
 * JUDGMENT of whether a conservative number is *correctly* conservative or just
 * *leaving metal on the table* is a reasoning task. A 32B-class model held fully
 * resident (≈37.5 GB VRAM, no CPU offload — only possible on the 97 GB Blackwell)
 * runs that judgment across the whole input matrix in one resident pass. That is
 * the GPU-bound half of "closed-loop training + comparison."
 *
 * SAFETY (R12 + speed-feed soul): the model's verdict is ADVISORY. It NEVER
 * changes a recommendation, NEVER raises Vc, NEVER overrides physics. It augments
 * the calibration ledger with a reasoned label so a human + the (gated) apply
 * layer have richer context. An "aggressive" verdict is logged, not acted on.
 *
 * Network/IO only — no physics re-implemented (it reads pre-computed sweep rows),
 * no constants inlined. Fail-loud: if the GPU endpoint is unreachable, the run
 * reports it explicitly (never fabricates a verdict).
 *
 * @module engines/SpeedFeedGpuJudgeEngine
 */

import fs from "node:fs";
import path from "node:path";

/** One row of the full-sweep comparison ledger (sfc-full-sweep-compare.mjs). */
export interface JudgeLedgerRow {
  cell_id: string;
  domain: string;
  iso: string;
  material: string;
  tool_diameter_mm: number;
  mode: string;
  prism_vc_mpm: number | null;
  baseline_vc_mpm: number | null;
}

/** The structured verdict the GPU model returns for one regime. */
export interface RegimeVerdict {
  cell_id: string;
  iso: string;
  material: string;
  mode: string;
  prism_vc_mpm: number;
  baseline_vc_mpm: number;
  delta_pct: number;
  /** Machinist soundness call: is PRISM's number defensible for this regime? */
  soundness: "sound_conservative" | "sound_match" | "too_conservative" | "too_aggressive" | "uncertain";
  /** One-line machinist rationale (model-generated, advisory). */
  rationale: string;
  /** Did this verdict come from the GPU model, or a fail-soft fallback? */
  source: "gpu_model" | "fallback_unreachable" | "fallback_parse_error";
}

export interface GpuJudgeRunReport {
  schemaVersion: string;
  model: string;
  endpoint: string;
  generated_from: string;
  total_rows: number;
  judged_rows: number;
  /** Rows that fell back (endpoint unreachable or unparsable) — surfaced, not hidden. */
  fallback_rows: number;
  gpu_resident: boolean | null;
  /** The EXACT model name found resident (proof the requested tag, not a same-family tag, is on the GPU). */
  matched_model: string | null;
  vram_used_mib: number | null;
  verdicts: RegimeVerdict[];
  /** Soundness histogram across all judged regimes. */
  soundness_histogram: Record<string, number>;
  apply_policy: "advisory-only";
  notes: string[];
}

const SCHEMA_VERSION = "1.0.0";
const DEFAULT_ENDPOINT = "http://127.0.0.1:11434";
// 32B coder reasons well about machining tradeoffs and is the model proven 100%
// GPU-resident on the Blackwell (size_vram == size, no CPU split).
const DEFAULT_MODEL = "qwen2.5-coder:32b";
// Bounded per-request timeout so a hung-but-accepting endpoint cannot stall the
// whole sweep — fail to a labeled fallback instead of blocking forever.
const FETCH_TIMEOUT_MS = 60_000;

export class SpeedFeedGpuJudgeEngine {
  /**
   * Parse a JSONL sweep ledger into judge rows. Skips blank/torn lines.
   *
   * @param text raw JSONL contents
   * @returns parsed rows that carry both PRISM and baseline Vc (the judgeable set)
   */
  parseLedger(text: string): JudgeLedgerRow[] {
    const rows: JudgeLedgerRow[] = [];
    for (const line of text.split("\n")) {
      const t = line.trim();
      if (!t) continue;
      try {
        const r = JSON.parse(t) as JudgeLedgerRow;
        if (typeof r.iso === "string" && typeof r.mode === "string") rows.push(r);
      } catch {
        /* torn/partial trailing line — skip */
      }
    }
    return rows;
  }

  /** Only rows with a finite PRISM Vc AND a finite positive baseline are judgeable. */
  private isJudgeable(r: JudgeLedgerRow): boolean {
    return (
      typeof r.prism_vc_mpm === "number" &&
      Number.isFinite(r.prism_vc_mpm) &&
      typeof r.baseline_vc_mpm === "number" &&
      Number.isFinite(r.baseline_vc_mpm) &&
      r.baseline_vc_mpm > 0
    );
  }

  /**
   * Build the machinist-judge prompt for one regime. Deterministic — no random.
   *
   * @param r a judgeable sweep row
   * @returns the prompt string sent to the GPU model
   */
  buildPrompt(r: JudgeLedgerRow): string {
    const deltaPct = (((r.prism_vc_mpm as number) - (r.baseline_vc_mpm as number)) / (r.baseline_vc_mpm as number)) * 100;
    return [
      "You are a master CNC machinist judging a speed/feed recommendation.",
      `Material: ${r.material} (ISO group ${r.iso}). Tool diameter: ${r.tool_diameter_mm} mm. Optimization mode: ${r.mode}.`,
      `PRISM (physics-first calculator) recommends cutting speed Vc = ${(r.prism_vc_mpm as number).toFixed(1)} m/min.`,
      `Vendor baseline (lookup-table average) is Vc = ${(r.baseline_vc_mpm as number).toFixed(1)} m/min.`,
      `PRISM is ${deltaPct >= 0 ? "+" : ""}${deltaPct.toFixed(1)}% vs the vendor baseline.`,
      "",
      "A conservative number (below baseline) protects tool life and the spindle but may leave metal on the table.",
      "An aggressive number (above baseline) risks tool/spindle wear unless justified.",
      "Judge whether PRISM's number is defensible for THIS regime. Respond ONLY with compact JSON:",
      '{"soundness":"sound_conservative|sound_match|too_conservative|too_aggressive|uncertain","rationale":"<=18 words"}',
    ].join("\n");
  }

  /**
   * Parse the model's JSON verdict; fail-soft to a labeled fallback (never throws,
   * never fabricates a confident verdict from garbage).
   */
  parseVerdict(
    raw: string,
    r: JudgeLedgerRow,
  ): Pick<RegimeVerdict, "soundness" | "rationale" | "source"> {
    const valid = new Set([
      "sound_conservative",
      "sound_match",
      "too_conservative",
      "too_aggressive",
      "uncertain",
    ]);
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        const j = JSON.parse(m[0]) as { soundness?: string; rationale?: string };
        if (typeof j.soundness === "string" && valid.has(j.soundness)) {
          return {
            soundness: j.soundness as RegimeVerdict["soundness"],
            rationale: typeof j.rationale === "string" ? j.rationale.slice(0, 160) : "",
            source: "gpu_model",
          };
        }
      } catch {
        /* fall through to fallback */
      }
    }
    return { soundness: "uncertain", rationale: "model output unparsable", source: "fallback_parse_error" };
  }

  /**
   * Query the GPU-resident model for one regime over the Ollama HTTP API.
   *
   * @returns the raw model text, or null if the endpoint is unreachable
   */
  async queryModel(prompt: string, model: string, endpoint: string): Promise<string | null> {
    try {
      const res = await fetch(`${endpoint}/api/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          options: { temperature: 0, num_predict: 80 },
        }),
      });
      if (!res.ok) return null;
      const j = (await res.json()) as { response?: string };
      return typeof j.response === "string" ? j.response : null;
    } catch {
      return null; // endpoint down / network error — caller records fallback
    }
  }

  /**
   * Probe Ollama for GPU residency of the model (proves the Blackwell is in use,
   * not a CPU fallback). Returns null if unreachable.
   */
  async probeGpuResidency(
    model: string,
    endpoint: string,
  ): Promise<{ resident: boolean; vramMib: number; matchedModel: string } | null> {
    try {
      const res = await fetch(`${endpoint}/api/ps`, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (!res.ok) return null;
      const j = (await res.json()) as { models?: { name: string; size: number; size_vram: number }[] };
      // EXACT tag match only. A prefix match (qwen2.5-coder:7b for a :32b request)
      // would report the WRONG model's residency as proof the requested model is on
      // the GPU — a false-positive utilization claim, the exact thing this probe
      // exists to prevent. If the exact tag isn't resident, report not-resident.
      const hit = (j.models ?? []).find((m) => m.name === model);
      if (!hit) return { resident: false, vramMib: 0, matchedModel: "" };
      // 100%-GPU residency means size_vram == size (no CPU offload split).
      const resident = hit.size_vram > 0 && hit.size_vram >= hit.size * 0.99;
      return { resident, vramMib: Math.round(hit.size_vram / (1024 * 1024)), matchedModel: hit.name };
    } catch {
      return null;
    }
  }

  /**
   * Run the GPU-in-the-loop judge across every judgeable regime in a sweep ledger.
   *
   * @param ledgerPath JSONL sweep ledger
   * @param opts model/endpoint/limit overrides
   * @returns the run report (verdicts + histogram + GPU-residency evidence)
   */
  async runFromLedgerFile(
    ledgerPath: string,
    opts: { model?: string; endpoint?: string; limit?: number; outPath?: string } = {},
  ): Promise<GpuJudgeRunReport> {
    if (!fs.existsSync(ledgerPath)) {
      throw new Error(`SpeedFeedGpuJudge: ledger not found at ${ledgerPath}`);
    }
    const model = opts.model ?? DEFAULT_MODEL;
    const endpoint = opts.endpoint ?? DEFAULT_ENDPOINT;
    // limit:0 = a deliberate reachability/residency PROBE (zero model calls). This
    // one flag single-sources every "is this a probe?" decision below (slice, the
    // drift WARNING, and persist-skip) so they can never drift out of lockstep.
    const isProbe = opts.limit === 0;
    const allRows = this.parseLedger(fs.readFileSync(ledgerPath, "utf8"));
    let judgeable = allRows.filter((r) => this.isJudgeable(r));
    if (typeof opts.limit === "number" && opts.limit >= 0) judgeable = judgeable.slice(0, opts.limit);

    const gpu = await this.probeGpuResidency(model, endpoint);

    const verdicts: RegimeVerdict[] = [];
    let fallback = 0;
    for (const r of judgeable) {
      const prism = r.prism_vc_mpm as number;
      const baseline = r.baseline_vc_mpm as number;
      const deltaPct = ((prism - baseline) / baseline) * 100;
      const raw = await this.queryModel(this.buildPrompt(r), model, endpoint);
      let parsed: Pick<RegimeVerdict, "soundness" | "rationale" | "source">;
      if (raw === null) {
        parsed = { soundness: "uncertain", rationale: "GPU endpoint unreachable", source: "fallback_unreachable" };
        fallback++;
      } else {
        parsed = this.parseVerdict(raw, r);
        if (parsed.source !== "gpu_model") fallback++;
      }
      verdicts.push({
        cell_id: r.cell_id,
        iso: r.iso,
        material: r.material,
        mode: r.mode,
        prism_vc_mpm: Number(prism.toFixed(1)),
        baseline_vc_mpm: Number(baseline.toFixed(1)),
        delta_pct: Number(deltaPct.toFixed(1)),
        ...parsed,
      });
    }

    const histogram: Record<string, number> = {};
    for (const v of verdicts) histogram[v.soundness] = (histogram[v.soundness] ?? 0) + 1;

    const notes: string[] = [
      "Verdicts are ADVISORY — the GPU model NEVER changes a recommendation, raises Vc, or overrides physics.",
      `${verdicts.length - fallback} of ${verdicts.length} regimes judged by the GPU model; ${fallback} fell back (logged, not fabricated).`,
    ];
    // Loud-on-total-exclusion: rows parsed but ZERO judgeable usually means a
    // producer schema rename (e.g. prism_vc_mpm dropped) — without this the report
    // would look valid-but-empty and a silent producer drift would pass unseen.
    if (allRows.length > 0 && judgeable.length === 0 && !isProbe) {
      notes.unshift(
        `WARNING: 0 judgeable regimes out of ${allRows.length} parsed rows — every row lacked a finite positive PRISM Vc and baseline. ` +
          "Likely a producer schema drift (sfc-full-sweep-compare.mjs row shape changed). The report below is EMPTY.",
      );
    }
    if (gpu && !gpu.resident) {
      notes.unshift(
        `WARNING: model ${model} is NOT fully GPU-resident (matched "${gpu.matchedModel || "none"}", vram ${gpu.vramMib} MiB) — ` +
          "verdicts may have run on a CPU split, defeating Blackwell utilization.",
      );
    }
    if (gpu === null) {
      notes.unshift("WARNING: could not probe GPU residency (Ollama /api/ps unreachable) — GPU utilization unverified.");
    }

    const report: GpuJudgeRunReport = {
      schemaVersion: SCHEMA_VERSION,
      model,
      endpoint,
      generated_from: ledgerPath,
      total_rows: allRows.length,
      judged_rows: verdicts.length,
      fallback_rows: fallback,
      gpu_resident: gpu ? gpu.resident : null,
      matched_model: gpu ? gpu.matchedModel : null,
      vram_used_mib: gpu ? gpu.vramMib : null,
      verdicts,
      soundness_histogram: histogram,
      apply_policy: "advisory-only",
      notes,
    };

    // Skip persistence on a probe run (limit:0, the reachability guard) so it can
    // never clobber a real prior report with an empty one.
    if (opts.outPath && !isProbe) this.persist(report, opts.outPath);
    return report;
  }

  /** Persist a run report (atomic write, tmp cleaned on rename failure). */
  persist(report: GpuJudgeRunReport, outPath: string): void {
    const dir = path.dirname(outPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmp = `${outPath}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(report, null, 2), "utf8");
    try {
      fs.renameSync(tmp, outPath);
    } catch (e) {
      try {
        fs.rmSync(tmp, { force: true });
      } catch {
        /* best-effort cleanup */
      }
      throw e;
    }
  }

  static getSelfAwareness() {
    return {
      name: "SpeedFeedGpuJudgeEngine",
      milestone: "OSCAR-SFC-9AXIS-MS0/U-OSC-GPU-JUDGE",
      capabilities: ["parseLedger", "buildPrompt", "parseVerdict", "queryModel", "probeGpuResidency", "runFromLedgerFile"],
      gpu: "Ollama-resident reasoning model (RTX PRO 6000 Blackwell)",
      apply_policy: "advisory-only (verdicts never change a recommendation)",
    };
  }
}

export const speedFeedGpuJudgeEngine = new SpeedFeedGpuJudgeEngine();
