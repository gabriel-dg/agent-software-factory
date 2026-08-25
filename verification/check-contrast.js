const fs = require('fs');
const path = require('path');

// WCAG 2.1 relative luminance calculation
function getRelativeLuminance(hex) {
  // Parse hex color to RGB (0-1 range)
  const hex_str = hex.replace('#', '');
  if (!/^[0-9A-Fa-f]{6}$/.test(hex_str)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  const r = parseInt(hex_str.substr(0, 2), 16) / 255;
  const g = parseInt(hex_str.substr(2, 2), 16) / 255;
  const b = parseInt(hex_str.substr(4, 2), 16) / 255;

  // Apply gamma correction
  const rLinear = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const gLinear = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const bLinear = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

  // Calculate relative luminance
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

function getContrastRatio(lum1, lum2) {
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Parse tokens.css
function parseTokens(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const tokens = {};

  // Match CSS custom properties: --name: value;
  const regex = /--([a-zA-Z0-9\-]+):\s*([^;]+);/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const name = `--${match[1]}`;
    const value = match[2].trim();
    tokens[name] = value;
  }

  return tokens;
}

// Parse DESIGN.md for contrast pairs
function parseContrastPairs(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');

  // Find the "## Contrast pairs" section
  const startIndex = content.indexOf('## Contrast pairs');
  if (startIndex === -1) {
    throw new Error('Could not find "## Contrast pairs" section in DESIGN.md');
  }

  // Find the next ## heading after "## Contrast pairs"
  const nextHeadingIndex = content.indexOf('\n##', startIndex + 1);
  const endIndex = nextHeadingIndex === -1 ? content.length : nextHeadingIndex;

  const section = content.substring(startIndex, endIndex);
  const lines = section.split('\n');

  const pairs = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();

    // Stop when we hit another ## heading
    if (line.startsWith('##')) {
      break;
    }

    // Skip empty lines and non-CONTRAST lines
    if (!line || !line.startsWith('CONTRAST')) {
      continue;
    }

    // Parse CONTRAST line
    const contrastRegex = /^CONTRAST\s+(--[a-zA-Z0-9\-]+)\s+ON\s+(--[a-zA-Z0-9\-]+)\s+=\s+([\d.]+)\s+(AA-NORMAL|AA-LARGE|AA-UI)$/;
    const match = line.match(contrastRegex);

    if (!match) {
      pairs.push({
        error: 'FORMAT',
        line: line,
        message: `Invalid format: ${line}`
      });
      continue;
    }

    pairs.push({
      fgToken: match[1],
      bgToken: match[2],
      claimedRatio: parseFloat(match[3]),
      level: match[4]
    });
  }

  return pairs;
}

// Main verification
function verify() {
  const tokensPath = path.join(__dirname, '..', 'tokens.css');
  const designPath = path.join(__dirname, '..', 'docs', 'DESIGN.md');

  let tokens;
  let pairs;

  try {
    tokens = parseTokens(tokensPath);
  } catch (e) {
    console.log('FAIL');
    console.log(`Error reading tokens: ${e.message}`);
    process.exit(1);
  }

  try {
    pairs = parseContrastPairs(designPath);
  } catch (e) {
    console.log('FAIL');
    console.log(`Error reading contrast pairs: ${e.message}`);
    process.exit(1);
  }

  // Verify each pair
  const thresholds = {
    'AA-NORMAL': 4.5,
    'AA-LARGE': 3,
    'AA-UI': 3
  };

  let hasFailed = false;
  const results = [];

  for (const pair of pairs) {
    // Check for format errors
    if (pair.error) {
      results.push({
        type: 'FORMAT_ERROR',
        line: pair.line,
        message: pair.message
      });
      hasFailed = true;
      continue;
    }

    // Check if tokens exist
    if (!tokens[pair.fgToken]) {
      results.push({
        type: 'FORMAT_ERROR',
        line: `CONTRAST ${pair.fgToken} ON ${pair.bgToken} = ${pair.claimedRatio} ${pair.level}`,
        message: `Token not found: ${pair.fgToken}`
      });
      hasFailed = true;
      continue;
    }

    if (!tokens[pair.bgToken]) {
      results.push({
        type: 'FORMAT_ERROR',
        line: `CONTRAST ${pair.fgToken} ON ${pair.bgToken} = ${pair.claimedRatio} ${pair.level}`,
        message: `Token not found: ${pair.bgToken}`
      });
      hasFailed = true;
      continue;
    }

    // Check if tokens are literal colors (not var() references)
    const fgValue = tokens[pair.fgToken];
    const bgValue = tokens[pair.bgToken];

    if (fgValue.includes('var(') || !fgValue.match(/^#[0-9A-Fa-f]{6}$/)) {
      results.push({
        type: 'FORMAT_ERROR',
        line: `CONTRAST ${pair.fgToken} ON ${pair.bgToken} = ${pair.claimedRatio} ${pair.level}`,
        message: `Token is not a literal color: ${pair.fgToken} = ${fgValue}`
      });
      hasFailed = true;
      continue;
    }

    if (bgValue.includes('var(') || !bgValue.match(/^#[0-9A-Fa-f]{6}$/)) {
      results.push({
        type: 'FORMAT_ERROR',
        line: `CONTRAST ${pair.fgToken} ON ${pair.bgToken} = ${pair.claimedRatio} ${pair.level}`,
        message: `Token is not a literal color: ${pair.bgToken} = ${bgValue}`
      });
      hasFailed = true;
      continue;
    }

    // Compute contrast ratio
    try {
      const fgLum = getRelativeLuminance(fgValue);
      const bgLum = getRelativeLuminance(bgValue);
      const computedRatio = getContrastRatio(fgLum, bgLum);

      const threshold = thresholds[pair.level];
      const ratioDiff = Math.abs(computedRatio - pair.claimedRatio);

      // Check if ratio meets threshold
      const meetsThreshold = computedRatio >= threshold;

      // Check if claimed ratio matches computed (within 0.1)
      const ratioMatch = ratioDiff <= 0.1;

      results.push({
        type: 'CONTRAST',
        pair: `${pair.fgToken} ON ${pair.bgToken}`,
        computed: computedRatio.toFixed(2),
        claimed: pair.claimedRatio.toFixed(2),
        threshold: threshold.toFixed(2),
        level: pair.level,
        meetsThreshold: meetsThreshold,
        ratioMatch: ratioMatch,
        diff: ratioDiff.toFixed(2)
      });

      if (!meetsThreshold || !ratioMatch) {
        hasFailed = true;
      }
    } catch (e) {
      results.push({
        type: 'ERROR',
        pair: `${pair.fgToken} ON ${pair.bgToken}`,
        message: e.message
      });
      hasFailed = true;
    }
  }

  // Output
  if (hasFailed) {
    console.log('FAIL');
  } else {
    console.log('PASS');
  }

  // Print raw numbers
  for (const result of results) {
    if (result.type === 'CONTRAST') {
      console.log(`${result.pair}, ${result.computed}, ${result.claimed}, ${result.threshold}`);
    } else {
      console.log(`${result.type}: ${result.message || result.line}`);
    }
  }

  process.exit(hasFailed ? 1 : 0);
}

verify();
