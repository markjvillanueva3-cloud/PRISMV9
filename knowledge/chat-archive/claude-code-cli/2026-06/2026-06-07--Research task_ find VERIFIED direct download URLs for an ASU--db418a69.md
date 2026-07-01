---
type: "chat-session"
source: "claude-code-cli"
session_id: "db418a69-43d2-42b5-adf0-feb2bb51525f"
title: "Research task: find VERIFIED direct download URLs for an ASUS motherboard's driv"
date: "2026-06-07"
first_ts: "2026-06-07T04:13:26.131Z"
last_ts: "2026-06-07T04:21:14.127Z"
cwd: "H:\\prism"
messages: 90
user_msgs: 32
assistant_msgs: 58
raw_file: "H:/.claude/projects/H--prism/db418a69-43d2-42b5-adf0-feb2bb51525f/subagents/agent-a6936f8fd6fda61bf.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:30"
---

# Research task: find VERIFIED direct download URLs for an ASUS motherboard's driv

> **claude-code-cli** | 2026-06-07 | 90 msgs (32 user / 58 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/db418a69-43d2-42b5-adf0-feb2bb51525f/subagents/agent-a6936f8fd6fda61bf.jsonl`

## Transcript

### User | 2026-06-07T04:13:26.131Z

Research task: find VERIFIED direct download URLs for an ASUS motherboard's drivers + BIOS. Use WebSearch + WebFetch. Do NOT invent or guess URLs — only report URLs you actually found on official ASUS/AMD pages or their download CDN. Mark confidence per item.

The board is the **ASUS ROG STRIX X870E-E GAMING WIFI7 NEO** (AM5, AMD X870E chipset). IMPORTANT: this is a specific newer "WIFI7 NEO" variant — it is DIFFERENT from the older "ROG STRIX X870E-E GAMING WIFI". Find the correct ASUS support/download page for the **WIFI7 NEO** model specifically. ASUS download files are typically hosted on dlcdnets.asus.com or dlcdnrog.asus.com.

For EACH item below, report: (a) the direct downloadable file URL (prefer a real .zip/.exe link on dlcdnets.asus.com / dlcdnrog.asus.com / amd.com), (b) version, (c) filename, (d) release date, (e) a one-line confidence note (did you actually see this link, or is it the page only?). If you can only find the support PAGE and not the direct file, give the page URL and say so explicitly.

1. **Latest BIOS** for ROG STRIX X870E-E GAMING WIFI7 NEO. Currently installed is version 0238 (dated 2026-02-04) — find the newest available version and its direct download (a .ZIP containing a .CAP file).
2. **MediaTek Wi-Fi 7 driver** (chipset is MediaTek MT7927) for this board, Windows 11 64-bit — direct ZIP URL.
3. **MediaTek Bluetooth driver** for this board, Windows 11 64-bit — direct ZIP URL.
4. **Realtek Audio driver** for this board, Windows 11 64-bit — direct ZIP URL.
5. **AMD Chipset Software** latest version (8.05.04.516, or newest you find) — direct .exe installer URL from amd.com.

Also report: the canonical ASUS support page URL for this exact model, and the latest BIOS version number you found.

Keep the final answer CONCISE — a compact list of URLs + versions + filenames + confidence. No long prose.

### Assistant | 2026-06-07T04:13:34.959Z

I'll research the verified download URLs for the ASUS ROG STRIX X870E-E GAMING WIFI7 NEO. Let me start by finding the correct support page for this specific "WIFI7 NEO" variant.

### Assistant | 2026-06-07T04:13:35.422Z

[tool_use: WebSearch]

### Assistant | 2026-06-07T04:13:35.937Z

[tool_use: WebSearch]

### User | 2026-06-07T04:13:54.853Z

[tool_result] Web search results for query: "ASUS ROG STRIX X870E-E GAMING WIFI7 NEO support driver download"

I'll search for information about the ASUS ROG Strix X870E-E Gaming WiFi motherboard drivers.

Links: [{"title":"ROG STRIX X870E-E GAMING WIFI | ROG Strix | Gaming Motherboards｜ROG - Republic of Gamers｜ROG Global","url":"https://rog.asus.com/motherboards/rog-strix/rog-strix-x870e-e-gaming-wifi/helpdesk
... [+4060 chars truncated]

### User | 2026-06-07T04:13:57.438Z

[tool_result] Web search results for query: "ROG STRIX X870E-E GAMING WIFI7 NEO BIOS download dlcdnets.asus.com"

I'll search for that BIOS download information for you.

Links: [{"title":"ROG STRIX X870E-E GAMING WIFI7 NEO | ROG Strix | Gaming Motherboards｜ROG - Republic of Gamers｜ROG Global","url":"https://rog.asus.com/motherboards/rog-strix/rog-strix-x870e-e-gaming-wifi7-neo/"},{"title":"ROG STRIX X870E-E GA
... [+4078 chars truncated]

### Assistant | 2026-06-07T04:14:00.361Z

I found the canonical support page. Let me fetch the BIOS page directly to find the actual download links.

### Assistant | 2026-06-07T04:14:02.316Z

[tool_use: WebFetch]

### Assistant | 2026-06-07T04:14:04.299Z

[tool_use: WebFetch]

### User | 2026-06-07T04:14:23.132Z

[tool_result] I cannot provide the driver download information you requested. The webpage content provided does not contain driver download links, version numbers, release dates, or file names for any of the drivers you mentioned (MediaTek WiFi 7, MediaTek Bluetooth, Realtek Audio, or AMD Chipset).

The page is a product overview for the ROG STRIX X870E-E GAMING WIFI7 NEO motherboard that includes a support sec
... [+166 chars truncated]

### User | 2026-06-07T04:14:23.136Z

[tool_result] Based on the provided web page content, I cannot find any BIOS version information, release dates, file names, file sizes, or download URLs for the ROG STRIX X870E-E GAMING WIFI7 NEO motherboard.

The page displays product overview information, pricing ($599.99), navigation menus, and support registration options, but does not contain the specific BIOS details you're requesting. To locate this inf
... [+197 chars truncated]

### Assistant | 2026-06-07T04:14:26.372Z

The ASUS pages load download data via JavaScript/API, so a plain fetch won't show them. ASUS uses an API backend (`www.asus.com/support/api/`) keyed by a product model ID. Let me find the model ID and the API endpoint. I'll also try the asus.com support domain variant which sometimes exposes data differently.

### Assistant | 2026-06-07T04:14:27.313Z

[tool_use: WebSearch]

### Assistant | 2026-06-07T04:14:28.602Z

[tool_use: WebFetch]

### User | 2026-06-07T04:14:48.733Z

[tool_result] # ROG STRIX X870E-E GAMING WIFI7 NEO - BIOS Versions

## Latest BIOS Version

**Version 0901** (Beta)
- **Release Date:** April 27, 2026
- **File Size:** 39.28 MB
- **File Name:** A5755.CAP (requires BIOSRenamer tool)
- **SHA-256:** 9604A00AAA4DEAC46C010061071B1C4BC5437A2E67B2EA4C763F3F781CE6EA00
- **Key Feature:** "New memory profile support"

## Other Available Versions

| Version | Date | Size 
... [+489 chars truncated]

### User | 2026-06-07T04:14:50.404Z

[tool_result] Web search results for query: ""X870E-E GAMING WIFI7 NEO" BIOS version 0240 OR 0241 OR 0242 release"

I'll search for information about BIOS versions for this motherboard.

Links: [{"title":"ROG STRIX X870E-E GAMING WIFI7 NEO | ROG Strix | Gaming Motherboards｜ROG - Republic of Gamers｜ROG Global","url":"https://rog.asus.com/motherboards/rog-strix/rog-strix-x870e-e-gaming-wifi7-neo/"},{"title":"ROG 
... [+5957 chars truncated]

### Assistant | 2026-06-07T04:14:55.506Z

That second WebFetch result looks suspicious — those version numbers (0901, 0804, 0703) and the file name "A5755.CAP" don't match the known installed version 0238 dated 2026-02-04, and the model said it "could not find" data in the earlier identical fetch. This looks like the model hallucinated values rather than reading them off the page. I must NOT trust that. Let me get the real data from the ASUS support API, which returns verified JSON with actual CDN URLs.

First I need the product's internal model ID. Let me query the ASUS API directly.

### Assistant | 2026-06-07T04:14:58.015Z

[tool_use: Bash]

### User | 2026-06-07T04:15:11.542Z

[tool_result] {"Result":null,"Status":"FAIL","Message":"FAIL"}

### Assistant | 2026-06-07T04:15:17.877Z

The old API endpoint failed. ASUS migulated to a newer API. Let me find the correct current API. The modern ASUS support uses `odinapi.asus.com` or `www.asus.com/support/api/`. Let me discover the real endpoint by inspecting how the download page loads its data.

### Assistant | 2026-06-07T04:15:18.414Z

[tool_use: Bash]

### User | 2026-06-07T04:15:27.417Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-07T04:15:31.974Z

The page is JS-rendered with no inline IDs. Let me search the page HTML for the product identifiers another way, and try the known modern ASUS API host `odinapi.asus.com`.

### Assistant | 2026-06-07T04:15:34.113Z

[tool_use: Bash]

### User | 2026-06-07T04:15:43.067Z

[tool_result] === bytes ===
195758
=== ID-ish hits ===
     42 2000
     18 2026
     17 1000
     17 0602165
     14 1470
     12 5070
     12 3846050
     12 2684
     10 1153423
      9 2280
      8 1144604
      7 181818
      6 9000
      6 2260
      6 2242
      6 1153424
      6 1144602
      5 8000
      5 7000
      5 1659
=== api/cdn refs ===
Component
component
dlcdnimgs.asus.com
dlcdnrog.asus.com
d
... [+20 chars truncated]

### Assistant | 2026-06-07T04:15:49.994Z

The page is a JS shell. The modern ASUS support API is `odinapi.asus.com`. I need the product GUID/m1id. Let me query the ASUS API that resolves a model name to its product ID, then fetch BIOS and drivers. The current endpoint is `https://www.asus.com/support/api/product.asmx/GetPDLevelAll` or the newer `https://odinapi.asus.com/recent-data/apiv2/...`. Let me try the product-search resolver.

### Assistant | 2026-06-07T04:15:53.633Z

[tool_use: Bash]

### User | 2026-06-07T04:16:00.884Z

[tool_result] === Try ASUS product search resolver (rog domain) ===
{
  "Message": "No HTTP resource was found that matches the request URI 'https://rog.asus.com/support/webapi/product/GetPDByModel?website=us&model=ROG STRIX X870E-E GAMING WIFI7 NEO'."
}
=== Try odinapi product search ===

=== Try odinapi keyword ===

### Assistant | 2026-06-07T04:16:10.259Z

Let me find the correct odinapi path. The ASUS support frontend calls specific endpoints. Let me grab the JS bundle references from the page and also try the documented `GetPDDrivers`/`GetPDBIOS` style with a discovered product ID. First, let me find the product ID via the ASUS "abService" search API which is publicly known.

### Assistant | 2026-06-07T04:16:13.878Z

[tool_use: Bash]

### User | 2026-06-07T04:16:21.309Z

[tool_result] === abService product search ===
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<!-- saved from url=(0052)https://dlcdnwebsites.asus.com/maintain/web/500.html -->
<html xmlns="http://www.w3.org/1999/xhtml"><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="viewport" content="width=device-w
... [+2149 chars truncated]

### Assistant | 2026-06-07T04:16:26.043Z

Good progress — `odinapi.asus.com` is reachable (302). The legacy `product.asmx` is decommissioned. The modern API needs the correct path + a `m1id`/product code. Rather than guess endpoints blindly, the most reliable verified approach is to drive a real browser against the actual ASUS download page and capture the network requests (the real API call + the real CDN URLs it returns). Let me use the Playwright browser to load the page and intercept the download API responses.

### Assistant | 2026-06-07T04:16:26.791Z

[tool_use: mcp__plugin_playwright_playwright__browser_navigate]

### User | 2026-06-07T04:16:32.070Z

[tool_result] [{"type": "text", "text": "### Ran Playwright code\n```js\nawait page.goto('https://rog.asus.com/us/motherboards/rog-strix/rog-strix-x870e-e-gaming-wifi7-neo/helpdesk_bios/');\n```\n### Page\n- Page URL: https://rog.asus.com/us/motherboards/rog-strix/rog-strix-x870e-e-gaming-wifi7-neo/helpdesk_bios/\n- Page Title: ROG STRIX X870E-E GAMING WIFI7 NEO | Motherboards | ROG USA\n### Snapshot\n- [Snapsh
... [+58 chars truncated]

### Assistant | 2026-06-07T04:16:35.124Z

The page loaded in a real browser. Now let me wait for the BIOS list to render and capture the network requests to find the real API endpoint and CDN download URLs.

### Assistant | 2026-06-07T04:16:35.654Z

[tool_use: mcp__plugin_playwright_playwright__browser_network_requests]

### User | 2026-06-07T04:16:37.932Z

[tool_result] [{"type": "text", "text": "### Result\n76. [GET] https://api-rog.asus.com/api/nc/v1/NoCache/Model1Price?WebsiteCode=us&M1Id=34707&GroupId=0 => [200] \n78. [GET] https://api-rog.asus.com/recent-data/api/v4/Level/PopUPAds?WebsiteCode=us&systemCode=rog => [200] \n80. [GET] https://api-rog.asus.com/recent-data/api/v3/Route?WebURL=/us/motherboards/rog-strix/rog-strix-x870e-e-gaming-wifi7-neo/helpdesk_b
... [+29152 chars truncated]

### Assistant | 2026-06-07T04:16:43.700Z

Excellent. I found the real API. The board's internal IDs are: **m1id=34707**, **LevelTagId=248269**, model slug `rog-strix-x870e-e-gaming-wifi7-neo`. The BIOS API call is request #91:

`https://rog.asus.com/support/webapi/ProductV2/GetPDBIOS?website=us&model=rog-strix-x870e-e-gaming-wifi7-neo&pdid=0&m1id=34707&cpu=&LevelTagId=248269&systemCode=rog`

Let me fetch the actual JSON from these verified API endpoints — the BIOS endpoint plus the driver endpoint. These return real CDN URLs.

### Assistant | 2026-06-07T04:16:46.349Z

[tool_use: Bash]

### User | 2026-06-07T04:16:53.150Z

[tool_result] === BIOS JSON ===
5676
--- first BIOS entries (Version/Title/ReleaseDate/FileSize/DownloadUrl) ---
"Version": "0901"
"Title": ""
"Description": "\"
"FileSize": "39.28 MB"
"ReleaseDate": "2026/04/27"
"Version": "0804"
"Title": ""
"Description": "\"
"FileSize": "39.28 MB"
"ReleaseDate": "2026/04/15"
"Version": "0703"
"Title": ""
"Description": "\"
"FileSize": "39.29 MB"
"ReleaseDate": "2026/04/01"
"
... [+110 chars truncated]

### system

... [10 middle messages omitted -- see raw_file] ...

### Assistant | 2026-06-07T04:17:34.121Z

[tool_use: Bash]

### User | 2026-06-07T04:17:42.760Z

[tool_result] Exit code 1
=== Verify BIOS CDN URLs (HEAD) ===
0901 -> 200 0B redirect=
0804 -> 200 0B redirect=
0703 -> 200 0B redirect=
0238 -> 200 0B redirect=

=== Driver JSON: get all OS groups, then Win11 drivers ===
Traceback (most recent call last):
  File "<string>", line 1, in <module>
    import sys,json; d=json.load(sys.stdin); r=d.get('Result',{}); print('TOP KEYS', list(r.keys())); print('OSList'
... [+222 chars truncated]

### Assistant | 2026-06-07T04:17:46.715Z

All 4 BIOS CDN URLs return **HTTP 200** on `dlcdnets.asus.com` — verified real and downloadable. The driver endpoint needs the correct OS ID. Let me find the right driver API path/params. Let me capture the driver page's network call by navigating to the download tab in the browser.

### Assistant | 2026-06-07T04:17:47.048Z

[tool_use: mcp__plugin_playwright_playwright__browser_navigate]

### User | 2026-06-07T04:17:51.235Z

[tool_result] [{"type": "text", "text": "### Ran Playwright code\n```js\nawait page.goto('https://rog.asus.com/us/motherboards/rog-strix/rog-strix-x870e-e-gaming-wifi7-neo/helpdesk_download/');\n```\n### Page\n- Page URL: https://rog.asus.com/us/motherboards/rog-strix/rog-strix-x870e-e-gaming-wifi7-neo/helpdesk_download/\n- Page Title: ROG STRIX X870E-E GAMING WIFI7 NEO | Motherboards | ROG USA\n- Console: 0 er
... [+192 chars truncated]

### Assistant | 2026-06-07T04:17:54.015Z

[tool_use: mcp__plugin_playwright_playwright__browser_network_requests]

### User | 2026-06-07T04:17:56.276Z

[tool_result] [{"type": "text", "text": "### Result\n\nNote: 150 static requests not shown, run with \"static\" option to see them."}]

### Assistant | 2026-06-07T04:17:59.234Z

No driver call captured yet — the download page likely auto-detects OS and loads drivers after a selection, or uses a different endpoint. Let me wait for the page to settle and look at the full request list for the support webapi calls.

### Assistant | 2026-06-07T04:17:59.648Z

[tool_use: mcp__plugin_playwright_playwright__browser_network_requests]

### User | 2026-06-07T04:18:01.966Z

[tool_result] [{"type": "text", "text": "### Result\n96. [GET] https://rog.asus.com/support/webapi/product/GetPDCPUName?website=us&model=rog-strix-x870e-e-gaming-wifi7-neo&pdid=0&m1id=34707&mode=&LevelTagId=248269&systemCode=rog => [200] \n97. [GET] https://rog.asus.com/support/webapi/product/GetPDOS?website=us&model=rog-strix-x870e-e-gaming-wifi7-neo&pdid=0&m1id=34707&mode=&cpu=&LevelTagId=248269&systemCode=ro
... [+782 chars truncated]

### Assistant | 2026-06-07T04:18:06.194Z

There's a `GetPDOS` call that returns the OS list. The drivers load after selecting an OS. Let me get the OS list first to find the Windows 11 OS ID, then call the driver endpoint with it.

### Assistant | 2026-06-07T04:18:07.586Z

[tool_use: Bash]

### User | 2026-06-07T04:18:15.086Z

[tool_result] === GetPDOS — find Windows 11 OS id ===
{
 "Result": {
  "Obj": [
   {
    "Id": "52",
    "Name": "Windows 11 64-bit"
   },
   {
    "Id": "45",
    "Name": "Windows 10 64-bit"
   },
   {
    "Id": "8",
    "Name": "Others"
   }
  ]
 },
 "Status": "SUCCESS",
 "Message": "SUCCESS"
}

### Assistant | 2026-06-07T04:18:19.491Z

Windows 11 64-bit = **OS Id 52**. Now let me fetch the driver list for OS 52 with the correct endpoint.

### Assistant | 2026-06-07T04:18:21.210Z

[tool_use: Bash]

### User | 2026-06-07T04:18:29.446Z

[tool_result] === GetPDDrivers for Windows 11 (osid=52) ===
GROUPS: [('LAN', 1), ('Wireless', 2), ('Chipset', 3), ('Audio', 1), ('VGA', 2), ('USB', 2), ('Bluetooth', 2), ('Utilities', 6), ('SATA', 2), ('Utilities: Armoury Crate', 1)]

### Assistant | 2026-06-07T04:18:34.371Z

I have the verified driver groups. Now let me extract the specific drivers: Wireless (Wi-Fi 7 MediaTek), Bluetooth, Audio (Realtek), and Chipset (AMD). Let me dump each group's files with version, date, and download URL.

### Assistant | 2026-06-07T04:18:36.946Z

[tool_use: Bash]

### User | 2026-06-07T04:18:43.516Z

[tool_result] ==== GROUP: Wireless ====
 Title: MTK WiFi Driver V5.7.0.5659 for Windows 11 64-bit.
   Version: 5.7.0.5659 | Date: 2026/04/20 | Size: 23.54 MB
   URL: /pub/ASUS/mb/08WIRELESS/DRV_WiFi_MTK_MT7925_27_TP_W11_64_V5705659_20260417R.zip

 Title: MTK WIFI driver V5.7.0.5115 for Windows 11 64-bit.(WHQL)
   Version: 5.7.0.5115 | Date: 2026/03/03 | Size: 23.5 MB
   URL: /pub/ASUS/mb/SocketAM5/M5018/
... [+1497 chars truncated]

### Assistant | 2026-06-07T04:18:49.572Z

I have all driver URLs. Note the chipset top entry from ASUS is AMD 8.03.25.247 (not the 8.05.04.516 the user mentioned — that newer version isn't on ASUS yet, so I'll get it from AMD directly). Now let me verify all the driver CDN URLs return 200, and fetch the AMD chipset installer from amd.com.

### Assistant | 2026-06-07T04:18:52.309Z

[tool_use: Bash]

### User | 2026-06-07T04:19:01.742Z

[tool_result] === Verify driver CDN URLs (HEAD on dlcdnets.asus.com) ===
200  https://dlcdnets.asus.com/pub/ASUS/mb/08WIRELESS/DRV_WiFi_MTK_MT7925_27_TP_W11_64_V5705659_20260417R.zip
200  https://dlcdnets.asus.com/pub/ASUS/mb/02BT/DRV_Bluetooth_MTK_MT7925_27_TP_W11_64_V111460576_20260417R.zip
200  https://dlcdnets.asus.com/pub/ASUS/mb/SocketAM5/M5018/Realtek_Audio_Driver_V6.4.0.2430_Windows_11_64-bit.zip
200  h
... [+104 chars truncated]

### Assistant | 2026-06-07T04:19:05.668Z

All 4 ASUS driver URLs verified HTTP 200. Now for the AMD Chipset Software direct .exe from amd.com. Let me find the AMD chipset drivers page and its direct download link.

### Assistant | 2026-06-07T04:19:06.451Z

[tool_use: WebFetch]

### Assistant | 2026-06-07T04:19:06.989Z

[tool_use: WebSearch]

### User | 2026-06-07T04:19:27.472Z

[tool_result] Web search results for query: "AMD Chipset Software 8.05.04.516 download .exe amd-chipset-software"

I'll search for information about that AMD Chipset Software download.

Links: [{"title":"Latest AMD Ryzen Chipset Drivers 8.05.04.516 Download | TechPowerUp","url":"https://www.techpowerup.com/download/amd-ryzen-chipset-drivers/"},{"title":"AMD Ryzen™ Chipset Driver Release Notes 8.05.04.516","url"
... [+4298 chars truncated]

### User | 2026-06-07T04:20:07.015Z

[tool_result] timeout of 60000ms exceeded

### Assistant | 2026-06-07T04:20:11.469Z

AMD 8.05.04.516 confirmed (released 2026-05-18, file `amd_chipset_software_8.05.04.516.exe`). AMD's actual download CDN is `drivers.amd.com`. The known AMD CDN URL pattern is `https://drivers.amd.com/drivers/amd_chipset_software_<version>.exe`. Let me verify the exact AMD CDN URL by probing the pattern and checking the release notes page for the link.

### Assistant | 2026-06-07T04:20:13.435Z

[tool_use: Bash]

### User | 2026-06-07T04:20:20.387Z

[tool_result] === Probe AMD CDN URL patterns for chipset .exe ===
code=302 size=0 type= redirect=https://www.amd.com/en/support/kb/faq/download-incomplete
  https://drivers.amd.com/drivers/amd_chipset_software_8.05.04.516.exe
code=302 size=0 type= redirect=https://www.amd.com/en/support/kb/faq/download-incomplete
  https://drivers.amd.com/drivers/installer/amd_chipset_software_8.05.04.516.exe
code=404 size=0 ty
... [+85 chars truncated]

### Assistant | 2026-06-07T04:20:25.061Z

The `drivers.amd.com/drivers/amd_chipset_software_8.05.04.516.exe` returns a 302 redirect to a "download-incomplete" page — that's AMD's anti-hotlinking guard (it blocks HEAD requests / requests without proper referer + a token, but the path itself is the right one). This is the known-correct AMD CDN path pattern, but I can't fully confirm it serves the file via a bare HEAD. Let me get the actual download URL from AMD's official page by driving the browser to the chipset download page and capturing the real download click target.

### Assistant | 2026-06-07T04:20:25.895Z

[tool_use: mcp__plugin_playwright_playwright__browser_navigate]

### User | 2026-06-07T04:20:30.650Z

[tool_result] [{"type": "text", "text": "### Ran Playwright code\n```js\nawait page.goto('https://www.amd.com/en/support/downloads/drivers.html/chipsets/am5/x870e.html');\n```\n### Page\n- Page URL: https://www.amd.com/en/support/downloads/drivers.html/chipsets/am5/x870e.html\n- Page Title: X870E Drivers and Downloads | Latest Version\n- Console: 2 errors, 2 warnings\n### Snapshot\n- [Snapshot](.playwright-mcp\
... [+134 chars truncated]

### Assistant | 2026-06-07T04:20:33.932Z

The AMD X870E download page loaded. Let me extract the actual download link href from the page DOM (the "Download" button for the chipset .exe).

### Assistant | 2026-06-07T04:20:35.744Z

[tool_use: mcp__plugin_playwright_playwright__browser_evaluate]

### User | 2026-06-07T04:20:39.557Z

[tool_result] [{"type": "text", "text": "### Result\n{\n  \"exeLinks\": [\n    {\n      \"href\": \"https://drivers.amd.com/drivers/amd_chipset_software_8.05.04.516.exe\",\n      \"text\": \"Download* \\n\\t\\t\\t\\t\\t\\t\\tAMD Chipset Drivers\"\n    },\n    {\n      \"href\": \"https://drivers.amd.com/drivers/amd_raid_software_8.03.24.733.zip\",\n      \"text\": \"Download* \\n\\t\\t\\t\\t\\t\\t\\tAMD RAID In
... [+1766 chars truncated]

### Assistant | 2026-06-07T04:20:44.098Z

Confirmed directly from AMD's official X870E download page DOM — the "Download AMD Chipset Drivers" button links to:

**`https://drivers.amd.com/drivers/amd_chipset_software_8.05.04.516.exe`**

This is the verified, official AMD CDN direct .exe URL (the earlier 302 was just AMD's HEAD-request anti-hotlink guard; the link is real and is exactly what AMD's page serves). All items are now verified. Let me close the browser and compile the report.

### Assistant | 2026-06-07T04:20:44.098Z

[tool_use: mcp__plugin_playwright_playwright__browser_close]

### User | 2026-06-07T04:20:47.459Z

[tool_result] [{"type": "text", "text": "### Result\nNo open tabs. Navigate to a URL to create one.\n### Ran Playwright code\n```js\nawait page.close()\n```"}]

### Assistant | 2026-06-07T04:21:14.127Z

All data verified against live ASUS and AMD sources. Here is the compact report.

---

## ASUS ROG STRIX X870E-E GAMING WIFI7 NEO — Verified Downloads

**Canonical support page:** https://rog.asus.com/us/motherboards/rog-strix/rog-strix-x870e-e-gaming-wifi7-neo/helpdesk_download/ (BIOS tab: `.../helpdesk_bios/`)
**Internal IDs (for reference):** m1id=34707, LevelTagId=248269, OS id 52 = Windows 11 64-bit
**Latest BIOS version found:** **0901 (Beta)** — newest stable/official is **0804**. Your installed 0238 is the "First release".

All URLs below were pulled from ASUS's live support API (`GetPDBIOS` / `GetPDDrivers`) and confirmed **HTTP 200** on the CDN. The AMD URL was read straight off AMD's official X870E download-page button.

### 1. Latest BIOS
| | |
|---|---|
| **Newest (Beta) 0901** | https://dlcdnets.asus.com/pub/ASUS/mb/BIOS/ROG-STRIX-X870E-E-GAMING-WIFI7-NEO-ASUS-0901.ZIP |
| Version / Date / Size | 0901 · 2026/04/27 · 39.28 MB · contains `A5755.CAP` (rename via BIOSRenamer for FlashBack) · "New memory profile support" |
| **Newest STABLE 0804** | https://dlcdnets.asus.com/pub/ASUS/mb/BIOS/ROG-STRIX-X870E-E-GAMING-WIFI7-NEO-ASUS-0804.ZIP |
| Version / Date / Size | 0804 · 2026/04/15 · 39.28 MB · AGESA ComboAM5 PI 1.3.0.1; **cannot roll back to older** |

Confidence: **HIGH** — both ZIP URLs verified 200 on dlcdnets.asus.com; versions/dates/sha256 from the official API. 0901 is `IsRelease:0` (Beta); 0804 is the latest `IsRelease:1` (recommended). (Note: API lists 0238's date as 2026/02/25, vs your stated 2026-02-04 — same version, minor date discrepancy.)

### 2. MediaTek Wi-Fi 7 driver (Win 11 64-bit)
- **URL:** https://dlcdnets.asus.com/pub/ASUS/mb/08WIRELESS/DRV_WiFi_MTK_MT7925_27_TP_W11_64_V5705659_20260417R.zip
- Version 5.7.0.5659 · 2026/04/20 · 23.54 MB · filename `DRV_WiFi_MTK_MT7925_27_TP_W11_64_V5705659_20260417R.zip`
- Confidence: **HIGH** — verified 200. (ASUS labels it MT7925/27 family driver; covers your MT7927.)

### 3. MediaTek Bluetooth dr
... [+1941 chars truncated]
