const fs = require("fs"), path = require("path");
const copyJsonPath = process.argv[2] || path.join(__dirname, "..", "copy.json");
const copyJson = JSON.parse(fs.readFileSync(copyJsonPath, "utf8"));

const expectedTable = {
  "knowingHost.routes[0].detail": [[1, 6]],
  "knowingHost.routes[1].detail": [[1, 3], [2, 6]],
  "knowingHost.routes[2].detail": [[0, 1]],
  "knowingHost.workedDivision": [[1, 6], [2, 6], [0, 1], [3, 6], [1, 3], [2, 3]],
  "randomHost.routes[0].detail": [[1, 6]],
  "randomHost.routes[1].detail": [[1, 6]],
  "randomHost.routes[2].detail": [[0, 1]],
  "randomHost.workedDivision": [[1, 6], [1, 6], [2, 6], [1, 2]]
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
      // Return both literal pair and reduced value
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
  const operands = operandStrs.map(s => parseOperand(s).value);
  const res = parseOperand(m[3]);
  return {
    operands: operands,
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
        const statedValue = eq.resultValue;
        const statedLiteral = eq.resultLiteral;
        const internalOk = computed.equals(statedValue);
        const tableOk = exp.some(e => e[0] === statedLiteral[0] && e[1] === statedLiteral[1]);
        r.push({
          equation: pm[1].trim(),
          computed: computed,
          statedValue: statedValue,
          statedLiteral: statedLiteral,
          internalOk: internalOk,
          tableOk: tableOk
        });
      } catch (e) { r.push({ equation: pm[1].trim(), error: e.message }); }
    }
    const cm = /written as\s+(\d+\/\d+)/i.exec(d);
    if (cm) {
      try {
        const parsed = Fraction.parse(cm[1]);
        const tableOk = exp.some(e => e[0] === parsed.literal[0] && e[1] === parsed.literal[1]);
        r.push({
          equation: 'conversion to ' + cm[1],
          computed: null,
          statedValue: parsed.value,
          statedLiteral: parsed.literal,
          internalOk: true,
          tableOk: tableOk
        });
      } catch (e) { r.push({ equation: 'conversion to ' + cm[1], error: e.message }); }
    }
    return r;
  }
  const jm = /Joint probability:\s*(.+?)\./i.exec(d);
  if (jm) {
    const clause = jm[1].trim();
    try {
      if (clause === '0') {
        const z = new Fraction(0, 1);
        const tableOk = exp.some(e => e[0] === 0 && e[1] === 1);
        r.push({
          equation: clause,
          computed: z,
          statedValue: z,
          statedLiteral: [0, 1],
          internalOk: true,
          tableOk: tableOk
        });
      } else {
        const eq = parseEquation(clause);
        const computed = computeLeftSide(eq);
        const statedValue = eq.resultValue;
        const statedLiteral = eq.resultLiteral;
        const internalOk = computed.equals(statedValue);
        const tableOk = exp.some(e => e[0] === statedLiteral[0] && e[1] === statedLiteral[1]);
        r.push({
          equation: clause,
          computed: computed,
          statedValue: statedValue,
          statedLiteral: statedLiteral,
          internalOk: internalOk,
          tableOk: tableOk
        });
      }
    } catch (e) { r.push({ equation: clause, error: e.message }); }
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
      const statedValue = eq.resultValue;
      const statedLiteral = eq.resultLiteral;
      const internalOk = computed.equals(statedValue);
      const tableOk = exp.some(e => e[0] === statedLiteral[0] && e[1] === statedLiteral[1]);
      r.push({
        equation: am[1].trim(),
        computed: computed,
        statedValue: statedValue,
        statedLiteral: statedLiteral,
        internalOk: internalOk,
        tableOk: tableOk
      });
    } catch (e) { r.push({ equation: am[1].trim(), error: e.message }); }
  }
  for (const m of d.matchAll(/Route\s+\d+:\s*(.+?)\./gi)) {
    try {
      const eq = parseEquation(m[1].trim());
      const computed = computeLeftSide(eq);
      const statedValue = eq.resultValue;
      const statedLiteral = eq.resultLiteral;
      const internalOk = computed.equals(statedValue);
      const tableOk = exp.some(e => e[0] === statedLiteral[0] && e[1] === statedLiteral[1]);
      r.push({
        equation: m[1].trim(),
        computed: computed,
        statedValue: statedValue,
        statedLiteral: statedLiteral,
        internalOk: internalOk,
        tableOk: tableOk
      });
    } catch (e) { r.push({ equation: m[1].trim(), error: e.message }); }
  }
  return r;
}

let pass = 0, fail = 0, results = [], missing = [];
try {
  const w = copyJson.mechanismContrast?.threeCases?.whyYourDoorDoesntMove;
  if (!w) throw new Error('Cannot find whyYourDoorDoesntMove');
  const kh = w.knowingHost, rh = w.randomHost;
  if (!kh || !rh) throw new Error('Cannot find knowingHost or randomHost');

  for (let i = 0; i < 3; i++) {
    const k = 'knowingHost.routes[' + i + '].detail', e = expectedTable[k];
    if (!kh.routes?.[i]?.detail) { results.push('FAIL ' + k + ' | KEY NOT FOUND'); missing.push(k); fail++; continue; }
    try {
      const rs = verifyDetail(kh.routes[i].detail, e);
      if (!rs.length) { results.push('FAIL ' + k + ' | NO EQUATIONS'); fail++; continue; }
      let good = true;
      for (const r of rs) {
        if (r.error) { results.push('FAIL ' + k + ' | PARSE: ' + r.error); good = false; fail++; }
        else if (!r.internalOk || !r.tableOk) {
          let failMessages = [];
          if (!r.internalOk) failMessages.push('INTERNAL CONSISTENCY FAIL: "' + r.equation + '" computes to ' + r.computed.toString() + ' but states ' + r.statedValue.toString());
          if (!r.tableOk) failMessages.push('TABLE AGREEMENT FAIL: "' + r.equation + '" literal [' + r.statedLiteral[0] + ', ' + r.statedLiteral[1] + '] not in [' + e.map(v => '[' + v[0] + ', ' + v[1] + ']').join(', ') + ']');
          results.push('FAIL ' + k + ' | ' + failMessages.join(' | '));
          good = false;
          fail++;
        }
      }
      if (good) { results.push('PASS ' + k); pass++; }
    } catch (er) { results.push('FAIL ' + k + ' | ERROR: ' + er.message); fail++; }
  }

  const k0 = 'knowingHost.workedDivision', e0 = expectedTable[k0];
  if (!kh.workedDivision) { results.push('FAIL ' + k0 + ' | KEY NOT FOUND'); missing.push(k0); fail++; }
  else {
    try {
      const rs = verifyWorked(kh.workedDivision, e0);
      if (!rs.length) { results.push('FAIL ' + k0 + ' | NO EQUATIONS'); fail++; }
      else {
        let good = true;
        for (const r of rs) {
          if (r.error) { results.push('FAIL ' + k0 + ' | PARSE: ' + r.error); good = false; fail++; }
          else if (!r.internalOk || !r.tableOk) {
            let failMessages = [];
            if (!r.internalOk) failMessages.push('INTERNAL CONSISTENCY FAIL: "' + r.equation + '" computes to ' + r.computed.toString() + ' but states ' + r.statedValue.toString());
            if (!r.tableOk) failMessages.push('TABLE AGREEMENT FAIL: "' + r.equation + '" literal [' + r.statedLiteral[0] + ', ' + r.statedLiteral[1] + '] not in [' + e0.map(v => '[' + v[0] + ', ' + v[1] + ']').join(', ') + ']');
            results.push('FAIL ' + k0 + ' | ' + failMessages.join(' | '));
            good = false;
            fail++;
          }
        }
        if (good) { results.push('PASS ' + k0); pass++; }
      }
    } catch (er) { results.push('FAIL ' + k0 + ' | ERROR: ' + er.message); fail++; }
  }

  for (let i = 0; i < 3; i++) {
    const k = 'randomHost.routes[' + i + '].detail', e = expectedTable[k];
    if (!rh.routes?.[i]?.detail) { results.push('FAIL ' + k + ' | KEY NOT FOUND'); missing.push(k); fail++; continue; }
    try {
      const rs = verifyDetail(rh.routes[i].detail, e);
      if (!rs.length) { results.push('FAIL ' + k + ' | NO EQUATIONS'); fail++; continue; }
      let good = true;
      for (const r of rs) {
        if (r.error) { results.push('FAIL ' + k + ' | PARSE: ' + r.error); good = false; fail++; }
        else if (!r.internalOk || !r.tableOk) {
          let failMessages = [];
          if (!r.internalOk) failMessages.push('INTERNAL CONSISTENCY FAIL: "' + r.equation + '" computes to ' + r.computed.toString() + ' but states ' + r.statedValue.toString());
          if (!r.tableOk) failMessages.push('TABLE AGREEMENT FAIL: "' + r.equation + '" literal [' + r.statedLiteral[0] + ', ' + r.statedLiteral[1] + '] not in [' + e.map(v => '[' + v[0] + ', ' + v[1] + ']').join(', ') + ']');
          results.push('FAIL ' + k + ' | ' + failMessages.join(' | '));
          good = false;
          fail++;
        }
      }
      if (good) { results.push('PASS ' + k); pass++; }
    } catch (er) { results.push('FAIL ' + k + ' | ERROR: ' + er.message); fail++; }
  }

  const k2 = 'randomHost.workedDivision', e2 = expectedTable[k2];
  if (!rh.workedDivision) { results.push('FAIL ' + k2 + ' | KEY NOT FOUND'); missing.push(k2); fail++; }
  else {
    try {
      const rs = verifyWorked(rh.workedDivision, e2);
      if (!rs.length) { results.push('FAIL ' + k2 + ' | NO EQUATIONS'); fail++; }
      else {
        let good = true;
        for (const r of rs) {
          if (r.error) { results.push('FAIL ' + k2 + ' | PARSE: ' + r.error); good = false; fail++; }
          else if (!r.internalOk || !r.tableOk) {
            let failMessages = [];
            if (!r.internalOk) failMessages.push('INTERNAL CONSISTENCY FAIL: "' + r.equation + '" computes to ' + r.computed.toString() + ' but states ' + r.statedValue.toString());
            if (!r.tableOk) failMessages.push('TABLE AGREEMENT FAIL: "' + r.equation + '" literal [' + r.statedLiteral[0] + ', ' + r.statedLiteral[1] + '] not in [' + e2.map(v => '[' + v[0] + ', ' + v[1] + ']').join(', ') + ']');
            results.push('FAIL ' + k2 + ' | ' + failMessages.join(' | '));
            good = false;
            fail++;
          }
        }
        if (good) { results.push('PASS ' + k2); pass++; }
      }
    } catch (er) { results.push('FAIL ' + k2 + ' | ERROR: ' + er.message); fail++; }
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
