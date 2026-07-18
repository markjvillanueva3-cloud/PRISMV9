/**
 * magazine-tword-lookahead.mjs — T-word emit-position optimizer for
 * tool magazines with pre-fetch capability (chain / umbrella / twin-arm).
 *
 * Problem: a CNC mill program emitting M06 (tool change) blocks the
 * spindle while the magazine rotates the requested tool into position.
 * On machines with pre-fetch ATCs (most chain/umbrella, all twin-arm),
 * the controller will start rotating the NEXT tool the moment a T-word
 * is seen — so emitting `Tnext` at the END of the current op (instead
 * of at the START of the next op) lets the magazine rotate CONCURRENTLY
 * with the current cut, saving (rotationTime ∩ currentOpDuration) seconds.
 *
 * Physics:
 *   For an N-slot circular magazine, the rotation distance from slot a
 *   to slot b is the shortest arc: min(|a-b|, N - |a-b|). Rotation time
 *   = circDist × rotationTimePerSlotSec.
 *
 *   Look-ahead savings (per op) = min(rotationTimeNext, currentOpDurationSec)
 *   — capped because you can't save more than the cut itself takes.
 *
 * Look-ahead decision matrix:
 *   chain / umbrella → YES (sequential rotation; pre-fetch always helps)
 *   twin-arm         → YES (twin-arm pre-rotates the standby pocket)
 *   random-access    → NO  (constant access time, no rotation to overlap)
 *   same tool        → NO  (no swap → no T-word needed)
 *
 * Echo-soul compliance: this is post-processor emit-ordering ONLY.
 * Collision check, tool assignment, op sequencing are upstream. No
 * inline physics constants; magazine rotation times come from the
 * caller (machine profile).
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-MAGAZINE-TSP-T-WORD-ORDER
 * @slot echo · @date 2026-05-27
 */

export const MAGAZINE_TWORD_SCHEMA_VERSION = 1;

/** Typical CAT-40 chain magazine rotation time per slot (sec). */
export const DEFAULT_ROTATION_TIME_PER_SLOT_SEC = 0.5;

/** Typical twin-arm bidirectional swap time (sec). */
export const DEFAULT_TWIN_ARM_SWAP_TIME_SEC = 2.0;

export const SUPPORTED_MAGAZINE_TYPES = ["chain", "umbrella", "twin-arm", "random-access"];

export const SUPPORTED_DIALECTS = ["fanuc", "haas", "heidenhain", "mitsubishi", "siemens"];

/**
 * Pure: shortest circular distance between two slots on N-slot magazine.
 * Returns null on invalid input.
 */
export function circularDistance(fromSlot, toSlot, magazineSize) {
  if (!Number.isFinite(fromSlot) || !Number.isFinite(toSlot) || !Number.isFinite(magazineSize)) return null;
  if (magazineSize <= 0) return null;
  if (fromSlot < 1 || fromSlot > magazineSize) return null;
  if (toSlot < 1 || toSlot > magazineSize) return null;
  const linearDist = Math.abs(fromSlot - toSlot);
  return Math.min(linearDist, magazineSize - linearDist);
}

/**
 * Pure: rotation time in seconds for a given slot distance.
 * Returns null on invalid input.
 */
export function estimateRotationTimeSec(circDist, rotPerSlotSec) {
  if (!Number.isFinite(circDist) || !Number.isFinite(rotPerSlotSec)) return null;
  if (circDist < 0 || rotPerSlotSec < 0) return null;
  return circDist * rotPerSlotSec;
}

/**
 * Pure: should we emit T<next> at end of current op (look-ahead)?
 * Returns { decision: boolean, reason: string } | null on invalid input.
 */
export function decideLookAheadPosition({ currentTool, nextTool, magazineType }) {
  if (currentTool == null || nextTool == null) return null;
  if (!SUPPORTED_MAGAZINE_TYPES.includes(magazineType)) return null;
  if (currentTool === nextTool) {
    return { decision: false, reason: "same-tool-no-swap" };
  }
  if (magazineType === "random-access") {
    return { decision: false, reason: "random-access-constant-time-no-rotation-benefit" };
  }
  // chain, umbrella, twin-arm all benefit from pre-fetch:
  return { decision: true, reason: `${magazineType}-prefetch-overlaps-cut` };
}

/**
 * Pure: build full tool-change plan with look-ahead decisions per op.
 *
 * @param {Object} req
 * @param {Array} req.operations — [{ id, tool, durationSec }]
 * @param {Object} req.slotAssignments — { toolName: slotNumber, ... }
 * @param {string} req.magazineType — one of SUPPORTED_MAGAZINE_TYPES
 * @param {number} req.magazineSize — total slots
 * @param {number} [req.rotationTimePerSlotSec] — default DEFAULT_ROTATION_TIME_PER_SLOT_SEC
 * @param {number} [req.twinArmSwapTimeSec] — default DEFAULT_TWIN_ARM_SWAP_TIME_SEC
 * @returns {Object|null} { ops, summary }
 */
export function buildToolChangePlan(req) {
  if (!req || typeof req !== "object") return null;
  const { operations, slotAssignments, magazineType, magazineSize } = req;
  if (!Array.isArray(operations) || operations.length === 0) return null;
  if (!slotAssignments || typeof slotAssignments !== "object") return null;
  if (!SUPPORTED_MAGAZINE_TYPES.includes(magazineType)) return null;
  if (!Number.isFinite(magazineSize) || magazineSize <= 0) return null;
  const rotPerSlotSec = Number.isFinite(req.rotationTimePerSlotSec) && req.rotationTimePerSlotSec >= 0
    ? req.rotationTimePerSlotSec
    : DEFAULT_ROTATION_TIME_PER_SLOT_SEC;
  const ops = [];
  let totalSavedSec = 0;
  let lookAheadCount = 0;
  let inlineEmitCount = 0;
  for (let i = 0; i < operations.length; i++) {
    const op = operations[i];
    if (!op || typeof op !== "object" || op.tool == null) {
      ops.push({ ...op, error: "missing-tool", lookAhead: null, savedSec: 0 });
      continue;
    }
    const currentTool = op.tool;
    const currentSlot = slotAssignments[currentTool];
    if (currentSlot == null) {
      ops.push({ ...op, error: "tool-not-in-magazine", lookAhead: null, savedSec: 0 });
      continue;
    }
    const nextOp = operations[i + 1];
    if (!nextOp) {
      // Last op — no look-ahead opportunity. Still emits an inline swap:
      inlineEmitCount++;
      ops.push({
        ...op,
        currentSlot,
        nextTool: null,
        nextSlot: null,
        circDist: null,
        rotationTimeSec: 0,
        lookAhead: { decision: false, reason: "last-op-no-next" },
        savedSec: 0,
      });
      continue;
    }
    const nextTool = nextOp.tool;
    const nextSlot = slotAssignments[nextTool];
    if (nextSlot == null) {
      ops.push({
        ...op,
        currentSlot,
        nextTool,
        nextSlot: null,
        error: "next-tool-not-in-magazine",
        lookAhead: null,
        savedSec: 0,
      });
      continue;
    }
    const circDist = circularDistance(currentSlot, nextSlot, magazineSize);
    const rotTimeSec = estimateRotationTimeSec(circDist, rotPerSlotSec);
    const decision = decideLookAheadPosition({ currentTool, nextTool, magazineType });
    const opDur = Number.isFinite(op.durationSec) && op.durationSec >= 0 ? op.durationSec : 0;
    const savedSec = decision.decision ? Math.min(rotTimeSec, opDur) : 0;
    if (decision.decision) lookAheadCount++; else inlineEmitCount++;
    totalSavedSec += savedSec;
    ops.push({
      ...op,
      currentSlot,
      nextTool,
      nextSlot,
      circDist,
      rotationTimeSec: rotTimeSec,
      lookAhead: decision,
      savedSec,
    });
  }
  return {
    ops,
    summary: {
      magazineType,
      magazineSize,
      rotationTimePerSlotSec: rotPerSlotSec,
      operationCount: operations.length,
      lookAheadEmitCount: lookAheadCount,
      inlineEmitCount,
      totalSavedSec,
      schemaVersion: MAGAZINE_TWORD_SCHEMA_VERSION,
    },
  };
}

/**
 * Pure: emit dialect-aware T-word block sequence for the planned ops.
 *
 * Dialect patterns:
 *   fanuc/haas/mitsubishi:
 *     N{seq} (op {id})
 *     [N{seq+10} T{nextTool}    — if look-ahead]
 *     N{seq+20} M06              — if first op or different tool from prev
 *   heidenhain:
 *     ; op {id}
 *     TOOL CALL {currentTool}   — if first op or different tool from prev
 *     [TOOL DEF {nextTool}      — if look-ahead]
 *   siemens:
 *     ; op {id}
 *     T={currentTool}; M6        — if first op or different tool from prev
 *     [T={nextTool}              — if look-ahead]
 *
 * Returns string[] | null.
 */
export function emitTWordSequence({ plan, dialect, startSeq }) {
  if (!plan || !Array.isArray(plan.ops)) return null;
  if (!SUPPORTED_DIALECTS.includes(dialect)) return null;
  const seqStart = Number.isFinite(startSeq) && startSeq > 0 ? startSeq : 100;
  const lines = [];
  let seq = seqStart;
  let prevTool = null;
  for (const op of plan.ops) {
    if (op.error) {
      lines.push(`( ERROR: op ${op.id} ${op.error} )`);
      continue;
    }
    const swapNeeded = prevTool !== op.tool;
    switch (dialect) {
      case "fanuc":
      case "haas":
      case "mitsubishi":
        lines.push(`N${seq} ( op ${op.id} tool T${op.tool} slot ${op.currentSlot} )`);
        seq += 10;
        if (swapNeeded) {
          lines.push(`N${seq} T${op.tool} M06`);
          seq += 10;
        }
        if (op.lookAhead && op.lookAhead.decision) {
          lines.push(`N${seq} T${op.nextTool} ( LOOK-AHEAD slot ${op.nextSlot} circDist=${op.circDist} saves ${op.savedSec.toFixed(2)}s )`);
          seq += 10;
        }
        break;
      case "heidenhain":
        lines.push(`; op ${op.id} tool T${op.tool} slot ${op.currentSlot}`);
        if (swapNeeded) {
          lines.push(`TOOL CALL ${op.tool} Z`);
        }
        if (op.lookAhead && op.lookAhead.decision) {
          lines.push(`TOOL DEF ${op.nextTool} ; LOOK-AHEAD slot ${op.nextSlot} circDist=${op.circDist} saves ${op.savedSec.toFixed(2)}s`);
        }
        break;
      case "siemens":
        lines.push(`; op ${op.id} tool T${op.tool} slot ${op.currentSlot}`);
        if (swapNeeded) {
          lines.push(`T=${op.tool}; M6`);
        }
        if (op.lookAhead && op.lookAhead.decision) {
          lines.push(`T=${op.nextTool} ; LOOK-AHEAD slot ${op.nextSlot} circDist=${op.circDist} saves ${op.savedSec.toFixed(2)}s`);
        }
        break;
    }
    prevTool = op.tool;
  }
  return lines;
}

/**
 * Pure: end-to-end orchestrator — plan + emit.
 */
export function magazineTWordOrder(req) {
  if (!req || typeof req !== "object") return null;
  const plan = buildToolChangePlan(req);
  if (!plan) return null;
  const lines = emitTWordSequence({
    plan,
    dialect: req.dialect,
    startSeq: req.startSeq,
  });
  if (lines == null) return null;
  return { plan, lines };
}
