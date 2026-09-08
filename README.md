# Git im ABAP Kontext — DSAG 2026

Slides for the DSAG 2026 session *Git im ABAP Kontext*. The deck is plain HTML
in `index.html`, driven by a small custom presentation engine — no framework,
no build step, no runtime dependencies.

## Run locally

```sh
npm install        # only for http-server; the deck itself has no dependencies
npm start          # serves on http://localhost:8000
```

Any static server works, and opening `index.html` straight from disk works too.

## Presenting

| Key | Action |
| --- | --- |
| `→` / `space` | next slide (or next fragment) |
| `←` | previous slide |
| `↓` / `↑` | move within a vertical stack |
| `home` / `end` | first / last slide |
| `o` / `esc` | slide overview — click a slide to jump to it |
| `b` / `.` | blank the screen |
| `f` | fullscreen |
| `?` | keyboard help |

Presenter remotes work out of the box (they send `page up` / `page down`), and
swiping works on touch screens.

The current position is in the URL (`#/4/1` = fifth stack, second slide), so a
slide can be linked to or reloaded without losing your place.

## Export to PDF

Open <http://localhost:8000/?print-pdf> and print to PDF from the browser
(Chrome: no margins, background graphics on). Each slide becomes one 16:9 page.

## Structure

- `index.html` — the slides, one `<section>` each; nested `<section>`s form
  vertical stacks (drill-down details that can be skipped when time is short).
- `js/deck.js` — the engine: scaling, navigation, overview, print.
- `js/highlight.js` — syntax highlighting for `bash`, `json`, `yaml`, `diff`,
  `abap` and `text`.
- `css/deck.css` — engine styling: the 1280×720 stage, chrome, overview, print.
- `css/custom.css` — typography, two-column layout, comparison table, code
  theme.
- `assets/` — images and demo fallback screenshots, plus the two title-slide
  logos: `abapgit-logo.svg` (from the abapGit repo, MIT) and `dsag-logo.svg`
  (DSAG trademark, from Wikimedia). They are vendored rather than hot-linked so
  the deck also works offline.
- `assets/icons/` — [Bootstrap Icons](https://icons.getbootstrap.com) (MIT),
  the source files behind the `.icon-*` rules in `css/custom.css`.
- `assets/slides-qr.svg` — QR code on the closing slide. If the published URL
  ever changes, regenerate it (no dependency is added to the project):

  ```sh
  npx qrcode -t svg -e M -d 1D2D3E -o assets/slides-qr.svg \
    "https://larshp.github.io/dsag-git-2026/"
  ```

## Icons

Icons are written as `<span class="icon icon-github"></span>`. They are drawn
as a CSS mask filled with `currentColor`, so an icon always takes the colour of
the text it sits in — no icon font, no JavaScript, nothing to load.

Available: `icon-github`, `icon-linkedin`, `icon-x`, `icon-bluesky`.

To add one, download it from Bootstrap Icons into `assets/icons/`, then add a
rule to `css/custom.css` next to the others. The rules embed the SVG as a
`data:` URI rather than pointing at the file, because a browser refuses to load
an external mask image when the deck is opened straight from disk (`file://`) —
the icons would silently disappear. `assets/icons/` keeps the originals so a
rule can be regenerated or an icon swapped.

Content still to write is marked `TODO` in `index.html`.

## Writing slides

```html
<!-- a single slide -->
<section>
  <h2>Heading</h2>
  <ul>
    <li>Point</li>
    <li class="fragment">Revealed on the next key press</li>
  </ul>
</section>

<!-- a vertical stack: optional detail below the main slide -->
<section>
  <section><h2>Main point</h2></section>
  <section><h3>Detail</h3></section>
</section>
```

Code blocks pick their language from the class and are re-indented
automatically, so they can sit at any indentation in the HTML:

```html
<pre><code class="language-bash">
git commit -m "FIX: handle empty selection"
</code></pre>
```

Slides are laid out on a fixed 1280×720 stage that is scaled to fit the window,
so sizes in `em` behave the same on a laptop and on a projector. If you change
the stage size, change it in both `css/deck.css` (`--slide-w` / `--slide-h`)
and `js/deck.js` (`W` / `H`).
