---
name: autofire-web-ui-todo
type: autofire
description: Point to WEB_UI_TODO.md when user asks about web app, frontend, UI, dashboard, or viewer work
trigger_pattern: "web app|web ui|frontend|dashboard|viewer|three.js|react.*page|web.*todo|ui.*todo"
action: suggest
message: "Web UI work is tracked in `data/docs/WEB_UI_TODO.md` — read it first. Existing Three.js viewer components are in `web/src/components/viewer/`. 42 pages exist as stubs in `web/src/pages/`."
enabled: true
---
