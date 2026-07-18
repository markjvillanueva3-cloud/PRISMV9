// G76 thread-validator — implements U-LATHE-G76-THREAD-VALIDATOR
// Design memo: reference_lathe_g76_thread_validator_design_2026_05_27
// Session-final state: reference_whiskey_session_final_iter167_2026_05_27
// See scripts/lib/README-whiskey-lathe.md for full engine + test catalog.
//
// Validates threading-cycle-specific defects that generic G-code validators miss:
//   Rule 1: thread depth (P last 4 digits ÷ 1000) ≤ pitch × 0.85 (60° UN: ~0.6134; safety margin to 0.85)
//   Rule 6: G92 deprecated when G76 available on modern controllers
//   Rule 7: G98 (feed/min) active while G76/G92 threading → P0 critical (pitch sync broken)
//
// Rules 2/3/4/5 deferred to follow-up unit (need controller-aware 6-digit P parser
// + pre-thread OD coordination from preceding G71/G72 block).
//
// Contract: see lathe-g76-thread-validator.test.mjs

const THREAD_CONTROLLERS_MODERN = new Set(["fanuc", "haas", "okuma", "mazak", "doosan"]);

function findActiveFeedModeAt(blocks, idx) {
  // Walk backwards; first G98/G99 encountered is the active mode.
  for (let i = idx - 1; i >= 0; i--) {
    if (blocks[i].g === "G98") return "G98";
    if (blocks[i].g === "G99") return "G99";
  }
  return null;  // default-controller-dependent; null means "unknown"
}

// Fallback parser: pull X/Z/P/Q/F/R from the raw text if structured props are absent.
const ARG_RE = /\b([XZPQFR])(-?\d+(?:\.\d+)?)/gi;
function extractArgsFromText(text) {
  if (!text || typeof text !== "string") return {};
  const out = {};
  for (const m of text.matchAll(ARG_RE)) {
    const k = m[1].toLowerCase();
    const v = Number(m[2]);
    if (out[k] === undefined) out[k] = v;
  }
  return out;
}

function blockHasGeom(block) {
  if (block.x !== undefined && block.z !== undefined) return true;
  const parsed = extractArgsFromText(block.text);
  return parsed.x !== undefined && parsed.z !== undefined;
}

function blockArg(block, key) {
  if (block[key] !== undefined) return block[key];
  const parsed = extractArgsFromText(block.text);
  return parsed[key];
}

function pairG76Blocks(blocks) {
  // Fanuc 2-line G76: line1 has P/Q/R cycle params (no X/Z); line2 has X/Z/P/Q/F geometry.
  // Single-line G76 (Haas-style or Mazak EIA): one block with X/Z + thread params — treat as a "pair"
  // with line1=line2 for rule-evaluation purposes.
  const pairs = [];
  let i = 0;
  while (i < blocks.length) {
    const b = blocks[i];
    if (b.g === "G76") {
      const bHasGeom = blockHasGeom(b);
      const next = blocks[i + 1];
      if (next && next.g === "G76" && !bHasGeom && blockHasGeom(next)) {
        // Fanuc 2-line form
        pairs.push({ line1: b, line2: next, head_idx: i });
        i += 2;
        continue;
      }
      if (bHasGeom) {
        // Single-line G76 — use same block for line1 and line2
        pairs.push({ line1: b, line2: b, head_idx: i });
      }
    }
    i++;
  }
  return pairs;
}

function findBareG92Threads(blocks) {
  return blocks.filter(b => b.g === "G92" && blockHasGeom(b));
}

function issueDepthExceedsPitch(threadPair) {
  const depthRaw = blockArg(threadPair.line2, "p");
  const pitchRaw = blockArg(threadPair.line2, "f");
  const depthMm = (depthRaw ?? 0) / 1000;
  const pitch = pitchRaw ?? 0;
  if (pitch <= 0 || depthMm <= 0) return null;  // can't evaluate
  // 60° UN/Metric thread: depth ≈ 0.6134 × pitch. Allow 0.85 × pitch as upper safety bound.
  const safeMaxDepth = pitch * 0.85;
  if (depthMm > safeMaxDepth) {
    return {
      severity: "P0",
      rule: "depth_exceeds_pitch",
      block_index: threadPair.line2.idx,
      actual: { depth_mm: depthMm, pitch_mm: pitch, ratio: depthMm / pitch },
      expected_range: { ratio_max: 0.85 },
      message: `Thread depth ${depthMm}mm exceeds 0.85 × pitch (${pitch}mm). Standard 60° thread depth ≈ 0.6134 × pitch.`,
      suggestion: `Set P (line 2 of G76) to ~${Math.round(pitch * 613)} (depth = ${(pitch * 0.6134).toFixed(3)}mm × 1000).`
    };
  }
  return null;
}

function issueG98FeedModeOnThread(blocks, threadHeadIdx, ctx) {
  const mode = findActiveFeedModeAt(blocks, threadHeadIdx);
  if (mode === "G98") {
    return {
      severity: "P0",
      rule: "feed_mode_G98_on_thread",
      block_index: threadHeadIdx,
      actual: { active_feed_mode: "G98" },
      expected_range: { active_feed_mode: "G99" },
      message: "Threading cycle requires G99 (feed-per-rev) for pitch synchronization. G98 (feed-per-minute) is active and will break thread synchronization.",
      suggestion: `Insert "G99" before this thread block (controller: ${ctx.controller}).`
    };
  }
  return null;
}

function issueG92Deprecated(g92Block, ctx) {
  if (!THREAD_CONTROLLERS_MODERN.has(ctx.controller)) return null;
  return {
    severity: "P1",
    rule: "G92_deprecated_use_G76",
    block_index: g92Block.idx,
    actual: { code: "G92" },
    expected_range: { code: "G76" },
    message: "G92 single-pass threading is deprecated when G76 canned cycle is available. G76 handles multi-pass roughing + finish + chamfer; G92 requires manual pass iteration.",
    suggestion: `Replace G92 with a paired G76 cycle (line 1: cycle params P##0060 Q### R0.003; line 2: X/Z/P/Q/F geometry). Controller ${ctx.controller} supports G76.`
  };
}

export function validateG76Thread(program, ctx) {
  if (!program || !Array.isArray(program.blocks)) {
    return { issues: [], thread_block_count: 0, all_passed: true };
  }
  ctx = ctx || { controller: program.controller || "fanuc", iso_group: null, material_grade: null };

  const issues = [];
  const threadPairs = pairG76Blocks(program.blocks);
  const g92Threads = findBareG92Threads(program.blocks);
  const threadBlockCount = threadPairs.length + g92Threads.length;

  // Rule 1: depth vs pitch on each paired G76
  for (const pair of threadPairs) {
    const issue = issueDepthExceedsPitch(pair);
    if (issue) issues.push(issue);
  }

  // Rule 7: feed-mode on each thread head (G76 line 1 OR bare G92)
  for (const pair of threadPairs) {
    const issue = issueG98FeedModeOnThread(program.blocks, pair.head_idx, ctx);
    if (issue) issues.push(issue);
  }
  for (const g92 of g92Threads) {
    const issue = issueG98FeedModeOnThread(program.blocks, g92.idx, ctx);
    if (issue) issues.push(issue);
  }

  // Rule 6: G92 deprecated
  for (const g92 of g92Threads) {
    const issue = issueG92Deprecated(g92, ctx);
    if (issue) issues.push(issue);
  }

  return {
    issues,
    thread_block_count: threadBlockCount,
    all_passed: issues.length === 0
  };
}
