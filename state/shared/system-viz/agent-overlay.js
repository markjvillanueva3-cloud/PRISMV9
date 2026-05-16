/*
 * agent-overlay.js — viewer renderer for the system-viz agent-status overlay.
 *
 * OBSIDIAN-INTELLIGENCE-MS3 / G2 (U-AGENT-PIXEL-DEPT-OVERLAY).
 *
 * Air-gap-safe classic browser script (no framework, no CDN, no bundler).
 * Renders the color-coded subagent badges from the overlay JSON produced by
 * scripts/lib/agent-overlay.mjs and written to agent-overlay.json. Pairs with
 * agent-overlay.css. Exposes window.AgentOverlay = { renderAgentOverlay,
 * fetchAgentOverlay, mountAgentOverlay, AGENT_STATUSES }.
 *
 * SECURITY: the overlay's `lastMessage` (and other text) is sourced from the
 * append-only multi-writer AGENT_CHAT.jsonl log and is UNTRUSTED. Every value
 * that reaches the DOM in this file goes through textContent / createTextNode
 * or a non-HTML property (.title) — innerHTML is never used. Do NOT introduce
 * innerHTML / insertAdjacentHTML / document.write here.
 */
(function (root) {
  "use strict";

  // KEEP-IN-SYNC with AGENT_STATUSES in scripts/lib/agent-overlay.mjs.
  var AGENT_STATUSES = ["typing", "parsing", "idle", "errored"];

  /** Map an overlay status to its CSS modifier class; unknown -> idle. */
  function statusClass(status) {
    return "status-" + (AGENT_STATUSES.indexOf(status) >= 0 ? status : "idle");
  }

  /** Create an element; `text`, when given, is set via textContent (safe). */
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = String(text);
    return node;
  }

  /** Coarse human-readable heartbeat age — e.g. "8s", "3m", "1h", "2d". */
  function humanizeAge(ms) {
    if (typeof ms !== "number" || !isFinite(ms) || ms < 0) return "?";
    var s = Math.floor(ms / 1000);
    if (s < 60) return s + "s";
    if (s < 3600) return Math.floor(s / 60) + "m";
    if (s < 86400) return Math.floor(s / 3600) + "h";
    return Math.floor(s / 86400) + "d";
  }

  /** Build the legend row (one swatch per status). */
  function buildLegend() {
    var legend = el("div", "agent-overlay-legend");
    for (var i = 0; i < AGENT_STATUSES.length; i++) {
      var s = AGENT_STATUSES[i];
      var item = el("span");
      item.appendChild(el("span", "legend-dot " + statusClass(s)));
      item.appendChild(el("span", null, s));
      legend.appendChild(item);
    }
    return legend;
  }

  /** Build one agent badge. All untrusted text goes through `el`/textContent. */
  function buildBadge(agent) {
    var badge = el("div", "agent-badge " + statusClass(agent && agent.status));
    badge.appendChild(el("span", "agent-dot"));

    var body = el("div", "agent-body");
    var head = el("div");
    head.appendChild(el("span", "agent-slot", (agent && agent.slot) || "?"));
    head.appendChild(el("span", "agent-status", (agent && agent.status) || "idle"));
    body.appendChild(head);

    // Topic + heartbeat age — separate spans so a long topic truncates
    // without ever hiding the (operationally important) age.
    var row = el("div", "agent-metarow");
    row.appendChild(el("span", "agent-topic", (agent && (agent.topic || agent.activity)) || "(no topic)"));
    row.appendChild(el("span", "agent-age", agent ? humanizeAge(agent.heartbeatAgeMs) : "?"));
    body.appendChild(row);

    // Pipeline state — explains a `parsing` status; shown only when present.
    var pl = agent && agent.pipeline;
    if (pl && (pl.step != null || pl.iter != null)) {
      var bits = [];
      if (pl.step != null) bits.push("step " + pl.step);
      if (pl.iter != null) bits.push("iter " + pl.iter);
      body.appendChild(el("span", "agent-meta", "pipeline: " + bits.join(" · ")));
    }

    // Secondary meta: last chat message — UNTRUSTED, textContent only.
    if (agent && agent.lastMessage) {
      var msg = el("span", "agent-meta", agent.lastMessage);
      msg.title = agent.lastMessage; // .title is a string property — no HTML parse
      body.appendChild(msg);
    }

    badge.appendChild(body);
    // Tooltip detail (string property assignment — not HTML parsing).
    if (agent && agent.chatId) {
      var tip = agent.slot + " · " + agent.chatId;
      if (agent.branch) tip += " · " + agent.branch;
      if (agent.lastChatTs) tip += " · " + agent.lastChatTs;
      badge.title = tip;
    }
    return badge;
  }

  /**
   * Render the overlay into `container`. Replaces the container's children;
   * returns the rendered agent count. Safe to call repeatedly (live refresh).
   */
  function renderAgentOverlay(overlay, container) {
    if (!container || typeof container.appendChild !== "function") {
      throw new Error("renderAgentOverlay: a valid DOM container is required");
    }
    var agents = overlay && Array.isArray(overlay.agents) ? overlay.agents : [];
    var counts = (overlay && overlay.counts) || {};

    var panel = el("div", "agent-overlay-panel");
    var occupied = typeof counts.occupied === "number" ? counts.occupied : agents.length;
    panel.appendChild(el("div", "agent-overlay-title", "Agent Department  (" + occupied + ")"));
    panel.appendChild(buildLegend());

    if (agents.length === 0) {
      panel.appendChild(el("div", "agent-overlay-empty", "no agents active"));
    } else {
      for (var i = 0; i < agents.length; i++) {
        panel.appendChild(buildBadge(agents[i]));
      }
    }
    // Clear + mount without innerHTML and without the 2020+ replaceChildren API.
    while (container.firstChild) container.removeChild(container.firstChild);
    container.appendChild(panel);
    return agents.length;
  }

  /** Fetch + parse the overlay JSON. Rejects on HTTP error or bad JSON. */
  function fetchAgentOverlay(url) {
    return fetch(url, { cache: "no-store" }).then(function (res) {
      if (!res.ok) throw new Error("agent-overlay fetch failed: HTTP " + res.status);
      return res.json();
    });
  }

  /**
   * Convenience: fetch the overlay, render it, and (when `pollMs` > 0) keep
   * refreshing on an interval. Returns a handle with `.stop()`.
   * @param {{url:string, container:Element, pollMs?:number, onError?:Function}} opts
   */
  function mountAgentOverlay(opts) {
    opts = opts || {};
    var timer = null;
    var stopped = false;
    function tick() {
      fetchAgentOverlay(opts.url)
        .then(function (overlay) {
          if (!stopped) renderAgentOverlay(overlay, opts.container);
        })
        .catch(function (err) {
          if (typeof opts.onError === "function") opts.onError(err);
        });
    }
    tick();
    if (opts.pollMs && opts.pollMs > 0) timer = setInterval(tick, opts.pollMs);
    return {
      stop: function () {
        stopped = true;
        if (timer) clearInterval(timer);
      },
    };
  }

  root.AgentOverlay = {
    AGENT_STATUSES: AGENT_STATUSES,
    statusClass: statusClass,
    humanizeAge: humanizeAge,
    renderAgentOverlay: renderAgentOverlay,
    fetchAgentOverlay: fetchAgentOverlay,
    mountAgentOverlay: mountAgentOverlay,
  };
})(typeof window !== "undefined" ? window : this);
