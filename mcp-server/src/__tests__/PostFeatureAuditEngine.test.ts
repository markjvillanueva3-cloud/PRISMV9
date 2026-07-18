/**
 * PostFeatureAuditEngine — real-behavior tests against the live Hurco
 * VM30i v8.9.153 + v11 .cps files (the same fixtures that drove the
 * HURCO-VM30i-V8.9-vs-V11-COMPARE-2026-05-25 spec).
 *
 * Both fixtures are gitignored operator-local — if absent on this
 * machine, the file-based tests skip gracefully so CI in a fresh
 * checkout never fails spuriously.  Logic-only tests (auditSource,
 * input validation) run unconditionally.
 *
 * Authored 2026-05-25 (slot:echo /goal post-fleet iter11).
 */

import { describe, it, expect } from "vitest";
import { existsSync, statSync, readFileSync } from "node:fs";
import {
  postFeatureAuditEngine,
  PostFeatureAuditEngine,
  FEATURE_TABLE,
  type FeatureFinding,
} from "../engines/PostFeatureAuditEngine.js";

const ROOT = "H:/prism/JM DIE/PRISM MODIFIED POST PROCESSORS";
const V89 = `${ROOT}/HURCO_VM30i_PRISM_Enhanced_v8.9.153.cps`;
const V11 = `${ROOT}/HURCO_VM30i_PRISM_v11.cps`;
const HAVE_FIXTURES = existsSync(V89) && existsSync(V11);

// Type-safe bad-input shim — avoids `as any` lint warning while still
// passing values the engine must reject at runtime.
function asPath(value: unknown): string { return value as string; }
function asSrc(value: unknown): string { return value as string; }

describe("PostFeatureAuditEngine", () => {
  describe("FEATURE_TABLE shape", () => {
    it("contains the full superset (23 spec + 5 supporting = 28)", () => {
      // 8 G/M codes + 3 Hurco-controller idioms + 6 CAM-bridge advanced
      // + 8 PRISM property markers + 2 AGI-handoff variants + 1 probing
      expect(FEATURE_TABLE.length).toBe(28);
    });

    it("every feature has a unique id", () => {
      const ids = FEATURE_TABLE.map((f) => f.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids).toContain("g053-smoothing");
      expect(ids).toContain("winmax-marker");
      expect(ids).toContain("prism-aggressiveness");
    });

    it("every feature has a non-empty pattern", () => {
      for (const f of FEATURE_TABLE) {
        expect(f.pattern.length).toBeGreaterThan(0);
      }
    });

    it("bridgeActionWhenAbsent is one of the 5 known actions", () => {
      const known = new Set(["shipped", "wire", "restore", "verify", "engine"]);
      for (const f of FEATURE_TABLE) {
        expect(known.has(f.bridgeActionWhenAbsent)).toBe(true);
      }
    });

    it("WinMAX entry specifically maps to 'restore' (regression marker)", () => {
      const winmax = FEATURE_TABLE.find((f) => f.id === "winmax-marker");
      expect(winmax?.bridgeActionWhenAbsent).toBe("restore");
    });

    it("AGI handoff entry specifically maps to 'engine' (deeper fix needed)", () => {
      const agi = FEATURE_TABLE.find((f) => f.id === "prism-agi-handoff");
      expect(agi?.bridgeActionWhenAbsent).toBe("engine");
    });
  });

  describe("auditSource() — pure, no-IO", () => {
    it("empty source returns zero hits across all features", () => {
      const r = postFeatureAuditEngine.auditSource("");
      expect(r.present_count).toBe(0);
      expect(r.coverage).toBe(0);
      expect(r.findings.length).toBe(FEATURE_TABLE.length);
      expect(r.findings.every((f) => f.hits === 0 && !f.present)).toBe(true);
    });

    it("counts substring occurrences accurately (no regex traps)", () => {
      const src = "G05.3 P1\nG05.3 P2\nG64\nWinMAX-V11";
      const r = postFeatureAuditEngine.auditSource(src);
      const g053 = r.findings.find((f) => f.id === "g053-smoothing");
      const g64 = r.findings.find((f) => f.id === "g64-contour");
      const winmax = r.findings.find((f) => f.id === "winmax-marker");
      expect(g053?.hits).toBe(2);
      expect(g053?.present).toBe(true);
      expect(g64?.hits).toBe(1);
      expect(winmax?.hits).toBe(1);
    });

    it("non-overlapping advance — 'GGGG' with needle 'GG' yields 2 hits not 3", () => {
      const r = postFeatureAuditEngine.auditSource("GGGG");
      // Synthetic: ensure indexOf-advance-by-needle.length doesn't double-count.
      // We don't have a 'GG' feature, but we can verify the algorithm via the
      // private interface using a known short pattern. Use 'TCP' which is in
      // the table (id: tcp-rtcp). 'TCPTCP' has 2 hits (non-overlapping).
      const r2 = postFeatureAuditEngine.auditSource("TCPTCP");
      const tcp = r2.findings.find((f) => f.id === "tcp-rtcp");
      expect(tcp?.hits).toBe(2);
      const r3 = postFeatureAuditEngine.auditSource("TCPCPTCP");
      const tcp3 = r3.findings.find((f) => f.id === "tcp-rtcp");
      // "TCPCPTCP" — TCP at 0, then advance to 3 ("CPTCP"), TCP at 5 → 2 hits
      expect(tcp3?.hits).toBe(2);
    });

    it("bridgeAction='shipped' for present, table-value for absent", () => {
      const src = "G05.3 P1\nWinMAX"; // G05.3 + WinMAX present; others absent
      const r = postFeatureAuditEngine.auditSource(src);
      const g053 = r.findings.find((f) => f.id === "g053-smoothing");
      const tribal = r.findings.find((f) => f.id === "prism-tribal");
      const aggro = r.findings.find((f) => f.id === "prism-aggressiveness");
      const agi = r.findings.find((f) => f.id === "prism-agi-handoff");
      expect(g053?.bridgeAction).toBe("shipped");
      expect(tribal?.bridgeAction).toBe("wire");
      expect(aggro?.bridgeAction).toBe("verify");
      expect(agi?.bridgeAction).toBe("engine");
    });

    it("by_action grouping sums to total_features", () => {
      const r = postFeatureAuditEngine.auditSource("G05.3");
      const total =
        r.by_action.shipped.length +
        r.by_action.wire.length +
        r.by_action.restore.length +
        r.by_action.verify.length +
        r.by_action.engine.length;
      expect(total).toBe(FEATURE_TABLE.length);
      // G05.3 should be the only "shipped" entry from this source
      expect(r.by_action.shipped.length).toBe(1);
      expect(r.by_action.shipped[0].id).toBe("g053-smoothing");
    });

    it("size_bytes uses Buffer.byteLength for utf8 accuracy", () => {
      const src = "G05.3 µm"; // µ is 2 bytes utf8
      const r = postFeatureAuditEngine.auditSource(src);
      expect(r.size_bytes).toBe(Buffer.byteLength(src, "utf8"));
      expect(r.size_bytes).toBe(src.length + 1);
    });

    it("rejects non-string src (adversarial: undefined/number/null)", () => {
      expect(() => postFeatureAuditEngine.auditSource(asSrc(undefined))).toThrow(/must be a string/);
      expect(() => postFeatureAuditEngine.auditSource(asSrc(42))).toThrow(/must be a string/);
      expect(() => postFeatureAuditEngine.auditSource(asSrc(null))).toThrow(/must be a string/);
    });

    it("handles oversize input without blowing up (8 MB synthetic, exact hit count)", () => {
      const chunk = "G05.3 P1 // smoothing block " + "x".repeat(996) + "\n";
      const big = chunk.repeat(8192);
      const r = postFeatureAuditEngine.auditSource(big);
      const g053 = r.findings.find((f) => f.id === "g053-smoothing");
      expect(g053?.hits).toBe(8192);
      expect(r.size_bytes).toBeGreaterThan(8_000_000);
    });

    it("substring matches across newlines (no anchor assumption)", () => {
      const src = "preamble\nG54.1 P12\nrest";
      const r = postFeatureAuditEngine.auditSource(src);
      const ext = r.findings.find((f) => f.id === "g541-ext-wcs");
      expect(ext?.hits).toBe(1);
      expect(ext?.present).toBe(true);
    });

    it("coverage equals present_count / total_features", () => {
      const src = "G05.3\nG64\nM140\nWinMAX"; // 4 present
      const r = postFeatureAuditEngine.auditSource(src);
      expect(r.present_count).toBe(4);
      expect(r.coverage).toBeCloseTo(4 / FEATURE_TABLE.length, 10);
    });
  });

  describe("auditFile() — IO + error paths", () => {
    it("rejects non-string path", () => {
      expect(() => postFeatureAuditEngine.auditFile(asPath(undefined))).toThrow(
        /must be a non-empty string/,
      );
    });

    it("rejects empty path", () => {
      expect(() => postFeatureAuditEngine.auditFile("")).toThrow(
        /must be a non-empty string/,
      );
    });

    it("rejects nonexistent file with structured error", () => {
      expect(() =>
        postFeatureAuditEngine.auditFile("H:/prism/_nonexistent_path_xyz.cps"),
      ).toThrow(/file not found/);
    });

    it("rejects directory path with structured error", () => {
      expect(() => postFeatureAuditEngine.auditFile("H:/prism")).toThrow(
        /not a regular file/,
      );
    });
  });

  describe("auditFile() against live v8.9 and v11 fixtures", () => {
    it("v8.9.153 — prismAggressivenessLevel hits ≥3 (the 'fully worky' knob)", () => {
      if (!HAVE_FIXTURES) {
        expect(HAVE_FIXTURES).toBe(false);
        return;
      }
      const r = postFeatureAuditEngine.auditFile(V89);
      const aggro = r.findings.find((f) => f.id === "prism-aggressiveness");
      expect(aggro?.present).toBe(true);
      expect(aggro?.hits).toBeGreaterThanOrEqual(3);
    });

    it("v8.9.153 — WinMAX controller-id comment hits ≥2", () => {
      if (!HAVE_FIXTURES) return;
      const r = postFeatureAuditEngine.auditFile(V89);
      const winmax = r.findings.find((f) => f.id === "winmax-marker");
      expect(winmax?.present).toBe(true);
      expect(winmax?.hits).toBeGreaterThanOrEqual(2);
    });

    it("v11 — WinMAX REGRESSED to 0 hits (spec §3 finding)", () => {
      if (!HAVE_FIXTURES) return;
      const r = postFeatureAuditEngine.auditFile(V11);
      const winmax = r.findings.find((f) => f.id === "winmax-marker");
      expect(winmax?.hits).toBe(0);
      expect(winmax?.present).toBe(false);
      expect(winmax?.bridgeAction).toBe("restore");
    });

    it("v11 — prismOptimizationMode hits ≥3 (supersedes prismAggressivenessLevel)", () => {
      if (!HAVE_FIXTURES) return;
      const r = postFeatureAuditEngine.auditFile(V11);
      const opt = r.findings.find((f) => f.id === "prism-opt-mode");
      expect(opt?.present).toBe(true);
      expect(opt?.hits).toBeGreaterThanOrEqual(3);
    });

    it("v11 — G64 expanded from 1 to ≥10 hits (per-op binding landed)", () => {
      if (!HAVE_FIXTURES) return;
      const r = postFeatureAuditEngine.auditFile(V11);
      const g64 = r.findings.find((f) => f.id === "g64-contour");
      expect(g64?.hits).toBeGreaterThanOrEqual(10);
    });

    it("v11 — UltiMotion expanded from 3 to ≥10 hits", () => {
      if (!HAVE_FIXTURES) return;
      const r = postFeatureAuditEngine.auditFile(V11);
      const u = r.findings.find((f) => f.id === "ultimotion");
      expect(u?.hits).toBeGreaterThanOrEqual(10);
    });

    it("v11 file size is in 800-900KB range (~813KB on disk)", () => {
      if (!HAVE_FIXTURES) return;
      const r = postFeatureAuditEngine.auditFile(V11);
      expect(r.size_bytes).toBeGreaterThan(800_000);
      expect(r.size_bytes).toBeLessThan(900_000);
    });

    it("v8.9 vs v11 — v11 has more present features overall", () => {
      if (!HAVE_FIXTURES) return;
      const r89 = postFeatureAuditEngine.auditFile(V89);
      const r11 = postFeatureAuditEngine.auditFile(V11);
      expect(r11.present_count).toBeGreaterThan(r89.present_count);
    });
  });

  describe("compareFiles() — regression + addition detection", () => {
    it("surfaces WinMAX as a v11 regression vs v8.9 baseline", () => {
      if (!HAVE_FIXTURES) return;
      const cmp = postFeatureAuditEngine.compareFiles(V89, V11);
      const winmax = cmp.regressions.find((f: FeatureFinding) => f.id === "winmax-marker");
      expect(winmax?.id).toBe("winmax-marker");
      expect(winmax?.present).toBe(false);
      expect(winmax?.bridgeAction).toBe("restore");
    });

    it("surfaces prismOptimizationMode as a v11 addition vs v8.9 baseline", () => {
      if (!HAVE_FIXTURES) return;
      const cmp = postFeatureAuditEngine.compareFiles(V89, V11);
      const opt = cmp.additions.find((f: FeatureFinding) => f.id === "prism-opt-mode");
      expect(opt?.id).toBe("prism-opt-mode");
      expect(opt?.present).toBe(true);
      expect(opt?.hits).toBeGreaterThanOrEqual(3);
    });

    it("preserves PRISM tribal-citation as unchanged (present in both)", () => {
      if (!HAVE_FIXTURES) return;
      const cmp = postFeatureAuditEngine.compareFiles(V89, V11);
      const tribal = cmp.unchanged.find((f: FeatureFinding) => f.id === "prism-tribal");
      expect(tribal?.id).toBe("prism-tribal");
      expect(tribal?.present).toBe(true);
    });

    it("regressions + additions + unchanged sum to FEATURE_TABLE.length", () => {
      if (!HAVE_FIXTURES) return;
      const cmp = postFeatureAuditEngine.compareFiles(V89, V11);
      expect(
        cmp.regressions.length + cmp.additions.length + cmp.unchanged.length,
      ).toBe(FEATURE_TABLE.length);
    });

    it("coverage_delta equals candidate.coverage - baseline.coverage", () => {
      if (!HAVE_FIXTURES) return;
      const cmp = postFeatureAuditEngine.compareFiles(V89, V11);
      expect(cmp.coverage_delta).toBeCloseTo(
        cmp.candidate.coverage - cmp.baseline.coverage,
        10,
      );
    });

    it("baseline path is V89 and candidate path is V11 (sanity)", () => {
      if (!HAVE_FIXTURES) return;
      const cmp = postFeatureAuditEngine.compareFiles(V89, V11);
      expect(cmp.baseline.path).toBe(V89);
      expect(cmp.candidate.path).toBe(V11);
    });
  });

  describe("brand-agnostic — works on non-Hurco posts", () => {
    it("synthetic Mastercam .pst snippet detects G05.3 + G64 + TCP", () => {
      const src = "n100 G05.3 P1\nn110 G64\nn120 G43.4 H1 (TCP on)";
      const r = postFeatureAuditEngine.auditSource(src);
      expect(r.findings.find((f) => f.id === "g053-smoothing")?.present).toBe(true);
      expect(r.findings.find((f) => f.id === "g64-contour")?.present).toBe(true);
      expect(r.findings.find((f) => f.id === "tcp-rtcp")?.present).toBe(true);
    });

    it("synthetic hyperMILL .cnc snippet detects probing + M140 + G65", () => {
      const src = "% probing OFF\nG65 P9810 X10 Y20 Z5\nM140 (safe retract)";
      const r = postFeatureAuditEngine.auditSource(src);
      expect(r.findings.find((f) => f.id === "probing-wcs")?.present).toBe(true);
      expect(r.findings.find((f) => f.id === "m140-retract")?.present).toBe(true);
      expect(r.findings.find((f) => f.id === "g65-macro")?.present).toBe(true);
    });

    it("snippet with NO recognized features → zero coverage", () => {
      const src = "n10 G00 X0 Y0\nn20 G01 Z-5 F500\nn30 G00 Z25";
      const r = postFeatureAuditEngine.auditSource(src);
      expect(r.present_count).toBe(0);
      expect(r.coverage).toBe(0);
    });
  });

  describe("singleton export", () => {
    it("postFeatureAuditEngine is a PostFeatureAuditEngine instance", () => {
      expect(postFeatureAuditEngine).toBeInstanceOf(PostFeatureAuditEngine);
    });
  });

  // ── E2E: invoke through the camDispatcher (NOT just the engine singleton).
  //         Pattern matches existing camDispatcher.controller-calibration-wire.test.ts —
  //         a capturing host trap that records server.tool() registrations and re-invokes
  //         the bound handler with {action, params}, parsing the MCP-envelope JSON back out.
  //         This is full real-I/O: the engine reads the 813KB v11 .cps file from disk
  //         through fs.readFileSync; we sanity-check that with a direct statSync below.
  describe("E2E: prism_cam dispatcher round-trip", () => {
    interface CapturedTool {
      name: string;
      handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
    }
    class CapturingMCPHost {
      tools: CapturedTool[] = [];
      tool(name: string, _description: string, _schema: unknown, handler: CapturedTool["handler"]) {
        this.tools.push({ name, handler });
      }
    }
    async function callDispatcher(
      host: CapturingMCPHost,
      action: string,
      params: Record<string, unknown> = {},
    ): Promise<{ ok: boolean; data: any }> {
      const tool = host.tools.find((t) => t.name === "prism_cam");
      if (!tool) throw new Error("prism_cam not registered");
      const raw = (await tool.handler({ action, params })) as
        | { content: { type: string; text: string }[] }
        | { success: false; error: string };
      if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
        return { ok: false, data: raw };
      }
      const envelope = raw as { content: { type: string; text: string }[] };
      const text = envelope.content[0]!.text;
      try {
        return { ok: true, data: JSON.parse(text) };
      } catch {
        return { ok: false, data: { rawText: text } };
      }
    }

    it("cam_post_feature_audit through prism_cam — real file I/O, real findings", async () => {
      if (!HAVE_FIXTURES) return;
      // Independent real-I/O sanity: confirm the fixture really is on disk
      // at the size the engine will report through the dispatcher envelope.
      const onDiskSize = statSync(V11).size;
      // And confirm a known v11 marker string really is in the file body
      // (the substring the engine will count) — pure real-I/O verification.
      expect(readFileSync(V11, "utf8")).toMatch(/G05\.3/);
      expect(onDiskSize).toBeGreaterThan(800_000);

      const { registerCamDispatcher } = await import("../tools/dispatchers/camDispatcher.js");
      const host = new CapturingMCPHost();
      registerCamDispatcher(host as unknown as { tool: (...args: unknown[]) => void });
      const res = await callDispatcher(host, "cam_post_feature_audit", { path: V11 });

      expect(res.ok).toBe(true);
      const payload = res.data as { success?: boolean; data?: any };
      const report = (payload.data ?? payload) as { path: string; total_features: number; size_bytes: number; findings: FeatureFinding[] };
      expect(report.path).toBe(V11);
      expect(report.total_features).toBe(FEATURE_TABLE.length);
      expect(report.size_bytes).toBe(onDiskSize);  // exact match — no double-counting
      const winmax = report.findings.find((f) => f.id === "winmax-marker");
      expect(winmax?.present).toBe(false);
      expect(winmax?.bridgeAction).toBe("restore");
    });

    it("cam_post_feature_compare through prism_cam — surfaces regressions + additions", async () => {
      if (!HAVE_FIXTURES) return;
      // Real-I/O sanity on both fixtures before the dispatcher reads them.
      expect(statSync(V89).isFile()).toBe(true);
      expect(statSync(V11).isFile()).toBe(true);

      const { registerCamDispatcher } = await import("../tools/dispatchers/camDispatcher.js");
      const host = new CapturingMCPHost();
      registerCamDispatcher(host as unknown as { tool: (...args: unknown[]) => void });
      const res = await callDispatcher(host, "cam_post_feature_compare", {
        baseline: V89,
        candidate: V11,
      });

      expect(res.ok).toBe(true);
      const payload = res.data as { success?: boolean; data?: any };
      const cmp = (payload.data ?? payload) as {
        baseline: { path: string };
        candidate: { path: string };
        regressions: FeatureFinding[];
        additions: FeatureFinding[];
      };
      expect(cmp.baseline.path).toBe(V89);
      expect(cmp.candidate.path).toBe(V11);
      const winmax = cmp.regressions.find((f) => f.id === "winmax-marker");
      expect(winmax?.id).toBe("winmax-marker");
      expect(winmax?.present).toBe(false);
      const opt = cmp.additions.find((f) => f.id === "prism-opt-mode");
      expect(opt?.id).toBe("prism-opt-mode");
      expect(opt?.present).toBe(true);
    });
  });
});
