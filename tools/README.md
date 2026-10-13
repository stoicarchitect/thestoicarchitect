# Site build notes

The main pages share one header, footer and stylesheet (`/assets/site.css`, `/assets/site.js`).

- Page bodies live in `tools/pages/<name>.html`.
- Run `python3 tools/build.py . tools/pages` from the repo root to regenerate the root HTML pages.
- `tools/articles.py` was used once to move the articles into the new template. Edit articles directly now.

The quiz, Identity Profile, Journey, thank-you and privacy pages are standalone and not generated.

## Forms
- Journey sign-ups post straight to the Brevo Journey form (homepage, Journey page, and any form with `data-journey`).
- The F5IVE Score posts to its own Brevo form with the score attributes.
- Founding lists and enquiries (`data-lead`) go to `/api/lead` in `functions/api/[[path]].js`, which uses the
  existing `BREVO_API_KEY`. Founding sign-ups land in Brevo lists named "Founding list: <Pillar> Pillar" or
  "Founding list: Brotherhood" (created automatically). Notifications go to `NOTIFY_TO`, default F5ive@thestoicarchitect.com.

## Cookies
`assets/consent.js` must be on every page. Google Analytics and the LinkedIn Insight Tag only load after consent.
Never paste tracking snippets into pages directly.
