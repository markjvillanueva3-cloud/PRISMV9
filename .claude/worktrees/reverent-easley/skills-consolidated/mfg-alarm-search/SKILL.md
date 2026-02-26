---
name: mfg-alarm-search
description: Search alarms by symptom description or keyword across all controllers using full-text search
---

## When To Use
- User describes a symptom but does not know the alarm code (e.g., "spindle overload during milling")
- Looking for all alarms related to a specific subsystem (spindle, servo, hydraulic, coolant)
- Need to find alarms across multiple controller brands for the same symptom
- Troubleshooting intermittent issues where the alarm code was not recorded
- NOT for decoding a known alarm code (use mfg-alarm-decode)
- NOT for step-by-step fix procedures (use mfg-alarm-fix)

## How To Use
### Search by symptom description
```
prism_data action=alarm_search params={
  query: "spindle overload during milling"
}
```

### Search with controller filter
```
prism_data action=alarm_search params={
  query: "axis following error",
  controller: "siemens",
  severity: "critical"
}
```

## What It Returns
```json
{
  "results": [
    {
      "code": "SP1280",
      "controller": "fanuc",
      "title": "SPINDLE MOTOR OVERLOAD",
      "severity": "critical",
      "relevance_score": 0.96,
      "description": "Spindle motor current exceeded rated value for extended period during cutting operation.",
      "category": "spindle"
    },
    {
      "code": "7531",
      "controller": "siemens",
      "title": "SPINDLE: CURRENT LIMIT ACTIVE",
      "severity": "warning",
      "relevance_score": 0.88,
      "description": "Spindle drive current limiting engaged due to excessive load demand.",
      "category": "spindle"
    },
    {
      "code": "195",
      "controller": "haas",
      "title": "SPINDLE OVERLOAD DETECTED",
      "severity": "critical",
      "relevance_score": 0.85,
      "description": "Spindle load exceeded 150% of rated capacity during machining cycle.",
      "category": "spindle"
    }
  ],
  "total_matches": 23,
  "search_time_ms": 18
}
```

## Examples
### Search for spindle overload alarms
- Input: `prism_data action=alarm_search params={query: "spindle overload during milling"}`
- Output: 23 matching alarms across Fanuc, Siemens, Haas; top result SP1280 Fanuc with 0.96 relevance
- Edge case: Generic terms like "error" return too many results; add context like subsystem name or operation type

### Search for axis-related alarms on Siemens
- Input: `prism_data action=alarm_search params={query: "axis following error", controller: "siemens"}`
- Output: Siemens-only results including 25000, 25010, 25050 series servo alarms
- Edge case: Siemens uses 5-digit codes; searching by partial code is not supported (use alarm_decode instead)
