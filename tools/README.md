# Site build notes

The main pages share one header, footer and stylesheet (`/assets/site.css`, `/assets/site.js`).

- Page bodies live in `tools/pages/<name>.html`.
- Run `python3 tools/build.py . tools/pages` from the repo root to regenerate the root HTML pages.
- `tools/articles.py` was used once to move the articles into the new template. Edit articles directly now.

The quiz, Identity Profile, Journey, thank-you and privacy pages are standalone and not generated.
