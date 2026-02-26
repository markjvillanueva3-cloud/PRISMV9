---
name: mfg-mobile-voice
description: Process voice commands for hands-free shop floor operation
---

# Voice Command Interface

## When To Use
- Operating PRISM hands-free while working at the machine
- Issuing commands when hands are occupied with tooling or parts
- Getting verbal readbacks of machine status or cutting parameters
- Logging notes or observations during machining operations via voice

## How To Use
```
prism_intelligence action=mobile_voice params={command: "what is the current spindle load on machine DMG-5X-01", language: "en"}
```

## What It Returns
- `transcript` — recognized text from the voice input
- `intent` — parsed intent (query, command, log_note)
- `response_text` — text response suitable for text-to-speech readback
- `action_taken` — description of any action executed from the command
- `confidence` — speech recognition confidence score

## Examples
- Query machine status: `mobile_voice params={command: "what is machine HAAS VF2 doing right now"}`
- Look up cutting data: `mobile_voice params={command: "give me speed and feed for half inch endmill in stainless 304"}`
- Log a shop floor note: `mobile_voice params={command: "note tool T5 showing slight edge chipping after 30 minutes"}`
