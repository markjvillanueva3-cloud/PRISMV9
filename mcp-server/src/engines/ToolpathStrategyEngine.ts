// WIRE-EXEMPT: U-EFF25 stub — real engine never existed; millDispatcher pulls it lazily via dynamic import
/**
 * ToolpathStrategyEngine — stub (U-EFF25).
 *
 * millDispatcher pulls this as the "toolpath" bucket. Real ToolpathStrategyEngine
 * doesn't exist on any branch; PRISM already has CAMStrategyEngine and 20+
 * specialized toolpath engines. This stub satisfies TS2307 until a future
 * unit either renames call sites or wires a real meta-strategy engine.
 */
class ToolpathStrategyEngine {
  select(input: Record<string, unknown>): Record<string, unknown> {
    return { ok: false, stub: true, strategy: "fallback", input };
  }
}

export const toolpathStrategyEngine = new ToolpathStrategyEngine();
