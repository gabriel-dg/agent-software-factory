# Multi-Agent Pipeline Playbook

This document generalizes what the pipeline in this repository actually
surfaced during a full run (8 agents, complete pipeline, $31.81 API
equivalent) into guidance for designing coordinated agent teams elsewhere.

Read it in order the first time. After that, section 7 (the checklist) is
enough on its own.

---

## 1. Deciding whether this approach applies

Before designing anything, answer three questions. If any answer is no, the
design changes, or the whole approach doesn't apply.

**Is there an objective truth a machine can verify?**

A test that runs, a number that gets computed, a pattern that matches or
doesn't. Without one, reviewers become opinion givers and the team
degenerates into agents approving each other. This doesn't mean the work is
impossible, it means automated verification has to be replaced with human
checkpoints, and the pipeline will not run unattended.

**Does the deliverable split into files with an owner?**

The entire ownership scaffolding depends on this. A single long document
with one coherent voice does not split this way, and a sequential pipeline
(A writes, B reviews, C fixes) fits better there than a team with separate
territories.

**Will this repeat?**

The pipeline pays for itself over repeated use. For a single run, a
well-prompted single session almost always wins.

**Decision rule:** a multi-agent team multiplies cost by five to ten times.
What it buys is that the system finds the errors instead of the end user.
If that does not matter for this project, do not build it.

---

## 2. The core principle

> Failures live at the interfaces between agents, not inside the agents
> themselves.

In the reference run, five things failed, and none of them was
incompetence. Every agent did its own job correctly every time. What was
missing were contracts between agents that nobody had written down.

This has one practical consequence that dominates everything else: design
time should go to the boundaries, not the roles. Roles are easy to
imagine. Boundaries are invisible until they break.

---

## 3. Contract inventory (mandatory, before running anything)

Build a table of every piece of data that crosses from one agent to
another:

| What happens | From | To | Literal format |
|---|---|---|---|

For each row:

- Write the format literally, with an example, in the prompts of both
  agents. Not in one prompt only, and not in a shared file both happen to
  read.
- If a script has to parse the format, state exactly where it lives (a
  section with an exact heading, not "somewhere in the document").
- Forbid indirection. A value that points to another value forces the
  parser to resolve references, and that is where it breaks.
- Name the two kinds of failure separately: a format error and a content
  error. If the verifier conflates them, the diagnosis gets confusing.

Phrases that are not specifications: "machine-parseable," "structured,"
"in a consistent format," "clearly documented."

---

## 4. Team design

### Territories

One owner per file, exclusive, declared in both directions: the owner's
prompt states what belongs to it, and every other agent's prompt states
that it must not touch that file.

Writers run sequentially. Reviewers run in parallel.

### Descriptions

Routing is decided by reading agent descriptions. Two overlapping
descriptions make the orchestrator guess.

Every description must state when to invoke the agent and when not to,
naming the agent that should be used instead: "do not use this for X, that
belongs to Y."

### Author and verifier always separate

Whoever produces the work never verifies it. The verifier cannot edit what
it verifies, not even to fix something it sees is wrong.

Give it edit access, and when the test fails, it will fix the test.

### The four kinds of verifier

Cover whichever apply. Each one sees things the others cannot:

1. **Computes.** Compares against analytic ground truth. Cheap, mechanical,
   conclusive.
2. **Executes.** Runs the real artifact. Finds what does not exist until
   something actually executes. In the reference run this was the highest
   value per dollar after the adversary.
3. **Adversary.** Role-plays someone hostile to the result. Not "review
   this" but "you are convinced this is wrong, find where."
4. **Human.** The judgment no agent can provide. Name explicitly what that
   judgment is, because there is always one.

### The adversary has to actually be adversarial

If its prompt opens with "you are a helpful reviewer," it has been
neutralized. It needs a position, not a task.

Counterweight: an adversary required to find something will always find
something. The signal that the review has reached bottom is that it starts
returning debatable objections instead of real errors. That is where it
stops.

---

## 5. Model assignment

By the economics of the role, not by importance:

| Role | Model | Why |
|---|---|---|
| Adversary, judgment reviewer | the best one | judging is cheap in tokens and expensive in judgment |
| Writers, implementers | mid-tier | producing is expensive in tokens and less demanding in judgment |
| Mechanical verifiers | the cheapest one | comparing numbers does not require judgment |

In the reference run, the adversary consumed 3% of spend and produced the
three highest-value findings, including the one that rewrote the central
argument.

**Exception:** if the judgment role has to read a large volume of material
every time, it stops being cheap, and the assignment changes. Measure
before assuming.

---

## 6. Cost and control

**The orchestrator is the hidden cost.** In the reference run it consumed
49%, as much as all the subagents combined. Subagents exist to protect the
main context, but every result that comes back stays there, and the
context grows regardless.

Mitigations:

- Compact between pipeline phases, not only at the end.
- Ask verifiers to return raw numbers, not narrative.
- Keep documents the agents do not need to read out of the project folder.

**An explicit round limit on every correction loop**, with escalation to a
human once it is exhausted. Without one, a correction loop can run
forever.

**A mandatory stop after the spec.** Everything after it builds on that
foundation. A weak spec turns all the following work into polish on top of
a wrong base.

**Before cutting off for budget or time**, have the pipeline write its own
state to a file. It costs one write and saves reconstructing everything
from memory.

---

## 7. Startup checklist

Design:

- [ ] The three questions from section 1, answered
- [ ] Contract inventory complete, with literal format and example
- [ ] One owner per file, exclusive, declared in both directions
- [ ] Descriptions with explicit mutual exclusion
- [ ] Author and verifier separated in every pair
- [ ] The verifier types that apply, all covered
- [ ] Human judgment, explicitly named
- [ ] Models assigned by the economics of the role

Execution:

- [ ] A short coordination policy (20 lines, not 200)
- [ ] Mandatory stop after the spec
- [ ] Round limit on every loop, with escalation
- [ ] A compaction point between phases
- [ ] Sabotage test: break something on purpose and confirm the verifier
      fails

Closeout:

- [ ] Every review finding converted into an automated assertion (wherever
      possible)
- [ ] Cost per agent recorded, to calibrate the next run

---

## 8. Failure modes and their symptoms

| Symptom | Likely cause |
|---|---|
| The orchestrator delegates to the wrong agent | overlapping descriptions |
| The verifier passes and the artifact is broken | it verifies the document, not reality |
| An agent fixes the test instead of the code | the verifier has edit access |
| Everything builds but fails when opened | an unwritten format contract between agents |
| The reviewer says everything is fine | the adversary has been neutralized |
| The correction loop never ends | missing round limit |
| Cost spikes with no visible work | accumulated orchestrator context |
| An agent does more than it was asked | scope creep, convenient when it is right, expensive when it is not |

---

## 9. The sabotage test

A verifier that passes on the first run deserves suspicion. Not because it
cheated, but because a test is written by someone who knows what they
built, and tends to test what exists rather than what should exist.

Break something on purpose, run the verifier, confirm it fails, then
restore it. Confirm it fails on the actual check, not on a downstream
symptom.

Record the file's hash before touching it and confirm it matches
afterward.

This is the only thing that turns a PASS into information.

---

## Appendix: reference run data

Interactive explainer, 8 agents, verifiable output, splittable into files.

API-equivalent cost $31.81. API time 2h 23m, wall clock 17h 24m. 6,238
lines added.

By model tier: mid-tier 92%, top-tier 6%, cheapest tier 2%.

By agent: orchestrator 49%, content writer 16%, QA executor 15%, UI
implementer 9%, design 6%, adversary 3%, design reviewer 1%, numeric
verifier 1%.

Five real bugs found, three of them invisible to a single session: an
arithmetic error in the content, a false general claim presented as a law,
and a visual state that did not exist until a browser rendered it.
