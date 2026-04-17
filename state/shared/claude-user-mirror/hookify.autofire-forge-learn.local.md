---
name: autofire-forge-learn
enabled: true
event: userpromptsubmit
pattern: "continuous.*(learn|improv)|learn.*forge|forge.*learn|learning.*pipeline|auto.*(learn|improve)|video.*forge|pdf.*forge|learn.*engine.*wire|knowledge.*forge|close.*loop.*learn|feedback.*loop"
action: "suggest forge-learn"
---
Route continuous learning and knowledge-to-component pipeline requests to /forge-learn.
Triggers on: continuous learning, learning pipeline, auto-learn, video+forge, pdf+forge, knowledge forge, close the loop, feedback loop.
