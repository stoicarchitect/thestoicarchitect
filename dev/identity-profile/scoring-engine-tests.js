var assert = require('assert');
var scoreProfile = require('./scoring-engine.js').scoreProfile;

// Case 1: the tester's situation. Family is HEALTHY (highest score) but not who he is.
// His identity answers point to Freedom, and he is a perfectionist. Old engine said Family; new engine must not.
var c1 = scoreProfile({
  quick: { Faith: 9, Family: 13, Finance: 8, Fitness: 10, Freedom: 9 },
  extra: { Faith: [3, 3], Family: [4, 4], Finance: [2, 2], Fitness: [3, 3], Freedom: [3, 3] },
  style: [2, 2, 1, 1, 1, 0, 2, 1, 1, 2, 1, 1],
  ready: [5, 4, 4],
  orient: ['Freedom', 'Freedom', 'Finance', 'Freedom', 'Fitness', 'Freedom'],
  values: { ranked: ['Ownership of my time', 'Independence', 'Security'], protect: 'Freedom', slip: 'Family' }
});
assert.deepStrictEqual(c1.scores, { Faith: 15, Family: 21, Finance: 12, Fitness: 16, Freedom: 15 });
assert.strictEqual(c1.anchor, 'Freedom');
assert.strictEqual(c1.strongest, 'Family');
assert.strictEqual(c1.weakest, 'Finance');
assert.strictEqual(c1.mode, 'Strategist');
assert.strictEqual(c1.archetype, 'The Cartographer');
assert.strictEqual(c1.readiness, 'Perfectionist');
assert.strictEqual(c1.anchorStrong, false);
assert.strictEqual(c1.drive, 'Inner');
assert.strictEqual(c1.support, 'Solo');

// Case 2: identity tie between Faith and Family, broken by pillar health. Bold starter, Operator.
var c2 = scoreProfile({
  quick: { Faith: 12, Family: 10, Finance: 9, Fitness: 8, Freedom: 9 },
  extra: { Faith: [4, 4], Family: [3, 3], Finance: [3, 3], Fitness: [2, 3], Freedom: [3, 3] },
  style: [-2, -1, -1, -2, -1, -1, -1, -1, 0, -2, -1, -1],
  ready: [1, 2, 2],
  orient: ['Faith', 'Family', 'Faith', 'Family', 'Fitness', 'Finance'],
  values: { ranked: ['Purpose and meaning', 'Legacy', 'Discipline'], protect: null, slip: 'Fitness' }
});
assert.strictEqual(c2.orient.Faith, 7);
assert.strictEqual(c2.orient.Family, 6);
assert.strictEqual(c2.anchor, 'Faith');
assert.strictEqual(c2.second, 'Family');
assert.strictEqual(c2.mode, 'Operator');
assert.strictEqual(c2.archetype, 'The Sentinel');
assert.strictEqual(c2.readiness, 'Bold');
assert.strictEqual(c2.drive, 'Outer');
assert.strictEqual(c2.support, 'Shared');
assert.strictEqual(c2.weakest, 'Fitness');
assert.strictEqual(c2.sacrificedIsWeakest, true);

// Case 3: balanced but low. Must NOT be The Complete Architect.
var c3 = scoreProfile({
  quick: { Faith: 8, Family: 8, Finance: 8, Fitness: 8, Freedom: 8 },
  extra: { Faith: [3, 3], Family: [3, 2], Finance: [3, 3], Fitness: [3, 3], Freedom: [3, 3] },
  style: [1, 1, 0, -1, -1, 0, 1, 1, 1, 1, 1, 1],
  ready: [3, 3, 3],
  orient: ['Fitness', 'Fitness', 'Fitness', 'Family', 'Fitness', 'Finance'],
  values: { ranked: ['Strength and health', 'Discipline', 'Security'], protect: 'Fitness', slip: 'Freedom' }
});
assert.strictEqual(c3.imbalance, 1);
assert.notStrictEqual(c3.archetype, 'The Complete Architect');
assert.strictEqual(c3.archetype, 'The Phoenix');
assert.strictEqual(c3.readiness, 'Steady');
assert.strictEqual(c3.weakest, 'Family');

// Case 4: balanced AND every pillar Solid. This is The Complete Architect.
var c4 = scoreProfile({
  quick: { Faith: 12, Family: 12, Finance: 11, Fitness: 12, Freedom: 12 },
  extra: { Faith: [4, 4], Family: [4, 4], Finance: [3, 3], Fitness: [4, 3], Freedom: [4, 4] },
  style: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  ready: [2, 3, 3],
  orient: ['Faith', 'Family', 'Finance', 'Fitness', 'Freedom', 'Faith'],
  values: { ranked: ['Legacy', 'Security', 'Discipline'], protect: 'Family', slip: 'Fitness' }
});
assert.strictEqual(c4.archetype, 'The Complete Architect');
assert.strictEqual(c4.anchor, 'Family');

console.log('All four test cases pass');
