const fs = require("fs"), path = require("path");
const copyJsonPath = process.argv[2] || path.join(__dirname, "..", "copy.json");
const copyJson = JSON.parse(fs.readFileSync(copyJsonPath, "utf8"));

const expectedTable = {
  "knowingHost.routes[0].detail": [
    { type: "equation", operator: '*', operandLiterals: [[1, 3], [1, 2]], resultLiteral: [1, 6] }
  ],
  "knowingHost.routes[1].detail": [
    { type: "equation", operator: '*', operandLiterals: [[1, 3], [1, 1]], resultLiteral: [1, 3] },
    { type: 'conversion', resultLiteral: [2, 6] }
  ],
  "knowingHost.routes[2].detail": [
    { type: 'joint', resultLiteral: [0, 1] }
  ],
  "knowingHost.workedDivision": [
    { type: "equation", operator: '+', operandLiterals: [[1, 6], [2, 6], [0, 1]], resultLiteral: [3, 6] },
    { type: "equation", operator: '/', operandLiterals: [[1, 6], [3, 6]], resultLiteral: [1, 3] },
    { type: "equation", operator: '/', operandLiterals: [[2, 6], [3, 6]], resultLiteral: [2, 3] }
  ],
  "randomHost.routes[0].detail": [
    { type: "equation", operator: '*', operandLiterals: [[1, 3], [1, 2]], resultLiteral: [1, 6] }
  ],
  "randomHost.routes[1].detail": [
    { type: "equation", operator: '*', operandLiterals: [[1, 3], [1, 2]], resultLiteral: [1, 6] }
  ],
  "randomHost.routes[2].detail": [
    { type: 'joint', resultLiteral: [0, 1] }
  ],
  "randomHost.workedDivision": [
    { type: "equation", operator: '+', operandLiterals: [[1, 6], [1, 6]], resultLiteral: [2, 6] },
    { type: "equation", operator: '/', operandLiterals: [[1, 6], [2, 6]], resultLiteral: [1, 2] },
    { type: "equation", operator: '/', operandLiterals: [[1, 6], [2, 6]], resultLiteral: [1, 2] }
  ]
};

class Fraction {
  constructor(num, denom = 1) {
    if (denom === 0) throw new Error("denom=0");
    const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
    const g = gcd(Math.abs(num), Math.abs(denom));
    this.num = (num / g) * (denom < 0 ? -1 : 1);
    this.denom = Math.abs(denom) / g;
  }
  multiply(o) { return new Fraction(this.num * o.num, this.denom * o.denom); }
  divide(o) { return new Fraction(this.num * o.denom, this.denom * o.num); }
  add(o) { return new Fraction(this.num * o.denom + o.num * this.denom, this.denom * o.denom); }
  equals(o) { return this.num === o.num && this.denom === o.denom; }
  toString() { return this.denom === 1 ? String(this.num) : `${this.num}/${this.denom}`; }
  static parse(str) {
    str = str.trim();
    if (/^\d+\/\d+$/.test(str)) {
      const [n, d] = str.split('/').map(x => parseInt(x, 10));
      const value = new Fraction(n, d);
      return { literal: [n, d], value };
    }
    const m = /^(\d+)\s+in\s+(\d+)$/.exec(str);
    if (m) {
      const n = parseInt(m[1], 10), d = parseInt(m[2], 10);
      const value = new Fraction(n, d);
      return { literal: [n, d], value };
    }
    if (/^\d+$/.test(str)) {
      const n = parseInt(str, 10);
      return { literal: [n, 1], value: new Fraction(n, 1) };
    }
    throw new Error("parse: " + str);
  }
}

function parseOperand(str) {
  return Fraction.parse(str.trim());
}

function matchProduct(eqStr) {
  const pat = /^(\d+\/\d+|\d+)\s*[x×]\s*(\d+\/\d+|\d+)\s*=\s*(\d+\/\d+|\d+\s+in\s+\d+|\d+)/;
  const m = pat.exec(eqStr.trim());
  if (!m) return null;
  const op1 = parseOperand(m[1]), op2 = parseOperand(m[2]), res = parseOperand(m[3]);
  return {
    operands: [op1.value, op2.value],
    operandLiterals: [op1.literal, op2.literal],
    resultLiteral: res.literal,
    resultValue: res.value,
    operator: '*'
  };
}

function matchSum(eqStr) {
  const pat = /^(\d+\/\d+|\d+)(?:\s*\+\s*(\d+\/\d+|\d+))+\s*=\s*(\d+\/\d+|\d+\s+in\s+\d+|\d+)/;
  const m = pat.exec(eqStr.trim());
  if (!m) return null;
  const operandStrs = m[0].split('=')[0].trim().split('+').map(s => s.trim());
  const operands = operandStrs.map(s => parseOperand(s));
  const res = parseOperand(m[3]);
  return {
    operands: operands.map(o => o.value),
    operandLiterals: operands.map(o => o.literal),
    resultLiteral: res.literal,
    resultValue: res.value,
    operator: '+'
  };
}

function matchDivision(eqStr) {
  const pat = /^\(\s*(\d+)\/(\d+)\s*\)\s*\/\s*\(\s*(\d+)\/(\d+)\s*\)\s*=\s*(\d+\/\d+|\d+\s+in\s+\d+|\d+)/;
  const m = pat.exec(eqStr.trim());
  if (!m) return null;
  const op1 = new Fraction(parseInt(m[1], 10), parseInt(m[2], 10));
  const op2 = new Fraction(parseInt(m[3], 10), parseInt(m[4], 10));
  const res = parseOperand(m[5]);
  return {
    operands: [op1, op2],
    operandLiterals: [[parseInt(m[1], 10), parseInt(m[2], 10)], [parseInt(m[3], 10), parseInt(m[4], 10)]],
    resultLiteral: res.literal,
    resultValue: res.value,
    operator: '/'
  };
}

function parseEquation(eqStr) {
  let eq = matchProduct(eqStr) || matchSum(eqStr) || matchDivision(eqStr);
  if (!eq) throw new Error("no equation match: " + eqStr);
  return eq;
}

function computeLeftSide(eq) {
  if (!eq.operands.length) throw new Error('empty operands');
  let v = eq.operands[0];
  for (let i = 1; i < eq.operands.length; i++) {
    if (eq.operator === '*') v = v.multiply(eq.operands[i]);
    else if (eq.operator === '+') v = v.add(eq.operands[i]);
    else if (eq.operator === '/') v = v.divide(eq.operands[i]);
  }
  return v;
}

function verifyDetail(d, exp) {
  const r = [];
  if (/The product is/.test(d)) {
    const pm = /The product is\s*(.+?)\.\s/i.exec(d);
    if (pm) {
      try {
        const eq = parseEquation(pm[1].trim());
        const computed = computeLeftSide(eq);
        const internalOk = computed.equals(eq.resultValue);
        r.push({
          type: 'equation',
          operator: eq.operator,
          operandLiterals: eq.operandLiterals,
          resultLiteral: eq.resultLiteral,
          computed: computed,
          statedValue: eq.resultValue,
          internalOk: internalOk,
          equation: pm[1].trim()
        });
      } catch (e) { r.push({ type: 'error', error: e.message, equation: pm[1].trim() }); }
    }
    const cm = /written as\s+(\d+\/\d+)/i.exec(d);
    if (cm) {
      try {
        const parsed = Fraction.parse(cm[1]);
        r.push({
          type: 'conversion',
          resultLiteral: parsed.literal,
          statedValue: parsed.value,
          equation: 'conversion to ' + cm[1]
        });
      } catch (e) { r.push({ type: 'error', error: e.message, equation: 'conversion to ' + cm[1] }); }
    }
    return r;
  }
  const jm = /Joint probability:\s*(.+?)\./i.exec(d);
  if (jm) {
    const clause = jm[1].trim();
    if (clause === '0') {
      r.push({
        type: 'joint',
        resultLiteral: [0, 1],
        statedValue: new Fraction(0, 1),
        equation: clause
      });
    } else {
      try {
        const eq = parseEquation(clause);
        const computed = computeLeftSide(eq);
        const internalOk = computed.equals(eq.resultValue);
        r.push({
          type: 'equation',
          operator: eq.operator,
          operandLiterals: eq.operandLiterals,
          resultLiteral: eq.resultLiteral,
          computed: computed,
          statedValue: eq.resultValue,
          internalOk: internalOk,
          equation: clause
        });
      } catch (eqErr) {
        try {
          const parsed = Fraction.parse(clause);
          r.push({
            type: 'joint',
            resultLiteral: parsed.literal,
            statedValue: parsed.value,
            equation: clause
          });
        } catch (fracErr) {
          r.push({ type: 'error', error: fracErr.message, equation: clause });
        }
      }
    }
  }
  return r;
}

function verifyWorked(d, exp) {
  const r = [];
  const am = /Add them:\s*(.+?)\./i.exec(d);
  if (am) {
    try {
      const eq = parseEquation(am[1].trim());
      const computed = computeLeftSide(eq);
      const internalOk = computed.equals(eq.resultValue);
      r.push({
        type: 'equation',
        operator: eq.operator,
        operandLiterals: eq.operandLiterals,
        resultLiteral: eq.resultLiteral,
        computed: computed,
        statedValue: eq.resultValue,
        internalOk: internalOk,
        equation: am[1].trim()
      });
    } catch (e) { r.push({ type: 'error', error: e.message, equation: am[1].trim() }); }
  } else {
    const sumMatch = d.match(/(\d+\/\d+|\d+)(?:\s*\+\s*(\d+\/\d+|\d+))+\s*=\s*(\d+\/\d+|\d+\s+in\s+\d+|\d+)/);
    if (sumMatch) {
      try {
        const eq = parseEquation(sumMatch[0]);
        const computed = computeLeftSide(eq);
        const internalOk = computed.equals(eq.resultValue);
        r.push({
          type: 'equation',
          operator: eq.operator,
          operandLiterals: eq.operandLiterals,
          resultLiteral: eq.resultLiteral,
          computed: computed,
          statedValue: eq.resultValue,
          internalOk: internalOk,
          equation: sumMatch[0]
        });
      } catch (e) { r.push({ type: 'error', error: e.message, equation: sumMatch[0] }); }
    }
  }
  for (const m of d.matchAll(/Route\s+\d+:\s*(.+?)\./gi)) {
    try {
      const eq = parseEquation(m[1].trim());
      const computed = computeLeftSide(eq);
      const internalOk = computed.equals(eq.resultValue);
      r.push({
        type: 'equation',
        operator: eq.operator,
        operandLiterals: eq.operandLiterals,
        resultLiteral: eq.resultLiteral,
        computed: computed,
        statedValue: eq.resultValue,
        internalOk: internalOk,
        equation: m[1].trim()
      });
    } catch (e) { r.push({ type: 'error', error: e.message, equation: m[1].trim() }); }
  }
  return r;
}

function reportKey(k, specs, rs) {
  let internalConsistency = true, tableAgreement = true;
  let failMessages = [];

  if (!rs.length && specs.length) {
    return {
      line: 'FAIL ' + k + ' | INTERNAL CONSISTENCY FAIL | TABLE AGREEMENT FAIL | NO EQUATIONS',
      pass: false
    };
  }

  if (rs.length !== specs.length) {
    tableAgreement = false;
    failMessages.push('TABLE AGREEMENT FAIL: Found ' + rs.length + ' equations but expected ' + specs.length);
  }

  const minLen = Math.min(rs.length, specs.length);
  for (let i = 0; i < minLen; i++) {
    const r = rs[i];
    const spec = specs[i];

    if (r.type === 'error') {
      internalConsistency = false;
      tableAgreement = false;
      failMessages.push('PARSE: ' + r.error);
      continue;
    }

    if (r.type === 'equation') {
      if (!r.internalOk) {
        internalConsistency = false;
        failMessages.push('INTERNAL CONSISTENCY FAIL: "' + r.equation + '" computes to ' + r.computed.toString() + ' but states ' + r.statedValue.toString());
      }

      if (spec.type === 'equation' && spec.operator === r.operator) {
        const operandsMatch = JSON.stringify(r.operandLiterals) === JSON.stringify(spec.operandLiterals);
        const resultMatches = r.resultLiteral[0] === spec.resultLiteral[0] && r.resultLiteral[1] === spec.resultLiteral[1];

        if (!operandsMatch) {
          tableAgreement = false;
          failMessages.push('TABLE AGREEMENT FAIL: "' + r.equation + '" operands [' + r.operandLiterals.map(x => x.join('/')).join(', ') + '] do not match expected [' + spec.operandLiterals.map(x => x.join('/')).join(', ') + ']');
        }
        if (!resultMatches) {
          tableAgreement = false;
          failMessages.push('TABLE AGREEMENT FAIL: "' + r.equation + '" result [' + r.resultLiteral[0] + ', ' + r.resultLiteral[1] + '] does not match expected [' + spec.resultLiteral[0] + ', ' + spec.resultLiteral[1] + ']');
        }
      } else {
        tableAgreement = false;
        failMessages.push('TABLE AGREEMENT FAIL: "' + r.equation + '" is a ' + r.type + ' but spec expects ' + spec.type);
      }
    } else if (r.type === 'conversion') {
      if (spec.type !== 'conversion') {
        tableAgreement = false;
        failMessages.push('TABLE AGREEMENT FAIL: "' + r.equation + '" is a conversion but spec expects ' + spec.type);
      } else {
        const resultMatches = r.resultLiteral[0] === spec.resultLiteral[0] && r.resultLiteral[1] === spec.resultLiteral[1];
        if (!resultMatches) {
          tableAgreement = false;
          failMessages.push('TABLE AGREEMENT FAIL: "' + r.equation + '" literal [' + r.resultLiteral[0] + ', ' + r.resultLiteral[1] + '] does not match expected [' + spec.resultLiteral[0] + ', ' + spec.resultLiteral[1] + ']');
        }
      }
    } else if (r.type === 'joint') {
      if (spec.type !== 'joint') {
        tableAgreement = false;
        failMessages.push('TABLE AGREEMENT FAIL: "' + r.equation + '" is a joint probability but spec expects ' + spec.type);
      } else {
        const resultMatches = r.resultLiteral[0] === spec.resultLiteral[0] && r.resultLiteral[1] === spec.resultLiteral[1];
        if (!resultMatches) {
          tableAgreement = false;
          failMessages.push('TABLE AGREEMENT FAIL: "' + r.equation + '" literal [' + r.resultLiteral[0] + ', ' + r.resultLiteral[1] + '] does not match expected [' + spec.resultLiteral[0] + ', ' + spec.resultLiteral[1] + ']');
        }
      }
    }
  }

  for (let i = minLen; i < rs.length; i++) {
    const r = rs[i];
    tableAgreement = false;
    failMessages.push('TABLE AGREEMENT FAIL: Extra equation found: "' + r.equation + '"');
  }

  for (let i = minLen; i < specs.length; i++) {
    tableAgreement = false;
    failMessages.push('TABLE AGREEMENT FAIL: Missing equation for spec: ' + specs[i].type);
  }

  const bothPass = internalConsistency && tableAgreement;
  const verdict = bothPass ? 'PASS' : 'FAIL';
  const internalStr = internalConsistency ? 'PASS' : 'FAIL';
  const tableStr = tableAgreement ? 'PASS' : 'FAIL';

  let line = verdict + ' ' + k + ' | INTERNAL CONSISTENCY ' + internalStr + ' | TABLE AGREEMENT ' + tableStr;
  if (failMessages.length) {
    line += ' | ' + failMessages.join(' | ');
  }

  return {
    line: line,
    pass: bothPass
  };
}

let pass = 0, fail = 0, results = [], missing = [];
try {
  const w = copyJson.mechanismContrast?.threeCases?.whyYourDoorDoesntMove;
  if (!w) throw new Error('Cannot find whyYourDoorDoesntMove');
  const kh = w.knowingHost, rh = w.randomHost;
  if (!kh || !rh) throw new Error('Cannot find knowingHost or randomHost');

  for (let i = 0; i < 3; i++) {
    const k = 'knowingHost.routes[' + i + '].detail', e = expectedTable[k];
    if (!kh.routes?.[i]?.detail) {
      results.push('FAIL ' + k + ' | INTERNAL CONSISTENCY FAIL | TABLE AGREEMENT FAIL | KEY NOT FOUND');
      missing.push(k);
      fail++;
      continue;
    }
    try {
      const rs = verifyDetail(kh.routes[i].detail, e);
      const report = reportKey(k, e, rs);
      results.push(report.line);
      if (report.pass) pass++;
      else fail++;
    } catch (er) {
      results.push('FAIL ' + k + ' | INTERNAL CONSISTENCY FAIL | TABLE AGREEMENT FAIL | ERROR: ' + er.message);
      fail++;
    }
  }

  const k0 = 'knowingHost.workedDivision', e0 = expectedTable[k0];
  if (!kh.workedDivision) {
    results.push('FAIL ' + k0 + ' | INTERNAL CONSISTENCY FAIL | TABLE AGREEMENT FAIL | KEY NOT FOUND');
    missing.push(k0);
    fail++;
  } else {
    try {
      const rs = verifyWorked(kh.workedDivision, e0);
      const report = reportKey(k0, e0, rs);
      results.push(report.line);
      if (report.pass) pass++;
      else fail++;
    } catch (er) {
      results.push('FAIL ' + k0 + ' | INTERNAL CONSISTENCY FAIL | TABLE AGREEMENT FAIL | ERROR: ' + er.message);
      fail++;
    }
  }

  for (let i = 0; i < 3; i++) {
    const k = 'randomHost.routes[' + i + '].detail', e = expectedTable[k];
    if (!rh.routes?.[i]?.detail) {
      results.push('FAIL ' + k + ' | INTERNAL CONSISTENCY FAIL | TABLE AGREEMENT FAIL | KEY NOT FOUND');
      missing.push(k);
      fail++;
      continue;
    }
    try {
      const rs = verifyDetail(rh.routes[i].detail, e);
      const report = reportKey(k, e, rs);
      results.push(report.line);
      if (report.pass) pass++;
      else fail++;
    } catch (er) {
      results.push('FAIL ' + k + ' | INTERNAL CONSISTENCY FAIL | TABLE AGREEMENT FAIL | ERROR: ' + er.message);
      fail++;
    }
  }

  const k2 = 'randomHost.workedDivision', e2 = expectedTable[k2];
  if (!rh.workedDivision) {
    results.push('FAIL ' + k2 + ' | INTERNAL CONSISTENCY FAIL | TABLE AGREEMENT FAIL | KEY NOT FOUND');
    missing.push(k2);
    fail++;
  } else {
    try {
      const rs = verifyWorked(rh.workedDivision, e2);
      const report = reportKey(k2, e2, rs);
      results.push(report.line);
      if (report.pass) pass++;
      else fail++;
    } catch (er) {
      results.push('FAIL ' + k2 + ' | INTERNAL CONSISTENCY FAIL | TABLE AGREEMENT FAIL | ERROR: ' + er.message);
      fail++;
    }
  }
} catch (err) { console.log('FAIL: ' + err.message); process.exit(1); }

console.log(results.join('\n'));
console.log('\n--- SUMMARY ---');
console.log('Equations checked: ' + (pass + fail));
console.log('Passed: ' + pass);
console.log('Failed: ' + fail);
if (missing.length) console.log('Missing keys: ' + missing.join(', '));
console.log('\n' + (fail === 0 ? 'PASS' : 'FAIL'));
process.exit(fail === 0 ? 0 : 1);
