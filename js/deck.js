/*
  Presentation engine for this deck — no framework, no dependencies.

  Markup contract: .deck > .deck-slides > <section>. A <section> that contains
  further <section>s is a vertical stack; everything else is a single slide.
  This file adds the .deck-slide / .deck-stack classes, so index.html stays
  plain content.

  Handles: fit-to-viewport scaling, keyboard and touch navigation, #/h/v
  routing, overview, blanking, fullscreen and the portrait-phone hint.
*/
(function () {
  "use strict";

  var W = 1280; // design size — keep in sync with --slide-w / --slide-h
  var H = 720;
  var GAP = 70; // gap between slides in overview, in design pixels
  var OVERVIEW_ZOOM = 0.18; // overview scale, relative to the fit scale

  var deck = document.querySelector(".deck");
  var stage = deck && deck.querySelector(".deck-slides");
  if (!deck || !stage) return;

  /* ---------- model ----------------------------------------------------- */

  var grid = Array.prototype.filter
    .call(stage.children, function (el) {
      return el.tagName === "SECTION";
    })
    .map(function (column) {
      var inner = Array.prototype.filter.call(column.children, function (el) {
        return el.tagName === "SECTION";
      });
      if (!inner.length) {
        column.classList.add("deck-slide");
        return [column];
      }
      column.classList.add("deck-stack");
      inner.forEach(function (slide) {
        slide.classList.add("deck-slide");
      });
      return inner;
    });

  if (!grid.length) return;

  var flat = [];
  grid.forEach(function (column, h) {
    column.forEach(function (el, v) {
      flat.push({ el: el, h: h, v: v });
    });
  });

  var h = 0;
  var v = 0;
  var overview = false;
  var blanked = false;
  var ignoreHashChange = false;
  var animationTimer = null;

  /* ---------- chrome ---------------------------------------------------- */

  var chrome = document.createElement("div");
  chrome.className = "deck-chrome";
  chrome.innerHTML =
    '<button class="deck-help-btn" type="button" title="Keyboard shortcuts (?)" aria-label="Keyboard shortcuts">?</button>' +
    '<span class="deck-counter"></span>';

  var progress = document.createElement("div");
  progress.className = "deck-progress";
  progress.innerHTML =
    '<span class="deck-progress-fill"></span>' +
    '<div class="deck-progress-commits" aria-hidden="true">' +
    flat
      .map(function (_, index) {
        var position = flat.length > 1 ? (index / (flat.length - 1)) * 100 : 100;
        return '<i style="--commit-position:' + position + '%"></i>';
      })
      .join("") +
    "</div>";

  var help = document.createElement("div");
  help.className = "deck-help";
  help.hidden = true;
  help.innerHTML =
    "<table><caption>Keyboard</caption><tbody>" +
    [
      ["&rarr; &nbsp; space", "next slide"],
      ["&larr;", "previous slide"],
      ["&darr; &nbsp; &uarr;", "within a vertical stack"],
      ["home &nbsp; end", "first / last slide"],
      ["o &nbsp; esc", "overview"],
      ["b &nbsp; .", "blank the screen"],
      ["f", "fullscreen"],
      ["?", "this help"],
    ]
      .map(function (row) {
        return (
          "<tr><td>" +
          row[0]
            .split(" &nbsp; ")
            .map(function (key) {
              return "<kbd>" + key + "</kbd>";
            })
            .join(" ") +
          "</td><td>" +
          row[1] +
          "</td></tr>"
        );
      })
      .join("") +
    "</tbody></table>";

  // The chrome rides in the stage's coordinate system — see deck.css — so both
  // elements go into a layer that is scaled the same way the slides are.
  var chromeLayer = document.createElement("div");
  chromeLayer.className = "deck-chrome-layer";
  chromeLayer.appendChild(chrome);
  chromeLayer.appendChild(progress);

  var rotate = document.createElement("div");
  rotate.className = "deck-rotate";
  rotate.innerHTML =
    "<div>" +
    '<svg viewBox="0 0 64 48" width="64" height="48" fill="none" stroke="currentColor" ' +
    'stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M10 24 A 22 22 0 0 1 54 24" />' +
    '<polyline points="48 18 54 24 60 18" />' +
    '<rect x="24" y="16" width="16" height="28" rx="3" />' +
    '<path d="M29 40 h6" />' +
    "</svg>" +
    "<p>Rotate your phone</p>" +
    "<small>The slides are 16:9 &mdash; portrait leaves them a third of the " +
    "screen tall. Tap to look anyway.</small>" +
    "</div>";

  deck.appendChild(chromeLayer);
  deck.appendChild(help);
  deck.appendChild(rotate);

  var counterEl = chrome.querySelector(".deck-counter");
  var progressEl = progress.querySelector(".deck-progress-fill");
  var progressCommitEls = progress.querySelectorAll(".deck-progress-commits i");

  /* ---------- helpers --------------------------------------------------- */

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function currentEl() {
    return grid[h][v];
  }

  function currentIndex() {
    for (var i = 0; i < flat.length; i++) {
      if (flat[i].h === h && flat[i].v === v) return i;
    }
    return 0;
  }

  function fragments(el) {
    return Array.prototype.slice.call(el.querySelectorAll(".fragment"));
  }

  function setFragments(el, visible) {
    fragments(el).forEach(function (fragment) {
      fragment.classList.toggle("is-visible", visible);
    });
  }

  function nextFragment() {
    var pending = fragments(currentEl()).filter(function (fragment) {
      return !fragment.classList.contains("is-visible");
    });
    if (!pending.length) return false;
    pending[0].classList.add("is-visible");
    return true;
  }

  function previousFragment() {
    var shown = fragments(currentEl()).filter(function (fragment) {
      return fragment.classList.contains("is-visible");
    });
    if (!shown.length) return false;
    shown[shown.length - 1].classList.remove("is-visible");
    return true;
  }

  /* ---------- rendering ------------------------------------------------- */

  function render(backwards) {
    flat.forEach(function (slide) {
      var present = slide.h === h && slide.v === v;
      slide.el.classList.toggle("is-present", present);
      if (present) setFragments(slide.el, !!backwards);
    });

    stage.style.setProperty("--pan-x", -(h * (W + GAP)) + "px");
    stage.style.setProperty("--pan-y", -(v * (H + GAP)) + "px");

    var index = currentIndex();
    deck.setAttribute(
      "data-slide-state",
      currentEl().getAttribute("data-state") || "content"
    );
    counterEl.textContent = index + 1 + " / " + flat.length;
    progressEl.style.width =
      (flat.length > 1 ? (index / (flat.length - 1)) * 100 : 100) + "%";
    Array.prototype.forEach.call(progressCommitEls, function (commit, commitIndex) {
      commit.classList.toggle("is-complete", commitIndex <= index);
      commit.classList.toggle("is-current", commitIndex === index);
    });

    writeHash();
  }

  function go(nextH, nextV, backwards) {
    nextH = clamp(nextH, 0, grid.length - 1);
    nextV = clamp(nextV, 0, grid[nextH].length - 1);
    if (nextH === h && nextV === v) return;
    h = nextH;
    v = nextV;
    render(backwards);
  }

  function next() {
    if (!overview && nextFragment()) return;
    if (v + 1 < grid[h].length) go(h, v + 1, false);
    else if (h + 1 < grid.length) go(h + 1, 0, false);
  }

  function previous() {
    if (!overview && previousFragment()) return;
    if (v > 0) go(h, v - 1, true);
    else if (h > 0) go(h - 1, grid[h - 1].length - 1, true);
  }

  /* ---------- scaling --------------------------------------------------- */

  function layout() {
    var scale = Math.min(window.innerWidth / W, window.innerHeight / H);
    // On the deck, not the stage: the chrome layer is a sibling of the stage
    // and needs to inherit the same scale.
    deck.style.setProperty("--scale", scale);
    deck.style.setProperty("--overview-scale", scale * OVERVIEW_ZOOM);
  }

  function setOverview(on) {
    if (on === overview) return;
    overview = on;
    stage.classList.add("is-animating");
    deck.classList.toggle("is-overview", on);
    clearTimeout(animationTimer);
    animationTimer = setTimeout(function () {
      stage.classList.remove("is-animating");
    }, 450);
  }

  function setBlank(on) {
    blanked = on;
    deck.classList.toggle("is-blank", on);
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  }

  /* ---------- routing --------------------------------------------------- */

  function writeHash() {
    var target = "#/" + h + (v ? "/" + v : "");
    if (location.hash === target) return;
    ignoreHashChange = true;
    location.hash = target;
  }

  function readHash() {
    var match = /^#\/(\d+)(?:\/(\d+))?/.exec(location.hash);
    if (!match) return null;
    var nextH = clamp(parseInt(match[1], 10), 0, grid.length - 1);
    var nextV = clamp(parseInt(match[2] || "0", 10), 0, grid[nextH].length - 1);
    return { h: nextH, v: nextV };
  }

  window.addEventListener("hashchange", function () {
    if (ignoreHashChange) {
      ignoreHashChange = false;
      return;
    }
    var target = readHash();
    if (target) go(target.h, target.v, false);
  });

  /* ---------- input ----------------------------------------------------- */

  function handleKey(key, shift) {
    switch (key) {
      case "ArrowRight":
      case "PageDown":
      case "n":
        next();
        return true;
      case "ArrowLeft":
      case "PageUp":
      case "p":
        previous();
        return true;
      case " ":
        if (shift) previous();
        else next();
        return true;
      case "ArrowDown":
        if (overview || v + 1 < grid[h].length) go(h, v + 1, false);
        return true;
      case "ArrowUp":
        if (overview || v > 0) go(h, v - 1, true);
        return true;
      case "Home":
        go(0, 0, false);
        return true;
      case "End":
        go(grid.length - 1, grid[grid.length - 1].length - 1, false);
        return true;
      case "o":
      case "O":
        setOverview(!overview);
        return true;
      case "Escape":
        if (!help.hidden) help.hidden = true;
        else setOverview(!overview);
        return true;
      case "Enter":
        if (overview) setOverview(false);
        return true;
      case "b":
      case "B":
      case ".":
        setBlank(!blanked);
        return true;
      case "f":
      case "F":
        toggleFullscreen();
        return true;
      case "?":
        help.hidden = !help.hidden;
        return true;
      default:
        return false;
    }
  }

  document.addEventListener("keydown", function (event) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    var target = event.target;
    if (
      target &&
      (target.isContentEditable ||
        /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
    ) {
      return;
    }
    if (handleKey(event.key, event.shiftKey)) event.preventDefault();
  });

  help.addEventListener("click", function () {
    help.hidden = true;
  });

  rotate.addEventListener("click", function () {
    rotate.hidden = true;
  });

  chrome.querySelector(".deck-help-btn").addEventListener("click", function () {
    help.hidden = !help.hidden;
  });

  stage.addEventListener("click", function (event) {
    if (!overview) return;
    var slide = event.target.closest(".deck-slide");
    if (!slide) return;
    for (var i = 0; i < flat.length; i++) {
      if (flat[i].el === slide) {
        go(flat[i].h, flat[i].v, false);
        break;
      }
    }
    setOverview(false);
  });

  var touch = null;

  deck.addEventListener(
    "touchstart",
    function (event) {
      if (event.touches.length !== 1) return;
      touch = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    },
    { passive: true }
  );

  deck.addEventListener(
    "touchend",
    function (event) {
      if (!touch || !event.changedTouches.length) return;
      var dx = event.changedTouches[0].clientX - touch.x;
      var dy = event.changedTouches[0].clientY - touch.y;
      touch = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 60) return;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) next();
        else previous();
      } else if (dy < 0) {
        go(h, v + 1, false);
      } else {
        go(h, v - 1, true);
      }
    },
    { passive: true }
  );

  window.addEventListener("resize", layout);

  /* ---------- start ----------------------------------------------------- */

  if (window.DeckHighlight) window.DeckHighlight.all(document);

  flat.forEach(function (slide) {
    slide.el.style.setProperty("--ox", slide.h * (W + GAP) + "px");
    slide.el.style.setProperty("--oy", slide.v * (H + GAP) + "px");
  });

  var start = readHash();
  if (start) {
    h = start.h;
    v = start.v;
  }

  layout();
  render(false);
  deck.classList.add("is-ready");
})();
