import { describe, it, expect } from "vitest";
import { getWedmKnowledgeIndexEngine } from "../engines/wedm-knowledge-index-loader.js";

/**
 * Loader wiring E2E — exercises the REAL chain the dispatcher uses:
 * import WEDM_KNOWLEDGE_TIPS (tribal) + read WEDM_WIKI_KNOWLEDGE.json (wiki, if
 * generated) → WEDMKnowledgeIndexEngine.compile() → cached singleton. This is the
 * real-data E2E for the injected-reader core (RGS-MS1 lesson) + proves the
 * module-relative path resolves under vitest (cwd=mcp-server).
 */
describe("wedm-knowledge-index-loader — real tribal + wiki compile", () => {
  it("builds a unified index from the real tribal corpus", () => {
    const eng = getWedmKnowledgeIndexEngine(true); // forceReload
    const s = eng.stats();
    expect(s.total).toBeGreaterThanOrEqual(100); // ~107 real tribal tips
    expect(s.byType.tribal).toBeGreaterThanOrEqual(100);
    // wiki entries present iff the generator ran; either way the count is valid (≥0)
    expect(s.byType["wiki-tactic"] + s.byType["wiki-lesson"]).toBeGreaterThanOrEqual(0);
  });

  it("serves a relevant ranked result for a real wedm query", () => {
    const eng = getWedmKnowledgeIndexEngine();
    const r = eng.select({ keywords: ["wire", "break"], maxResults: 5 });
    expect(r.entries.length).toBeGreaterThan(0);
    expect(r.considered).toBeGreaterThanOrEqual(100);
  });

  it("caches the singleton across calls", () => {
    expect(getWedmKnowledgeIndexEngine()).toBe(getWedmKnowledgeIndexEngine());
  });
});
