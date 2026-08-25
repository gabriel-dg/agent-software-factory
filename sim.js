// sim.js — Monty Hall simulation engine
// Pure functions only. No DOM. No browser APIs. Deterministic given a seed.
//
// Exposes globalThis.MontyHall = { playRound, runTrials }
//
// playRound(doorCount, switchStrategy, hostMode, rng)
//   doorCount     — integer >= 3, number of doors in the round.
//   switchStrategy — whether the player switches after the host's reveal.
//                    Accepts a boolean (true = switch, false = stay) or a
//                    string such as "switch" / "stay" (case-insensitive).
//   hostMode      — "knowing" (host never opens the prize door or the
//                    player's door) or "random" (host opens uniformly at
//                    random among the non-player doors, and may reveal the
//                    prize by accident).
//   rng           — a function with no arguments returning a float in
//                    [0, 1), supplied by the caller so results are
//                    reproducible. playRound never creates its own RNG.
//
// runTrials(n, doorCount, strategy, hostMode, seed)
//   Runs n independent rounds of playRound using a seeded, deterministic
//   RNG derived from `seed`, and returns aggregate counts/rates.

(function () {
  "use strict";

  // ---------------------------------------------------------------------
  // Seeded PRNG (mulberry32). Deterministic, fast, good enough statistical
  // quality for this simulation. Seed is coerced to a 32-bit integer.
  // ---------------------------------------------------------------------
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashSeed(seed) {
    // Accept numbers or strings; fold strings into a 32-bit int seed.
    if (typeof seed === "number" && Number.isFinite(seed)) {
      return seed >>> 0;
    }
    const str = String(seed == null ? 0 : seed);
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function makeRng(seed) {
    return mulberry32(hashSeed(seed));
  }

  // ---------------------------------------------------------------------
  // Small RNG-driven helpers
  // ---------------------------------------------------------------------
  function randInt(rng, n) {
    // Integer in [0, n)
    return Math.floor(rng() * n) % n;
  }

  // Fisher-Yates shuffle of a copy of `arr`, driven by rng().
  function shuffle(arr, rng) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = randInt(rng, i + 1);
      const tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  }

  function normalizeSwitchStrategy(switchStrategy) {
    if (typeof switchStrategy === "boolean") return switchStrategy;
    if (typeof switchStrategy === "string") {
      return /switch/i.test(switchStrategy);
    }
    return Boolean(switchStrategy);
  }

  function normalizeHostMode(hostMode) {
    const mode = String(hostMode || "").toLowerCase();
    if (mode === "knowing" || mode === "random") return mode;
    throw new Error(
      'hostMode must be "knowing" or "random", got: ' + JSON.stringify(hostMode)
    );
  }

  // ---------------------------------------------------------------------
  // playRound
  // ---------------------------------------------------------------------
  function playRound(doorCount, switchStrategy, hostMode, rng) {
    if (!Number.isInteger(doorCount) || doorCount < 3) {
      throw new Error("doorCount must be an integer >= 3, got: " + doorCount);
    }
    if (typeof rng !== "function") {
      throw new Error("rng must be a function returning a float in [0, 1)");
    }

    const mode = normalizeHostMode(hostMode);
    const doSwitch = normalizeSwitchStrategy(switchStrategy);

    const prizeDoor = randInt(rng, doorCount);
    const playerPick = randInt(rng, doorCount);

    const otherDoors = [];
    for (let d = 0; d < doorCount; d++) {
      if (d !== playerPick) otherDoors.push(d);
    }

    // Doors the host opens, leaving exactly one other door (besides the
    // player's own pick) closed for the stay/switch decision.
    const numToOpen = doorCount - 2;

    let openedDoors;
    let prizeRevealed = false;

    if (mode === "knowing") {
      // Host may never open the prize door or the player's door.
      const goatCandidates = otherDoors.filter((d) => d !== prizeDoor);

      if (goatCandidates.length === numToOpen) {
        // Player picked a goat: every non-prize door among otherDoors must
        // be opened. No choice — this is the "forced" case (2 of 3 cases
        // at doorCount = 3).
        openedDoors = goatCandidates;
      } else {
        // Player picked the prize: goatCandidates.length === numToOpen + 1,
        // so the host has a genuine free choice of which single goat door
        // stays closed. Model that choice with the shuffle-driven rng.
        openedDoors = shuffle(goatCandidates, rng).slice(0, numToOpen);
      }
      // Knowing host can never reveal the prize by construction.
    } else {
      // "random" host: opens numToOpen doors chosen uniformly at random
      // among the non-player doors, with no regard for where the prize is.
      openedDoors = shuffle(otherDoors, rng).slice(0, numToOpen);
      prizeRevealed = openedDoors.indexOf(prizeDoor) !== -1;
    }

    if (prizeRevealed) {
      return {
        doorCount: doorCount,
        hostMode: mode,
        switched: doSwitch,
        prizeDoor: prizeDoor,
        playerPick: playerPick,
        openedDoors: openedDoors.slice().sort((a, b) => a - b),
        switchTarget: null,
        finalPick: null,
        win: false,
        outcome: "prizeRevealed",
      };
    }

    const openedSet = new Set(openedDoors);
    const remainingClosed = otherDoors.filter((d) => !openedSet.has(d));
    // Exactly one door should remain closed besides the player's own pick.
    const switchTarget = remainingClosed[0];

    const finalPick = doSwitch ? switchTarget : playerPick;
    const win = finalPick === prizeDoor;

    return {
      doorCount: doorCount,
      hostMode: mode,
      switched: doSwitch,
      prizeDoor: prizeDoor,
      playerPick: playerPick,
      openedDoors: openedDoors.slice().sort((a, b) => a - b),
      switchTarget: switchTarget,
      finalPick: finalPick,
      win: win,
      outcome: win ? "win" : "loss",
    };
  }

  // ---------------------------------------------------------------------
  // runTrials
  // ---------------------------------------------------------------------
  function runTrials(n, doorCount, strategy, hostMode, seed) {
    if (!Number.isInteger(n) || n < 0) {
      throw new Error("n must be a non-negative integer, got: " + n);
    }

    const rng = makeRng(seed);
    const doSwitch = normalizeSwitchStrategy(strategy);
    const mode = normalizeHostMode(hostMode);

    let wins = 0;
    let losses = 0;
    let prizeRevealedCount = 0;

    for (let i = 0; i < n; i++) {
      const result = playRound(doorCount, doSwitch, mode, rng);
      if (result.outcome === "win") wins++;
      else if (result.outcome === "loss") losses++;
      else if (result.outcome === "prizeRevealed") prizeRevealedCount++;
    }

    const decided = wins + losses; // rounds that reached a stay/switch outcome

    return {
      n: n,
      doorCount: doorCount,
      switchStrategy: doSwitch,
      hostMode: mode,
      wins: wins,
      losses: losses,
      prizeRevealed: prizeRevealedCount,
      winRate: n > 0 ? wins / n : 0,
      lossRate: n > 0 ? losses / n : 0,
      prizeRevealedRate: n > 0 ? prizeRevealedCount / n : 0,
      // Win rate among rounds that weren't voided by an accidental reveal
      // (only differs from winRate when hostMode === "random").
      decidedWinRate: decided > 0 ? wins / decided : 0,
    };
  }

  globalThis.MontyHall = {
    playRound: playRound,
    runTrials: runTrials,
  };
})();

if (typeof module !== "undefined" && module.exports) { module.exports = globalThis.MontyHall; }
