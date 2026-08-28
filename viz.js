// viz.js — Monty Hall Interactive Explainer
// UI wiring + visualization. Owns index.html's DOM. Treats sim.js's
// globalThis.MontyHall.{playRound, runTrials} as a black box. All
// user-facing strings come from the embedded copy.json script block —
// nothing here invents or alters copy.

(function () {
  "use strict";

  var copy = JSON.parse(document.getElementById("copy").textContent);
  var MH = globalThis.MontyHall;

  var MECH_N = 500; // trial count for Beat 3's knowing-vs-random contrast

  var state = {
    initialAnswer: null,
    finalAnswer: null
  };

  var agg3 = { total: 0, stayWins: 0, switchWins: 0 };
  var agg100 = { total: 0, stayWins: 0, switchWins: 0 };

  var round3DoorEls = {};
  var round100DoorEls = {};

  // -----------------------------------------------------------------------
  // Small helpers
  // -----------------------------------------------------------------------
  function fillTemplate(str, vars) {
    return str.replace(/\{\{(\w+)\}\}/g, function (m, k) {
      return vars[k] !== undefined ? vars[k] : m;
    });
  }

  function pct(x) {
    return (x * 100).toFixed(1);
  }

  function randomSeed() {
    return Math.floor(Math.random() * 1e9);
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  // Auto-linkifies the first http(s):// URL found in `text`, HTML-escaping
  // everything (including the URL itself, belt-and-suspenders since this
  // is trusted first-party copy) so no injection risk is introduced by
  // switching this render from .textContent to .innerHTML. No new color
  // token: the resulting <a> inherits its surrounding text color (see
  // ".colophon a" in index.html's <style> block) so no new contrast pair
  // is created here.
  function linkifyFirstUrl(text) {
    var urlRegex = /(https?:\/\/[^\s]+)/;
    var match = text.match(urlRegex);
    if (!match) return escapeHtml(text);
    var before = text.slice(0, match.index);
    var url = match[0];
    var after = text.slice(match.index + url.length);
    return (
      escapeHtml(before) +
      '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(url) + "</a>" +
      escapeHtml(after)
    );
  }

  // Reads a --duration-* token's literal value out of tokens.css at
  // runtime (rather than hardcoding a millisecond number in JS) so the
  // cadence stays mechanically tied to the one token authored there, the
  // same "derive it, don't hand-pick a value that merely matches"
  // philosophy DESIGN.md uses for --shadow-focus. Falls back to
  // `fallbackMs` only if the token is somehow missing.
  function cssDurationMs(varName, fallbackMs) {
    var raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    if (!raw) return fallbackMs;
    var n = parseFloat(raw);
    if (isNaN(n)) return fallbackMs;
    return raw.indexOf("ms") !== -1 ? n : n * 1000;
  }

  // Live-batch checkpoint cadence (see runLiveBatch below). Must be >=
  // --duration-fast (180ms), the transition already applied to
  // .stat-bar-fill's width, so each checkpoint's bar animation actually
  // finishes before the next tick repaints it. --duration-base (280ms)
  // clears that with a real margin rather than tying it exactly. Read
  // lazily (not once at module-init time) so it's safe even if this
  // script were ever to run before tokens.css has finished applying.
  function liveBatchTickMs() {
    return cssDurationMs("--duration-base", 280);
  }

  // unlock(id, scroll) — scroll defaults to true. Pass false to unlock a
  // beat's content (remove .locked) without stealing scroll focus away
  // from wherever the reader currently is (see Beat 7 -> Beat 8/9 wiring).
  function unlock(id, scroll) {
    var el = document.getElementById(id);
    el.classList.remove("locked");
    if (scroll !== false) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function revealCard(n, isPrize) {
    return (
      '<div class="reveal-card ' + (isPrize ? "reveal-prize" : "reveal-goat") + '">' +
      '<span class="icon ' + (isPrize ? "icon-prize" : "icon-goat") + '"></span>' +
      '<span class="reveal-caption">Door ' + n + "</span>" +
      "</div>"
    );
  }

  function statBars(stayPct, switchPct, stayLabel, switchLabel) {
    return (
      '<div class="stat-bars">' +
        '<div class="stat-bar-row"><div class="stat-bar-caption">' + stayLabel + '</div>' +
          '<div class="stat-bar-track"><div class="stat-bar-fill stat-bar-stay" style="width:' + stayPct + '%">' + stayPct + '%</div></div>' +
        '</div>' +
        '<div class="stat-bar-row"><div class="stat-bar-caption">' + switchLabel + '</div>' +
          '<div class="stat-bar-track"><div class="stat-bar-fill stat-bar-switch" style="width:' + switchPct + '%">' + switchPct + '%</div></div>' +
        '</div>' +
      '</div>'
    );
  }

  // -----------------------------------------------------------------------
  // Door-label remapping: sim.js picks its own random playerPick/prizeDoor.
  // Since doors are interchangeable before any pick is made, we build a
  // bijection between sim's internal door indices and the door numbers the
  // reader actually clicked, so the displayed round matches what the
  // reader did while every probability still comes straight out of sim.js.
  // -----------------------------------------------------------------------
  function buildDoorMapping(doorCount, clickedDisplay, simPlayerPick) {
    var map = new Array(doorCount);
    map[simPlayerPick] = clickedDisplay;
    var remainingDisplays = [];
    for (var d = 1; d <= doorCount; d++) {
      if (d !== clickedDisplay) remainingDisplays.push(d);
    }
    var idx = 0;
    for (var s = 0; s < doorCount; s++) {
      if (s === simPlayerPick) continue;
      map[s] = remainingDisplays[idx++];
    }
    return map;
  }

  function playInteractiveRound(doorCount, clickedDisplay) {
    var result = MH.playRound(doorCount, false, "knowing", Math.random);
    var map = buildDoorMapping(doorCount, clickedDisplay, result.playerPick);
    return {
      raw: result,
      map: map,
      pickedDisplay: clickedDisplay,
      hostDisplay: result.openedDoors.map(function (d) { return map[d]; }).sort(function (a, b) { return a - b; }),
      remainingDisplay: map[result.switchTarget],
      prizeDisplay: map[result.prizeDoor]
    };
  }

  // -----------------------------------------------------------------------
  // Meta + footer
  // -----------------------------------------------------------------------
  function renderMeta() {
    document.getElementById("meta-title").textContent = copy.meta.title;
    document.getElementById("meta-subtitle").textContent = copy.meta.subtitle;
    document.getElementById("meta-intro").textContent = copy.meta.intro;
  }

  function renderFooter() {
    document.getElementById("footer-text").textContent = copy.footer.text;
    document.getElementById("footer-note").textContent = copy.footer.note;
    // Colophon: credits/meta line about how the page itself was produced.
    // The repo URL inside copy.colophon.text is auto-linkified (see
    // linkifyFirstUrl above) rather than left as literal text. No new
    // link-text color token is introduced -- DESIGN.md documents that
    // --color-link-text was removed from tokens.css entirely, so the
    // anchor simply inherits --color-text-inverse-secondary from its
    // surrounding text (already verified against --color-bg-inverse in
    // DESIGN.md's contrast ledger for this exact spot) and is set apart
    // visually with an underline only (".colophon a" in index.html).
    document.getElementById("colophon-text").innerHTML = linkifyFirstUrl(copy.colophon.text);
  }

  // -----------------------------------------------------------------------
  // Beat 0 — gut-check poll (initial)
  // -----------------------------------------------------------------------
  function renderGutcheck0() {
    var c = copy.gutCheckInitial;
    var el = document.getElementById("beat-gutcheck0");
    el.innerHTML =
      "<h2>" + c.heading + "</h2>" +
      "<p>" + c.body + "</p>" +
      "<p>" + c.prompt + "</p>" +
      '<div class="poll-options" id="gutcheck0-options"></div>' +
      '<button class="btn-primary" id="gutcheck0-confirm" disabled>' + c.confirmButton + "</button>";

    var selected = null;
    var wrap = document.getElementById("gutcheck0-options");
    c.options.forEach(function (opt) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "poll-option";
      b.textContent = opt.label;
      b.addEventListener("click", function () {
        selected = opt;
        Array.prototype.forEach.call(wrap.children, function (x) { x.classList.remove("selected"); });
        b.classList.add("selected");
        document.getElementById("gutcheck0-confirm").disabled = false;
      });
      wrap.appendChild(b);
    });

    document.getElementById("gutcheck0-confirm").addEventListener("click", function () {
      if (!selected) return;
      state.initialAnswer = selected;
      Array.prototype.forEach.call(wrap.children, function (x) { x.disabled = true; });
      document.getElementById("gutcheck0-confirm").disabled = true;
      unlock("beat-rules");
    });
  }

  // -----------------------------------------------------------------------
  // Beat 1 — rules
  // -----------------------------------------------------------------------
  function renderRules() {
    var c = copy.rules;
    var el = document.getElementById("beat-rules");
    var stepsHtml = c.steps.map(function (s, i) {
      var isLast = i === c.steps.length - 1;
      return '<li class="' + (isLast ? "rule-host" : "") + '">' + s + "</li>";
    }).join("");

    el.innerHTML =
      "<h2>" + c.heading + "</h2>" +
      '<ol class="rules-list">' + stepsHtml + "</ol>" +
      '<div class="callout callout-key">' +
        '<span class="callout-label">' + c.mechanismCallout.label + "</span>" +
        "<p style=\"margin:0\">" + c.mechanismCallout.text + "</p>" +
      "</div>" +
      '<button class="btn-primary" id="rules-continue">' + c.continueButton + "</button>";

    document.getElementById("rules-continue").addEventListener("click", function () {
      unlock("beat-round3");
    });
  }

  // -----------------------------------------------------------------------
  // Beat 2 — round3 (3-door playable round)
  // -----------------------------------------------------------------------
  function renderRound3() {
    var c = copy.round3;
    var el = document.getElementById("beat-round3");
    el.innerHTML = "<h2>" + c.heading + "</h2><p>" + c.intro + '</p><div id="round3-stage"></div>';
    startRound3();
  }

  function startRound3() {
    var c = copy.round3;
    var stage = document.getElementById("round3-stage");
    round3DoorEls = {};
    stage.innerHTML =
      '<p id="round3-pick-prompt">' + c.pickPrompt + "</p>" +
      '<div class="door-grid-3" id="round3-doors"></div>' +
      '<div id="round3-after"></div>';

    var grid = document.getElementById("round3-doors");
    for (var n = 1; n <= 3; n++) {
      (function (n) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "door door-unselected";
        btn.innerHTML = '<span class="door-icons"></span><span class="door-num">' + fillTemplate(c.doorLabel, { n: n }) + "</span>";
        btn.addEventListener("click", function () { onRound3Pick(n); });
        grid.appendChild(btn);
        round3DoorEls[n] = btn;
      })(n);
    }
  }

  function onRound3Pick(pickedN) {
    var c = copy.round3;
    Object.keys(round3DoorEls).forEach(function (k) { round3DoorEls[k].disabled = true; });
    round3DoorEls[pickedN].className = "door door-picked";
    round3DoorEls[pickedN].innerHTML =
      '<span class="door-icons"><span class="icon icon-picked"></span></span>' +
      '<span class="door-num">' + fillTemplate(c.doorLabel, { n: pickedN }) + "</span>" +
      '<span class="reveal-caption">' + c.pickedLabel + "</span>";

    var promptEl = document.getElementById("round3-pick-prompt");
    if (promptEl) promptEl.remove();

    var after = document.getElementById("round3-after");
    after.innerHTML = '<p class="status-text">' + c.hostThinking + "</p>";

    setTimeout(function () {
      var game = playInteractiveRound(3, pickedN);
      showRound3Host(game, after);
    }, 500);
  }

  // Beat 2 door-ineligibility marking (DESIGN.md Sec.1 item 4). At the
  // moment of the reveal, and before the reader is asked to stay/switch,
  // two independent facts become true of the reader's own door and the
  // door the host just opened:
  //   (a) neither is clickable right now -- a UI-interaction fact,
  //       carried by the "door-ineligible-interaction" class (reuses
  //       --opacity-control-disabled / --cursor-disabled, the same
  //       generic disabled affordance used by .btn-primary:disabled /
  //       .btn-secondary:disabled elsewhere on the page).
  //   (b) the host's rule could never have opened either of them -- a
  //       game-logic fact, carried by this dedicated badge (its own
  //       dark-graphite triplet + ⚖ glyph), rendered ALONGSIDE, not
  //       instead of, the door's existing identity icon (star / X).
  // Per DESIGN.md's third-attempt correction, the badge itself is applied
  // ONLY to the reader's own picked door, never to the door the host
  // opened: "structurally forbidden to open" is a fact about a pair
  // evaluated *before* the host acts (the reader's own door and whichever
  // door holds the car), and the host-opened door is neither of those --
  // opening it is exactly what the host's rule permitted. The host-opened
  // door still gets fact (a), the interaction-disabled class, plus its
  // existing goat/X icons; it just never gets this badge. The remaining
  // unopened door is left unmarked by either channel so nothing here
  // discloses which door (if either) is the prize before the reader
  // chooses. The badge's accessible name is carried by its own nested
  // sr-only span (copy.json's own rules.steps[5] verbatim — no new copy
  // is introduced), not a disconnected sibling, so the badge element has
  // a real programmatic accessible name.
  function doorIneligibleBadgeHtml() {
    var ruleText = copy.rules.steps[5];
    return (
      '<span class="door-ineligible-badge"><span class="icon icon-door-ineligible" aria-hidden="true"></span><span class="sr-only">' + ruleText + "</span></span>"
    );
  }

  function showRound3Host(game, after) {
    var c = copy.round3;

    // Re-mark the reader's own door: still shows it was their pick, now
    // also carries the never-eligible badge (host could never open it).
    var pickedN = game.pickedDisplay;
    round3DoorEls[pickedN].className = "door door-picked door-ineligible-interaction";
    round3DoorEls[pickedN].innerHTML =
      '<span class="door-icons"><span class="icon icon-picked"></span></span>' +
      doorIneligibleBadgeHtml() +
      '<span class="door-num">' + fillTemplate(c.doorLabel, { n: pickedN }) + "</span>" +
      '<span class="reveal-caption">' + c.pickedLabel + "</span>";

    var hostN = game.hostDisplay[0];
    round3DoorEls[hostN].className = "door door-host-opened door-ineligible-interaction";
    round3DoorEls[hostN].innerHTML =
      '<span class="door-icons"><span class="icon icon-host-opened"></span><span class="icon icon-goat"></span></span>' +
      '<span class="door-num">' + fillTemplate(c.doorLabel, { n: hostN }) + "</span>";

    // The remaining closed door gets its usual "this is the one left to
    // decide about" highlight only — no never-eligible badge, and no
    // prize/goat marking of any kind, so nothing here reveals whether it
    // (or the reader's own door) is the prize door before the choice.
    var remN = game.remainingDisplay;
    round3DoorEls[remN].className = "door door-remaining";
    round3DoorEls[remN].innerHTML =
      '<span class="door-icons"><span class="icon icon-remaining"></span></span>' +
      '<span class="door-num">' + fillTemplate(c.doorLabel, { n: remN }) + "</span>";

    after.innerHTML =
      "<p>" + fillTemplate(c.hostRevealText, { hostDoor: hostN }) + "</p>" +
      '<div class="callout callout-reminder">' + fillTemplate(c.hostKnowledgeReminder, { pickedDoor: game.pickedDisplay }) + "</div>" +
      "<p>" + fillTemplate(c.switchPrompt, { pickedDoor: game.pickedDisplay, remainingDoor: remN }) + "</p>" +
      '<div id="round3-choice-buttons"></div>';

    var stayBtn = document.createElement("button");
    stayBtn.className = "btn-secondary";
    stayBtn.textContent = fillTemplate(c.stayButton, { pickedDoor: game.pickedDisplay });
    stayBtn.addEventListener("click", function () { onRound3Choice(game, "stay", after); });

    var switchBtn = document.createElement("button");
    switchBtn.className = "btn-primary";
    switchBtn.textContent = fillTemplate(c.switchButton, { remainingDoor: remN });
    switchBtn.addEventListener("click", function () { onRound3Choice(game, "switch", after); });

    var wrap = document.getElementById("round3-choice-buttons");
    wrap.appendChild(stayBtn);
    wrap.appendChild(switchBtn);
  }

  function onRound3Choice(game, choice, after) {
    var c = copy.round3;
    var wrap = document.getElementById("round3-choice-buttons");
    wrap.innerHTML = "";
    var revealBtn = document.createElement("button");
    revealBtn.className = "btn-primary";
    revealBtn.textContent = c.revealPrompt;
    revealBtn.addEventListener("click", function () { onRound3Reveal(game, choice, after); });
    wrap.appendChild(revealBtn);
  }

  function onRound3Reveal(game, choice, after) {
    var c = copy.round3;
    var win = choice === "stay"
      ? (game.raw.playerPick === game.raw.prizeDoor)
      : (game.raw.switchTarget === game.raw.prizeDoor);

    var resultText;
    if (choice === "stay") resultText = win ? c.resultWinStay : c.resultLoseStay;
    else resultText = win ? c.resultWinSwitch : c.resultLoseSwitch;

    var pickedIsPrize = game.raw.prizeDoor === game.raw.playerPick;

    after.innerHTML =
      '<div class="reveal-row">' +
        revealCard(game.pickedDisplay, pickedIsPrize) +
        revealCard(game.remainingDisplay, !pickedIsPrize) +
      "</div>" +
      "<p>" + resultText + "</p>" +
      '<div id="round3-post-actions"></div>';

    var actionsWrap = document.getElementById("round3-post-actions");
    var again = document.createElement("button");
    again.className = "btn-secondary";
    again.textContent = c.playAgainButton;
    again.addEventListener("click", startRound3);

    var cont = document.createElement("button");
    cont.className = "btn-primary";
    cont.textContent = c.continueButton;
    cont.addEventListener("click", function () { unlock("beat-mechanism"); });

    actionsWrap.appendChild(again);
    actionsWrap.appendChild(cont);
  }

  // -----------------------------------------------------------------------
  // Beat 3 — mechanism contrast (three-case table + knowing/random hosts)
  // -----------------------------------------------------------------------
  function renderMechanismContrast() {
    var c = copy.mechanismContrast;
    var el = document.getElementById("beat-mechanism");
    el.innerHTML =
      "<h2>" + c.heading + "</h2>" +
      "<p>" + c.intro + "</p>" +
      '<div id="three-case-block"></div>' +
      '<div id="host-contrast-block"></div>' +
      '<div id="mech-takeaway"></div>' +
      '<button class="btn-primary" id="mech-continue">' + c.continueButton + "</button>";

    renderThreeCaseTable();
    renderHostContrast();

    document.getElementById("mech-continue").addEventListener("click", function () {
      unlock("beat-agg3");
    });
  }

  function renderThreeCaseTable() {
    var tc = copy.mechanismContrast.threeCases;
    var container = document.getElementById("three-case-block");
    var rowsHtml = tc.rows.map(function (r, i) {
      var forced = i !== 0; // row 0 is the free-choice case
      var rowClass = forced ? "case-forced" : "case-free";
      var icon = forced ? "icon-case-forced" : "icon-case-free";
      return (
        '<tr class="' + rowClass + '">' +
          '<td class="case-name"><span class="icon ' + icon + '"></span> ' + r.case + "</td>" +
          "<td>" + r.hostChoice + "</td>" +
          "<td>" + r.ifSwitch + "</td>" +
        "</tr>"
      );
    }).join("");

    var wdm = tc.whyYourDoorDoesntMove;

    // Renders one host's route table (label, optional intro, route cards,
    // workedDivision, conclusion) — used for both the knowing host and the
    // random-host comparison table below it.
    function renderRouteTable(hostData) {
      var routesHtml = hostData.routes.map(function (route) {
        return (
          '<div class="route-card">' +
            '<div class="route-label">' + route.label + "</div>" +
            "<p>" + route.detail + "</p>" +
          "</div>"
        );
      }).join("");
      return (
        '<div class="route-table-block">' +
          "<h4>" + hostData.label + "</h4>" +
          (hostData.intro ? "<p>" + hostData.intro + "</p>" : "") +
          '<div class="routes-grid">' + routesHtml + "</div>" +
          (hostData.workedDivision ? "<p>" + hostData.workedDivision + "</p>" : "") +
          "<p>" + hostData.conclusion + "</p>" +
        "</div>"
      );
    }

    container.innerHTML =
      "<h3>" + tc.heading + "</h3>" +
      '<p class="case-table-note">' + tc.note + "</p>" +
      '<table class="case-table">' +
        "<thead><tr><th>Case</th><th>What the host can do</th><th>If you switch</th></tr></thead>" +
        "<tbody>" + rowsHtml + "</tbody>" +
      "</table>" +
      "<p>" + tc.conclusion + "</p>" +
      "<p>" + tc.tieBreakRule + "</p>" +
      '<div class="why-door-block">' +
        "<h4>" + wdm.heading + "</h4>" +
        "<p>" + wdm.lead + "</p>" +
        renderRouteTable(wdm.knowingHost) +
        renderRouteTable(wdm.randomHost) +
        (wdm.comparisonTakeaway ? "<p>" + wdm.comparisonTakeaway + "</p>" : "") +
        '<div class="callout callout-key">' + wdm.fairnessNote + "</div>" +
      "</div>";
  }

  function renderHostContrast() {
    var c = copy.mechanismContrast;
    var container = document.getElementById("host-contrast-block");
    container.innerHTML =
      '<div class="host-cards">' +
        '<div class="host-card host-knowing">' +
          "<h4><span class=\"icon icon-host-knowing\"></span> " + c.knowingHostLabel + "</h4>" +
          "<p>" + c.knowingHostDescription + "</p>" +
          '<div class="host-result" id="knowing-result"></div>' +
        "</div>" +
        '<div class="host-card host-random">' +
          "<h4><span class=\"icon icon-host-random\"></span> " + c.randomHostLabel + "</h4>" +
          "<p>" + c.randomHostDescription + "</p>" +
          '<div class="host-result" id="random-result"></div>' +
          '<div class="round-grid-wrap" id="random-round-grid"></div>' +
        "</div>" +
      "</div>" +
      '<button class="btn-primary" id="run-contrast-btn">' + fillTemplate(c.runButton, { n: MECH_N }) + "</button>";

    document.getElementById("run-contrast-btn").addEventListener("click", runContrast);
  }

  // Beat 3, spoiled-vs-played visual distinction (SPEC.md revision 6).
  // Builds one cell per simulated Host B round so the reader can see
  // spoiling happen, not just read a count. Spoiled rounds (prize
  // revealed outright) use the dedicated --color-spoiled-* tokens; played
  // rounds (host happened to reveal a goat) use the host-random tokens.
  // This is a per-round visual, not a rate claim: the spoil rate here
  // matches the 1/3 baseline exactly, it is not elevated (see
  // mechanismContrast.takeaway for the "which rounds" claim, carried by
  // copy, not by this grid).
  function roundGridHtml(outcomes) {
    var cells = outcomes.map(function (o) {
      if (o === "prizeRevealed") {
        // Per-cell icon is intentionally NOT aria-hidden: for an
        // individual cell, this glyph is the only carrier of that
        // cell's specific status (see DESIGN.md Sec.1 item 5 / Sec.5).
        return '<span class="round-cell round-cell-spoiled" title="Spoiled: Host B revealed the prize"><span class="icon icon-spoiled"></span></span>';
      }
      return '<span class="round-cell round-cell-played" title="Played: Host B revealed a goat"><span class="icon icon-round-played"></span></span>';
    }).join("");
    return (
      '<div class="round-grid" role="img" aria-label="' + outcomes.length + ' simulated Host B rounds, each shown as one cell">' + cells + "</div>" +
      '<div class="round-grid-legend">' +
        '<span><span class="swatch swatch-played" aria-hidden="true"></span><span class="legend-label-played">Played (goat shown)</span></span>' +
        '<span><span class="swatch swatch-spoiled" aria-hidden="true"></span><span class="legend-label-spoiled">Spoiled (prize shown)</span></span>' +
      "</div>"
    );
  }

  function runContrast() {
    var c = copy.mechanismContrast;
    var n = MECH_N;
    var seedK = randomSeed();
    var seedRStay = randomSeed();

    var kSwitch = MH.runTrials(n, 3, "switch", "knowing", seedK);
    var kStay = MH.runTrials(n, 3, "stay", "knowing", seedK);

    // Manual round-by-round loop for Host B (random host) instead of a
    // single runTrials call: this is what lets us build a per-round
    // spoiled/played visual, not just an aggregate count, while still
    // using playRound exactly as sim.js exports it.
    var rWins = 0, rLosses = 0, rSpoiled = 0;
    var outcomes = [];
    for (var i = 0; i < n; i++) {
      var result = MH.playRound(3, "switch", "random", Math.random);
      outcomes.push(result.outcome); // "win" | "loss" | "prizeRevealed"
      if (result.outcome === "win") rWins++;
      else if (result.outcome === "loss") rLosses++;
      else rSpoiled++;
    }
    var rDecided = rWins + rLosses;
    var rSwitchWinPct = rDecided > 0 ? pct(rWins / rDecided) : "0.0";

    var rStay = MH.runTrials(n, 3, "stay", "random", seedRStay);

    document.getElementById("knowing-result").innerHTML =
      "<p>" + fillTemplate(c.knowingHostResult, {
        n: n,
        switchWinPct: pct(kSwitch.winRate),
        stayWinPct: pct(kStay.winRate)
      }) + "</p>";

    document.getElementById("random-result").innerHTML =
      "<p>" + fillTemplate(c.randomHostResult, {
        n: n,
        switchWinPct: rSwitchWinPct,
        stayWinPct: pct(rStay.decidedWinRate),
        spoiledCount: rSpoiled
      }) + "</p>" +
      '<div class="spoiled-note"><span class="icon icon-spoiled"></span> ' + rSpoiled + " of " + n + " rounds spoiled</div>";

    document.getElementById("random-round-grid").innerHTML = roundGridHtml(outcomes);

    // The mechanical "why the two hosts aren't equivalent" explanation is
    // withheld until the reader has actually run the comparison at least
    // once — otherwise it reads as stating the conclusion before the
    // experiment (skeptic finding).
    document.getElementById("mech-takeaway").innerHTML = "<p>" + c.takeaway + "</p>";
  }

  // -----------------------------------------------------------------------
  // Beat 4 — aggregateStats3 (batch trials, 3 doors)
  // -----------------------------------------------------------------------
  function renderAgg3() {
    var c = copy.aggregateStats3;
    var el = document.getElementById("beat-agg3");
    el.innerHTML =
      "<h2>" + c.heading + "</h2>" +
      "<p>" + c.intro + "</p>" +
      '<div id="agg3-buttons"></div>' +
      '<div id="agg3-stats"></div>' +
      '<div id="agg3-interpretation"></div>' +
      '<button class="btn-primary" id="agg3-continue">' + c.continueButton + "</button>";

    var sizes = [10, 100, 1000];
    var wrap = document.getElementById("agg3-buttons");
    c.runButtonOptions.forEach(function (label, i) {
      var b = document.createElement("button");
      b.className = "btn-secondary";
      b.textContent = label;
      b.setAttribute("aria-label", fillTemplate(c.runButton, { n: sizes[i] }));
      b.addEventListener("click", function () { runAgg3(sizes[i]); });
      wrap.appendChild(b);
    });

    document.getElementById("agg3-continue").addEventListener("click", function () {
      unlock("beat-round100");
    });
  }

  // Beats 4 & 6, live-updating win-rate displays (SPEC.md revision 5,
  // §4 item 9). Instead of jumping straight to the final total for a
  // batch, replay it in a handful of growing checkpoints using the exact
  // same seed each time (runTrials is deterministic given a seed, so
  // runTrials(k, ...) and runTrials(m, ...) with k < m and the same seed
  // agree on their first k rounds) and paint each checkpoint on a short
  // timer. The reader watches the running win rate accumulate and
  // converge instead of only ever seeing a static final number.
  function runLiveBatch(opts) {
    var n = opts.n;
    var doorCount = opts.doorCount;
    var seed = randomSeed();
    var steps = Math.min(20, Math.max(5, Math.round(n / 5)));
    var startTotal = opts.agg.total;
    var startStay = opts.agg.stayWins;
    var startSwitch = opts.agg.switchWins;

    opts.buttons.forEach(function (b) { b.disabled = true; });

    var step = 0;
    function tick() {
      step++;
      var partialN = step === steps ? n : Math.round((n * step) / steps);
      var sw = MH.runTrials(partialN, doorCount, "switch", "knowing", seed);
      var st = MH.runTrials(partialN, doorCount, "stay", "knowing", seed);
      opts.agg.total = startTotal + partialN;
      opts.agg.stayWins = startStay + st.wins;
      opts.agg.switchWins = startSwitch + sw.wins;
      opts.onUpdate();
      if (step < steps) {
        setTimeout(tick, liveBatchTickMs());
      } else {
        opts.buttons.forEach(function (b) { b.disabled = false; });
        opts.onDone();
      }
    }
    tick();
  }

  function runAgg3(n) {
    var c = copy.aggregateStats3;
    runLiveBatch({
      n: n,
      doorCount: 3,
      agg: agg3,
      buttons: Array.prototype.slice.call(document.querySelectorAll("#agg3-buttons button")),
      onUpdate: renderAgg3Stats,
      onDone: function () {
        // Interpretation is withheld until the reader has run at least one
        // batch themselves (skeptic finding) — otherwise it states the
        // conclusion before any trial has run.
        document.getElementById("agg3-interpretation").innerHTML = "<p>" + c.interpretation + "</p>";
      }
    });
  }

  function renderAgg3Stats() {
    var c = copy.aggregateStats3;
    var statsEl = document.getElementById("agg3-stats");
    if (!agg3.total) { statsEl.innerHTML = ""; return; }
    var stayPct = pct(agg3.stayWins / agg3.total);
    var switchPct = pct(agg3.switchWins / agg3.total);
    statsEl.innerHTML =
      '<div class="callout callout-stat"><p class="data" style="margin:0">' +
        fillTemplate(c.statLine, { n: agg3.total, stayWinPct: stayPct, switchWinPct: switchPct }) +
      "</p></div>" +
      statBars(stayPct, switchPct, c.stayWinLabel, c.switchWinLabel);
  }

  // -----------------------------------------------------------------------
  // Beat 5 — round100 (100-door playable round)
  // -----------------------------------------------------------------------
  function renderRound100() {
    var c = copy.round100;
    var el = document.getElementById("beat-round100");
    el.innerHTML = "<h2>" + c.heading + "</h2><p>" + c.intro + '</p><div id="round100-stage"></div>';
    startRound100();
  }

  function startRound100() {
    var c = copy.round100;
    var stage = document.getElementById("round100-stage");
    round100DoorEls = {};
    stage.innerHTML =
      '<p id="round100-pick-prompt">' + c.pickPrompt + "</p>" +
      '<div class="door-grid-100" id="round100-doors"></div>' +
      '<div id="round100-after"></div>';

    var grid = document.getElementById("round100-doors");
    for (var n = 1; n <= 100; n++) {
      (function (n) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "door door-sm door-unselected";
        btn.innerHTML = '<span class="door-icons"></span><span class="door-num">' + n + "</span>";
        btn.setAttribute("aria-label", fillTemplate(copy.round3.doorLabel, { n: n }));
        btn.addEventListener("click", function () { onRound100Pick(n); });
        grid.appendChild(btn);
        round100DoorEls[n] = btn;
      })(n);
    }
  }

  function onRound100Pick(pickedN) {
    var c = copy.round100;
    Object.keys(round100DoorEls).forEach(function (k) { round100DoorEls[k].disabled = true; });
    round100DoorEls[pickedN].className = "door door-sm door-picked";
    round100DoorEls[pickedN].innerHTML =
      '<span class="door-icons"><span class="icon icon-picked"></span></span>' +
      '<span class="door-num">' + pickedN + "</span>" +
      '<span class="reveal-caption">' + copy.round3.pickedLabel + "</span>";

    var promptEl = document.getElementById("round100-pick-prompt");
    if (promptEl) promptEl.remove();

    var after = document.getElementById("round100-after");
    after.innerHTML =
      "<p>" + fillTemplate(c.pickedLabel, { n: pickedN }) + "</p>" +
      '<p class="status-text">' + copy.round3.hostThinking + "</p>";

    setTimeout(function () {
      var game = playInteractiveRound(100, pickedN);
      showRound100Host(game, after);
    }, 500);
  }

  function showRound100Host(game, after) {
    var c = copy.round100;

    game.hostDisplay.forEach(function (n) {
      round100DoorEls[n].className = "door door-sm door-host-opened";
      round100DoorEls[n].innerHTML =
        '<span class="door-icons"><span class="icon icon-host-opened"></span><span class="icon icon-goat"></span></span>' +
        '<span class="door-num">' + n + "</span>";
    });

    round100DoorEls[game.remainingDisplay].className = "door door-sm door-remaining";
    round100DoorEls[game.remainingDisplay].innerHTML =
      '<span class="door-icons"><span class="icon icon-remaining"></span></span>' +
      '<span class="door-num">' + game.remainingDisplay + "</span>";

    var openedList = game.hostDisplay.join(", ");

    after.innerHTML =
      "<p>" + fillTemplate(c.hostRevealText, {
        openedList: openedList,
        pickedDoor: game.pickedDisplay,
        remainingDoor: game.remainingDisplay
      }) + "</p>" +
      '<div class="callout callout-key">' + c.mechanismCallout + "</div>" +
      '<div class="callout callout-stat">' + c.oddsCallout + "</div>" +
      "<p>" + fillTemplate(c.switchPrompt, { pickedDoor: game.pickedDisplay, remainingDoor: game.remainingDisplay }) + "</p>" +
      '<div id="round100-choice-buttons"></div>';

    var stayBtn = document.createElement("button");
    stayBtn.className = "btn-secondary";
    stayBtn.textContent = fillTemplate(c.stayButton, { pickedDoor: game.pickedDisplay });
    stayBtn.addEventListener("click", function () { onRound100Choice(game, "stay", after); });

    var switchBtn = document.createElement("button");
    switchBtn.className = "btn-primary";
    switchBtn.textContent = fillTemplate(c.switchButton, { remainingDoor: game.remainingDisplay });
    switchBtn.addEventListener("click", function () { onRound100Choice(game, "switch", after); });

    var wrap = document.getElementById("round100-choice-buttons");
    wrap.appendChild(stayBtn);
    wrap.appendChild(switchBtn);
  }

  function onRound100Choice(game, choice, after) {
    var c = copy.round100;
    var win = choice === "stay"
      ? (game.raw.playerPick === game.raw.prizeDoor)
      : (game.raw.switchTarget === game.raw.prizeDoor);

    var resultText;
    if (choice === "stay") {
      resultText = win
        ? fillTemplate(c.resultWinStay, { pickedDoor: game.pickedDisplay })
        : fillTemplate(c.resultLoseStay, { pickedDoor: game.pickedDisplay, remainingDoor: game.remainingDisplay });
    } else {
      resultText = win ? c.resultWinSwitch : c.resultLoseSwitch;
    }

    var pickedIsPrize = game.raw.prizeDoor === game.raw.playerPick;

    after.innerHTML =
      '<div class="reveal-row">' +
        revealCard(game.pickedDisplay, pickedIsPrize) +
        revealCard(game.remainingDisplay, !pickedIsPrize) +
      "</div>" +
      "<p>" + resultText + "</p>" +
      '<div id="round100-post-actions"></div>';

    var actionsWrap = document.getElementById("round100-post-actions");
    var again = document.createElement("button");
    again.className = "btn-secondary";
    again.textContent = c.playAgainButton;
    again.addEventListener("click", startRound100);

    var cont = document.createElement("button");
    cont.className = "btn-primary";
    cont.textContent = c.continueButton;
    cont.addEventListener("click", function () { unlock("beat-agg100"); });

    actionsWrap.appendChild(again);
    actionsWrap.appendChild(cont);
  }

  // -----------------------------------------------------------------------
  // Beat 6 — aggregateStats100 (batch trials, 100 doors)
  // -----------------------------------------------------------------------
  function renderAgg100() {
    var c = copy.aggregateStats100;
    var el = document.getElementById("beat-agg100");
    el.innerHTML =
      "<h2>" + c.heading + "</h2>" +
      "<p>" + c.intro + "</p>" +
      '<div id="agg100-buttons"></div>' +
      '<div id="agg100-stats"></div>' +
      '<div id="agg100-interpretation"></div>' +
      '<button class="btn-primary" id="agg100-continue">' + c.continueButton + "</button>";

    var sizes = [10, 100, 1000];
    var wrap = document.getElementById("agg100-buttons");
    sizes.forEach(function (n) {
      var b = document.createElement("button");
      b.className = "btn-secondary";
      b.textContent = fillTemplate(c.runButton, { n: n });
      b.addEventListener("click", function () { runAgg100(n); });
      wrap.appendChild(b);
    });

    document.getElementById("agg100-continue").addEventListener("click", function () {
      unlock("beat-bridge");
    });
  }

  function runAgg100(n) {
    var c = copy.aggregateStats100;
    runLiveBatch({
      n: n,
      doorCount: 100,
      agg: agg100,
      buttons: Array.prototype.slice.call(document.querySelectorAll("#agg100-buttons button")),
      onUpdate: renderAgg100Stats,
      onDone: function () {
        // Same gating as Beat 4: interpretation only shows after a real run.
        document.getElementById("agg100-interpretation").innerHTML = "<p>" + c.interpretation + "</p>";
      }
    });
  }

  function renderAgg100Stats() {
    var c = copy.aggregateStats100;
    var statsEl = document.getElementById("agg100-stats");
    if (!agg100.total) { statsEl.innerHTML = ""; return; }
    var stayPct = pct(agg100.stayWins / agg100.total);
    var switchPct = pct(agg100.switchWins / agg100.total);
    statsEl.innerHTML =
      '<div class="callout callout-stat"><p class="data" style="margin:0">' +
        fillTemplate(c.statLine, { n: agg100.total, stayWinPct: stayPct, switchWinPct: switchPct }) +
      "</p></div>" +
      statBars(stayPct, switchPct, copy.aggregateStats3.stayWinLabel, copy.aggregateStats3.switchWinLabel);
  }

  // -----------------------------------------------------------------------
  // Beat 7 — bridge back to 3 doors
  // -----------------------------------------------------------------------
  function renderBridge() {
    var c = copy.bridgeBack;
    var el = document.getElementById("beat-bridge");
    el.innerHTML =
      "<h2>" + c.heading + "</h2>" +
      c.body.map(function (p) { return "<p>" + p + "</p>"; }).join("") +
      '<button class="btn-primary" id="bridge-continue">' + c.continueButton + "</button>";

    document.getElementById("bridge-continue").addEventListener("click", function () {
      // Scroll the reader to the FAQ — copy.json's `faq` has no
      // continueButton of its own in this revision, so beat-recap is
      // unlocked (content available) but not scrolled to, letting the
      // reader actually land on/read the FAQ first and reach the recap by
      // scrolling further themselves (skeptic finding).
      unlock("beat-faq");
      unlock("beat-recap", false);
    });
  }

  // -----------------------------------------------------------------------
  // Beat 8 — FAQ accordion
  // -----------------------------------------------------------------------
  function renderFaq() {
    var c = copy.faq;
    var el = document.getElementById("beat-faq");
    el.innerHTML = "<h2>" + c.heading + '</h2><div id="faq-list"></div>';
    var list = document.getElementById("faq-list");

    c.items.forEach(function (item) {
      var div = document.createElement("div");
      div.className = "faq-item";
      div.innerHTML =
        '<button class="faq-question" aria-expanded="false"><span>' + item.q + '</span><span class="faq-caret">&#9662;</span></button>' +
        '<div class="faq-answer"><div class="callout callout-neutral"><p style="margin:0">' + item.a + "</p></div></div>";

      var btn = div.querySelector(".faq-question");
      btn.addEventListener("click", function () {
        var open = div.classList.toggle("open");
        btn.setAttribute("aria-expanded", open ? "true" : "false");
      });

      list.appendChild(div);
    });
  }

  // -----------------------------------------------------------------------
  // Beat 9 — recap + final gut-check poll
  // -----------------------------------------------------------------------
  function renderRecap() {
    var rc = copy.recap;
    var gf = copy.gutCheckFinal;
    var el = document.getElementById("beat-recap");

    el.innerHTML =
      "<h2>" + rc.heading + "</h2>" +
      '<ul class="recap-list">' + rc.bullets.map(function (b) { return "<li>" + b + "</li>"; }).join("") + "</ul>" +
      "<h2>" + gf.heading + "</h2>" +
      "<p>" + gf.prompt + "</p>" +
      '<div class="poll-options" id="gutcheck-final-options"></div>' +
      '<button class="btn-primary" id="gutcheck-final-confirm" disabled>' + gf.confirmButton + "</button>" +
      '<div class="comparison-box" id="gutcheck-comparison"></div>';

    var selected = null;
    var wrap = document.getElementById("gutcheck-final-options");
    gf.options.forEach(function (opt) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "poll-option";
      b.textContent = opt.label;
      b.addEventListener("click", function () {
        selected = opt;
        Array.prototype.forEach.call(wrap.children, function (x) { x.classList.remove("selected"); });
        b.classList.add("selected");
        document.getElementById("gutcheck-final-confirm").disabled = false;
      });
      wrap.appendChild(b);
    });

    document.getElementById("gutcheck-final-confirm").addEventListener("click", function () {
      if (!selected) return;
      state.finalAnswer = selected;
      Array.prototype.forEach.call(wrap.children, function (x) { x.disabled = true; });
      document.getElementById("gutcheck-final-confirm").disabled = true;

      var msg;
      var initial = state.initialAnswer;
      if (selected.id === "switch" && initial && initial.id !== "switch") {
        msg = fillTemplate(gf.comparison.changedToCorrect, { initialLabel: initial.label });
      } else if (selected.id === "switch" && initial && initial.id === "switch") {
        msg = gf.comparison.stayedCorrect;
      } else {
        msg = fillTemplate(gf.comparison.stillUnconvinced, { finalLabel: selected.label });
      }

      document.getElementById("gutcheck-comparison").innerHTML = '<div class="callout callout-key">' + msg + "</div>";
      unlock("site-footer", false);
    });
  }

  // -----------------------------------------------------------------------
  // Init
  // -----------------------------------------------------------------------
  function init() {
    renderMeta();
    renderGutcheck0();
    renderRules();
    renderRound3();
    renderMechanismContrast();
    renderAgg3();
    renderRound100();
    renderAgg100();
    renderBridge();
    renderFaq();
    renderRecap();
    renderFooter();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
