import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const OUTPUTS = {
  json: "H:\\prism\\state\\shared\\AGENT_CONFLICT_ARBITRATION.json",
  markdown: "H:\\prism\\state\\shared\\AGENT_CONFLICT_ARBITRATION.md",
};

const PLAY_LABELS = {
  r: "rock",
  p: "paper",
  s: "scissors",
};

function parseArgs(argv) {
  const parsed = {};
  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
      continue;
    }
    parsed[key] = next;
    index += 1;
  }
  return parsed;
}

function normalizePlay(rawPlay) {
  if (!rawPlay) {
    throw new Error("Missing required play");
  }
  const play = String(rawPlay).trim().toLowerCase();
  if (!["r", "p", "s"].includes(play)) {
    throw new Error(`Invalid play '${rawPlay}'. Use r, p, or s.`);
  }
  return play;
}

function resolveWinner(playA, playB) {
  if (playA === playB) {
    return 0;
  }
  if (
    (playA === "r" && playB === "s") ||
    (playA === "p" && playB === "r") ||
    (playA === "s" && playB === "p")
  ) {
    return 1;
  }
  return 2;
}

function deterministicTieBreak(baseSeed, roundNumber) {
  const digest = crypto
    .createHash("sha256")
    .update(`${baseSeed}|round:${roundNumber}`)
    .digest("hex");
  const value = Number.parseInt(digest.slice(0, 8), 16) % 3;
  return ["r", "p", "s"][value];
}

async function readHistory() {
  try {
    const raw = await fs.readFile(OUTPUTS.json, "utf8");
    return JSON.parse(raw);
  } catch {
    return {
      updated_at: null,
      latest: null,
      history: [],
    };
  }
}

function renderMarkdown(payload) {
  const lines = [];
  lines.push("# Agent Conflict Arbitration");
  lines.push("");
  lines.push(`Updated: ${payload.updated_at}`);
  lines.push("");
  lines.push("## Latest");
  lines.push("");
  if (!payload.latest) {
    lines.push("- No arbitration recorded yet.");
  } else {
    const latest = payload.latest;
    lines.push(`- Issue: ${latest.issue}`);
    lines.push(`- Winner: ${latest.winner.agent}`);
    lines.push(`- Loser: ${latest.loser.agent}`);
    lines.push(`- Resolution: ${latest.resolution}`);
    lines.push(`- Rounds: ${latest.rounds.length}`);
  }
  lines.push("");
  lines.push("## Recent History");
  lines.push("");
  for (const entry of payload.history.slice(0, 10)) {
    lines.push(
      `- ${entry.timestamp} — ${entry.issue} — ${entry.winner.agent} beat ${entry.loser.agent} (${entry.resolution})`,
    );
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

async function main() {
  const args = parseArgs(process.argv);
  const issue = String(args.issue ?? "").trim();
  const agentA = String(args["agent-a"] ?? "").trim();
  const agentB = String(args["agent-b"] ?? "").trim();
  const dryRun = Boolean(args["dry-run"]);

  if (!issue) {
    throw new Error("Missing required --issue");
  }
  if (!agentA || !agentB) {
    throw new Error("Missing required --agent-a or --agent-b");
  }

  const playA = normalizePlay(args["play-a"]);
  const playB = normalizePlay(args["play-b"]);
  const rounds = [
    {
      round: 1,
      source: "declared",
      play_a: playA,
      play_b: playB,
      outcome: resolveWinner(playA, playB),
    },
  ];

  let winningRound = rounds[0];
  if (winningRound.outcome === 0) {
    const seed = `${issue}|${agentA}|${agentB}|${new Date().toISOString().slice(0, 10)}`;
    for (let round = 2; round <= 5; round += 1) {
      const derivedA = deterministicTieBreak(`${seed}|${agentA}`, round);
      const derivedB = deterministicTieBreak(`${seed}|${agentB}`, round + 17);
      const outcome = resolveWinner(derivedA, derivedB);
      const roundRecord = {
        round,
        source: "deterministic-tiebreak",
        play_a: derivedA,
        play_b: derivedB,
        outcome,
      };
      rounds.push(roundRecord);
      if (outcome !== 0) {
        winningRound = roundRecord;
        break;
      }
      winningRound = roundRecord;
    }
  }

  if (winningRound.outcome === 0) {
    throw new Error("Unable to resolve conflict after deterministic tie-break rounds.");
  }

  const winnerKey = winningRound.outcome === 1 ? "a" : "b";
  const loserKey = winnerKey === "a" ? "b" : "a";
  const winner = winnerKey === "a"
    ? { agent: agentA, play: winningRound.play_a }
    : { agent: agentB, play: winningRound.play_b };
  const loser = loserKey === "a"
    ? { agent: agentA, play: winningRound.play_a }
    : { agent: agentB, play: winningRound.play_b };

  const record = {
    timestamp: new Date().toISOString(),
    issue,
    declared: {
      agent_a: agentA,
      play_a: playA,
      agent_b: agentB,
      play_b: playB,
    },
    rounds: rounds.map((round) => ({
      ...round,
      play_a_label: PLAY_LABELS[round.play_a],
      play_b_label: PLAY_LABELS[round.play_b],
    })),
    winner,
    loser,
    resolution:
      winningRound.round === 1
        ? "declared-round"
        : `deterministic-tiebreak-round-${winningRound.round}`,
  };

  if (!dryRun) {
    const current = await readHistory();
    const payload = {
      updated_at: record.timestamp,
      latest: record,
      history: [record, ...(current.history ?? [])].slice(0, 25),
    };

    await fs.mkdir(path.dirname(OUTPUTS.json), { recursive: true });
    await fs.writeFile(OUTPUTS.json, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    await fs.writeFile(OUTPUTS.markdown, renderMarkdown(payload), "utf8");
  }

  process.stdout.write(
    JSON.stringify({
      ok: true,
      dry_run: dryRun,
      issue,
      winner,
      loser,
      resolution: record.resolution,
      rounds: record.rounds,
      outputs: dryRun ? null : OUTPUTS,
    }),
  );
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
