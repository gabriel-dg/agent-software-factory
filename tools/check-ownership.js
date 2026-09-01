#!/usr/bin/env node
// check-ownership.js -- mechanical file-ownership check for the agent pipeline.
//
// Owned by the orchestrator. Two modes:
//
//   CLI:  node tools/check-ownership.js <agent-name> <path> [path...]
//         Exits 0 if every path is owned by that agent, 1 otherwise.
//         Run this after every writer returns, against the paths it touched
//         (`git status --porcelain` is the honest source for that list).
//
//   Hook: node tools/check-ownership.js --hook
//         Reads a PreToolUse JSON payload on stdin. Exits 2 (block) when the
//         calling agent does not own tool_input.file_path, 0 otherwise.
//
// WHAT THIS DOES NOT DO. It sees Write, Edit and NotebookEdit, because those
// carry an explicit file_path the hook can read. It does NOT see writes made
// through Bash. `echo x > owned-by-someone-else.js` is not intercepted, and
// this was verified by experiment, not assumed. Every writer in this pipeline
// except learning-designer, art-director, sim-engineer and ui-engineer has
// Bash. So this is a check, not a sandbox: it converts the common accident
// (an agent editing a file it does not own with the obvious tool) into a hard
// stop, and leaves the deliberate route open. A bypass is a pipeline failure
// to be investigated, not a valid edit.
//
// The map below must match docs/TEAM.md's "owns (exclusive write)" column.
// If they disagree, that is a defect in one of them, not a judgement call.

const path = require("path");
const fs = require("fs");

const REPO_ROOT = path.resolve(__dirname, "..");

// agent -> exact repo-relative paths it may write. Mirrors docs/TEAM.md.
const OWNERSHIP = {
  "learning-designer": ["docs/SPEC.md", "copy.json"],
  "art-director": ["tokens.css", "docs/DESIGN.md"],
  "sim-engineer": ["sim.js"],
  "math-verifier": [
    "verification/test-sim.js",
    "verification/check-contrast.js",
    "verification/check-claims.js",
    "verification/check-route-arithmetic.js",
    "verification/test-route-arithmetic-sabotage.js"
  ],
  "ui-engineer": ["index.html", "viz.js"],
  "qa-walker": ["tools/qa-walk.js"],
  // Read-only reviewers. They own nothing and may write nothing.
  "skeptic": [],
  "design-reviewer": [],
  // The main thread. Owns pipeline infrastructure and documentation only,
  // never a product file -- CLAUDE.md forbids it implementing the product.
  "orchestrator": [
    "README.md",
    "CLAUDE.md",
    "LICENSE",
    ".gitignore",
    "docs/TEAM.md",
    "docs/LESSONS.md",
    "docs/EXTERNAL-REVIEW.md",
    "tools/check-ownership.js",
    "tools/package.json",
    "tools/package-lock.json"
  ]
};

// Prefixes an agent may write freely (generated output, not source of truth).
const OWNED_PREFIXES = {
  "qa-walker": ["tools/shots/"],
  "orchestrator": [".claude/", "docs/img/"]
};

function normalize(p) {
  const abs = path.resolve(p);
  const rel = path.relative(REPO_ROOT, abs);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return null; // outside repo
  return rel.split(path.sep).join("/");
}

// Returns null if allowed, or a string reason if this is a violation.
function violation(agent, filePath) {
  const rel = normalize(filePath);
  // Outside the repository (scratchpad, temp dirs) is not this check's business.
  if (rel === null) return null;

  if (!Object.prototype.hasOwnProperty.call(OWNERSHIP, agent)) {
    return `unknown agent "${agent}" (not in docs/TEAM.md); owns nothing, so it may not write ${rel}`;
  }

  const owned = OWNERSHIP[agent];
  const cmp = (a, b) =>
    process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b;
  if (owned.some((o) => cmp(o, rel))) return null;

  const prefixes = OWNED_PREFIXES[agent] || [];
  const pfxMatch = prefixes.some((p) =>
    process.platform === "win32"
      ? rel.toLowerCase().startsWith(p.toLowerCase())
      : rel.startsWith(p)
  );
  if (pfxMatch) return null;

  const ownerEntry = Object.entries(OWNERSHIP).find(([, files]) =>
    files.some((o) => cmp(o, rel))
  );
  const ownerNote = ownerEntry
    ? `it belongs to ${ownerEntry[0]}`
    : "it belongs to no agent in docs/TEAM.md";
  const ownList = owned.length ? owned.join(", ") : "(nothing)";
  return `${agent} may not write ${rel}: ${ownerNote}. ${agent} owns: ${ownList}`;
}

function runHook() {
  let raw = "";
  process.stdin.on("data", (d) => (raw += d));
  process.stdin.on("end", () => {
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch (e) {
      // A malformed payload must not silently allow the write.
      process.stderr.write(`check-ownership: could not parse hook payload: ${e.message}\n`);
      process.exit(2);
    }
    // agent_type is present only for subagent tool calls. Absent means the
    // main thread, which this map calls "orchestrator".
    const agent = payload.agent_type || "orchestrator";
    const filePath = (payload.tool_input && payload.tool_input.file_path) || "";
    if (!filePath) process.exit(0);
    const reason = violation(agent, filePath);
    if (reason) {
      process.stderr.write(
        `BLOCKED by tools/check-ownership.js -- file ownership violation.\n${reason}\n` +
          `Do not work around this by using Bash to write the file. Report the ` +
          `need to the orchestrator and let it route the change to the owner.\n`
      );
      process.exit(2);
    }
    process.exit(0);
  });
}

function runCli(argv) {
  const [agent, ...paths] = argv;
  if (!agent || paths.length === 0) {
    process.stderr.write(
      "usage: node tools/check-ownership.js <agent-name> <path> [path...]\n" +
        "       node tools/check-ownership.js --hook   (reads PreToolUse JSON on stdin)\n\n" +
        "known agents: " + Object.keys(OWNERSHIP).join(", ") + "\n"
    );
    process.exit(1);
  }
  const violations = [];
  for (const p of paths) {
    const reason = violation(agent, p);
    if (reason) violations.push(reason);
  }
  if (violations.length) {
    process.stderr.write(
      `FAIL: ${violations.length} ownership violation(s) by ${agent}\n`
    );
    for (const v of violations) process.stderr.write(`  - ${v}\n`);
    process.exit(1);
  }
  process.stdout.write(`PASS: all ${paths.length} path(s) owned by ${agent}\n`);
  process.exit(0);
}

// Parses docs/TEAM.md's owner table and confirms OWNERSHIP above still agrees
// with it, in both directions. The map is hardcoded on purpose, but a
// hardcoded copy of another file silently drifts from it, which is the exact
// defect class this repository keeps finding. Exits 1 on any disagreement.
function runVerifyMap() {
  const teamPath = path.join(REPO_ROOT, "docs", "TEAM.md");
  const text = fs.readFileSync(teamPath, "utf8");
  const fromTeam = {};
  for (const line of text.split(String.fromCharCode(10))) {
    if (!line.startsWith("|")) continue;
    const cells = line.split("|").map((c) => c.trim());
    if (cells.length < 6) continue;
    const agent = cells[1].replace(/\s*\(main thread\)\s*/, "");
    if (!agent || agent === "agent" || /^-+$/.test(agent)) continue;
    const ownsCell = cells[4];
    if (ownsCell === "nothing") { fromTeam[agent] = []; continue; }
    fromTeam[agent] = ownsCell
      .split(",")
      .map((f) => f.trim())
      .filter((f) => f && !f.endsWith("/"));
  }

  const problems = [];
  const agents = new Set([...Object.keys(OWNERSHIP), ...Object.keys(fromTeam)]);
  if (Object.keys(fromTeam).length === 0) {
    problems.push("parsed no agents at all from docs/TEAM.md's owner table");
  }
  for (const a of agents) {
    if (!(a in OWNERSHIP)) { problems.push(`${a} is in docs/TEAM.md but not in this script's map`); continue; }
    if (!(a in fromTeam)) { problems.push(`${a} is in this script's map but not in docs/TEAM.md`); continue; }
    const mine = new Set(OWNERSHIP[a]);
    const theirs = new Set(fromTeam[a]);
    for (const f of theirs) if (!mine.has(f)) problems.push(`${a}: docs/TEAM.md says it owns ${f}, this script does not`);
    for (const f of mine) if (!theirs.has(f)) problems.push(`${a}: this script says it owns ${f}, docs/TEAM.md does not`);
  }
  if (problems.length) {
    process.stderr.write("FAIL: " + problems.length + " disagreement(s) between this script and docs/TEAM.md" + String.fromCharCode(10));
    for (const p2 of problems) process.stderr.write("  - " + p2 + String.fromCharCode(10));
    process.exit(1);
  }
  process.stdout.write("PASS: ownership map agrees with docs/TEAM.md for " + agents.size + " agents" + String.fromCharCode(10));
  process.exit(0);
}

if (process.argv[2] === "--hook") runHook();
else if (process.argv[2] === "--verify-map") runVerifyMap();
else runCli(process.argv.slice(2));
