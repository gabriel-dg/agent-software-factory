# SPEC.md — Monty Hall Interactive Explainer
### Pedagogical specification (learning-designer)
### Revision 12: colophon no longer overclaims machine-checking

This document defines the sequence of beats a reader moves through, what each
beat must accomplish psychologically/pedagogically, and what interaction each
beat requires. It contains no code and no implementation detail — art-director,
sim-engineer, and ui-engineer decide how to build each interaction; this spec
decides what it must teach and prove.

All user-facing strings referenced below live in `copy.json`, keyed to match
the beat names used here (e.g. `round3`, `mechanismContrast`). Placeholders in
copy strings use `{{doubleBraces}}` and are listed per-beat under "Dynamic
values needed."

**Revision 2** fixed five persuasion breaks found by skeptic review of v1
(overclaimed/false host-choice framing, an unexplained "odds can't change"
axiom, unfalsifiable win/loss framing, an unresolved mechanism contrast, and
several outright overclaims), landing an enumeration argument for the core
objection ("why doesn't the reveal update my own door's odds too?") in Beat 3.

**Revision 3 (this one)** fixes a subtler, more serious problem a second
skeptic pass found in that Revision 2 enumeration: it explained the reveal's
uninformativeness with a general-sounding law — "an event that was going to
happen either way can't be evidence about which way it actually is" — that is
**false as a general principle** and falls to a straightforward counterexample
(a host who, when he has a free choice of which goat door to open, always
favors the lower-numbered one; his reveal is still "certain either way," yet
which door he opens now leaks real information about the player's door). The
actual mechanism requires one more explicit assumption — **the host breaks
ties uniformly at random** — and revision 3 states that assumption explicitly
everywhere the "why doesn't my door update" argument is made, replacing the
false general law with the correct, narrower one. This revision also fixes an
order-of-magnitude arithmetic error in the 100-door luck estimate, justifies
the three-case table's row split explicitly instead of leaving it to look like
a counting trick, and softens Beat 2's outcome copy so it no longer states the
2/3 figure as settled fact before Beat 3 has earned it. See §7 for the full
list of what changed and why. Beat numbering is unchanged from v1/v2; several
new sub-keys were added under `mechanismContrast.threeCases` in copy.json to
carry the corrected reasoning — see §6.

**Revision 4 (this one)** is a scoped fix for five findings from a third
skeptic pass, all inside Beat 3 (`mechanismContrast`), plus the four dangling
cross-references those findings touch elsewhere on the page. No beat was
added, removed, or reordered. What changed, in brief (full detail in §7):

1. The Route 1/Route 2 arithmetic in `whyYourDoorDoesntMove` was unrenormalized
   — it showed two joint probabilities (1/6, 2/6) that summed to 1/2, not 1,
   with no stated justification for why those were the only two routes or
   why dividing by their sum (rather than by 1) is the correct move. Fixed by
   adding a `workedDivision` string that states plainly these are *joint*
   probabilities (P(starting case) × P(host opens this exact door | that
   case)), states why only two routes are live, and shows the actual division
   producing 1/3 and 2/3.
2. A third starting case — "you had the goat behind the door that actually
   got opened" — was silently omitted from the route comparison, which reads
   to a skeptic as exactly the dropped-case trick the page exists to disprove.
   Fixed by adding it back explicitly as Route 3 in both route tables, with
   its zero-probability reasoning stated as a direct consequence of the
   "host never opens your door" rule (knowing host) or of conditioning on
   "a goat was shown" (random host) — these are different reasons and both
   are now spelled out.
3. The page asserted, without demonstrating, that a knowing host and a random
   host can produce identical visible evidence yet imply different answers.
   Fixed by adding a second, parallel route table (`randomHost`, sibling to
   the renamed `knowingHost`) that runs the identical three-route machinery
   conditioned on "this exact door opened AND showed a goat" for the random
   host, and shows Route 1 = Route 2 = 1/6 (both routes now carry the 1/2
   coin-flip factor, since the random host is never forced), yielding 50/50.
   A `comparisonTakeaway` string states the one-line reason the two tables
   diverge: a forcing rule applied to exactly one live route, not the other.
4. Three places overclaimed the fair coin flip as "the whole reason
   switching wins" or "the entire 2/3 edge": `rules.mechanismCallout.text`,
   FAQ item 1, FAQ item 6. All three now state precisely what the coin is
   and isn't responsible for — it has nothing to do with the aggregate 2/3
   (that's the three-case count, coin or no coin); it's what keeps that same
   2/3 split intact once you condition on which specific door opened.
5. FAQ item 5 pointed at "the next question" for a demonstration that never
   existed there, and three other spots (`round100.oddsCallout`, FAQ item 1,
   `recap.bullets[0]`) asserted "a guaranteed reveal can be evidence, this
   isn't a general rule" with no worked example anywhere on the page. Fixed
   by expanding `whyYourDoorDoesntMove.fairnessNote` into a full worked
   counterexample (a hypothetical host who always opens the lower-numbered
   goat door on a tie) computing two concrete conditional probabilities —
   certain switch-win vs. a diluted 50/50, depending only on which specific
   door he opens — and repointing all four cross-references at it. This
   hypothetical host is explicitly labeled as unsimulated (sim.js only
   supports `hostMode: "knowing"|"random"`) and carries no `_assert`, since
   its numbers aren't independently checkable against sim.js output; it is
   presented as a hand-worked deductive side calculation, the same treatment
   already given to the (also unasserted) intermediate route arithmetic.

**Key-map note for downstream agents:** `mechanismContrast.threeCases.
whyYourDoorDoesntMove` no longer has a flat `routes`/`conclusion`/
`conclusion_assert` shape. It now nests two parallel objects,
`knowingHost` and `randomHost`, each with its own `label`, `routes` (three
entries each, including the zero-probability Route 3), `workedDivision`,
`conclusion`, and `conclusion_assert`; plus a top-level `comparisonTakeaway`
and an expanded `fairnessNote`. **`index.html`'s inline copy block is a
snapshot of a pre-revision-4 `copy.json` and is now stale against this
structure — ui-engineer needs to resync it before the next build pass, this
was not fixed here since index.html is not this agent's file to touch.**

**Revision 5 (this one)** is a compression pass across every beat, prompted
by feedback that the page reads as too long and dense for a reader who wants
to prove the answer to themselves, not read an essay. This revision cuts
words, not arguments. Every argument previously forced in by skeptic review
is still present at full strength: the renormalized route tables (§2b, both
`knowingHost` and `randomHost`), the probability-zero third route in each
table, the parallel random-host route table showing 50/50, the demoted coin
flip (still stated as narrower than "the whole reason switching wins" in
`rules.mechanismCallout`, FAQ item 1, and FAQ item 6), and the worked
biased-host counterexample in `fairnessNote`. No `_assert` value or its
`expected`/`tolerance` was changed, rounded, or softened — only prose was
cut. No beat was added, removed, or reordered, and no key was renamed or
restructured; `copy.json`'s shape is identical to end-of-revision-4.

What changed, mechanically:

1. **Redundant restatement removed.** Many strings said the same fact two or
   three times for emphasis (e.g. "a fair coin flip — not a preference, not
   a pattern, a genuine 50/50" collapsed to "a fair coin flip: a genuine
   50/50, no favorite"). Every fact survives; only the second and third
   restatements of it are gone.
2. **Meta-commentary cut.** Phrases that talked about the argument instead of
   making it ("It's a fair question," "Work it out and there are exactly two
   routes," "Here's exactly why... not a phrase, the arithmetic") were
   removed where the argument itself, stated directly, does the same job in
   fewer words.
3. **Prose that merely narrated an interaction's own output was cut or
   sharply reduced, and the interaction was made to carry that weight
   instead.** This applies specifically to:
   - Beat 2 (`round3.hostKnowledgeReminder`): cut from a ~90-word explanation
     of what the host just did down to a ~35-word pointer. The reveal
     animation itself must now visually mark the reader's own door and the
     prize door as never-eligible at the moment the host opens a door (see
     §3 Beat 2 and §4, updated) — the reader sees the constraint operate
     instead of reading a paragraph asserting that it did.
   - Beat 3 movement 3 (`mechanismContrast.takeaway`): cut from ~110 words to
     ~70. The "rounds get disproportionately deleted" claim is now also
     required to be visible in the run interaction itself — spoiled rounds
     must be visually distinguishable (not just counted) from played rounds
     when Host B runs a batch (see §3 Beat 3 and §4, updated), so the
     survivorship argument is something the reader watches happen, not only
     reads.
   - Beats 4 and 6 (`aggregateStats3.interpretation`,
     `aggregateStats100.interpretation`): cut to one short sentence each. The
     convergence claim ("not drifting toward 50/50, converging on 1/3 and
     2/3") must now be carried primarily by a live-updating display of the
     running win rate as trials accumulate (see §3 Beats 4/6 and §4,
     updated), not by prose describing what convergence looks like.
   - Beat 5 (`round100`): `mechanismCallout` and `oddsCallout` keep their
     full derivations intact (these are proofs, not narration of an
     interaction — cutting them would cut argument, which this revision does
     not do) but lost throat-clearing lead-ins ("Think about what just
     happened:") in favor of stating the derivation immediately.
4. **No em dashes anywhere.** Every "—" in copy.json has been replaced with
   a comma, colon, semicolon, or parentheses, matching the exact wording
   change needed to keep the sentence readable without it. This was a
   mechanical constraint, not a content change, but is recorded here since
   it touched nearly every string in the file.
5. **Numbers untouched.** Every `_assert` sibling key carries the identical
   `doorCount`, `hostMode`, `metric`, `expected`, and `tolerance` values as
   end-of-revision-4. No win rate, odds figure, or trial-count expectation
   was rounded or reworded to sound punchier; the prose around each number
   got shorter, the number did not change.

See §7 for the itemized per-beat word-count accounting.

**Revision 6 (this one)** is a scoped accuracy pass responding to eleven
findings from a fourth skeptic review of the end-of-revision-5 file. No beat
was added, removed, or reordered, and no `_assert` value, `expected`, or
`tolerance` was changed; every fix was to prose that had drifted into overclaim,
vagueness, an unstated rule, or (in one case) a wrong directional claim about
the simulation. Full itemized changelog in §7. In brief:

1. `rules.mechanismCallout` no longer credits the coin with any share of the
   aggregate 2/3 ("that forced choice... is the entire reason switching wins
   2 of 3 times, coin or no coin"); the coin's role is now stated as strictly
   narrower (the specific-door question), matching FAQ item 6.
2. `mechanismContrast.threeCases.conclusion` no longer claims the three-case
   proof "holds no matter which door the host opens" (false; see
   `fairnessNote`'s biased host). It now says the aggregate 2/3 holds
   regardless of the host's tie-break policy, which is the true, provable
   claim, and does not make a conditional-on-door claim at all.
3. The `knowingHost`/`randomHost` route tables' Route 3 rows were never the
   same partition (one is about the reader's own door, impossible by rule;
   the other is about the car's location, excluded by observation). Rather
   than force a false correspondence, the copy now says so explicitly in
   both the `randomHost` Route 3 detail and `comparisonTakeaway`, which no
   longer says "line the two tables up" but instead directs the reader to
   compare Routes 1 and 2 specifically (the rows that do mean the same thing)
   and flags that Route 3 answers a different question in each table.
4. `knowingHost.workedDivision`'s claim that dividing by Routes 1+2's total is
   meaningfully different from dividing by all three ("not all three") was
   vacuous, since Route 3 is zero and the totals are numerically identical.
   That clause is cut; the real justification (the 1/2-overall-chance
   parenthetical) is kept.
5. `mechanismContrast.takeaway` no longer hand-waves with "disproportionately"
   and "delete enough." Verified directly against `sim.js`'s random-host
   branch: when the player started on the car, both non-player doors are
   goats, so Host B can never spoil that round; when the player started on a
   goat, Host B spoils the round exactly half the time (the other half he
   happens to reveal the goat instead). Every spoiled round is therefore a
   round switching would have won; none is a round switching would have
   lost. The copy now states this plainly and it is the actual mechanism,
   not an approximation.
6. `whyYourDoorDoesntMove.fairnessNote` now closes by stating explicitly that
   always-switching still wins the same aggregate 2/3 against the biased
   hypothetical host (per finding 2/§2a: the aggregate proof never depended
   on tie-break policy). Without this, the worked counterexample read as
   evidence that fairness matters for the headline 2/3 number, which it does
   not; it only matters for the specific-door-conditional claim.
7. `round3.hostKnowledgeReminder`'s dangling "with/without it" pronoun
   reference is fixed to name "your own door" and "the car" explicitly, and
   states the invariant (a goat is shown either way) unambiguously.
8. `gutCheckFinal.comparison.stillUnconvinced` no longer rests its closing
   persuasion on "guaranteed, not lucky, to dodge the car every time" — the
   biased-host counterexample in `fairnessNote` is equally guaranteed to
   dodge the car and still produces a conditional 50/50. The closing line now
   rests on the fair coin / equal tie-break specifically, the property that
   actually distinguishes the real host from that counterexample.
9. Added an explicit unconditional-offer rule to `rules.steps`: the host
   opens a door and offers the switch on every round, regardless of what the
   reader picked. This was previously nowhere in the copy and is exactly the
   kind of unstated rule a skeptic primed by `fairnessNote` would suspect.
10. `aggregateStats3.intro` restores a minimal clause bridging the "why should
    I trust the simulator obeys the stated rule" gap ("the host rule you
    already played by hand and proved by enumeration"), without returning to
    pre-revision-5 length.
11. `aggregateStats3.interpretation` no longer asserts a static "not drifting
    toward 50/50," which a reader who just ran a small, noisy batch could
    watch get contradicted in front of them. It now frames the claim around
    what happens as trial count grows, which is true regardless of any one
    small batch's result.

Two implementation concerns raised in this review round are **not** copy
fixes and are recorded as design constraints for art-director/ui-engineer in
§3 Beat 2 and §3 Beat 3 below (and in §4, interaction requirements): a
non-spoiling version of Beat 2's never-eligible-door marking, and a
correction to Beat 3's stated rationale for the spoiled/played visual
distinction (the actual spoil rate matches the 1/3 baseline exactly; it does
not exceed it, and the copy, not the visual, now carries the survivorship
claim about *which* rounds get spoiled).

**Revision 7 (this one)** is a scoped fix for three findings from an external
review of the built page, all independently hand-verified before being routed
here. No beat was added, removed, or reordered, and no `_assert` value,
`expected`, or `tolerance` was changed. In brief:

1. **Revision 6's Route 3 partition was wrong, not just differently framed.**
   `whyYourDoorDoesntMove.knowingHost.routes[2]` had stated Route 3 as "you had
   the goat behind the door that actually got opened" and reasoned about the
   *player's own door*, which is not a member of the partition at all (the
   partition, fixed across all three routes, is "where is the car," not
   "where did the player pick"). Route 3 is now stated correctly on the car's
   location: prior 1/3, the car was behind the door that got opened, joint
   probability 0 because the knowing host is forbidden from opening the car's
   door. This now matches the random-host table's Route 3 row for row, as it
   always should have. `randomHost.routes[2].detail` is rewritten to match: it
   no longer claims it "isn't the mirror" of the knowing host's Route 3, since
   after the fix it is; what's still correctly kept distinct is *why* each
   zeroes out (the knowing host's rule forbids it; the random host's is ruled
   out by what the reader observed, a goat rather than the car). `comparisonTakeaway`
   no longer tells the reader "Route 3 answers a different question... don't
   expect it to line up" (removed entirely, since it's now false); it states
   the tables line up row for row and keeps the takeaway's real payload: the
   knowing host's Route 2 has no coin flip so it's worth twice Route 1 (2/6 vs
   1/6), the random host's Route 2 gets the same coin as Route 1 so they're
   equal (1/6 and 1/6). **Revision 6's log item 3 below, which recorded the
   wrong partition as a deliberate design decision, is superseded and has been
   annotated in place rather than silently rewritten; see the correction note
   attached to it.**
2. **A multiplication was misstated as its answer in different units.**
   `knowingHost.routes[1].detail` said "Joint probability: 1/3 x 1 = 2 in 6,"
   but 1/3 x 1 is 1/3, not "2 in 6"; the sixths figure is 1/3 rewritten on a
   common denominator, not the product itself, and the old phrasing collapsed
   the two steps into one false-looking equation. Fixed by stating the product
   honestly (1/3 x 1 = 1/3) and then, as a separate sentence, converting it to
   2/6 for comparison with the other rows. Every other route detail in both
   tables was checked for the same defect; none had it (Route 1's "1/3 x 1/2 =
   1 in 6" is a genuine multiplication and needed no change).
3. **Beat 1 stated the 2/3 win rate as settled fact before any beat had earned
   it.** `rules.mechanismCallout.text` claimed the host's forced choice "is the
   entire reason switching wins 2 of 3 times." Beat 1 is a static read: the
   reader has not yet played (Beat 2), seen the three-case enumeration (Beat
   3), or watched an aggregate (Beat 4). §5 already forbade exactly this
   ("no beat should ask the reader to accept the 2/3 figure on authority alone
   without either playing it, watching it converge, seeing the mechanism
   contrast, or working through the enumeration"), and separately forbade
   Beat 2 from stating the fraction, which made stating it a beat earlier
   worse, not better. Resolved by removing the win-rate number from Beat 1:
   the callout's real job, making the host-knowledge rule unmissable, does not
   need the number to do that job, and §5's existing rule is left standing
   as written rather than carved out an exception for this copy. The callout
   now says the forced choice "is why switching has the edge over staying,"
   with the exact figure deferred to where it's actually proven.

**Revision 8** is a documentation-only correction to §4: this document had
drifted from `sim.js`'s actual exported signatures, restating
`playRound`/`runTrials` without the `hostMode` parameter that both functions
actually require, and carrying a stale caveat warning that no host-randomness
parameter existed. `sim.js` was never wrong; this file was. Both signatures
are corrected to include `hostMode` (`"knowing"|"random"`) in its real
position, and the stale caveat is replaced with a statement of the actual
contract. No beat, `_assert` value, or `copy.json` content changed. Full
detail in §7.

**Revision 9 (this one)** fixes a canonical-argument drift in §2b that a
second external audit caught: §2b's "corrected argument" still presented
"the player's own door has the car" and "the other closed door has the car"
as **exactly two routes**, the two-route version that revision 4 through 7
already superseded on the built page and in `copy.json`, where
`whyYourDoorDoesntMove` has carried a three-route partition (adding the
car-behind-the-opened-door route, joint probability 0) since revision 7.
Revision 7's own changelog noted this gap and left it unfixed ("§2b's
'exactly two routes' derivation only ever discussed Routes 1 and 2 and never
characterized Route 3, so it required no change"); that was true of the
narrow finding revision 7 was scoped to, but it left the canonical section
stating an argument the shipped page no longer makes, which is exactly the
kind of drift a downstream agent reading only §2b (not the changelog) would
reproduce, and exactly the dropped-case shape a skeptic pass once flagged as
the trick the page exists to disprove. §2b's corrected argument now states
the three-route partition (car behind the player's door, car behind the
other closed door, car behind the door that got opened, the last one zero
because a knowing host is forbidden from opening the car's door) as the
argument to reproduce, absorbing rather than replacing the two-route
reasoning: the same 1/6, 2/6, and 1-to-2 ratio are still there, now sitting
inside a partition that sums to 1 (well, to 1/2, the overall chance this
specific door opens at all, with the two live routes and the zero route
accounting for all of it) instead of silently omitting a third case. No
beat, `_assert` value, or `copy.json` content changed; `copy.json` is
explicitly out of scope for this round. Full itemized changelog in §7.

**Revision 10 (this round)** is the load-state visibility contract plus the
§6 key-map fix, both prompted by the same QA census of what is actually
rendered on the built page. First, a human found that `<footer
id="site-footer">` was never gated by this spec at all: every teaching beat
is deliberately hidden until the reader unlocks it, but nothing here ever
said the footer had to follow that rule, so it rendered immediately under
the opening poll and the reader saw the host-knowledge rule and the
colophon before answering Beat 0's question. That bug is already fixed in
`index.html`; this revision's job is to make the class of defect
mechanically checkable going forward, not to describe a live bug. A new,
deliberately unnumbered "Visible at t=0" section (placed between §4 and
§5, so the existing numbered cross-references to §5/§6/§7 elsewhere in this
document keep pointing at the right sections) now states exactly which
top-level regions are visible on load and which are not, in a format
`tools/qa-walk.js` parses mechanically, so a future regression of this exact
shape fails automatically instead of waiting for a human to notice. Second,
the same census found that §6's copy.json key map listed 13 top-level keys
where the real file has 14: `colophon` (the credits/meta paragraph about how
the page itself was produced, rendered into `#colophon-text` inside the
footer) was never in the map. This is the identical omission shape as the
footer finding, a real thing on the page this spec never mentioned, and is
fixed by adding it to §6 in its correct position. No beat was added,
removed, or reordered; no copy key's content changed; `copy.json` was not
opened or modified this round; no `_assert`, `expected`, or `tolerance`
value was touched. Full detail in §7.

**Revision 11 (this one)** is a scoped addition of a specimen-framing
banner, visible at t=0 above the on-page title. This is not a teaching
beat and must not assert 2/3 or any other odds figure. No beat was added,
removed, or reordered. The on-page H1 (`meta.title`) stays "The Monty Hall
Problem"; `meta.subtitle`, `meta.intro`, and `colophon` were not changed
in that round. A new top-level copy key, `studyBanner`, carries the banner
sentence, two external-link labels and URLs (report and external review),
and the browser document/tab title. `#study-banner` is added to the Visible
on load list as a top-level region, not nested inside `#meta-title`. See §7
for the itemized changelog.

**Revision 12 (this one)** is a scoped rewrite of `colophon.text` only.
No beat was added, removed, or reordered. `studyBanner`, `meta`, `footer`,
and every teaching-beat string are unchanged. The previous colophon claimed
that every number on the page is checked against a running simulation by an
agent that did not write it, and pointed at the old repository URL
(agent-software-factory). Both are false: not every number is
machine-checked (the report says which are), and the repo is now
https://github.com/gabriel-dg/multi-agent-pipeline-study. The new colophon
states, in plain language, that this page is the test article of the
pipeline study and that not every number is machine-checked. `#colophon-text`
and `#site-footer` stay in "Not visible on load"; colophon is not added to
Visible on load. See §7.

---

## 1. Audience and core failure mode

The target reader is an intelligent skeptic who currently believes the answer
is 50/50 and suspects "2/3" is a word trick or a statistics gimmick. This
reader will not be moved by being told they're wrong, by a bare probability
tree, by a single lucky/unlucky round of play, or by any claim — however true
the underlying idea — that is stated as an unexplained axiom or that
overreaches what the evidence actually shows. A skeptic who catches the page
in one overclaim will (correctly) discount everything else on it. They will
be moved by:

1. Playing the game themselves and having their gut reaction violated by
   repeated outcomes.
2. Seeing, explicitly and undeniably, the one fact that breaks their mental
   model: **the host is not adding random information about the player's own
   door.** Concretely: two-thirds of the time the player's opening pick is
   already a goat, and the host has exactly one legal door left to open; the
   other third of the time the player's pick is the car and the host has a
   genuine free choice between two goat doors, which he resolves with a
   **fair coin flip**. What never varies across all three cases is that a
   goat is revealed with certainty — the host's behavior toward the player
   never depends on what is specifically behind the player's own door. That
   invariant — not "the host never has a choice," which is false a third of
   the time — is necessary, but (revision 3 correction) **it is not
   sufficient by itself**: certainty-of-reveal alone does not rule out the
   specific door opened from leaking information (a host with a biased
   tie-break would still reveal a goat with certainty, yet the door he
   chooses would leak information). The fairness of the coin flip is the
   second, equally load-bearing piece, and both pieces together must be
   walked through as an explicit enumeration (not a metaphor) somewhere
   central. Every other piece of the explainer is scaffolding around this
   one idea.
3. Seeing the effect amplified at a scale where 50/50 intuition becomes
   obviously absurd (100 doors), then having that amplified intuition
   walked back down to the 3-door case they started with.

A skeptical reader also audits *tone*, not just content: language that treats
a "wrong" outcome as proof of the mechanism and a "right" outcome as mere
luck (heads-I-win-tails-is-chance framing) reads as rigged, even when the
underlying math is correct. Every outcome message in this spec must be
symmetric — honest about what a single round can and can't prove — regardless
of which strategy happened to win that round.

## 2. Non-negotiable mechanism (read this before building anything)

### 2a. The three cases — the canonical argument, reuse verbatim

There are exactly three equally likely situations the moment the player
picks a door. This enumeration is the actual proof and must appear, worked
through explicitly, in Beat 3 (`mechanismContrast.threeCases` in copy.json),
and must be referenced (not re-derived differently) by every other beat or
FAQ item that touches "why doesn't my door's probability change":

| Case (each 1/3 likely) | What the host can do | If the player switches |
|---|---|---|
| Player picked the car | Both other doors are goats. The host has a **free choice** between them — the only case where he does — and he breaks that choice with a **fair coin flip**. | Switches away from the car. Loses. |
| Player picked Goat A | The only doors left are Goat B and the car. He cannot open the car, so he **must** open Goat B. No choice. | The only door left is the car. Wins. |
| Player picked Goat B | The only doors left are Goat A and the car. He cannot open the car, so he **must** open Goat A. No choice. | The only door left is the car. Wins. |

Switching wins in 2 of these 3 equally likely cases. That is the entire
proof that switching wins 2/3 of the time **in aggregate**. No formalism, no
code, no trust required — a reader can verify it by enumeration alone, and
notably this part of the argument is robust: it holds no matter how the host
breaks ties in the free-choice row, biased or not, because it never
conditions on which specific door got opened.

**Why the row split is not a counting trick (must be stated, per revision
3):** a skeptical reader's first suspicion on seeing "Goat A" and "Goat B"
as separate rows is that the page split one case into two to inflate the
count. State explicitly why that's wrong: there are three physical doors and
the car is behind exactly one of them, so before the player picks there are
exactly three equally likely, genuinely distinct configurations — "the car is
behind the door you'll pick," "goat A is," "goat B is." Nothing is being
divided to make the arithmetic come out right; the three rows are just the
three doors, named by what's behind them. `mechanismContrast.threeCases.note`
in copy.json carries this justification, and FAQ item 1 must justify its
"combined" phrasing for the two-goat case the same way, not just assert it.

**Important scope note added in revision 3:** the three-case table above
proves the *aggregate* 2/3 win rate for an always-switch strategy, and that
proof needs nothing beyond the table — it does not depend on the tie-break
rule at all. A separate, harder question — addressed in §2b below — is
whether the *specific* door the host opens on any single round leaks
information about the player's own door. That question **does** depend on
the tie-break rule, and conflating the two arguments is exactly the mistake
Revision 2 made.

### 2b. Why the original pick's odds don't move — corrected in revision 3

**This section was wrong in revision 2 and has been rewritten. Read the
correction below before writing or reviewing any copy that touches this
claim anywhere on the page.**

Revision 2 answered the reader's strongest objection ("my door was 1-in-3
before, why doesn't the reveal update my door's odds too?") with this
reasoning: *the host reveals a goat with certainty either way, so the reveal
carries zero information about the player's own door.* A second skeptic pass
broke this. It is **false as a general law**. Counterexample: suppose the
host, whenever he has a free choice between two goat doors, always opens the
lower-numbered one. He still "reveals a goat with total certainty either
way" — nothing about that invariant has changed. But now the specific door
he opens **is** informative: seeing him open the higher-numbered door proves
with certainty the player didn't have the car (he'd never voluntarily open
it), while seeing him open the lower-numbered door is now weaker evidence
than it should be, because it's consistent with both the forced case and his
biased free choice. A "certain reveal" can leak information through *which*
door gets opened, depending on how ties are broken. Revision 2's phrasing
("an event that was going to happen either way can't be evidence") does not
rule this out and must not appear anywhere in copy again.

**The missing, load-bearing assumption:** the host breaks ties **uniformly
at random** — a fair coin flip — whenever he has a free choice (i.e.
whenever the player picked the car). This is not a new rule invented to
patch the argument; it was already implicit in `sim.js` (which shuffles the
tied candidates) and already stated honestly in
`round3.hostKnowledgeReminder`, but it was **not** stated as a load-bearing
assumption anywhere the "why doesn't my door update" claim was actually made
— that gap is what revision 3 closes. `rules.steps` must state this rule
explicitly and it must not be contradicted elsewhere (revision 2's
`rules.steps[4]`, "What he opens is decided by that rule, not by chance," was
simply false 1/3 of the time and has been rewritten).

**The corrected argument**, which must appear in full (not summarized away)
in `mechanismContrast.threeCases.whyYourDoorDoesntMove`, and be referenced
(not re-derived differently) everywhere else the claim recurs:

Hold the player's pick fixed and condition on the one specific door the host
actually opened. The partition is fixed across the whole argument, where is
the car, and it has exactly three members, one per door. Two of the three
routes carry weight; the third must still be stated, not dropped, because a
skeptic who notices a missing case will (correctly) suspect the same
dropped-case trick this page exists to disprove:

- **Route 1: the car is behind the player's own door.** Prior odds 1/3.
  Given that, the host still had to pick between two goat doors, and the
  fair coin sends him to this exact door only half the time. Joint
  probability: 1/3 x 1/2 = **1/6**.
- **Route 2: the car is behind the other closed door.** Prior odds 1/3.
  Given that, the host had no choice, exactly one legal door, and it
  happened to be this exact one. Joint probability: 1/3 x 1 = **1/3**. Note
  this is a multiplication (1/3 x 1) followed by a separate unit conversion
  to a common denominator with Route 1 (1/3 = 2/6); do not collapse the two
  steps into "1/3 x 1 = 2/6," which states a true number as the answer to a
  multiplication it is not the answer to.
- **Route 3: the car is behind the door that actually got opened.** Prior
  odds 1/3. Joint probability: **0**, because a host who knows where the car
  is never opens the car's door, full stop; this is a direct consequence of
  the host rule stated in Beat 1, not a special case invented for this
  argument.

The three joint probabilities are the whole partition and must sum to the
overall chance this exact door gets opened at all: 1/6 + 2/6 + 0 = 3/6 =
1/2. Dividing each route by that total gives the posteriors conditional on
having seen exactly this door opened: 1/3 that the player's own door has the
car, 2/3 that the other closed door does.

Route 2 is twice as likely as Route 1, **no matter which specific door
actually got opened** (the arithmetic is symmetric in "lower door opened" vs
"higher door opened" precisely because the coin is fair). That 1-to-2 ratio
between the two live routes is what makes the player's door 1/3 and the
other closed door 2/3, *even conditional on having seen exactly which door
opened*, which is the stronger, correct version of the claim revision 2 was
reaching for. Route 3 contributes nothing to that ratio; its job in the
argument is different, it is the case a dropped-case objection would point
to, and it must be shown to come out to exactly zero for a stated reason (the
host rule), not silently omitted.

**Where the fairness is load-bearing, stated concretely:** if the coin were
biased (e.g. always favors the lower-numbered door on a tie), Route 1 would
no longer split evenly between "opens lower" and "opens higher" — it would
dump its full 1/3 weight onto "opens lower" and none onto "opens higher."
Then seeing the host open the higher door would make Route 1 impossible
(certain win from switching), while seeing him open the lower door would
make Route 1 twice as likely relative to Route 2 as it should be (player's
door odds rise to 1/2, not 1/3). This worked failure case is what makes the
fairness requirement legible rather than an arbitrary technicality, and a
short version of it belongs in the copy (`whyYourDoorDoesntMove.fairnessNote`)
so the reader sees the counterexample defused, not just asserted away.

Any copy that states "the original pick's odds can't change" or "a
guaranteed event can't be evidence" without this reasoning attached (or a
direct pointer to where it was already given) is an unexplained — and in the
"guaranteed event" phrasing's case, **false** — axiom to a skeptical reader
and must be avoided. This applies to `recap.bullets[0]`, `round100.oddsCallout`,
and FAQ items 1, 5, and 6 — all were flagged across two review rounds and
have been rewritten (see copy.json) to state the corrected reasoning inline
or point directly to `mechanismContrast.threeCases.whyYourDoorDoesntMove`.

### 2c. Guardrails on overclaiming (revision 2), plus correctness guardrails (revision 3)

- Never claim the host "couldn't have done X by luck." He could — it's just
  unlikely. **Correction (revision 3):** revision 2 quantified the 100-door
  case as "roughly a 1-in-2^98 event," which is wrong by about 28 orders of
  magnitude — it wrongly modeled each of the 98 door-openings as an
  independent coin flip. The correct figure: a blind host who opens 98 of
  the 99 non-player doors at random dodges the car in exactly two ways —
  either the player's own door has the car (1/100), or the car happens to be
  behind the one specific door the blind host randomly left closed instead
  of opening (also 1/100, since a random leftover door among 99 lands on the
  car's actual door with probability 1/99, and 99/100 × 1/99 = 1/100). Sum:
  1/100 + 1/100 = 2/100 = **1/50, about 2%**. (Sanity check against the
  3-door case, which already correctly states this: a blind host at 3 doors
  reveals the car outright about 1/3 of the time, i.e. dodges 2/3 of the
  time; the general formula is dodge-probability = 2/N, which gives 2/3 at
  N=3 and 1/50 at N=100 — consistent.) State it as "about 1 in 50," not
  "essentially never" or "impossible," and attribute the actual guarantee to
  the *rule* the host follows, not to luck running out. `round100.mechanismCallout`
  carries this corrected figure and the two-routes reasoning behind it.
- Never claim switching wins "every time," "100 out of 100," or similar at
  any point in the copy, including celebratory closing lines. Switching
  loses about 1 in 3 rounds at 3 doors and about 1 in 100 at 100 doors — the
  reader will have personally experienced some of those losses, and a false
  claim in the closing beat is the worst possible place for the page to lose
  credibility.
- Never answer "does it matter which door I picked" with "by symmetry" alone
  — that is exactly the formalism hand-wave this spec otherwise warns
  against. State concretely *why* the symmetry holds (no information
  distinguishes doors before picking; the host's rule refers to "the
  player's door" and "the car's door," never a door number).
- Never frame a single round's outcome so that a win for one strategy is
  "real" and a win for the other is "just luck." A single round is weak
  evidence for either strategy regardless of which one wins it; say so
  symmetrically, every time, and point to the aggregate beats (4 and 6) as
  where real evidence accumulates.

## 3. Beat sequence

Each beat lists: **Goal** (what belief must change), **Why here** (sequencing
rationale), **Interaction** (what the reader must be able to do), **Exit
state** (what the reader should believe/know before moving on).

---

### Beat 0 — Cold open / gut-check poll
**copy key:** `gutCheckInitial`

- **Goal:** Get the reader to publicly (to themselves) commit to an answer
  before any argument is presented. This creates the belief-change to
  measure later and primes the "prove me wrong" stance that makes the later
  reveal land harder.
- **Why here:** Must be first. No priming, no framing — just the classic
  problem statement and an immediate ask for a gut answer.
- **Interaction:** Present the problem statement. Reader selects one of:
  "It's 50/50," "Stay wins more," "Switch wins more," "Not sure." Selection
  is stored for later comparison in Beat 9; no correctness feedback is given
  here.
- **Exit state:** Reader has committed to an answer and is now invested in
  finding out if they were right.

---

### Beat 1 — The rules, stated precisely
**copy key:** `rules`

- **Goal:** Establish the exact rules of the game, with the host's
  constrained behavior stated as a numbered, unmissable rule — not folded
  into flavor text.
- **Why here:** The mechanism must be stated as a rule *before* the reader
  plays, so that when they play, they can watch the rule apply in real time
  in Beat 2, rather than reconstructing the rule after the fact.
- **Interaction:** Static read (no play yet). Rules presented as a short,
  numbered list ending on the host-knowledge rule, visually set apart from
  the others (ui-engineer/art-director discretion on treatment, but content
  order requires the host rule to be last and distinct, since last-read
  items are best retained).
- **Exit state:** Reader can restate: "there are 3 doors, 1 prize, I pick
  one, the host — who knows where the prize is — always opens a different
  door that is a goat, then I get to stay or switch." Additionally (new in
  revision 3, since it is load-bearing for §2b), reader has been told, as an
  explicit rule and not left to infer it: the host is forced to a single
  legal door 2/3 of the time, and on the 1/3 of rounds where he has a free
  choice between two goat doors, he picks between them with a **fair coin
  flip**. `rules.steps` must state this precisely and must not claim
  anywhere that "what he opens is decided by that rule, not by chance" — in
  the free-choice case it partly *is* decided by chance, and that fact is
  required later, not a contradiction to paper over.

---

### Beat 2 — First playable round (3 doors, single play)
**copy key:** `round3`

- **Goal:** Let the reader personally experience the rule from Beat 1 in
  action, and immediately after the host's reveal, flag the one invariant
  that matters — **a goat was guaranteed no matter what's behind the
  reader's own door** — without overclaiming that the host was always
  "forced." (He's forced 2/3 of the time; he has a free choice between two
  goats the other 1/3. Both cases still guarantee a goat. This distinction
  must be preserved — see §2a.)
- **Why here:** Immediately after rules, before any statistics, so the
  reader's very first play is already tagged with the real invariant, not a
  neutral game round, and not an overstated one either.
- **Interaction:**
  - Reader picks 1 of 3 doors.
  - Host opens one of the remaining two doors, showing a goat. This call
    must use the constrained host behavior (never the player's door, never
    the prize door).
  - **Before** asking to stay/switch, the reveal itself must visually mark
    the reader's own door and the prize door as doors the host was never
    allowed to open — a highlight, label, or equivalent visual treatment at
    the moment of the reveal (art-director/ui-engineer discretion on exact
    treatment). **Revision 5:** this visual is now load-bearing, not
    decorative — it is what makes the constraint legible, so the
    accompanying copy (`round3.hostKnowledgeReminder`) has been cut down to
    a one-line pointer and must not be expanded back into a paragraph that
    re-explains what the reader can already see happen. The copy still must
    not claim the host "had no other choice" as a blanket statement; it must
    stay honest, briefly, that a free-choice case exists. Full reasoning for
    why it matters comes next (Beat 3).
  - **Design constraint, revision 6 (flagged by skeptic, unresolved — escalated
    to art-director/ui-engineer, not a copy fix):** marking "the reader's own
    door and the prize door" as never-eligible must not, by the way it is
    rendered, reveal *where the prize actually is* before the reader makes
    the stay/switch choice. A naive treatment (e.g. visually distinguishing
    "a door that has the prize" from "a door that doesn't" at reveal time)
    spoils the round instantly for the 1/3 of readers who picked the car,
    since it would show them the prize is behind their own door before they
    decide whether to switch away from it. The required visual instead needs
    to mark a *category* — "doors the host was structurally forbidden to
    open" (the reader's own door plus whichever door holds the prize, as a
    pair) — without disclosing which one, if either, is the prize door. One
    way to satisfy this: mark both the reader's own door and the host's
    opened door as "ruled out by the rule," without marking the prize door
    specifically at all until after the stay/switch decision resolves. SPEC
    does not prescribe the exact treatment; it prescribes the constraint that
    whatever is shown must not let the reader infer, before they choose,
    whether their original pick was the prize.
  - Reader chooses to stay or switch.
  - Result is revealed (prize or goat behind the final chosen door), with
    outcome-specific feedback copy. **All four outcome messages (win-stay,
    lose-stay, win-switch, lose-switch) must be tonally symmetric**: each
    acknowledges what actually happened, and each notes — evenly, not just
    on the outcomes that are inconvenient for the thesis — that one round
    isn't proof of which strategy is better, pointing to Beat 4 for the
    real evidence. No outcome should be explained away as "chance" while a
    different outcome is credited to "design." **Added in revision 3: none
    of the four outcome messages may state the 2/3 figure (or any precise
    win-rate fraction) as settled fact.** Beat 3 is what earns that number;
    stating it here is asserting the conclusion before its own proof. Use
    softer forward-pointing language instead — e.g. "switching tends to win
    more often — you'll see exactly why and by how much next" — rather than
    "switching wins about 2 out of 3." (Revision 2's `resultLoseSwitch`
    stated the fraction outright; this has been fixed.)
  - Reader may play again (loops back into Beat 2 or forward into Beat 3 —
    see Beat 3 entry condition).
- **Exit state:** Reader has completed one full round, understands a goat
  was guaranteed regardless of their own door, and has not been given a
  falsifiable-only-in-one-direction explanation of their result.
- **Dynamic values needed:** door count (3), which door was picked, which
  door the host opened, which door was switched to (if switched), win/lose
  outcome, running counts if the UI chooses to keep them visible from the
  first round.

---

### Beat 3 — The mechanism, in full: the three cases, then the contrast
**copy key:** `mechanismContrast`

- **Goal:** This is the beat that must land the hardest idea in the whole
  piece, and it now does so in **three movements** (revision 3 adds the
  middle one; movements 1 and 3 are unchanged from revision 2's structure):
  1. **The three-case enumeration** (§2a) — laid out explicitly, as a table
     or equivalent, so the reader can verify "switching wins 2 of 3 equally
     likely cases" themselves, with no metaphor and no probability
     formalism. This proves the *aggregate* 2/3 figure and needs nothing
     beyond the table (`mechanismContrast.threeCases.rows` +
     `threeCases.conclusion`).
  2. **"Doesn't the specific door tell me something?" — the corrected
     deeper answer** (§2b, new in revision 3): a careful skeptic's next
     question is not answered by movement 1 alone, because movement 1 never
     conditions on which specific door the host opened. This movement must
     state, explicitly and in full (not summarized or cut for length): the
     host's fair-coin tie-break rule, the two-routes comparison showing a
     1-to-2 ratio survives no matter which specific door opens, and the
     worked failure case showing what breaks if the tie-break were biased.
     This is carried by `mechanismContrast.threeCases.tieBreakRule` and
     `threeCases.whyYourDoorDoesntMove` in copy.json. **This movement is
     required content, not optional depth** — a second skeptic pass failed
     the page specifically because this reasoning was missing, so it must
     not be cut, though ui-engineer/art-director may choose presentation
     (e.g. an expand/toggle immediately following the three-case table) as
     long as the full text is reachable without leaving Beat 3.
  3. **The random-host contrast** — what happens when the host's behavior
     stops being certain-regardless-of-the-player's-door. This is not
     decoration; it is the proof that the enumeration in movement 1 actually
     depends on host knowledge, by showing what breaks when that knowledge
     is removed.
- **Why here:** Right after the reader's first hands-on round, while the
  "the host skipped my door and skipped the prize" experience is fresh, and
  before any aggregate statistics are shown — the reader should understand
  *why* the numbers will come out 2/3 before they watch the numbers arrive.
- **Interaction:**
  - Static enumeration table/walkthrough of the three cases (movement 1),
    interaction-free — this is a read, not a simulation, because its whole
    power is that it needs no simulation to be true.
  - Static walkthrough of the two-routes comparison and fairness explanation
    (movement 2), also interaction-free and also true by enumeration alone —
    no simulation needed, though a math-inclined reader could verify it
    against `sim.js`'s tie-break behavior if curious.
  - Two side-by-side (or toggled) simulated modes, both run over many
    simulated rounds so the reader sees an aggregate outcome, not one
    anecdote (movement 3):
    - **"Knowing host"** mode: host always avoids the prize and the player's
      door (the real game). Aggregate result: switching wins ~2/3 of the
      time.
    - **"Random host"** mode: host opens one of the two remaining doors at
      random, with no knowledge of the prize. In this mode the host will
      sometimes reveal the prize outright (round is voided/ends early — the
      "trick" collapses), and in the remaining rounds where the host
      happens to reveal a goat, switching and staying win equally often
      (50/50). This is the well-known "Monty Fall" contrast.
    - Reader should be able to run both modes and see the aggregate win-rate
      numbers side by side.
    - **Revision 5:** when Host B (random) runs a batch, spoiled rounds
      (the ones where he accidentally revealed the prize) must be visually
      distinguishable from played rounds in the result display, not folded
      silently into a single count.
    - **Revision 6 correction (flagged by skeptic):** revision 5's rationale
      for this visual was wrong and is replaced here. It previously claimed
      spoiled rounds would appear at "a visibly larger share... than the 1/3
      baseline" — this is false. The actual spoil rate **is** 1/3
      (`randomHostDescription_assert`: `prizeRevealed`, expected 0.3333 at
      doorCount 3), matching the baseline exactly, not exceeding it; the
      previous rationale also mis-attributed the baseline to "player already
      had the car," when in fact (verified against `sim.js`'s random-host
      branch) spoiling can *only* happen when the player started on a goat —
      when the player started on the car, both non-player doors are goats
      and Host B can never reveal the prize that round. So spoiling is not
      "more common than expected"; it is exactly as common as expected, and
      it draws exclusively from the "switching would have won" pool. Do not
      build or justify the spoiled/played visual distinction on a claim that
      spoiled rounds occur at an elevated rate — they don't.
    - The visual distinction between spoiled and played rounds is still
      required (readers must be able to see that spoiling happens at all,
      and roughly how often), but it does not by itself convey *which*
      rounds get spoiled (i.e., that spoiling only ever removes
      "switching-would-have-won" rounds, never "switching-would-have-lost"
      rounds). That claim is carried by copy instead: `mechanismContrast.
      takeaway` (revision 6) now states this mechanism plainly and
      concretely — no rounds where the player started on the car are ever
      spoiled, and half of the rounds where the player started on a goat are
      spoiled — so art-director/ui-engineer are not required to build a
      visual that separately proves *which* rounds were spoiled; the spoiled
      count/highlight plus the takeaway copy together carry the full claim.
  - The takeaway copy connecting movements 1/2 and movement 3 must explain
    the random host's 50/50 result *mechanically*, using the same three
    cases: in the
    two cases where the player started on a goat (the cases where switching
    wins), a host who doesn't know only dodges the car by a coin flip
    instead of a certainty, so half of those cases get thrown out
    (round spoiled) instead of surviving to be played. Throwing out half of
    "switching would have won" rounds, while never throwing out any
    "switching would have lost" rounds, is what drags the survivors back to
    50/50. This is the fix for the v1 "packed with information" hand-wave —
    the explanation must be traceable to the enumeration, not a new
    metaphor.
- **Exit state:** Reader can walk through the three cases unprompted and
  explain, in their own words, (a) why switching wins 2 of 3 cases, (b) why
  that edge specifically requires the host to know where the car is —
  because a host who doesn't know can't guarantee dodging the car in the two
  cases that matter, and the rounds where he fails to dodge it are exactly
  the rounds that would have favored switching — and (c), new in revision 3,
  why the *specific* door the host opens still doesn't tell the reader
  anything extra about their own door, in terms of the fair coin flip and
  the two-routes comparison, not in terms of "a certain event can't be
  evidence" (which the reader should now recognize as false in general).
- **Dynamic values needed:** per-mode trial count, per-mode stay-win %,
  per-mode switch-win %, count of "host accidentally revealed the prize"
  rounds in random mode (this number should be surfaced — it is the
  dramatic proof that the two hosts are not equivalent).

---

### Beat 4 — Aggregate statistics, 3 doors
**copy key:** `aggregateStats3`

- **Goal:** Move the reader from "I understand why it should be 2/3" to "I
  have run enough trials myself that the 2/3 number is empirically
  undeniable," using the real game (knowing host) exclusively now — no more
  random-host toggle, that job is done.
- **Why here:** After the mechanism is understood (Beat 3) via enumeration
  and contrast, aggregate numbers are no longer "trust me" or even "here's
  why" — they're "and here's the same rule, run at scale, matching the
  prediction."
- **Interaction:** Reader triggers batches of automated trials (e.g. run
  10 / 100 / 1000 rounds) using the always-switch and always-stay
  strategies, and watches a running win-rate counter converge toward 1/3
  (stay) and 2/3 (switch). **Revision 5:** this live-updating counter (or
  equivalent running display) is now the primary carrier of the convergence
  claim — `aggregateStats3.interpretation` has been cut to one short
  sentence on the expectation that watching the number settle does the
  persuading, not a paragraph describing what settling looks like. Copy
  should still note this is the exact same host rule already played by hand
  and enumerated in Beat 3, not a new or different procedure — this
  directly addresses the "I can't audit the code" concern by tying the
  automated trials back to a rule the reader has already verified by hand
  and by enumeration.
- **Exit state:** Reader accepts the 2/3 figure as an empirical fact they
  personally generated, consistent with the reasoning from Beat 3, not just
  a claim.
- **Dynamic values needed:** trial count selected, stay win %, switch win
  %, raw win/loss counts.

---

### Beat 5 — Escalate to 100 doors
**copy key:** `round100`

- **Goal:** Make the mechanism impossible to dismiss by scaling it up:
  when 1 door is picked out of 100 and the host — still bound by the same
  knowing, constrained rule — opens 98 goat doors, leaving exactly one
  other closed door, the reader should feel viscerally that the remaining
  door is almost certainly the prize.
- **Why here:** Placed after the reader already trusts the 3-door
  mechanism and the 2/3 number, so the 100-door round reads as
  confirmation/amplification, not a new unrelated puzzle.
- **Interaction:**
  - Reader picks 1 of 100 doors.
  - Host opens 98 of the remaining 99 doors, all goats, using the same
    constrained rule (never the player's door, never the prize).
  - A callout explicitly reconnects to the mechanism: the host's 98 skips
    are unlikely to be luck (not impossible — quantify it correctly, about
    1 in 50, ~2%, via the two-routes derivation in §2c, not the
    order-of-magnitude-wrong "1-in-2^98 coin flip" framing revision 2 used)
    and are instead guaranteed by the rule he follows.
  - A second callout states *why* the player's own door's odds didn't move,
    using the corrected §2b reasoning (the 100-door analog of the
    fair-tie-break two-routes argument — see `round100.oddsCallout`), not
    an unexplained "your pick can't change" assertion and not the false
    "certainty means no evidence" generalization.
  - Reader chooses to stay or switch between their original door and the
    single remaining unopened door.
  - Result revealed with outcome copy, tonally symmetric per the Beat 2
    guardrail.
- **Exit state:** Reader intuitively feels that their original 1-in-100
  pick was almost certainly wrong, and can state *why* in terms of the
  corrected §2b reasoning, not just accept a bigger, more dramatic version
  of an unexplained (or false) claim.
- **Dynamic values needed:** doors picked/opened/remaining, win/lose
  outcome, (optionally) probability-mass visualization data such as "1%
  chance your door is right" vs "99% chance the other door is right" —
  numeric values only, no visualization implementation specified here.

---

### Beat 6 — Aggregate statistics, 100 doors
**copy key:** `aggregateStats100`

- **Goal:** Confirm the 100-door intuition with hard numbers (~99% switch
  win rate) the same way Beat 4 confirmed the 3-door intuition.
- **Why here:** Immediately after the 100-door play, while the "that
  door is almost certainly it" feeling is fresh.
- **Interaction:** Same batch-trial mechanism as Beat 4, run at 100 doors,
  with the same live-updating win-rate display carrying the convergence
  claim (revision 5) so `aggregateStats100.interpretation` can stay to one
  short sentence.
- **Exit state:** Reader has independently generated a ~99% switch win
  rate and connected it to the same host mechanism as the 3-door case.
- **Dynamic values needed:** trial count, stay win %, switch win %.

---

### Beat 7 — Bridge back to 3 doors
**copy key:** `bridgeBack`

- **Goal:** Explicitly state that the 100-door case and the 3-door case
  are the same rule at different scale, so the reader's now-strong
  100-door intuition transfers back and permanently overwrites their
  original 50/50 instinct about 3 doors.
- **Why here:** Without this explicit bridge, some readers compartmentalize
  the 100-door result as "a different, more obvious puzzle" and retain
  lingering 50/50 doubt about the original 3-door case. This beat closes
  that gap in words, not just implied by proximity.
- **Interaction:** Static read. Optionally reference the general form: with
  N doors, your original pick wins 1/N of the time and switching wins
  (N-1)/N of the time, and 3 is just the smallest, least dramatic value of
  N where this is still true.
- **Exit state:** Reader states the rule generally, not just as a 3-door
  fact or a 100-door fact.

---

### Beat 8 — FAQ / objection rebuttals
**copy key:** `faq`

- **Goal:** Pre-empt and answer the specific objections a skeptic raises
  even after seeing the above. Every answer must route back to the §2a/§2b
  enumeration and the fair-coin-tie-break / two-routes reasoning as the root
  explanation — not to metaphor, not to abstract probability formalism, not
  to "by symmetry" alone, and (new in revision 3) **not to "a guaranteed
  event can't be evidence" as a bare general claim** — that phrasing is false
  and must not reappear in any FAQ answer.
- **Why here:** After the main sequence, as a landing zone for residual
  doubt, right before the final gut-check.
- **Interaction:** Static expandable Q&A list (accordion or similar — no
  implementation specified).
- **Exit state:** Reader's most likely remaining objections are named and
  answered in their own language, with the actual mechanism restated
  concretely each time, not gestured at.
- **Required objections covered** (see copy.json for full text; items 1, 5,
  and 6 are the direct restatements of the core "why doesn't my door update
  too" objection and must state the corrected §2b reasoning — fair coin
  flip, two routes, 1-to-2 ratio — explicitly, not just reference "earlier
  on this page" and not fall back to "a guaranteed event can't be
  evidence"):
  1. "Once one door is gone, isn't it just 50/50 between the two that are
     left?" — must justify the three-case row split explicitly (three real
     doors, not a convenient grouping) and state the fair-coin-tie-break
     reasoning inline, not the false "guaranteed reveal" generalization.
  2. "Does it matter which door I originally picked?" — must not answer
     with "by symmetry" alone; must state concretely why (no distinguishing
     information before picking; host's rule refers to "your door"/"the
     car's door," not door numbers).
  3. "What if the host doesn't actually know, and just got lucky?"
     (explicit callback to Beat 3's random-host contrast and the
     survivorship explanation of why that breaks the edge)
  4. "Isn't this just a trick with small numbers — would it hold up at
     scale?" (explicit callback to Beat 5/6's 100-door result)
  5. "If I re-frame it as a fresh choice between two doors, isn't that a
     new 50/50 event?" — must state the corrected §2b reasoning inline
     (fair coin flip, two routes), explicitly naming that "a guaranteed
     event can't be evidence" is not the real reason and is not true in
     general, not just assert the doors "aren't equivalent."
  6. "This feels like semantics. Where's the actual mechanism, in one
     sentence?" — the one-sentence answer must itself contain the
     fair-coin-tie-break + case-count logic, not the false
     certainty-of-reveal generalization and not a metaphor like
     "information piles onto the door."

---

### Beat 9 — Recap and final gut-check poll
**copy keys:** `recap`, `gutCheckFinal`

- **Goal:** Summarize the argument in four or five sentences, then re-ask
  the exact Beat 0 question and show the reader their own answer next to
  their original one, closing the loop.
- **Why here:** Last beat. Recap consolidates; re-asking the identical
  question produces a personal, measurable "I changed my mind" moment,
  which is more persuasive than any additional restatement of the math.
- **Interaction:** Static recap text, followed by the same four-option poll
  as Beat 0. On selection, show a comparison message referencing the
  reader's initial answer (stored from Beat 0) versus their final answer.
  **The closing comparison copy must not claim switching wins every round
  or "100 out of 100" at any scale** — it must state the true win rates
  (~2/3 and ~99/100) and explicitly acknowledge the reader likely lost some
  rounds along the way, since the persuasive claim is about the pattern
  across many rounds, not about any guarantee.
- **Exit state:** Reader can articulate, unprompted: "switching wins 2/3 of
  the time because in 2 of the 3 equally likely starting cases, the host
  has no choice but to leave the car's door closed — and I can enumerate
  those three cases myself, I don't have to take it on faith."
- **Dynamic values needed:** stored initial answer (Beat 0), current
  answer, a mapping to the correct comparison message.

---

## 4. Interaction requirements summary (for sim-engineer / ui-engineer)

The following distinct interactive capabilities are required somewhere in
the sequence above. This is a requirements list, not an API — sim-engineer
and ui-engineer own how these are implemented against `sim.js`'s
`playRound(doorCount, switchStrategy, hostMode, rng)` and
`runTrials(n, doorCount, strategy, hostMode, seed)`.

1. Single interactive round at doorCount = 3, player-chosen switch/stay,
   host behavior always constrained (knowing host) — Beat 2.
2. A way to contrast "knowing host" vs "random/unconstrained host"
   behavior in aggregate over many trials, including surfacing how often a
   random host accidentally exposes the prize (Beat 3). This is the one
   beat that needs host behavior to be a variable, not fixed: `sim.js`
   already exposes this directly, since `hostMode` is a required parameter
   of both `playRound` and `runTrials`, taking the string `"knowing"` or
   `"random"`. Beat 3's two simulated modes map straight onto those two
   values, and under `"random"` a round can come back with the
   `prizeRevealed` outcome instead of a win or a loss, which `"knowing"`
   never produces. Beat 3 also needs a static (non-simulated) three-case
   enumeration display; this has no dynamic values and can be pure
   copy/layout.
3. Batch trial running with live/aggregate win-rate display at doorCount =
   3, both strategies — Beat 4.
4. Single interactive round at doorCount = 100 with 98 doors opened by a
   constrained host, player-chosen switch/stay — Beat 5.
5. Batch trial running with live/aggregate win-rate display at doorCount =
   100, both strategies — Beat 6.
6. Simple two-state answer storage (initial + final) for the gut-check poll
   comparison — Beats 0 and 9.
7. **(Revision 5, load-bearing, not decorative; constrained further in
   revision 6)** Beat 2's reveal must visually mark the reader's own door and
   the prize door as never-eligible at the moment the host opens a door —
   the copy that used to spell this out in prose was cut on the assumption
   this exists. **Revision 6 constraint:** this marking must not, by its
   rendering, disclose which door actually holds the prize before the reader
   makes the stay/switch choice — see §3 Beat 2 for the non-spoiling
   requirement in detail. This is currently unresolved and escalated to
   art-director/ui-engineer, not fixed by this copy round.
8. **(Revision 5, load-bearing; rationale corrected in revision 6)** Beat 3's
   Host B batch runs must visually distinguish spoiled rounds (prize
   revealed) from played rounds, not just report a count. **Correction:**
   this is not because spoiled rounds occur at an elevated rate — the spoil
   rate is exactly 1/3, matching baseline (`prizeRevealed` expected 0.3333),
   not higher — it is so the reader can see spoiling happening at all. The
   claim about *which* rounds get spoiled (only ones where the player
   started on a goat, never ones where the player started on the car) is
   carried by `mechanismContrast.takeaway`'s copy, not by the visual; no
   additional visual is required to prove that narrower claim. See §3 Beat 3.
9. **(Revision 5, load-bearing)** Beats 4 and 6's batch-trial win-rate
   displays must update live as trials accumulate (not just show a final
   total) so the reader watches the number converge — the "not drifting
   toward 50/50" interpretation copy was shortened on the assumption this
   exists.

## Visible at t=0

(This section is deliberately unnumbered, not a renumbering of what follows.
§5, §6, and §7 keep their existing numbers, and every cross-reference to them
elsewhere in this document, "see §5," "§6's key map," and so on, stays
correct. Do not renumber this section into the sequence and do not shift §5/
§6/§7 to make room for it.)

"t=0" means the instant the page has finished loading and the reader has not
yet clicked, scrolled past a trigger, or interacted in any way. Every beat in
§3 is designed to be revealed only when its trigger fires, `.beat.locked`
gating each one until then, so what is actually visible at t=0 is a short,
fixed list, and this section states that list explicitly so it is
mechanically checkable rather than only implied by the beat sequence.

This section exists because that check had a hole: a human found that
`<footer id="site-footer">` was never gated by anything in this spec, so it
rendered directly under the opening poll and the reader saw the
host-knowledge rule and the colophon before answering Beat 0's question. The
root cause was that the footer was never named in this document at all, so
`tools/qa-walk.js`'s "nothing visible before its trigger" check had no entry
to check it against. That bug is already fixed in `index.html`; this section
exists so the class of defect (a real, rendered region this spec never
mentions) is caught mechanically next time, not to describe a live bug.

`tools/qa-walk.js` parses the two subsections below mechanically, so their
format is a contract. Both lists name TOP-LEVEL regions only. An element
nested inside a listed region is covered by its ancestor and must not also be
listed here; the checker resolves every visible element up to its nearest
listed ancestor. In particular, the ids `viz.js` injects inside Beat 0 at
render time (`#gutcheck0-options` and `#gutcheck0-confirm`) are deliberately
not listed below, since they are ui-engineer's implementation detail and
naming them here would couple this spec to `viz.js`'s internal id choices;
they are covered by `#beat-gutcheck0`.

`#study-banner` is study-framing chrome, not a teaching beat. It is
visible on load by design and does not leak teaching-beat content: no win
rates, no odds figures, no host-rule spoilers. Nested links inside it are
covered by the ancestor and must not be listed here.

### Visible on load

- `#study-banner` — study-framing banner, visible on load by design, sits
  above the on-page title; not a teaching beat and does not leak
  teaching-beat content
- `#meta-title` — the page's main title
- `#meta-subtitle` — the page's subtitle, directly under the title
- `#meta-intro` — the short problem-statement intro copy that precedes Beat 0
- `#beat-gutcheck0` — Beat 0, the cold-open gut-check poll; the only beat
  unlocked on load

### Not visible on load

- `#site-footer` — unlocked only by the final gut-check confirm handler in
  Beat 9
- `#beat-rules`
- `#beat-round3`
- `#beat-mechanism`
- `#beat-agg3`
- `#beat-round100`
- `#beat-agg100`
- `#beat-bridge`
- `#beat-faq`
- `#beat-recap`

The nine locked beat ids above are listed for explicitness even though they
are also implied by the beat sequence in §3; the checker asserts each of them
is genuinely not visible at load, not merely absent from a summary.

If a future build intentionally changes what is visible on load, this list
is the thing that must change, and `tools/qa-walk.js` will fail until it
does.

## 5. What must not happen

- The host's door-opening must never be described or implied as random
  in the real-game beats (0, 1, 2, 4, 5, 6, 7, 9). Only Beat 3's explicit
  contrast mode is permitted to show a random host, and it must be clearly
  labeled as the "what if" / broken variant, never left ambiguous with the
  real rule.
- No beat should ask the reader to accept the 2/3 figure on authority alone
  without either playing it, watching it converge in aggregate, seeing the
  mechanism contrast, or working through the three-case enumeration.
  Assertion without demonstration is the failure mode this whole spec
  exists to avoid.
- Avoid the phrase "the odds change" (or "can't change") without
  immediately anchoring it to *why* — the host's fair coin-flip tie-break
  and the resulting two-routes 1-to-2 ratio (§2b). Bare probability-shift
  language, in either direction, is exactly what makes skeptics feel like a
  trick is being played on them.
- **New in revision 3 — never state "a guaranteed/certain event can't be
  evidence" as a general law.** It is false, and a skeptic can break it with
  a biased-tie-break counterexample (§2b). Wherever the page explains why
  the player's own door doesn't update, it must cite the specific mechanism
  — the host's tie-break is uniformly random — not this false general
  principle. This applies everywhere the claim recurs: `mechanismContrast.
  threeCases.conclusion`/`whyYourDoorDoesntMove`, `recap.bullets[0]`,
  `round100.oddsCallout`, and FAQ items 1, 5, and 6.
- **New in revision 3 — never present the three-case row split (car / goat
  A / goat B) without justifying it as three real, physical doors**, not a
  convenient regrouping. See §2a and `mechanismContrast.threeCases.note`.
- **New in revision 3 — quantify the "could the host have done this by
  luck" claim correctly.** At 100 doors the correct figure is about 1 in 50
  (2%), not 1-in-2^98. See §2c for the derivation.
- **New in revision 3 — Beat 2's outcome copy must not state the 2/3 (or
  any) precise win-rate fraction as settled fact.** That number is what
  Beat 3 exists to prove; asserting it in Beat 2 asserts the conclusion
  ahead of its own argument. See Beat 2's interaction spec.
- Never overstate the host's behavior as universally "forced" — one case in
  three (player picked the car) gives the host a genuine free choice. The
  invariant that matters is that a goat is revealed either way, not that
  the host never has options. See §2a/§2c.
- Never frame single-round outcomes asymmetrically (win-for-thesis =
  legitimate, loss-for-thesis = chance/anomaly, or vice versa). See §2c.
- Never claim a guaranteed or "every time" outcome for switching at any
  door count, including in celebratory or closing copy. See §2c.
- Never answer "does the starting door matter" with "by symmetry" as a
  complete explanation. See §2c.
- **New in revision 5 — no em dashes anywhere in copy.** Use a comma, colon,
  semicolon, or parentheses instead. Purely a style constraint, not a
  content one, but binding on every string in `copy.json`.
- **New in revision 5 — do not re-inflate a beat's prose to compensate for a
  weak or missing interaction.** If art-director/ui-engineer cannot deliver
  one of the three revision-5 interaction requirements in §4 (items 7-9),
  that is an escalation back to this spec, not license to lengthen the copy
  back out — the interaction is the fix, not a fallback.

## 6. copy.json key map

```
studyBanner           — specimen-framing banner (sentence, two external
                        link labels and URLs, browser tab title), not a
                        teaching beat. Nested: text, reportLabel,
                        reportUrl, reviewLabel, reviewUrl, documentTitle
                        (browser tab title, not the on-page H1).
meta                 — page title/subtitle
gutCheckInitial       — Beat 0
rules                 — Beat 1
round3                 — Beat 2
mechanismContrast     — Beat 3 (threeCases [rows, note, conclusion,
                        tieBreakRule, whyYourDoorDoesntMove] + host contrast).
                        whyYourDoorDoesntMove nests knowingHost/randomHost
                        route-table objects (each: label, routes[3],
                        workedDivision, conclusion, conclusion_assert) plus
                        comparisonTakeaway and fairnessNote — restructured in
                        revision 4, see §7.
aggregateStats3        — Beat 4
round100                — Beat 5
aggregateStats100       — Beat 6
bridgeBack              — Beat 7
faq                     — Beat 8
recap                   — Beat 9 (part 1)
gutCheckFinal           — Beat 9 (part 2)
footer                  — closing credits/disclaimer, not a teaching beat
colophon                — specimen note: this page is the test article of
                        the pipeline study; not every number is machine-
                        checked (the report says which); report URL auto-
                        linkified by viz.js; renders into #colophon-text
                        inside the footer; like footer, not a teaching beat
```

## 7. Revision log

### Revision 12 (this round): colophon no longer overclaims that every number is machine-checked

A scoped copy rewrite of `colophon.text` only, so the live page no longer
contradicts the project's own report. No beat was added, removed, or
reordered. `studyBanner`, `meta`, `footer`, and every teaching-beat string
were not changed. No `_assert` was added or changed (the colophon contains
no probability or win-rate number). `#colophon-text` / `#site-footer` stay
in "Not visible on load"; colophon is not added to Visible on load.

1. **`colophon.text` rewritten.** The previous string claimed that every
   number shown on the page is checked against a running simulation by an
   agent that did not write that number or its surrounding copy, and pointed
   at the old agent-software-factory repository URL. Both claims are false:
   not every number is machine-checked (the report says which are), and the
   repository is now https://github.com/gabriel-dg/multi-agent-pipeline-study.
   The new string states, in plain language, that this page is the test
   article of an 8-agent pipeline study, that not every number on this page
   is machine-checked, and that the report says which are. It contains
   exactly one URL, the current report/repo URL, so viz.js's existing
   auto-linkify (first URL only) still works. Single `text` field kept; no
   structured link fields added.
2. **§6's `colophon` key-map line** no longer describes a credits/meta
   paragraph on how the page itself was produced. It now describes the
   specimen note (test article of the pipeline study; not every number is
   machine-checked; report URL auto-linkified). Format unchanged: column-0
   key, whitespace, em dash, whitespace, description. No capitalized
   "Beat <digits>" in that description.

Header line and top-of-document summary block updated to Revision 12.

### Revision 11 (this round): specimen-framing banner visible at t=0, plus new `studyBanner` copy key

A scoped addition so anyone landing on the live page can see that it is
the test article of a field report on an 8-agent pipeline, not a
standalone product. This is not a teaching beat: no win rate, no odds
figure, no host-rule spoiler. No beat was added, removed, or reordered;
no `_assert` was added (the banner contains no number a simulation could
check; "8-agent" is a count of agents, not a probability claim);
`meta.title`, `meta.subtitle`, `meta.intro`, and `colophon` were not
changed.

1. **New top-level copy key `studyBanner` in `copy.json`.** Nested
   fields, kept separate so ui-engineer can wire real anchors without
   parsing prose: `text` (the banner sentence), `reportLabel` /
   `reportUrl`, `reviewLabel` / `reviewUrl`, and `documentTitle` (the
   browser tab title, not the on-page H1).
2. **`#study-banner` added to "### Visible on load"** as a top-level
   region, not nested inside `#meta-title`. Nested link ids inside the
   banner are not listed; they are covered by the ancestor. Existing
   visible and not-visible ids are unchanged. The banner is
   study-framing, visible on load by design, and does not leak
   teaching-beat content.
3. **§6's key map** gained `studyBanner` as the first entry, in the same
   format as `meta`, `footer`, and `colophon` (no capitalized
   "Beat <digits>" marker, since this is not a teaching beat). Existing
   key-map em dashes are unchanged.

Header line and top-of-document summary block updated to Revision 11.

### Revision 10 (this round): load-state visibility contract, plus §6's missing `colophon` key

A QA census of what the built page actually renders, versus what this
document says should render, found two omissions of the identical shape: a
real, rendered thing on the page that this spec never named. No beat was
added, removed, or reordered; no copy key's content changed; `copy.json` was
not opened or modified this round; no `_assert`, `expected`, or `tolerance`
value was touched.

1. **New, deliberately unnumbered "Visible at t=0" section, added between §4
   and §5.** A human found that `<footer id="site-footer">` was never gated
   by anything in this spec: every teaching beat in §3 is designed to stay
   locked until its trigger fires, but the footer had no such gating stated
   anywhere here, so it rendered directly under the opening poll and the
   reader saw the host-knowledge rule and the colophon before answering
   Beat 0's question. The root cause was that the footer was never in this
   spec at all, so `tools/qa-walk.js`'s "nothing visible before its trigger"
   check had no entry for it to check. That bug is already fixed in
   `index.html`; the new section exists so the class of defect is
   mechanically checkable in future, not to describe a live bug. The section
   states, in a format `tools/qa-walk.js` parses mechanically, exactly which
   top-level regions are visible on load (`#meta-title`, `#meta-subtitle`,
   `#meta-intro`, and `#beat-gutcheck0`, the only unlocked beat) and which
   are not (`#site-footer` and the nine other locked beat ids). It is left
   unnumbered, and says so explicitly inside itself, precisely so the many
   existing numbered cross-references elsewhere in this document ("see §5,"
   "§6's key map," and similar) keep pointing at the same sections as
   before; §5, §6, and §7 are not renumbered.
2. **§6's key map was missing `colophon`, the same omission shape as the
   footer.** The same census that found the footer gap found that §6 listed
   13 top-level `copy.json` keys where the real file has 14. `colophon`
   (verified against the real file's top-level key order: `meta`,
   `gutCheckInitial`, `rules`, `round3`, `mechanismContrast`,
   `aggregateStats3`, `round100`, `aggregateStats100`, `bridgeBack`, `faq`,
   `recap`, `gutCheckFinal`, `footer`, `colophon`) is the credits/meta
   paragraph about how the page itself was produced, contains the repository
   URL that `viz.js` auto-linkifies, and renders into `#colophon-text` inside
   the footer; like `footer`, it is not a teaching beat. Added to §6 in its
   correct position, directly after `footer`.

Header line and top-of-document summary block updated to Revision 10 per the
convention Revision 9's entry established (point 3, below): both must name
the newest revision.

### Revision 9 (this round): §2b's canonical argument corrected to the three-route partition

A second external audit found that §2b, the canonical statement of the
"why doesn't my door's odds move" argument that downstream agents are told
to reproduce and never re-derive differently, still presented **exactly two
routes** ("the player had the car" and "the player had the other goat") as
the full argument. That two-route version was superseded on the built page
starting in revision 4 (which added a third, zero-probability route to both
`copy.json` route tables) and corrected again in revision 7 (which fixed
that third route's partition to be about the car's location, not the
player's own door). Revision 7's changelog explicitly noted that §2b itself
was never updated to match ("§2b's 'exactly two routes' derivation only ever
discussed Routes 1 and 2 and never characterized Route 3, so it required no
change") because that finding was scoped to `copy.json` only. Left as
written, §2b told any downstream agent reading the spec rather than the
changelog to rebuild the two-route version and drop the zero-probability
case, which is the exact dropped-case shape a skeptic pass once flagged as
the trick this page exists to disprove. `copy.json` was not touched this
round; the fix is entirely within this file.

1. **§2b's "corrected argument" now states the three-route partition.** The
   partition (fixed across every route: where is the car) now has all three
   members stated in the canonical text: Route 1, the car is behind the
   player's own door, prior 1/3, joint 1/3 x 1/2 = 1/6; Route 2, the car is
   behind the other closed door, prior 1/3, joint 1/3 x 1 = 1/3 (written as
   2/6 on a common denominator, stated as a separate conversion step, not as
   the answer to the multiplication itself, since "1/3 x 1 = 2/6" was one of
   the errors revision 7 fixed in `copy.json` and must not be reintroduced
   here); Route 3, the car is behind the door that got opened, prior 1/3,
   joint 0, because a knowing host is forbidden from opening the car's door.
   The three joints now sum openly to 3/6 = 1/2 (the overall chance this
   specific door opens at all) instead of the old two-route total of 1/2
   appearing without any stated reason it wasn't 1.
2. **Everything still correct and load-bearing in the old text is preserved,
   not replaced.** The false-general-law counterexample (a host who always
   opens the lower-numbered goat door on a tie, still "certain either way"
   yet leaking information through which door he opens) and the standing
   ban on "an event that was going to happen either way can't be evidence"
   are unchanged. The fair-coin tie-break as the missing load-bearing
   assumption is unchanged. The 1-to-2 ratio between Routes 1 and 2, and why
   it is symmetric across which specific door opened, is unchanged, now
   stated explicitly as holding "between the two live routes" so it reads
   correctly inside a three-route partition instead of implying only two
   routes exist. The worked biased-host paragraph showing where fairness is
   load-bearing is unchanged verbatim; it only ever reasoned about Routes 1
   and 2, and Route 3 stays zero regardless of the tie-break policy, so
   nothing in that paragraph needed to change.
3. **Document header and top-of-document summary were out of date and are
   fixed.** Line 3 read "Revision 7: arithmetic and overclaim fixes
   (external review)" while this section already logged a Revision 8 (a
   docs-only fix, landed after that header was last touched). The header now
   reads "Revision 9: canonical §2b argument corrected to three-route
   partition (external review)." The top-of-document summary block, which
   had prose entries for revisions 2 through 7 but none for revision 8, now
   has both a revision 8 summary and this revision's summary appended in
   sequence, so the header and the top summary both match the newest entry
   in this log.

No beat was added, removed, or reordered. No `_assert` value, `expected`, or
`tolerance` was changed; none of this round's changes touch a number a
reader can check, they touch which cases the canonical prose states and in
what order. `copy.json` was not opened, read for editing, or modified this
round, per instruction.

**Flag for the next review pass, not fixed here because it is outside this
round's scope (§2b only) and outside this agent's remit (no code, no
`copy.json` this round):** no other spot in `docs/SPEC.md` still states the
two-route version as the argument to reproduce. §2a's three-case table
partitions on the player's *pick* (car / Goat A / Goat B), not on the car's
location conditional on a specific door opening, so it is a different,
already-correct argument and was not touched. §6's key map and the revision
4, 6, and 7 log entries already describe the three-route `copy.json`
structure accurately and needed no change. The one open item is cosmetic,
not argumentative: this file uses em dashes throughout in text this agent
did not author this round (for example, in the revision 3 through 8 prose
above), which predates the no-em-dash constraint that revision 5 applied to
`copy.json` only; nothing written in this round introduces one, but a
full-document em-dash sweep of the pre-existing prose was not performed,
since it was not part of the two-route finding this round exists to fix.

### Revision 8 (this round): docs/SPEC.md corrected to match sim.js's actual `hostMode` parameter

An external review found that this document's §4 had drifted from the real
`sim.js` contract. This is a documentation-only correction: `sim.js` was
never wrong, this file was. No beat was added, removed, or reordered; no
`_assert` value, `expected`, or `tolerance` was changed; `copy.json` was not
touched in this round.

The verified facts: `sim.js:98` defines
`playRound(doorCount, switchStrategy, hostMode, rng)`, and `sim.js:187`
defines `runTrials(n, doorCount, strategy, hostMode, seed)`. `hostMode` is
the string `"knowing"` or `"random"`, and under `"random"` a round can come
back with the outcome `"prizeRevealed"` instead of a win or a loss. Both
signatures were already documented correctly elsewhere (for example, §7's
revision 6 entry already cites the `hostMode === "random"` path by name and
needed no change), so the drift was isolated to two spots in §4.

1. §4's opening paragraph restated both exported signatures without
   `hostMode`, as `playRound(doorCount, switchStrategy, rng)` and
   `runTrials(n, doorCount, strategy, seed)`. Both are corrected to match
   `sim.js` exactly, with `hostMode` in its real position ahead of `rng` and
   `seed` respectively.
2. §4 requirement item 2 carried a caveat, written before `hostMode` existed
   in the implementation, warning that "the documented `sim.js` signature
   does not obviously expose a host-randomness parameter" and telling
   sim-engineer to be flagged about it. That gap was closed once `hostMode`
   became a required parameter of both exports, so the warning described a
   problem that no longer exists. Rewritten to state the actual contract:
   `hostMode` is a required parameter taking `"knowing"` or `"random"`,
   Beat 3's two simulated modes map directly onto those two values, and the
   `"random"` mode is the one that can return `prizeRevealed`. Nothing is
   flagged to sim-engineer here anymore because there is nothing unresolved
   to flag.

### Revision 7 (this round): external review, three findings, all independently hand-verified

See the summary near the top of this document for the full rationale; this
entry is the itemized changelog pointer. All three findings were in
`copy.json`; the corresponding `docs/SPEC.md` change for finding 1 is the
correction note attached to revision 6's log item 3, below. No beat was
added, removed, or reordered; no `_assert` value, `expected`, or `tolerance`
was changed.

1. **Wrong partition in `whyYourDoorDoesntMove.knowingHost.routes[2]`.** With
   the player's pick held fixed, the three routes in each table must
   partition on the car's location, since that's what Routes 1 and 2 already
   do (Route 1: car behind your door; Route 2: car behind the other closed
   door). Route 3 had instead been stated as "you had the goat behind the
   door that actually got opened," a claim about which door the player
   picked, not about the car's location, so it wasn't a member of the
   partition at all. The zero was right; the reasoning for it was not.
   Fixed: Route 3 is now "the car was behind the door that got opened," prior
   1/3, joint probability 0 because the knowing host is forbidden from
   opening the car's door. This now matches the random host's Route 3 row for
   row. Consequences handled in the same pass:
   - `randomHost.routes[2].detail` no longer opens by insisting it "isn't the
     mirror" of the knowing host's Route 3; after the fix, it is. Rewritten to
     state the shared partition and keep the one real difference: *why* each
     zeroes out (the knowing host's rule forbids it; the random host's is
     ruled out by what the reader observed).
   - `comparisonTakeaway` no longer tells the reader "Route 3 answers a
     different question in each table, so don't expect it to line up"
     (deleted, since the tables now line up row for row). The takeaway's real
     payload is unchanged and restated: the knowing host's Route 2 has no
     coin flip so it's worth twice Route 1 (2/6 vs 1/6); the random host's
     Route 2 gets the same coin as Route 1 so they're equal (1/6 and 1/6).
   - Revision 6's log item 3 (§7 below) recorded the wrong partition as a
     deliberate decision. It is now annotated in place with a correction
     note rather than silently rewritten, so the error and its fix are both
     traceable.
   - §2a and §2b were checked for the same wrong partition; neither states
     it (§2b's "exactly two routes" derivation only ever discussed Routes 1
     and 2 and never characterized Route 3, so it required no change).
2. **Non-multiplication in `knowingHost.routes[1].detail`.** "Joint
   probability: 1/3 x 1 = 2 in 6" is not what that multiplication produces;
   1/3 x 1 is 1/3, and "2 in 6" silently rewrites the result in sixths without
   saying so. Fixed by stating the product honestly (1/3 x 1 = 1/3) and then,
   as a separate, explicit sentence, converting it to 2/6 so it can be
   compared with the other rows on a common denominator. Every other route
   detail in both tables was checked for the same defect: none had it (Route
   1's "1/3 x 1/2 = 1 in 6" is a genuine multiplication and was left as is).
3. **Beat 1 asserted the 2/3 figure before any beat had earned it.**
   `rules.mechanismCallout.text` said the host's forced choice "is the entire
   reason switching wins 2 of 3 times." Beat 1 is a static read, before the
   reader has played (Beat 2), seen the three-case enumeration (Beat 3), or
   watched an aggregate (Beat 4); §5 already forbids exactly this, and
   separately forbids Beat 2 from stating the fraction, which made stating it
   in Beat 1 worse, not better. Resolved by removing the win-rate number from
   the callout rather than carving out an exception in §5: the callout's job
   (making the host-knowledge rule unmissable) does not need the number. The
   sentence now reads "is why switching has the edge over staying," with the
   exact figure deferred to where the page actually proves it.

### Revision 6 (this round) — fourth skeptic pass, eleven copy findings plus two design-constraint escalations

All eleven findings were prose-accuracy or prose-consistency problems in
`copy.json`; none required a beat to be added, removed, or reordered, and no
`_assert` value, `expected`, or `tolerance` was changed. Two further findings
were implementation concerns misfiled as content problems in revision 5's own
text and are corrected here as design constraints for art-director/
ui-engineer (§3 Beat 2, §3 Beat 3, §4 items 7-8), not as copy changes.

1. `rules.mechanismCallout.text` previously said the host's forced-door rule
   is "most of why switching wins" and that the coin flip "needs no coin
   flip... [but] we'll prove both halves later," implying the coin supplies
   part of the 2/3. Rewritten: the forced choice across the three cases is
   now stated as "the entire reason switching wins 2 of 3 times, coin or no
   coin," and the coin's role is confined to the specific-door question,
   matching FAQ item 6 exactly.
2. `mechanismContrast.threeCases.conclusion` previously claimed the
   three-case proof "holds no matter which door the host opens" — false, per
   `fairnessNote`'s own biased-host counterexample, which shows the
   *conditional* (given a specific door) answer can swing to 50/50 under a
   biased tie-break. Rewritten to claim only what's true: the aggregate 2/3
   "holds regardless of how the host breaks the tie... fair coin or not,"
   with no claim about conditioning on the specific door opened.
3. `whyYourDoorDoesntMove`'s `knowingHost` and `randomHost` route tables'
   Route 3 rows were never the same partition (one is "your door = the
   opened door," impossible by rule; the other is "the car itself is behind
   the opened door," excluded by observation). Rather than force a false
   correspondence between them, `randomHost`'s Route 3 label and detail now
   say explicitly that it is "a different question" from the knowing host's
   Route 3, and `comparisonTakeaway` no longer says "line the two tables
   up" — it now directs the reader to compare Routes 1 and 2 specifically
   (the two rows that do mean the same thing across both tables) and flags
   that Route 3 is not expected to line up.

   **Correction (revision 7): this item was wrong, not just a design choice.**
   The knowing host's Route 3, as recorded above, was never actually about
   the car's location at all, it was about the player's own door, which
   isn't a member of the "where is the car" partition the other two routes
   use. That's not a second legitimate partition to contrast against the
   random host's table, it's an error: the partition is fixed (where the car
   is) across every route in both tables, so a row that partitions on
   something else doesn't belong. Once Route 3 is restated correctly on the
   car's location, it *is* the same partition as the random host's Route 3,
   row for row, and the two tables' Route 3 rows differ only in why they
   zero out, not in what they're about. See revision 7 item 1 for the fix.
   Do not use this item as guidance; it is kept here only for traceability.
4. `knowingHost.workedDivision` claimed dividing by Routes 1+2's total is
   meaningfully different from dividing by all three routes' total ("not all
   three") — vacuous, since Route 3 is exactly zero and the two totals are
   numerically identical. That clause is cut; the real justification (the
   parenthetical noting the total, 1/2, is the overall chance this door gets
   opened at all) is preserved unchanged.
5. `mechanismContrast.takeaway` previously said deleted rounds are
   "disproportionately" the ones switching would have won and that deleting
   "enough" settles survivors to 50/50 — vague, and worth checking for
   direction. Verified directly against `sim.js`'s random-host branch
   (`playRound`, `hostMode === "random"` path): when the player started on
   the car, both non-player doors are goats, so Host B structurally cannot
   reveal the prize that round (spoil probability exactly 0 in this case);
   when the player started on a goat, one non-player door is the car and
   Host B opens each of the two non-player doors with equal probability, so
   he spoils the round exactly half the time. Every spoiled round is
   therefore, without exception, a round switching would have won; zero
   spoiled rounds are ones switching would have lost. Rewritten to state
   this plainly and exactly, replacing "disproportionately"/"delete enough."
6. `whyYourDoorDoesntMove.fairnessNote` previously ended immediately after
   showing the biased host's conditional-on-door result swinging between a
   certain win and a flat 50/50, with no statement of what *doesn't* break.
   Added a closing statement: always-switching still wins the same aggregate
   2/3 against this biased hypothetical host too, since (per finding 2/§2a)
   the aggregate proof never depended on tie-break policy in the first
   place. Without this, a careful reader could walk away from the worked
   counterexample more convinced of 50/50 than when they arrived, which is
   the opposite of what a rebuttal example should do. No `_assert` was added
   for this hypothetical host, consistent with existing practice (see
   revision 4 entry, finding 5) — sim.js has no biased-tie-break mode to
   check it against, and this remains a labeled hand-worked side calculation.
7. `round3.hostKnowledgeReminder`'s "with the car, he still had a choice...
   without it, he had none" had an ambiguous pronoun reference (with/without
   *what*, *whose* car or door). Rewritten to name "your own door" and "the
   car" explicitly on both branches, and to state the actual invariant
   unambiguously: a goat is shown either way, regardless of what's behind
   the reader's own door.
8. `gutCheckFinal.comparison.stillUnconvinced` previously closed on "the host
   guaranteed, not lucky, to dodge the car every time, that guarantee is
   what's missing from a 50/50 world" — but `fairnessNote`'s biased host is
   equally guaranteed to dodge the car every round and still produces a
   conditional 50/50 for some doors. Since this is the very last persuasive
   beat on the page, resting it on a claim already disproven earlier on the
   same page is a serious problem. Rewritten to rest the closing conviction
   on the actual distinguishing property, the fair coin / equal tie-break,
   explicitly contrasted with "dodging the car alone doesn't decide
   everything."
9. Added an explicit, previously-absent rule to `rules.steps`: the host
   opens a door and offers the switch on *every* round, unconditionally,
   regardless of what the reader picked, not only when the reader happens to
   have picked the car. `steps_assert` extended with one additional `null`
   to match the new array length; the trailing assert array (switchWins/
   stayWins at doorCount 3) is unchanged and now sits at the new final index.
10. `aggregateStats3.intro` had been compressed in revision 5 to "Same host
    rule, running automatically hundreds of times," which asserts trustworthiness
    without bridging it. Restored a minimal clause ("you already played by
    hand and proved by enumeration") that ties the automated batch back to a
    rule the reader has personally verified, without returning to
    pre-revision-5 length.
11. `aggregateStats3.interpretation` previously asserted, unconditionally,
    "Not drifting toward 50/50," which a reader who just ran a noisy 10-round
    batch landing at or below 50% could watch get contradicted on the page in
    front of them. Reworded to frame the claim around what happens as trial
    count grows ("the more rounds you run, the closer this settles to...")
    and to explicitly name small-batch noise as expected, not a
    contradiction.

**Design-constraint escalations (not copy fixes, recorded for
art-director/ui-engineer):**

- **Beat 2 (§3):** marking the reader's own door and the prize door as
  "never-eligible" at reveal time, if implemented naively (e.g. visually
  distinguishing "has the prize" from "doesn't" at that moment), spoils the
  round before the stay/switch choice for the 1/3 of readers who picked the
  car. SPEC now specifies the constraint the visual must satisfy: mark the
  category of doors the host was forbidden to open without disclosing which
  one, if either, is actually the prize door.
- **Beat 3 (§3):** revision 5's stated rationale for the spoiled/played
  visual distinction ("a visibly larger share of spoiled rounds than the 1/3
  baseline... would predict") was wrong: the spoil rate is exactly 1/3,
  matching baseline (`randomHostDescription_assert`), not exceeding it. SPEC
  now states the correct rationale (make spoiling visible at all, not prove
  an elevated rate) and confirms the narrower survivorship claim (*which*
  rounds get spoiled) is carried by `mechanismContrast.takeaway`'s corrected
  copy (finding 5 above), not by the visual, so no additional visual
  requirement is being added here.

### Revision 5 (this round) — brevity pass, word counts per beat

All figures are total words across every copy.json string belonging to the
beat (headings, body, buttons, all included). Counted by hand against the
end-of-revision-4 file. No argument, route table, worked example, or
`_assert` value was removed; see the revision 5 summary at the top of this
document for what changed and why.

| Beat | Copy key(s) | Before | After | Cut |
|---|---|---|---|---|
| meta (page intro) | `meta` | 73 | 42 | 42% |
| Beat 0 | `gutCheckInitial` | 98 | 94 | 4% |
| Beat 1 | `rules` | 336 | 218 | 35% |
| Beat 2 | `round3` | 360 | 206 | 43% |
| Beat 3 | `mechanismContrast` | 2040 | 1528 | 25% |
| Beat 4 | `aggregateStats3` | 119 | 75 | 37% |
| Beat 5 | `round100` | 577 | 422 | 27% |
| Beat 6 | `aggregateStats100` | 75 | 64 | 15% |
| Beat 7 | `bridgeBack` | 181 | 127 | 30% |
| Beat 8 | `faq` | 926 | 647 | 30% |
| Beat 9 | `recap` + `gutCheckFinal` | 494 | 395 | 20% |
| footer | `footer` | ~30 | ~30 | 0% |
| **Total** | | **~5309** | **~3848** | **~27%** |

Beat 3 (the mechanism beat) was cut the least in percentage terms on
purpose: nearly everything in it is the proof itself (the route tables, the
renormalization, the third zero-probability route, the random-host parallel
table, the biased-host counterexample), not narration of an interaction, so
there was much less redundant prose available to cut without weakening an
argument. Beat 8 (FAQ) stayed the second-largest in absolute terms for the
same reason: five of its six answers restate mechanism-beat arguments and
must do so accurately, not just gesture at them.

### Revision 4 (this round) — third skeptic pass, five findings, all within Beat 3

See the summary at the top of this document for the full rationale; this
entry is the changelog pointer. All five findings targeted
`mechanismContrast.threeCases.whyYourDoorDoesntMove` and four cross-references
into it (`round100.oddsCallout`, `rules.mechanismCallout`, FAQ items 1/5/6,
`recap.bullets[0]`). No beat was added or reordered; no new `hostMode` was
introduced to sim.js's contract (the biased-tie-break host used in the
expanded `fairnessNote` is explicitly labeled unsimulated and carries no
`_assert`, consistent with how the page already treats hand-derived
intermediate arithmetic that isn't independently checkable against sim.js's
`switchWins`/`stayWins`/`prizeRevealed`/`noRevealAndSwitchWins` metrics).

1. Renormalized the Route 1/Route 2 joint probabilities (1/6, 2/6) with an
   explicit `workedDivision` step showing (1/6)/(1/6+2/6)=1/3 and
   (2/6)/(1/6+2/6)=2/3, and stated plainly that these are joint
   probabilities, not yet the conditional answer.
2. Added the third, zero-probability starting case (Route 3) to both route
   tables, with its "why zero" reasoning spelled out and traced to a named
   rule (knowing host) or to the observed evidence (random host).
3. Added a full parallel route table for the random host, conditioned on
   "this door opened AND showed a goat," proving Route 1 = Route 2 = 1/6
   (both carry the coin-flip factor, unlike the knowing host's table) and
   therefore 50/50 — the demonstration the page had asserted but never
   shown.
4. Demoted the fair coin flip's role in three places
   (`rules.mechanismCallout.text`, FAQ item 1, FAQ item 6) from "the whole
   reason switching wins" to its correct, narrower job: keeping the 2/3
   split intact after conditioning on a specific door, not the reason the
   aggregate 2/3 exists at all.
5. Expanded `fairnessNote` into a worked biased-host counterexample with two
   concrete conditional probabilities (certain switch-win vs. diluted
   50/50) and repointed the four "a guaranteed reveal can be evidence, not a
   general rule" asides (including FAQ item 5's previously dead "see the
   next question" pointer) at this demonstration.

### Revision 3 (previous round) — second skeptic pass, four findings

1. **The core "why doesn't my door update" explanation was still wrong, in
   a new way.** Revision 2's version — "an event that was going to happen
   either way can't be evidence about which way it actually is" — is false
   as a general law and falls to a biased-tie-break counterexample (a host
   who favors the lower-numbered door on a tie leaks real information
   through which door he opens, despite still "revealing a goat with
   certainty either way"). Fixed by stating the actual missing assumption —
   the host breaks ties **uniformly at random** — explicitly, and replacing
   the false general law with the correct, narrower two-routes argument
   (see §2b for the full derivation). Changed: `rules.steps` (now states the
   fair-coin tie-break explicitly and no longer claims "decided by that
   rule, not by chance," which was false 1/3 of the time and contradicted
   `round3.hostKnowledgeReminder`); `rules.mechanismCallout`;
   `round3.hostKnowledgeReminder` (minor tightening for consistency);
   `mechanismContrast.threeCases.conclusion` (false general law removed,
   scoped to the aggregate 2/3 claim it can actually support);
   `mechanismContrast.threeCases.note` (now justifies the row split — see
   finding 3 below); `mechanismContrast.threeCases.rows[0].hostChoice` and
   `knowingHostDescription` (now name the fair coin flip); two new fields,
   `mechanismContrast.threeCases.tieBreakRule` and
   `.whyYourDoorDoesntMove` (heading/lead/routes/conclusion/fairnessNote),
   carrying the corrected argument in full; `round100.oddsCallout`;
   `recap.bullets[0]`; FAQ items 1, 5, and 6.
2. **100-door luck estimate was off by ~28 orders of magnitude.**
   Revision 2 said dodging the car 98 times by blind luck is "about as
   often as a fair coin lands heads 98 times in a row" (≈1-in-2^98) and
   also contained garbled phrasing ("a coin lands heads 98 times in a row
   running"). The correct figure, derived from first principles and
   cross-checked against Beat 3's own "reveals the car about a third of the
   time" claim at N=3 (general formula: blind-host dodge probability =
   2/N), is **1 in 50 (2%)**. Fixed in `round100.mechanismCallout`, which
   now gives the intuitive two-routes version of the same derivation
   (player's own door has the car, 1/100; or the car is behind the one
   specific door the blind host happened to leave closed, 1/100) instead of
   the false coin-flip framing. §2c corrected to match.
3. **Three-case row split read as an uncontested "word trick."** The table
   splits "goat A" and "goat B" into two rows, previously justified only by
   "each case is equally likely — 1 in 3." Fixed by stating explicitly, in
   `mechanismContrast.threeCases.note` and echoed in FAQ item 1, that this
   is not a regrouping at all: there are three physical doors, so naming
   each one by what's behind it produces exactly three genuinely distinct,
   equally likely starting configurations.
4. **Beat 2 stated "2/3" as settled fact before Beat 3 earns it.**
   `round3.resultLoseSwitch` cited "wins about 2 out of 3" as if already
   proven. Fixed: all four `round3` outcome messages now avoid stating any
   precise win-rate fraction and instead point forward to Beat 3 ("you'll
   see exactly why switching tends to win more often, and by how much
   next"), consistent across all four for tonal symmetry.

### Revision 2 (previous round)

Fixes made in response to the first skeptic-review pass, for downstream
traceability:

1. **False/overclaimed host-choice framing.** `round3.hostKnowledgeReminder`
   no longer claims the host "had no other legal choice" as a blanket
   statement (false 1/3 of the time). It now states the actual invariant —
   a goat is guaranteed regardless of the player's own door — and is honest
   that the free-choice case exists, deferring the full breakdown to Beat 3.
2. **Unexplained "odds can't change" axiom.** `recap.bullets[0]`,
   `round100.oddsCallout`, and FAQ items 1 and 5 now state the reason
   (certainty-of-reveal, §2b) inline instead of asserting the conclusion.
3. **Unfalsifiable win/loss framing.** All four `round3` outcome messages
   were rewritten to be tonally symmetric — each says a single round isn't
   proof of which strategy is better, regardless of which strategy won that
   round.
4. **Mechanism contrast read as unresolved.** Beat 3 now opens with the
   three-case enumeration (§2a) before the random-host contrast, and the
   contrast's takeaway explains the random host's 50/50 result mechanically
   (the survivorship argument) instead of asserting a door is "packed with
   information."
5. **Overclaims.** "Couldn't have done that by luck" → quantified as
   astronomically unlikely, not impossible (`round100.mechanismCallout`).
   "100 times out of 100 attempts, at every scale" removed from the closing
   line (`gutCheckFinal.comparison.changedToCorrect`), replaced with true
   win rates and an acknowledgment that some rounds are lost. "By symmetry"
   alone removed from `faq` item 2, replaced with a concrete reason.

The core unanswered objection ("why doesn't the reveal update my own door's
odds too?") now has an actual answer, stated as plain enumeration with no
metaphor, anchored in Beat 3 (`mechanismContrast.threeCases`) and echoed
consistently everywhere the claim recurs (Beat 2, Beat 5, FAQ items 1, 2, 5,
6, and the recap).

Secondary point on "you don't have to trust the math, check it yourself"
ringing hollow given unauditable simulation code: `meta.intro` was softened
to promise plain-English reasoning and hand-played verification rather than
implying the reader can audit the simulation code itself, and
`aggregateStats3`/`aggregateStats100` intros now explicitly tie the
automated trials back to the exact rule already played by hand and
enumerated in Beat 3, so "trust" is anchored in a rule the reader has
personally verified, not in unseen code.

### Current status, end of revision 3

The core unanswered objection now has an answer that survives a direct
adversarial counterexample (the biased-tie-break host), not just a
plausible-sounding metaphor: the host's tie-break is uniformly random, and
that specific, checkable property — not "certainty implies no evidence" in
general — is what keeps the player's original door at 1-in-N odds even after
conditioning on exactly which door was opened. This reasoning, and the
worked counterexample that motivates it, is now present in full wherever the
claim recurs (Beat 1's rules, Beat 2's reminder, Beat 3's dedicated
`whyYourDoorDoesntMove` block, Beat 5's `oddsCallout`, and FAQ items 1, 5,
6), rather than compressed into a single load-bearing sentence that a
skeptic could dismantle by finding one place it was asserted loosely.
