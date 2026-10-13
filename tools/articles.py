"""Rebuild every article into the new template from the backed-up originals."""
import json, re, os, sys
sys.argv = ['build.py']
import build
from bs4 import BeautifulSoup

SP = os.path.dirname(os.path.abspath(__file__))
ORIG = os.environ.get('ORIG_ARTICLES', os.path.join(SP, 'orig_articles'))
OUT = os.path.join(build.REPO, 'articles')
A = json.load(open(os.path.join(SP, 'articles.json')))
META = {s: dict(pillar=p, title=t, dek=d, mins=m) for s, p, t, d, m in A}
LAB = {'faith': 'Faith', 'family': 'Family', 'finance': 'Finance', 'fitness': 'Fitness', 'freedom': 'Freedom', 'framework': 'The F5IVE Framework'}
CH = {'faith': 'Chapters 4 and 11', 'family': 'Chapter 12', 'finance': 'Chapter 13', 'fitness': 'Chapter 14', 'freedom': 'Chapter 15', 'framework': 'Part III'}

def dash(s):
    s = s.replace(' — ', ' - ').replace('—', ' - ').replace(' – ', ' - ')
    return s

for slug, m in META.items():
    soup = BeautifulSoup(open(os.path.join(ORIG, slug + '.html')).read(), 'html.parser')
    h1 = soup.find('h1').get_text(' ', strip=True)
    hero = soup.find(class_='article-hero-inner') or soup.find(class_='article-hero')
    sub = hero.find('p') if hero else None
    dek = sub.get_text(' ', strip=True) if sub else m['dek']
    metas = [x.get_text(strip=True) for x in soup.select('.meta-item')]
    date = next((x for x in metas if re.search(r'20\d\d', x)), 'March 2026')
    art = soup.find('article')
    for sel in ['.author-box']:
        for el in art.select(sel): el.decompose()
    # drop decorative dot dividers' text but keep labelled ones
    for d in art.select('.article-divider'):
        t = d.get_text(strip=True)
        d.clear()
        if t and t != '·': d.string = t
    body = art.decode_contents().strip()
    side = soup.select_one('.sidebar-card-text')
    chapter = dash(side.get_text(' ', strip=True)) if side else f'This article draws from {CH[m["pillar"]]} of Vision to Victory.'
    chapter = chapter.replace(' The full framework is in the book.', '')
    chapter = re.sub(r'(Chapter \d+) - (?:the )?(\w+)(?: Pillar)?(?: of Vision to Victory)?\.', r'\1 (\2) of Vision to Victory.', chapter)
    chapter = chapter.replace('from The F5IVE Framework of Vision to Victory', 'from Part III of Vision to Victory, the five pillars')
    chapter = re.sub(r'(Chapters? [\d ]+) - ([^-]+?) - ', r'\1 (\2) ', chapter)

    body = dash(body)
    if slug == 'why-purpose-survives-a-crisis':
        body = body.replace('When my own scaffolding came down in 2019', 'When my own scaffolding came down in 2018')

    same = [s for s, x in META.items() if s != slug and x['pillar'] == m['pillar']]
    other = [s for s, x in META.items() if s != slug and x['pillar'] != m['pillar']]
    rel = (same + other)[:3]
    rel_html = '\n'.join(f'<li><a href="/articles/{s}.html"><span class="p">{LAB[META[s]["pillar"]].replace("The F5IVE ", "")}</span><h3>{META[s]["title"]}</h3><span class="t">{META[s]["mins"]} min read</span></a></li>' for s in rel)

    url = f'{build.SITE}/articles/{slug}.html'
    ld = json.dumps({"@context": "https://schema.org", "@type": "Article", "headline": h1, "description": dash(dek),
                     "author": {"@type": "Person", "name": "Daniel Brown", "url": build.SITE + "/about.html"},
                     "publisher": {"@type": "Organization", "name": "The Stoic Architect"},
                     "image": build.SITE + "/og-image.png", "mainEntityOfPage": url})
    page = dict(path=f'/articles/{slug}.html', title=f'{h1} | The Stoic Architect', desc=dash(dek).replace('"', '&quot;'))
    extra = f'''  <meta property="og:type" content="article" />
  <script type="application/ld+json">{ld}</script>
  <style>
    .reads {{ list-style: none; border-top: 1px solid var(--rule-soft); }}
    .reads a {{ display: grid; grid-template-columns: 120px 1fr auto; gap: 24px; align-items: baseline; padding: 22px 0; border-bottom: 1px solid var(--rule-soft); text-decoration: none; }}
    .reads .p {{ font: 600 .88rem var(--display); letter-spacing: .08em; color: var(--gilt); }}
    .reads h3 {{ font: 500 1.15rem/1.35 var(--sans); }}
    .reads .t {{ color: var(--ash); font-size: .9rem; white-space: nowrap; }}
    .reads a:hover h3 {{ color: var(--gilt-hi); }}
    @media (max-width: 760px) {{ .reads a {{ grid-template-columns: 1fr; gap: 4px; }} }}
  </style>
'''
    main = f'''<section class="art-hero">
  <div class="wrap">
    <p class="crumbs"><a href="/">Home</a> / <a href="/blog.html">Insights</a> / {LAB[m["pillar"]].replace("The F5IVE ", "")}</p>
    <span class="kicker">{LAB[m["pillar"]]}</span>
    <h1>{h1}</h1>
    <p class="lede">{dash(dek)}</p>
    <div class="art-meta"><span><b>Daniel Brown MSc</b></span><span>{m["mins"]} min read</span><span>{date}</span></div>
  </div>
</section>

<div class="wrap art-grid">
  <div>
    <article class="prose">
{body}
    </article>
    <div class="author">
      <img src="/assets/img/daniel-square.webp" alt="" width="96" height="96" loading="lazy" />
      <div><b>Daniel Brown MSc</b><p>Author of Vision to Victory and founder of the F5IVE Framework. MSc Psychology, BSc (Hons) Artificial Intelligence, thirteen years of senior leadership and a five-year rebuild after a 2018 redundancy. <a class="textlink" href="/about.html">More about Daniel</a></p></div>
    </div>
  </div>
  <aside class="art-side">
    <div class="panel panel--gilt">
      <h3>Find your weakest pillar</h3>
      <p>The F5IVE Score rates all five in 60 seconds and emails you a full breakdown.</p>
      <a class="btn btn--gilt" href="{build.QUIZ}">Take the F5IVE Score</a>
    </div>
    <div class="panel">
      <h3>From the book</h3>
      <p>{chapter}</p>
      <a class="btn btn--line" href="/book.html">Vision to Victory</a>
    </div>
    <form class="panel" data-journey="article">
      <h3>The free 5-day Journey</h3>
      <p>One pillar a day, straight to your inbox.</p>
      <label class="sr-only" for="j-email">Email</label>
      <input class="input" id="j-email" type="email" placeholder="you@email.com" autocomplete="email" required style="margin-bottom:10px" />
      <label class="consent"><input type="checkbox" required /><span>Send me the Journey emails. Unsubscribe any time.</span></label>
      <button class="btn btn--gilt" type="submit">Send me Day One</button>
    </form>
  </aside>
</div>

<section class="band band--lift">
  <div class="wrap">
    <div class="head-row"><div><span class="kicker">Keep reading</span><h2>More from the framework</h2></div><a class="textlink" href="/blog.html">All articles</a></div>
    <ul class="reads">
{rel_html}
    </ul>
  </div>
</section>'''
    html = build.head(page, extra) + build.header('blog') + '<main id="main">\n' + main + '\n</main>\n' + build.FOOTER + '</body>\n</html>\n'
    open(os.path.join(OUT, slug + '.html'), 'w').write(html)
    print('article', slug, len(html), 'em-dashes left:', html.count('—'))
