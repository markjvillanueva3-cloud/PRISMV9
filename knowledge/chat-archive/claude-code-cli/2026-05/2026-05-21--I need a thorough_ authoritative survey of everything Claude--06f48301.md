---
type: "chat-session"
source: "claude-code-cli"
session_id: "06f48301-9119-48dc-9f66-43c7a971ac84"
title: "I need a thorough, authoritative survey of everything Claude Code (the CLI) offe"
date: "2026-05-21"
first_ts: "2026-05-21T20:13:20.417Z"
last_ts: "2026-05-21T20:20:57.946Z"
cwd: "H:\\prism"
messages: 49
user_msgs: 21
assistant_msgs: 28
raw_file: "H:/.claude/projects/H--prism/06f48301-9119-48dc-9f66-43c7a971ac84/subagents/agent-a43fa7be8bcc924da.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:04"
---

# I need a thorough, authoritative survey of everything Claude Code (the CLI) offe

> **claude-code-cli** | 2026-05-21 | 49 msgs (21 user / 28 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/06f48301-9119-48dc-9f66-43c7a971ac84/subagents/agent-a43fa7be8bcc924da.jsonl`

## Transcript

### User | 2026-05-21T20:13:20.417Z

I need a thorough, authoritative survey of everything Claude Code (the CLI) offers for **app design and frontend/UI development** — the goal is to understand the current capability surface and where it can be pushed further.

Context: the user has been watching Claude Code build + test a manufacturing dashboard (React/Vite frontend, ~100 pages). They drove Playwright to test pages and applied UX fixes. They now want deep research on "improving Claude CLI app design capabilities" — i.e., how to make Claude Code materially better at designing and building app UIs.

Please research and report on ALL of the following:

1. **Built-in & plugin skills for design/frontend** — what skills ship for UI/app design? (e.g. `frontend-design`, `skill-creator`, the `figma:*` family, `chrome-devtools-mcp:*` family, `playground`). For each: what it does, when to use it, what it's good/bad at.

2. **MCP servers relevant to design** — Figma MCP (`mcp.figma.com`), Playwright MCP, Chrome DevTools MCP. What does each enable for the design loop (design extraction, implementation, visual verification, perf/a11y debugging)? What's the authoritative recommended workflow that chains them?

3. **The design-implementation-verification loop** — what is Anthropic's recommended workflow for Claude Code doing UI work? (screenshot-driven iteration, visual regression, the `verify` / `run` skills, design review subagents). Cite the docs.

4. **Subagents & plugins for design quality** — what agent types or plugins help with design review, accessibility, visual QA? How should they be composed?

5. **Known limitations & how to mitigate** — where does Claude Code currently fall short on app design (no live visual feedback by default, no design-token awareness, accessibility gaps, responsive testing), and what concrete setup mitigates each?

6. **Configuration that improves design output** — settings, hooks, CLAUDE.md patterns, output styles, or context that demonstrably improve frontend/design quality.

7. 
... [+462 chars truncated]

### Assistant | 2026-05-21T20:14:21.540Z

I'll conduct a comprehensive survey of Claude Code's capabilities for app design and frontend/UI development. Let me start by fetching the official documentation.

### Assistant | 2026-05-21T20:14:22.218Z

[tool_use: WebFetch]

### Assistant | 2026-05-21T20:14:22.596Z

[tool_use: WebFetch]

### User | 2026-05-21T20:15:09.755Z

[tool_result] > ## Documentation Index
> Fetch the complete documentation index at: https://code.claude.com/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# Overview

> Claude Code is an agentic coding tool that reads your codebase, edits files, runs commands, and integrates with your development tools. Available in your terminal, IDE, desktop app, and browser.

Claude 
... [+14633 chars truncated]

### User | 2026-05-21T20:15:09.755Z

[tool_result] <HomePage />

### Assistant | 2026-05-21T20:15:11.120Z

Let me fetch the comprehensive docs map and look for specific design-related capabilities:

### Assistant | 2026-05-21T20:15:11.831Z

[tool_use: WebFetch]

### Assistant | 2026-05-21T20:15:11.999Z

[tool_use: WebFetch]

### Assistant | 2026-05-21T20:15:12.500Z

[tool_use: WebFetch]

### User | 2026-05-21T20:16:10.485Z

[tool_result] > ## Documentation Index
> Fetch the complete documentation index at: https://code.claude.com/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# Extend Claude with skills

> Create, manage, and share skills to extend Claude's capabilities in Claude Code. Includes custom commands and bundled skills.

Skills extend what Claude can do. Create a `SKILL.md` file 
... [+49081 chars truncated]

### User | 2026-05-21T20:16:10.734Z

[tool_result] <persisted-output>
Output too large (54.6KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\06f48301-9119-48dc-9f66-43c7a971ac84\tool-results\toolu_0153zAp7FBN7sQxrfFqeNCGa.txt

Preview (first 2KB):
> ## Documentation Index
> Fetch the complete documentation index at: https://code.claude.com/docs/llms.txt
> Use this file to discover all available pages before exploring further.

#
... [+1829 chars truncated]

### User | 2026-05-21T20:16:37.095Z

[tool_result] # Claude Code Documentation Index

## Core Concepts
- **[Overview](https://code.claude.com/docs/en/overview.md)** - Claude Code is an agentic coding tool available in terminal, IDE, desktop app, and browser
- **[How Claude Code Works](https://code.claude.com/docs/en/how-claude-code-works.md)** - Understand the agentic loop, built-in tools, and interactions
- **[Glossary](https://code.claude.com/do
... [+14659 chars truncated]

### Assistant | 2026-05-21T20:16:38.749Z

Now let me fetch specific documentation on frontend/design tools:

### Assistant | 2026-05-21T20:16:39.424Z

[tool_use: WebFetch]

### Assistant | 2026-05-21T20:16:39.641Z

[tool_use: WebFetch]

### Assistant | 2026-05-21T20:16:39.834Z

[tool_use: WebFetch]

### User | 2026-05-21T20:16:44.185Z

[tool_result] > ## Documentation Index
> Fetch the complete documentation index at: https://code.claude.com/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# Let Claude use your computer from the CLI

> Enable computer use in the Claude Code CLI so Claude can open apps, click, type, and see your screen on macOS. Test native apps, debug visual issues, and automate GUI-onl
... [+11955 chars truncated]

### User | 2026-05-21T20:16:44.849Z

[tool_result] The server returned HTTP 404 Not Found.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### User | 2026-05-21T20:16:44.875Z

[tool_result] The server returned HTTP 404 Not Found.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-05-21T20:16:46.421Z

Let me search for the official plugin and design-related documentation:

### Assistant | 2026-05-21T20:16:46.865Z

[tool_use: WebFetch]

### Assistant | 2026-05-21T20:16:47.432Z

[tool_use: WebSearch]

### Assistant | 2026-05-21T20:16:47.697Z

[tool_use: WebSearch]

### User | 2026-05-21T20:17:56.921Z

[tool_result] > ## Documentation Index
> Fetch the complete documentation index at: https://code.claude.com/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# Use Claude Code with Chrome (beta)

> Connect Claude Code to your Chrome browser to test web apps, debug with console logs, automate form filling, and extract data from web pages.

Claude Code integrates with the [C
... [+10972 chars truncated]

### User | 2026-05-21T20:17:59.876Z

[tool_result] Web search results for query: "Claude Code Figma MCP design integration 2025 2026"

Links: [{"title":"From Claude Code to Figma: Turning Production Code into Editable Figma Designs | Figma Blog","url":"https://www.figma.com/blog/introducing-claude-code-to-figma/"},{"title":"Figma × Claude Code Integration Guide — Bridging Design and Code with MCP | Claude Lab","url":"https://claudelab.net/en/artic
... [+2969 chars truncated]

### User | 2026-05-21T20:18:04.981Z

[tool_result] Web search results for query: ""Claude Code" frontend design UI development skills plugins 2025"

Links: [{"title":"Frontend Design – Claude Plugin | Anthropic","url":"https://claude.com/plugins/frontend-design"},{"title":"Top 10 Claude Code Plugins to Try in 2026","url":"https://www.firecrawl.dev/blog/best-claude-code-plugins"},{"title":"Top 8 Claude Skills for UI/UX Engineers | Snyk","url":"http
... [+3492 chars truncated]

### Assistant | 2026-05-21T20:18:06.767Z

Now let me search for more specific information on design subagents, testing, and performance tools:

### Assistant | 2026-05-21T20:18:07.426Z

[tool_use: WebFetch]

### Assistant | 2026-05-21T20:18:07.877Z

[tool_use: WebSearch]

### Assistant | 2026-05-21T20:18:08.209Z

[tool_use: WebSearch]

### User | 2026-05-21T20:18:25.864Z

[tool_result] Web search results for query: "Claude Code /run /verify browser testing Playwright visual regression 2025"

Links: [{"title":"GitHub - lackeyjb/playwright-skill: Claude Code Skill for browser automation with Playwright. Model-invoked - Claude autonomously writes and executes custom automation for testing and validation. · GitHub","url":"https://github.com/lackeyjb/playwright-skill"},{"title":"How 
... [+2841 chars truncated]

### User | 2026-05-21T20:18:28.417Z

[tool_result] Web search results for query: "Claude Code subagents design review accessibility testing performance 2025"

Links: [{"title":"awesome-claude-code-subagents/categories/04-quality-security/accessibility-tester.md at main · VoltAgent/awesome-claude-code-subagents","url":"https://github.com/VoltAgent/awesome-claude-code-subagents/blob/main/categories/04-quality-security/accessibility-tester.md"},{"tit
... [+3430 chars truncated]

### User | 2026-05-21T20:18:28.962Z

[tool_result] # Claude Code and Figma MCP Server Setup

## Overview
The Figma MCP server integrates Figma with Claude Code, enabling structured access to design files and tools. According to the documentation, it allows Claude to "read design context such as components, variables, layout data, FigJam content, and Make resources."

## Key Capabilities
- Reading design information including components and variabl
... [+875 chars truncated]

### Assistant | 2026-05-21T20:18:30.522Z

Excellent. Let me search for more on design tokens, accessibility, and recent feature announcements:

### Assistant | 2026-05-21T20:18:30.765Z

[tool_use: WebSearch]

### Assistant | 2026-05-21T20:18:31.265Z

[tool_use: WebSearch]

### Assistant | 2026-05-21T20:18:31.713Z

[tool_use: WebFetch]

### User | 2026-05-21T20:18:46.838Z

[tool_result] Web search results for query: "Claude Code design tokens design system awareness CSS-in-JS 2025"

Links: [{"title":"Design Tokens | Claude Code Skills","url":"https://claudemarketplaces.com/skills/julianoczkowski/designer-skills/design-tokens"},{"title":"How to Use Claude Design Without Burning Through Your Token Limit | MindStudio","url":"https://www.mindstudio.ai/blog/claude-design-token-managem
... [+2669 chars truncated]

### User | 2026-05-21T20:18:46.941Z

[tool_result] # Common Workflows in Claude Code

The documentation page covers **step-by-step guides for everyday development tasks** with Claude Code. Here are the main workflow categories:

## Prompt Recipes

### Understanding Codebases
- **Quick overview**: Start at project root, run `claude`, ask for high-level overview
- **Find relevant code**: Ask Claude to locate files by functionality
- **Trace executio
... [+1650 chars truncated]

### User | 2026-05-21T20:18:47.676Z

[tool_result] Web search results for query: ""Claude Code" responsive design testing mobile A11y auditing 2025 2026"

Links: [{"title":"GitHub - airowe/claude-a11y-skill: Claude Code skill for running comprehensive accessibility audits (axe-core + jsx-a11y) · GitHub","url":"https://github.com/airowe/claude-a11y-skill"},{"title":"claude-a11y-audit | Skills Marketplace","url":"https://lobehub.com/skills/switchbac
... [+3455 chars truncated]

### Assistant | 2026-05-21T20:18:49.559Z

Perfect. Now let me search for more on recent 2026 features and limitations:

### Assistant | 2026-05-21T20:18:49.989Z

[tool_use: WebSearch]

### Assistant | 2026-05-21T20:18:50.203Z

[tool_use: WebSearch]

### Assistant | 2026-05-21T20:18:50.673Z

[tool_use: WebFetch]

### User | 2026-05-21T20:19:07.387Z

[tool_result] > ## Documentation Index
> Fetch the complete documentation index at: https://code.claude.com/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# Best practices for Claude Code

> Tips and patterns for getting the most out of Claude Code, from configuring your environment to scaling across parallel sessions.

Claude Code is an agentic coding environment. Unli
... [+35135 chars truncated]

### User | 2026-05-21T20:19:17.809Z

[tool_result] Web search results for query: "Claude Code limitations design work screenshot feedback loop visual testing gaps"

Links: [{"title":"Best practices for Claude Code - Claude Code Docs","url":"https://code.claude.com/docs/en/best-practices"},{"title":"Giving Claude Code Eyes: Round-Trip Screenshot Testing | by Tal Rotbart | Medium","url":"https://medium.com/@rotbart/giving-claude-code-eyes-round-trip
... [+2562 chars truncated]

### User | 2026-05-21T20:19:22.170Z

[tool_result] Web search results for query: "Claude Code 2026 new features visual design feedback live preview"

Links: [{"title":"How to Use Claude Code's Preview Feature for Visual Editing (And Where It Stops)","url":"https://www.builder.io/blog/claude-code-visual-editor"},{"title":"What are the new features of Claude? (2026)","url":"https://www.blockchain-council.org/claude-ai/new-features-of-claude/"},{"tit
... [+2707 chars truncated]

### Assistant | 2026-05-21T20:20:57.946Z

Perfect. Now I have comprehensive information. Let me compile a detailed, structured report.

---

# Comprehensive Survey: Claude Code for App Design & Frontend/UI Development

## Executive Summary

Claude Code has evolved into a robust AI-powered development environment with significant but uneven capabilities for frontend and design work. The platform offers strong code generation, browser testing automation, and design-to-code workflows (via Figma MCP), but operates with fundamental constraints around visual feedback loops and design token awareness. Recent 2025-2026 developments show Anthropic investing heavily in closing these gaps through auto-verification, accessibility auditing, and design system integration.

---

## 1. BUILT-IN & PLUGIN SKILLS FOR DESIGN/FRONTEND

### 1.1 Bundled Skills (Always Available)

#### **`/run` and `/verify`** (Core UI Workflow Skills)
- **Purpose**: Launch applications and verify code changes visually
- **What it does**: 
  - Infers how to build and launch your project (CLI, server, browser, TUI, Electron)
  - Runs your dev server and takes screenshots automatically
  - Compares outputs before and after code changes
  - Can iterate based on visual mismatches
- **When to use**: After writing UI components, modal changes, styling updates, or any visual change
- **Good at**: Catching layout bugs, overflow issues, responsive breakage
- **Bad at**: 
  - Complex design interactions (hover states, animations across frames)
  - Subjective design quality assessment
  - State-dependent UI (form validation states, error overlays)
- **Setup**: Run `/run-skill-generator` once per project to record the exact build/launch recipe

Source: [Claude Code Skills Guide](https://code.claude.com/docs/en/skills)

#### **`/simplify`** (Code Quality)
- Refactors generated code for clarity and consistency
- Works on CSS, JavaScript, JSX, and styling approaches
- **Useful for**: Cleaning up auto-generated component boilerplate

#### **`/debug`** (Interactiv
... [+31813 chars truncated]
