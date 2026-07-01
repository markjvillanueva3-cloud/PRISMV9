# CC-EXT Troubleshooting Guide

## Common Issues by Engine

### MS1: PDF Extraction
| Issue | Cause | Resolution |
|-------|-------|------------|
| Empty extraction | Scanned PDF without OCR | Enable OCR pipeline via `pdf_ingestion.py` |
| Low confidence scores | Ambiguous table layout | Use `table_extractor.py` with manual region hints |
| Missing parameters | Non-standard units | Check unit normalization in `param_parser.py` |

### MS2: Operator Feedback
| Issue | Cause | Resolution |
|-------|-------|------------|
| Consensus not forming | Too few contributors | Need minimum 2 operators for consensus |
| High outlier count | Inconsistent practices | Review outliers in `ConsensusResult.outliers` |
| Low experience scores | New operators | Scores improve as accuracy/consistency data accumulates |

### MS3: Sensor Data
| Issue | Cause | Resolution |
|-------|-------|------------|
| Missing channels | Sensor disconnection | Check `data_quality` field (fraction of available channels) |
| False chatter detection | Resonance in fixture | Adjust frequency threshold in `anomaly_detector.py` |
| High wear rate variance | Different tool batches | Normalize by tool manufacturer in wear curves |

### MS4: Quality Feedback
| Issue | Cause | Resolution |
|-------|-------|------------|
| CMM import failure | Unsupported format | Check `VendorFormat` enum (DMIS, QIF, PC_DMIS, CALYPSO, CSV) |
| IT grade mismatch | Thermal effects | Include `delta_temp` in `CuttingParameterRecord` |
| Surface finish error | BUE not modeled | Verify material hardness in correction factors |

### MS5: Synthesis
| Issue | Cause | Resolution |
|-------|-------|------------|
| Excessive dedup | Similarity threshold too low | Adjust `_compute_similarity` threshold (default 0.8) |
| All conflicts escalated | No physics validator | Provide `PhysicsValidator` to `CrossSourceResolver` |
| Empty recommendations | Wrong material/operation names | Ensure exact string match (case-insensitive) |
| Graph query slow | Too many edges | Filter by `min_confidence` in `recommend()` |

## Error Messages

| Error | Module | Fix |
|-------|--------|-----|
| `KeyError: 'material'` | SensorSourceAdapter | Ensure sensor dict has `material` key |
| `ValueError: not enough values` | ConfidenceScorer | Entry needs at least 1 source |
| `ZeroDivisionError` | cross_source_resolver | Values are both zero — handled by guard |

## Performance Troubleshooting

- **Slow aggregation**: Reduce batch size or increase dedup threshold
- **Memory pressure**: Use incremental aggregation instead of bulk
- **Graph query timeout**: Reduce `max_depth` in `path_query()` (default 3)
