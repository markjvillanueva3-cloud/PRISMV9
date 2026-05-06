/**
 * camDispatcher round-trip tests for `master_post_okuma_multus_b250` (U-PPGMU02).
 *
 * Wiring under test (3 layers, all must agree):
 *   1. Schema   — `ACTION_CAM_SCHEMAS.master_post_okuma_multus_b250` (camActionSchemas.ts)
 *   2. Enum     — `ACTIONS` array in camDispatcher.ts must include the action name
 *   3. Handler  — case in camDispatcher.ts that lazy-imports the engine and calls
 *                 `inspectCanonical({cpsContent, cpsPath, repoRoot})`
 *
 * The dispatcher is registered to an MCP server via `registerCamDispatcher` and
 * isn't directly callable from tests without standing up the MCP runtime. So we
 * test the round-trip by:
 *   - Asserting schema validation accepts/rejects the right shapes (real behavior)
 *   - Asserting the action name is in the ACTIONS enum
 *   - Invoking the engine the same way the case handler does, with the SAME
 *     param shape the schema validates — proves the case handler call would
 *     succeed if the dispatcher routed to it
 *
 * Coverage discipline (per comprehensive-build hook):
 *   - 3 spanning configs:    cps_content / cps_path / repo_root resolution
 *   - 3 failure modes:       drift fixture, schema empty-string reject,
 *                            non-existent repo_root surfaces ENOENT
 *   - 2 adversarial inputs:  oversize content (~280 KB), non-string cps_path
 */

import { describe, it, expect } from "vitest";
import { writeFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { ACTION_CAM_SCHEMAS } from "../schemas/camActionSchemas.js";
import { ACTIONS } from "../tools/dispatchers/camDispatcher.js";
import {
  okumaMultusB250IIMillTurnMasterPostEngine,
  CANONICAL_FORKID,
  CANONICAL_POST_RELATIVE_PATH,
  PRISM_INTELLIGENCE_FLAGS,
} from "../engines/OkumaMultusB250IIMillTurnMasterPostEngine.js";

// ============================================================================
// SHARED TYPING — mirrors the Zod schema's input shape so we don't need `any`
// ============================================================================

/** Validated params for `master_post_okuma_multus_b250` — matches the schema. */
type ValidatedMultusParams = {
  cps_content?: string;
  cps_path?: string;
  repo_root?: string;
};

// ============================================================================
// FIXTURE — minimal CPS content matching v5.2.7 canonical contract
// ============================================================================

const CANONICAL_CPS_FIXTURE = [
  'var modelType = "okuma multus b250IIw";',
  'description = "Okuma Multus B250IIW Ultra Enhanced";',
  "/** $Revision: 44802 Ultra Enhanced Edition v5.2.7 - PRISM Intelligence $",
  "    FORKID {D93DAA65-1C09-402E-9871-3280B561D994} */",
  'vendor = "OKUMA";',
  'vendorUrl = "https://www.okuma.com";',
  'legal = "Copyright (C) 2012-2023 by Autodesk, Inc.";',
  "certificationLevel = 2;",
  "minimumRevision = 45909;",
  'extension = "min";',
  "programNameIsInteger = false;",
  "capabilities = CAPABILITY_MILLING | CAPABILITY_TURNING;",
  "properties = {",
  ...PRISM_INTELLIGENCE_FLAGS.map((f) => `  ${f}: { title: "PRISM ${f}" },`),
  "};",
].join("\n");

// ============================================================================
// LAYER 1 — schema membership and shape (behavioral assertions only)
// ============================================================================

describe("camDispatcher U-PPGMU02 — schema layer", () => {
  it("master_post_okuma_multus_b250 schema parses a valid empty object", () => {
    const schema = ACTION_CAM_SCHEMAS.master_post_okuma_multus_b250;
    const parsed = schema.parse({}) as ValidatedMultusParams;
    expect(parsed).toEqual({});
  });

  it("schema accepts the cps_content injection shape and preserves the value", () => {
    const schema = ACTION_CAM_SCHEMAS.master_post_okuma_multus_b250;
    const parsed = schema.parse({ cps_content: CANONICAL_CPS_FIXTURE }) as ValidatedMultusParams;
    expect(parsed.cps_content).toBe(CANONICAL_CPS_FIXTURE);
  });

  it("schema accepts the cps_path direct-override shape and preserves the value", () => {
    const schema = ACTION_CAM_SCHEMAS.master_post_okuma_multus_b250;
    const parsed = schema.parse({ cps_path: "C:/some/abs/path/post.cps" }) as ValidatedMultusParams;
    expect(parsed.cps_path).toBe("C:/some/abs/path/post.cps");
  });

  it("schema accepts the repo_root relative-resolve shape and preserves the value", () => {
    const schema = ACTION_CAM_SCHEMAS.master_post_okuma_multus_b250;
    const parsed = schema.parse({ repo_root: "H:/prism" }) as ValidatedMultusParams;
    expect(parsed.repo_root).toBe("H:/prism");
  });

  it("schema rejects empty-string cps_content (min(1) guard)", () => {
    const schema = ACTION_CAM_SCHEMAS.master_post_okuma_multus_b250;
    expect(() => schema.parse({ cps_content: "" })).toThrow();
  });

  it("schema rejects non-string cps_path (type guard)", () => {
    const schema = ACTION_CAM_SCHEMAS.master_post_okuma_multus_b250;
    expect(() => schema.parse({ cps_path: 12345 })).toThrow();
  });

  it("schema rejects empty-string repo_root (min(1) guard)", () => {
    const schema = ACTION_CAM_SCHEMAS.master_post_okuma_multus_b250;
    expect(() => schema.parse({ repo_root: "" })).toThrow();
  });
});

// ============================================================================
// LAYER 2 — action enum membership (the dispatcher's z.enum(ACTIONS))
// ============================================================================

describe("camDispatcher U-PPGMU02 — action enum layer", () => {
  it("ACTIONS array includes master_post_okuma_multus_b250", () => {
    expect(ACTIONS).toContain("master_post_okuma_multus_b250");
  });

  it("action name appears exactly once in the enum (no duplicate wiring)", () => {
    const occurrences = ACTIONS.filter((a) => a === "master_post_okuma_multus_b250");
    expect(occurrences).toHaveLength(1);
  });

  it("schema and enum agree — every master_post_* schema has an enum entry", () => {
    const schemaActions = Object.keys(ACTION_CAM_SCHEMAS).filter((k) =>
      k.startsWith("master_post_"),
    );
    expect(schemaActions.length).toBeGreaterThan(0);
    for (const a of schemaActions) {
      expect(ACTIONS).toContain(a);
    }
  });
});

// ============================================================================
// LAYER 3 — case-handler round-trip (engine invocation with validated params)
// ============================================================================

describe("camDispatcher U-PPGMU02 — handler round-trip via cps_content", () => {
  it("validated params route through inspectCanonical and return canonical metadata", () => {
    const schema = ACTION_CAM_SCHEMAS.master_post_okuma_multus_b250;
    const validated = schema.parse({ cps_content: CANONICAL_CPS_FIXTURE }) as ValidatedMultusParams;
    // Mirror the case handler exactly:
    const result = okumaMultusB250IIMillTurnMasterPostEngine.inspectCanonical({
      cpsContent: validated.cps_content,
      cpsPath: validated.cps_path,
      repoRoot: validated.repo_root,
    });
    expect(result.metadata.vendor).toBe("OKUMA");
    expect(result.metadata.forkid).toBe(CANONICAL_FORKID);
    expect(result.metadata.prismFlagsDeclared).toHaveLength(11);
    expect(result.validation.ok).toBe(true);
    expect(result.validation.warnings).toEqual([]);
  });

  it("drift fixture (FORKID swap) trips validation through the same call path", () => {
    const drifted = CANONICAL_CPS_FIXTURE.replace(
      "FORKID {D93DAA65-1C09-402E-9871-3280B561D994}",
      "FORKID {00000000-0000-0000-0000-000000000000}",
    );
    const validated = ACTION_CAM_SCHEMAS.master_post_okuma_multus_b250.parse({
      cps_content: drifted,
    }) as ValidatedMultusParams;
    const result = okumaMultusB250IIMillTurnMasterPostEngine.inspectCanonical({
      cpsContent: validated.cps_content,
    });
    expect(result.validation.ok).toBe(false);
    expect(result.validation.warnings.some((w) => w.includes("FORKID"))).toBe(true);
  });

  it("oversize content (>256 KB padding) parses without OOM and still validates", () => {
    // Adversarial input: append ~280 KB of filler. Only the FIRST 32 KB
    // header slice is regex-scanned by parseMetadata, so padding past that
    // should NOT change extracted metadata.
    const padding = "// filler line\n".repeat(20000); // ~280 KB
    const padded = CANONICAL_CPS_FIXTURE + "\n" + padding;
    expect(padded.length).toBeGreaterThan(256 * 1024);

    const validated = ACTION_CAM_SCHEMAS.master_post_okuma_multus_b250.parse({
      cps_content: padded,
    }) as ValidatedMultusParams;
    const result = okumaMultusB250IIMillTurnMasterPostEngine.inspectCanonical({
      cpsContent: validated.cps_content,
    });
    expect(result.metadata.forkid).toBe(CANONICAL_FORKID);
    expect(result.validation.ok).toBe(true);
  });
});

describe("camDispatcher U-PPGMU02 — handler round-trip via cps_path", () => {
  it("absolute cps_path loads from disk and validates", () => {
    const tmp = mkdtempSync(path.join(tmpdir(), "ppgmu02-"));
    const tmpFile = path.join(tmp, "fixture.cps");
    try {
      writeFileSync(tmpFile, CANONICAL_CPS_FIXTURE, "utf8");
      const validated = ACTION_CAM_SCHEMAS.master_post_okuma_multus_b250.parse({
        cps_path: tmpFile,
      }) as ValidatedMultusParams;
      const result = okumaMultusB250IIMillTurnMasterPostEngine.inspectCanonical({
        cpsPath: validated.cps_path,
      });
      expect(result.metadata.vendor).toBe("OKUMA");
      expect(result.metadata.forkid).toBe(CANONICAL_FORKID);
      expect(result.validation.ok).toBe(true);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe("camDispatcher U-PPGMU02 — handler round-trip via repo_root", () => {
  it("repo_root resolves CANONICAL_POST_RELATIVE_PATH and loads the fixture", () => {
    // Build a fake repo root that mirrors the canonical relative path.
    const tmp = mkdtempSync(path.join(tmpdir(), "ppgmu02-root-"));
    const target = path.join(tmp, CANONICAL_POST_RELATIVE_PATH);
    try {
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, CANONICAL_CPS_FIXTURE, "utf8");

      const validated = ACTION_CAM_SCHEMAS.master_post_okuma_multus_b250.parse({
        repo_root: tmp,
      }) as ValidatedMultusParams;
      const result = okumaMultusB250IIMillTurnMasterPostEngine.inspectCanonical({
        repoRoot: validated.repo_root,
      });
      expect(result.metadata.modelType).toBe("okuma multus b250IIw");
      expect(result.metadata.forkid).toBe(CANONICAL_FORKID);
      expect(result.validation.ok).toBe(true);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("non-existent repo_root surfaces the underlying ENOENT (no silent default)", () => {
    const validated = ACTION_CAM_SCHEMAS.master_post_okuma_multus_b250.parse({
      repo_root: "C:/__definitely__/__not__/__a__/__real__/__path__",
    }) as ValidatedMultusParams;
    expect(() =>
      okumaMultusB250IIMillTurnMasterPostEngine.inspectCanonical({
        repoRoot: validated.repo_root,
      }),
    ).toThrow(/ENOENT|no such file|not found/i);
  });
});
