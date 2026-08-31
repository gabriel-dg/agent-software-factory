# Team roster

| agent | model | tools | owns (exclusive write) | reads |
|---|---|---|---|---|
| learning-designer | sonnet | Read, Write, Edit | docs/SPEC.md, copy.json | all |
| art-director | sonnet | Read, Write, Edit | tokens.css, docs/DESIGN.md | docs/SPEC.md |
| sim-engineer | sonnet | Read, Write, Edit | sim.js | docs/SPEC.md |
| math-verifier | haiku | Read, Write, Bash | verification/test-sim.js, verification/check-contrast.js, verification/check-claims.js | sim.js, tokens.css, docs/DESIGN.md, copy.json |
| ui-engineer | sonnet | Read, Write, Edit | index.html, viz.js | all except sim.js internals |
| qa-walker | sonnet | Read, Write, Bash | tools/qa-walk.js | index.html, viz.js, docs/SPEC.md, copy.json |
| skeptic | opus | Read | nothing | docs/SPEC.md, copy.json |
| design-reviewer | sonnet | Read | nothing | index.html, viz.js, docs/DESIGN.md, tokens.css |

## Product
A single-page interactive explainer that convinces a skeptic the Monty Hall
answer (switching wins 2/3) is correct. Must include a 3-door playable round
and a 100-door escalation. Vanilla JS, no build step, no frameworks.

## Role notes
- learning-designer: owns the pedagogical sequence and every user-facing
  string. Writes no code. The hardest beat to land is that the host KNOWS
  where the prize is and does not choose at random.
- art-director: CSS custom properties only in tokens.css, no selectors.
  Every text/background pair must reach WCAG AA and state its computed ratio
  in DESIGN.md. Prize and goat must differ by more than hue.
- sim-engineer: sim.js exports pure functions, no DOM, seedable RNG:
  playRound(doorCount, switchStrategy, hostMode, rng) and
  runTrials(n, doorCount, strategy, hostMode, seed). hostMode is "knowing" or
  "random": "knowing" never opens the prize door or the player's door;
  "random" opens uniformly among the other doors, and can reveal the prize,
  recorded as outcome "prizeRevealed".
- math-verifier: verifies two independent things: simulation correctness
  against analytic ground truth, and WCAG contrast ratios of the pairs
  declared in DESIGN.md. Runs `node test-sim.js` and compares against
  analytic ground truth (3 doors: 1/3 vs 2/3; N doors with N-2 revealed:
  1/N vs (N-1)/N). Outputs PASS/FAIL with raw numbers only. Never comments
  on code style.
- skeptic: role-plays an intelligent person convinced the answer is 50/50 and
  that 2/3 is a word trick. Reports the exact sentence where the argument
  loses them and which objection is left unanswered. Suggests no code.
- design-reviewer: reviews implementation against DESIGN.md and tokens.css.
  Read-only.