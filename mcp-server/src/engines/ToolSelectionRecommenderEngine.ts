/**
 * ToolSelectionRecommenderEngine — stub (U-EFF25).
 *
 * millDispatcher "toolsel" bucket. Real recommender doesn't exist on any
 * branch; PRISM has ToolSelectionEngine elsewhere. Stub keeps dispatcher
 * actions typable until the call sites are unified.
 */
class ToolSelectionRecommenderEngine {
  recommend(input: Record<string, unknown>): Record<string, unknown> {
    return { ok: false, stub: true, input };
  }
}

export const toolSelectionRecommenderEngine = new ToolSelectionRecommenderEngine();
