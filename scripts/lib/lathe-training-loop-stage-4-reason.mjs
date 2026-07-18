// Training-loop Stage 4 (REASON) — implements U-LATHE-LOOP-STAGE-IMPL-1-TO-5 (Stage 4 of 11)
// Design memo: reference_lathe_training_loop_stages_1_5_design_2026_05_27
// Session-final state: reference_whiskey_session_final_iter167_2026_05_27
//
// runStage4_Reason(programReport, partSpec, engines) → ReasonReport
//
// Composes the 5 P0 engines built earlier this session to synthesize a structured
// improvement plan for an existing lathe program.
// See scripts/lib/README-whiskey-lathe.md for the full engine + test catalog.

const REQUIRED_PART_SPEC = ["iso_group"];

// Severity mapping from inner sources → outer P0/P1/P2
const SEVERITY_PROMOTE = {
  critical: "P0",
  warning: "P1",
  suggestion: "P2",
  info: "P2"
};

function detectThreadCannedCycleAntiPattern(parsed) {
  if (!parsed?.g_codes) return null;
  if (parsed.g_codes.includes("G92") && !parsed.g_codes.includes("G76")) {
    return {
      category: "canned_cycle",
      severity: "P1",
      what: "Replace G92 single-pass threading with G76 canned cycle",
      why: "G92 requires manual pass iteration; G76 handles multi-pass roughing + finish + chamfer in one block. Modern controllers (Fanuc/Haas/Okuma/Doosan/Mazak) all support G76.",
      delta_score: 8,
      lever: "structural_cycle_substitution"
    };
  }
  return null;
}

function detectMissingSafetyGate(parsed) {
  if (!parsed?.g_codes) return null;
  if (parsed.spindle_mode === "G96" && !parsed.g_codes.includes("G50")) {
    return {
      category: "safety",
      severity: "P0",
      what: "Add G50 max-RPM cap before G96 CSS mode",
      why: "G96 (constant surface speed) can over-rev the spindle at small diameters; G50 caps maximum RPM as protection.",
      delta_score: 12,
      lever: "structural_safety_gate"
    };
  }
  return null;
}

// Surfaces a recommendation when raw motion (G00/G01) lacks paired safety-state-flags G40/G80.
// Note: iter218's empirical-finding rationale was RETRACTED by iter261 (see
// [[reference_iter218_alcoa_outlier_retraction_2026_05_27]]). v2.0.0 upgrade B-versions
// do NOT add G40/G80 (pure annotation pass-through across 5 customers / 80+ pairs).
// The detector remains semantically valid as a standalone code-smell check: raw motion
// without explicit G40/G80 risks inheriting stale modal state (cutter-comp drift,
// canned-cycle re-entry) regardless of what v2.0.0 does or doesn't do.
function detectMissingSafetyStateFlags(parsed) {
  if (!parsed?.g_codes) return null;
  const set = new Set(parsed.g_codes);
  const hasMotion = set.has("G00") || set.has("G01");
  const hasG40 = set.has("G40");
  const hasG80 = set.has("G80");
  if (!hasMotion) return null;
  const missing = [];
  if (!hasG40) missing.push("G40 (cutter compensation cancel)");
  if (!hasG80) missing.push("G80 (canned cycle cancel)");
  if (missing.length === 0) return null;
  return {
    category: "safety",
    severity: "P1",
    what: `Add explicit safety-state cancels: ${missing.join(" + ")}`,
    why: "Raw G00/G01 motion without explicit G40 (cutter-comp cancel) and G80 (canned-cycle cancel) risks inheriting stale modal state from prior blocks: cutter-comp drift can mis-offset finishing passes, and an active canned cycle re-entered at the wrong Z can drive the tool through the work. Explicit cancels at tool-change boundaries are standard professional practice (see Sandvik / Kennametal / Sumitomo lathe programming guides).",
    delta_score: 5,
    lever: "safety_state_enumeration"
  };
}

function detectMissingFinishPass(parsed, partSpec) {
  if (!parsed?.g_codes) return null;
  if (!parsed.g_codes.includes("G71") || parsed.g_codes.includes("G70")) return null;
  // Controller dialect awareness: Okuma + Mazak single-line G71 cycle embeds finish via U/H stock-leave
  // parameters — no separate G70 needed. Only Fanuc + Haas 2-line G71 requires paired G70.
  const controller = (partSpec?.controller || "fanuc").toLowerCase();
  if (controller === "okuma" || controller === "mazak") return null;
  return {
    category: "canned_cycle",
    severity: "P1",
    what: "Add G70 finish-pass after G71 roughing",
    why: "G71 leaves finish stock (U/W). Without G70 the part stays at semi-finish dimensions and surface; G70 follows the same profile at a finishing feed/speed.",
    delta_score: 10,
    lever: "structural_finish_pass"
  };
}

// Map G-code presence → most-likely operation for wizard insert-pick.
// Order matters: most-specific first. Returns first match.
const OPERATION_FROM_GCODE = [
  { codes: ["G76", "G92", "G32"], operation: "threading" },
  { codes: ["G75"], operation: "grooving" },
  // Drilling-family canned cycles. G74 = peck-drill (Fanuc lathe), G81 = drill,
  // G82 = drill with dwell, G83 = peck drill, G85 = drill-and-bore, G87 = back-bore.
  { codes: ["G74", "G81", "G82", "G83", "G85", "G86", "G87", "G88", "G89"], operation: "drilling" },
  { codes: ["G71", "G72", "G73"], operation: "roughing" },
  { codes: ["G70"], operation: "finishing" }
];

function inferOperationFromGCodes(gCodes) {
  if (!Array.isArray(gCodes)) return "facing";  // default for plain G00/G01 face-cut programs
  const set = new Set(gCodes);
  for (const rule of OPERATION_FROM_GCODE) {
    if (rule.codes.some(c => set.has(c))) return rule.operation;
  }
  return "facing";
}

// Operator-authored T-block comments often disclose operation explicitly:
//   "T010101 (Rough OD and face)" → roughing
//   "T020202 (Drill 0.500 dia)"   → drilling
//   "T030303 (Thread 1/4-20)"     → threading
// Returns null if no inline comment, else the inferred operation.
const COMMENT_OPERATION_PATTERNS = [
  { re: /\brough/i, operation: "roughing" },
  { re: /\bfinish/i, operation: "finishing" },
  { re: /\bthread/i, operation: "threading" },
  { re: /\bdrill/i, operation: "drilling" },
  { re: /\bgroove|cutoff|part[- ]?off/i, operation: "grooving" },
  { re: /\bbore/i, operation: "boring" },
  { re: /\bchamfer/i, operation: "finishing" },
  { re: /\bface/i, operation: "facing" }
];

function inferOperationFromToolBlockComment(toolBlocks) {
  if (!Array.isArray(toolBlocks) || toolBlocks.length === 0) return null;
  for (const tb of toolBlocks) {
    const text = tb.text || tb.comment || "";
    if (!text) continue;
    // Extract parenthesized comment
    const m = text.match(/\(([^)]+)\)/);
    if (!m) continue;
    const comment = m[1];
    for (const rule of COMMENT_OPERATION_PATTERNS) {
      if (rule.re.test(comment)) return rule.operation;
    }
  }
  return null;
}

function detectUndocumentedTooling(programReport, partSpec, engines) {
  // If toolsValidated=false (or absent) AND we have tool_blocks AND the wizard can pick an insert,
  // surface a tooling recommendation naming the wizard's primary pick.
  const parsed = programReport.parsed || {};
  const toolBlocks = parsed.tool_blocks || [];
  if (programReport.toolsValidated === true) return null;
  if (toolBlocks.length === 0) return null;
  if (!engines?.selector) return null;

  try {
    // Operation inference priority (strongest signal first):
    //   1. Explicit operation_sequence from caller
    //   2. Operator-authored T-block parenthesized comment ("(Rough OD and face)")
    //   3. G-code presence heuristic (G71 → roughing, G74/G81 → drilling, etc.)
    let operation;
    if ((parsed.operation_sequence || []).includes("od_rough")) operation = "roughing";
    else if ((parsed.operation_sequence || []).includes("od_thread")) operation = "threading";
    else if ((parsed.operation_sequence || []).includes("od_groove")) operation = "grooving";
    else operation = inferOperationFromToolBlockComment(toolBlocks)
                  || inferOperationFromGCodes(parsed.g_codes);
    const pick = engines.selector.selectInsert({
      iso_group: partSpec.iso_group,
      operation,
      material: partSpec.material || "unknown",
      customer: partSpec.customer
    });
    return {
      category: "tooling",
      severity: "P0",
      what: `Document insert ${pick.primary.vendor} ${pick.primary.grade} (${pick.primary.insertAnsi || pick.primary.geometry}) in the tool-call preamble for T${toolBlocks[0].tool_number.toString().padStart(2, "0")}`,
      why: `Programs without ANSI-coded inserts can't be validated by quality pipeline. Wizard picked ${pick.primary.grade} with score breakdown: ${JSON.stringify(pick.score_breakdown)}.`,
      delta_score: 15,
      lever: "tooling_documentation"
    };
  } catch (e) {
    // Wizard couldn't pick (no candidate ≥ 50) — surface as P1 advisory instead
    return {
      category: "tooling",
      severity: "P1",
      what: "Operator-confirm insert for T-block — wizard had no high-confidence pick",
      why: `selectInsert raised: ${e.message}`,
      delta_score: 5,
      lever: "tooling_documentation"
    };
  }
}

function detectThreadIssueRecommendations(threadIssues) {
  // Map thread-validator issues into stage-4 recommendations
  if (!Array.isArray(threadIssues)) return [];
  return threadIssues.map(i => ({
    category: "canned_cycle",
    severity: SEVERITY_PROMOTE[i.severity] || "P2",
    what: i.suggestion || i.message || `Address thread issue: ${i.issue}`,
    why: i.message || `Thread validator rule: ${i.issue}`,
    delta_score: i.severity === "critical" ? 18 : i.severity === "warning" ? 8 : 3,
    lever: `thread_validator_${i.issue || "generic"}`
  }));
}

export function runStage4_Reason(programReport, partSpec, engines) {
  if (!programReport || typeof programReport !== "object") {
    throw new Error("runStage4_Reason: programReport is required");
  }
  if (!partSpec || typeof partSpec !== "object") {
    throw new Error("runStage4_Reason: partSpec is required");
  }
  for (const k of REQUIRED_PART_SPEC) {
    if (!partSpec[k]) throw new Error(`runStage4_Reason: partSpec missing required field '${k}'`);
  }

  const recommendations = [];

  // Synthesizers — each returns a single recommendation OR null
  const single = [
    detectThreadCannedCycleAntiPattern(programReport.parsed),
    detectMissingSafetyGate(programReport.parsed),
    detectMissingFinishPass(programReport.parsed, partSpec),
    detectMissingSafetyStateFlags(programReport.parsed),
    detectUndocumentedTooling(programReport, partSpec, engines)
  ].filter(Boolean);
  recommendations.push(...single);

  // Bulk synthesizers — return arrays
  recommendations.push(...detectThreadIssueRecommendations(programReport.threadIssues));

  // Dedup by `what` (same recommendation may surface from multiple sources)
  const seen = new Set();
  const deduped = recommendations.filter(r => {
    if (seen.has(r.what)) return false;
    seen.add(r.what);
    return true;
  });

  const expectedDelta = deduped.reduce((sum, r) => sum + (r.delta_score || 0), 0);
  const currentScore = typeof programReport.currentScore === "number" ? programReport.currentScore : 0;
  const targetScore = Math.min(100, currentScore + expectedDelta);
  const confidence = deduped.length === 0 ? 1.0 : Math.max(0.5, 0.95 - deduped.length * 0.05);

  return {
    current_score: currentScore,
    target_score: targetScore,
    improvement_recommendations: deduped,
    expected_delta_score: expectedDelta,
    confidence
  };
}
