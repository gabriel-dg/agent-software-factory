// Sabotage suite: test that check-route-arithmetic.js catches 10 mutations
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const originalCopyJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'copy.json'), 'utf8'));
const tempDir = path.join(os.tmpdir(), 'monty-hall-sabotage');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

const mutations = [
  {
    name: 'a: Wrong product result (1 in 7 instead of 1 in 6)',
    apply: (copy) => {
      const detail = copy.mechanismContrast.threeCases.whyYourDoorDoesntMove.knowingHost.routes[0].detail;
      copy.mechanismContrast.threeCases.whyYourDoorDoesntMove.knowingHost.routes[0].detail =
        detail.replace('1/3 x 1/2 = 1 in 6', '1/3 x 1/2 = 1 in 7');
    }
  },
  {
    name: 'b: Wrong operand in product (1/2 instead of 1)',
    apply: (copy) => {
      const detail = copy.mechanismContrast.threeCases.whyYourDoorDoesntMove.knowingHost.routes[1].detail;
      copy.mechanismContrast.threeCases.whyYourDoorDoesntMove.knowingHost.routes[1].detail =
        detail.replace('1/3 x 1 = 1/3', '1/3 x 1/2 = 1/6');
    }
  },
  {
    name: 'c: Wrong division result (2/3 instead of 1/3)',
    apply: (copy) => {
      const worked = copy.mechanismContrast.threeCases.whyYourDoorDoesntMove.knowingHost.workedDivision;
      copy.mechanismContrast.threeCases.whyYourDoorDoesntMove.knowingHost.workedDivision =
        worked.replace('Route 1: (1/6) / (3/6) = 1/3', 'Route 1: (1/6) / (3/6) = 2/3');
    }
  },
  {
    name: 'd: Truncate equation',
    apply: (copy) => {
      const worked = copy.mechanismContrast.threeCases.whyYourDoorDoesntMove.knowingHost.workedDivision;
      copy.mechanismContrast.threeCases.whyYourDoorDoesntMove.knowingHost.workedDivision =
        worked.substring(0, 50);
    }
  },
  {
    name: 'e: Corrupt division syntax (// instead of /)',
    apply: (copy) => {
      const worked = copy.mechanismContrast.threeCases.whyYourDoorDoesntMove.knowingHost.workedDivision;
      copy.mechanismContrast.threeCases.whyYourDoorDoesntMove.knowingHost.workedDivision =
        worked.replace('(1/6) / (3/6)', '(1/6) // (3/6)');
    }
  },
  {
    name: 'f: Wrong division result Route 2 (1/3 instead of 2/3)',
    apply: (copy) => {
      const worked = copy.mechanismContrast.threeCases.whyYourDoorDoesntMove.knowingHost.workedDivision;
      copy.mechanismContrast.threeCases.whyYourDoorDoesntMove.knowingHost.workedDivision =
        worked.replace('Route 2: (2/6) / (3/6) = 2/3', 'Route 2: (2/6) / (3/6) = 1/3');
    }
  },
  {
    name: 'g: Wrong sum result in randomHost (1/6 instead of 2/6)',
    apply: (copy) => {
      const worked = copy.mechanismContrast.threeCases.whyYourDoorDoesntMove.randomHost.workedDivision;
      copy.mechanismContrast.threeCases.whyYourDoorDoesntMove.randomHost.workedDivision =
        worked.replace('1/6 + 1/6 = 2/6', '1/6 + 1/6 = 1/6');
    }
  },
  {
    name: 'h: Swap numerator and denominator in division operand',
    apply: (copy) => {
      const worked = copy.mechanismContrast.threeCases.whyYourDoorDoesntMove.knowingHost.workedDivision;
      copy.mechanismContrast.threeCases.whyYourDoorDoesntMove.knowingHost.workedDivision =
        worked.replace('(2/6) / (3/6)', '(6/2) / (3/6)');
    }
  },
  {
    name: 'i: Wrong conversion denominator (2/5 instead of 2/6)',
    apply: (copy) => {
      const detail = copy.mechanismContrast.threeCases.whyYourDoorDoesntMove.knowingHost.routes[1].detail;
      copy.mechanismContrast.threeCases.whyYourDoorDoesntMove.knowingHost.routes[1].detail =
        detail.replace('written as 2/6', 'written as 2/5');
    }
  },
  {
    name: 'j: Rewrite result from "2/6" to "1/3" (PASS internal, FAIL table)',
    apply: (copy) => {
      const worked = copy.mechanismContrast.threeCases.whyYourDoorDoesntMove.randomHost.workedDivision;
      copy.mechanismContrast.threeCases.whyYourDoorDoesntMove.randomHost.workedDivision =
        worked.replace('1/6 + 1/6 = 2/6', '1/6 + 1/6 = 1/3');
    },
    expectTableFail: true
  },
  {
    name: 'k: DELETE knowingHost.routes[2].detail key',
    apply: (copy) => {
      delete copy.mechanismContrast.threeCases.whyYourDoorDoesntMove.knowingHost.routes[2].detail;
    }
  },
  {
    name: 'l: Collapse routes[1] product to "1/3 x 1 = 2 in 6" (value-consistent, form-wrong)',
    apply: (copy) => {
      const detail = copy.mechanismContrast.threeCases.whyYourDoorDoesntMove.knowingHost.routes[1].detail;
      copy.mechanismContrast.threeCases.whyYourDoorDoesntMove.knowingHost.routes[1].detail =
        detail.replace('1/3 x 1 = 1/3', '1/3 x 1 = 2 in 6');
    }
  },
  {
    name: 'm: Change routes[2] joint probability from 0 to 1/6',
    apply: (copy) => {
      const detail = copy.mechanismContrast.threeCases.whyYourDoorDoesntMove.knowingHost.routes[2].detail;
      copy.mechanismContrast.threeCases.whyYourDoorDoesntMove.knowingHost.routes[2].detail =
        detail.replace('Joint probability: 0.', 'Joint probability: 1/6.');
    }
  }
];

console.log('SABOTAGE TEST SUITE FOR check-route-arithmetic.js\n');
let sabotagePassCount = 0;
let sabotageFailCount = 0;

for (let i = 0; i < mutations.length; i++) {
  const mutation = mutations[i];
  const testCopy = JSON.parse(JSON.stringify(originalCopyJson));

  // Apply mutation
  mutation.apply(testCopy);

  const tempCopyPath = path.join(tempDir, `copy-mutation-${i}.json`);
  fs.writeFileSync(tempCopyPath, JSON.stringify(testCopy, null, 2));

  try {
    const output = execSync(`node "${path.join(__dirname, 'check-route-arithmetic.js')}" "${tempCopyPath}"`, { encoding: 'utf8', stdio: 'pipe' });
    // Script exited 0 — should have failed!
    if (mutation.expectTableFail) {
      console.log(`FAIL ${mutation.name} | SHOULD FAIL TABLE AGREEMENT but passed`);
      sabotageFailCount++;
    } else {
      console.log(`FAIL ${mutation.name} | Should have detected error but passed`);
      sabotageFailCount++;
    }
  } catch (err) {
    // Script exited non-zero — check if this is expected
    if (mutation.expectTableFail) {
      // For mutation j, we expect it to fail on table agreement
      if (err.stdout && err.stdout.includes('TABLE AGREEMENT FAIL')) {
        console.log(`PASS ${mutation.name} | Correctly failed table agreement (PASS internal + FAIL table)`);
        sabotagePassCount++;
      } else {
        console.log(`PARTIAL ${mutation.name} | Failed but not on table agreement: ${err.stdout.split('\n')[0]}`);
        sabotageFailCount++;
      }
    } else {
      // Regular mutation should fail
      console.log(`PASS ${mutation.name} | Correctly detected error`);
      sabotagePassCount++;
    }
  }
}

console.log(`\n--- SABOTAGE SUMMARY ---`);
console.log(`Total mutations: ${mutations.length}`);
console.log(`Correctly detected: ${sabotagePassCount}`);
console.log(`Failed to detect: ${sabotageFailCount}`);
console.log(`\n${sabotageFailCount === 0 ? 'PASS' : 'FAIL'}`);

// Cleanup
fs.rmSync(tempDir, { recursive: true, force: true });
process.exit(sabotageFailCount === 0 ? 0 : 1);
