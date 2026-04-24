/**
 * MillPrintToProgramEngine — stub (U-EFF25).
 *
 * millDispatcher "program" bucket. Real print-to-program engine never
 * existed on any branch; stub satisfies TS2307 until a real one is wired.
 */
class MillPrintToProgramEngine {
  generate(input: Record<string, unknown>): Record<string, unknown> {
    return { ok: false, stub: true, input };
  }
}

export const millPrintToProgramEngine = new MillPrintToProgramEngine();
