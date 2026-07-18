---
name: Post processor development strategy
description: Always use base Fusion 360 posts as foundation, layer PRISM enhancements on top — never write CPS posts from scratch
type: feedback
originSessionId: 4ece27cb-0d23-4cc2-b93d-e87897eb01e6
---
When creating PRISM enhanced post processors (.cps files for Fusion 360):

**ALWAYS start from the certified Autodesk base post** in `resources/FUSION BASIC POSTS/` or `mcp-server/data/posts/fusion-cache/`. These have complete, tested callback functions (onCycle, onCyclePoint, onCycleEnd, etc.) with correct controller-specific G-codes.

**Why:** Posts written from scratch invariably miss canned cycle implementations, TNRC (tool nose radius compensation), stock removal cycles, and other critical controller-specific code. The base posts are Autodesk-certified against real machines.

**How to apply:**
1. Start from the matching base post (e.g., `okuma turning.cps` for Okuma lathes, `okuma lb3000 mill-turn.cps` for mill-turn)
2. Replace header/description with PRISM machine-specific header
3. ADD PRISM properties to the properties{} block (don't remove existing ones)
4. ADD PRISM physics helper functions (Kienzle, CSS optimization, Taylor tool life)
5. Keep ALL base callback functions — only add PRISM output inside them
6. Cross-reference hyperMILL packages in `JM DIE/JM DIE COMPANY/JM/OKUMA/POSTS AND MACHINES/` for manufacturer-verified M-codes and G-codes

**Key finding:** Okuma OSP uses G56 for tool length comp (not G43 like Fanuc). Confirmed by hyperMILL certified post. Don't apply Fanuc assumptions to Okuma.

**EDM exception:** Wire/sinker EDM posts don't have Fusion base posts — those are custom by nature and the existing PRISM EDM posts are complete.
