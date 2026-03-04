# CC-EXT Integration Guide — Adding New Knowledge Sources

## Overview

The CC-EXT synthesis pipeline supports adding new knowledge sources through the `SourceAdapter` pattern. Each source type normalizes its data into `UnifiedEntry` objects that flow through confidence scoring, conflict resolution, and the knowledge graph.

## Steps to Add a New Source

### 1. Define a SourceType

Add a new enum value in `source_aggregator.py`:

```python
class SourceType(Enum):
    PDF_EXTRACTION = "pdf_extraction"
    OPERATOR_FEEDBACK = "operator_feedback"
    SENSOR_LEARNING = "sensor_learning"
    QUALITY_FEEDBACK = "quality_feedback"
    NEW_SOURCE = "new_source"  # Add here
```

### 2. Implement a SourceAdapter

Create a class extending `SourceAdapter`:

```python
class NewSourceAdapter(SourceAdapter):
    source_type = SourceType.NEW_SOURCE

    def extract_entries(self, data: Any) -> list[UnifiedEntry]:
        entries = []
        prov = SourceProvenance(
            source_type=self.source_type,
            source_id=data.get("id", ""),
            original_confidence=data.get("confidence", 0.5),
        )
        # Convert source-specific data to UnifiedEntry
        entry = UnifiedEntry(
            category=EntryCategory.CUTTING_PARAMETER,
            material=data.get("material", ""),
            operation=data.get("operation", ""),
            parameter_name=data.get("param", ""),
            value=float(data.get("value", 0)),
            sources=[prov],
            confidence=data.get("confidence", 0.5),
        )
        entries.append(entry)
        return entries
```

### 3. Register the Adapter

In `SourceAggregator.__init__()`:

```python
self._adapters[SourceType.NEW_SOURCE] = NewSourceAdapter()
```

### 4. Set Authority Score

In `confidence_scorer.py`, add the source authority:

```python
_SOURCE_AUTHORITY: dict[SourceType, float] = {
    ...
    SourceType.NEW_SOURCE: 0.75,  # Adjust based on trustworthiness
}
```

### 5. Write Tests

Create `test_new_source_adapter.py` with:
- Adapter extracts entries correctly
- Provenance is preserved
- Integration with aggregator works
- Confidence scoring includes new source type

### 6. Update Documentation

- Add source description to `architecture.md`
- Update this guide if adapter pattern changes

## Key Design Constraints

- **Join key**: All sources join on `(material, operation)`. Tool joins are looser.
- **Confidence**: Must be `float` in `[0.0, 1.0]`.
- **Dedup**: Entries with matching `match_key()` and value similarity >= 0.8 are merged.
- **Provenance**: Every entry must have at least one `SourceProvenance`.
- **Incremental**: `aggregate()` accepts an existing `store` for incremental merge.
