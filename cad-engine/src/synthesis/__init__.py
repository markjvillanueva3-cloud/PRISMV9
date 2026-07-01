# Cross-Source Knowledge Synthesis — CC-EXT-MS5

from .source_aggregator import (
    SourceType,
    EntryCategory,
    SourceProvenance,
    UnifiedEntry,
    UnifiedKnowledgeStore,
    SourceAdapter,
    PDFSourceAdapter,
    FeedbackSourceAdapter,
    SensorSourceAdapter,
    QualitySourceAdapter,
    SourceAggregator,
)
from .confidence_scorer import (
    ConfidenceBreakdown,
    ConfidenceScore,
    ConfidenceScorer,
    PhysicsValidator,
    HIGH_CONFIDENCE,
    LOW_CONFIDENCE,
)
from .cross_source_resolver import (
    ConflictSeverity,
    ResolutionStrategy,
    ConflictEntry,
    ResolutionResult,
    ConflictReport,
    CrossSourceResolver,
)
from .knowledge_graph import (
    NodeType,
    EdgeType,
    GraphNode,
    GraphEdge,
    Recommendation,
    GraphStats,
    KnowledgeGraph,
)
