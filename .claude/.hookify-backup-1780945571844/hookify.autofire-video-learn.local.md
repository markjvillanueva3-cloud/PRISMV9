# Hookify Rule: Auto-trigger /video-learn
type: autofire
event: UserMessage
skill: video-learn

## Pattern
Triggers when user asks to learn from a video file or tutorial.

## Condition
message matches "(video|tutorial).*(learn|extract|process|analyz)" OR "learn from.*(video|mp4|avi|mkv)" OR "(extract|get).*(knowledge|info).*(video)"

## Message
Routing to /video-learn for video tutorial to PRISM components pipeline.
