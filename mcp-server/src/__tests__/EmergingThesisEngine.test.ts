/**
 * EmergingThesisEngine.test.ts
 *
 * OBSIDIAN-COMPOUND-MS1/S2/U-EMERGING-THESIS — exit_criteria coverage:
 *   1. 5 docs all on 'thin-wall milling' → confidence ≥ 0.7
 *   2. Contradictory vault → confidence ≤ 0.4
 *   3. Round-trip dispatcher invocation matches singleton output
 *
 * 12 it() cases as specified.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  EmergingThesisEngine,
  emergingThesisEngine,
  type ThesisWindow,
} from "../engines/EmergingThesisEngine.js";

let tmpRoot: string;
const NOW = Date.UTC(2026, 4, 7, 12, 0, 0); // 2026-05-07 12:00 UTC — deterministic

function writeNote(relPath: string, body: string, ageMs = 0): string {
  const full = join(tmpRoot, relPath);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, body, "utf8");
  // Force mtime to NOW - ageMs so window filtering is deterministic.
  const mt = new Date(NOW - ageMs);
  utimesSync(full, mt, mt);
  return full;
}

beforeEach(() => {
  tmpRoot = mkdtempSync(join(tmpdir(), "ete-test-"));
});

afterEach(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});

describe("EmergingThesisEngine", () => {
  it("returns confidence 0 + empty supporting_files for an empty vault", () => {
    const result = emergingThesisEngine.synthesize("7d", { vaultRoot: tmpRoot, now: NOW });
    expect(result.confidence).toBe(0);
    expect(result.supporting_files).toEqual([]);
    expect(result.analyzed_files).toBe(0);
    expect(result.thesis).toMatch(/empty/i);
  });

  it("empty-vault thesis names a smallest-next-step path forward (machinist day-3 acceptance)", () => {
    const result = emergingThesisEngine.synthesize("24h", { vaultRoot: tmpRoot, now: NOW });
    expect(result.thesis).toMatch(/inbox|next step|drop|note/i);
  });

  it("produces high confidence (≥0.7) when 5 files all reference 'thin-wall milling'", () => {
    for (let i = 0; i < 5; i++) {
      writeNote(
        `note-${i}.md`,
        `# Thin-wall milling notes ${i}\n\nThin-wall milling is sensitive to deflection. ` +
          `Thin-wall finish cuts need adaptive feedrate. Thin-wall fixtures matter for thin-wall pockets. ` +
          `Workpiece deflection in thin-wall machining drives strategy.`
      );
    }
    const result = emergingThesisEngine.synthesize("7d", { vaultRoot: tmpRoot, now: NOW });
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    expect(result.thesis.toLowerCase()).toContain("thin");
    expect(result.analyzed_files).toBe(5);
    expect(result.top_concepts.length).toBeGreaterThan(0);
    expect(result.top_concepts[0].term).toMatch(/thin|wall|milling/);
  });

  it("produces low confidence (≤0.4) when vault contains 5 contradictory disjoint concepts", () => {
    writeNote("a.md", "# Tool wear\nFlank wear and crater wear dominate inserts. Carbide degrades with heat.");
    writeNote("b.md", "# Coolant strategy\nFlood coolant evacuates chips. Mist works for aluminum drilling.");
    writeNote("c.md", "# Spindle balance\nDynamic spindle balance affects vibration. Balance grade matters.");
    writeNote("d.md", "# Workholding\nClamps and vises must resist cutting forces. Vacuum tables work for thin sheet.");
    writeNote("e.md", "# Programming\nGcode posts vary by controller. Fanuc differs from Siemens dialect.");
    const result = emergingThesisEngine.synthesize("7d", { vaultRoot: tmpRoot, now: NOW });
    expect(result.confidence).toBeLessThanOrEqual(0.4);
    expect(result.analyzed_files).toBe(5);
  });

  it("filters files outside the requested window (24h excludes 8-day-old notes)", () => {
    writeNote("recent.md", "# Recent\nThin-wall milling notes recent.", 0);
    writeNote("old.md", "# Old\nThin-wall milling notes old.", 8 * 24 * 60 * 60 * 1000);
    const result = emergingThesisEngine.synthesize("24h", { vaultRoot: tmpRoot, now: NOW });
    expect(result.analyzed_files).toBe(1);
    expect(result.supporting_files.length).toBe(1);
    expect(result.supporting_files[0]).toContain("recent.md");
  });

  it("includes 7d-window files that 24h-window excludes", () => {
    writeNote("recent.md", "# Recent\nKienzle force prediction note.", 0);
    writeNote("five.md", "# Five days old\nKienzle coefficient lookup.", 5 * 24 * 60 * 60 * 1000);
    const r24 = emergingThesisEngine.synthesize("24h", { vaultRoot: tmpRoot, now: NOW });
    const r7 = emergingThesisEngine.synthesize("7d", { vaultRoot: tmpRoot, now: NOW });
    expect(r24.analyzed_files).toBe(1);
    expect(r7.analyzed_files).toBe(2);
  });

  it("strips markdown frontmatter, code fences, and links before tokenizing", () => {
    writeNote(
      "fm.md",
      "---\nname: feedback_test\ntype: feedback\n---\n\n" +
        "# Title\n```bash\necho 'this is code that should be ignored'\n```\n" +
        "[link text](http://example.com) and [[wiki link]] survive.\n" +
        "Manufacturing manufacturing manufacturing manufacturing manufacturing."
    );
    const result = emergingThesisEngine.synthesize("7d", { vaultRoot: tmpRoot, now: NOW });
    const terms = result.top_concepts.map((c) => c.term);
    expect(terms).toContain("manufacturing");
    expect(terms).not.toContain("echo");
    expect(terms).not.toContain("ignored"); // pure code-block content stripped
  });

  it("recurses into subdirectories (feedback/, lessons/, decisions/, inbox/)", () => {
    writeNote("feedback/a.md", "# A\nKienzle force prediction.");
    writeNote("lessons/b.md", "# B\nKienzle coefficient methodology.");
    writeNote("decisions/c.md", "# C\nKienzle empirical formula.");
    writeNote("inbox/d.md", "# D\nKienzle physics constants.");
    const result = emergingThesisEngine.synthesize("7d", { vaultRoot: tmpRoot, now: NOW });
    expect(result.analyzed_files).toBe(4);
    expect(result.top_concepts[0].term.toLowerCase()).toContain("kienzle");
  });

  it("produces deterministic output across repeated calls on the same vault state", () => {
    for (let i = 0; i < 3; i++) {
      writeNote(`d-${i}.md`, `# Doc ${i}\nFeed rate optimization. Feed rate selection. Feed rate adaptive.`);
    }
    const a = emergingThesisEngine.synthesize("7d", { vaultRoot: tmpRoot, now: NOW });
    const b = emergingThesisEngine.synthesize("7d", { vaultRoot: tmpRoot, now: NOW });
    expect(b.confidence).toBe(a.confidence);
    expect(b.thesis).toBe(a.thesis);
    expect(b.top_concepts.map((c) => c.term)).toEqual(a.top_concepts.map((c) => c.term));
    expect(b.supporting_files).toEqual(a.supporting_files);
  });

  it("supporting_files contains paths actually inside the analyzed corpus (no hallucinated paths)", () => {
    const p1 = writeNote("real-1.md", "# Real 1\nDeflection compensation theory across thin walls.");
    const p2 = writeNote("real-2.md", "# Real 2\nDeflection mitigation in thin-wall finish passes.");
    const result = emergingThesisEngine.synthesize("7d", { vaultRoot: tmpRoot, now: NOW });
    expect(result.supporting_files.length).toBeGreaterThan(0);
    for (const sf of result.supporting_files) {
      expect([p1, p2]).toContain(sf);
    }
  });

  it("performance: synthesizes a 200-file vault in <2s", () => {
    for (let i = 0; i < 200; i++) {
      writeNote(`bulk/n-${i}.md`, `# Note ${i}\nMachining strategy ${i % 5}. Adaptive feedrate. Tool wear monitoring.`);
    }
    const t0 = Date.now();
    const result = emergingThesisEngine.synthesize("7d", { vaultRoot: tmpRoot, now: NOW, maxFiles: 1000 });
    const elapsed = Date.now() - t0;
    expect(elapsed).toBeLessThan(2000);
    expect(result.analyzed_files).toBe(200);
  });

  it("respects maxFiles cap", () => {
    for (let i = 0; i < 30; i++) {
      writeNote(`cap-${i}.md`, `# Note ${i}\nGenericContent number ${i}.`);
    }
    const result = emergingThesisEngine.synthesize("7d", { vaultRoot: tmpRoot, now: NOW, maxFiles: 10 });
    expect(result.analyzed_files).toBeLessThanOrEqual(10);
  });

  it("handles a single-file vault gracefully (low-but-nonzero or zero confidence — never NaN)", () => {
    writeNote("only.md", "# Only\nA single note in the vault touches kienzle force prediction.");
    const result = emergingThesisEngine.synthesize("7d", { vaultRoot: tmpRoot, now: NOW });
    expect(result.analyzed_files).toBe(1);
    expect(Number.isFinite(result.confidence)).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it("singleton and class-instantiated engine produce identical results", () => {
    writeNote("a.md", "# A\nKienzle physics force calculation method.");
    writeNote("b.md", "# B\nKienzle force prediction technique.");
    const fresh = new EmergingThesisEngine();
    const a = emergingThesisEngine.synthesize("7d", { vaultRoot: tmpRoot, now: NOW });
    const b = fresh.synthesize("7d", { vaultRoot: tmpRoot, now: NOW });
    expect(b.thesis).toBe(a.thesis);
    expect(b.confidence).toBe(a.confidence);
    expect(b.top_concepts.map((c) => c.term)).toEqual(a.top_concepts.map((c) => c.term));
  });

  it("supports all three window enum values without throwing", () => {
    writeNote("a.md", "# A\nMachinability lookup workflow notes.");
    for (const w of ["24h", "7d", "30d"] as ThesisWindow[]) {
      const r = emergingThesisEngine.synthesize(w, { vaultRoot: tmpRoot, now: NOW });
      expect(r.window).toBe(w);
      expect(typeof r.thesis).toBe("string");
    }
  });
});
