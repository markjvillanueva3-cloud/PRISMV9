// Training-loop Stage 5 (GENERATE) — implements U-LATHE-LOOP-STAGE-IMPL-1-TO-5 (Stage 5 of 11)
// Design memo: reference_lathe_training_loop_stages_1_5_design_2026_05_27
// Session-final state: reference_whiskey_session_final_iter167_2026_05_27
// See scripts/lib/README-whiskey-lathe.md for full engine + test catalog.
//
// runStage5_Generate(originalProgram, reasonReport, ctx) → ProposedProgram
//
// Takes a ReasonReport from stage 4 + the original program text, applies the
// automatable recommendations as concrete edits, and returns the new program text
// plus a diff + change-summary + list of recommendations that couldn't be auto-applied.

function makeUnifiedDiffLineCount(originalLines, newLines) {
  // Lightweight diff summary — count adds/removes without external diff library.
  const origSet = new Set(originalLines);
  const newSet = new Set(newLines);
  const added = newLines.filter(l => !origSet.has(l));
  const removed = originalLines.filter(l => !newSet.has(l));
  const parts = [];
  for (const l of removed) parts.push(`- ${l}`);
  for (const l of added) parts.push(`+ ${l}`);
  return parts.join("\n");
}

function applySafetyGateG50(lines, change) {
  // Insert "G50 S<cap>" before the first G96 line.
  const out = [];
  let inserted = false;
  for (const line of lines) {
    if (!inserted && /\bG96\b/.test(line)) {
      out.push("G50 S3500");
      inserted = true;
    }
    out.push(line);
  }
  if (inserted) {
    change.applied = true;
    change.detail = "Inserted 'G50 S3500' before first G96 block.";
  }
  return out;
}

function applyG92toG76(lines, change) {
  const out = [];
  let replaced = false;
  for (const line of lines) {
    const m = line.match(/\bG92\s+X(-?\d+(?:\.\d+)?)\s+Z(-?\d+(?:\.\d+)?)\s+F(-?\d+(?:\.\d+)?)/);
    if (m) {
      const [, x, z, f] = m;
      const pitch = Number(f);
      const depth1k = Math.round(pitch * 613); // 60° UN depth ≈ 0.6134 × pitch
      const firstPass1k = 300; // µm × 1000
      out.push(`G76 P020060 Q50 R0.003`);
      out.push(`G76 X${x} Z${z} P${depth1k} Q${firstPass1k} F${pitch}`);
      replaced = true;
    } else {
      out.push(line);
    }
  }
  if (replaced) {
    change.applied = true;
    change.detail = "Replaced single-line G92 thread with paired G76 canned cycle.";
  }
  return out;
}

function applyG70AfterG71(lines, change) {
  // Find the last G71 line; append a G70 P10 Q20 F0.005 after the block-end "N" marker if present.
  const out = [];
  let inserted = false;
  let pendingG70 = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    out.push(line);
    if (!inserted && /\bG71\b\s+P\d+/.test(line)) {
      pendingG70 = true;
    }
    if (pendingG70 && /^\s*N\d+\s+G01\s+X/.test(line)) {
      // After we see the END of the G71 profile (a typical N20 G01 X..Z..), insert G70
      out.push("G70 P10 Q20 F0.005");
      pendingG70 = false;
      inserted = true;
    }
  }
  if (inserted) {
    change.applied = true;
    change.detail = "Inserted 'G70 P10 Q20 F0.005' as finish pass after G71 profile.";
  }
  return out;
}

const LEVER_APPLIERS = {
  structural_safety_gate: applySafetyGateG50,
  structural_cycle_substitution: applyG92toG76,
  structural_finish_pass: applyG70AfterG71
};

export function runStage5_Generate(originalProgram, reasonReport, ctx = {}) {
  if (!reasonReport || typeof reasonReport !== "object") {
    throw new Error("runStage5_Generate: reasonReport is required");
  }
  if (typeof originalProgram !== "string") {
    throw new Error("runStage5_Generate: originalProgram must be a string");
  }

  const recs = reasonReport.improvement_recommendations || [];

  // Short-circuit on clean program
  if (recs.length === 0) {
    return {
      text: originalProgram,
      diff_from_original: "",
      changes_applied: [],
      estimated_new_score: reasonReport.current_score ?? 0,
      unapplied_recommendations: [],
      needs_operator_review: false
    };
  }

  // Preserve original line-ending — CRLF on Windows files must not be silently normalized to LF
  const eol = originalProgram.includes("\r\n") ? "\r\n" : "\n";
  let lines = originalProgram.split(/\r?\n/);
  const changesApplied = [];
  const unapplied = [];

  for (const rec of recs) {
    const applier = LEVER_APPLIERS[rec.lever];
    if (!applier) {
      // No automatic applier for this lever — surface as unapplied + operator review
      unapplied.push(rec);
      continue;
    }
    const change = { lever: rec.lever, what: rec.what, applied: false, detail: null };
    lines = applier(lines, change);
    if (change.applied) {
      changesApplied.push(change);
    } else {
      unapplied.push(rec);
    }
  }

  // R12: if no levers fired, return original program verbatim — never silently re-serialize
  // (avoids over-normalizing mixed CRLF/LF line endings when nothing was actually changed).
  const noChangesApplied = changesApplied.length === 0;
  const newText = noChangesApplied ? originalProgram : lines.join(eol);
  const diff = newText === originalProgram ? "" : makeUnifiedDiffLineCount(originalProgram.split(/\r?\n/), lines);

  const currentScore = reasonReport.current_score ?? 0;
  const targetScore = reasonReport.target_score ?? currentScore;
  // Estimated new score: prorate based on what fraction of recommended delta we actually applied
  const totalDelta = recs.reduce((s, r) => s + (r.delta_score || 0), 0);
  const appliedDelta = changesApplied.reduce((s, c) => {
    const rec = recs.find(r => r.what === c.what);
    return s + (rec?.delta_score || 0);
  }, 0);
  let estimatedNewScore;
  if (changesApplied.length === recs.length) {
    estimatedNewScore = targetScore;
  } else if (totalDelta === 0) {
    estimatedNewScore = currentScore;
  } else {
    estimatedNewScore = currentScore + appliedDelta;
  }

  return {
    text: newText,
    diff_from_original: diff,
    changes_applied: changesApplied,
    estimated_new_score: estimatedNewScore,
    unapplied_recommendations: unapplied,
    needs_operator_review: unapplied.length > 0
  };
}
