# hookify:warn — Machine Parameter Exceeded

## trigger
PostToolUse — tool: Bash, Edit, Write

## detect
Output contains `EXCEEDED` together with machine validation context (RPM, feed rate, power, torque exceeding machine limits)

## pattern
`/EXCEEDED.*(?:RPM|Feed|Power|Torque|Tool|Travel)/i`

## message
⚠️ MACHINE LIMIT EXCEEDED — The planned cutting parameters exceed this machine's rated capacity. Running above limits risks spindle damage, tool breakage, or poor surface finish. Consider: reduce RPM/feed, select a different machine, or verify the machine profile is correct.
