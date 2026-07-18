// Shop tool-library bridge — implements U-LATHE-SHOP-TOOL-LIBRARY-BRIDGE
// Design memo: reference_shop_tool_library_bridge_design_2026_05_27
// Session-final state: reference_whiskey_session_final_iter167_2026_05_27
// See scripts/lib/README-whiskey-lathe.md for full engine + test catalog.
//
// Resolves (customer, jobId, T-number, controller, machineModel) → ShopToolEntry
// via 3-layer fallback chain. R12 fail-loud at the final no-match leaf.
// Mazak T010101 6-digit format auto-normalized to Fanuc T0101 (iter151).

const REQUIRED_INPUT = ["customer", "toolNumber"];

// Returns candidate keys in resolution-priority order:
// for "T010101" (Mazak 6-digit) → ["T010101", "T0101", "T01"]
// for "T0101" (Fanuc 4-digit) → ["T0101", "T01"]
// for "T01" → ["T01"]
function normalizeToolNumberCandidates(t) {
  if (typeof t !== "string") return [];
  const upper = t.toUpperCase().trim();
  const candidates = [upper];
  // Fanuc T0101 → also try T01 (tool only, ignore offset digits)
  const m = upper.match(/^T(\d{2,6})$/);
  if (m) {
    const digits = m[1];
    if (digits.length === 6) {
      candidates.push(`T${digits.slice(0, 4)}`);  // Mazak T010101 → T0101
      candidates.push(`T${digits.slice(0, 2)}`);  // Mazak T010101 → T01
    } else if (digits.length === 4) {
      candidates.push(`T${digits.slice(0, 2)}`);  // Fanuc T0101 → T01
    }
  }
  return [...new Set(candidates)];
}


function entryWith(meta, layerNum, confidence, warnings) {
  return {
    ...meta,
    sourceLayer: layerNum,
    confidence,
    warnings: warnings && warnings.length ? warnings : undefined
  };
}

function tryLayer1(layer1, customer, jobId, candidates) {
  if (!layer1 || !layer1[customer]) return null;
  const custTable = layer1[customer];
  for (const tn of candidates) {
    // Exact (customer, jobId, T-num) match → confidence 0.95
    if (jobId && custTable[jobId] && custTable[jobId][tn]) {
      return entryWith(custTable[jobId][tn], 1, 0.95, null);
    }
  }
  for (const tn of candidates) {
    // Customer-level fallback under "*" → confidence 0.75, warning
    if (custTable["*"] && custTable["*"][tn]) {
      const warnings = ["customer-only match — job-specific override possible; verify with operator"];
      if (tn !== candidates[0]) warnings.push(`T-format normalized: '${candidates[0]}' → '${tn}'`);
      return entryWith(custTable["*"][tn], 1, 0.75, warnings);
    }
  }
  return null;
}

function tryLayer3(machineDefaults, machineModel, candidates) {
  if (!machineDefaults || !machineModel) return null;
  const modelTable = machineDefaults[machineModel];
  if (!modelTable) return null;
  for (const tn of candidates) {
    if (modelTable[tn]) {
      return entryWith(
        modelTable[tn],
        3,
        0.45,
        ["machine-model heuristic match — low-confidence default; operator confirmation recommended"]
      );
    }
  }
  return null;
}

function shapedDefaults(entry) {
  // Ensure ShopToolEntry shape: missing fields default to null/[].
  return {
    insertAnsi: entry.insertAnsi ?? null,
    geometry: entry.geometry ?? null,
    noseRadiusMm: entry.noseRadiusMm ?? null,
    vendor: entry.vendor ?? "unknown",
    grade: entry.grade ?? null,
    coating: entry.coating ?? null,
    lifeMinutesAtTargetVc: entry.lifeMinutesAtTargetVc ?? null,
    suggestedVcSfm: entry.suggestedVcSfm ?? [],
    suggestedFzIpr: entry.suggestedFzIpr ?? [],
    isoGroupFit: entry.isoGroupFit ?? [],
    substitutionOptions: entry.substitutionOptions ?? [],
    sourceLayer: entry.sourceLayer,
    confidence: entry.confidence,
    warnings: entry.warnings
  };
}

export function createBridge({ layer1, layer2, machineDefaults } = {}) {
  // layer2 is reserved for future canonical-grade-table fallback; not yet active in Layer 3 path.
  // Suppress unused-param lint by referencing it in the closure tag:
  const _hasLayer2 = !!layer2;

  function resolve(input) {
    if (!input || typeof input !== "object") {
      throw new Error("resolve: input must be an object with customer + toolNumber");
    }
    for (const key of REQUIRED_INPUT) {
      if (input[key] === undefined || input[key] === null || input[key] === "") {
        throw new Error(`resolve: missing required field '${key}'`);
      }
    }

    const customer = input.customer;
    const jobId = input.jobId ?? null;
    const candidates = normalizeToolNumberCandidates(input.toolNumber);
    const toolNumber = candidates[0] ?? null;
    const controller = input.controller ?? null;
    const machineModel = input.machineModel ?? null;

    // Layer 1: customer/job exact OR customer-only fallback
    const layer1Hit = tryLayer1(layer1, customer, jobId, candidates);
    if (layer1Hit) return shapedDefaults(layer1Hit);

    // Layer 3: machine-model heuristic
    const layer3Hit = tryLayer3(machineDefaults, machineModel, candidates);
    if (layer3Hit) return shapedDefaults(layer3Hit);

    // R12 fail-loud — no match in any layer
    throw new Error(
      `resolve: no match in any layer for (customer=${customer}, jobId=${jobId}, ` +
      `T=${toolNumber}, controller=${controller}, machine=${machineModel}). ` +
      `operator must populate tool-list for this job/T-number.` +
      (_hasLayer2 ? " (layer2 canonical fallback not yet active)" : "")
    );
  }

  return { resolve };
}
