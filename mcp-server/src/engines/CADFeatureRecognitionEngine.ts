/**
 * CADFeatureRecognitionEngine — stub (U-EFF25).
 *
 * routes/milling.ts wraps its import in try/catch with a fallback that
 * returns an empty-features object, so the stub just needs to satisfy
 * TS2307 with an extractFeatures method.
 */
class CADFeatureRecognitionEngine {
  extractFeatures(geometry: unknown): { features: unknown[]; confidence: number } {
    return { features: [], confidence: 0.5 };
  }
}

export const cadFeatureRecognitionEngine = new CADFeatureRecognitionEngine();
