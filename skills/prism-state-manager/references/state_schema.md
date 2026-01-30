# CURRENT_STATE.json Schema Reference

## Full Structure

```json
{
  "meta": {
    "lastUpdated": "ISO datetime",
    "lastSessionId": "1.A.1",
    "nextSessionId": "1.A.2"
  },
  "currentWork": {
    "phase": "EXTRACTION|ARCHITECTURE|MIGRATION",
    "stage": 1,
    "focus": "Current task description",
    "status": "NOT_STARTED|IN_PROGRESS|COMPLETE|PAUSED|BLOCKED",
    "nextSteps": ["Step 1", "Step 2"],
    "blockers": ["Blocker description"]
  },
  "extractionProgress": {
    "databases": {
      "total": 62,
      "extracted": 0,
      "categories": {
        "materials": 0,
        "machines": 0,
        "tools": 0,
        "workholding": 0,
        "post": 0,
        "process": 0,
        "business": 0,
        "ai_ml": 0,
        "cad_cam": 0,
        "manufacturer": 0,
        "infrastructure": 0
      }
    },
    "engines": {
      "total": 213,
      "extracted": 0,
      "categories": {
        "cad": 0,
        "cam": 0,
        "physics": 0,
        "ai_ml": 0,
        "optimization": 0,
        "signal": 0,
        "post": 0,
        "collision": 0
      }
    },
    "other": {
      "total": 556,
      "extracted": 0
    }
  },
  "completedSessions": [
    {
      "id": "1.A.1",
      "date": "ISO datetime",
      "status": "COMPLETE",
      "tasksCompleted": 6
    }
  ],
  "architectureDecisions": {
    "pending": [],
    "made": []
  },
  "quickResume": {
    "lastAction": "Description of last action",
    "continueFrom": "What to do next"
  }
}
```

## Status Values

| Status | Meaning |
|--------|---------|
| NOT_STARTED | Session not yet begun |
| IN_PROGRESS | Currently working |
| COMPLETE | Session finished successfully |
| PAUSED | Stopped mid-session, can resume |
| BLOCKED | Cannot proceed, needs resolution |

## Session ID Format

```
STAGE.CATEGORY.NUMBER

Stage 0: Preparation
Stage 1: Extraction (A=DBs, B=Engines, C-J=Other)
Stage 2: Architecture
Stage 3: Migration
```

## Database Categories (62 total)

- materials: 6
- machines: 7 CORE
- tools: 7
- workholding: 10
- post: 7
- process: 6
- business: 4
- ai_ml: 3
- cad_cam: 3
- manufacturer: 3
- infrastructure: 6

## Engine Categories (213 total)

- cad: 25
- cam: 20
- physics: 42
- ai_ml: 74
- optimization: 44
- signal: 14
- post: 25
- collision: 15
