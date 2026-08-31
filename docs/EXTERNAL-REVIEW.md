The closed-form numbers on the page are right. The experimental claims are not. The eight-agent machine is not what produced the value, and it is not worth what it cost.

I checked every probability statement against Bayes, not against sim.js. I ran the three verification scripts. I drove the live page at https://gabriel-dg.github.io/agent-software-factory/ through the beats as a 50/50 reader, desktop and 375px. Git history is twelve commits, one of them a dump of the whole pipeline.

───

1. The nine-bug claim is asserted, not evidenced, and it counts work the cost figure excludes

Verified. There are no skeptic reports, no FAIL logs, no agent transcripts, and no per-bug commits. The entire pipeline lands in 705e2e5 (“Multi-agent pipeline and Monty Hall explainer”). The only record of the nine bugs is later prose in README.md and docs/SPEC.md, written by the same process being evaluated.

The cost block is explicit: “first end-to-end run only, spec through the first complete verification pass, not the later compression and design-review rounds.” The bug list is not. SPEC is at revision 6, “fourth skeptic pass.” CLAUDE.md allows one skeptic round, then continue. The nine bugs include skeptic passes 2–4, a compression pass, design-review, a human reading a proposed token fix, and a grep from the orchestrator. That is a longer, more expensive process than the $31.81.

Two of the nine are not pipeline catches even on the README’s own telling:

• Badge requirement nearly deleted. “Catching it required a human reading the proposed fix.” Listed under “What the pipeline actually found.”
• Ten em dashes after a pass that reported zero. Found by “a manual grep from the orchestrator, not by any automated check.” The main thread is forbidden to do this (CLAUDE.md: never implement or verify in the main thread). They broke the rule and counted the break as a win.

docs/LESSONS.md does not even agree with the README: “Five real bugs found, three of them invisible to a single session.” The README says nine, three of which no single session would have surfaced, and never names the three. The playbook and the report are already two different experiments.

Which of the nine a competent single session plausibly catches anyway

┌───┬─────────────────────────────┬────────────────────────────────────────────────────────────┐
│ # │ Bug                         │ Single session                                             │
├───┼─────────────────────────────┼────────────────────────────────────────────────────────────┤
│ 1 │ False “certainty isn’t      │ Maybe miss. Real subtlety (biased tie-break). Also a known │
│   │ evidence” law               │ result; a session told to state its assumptions can        │
│   │                             │ produce it without eight agents.                           │
├───┼─────────────────────────────┼────────────────────────────────────────────────────────────┤
│ 2 │ “Dropped” third route       │ The objection is confused (finding 3). A standard three-   │
│   │                             │ location Bayes writeup already has P(car behind opened     │
│   │                             │ door)=0. Not a pipeline-only catch.                        │
├───┼─────────────────────────────┼────────────────────────────────────────────────────────────┤
│ 3 │ Joints 1/6+2/6=1/2 not      │ Competent Bayes writes “divide by P(data).” Presentation   │
│   │ renormalized                │ gap, not an arithmetic error. LESSONS.md oversells it as   │
│   │                             │ one.                                                       │
├───┼─────────────────────────────┼────────────────────────────────────────────────────────────┤
│ 4 │ Random-host table asserted  │ Completeness, not a defect. A single session is as likely  │
│   │ not shown                   │ to skip it.                                                │
├───┼─────────────────────────────┼────────────────────────────────────────────────────────────┤
│ 5 │ “Disproportionately” vs     │ Thirty seconds on the random-host cases gets there. The    │
│   │ exact survivorship          │ FAQ on the live page still says “disproportionately.”      │
│   │                             │ Incomplete even as a pipeline catch.                       │
├───┼─────────────────────────────┼────────────────────────────────────────────────────────────┤
│ 6 │ Design fix dropping the     │ Human. A single session never has this inter-agent failure │
│   │ badge                       │ mode.                                                      │
├───┼─────────────────────────────┼────────────────────────────────────────────────────────────┤
│ 7 │ Lock/violet collision;      │ Maybe miss without a design pass. Does not require         │
│   │ color-only spoiled/played   │ exclusive file ownership.                                  │
├───┼─────────────────────────────┼────────────────────────────────────────────────────────────┤
│ 8 │ Undeclared computed-style   │ Real catch, from the browser script, not from having eight │
│   │ pair                        │ roles. A single session that ran the same Playwright check │
│   │                             │ would see it.                                              │
├───┼─────────────────────────────┼────────────────────────────────────────────────────────────┤
│ 9 │ Em dashes                   │ grep. The pipeline missed it until a human-shaped          │
│   │                             │ orchestrator grepped.                                      │
└───┴─────────────────────────────┴────────────────────────────────────────────────────────────┘

The sentence “three that needed a specific kind of cross-checking no single session performs” is doing the work of a control that was never run.

───

2. Mathematics: the numbers are correct; one argument on the page is the wrong partition

Verified, independently of sim.js.

Knowing host, 3 doors: stay 1/3, switch 2/3. Aggregate 2/3 does not depend on the tie-break. Player picks 1, host opens 3, fair coin: P(open 3)=1/2, P(car in 1 \| open 3)=1/3, P(car in 2 \| open 3)=2/3. Random host, same observation plus goat: joints 1/6, 1/6, 0; posterior 1/2–1/2; spoil rate (2/3)×(1/2)=1/3; every spoiled round is a switch-win case; decided switch win = 1/2. N=100 knowing: 1/100 vs 99/100. Blind host dodge = 2/N = 1/50; prize revealed = 98/100. Biased host (always lower-numbered goat), pick 1: open 3 ⇒ certain switch win; open 2 ⇒ 50/50; always-switch still 2/3.

I also ran verification/test-sim.js; empirical rates match. sim.js is not the source of those facts.

What is wrong is Route 3 on the knowing-host table. The live copy says the missing case is “you had the goat behind the door that actually got opened,” then explains that this would mean that door was your door. That is not a member of the three-case partition given a fixed pick. The actual third prize location is “car behind the opened door,” joint 0 because a knowing host never opens the car. The random-host Route 3 uses that location-partition; the knowing-host Route 3 uses a counterfactual pick. SPEC revision 6 admits they “were never the same partition” and tells the reader not to line them up. That is the skeptic’s “dropped case” finding, accommodated, then patched with a disclaimer. The number 0 is right for both stories. The argument is not.

“1/3 × 1 = 2 in 6” is the same 1/3 rewritten in sixths, not a multiplication. A reader hunting for a trick will stop there. Not a false equality; a bad equation.

No other probability statement I checked is false. The 100-door “1 in 50” derivation in SPEC §2c is the one that was wrong in an earlier draft (1-in-2^98); the current figure is correct.

───

3. The four layers are not independent, and they do not check the claims they advertise

Verified.

check-claims.js never reads the string. It reads a sibling _assert and compares sim.js to expected. I counted 20 numeric-looking strings with no _assert, including every joint in both route tables, the renormalization (1/6, 2/6, 3/6, 1/2), fairnessNote, and comparisonTakeaway. Those are the proof. They are unchecked. Eight strings carry an _assert and state no number at all (meta.intro is the clean example). FAQ item 3 still says the spoils “disproportionately” delete switch-win rounds; its _assert is noRevealAndSwitchWins: 0.5; the script prints PASS. The 100-door callout says “1 time in 50”; the sibling assert is prizeRevealed: 0.98. Related, not the same sentence.

So “every numeric claim is checked against a real simulation” is false. What is checked is that whoever wrote the JSON put a plausible expected next to some keys.

Overlaps, all in the prompts:

• test-sim.js and check-claims.js both re-run sim.js against 1/3 vs 2/3. math-verifier writes the analytic tests and reads sim.js. Independence from the author of sim.js is real; independence from “whatever this verifier currently believes” is not. docs/LESSONS.md tells you to sabotage the tests. Nothing in the repo records that anyone did.
• design-reviewer’s job includes “no element combines a foreground and background that is not among the declared pairs.” That is qa-walker’s ledger walk, done by reading source instead of getComputedStyle.
• qa-walker’s contrast check does not compute WCAG. It only asks whether a rendered pair is in the ledger. check-contrast.js only asks whether ledger pairs meet WCAG. Complementary, not four independent views of the same fact.

What none of them cover, verified on the live page:

• Argument structure (Route 3).
• Prose/assert drift (“disproportionately”; “1 in 50” vs 0.98).
• Generated-text UX: after picking door 1 of 100, the page interpolates all 98 opened numbers into a sentence. I watched it: “The host opens 98 doors (2, 3, 4, … 24, 26, …).” 1,713 characters. Placeholders were substituted, so qa-walker is required to pass.
• Spec completeness, except insofar as a human later walked the page.
• Whether the skeptic is looking at what the user sees. skeptic’s tools are Read only. The second pass is still source. Footer leak, badge on the wrong doors, 98-number dump, unclickable URL: invisible to it.

“The pipeline cannot validate its own specification” is a choice, not a theorem. A bidirectional check (every visible node at t=0 is listed as visible-at-t=0; every SPEC beat has a walker assertion) would have failed the ungated footer. An orphan-DOM check would have failed the unlinked URL. They already converted the human findings into qa-walker assertions after the fact; the comments in tools/qa-walk.js say so (“Bug fix under test: the footer previously had no .locked gating”). That is the fix. Calling the gap unfixable excuses not putting a spec-auditor in the roster they had already informally used.

Current page: footer gated, colophon is a link, badge only on the picked door. Those four “missed” bugs were real (fix commits ecd7167, e00bb88) and are now patched. The tests that would have caught them were written after they were found.

───

4. Agent definitions: routing ambiguity, unenforceable “absolute” ownership, contracts that don’t match

Verified.

• design-reviewer → ui-engineer only (CLAUDE.md step 9). Token-system failures belong to art-director. The written routing table has no DR→AD path. That is the mechanism by which “replace the badge with disabled styling” can be proposed as a UI fix. README says art-director proposed dropping the badge anyway, which means the run did not follow the routing table it publishes.
• qa-walker vs design-reviewer both own “is this color pair in the ledger.” If qa-walker reports a mismatch, the prompt says the orchestrator routes to “ui-engineer or art-director.” That is a guess.
• math-verifier frontmatter: “Do NOT use to judge code style.” Body: mechanical style pass over em dashes. The description that routing reads is in conflict with the job.
• TEAM.md says learning-designer, art-director, and design-reviewer are opus. Agent files and the README table say sonnet. Cost (Opus 6%) fits the agent files (skeptic only). TEAM.md is a stale contract.
• SPEC §4 still documents playRound(doorCount, switchStrategy, rng) without hostMode. Three other files require hostMode.
• Max 1 skeptic round is in CLAUDE.md and the README diagram. SPEC documents four. Unenforceable constraint, and they didn’t follow it.
• File ownership is a prompt. math-verifier and qa-walker have Bash. Nothing in git, the filesystem, or the tool allowlist prevents an edit. “Absolute” is a wish.
• Exclusive write is declared in the owner’s prompt; it is not declared “in both directions” the way LESSONS.md says is mandatory. Other agents are told not to touch some files, not all of them, and not uniformly.

The contrast-line grammar and the _assert shape are duplicated in both ends of those pairs. That part of the playbook was actually done.

───

5. The 49% orchestrator figure cannot support the conclusion drawn from it

Verified as a single-run measurement; the interpretation is not.

Seven subagents are listed. They sum to 51%. sim-engineer is missing. Either its usage is in the 49% “orchestrator” bucket (which would mean simulation work ran in the main thread, against policy) or the breakdown is incomplete. I cannot tell which. Suspected: some of the 49% is mis-attributed specialist work.

48.8M Sonnet cache reads vs 677k uncached input is the actual shape of the cost: a long-lived coordinator rereading itself. LESSONS.md’s mitigation is “compact between phases.” The run being reported is the one that didn’t.

There is no control session. “A single well-prompted session would have cost a small fraction” is a belief. Wall clock 17h24 vs API 2h23 is mostly human gates, not agent coordination; using it as pipeline overhead mixes waiting with tokens.

49% is consistent with “we didn’t compact, and we kept every delegation in one thread.” It is not evidence that eight specialists intrinsically cost 2× their own work.

───

6. Pedagogy: it argues with a probabilist, then tells a 50/50 reader the answer before the proof

Verified on the live page.

Beat 1, before any play, after I locked in “50/50”:

That forced choice, across the three equally likely starting cases, is the entire reason switching wins 2 of 3 times, coin or no coin.

SPEC §5 forbids asking the reader to accept 2/3 on authority before play, enumeration, contrast, or aggregate. SPEC revision 6 put that sentence in Beat 1 anyway. The number is earned in Beat 3; it is announced in Beat 1.

Beat 3 is 1,553 visible words in one section, no toggle. Nested inside it: 1,133 words of two-route Bayes plus a 265-word biased-host essay (fairnessNote). That is the Morgan / vos Savant-objection material. The 50/50 belief is “two doors left.” The three-case table answers that. Everything after it is for someone who already granted 2/3 in aggregate and is now attacking the conditional. A genuine 50/50 skeptic stops at the 1/6–2/6 tables, or earlier, at being told the answer in the rules.

The 100-door round is the intuition pump that actually moves this audience. It is Beat 5, behind the wall. When you get there, the reveal is a comma-separated list of 98 integers wrapping the paragraph. On a 375px viewport the door grid is still 72×72 cells, ~806px tall, then that list.

Beat 3’s Host A, 500 rounds, on my walk: switch 71.2% / stay 28.8%. Compatible with 2/3 (≈2 SE). To someone who came in at 50/50, it reads as “not 67.” MECH_N = 500 is a persuasion risk they did not treat as one.

stillUnconvinced then reopens the biased-host hole in the last beat: dodging the car isn’t enough, a biased host can still mislead you. A remaining skeptic is handed a reason to keep doubting.

This page can convince someone who already suspects the answer is 2/3 and wants the conditional argument nailed down. That is not the reader the spec names.

───

7. Reproducibility: you can clone the explainer; you cannot run “this pipeline” on another project from what is documented

Verified.

What is here: Monty-specific agent files, a 32-line CLAUDE.md, a checklist in LESSONS.md, verification scripts that parse this repo’s grammar, and a Playwright project under tools/ with an extra npx playwright install chromium gotcha that is at least documented.

What is not: a runner, example invocation prompts, transcripts, a recorded sabotage test, a pinned Node version, a cost log that includes later rounds, a TEAM.md that matches the agents, or a git history of the pipeline. Human approval at step 1 has no rubric.

Porting to another domain means rewriting all eight prompts (they name SPEC.md, Monty beats, hostMode, WCAG ledger grammar, copy.json keys), inventing new contracts, and deciding routing the README itself does not keep consistent. LESSONS.md says the pipeline pays for itself on repeat. This repo is one run.

───

Is the approach worth its cost?

No, not as implemented, and not on this evidence.

The pieces that caught real problems are an adversary with a position, numbers that a script can fail, and a browser walking computed style. None of those require exclusive file ownership or eight processes. Ownership is what created the footer-not-in-SPEC class of bug: verifiers checking a document that nobody was assigned to complete. The 49% orchestrator tax is the price of routing through a main thread that was forbidden to do the work and did it anyway (grep, README, human design veto).

A single session with a hostile reviewer pass and these three scripts would have been the experiment that isolated the variable. This repository reports a team, then estimates the counterfactual.

I would not spend another $32 and 17 hours of wall clock to get this page. I would spend a fraction of that on the skeptic prompt plus test-sim.js / check-claims.js that actually parse the sentences they claim to verify.
