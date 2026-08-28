// qa-walk.js — QA walker for the Monty Hall interactive explainer.
//
// Owned exclusively by qa-walker. Drives the repo root's index.html in a
// real, visible Chromium browser via Playwright and checks it against the
// beat sequence documented in docs/SPEC.md (Revision 6) and the copy in
// copy.json (Revision 6). Never edits any file in the explainer project.
// Run from this file's own directory (tools/, that's where Playwright
// resolves from), or from the repo root:
//
//   cd tools && node qa-walk.js
//   -- or --
//   node tools/qa-walk.js
//
// Prints a JSON report to stdout:
//   { pass, failures: [...], consoleErrors: [...], pageErrors: [...],
//     ledgerMismatches: [...] }
//
// Revision 6 build additions specifically verified here (see mid-task
// course correction from the orchestrator):
//   - Beat 2's non-spoiling "never eligible" door-ineligibility badge: driven for
//     BOTH the case where the reader's original pick turns out to be the
//     car and the case where it's a goat, checking at reveal time (before
//     the stay/switch choice) that neither the badge nor any prize/goat
//     icon discloses which door (if either) holds the prize.
//   - Beat 3's Host B batch run: verified to render a per-round
//     spoiled-vs-played grid (not just a count), with genuinely distinct
//     computed background colors between the two cell classes.
//   - Beats 4 and 6's live-updating win-rate counters: verified to paint
//     multiple distinct intermediate textContent states during a single
//     batch run (via the "Run 1000"/"Run 1000 rounds" button), not just
//     jump straight to a final total.
//
// After the beat walk, performs a ledger cross-check: walks every DOM
// element carrying visible text, resolves its rendered foreground color and
// effective (ancestor-resolved) background color via getComputedStyle,
// normalizes both back to tokens.css custom-property names, and reports any
// rendered <fg-token> ON <bg-token> pair that has no matching `CONTRAST`
// line in docs/DESIGN.md's "## Contrast pairs" ledger.
//
// The resting-state sweep above cannot see :hover-only styles (a static
// getComputedStyle pass never triggers a pseudo-class). DESIGN.md's ledger
// also documents two hover pairs (.btn-primary:hover, .btn-secondary:hover)
// as real, reachable states a mouse user sees, so this script additionally
// drives a real Playwright mouse hover over one live instance of each button
// class and resolves/cross-checks that pair the same way.

const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const { pathToFileURL } = require("url");

// This file lives in <repo>/tools/. Every path below is resolved relative to
// that, never hardcoded to an absolute machine path, so the script runs
// correctly regardless of where the repo is cloned.
const REPO_ROOT = path.join(__dirname, "..");
const SHOTS_DIR = path.join(__dirname, "shots");
const PAGE_URL = pathToFileURL(path.join(REPO_ROOT, "index.html")).href;
const TOKENS_CSS_PATH = path.join(REPO_ROOT, "tokens.css");
const DESIGN_MD_PATH = path.join(REPO_ROOT, "docs", "DESIGN.md");
const DEFAULT_TIMEOUT = 8000;

if (!fs.existsSync(SHOTS_DIR)) fs.mkdirSync(SHOTS_DIR, { recursive: true });

const failures = [];
const consoleErrors = [];
const pageErrors = [];

function fail(beat, selector, expected, actual, screenshot) {
  failures.push({ beat, selector, expected, actual, screenshot: screenshot || null });
}

async function shot(page, name) {
  const file = path.join(SHOTS_DIR, name);
  await page.screenshot({ path: file, fullPage: true });
  return name;
}

async function isLocked(page, id) {
  return page.evaluate((id) => {
    const el = document.getElementById(id);
    if (!el) return "MISSING";
    return el.classList.contains("locked");
  }, id);
}

async function assertLocked(page, id, beat, label) {
  const locked = await isLocked(page, id);
  if (locked !== true) {
    fail(
      beat,
      `#${id}.locked`,
      `${label} still locked (hidden) at this point`,
      locked === "MISSING" ? `#${id} not found in DOM` : `#${id} is NOT locked (visible early)`,
      await shot(page, `FAIL-${beat}-${id}-should-be-locked.png`)
    );
  }
}

async function assertUnlocked(page, id, beat, label) {
  const locked = await isLocked(page, id);
  if (locked !== false) {
    fail(
      beat,
      `#${id}.locked`,
      `${label} unlocked (visible) at this point`,
      locked === "MISSING" ? `#${id} not found in DOM` : `#${id} is still locked (hidden)`,
      await shot(page, `FAIL-${beat}-${id}-should-be-unlocked.png`)
    );
  }
}

// Uses textContent (not innerText) so CSS text-transform (e.g. uppercase
// callout labels) never changes what we compare copy against, and clones the
// body + strips <script>/<style> so the raw embedded copy.json template
// source (which legitimately contains "{{n}}" tokens) is never mistaken for
// rendered page text.
async function bodyText(page) {
  return page.evaluate(() => {
    const clone = document.body.cloneNode(true);
    clone.querySelectorAll("script, style").forEach((el) => el.remove());
    return clone.textContent;
  });
}

async function checkNoPlaceholders(page, beat) {
  const text = await bodyText(page);
  const matches = text.match(/\{\{\s*\w+\s*\}\}/g);
  if (matches) {
    fail(
      beat,
      "visible page text",
      "no unsubstituted {{placeholder}} tokens in rendered/visible text",
      `found: ${[...new Set(matches)].join(", ")}`,
      await shot(page, `FAIL-${beat}-unsubstituted-placeholder.png`)
    );
  }
}

async function elementText(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    return el ? el.textContent : null;
  }, selector);
}

async function elementInnerHTML(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    return el ? el.innerHTML : null;
  }, selector);
}

async function assertIncludes(page, selector, needle, beat, label) {
  const text = await elementText(page, selector);
  if (text === null) {
    fail(beat, selector, `element present with text including "${needle}"`, "element not found", await shot(page, `FAIL-${beat}-missing-element.png`));
    return;
  }
  if (!text.includes(needle)) {
    fail(beat, selector, `text includes "${needle}"`, `actual text: ${text.slice(0, 400)}`, await shot(page, `FAIL-${beat}-copy-mismatch.png`));
  }
}

async function assertEmpty(page, selector, beat, label) {
  const html = await elementInnerHTML(page, selector);
  if (html === null) {
    fail(beat, selector, `element present and empty before interaction (${label})`, "element not found", await shot(page, `FAIL-${beat}-missing-element.png`));
    return;
  }
  if (html.trim() !== "") {
    fail(
      beat,
      selector,
      `${label} empty before the reader interacts`,
      `content already present before interaction: ${html.slice(0, 300)}`,
      await shot(page, `FAIL-${beat}-premature-content.png`)
    );
  }
}

async function assertNotVisible(page, selector, beat, label) {
  const loc = page.locator(selector);
  const count = await loc.count();
  if (count === 0) return; // fine, not present at all
  const visible = await loc.first().isVisible().catch(() => false);
  if (visible) {
    fail(beat, selector, `${label} not visible before interaction`, `${selector} is visible`, await shot(page, `FAIL-${beat}-premature-visible.png`));
  }
}

// Click a button by its exact visible text within a container, avoiding
// Playwright's default substring hasText matching (which would make "Run
// 10" match "Run 100" / "Run 1000" as well).
async function clickExactText(page, containerSelector, exactText) {
  const loc = page.locator(`${containerSelector} button`).getByText(exactText, { exact: true });
  await loc.click();
}

function exactTextLocator(page, containerSelector, exactText) {
  return page.locator(`${containerSelector} button`).getByText(exactText, { exact: true });
}

// Polls an element's textContent every ~25ms for maxWaitMs after clicking a
// locator, collecting every distinct non-empty value observed. Used to prove
// Beats 4/6's win-rate displays genuinely update through multiple
// checkpoints during a single batch run, not just jump straight to a final
// total (SPEC.md revision 5, §4 item 9).
async function captureLiveTextSamples(page, statsSelector, clickLocator, maxWaitMs) {
  const samples = [];
  let lastVal = null;
  await clickLocator.click();
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const text = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      return el ? el.textContent.trim() : "";
    }, statsSelector);
    if (text !== "" && text !== lastVal) {
      samples.push(text);
      lastVal = text;
    }
    await page.waitForTimeout(25);
  }
  return samples;
}

// -----------------------------------------------------------------------
// Ledger cross-check helpers (Node side): parse tokens.css and DESIGN.md.
// -----------------------------------------------------------------------
function parseTokenColors(tokensCssText) {
  const map = {};
  const re = /--([\w-]+):\s*(#[0-9A-Fa-f]{6})\s*;/g;
  let m;
  while ((m = re.exec(tokensCssText))) {
    map["--" + m[1]] = m[2].toUpperCase();
  }
  return map;
}

function parseLedgerPairs(designMdText) {
  const pairs = [];
  const re = /CONTRAST\s+(--[\w-]+)\s+ON\s+(--[\w-]+)\s*=/g;
  let m;
  while ((m = re.exec(designMdText))) {
    pairs.push([m[1], m[2]]);
  }
  return pairs;
}

// Browser-side normalization logic shared by the resting-state sweep and the
// targeted hover-state checks below. Returns a self-contained function body
// string executed inside page.evaluate (kept as a real function, not a
// string, and passed by reference to page.evaluate calls directly).
function buildRgbToTokens(tokenColorMap) {
  function hexToRgbArr(hex) {
    const h = hex.replace("#", "");
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  const rgbToTokens = {};
  Object.keys(tokenColorMap).forEach((name) => {
    const [r, g, b] = hexToRgbArr(tokenColorMap[name]);
    const key = r + "," + g + "," + b;
    if (!rgbToTokens[key]) rgbToTokens[key] = [];
    rgbToTokens[key].push(name);
  });
  return rgbToTokens;
}

// -----------------------------------------------------------------------
// Targeted :hover ledger check. A resting-state DOM sweep via
// getComputedStyle never triggers a CSS :hover pseudo-class, so the two
// hover pairs DESIGN.md's ledger documents (.btn-primary:hover,
// .btn-secondary:hover — see DESIGN.md §5 "Interactive state variants")
// need an actual Playwright mouse hover over a live button instance to
// resolve the way a mouse user would actually see them.
// -----------------------------------------------------------------------
async function checkHoverPair(page, selector, label, rgbToTokens, allowedPairSet, ledgerMismatches) {
  const loc = page.locator(selector).first();
  const count = await loc.count();
  if (count === 0) {
    fail("ledger-check-hover", selector, `${label} button present in DOM for hover check`, "element not found", null);
    return null;
  }
  await loc.scrollIntoViewIfNeeded();
  await loc.hover();
  // Give the CSS transition (--duration-fast, 180ms) time to settle so the
  // hover background is fully painted before we read computed style.
  await page.waitForTimeout(250);
  await shot(page, `ledger-hover-${label}.png`);

  const result = await page.evaluate(
    ({ selector, rgbToTokens, allowedPairs }) => {
      const allowedPairSet = new Set(allowedPairs);

      function parseComputedColor(str) {
        const m = str.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+))?\)/);
        if (!m) return null;
        return {
          r: Math.round(parseFloat(m[1])),
          g: Math.round(parseFloat(m[2])),
          b: Math.round(parseFloat(m[3])),
          a: m[4] === undefined ? 1 : parseFloat(m[4])
        };
      }
      function isTransparent(str) {
        const c = parseComputedColor(str);
        if (!c) return true;
        return c.a === 0;
      }
      function tokensForColor(str) {
        const c = parseComputedColor(str);
        if (!c) return [];
        const key = c.r + "," + c.g + "," + c.b;
        return rgbToTokens[key] || [];
      }
      function domPath(el) {
        const parts = [];
        let node = el;
        let depth = 0;
        while (node && node.nodeType === 1 && depth < 5) {
          let part = node.tagName.toLowerCase();
          if (node.id) {
            part += "#" + node.id;
            parts.unshift(part);
            break;
          }
          if (node.className && typeof node.className === "string" && node.className.trim()) {
            part += "." + node.className.trim().split(/\s+/).join(".");
          }
          parts.unshift(part);
          node = node.parentElement;
          depth++;
        }
        return parts.join(" > ");
      }
      function getEffectiveBackground(el) {
        let node = el;
        while (node) {
          const cs = getComputedStyle(node);
          const bg = cs.backgroundColor;
          if (!isTransparent(bg)) return { rgb: bg, ancestorPath: domPath(node), sameElement: node === el };
          node = node.parentElement;
        }
        return { rgb: "rgb(255, 255, 255)", ancestorPath: "(default: no ancestor set a background — browser default)", sameElement: false };
      }

      const el = document.querySelector(selector);
      if (!el) return { found: false };
      const cs = getComputedStyle(el);
      const fgRgb = cs.color;
      const bgInfo = getEffectiveBackground(el);
      const fgTokens = tokensForColor(fgRgb);
      const bgTokens = tokensForColor(bgInfo.rgb);
      let matched = false;
      if (fgTokens.length && bgTokens.length) {
        outer: for (const fg of fgTokens) {
          for (const bg of bgTokens) {
            if (allowedPairSet.has(fg + "|" + bg)) {
              matched = true;
              break outer;
            }
          }
        }
      }
      return {
        found: true,
        matched,
        domPath: domPath(el),
        fgRgb,
        bgRgb: bgInfo.rgb,
        fgTokens,
        bgTokens,
        bgAncestorPath: bgInfo.ancestorPath,
        bgFromSelf: bgInfo.sameElement
      };
    },
    { selector, rgbToTokens, allowedPairs: Array.from(allowedPairSet) }
  );

  if (!result.found) {
    fail("ledger-check-hover", selector, `${label} element still present when evaluated post-hover`, "element disappeared before evaluate", null);
    return null;
  }
  if (!result.matched) {
    ledgerMismatches.push({
      domPath: result.domPath + ":hover",
      fgRgb: result.fgRgb,
      bgRgb: result.bgRgb,
      fgTokens: result.fgTokens,
      bgTokens: result.bgTokens,
      bgAncestorPath: result.bgAncestorPath,
      bgFromSelf: result.bgFromSelf,
      textSample: `(:hover state — ${label}, selector ${selector})`
    });
  }
  return result;
}

// -----------------------------------------------------------------------
// Beat 2 non-spoiling "never eligible" badge invariant (SPEC.md revision 6,
// §3 Beat 2 design constraint / §4 item 7). At reveal time, before the
// reader chooses stay/switch: the reader's own door and the host-opened
// door must both carry the never-eligible badge; the remaining unopened
// door must carry neither the badge nor any prize/goat icon; and the
// reader's own door must show no prize/goat icon either. None of this may
// depend on whether the reader's original pick turns out to be the car.
// -----------------------------------------------------------------------
async function checkBeat2NoSpoilerInvariant(page, beatLabel) {
  const info = await page.evaluate(() => {
    function inspect(el) {
      if (!el) return null;
      return {
        hasBadge: !!el.querySelector(".door-ineligible-badge"),
        hasIneligibleIcon: !!el.querySelector(".door-ineligible-badge .icon-door-ineligible"),
        hasPrizeIcon: !!el.querySelector(".icon-prize"),
        hasGoatIcon: !!el.querySelector(".icon-goat")
      };
    }
    return {
      picked: inspect(document.querySelector("#round3-doors .door-picked")),
      hostOpened: inspect(document.querySelector("#round3-doors .door-host-opened")),
      remaining: inspect(document.querySelector("#round3-doors .door-remaining"))
    };
  });

  if (!info.picked || !info.hostOpened || !info.remaining) {
    fail(
      beatLabel,
      "#round3-doors .door-picked / .door-host-opened / .door-remaining",
      "all three door roles present in the DOM after the host's reveal",
      JSON.stringify(info),
      await shot(page, `FAIL-${beatLabel}-doors-missing.png`)
    );
    return;
  }
  if (!info.picked.hasBadge) {
    fail(
      beatLabel,
      "#round3-doors .door-picked .door-ineligible-badge",
      "reader's own door carries the never-eligible (ineligibility) badge at reveal time, before the stay/switch choice",
      "badge missing on picked door",
      await shot(page, `FAIL-${beatLabel}-picked-no-badge.png`)
    );
  } else if (!info.picked.hasIneligibleIcon) {
    fail(
      beatLabel,
      "#round3-doors .door-picked .door-ineligible-badge .icon-door-ineligible",
      "reader's own door's badge carries the dedicated \u2696 ineligibility glyph",
      "badge present but ineligibility icon missing on picked door",
      await shot(page, `FAIL-${beatLabel}-picked-badge-no-icon.png`)
    );
  }
  if (info.picked.hasPrizeIcon || info.picked.hasGoatIcon) {
    fail(
      beatLabel,
      "#round3-doors .door-picked",
      "reader's own door shows no prize/goat icon before the stay/switch choice (non-spoiling)",
      JSON.stringify(info.picked),
      await shot(page, `FAIL-${beatLabel}-picked-spoiled.png`)
    );
  }
  if (!info.hostOpened.hasBadge) {
    fail(
      beatLabel,
      "#round3-doors .door-host-opened .door-ineligible-badge",
      "host-opened door carries the never-eligible (ineligibility) badge at reveal time",
      "badge missing on host-opened door",
      await shot(page, `FAIL-${beatLabel}-host-no-badge.png`)
    );
  } else if (!info.hostOpened.hasIneligibleIcon) {
    fail(
      beatLabel,
      "#round3-doors .door-host-opened .door-ineligible-badge .icon-door-ineligible",
      "host-opened door's badge carries the dedicated \u2696 ineligibility glyph",
      "badge present but ineligibility icon missing on host-opened door",
      await shot(page, `FAIL-${beatLabel}-host-badge-no-icon.png`)
    );
  }
  if (info.remaining.hasBadge) {
    fail(
      beatLabel,
      "#round3-doors .door-remaining .door-ineligible-badge",
      "remaining unopened door must NOT carry the never-eligible badge (marking it would leak which door is the prize before the choice)",
      "badge present on remaining door",
      await shot(page, `FAIL-${beatLabel}-remaining-badge-leak.png`)
    );
  }
  if (info.remaining.hasPrizeIcon || info.remaining.hasGoatIcon) {
    fail(
      beatLabel,
      "#round3-doors .door-remaining",
      "remaining unopened door shows no prize/goat icon before the stay/switch choice (non-spoiling)",
      JSON.stringify(info.remaining),
      await shot(page, `FAIL-${beatLabel}-remaining-spoiled.png`)
    );
  }
}

async function main() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push({ text: msg.text(), location: msg.location() });
    }
  });
  page.on("pageerror", (err) => {
    pageErrors.push({ message: err.message, stack: err.stack });
  });

  await page.goto(PAGE_URL, { waitUntil: "load" });
  await page.waitForTimeout(300);

  // ---------------------------------------------------------------------
  // Failure mode 1: sim.js loaded / globalThis.MontyHall defined & shaped.
  // ---------------------------------------------------------------------
  const montyHallCheck = await page.evaluate(() => {
    const MH = globalThis.MontyHall;
    return {
      defined: typeof MH !== "undefined",
      hasPlayRound: !!MH && typeof MH.playRound === "function",
      hasRunTrials: !!MH && typeof MH.runTrials === "function"
    };
  });
  if (!montyHallCheck.defined || !montyHallCheck.hasPlayRound || !montyHallCheck.hasRunTrials) {
    fail(
      "load",
      "globalThis.MontyHall",
      "globalThis.MontyHall defined with playRound() and runTrials() functions (sim.js loaded)",
      JSON.stringify(montyHallCheck),
      await shot(page, "FAIL-load-montyhall-undefined.png")
    );
  }

  // ---------------------------------------------------------------------
  // Failure mode 2: embedded copy JSON parses.
  // ---------------------------------------------------------------------
  const copyParse = await page.evaluate(() => {
    try {
      const el = document.getElementById("copy");
      if (!el) return { ok: false, error: "no #copy element found" };
      const parsed = JSON.parse(el.textContent);
      return {
        ok: true,
        hasMeta: !!parsed.meta,
        hasFaq: !!(parsed.faq && parsed.faq.items),
        hasMechanism: !!(parsed.mechanismContrast && parsed.mechanismContrast.threeCases && parsed.mechanismContrast.threeCases.whyYourDoorDoesntMove),
        hasKnowingRandomHostTables: !!(
          parsed.mechanismContrast &&
          parsed.mechanismContrast.threeCases &&
          parsed.mechanismContrast.threeCases.whyYourDoorDoesntMove &&
          parsed.mechanismContrast.threeCases.whyYourDoorDoesntMove.knowingHost &&
          parsed.mechanismContrast.threeCases.whyYourDoorDoesntMove.randomHost
        )
      };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });
  if (!copyParse.ok || !copyParse.hasMeta || !copyParse.hasFaq || !copyParse.hasMechanism || !copyParse.hasKnowingRandomHostTables) {
    fail(
      "load",
      "#copy JSON.parse",
      "embedded #copy script block parses as JSON with meta, faq.items, and mechanismContrast.threeCases.whyYourDoorDoesntMove.{knowingHost,randomHost} present (revision 4+ shape)",
      JSON.stringify(copyParse),
      await shot(page, "FAIL-load-copy-json-parse.png")
    );
  }

  // ---------------------------------------------------------------------
  // Failure mode 4 (initial load): only Beat 0 should be visible/unlocked.
  // ---------------------------------------------------------------------
  await shot(page, "beat0-initial-load.png");
  const lockedAtLoad = [
    "beat-rules",
    "beat-round3",
    "beat-mechanism",
    "beat-agg3",
    "beat-round100",
    "beat-agg100",
    "beat-bridge",
    "beat-faq",
    "beat-recap",
    // Bug fix under test: the footer previously had no .locked gating and
    // was visible on load, right after the initial gut-check poll, before
    // the reader did anything. It now carries
    // class="site-footer locked" id="site-footer" and must be hidden at
    // load exactly like every other not-yet-reached beat.
    "site-footer"
  ];
  for (const id of lockedAtLoad) {
    await assertLocked(page, id, "load", `#${id}`);
  }

  // Explicit, element-level (not just class-level) visibility checks for the
  // footer's two pieces of content -- the host-rule note and the newly
  // added colophon credits paragraph -- since both are newly reachable in
  // this build and are exactly the kind of "content that should only
  // appear after an interaction" the load-time sweep exists to catch.
  await assertNotVisible(page, "#site-footer", "load", "footer (site-footer)");
  await assertNotVisible(page, "#footer-text", "load", "footer.text");
  await assertNotVisible(page, "#footer-note", "load", "footer.note (host-rule note)");
  await assertNotVisible(page, "#colophon-text", "load", "colophon.text");

  await checkNoPlaceholders(page, "load");

  // =======================================================================
  // Beat 0 — gut-check poll (initial)
  // =======================================================================
  try {
    await page.waitForSelector("#beat-gutcheck0", { timeout: DEFAULT_TIMEOUT });
    await assertIncludes(page, "#beat-gutcheck0", "Before we start: what's your gut answer?", "beat0", "gutCheckInitial.heading");
    await assertIncludes(page, "#beat-gutcheck0", "You're on a game show.", "beat0", "gutCheckInitial.body");
    await assertIncludes(page, "#beat-gutcheck0", "What gives you the best odds of winning the car?", "beat0", "gutCheckInitial.prompt");
    for (const label of [
      "It doesn't matter: it's 50/50 either way",
      "Staying is better",
      "Switching is better",
      "Not sure"
    ]) {
      await assertIncludes(page, "#beat-gutcheck0", label, "beat0", `gutCheckInitial.options`);
    }

    // Select "It doesn't matter: it's 50/50 either way" as the reader's
    // initial (wrong) answer, so Beat 9's "changedToCorrect" branch is
    // exercised later.
    const confirmBtn = page.locator("#gutcheck0-confirm");
    if (!(await confirmBtn.isDisabled())) {
      fail("beat0", "#gutcheck0-confirm", "disabled before any option selected", "enabled before selection", await shot(page, "FAIL-beat0-confirm-not-disabled.png"));
    }
    await page.locator("#gutcheck0-options .poll-option", { hasText: "50/50" }).click();
    if (await confirmBtn.isDisabled()) {
      fail("beat0", "#gutcheck0-confirm", "enabled after an option is selected", "still disabled", await shot(page, "FAIL-beat0-confirm-still-disabled.png"));
    }
    await shot(page, "beat0-gutcheck-selected.png");
    await confirmBtn.click();
  } catch (e) {
    fail("beat0", "beat-gutcheck0", "beat 0 interaction completes without exception", String(e), await shot(page, "FAIL-beat0-exception.png"));
  }

  // =======================================================================
  // Beat 1 — rules
  // =======================================================================
  try {
    await assertUnlocked(page, "beat-rules", "beat1", "#beat-rules");
    await page.waitForSelector("#beat-rules:not(.locked)", { timeout: DEFAULT_TIMEOUT });
    await assertLocked(page, "beat-round3", "beat1", "#beat-round3");

    await assertIncludes(page, "#beat-rules", "The rules, exactly as they are", "beat1", "rules.heading");
    await assertIncludes(page, "#beat-rules", "There are 3 doors. Behind one is a car.", "beat1", "rules.steps[0]");
    // Revision 6 finding 9: new, previously-absent unconditional-offer rule
    // (the host always opens a door and offers the switch on every round,
    // regardless of what the reader picked) — required content, not just
    // wording.
    await assertIncludes(page, "#beat-rules", "the host always opens a door and always offers you the switch", "beat1", "rules.steps[3] (revision 6 new unconditional-offer rule)");
    await assertIncludes(page, "#beat-rules", "he picks between them with a fair coin flip", "beat1", "rules.steps[6] (tie-break rule)");
    await assertIncludes(page, "#beat-rules", "The one rule everything depends on", "beat1", "rules.mechanismCallout.label");
    await assertIncludes(page, "#beat-rules", "We'll prove that part later", "beat1", "rules.mechanismCallout.text (points forward to Beat 3's route tables)");

    // Host rule must be the last, visually distinct step.
    const lastRuleClass = await page.evaluate(() => {
      const items = document.querySelectorAll("#beat-rules ol.rules-list li");
      const last = items[items.length - 1];
      return last ? last.className : null;
    });
    if (lastRuleClass !== "rule-host") {
      fail("beat1", "ol.rules-list li:last-child", 'last rule step has class "rule-host" (visually distinct)', `actual class: ${lastRuleClass}`, await shot(page, "FAIL-beat1-rule-host-not-last.png"));
    }

    await shot(page, "beat1-rules.png");
    await page.locator("#rules-continue").click();
  } catch (e) {
    fail("beat1", "beat-rules", "beat 1 interaction completes without exception", String(e), await shot(page, "FAIL-beat1-exception.png"));
  }

  // =======================================================================
  // Beat 2 — round3 (first playable round). Driven in a loop (not a single
  // play) so the non-spoiling never-eligible badge invariant (SPEC.md
  // revision 6) can be verified for BOTH the case where the reader's
  // original pick turns out to be the car and the case where it's a goat —
  // required per the orchestrator's mid-task course correction.
  // =======================================================================
  try {
    await assertUnlocked(page, "beat-round3", "beat2", "#beat-round3");
    await page.waitForSelector("#beat-round3:not(.locked)", { timeout: DEFAULT_TIMEOUT });
    await assertLocked(page, "beat-mechanism", "beat2", "#beat-mechanism");

    await assertIncludes(page, "#beat-round3", "Round 1: play it yourself", "beat2", "round3.heading");
    await assertIncludes(page, "#beat-round3", "Pick a door: 1, 2, or 3.", "beat2", "round3.pickPrompt");

    // Result copy must not be visible before a round is actually played.
    await assertNotVisible(page, "#round3-after .reveal-row", "beat2", "round3 result reveal cards");

    await shot(page, "beat2-round3-pick.png");

    const knownOutcomes = [
      "You switched, and there's the car.",
      "You switched, and that's a goat."
    ];

    let sawCarPick = false;
    let sawGoatPick = false;
    let attempts = 0;
    const maxAttempts = 15;

    while ((!sawCarPick || !sawGoatPick) && attempts < maxAttempts) {
      attempts++;
      const beatLabel = `beat2-attempt${attempts}`;

      // Pick Door 1 every time — sim.js's own internal player-pick is
      // independently randomized and remapped to whichever display door was
      // clicked (see viz.js buildDoorMapping), so clicking the same visible
      // door number still yields a uniformly random car/goat outcome.
      await page.locator("#round3-doors button").nth(0).click();

      // Host reveal appears after a short delay.
      await page.waitForFunction(
        () => {
          const el = document.getElementById("round3-after");
          return el && /The host opens Door \d+ and shows you a goat\./.test(el.textContent);
        },
        { timeout: DEFAULT_TIMEOUT }
      );

      if (attempts === 1) {
        await assertIncludes(page, "#round3-after", "He skipped Door", "beat2", "round3.hostKnowledgeReminder (opening clause)");
        await assertIncludes(page, "#round3-after", "he still had a choice between the two goat doors", "beat2", "round3.hostKnowledgeReminder (free-choice case named honestly)");
        await assertIncludes(page, "#round3-after", "he had no choice at all", "beat2", "round3.hostKnowledgeReminder (forced case)");
        await assertIncludes(page, "#round3-after", "Final answer: stay with Door", "beat2", "round3.switchPrompt");
        await shot(page, "beat2-round3-reveal.png");
      }

      // Non-spoiling never-eligible badge invariant: must hold at reveal
      // time, before the stay/switch choice, regardless of which case
      // (car-pick or goat-pick) this particular round turns out to be.
      await checkBeat2NoSpoilerInvariant(page, beatLabel);

      // Choose switch, then reveal, to learn (after the fact, for our own
      // bookkeeping only) whether this round was a car-pick or goat-pick.
      await page.locator("#round3-choice-buttons button", { hasText: "Switch to Door" }).click();
      await page.locator("#round3-after button", { hasText: "Reveal what's behind the door" }).click();

      await page.waitForSelector("#round3-after .reveal-row", { timeout: DEFAULT_TIMEOUT });
      const resultText = await elementText(page, "#round3-after");
      if (!knownOutcomes.some((s) => resultText.includes(s))) {
        fail("beat2", "#round3-after", `one of: ${knownOutcomes.join(" | ")}`, resultText.slice(0, 400), await shot(page, `FAIL-${beatLabel}-unexpected-result-text.png`));
      }
      // Guardrail (spec §5): Beat 2 outcome copy must not assert a precise
      // win-rate fraction — that's Beat 3's job to prove.
      if (/\b2\s*\/\s*3\b|\btwo[- ]thirds\b/i.test(resultText)) {
        fail("beat2", "#round3-after", "no precise win-rate fraction (e.g. 2/3) stated as settled fact", resultText.slice(0, 400), await shot(page, `FAIL-${beatLabel}-states-2-3-early.png`));
      }

      const pickedIsPrize = await page.evaluate(() => {
        const card = document.querySelector("#round3-after .reveal-row .reveal-card");
        return !!(card && card.classList.contains("reveal-prize"));
      });
      if (pickedIsPrize) sawCarPick = true;
      else sawGoatPick = true;

      if (attempts === 1) {
        await shot(page, "beat2-round3-result.png");
        await checkNoPlaceholders(page, "beat2");
      }

      if (!sawCarPick || !sawGoatPick) {
        if (attempts < maxAttempts) {
          await page.locator("#round3-post-actions button", { hasText: "Play another round" }).click();
        }
      }
    }

    if (!sawCarPick || !sawGoatPick) {
      fail(
        "beat2",
        "#round3-doors (never-eligible badge, both car-pick and goat-pick cases)",
        "both the car-pick case and the goat-pick case observed and badge-checked within " + maxAttempts + " rounds",
        `sawCarPick=${sawCarPick}, sawGoatPick=${sawGoatPick} after ${attempts} attempts`,
        await shot(page, "FAIL-beat2-could-not-cover-both-cases.png")
      );
    }

    await page.locator("#round3-post-actions button", { hasText: "actually going on here" }).click();
  } catch (e) {
    fail("beat2", "beat-round3", "beat 2 interaction completes without exception", String(e), await shot(page, "FAIL-beat2-exception.png"));
  }

  // =======================================================================
  // Beat 3 — mechanism contrast (three cases, tie-break, two route tables,
  // knowing/random host aggregate contrast, spoiled/played round grid) —
  // Revision 6 shape.
  // =======================================================================
  try {
    await assertUnlocked(page, "beat-mechanism", "beat3", "#beat-mechanism");
    await page.waitForSelector("#beat-mechanism:not(.locked)", { timeout: DEFAULT_TIMEOUT });
    await assertLocked(page, "beat-agg3", "beat3", "#beat-agg3");

    // Movement 1 — three-case enumeration.
    await assertIncludes(page, "#beat-mechanism", "Three cases. That's the whole proof.", "beat3", "mechanismContrast.heading");
    await assertIncludes(page, "#beat-mechanism", "Before you pick, there are exactly three equally likely situations.", "beat3", "mechanismContrast.intro");
    await assertIncludes(page, "#beat-mechanism", "The three cases", "beat3", "threeCases.heading");
    await assertIncludes(page, "#beat-mechanism", "You picked the car", "beat3", "threeCases.rows[0].case");
    await assertIncludes(page, "#beat-mechanism", "You picked Goat A", "beat3", "threeCases.rows[1].case");
    await assertIncludes(page, "#beat-mechanism", "You picked Goat B", "beat3", "threeCases.rows[2].case");
    await assertIncludes(page, "#beat-mechanism", "This isn't a convenient regrouping", "beat3", "threeCases.note");
    await assertIncludes(page, "#beat-mechanism", "Add it up: switching wins in 2 of these 3 equally likely cases.", "beat3", "threeCases.conclusion");

    // Movement 2 — "doesn't the specific door tell me something" (required
    // content per SPEC, must not be cut).
    await assertIncludes(page, "#beat-mechanism", "does the specific door he opens tell you something extra about your own door", "beat3", "threeCases.tieBreakRule");
    await assertIncludes(page, "#beat-mechanism", "Doesn't the specific door he opens tell me something new?", "beat3", "whyYourDoorDoesntMove.heading");
    await assertIncludes(page, "#beat-mechanism", "Walk through all three, including the one that contributes nothing", "beat3", "whyYourDoorDoesntMove.lead");

    // Revision 4+ knowing-host route table (3 routes incl. zero-probability
    // Route 3, workedDivision renormalization, conclusion).
    await assertIncludes(page, "#beat-mechanism", "The real host: knows where the car is, breaks ties with a fair coin", "beat3", "whyYourDoorDoesntMove.knowingHost.label");
    await assertIncludes(page, "#beat-mechanism", "Route 1: you had the car", "beat3", "knowingHost.routes[0].label");
    await assertIncludes(page, "#beat-mechanism", "Route 2: you had the other goat", "beat3", "knowingHost.routes[1].label");
    await assertIncludes(page, "#beat-mechanism", "Route 3: you had the goat behind the door that actually got opened", "beat3", "knowingHost.routes[2].label (zero-probability route)");
    await assertIncludes(page, "#beat-mechanism", "These three routes cover every possibility", "beat3", "knowingHost.workedDivision");
    await assertIncludes(page, "#beat-mechanism", "Route 1: (1/6) / (3/6) = 1/3", "beat3", "knowingHost.workedDivision (renormalized arithmetic)");
    await assertIncludes(page, "#beat-mechanism", "Conditional on watching this exact door open: 1 in 3 you had the car (stay wins), 2 in 3 the other closed door has it (switch wins).", "beat3", "knowingHost.conclusion");

    // Parallel random-host route table (proves the knowing-vs-random
    // contrast instead of asserting it).
    await assertIncludes(page, "#beat-mechanism", "For comparison: Host B, who has no idea where the car is and opens at random", "beat3", "whyYourDoorDoesntMove.randomHost.label");
    await assertIncludes(page, "#beat-mechanism", "Run the identical three routes on Host B, further down", "beat3", "randomHost.intro");
    await assertIncludes(page, "#beat-mechanism", "Route 3: a different question, the car itself was behind the door that got opened", "beat3", "randomHost.routes[2].label (distinct zero-probability reasoning from knowing host's Route 3)");
    await assertIncludes(page, "#beat-mechanism", "Only Routes 1 and 2 match what you watched.", "beat3", "randomHost.workedDivision");
    await assertIncludes(page, "#beat-mechanism", "1 in 2, not 1 in 3 versus 2 in 3.", "beat3", "randomHost.conclusion");

    await assertIncludes(page, "#beat-mechanism", "Compare Routes 1 and 2 across both tables", "beat3", "whyYourDoorDoesntMove.comparisonTakeaway");
    await assertIncludes(page, "#beat-mechanism", "Route 3 answers a different question in each table", "beat3", "comparisonTakeaway (revision 6: Route 3 rows do not correspond across tables)");
    await assertIncludes(page, "#beat-mechanism", "Here's what breaks without a fair coin.", "beat3", "whyYourDoorDoesntMove.fairnessNote");
    await assertIncludes(page, "#beat-mechanism", "a fixed preference, never a coin flip", "beat3", "fairnessNote (biased hypothetical host worked example)");
    await assertIncludes(page, "#beat-mechanism", "always switching still wins 2 of these 3 equally likely starting cases outright, the same aggregate 2/3", "beat3", "fairnessNote (revision 6: aggregate 2/3 unaffected by tie-break bias)");

    // Movement 3 — knowing vs random host aggregate contrast cards.
    await assertIncludes(page, "#beat-mechanism", "Host A: knows where the car is (the real game)", "beat3", "knowingHostLabel");
    await assertIncludes(page, "#beat-mechanism", "Host B: has no idea, opens at random", "beat3", "randomHostLabel");

    // Run results must not be visible before the reader clicks run.
    await assertEmpty(page, "#knowing-result", "beat3", "Host A run result");
    await assertEmpty(page, "#random-result", "beat3", "Host B run result");
    await assertEmpty(page, "#mech-takeaway", "beat3", "mechanism takeaway (withheld until reader runs the comparison)");

    await shot(page, "beat3-mechanism-before-run.png");

    await assertIncludes(page, "#run-contrast-btn", "Run 500 rounds with each host", "beat3", "mechanismContrast.runButton");
    await page.locator("#run-contrast-btn").click();

    await page.waitForFunction(
      () => {
        const k = document.getElementById("knowing-result");
        const r = document.getElementById("random-result");
        return k && r && k.textContent.trim() !== "" && r.textContent.trim() !== "";
      },
      { timeout: DEFAULT_TIMEOUT }
    );

    const knowingResultText = await elementText(page, "#knowing-result");
    if (!/Host A, 500 rounds: switch wins \d+\.\d%, stay wins \d+\.\d%\./.test(knowingResultText)) {
      fail("beat3", "#knowing-result", "Host A result line with numeric percentages substituted", knowingResultText, await shot(page, "FAIL-beat3-knowing-result-format.png"));
    }
    const randomResultText = await elementText(page, "#random-result");
    if (!/Host B, 500 rounds/.test(randomResultText)) {
      fail("beat3", "#random-result", "Host B result line present", randomResultText, await shot(page, "FAIL-beat3-random-result-format.png"));
    }
    await assertIncludes(page, "#mech-takeaway", "Why the two hosts aren't equivalent: the arithmetic.", "beat3", "mechanismContrast.takeaway");

    // -----------------------------------------------------------------
    // Beat 3, new-to-this-build: Host B's batch run must render a visible
    // spoiled-vs-played DISTINCTION (a per-round grid), not just report a
    // count. Verify the grid exists with one cell per simulated round, at
    // least one of each cell type is present, and the two cell classes
    // actually resolve to visually distinct computed background colors
    // (not merely different class names with identical rendering).
    // -----------------------------------------------------------------
    const roundGridInfo = await page.evaluate(() => {
      const cells = document.querySelectorAll("#random-round-grid .round-cell");
      const spoiled = document.querySelectorAll("#random-round-grid .round-cell-spoiled");
      const played = document.querySelectorAll("#random-round-grid .round-cell-played");
      return { total: cells.length, spoiled: spoiled.length, played: played.length };
    });
    if (roundGridInfo.total !== 500) {
      fail("beat3", "#random-round-grid .round-cell", "500 round cells rendered (one per simulated Host B round)", JSON.stringify(roundGridInfo), await shot(page, "FAIL-beat3-round-grid-count.png"));
    }
    if (roundGridInfo.spoiled === 0) {
      fail("beat3", "#random-round-grid .round-cell-spoiled", "at least one visually distinct spoiled-round cell present (spoiling must be visible, not just counted)", JSON.stringify(roundGridInfo), await shot(page, "FAIL-beat3-round-grid-no-spoiled.png"));
    }
    if (roundGridInfo.played === 0) {
      fail("beat3", "#random-round-grid .round-cell-played", "at least one visually distinct played-round cell present", JSON.stringify(roundGridInfo), await shot(page, "FAIL-beat3-round-grid-no-played.png"));
    }
    const gridVisualDistinct = await page.evaluate(() => {
      const playedEl = document.querySelector("#random-round-grid .round-cell-played");
      const spoiledEl = document.querySelector("#random-round-grid .round-cell-spoiled");
      if (!playedEl || !spoiledEl) return null;
      return {
        playedBg: getComputedStyle(playedEl).backgroundColor,
        spoiledBg: getComputedStyle(spoiledEl).backgroundColor
      };
    });
    if (!gridVisualDistinct || gridVisualDistinct.playedBg === gridVisualDistinct.spoiledBg) {
      fail(
        "beat3",
        ".round-cell-played vs .round-cell-spoiled",
        "played and spoiled round cells render with visually distinct computed background colors",
        JSON.stringify(gridVisualDistinct),
        await shot(page, "FAIL-beat3-round-grid-not-distinct.png")
      );
    }

    // New-to-this-build: cells must now be distinguishable by shape/border,
    // not color alone (DESIGN.md §1 item 5 / §6), and the per-cell status
    // icon (✓ / 💥) must NOT be aria-hidden, since for an individual
    // cell it is the only carrier of that cell's specific status. The
    // separate legend's swatches MAY stay aria-hidden, since each sits next
    // to its own visible text label.
    const gridShapeInfo = await page.evaluate(() => {
      const playedEl = document.querySelector("#random-round-grid .round-cell-played");
      const spoiledEl = document.querySelector("#random-round-grid .round-cell-spoiled");
      if (!playedEl || !spoiledEl) return null;
      const playedCs = getComputedStyle(playedEl);
      const spoiledCs = getComputedStyle(spoiledEl);
      const playedIcon = playedEl.querySelector(".icon-round-played");
      const spoiledIcon = spoiledEl.querySelector(".icon-spoiled");
      return {
        playedBorderStyle: playedCs.borderTopStyle,
        spoiledBorderStyle: spoiledCs.borderTopStyle,
        playedBorderRadius: playedCs.borderTopLeftRadius,
        spoiledBorderRadius: spoiledCs.borderTopLeftRadius,
        playedIconAriaHidden: playedIcon ? playedIcon.getAttribute("aria-hidden") : "MISSING_ICON",
        spoiledIconAriaHidden: spoiledIcon ? spoiledIcon.getAttribute("aria-hidden") : "MISSING_ICON"
      };
    });
    if (!gridShapeInfo) {
      fail(
        "beat3",
        "#random-round-grid .round-cell-played / .round-cell-spoiled",
        "both cell types present in the DOM to compare shape/border",
        "one or both cell types missing",
        await shot(page, "FAIL-beat3-round-grid-shape-missing.png")
      );
    } else {
      if (gridShapeInfo.playedBorderStyle === gridShapeInfo.spoiledBorderStyle) {
        fail(
          "beat3",
          ".round-cell-played vs .round-cell-spoiled",
          "played and spoiled cells use different border styles (e.g. solid vs dashed), not color alone",
          JSON.stringify(gridShapeInfo),
          await shot(page, "FAIL-beat3-round-grid-same-border-style.png")
        );
      }
      if (gridShapeInfo.playedBorderRadius === gridShapeInfo.spoiledBorderRadius) {
        fail(
          "beat3",
          ".round-cell-played vs .round-cell-spoiled",
          "played and spoiled cells use different border radii (e.g. square-ish vs circular), not color alone",
          JSON.stringify(gridShapeInfo),
          await shot(page, "FAIL-beat3-round-grid-same-radius.png")
        );
      }
      if (gridShapeInfo.playedIconAriaHidden === "MISSING_ICON") {
        fail(
          "beat3",
          ".round-cell-played .icon-round-played",
          "per-cell played-status icon present in the DOM",
          "icon not found inside a played cell",
          await shot(page, "FAIL-beat3-round-grid-played-icon-missing.png")
        );
      } else if (gridShapeInfo.playedIconAriaHidden === "true") {
        fail(
          "beat3",
          ".round-cell-played .icon-round-played",
          'per-cell status icon must NOT be aria-hidden (it is the only carrier of that cell\'s status)',
          'aria-hidden="true" found on per-cell played icon',
          await shot(page, "FAIL-beat3-round-grid-played-icon-aria-hidden.png")
        );
      }
      if (gridShapeInfo.spoiledIconAriaHidden === "MISSING_ICON") {
        fail(
          "beat3",
          ".round-cell-spoiled .icon-spoiled",
          "per-cell spoiled-status icon present in the DOM",
          "icon not found inside a spoiled cell",
          await shot(page, "FAIL-beat3-round-grid-spoiled-icon-missing.png")
        );
      } else if (gridShapeInfo.spoiledIconAriaHidden === "true") {
        fail(
          "beat3",
          ".round-cell-spoiled .icon-spoiled",
          'per-cell status icon must NOT be aria-hidden (it is the only carrier of that cell\'s status)',
          'aria-hidden="true" found on per-cell spoiled icon',
          await shot(page, "FAIL-beat3-round-grid-spoiled-icon-aria-hidden.png")
        );
      }
    }
    const legendSwatchInfo = await page.evaluate(() => {
      const sp = document.querySelector("#random-round-grid .swatch-played");
      const ss = document.querySelector("#random-round-grid .swatch-spoiled");
      return {
        playedSwatchAriaHidden: sp ? sp.getAttribute("aria-hidden") : "MISSING",
        spoiledSwatchAriaHidden: ss ? ss.getAttribute("aria-hidden") : "MISSING"
      };
    });
    if (legendSwatchInfo.playedSwatchAriaHidden !== "true") {
      fail(
        "beat3",
        "#random-round-grid .swatch-played",
        'legend swatch is allowed to stay aria-hidden="true" (it has an adjacent visible text label) and is expected to be so here',
        JSON.stringify(legendSwatchInfo),
        await shot(page, "FAIL-beat3-legend-swatch-played.png")
      );
    }
    if (legendSwatchInfo.spoiledSwatchAriaHidden !== "true") {
      fail(
        "beat3",
        "#random-round-grid .swatch-spoiled",
        'legend swatch is allowed to stay aria-hidden="true" (it has an adjacent visible text label) and is expected to be so here',
        JSON.stringify(legendSwatchInfo),
        await shot(page, "FAIL-beat3-legend-swatch-spoiled.png")
      );
    }

    await assertIncludes(page, "#random-round-grid", "Played (goat shown)", "beat3", "round-grid legend (played)");
    await assertIncludes(page, "#random-round-grid", "Spoiled (prize shown)", "beat3", "round-grid legend (spoiled)");

    await shot(page, "beat3-mechanism-after-run.png");
    await checkNoPlaceholders(page, "beat3");

    await page.locator("#mech-continue").click();
  } catch (e) {
    fail("beat3", "beat-mechanism", "beat 3 interaction completes without exception", String(e), await shot(page, "FAIL-beat3-exception.png"));
  }

  // =======================================================================
  // Beat 4 — aggregateStats3
  // =======================================================================
  try {
    await assertUnlocked(page, "beat-agg3", "beat4", "#beat-agg3");
    await page.waitForSelector("#beat-agg3:not(.locked)", { timeout: DEFAULT_TIMEOUT });
    await assertLocked(page, "beat-round100", "beat4", "#beat-round100");

    await assertIncludes(page, "#beat-agg3", "Run it hundreds of times", "beat4", "aggregateStats3.heading");
    await assertEmpty(page, "#agg3-stats", "beat4", "agg3 running stats");
    await assertEmpty(page, "#agg3-interpretation", "beat4", "agg3 interpretation (withheld until a batch is run)");

    await shot(page, "beat4-agg3-before-run.png");

    for (const label of ["Run 10", "Run 100", "Run 1000"]) {
      if (label === "Run 1000") {
        // New-to-this-build: verify the win-rate display actually updates
        // live through multiple checkpoints during this run, not just once
        // at the end.
        const btnLoc = exactTextLocator(page, "#agg3-buttons", label);
        const samples = await captureLiveTextSamples(page, "#agg3-stats", btnLoc, 2400);
        if (samples.length < 3) {
          fail(
            "beat4",
            "#agg3-stats",
            "win-rate display updates through multiple checkpoints during a single batch run (live-updating, not a single final jump)",
            `only ${samples.length} distinct textContent state(s) observed during the run: ${JSON.stringify(samples)}`,
            await shot(page, "FAIL-beat4-not-live-updating.png")
          );
        }
      } else {
        await clickExactText(page, "#agg3-buttons", label);
        await page.waitForFunction(
          () => document.getElementById("agg3-stats").textContent.trim() !== "",
          { timeout: DEFAULT_TIMEOUT }
        );
      }
    }

    const agg3Stats = await elementText(page, "#agg3-stats");
    if (!/Out of \d+ rounds: staying won \d+\.\d% of the time, switching won \d+\.\d%\./.test(agg3Stats)) {
      fail("beat4", "#agg3-stats", "aggregateStats3.statLine with numeric values substituted", agg3Stats, await shot(page, "FAIL-beat4-statline-format.png"));
    }
    await assertIncludes(page, "#agg3-interpretation", "settles to 1 in 3 for staying and 2 in 3 for switching", "beat4", "aggregateStats3.interpretation");

    await shot(page, "beat4-agg3-after-run.png");
    await checkNoPlaceholders(page, "beat4");

    await page.locator("#agg3-continue").click();
  } catch (e) {
    fail("beat4", "beat-agg3", "beat 4 interaction completes without exception", String(e), await shot(page, "FAIL-beat4-exception.png"));
  }

  // =======================================================================
  // Beat 5 — round100 (100-door playable round)
  // =======================================================================
  try {
    await assertUnlocked(page, "beat-round100", "beat5", "#beat-round100");
    await page.waitForSelector("#beat-round100:not(.locked)", { timeout: DEFAULT_TIMEOUT });
    await assertLocked(page, "beat-agg100", "beat5", "#beat-agg100");

    await assertIncludes(page, "#beat-round100", "Turn it up to 100 doors", "beat5", "round100.heading");
    await assertIncludes(page, "#beat-round100", "Pick a door, 1 through 100.", "beat5", "round100.pickPrompt");
    await assertNotVisible(page, "#round100-after .reveal-row", "beat5", "round100 result reveal cards");

    await shot(page, "beat5-round100-pick.png");

    // Pick Door 1 (aria-label "Door 1").
    await page.locator('#round100-doors button[aria-label="Door 1"]').click();

    await page.waitForFunction(
      () => {
        const el = document.getElementById("round100-after");
        return el && /The host opens 98 doors \(/.test(el.textContent);
      },
      { timeout: DEFAULT_TIMEOUT }
    );

    const round100AfterText = await elementText(page, "#round100-after");
    if (/\{\{\s*\w+\s*\}\}/.test(round100AfterText)) {
      fail("beat5", "#round100-after", "openedList/pickedDoor/remainingDoor substituted, no {{placeholder}} left", round100AfterText.slice(0, 400), await shot(page, "FAIL-beat5-placeholder.png"));
    }
    await assertIncludes(page, "#round100-after", "The host made 98 decisions", "beat5", "round100.mechanismCallout");
    await assertIncludes(page, "#round100-after", "about 1% it's the car", "beat5", "round100.oddsCallout");
    await assertIncludes(page, "#round100-after", "1 time in 50", "beat5", "round100.mechanismCallout (corrected 1-in-50 luck figure)");
    await assertIncludes(page, "#round100-after", "see the biased-host example above", "beat5", "round100.oddsCallout (cross-reference into Beat 3's fairnessNote)");

    // Guardrail: must never say the host "couldn't" have done this by luck,
    // nor claim an impossibility, nor use the old order-of-magnitude-wrong
    // 1-in-2^98 luck estimate.
    if (/\bimpossible\b/i.test(round100AfterText)) {
      fail("beat5", "#round100-after", 'no "impossible" overclaim about the 98-door reveal', round100AfterText.slice(0, 400), await shot(page, "FAIL-beat5-impossible-overclaim.png"));
    }
    if (/1-in-2\^98|2\^98/i.test(round100AfterText)) {
      fail("beat5", "#round100-after", "no 1-in-2^98 luck estimate (superseded, off by ~28 orders of magnitude)", round100AfterText.slice(0, 400), await shot(page, "FAIL-beat5-old-luck-estimate.png"));
    }

    await shot(page, "beat5-round100-reveal.png");

    // Unlike round3, round100 has no separate "reveal" button step —
    // clicking stay/switch immediately renders the result.
    await page.locator("#round100-choice-buttons button", { hasText: "Switch to Door" }).click();

    await page.waitForSelector("#round100-after .reveal-row", { timeout: DEFAULT_TIMEOUT });
    const result100Text = await elementText(page, "#round100-after");
    const known100Outcomes = [
      "You switched, and there's the car.",
      "You switched, and that's a goat."
    ];
    if (!known100Outcomes.some((s) => result100Text.includes(s))) {
      fail("beat5", "#round100-after", `one of: ${known100Outcomes.join(" | ")}`, result100Text.slice(0, 400), await shot(page, "FAIL-beat5-unexpected-result-text.png"));
    }

    await shot(page, "beat5-round100-result.png");
    await checkNoPlaceholders(page, "beat5");

    await page.locator("#round100-post-actions button", { hasText: "Show me this at scale too" }).click();
  } catch (e) {
    fail("beat5", "beat-round100", "beat 5 interaction completes without exception", String(e), await shot(page, "FAIL-beat5-exception.png"));
  }

  // =======================================================================
  // Beat 6 — aggregateStats100
  // =======================================================================
  try {
    await assertUnlocked(page, "beat-agg100", "beat6", "#beat-agg100");
    await page.waitForSelector("#beat-agg100:not(.locked)", { timeout: DEFAULT_TIMEOUT });
    await assertLocked(page, "beat-bridge", "beat6", "#beat-bridge");

    await assertIncludes(page, "#beat-agg100", "Run the 100-door game hundreds of times", "beat6", "aggregateStats100.heading");
    await assertEmpty(page, "#agg100-stats", "beat6", "agg100 running stats");
    await assertEmpty(page, "#agg100-interpretation", "beat6", "agg100 interpretation (withheld until a batch is run)");

    await shot(page, "beat6-agg100-before-run.png");

    for (const n of [10, 100, 1000]) {
      const label = `Run ${n} rounds`;
      if (n === 1000) {
        // New-to-this-build: verify the win-rate display actually updates
        // live through multiple checkpoints during this run.
        const btnLoc = exactTextLocator(page, "#agg100-buttons", label);
        const samples = await captureLiveTextSamples(page, "#agg100-stats", btnLoc, 2400);
        if (samples.length < 3) {
          fail(
            "beat6",
            "#agg100-stats",
            "win-rate display updates through multiple checkpoints during a single batch run (live-updating, not a single final jump)",
            `only ${samples.length} distinct textContent state(s) observed during the run: ${JSON.stringify(samples)}`,
            await shot(page, "FAIL-beat6-not-live-updating.png")
          );
        }
      } else {
        await clickExactText(page, "#agg100-buttons", label);
        await page.waitForFunction(
          () => document.getElementById("agg100-stats").textContent.trim() !== "",
          { timeout: DEFAULT_TIMEOUT }
        );
      }
    }

    const agg100Stats = await elementText(page, "#agg100-stats");
    if (!/Out of \d+ rounds at 100 doors: staying won \d+\.\d% of the time, switching won \d+\.\d%\./.test(agg100Stats)) {
      fail("beat6", "#agg100-stats", "aggregateStats100.statLine with numeric values substituted", agg100Stats, await shot(page, "FAIL-beat6-statline-format.png"));
    }
    await assertIncludes(page, "#agg100-interpretation", "Staying wins about 1%. Switching wins about 99%.", "beat6", "aggregateStats100.interpretation");

    await shot(page, "beat6-agg100-after-run.png");
    await checkNoPlaceholders(page, "beat6");

    await page.locator("#agg100-continue").click();
  } catch (e) {
    fail("beat6", "beat-agg100", "beat 6 interaction completes without exception", String(e), await shot(page, "FAIL-beat6-exception.png"));
  }

  // =======================================================================
  // Beat 7 — bridge back to 3 doors
  // =======================================================================
  try {
    await assertUnlocked(page, "beat-bridge", "beat7", "#beat-bridge");
    await page.waitForSelector("#beat-bridge:not(.locked)", { timeout: DEFAULT_TIMEOUT });
    await assertLocked(page, "beat-faq", "beat7", "#beat-faq");
    await assertLocked(page, "beat-recap", "beat7", "#beat-recap");

    await assertIncludes(page, "#beat-bridge", "Nothing changed. That's the point.", "beat7", "bridgeBack.heading");
    await assertIncludes(page, "#beat-bridge", "The 100-door round and the 3-door round are the same game.", "beat7", "bridgeBack.body[0]");
    await assertIncludes(page, "#beat-bridge", "with N doors, your original pick wins 1 out of N times", "beat7", "bridgeBack.body[2]");

    await shot(page, "beat7-bridge.png");
    await checkNoPlaceholders(page, "beat7");

    await page.locator("#bridge-continue").click();
  } catch (e) {
    fail("beat7", "beat-bridge", "beat 7 interaction completes without exception", String(e), await shot(page, "FAIL-beat7-exception.png"));
  }

  // =======================================================================
  // Beat 8 — FAQ accordion (Revision 6 copy)
  // =======================================================================
  try {
    await assertUnlocked(page, "beat-faq", "beat8", "#beat-faq");
    await page.waitForSelector("#beat-faq:not(.locked)", { timeout: DEFAULT_TIMEOUT });
    await assertIncludes(page, "#beat-faq", "Still not fully convinced? Good.", "beat8", "faq.heading");

    const questions = [
      "Once the host opens a door, aren't there just two doors left",
      "Does it matter which door I picked first",
      "What if the host doesn't actually know where the car is",
      "Isn't 2/3 just a trick that only works with a small number of doors?",
      "If I just think of it as a brand-new choice between two doors, isn't that a fresh 50/50 event?",
      "This still feels like semantics."
    ];
    const answerSnippets = [
      "Two doors doesn't mean two equally likely doors.",
      "before you pick, nothing distinguishes any door",
      "The whole advantage disappears",
      "the 3-door case is the hardest one to feel intuitively",
      "a guaranteed event carries no information",
      "Switching wins 2 of the 3 equally likely starting cases outright, coin flip or not"
    ];

    const items = page.locator("#faq-list .faq-item");
    const itemCount = await items.count();
    if (itemCount !== 6) {
      fail("beat8", "#faq-list .faq-item", "6 FAQ items (per SPEC Beat 8 required objections list)", `${itemCount} items found`, await shot(page, "FAIL-beat8-item-count.png"));
    }

    for (let i = 0; i < itemCount; i++) {
      const item = items.nth(i);
      const questionBtn = item.locator(".faq-question");
      const answerEl = item.locator(".faq-answer");

      const qText = await questionBtn.textContent();
      if (questions[i] && !qText.includes(questions[i])) {
        fail("beat8", `faq item ${i} question`, questions[i], qText, await shot(page, `FAIL-beat8-q${i}-mismatch.png`));
      }

      // Answer must not be visible before the item is expanded.
      const answerVisibleBefore = await answerEl.isVisible();
      if (answerVisibleBefore) {
        fail("beat8", `faq item ${i} answer`, "hidden until the question is clicked (accordion)", "answer already visible before click", await shot(page, `FAIL-beat8-q${i}-answer-premature.png`));
      }

      await questionBtn.click();

      const opened = await item.evaluate((el) => el.classList.contains("open"));
      if (!opened) {
        fail("beat8", `faq item ${i}`, 'gains class "open" after clicking the question', "class not applied after click", await shot(page, `FAIL-beat8-q${i}-not-opened.png`));
      }
      const answerVisibleAfter = await answerEl.isVisible();
      if (!answerVisibleAfter) {
        fail("beat8", `faq item ${i} answer`, "visible after the question is clicked", "still not visible after click", await shot(page, `FAIL-beat8-q${i}-answer-not-shown.png`));
      }
      const aText = await answerEl.textContent();
      if (answerSnippets[i] && !aText.includes(answerSnippets[i])) {
        fail("beat8", `faq item ${i} answer`, answerSnippets[i], aText.slice(0, 400), await shot(page, `FAIL-beat8-q${i}-answer-mismatch.png`));
      }
    }

    await shot(page, "beat8-faq.png");
    await checkNoPlaceholders(page, "beat8");
  } catch (e) {
    fail("beat8", "beat-faq", "beat 8 interaction completes without exception", String(e), await shot(page, "FAIL-beat8-exception.png"));
  }

  // =======================================================================
  // Beat 9 — recap + final gut-check poll
  // =======================================================================
  try {
    await assertUnlocked(page, "beat-recap", "beat9", "#beat-recap");
    await page.waitForSelector("#beat-recap:not(.locked)", { timeout: DEFAULT_TIMEOUT });

    await assertIncludes(page, "#beat-recap", "The short version", "beat9", "recap.heading");
    await assertIncludes(page, "#beat-recap", "Your first pick is locked at 1-in-N odds", "beat9", "recap.bullets[0]");
    await assertIncludes(page, "#beat-recap", "Same question as before. Any change?", "beat9", "gutCheckFinal.heading");

    await assertEmpty(page, "#gutcheck-comparison", "beat9", "gut-check comparison message");

    await shot(page, "beat9-recap-before-final-poll.png");

    await page.locator("#gutcheck-final-options .poll-option", { hasText: "Switching is better" }).click();
    await page.locator("#gutcheck-final-confirm").click();

    await page.waitForFunction(
      () => document.getElementById("gutcheck-comparison").textContent.trim() !== "",
      { timeout: DEFAULT_TIMEOUT }
    );

    const comparisonText = await elementText(page, "#gutcheck-comparison");
    if (!comparisonText.includes("It doesn't matter: it's 50/50 either way")) {
      fail(
        "beat9",
        "#gutcheck-comparison",
        'comparison message references the stored initial answer ("It doesn\'t matter: it\'s 50/50 either way")',
        comparisonText.slice(0, 400),
        await shot(page, "FAIL-beat9-comparison-initial-label.png")
      );
    }

    await shot(page, "beat9-recap-final.png");

    // Footer (host-rule note + colophon) must stay locked/hidden until the
    // reader completes the final gut-check poll's confirm handler. viz.js's
    // renderRecap() now calls unlock("site-footer", false) here, right
    // after the comparison message is shown -- previously the footer had no
    // .locked gating at all and was visible from initial load.
    await assertUnlocked(page, "site-footer", "beat9", "#site-footer (footer + colophon, unlocked in gutcheck-final-confirm handler)");
    await page.waitForSelector("#site-footer:not(.locked)", { timeout: DEFAULT_TIMEOUT });

    const footerVisibleNow = await page.locator("#site-footer").isVisible();
    if (!footerVisibleNow) {
      fail(
        "beat9",
        "#site-footer",
        "footer (including colophon) is actually rendered-visible after the final gut-check confirm, not merely missing the .locked class",
        "#site-footer .locked class removed but element still not visible per getComputedStyle/Playwright isVisible()",
        await shot(page, "FAIL-beat9-footer-not-visible.png")
      );
    }

    await assertIncludes(page, "#site-footer", "The Monty Hall problem, played out rather than just explained.", "beat9", "footer.text");
    await assertIncludes(page, "#site-footer", "Every round on this page uses the same rule", "beat9", "footer.note (host-rule note)");
    await assertIncludes(page, "#site-footer", "This page was written, built, and verified by a team of Claude Code agents", "beat9", "colophon.text (new colophon paragraph)");

    await shot(page, "beat9-footer-unlocked.png");
    await checkNoPlaceholders(page, "beat9");
  } catch (e) {
    fail("beat9", "beat-recap", "beat 9 interaction completes without exception", String(e), await shot(page, "FAIL-beat9-exception.png"));
  }

  // ---------------------------------------------------------------------
  // Final full-run checks: placeholder scan + exact banned-phrase
  // regression guards (SPEC §5 "what must not happen" — exact strings the
  // page must never contain again, not a subjective content review).
  //
  // The first six entries are the pre-existing guardrails, unchanged and
  // preserved verbatim. The final six entries are ADDITIONS covering the
  // exact quoted-as-literal superseded phrasings documented in SPEC.md's
  // Revision 6 changelog (§7 findings 1, 2, 3, 4, 8, 11) — new regression
  // guards, not replacements for any prior check.
  // ---------------------------------------------------------------------
  await checkNoPlaceholders(page, "final");
  const finalBodyText = await bodyText(page);
  const bannedPhrases = [
    // --- Pre-existing guardrails (preserved, unchanged) ---
    "an event that was going to happen either way can't be evidence",
    "what he opens is decided by that rule, not by chance",
    "1-in-2^98",
    "2^98",
    "100 out of 100",
    "packed with information",
    // --- New guardrails added for Revision 6's fixed overclaims ---
    "most of why switching wins", // finding 1: coin no longer credited with aggregate 2/3
    "holds no matter which door the host opens", // finding 2: false conditional-on-door claim
    "line the two tables up", // finding 3: Route 3 rows forced into a false correspondence
    "not all three", // finding 4: vacuous workedDivision clause
    "guaranteed, not lucky, to dodge the car every time", // finding 8: closing claim disproven by fairnessNote's own biased host
    "Not drifting toward 50/50" // finding 11: unconditional claim a noisy small batch could contradict on-page
  ];
  for (const phrase of bannedPhrases) {
    if (finalBodyText.includes(phrase)) {
      fail(
        "final",
        "visible page text",
        `banned phrase (superseded/false claim per SPEC.md) must not appear: "${phrase}"`,
        `found verbatim in rendered text`,
        await shot(page, "FAIL-final-banned-phrase.png")
      );
    }
  }
  await shot(page, "final-full-page.png");

  // =======================================================================
  // Ledger cross-check: every visible-text DOM element's rendered
  // foreground/background pair, normalized to tokens.css custom-property
  // names, compared against DESIGN.md's "## Contrast pairs" ledger.
  // =======================================================================
  const ledgerMismatches = [];
  let rgbToTokens = null;
  let allowedPairSet = null;
  try {
    const tokensCssText = fs.readFileSync(TOKENS_CSS_PATH, "utf8");
    const designMdText = fs.readFileSync(DESIGN_MD_PATH, "utf8");
    const tokenColorMap = parseTokenColors(tokensCssText);
    const ledgerPairs = parseLedgerPairs(designMdText);
    rgbToTokens = buildRgbToTokens(tokenColorMap);
    allowedPairSet = new Set(ledgerPairs.map((p) => p[0] + "|" + p[1]));

    const rawResults = await page.evaluate(
      ({ tokenColorMap, ledgerPairs }) => {
        function hexToRgbArr(hex) {
          const h = hex.replace("#", "");
          return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
        }
        // Build reverse map: "r,g,b" -> [tokenNames]
        const rgbToTokens = {};
        Object.keys(tokenColorMap).forEach((name) => {
          const [r, g, b] = hexToRgbArr(tokenColorMap[name]);
          const key = r + "," + g + "," + b;
          if (!rgbToTokens[key]) rgbToTokens[key] = [];
          rgbToTokens[key].push(name);
        });

        const allowedPairSet = new Set(ledgerPairs.map((p) => p[0] + "|" + p[1]));

        function parseComputedColor(str) {
          // "rgb(r, g, b)" or "rgba(r, g, b, a)"
          const m = str.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+))?\)/);
          if (!m) return null;
          return {
            r: Math.round(parseFloat(m[1])),
            g: Math.round(parseFloat(m[2])),
            b: Math.round(parseFloat(m[3])),
            a: m[4] === undefined ? 1 : parseFloat(m[4])
          };
        }

        function tokensForColor(str) {
          const c = parseComputedColor(str);
          if (!c) return [];
          const key = c.r + "," + c.g + "," + c.b;
          return rgbToTokens[key] || [];
        }

        function isTransparent(str) {
          const c = parseComputedColor(str);
          if (!c) return true;
          return c.a === 0;
        }

        function domPath(el) {
          const parts = [];
          let node = el;
          let depth = 0;
          while (node && node.nodeType === 1 && depth < 5) {
            let part = node.tagName.toLowerCase();
            if (node.id) {
              part += "#" + node.id;
              parts.unshift(part);
              break;
            }
            if (node.className && typeof node.className === "string" && node.className.trim()) {
              part += "." + node.className.trim().split(/\s+/).join(".");
            }
            parts.unshift(part);
            node = node.parentElement;
            depth++;
          }
          return parts.join(" > ");
        }

        function getEffectiveBackground(el) {
          let node = el;
          while (node) {
            const cs = getComputedStyle(node);
            const bg = cs.backgroundColor;
            if (!isTransparent(bg)) {
              return { rgb: bg, ancestorPath: domPath(node), sameElement: node === el };
            }
            node = node.parentElement;
          }
          return { rgb: "rgb(255, 255, 255)", ancestorPath: "(default: no ancestor set a background — browser default)", sameElement: false };
        }

        function hasDirectText(el) {
          for (let i = 0; i < el.childNodes.length; i++) {
            const n = el.childNodes[i];
            if (n.nodeType === 3 && n.textContent.trim() !== "") return true;
          }
          return false;
        }

        function isVisible(el) {
          const cs = getComputedStyle(el);
          if (cs.display === "none" || cs.visibility === "hidden" || parseFloat(cs.opacity) === 0) return false;
          return true;
        }

        const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"]);
        const all = document.querySelectorAll("body *");
        const seen = new Set(); // dedupe by signature
        const results = [];

        all.forEach((el) => {
          if (SKIP_TAGS.has(el.tagName)) return;
          if (!hasDirectText(el)) return;
          if (!isVisible(el)) return;

          const cs = getComputedStyle(el);
          const fgRgb = cs.color;
          const bgInfo = getEffectiveBackground(el);

          const fgTokens = tokensForColor(fgRgb);
          const bgTokens = tokensForColor(bgInfo.rgb);

          let matched = false;
          if (fgTokens.length && bgTokens.length) {
            outer: for (const fg of fgTokens) {
              for (const bg of bgTokens) {
                if (allowedPairSet.has(fg + "|" + bg)) {
                  matched = true;
                  break outer;
                }
              }
            }
          }

          if (!matched) {
            const signature = fgTokens.join(",") + "::" + bgTokens.join(",") + "::" + bgInfo.ancestorPath;
            if (seen.has(signature)) return;
            seen.add(signature);

            let text = "";
            for (let i = 0; i < el.childNodes.length; i++) {
              const n = el.childNodes[i];
              if (n.nodeType === 3) text += n.textContent;
            }
            text = text.trim().slice(0, 80);

            results.push({
              domPath: domPath(el),
              fgRgb,
              bgRgb: bgInfo.rgb,
              fgTokens,
              bgTokens,
              bgAncestorPath: bgInfo.ancestorPath,
              bgFromSelf: bgInfo.sameElement,
              textSample: text
            });
          }
        });

        return results;
      },
      { tokenColorMap, ledgerPairs }
    );

    ledgerMismatches.push(...rawResults);
  } catch (e) {
    fail("ledger-check", "ledger cross-check", "ledger cross-check completes without exception", String(e), null);
  }

  // ---------------------------------------------------------------------
  // Targeted :hover checks. DESIGN.md §5 documents .btn-primary:hover and
  // .btn-secondary:hover as real, reachable text/background pairs a mouse
  // user sees, and now (as of this run) carries matching ledger lines for
  // both (--color-button-primary-text ON --color-button-primary-bg-hover,
  // --color-button-secondary-text ON --color-button-secondary-bg-hover).
  // The resting-state sweep above cannot exercise :hover, so drive a real
  // mouse hover over one live instance of each button class and check the
  // resolved pair the same way.
  // ---------------------------------------------------------------------
  if (rgbToTokens && allowedPairSet) {
    try {
      // #gutcheck-final-confirm (Beat 9) is a .btn-primary that is enabled
      // and present in the DOM by this point in the run (already clicked
      // once during Beat 9 above).
      await checkHoverPair(page, "#gutcheck-final-confirm", "btn-primary", rgbToTokens, allowedPairSet, ledgerMismatches);
      // #agg3-buttons button (Beat 4's "Run 10/100/1000" trial buttons) are
      // .btn-secondary and remain enabled/present in the DOM for the rest
      // of the run.
      await checkHoverPair(page, "#agg3-buttons button", "btn-secondary", rgbToTokens, allowedPairSet, ledgerMismatches);
    } catch (e) {
      fail("ledger-check-hover", "hover state checks", "hover state ledger checks complete without exception", String(e), null);
    }
  }

  await browser.close();

  const report = {
    pass: failures.length === 0 && consoleErrors.length === 0 && pageErrors.length === 0 && ledgerMismatches.length === 0,
    failures,
    consoleErrors,
    pageErrors,
    ledgerMismatches
  };

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.pass ? 0 : 1);
}

main().catch((e) => {
  console.error("qa-walk.js crashed:", e);
  console.log(
    JSON.stringify(
      {
        pass: false,
        failures: failures.concat([{ beat: "fatal", selector: "main()", expected: "script completes", actual: String(e), screenshot: null }]),
        consoleErrors,
        pageErrors,
        ledgerMismatches: []
      },
      null,
      2
    )
  );
  process.exit(1);
});
