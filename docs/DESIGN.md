# DESIGN.md — Monty Hall Interactive Explainer

Owner: art-director. This document explains the choices encoded in
`tokens.css` and provides the machine-parseable contrast ledger consumed by
`check-contrast.js` / `math-verifier`.

## 1. Design goals, tied to SPEC.md

The reader is an intelligent skeptic being walked through a proof, not sold
a game show. The visual system has to do five jobs without ever leaning on
color alone:

1. **Make the door lifecycle legible at a glance.** SPEC.md requires seven
   distinguishable visual states: unopened/unselected door, the player's
   picked door, a host-opened goat door, the single remaining unopened door,
   the prize reveal, the goat reveal, and general UI chrome. Each gets its
   own bg/border/text token triplet (never a single color reused with
   opacity) so ui-engineer can style each state unambiguously.
2. **Never make the prize/goat distinction color-only.** Beyond the gold vs.
   sage-gray hue difference, prize and goat differ in shape (`--radius-badge-prize`
   is a circle, `--radius-badge-goat` is a rounded square), border style
   (solid vs. dashed), icon glyph (🚗 vs. 🐐 via `--icon-prize-content` /
   `--icon-goat-content`), and the goat card additionally carries a diagonal
   stripe texture (`--pattern-reveal-goat`) that the prize card never has.
   A reader with any color vision deficiency can tell them apart from shape
   and icon alone with color turned off entirely.
3. **Keep the mechanism's two "modes" (Beat 3) visually opposed.** The
   knowing host is teal, solid-bordered, and marked with a lock glyph
   (certainty, rule-bound). The random host is red-orange, dashed-bordered,
   and marked with a dice glyph (chance, unconstrained). The one-off
   "spoiled round" state (host accidentally reveals the prize) gets its own
   amber/orange alert triplet distinct from both, plus its own glyph (💥), so
   it reads as a rare, notable event rather than a routine goat reveal.
4. **Mark a door as structurally ineligible for the host's reveal — a real
   game-logic fact, not just a disabled button.** During Beat 2's reveal
   moment, two independent facts become true of the reader's picked door:
   (a) it isn't clickable right now (a UI interaction fact, true of the
   host-opened door too), and (b) the host's rule could *never* have
   opened it — it was off-limits by the game's setup before the host ever
   acted. Fact (b) is part of the page's actual argument (why the host's
   reveal carries information at all), so it needs its own visual
   carrier, not a reuse of ordinary disabled-button chrome. Two earlier
   attempts at this were wrong for three different reasons, all now
   avoided:
   - First attempt: badging with the violet "key mechanism" triplet and
     the not-yet-introduced lock glyph — a color/icon collision with
     meanings already claimed elsewhere on the page (see §2 below).
   - Second attempt: dropping the badge and letting a flat opacity/cursor
     treatment stand in for the game-logic fact too — indistinguishable
     from every other disabled control on the page, losing the claim
     entirely.
   - Third attempt (caught in a post-build manual walkthrough, after the
     badge and its own token triplet already existed): applying the
     correctly-designed badge to *both* the reader's picked door and the
     door the host actually opened. This is a different mistake from the
     first two — not a color collision, not a degeneration into disabled
     chrome, simply the wrong two doors. "Structurally forbidden to
     open" is a fact about a pair evaluated *before* the host acts: the
     reader's own door, and whichever door holds the car. The door the
     host actually opened is neither of those — the host opening it is
     exactly what his rule *permitted* (on 2 of 3 rounds, the only door
     left; on 1 of 3, a free choice between two goats). Badging it as
     "forbidden" asserts the opposite of what happened, and directly
     contradicted the reveal copy sitting right below it
     (`round3.hostKnowledgeReminder`: "He skipped Door {{pickedDoor}}
     (yours) and the car's door"), which correctly names the picked door
     and the car's door as the pair, never the host-opened door.

   The design that avoids all three keeps fact (a) and fact (b) on two
   independent, non-competing visual channels, and scopes fact (b)'s
   badge correctly:
   - **Fact (a), "not clickable right now,"** is exactly generic,
     page-wide disabled-affordance styling: `--opacity-control-disabled`
     (0.5, matching `.btn-primary:disabled`/`.btn-secondary:disabled`
     exactly) plus a `not-allowed` cursor (`--cursor-disabled`), layered
     uniformly over whichever base door triplet is already showing. No
     new hue, no new icon. This applies to both the picked door and the
     host-opened door — both are equally non-clickable right now, and
     this fact alone doesn't distinguish why.
   - **Fact (b), "the host's rule structurally forbade him from ever
     opening this door,"** gets its own small badge with its own
     dedicated token triplet (`--color-door-ineligible-badge-bg/border/
     text`) and its own glyph (`--icon-door-ineligible-content`, ⚖ — a
     balance/scales, read as "this was decided by the rule," not
     "off/disabled"). The badge is deliberately painted in neither of the
     two colors it must never be confused with: not violet
     (`--color-callout-key-*` / accent-primary), which means "clickable"
     everywhere else on the page and would directly contradict itself on
     a non-interactive door; and not the `--icon-host-knowing-content`
     lock glyph or its teal triplet, reserved for the host's *epistemic*
     certainty in Beat 3. Instead it uses a new, desaturated dark-graphite
     "ink stamp" family (`#33363E` bg / `#9A96A6` border / `#F5F2EA`
     text) that appears nowhere else on the page, chosen to read as a
     stamped, official annotation, "ruled out by definition," rather
     than as a color-coded game state or a grayed-out control.
     **Scope, corrected after the third attempt above:** the badge is
     applied to *at most one door at a time*, the reader's own pick, and
     never to the door the host actually opened. The two
     structurally-forbidden doors, by definition, are the reader's pick
     and the car's door, but the car's door can never be safely badged
     before the stay/switch choice, and SPEC.md's revision-6 escalation
     is explicit on this point: at reveal time the car's door is either
     (i) the same door as the reader's own pick, in which case a
     separate "car's door" badge on it would be redundant at best, or
     (ii) the single remaining unopened door, in which case badging it
     discloses outright that the car isn't behind the reader's own door
     before the reader has chosen to stay or switch. There is no
     rendering of "mark the car's door" that behaves identically in both
     cases without leaking which one obtains, so it cannot be shown
     pre-choice at all. The reader's own pick is the only member of the
     pair that is always safely badgeable: it states just the general
     rule ("the host could never open this door"), true and non-spoiling
     regardless of whether the pick happens to be the car. SPEC.md's own
     suggested non-spoiling phrasing ("mark both the reader's own door
     and the host's opened door as 'ruled out by the rule'") is not
     adopted verbatim here: "ruled out by the rule" loosely covers two
     different facts (the pick was never eligible to be opened; the
     opened door has been shown to be a goat) under one label, and this
     system already has a correct, distinct, established carrier for the
     second fact, the host-opened triplet plus its own ✕ + 🐐 icon pair,
     which fully and correctly states "opened, shown to be a goat"
     without any ineligibility claim, and needs no badge layered on top
     of it. Reusing the ineligibility badge for the host-opened door
     would restate an already-carried fact using a claim that isn't true
     of that door. "As a pair" in SPEC.md's phrasing is read here as
     naming the *definition* of structurally-forbidden (reader's door +
     car's door), not a claim that both members are ever simultaneously
     rendered before the choice resolves; in practice, at reveal time,
     only one of the two ever is. It sits alongside, not instead of, the
     picked door's own ★ icon, because it asserts a second, independent
     fact about that same door, not a replacement for the first. See the
     ICONOGRAPHY and shape sections of `tokens.css` for the full triplet
     and glyph, and the Contrast pairs ledger below for its two verified
     pairs.
   - **Accessible name.** The badge's ⚖ icon stays `aria-hidden="true"`;
     it is not the sole carrier of the fact. Its text label (reused
     verbatim from `copy.json`'s `rules.steps[5]`, no new copy) must be a
     *child* of the badge's own element, immediately after the icon,
     not a sibling that merely follows it in DOM order — a sibling has
     no programmatic association with the badge and only happens to read
     correctly when a screen reader linearizes the whole containing
     button top to bottom. Nesting the label inside the badge makes it
     unambiguously that element's own accessible content.
   This is a real eighth *marking*, but not an eighth door *state* in the
   sense of item 1: it never appears without one of the seven base door
   triplets underneath it, and it never substitutes for the bg/border/text
   pair that already identifies which of the seven states a door is in —
   it only ever adds the one additional claim above on top, and only to
   the one door (the reader's pick) that claim is ever safe to render.
5. **Never make Beat 3's played-vs-spoiled round grid color-only either.**
   The 500-cell grid visualizing Host B's rounds reuses
   `--color-host-random-bg/border` for an ordinary "played" cell (host
   revealed a goat) and `--color-spoiled-bg/border/text` for a "spoiled"
   cell (host revealed the prize outright) — correct color choices, since
   each cell literally *is* one instance of the already-documented
   random-host / spoiled-round states, not a new meaning. But color was
   the only differentiator: identical shape and border style, and only the
   spoiled cell carried an icon. Fixed with the same
   shape + border-style + icon redundancy used for prize/goat and for the
   two host-mode cards: played cells are square-ish
   (`--radius-round-cell-played`, matching the grid's plain default) with a
   solid border (`--border-style-round-played`) and a small checkmark
   (`--icon-round-played-content`, ✓ — a new glyph scoped only to this
   cell state, chosen instead of reusing any existing icon so it can never
   become a second or third meaning the way 🔒 had); spoiled cells are
   circular (`--radius-round-cell-spoiled`) with a dashed border
   (`--border-style-round-spoiled`, echoing the same solid-is-ordinary /
   dashed-is-exception grammar already used for knowing-vs-random hosts)
   and keep the existing 💥 (`--icon-spoiled-content`, reused, not
   redefined — it already means "spoiled round" and this is that same
   state, just rendered smaller). Accessibility requirement, not
   negotiable by ui-engineer: whichever element actually carries the ✓ or
   💥 per cell must NOT be `aria-hidden`, because for an individual cell
   that glyph is the only carrier of that cell's specific status — nothing
   else in the DOM states it per-cell. (The separate grid *legend*'s color
   swatches may stay `aria-hidden`, because each swatch already sits next
   to its own visible text label, e.g. "Played (goat shown)" — the legend
   has a redundant text channel that individual grid cells don't.)

## 2. Palette logic

The palette is organized as four hue families, each carrying one meaning
consistently everywhere it appears, so a reader builds intuition for "what
color means" once and reuses it for the rest of the page:

- **Warm neutral (paper/tan)** — `--color-bg-page`, `--color-bg-surface-alt`,
  `--color-door-unselected-*`. Default, inert, "nothing has happened yet."
- **Indigo/violet** — `--color-accent-primary`, button and poll-selection
  colors, the "key mechanism" callout (`callout-key`, used for
  `rules.mechanismCallout`, `round100.mechanismCallout`, the
  `whyYourDoorDoesntMove.fairnessNote` callout, the inline `rule-host` list
  item, and all three `gutCheckFinal.comparison.*` recap messages), and the
  "stay" statistics bar. This is the page's single interactive/brand color:
  if something is violet, you can click it, or it's the strategy that loses
  more. Doors are deliberately never painted with this family: a door that
  is temporarily non-clickable (see §1 item 4) is dimmed with
  `--opacity-control-disabled` layered over its own existing state color,
  never recolored violet, so "violet = clickable" never has an exception on
  this page.
- **Teal** — `--color-accent-secondary`, the knowing-host mode, the "forced
  choice" table rows, and the "switch" statistics bar. Teal consistently
  means "the certain, rule-bound host" and "the strategy that wins" — the
  same color threads Beat 3's enumeration table, Beat 3's host contrast, and
  Beat 4/6's aggregate bars, reinforcing that they're all evidence for the
  same mechanism.
- **Amber/gold** — the prize reveal, the remaining door (the door that
  turns out to matter), the "free choice" table row, and the odds callout
  (`callout-stat`). Amber consistently marks "this is where the car
  actually is" or "this is the number that proves it," tying the door grid,
  the enumeration table, and the stats callouts together visually.
- **Red-orange** — the random/broken host and the spoiled-round alert. This
  is the only "something is off" color on the page, reserved for Beat 3's
  explicitly-labeled "what if" contrast, so it never leaks into the real
  game and accidentally implies the real host is unreliable. Beat 3's
  500-cell round grid (§1 item 5) reuses these exact tokens per cell
  (`--color-host-random-*` for "played," `--color-spoiled-*` for
  "spoiled") rather than introducing a sixth hue family, because each cell
  literally is one instance of one of these two already-documented states,
  not a new one.

A separate cool sage-gray (`--color-reveal-goat-*`) is used only for the
final goat reveal, deliberately outside the four families above, so the
goat card never gets confused with the neutral "nothing has happened"
tan or the "something's wrong" red-orange — it's simply "not the car,"
plainly.

A second special-purpose family, a desaturated dark graphite
(`--color-door-ineligible-badge-*`), is used only for the Beat-2
door-ineligibility badge (§1 item 4). Like the goat's sage-gray, it sits
deliberately outside the four hue families above so it can never be
mistaken for one of their meanings — most importantly it is not violet,
so it never contradicts "violet = clickable" the way an earlier build's
badge did. Its low saturation is itself meaningful: every other family on
this page is a saturated, "colorful" hue carrying an emotional or
game-state read (win/lose, certain/random, alarm), whereas this badge is
a flat, ink-like stamp, closer to printed marginalia than to a game
color, matching its role as a purely logical annotation ("excluded by the
rule") rather than a game outcome.

## 3. Typography

Headings use a serif stack (`--font-family-heading`, Georgia-led) for
editorial, argumentative gravitas — this page is closer to a persuasive
essay than a game UI. Body copy uses a system sans-serif stack
(`--font-family-body`) for maximum legibility across the long-form
reasoning in Beats 3, 7, and 8. A monospace stack (`--font-family-mono`) is
reserved for dynamic numeric values (win rates, trial counts, door numbers)
so statistics visually read as *data*, distinct from prose, wherever they're
inlined in a sentence. All three stacks are system-font fallback chains with
no external font loading, since `index.html` must open directly from the
filesystem with no build step and no guaranteed network access.

Sizes follow a ~1.25 modular scale from a 16px base. Line heights are
generous (1.6 body, 1.75 for long callout paragraphs) because several
copy blocks (`mechanismContrast.takeaway`, FAQ answers) are dense,
multi-clause arguments that need visual room to be read carefully rather
than skimmed.

## 4. Spacing, radius, motion

An 8px-based spacing scale (`--space-*`) covers everything from icon gaps
(4px) to section breaks (96px). Radius tokens are deliberately reused as a
shape-differentiation device (see §1.2) rather than purely decorative:
`--radius-pill` for the prize badge, `--radius-md` for the goat badge,
`--radius-sm`/`--radius-lg` for general card chrome.

Motion tokens include a slower, slightly overshooting easing
(`--easing-emphasize`) paired with `--duration-door-open` (600ms),
intended for the door-opening/reveal moment specifically — the one
animation on the page that should feel like an event, not a UI transition.
Every other interaction (buttons, accordion, poll selection) uses the
faster, standard-eased tokens so the page doesn't feel sluggish during the
repeated batch-trial interactions of Beats 4 and 6.

Two dimension tokens sit alongside `--door-size-lg`/`--door-size-sm`:
`--size-reveal-card` (6.5rem) fixes the width/height of the prize/goat
reveal badges, and `--max-width-door-grid-100` (40rem) caps the width of
the 100-door grid so its 10-column layout doesn't stretch edge-to-edge on
wide viewports. Both were sized to match the values already in use so
introducing them doesn't shift any existing layout.

ui-engineer flagged three more literals while building Beat 3's 500-cell
Host B round grid that had no fitting token anywhere in the existing
`--space-*`/`--radius-*`/`--font-size-*`/`--border-width-*` scales: the
grid's `max-width: 26rem`, and the individual `.round-cell`/legend
`.swatch`'s `width`/`height: 0.85rem` and `font-size: 0.5rem` (closest
scale neighbors are `--space-xs`/`--font-size-xs` at 0.75rem — not close
enough to reuse without visibly changing the grid's density). Minted
three new tokens for them, following the same precedent as
`--size-reveal-card`/`--max-width-door-grid-100` above rather than
stretching the shared scale to fit a value only one component needs:

- `--max-width-round-grid: 26rem` — caps the round grid's width, same
  role as `--max-width-door-grid-100` for the other grid.
- `--size-round-cell: 0.85rem` — width/height shared by `.round-cell` and
  the legend's `.swatch`, so the real cells and their legend key read as
  the same size.
- `--font-size-round-cell: 0.5rem` — sized for the ✓/💥 glyph to sit
  legibly inside an 0.85rem cell at a 500-cell grid density; a step below
  even `--font-size-xs` (0.75rem) because at 500 cells per grid, the
  ordinary type scale's smallest step is still too large to fit two
  glyphs plus a visible border/gap between cells without the grid
  overflowing its capped width.

All three are deliberately scoped to this one fixed-count grid layout —
sized to fit exactly 500 small cells in a bounded width, not a reusable
spacing or type decision — the same reasoning that already justifies
`--door-size-sm`/`--door-size-lg` and `--size-reveal-card` living outside
the general `--space-*`/`--font-size-*` scales rather than being folded
into them. ui-engineer is responsible for applying these three tokens to
the `.round-grid`/`.round-cell`/`.swatch` rules in place of the literals
flagged above; minting them here does not itself change any rendered
output.

## 5. Accessibility commitments

- Every text/background token pair defined in this system was checked
  against WCAG AA (4.5:1 for normal text, 3:1 for the UI-component pairs
  — door/reveal borders and the focus ring). All ratios below are computed
  directly from the literal hex values in `tokens.css`, not estimated.
- Door containers (`.door-grid-3`, `.door-grid-100`) are self-contained
  panels: they hardcode `background: var(--color-bg-surface)` unconditionally,
  the same way callouts, reveal cards, and host-mode cards each carry their
  own fixed surface color rather than inheriting whichever beat section
  wraps them. This is deliberate — `--color-bg-surface` is documented above
  (see its `tokens.css` comment, "cards, panels, doors' container") as the
  fixed panel layer, distinct from the alternating page wash. Door grids
  therefore never actually sit on `--color-bg-surface-alt`, and all four
  door-border tokens (`--color-door-unselected-border`,
  `--color-door-picked-border`, `--color-door-host-opened-border`,
  `--color-door-remaining-border`) are checked only against
  `--color-bg-surface`. Checking `--color-door-unselected-border` and
  `--color-door-host-opened-border` against that real background surfaced
  two tokens that didn't clear AA-UI (3:1) with a comfortable margin — the
  originals (`#B7AF9A`, `#8B8474`) were picked before that pairing was
  verified. Both were darkened within the same warm-neutral/muted-olive
  family (`#726D60`, `#767063`) rather than changing hue, so the
  "unopened/inert" and "host-opened/de-emphasized" states still read the
  same way, just with a real safety margin.
- Host-mode cards (`.host-card` / `.host-knowing` / `.host-random`) are a
  different case: they only ever appear once on the page, inside
  `beat-mechanism` (Beat 3, the mechanism-contrast section). `beat-mechanism`
  is the fourth `section.beat` in document order, which is an *even*
  position, so per the alternating-section rule
  (`section.beat:nth-of-type(even)` → `--color-bg-surface-alt`) it always
  renders on `--color-bg-surface-alt`, never `--color-bg-page` and never
  plain `--color-bg-surface`. `--color-host-knowing-border` and
  `--color-host-random-border` are checked against that actual background,
  and both clear AA-UI (3:1) with a comfortable margin (5.11:1 and 4.98:1
  respectively).
- Beat 3's round grid (`.round-grid`, §1 item 5) lives inside that same
  `beat-mechanism` section and has no background of its own, so it also
  renders on `--color-bg-surface-alt`, not `--color-bg-surface`. Reusing
  `--color-host-random-border` for played cells is already covered by the
  host-card check directly above (same token, same background, 4.98:1).
  `--color-spoiled-border` had not previously been checked against this
  background (its existing ledger entry checks it against its own
  `--color-spoiled-bg`, for the separate `.spoiled-note` inline alert) —
  checked fresh for the round-grid cells specifically, it clears AA-UI with
  4.93:1.
- Prize vs. goat, knowing-host vs. random-host, and Beat 3's round-grid
  played-vs-spoiled cells are each differentiated by shape, border style,
  and icon glyph in addition to color (see §1 items 2, 3, and 5, and the
  SHAPE/PATTERN and ICONOGRAPHY sections of `tokens.css`). For the round
  grid specifically: whichever element carries the per-cell ✓/💥 glyph
  must not be `aria-hidden`, since it is the only carrier of that
  individual cell's status (see §1 item 5 for why the legend's swatches are
  the one exception allowed to stay `aria-hidden`).
- The Beat-2 door-ineligibility badge (§1 item 4) is a small, self-contained
  chip (like the reveal-prize/goat badges), so its border and text are
  checked against its own background rather than against whatever door
  triplet happens to sit underneath it: `--color-door-ineligible-badge-text`
  on `--color-door-ineligible-badge-bg` clears AA-NORMAL at 10.80:1, and
  `--color-door-ineligible-badge-border` on that same background clears
  AA-UI (3:1) at 4.19:1. The separate, still-generic
  `--opacity-control-disabled` / `--cursor-disabled` pairing (the "not
  clickable right now" fact, distinct from the badge's "structurally
  forbidden to open" fact) continues to need no ledger entry: it's a
  uniform opacity multiplier applied on top of whichever door triplet
  already cleared AA above, not an independently authored color. As of
  the post-build bug fix recorded in §1 item 4, this chip appears on at
  most one door per round (the reader's own pick), never on the
  host-opened door.
- **Badge accessible name (post-build fix).** The badge's ⚖ icon
  (`--icon-door-ineligible-content`) carries no accessible name of its
  own and stays `aria-hidden="true"` — it is not the sole carrier of the
  fact, unlike the round-grid ✓/💥 glyphs above, because a visually
  hidden text label sits alongside it. That label must be a *child* of
  the `.door-ineligible-badge` element (immediately after the icon, same
  span), not merely a sibling that happens to follow it in the DOM: a
  sibling has no programmatic association with the badge and only reads
  correctly for a screen reader linearizing the whole button's content
  top to bottom, not for any other means of inspecting the badge itself.
  Nesting the label inside the badge span makes it unambiguously that
  element's own accessible content, consistent with the
  icon-decorative-plus-adjacent-visible-or-sr-only-label pattern already
  used for the round-grid legend's swatches elsewhere on this page. The
  label text itself is unchanged: `copy.json`'s `rules.steps[5]` verbatim,
  no new copy introduced, reused because it states the exact rule the
  badge visualizes ("he never opens your door or the car's door").
- Focus states use a dedicated `--color-focus-ring` (3:1 against the page
  background, non-text UI contrast). `--shadow-focus` — the box-shadow
  actually applied to focusable elements — is built from
  `color-mix(in srgb, var(--color-focus-ring) 45%, transparent)` rather than
  an independently authored rgba literal, so the ring color a keyboard user
  actually sees is mechanically tied to the one token verified below, not a
  hand-picked value that merely happens to match it.
- Interactive state variants (`:hover`, `:focus`) were audited against every
  selector that actually applies them in `index.html`, not just the resting
  state. `.btn-primary:hover` repaints its background to
  `--color-button-primary-bg-hover` while keeping white
  `--color-button-primary-text`, and `.btn-secondary:hover` repaints to
  `--color-button-secondary-bg-hover` while keeping
  `--color-button-secondary-text` — both are real, reachable text/background
  pairs a mouse user will see and are checked below at AA-NORMAL (button
  labels are 16px/medium-weight, not large text). `.door-unselected:hover`
  uses a `filter: brightness()` tweak rather than swapping to a distinct
  color token, so it isn't a separate literal pair to check. Tokens that
  exist in `tokens.css` but aren't wired to any selector yet
  (`--color-accent-primary-hover`, `--color-accent-secondary-hover`,
  `--color-link-text-hover`) are reserved for future use and are not
  reachable state pairs today, so they're intentionally not in the ledger
  until ui-engineer consumes them. `--color-link-text` (the corresponding
  base/resting link color) has been removed from `tokens.css` entirely,
  not just left unwired: every clickable element on this page is a
  `<button>`, never an `<a>` or link-styled span, confirmed by reading
  `index.html` and `viz.js` in full — there is no current or planned
  selector that would ever consume it. Its now-dead
  `CONTRAST --color-link-text ON --color-bg-page` ledger entry has been
  removed accordingly. `--color-link-text-hover` is left in place, still
  reserved, in case a real inline link is added to the page later.

## Contrast pairs

CONTRAST --color-text-primary ON --color-bg-page = 14.26 AA-NORMAL
CONTRAST --color-text-primary ON --color-bg-surface = 15.65 AA-NORMAL
CONTRAST --color-text-primary ON --color-bg-surface-alt = 13.05 AA-NORMAL
CONTRAST --color-text-secondary ON --color-bg-page = 7.20 AA-NORMAL
CONTRAST --color-text-secondary ON --color-bg-surface = 7.91 AA-NORMAL
CONTRAST --color-text-secondary ON --color-bg-surface-alt = 6.60 AA-NORMAL
CONTRAST --color-text-inverse ON --color-bg-inverse = 14.33 AA-NORMAL
CONTRAST --color-text-inverse ON --color-bg-inverse-alt = 12.38 AA-NORMAL
CONTRAST --color-text-inverse-secondary ON --color-bg-inverse = 9.90 AA-NORMAL
CONTRAST --color-button-primary-text ON --color-button-primary-bg = 8.53 AA-NORMAL
CONTRAST --color-button-primary-text ON --color-button-primary-bg-hover = 10.89 AA-NORMAL
CONTRAST --color-button-secondary-text ON --color-button-secondary-bg = 8.53 AA-NORMAL
CONTRAST --color-button-secondary-text ON --color-button-secondary-bg-hover = 7.15 AA-NORMAL
CONTRAST --color-option-selected-text ON --color-option-selected-bg = 8.53 AA-NORMAL
CONTRAST --color-option-unselected-text ON --color-option-unselected-bg = 15.65 AA-NORMAL
CONTRAST --color-focus-ring ON --color-bg-page = 4.67 AA-UI
CONTRAST --color-callout-key-text ON --color-callout-key-bg = 12.67 AA-NORMAL
CONTRAST --color-callout-reminder-text ON --color-callout-reminder-bg = 11.44 AA-NORMAL
CONTRAST --color-callout-stat-text ON --color-callout-stat-bg = 12.08 AA-NORMAL
CONTRAST --color-callout-neutral-text ON --color-callout-neutral-bg = 13.05 AA-NORMAL
CONTRAST --color-door-unselected-text ON --color-door-unselected-bg = 10.46 AA-NORMAL
CONTRAST --color-door-picked-text ON --color-door-picked-bg = 12.48 AA-NORMAL
CONTRAST --color-door-host-opened-text ON --color-door-host-opened-bg = 6.38 AA-NORMAL
CONTRAST --color-door-remaining-text ON --color-door-remaining-bg = 12.08 AA-NORMAL
CONTRAST --color-door-unselected-border ON --color-bg-surface = 5.16 AA-UI
CONTRAST --color-door-picked-border ON --color-bg-surface = 6.35 AA-UI
CONTRAST --color-door-host-opened-border ON --color-bg-surface = 4.94 AA-UI
CONTRAST --color-door-remaining-border ON --color-bg-surface = 4.53 AA-UI
CONTRAST --color-reveal-prize-text ON --color-reveal-prize-bg = 11.20 AA-NORMAL
CONTRAST --color-reveal-prize-border ON --color-reveal-prize-bg = 4.73 AA-UI
CONTRAST --color-reveal-goat-text ON --color-reveal-goat-bg = 12.24 AA-NORMAL
CONTRAST --color-reveal-goat-border ON --color-reveal-goat-bg = 5.37 AA-UI
CONTRAST --color-host-knowing-text ON --color-host-knowing-bg = 10.90 AA-NORMAL
CONTRAST --color-host-knowing-border ON --color-bg-surface-alt = 5.11 AA-UI
CONTRAST --color-host-random-text ON --color-host-random-bg = 11.26 AA-NORMAL
CONTRAST --color-host-random-border ON --color-bg-surface-alt = 4.98 AA-UI
CONTRAST --color-spoiled-text ON --color-spoiled-bg = 11.47 AA-NORMAL
CONTRAST --color-spoiled-border ON --color-spoiled-bg = 4.77 AA-UI
CONTRAST --color-spoiled-border ON --color-bg-surface-alt = 4.93 AA-UI
CONTRAST --color-case-forced-text ON --color-case-forced-bg = 10.90 AA-NORMAL
CONTRAST --color-case-free-text ON --color-case-free-bg = 12.69 AA-NORMAL
CONTRAST --color-table-header-text ON --color-table-header-bg = 14.33 AA-NORMAL
CONTRAST --color-stat-stay-bar-text ON --color-stat-stay-bar-bg = 7.01 AA-NORMAL
CONTRAST --color-stat-switch-bar-text ON --color-stat-switch-bar-bg = 6.12 AA-NORMAL
CONTRAST --color-door-ineligible-badge-text ON --color-door-ineligible-badge-bg = 10.80 AA-NORMAL
CONTRAST --color-door-ineligible-badge-border ON --color-door-ineligible-badge-bg = 4.19 AA-UI

## 6. Non-color states this system does not gate on color alone

- **Prize vs. goat:** shape (circle vs. rounded-square badge), border style
  (solid vs. dashed), icon (🚗 vs. 🐐), and a stripe pattern unique to the
  goat card.
- **Knowing host vs. random host:** border style (solid vs. dashed) and
  icon (🔒 vs. 🎲), in addition to the teal/red-orange hue difference. The
  🔒 glyph (`--icon-host-knowing-content`) is scoped to exactly two uses on
  this page: this host-mode card, and the "forced" case-table row below
  (same underlying concept — the host has no choice). It is not reused for
  anything else, in particular not for door eligibility (see §1 item 4) —
  keeping it to two, closely-related uses is what makes it legible the
  first time a reader meets it, instead of accumulating unrelated meanings.
- **Forced vs. free-choice case rows (Beat 3 table):** icon (🔒 vs. 🔀), in
  addition to the teal/amber hue difference.
- **Picked door:** carries its own star icon token (`--icon-picked-content`)
  so "this is your door" is never conveyed by border color alone.
- **Host-opened door:** carries an "✕" icon token (`--icon-host-opened-content`)
  in addition to the muted/desaturated bg, so it reads as "eliminated" even
  without color.
- **Round-grid played vs. spoiled cells (Beat 3, §1 item 5):** shape
  (square-ish `--radius-round-cell-played` vs. circular
  `--radius-round-cell-spoiled`), border style (solid
  `--border-style-round-played` vs. dashed `--border-style-round-spoiled`),
  and icon (✓ `--icon-round-played-content`, scoped only to this cell state,
  vs. 💥 `--icon-spoiled-content`, reused from the existing spoiled-round
  meaning), in addition to the pale-orange/deeper-orange hue difference.
  The per-cell icon must not be `aria-hidden` (see §5); the legend swatches
  may stay `aria-hidden` since each has an adjacent visible text label.
- **Doors that are temporarily non-clickable (Beat 2, §1 item 4):** the
  interaction fact alone ("can't click this right now") is not a color/icon
  state at all, by design — carried by `--opacity-control-disabled` dimming
  the door's existing, already-differentiated triplet and icon, plus the
  non-visual HTML `disabled` attribute.
- **Doors the host's rule structurally could not have opened (Beat 2, §1
  item 4):** a separate game-logic fact, carried by its own dedicated
  badge — a distinct dark-graphite triplet
  (`--color-door-ineligible-badge-bg/border/text`) plus a ⚖ glyph
  (`--icon-door-ineligible-content`) scoped to exactly this meaning. It is
  deliberately not violet (would collide with "clickable"), not the 🔒
  lock glyph (would collide with the host's epistemic certainty in Beat
  3), and not conveyed by opacity alone (would collide with ordinary
  disabled-button styling and lose the claim entirely). It renders
  alongside, never instead of, the picked door's ★. **Corrected scope
  (post-build bug fix):** it is applied to at most one door at reveal
  time, the reader's own pick, and it never renders on the host-opened
  door. The two structurally-forbidden doors, by definition, are the
  reader's pick and the car's door, but the car's door can never be
  safely badged before the stay/switch choice (it either coincides with
  the pick or is the single remaining door, and marking it either way
  discloses the prize's location ahead of the choice) — see §1 item 4
  above for the full reasoning. The host-opened door's ✕
  icon over its own muted triplet already fully and correctly states its
  status ("opened, shown to be a goat") without any ineligibility claim,
  which the host-opened door never actually satisfied (opening it is
  what the host's rule permitted, not what it forbade).
