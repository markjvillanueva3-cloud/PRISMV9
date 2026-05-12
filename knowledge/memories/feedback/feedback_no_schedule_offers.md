---
name: Don't offer /schedule at end of work
description: User wants immediate action on follow-ups, not deferred scheduling. Skip the /schedule offer entirely.
type: feedback
originSessionId: bd6d94e7-ef5b-46bc-8849-d15220fd888f
---
Don't end replies with offers to `/schedule` a future agent for follow-up work.

**Why:** User explicitly said "we need things built now, not 1 week" after a /schedule offer. Their workflow is build-build-build in the same session, not "queue it for later." Deferred work feels like deflection to them.

**How to apply:** When work has a natural follow-up (closing a loop, integrating a new engine into existing flows, cleaning up a flag), either propose to do it immediately in this session or just start it. The default Claude Code behavior of offering /schedule at end-of-task is overridden for this user.
