/**
 * Post-processor export safety fence (LAUNCH-FE, 2026-06-23, slot:quebec).
 *
 * The PostProcessorGeneratorPage can produce a program three ways:
 *   1. /ppg/pipeline  -> the real 38-stage PostProcessorPipelineEngine (P1 physics +
 *      P5 alarm/safety gate). This is the ONLY machine-ready, safety-validated output.
 *   2. /ppg/template  -> a controller-format TEMPLATE. No physics, no P5 safety gate.
 *   3. offline local fallback (buildLocalGeneratedOutput) -> a canned brief when the
 *      backend is unreachable. No physics, no safety gate.
 *
 * Paths 2 and 3 are STARTING POINTS, not validated programs -- but the download wrote
 * them as `<name>_PRISM_optimized.nc`, which an operator could trust as physics-optimized
 * + safety-gated and run on a machine. That is a P0 safety hazard. These pure helpers
 * stamp any non-pipeline-validated export with a loud PREVIEW-ONLY header and an honest
 * filename so it can never masquerade as a validated program (R12 fail-loud). Pure +
 * unit-tested so the safety decision is verifiable in isolation (R9).
 */

/**
 * Loud header prepended to any exported/copied program that did NOT pass the
 * 38-stage pipeline. Comment-only G-code (parenthesized) so it is inert if pasted
 * into a controller, yet impossible to miss.
 */
export const PREVIEW_ONLY_HEADER: string = [
  '( ============================================================ )',
  '( PREVIEW ONLY -- NOT MACHINE READY )',
  '( Kienzle physics + safety pipeline (P1 force / P5 alarm gate) did NOT run. )',
  '( This packet is a controller-format STARTING POINT, not a validated program. )',
  '( DO NOT RUN ON A MACHINE without a full prove-out + post safety validation. )',
  '( ============================================================ )',
  '',
  '',
].join('\n');

/**
 * Prepend the PREVIEW-ONLY header iff the program was not pipeline-validated.
 * A validated program is returned byte-identical.
 *
 * @param output - the program text (G-code preview)
 * @param pipelineValidated - true only when the 38-stage pipeline produced this output
 * @returns the program, header-stamped when not validated
 */
export function decorateExport(output: string, pipelineValidated: boolean): string {
  if (pipelineValidated) return output;
  return PREVIEW_ONLY_HEADER + output;
}

/**
 * Filename suffix for a downloaded program. Only a pipeline-validated program earns
 * the "_PRISM_optimized.nc" name; everything else is explicitly marked unvalidated so
 * the file on disk cannot be mistaken for a machine-ready program.
 *
 * @param pipelineValidated - true only when the 38-stage pipeline produced this output
 * @returns the filename suffix (including the .nc extension)
 */
export function exportFileSuffix(pipelineValidated: boolean): string {
  return pipelineValidated ? '_PRISM_optimized.nc' : '_PREVIEW_unvalidated.nc';
}
