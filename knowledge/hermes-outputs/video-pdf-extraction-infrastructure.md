# Video & PDF Knowledge Extraction Infrastructure

**Goal:** Convert unwatched videos and PDFs into structured wiki + tribal knowledge for all galaxies.

## Components Needed
1. Video transcription + timestamped summarization (using local models)
2. PDF text + diagram extraction (marker-pdf + layout analysis)
3. Domain-specific entity extraction (formulas, parameters, edge cases)
4. Automated wiki entry generation with provenance

## Priority Sources (from VIDEO_WATCHLIST.md and staging)
- DMG MORI high-speed machining videos
- Post-processor dialect training videos
- CAD feature recognition tutorials
- JM Die internal process videos

## Output Format
Every extracted item must include:
- Source (file + timestamp)
- Galaxy
- Structured fields (formula, parameter, edge case, tribal tip)
- Confidence score

## Status
Infrastructure plan created. Ready for implementation by INDIA or TANGO galaxies.