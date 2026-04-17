# hookify:warn — Metric/Imperial Unit Mismatch

## trigger
PostToolUse — tool: Bash, Edit, Write

## detect
Output contains mixed unit systems in machining parameters (e.g., SFM with mm depth, or m/min with inch diameter)

## pattern
`/(?:SFM|IPM|IPR).*(?:mm(?:\/|_|\s)|µm)|(?:m\/min|mm\/rev|mm\/min).*(?:inch|in\/|SFM)/i`

## message
⚠️ UNIT MISMATCH — Mixed metric and imperial units detected in machining parameters. This can cause order-of-magnitude errors in cutting forces and tool life. Use `/unit-convert toggle` to convert all parameters to a consistent unit system.
