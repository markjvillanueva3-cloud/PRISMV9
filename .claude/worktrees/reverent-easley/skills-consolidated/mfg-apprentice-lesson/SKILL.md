---
name: mfg-apprentice-lesson
description: Access structured manufacturing lessons and training modules
---

# Lesson System

## When To Use
- A trainee needs a structured lesson on a manufacturing topic
- You want to browse available training modules by category
- Building a learning path for a new machinist
- Reviewing lesson content before assigning to a team member

## How To Use
```
prism_intelligence action=apprentice_lesson params={topic: "turning fundamentals", lesson_id: "TURN-101"}
prism_intelligence action=apprentice_lessons params={category: "milling", level: "beginner"}
```

## What It Returns
- `lesson` — structured lesson content with objectives, body, and summary
- `lessons` — list of available lessons filtered by category/level
- `prerequisites` — required knowledge before starting the lesson
- `duration` — estimated completion time in minutes
- `assessment` — optional quiz or checkpoint questions

## Examples
- Get a specific turning lesson: `apprentice_lesson params={lesson_id: "TURN-101"}` — returns full lesson on turning fundamentals with 30-min estimated duration
- List all beginner milling lessons: `apprentice_lessons params={category: "milling", level: "beginner"}` — returns 8 available lessons covering face milling through pocket milling
- Browse advanced threading lessons: `apprentice_lessons params={category: "threading", level: "advanced"}` — returns lessons on single-point threading, thread milling, and multi-start threads
