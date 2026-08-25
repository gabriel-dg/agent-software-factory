const MontyHall = require('../sim.js');

// Test empirical win rate against analytical ground truth
// Returns { delta, passes: delta <= tolerance }
function testRate(empiricalRate, analyticalRate, tolerance = 0.01) {
  const delta = Math.abs(empiricalRate - analyticalRate);
  return { delta, passes: delta <= tolerance };
}

let allPass = true;

// Test 1: Knowing host, 3 doors, staying
// Analytical: 1/3
const trials1 = 100000;
const result1Stay = MontyHall.runTrials(trials1, 3, 'stay', 'knowing', 'test1stay');
const analytical1Stay = 1/3;
const test1Stay = testRate(result1Stay.winRate, analytical1Stay);
console.log(`${trials1} ${result1Stay.winRate.toFixed(4)} ${analytical1Stay.toFixed(4)} ${test1Stay.delta.toFixed(4)}`);
if (!test1Stay.passes) allPass = false;

// Test 2: Knowing host, 3 doors, switching
// Analytical: 2/3
const result1Switch = MontyHall.runTrials(trials1, 3, 'switch', 'knowing', 'test1switch');
const analytical1Switch = 2/3;
const test1Switch = testRate(result1Switch.winRate, analytical1Switch);
console.log(`${trials1} ${result1Switch.winRate.toFixed(4)} ${analytical1Switch.toFixed(4)} ${test1Switch.delta.toFixed(4)}`);
if (!test1Switch.passes) allPass = false;

// Test 3: Knowing host, 10 doors, staying
// Analytical: 1/10
const trials3 = 100000;
const result3Stay = MontyHall.runTrials(trials3, 10, 'stay', 'knowing', 'test3stay');
const analytical3Stay = 1/10;
const test3Stay = testRate(result3Stay.winRate, analytical3Stay);
console.log(`${trials3} ${result3Stay.winRate.toFixed(4)} ${analytical3Stay.toFixed(4)} ${test3Stay.delta.toFixed(4)}`);
if (!test3Stay.passes) allPass = false;

// Test 4: Knowing host, 10 doors, switching
// Analytical: 9/10
const result3Switch = MontyHall.runTrials(trials3, 10, 'switch', 'knowing', 'test3switch');
const analytical3Switch = 9/10;
const test3Switch = testRate(result3Switch.winRate, analytical3Switch);
console.log(`${trials3} ${result3Switch.winRate.toFixed(4)} ${analytical3Switch.toFixed(4)} ${test3Switch.delta.toFixed(4)}`);
if (!test3Switch.passes) allPass = false;

// Test 5: Knowing host, 100 doors, staying
// Analytical: 1/100
const trials5 = 100000;
const result5Stay = MontyHall.runTrials(trials5, 100, 'stay', 'knowing', 'test5stay');
const analytical5Stay = 1/100;
const test5Stay = testRate(result5Stay.winRate, analytical5Stay);
console.log(`${trials5} ${result5Stay.winRate.toFixed(4)} ${analytical5Stay.toFixed(4)} ${test5Stay.delta.toFixed(4)}`);
if (!test5Stay.passes) allPass = false;

// Test 6: Knowing host, 100 doors, switching
// Analytical: 99/100
const result5Switch = MontyHall.runTrials(trials5, 100, 'switch', 'knowing', 'test5switch');
const analytical5Switch = 99/100;
const test5Switch = testRate(result5Switch.winRate, analytical5Switch);
console.log(`${trials5} ${result5Switch.winRate.toFixed(4)} ${analytical5Switch.toFixed(4)} ${test5Switch.delta.toFixed(4)}`);
if (!test5Switch.passes) allPass = false;

// Test 7: Random host, 3 doors, staying (among decided rounds)
// Analytical: 1/2
const trials7 = 100000;
const result7Stay = MontyHall.runTrials(trials7, 3, 'stay', 'random', 'test7stay');
const analytical7Stay = 1/2;
const test7Stay = testRate(result7Stay.decidedWinRate, analytical7Stay);
console.log(`${trials7} ${result7Stay.decidedWinRate.toFixed(4)} ${analytical7Stay.toFixed(4)} ${test7Stay.delta.toFixed(4)}`);
if (!test7Stay.passes) allPass = false;

// Test 8: Random host, 3 doors, switching (among decided rounds)
// Analytical: 1/2
const result7Switch = MontyHall.runTrials(trials7, 3, 'switch', 'random', 'test7switch');
const analytical7Switch = 1/2;
const test7Switch = testRate(result7Switch.decidedWinRate, analytical7Switch);
console.log(`${trials7} ${result7Switch.decidedWinRate.toFixed(4)} ${analytical7Switch.toFixed(4)} ${test7Switch.delta.toFixed(4)}`);
if (!test7Switch.passes) allPass = false;

// Test 9: Random host, 3 doors, prizeRevealed rate
// Analytical: 1/3 (with random host, there's a 1/3 chance the host randomly reveals the prize)
const analytical9 = 1/3;
const test9 = testRate(result7Stay.prizeRevealedRate, analytical9);
console.log(`${trials7} ${result7Stay.prizeRevealedRate.toFixed(4)} ${analytical9.toFixed(4)} ${test9.delta.toFixed(4)}`);
if (!test9.passes) allPass = false;

console.log(allPass ? 'PASS' : 'FAIL');
