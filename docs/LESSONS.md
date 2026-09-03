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

The scaffolding -- contracts, ownership, verifiers -- is written once and
paid for on every run after it. A one-off job pays the whole setup cost
against a single result.

**Decision rule:** what a multi-agent team buys is that the system finds
the errors instead of the end user. What it cost in the reference run was
$31.81 API-equivalent for one end-to-end run. No single-session control was
run, so the multiple against one session is not a number this playbook has;
measure it on your own work before budgeting on it. If finding the errors
before the end user does not matter for this project, do not build it.

---

## 2. The two classes of failure

Errors come in two kinds. They have different causes, they are found by
different things, and a team built to catch one of them will ship the
other.

> **Argument and content errors** happen inside a single agent's own
> output. They are caught by an adversarial reviewer.
>
> **Contract and integration errors** happen between agents. They are
> caught, or missed, according to how explicitly the contract was
> written.

**Inside one agent.** In the reference run the adversary found a false
general law offered as proof ("an event that was going to happen either
way can't be evidence", which is false, and which is the same shape of
reasoning the page existed to disprove), a three-case enumeration with the
third case dropped, and a set of joint probabilities that summed to 1/2
with no stated renormalization. Each is wrong on its own terms, inside the
output of one agent, with no boundary involved. No contract would have
caught them, and no missing contract caused them. What caught them was a
reviewer holding a position hostile to the conclusion.

**Between agents.** The other kind does come from boundaries nobody wrote
down. In the same run: a ledger line format that one agent wrote and
another parsed, with the grammar never stated literally in either prompt;
a module contract for sim.js that had to run both under node and from a
`file://` page; that same `file://` constraint making `fetch("copy.json")`
fail, so the strings had to be transcribed into the page instead; a
contrast ledger verified line by line while describing pairs the page did
not actually render; and a footer no check could fail because the spec
never mentioned it. Each agent did the job its own brief described. The
brief was silent about the seam.

A third, smaller case sits between the two: an agent reported completing a
style pass it had not completed. That is neither an argument error nor a
contract error but an unverified self-report, and nothing caught it until
a check read the artifact instead of the claim.

Practical consequence: budget design time for both classes. Contracts are
written before the run; the adversary is paid for during it. Drop either
and one whole class of error has nothing pointed at it.

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

**The orchestrator is the hidden cost.** In the reference run, 51% of
reported usage was attributed to named subagents and 49% was not; one
agent is missing from the attributed list, so its share sits inside that
49% too. Accumulated orchestrator context is the hypothesis those numbers
are consistent with, not a measurement. Subagents exist to protect the
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

Wiring diagrams of that run: [PIPELINE.md](PIPELINE.md). This playbook is
the generalization; that page is the map.

Interactive explainer, 8 agents, verifiable output, splittable into files.

API-equivalent cost $31.81. API time 2h 23m, wall clock 17h 24m. 6,238
lines added.

By model tier: mid-tier 92%, top-tier 6%, cheapest tier 2%.

By agent, as reported: content writer 16%, QA executor 15%, UI implementer
9%, design 6%, adversary 3%, design reviewer 1%, numeric verifier 1%. That
is seven figures for eight agents, with the simulation engineer absent from
the list, and they sum to 51%. The other 49% is unattributed. Accumulated
orchestrator context is the hypothesis those numbers are consistent with,
not a measurement, and the missing agent's share sits in the same 49%.

Nine real bugs found by the pipeline. No control run was performed, so
nothing here measures what a single session would have caught instead. A
human walkthrough afterwards, with all four checks reporting green, found
four more.

The count is one bug per defect in the shipped artifact or its spec that
somebody had to go back and fix. The nine are the ones the pipeline's own
agents and checks surfaced; the four are the ones it did not. The README
uses the same count and the same definition.
