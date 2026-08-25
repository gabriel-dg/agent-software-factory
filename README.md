# Agent Software Factory

This repository is a single-page interactive explainer of the Monty Hall
problem, built entirely by a pipeline of specialized Claude Code agents
coordinated by an orchestrator session, rather than by one model writing the
whole thing in one pass. The explainer itself is the artifact; the pipeline
that built it, defined in [`CLAUDE.md`](CLAUDE.md) and the eight agent
definitions in [`.claude/agents/`](.claude/agents/), is the actual subject of
this repository. Every claim the page makes about the odds is checked by
code against a real simulation, and every color pair it renders is checked
against a computed WCAG contrast ratio, not just asserted in prose.

To run it: open `index.html` in a browser. No build step, no server, no
npm install required for the page itself.

![The three-door round: pick a door, the host opens one, then stay or switch.](docs/img/three-door-round.png)

![The 100-door escalation: 98 doors opened, one car, the switch strategy shown winning.](docs/img/hundred-door-round.png)

## The team

Eight agents, each with exclusive write access to a fixed set of files and a
narrow job description. No agent edits a file it doesn't own; an agent that
needs a file changed reports the problem and the orchestrator routes it to
whichever agent does own that file.

| agent | model | tools | owns (exclusive write) | role |
|---|---|---|---|---|
| [learning-designer](.claude/agents/learning-designer.md) | sonnet | Read, Write, Edit | `docs/SPEC.md`, `copy.json` | Writes the pedagogical spec and every user-facing string. Decides what the page must teach and prove, not how it's built. |
| [art-director](.claude/agents/art-director.md) | sonnet | Read, Write, Edit | `tokens.css`, `docs/DESIGN.md` | Defines the visual design system as CSS custom properties only, and documents every text/background contrast pair with a claimed ratio. |
| [sim-engineer](.claude/agents/sim-engineer.md) | sonnet | Read, Write, Edit | `sim.js` | Writes the pure simulation logic (no DOM) that the page's claims are checked against. |
| [math-verifier](.claude/agents/math-verifier.md) | haiku | Read, Write, Bash | `verification/test-sim.js`, `verification/check-contrast.js`, `verification/check-claims.js` | Runs three independent numeric checks and reports PASS/FAIL with raw numbers only. Never comments on style, wording, or code quality. |
| [ui-engineer](.claude/agents/ui-engineer.md) | sonnet | Read, Write, Edit | `index.html`, `viz.js` | Builds the actual page and interactions from the spec, copy, tokens, and sim.js's exported functions. |
| [qa-walker](.claude/agents/qa-walker.md) | sonnet | Read, Write, Bash | `tools/qa-walk.js` | Drives the built page in a real Chromium browser via Playwright and checks it against the spec's beat sequence. Read-only on the explainer itself. |
| [skeptic](.claude/agents/skeptic.md) | opus | Read | nothing | Role-plays a reader convinced the odds are 50/50 and reports the exact sentence where the argument loses them. Read-only; suggests no code. |
| [design-reviewer](.claude/agents/design-reviewer.md) | sonnet | Read | nothing | Reviews the built page against `DESIGN.md` and `tokens.css` for implementation fidelity. Read-only; does not judge the argument or the copy. |

## The pipeline

The full sequence, from `CLAUDE.md`:

1. learning-designer produces `SPEC.md` and `copy.json`. **Stops for human
   review before anything else runs.**
2. skeptic reviews `SPEC.md` and `copy.json` alone, before anything gets
   built. Findings route back to learning-designer. Max one revision round,
   then the pipeline continues regardless.
3. art-director and sim-engineer run in parallel (they own disjoint files,
   so there's nothing to merge).
4. math-verifier runs the simulation check. On FAIL, back to sim-engineer.
   Max three rounds, then escalate to the human.
5. math-verifier runs the contrast check on `tokens.css` and `DESIGN.md`. On
   FAIL, back to art-director. Max three rounds, then escalate.
6. ui-engineer builds `index.html` and `viz.js`, but only after both the
   simulation check and the contrast check pass.
7. qa-walker drives the built page in a real browser. On FAIL, back to
   ui-engineer. Max three rounds, then escalate.
8. skeptic and design-reviewer run in parallel over the finished page.
9. skeptic's findings route to learning-designer, design-reviewer's findings
   route to ui-engineer.
10. Any change to `sim.js` re-triggers the simulation check. Any change to
    `tokens.css` or `DESIGN.md` re-triggers the contrast check. Any change
    to `copy.json` re-triggers the claim check. Any change to `index.html`
    or `viz.js` re-triggers qa-walker. A skeptic/design-reviewer round is
    not considered clean until the claim check and qa-walker both pass
    again.

Writers run sequentially except where the pipeline explicitly parallelizes
them (step 3, step 8). Reviewers always run in parallel with each other.
Nothing gets implemented, fixed, or rewritten in the orchestrator's own
context; everything is delegated to the agent that owns the relevant file,
or escalated to the human when a round limit is hit.

## Verification

Four independent layers check different things and none of them substitutes
for another. All commands run from the repo root.

**1. Simulation correctness against analytic ground truth.**
```
node verification/test-sim.js
```
Runs `sim.js`'s `playRound`/`runTrials` over tens of thousands of trials and
compares the empirical win rate to the known closed-form answer (3 doors:
1/3 vs 2/3; N doors with N-2 revealed: 1/N vs (N-1)/N; random host: about
1/3 of rounds end in the prize being revealed, and among the rest, staying
and switching are 50/50). This catches a wrong simulation, something that
runs without error and produces plausible-looking numbers, but implements
the host's constraint incorrectly.

**2. Computed contrast ratios against the design ledger.**
```
node verification/check-contrast.js
```
Parses the literal colors in `tokens.css` and the declared pairs in
`docs/DESIGN.md`'s `## Contrast pairs` section, computes the real WCAG 2.1
relative-luminance ratio for each pair, and checks it against both the
required threshold and the ratio `DESIGN.md` claims. This catches a color
pair that was eyeballed as "looks fine" but fails AA, or a documented ratio
that's gone stale after a token value changed.

**3. Every numeric claim in the copy against the simulation.**
```
node verification/check-claims.js
```
Every string in `copy.json` that states a number carries a sibling
`_assert` key declaring exactly what claim it's making. This script runs
the simulation with a fixed seed and checks the claim against the actual
output, and (since a later revision) also runs a mechanical style pass over
every string for em dashes, en dashes standing in for em dashes, and
malformed or unrecognized `{{placeholder}}` tokens. This catches a copy edit
that quietly drifts a stated number away from what the simulation actually
produces, and catches prose defects no one proofread for.

**4. Real-browser behavior via Playwright.**
```
cd tools && npm install
node qa-walk.js
```
(or `node tools/qa-walk.js` from the repo root, after `npm install` inside
`tools/`.) Drives the actual page end to end in a visible Chromium window:
loads it, plays through every beat, and checks for things no source review
can see, `sim.js` failing to load, the embedded copy JSON failing to parse,
an unsubstituted `{{placeholder}}` literally rendering to the reader,
content leaking before its triggering interaction. It then walks every
element in the rendered DOM, resolves its actual computed foreground and
background color, and checks that pair against `DESIGN.md`'s ledger. This
is the only layer that can catch a rendered color pair nobody ever declared
or verified, since check-contrast.js only ever checks pairs `DESIGN.md`
claims exist. It caught exactly that bug twice in this project (below).

## What the pipeline actually found

These are bugs an earlier pipeline stage, or a human skimming the same
text, plausibly would not have caught, because each one reads as correct on
a casual pass and only breaks under a specific kind of scrutiny.

- **A false general law stated as if it were a proof.** An early draft
  explained why the host's reveal doesn't update your own door's odds with
  "an event that was going to happen either way can't be evidence about
  which way it actually is." That sentence sounds right and is false: a
  host who, when he has a free choice between two goat doors, always favors
  the lower-numbered one, is still "certain either way" to reveal a goat,
  and yet which door he opens now leaks real information. skeptic's second
  pass found this specific counterexample; the fix replaced the false
  general law with the narrower, correct one (the host breaks ties
  uniformly at random) and stated that assumption explicitly everywhere the
  argument depends on it.
- **A silently dropped case in a three-case enumeration.** The argument
  compared what happens if you started on the car versus the other goat,
  and never mentioned the third starting case at all, "you had the goat
  behind the door that actually got opened." Omitting it reads exactly like
  the dropped-case trick the page exists to disprove. skeptic's third pass
  caught it; the fix adds the third route back explicitly, with its
  zero-probability reasoning stated as a direct consequence of the rule,
  not just asserted away.
- **Unrenormalized probabilities that summed to 1/2, not 1**, in the same
  three-case argument, with no stated justification for why only two routes
  were "live" or why dividing by their sum rather than by 1 was correct.
  Fixed by adding the actual joint-probability arithmetic instead of
  presenting the ratio as self-evident.
- **A claim asserted without demonstration.** The page stated that a
  knowing host and a random host can produce identical visible evidence
  while implying different answers, without ever showing it. The fix added
  a second, parallel probability table for the random host so the
  divergence is a worked calculation, not an assertion.
- **A wrong direction on a claim about the simulation.** A later draft
  described spoiled rounds (where a random host accidentally reveals the
  prize) as "disproportionately" the rounds switching would have won,
  hand-waving past the actual mechanism. Checking directly against `sim.js`
  showed the real relationship is exact, not approximate: when the player
  started on the car, a random host can never spoil the round; when the
  player started on a goat, he spoils it exactly half the time. Every
  spoiled round is a round switching would have won; none is a round it
  would have lost. The fix states this as the actual mechanism.
- **A design fix that quietly removed a requirement.** When design-reviewer
  flagged that a door-eligibility badge misused a color family reserved for
  "you can click this," art-director's first proposed fix was to drop the
  badge and replace it with generic disabled-button styling. That styling
  communicates "not clickable," not the actual game-logic fact the badge
  existed to convey (this door was structurally forbidden to the host).
  Nothing downstream would have caught this on its own, since the page
  would still run, still pass every numeric and contrast check, and look
  reasonable; catching it required a human reading the proposed fix against
  what it was supposed to preserve, and sending it back.
- **A visual state that collided with an existing one.** design-reviewer
  found that the same lock icon and the same violet color family used
  page-wide to mean "you can click this" had been reused for a door that
  was explicitly not clickable, and separately found a "played vs. spoiled"
  round pair distinguished only by two very similar shades of pale orange,
  which breaks the page's own rule that no state pair is color-only. Both
  needed a real design decision (new token families, shape and border
  differences), not a code patch.
- **An undeclared color pair that only existed at render time.**
  check-contrast.js only checks pairs `DESIGN.md` claims exist; it has no
  way to know what the actual page renders. Twice in this project,
  qa-walker's browser-level check found a text/background pair on the live
  page that had never been declared or verified, once from an inherited
  background nobody traced through the cascade, once from a legend label
  that picked up its container's background instead of its own. Neither
  check-contrast.js nor a source-code read would have caught either, since
  both require resolving inherited styles the way a browser actually does.
- **A style rule that the responsible agent got wrong about its own work.**
  A compression pass was explicitly required to leave zero em dashes in
  `copy.json`, and the agent that did the pass reported back that it had.
  It had not; ten remained, found only by a manual grep from the
  orchestrator, not by any automated check. This is why the style pass
  described in the verification section above exists now, specifically
  because the pipeline had a real gap here and closing it meant adding a
  fourth kind of check, not just re-trusting the same self-report.

## What it cost

These numbers cover the first end-to-end run only, spec through the first
complete verification pass, not the later compression and design-review
rounds described above. They come from a Claude Pro plan; the dollar figure
is the API-equivalent cost, not what was actually billed under the plan,
and this run exhausted the plan's usage window and drew on additional
credits beyond it.

- API-equivalent cost: $31.81.
- API duration: 2h 23m. Wall-clock duration: 17h 24m.
- Code changes: 6,238 lines added, 514 removed.

By model:

| model | cost | share | input | output | cache read | cache write |
|---|---|---|---|---|---|---|
| Sonnet | $29.41 | 92% | 677.2k | 796.1k | 48.8m | 3.6m |
| Opus | $1.87 | 6% | 94.4k | 24.3k | 243.1k | 106.7k |
| Haiku | $0.53 | 2% | 10.6k | 39.2k | 984.3k | 179.8k |

Share of total usage by subagent, as reported by Claude Code: learning-designer
16%, qa-walker 15%, ui-engineer 9%, art-director 6%, skeptic 3%,
design-reviewer 1%, math-verifier 1%. That's 51%. The remaining 49% was
consumed by the orchestrator's own context in the main thread, coordination
cost as much as all eight specialist agents combined, even though the
entire point of delegating to subagents is to keep work out of that main
context. 42% of total usage happened at over 150k tokens of context, which
is what drives that orchestrator share: a long-running coordinator
accumulates context from every delegation, every routing decision, and
every status check, and none of that is free just because it isn't a
subagent call.

The honest comparison: a single well-prompted Claude Code session would
have built a page like this for a small fraction of that cost. What the
extra cost bought is the bug list above, not a better-looking page.

## How to reproduce something similar

Setup:

1. Clone the repo. The explainer itself (`index.html`, `sim.js`, `viz.js`,
   `tokens.css`, `copy.json`) needs nothing installed; open `index.html`
   directly.
2. For verification, you need Node.js on your machine (no specific version
   is pinned in this repo).
3. For the browser-driven check, `cd tools && npm install`. Installing the
   `playwright` package is supposed to download the Chromium build it needs
   automatically. In practice, on this machine that didn't happen, so if
   `node qa-walk.js` can't find a browser afterward, run
   `npx playwright install chromium` inside `tools/` as an explicit
   fallback.
4. Put `CLAUDE.md` at the repo root, not in a docs folder, if you want
   Claude Code to actually load it as orchestrator policy when you open the
   project. It only auto-loads from there.

The design rules that mattered most, independent of this specific project:

- **File ownership is absolute, one writer per file.** This is what makes
  parallelism safe without a merge step: art-director and sim-engineer can
  run at the same time because neither can touch the other's files, and the
  same is true of skeptic and design-reviewer.
- **Every claim that can be made checkable, is.** A number in the copy
  carries a machine-readable assertion next to it. A color pair carries a
  claimed ratio next to it in a fixed, parseable grammar. Neither of those
  need to exist for a page to work, they exist so a script can independently
  confirm them instead of trusting the agent that wrote them.
- **No state may be distinguished by color alone.** Every meaningfully
  different visual state on the page (a prize door versus a goat door, a
  knowing host versus a random one, a forced case versus a free one) has to
  differ by shape, border, or icon too. This is an accessibility rule and
  it's also what kept catching real semantic bugs, a badge that looked fine
  but reused a color meaning that already meant something else.
- **The design system is tokens only, no selectors.** `tokens.css` is
  exclusively custom properties. Nothing in it targets an element. This
  keeps "what color is this" and "what has this color" fully separated, so
  a token can be audited, renamed, or contrast-checked without knowing
  anything about the page that consumes it.

## Further reading

[`docs/LESSONS.md`](docs/LESSONS.md) generalizes the design rules above into
a standalone playbook, distilled from this run but not specific to Monty
Hall or to this pipeline. If you're building a different multi-agent
pipeline, that document, not this README, is the one to start from.

## Limitations

This approach costs several times what a single well-prompted session would
cost to produce a comparable page, not a marginal amount more. If the
numbers above aren't worth it for your case, that's a reasonable
conclusion, not a failure to use the pipeline correctly.

It depends on the work being cleanly partitionable into files with
unambiguous, non-overlapping ownership. This project split cleanly into
spec, copy, tokens, design rationale, simulation, markup, and three kinds of
verification. A tightly coupled single-file project, or one where two
concerns can't be separated into two files, doesn't have obvious ownership
boundaries to assign, and the whole model of exclusive file ownership stops
applying cleanly.

It depends on claims being independently checkable by code at all. "Is this
contrast ratio real," "does this simulation match the closed-form answer,"
and "does this stated number match the simulation" are yes-or-no questions
a script can answer. Whether an API design is good, or an abstraction is the
right one, generally isn't that kind of question, and no role in this
pipeline would have caught a problem of that kind.

No layer here judges visual quality or writing quality as opposed to
correctness. design-reviewer checks whether the built page is faithful to
what `DESIGN.md` already decided, not whether `DESIGN.md`'s decisions
produce a page that looks good. skeptic checks whether the argument is
airtight, not whether the prose is pleasant to read. Both of those stayed a
human judgment call throughout this project; the pipeline verifies
correctness, it doesn't replace taste.
