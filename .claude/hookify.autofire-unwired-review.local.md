---
name: autofire-unwired-review
enabled: true
event: prompt
pattern: (unwired\s+engine|engine.{0,20}not\s+(wired|exported)|which\s+engines?\s+(aren|are\s+not)\s+wired|wire\s+(up\s+)?(an?\s+)?engine|missing\s+dispatcher\s+(for|wiring)|engine\s+triage|unused\s+engine|engines?\s+on\s+disk\s+but|index\.ts\s+(missing|export)|unwired\s+review|63\s+unwired|how\s+many\s+engines\s+(are|aren))
action: warn
---

Use `/unwired-review` for structured engine triage. Scores and ranks the 63+ unwired engines by Domain Need, Completeness, Dispatcher Fit, and Test Existence. Examples: `/unwired-review list` (ranked triage table), `/unwired-review top 5` (wiring stubs for top 5), `/unwired-review domain vibration` (triage vibration engines), `/unwired-review wire TroubleshootingEngine` (full wiring: export + dispatcher + tests + build).
