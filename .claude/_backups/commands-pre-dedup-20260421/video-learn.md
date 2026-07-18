---
effort: high
maxTurns: 25
---

# Video Learn — AI-Powered Video Knowledge Extraction

Extract and learn from machining/manufacturing videos using deep AI. Converts video content into tribal knowledge, procedures, and best practices.

## Usage
- `/video-learn <path>` — Learn from a specific video
- `/video-learn batch` — Process all videos in resources
- `/video-learn youtube <url>` — Learn from YouTube video
- `/video-learn training` — Process training videos
- `/video-learn status` — Show learning pipeline status

## Args: $ARGUMENTS

## AI Engines Used
- **VideoELearningAIEngine** — AI-powered video analysis
- **VideoLearningEngine** — Extract learning content
- **VideoReplayOrchestratorEngine** — Orchestrate video processing
- **AIExtractionReasonerEngine** — Deep reasoning on content
- **TribalKnowledgeAdvisorEngine** — Categorize as tribal tips
- **MachiningPlaybookEngine** — Extract procedural sequences

## Procedure

### 1. Parse Arguments
Determine extraction mode:
- Path → single video extraction
- "batch" → process H:/prism/resources/**/*.mp4
- "youtube <url>" → download and process YouTube video
- "training" → process training video folders
- "status" → show pipeline state

### 2. Video Analysis
For each video:
1. Extract audio transcript (if available)
2. Analyze key frames for machining operations
3. Identify tool changes, setup steps, operations
4. Detect machine type (lathe, mill, EDM, etc.)

### 3. Knowledge Extraction
Use AI engines to extract:
- **Setup Procedures** — How to set up jobs
- **Operation Sequences** — Step-by-step machining
- **Best Practices** — Tips from experienced machinists
- **Troubleshooting** — Problem identification and fixes
- **Speed/Feed Guidance** — Parameter recommendations
- **Tool Selection** — Which tools for which operations

### 4. Categorize & Validate
For each extracted item:
1. Check DuplicationGuardEngine — skip if exists
2. Categorize using TribalKnowledgeAdvisorEngine
3. Add to MachiningPlaybookEngine if procedural
4. Map to relevant engines

### 5. Store Knowledge
Route extracted knowledge:
- Procedures → MachiningPlaybookEngine rules
- Tips → auto-ingested-tips.ts
- Parameters → SpeedFeedOrchestratorEngine patterns
- Troubleshooting → DiagnosticReasoningEngine

### 6. Report
Output:
- Videos processed
- Duration analyzed
- Procedures extracted
- Tips extracted
- Playbook rules added
- Duplicates skipped

## Example Outputs
```
VIDEO LEARN COMPLETE
Videos: 5 processed (2h 34m total)
Procedures: 18 extracted
Tribal Tips: 45 categorized
Playbook Rules: 12 added
Speed/Feed Patterns: 8 learned
Duplicates Skipped: 6
```

## Supported Video Sources
- Local files (MP4, AVI, MOV, MKV)
- YouTube (machining channels)
- Training recordings
- Machine vendor tutorials
- CNC programming demonstrations

## Related Commands
- `/pdf-learn` — PDF knowledge extraction
- `/shop-knowledge` — Tribal knowledge extraction
- `/ingest` — General data ingestion
- `/forge-triple` — Create engines from extracted knowledge
