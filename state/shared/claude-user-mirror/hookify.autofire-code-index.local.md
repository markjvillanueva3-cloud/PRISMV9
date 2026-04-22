---
name: autofire-code-index
type: autofire
description: Suggest /code-index shortcodes when user references long PRISM file paths
trigger_pattern: "src/engines/.*Engine|src/tools/dispatchers/.*Dispatcher|src/algorithms/.*Algorithm|src/__tests__/.*test|mcp-server/src/"
action: suggest
message: "Use `/code-index <shortcode>` for compact file references (1,865 entries). E=Engine, D=Dispatcher, A=Algorithm, T=Test. Example: E0001 = first engine alphabetically."
enabled: true
---
