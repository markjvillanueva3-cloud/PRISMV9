/**
 * CADFailureTriageEngine — U-CINF06 (CAD-INFRA-MS0)
 *
 * Classifies CAD regression-test failures into the 6 canonical root-cause
 * categories defined in cadRegressionTestSchema.ErrorTypeEnum:
 *
 *   format     — input file unreadable or unsupported format
 *   parse      — CAD kernel parse error
 *   generation — toolpath / CAM generation error
 *   comparison — diff exceeded tolerance threshold
 *   timeout    — worker exceeded wall-clock limit
 *   crash      — unhandled exception / OOM / heap
 *
 * The engine is deliberately pattern-driven, not ML-driven: the taxonomy is
 * small, the signals are high-signal (stack traces, error messages, file
 * state), and pattern matching is deterministic + auditable. A confidence
 * score accompanies every classification so downstream consumers (dashboard,
 * report generator, RCA tools) can gate on quality.
 *
 * Grouping:
 *   Failures carry a stable `rootCauseKey` = SHA-256(errorType + normalized
 *   signature) so the dashboard can collapse identical failures. Signature
 *   normalization strips file paths, PIDs, timestamps, and hex addresses
 *   from the raw message + top stack frame.
 *
 * Accuracy target: >95% on the seeded corpus (see unit tests).
 *
 * Duplication check: no existing engine classifies CAD regression failure
 * messages. The closest are IntentClassifierEngine (NL intent) and
 * LathePartClassifierEngine (part-family geometry). Different domain,
 * different signals. Safe to create.
 *
 * @module engines/CADFailureTriageEngine
 */

import { createHash } from "crypto";
import { BaseEngine } from "./BaseEngine.js";
import type { EngineCapability, EngineInfo } from "./IEngine.js";
import type { ErrorType } from "../schemas/cadRegressionTestSchema.js";

// ── Raw failure payload ───────────────────────────────────────────────────────

export interface FailurePayload {
  fileId: string;
  /** File extension, e.g. ".sldprt". Used as a hint for format errors. */
  format?: string;
  /** The error message from the runner. */
  message: string;
  /** Optional full stack trace as a single string. */
  stack?: string;
  /** Optional timestamp ms — not used for classification, kept in output. */
  timestamp?: number;
  /**
   * If the runner reports the file couldn't be read at all (size=0, ENOENT,
   * EACCES), set this flag — it is a very strong format-error signal.
   */
  fileUnreadable?: boolean;
  /** If true, AbortSignal fired — strong timeout signal. */
  aborted?: boolean;
  /** Optional pre-classified signal from the runner (overrides pattern match). */
  hint?: ErrorType;
}

// ── Triage output ─────────────────────────────────────────────────────────────

export interface TriageResult {
  fileId: string;
  errorType: ErrorType;
  /** 0..1 — higher = stronger pattern match. */
  confidence: number;
  /** Stable SHA-256 digest grouping this failure with siblings. */
  rootCauseKey: string;
  /** Short human label for the root cause (top stack frame or regex tag). */
  rootCauseLabel: string;
  /** The original message, truncated. */
  messageSnippet: string;
  /** Optional remediation suggestion derived from the matched pattern. */
  suggestedFix?: string;
}

export interface TriageGroup {
  rootCauseKey: string;
  rootCauseLabel: string;
  errorType: ErrorType;
  count: number;
  fileIds: string[];
  sampleMessages: string[];
}

// ── Pattern table ─────────────────────────────────────────────────────────────

interface PatternRule {
  errorType: ErrorType;
  /** Each rule is tested in declaration order. First match wins. */
  test: (p: FailurePayload) => boolean;
  /** Human-readable label for the root-cause group. */
  label: string;
  /** Score assigned when this rule matches (0..1). */
  confidence: number;
  /** Optional remediation hint surfaced to operators. */
  suggestedFix?: string;
}

/**
 * Rules are ordered from most specific to least specific. Strong signals
 * (explicit runner flags) fire first; fuzzy regexes are the fallback.
 */
const RULES: PatternRule[] = [
  // ── Strong signals ─────────────────────────────────────────────────────────
  {
    errorType: "timeout",
    test: (p) => p.aborted === true || /AbortError|abort signal|AbortSignal/i.test(p.message + (p.stack ?? "")),
    label: "abort-signal-fired",
    confidence: 0.99,
    suggestedFix: "Raise perFileTimeoutMs for this format or profile the bridge",
  },
  {
    errorType: "format",
    test: (p) => p.fileUnreadable === true,
    label: "file-unreadable",
    confidence: 0.98,
    suggestedFix: "Check file permissions, corruption, or missing file",
  },

  // ── Timeout patterns ──────────────────────────────────────────────────────
  {
    errorType: "timeout",
    test: (p) => /\btimeout\b|\btimed out\b|ETIMEDOUT|deadline exceeded/i.test(p.message),
    label: "timeout-explicit",
    confidence: 0.95,
    suggestedFix: "Raise perFileTimeoutMs for this format or profile the bridge",
  },

  // ── Crash / OOM patterns ──────────────────────────────────────────────────
  {
    errorType: "crash",
    test: (p) => /out of memory|OOM|heap out of|FATAL ERROR.*CALL_AND_RETRY|JavaScript heap/i.test(p.message + (p.stack ?? "")),
    label: "oom",
    confidence: 0.97,
    suggestedFix: "Increase Node heap via --max-old-space-size or reduce batch size",
  },
  {
    errorType: "crash",
    test: (p) => /Segmentation fault|SIGSEGV|EXCEPTION_ACCESS_VIOLATION|null pointer|access violation/i.test(p.message + (p.stack ?? "")),
    label: "segfault",
    confidence: 0.96,
    suggestedFix: "Investigate native bridge crash; may be a CAD app version mismatch",
  },
  {
    errorType: "crash",
    test: (p) => /EPIPE|ECONNRESET|ECONNREFUSED|bridge exploded|worker crash/i.test(p.message),
    label: "ipc-crash",
    confidence: 0.9,
    suggestedFix: "Check bridge IPC health and subprocess lifecycle",
  },

  // ── Format / read errors ──────────────────────────────────────────────────
  {
    errorType: "format",
    test: (p) => /ENOENT|ENOTFOUND|no such file|cannot find file|file not found/i.test(p.message),
    label: "file-missing",
    confidence: 0.95,
    suggestedFix: "Re-run index; file was likely moved or deleted",
  },
  {
    errorType: "format",
    test: (p) => /EACCES|permission denied|access denied/i.test(p.message),
    label: "permission-denied",
    confidence: 0.94,
    suggestedFix: "Check filesystem ACLs on the CAD corpus root",
  },
  {
    errorType: "format",
    test: (p) => /unsupported format|unknown file type|unrecognized extension|not a valid .*(file|archive)/i.test(p.message),
    label: "unsupported-format",
    confidence: 0.9,
    suggestedFix: "Add a parser/bridge for this extension, or mark skip",
  },
  {
    errorType: "format",
    test: (p) => /zero.length|empty file|0.bytes/i.test(p.message),
    label: "empty-file",
    confidence: 0.93,
    suggestedFix: "Re-export source file; zero-length blobs cannot be tested",
  },

  // ── Parse errors ──────────────────────────────────────────────────────────
  {
    errorType: "parse",
    test: (p) => /parse error|unexpected token|invalid JSON|malformed|SyntaxError/i.test(p.message),
    label: "parse-syntax",
    confidence: 0.88,
    suggestedFix: "File may be corrupted or produced by an unsupported CAD version",
  },
  {
    errorType: "parse",
    test: (p) => /corrupt|damaged|checksum|CRC error|invalid signature/i.test(p.message),
    label: "corrupt-file",
    confidence: 0.9,
    suggestedFix: "Validate file against CAD app; may need re-save from source",
  },
  {
    errorType: "parse",
    test: (p) => /OCCT|open cascade|STEP.*(read|parse)|IGES.*(read|parse)|kernel reader/i.test(p.message + (p.stack ?? "")),
    label: "kernel-reader-failure",
    confidence: 0.85,
    suggestedFix: "Check OCCT kernel version compatibility",
  },

  // ── Generation errors ─────────────────────────────────────────────────────
  {
    errorType: "generation",
    test: (p) => /toolpath|CAM generation|post.processor|G.?code|NC generation/i.test(p.message),
    label: "cam-generation",
    confidence: 0.85,
    suggestedFix: "Review CAM strategy selection and post-processor compatibility",
  },
  {
    errorType: "generation",
    test: (p) => /export failed|STEP export|cannot export|write.*failed/i.test(p.message),
    label: "export-failure",
    confidence: 0.85,
    suggestedFix: "Check bridge export capability for this format",
  },

  // ── Comparison errors ─────────────────────────────────────────────────────
  {
    errorType: "comparison",
    test: (p) => /tolerance exceeded|diff exceeded|signature mismatch|pixel.diff|STEP compare/i.test(p.message),
    label: "tolerance-exceeded",
    confidence: 0.9,
    suggestedFix: "Review tolerance thresholds or regenerate ground truth",
  },
  {
    errorType: "comparison",
    test: (p) => /dimension.*(mismatch|differs)|bounding box.*(mismatch|differs)/i.test(p.message),
    label: "dimension-mismatch",
    confidence: 0.87,
    suggestedFix: "Ground truth may be stale; re-extract for this file",
  },

  // ── Fallback crash ────────────────────────────────────────────────────────
  {
    errorType: "crash",
    test: (p) => typeof p.stack === "string" && p.stack.length > 0,
    label: "unclassified-exception",
    confidence: 0.5,
    suggestedFix: "Add a pattern rule for this error signature",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function sha256Hex(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

/**
 * Normalise a message so that path separators, timestamps, PIDs, and hex
 * addresses don't fragment grouping. "C:/x/y.sldprt" and "C:/a/b.sldprt"
 * should group together when the underlying fault is the same.
 */
function normaliseForGrouping(raw: string): string {
  return raw
    .replace(/[A-Za-z]:[\\/][^\s"']+/g, "<PATH>")   // Windows absolute paths
    .replace(/\/[^\s"']+\.(sldprt|sldasm|slddrw|ipt|iam|idw|FCStd|f3d|f3z|mcx-8|MCX|mcam|hmc|step|stp|iges|igs|stl|x_t|x_b)/gi, "<CADPATH>")
    .replace(/pid[= ]\d+/gi, "pid=<PID>")
    .replace(/\b\d{13,}\b/g, "<TS>")                  // unix-ms timestamps
    .replace(/0x[0-9a-f]+/gi, "<ADDR>")               // hex addresses
    .replace(/:\d+:\d+/g, ":<LINE>:<COL>")            // stack line:col
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Pick the first non-trivial stack frame as the label, falling back to the
 * rule label if the stack is missing or dominated by node internals.
 */
function topFrame(stack: string | undefined): string | null {
  if (!stack) return null;
  const lines = stack.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("at ")) continue;
    // Skip node internals
    if (/\bnode:internal\b|\binternal\/process\b/.test(trimmed)) continue;
    return trimmed.replace(/^at\s+/, "");
  }
  return null;
}

// ── Engine ────────────────────────────────────────────────────────────────────

export class CADFailureTriageEngine extends BaseEngine {
  constructor() {
    const info: EngineInfo = {
      name: "CADFailureTriageEngine",
      version: "1.0.0",
      domain: "cad_infrastructure",
      description:
        "Classifies CAD regression failures into 6 root-cause categories " +
        "(format|parse|generation|comparison|timeout|crash) with confidence " +
        "score and stable grouping key for dashboard collapse.",
    };
    super(info);
  }

  getCapabilities(): EngineCapability[] {
    return [
      {
        name: "triage",
        description: "Classify a single failure payload",
        actions: ["cad_failure_triage_one"],
      },
      {
        name: "group",
        description: "Group a batch of triage results by rootCauseKey",
        actions: ["cad_failure_triage_group"],
      },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null || typeof input !== "object") return "input must be an object";
    const o = input as Record<string, unknown>;
    if (o.failure === undefined && o.failures === undefined) {
      return "input must contain `failure` or `failures`";
    }
    return null;
  }

  protected async executeImpl(input: unknown): Promise<unknown> {
    const o = input as { failure?: FailurePayload; failures?: FailurePayload[] };
    if (o.failures && Array.isArray(o.failures)) {
      const results = o.failures.map((f) => this.triage(f));
      return {
        results,
        groups: this.group(results),
      };
    }
    if (o.failure) {
      return this.triage(o.failure);
    }
    throw new Error("unreachable");
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Classify a single failure payload. Deterministic — same input → identical
   * TriageResult (including rootCauseKey).
   */
  triage(payload: FailurePayload): TriageResult {
    // Respect an explicit hint from the runner when provided.
    if (payload.hint) {
      return this._buildResult(payload, payload.hint, "runner-hint", 0.99);
    }

    for (const rule of RULES) {
      if (rule.test(payload)) {
        return this._buildResult(payload, rule.errorType, rule.label, rule.confidence, rule.suggestedFix);
      }
    }

    // Absolute fallback — no pattern matched, no stack trace. Cold crash.
    return this._buildResult(payload, "crash", "unknown", 0.3);
  }

  /**
   * Group a batch of triage results by rootCauseKey for dashboard collapse.
   */
  group(results: TriageResult[]): TriageGroup[] {
    const byKey = new Map<string, TriageGroup>();
    for (const r of results) {
      let g = byKey.get(r.rootCauseKey);
      if (!g) {
        g = {
          rootCauseKey: r.rootCauseKey,
          rootCauseLabel: r.rootCauseLabel,
          errorType: r.errorType,
          count: 0,
          fileIds: [],
          sampleMessages: [],
        };
        byKey.set(r.rootCauseKey, g);
      }
      g.count++;
      g.fileIds.push(r.fileId);
      if (g.sampleMessages.length < 3) g.sampleMessages.push(r.messageSnippet);
    }
    return Array.from(byKey.values()).sort((a, b) => b.count - a.count);
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private _buildResult(
    payload: FailurePayload,
    errorType: ErrorType,
    label: string,
    confidence: number,
    suggestedFix?: string,
  ): TriageResult {
    const stackTop = topFrame(payload.stack);
    const rootCauseLabel = stackTop ? `${label}@${stackTop}` : label;
    const signature = normaliseForGrouping(`${label}|${payload.message}|${stackTop ?? ""}`);
    const rootCauseKey = sha256Hex(`${errorType}|${signature}`);
    return {
      fileId: payload.fileId,
      errorType,
      confidence,
      rootCauseKey,
      rootCauseLabel,
      messageSnippet: truncate(payload.message, 200),
      ...(suggestedFix ? { suggestedFix } : {}),
    };
  }
}

/** Singleton for dispatcher use. */
export const cadFailureTriageEngine = new CADFailureTriageEngine();
