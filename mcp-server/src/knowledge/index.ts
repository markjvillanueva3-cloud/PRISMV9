/**
 * Knowledge Spine Engines — TK-MS1
 *
 * Tribal knowledge propagation system engines.
 * Temporarily located here due to src/engines/ directory corruption.
 *
 * After running `chkdsk H: /F`, move files to src/engines/ and update imports.
 */

// U-TK05: Applicability scoring
export {
  knowledgeApplicabilityEngine,
  KnowledgeApplicabilityEngine,
  type TribalQueryContext,
  type ScoredTip,
  type ApplicabilityResult,
} from "./KnowledgeApplicabilityEngine.js";

// U-TK06: Conflict resolution
export {
  knowledgeConflictResolverEngine,
  KnowledgeConflictResolverEngine,
  type KnowledgeConflict,
  type ConflictType,
  type ResolutionStrategy,
  type ConflictResolution,
  type ConflictDetectionResult,
} from "./KnowledgeConflictResolverEngine.js";

// U-TK07: Consumer registry
export {
  knowledgeConsumerRegistryEngine,
  KnowledgeConsumerRegistryEngine,
  type KnowledgeConsumer,
  type ConsumerType,
  type ConsumptionEvent,
  type ConsumerAnalytics,
  type PropagationTarget,
} from "./KnowledgeConsumerRegistryEngine.js";

// U-TK08: Feedback ingestion
export {
  knowledgeFeedbackIngestEngine,
  KnowledgeFeedbackIngestEngine,
  type TipFeedback,
  type FeedbackType,
  type FeedbackContext,
  type FeedbackImpact,
  type FeedbackSummary,
  type ReviewQueueItem,
} from "./KnowledgeFeedbackIngestEngine.js";

// U-TK09: Promotion lifecycle
export {
  knowledgePromotionEngine,
  KnowledgePromotionEngine,
  type PromotionStage,
  type PromotionCriteria,
  type PromotionEvaluation,
  type PromotionEvent,
  type DemotionEvent,
} from "./KnowledgePromotionEngine.js";
