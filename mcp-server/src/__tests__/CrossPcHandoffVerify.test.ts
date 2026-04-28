/**
 * CrossPcHandoffVerify.test.ts — INTEL-OLLAMA-OBSIDIAN-MS0/P7-U02
 *
 * Synthetic-input tests for scripts/cross-pc-handoff-verify.mjs.
 * Tests the 4 pure helpers exported by the audit script:
 *
 *   - classifyPath(p) → "h" | "c" | "userprofile" | "relative" | "other"
 *   - extractPathRefs(text) → string[]
 *   - severityFor({kind, fileType}) → "critical" | "warning" | "info"
 *   - aggregateFindings(findings) → { critical[], warning[], info[] }
 *
 * Driver (scanRepo + main) is exercised by smoke test from the shell.
 */

import { describe, it, expect } from "vitest";
// @ts-expect-error - importing pure helpers from .mjs (no shebang exec, vitest-safe)
import {
  classifyPath,
  extractPathRefs,
  severityFor,
  aggregateFindings,
} from "../../../scripts/cross-pc-handoff-verify.mjs";

describe("P7-U02 classifyPath", () => {
  it("classifies H: drive paths as 'h'", () => {
    expect(classifyPath("H:/prism/state/shared/foo.json")).toBe("h");
    expect(classifyPath("h:\\prism\\state")).toBe("h");
    expect(classifyPath("H:\\PRISM\\JM DIE")).toBe("h");
  });

  it("classifies C: drive paths as 'c'", () => {
    expect(classifyPath("C:/Users/Mark Villanueva/foo")).toBe("c");
    expect(classifyPath("c:\\Users\\Foo\\bar.json")).toBe("c");
  });

  it("classifies USERPROFILE references as 'userprofile'", () => {
    expect(classifyPath("$USERPROFILE/.claude")).toBe("userprofile");
    expect(classifyPath("${USERPROFILE}/foo")).toBe("userprofile");
    expect(classifyPath("%USERPROFILE%\\bar")).toBe("userprofile");
  });

  it("classifies relative paths as 'relative'", () => {
    expect(classifyPath("./scripts/foo.mjs")).toBe("relative");
    expect(classifyPath("../mcp-server/data")).toBe("relative");
    expect(classifyPath(".\\hooks\\bar.mjs")).toBe("relative");
  });

  it("classifies non-portable absolute or other-drive paths as 'other'", () => {
    expect(classifyPath("/usr/local/bin/node")).toBe("other");
    expect(classifyPath("D:/somewhere")).toBe("other");
    expect(classifyPath("E:\\backup")).toBe("other");
  });

  it("returns 'other' for empty / non-string / null input", () => {
    expect(classifyPath("")).toBe("other");
    expect(classifyPath(null)).toBe("other");
    expect(classifyPath(undefined)).toBe("other");
    expect(classifyPath(42)).toBe("other");
  });
});

describe("P7-U02 extractPathRefs", () => {
  it("extracts C: drive references", () => {
    const refs = extractPathRefs('Path is "C:/Users/Foo/bar.json" today.');
    expect(refs).toContain("C:/Users/Foo/bar.json");
  });

  it("extracts H: drive references", () => {
    const refs = extractPathRefs("see H:/prism/state/shared/MEMORY.md for the index");
    expect(refs).toContain("H:/prism/state/shared/MEMORY.md");
  });

  it("extracts both drives in same text", () => {
    const refs = extractPathRefs("from C:/Users/A/b.json to H:/prism/state");
    expect(refs).toContain("C:/Users/A/b.json");
    expect(refs).toContain("H:/prism/state");
  });

  it("extracts USERPROFILE marker as a synthetic ref", () => {
    const refs = extractPathRefs("read ${USERPROFILE}/.claude/CLAUDE.md");
    expect(refs.some(r => r.startsWith("$USERPROFILE"))).toBe(true);
  });

  it("returns empty array on non-string / empty input", () => {
    expect(extractPathRefs("")).toEqual([]);
    expect(extractPathRefs(null)).toEqual([]);
    expect(extractPathRefs(undefined)).toEqual([]);
    expect(extractPathRefs(42)).toEqual([]);
  });

  it("dedupes repeated path references", () => {
    const refs = extractPathRefs(
      'C:/foo/bar referenced once, again C:/foo/bar, and C:/foo/bar.',
    );
    const cFooBar = refs.filter(r => r === "C:/foo/bar");
    expect(cFooBar.length).toBe(1);
  });

  it("returns empty array when text has no path references", () => {
    expect(extractPathRefs("just normal english prose")).toEqual([]);
  });
});

describe("P7-U02 severityFor", () => {
  it("flags C: paths in canonical state JSON as critical", () => {
    expect(severityFor({ kind: "c", path: "C:/foo", fileType: "state-json" })).toBe("critical");
    expect(severityFor({ kind: "c", path: "C:/foo", fileType: "settings-json" })).toBe("critical");
    expect(severityFor({ kind: "c", path: "C:/foo", fileType: "handoff-md" })).toBe("critical");
  });

  it("flags C: paths in hook source as warning (might be fallback)", () => {
    expect(severityFor({ kind: "c", path: "C:/foo", fileType: "hook-mjs" })).toBe("warning");
  });

  it("flags USERPROFILE references as warning regardless of file type", () => {
    expect(severityFor({ kind: "userprofile", path: "$USERPROFILE", fileType: "state-json" })).toBe("warning");
    expect(severityFor({ kind: "userprofile", path: "$USERPROFILE", fileType: "hook-mjs" })).toBe("warning");
  });

  it("classifies H: drive paths as info (the canonical home)", () => {
    expect(severityFor({ kind: "h", path: "H:/prism/foo", fileType: "state-json" })).toBe("info");
    expect(severityFor({ kind: "h", path: "H:/prism/foo", fileType: "hook-mjs" })).toBe("info");
  });

  it("classifies relative paths as info", () => {
    expect(severityFor({ kind: "relative", path: "./foo", fileType: "hook-mjs" })).toBe("info");
  });

  it("classifies 'other' (unix /usr/, D:/) as info — non-blocking", () => {
    expect(severityFor({ kind: "other", path: "/usr/bin/node", fileType: "hook-mjs" })).toBe("info");
  });
});

describe("P7-U02 aggregateFindings", () => {
  it("groups by severity bucket", () => {
    const findings = [
      { severity: "critical", path: "C:/foo", file: "a.json", kind: "c", fileType: "state-json" },
      { severity: "critical", path: "C:/bar", file: "b.json", kind: "c", fileType: "state-json" },
      { severity: "warning", path: "$USERPROFILE", file: "c.mjs", kind: "userprofile", fileType: "hook-mjs" },
      { severity: "info", path: "H:/x", file: "d.json", kind: "h", fileType: "state-json" },
    ];
    const out = aggregateFindings(findings);
    expect(out.critical).toHaveLength(2);
    expect(out.warning).toHaveLength(1);
    expect(out.info).toHaveLength(1);
  });

  it("returns empty buckets when no findings", () => {
    const out = aggregateFindings([]);
    expect(out.critical).toEqual([]);
    expect(out.warning).toEqual([]);
    expect(out.info).toEqual([]);
  });

  it("ignores findings with missing severity", () => {
    const out = aggregateFindings([
      { severity: "critical", path: "C:/foo", file: "a.json", kind: "c" },
      { path: "no-severity", file: "b.json" },
      null,
      undefined,
    ]);
    expect(out.critical).toHaveLength(1);
    expect(out.warning).toEqual([]);
    expect(out.info).toEqual([]);
  });

  it("ignores findings with unknown severity bucket", () => {
    const out = aggregateFindings([
      { severity: "fatal", path: "X", file: "y.json" },
      { severity: "critical", path: "C:/foo", file: "z.json" },
    ]);
    expect(out.critical).toHaveLength(1);
    expect(out.warning).toEqual([]);
    expect(out.info).toEqual([]);
  });

  it("returns empty buckets when input is null/undefined", () => {
    const a = aggregateFindings(null);
    const b = aggregateFindings(undefined);
    expect(a.critical).toEqual([]);
    expect(b.critical).toEqual([]);
  });
});

describe("P7-U02 contract: end-to-end happy path on synthetic findings", () => {
  it("classifyPath → severityFor → aggregateFindings produces a coherent report", () => {
    const candidates = [
      { path: "C:/Users/Mark/state.json", fileType: "state-json" },
      { path: "H:/prism/state/shared/foo.json", fileType: "state-json" },
      { path: "$USERPROFILE/.claude/CLAUDE.md", fileType: "hook-mjs" },
      { path: "./scripts/relative.mjs", fileType: "hook-mjs" },
    ];
    const findings = candidates.map(c => {
      const kind = classifyPath(c.path);
      const severity = severityFor({ kind, path: c.path, fileType: c.fileType });
      return { ...c, kind, severity };
    });
    const out = aggregateFindings(findings);

    // C: state-json should be critical
    expect(out.critical.length).toBe(1);
    expect(out.critical[0].path).toBe("C:/Users/Mark/state.json");

    // USERPROFILE should be warning
    expect(out.warning.length).toBe(1);
    expect(out.warning[0].kind).toBe("userprofile");

    // H: + relative should be info
    expect(out.info.length).toBe(2);
  });

  it("contract: severity 'critical' implies handoff-breaking — exit code 1", () => {
    // Documents the exit-code contract used by main():
    //   grouped.critical.length > 0 → exit(1)
    //   grouped.critical.length === 0 → exit(0)
    const cleanFindings = [
      { severity: "warning", path: "$USERPROFILE", file: "x.mjs", kind: "userprofile" },
      { severity: "info", path: "H:/x", file: "y.json", kind: "h" },
    ];
    const grouped = aggregateFindings(cleanFindings);
    expect(grouped.critical.length).toBe(0);
    // → would exit(0) per main()
  });
});
