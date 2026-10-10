const assert = require('assert');
const { scoreProfile } = require('./scoring-engine.js');

// Test 1: a clear Faith anchor, Visionary mode, misaligned Family gravity
const t1 = scoreProfile({
  quick: { Faith: 12, Family: 9, Finance: 6, Fitness: 11, Freedom: 9 },
  extra: { Faith: [4, 4], Family: [3, 2], Finance: [3, 2], Fitness: [3, 3], Freedom: [3, 3] },
  style: [2, 1, 1, -1, -1, -1, 2, 2, 1, -1, -1, 0],
  values: { ranked: ['Legacy', 'Loyalty and belonging', 'Purpose and meaning'], protect: 'Family', slip: 'Finance' }
});
console.log('T1', JSON.stringify(t1));
assert.deepStrictEqual(t1.scores, { Faith: 20, Family: 14, Finance: 11, Fitness: 17, Freedom: 15 });
assert.strictEqual(t1.anchor, 'Faith');
assert.strictEqual(t1.shadow, null);
assert.strictEqual(t1.weakest, 'Finance');
assert.strictEqual(t1.imbalance, 9);
assert.strictEqual(t1.imbalanceBand, 'Lopsided');
assert.strictEqual(t1.mode, 'Visionary');
assert.strictEqual(t1.archetype, 'The Lighthouse');
assert.strictEqual(t1.drive, 'Inner');
assert.strictEqual(t1.driveStrength, 'Strong');
assert.strictEqual(t1.support, 'Shared');
assert.strictEqual(t1.supportStrength, 'Slight');
assert.strictEqual(t1.gravity, 'Family');
assert.strictEqual(t1.alignment, 'Misaligned');
assert.strictEqual(t1.sacrificedIsWeakest, true);

// Test 2: dual-lean tie broken by values, Builder mode, blended drive defaults to Inner
const t2 = scoreProfile({
  quick: { Faith: 11, Family: 8, Finance: 9, Fitness: 7, Freedom: 11 },
  extra: { Faith: [3, 4], Family: [3, 4], Finance: [3, 4], Fitness: [3, 4], Freedom: [3, 4] },
  style: [-2, -2, -1, 1, 2, 1, 0, 0, 0, 1, 1, -1],
  values: { ranked: ['Independence', 'Ownership of my time', 'Integrity and conscience'], protect: 'Freedom', slip: 'Family' }
});
console.log('T2', JSON.stringify(t2));
assert.deepStrictEqual(t2.scores, { Faith: 18, Family: 15, Finance: 16, Fitness: 14, Freedom: 18 });
assert.strictEqual(t2.anchor, 'Freedom');
assert.strictEqual(t2.shadow, 'Faith');
assert.strictEqual(t2.weakest, 'Fitness');
assert.strictEqual(t2.imbalance, 4);
assert.strictEqual(t2.imbalanceBand, 'Leaning');
assert.strictEqual(t2.mode, 'Builder');
assert.strictEqual(t2.archetype, 'The Independent');
assert.strictEqual(t2.drive, 'Inner');
assert.strictEqual(t2.driveStrength, 'Blended');
assert.strictEqual(t2.support, 'Solo');
assert.strictEqual(t2.supportStrength, 'Slight');
assert.strictEqual(t2.gravity, 'Freedom');
assert.strictEqual(t2.alignment, 'Aligned');
assert.strictEqual(t2.sacrificedIsWeakest, false);

// Test 3: the rare balanced result, weakest tie broken by gravity points
const t3 = scoreProfile({
  quick: { Faith: 10, Family: 9, Finance: 11, Fitness: 10, Freedom: 9 },
  extra: { Faith: [3, 4], Family: [3, 4], Finance: [3, 4], Fitness: [3, 4], Freedom: [3, 4] },
  style: [1, 1, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0],
  values: { ranked: ['Ownership of my time', 'Legacy', 'Purpose and meaning'], protect: 'Family', slip: 'Fitness' }
});
console.log('T3', JSON.stringify(t3));
assert.deepStrictEqual(t3.scores, { Faith: 17, Family: 16, Finance: 18, Fitness: 17, Freedom: 16 });
assert.strictEqual(t3.imbalance, 2);
assert.strictEqual(t3.imbalanceBand, 'Balanced');
assert.strictEqual(t3.archetype, 'The Complete Architect');
assert.strictEqual(t3.weakest, 'Family');
assert.strictEqual(t3.gravity, 'Family');
assert.strictEqual(t3.alignment, 'Aligned');
assert.strictEqual(t3.mode, 'Strategist');

console.log('All three test cases pass');
