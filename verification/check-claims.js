// check-claims.js — Verify quantitative claims in copy.json against sim.js
// Also performs mechanical style checks on all string values

const sim = require('../sim.js');
const fs = require('fs');
const path = require('path');

const copyJsonPath = path.join(__dirname, '..', 'copy.json');
const copyJson = JSON.parse(fs.readFileSync(copyJsonPath, 'utf8'));

const TRIAL_COUNT = 10000;
const FIXED_SEED = 42;

// Known placeholder names that viz.js actually substitutes
const KNOWN_PLACEHOLDERS = new Set([
  'n',
  'hostDoor',
  'pickedDoor',
  'remainingDoor',
  'switchWinPct',
  'stayWinPct',
  'spoiledCount',
  'openedList',
  'initialLabel',
  'finalLabel'
]);

const results = [];
const styleFailures = [];
let passCount = 0;
let failCount = 0;

function formatKey(keyPath) {
  return keyPath.join('.');
}

function extractClaims(obj, keyPath = []) {
  const claims = [];

  if (obj === null || obj === undefined) {
    return claims;
  }

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const item = obj[i];
      if (item === null || item === undefined) {
        continue;
      }
      const subClaims = extractClaims(item, [...keyPath, `[${i}]`]);
      claims.push(...subClaims);
    }
    return claims;
  }

  if (typeof obj === 'object') {
    const keys = Object.keys(obj);
    for (const key of keys) {
      if (key.endsWith('_assert')) {
        // Found an assertion
        const assertValue = obj[key];
        const baseKey = key.slice(0, -7); // Remove "_assert" suffix
        claims.push({
          key: formatKey([...keyPath, baseKey]),
          assertValue: assertValue,
        });
      } else {
        const subClaims = extractClaims(obj[key], [...keyPath, key]);
        claims.push(...subClaims);
      }
    }
  }

  return claims;
}

// Scan all string values in copy.json for style issues
function collectStringValues(obj, keyPath = []) {
  const strings = [];

  if (obj === null || obj === undefined) {
    return strings;
  }

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const item = obj[i];
      if (item === null || item === undefined) {
        continue;
      }
      const subs = collectStringValues(item, [...keyPath, `[${i}]`]);
      strings.push(...subs);
    }
    return strings;
  }

  if (typeof obj === 'string') {
    strings.push({
      key: formatKey(keyPath),
      value: obj
    });
    return strings;
  }

  if (typeof obj === 'object') {
    const keys = Object.keys(obj);
    for (const key of keys) {
      // Skip _assert objects themselves, but do recurse into their parent
      if (key.endsWith('_assert')) {
        continue;
      }
      const subs = collectStringValues(obj[key], [...keyPath, key]);
      strings.push(...subs);
    }
  }

  return strings;
}

// Check a single string for style issues
function checkStringStyle(key, value) {
  const failures = [];

  // Check for em dash (U+2014)
  if (value.indexOf('—') !== -1) {
    failures.push({
      type: 'EM_DASH',
      key: key,
      text: `Found em dash (U+2014) in string`,
      offending: '—'
    });
  }

  // Check for en dash (U+2013) with whitespace on either side
  // Pattern: \s–\s (space/whitespace followed by en dash followed by space/whitespace)
  if (/\s–\s/.test(value)) {
    failures.push({
      type: 'EN_DASH_AS_EM_DASH',
      key: key,
      text: `Found en dash (U+2013) used as em dash (flanked by whitespace)`,
      offending: '–'
    });
  }

  // Check for malformed or unknown {{placeholder}} tokens
  const placeholderRegex = /\{\{([^}]*)\}\}/g;
  let match;
  while ((match = placeholderRegex.exec(value)) !== null) {
    const fullToken = match[0]; // e.g., "{{n}}"
    const name = match[1]; // e.g., "n"

    // Check for malformed: whitespace inside braces
    if (/\s/.test(name)) {
      failures.push({
        type: 'MALFORMED_PLACEHOLDER',
        key: key,
        text: `Malformed placeholder with whitespace: ${fullToken}`,
        offending: fullToken
      });
    }
    // Check for unknown placeholder name
    else if (!KNOWN_PLACEHOLDERS.has(name)) {
      failures.push({
        type: 'UNKNOWN_PLACEHOLDER',
        key: key,
        text: `Unknown placeholder name: ${fullToken}`,
        offending: fullToken
      });
    }
  }

  // Check for unmatched braces (single or mismatched counts)
  // Pattern: {[^{]* or }[^}]* where not part of a well-formed {{ }}
  const singleBraceRegex = /[{}]/g;
  let braceMatch;
  const doubleOpenRegex = /\{\{/g;
  const doubleCloseRegex = /\}\}/g;

  // Count braces: every { should be part of {{ and every } should be part of }}
  const openCount = (value.match(/\{/g) || []).length;
  const closeCount = (value.match(/\}/g) || []).length;
  const doubleOpenCount = (value.match(doubleOpenRegex) || []).length;
  const doubleCloseCount = (value.match(doubleCloseRegex) || []).length;

  // All braces should be part of {{ }} pairs
  if (openCount !== doubleOpenCount * 2 || closeCount !== doubleCloseCount * 2) {
    failures.push({
      type: 'UNMATCHED_BRACES',
      key: key,
      text: `Unmatched or malformed braces (mismatched brace counts)`,
      offending: '{ or }'
    });
  }

  return failures;
}

function validateAssertion(assertValue) {
  // assertValue can be:
  // - a single object (assertion)
  // - an array where each element can be:
  //   - null (skip)
  //   - an object (single assertion)
  //   - an array of objects (multiple assertions)

  let flatAssertions = [];

  if (Array.isArray(assertValue)) {
    for (const item of assertValue) {
      if (item === null || item === undefined) {
        continue;
      }
      if (Array.isArray(item)) {
        // Nested array - flatten it
        for (const subItem of item) {
          if (subItem !== null && subItem !== undefined) {
            flatAssertions.push(subItem);
          }
        }
      } else {
        // Single object
        flatAssertions.push(item);
      }
    }
  } else if (assertValue !== null && assertValue !== undefined) {
    // Single object
    flatAssertions.push(assertValue);
  }

  const validated = [];
  for (const assertion of flatAssertions) {
    if (typeof assertion !== 'object' || assertion === null || Array.isArray(assertion)) {
      return { error: 'Assertion is not an object' };
    }

    const { doorCount, hostMode, metric, expected, tolerance } = assertion;

    // Validate all required fields
    if (!Number.isInteger(doorCount) || doorCount < 3) {
      return { error: `Invalid doorCount: ${doorCount}` };
    }
    if (hostMode !== 'knowing' && hostMode !== 'random') {
      return { error: `Invalid hostMode: ${hostMode}` };
    }
    const validMetrics = ['switchWins', 'stayWins', 'prizeRevealed', 'noRevealAndSwitchWins'];
    if (!validMetrics.includes(metric)) {
      return { error: `Invalid metric: ${metric}` };
    }
    if (typeof expected !== 'number' || expected < 0 || expected > 1) {
      return { error: `Invalid expected: ${expected}` };
    }
    if (typeof tolerance !== 'number' || tolerance < 0) {
      return { error: `Invalid tolerance: ${tolerance}` };
    }

    // Additional validation: prizeRevealed only valid with hostMode random
    if (metric === 'prizeRevealed' && hostMode !== 'random') {
      return { error: `prizeRevealed metric requires hostMode "random", got "${hostMode}"` };
    }

    // Additional validation: noRevealAndSwitchWins only valid with hostMode random
    if (metric === 'noRevealAndSwitchWins' && hostMode !== 'random') {
      return { error: `noRevealAndSwitchWins metric requires hostMode "random", got "${hostMode}"` };
    }

    validated.push({
      doorCount,
      hostMode,
      metric,
      expected,
      tolerance,
    });
  }

  if (validated.length === 0) {
    return { error: 'No valid assertions found' };
  }

  return { valid: validated };
}

function computeEmpirical(assertion) {
  const { doorCount, hostMode, metric } = assertion;

  let strategy;
  if (metric === 'switchWins') {
    strategy = 'switch';
  } else if (metric === 'stayWins') {
    strategy = 'stay';
  } else if (metric === 'prizeRevealed') {
    strategy = 'switch'; // doesn't matter for prizeRevealed
  } else if (metric === 'noRevealAndSwitchWins') {
    strategy = 'switch';
  }

  const trials = sim.runTrials(TRIAL_COUNT, doorCount, strategy, hostMode, FIXED_SEED);

  let empirical;
  if (metric === 'switchWins') {
    empirical = trials.winRate;
  } else if (metric === 'stayWins') {
    empirical = trials.winRate;
  } else if (metric === 'prizeRevealed') {
    empirical = trials.prizeRevealedRate;
  } else if (metric === 'noRevealAndSwitchWins') {
    empirical = trials.decidedWinRate;
  }

  return empirical;
}

// Main execution

// First, perform style checks on all string values
const stringValues = collectStringValues(copyJson);
for (const stringItem of stringValues) {
  const failures = checkStringStyle(stringItem.key, stringItem.value);
  if (failures.length > 0) {
    for (const failure of failures) {
      styleFailures.push(`${failure.key} | ${failure.type} | ${failure.text}`);
      failCount++;
    }
  }
}

// Then, perform numeric claim checks
const claims = extractClaims(copyJson);

for (const claim of claims) {
  const validation = validateAssertion(claim.assertValue);

  if (validation.error) {
    results.push(`FAIL ${claim.key} | FORMAT ERROR: ${validation.error}`);
    failCount++;
    continue;
  }

  const assertions = validation.valid;
  for (const assertion of assertions) {
    try {
      const empirical = computeEmpirical(assertion);
      const delta = Math.abs(empirical - assertion.expected);
      const pass = delta <= assertion.tolerance;

      if (pass) {
        results.push(`PASS ${claim.key} ${assertion.metric} ${empirical.toFixed(4)} ${assertion.expected.toFixed(4)} ${delta.toFixed(4)}`);
        passCount++;
      } else {
        results.push(`FAIL ${claim.key} ${assertion.metric} ${empirical.toFixed(4)} ${assertion.expected.toFixed(4)} ${delta.toFixed(4)}`);
        failCount++;
      }
    } catch (err) {
      results.push(`FAIL ${claim.key} ${assertion.metric} | RUNTIME ERROR: ${err.message}`);
      failCount++;
    }
  }
}

// Output results
console.log('STYLE PASS RESULTS:');
if (styleFailures.length === 0) {
  console.log('(no style failures found)');
} else {
  console.log(styleFailures.join('\n'));
}

console.log('\nNUMERIC CLAIM RESULTS:');
console.log(results.join('\n'));

// Final summary
console.log('\n' + (failCount === 0 ? 'PASS' : 'FAIL'));
process.exit(failCount === 0 ? 0 : 1);
