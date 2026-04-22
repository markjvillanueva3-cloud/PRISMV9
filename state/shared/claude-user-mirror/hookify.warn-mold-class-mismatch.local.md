---
name: warn-mold-class-mismatch
enabled: true
event: PreToolUse
action: warn
conditions:
  tool: ["Edit", "Write"]
  content_match: "class_101|class_102"
  file_match: ".*[Qq]uot.*|.*[Mm]old.*"
message: "HIGH-COST MOLD: Class 101/102 molds cost $50K-$100K+ with 14-20 week lead. Verify volume justifies this tooling investment."
---
