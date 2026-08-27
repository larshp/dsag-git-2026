# Git im ABAP Kontext — DSAG 2026

Slides for the DSAG 2026 session *Git im ABAP Kontext*. Built with
[reveal.js](https://revealjs.com); the deck is plain HTML in `index.html`.

## Run locally

```sh
npm install
npm start          # serves on http://localhost:8000
```

`index.html` loads reveal.js from `node_modules/`, so `npm install` is required
before the deck renders.

## Presenting

| Key | Action |
| --- | --- |
| `→` / `space` | next slide |
| `↓` | next slide within a vertical stack |
| `s` | speaker notes window |
| `o` / `esc` | slide overview |
| `b` | blank the screen |
| `f` | fullscreen |

## Export to PDF

Open <http://localhost:8000/?print-pdf> and print to PDF from the browser
(Chrome: no margins, background graphics on).

## Structure

- `index.html` — the slides, one `<section>` each; nested `<section>`s form
  vertical stacks (drill-down details that can be skipped when time is short).
- `css/custom.css` — typography, two-column layout, comparison table.
- `assets/` — images and demo fallback screenshots.

Content still to write is marked `TODO` in `index.html`.
