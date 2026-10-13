"""Assemble site pages from body fragments + shared head, header, footer.
usage: python3 build.py <repo> <fragments dir> [page ...]"""
import sys, os, re, json

REPO = sys.argv[1] if len(sys.argv)>1 else '/home/claude/thestoicarchitect'
FRAG = sys.argv[2] if len(sys.argv)>2 else os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pages')
ONLY = set(sys.argv[3:])
SITE = 'https://www.thestoicarchitect.com'
AMAZON = 'https://amzn.eu/d/04l3yLcL'
QUIZ = '/quiz.html'
PROFILE = '/F5iveassessment'

PAGES = {
  'index':        dict(file='index.html', path='/', nav=None,
                       title='Vision to Victory by Daniel Brown MSc | The Stoic Architect',
                       desc='Most men do not fail for lack of talent. They fail for lack of structure. The F5IVE Framework, the book Vision to Victory, and a free 60-second score to find your weakest pillar.'),
  'book':         dict(file='book.html', path='/book.html', nav='book',
                       title='Vision to Victory: The Book | Daniel Brown MSc',
                       desc='Vision to Victory: Why Men Fail, Why They Succeed, and How to Master the Difference. 19 chapters, four parts, one framework. Paperback and Kindle on Amazon.'),
  'framework':    dict(file='framework.html', path='/framework.html', nav='framework',
                       title='The F5IVE Framework: Faith, Family, Finance, Fitness, Freedom | The Stoic Architect',
                       desc='Five interdependent pillars held in alignment at the same time. What each pillar covers, the question it asks of you, and how they hold each other up.'),
  'courses':      dict(file='courses.html', path='/courses.html', nav='courses',
                       title='F5IVE Pillar Courses | The Stoic Architect',
                       desc='Pillar courses that take the F5IVE Framework off the page and into your week. The Finance Pillar opens first. Join the founding list.'),
  'finance-pillar': dict(file='finance-pillar.html', path='/finance-pillar.html', nav='courses',
                       title='The Finance Pillar Course | The Stoic Architect',
                       desc='Five modules and a working toolkit that turn the Finance chapter of Vision to Victory into a monthly system. Founding list now open.'),
  'about':        dict(file='about.html', path='/about.html', nav='about',
                       title='About Daniel Brown MSc | The Stoic Architect',
                       desc='Daniel Brown MSc: author of Vision to Victory, founder of the F5IVE Framework. Thirteen years of senior leadership, a 2018 redundancy, and a five-year rebuild.'),
  'blog':         dict(file='blog.html', path='/blog.html', nav='blog',
                       title='Insights | The Stoic Architect',
                       desc='Articles on discipline, identity and the F5IVE Framework in practice, organised by pillar.'),
  'brotherhood':  dict(file='brotherhood.html', path='/brotherhood.html', nav=None,
                       title='The F5IVE Brotherhood | The Stoic Architect',
                       desc='A structured accountability community for men working on all five pillars at once. Founding list now open.'),
  'speaking':     dict(file='speaking.html', path='/speaking.html', nav=None,
                       title='Speaking and Press | Daniel Brown MSc',
                       desc='Book Daniel Brown MSc for keynotes, workshops, podcasts and press. Talks on why capable men fail, leadership identity and the F5IVE Framework.'),
  '404':          dict(file='404.html', path='/404.html', nav=None, noindex=True,
                       title='Page not found | The Stoic Architect',
                       desc='This page does not exist.'),
  'privacy':      dict(file='privacy.html', path='/privacy.html', nav=None,
                       title='Privacy policy | The Stoic Architect',
                       desc='How The Stoic Architect collects, uses and protects personal data, and how to exercise your rights under UK GDPR.'),
  'cookies':      dict(file='cookies.html', path='/cookies.html', nav=None,
                       title='Cookie policy | The Stoic Architect',
                       desc='The cookies and similar storage thestoicarchitect.com uses, and how to change your choices.'),
  'terms':        dict(file='terms.html', path='/terms.html', nav=None,
                       title='Terms of use | The Stoic Architect',
                       desc='The terms for using thestoicarchitect.com, the F5IVE Score and the Identity Profile.'),
  'quiz':         dict(file='quiz.html', path='/quiz.html', nav='focus',
                       title='The F5IVE Score: find your weakest pillar | The Stoic Architect',
                       desc='Fifteen questions, 60 seconds. See which of your five pillars, Faith, Family, Finance, Fitness or Freedom, is undermining the other four.'),
  'quiz-results': dict(file='quiz-results.html', path='/quiz-results.html', nav='focus', noindex=True,
                       title='Your F5IVE results | The Stoic Architect',
                       desc='Your F5IVE Score results.'),
  'journey':      dict(file='F5ivejourney.html', path='/F5ivejourney.html', nav='focus',
                       title='The F5IVE Journey: free 5-day email course | The Stoic Architect',
                       desc='Five days, one pillar a day, straight to your inbox. The free email course built from Vision to Victory.'),
  'thank-you':    dict(file='thank-you.html', path='/thank-you.html', nav=None, noindex=True,
                       title='Day One is on its way | The Stoic Architect',
                       desc='Your first F5IVE Journey email is on its way.'),
}

FONTS = 'https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600&family=Cinzel:wght@500;600;700&family=EB+Garamond:ital@1&display=swap'

def head(p, extra=''):
    url = SITE + p['path']
    robots = '<meta name="robots" content="noindex" />' if p.get('noindex') else f'<link rel="canonical" href="{url}" />'
    return f'''<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{p['title']}</title>
  <meta name="description" content="{p['desc']}" />
  {robots}
  <meta name="theme-color" content="#12100E" />
  <link rel="icon" href="/Stoic_Architect_Favicon_Mark.svg" type="image/svg+xml" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="The Stoic Architect" />
  <meta property="og:title" content="{p['title']}" />
  <meta property="og:description" content="{p['desc']}" />
  <meta property="og:url" content="{url}" />
  <meta property="og:image" content="{SITE}/og-image.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@danielmrbrown" />
  <meta name="twitter:image" content="{SITE}/og-image.png" />
  <link rel="preload" href="/assets/fonts/cinzel-latin-600-normal.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="preload" href="/assets/fonts/archivo-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="stylesheet" href="/assets/site.css?v=3" />
  <script src="/assets/consent.js?v=1" defer></script>
{extra}</head>
<body>
'''

NAV = [('book','/book.html','The Book'), ('framework','/framework.html','The Framework'), ('profile',PROFILE,'Identity Profile'),
       ('courses','/courses.html','Courses'), ('blog','/blog.html','Insights'), ('about','/about.html','About')]

def header(cur):
    if cur == 'focus':
        return FOCUS
    items = ''.join(f'<li><a href="{h}"{" aria-current=\"page\"" if k==cur else ""}>{t}</a></li>' for k,h,t in NAV)
    return f'''<a class="skip" href="#main">Skip to content</a>
<header class="site-head">
  <div class="wrap head-in">
    <a class="brand" href="/" aria-label="The Stoic Architect, home">
      <img src="/assets/img/mark.png" alt="" width="40" height="40" />
      <span><b>The Stoic Architect</b><small>Vision to Victory</small></span>
    </a>
    <nav aria-label="Main"><ul class="nav">{items}</ul></nav>
    <a class="btn btn--gilt head-cta" href="{QUIZ}">Take the F5IVE Score</a>
    <button class="menu-btn" aria-label="Menu" aria-expanded="false" aria-controls="drawer"><span></span></button>
  </div>
</header>
<div class="drawer" id="drawer">
  <ol>
    <li><a href="/book.html">The Book <small>Vision to Victory</small></a></li>
    <li><a href="/framework.html">The Framework <small>Five pillars</small></a></li>
    <li><a href="{PROFILE}">Identity Profile <small>Free, 10 minutes</small></a></li>
    <li><a href="/courses.html">Courses <small>Finance first</small></a></li>
    <li><a href="/blog.html">Insights <small>Articles</small></a></li>
    <li><a href="/brotherhood.html">Brotherhood <small>Forming</small></a></li>
    <li><a href="/about.html">About Daniel</a></li>
    <li><a href="/speaking.html">Speaking and press</a></li>
  </ol>
  <a class="btn btn--gilt" href="{QUIZ}">Take the F5IVE Score</a>
</div>
'''

FOCUS = """<a class="skip" href="#main">Skip to content</a>
<header class="site-head site-head--focus">
  <div class="wrap head-in">
    <a class="brand" href="/" aria-label="The Stoic Architect, home">
      <img src="/assets/img/mark.png" alt="" width="40" height="40" />
      <span><b>The Stoic Architect</b><small>Vision to Victory</small></span>
    </a>
    <a class="textlink" href="/">Full site</a>
  </div>
</header>
"""

FOOTER = f'''<footer class="site-foot">
  <div class="wrap">
    <div class="foot-grid">
      <div class="foot-brand">
        <a class="brand" href="/"><img src="/assets/img/mark.png" alt="" width="40" height="40" /><span><b>The Stoic Architect</b><small>Daniel Brown MSc</small></span></a>
        <p>Structure for the man who has read the books, done the work, and still feels something is missing.</p>
      </div>
      <div>
        <h4>Start here</h4>
        <ul>
          <li><a href="{QUIZ}">The F5IVE Score</a></li>
          <li><a href="{PROFILE}">The Identity Profile</a></li>
          <li><a href="/#journey">The free 5-day Journey</a></li>
          <li><a href="/framework.html">The Framework</a></li>
        </ul>
      </div>
      <div>
        <h4>Go deeper</h4>
        <ul>
          <li><a href="/book.html">Vision to Victory</a></li>
          <li><a href="{AMAZON}" target="_blank" rel="noopener">Buy on Amazon</a></li>
          <li><a href="/courses.html">Pillar courses</a></li>
          <li><a href="/brotherhood.html">The Brotherhood</a></li>
        </ul>
      </div>
      <div>
        <h4>Daniel</h4>
        <ul>
          <li><a href="/about.html">About</a></li>
          <li><a href="/blog.html">Insights</a></li>
          <li><a href="/speaking.html">Speaking and press</a></li>
          <li><a href="https://instagram.com/danielmrbrown" target="_blank" rel="noopener">Instagram</a></li>
          <li><a href="https://youtube.com/@thestoicarchitectuk" target="_blank" rel="noopener">YouTube</a></li>
          <li><a href="https://www.linkedin.com/in/daniel-brown-511a47122" target="_blank" rel="noopener">LinkedIn</a></li>
        </ul>
      </div>
    </div>
    <div class="foot-pillars" aria-label="The five pillars"><span>Faith</span><span>Family</span><span>Finance</span><span>Fitness</span><span>Freedom</span></div>
    <div class="foot-base">
      <span>&copy; 2026 Daniel Brown MSc. All rights reserved.</span>
      <span class="foot-legal"><a href="/privacy.html">Privacy policy</a><a href="/cookies.html">Cookie policy</a><a href="/terms.html">Terms of use</a><a href="#" data-cookie-settings>Cookie settings</a></span>
    </div>
  </div>
</footer>
<script src="/assets/site.js?v=3" defer></script>
'''

def render(key):
    p = PAGES[key]
    src = open(os.path.join(FRAG, key + '.html')).read()
    extra = ''
    m = re.search(r'<!--HEAD-->(.*?)<!--/HEAD-->', src, re.S)
    if m: extra, src = m.group(1), src.replace(m.group(0), '')
    tail = ''
    m = re.search(r'<!--TAIL-->(.*?)<!--/TAIL-->', src, re.S)
    if m: tail, src = m.group(1), src.replace(m.group(0), '')
    src = src.replace('{{AMAZON}}', AMAZON).replace('{{QUIZ}}', QUIZ).replace('{{PROFILE}}', PROFILE)
    out = head(p, extra) + header(p['nav']) + '<main id="main">\n' + src + '\n</main>\n' + FOOTER + tail + '</body>\n</html>\n'
    open(os.path.join(REPO, p['file']), 'w').write(out)
    print('built', p['file'], len(out))

if __name__ == '__main__':
  for k in PAGES:
    if (not ONLY or k in ONLY) and os.path.exists(os.path.join(FRAG, k + '.html')):
      render(k)
