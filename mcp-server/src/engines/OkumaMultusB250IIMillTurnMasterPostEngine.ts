/**
 * OkumaMultusB250IIMillTurnMasterPostEngine — PRISM facade for the canonical
 * Mastercam/Fusion 360 post processor used to drive JM Die's Okuma Multus
 * B250IIW (OSP-P300SA controller). The post itself is a 233 KB Autodesk
 * JavaScript-style CPS file:
 *
 *   JM DIE/PRISM MODIFIED POST PROCESSORS/OKUMA_MULTUS_B250IIW-PRISM-Enhanced-v5_2_7.cps
 *
 * The .cps does the actual G-code emission — Mastercam/Fusion loads it and
 * walks each operation through the standard `onSection` / `onLinear` / etc.
 * lifecycle. This engine does NOT re-implement that emission. It provides the
 * PRISM-side surface around the post:
 *
 *   1. Post identity (description, vendor, controller, FORKID, revision tag)
 *   2. Capability + property catalog parsed from the .cps header
 *   3. The 11 `usePRISMxxx` intelligence flags v5.2.7 ships with — typed,
 *      versioned, and discoverable from the rest of PRISM
 *   4. Validation hooks PRISM should run independently of the post:
 *        - S(x) / Ω scoring against the requested tier
 *        - Kienzle Fc cross-check vs whatever the post writes via
 *          `usePRISMCuttingForceEstimate`
 *        - Taylor T cross-check vs the post's `usePRISMToolLifeTracking`
 *
 * Instantiation paths:
 *   - Default — engine reads `JM DIE/PRISM MODIFIED POST PROCESSORS/...cps`
 *     relative to a supplied repo root (or process.cwd() at runtime).
 *   - Test injection — pass `{ cpsContent: "..." }` to bypass the filesystem.
 *
 * SCAFFOLD STATUS (PPG-MS0/U-PPGMU01):
 *   This commit ships the facade + identity catalog + smoke validation. The
 *   PRISM physics cross-checks (Kienzle/Taylor) and BlockAnnotation envelope
 *   layer in across U-PPGMU02..U-PPGMU05 — see RESUME_POSTS_TOMORROW.md for
 *   the unit progression. We deliberately do NOT duplicate any logic the
 *   v5.2.7 .cps already owns; PRISM's job is to wrap and validate, not to
 *   re-emit.
 *
 * @module engines/OkumaMultusB250IIMillTurnMasterPostEngine
 * @milestone CAM-EXHAUST-MS0/U-PPGMU01 (scaffold facade)
 */

import { readFileSync } from "node:fs";
import path from "node:path";

// ============================================================================
// CONSTANTS — pinned to the canonical asset shipped at JM Die
// ============================================================================

/**
 * Path to the canonical post, relative to the repo root. The asset lives
 * under `JM DIE/` (production posts mid-modification — NOT canonical CAM
 * source). Each PRISM session's worktree has its own checkout of the file.
 */
export const CANONICAL_POST_RELATIVE_PATH =
  "JM DIE/PRISM MODIFIED POST PROCESSORS/OKUMA_MULTUS_B250IIW-PRISM-Enhanced-v5_2_7.cps";

/** Filename only — useful for the dispatcher / setup-sheet rendering. */
export const CANONICAL_POST_FILENAME =
  "OKUMA_MULTUS_B250IIW-PRISM-Enhanced-v5_2_7.cps";

/** Controller variant — OSP-P300S**A** is the latest specialty Multus console. */
export const CANONICAL_CONTROLLER = "OSP-P300SA";

/** Mastercam/Fusion FORKID extracted from the post header. */
export const CANONICAL_FORKID = "D93DAA65-1C09-402E-9871-3280B561D994";

/** Revision tag exposed by the .cps `$Revision:` line at v5.2.7. */
export const CANONICAL_REVISION_TAG =
  "44802 Ultra Enhanced Edition v5.2.7 - PRISM Intelligence";

/** Minimum Mastercam/Fusion runtime revision the .cps demands. */
export const CANONICAL_MINIMUM_RUNTIME_REVISION = 45909;

/**
 * The 11 PRISM intelligence flags surfaced in v5.2.7 (`properties.usePRISMxxx`
 * entries in the .cps header, lines 870-987). Listed in declaration order so
 * the operator dashboard can render them with the same grouping the .cps
 * uses internally.
 */
export const PRISM_INTELLIGENCE_FLAGS = [
  "usePRISMCycleTimeEstimate",
  "usePRISMSurfaceFinishPredict",
  "usePRISMToolLifeTracking",
  "usePRISMThermalComp",
  "usePRISMSpindleWarmup",
  "usePRISMArcFeedAdjust",
  "usePRISMCornerDecel",
  "usePRISMToolBreakDetect",
  "usePRISMChipLoadMonitor",
  "usePRISMCuttingForceEstimate",
  "usePRISMStabilityHints",
] as const;

export type PRISMIntelligenceFlag = (typeof PRISM_INTELLIGENCE_FLAGS)[number];

// ============================================================================
// PUBLIC TYPES
// ============================================================================

export interface MultusPostMetadata {
  description: string;
  vendor: string;
  vendorUrl: string | null;
  /** "Copyright (C) ... by Autodesk, Inc." — preserves attribution. */
  legalNotice: string | null;
  certificationLevel: number | null;
  /** Minimum Mastercam/Fusion runtime revision required (`minimumRevision`). */
  minimumRuntimeRevision: number | null;
  /** Output file extension Mastercam writes — "min" for Okuma. */
  extension: string | null;
  /** True when program names must parse as integers (false for this post). */
  programNameIsInteger: boolean;
  /** Mastercam/Fusion FORKID from the file header banner. */
  forkid: string | null;
  /** $Revision: ...$ line content from the source-control banner. */
  revisionTag: string | null;
  /** Post-internal model identifier (`var modelType = "..."`). */
  modelType: string | null;
  /** Capability constants `OR`-d together — milling/turning/probing/etc. */
  capabilities: string[];
  /** Total properties (`properties` block entries) declared in the .cps. */
  propertyCount: number;
  /** Subset of properties that match `usePRISMxxx`. */
  prismFlagsDeclared: PRISMIntelligenceFlag[];
}

export interface MultusEngineLoadOptions {
  /** Absolute path to the .cps. Wins over repoRoot+relativePath. */
  cpsPath?: string;
  /** Repo root for relative resolution (defaults to process.cwd()). */
  repoRoot?: string;
  /**
   * Direct CPS content for test injection. When supplied, no filesystem
   * access happens — useful in unit tests and locked-down environments.
   */
  cpsContent?: string;
}

// ============================================================================
// REGEX SET — extracts metadata without evaluating the JS post
// ============================================================================

const RX_DESCRIPTION = /^description\s*=\s*"([^"]*)"\s*;?$/m;
const RX_VENDOR = /^vendor\s*=\s*"([^"]*)"\s*;?$/m;
const RX_VENDOR_URL = /^vendorUrl\s*=\s*"([^"]*)"\s*;?$/m;
const RX_LEGAL = /^legal\s*=\s*"([^"]*)"\s*;?$/m;
const RX_CERT_LEVEL = /^certificationLevel\s*=\s*(\d+)\s*;?$/m;
const RX_MIN_REV = /^minimumRevision\s*=\s*(\d+)\s*;?$/m;
const RX_EXTENSION = /^extension\s*=\s*"([^"]*)"\s*;?$/m;
const RX_PROG_INT = /^programNameIsInteger\s*=\s*(true|false)\s*;?$/m;
const RX_FORKID = /FORKID\s*\{([0-9A-Fa-f-]+)\}/;
const RX_REVISION_TAG = /\$Revision:\s*([^$]+)\$/;
const RX_MODEL_TYPE = /^var\s+modelType\s*=\s*"([^"]*)"\s*;?$/m;
const RX_CAPABILITIES = /^capabilities\s*=\s*([^;]+);?$/m;
// Match `  propertyName: {` at the 2-space indent level used by Mastercam/Fusion
// CPS posts. Trailing `{` may be followed by EOL (multi-line property body) OR
// further content on the same line (single-line `{ title: "..." },` shape used
// by v5.2.7's PRISM flag block) — so we deliberately do NOT anchor with `$`.
// Nested keys live at 4+ space indent and are correctly rejected.
const RX_PROPERTY_NAMES = /^\s{2}([A-Za-z_][A-Za-z0-9_]*)\s*:\s*\{/gm;
const RX_PRISM_FLAG = /^usePRISM[A-Z][A-Za-z]*$/;

// ============================================================================
// ENGINE
// ============================================================================

/**
 * Facade engine for the canonical Multus B250IIW post. See module docstring.
 */
export class OkumaMultusB250IIMillTurnMasterPostEngine {
  /** Engine version — bumps with each U-PPGMU0N landing. */
  static readonly ENGINE_VERSION = "0.1.0-scaffold";

  /**
   * Resolve + read the canonical post. Filesystem hits happen here only —
   * all subsequent metadata calls operate on the cached string.
   */
  static loadCpsContent(opts: MultusEngineLoadOptions = {}): string {
    if (typeof opts.cpsContent === "string") {
      return opts.cpsContent;
    }
    const cpsPath = opts.cpsPath
      ?? path.resolve(opts.repoRoot ?? process.cwd(), CANONICAL_POST_RELATIVE_PATH);
    return readFileSync(cpsPath, "utf8");
  }

  /**
   * Parse the .cps header into a typed metadata bundle. Pure function on the
   * supplied content — no filesystem, no network.
   */
  static parseMetadata(cpsContent: string): MultusPostMetadata {
    if (typeof cpsContent !== "string" || cpsContent.length === 0) {
      throw new Error(
        "OkumaMultusB250IIMillTurnMasterPostEngine.parseMetadata: cpsContent must be a non-empty string",
      );
    }

    const headerSlice = cpsContent.slice(0, 32 * 1024); // first 32 KB covers all header metadata

    const description = RX_DESCRIPTION.exec(headerSlice)?.[1] ?? "";
    const vendor = RX_VENDOR.exec(headerSlice)?.[1] ?? "";
    const vendorUrl = RX_VENDOR_URL.exec(headerSlice)?.[1] ?? null;
    const legalNotice = RX_LEGAL.exec(headerSlice)?.[1] ?? null;

    const certMatch = RX_CERT_LEVEL.exec(headerSlice);
    const certificationLevel = certMatch ? parseInt(certMatch[1], 10) : null;

    const minRevMatch = RX_MIN_REV.exec(headerSlice);
    const minimumRuntimeRevision = minRevMatch ? parseInt(minRevMatch[1], 10) : null;

    const extension = RX_EXTENSION.exec(headerSlice)?.[1] ?? null;
    const programNameIsInteger = RX_PROG_INT.exec(headerSlice)?.[1] === "true";
    const forkid = RX_FORKID.exec(headerSlice)?.[1] ?? null;
    const revisionTag = RX_REVISION_TAG.exec(headerSlice)?.[1]?.trim() ?? null;
    const modelType = RX_MODEL_TYPE.exec(headerSlice)?.[1] ?? null;

    const capabilitiesExpr = RX_CAPABILITIES.exec(headerSlice)?.[1] ?? "";
    const capabilities = capabilitiesExpr
      .split("|")
      .map((s) => s.trim())
      .filter((s) => s.startsWith("CAPABILITY_"));

    const propertyNames: string[] = [];
    let m: RegExpExecArray | null;
    RX_PROPERTY_NAMES.lastIndex = 0;
    while ((m = RX_PROPERTY_NAMES.exec(cpsContent)) !== null) {
      propertyNames.push(m[1]);
    }
    const prismFlagsDeclared = propertyNames.filter((n): n is PRISMIntelligenceFlag =>
      RX_PRISM_FLAG.test(n) && (PRISM_INTELLIGENCE_FLAGS as readonly string[]).includes(n),
    );

    return {
      description,
      vendor,
      vendorUrl,
      legalNotice,
      certificationLevel,
      minimumRuntimeRevision,
      extension,
      programNameIsInteger,
      forkid,
      revisionTag,
      modelType,
      capabilities,
      propertyCount: propertyNames.length,
      prismFlagsDeclared,
    };
  }

  /**
   * Verify the parsed metadata matches the expected canonical contract. Used
   * by sealMasterPostOutput / pre-flight gates to detect post drift (someone
   * swapped in an unrelated .cps, or downgraded the version, or stripped
   * PRISM flags). Returns warnings rather than throwing so callers can
   * decide how to respond per safety tier.
   */
  static validateCanonical(meta: MultusPostMetadata): {
    ok: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];

    if (meta.vendor !== "OKUMA") {
      warnings.push(`Expected vendor=OKUMA, got "${meta.vendor}"`);
    }
    if (meta.forkid !== CANONICAL_FORKID) {
      warnings.push(`Expected FORKID=${CANONICAL_FORKID}, got "${meta.forkid}"`);
    }
    if (meta.revisionTag !== CANONICAL_REVISION_TAG) {
      warnings.push(
        `Expected revision tag "${CANONICAL_REVISION_TAG}", got "${meta.revisionTag}" — verify the .cps is the v5.2.7 build`,
      );
    }
    if (meta.minimumRuntimeRevision !== CANONICAL_MINIMUM_RUNTIME_REVISION) {
      warnings.push(
        `minimumRevision drift: expected ${CANONICAL_MINIMUM_RUNTIME_REVISION}, got ${meta.minimumRuntimeRevision}`,
      );
    }
    if (!meta.capabilities.includes("CAPABILITY_MILLING")) {
      warnings.push("Missing CAPABILITY_MILLING — Multus must be milling-capable");
    }
    if (!meta.capabilities.includes("CAPABILITY_TURNING")) {
      warnings.push("Missing CAPABILITY_TURNING — Multus must be turning-capable");
    }
    const missingPrism = (PRISM_INTELLIGENCE_FLAGS as readonly string[]).filter(
      (f) => !meta.prismFlagsDeclared.includes(f as PRISMIntelligenceFlag),
    );
    if (missingPrism.length > 0) {
      warnings.push(`Missing PRISM intelligence flags: ${missingPrism.join(", ")}`);
    }

    return { ok: warnings.length === 0, warnings };
  }

  /**
   * Engine self-report. The static metadata mirrors what the .cps declares
   * so consumers (capability census, dispatcher action lookup) can describe
   * this engine without needing to read the .cps themselves.
   */
  getStats(): {
    engine: string;
    version: string;
    canonical_post: string;
    controller: string;
    forkid: string;
    revision_tag: string;
    capabilities: ("milling" | "turning")[];
    prism_intelligence_flags: number;
    scaffold: boolean;
  } {
    return {
      engine: "OkumaMultusB250IIMillTurnMasterPostEngine",
      version: OkumaMultusB250IIMillTurnMasterPostEngine.ENGINE_VERSION,
      canonical_post: CANONICAL_POST_RELATIVE_PATH,
      controller: CANONICAL_CONTROLLER,
      forkid: CANONICAL_FORKID,
      revision_tag: CANONICAL_REVISION_TAG,
      capabilities: ["milling", "turning"],
      prism_intelligence_flags: PRISM_INTELLIGENCE_FLAGS.length,
      scaffold: true,
    };
  }

  /**
   * Convenience: load + parse + validate the canonical .cps in one call.
   * Throws on missing file (the dispatcher should catch and report); returns
   * a validated metadata bundle when the file is present.
   */
  inspectCanonical(opts: MultusEngineLoadOptions = {}): {
    metadata: MultusPostMetadata;
    validation: { ok: boolean; warnings: string[] };
  } {
    const cpsContent = OkumaMultusB250IIMillTurnMasterPostEngine.loadCpsContent(opts);
    const metadata = OkumaMultusB250IIMillTurnMasterPostEngine.parseMetadata(cpsContent);
    const validation = OkumaMultusB250IIMillTurnMasterPostEngine.validateCanonical(metadata);
    return { metadata, validation };
  }
}

/** Convenience singleton for callers that don't need their own instance. */
export const okumaMultusB250IIMillTurnMasterPostEngine =
  new OkumaMultusB250IIMillTurnMasterPostEngine();
