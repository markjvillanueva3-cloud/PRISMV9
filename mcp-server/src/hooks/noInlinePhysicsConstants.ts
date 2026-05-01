/**
 * Hook re-export of NoInlinePhysicsConstantsEngine — MS0/U-PPGM04.
 *
 * MS0 spec puts this at src/hooks/noInlinePhysicsConstants.ts; the engine
 * implementation lives at src/engines/NoInlinePhysicsConstantsEngine.ts so
 * it can be invoked through camDispatcher in addition to the build hook.
 * This file is a thin re-export so build pipelines can import from the
 * spec'd path without coupling to the engine module name.
 */

export {
  NoInlinePhysicsConstantsEngine,
  noInlinePhysicsConstantsEngine,
  type ScanFinding,
  type ScanResult,
  type ScanOptions,
  type Tier,
  type Verdict,
  type Confidence,
  type ConstantClass,
} from "../engines/NoInlinePhysicsConstantsEngine.js";
