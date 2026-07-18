I split my CLAUDE.md into 27 files. Here's the architecture and why it works better than a monolith.
My CLAUDE.md was ~800 lines. It worked until it didn't. Rules for one context bled into another, edits had unpredictable side effects, and the model quietly ignored constraints buried 600 lines deep.

Quick context: I use Claude Code to manage an Obsidian vault for knowledge work -- product specs, meeting notes, project tracking across multiple clients. Not a code repo. The architecture applies to any Claude Code project, but the examples lean knowledge management.

The monolith problem
Claude's own system prompt is ~23,000 tokens. That's 11% of context window gone before you say a word. Most people's CLAUDE.md does the same thing at smaller scale -- loads everything regardless of what you're working on.

Four ways that breaks down:

Context waste. Python formatting rules load while you're writing markdown. Rules for Client A load while you're in Client B's files.

Relevance dilution. Your critical constraint on line 847 is buried in hundreds of lines the model is also trying to follow. Attention is finite. More noise around the signal, softer the signal hits.

No composability. Multiple contexts share some conventions but differ on others. Monolith forces you to either duplicate or add conditional logic that becomes unreadable.

Maintenance risk. Every edit touches everything. Fix a formatting rule, accidentally break code review behavior. Blast radius = entire prompt.

The modular setup
Split by when it matters, not by topic. Three tiers:

rules/
├── core/           # Always loaded (10 files, ~10K tokens)
│   ├── hard-walls.md          # Never-violate constraints
│   ├── user-profile.md        # Proficiency, preferences, pacing
│   ├── intent-interpretation.md
│   ├── thinking-partner.md
│   ├── writing-style.md
│   ├── session-protocol.md    # Start/end behavior, memory updates
│   ├── work-state.md          # Live project status
│   ├── memory.md              # Decisions, patterns, open threads
│   └── ...
├── shared/         # Project-wide patterns (9 files)
│   ├── file-management.md
│   ├── prd-conventions.md
│   ├── summarization.md
│   └── ...
├── client-a/       # Loads only for Client A files
│   ├── context.md             # Industry, org, stakeholder patterns
│   ├── collaborators.md       # People, communication styles
│   └── portfolio.md           # Products, positioning
└── client-b/       # Loads only for Client B files
    ├── context.md
    ├── collaborators.md
    └── ...
Each context-specific file declares which paths trigger it:

---
paths:
  - "work/client-a/**"
---
Glob patterns. When Claude reads or edits a file matching that pattern, the rule loads. No match, no load. Result: ~10K focused tokens always present, plus only the context rules relevant to current work.

Decision framework for where rules go
Question	If Yes	If No
Would violating this cause real harm?	core/hard-walls.md	Keep going
Applies regardless of what you're working on?	core/	Keep going
Applies to all files in this project?	shared/	Keep going
Only matters for one context?	Context folder	Don't add it
If a rule doesn't pass any gate, it probably doesn't need to exist.

The part most people miss: hooks
Instructions are suggestions. The model follows them most of the time, but "most of the time" isn't enough for constraints that matter.

I run three PostToolUse hooks (shell scripts) that fire after every file write:

Frontmatter validator, blocks writes missing required properties. The model has to fix the file before it can move on.

Date validator, catches the model inferring today's date from stale file contents instead of using the system-provided value. This happens more often than you'd expect.

Wikilink checker, warns on links to notes that don't exist. Warns, doesn't block, since orphan links aren't always wrong.

Instructions rely on compliance. Hooks enforce mechanically. The difference matters most during long sessions when the model starts drifting from its earlier context. Build a modular rule system without hooks and you're still relying on the model to police itself.

Scaffolds vs. structures
Not all rules are permanent. Some patch current model limitations -Claude over-explains basics to experts, forgets constraints mid-session, hallucinates file contents instead of reading them. These are scaffolds. Write them, use them, expect them to become obsolete.

Other rules encode knowledge the model will never have on its own. Your preferences. Your org context. Your collaborators. The acronyms that mean something specific in your domain. These are structures. They stay.

When a new model drops, audit your scaffolds. Some can probably go. Your structures stay. Over time the system gets smaller and more focused as scaffolds fall away.

Getting started
You don't need 27 files. Start with two: hard constraints (things the model must never do) and user profile (your proficiency, preferences, how you work). Those two cover the biggest gap between what the model knows generically and what it needs to know about you.

Add context folders when the monolith starts fighting you. You'll know when.

Three contexts (two clients + personal) in one environment, running for a few months now. Happy to answer questions about the setup.