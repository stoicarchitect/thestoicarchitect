// F5IVE Identity Profile - scoring engine (reference implementation)
// Runs in the browser or in Node. No dependencies.

const PILLARS = ['Faith', 'Family', 'Finance', 'Fitness', 'Freedom'];

const VALUE_PILLAR = {
  'Purpose and meaning': 'Faith',
  'Integrity and conscience': 'Faith',
  'Loyalty and belonging': 'Family',
  'Legacy': 'Family',
  'Security': 'Finance',
  'Building wealth': 'Finance',
  'Discipline': 'Fitness',
  'Strength and health': 'Fitness',
  'Independence': 'Freedom',
  'Ownership of my time': 'Freedom'
};

const ARCHETYPES = {
  Faith: { Strategist: 'The Compass', Visionary: 'The Lighthouse', Builder: 'The Cornerstone', Operator: 'The Sentinel' },
  Family: { Strategist: 'The Steward', Visionary: 'The Harbour', Builder: 'The Provider', Operator: 'The Protector' },
  Finance: { Strategist: 'The Treasurer', Visionary: 'The Venturer', Builder: 'The Vault Builder', Operator: 'The Dealmaker' },
  Fitness: { Strategist: 'The Periodiser', Visionary: 'The Phoenix', Builder: 'The Forge', Operator: 'The Warrior' },
  Freedom: { Strategist: 'The Cartographer', Visionary: 'The Horizon Chaser', Builder: 'The Independent', Operator: 'The Free Agent' }
};

function pillarBand(score) {
  if (score <= 10) return 'Critical gap';
  if (score <= 15) return 'Underbuilt';
  if (score <= 20) return 'Solid';
  return 'Strong';
}

function imbalanceBand(gap) {
  if (gap <= 3) return 'Balanced';
  if (gap <= 8) return 'Leaning';
  if (gap <= 13) return 'Lopsided';
  return 'Critical';
}

function strength(sum) {
  const a = Math.abs(sum);
  if (a === 0) return 'Blended';
  if (a <= 2) return 'Slight';
  if (a <= 4) return 'Moderate';
  return 'Strong';
}

// items: three numbers, each -2..+2, positive = Pole A. The third item is the tie-break.
function axisResult(items) {
  const sum = items[0] + items[1] + items[2];
  let pole;
  if (sum !== 0) pole = sum > 0 ? 'A' : 'B';
  else if (items[2] !== 0) pole = items[2] > 0 ? 'A' : 'B';
  else {
    const first = items.find(function (v) { return v !== 0; });
    pole = first === undefined ? 'A' : (first > 0 ? 'A' : 'B');
  }
  return { sum: sum, pole: pole, strength: strength(sum) };
}

function rankOf(scores, pillar) {
  return 1 + PILLARS.filter(function (p) { return scores[p] > scores[pillar]; }).length;
}

function scoreProfile(input) {
  // input.quick: { Faith..Freedom } each 3..15 (existing Quick Score totals)
  // input.extra: { Faith: [a, b], ... } new pillar items, each 1..5
  // input.style: 12 numbers, STY-1..STY-12, each -2..+2, positive = Pole A
  // input.values: { ranked: [v1, v2, v3], protect: 'Family', slip: 'Finance' }
  const scores = {};
  PILLARS.forEach(function (p) { scores[p] = input.quick[p] + input.extra[p][0] + input.extra[p][1]; });

  const high = Math.max.apply(null, PILLARS.map(function (p) { return scores[p]; }));
  const low = Math.min.apply(null, PILLARS.map(function (p) { return scores[p]; }));
  const imbalance = high - low;

  // gravity points
  const grav = {};
  PILLARS.forEach(function (p) { grav[p] = 0; });
  [3, 2, 1].forEach(function (w, i) { grav[VALUE_PILLAR[input.values.ranked[i]]] += w; });
  grav[input.values.protect] += 3;
  const maxGrav = Math.max.apply(null, PILLARS.map(function (p) { return grav[p]; }));
  const gravTied = PILLARS.filter(function (p) { return grav[p] === maxGrav; });
  const rank1Pillar = VALUE_PILLAR[input.values.ranked[0]];
  let gravity;
  if (gravTied.length === 1) gravity = gravTied[0];
  else if (gravTied.indexOf(input.values.protect) >= 0) gravity = input.values.protect;
  else if (gravTied.indexOf(rank1Pillar) >= 0) gravity = rank1Pillar;
  else gravity = gravTied[0];

  // weakest: lowest score, ties go to the higher gravity points, then pillar order
  const weakCandidates = PILLARS.filter(function (p) { return scores[p] === low; });
  weakCandidates.sort(function (a, b) { return grav[b] - grav[a] || PILLARS.indexOf(a) - PILLARS.indexOf(b); });
  const weakest = weakCandidates[0];

  // anchor and shadow
  const ordered = PILLARS.slice().sort(function (a, b) {
    return scores[b] - scores[a] || grav[b] - grav[a] || PILLARS.indexOf(a) - PILLARS.indexOf(b);
  });
  let anchor = ordered[0];
  let shadow = null;
  if (scores[ordered[0]] - scores[ordered[1]] <= 1) shadow = ordered[1];

  // axes
  const sp = axisResult(input.style.slice(0, 3));
  const rh = axisResult(input.style.slice(3, 6));
  const dr = axisResult(input.style.slice(6, 9));
  const su = axisResult(input.style.slice(9, 12));
  const mode = sp.pole === 'A' ? (rh.pole === 'A' ? 'Strategist' : 'Visionary') : (rh.pole === 'A' ? 'Builder' : 'Operator');

  const complete = imbalance <= 3;
  const archetype = complete ? 'The Complete Architect' : ARCHETYPES[anchor][mode];

  // alignment gap: only flagged when the gravity pillar sits 3 or more points below the anchor
  const gRank = rankOf(scores, gravity);
  let alignment = 'Aligned';
  if (scores[ordered[0]] - scores[gravity] >= 3) alignment = gRank <= 2 ? 'Aligned' : (gRank === 3 ? 'Drifting' : 'Misaligned');

  return {
    scores: scores,
    bands: PILLARS.reduce(function (o, p) { o[p] = pillarBand(scores[p]); return o; }, {}),
    anchor: anchor,
    shadow: shadow,
    weakest: weakest,
    imbalance: imbalance,
    imbalanceBand: imbalanceBand(imbalance),
    mode: mode,
    drive: dr.pole === 'A' ? 'Inner' : 'Outer',
    driveStrength: dr.strength,
    support: su.pole === 'A' ? 'Solo' : 'Shared',
    supportStrength: su.strength,
    gravity: gravity,
    sacrificed: input.values.slip,
    sacrificedIsWeakest: input.values.slip === weakest,
    alignment: alignment,
    archetype: archetype,
    axisSums: { starting: sp.sum, rhythm: rh.sum, drive: dr.sum, support: su.sum }
  };
}

module.exports = { scoreProfile: scoreProfile, PILLARS: PILLARS };
