/* F5IVE Score: questions, copy and the results colonnade, shared by quiz.html and quiz-results.html */
(function () {
  var PILLARS = ['Faith', 'Family', 'Finance', 'Fitness', 'Freedom'];
  var QUESTIONS = [
    { pillar: 'Faith', text: 'When external pressures mount, work stress, financial strain, relationship conflict, you have a clear sense of who you are that remains stable.' },
    { pillar: 'Faith', text: 'You can articulate the core values that guide your decisions, and your actions under pressure reflect those values consistently.' },
    { pillar: 'Faith', text: 'Your sense of purpose is not tied exclusively to your professional role. It would survive a redundancy, a career change, or the loss of a title.' },
    { pillar: 'Family', text: 'When you are physically present with the people closest to you, you are genuinely mentally present, not distracted by work, tasks, or your phone.' },
    { pillar: 'Family', text: 'The people closest to you would describe you as emotionally available and genuinely interested in what is happening in their lives.' },
    { pillar: 'Family', text: 'Your most important relationships are improving, not just surviving, because of the deliberate investment you make in them.' },
    { pillar: 'Finance', text: 'You have a clear picture of your net financial position: what you own, what you owe, and what you are actively building.' },
    { pillar: 'Finance', text: 'Your financial systems operate automatically. Savings move on payday, and investing does not depend on monthly willpower.' },
    { pillar: 'Finance', text: 'Financial stress is not a persistent background noise in your life. Money is managed structurally rather than reactively.' },
    { pillar: 'Fitness', text: 'Your training or physical practice is consistent regardless of how you feel. It operates as a system rather than depending on motivation.' },
    { pillar: 'Fitness', text: 'When you miss a session or fall off track, you return within 48 hours. Consistency is recovered quickly rather than abandoned.' },
    { pillar: 'Fitness', text: 'Your physical standards are a genuine reflection of your internal standards. Your body is evidence of your commitment.' },
    { pillar: 'Freedom', text: 'Your days have a deliberate structure that protects what matters. You direct your time rather than reacting to whatever is most urgent.' },
    { pillar: 'Freedom', text: 'You regularly feel a sense of alignment: who you are, what you do, and what you value are pointing in the same direction.' },
    { pillar: 'Freedom', text: 'The overall architecture of your life, across all five areas, feels intentional rather than something that is simply happening to you.' }
  ];
  var ANSWERS = [
    { text: 'Strongly agree. This describes me consistently', score: 5 },
    { text: 'Mostly agree. More often than not', score: 4 },
    { text: 'Neutral. Sometimes yes, sometimes no', score: 3 },
    { text: 'Mostly disagree. This is not often true', score: 2 },
    { text: 'Strongly disagree. This rarely or never describes me', score: 1 }
  ];
  var READING = {
    Faith: [['The Identity Trap', '/articles/the-identity-trap.html'], ['The men around you determine more than your mindset does', '/articles/the-environment-problem.html']],
    Family: [['What it actually means to be present', '/articles/what-it-means-to-be-present.html'], ['Communication: the skill every man underestimates', '/articles/communication-the-underestimated-skill.html']],
    Finance: [['The difference between earning and building', '/articles/earning-vs-building.html'], ["The financial identity problem men don't talk about", '/articles/financial-identity-problem.html']],
    Fitness: [['Why the men who never miss are not more motivated than you', '/articles/men-who-never-miss.html'], ["Discipline is not a personality trait. It's a practice.", '/articles/discipline-is-a-practice.html']],
    Freedom: [['Why structure creates freedom', '/articles/structure-creates-freedom.html'], ['Vision compounds. Motivation fades.', '/articles/vision-vs-motivation.html']]
  };
  var INSIGHT = {
    Faith: 'Your foundation needs attention, and it is the most important one to address. Without a stable sense of identity and purpose, every other pillar is building on sand. Start here.',
    Family: 'Your relationships are your biggest gap. The quality of your closest connections reflects, and affects, everything else. Presence, communication and deliberate investment are where to start.',
    Finance: 'Financial sovereignty is where to focus. Building structure around money removes a distorting anxiety that leaks into every other pillar. The goal is not wealth. It is ending money as constant background noise.',
    Fitness: 'Your physical discipline needs rebuilding. This is not about appearance. It is about proving to yourself, daily, that your standards are real. The system you build here transfers everywhere.',
    Freedom: 'Freedom, the integration of all five, is your weakest point. That usually means the pillars are misaligned rather than individually weak. The work is architectural: how they connect, not just how each performs.'
  };
  function extremes(s) {
    var w = PILLARS[0], st = PILLARS[0];
    PILLARS.forEach(function (p) { if (s[p] < s[w]) w = p; if (s[p] > s[st]) st = p; });
    return { weakest: w, strongest: st, total: PILLARS.reduce(function (a, p) { return a + s[p]; }, 0) };
  }
  function columns(s, weakest, withScores) {
    return PILLARS.map(function (p) {
      var h = Math.round(60 + (s[p] / 15) * 200);
      return '<div class="col' + (p === weakest ? ' col--weak' : '') + '" style="--h:' + h + 'px"><div class="col-cap"></div><div class="col-shaft"></div><div class="col-base"></div><div class="col-name">' + p + '</div>' + (withScores ? '<div class="col-note">' + s[p] + '/15</div>' : '') + '</div>';
    }).join('');
  }
  function fillResults(root, s) {
    var e = extremes(s), q = function (sel) { return root.querySelector(sel); };
    q('[data-r=title]').textContent = e.total + ' out of 75';
    q('[data-r=sub]').textContent = 'Your strongest pillar is ' + e.strongest + '. The one undermining the rest is ' + e.weakest + '.';
    q('[data-r=cols]').innerHTML = columns(s, e.weakest, true);
    q('[data-r=focus]').innerHTML = '<span>Your first focus: ' + e.weakest + '</span><p>' + INSIGHT[e.weakest] + '</p>';
    q('[data-r=reading]').innerHTML = READING[e.weakest].map(function (r) { return '<li><a href="' + r[1] + '">' + r[0] + '</a></li>'; }).join('');
    requestAnimationFrame(function () { q('[data-r=cols]').classList.add('is-raising'); });
    return e;
  }
  window.F5S = { PILLARS: PILLARS, QUESTIONS: QUESTIONS, ANSWERS: ANSWERS, READING: READING, INSIGHT: INSIGHT, extremes: extremes, columns: columns, fillResults: fillResults };
})();
