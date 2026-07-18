---
name: prism-discover
description: Search and discover PRISM capabilities. Find engines, actions, skills by keyword or natural language query.
model: sonnet
effort: high
context: 15%
allowed-tools: ["Read", "Bash", "Agent"]
---

# /discover — Capability Search & Discovery

Search PRISM's 1,477 engines, 3,745 actions, and 260 skills to find what you need.

## Usage
- `/discover <query>` — Search by keyword (e.g., `/discover cutting force`)
- `/discover` — List all capability domains
- `/discover --browse <domain>` — Browse a specific domain (physics, post_processor, business, quality, edm, tooling, materials, knowledge)
- `/discover --what-can-i-do <question>` — Natural language (e.g., "how do I calculate tool life?")

## Implementation

### With query argument:
1. Call `prism_dev` with action `discover_search` and params `{ "query": "<user query>", "limit": 10 }`
2. Display results as a ranked table: Name | Domain | Score | Entry Point
3. For each result, show the entry_point (skill or action name) so user can invoke it

### Without argument (list domains):
1. Call `prism_dev` with action `discover_search` and params `{ "query": "" }`
2. Instead, show all domains with counts by browsing each domain

### With --browse:
1. Call `prism_dev` with action `discover_browse` and params `{ "domain": "<domain>" }`
2. Display all capabilities in that domain

### With --what-can-i-do:
1. Call `prism_dev` with action `discover_what_can_i_do` and params `{ "question": "<question>" }`
2. Display matches with explanations

## Output Format
```
PRISM Capability Search: "<query>"
===================================
| # | Capability          | Domain       | Score | Entry Point         |
|---|---------------------|--------------|-------|---------------------|
| 1 | Speed & Feed Calc   | physics      | 0.95  | /sfc-quick-start    |
| 2 | Cutting Force       | physics      | 0.82  | calc.cutting_force  |
| 3 | Tool Life Predict   | physics      | 0.71  | calc.tool_life      |

Try: /sfc-quick-start for the top result
```
