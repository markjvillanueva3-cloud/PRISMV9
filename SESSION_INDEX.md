# PRISM Session Index — April 8, 2026

Sessions are stored in the `H--prism` project. Launch Claude from `H:\prism` (or use the UUIDs below with `claude --resume`) to access them.

## Today's Sessions

| Topic | UUID | Size | Resume Command |
|-------|------|------|----------------|
| **Post Processor Roadmap** | `62d2360f-c6de-4000-ad8b-ec23c6ee9e00` | 25MB | `claude --resume 62d2360f-c6de-4000-ad8b-ec23c6ee9e00` |
| **Fusion Roadmap** | `6f837f70-8fc3-4fdd-9628-2f6efaee7cbe` | 17MB | `claude --resume 6f837f70-8fc3-4fdd-9628-2f6efaee7cbe` |
| **HyperMILL (this session)** | `e6912a3b-7f1f-4543-9241-008cdf712317` | 8MB | `claude --resume e6912a3b-7f1f-4543-9241-008cdf712317` |
| **Wire EDM Calculator** | `38686688-aeea-4e61-8bdb-08e2f4e86100` | 2.5MB | `claude --resume 38686688-aeea-4e61-8bdb-08e2f4e86100` |
| **HyperMILL MS7 — Turning/Mill-Turn** | `5ef53797-39ba-4f1b-b1d3-3c431e951ea3` | 1.7MB | `claude --resume 5ef53797-39ba-4f1b-b1d3-3c431e951ea3` |
| **Infra / Session Migration** | `94b06a89-882b-45cc-8197-1c66fa82d8d9` | 2.3MB | `claude --resume 94b06a89-882b-45cc-8197-1c66fa82d8d9` |
| **Computer Use / Fusion Testing** | `80fb71be-ed83-4b3c-a4e5-e735f9af2d04` | 1.3MB | `claude --resume 80fb71be-ed83-4b3c-a4e5-e735f9af2d04` |

## Why Sessions Aren't Showing in /resume

The Claude CLI shows sessions based on your **current working directory**:
- `H:\` → shows sessions from `C:\Users\wompu\.claude\projects\H--\`
- `H:\prism` → shows sessions from `C:\Users\wompu\.claude\projects\H--prism\` ← **your sessions are here**

**Fix:** Always launch Claude from `H:\prism` for PRISM work:
```
cd H:\prism
claude
```

Or use `claude --resume <uuid>` from any directory.

## Raw Session Store Location
`C:\Users\wompu\.claude\projects\H--prism\`
