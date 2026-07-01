/**
 * visionDiagnosticSingleton — module-scope wiring of MachiningVisionDiagnosticEngine
 * with default NotWiredVisionAdapter (fail-LOUD per R12 until production CV wired).
 */

import {
  MachiningVisionDiagnosticEngine,
  NotWiredVisionAdapter,
  type VisionAdapter,
} from "./MachiningVisionDiagnosticEngine.js";

let _engine: MachiningVisionDiagnosticEngine | null = null;
let _adapter: VisionAdapter = new NotWiredVisionAdapter();

export function setVisionAdapter(adapter: VisionAdapter): void {
  _adapter = adapter;
  _engine = null;
}
export function getVisionDiagnosticEngine(): MachiningVisionDiagnosticEngine {
  if (_engine) return _engine;
  _engine = new MachiningVisionDiagnosticEngine(_adapter);
  return _engine;
}
export function _resetForTests(): void {
  _engine = null;
  _adapter = new NotWiredVisionAdapter();
}
