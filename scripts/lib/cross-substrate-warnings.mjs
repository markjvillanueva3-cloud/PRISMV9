/**
 * cross-substrate-warnings.mjs -- SYSTEM-VIZ-HYGIENE / U-SVH-XSUB-R12 (slot:sierra)
 *
 * Pure degradation-warning aggregator for the cross-substrate edge generator
 * (generate-cross-substrate-edges.mjs). The generator can produce a structurally
 * valid augmentation while SILENTLY dropping a whole edge type -- most importantly
 * `embeds`, which emits 0 edges when the node-card offset oracle (a gitignored
 * local build input) is absent. A regen can then stamp GREEN (pending=0, sidecarOk)
 * while the AI-substrate footprint edges are missing, with the only signal being a
 * console line buried in regen output.
 *
 * This collects those silent degradations into ONE structured `warnings` array on
 * the generator output so any consumer / health check (the sierra graph-health
 * header, a regen success gate) reads a single field instead of parsing nested
 * stats. It NEVER hard-fails the regen (embeds is optional; the oracle is built by
 * a separate step) -- it makes "looks fine but isn't" visible (sierra soul:
 * report degradation as evidence, never "looks fine"; R12 fail-loud).
 *
 * Pure + deterministic + total (returns [] on garbage input, never throws) so it is
 * unit-testable without running the heavy generator.
 */

/**
 * @param {object} stats - the generator's `out.stats` object (embed/embedsEdges/...).
 * @returns {string[]} degradation warnings (empty when the run is clean).
 */
export function buildDegradationWarnings(stats) {
  const warnings = [];
  if (!stats || typeof stats !== "object") return warnings;

  const embed = stats.embed && typeof stats.embed === "object" ? stats.embed : {};

  // 1. The embeds pass could not run AT ALL: the offset oracle is absent, so every
  //    `from` endpoint is unconfirmable -> 0 embeds edges. This is the silent-GREEN
  //    case the success stamp does not otherwise reflect.
  if (!embed.oracleLoaded) {
    warnings.push(
      "embeds: node-card offset oracle ABSENT -> 0 embeds edges emitted (build via scripts/build-card-offset-index.mjs)",
    );
    return warnings; // the per-source / collapse checks below are moot without the oracle
  }

  // 2. Oracle present, but a specific embedding-source jsonl is absent -> that pool
  //    contributes 0 edges (partial degradation).
  const sources = embed.sources && typeof embed.sources === "object" ? embed.sources : {};
  for (const [roostId, s] of Object.entries(sources)) {
    if (s && s.present === false) {
      warnings.push(`embeds: source for ${roostId} absent -> contributes 0 edges`);
    }
  }

  // 3. Oracle + sources present, yet 0 embeds edges confirmed -> the embeds type
  //    COLLAPSED (no embedded node matched the merged graph -- a stale oracle vs a
  //    fresh embedding pool, or vice versa).
  const embedsEdges = Number(stats.embedsEdges);
  if (Number.isFinite(embedsEdges) && embedsEdges === 0) {
    warnings.push(
      "embeds: oracle loaded + at least one source present but 0 edges confirmed -> embeds type collapsed (oracle/embedding-pool mismatch)",
    );
  }

  return warnings;
}

export default buildDegradationWarnings;
