---
name: warn-machine-exceeded
enabled: true
event: all
pattern: "EXCEEDED.*(?:RPM|Feed|Power|Torque|Tool|Travel)"
action: warn
---
[!] MACHINE LIMIT EXCEEDED - The planned cutting parameters exceed this machine's rated capacity. Running above limits risks spindle damage, tool breakage, or poor surface finish. Consider: reduce RPM/feed, select a different machine, or verify the machine profile is correct.
