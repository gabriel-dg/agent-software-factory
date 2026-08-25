# Project: Monty Hall interactive explainer

## Team policy
File ownership is absolute. Never edit a file you do not own.
Writers run sequentially. Reviewers run in parallel.
Never implement, fix or rewrite anything in the main thread. Delegate or escalate.

## Pipeline
1. learning-designer produces SPEC.md and copy.json. STOP and show me before continuing.
2. skeptic reviews SPEC.md and copy.json alone, before anything gets built.
   Route findings to learning-designer. Max 1 revision round, then continue.
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
9. Route skeptic findings to learning-designer, design findings to ui-engineer.
10. Re-run math-verifier's simulation check after any change to sim.js.
    Re-run math-verifier's contrast check after any change to tokens.css or
    DESIGN.md. Re-run math-verifier's claim check after any change to
    copy.json. Re-run qa-walker after any change to index.html or viz.js.
    A review round (skeptic/design-reviewer) is not considered clean until
    the claim check and the qa-walker check both PASS.

## Constraints
Vanilla HTML/CSS/JS. No build step, no npm dependencies, no frameworks.
index.html must open directly in a browser from the filesystem.