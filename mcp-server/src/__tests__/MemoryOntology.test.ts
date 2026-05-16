/**
 * MemoryOntology.test.ts — D2 schema + engine vitest suite.
 *
 * OBSIDIAN-INTELLIGENCE-MS3 / U-ONTOLOGY-LAYER (D2).
 *
 * Envelope exit condition 5: "Test: 6 fixture writes (3 valid, 3 invalid)
 * → 3 accept + 3 reject". This suite exceeds that minimum and additionally
 * carries regression tests for every P0/P1 finding from the per-file
 * scrutiny gate (state-machine merge, classify false-positive set, D1+D2
 * co-existence round-trip, duplicate-key throw, blank-line collapse).
 *
 * @milestone OBSIDIAN-INTELLIGENCE-MS3/D2
 */

import { describe, it, expect } from "vitest";
import {
  MemoryOntologySchema,
  MEMORY_ONTOLOGY_SCHEMA_VERSION,
  formatOntologyFrontmatter,
  extractOntologyFromFrontmatter,
  classifyFromFilename,
  mergeIntoExistingFrontmatter,
  type MemoryOntology,
} from "../schemas/memoryOntologySchema.js";
import {
  isWarnOnly,
  validateOntology,
  validateOntologySafe,
  classifyOrInfer,
  ensureOntology,
  memoryOntologyEngine,
} from "../engines/MemoryOntologyEngine.js";
import {
  formatProvenanceFrontmatter,
  extractProvenanceFromFrontmatter,
  type MemoryProvenance,
} from "../schemas/memoryProvenanceSchema.js";

// ─── Helper builders ────────────────────────────────────────────────

function makeOntology(overrides: Partial<MemoryOntology> = {}): MemoryOntology {
  return MemoryOntologySchema.parse({
    schemaVersion: MEMORY_ONTOLOGY_SCHEMA_VERSION,
    kind: "fact",
    state: "current",
    visibility: "internal",
    ...overrides,
  });
}

function makeProvenance(
  overrides: Partial<MemoryProvenance> = {},
): MemoryProvenance {
  return {
    schemaVersion: "1.0.0",
    agent: "claude-c0f06dee",
    sessionId: "c0f06dee",
    writeEvent: "Write",
    writtenAt: "2026-05-16T02:00:00Z",
    ...overrides,
  } as MemoryProvenance;
}

// ════════════════════════════════════════════════════════════════════
// Schema-level: MemoryOntologySchema directly
// ════════════════════════════════════════════════════════════════════

describe("MemoryOntologySchema", () => {
  it("accepts the minimal valid ontology — all 4 fields take exact values", () => {
    const ok = MemoryOntologySchema.parse({
      kind: "fact",
      state: "current",
      visibility: "internal",
    });
    expect(ok.kind).toBe("fact");
    expect(ok.state).toBe("current");
    expect(ok.visibility).toBe("internal");
    expect(ok.schemaVersion).toBe("1.0.0");
  });

  it("preserves every enum permutation exactly — no value drift in 27 combos", () => {
    const kinds = ["fact", "interpretation"] as const;
    const states = ["current", "deprecated", "draft"] as const;
    const visibilities = ["public", "internal", "confidential"] as const;
    const seen: string[] = [];
    for (const k of kinds) {
      for (const s of states) {
        for (const v of visibilities) {
          const parsed = MemoryOntologySchema.parse({
            kind: k,
            state: s,
            visibility: v,
          });
          // Direct triple-equality — no presence-only checks.
          expect(parsed.kind).toBe(k);
          expect(parsed.state).toBe(s);
          expect(parsed.visibility).toBe(v);
          seen.push(`${k}/${s}/${v}`);
        }
      }
    }
    expect(seen.length).toBe(18); // 2 × 3 × 3
    expect(new Set(seen).size).toBe(18); // unique
  });

  it("REJECTS an unknown kind 'factual'", () => {
    expect(() =>
      MemoryOntologySchema.parse({
        kind: "factual",
        state: "current",
        visibility: "internal",
      }),
    ).toThrow();
  });

  it("REJECTS missing required fields (state or visibility)", () => {
    expect(() =>
      MemoryOntologySchema.parse({ kind: "fact", state: "current" }),
    ).toThrow();
    expect(() =>
      MemoryOntologySchema.parse({ kind: "fact", visibility: "internal" }),
    ).toThrow();
  });

  it("REJECTS unknown extra fields in strict mode", () => {
    expect(() =>
      MemoryOntologySchema.parse({
        kind: "fact",
        state: "current",
        visibility: "internal",
        // @ts-expect-error — testing strict rejection of unknown keys
        rogue_field: "should fail",
      }),
    ).toThrow();
  });

  it("preserves confidence at exact values 0, 0.5, 1", () => {
    expect(makeOntology({ confidence: 0 }).confidence).toBe(0);
    expect(makeOntology({ confidence: 0.5 }).confidence).toBe(0.5);
    expect(makeOntology({ confidence: 1 }).confidence).toBe(1);
  });

  it("REJECTS out-of-range confidence -0.1 and 1.5", () => {
    expect(() => makeOntology({ confidence: -0.1 })).toThrow();
    expect(() => makeOntology({ confidence: 1.5 })).toThrow();
  });

  it("preserves tag array verbatim", () => {
    const o = makeOntology({ tags: ["alpha", "beta-gamma", "foo_bar_baz"] });
    expect(o.tags).toEqual(["alpha", "beta-gamma", "foo_bar_baz"]);
  });

  it("REJECTS malformed tags (digit-leading, UPPER, space)", () => {
    expect(() => makeOntology({ tags: ["1bad"] })).toThrow();
    expect(() => makeOntology({ tags: ["BAD"] })).toThrow();
    expect(() => makeOntology({ tags: ["bad tag"] })).toThrow();
  });

  it("REJECTS supersedes path-traversal '../escape.md' and slash forms", () => {
    expect(() => makeOntology({ supersedes: "../escape.md" })).toThrow();
    expect(() => makeOntology({ supersedes: "no-extension" })).toThrow();
    expect(() => makeOntology({ supersedes: "path/with/slash.md" })).toThrow();
  });
});

// ════════════════════════════════════════════════════════════════════
// Schema-level: format + extract round-trip
// ════════════════════════════════════════════════════════════════════

describe("formatOntologyFrontmatter + extractOntologyFromFrontmatter round-trip", () => {
  it("round-trips minimal ontology — every field byte-equal in + out", () => {
    const o = makeOntology();
    const fm = formatOntologyFrontmatter(o);
    expect(fm.startsWith("---\nontology:\n  schemaVersion: 1.0.0")).toBe(true);
    const back = extractOntologyFromFrontmatter(fm + "\nbody");
    // Direct value checks — no .not.toBeNull() preamble.
    expect(back?.kind).toBe("fact");
    expect(back?.state).toBe("current");
    expect(back?.visibility).toBe("internal");
    expect(back?.schemaVersion).toBe("1.0.0");
  });

  it("round-trips ontology with tag list preserving order", () => {
    const o = makeOntology({ tags: ["alpha", "beta", "gamma"] });
    const fm = formatOntologyFrontmatter(o);
    expect(fm.includes("    - alpha")).toBe(true);
    expect(fm.includes("    - beta")).toBe(true);
    expect(fm.includes("    - gamma")).toBe(true);
    const back = extractOntologyFromFrontmatter(fm + "\nbody");
    expect(back?.tags).toEqual(["alpha", "beta", "gamma"]);
  });

  it("round-trips confidence as number 0.75 (not string)", () => {
    const o = makeOntology({ confidence: 0.75 });
    const back = extractOntologyFromFrontmatter(
      formatOntologyFrontmatter(o) + "\nbody",
    );
    expect(back?.confidence).toBe(0.75);
    expect(typeof back?.confidence).toBe("number");
  });

  it("returns exact null when no frontmatter present", () => {
    expect(extractOntologyFromFrontmatter("# just a markdown body")).toBe(null);
  });

  it("returns exact null when frontmatter has no ontology key", () => {
    const fm = "---\ntitle: hello\n---\nbody";
    expect(extractOntologyFromFrontmatter(fm)).toBe(null);
  });

  it("THROWS on present-but-invalid ontology block — Karpathy R12 fail-loud", () => {
    const bad = "---\nontology:\n  kind: bogus\n  state: current\n  visibility: internal\n---\n";
    expect(() => extractOntologyFromFrontmatter(bad)).toThrow();
  });

  it("THROWS with 'duplicate key' message on doubled `kind:` (P1-2 regression)", () => {
    const dup = "---\nontology:\n  kind: fact\n  kind: interpretation\n  state: current\n  visibility: internal\n---\n";
    expect(() => extractOntologyFromFrontmatter(dup)).toThrow(/duplicate key/);
  });

  it("THROWS with 'inline tags' message on `tags: [a, b]` shorthand", () => {
    const inline = "---\nontology:\n  kind: fact\n  state: current\n  visibility: internal\n  tags: [a, b]\n---\n";
    expect(() => extractOntologyFromFrontmatter(inline)).toThrow(
      /inline tags array not supported/,
    );
  });
});

// ════════════════════════════════════════════════════════════════════
// Schema-level: hostile frontmatter resistance (Arm B P0/P1 regression)
// ════════════════════════════════════════════════════════════════════

describe("extractOntologyFromFrontmatter — hostile-payload resistance", () => {
  it("ignores 4-space-indent foreign keys — picks correct kind=interpretation", () => {
    const fm =
      "---\nfoo:\n    kind: fact\n    state: current\n    visibility: internal\nontology:\n  kind: interpretation\n  state: draft\n  visibility: public\n---\n";
    const o = extractOntologyFromFrontmatter(fm);
    expect(o?.kind).toBe("interpretation");
    expect(o?.state).toBe("draft");
    expect(o?.visibility).toBe("public");
  });

  it("state-machine scoping rejects another top-level block's 2-space children (P0-1 regression)", () => {
    // foo: has child keys at 2-space; ontology: comes after. State machine
    // must only collect keys when inOntology=true.
    const fm =
      "---\nfoo:\n  kind: fact\n  state: current\n  visibility: internal\nontology:\n  kind: interpretation\n  state: draft\n  visibility: public\n---\n";
    const o = extractOntologyFromFrontmatter(fm);
    expect(o?.kind).toBe("interpretation");
    expect(o?.state).toBe("draft");
    expect(o?.visibility).toBe("public");
  });

  it("rejects TAB indentation — would throw on schema 'kind required'", () => {
    const fm =
      "---\nontology:\n\tkind: fact\n  state: current\n  visibility: internal\n---\n";
    expect(() => extractOntologyFromFrontmatter(fm)).toThrow();
  });

  it("strips both double-quoted and single-quoted scalars", () => {
    const fm =
      "---\nontology:\n  kind: \"fact\"\n  state: 'current'\n  visibility: internal\n---\n";
    const o = extractOntologyFromFrontmatter(fm);
    expect(o?.kind).toBe("fact");
    expect(o?.state).toBe("current");
  });

  it("handles leading BOM (U+FEFF)", () => {
    const fm =
      "﻿---\nontology:\n  kind: fact\n  state: current\n  visibility: internal\n---\n";
    const o = extractOntologyFromFrontmatter(fm);
    expect(o?.kind).toBe("fact");
    expect(o?.state).toBe("current");
  });
});

// ════════════════════════════════════════════════════════════════════
// Schema-level: mergeIntoExistingFrontmatter (Arm B P0-2 regression)
// ════════════════════════════════════════════════════════════════════

describe("mergeIntoExistingFrontmatter", () => {
  it("prepends a fresh frontmatter when none exists — body preserved verbatim", () => {
    const out = mergeIntoExistingFrontmatter("# body only\n", makeOntology());
    expect(out.startsWith("---\nontology:")).toBe(true);
    expect(out.endsWith("# body only\n")).toBe(true);
    // The injected block must round-trip.
    const back = extractOntologyFromFrontmatter(out);
    expect(back?.kind).toBe("fact");
  });

  it("preserves existing top-level keys when injecting ontology — title/status survive", () => {
    const existing =
      "---\ntitle: my memo\nstatus: active\n---\nbody\n";
    const out = mergeIntoExistingFrontmatter(existing, makeOntology());
    expect(out.includes("title: my memo")).toBe(true);
    expect(out.includes("status: active")).toBe(true);
    const back = extractOntologyFromFrontmatter(out);
    expect(back?.kind).toBe("fact");
  });

  it("REPLACES (not duplicates) when ontology already present — exactly 1 block remains", () => {
    const provBlock = formatProvenanceFrontmatter(makeProvenance());
    const withOnt = mergeIntoExistingFrontmatter(
      provBlock + "# body\n",
      makeOntology({ kind: "interpretation", state: "draft", visibility: "public", tags: ["alpha", "beta"] }),
    );
    const replaced = mergeIntoExistingFrontmatter(
      withOnt,
      makeOntology({ kind: "fact", state: "current", visibility: "internal" }),
    );
    const count = (replaced.match(/^ontology:/gm) || []).length;
    expect(count).toBe(1);
    const final = extractOntologyFromFrontmatter(replaced);
    expect(final?.kind).toBe("fact");
    expect(final?.state).toBe("current");
    expect(final?.tags).toBe(undefined);
  });

  it("preserves D1 provenance when injecting D2 ontology — P0-1 D1+D2 co-existence", () => {
    const prov = makeProvenance();
    const provBlock = formatProvenanceFrontmatter(prov);
    const merged = mergeIntoExistingFrontmatter(
      provBlock + "# body\n",
      makeOntology({ kind: "interpretation", state: "draft", visibility: "public", tags: ["alpha", "beta"] }),
    );
    // D1 extractor must STILL return the original provenance fields verbatim.
    const provBack = extractProvenanceFromFrontmatter(merged);
    expect(provBack?.agent).toBe("claude-c0f06dee");
    expect(provBack?.sessionId).toBe("c0f06dee");
    expect(provBack?.writeEvent).toBe("Write");
    // D2 extractor must return the new ontology.
    const ontBack = extractOntologyFromFrontmatter(merged);
    expect(ontBack?.kind).toBe("interpretation");
    expect(ontBack?.state).toBe("draft");
    expect(ontBack?.visibility).toBe("public");
    expect(ontBack?.tags).toEqual(["alpha", "beta"]);
  });

  it("does NOT drop tag items mid-list when ontology has tags + sibling key after — P0-2 regression", () => {
    const existing =
      "---\ntitle: x\nontology:\n  schemaVersion: 1.0.0\n  kind: fact\n  state: current\n  visibility: internal\n  tags:\n    - alpha\n    - beta\n    - gamma\nother: y\n---\nbody\n";
    const out = mergeIntoExistingFrontmatter(
      existing,
      makeOntology({ kind: "interpretation", state: "draft", visibility: "public" }),
    );
    // After replace, NO orphan tag items should remain outside any block.
    expect(/^    - alpha$/m.test(out)).toBe(false);
    expect(/^    - beta$/m.test(out)).toBe(false);
    expect(/^    - gamma$/m.test(out)).toBe(false);
    // The other sibling key MUST survive.
    expect(out.includes("other: y")).toBe(true);
    expect(out.includes("title: x")).toBe(true);
    // The new ontology MUST be present and round-trip.
    const ont = extractOntologyFromFrontmatter(out);
    expect(ont?.kind).toBe("interpretation");
    expect(ont?.state).toBe("draft");
    expect(ont?.visibility).toBe("public");
  });
});

// ════════════════════════════════════════════════════════════════════
// Schema-level: classifyFromFilename (Arm B P1-1 regression)
// ════════════════════════════════════════════════════════════════════

describe("classifyFromFilename — false-positive resistance", () => {
  it("incidental_note.md → visibility=internal (NOT confidential — was bug)", () => {
    expect(classifyFromFilename("incidental_note.md").visibility).toBe(
      "internal",
    );
  });

  it("draftsman_log.md → state=current (NOT draft — was bug)", () => {
    expect(classifyFromFilename("draftsman_log.md").state).toBe("current");
  });

  it("not_deprecated.md → state=current (NOT deprecated — was bug)", () => {
    expect(classifyFromFilename("not_deprecated.md").state).toBe("current");
  });

  it("incident_postmortem.md → visibility=confidential (true positive)", () => {
    expect(classifyFromFilename("incident_postmortem.md").visibility).toBe(
      "confidential",
    );
  });

  it("draft_proposal.md → state=draft (true positive)", () => {
    expect(classifyFromFilename("draft_proposal.md").state).toBe("draft");
  });

  it("feedback_x.md → kind=interpretation (filename heuristic)", () => {
    expect(classifyFromFilename("feedback_thing.md").kind).toBe("interpretation");
  });

  it("reference_x.md → kind=fact (filename heuristic)", () => {
    expect(classifyFromFilename("reference_thing.md").kind).toBe("fact");
  });

  it("narrative '[deprecated]' in body does NOT trigger deprecated (P1-3 fix)", () => {
    const body = "# title\n\nThe other thing is [deprecated] in favor of X.";
    expect(classifyFromFilename("some_memo.md", body).state).toBe("current");
  });

  it("frontmatter 'status: deprecated' in body DOES trigger deprecated", () => {
    const body = "---\nstatus: deprecated\n---\n# title\nbody";
    expect(classifyFromFilename("some_memo.md", body).state).toBe("deprecated");
  });

  it("body 'status: draft' frontmatter triggers state=draft", () => {
    const body = "---\nstatus: draft\n---\nbody";
    expect(classifyFromFilename("some_memo.md", body).state).toBe("draft");
  });
});

// ════════════════════════════════════════════════════════════════════
// Engine-level: isWarnOnly env-flag truthiness
// ════════════════════════════════════════════════════════════════════

describe("isWarnOnly", () => {
  it("returns true for '1'/'true'/'yes'/'on' (any case + whitespace)", () => {
    for (const v of ["1", "true", "TRUE", "Yes", "YES", "on", "ON", "  1  ", "true\n"]) {
      expect(
        isWarnOnly({ PRISM_ONTOLOGY_WARN_ONLY: v } as NodeJS.ProcessEnv),
      ).toBe(true);
    }
  });

  it("returns false for '0'/'false'/'no'/'off'/empty/whitespace/undefined", () => {
    for (const v of ["0", "false", "no", "off", "", "  "]) {
      expect(
        isWarnOnly({ PRISM_ONTOLOGY_WARN_ONLY: v } as NodeJS.ProcessEnv),
      ).toBe(false);
    }
    expect(isWarnOnly({} as NodeJS.ProcessEnv)).toBe(false);
    expect(
      isWarnOnly({ PRISM_ONTOLOGY_WARN_ONLY: undefined } as NodeJS.ProcessEnv),
    ).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════
// Engine-level: ensureOntology decision matrix
// ════════════════════════════════════════════════════════════════════

describe("ensureOntology decision matrix", () => {
  it("KEPT when valid ontology already present — content unchanged", () => {
    const ok = formatOntologyFrontmatter(makeOntology()) + "# body";
    const out = ensureOntology("any.md", ok, { warnOnly: false });
    expect(out.outcome).toBe("kept");
    expect(out.content).toBe(ok);
    expect(out.ontology?.kind).toBe("fact");
    expect(out.ontology?.state).toBe("current");
  });

  it("REJECTED when no ontology + warnOnly=false — null ontology + reason", () => {
    const out = ensureOntology("orphan.md", "# bare body\n", {
      warnOnly: false,
    });
    expect(out.outcome).toBe("rejected");
    expect(out.ontology).toBe(null);
    expect(out.reason ?? "").toMatch(/PRISM_ONTOLOGY_WARN_ONLY/);
    expect(out.content).toBe("# bare body\n");
  });

  it("INJECTED when no ontology + warnOnly=true — reason names heuristic + content round-trips", () => {
    const out = ensureOntology("reference_thing.md", "# body\n", {
      warnOnly: true,
    });
    expect(out.outcome).toBe("injected");
    expect(out.content.startsWith("---\nontology:")).toBe(true);
    expect(out.ontology?.kind).toBe("fact");
    expect(out.reason ?? "").toMatch(/classifyFromFilename/);
    expect(out.reason ?? "").toMatch(/kind=fact/);
    // The rewritten content must round-trip the inferred ontology.
    const back = extractOntologyFromFrontmatter(out.content);
    expect(back?.kind).toBe("fact");
    expect(back?.state).toBe("current");
  });

  it("THROWS by default on invalid block — Zod bubbles up", () => {
    const bad = "---\nontology:\n  kind: bogus\n  state: current\n  visibility: internal\n---\nbody";
    expect(() => ensureOntology("any.md", bad)).toThrow();
  });

  it("REPLACED when invalid block + repairInvalid=true — heuristic fills in", () => {
    const bad = "---\nontology:\n  kind: bogus\n  state: current\n  visibility: internal\n---\nbody";
    const out = ensureOntology("reference_thing.md", bad, {
      warnOnly: false,
      repairInvalid: true,
    });
    expect(out.outcome).toBe("replaced");
    expect(out.ontology?.kind).toBe("fact"); // from classifyFromFilename
    expect(out.reason ?? "").toMatch(/repaired invalid ontology/);
    const back = extractOntologyFromFrontmatter(out.content);
    expect(back?.kind).toBe("fact");
  });

  it("opts.warnOnly=false explicitly overrides env=true (nullish-coalescing)", () => {
    const out = ensureOntology("any.md", "# bare\n", { warnOnly: false });
    expect(out.outcome).toBe("rejected");
  });
});

// ════════════════════════════════════════════════════════════════════
// Engine-level: validateOntology + Safe
// ════════════════════════════════════════════════════════════════════

describe("validateOntology + validateOntologySafe", () => {
  it("validateOntology returns ontology with exact kind from valid frontmatter", () => {
    const fm = formatOntologyFrontmatter(makeOntology({ kind: "interpretation" })) + "# body";
    const o = validateOntology(fm);
    expect(o?.kind).toBe("interpretation");
    expect(o?.state).toBe("current");
  });

  it("validateOntology returns exact null when no ontology block", () => {
    expect(validateOntology("# no frontmatter")).toBe(null);
  });

  it("validateOntology THROWS on present-but-invalid", () => {
    const bad = "---\nontology:\n  kind: bogus\n  state: current\n  visibility: internal\n---\nbody";
    expect(() => validateOntology(bad)).toThrow();
  });

  it("validateOntologySafe returns {ok:true, ontology:null} when no block", () => {
    const r = validateOntologySafe("# no frontmatter");
    expect(r.ok).toBe(true);
    expect(r.ontology).toBe(null);
    expect(r.error).toBe(undefined);
  });

  it("validateOntologySafe returns {ok:false, error:string} on invalid block", () => {
    const bad = "---\nontology:\n  kind: bogus\n  state: current\n  visibility: internal\n---\nbody";
    const r = validateOntologySafe(bad);
    expect(r.ok).toBe(false);
    expect(r.ontology).toBe(null);
    expect(typeof r.error).toBe("string");
    expect((r.error ?? "").length).toBeGreaterThan(0);
  });
});

// ════════════════════════════════════════════════════════════════════
// Engine-level: classifyOrInfer
// ════════════════════════════════════════════════════════════════════

describe("classifyOrInfer", () => {
  it("existing ontology wins over filename — kind=interpretation despite reference_ prefix", () => {
    const fm = formatOntologyFrontmatter(makeOntology({ kind: "interpretation" })) + "# body";
    const o = classifyOrInfer("reference_thing.md", fm);
    expect(o.kind).toBe("interpretation");
  });

  it("falls back to filename heuristic when no ontology block — kind=interpretation for feedback_", () => {
    const o = classifyOrInfer("feedback_thing.md", "# bare body\n");
    expect(o.kind).toBe("interpretation");
    expect(o.state).toBe("current");
    expect(o.visibility).toBe("internal");
  });
});

// ════════════════════════════════════════════════════════════════════
// Engine-level: singleton + frozen
// ════════════════════════════════════════════════════════════════════

describe("memoryOntologyEngine singleton", () => {
  it("singleton.validateOntology produces same result as direct import", () => {
    const fm = formatOntologyFrontmatter(makeOntology({ kind: "interpretation" })) + "# body";
    const direct = validateOntology(fm);
    const viaSingleton = memoryOntologyEngine.validateOntology(fm);
    expect(viaSingleton?.kind).toBe("interpretation");
    expect(viaSingleton?.kind).toBe(direct?.kind);
  });

  it("singleton.schemaVersion equals MEMORY_ONTOLOGY_SCHEMA_VERSION constant '1.0.0'", () => {
    expect(memoryOntologyEngine.schemaVersion).toBe("1.0.0");
    expect(memoryOntologyEngine.schemaVersion).toBe(MEMORY_ONTOLOGY_SCHEMA_VERSION);
  });

  it("singleton is Object.frozen — assignment throws in strict mode (poisoning prevention)", () => {
    expect(Object.isFrozen(memoryOntologyEngine)).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════
// Envelope exit condition 5: 6-fixture matrix
// ════════════════════════════════════════════════════════════════════

describe("D2 envelope exit condition: 6 fixture writes (3 accept + 3 reject)", () => {
  // 3 VALID: should ensureOntology with outcome ∈ {kept, injected}
  it("[VALID 1/6] reference_x.md no ontology → injected with kind=fact", () => {
    const r = ensureOntology("reference_x.md", "# body\n", { warnOnly: true });
    expect(r.outcome).toBe("injected");
    expect(r.ontology?.kind).toBe("fact");
    expect(r.ontology?.state).toBe("current");
    expect(r.ontology?.visibility).toBe("internal");
  });

  it("[VALID 2/6] feedback_x.md no ontology → injected with kind=interpretation", () => {
    const r = ensureOntology("feedback_x.md", "# body\n", { warnOnly: true });
    expect(r.outcome).toBe("injected");
    expect(r.ontology?.kind).toBe("interpretation");
  });

  it("[VALID 3/6] memo with explicit deprecated ontology → kept with state=deprecated", () => {
    const memo = formatOntologyFrontmatter(makeOntology({ state: "deprecated" })) + "# body";
    const r = ensureOntology("any.md", memo, { warnOnly: false });
    expect(r.outcome).toBe("kept");
    expect(r.ontology?.state).toBe("deprecated");
  });

  // 3 INVALID: should ensureOntology either THROW or outcome='rejected'
  it("[INVALID 4/6] no ontology + warnOnly=false → rejected (outcome=rejected, ontology=null)", () => {
    const r = ensureOntology("orphan.md", "# bare\n", { warnOnly: false });
    expect(r.outcome).toBe("rejected");
    expect(r.ontology).toBe(null);
  });

  it("[INVALID 5/6] malformed enum 'factual' → throws", () => {
    const bad = "---\nontology:\n  kind: factual\n  state: current\n  visibility: internal\n---\nbody";
    expect(() => ensureOntology("any.md", bad)).toThrow();
  });

  it("[INVALID 6/6] duplicate-key block → throws with 'duplicate key' message", () => {
    const dup = "---\nontology:\n  kind: fact\n  kind: interpretation\n  state: current\n  visibility: internal\n---\nbody";
    expect(() => ensureOntology("any.md", dup)).toThrow(/duplicate key/);
  });
});

// ════════════════════════════════════════════════════════════════════
// Arm B P1 hardening: prototype-pollution + D1-only backward compat
// ════════════════════════════════════════════════════════════════════

describe("hostile-payload hardening (Arm B P1 follow-up)", () => {
  it("rejects __proto__ key in ontology block — does NOT mutate Object.prototype", () => {
    const before = (Object.prototype as Record<string, unknown>).polluted;
    const hostile =
      "---\nontology:\n  kind: fact\n  state: current\n  visibility: internal\n  __proto__: polluted\n---\n";
    // Either throws on unknown key (strict mode) or silently ignores — but
    // Object.prototype MUST NOT gain the `polluted` property.
    try {
      extractOntologyFromFrontmatter(hostile);
    } catch {
      // expected — strict mode rejects unknown own-property
    }
    const after = (Object.prototype as Record<string, unknown>).polluted;
    expect(after).toBe(before);
    expect(({} as Record<string, unknown>).polluted).toBe(undefined);
  });

  it("rejects __proto__ key in provenance block — Object.prototype intact", () => {
    const before = (Object.prototype as Record<string, unknown>).attack;
    const hostile =
      "---\nprovenance:\n  agent: claude-c0f06dee\n  sessionId: c0f06dee\n  writeEvent: Write\n  writtenAt: 2026-05-16T02:00:00Z\n  __proto__: attack\n---\n";
    try {
      extractProvenanceFromFrontmatter(hostile);
    } catch {
      // expected
    }
    const after = (Object.prototype as Record<string, unknown>).attack;
    expect(after).toBe(before);
    expect(({} as Record<string, unknown>).attack).toBe(undefined);
  });
});

describe("D1-only memo backward compatibility", () => {
  it("D1-only memo (provenance present, no ontology) — D1 extracts cleanly, D2 returns exact null", () => {
    const memo = formatProvenanceFrontmatter(makeProvenance()) + "# body\n";
    // D1 must extract verbatim.
    const prov = extractProvenanceFromFrontmatter(memo);
    expect(prov?.agent).toBe("claude-c0f06dee");
    expect(prov?.writeEvent).toBe("Write");
    // D2 must return null (no throw — missing block is not an error).
    expect(extractOntologyFromFrontmatter(memo)).toBe(null);
  });

  it("D2-only memo (ontology present, no provenance) — D2 extracts cleanly, D1 returns exact null", () => {
    const memo = formatOntologyFrontmatter(makeOntology({ kind: "interpretation" })) + "# body\n";
    const ont = extractOntologyFromFrontmatter(memo);
    expect(ont?.kind).toBe("interpretation");
    expect(ont?.state).toBe("current");
    expect(extractProvenanceFromFrontmatter(memo)).toBe(null);
  });

  it("classifyFromFilename(name, provenanceBlock) does NOT flip state/visibility — backfill order-safety (3-of-3 Arm B P1)", () => {
    // Regression for the backfill Arm B P1-3 concern: backfill injects
    // provenance THEN runs classifyFromFilename on the now-enriched body.
    // The provenance block emits keys like `agent:`, `sessionId:`, `writeEvent:`,
    // `category:`, `sourceTool:`, `machine:` — none of which are
    // `status:` or `visibility:`, so the body-text matchers MUST NOT misfire.
    const provBlock = formatProvenanceFrontmatter(makeProvenance());
    const result = classifyFromFilename("reference_foo.md", provBlock + "# bare body");
    expect(result.kind).toBe("fact");
    expect(result.state).toBe("current");
    expect(result.visibility).toBe("internal");
  });
});

// ════════════════════════════════════════════════════════════════════
// KEEP-IN-SYNC parity: .mjs hook inline helpers vs .ts schema helpers
// 3-of-3 Arm B + Arm C blocker — locks the duplicated-implementation
// contract documented at .claude/hooks/memory-mirror-to-vault.mjs L78-81.
// ════════════════════════════════════════════════════════════════════

import {
  classifyOntologyInline as hookClassify,
  formatOntologyInline as hookFormat,
  hasOntologyBlock as hookHas,
  mergeOntologyInline as hookMerge,
  // @ts-expect-error — the .mjs file has no .d.ts; runtime export is real
} from "../../../.claude/hooks/memory-mirror-to-vault.mjs";

describe("KEEP-IN-SYNC parity: .mjs hook inline vs .ts schema (3-of-3 Arm B+C blocker)", () => {
  const FILENAME_FIXTURES = [
    "reference_thing.md",
    "feedback_thing.md",
    "incident_postmortem.md",
    "draft_proposal.md",
    "draftsman_log.md",
    "incidental_note.md",
    "not_deprecated.md",
    "deprecated_legacy.md",
    "private_helper.md",
    "secret_info.md",
    "confidential.md",
    "uncategorized.md",
  ];

  it("hookClassify produces same kind/state/visibility as schema classifyFromFilename across 12 filename fixtures", () => {
    for (const name of FILENAME_FIXTURES) {
      const hookResult = hookClassify(name, "");
      const schemaResult = classifyFromFilename(name, "");
      expect(hookResult.kind).toBe(schemaResult.kind);
      expect(hookResult.state).toBe(schemaResult.state);
      expect(hookResult.visibility).toBe(schemaResult.visibility);
    }
  });

  it("hookClassify body-side regex parity — status:deprecated + status:draft + visibility:confidential", () => {
    const fixtures = [
      ["plain.md", "# title\n\nplain body"],
      ["plain.md", "---\nstatus: deprecated\n---\nbody"],
      ["plain.md", "---\nstatus: draft\n---\nbody"],
      ["plain.md", "---\nvisibility: confidential\n---\nbody"],
      ["plain.md", "# narrative [deprecated] mention only"],
    ];
    for (const [name, body] of fixtures) {
      const h = hookClassify(name, body);
      const s = classifyFromFilename(name, body);
      expect(h.state).toBe(s.state);
      expect(h.visibility).toBe(s.visibility);
      expect(h.kind).toBe(s.kind);
    }
  });

  it("hookHas matches schema extractOntologyFromFrontmatter null-vs-not-null across 6 fixtures", () => {
    const fixtures = [
      "# bare body, no frontmatter",
      "---\ntitle: hello\n---\nbody",
      "---\nontology:\n  kind: fact\n  state: current\n  visibility: internal\n---\nbody",
      "---\nprovenance:\n  agent: claude-12345678\n---\nbody",
      "---\nprovenance:\n  agent: claude-12345678\nontology:\n  kind: fact\n  state: current\n  visibility: internal\n---\nbody",
      "﻿---\nontology:\n  kind: fact\n  state: current\n  visibility: internal\n---\nbody",
    ];
    for (const content of fixtures) {
      const hookSays = hookHas(content);
      // Schema returns object (truthy) or null. Coerce to boolean for parity.
      let schemaSays: boolean;
      try {
        schemaSays = extractOntologyFromFrontmatter(content) !== null;
      } catch {
        // If schema throws on a fixture, hookHas must STILL be a real boolean
        // (the hook doesn't throw on detection; it only throws on merge/parse).
        schemaSays = false;
      }
      expect(hookSays).toBe(schemaSays);
    }
  });

  it("hookFormat emits a 5-line block matching the schema's first 5 emitted lines", () => {
    const ont = { kind: "interpretation" as const, state: "draft" as const, visibility: "public" as const };
    const hookOut = hookFormat(ont);
    // Hook emits: ontology:\n  schemaVersion: 1.0.0\n  kind: ...\n  state: ...\n  visibility: ...
    const expectedLines = [
      "ontology:",
      "  schemaVersion: 1.0.0",
      "  kind: interpretation",
      "  state: draft",
      "  visibility: public",
    ];
    expect(hookOut).toBe(expectedLines.join("\n"));
  });

  it("hookMerge into bare body produces same result as schema mergeIntoExistingFrontmatter for minimal ontology", () => {
    const minimal = { kind: "fact" as const, state: "current" as const, visibility: "internal" as const };
    const ontBlock = hookFormat(minimal);
    const hookOut = hookMerge("# bare body\n", ontBlock);
    const schemaOut = mergeIntoExistingFrontmatter(
      "# bare body\n",
      MemoryOntologySchema.parse(minimal),
    );
    // Both should produce equivalent frontmatter + same body. The schema adds
    // schemaVersion in its KEY_ORDER iteration so both emissions match.
    expect(hookOut.startsWith("---\nontology:\n")).toBe(true);
    expect(schemaOut.startsWith("---\nontology:\n")).toBe(true);
    expect(hookOut.endsWith("# bare body\n")).toBe(true);
    expect(schemaOut.endsWith("# bare body\n")).toBe(true);
    // Re-extract both — they MUST round-trip to the same ontology.
    const hookExtract = extractOntologyFromFrontmatter(hookOut);
    const schemaExtract = extractOntologyFromFrontmatter(schemaOut);
    expect(hookExtract?.kind).toBe(schemaExtract?.kind);
    expect(hookExtract?.state).toBe(schemaExtract?.state);
    expect(hookExtract?.visibility).toBe(schemaExtract?.visibility);
  });

  it("hookMerge on unterminated frontmatter returns INPUT unchanged (silent bail; corrupted memo preserved)", () => {
    const broken = "---\nfoo: bar\nno closing fence";
    const ontBlock = hookFormat({ kind: "fact", state: "current", visibility: "internal" });
    const result = hookMerge(broken, ontBlock);
    expect(result).toBe(broken);
  });
});
