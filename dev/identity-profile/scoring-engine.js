// F5IVE Identity Profile - scoring engine, version 2 (reference implementation)
// Change from version 1: the archetype now comes from IDENTITY (what you build your life around),
// measured by six forced-choice questions plus your value ranking. Pillar HEALTH (how each pillar is
// going) is measured separately and drives the pillar map and the bridge plan.
// Runs in the browser or in Node. No dependencies.

var PILLARS = ['Faith', 'Family', 'Finance', 'Fitness', 'Freedom'];

var VALUE_PILLAR = {
  'Purpose and meaning': 'Faith', 'Integrity and conscience': 'Faith',
  'Loyalty and belonging': 'Family', 'Legacy': 'Family',
  'Security': 'Finance', 'Building wealth': 'Finance',
  'Discipline': 'Fitness', 'Strength and health': 'Fitness',
  'Independence': 'Freedom', 'Ownership of my time': 'Freedom'
};

var ARCHETYPES = {
  Faith: { Strategist: 'The Compass', Visionary: 'The Lighthouse', Builder: 'The Cornerstone', Operator: 'The Sentinel' },
  Family: { Strategist: 'The Steward', Visionary: 'The Harbour', Builder: 'The Provider', Operator: 'The Protector' },
  Finance: { Strategist: 'The Treasurer', Visionary: 'The Venturer', Builder: 'The Vault Builder', Operator: 'The Dealmaker' },
  Fitness: { Strategist: 'The Periodiser', Visionary: 'The Phoenix', Builder: 'The Forge', Operator: 'The Warrior' },
  Freedom: { Strategist: 'The Cartographer', Visionary: 'The Horizon Chaser', Builder: 'The Independent', Operator: 'The Free Agent' }
};

function pillarBand(score) { if (score <= 10) return 'Critical gap'; if (score <= 15) return 'Underbuilt'; if (score <= 20) return 'Solid'; return 'Strong'; }
function imbalanceBand(gap) { if (gap <= 3) return 'Balanced'; if (gap <= 8) return 'Leaning'; if (gap <= 13) return 'Lopsided'; return 'Critical'; }
function strength(sum) { var a = Math.abs(sum); if (a === 0) return 'Blended'; if (a <= 2) return 'Slight'; if (a <= 4) return 'Moderate'; return 'Strong'; }
function axisResult(items) {
  var sum = items[0] + items[1] + items[2], pole;
  if (sum !== 0) pole = sum > 0 ? 'A' : 'B';
  else if (items[2] !== 0) pole = items[2] > 0 ? 'A' : 'B';
  else { var first = items.find(function (v) { return v !== 0; }); pole = first === undefined ? 'A' : (first > 0 ? 'A' : 'B'); }
  return { sum: sum, pole: pole, strength: strength(sum) };
}
function readinessBand(total) { if (total >= 11) return 'Perfectionist'; if (total <= 6) return 'Bold'; return 'Steady'; }

function scoreProfile(input) {
  // input.quick:  { Faith..Freedom } Quick Score totals, each 3..15
  // input.extra:  { Faith: [a, b], ... } new pillar items, each 1..5
  // input.style:  12 numbers, STY-1..STY-12, each -2..+2, positive = Pole A
  // input.ready:  3 numbers, RDY-1..RDY-3, each 1..5 (higher = holds back until it feels right)
  // input.orient: 6 pillar names, one per forced-choice orientation question
  // input.values: { ranked: [v1, v2, v3], protect: 'Family', slip: 'Finance' }
  var scores = {};
  PILLARS.forEach(function (p) { scores[p] = input.quick[p] + input.extra[p][0] + input.extra[p][1]; });
  var high = Math.max.apply(null, PILLARS.map(function (p) { return scores[p]; }));
  var low = Math.min.apply(null, PILLARS.map(function (p) { return scores[p]; }));
  var imbalance = high - low;

  // Identity: 2 points per orientation pick, 3/2/1 for ranked values, 1 for the pillar protected in a hard season
  var orient = {};
  PILLARS.forEach(function (p) { orient[p] = 0; });
  (input.orient || []).forEach(function (p) { if (p) orient[p] += 2; });
  [3, 2, 1].forEach(function (w, i) { orient[VALUE_PILLAR[input.values.ranked[i]]] += w; });
  if (input.values.protect) orient[input.values.protect] += 1;

  var byIdentity = PILLARS.slice().sort(function (a, b) {
    return orient[b] - orient[a] || scores[b] - scores[a] || PILLARS.indexOf(a) - PILLARS.indexOf(b);
  });
  var anchor = byIdentity[0];
  var second = (orient[byIdentity[0]] - orient[byIdentity[1]] <= 1) ? byIdentity[1] : null;

  var byHealth = PILLARS.slice().sort(function (a, b) {
    return scores[b] - scores[a] || orient[b] - orient[a] || PILLARS.indexOf(a) - PILLARS.indexOf(b);
  });
  var strongest = byHealth[0];
  var weakCandidates = PILLARS.filter(function (p) { return scores[p] === low; });
  weakCandidates.sort(function (a, b) { return orient[b] - orient[a] || PILLARS.indexOf(a) - PILLARS.indexOf(b); });
  var weakest = weakCandidates[0];

  var sp = axisResult(input.style.slice(0, 3)), rh = axisResult(input.style.slice(3, 6));
  var dr = axisResult(input.style.slice(6, 9)), su = axisResult(input.style.slice(9, 12));
  var mode = sp.pole === 'A' ? (rh.pole === 'A' ? 'Strategist' : 'Visionary') : (rh.pole === 'A' ? 'Builder' : 'Operator');

  var readyTotal = (input.ready || [3, 3, 3]).reduce(function (a, b) { return a + b; }, 0);

  // Complete Architect: balanced AND every pillar at least Solid, so balance at a low level does not qualify
  var complete = imbalance <= 3 && low >= 16;
  var archetype = complete ? 'The Complete Architect' : ARCHETYPES[anchor][mode];

  return {
    scores: scores,
    bands: PILLARS.reduce(function (o, p) { o[p] = pillarBand(scores[p]); return o; }, {}),
    orient: orient,
    anchor: anchor, second: second,
    anchorStrong: scores[anchor] >= 16,
    strongest: strongest, weakest: weakest,
    imbalance: imbalance, imbalanceBand: imbalanceBand(imbalance),
    mode: mode,
    start: sp.pole === 'A' ? 'Vision' : 'Action',
    rhythm: rh.pole === 'A' ? 'Structure' : 'Flex',
    drive: dr.pole === 'A' ? 'Inner' : 'Outer', driveStrength: dr.strength,
    support: su.pole === 'A' ? 'Solo' : 'Shared', supportStrength: su.strength,
    readiness: readinessBand(readyTotal), readyTotal: readyTotal,
    sacrificed: input.values.slip,
    sacrificedIsWeakest: input.values.slip === weakest,
    archetype: archetype,
    axisSums: { starting: sp.sum, rhythm: rh.sum, drive: dr.sum, support: su.sum }
  };
}

if (typeof module !== 'undefined') module.exports = { scoreProfile: scoreProfile, PILLARS: PILLARS };
