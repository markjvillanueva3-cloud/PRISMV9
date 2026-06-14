/**
 * MillPrintToProgramEngine — thin delegator to the real MillingPrintToProgramEngine.
 *
 * STUB-RESCUE (slot:bravo 2026-05-27, U-STUB-HUNT-09, mill-galaxy). Original was
 * tagged "U-EFF25 stub — SUPERSEDED" because millDispatcher had been rewired to
 * MillingPrintToProgramEngine but MillMasterOrchestratorFacadeEngine still
 * imported this shim and got `{ok:false, stub:true}` back. Per
 * feedback_never_delete_only_disable we cannot remove the file, but we CAN
 * replace the stub body with a delegator so the facade gets a real
 * MillingProgramResult from the canonical engine. Zero new physics, zero new
 * pipeline logic — pure adapter that forwards generate() → runFullPipeline().
 *
 * @version 2.0.0 — restored from stub via delegation
 */
import { millingPrintToProgramEngine, type MillingInput, type MillingProgramResult } from "./MillingPrintToProgramEngine.js";

export class MillPrintToProgramEngine {
  /**
   * Delegate to the real pipeline. Accepts either a typed MillingInput or a
   * dictionary that conforms to it (the facade passes a generic Record).
   */
  generate(input: MillingInput | Record<string, unknown>): MillingProgramResult {
    return millingPrintToProgramEngine.runFullPipeline(input as MillingInput);
  }
}

export const millPrintToProgramEngine = new MillPrintToProgramEngine();
