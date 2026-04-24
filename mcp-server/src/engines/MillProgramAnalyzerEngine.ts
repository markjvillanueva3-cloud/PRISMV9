/**
 * MillProgramAnalyzerEngine — stub (U-EFF25).
 *
 * millDispatcher "validate" bucket. Real analyzer never existed on any
 * branch; stub satisfies TS2307 until a real static-analysis engine lands.
 */
class MillProgramAnalyzerEngine {
  analyze(program: string): Record<string, unknown> {
    return { ok: false, stub: true, bytes: program.length };
  }
}

export const millProgramAnalyzerEngine = new MillProgramAnalyzerEngine();
