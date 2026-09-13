# Git im ABAP Kontext — DSAG 2026

Slides for the DSAG 2026 session *Git im ABAP Kontext*. The deck is plain HTML
in `index.html`, driven by a small custom presentation engine — no framework,
no build step, no runtime dependencies.

## Run locally

Open `index.html` straight from disk. Everything works over `file://`,
including the icons and the vendored avatars, so there is nothing to install.

To serve it over HTTP instead, any static server will do:

```sh
python -m http.server 8000    # then open http://localhost:8000
npx http-server -p 8000       # or this, if you prefer node
```

There is no `package.json` — the deck has no dependencies and nothing to build.

## Presenting

| Key | Action |
| --- | --- |
| `→` / `space` / `n` | next slide (or next fragment) |
| `←` / `shift`+`space` / `p` | previous slide |
| `↓` / `↑` | move within a vertical stack |
| `home` / `end` | first / last slide |
| `o` / `esc` | slide overview — click a slide to jump to it |
| `enter` | leave the overview |
| `b` / `.` | blank the screen |
| `f` | fullscreen |
| `?` | keyboard help |

Presenter remotes work out of the box (they send `page up` / `page down`), and
swiping works on touch screens.

The current position is in the URL (`#/4/1` = fifth stack, second slide), so a
slide can be linked to or reloaded without losing your place.

## Structure

- `index.html` — the slides, one `<section>` each; nested `<section>`s form
  vertical stacks (drill-down details that can be skipped when time is short).
- `js/deck.js` — the engine: scaling, navigation and overview.
- `js/highlight.js` — syntax highlighting for `bash`, `json`, `yaml`, `diff`,
  `abap` and `text`.
- `js/contributors.js` — the 10 September 2026 snapshot used to build the
  linked contributor-avatar wall. The array is GitHub's raw list; bot accounts
  stay in it but are filtered out before rendering, and the headline count on
  the slide is derived from what actually renders, so the two cannot drift.
- `css/deck.css` — engine styling: the 1280×720 stage, chrome and overview.
- `css/custom.css` — typography, the per-slide layouts, and the code theme
  (the `.tok-*` classes that `js/highlight.js` emits).
- `assets/` — the two title-slide logos: `abapgit-logo.svg` (from the abapGit
  repo, MIT) and `dsag-logo.svg` (DSAG trademark, from Wikimedia). They are
  vendored rather than hot-linked so the deck also works offline. Both are
  recoloured for the dark title slide — the abapGit wordmark is white instead
  of `#362701`, and the DSAG disc gains a lighter ring (`#5f8ca4`, the value
  `--dsag-light` also carries) — so they only read on a dark background.
  Re-download the originals before reusing them on a light slide.
- `assets/contributors/` — vendored GitHub avatar thumbnails for the
  contributor slide, so it also works offline.
- `assets/sponsors/` — the same, for the sponsors slide.
- `assets/icons/` — [Bootstrap Icons](https://icons.getbootstrap.com) (MIT),
  the source files behind the `.icon-*` rules in `css/custom.css`.
- `assets/slides-qr.svg` — QR code on the closing slide. If the published URL
  ever changes, regenerate it (no dependency is added to the project):

  ```sh
  npx qrcode -t svg -e M -d 1D2D3E -o assets/slides-qr.svg \
    "https://larshp.github.io/dsag-git-2026/"
  ```

## Icons

Icons are written as `<span class="icon icon-github"></span>`. Each `.icon-*`
rule points a `background-image` at the matching SVG in `assets/icons/`, and
`.icon` sizes it to `1em` so an icon scales with the text it sits next to.

The SVGs carry their own colour, so an icon does *not* follow `currentColor` —
to change a colour, edit the SVG.

Available: `icon-github`, `icon-linkedin`, `icon-x`, `icon-bluesky`.

To add one, download it from Bootstrap Icons into `assets/icons/`, then add a
rule to `css/custom.css` next to the others.

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

Each slide carries a `<!-- n - name -->` comment giving its position in the
deck. Reordering slides means renumbering those comments.

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
