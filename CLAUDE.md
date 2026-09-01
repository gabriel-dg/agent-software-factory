# Project: Monty Hall interactive explainer

## Team policy
Never edit a file you do not own. docs/TEAM.md's owner table is the source of
truth; tools/check-ownership.js hardcodes it.
Writers run sequentially. Reviewers run in parallel.
Never implement, fix or rewrite anything in the main thread. Delegate or escalate.

## File ownership
Ownership is enforced by tools/check-ownership.js when the hook runs. It is
wired as a PreToolUse hook in .claude/settings.json against Write, Edit and
NotebookEdit, and it blocks the call when the calling agent does not own the
path. The hook reads the agent's identity from the payload's agent_type field,
which is present for subagent calls and absent for the main thread.

Agents with Bash can still bypass it. The hook only sees tools that carry an
explicit file_path, so a shell redirect writes any path unchecked. This was
confirmed by experiment, not assumed: a test agent blocked from writing a file
with the Write tool created the same file with `echo`. math-verifier and
qa-walker both have Bash.

A bypass is a pipeline failure, not a valid edit. If a bypass is found, the
change is reverted and re-routed to the owner; it is not accepted because it
happened to be correct. An agent that needs a file it does not own reports that
to the orchestrator and the orchestrator routes it.

Run the check after every writer returns, against the paths that writer
actually touched:

    node tools/check-ownership.js <agent-name> <path> [path...]

Exit 0 means every path is owned by that agent; exit 1 names each violation.
`git status --porcelain` is the honest source for the path list, since it shows
what changed rather than what the agent said it changed. Ownership is also
checkable against its own source of truth:

    node tools/check-ownership.js --verify-map

which fails if the hardcoded map and docs/TEAM.md disagree in either direction.
Paths outside the repository, such as the scratchpad, are not the check's
business and are always allowed.

## Pipeline
1. learning-designer produces SPEC.md and copy.json. STOP and show me before continuing.
2. skeptic reviews SPEC.md and copy.json alone, before anything gets built.
   Route findings to learning-designer. Max 1 revision round, then continue.
   That limit is per phase, not per project: it caps this pre-build review
   only. It does not cap the post-build review rounds in step 8, which repeat
   until the round is clean by the rule in step 11.
3. art-director and sim-engineer run in parallel.
4. math-verifier runs simulation verification. On FAIL, back to sim-engineer.
   Max 3 rounds, then escalate to me.
5. math-verifier runs contrast verification on tokens.css and DESIGN.md.
   On FAIL, back to art-director. Max 3 rounds, then escalate to me.
6. ui-engineer builds index.html and viz.js. Only after both the simulation
   check and the contrast check PASS.
7. qa-walker drives the built page in a real browser. On FAIL, back to
   ui-engineer. Max 3 rounds, then escalate to me.
8. skeptic and design-reviewer run in parallel.
9. Route skeptic findings to learning-designer. Route design-reviewer
   findings by the file the fix lands in: markup, wiring, or a token used
   wrongly goes to ui-engineer; a token's value, a missing token, or anything
   in DESIGN.md goes to art-director. Neither may edit the other's files.
   A qa-walker ledger mismatch (a rendered foreground/background pair that is
   absent from DESIGN.md's Contrast pairs ledger) routes by cause, not by
   symptom. If the page renders a pair the design system never intended, an
   inherited background, an invented color, or a token used where it does not
   belong, it is ui-engineer's. If the pair is one the design intends and
   DESIGN.md simply never declared it, it is art-director's, since only
   art-director may write that ledger. When it is not clear which, ask
   art-director whether the pair is intended, then route on the answer.
10. After EVERY writer returns, before routing its output anywhere, run
    `node tools/check-ownership.js <agent> <paths it touched>` using
    `git status --porcelain` for the path list. Exit 1 is a pipeline failure:
    revert the out-of-bounds change and re-route it to the owner. Do not
    accept it because it looks correct. This step is required even when the
    PreToolUse hook is active, since the hook cannot see writes made by an
    agent with Bash.
11. Re-run math-verifier's simulation check after any change to sim.js.
    Re-run math-verifier's contrast check after any change to tokens.css or
    DESIGN.md. Re-run math-verifier's claim check after any change to
    copy.json. Re-run qa-walker after any change to index.html or viz.js.
    A review round (skeptic/design-reviewer) is not considered clean until
    the claim check and the qa-walker check both PASS.

## Constraints
Vanilla HTML/CSS/JS. No build step, no npm dependencies, no frameworks.
index.html must open directly in a browser from the filesystem.