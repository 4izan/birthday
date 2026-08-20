# Love Letter Reveal Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static, self-contained "open the gift box → unfold a love letter" reveal page: pointer-tilt gift box → open animation → letter with typewriter text, scattered photos, and background music.

**Architecture:** Plain HTML/CSS/JS, zero build step, zero runtime dependencies. Pure logic (config validation, tilt math, typewriter timing, the box's open/closed state machine) lives in small `lib/*.js` files written in a tiny UMD-lite pattern so the exact same file works as a classic browser `<script>` (attaches to `window.LetterLib`) and as a Node `require()`-able module for unit tests — no bundler needed either way. DOM wiring lives in `script.js`. Classic (non-module) `<script>` tags are used throughout specifically so the page works over `file://` with no local server (ES module `<script type="module">` is blocked by CORS over `file://`).

**Tech Stack:** HTML5, CSS3 (custom properties, transitions/keyframes, `prefers-reduced-motion`), vanilla JS (ES2017+, no framework). Node.js 18+ `node --test` + `node:assert/strict` for unit tests (dev-only; not required to view or host the site).

## Global Constraints

- No build tooling, no package manager install step, no frameworks, no external CDN dependency required for the page to work (spec: "static, no build step, no dependencies").
- Must work by double-clicking `index.html` (no local server requirement) — this is why classic scripts are used instead of ES modules (spec: "host anywhere").
- Must honor `prefers-reduced-motion: reduce` everywhere an animation/transition is added — replace with instant/opacity-only changes (spec: Resilience section).
- Missing/broken photo file: that photo card is silently removed, no broken-image icon (spec: Resilience section).
- Missing/broken audio file or rejected `play()`: the music toggle hides itself / falls back silently, never throws (spec: Resilience section).
- Photos list is capped at 5 entries (spec: Letter view — "3–5 polaroid-style photo cards").
- All personalization (names, letter text, photo list, song, theme colors/font) lives in `config.js` only; no other file needs to change for basic customization (spec: Customization workflow).
- Touch/no-hover devices never get the pointer-follow tilt (spec: Gift box screen — "touch has no persistent pointer position").
- Music playback is started from the same click handler that opens the box, to satisfy autoplay-with-sound gesture requirements (spec: Letter view).

---

### Task 1: Project scaffold, config validation, and name rendering

**Files:**
- Create: `config.js`
- Create: `lib/config.js`
- Create: `tests/config.test.js`
- Create: `index.html`
- Create: `styles.css`
- Create: `script.js`

**Interfaces:**
- Produces: `window.LETTER_CONFIG` (raw personalization data, see shape below).
- Produces: `window.LetterLib.validateConfig(raw) -> NormalizedConfig` (browser global) / `module.exports.validateConfig` (Node), where `NormalizedConfig = { recipientName: string, senderName: string, letterText: string, photos: Array<{src: string, alt?: string}> (max 5), song: {src: string, title?: string} | null, theme: {primary, accent, background, foreground, fontSerif} }`. Throws `Error` with a message listing all problems if `raw` is invalid.
- Produces: `applyTheme(theme)`, `renderNames(config)`, `init()` in `script.js` (no exports — these are the page's own bootstrap, called at the bottom of the file).

- [ ] **Step 1: Write the failing test for `validateConfig`**

Create `tests/config.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const { validateConfig } = require("../lib/config.js");

test("fills in theme defaults and normalizes optional fields when omitted", () => {
  const cfg = validateConfig({
    recipientName: "A",
    senderName: "B",
    letterText: "hi",
  });
  assert.equal(cfg.theme.primary, "#c9184a");
  assert.deepEqual(cfg.photos, []);
  assert.equal(cfg.song, null);
});

test("throws listing the missing required field", () => {
  assert.throws(
    () => validateConfig({ senderName: "B", letterText: "hi" }),
    /recipientName/
  );
});

test("caps photos at 5 entries", () => {
  const photos = Array.from({ length: 8 }, (_, i) => ({ src: `p${i}.jpg` }));
  const cfg = validateConfig({
    recipientName: "A",
    senderName: "B",
    letterText: "hi",
    photos,
  });
  assert.equal(cfg.photos.length, 5);
});

test("throws when a photo entry has no src", () => {
  assert.throws(
    () =>
      validateConfig({
        recipientName: "A",
        senderName: "B",
        letterText: "hi",
        photos: [{}],
      }),
    /photos\[0\]\.src/
  );
});

test("passes through a valid song and custom theme override", () => {
  const cfg = validateConfig({
    recipientName: "A",
    senderName: "B",
    letterText: "hi",
    song: { src: "assets/song.mp3" },
    theme: { primary: "#000000" },
  });
  assert.equal(cfg.song.src, "assets/song.mp3");
  assert.equal(cfg.theme.primary, "#000000");
  assert.equal(cfg.theme.accent, "#ffb3c6"); // untouched default
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/config.test.js`
Expected: FAIL — `Cannot find module '../lib/config.js'`

- [ ] **Step 3: Implement `lib/config.js`**

```js
(function (global) {
  const DEFAULT_THEME = {
    primary: "#c9184a",
    accent: "#ffb3c6",
    background: "#fff0f3",
    foreground: "#3a1f28",
    fontSerif: "Georgia, 'Times New Roman', serif",
  };

  function validateConfig(raw) {
    if (!raw || typeof raw !== "object") {
      throw new Error("Invalid letter config: config must be an object");
    }

    const errors = [];
    if (!raw.recipientName || typeof raw.recipientName !== "string") {
      errors.push("recipientName must be a non-empty string");
    }
    if (!raw.senderName || typeof raw.senderName !== "string") {
      errors.push("senderName must be a non-empty string");
    }
    if (!raw.letterText || typeof raw.letterText !== "string") {
      errors.push("letterText must be a non-empty string");
    }

    const photos = Array.isArray(raw.photos) ? raw.photos : [];
    photos.forEach((p, i) => {
      if (!p || typeof p.src !== "string" || !p.src) {
        errors.push(`photos[${i}].src must be a non-empty string`);
      }
    });

    if (errors.length > 0) {
      throw new Error("Invalid letter config: " + errors.join("; "));
    }

    const song =
      raw.song && typeof raw.song.src === "string" && raw.song.src
        ? { src: raw.song.src, title: raw.song.title || "" }
        : null;

    return {
      recipientName: raw.recipientName,
      senderName: raw.senderName,
      letterText: raw.letterText,
      photos: photos.slice(0, 5).map((p) => ({ src: p.src, alt: p.alt || "" })),
      song,
      theme: Object.assign({}, DEFAULT_THEME, raw.theme || {}),
    };
  }

  const api = { validateConfig };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    global.LetterLib = Object.assign(global.LetterLib || {}, api);
  }
})(typeof window !== "undefined" ? window : globalThis);
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/config.test.js`
Expected: PASS — 5 tests, 0 failures

- [ ] **Step 5: Create the personalization data file**

Create `config.js`:

```js
window.LETTER_CONFIG = {
  recipientName: "Layan",
  senderName: "Faizan",
  letterText:
    "My dearest Layan,\n\nEvery day with you feels like a gift I get to open all over again.\n\nForever yours,\nFaizan",
  photos: [
    // { src: "assets/photos/one.jpg", alt: "Us at the beach" },
  ],
  song: null, // e.g. { src: "assets/song.mp3", title: "Our song" }
  theme: {
    primary: "#c9184a",
    accent: "#ffb3c6",
    background: "#fff0f3",
    foreground: "#3a1f28",
    fontSerif: "Georgia, 'Times New Roman', serif",
  },
};
```

- [ ] **Step 6: Create the HTML skeleton**

Create `index.html`:

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>A Letter For You</title>
<link rel="stylesheet" href="styles.css" />
</head>
<body>
<main id="app">
  <section id="box-screen" class="screen screen--box">
    <p class="names">
      <span class="names__row"><span class="names__label">To</span> <span id="recipient-name" class="names__value"></span></span>
      <span class="names__row"><span class="names__label">From</span> <span id="sender-name" class="names__value"></span></span>
    </p>
    <button id="gift-box" type="button" class="gift-box" aria-label="Tap to open your letter">
      <span class="gift-box__tilt">
        <span class="gift-box__shadow"></span>
        <span class="gift-box__lid gift-box__lid--left"></span>
        <span class="gift-box__lid gift-box__lid--right"></span>
        <span class="gift-box__body"></span>
        <span class="gift-box__ribbon gift-box__ribbon--h"></span>
        <span class="gift-box__ribbon gift-box__ribbon--v"></span>
        <svg class="gift-box__bow" viewBox="0 0 200 140" aria-hidden="true">
          <path d="M92 80 C84 98 76 114 64 134 L50 130 C62 114 74 96 84 78 Z" class="bow-fold" />
          <path d="M108 80 C116 98 124 114 136 134 L150 130 C138 114 126 96 116 78 Z" class="bow-fold" />
          <path d="M88 60 C70 42 36 30 18 50 C6 68 20 82 50 84 C74 82 88 74 88 60 Z" class="bow-face" />
          <path d="M112 60 C130 42 164 30 182 50 C194 68 180 82 150 84 C126 82 112 74 112 60 Z" class="bow-face" />
          <circle cx="100" cy="72" r="12" class="bow-knot" />
        </svg>
      </span>
    </button>
    <p class="tap-hint">Tap to open</p>
  </section>

  <section id="letter-screen" class="screen screen--letter" hidden>
    <div class="photo-scatter" id="photo-scatter" aria-hidden="true"></div>
    <article class="letter-card" id="letter-card">
      <p class="letter-card__text" id="letter-text"></p>
    </article>
  </section>

  <audio id="song" preload="none"></audio>
  <button id="music-toggle" class="music-toggle" type="button" hidden>
    <span id="music-toggle-icon">&#9834;</span>
  </button>
</main>

<script src="config.js"></script>
<script src="lib/config.js"></script>
<script src="script.js"></script>
</body>
</html>
```

- [ ] **Step 7: Create the base stylesheet**

Create `styles.css`:

```css
:root {
  --color-primary: #c9184a;
  --color-accent: #ffb3c6;
  --color-bg: #fff0f3;
  --color-fg: #3a1f28;
  --font-serif: Georgia, 'Times New Roman', serif;
}

* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  min-height: 100%;
  background: var(--color-bg);
  color: var(--color-fg);
  font-family: var(--font-serif);
}

#app {
  position: relative;
  min-height: 100vh;
  min-height: 100dvh;
  overflow: hidden;
}

.screen {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 24px;
  text-align: center;
}

.names {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
}

.names__row {
  display: flex;
  gap: 8px;
  align-items: baseline;
  justify-content: center;
}

.names__label {
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.6;
}

.names__value {
  font-size: 1.75rem;
  font-weight: 700;
}
```

- [ ] **Step 8: Create the bootstrap script**

Create `script.js`:

```js
function applyTheme(theme) {
  const root = document.documentElement;
  root.style.setProperty("--color-primary", theme.primary);
  root.style.setProperty("--color-accent", theme.accent);
  root.style.setProperty("--color-bg", theme.background);
  root.style.setProperty("--color-fg", theme.foreground);
  root.style.setProperty("--font-serif", theme.fontSerif);
}

function renderNames(config) {
  document.getElementById("recipient-name").textContent = config.recipientName;
  document.getElementById("sender-name").textContent = config.senderName;
}

function init() {
  const config = window.LetterLib.validateConfig(window.LETTER_CONFIG);
  applyTheme(config.theme);
  renderNames(config);
  return config;
}

init();
```

- [ ] **Step 9: Manually verify in a browser**

Double-click `index.html` (or drag it into a browser tab — no server needed).
Expected: page shows "To Layan" / "From Faizan" (or your configured names) centered on a pale pink background, no errors in the DevTools console.

- [ ] **Step 10: Commit**

```bash
git add config.js lib/config.js tests/config.test.js index.html styles.css script.js
git commit -m "feat: scaffold letter page with config validation and name rendering"
```

---

### Task 2: Static gift box visual

**Files:**
- Modify: `styles.css` (append)

**Interfaces:**
- Consumes: `.gift-box`, `.gift-box__tilt`, `.gift-box__body`, `.gift-box__lid--left/right`, `.gift-box__ribbon--h/v`, `.gift-box__bow`, `.bow-face`, `.bow-fold`, `.bow-knot`, `.tap-hint` selectors from the Task 1 HTML.
- Produces: nothing consumed elsewhere by name — purely visual, but the class names above are load-bearing for Task 3/4 (do not rename them).

- [ ] **Step 1: Append gift box styling**

Append to `styles.css`:

```css
.gift-box {
  appearance: none;
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
  perspective: 900px;
}

.gift-box__tilt {
  position: relative;
  display: block;
  width: 200px;
  height: 160px;
  transform-style: preserve-3d;
  transition: transform 0.15s ease-out;
}

.gift-box__shadow {
  position: absolute;
  left: 10%;
  right: 10%;
  bottom: -18px;
  height: 24px;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(0, 0, 0, 0.25), transparent);
  filter: blur(2px);
}

.gift-box__body {
  position: absolute;
  inset: 40px 0 0 0;
  border-radius: 10px;
  background: var(--color-primary);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.18);
}

.gift-box__lid {
  position: absolute;
  top: 28px;
  width: 50%;
  height: 34px;
  background: var(--color-accent);
  border-radius: 6px;
}

.gift-box__lid--left { left: 0; transform-origin: right center; }
.gift-box__lid--right { right: 0; transform-origin: left center; }

.gift-box__ribbon {
  position: absolute;
  background: #fff;
  opacity: 0.9;
}

.gift-box__ribbon--v {
  left: 50%;
  top: 28px;
  bottom: 0;
  width: 14px;
  transform: translateX(-50%);
}

.gift-box__ribbon--h {
  left: 0;
  right: 0;
  top: 68px;
  height: 14px;
}

.gift-box__bow {
  position: absolute;
  top: -30px;
  left: 50%;
  width: 120px;
  height: auto;
  transform: translateX(-50%);
}

.bow-face { fill: var(--color-primary); stroke: var(--color-fg); stroke-width: 1.5; }
.bow-fold { fill: var(--color-accent); }
.bow-knot { fill: var(--color-fg); }

.tap-hint {
  margin: 0;
  font-size: 0.85rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.7;
  animation: tap-hint-pulse 1.8s ease-in-out infinite;
}

@keyframes tap-hint-pulse {
  0%, 100% { opacity: 0.5; transform: translateY(0); }
  50% { opacity: 1; transform: translateY(-2px); }
}

@media (prefers-reduced-motion: reduce) {
  .tap-hint { animation: none; }
}
```

- [ ] **Step 2: Manually verify in a browser**

Reload `index.html`.
Expected: a pink gift box with a ribbon cross and a bow sits below the names, with a softly pulsing "Tap to open" label underneath.

- [ ] **Step 3: Commit**

```bash
git add styles.css
git commit -m "feat: add static gift box visual"
```

---

### Task 3: Pointer tilt with touch/reduced-motion fallback

**Files:**
- Create: `lib/tilt.js`
- Create: `tests/tilt.test.js`
- Modify: `styles.css` (append)
- Modify: `script.js` (add functions + call in `init()`)
- Modify: `index.html:` add `<script src="lib/tilt.js"></script>` before `script.js`

**Interfaces:**
- Consumes: nothing new from earlier tasks.
- Produces: `window.LetterLib.computeTilt(pointerX, pointerY, rect, maxDeg = 12) -> {rotateX: number, rotateY: number}` (browser global / Node `require`).
- Produces: `supportsHover() -> boolean`, `prefersReducedMotion() -> boolean`, `initTilt()` (no arguments) in `script.js` — `prefersReducedMotion()` is reused by later tasks (4, 5, 6), do not rename it.

- [ ] **Step 1: Write the failing test for `computeTilt`**

Create `tests/tilt.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const { computeTilt } = require("../lib/tilt.js");

test("center of the rect yields no rotation", () => {
  const rect = { left: 0, top: 0, width: 200, height: 100 };
  const { rotateX, rotateY } = computeTilt(100, 50, rect);
  assert.equal(rotateX, 0);
  assert.equal(rotateY, 0);
});

test("top-left corner yields max positive rotateX and max negative rotateY", () => {
  const rect = { left: 0, top: 0, width: 200, height: 100 };
  const { rotateX, rotateY } = computeTilt(0, 0, rect, 12);
  assert.equal(rotateX, 12);
  assert.equal(rotateY, -12);
});

test("bottom-right corner yields max negative rotateX and max positive rotateY", () => {
  const rect = { left: 0, top: 0, width: 200, height: 100 };
  const { rotateX, rotateY } = computeTilt(200, 100, rect, 12);
  assert.equal(rotateX, -12);
  assert.equal(rotateY, 12);
});

test("pointer outside the rect is clamped to the nearest edge", () => {
  const rect = { left: 0, top: 0, width: 200, height: 100 };
  const outside = computeTilt(-50, -50, rect, 12);
  const corner = computeTilt(0, 0, rect, 12);
  assert.deepEqual(outside, corner);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/tilt.test.js`
Expected: FAIL — `Cannot find module '../lib/tilt.js'`

- [ ] **Step 3: Implement `lib/tilt.js`**

```js
(function (global) {
  function computeTilt(pointerX, pointerY, rect, maxDeg = 12) {
    const px = (pointerX - rect.left) / rect.width;
    const py = (pointerY - rect.top) / rect.height;
    const clampedX = Math.min(1, Math.max(0, px));
    const clampedY = Math.min(1, Math.max(0, py));
    const rotateY = (clampedX - 0.5) * 2 * maxDeg;
    const rotateX = (0.5 - clampedY) * 2 * maxDeg;
    return { rotateX, rotateY };
  }

  const api = { computeTilt };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    global.LetterLib = Object.assign(global.LetterLib || {}, api);
  }
})(typeof window !== "undefined" ? window : globalThis);
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/tilt.test.js`
Expected: PASS — 4 tests, 0 failures

- [ ] **Step 5: Add the idle-float fallback styling**

Append to `styles.css`:

```css
.gift-box__tilt--idle {
  animation: gift-box-float 3.2s ease-in-out infinite;
}

@keyframes gift-box-float {
  0%, 100% { transform: translateY(0) rotateZ(0deg); }
  50% { transform: translateY(-6px) rotateZ(1.5deg); }
}

@media (prefers-reduced-motion: reduce) {
  .gift-box__tilt--idle { animation: none; }
}
```

- [ ] **Step 6: Wire the tilt behavior into `script.js`**

Add to `script.js` (after `renderNames`, before `init`):

```js
function supportsHover() {
  return window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function initTilt() {
  const button = document.getElementById("gift-box");
  const tiltEl = button.querySelector(".gift-box__tilt");

  if (prefersReducedMotion() || !supportsHover()) {
    tiltEl.classList.add("gift-box__tilt--idle");
    return;
  }

  button.addEventListener("pointermove", (event) => {
    const rect = button.getBoundingClientRect();
    const { rotateX, rotateY } = window.LetterLib.computeTilt(event.clientX, event.clientY, rect, 12);
    tiltEl.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  });

  button.addEventListener("pointerleave", () => {
    tiltEl.style.transform = "rotateX(0deg) rotateY(0deg)";
  });
}
```

Modify `init()` to call it:

```js
function init() {
  const config = window.LetterLib.validateConfig(window.LETTER_CONFIG);
  applyTheme(config.theme);
  renderNames(config);
  initTilt();
  return config;
}

init();
```

- [ ] **Step 7: Add the new script tag**

In `index.html`, insert before `<script src="script.js"></script>`:

```html
<script src="lib/tilt.js"></script>
```

- [ ] **Step 8: Manually verify in a browser**

Reload `index.html`. Move the mouse over the box: it should tilt smoothly to follow the pointer and settle back to flat on `pointerleave`. Open DevTools, toggle device emulation to a touch device (or use the Rendering panel to emulate `prefers-reduced-motion: reduce`), reload: the box should gently float up and down instead of tilting.

- [ ] **Step 9: Commit**

```bash
git add lib/tilt.js tests/tilt.test.js styles.css script.js index.html
git commit -m "feat: add pointer tilt with touch/reduced-motion fallback"
```

---

### Task 4: Open animation sequence

**Files:**
- Create: `lib/giftBoxState.js`
- Create: `tests/giftBoxState.test.js`
- Modify: `styles.css` (append)
- Modify: `script.js` (add functions + call in `init()`)
- Modify: `index.html`: add `<script src="lib/giftBoxState.js"></script>` before `script.js`

**Interfaces:**
- Consumes: `prefersReducedMotion()` from Task 3's `script.js`.
- Produces: `window.LetterLib.createGiftBoxState(initial = "closed") -> { state: "closed"|"opening"|"open", onChange(cb), open(), finishOpen() }` (throws on an invalid transition).
- Produces: `function onLetterOpen(config) {}` in `script.js` — an intentionally empty hook that Tasks 5, 6, and 7 each extend (full-body replacement each time, shown in those tasks).
- Produces: `initOpenSequence(config)` in `script.js`, called from `init()`.

- [ ] **Step 1: Write the failing tests for the state machine**

Create `tests/giftBoxState.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const { createGiftBoxState } = require("../lib/giftBoxState.js");

test("starts closed", () => {
  const s = createGiftBoxState();
  assert.equal(s.state, "closed");
});

test("open() transitions to opening and notifies listeners", () => {
  const s = createGiftBoxState();
  const seen = [];
  s.onChange((state) => seen.push(state));
  s.open();
  assert.equal(s.state, "opening");
  assert.deepEqual(seen, ["opening"]);
});

test("finishOpen() transitions opening -> open", () => {
  const s = createGiftBoxState();
  s.open();
  s.finishOpen();
  assert.equal(s.state, "open");
});

test("open() while already opening throws", () => {
  const s = createGiftBoxState();
  s.open();
  assert.throws(() => s.open());
});

test("finishOpen() from closed throws", () => {
  const s = createGiftBoxState();
  assert.throws(() => s.finishOpen());
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/giftBoxState.test.js`
Expected: FAIL — `Cannot find module '../lib/giftBoxState.js'`

- [ ] **Step 3: Implement `lib/giftBoxState.js`**

```js
(function (global) {
  const VALID_TRANSITIONS = {
    closed: ["opening"],
    opening: ["open"],
    open: [],
  };

  function createGiftBoxState(initial = "closed") {
    let state = initial;
    const listeners = [];

    function set(next) {
      const allowed = VALID_TRANSITIONS[state] || [];
      if (!allowed.includes(next)) {
        throw new Error(`Cannot transition from "${state}" to "${next}"`);
      }
      state = next;
      listeners.forEach((cb) => cb(state));
    }

    return {
      get state() {
        return state;
      },
      onChange(cb) {
        listeners.push(cb);
      },
      open() {
        set("opening");
      },
      finishOpen() {
        set("open");
      },
    };
  }

  const api = { createGiftBoxState };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    global.LetterLib = Object.assign(global.LetterLib || {}, api);
  }
})(typeof window !== "undefined" ? window : globalThis);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/giftBoxState.test.js`
Expected: PASS — 5 tests, 0 failures

- [ ] **Step 5: Add the open-sequence styling**

Append to `styles.css`:

```css
.screen--letter {
  opacity: 0;
  pointer-events: none;
}

.screen--letter.is-visible {
  opacity: 1;
  pointer-events: auto;
  transition: opacity 0.6s ease 0.3s;
}

.screen--box.is-leaving {
  transition: opacity 0.5s ease, transform 0.5s ease;
  opacity: 0;
  transform: scale(0.92);
}

.gift-box.is-opening .gift-box__lid--left {
  transition: transform 0.5s ease;
  transform: translateX(-30%) rotate(-25deg);
}

.gift-box.is-opening .gift-box__lid--right {
  transition: transform 0.5s ease;
  transform: translateX(30%) rotate(25deg);
}

.gift-box.is-opening .gift-box__ribbon--v,
.gift-box.is-opening .gift-box__ribbon--h {
  transition: transform 0.5s ease, opacity 0.5s ease;
  opacity: 0;
}

.gift-box.is-opening .gift-box__ribbon--v { transform: translateX(-50%) scaleY(0); }
.gift-box.is-opening .gift-box__ribbon--h { transform: scaleX(0); }

.gift-box.is-opening .gift-box__bow {
  transition: transform 0.5s ease, opacity 0.4s ease;
  opacity: 0;
  transform: translate(-50%, -40px) rotate(-15deg);
}

@media (prefers-reduced-motion: reduce) {
  .gift-box.is-opening .gift-box__lid--left,
  .gift-box.is-opening .gift-box__lid--right,
  .gift-box.is-opening .gift-box__ribbon--v,
  .gift-box.is-opening .gift-box__ribbon--h,
  .gift-box.is-opening .gift-box__bow,
  .screen--box.is-leaving,
  .screen--letter.is-visible {
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 6: Wire the open sequence into `script.js`**

Add to `script.js` (after `initTilt`, before `init`):

```js
function onLetterOpen(config) {}

function initOpenSequence(config) {
  const button = document.getElementById("gift-box");
  const boxScreen = document.getElementById("box-screen");
  const letterScreen = document.getElementById("letter-screen");
  const state = window.LetterLib.createGiftBoxState();

  state.onChange((next) => {
    if (next === "opening") {
      button.classList.add("is-opening");
      button.disabled = true;
      boxScreen.classList.add("is-leaving");
    }
    if (next === "open") {
      boxScreen.hidden = true;
      letterScreen.hidden = false;
      void letterScreen.offsetWidth; // force layout so the opacity transition runs
      letterScreen.classList.add("is-visible");
      onLetterOpen(config);
    }
  });

  button.addEventListener("click", () => {
    state.open();
    const delay = prefersReducedMotion() ? 50 : 550;
    window.setTimeout(() => state.finishOpen(), delay);
  });
}
```

Modify `init()`:

```js
function init() {
  const config = window.LetterLib.validateConfig(window.LETTER_CONFIG);
  applyTheme(config.theme);
  renderNames(config);
  initTilt();
  initOpenSequence(config);
  return config;
}

init();
```

- [ ] **Step 7: Add the new script tag**

In `index.html`, insert before `<script src="script.js"></script>`:

```html
<script src="lib/giftBoxState.js"></script>
```

- [ ] **Step 8: Manually verify in a browser**

Reload `index.html` and click the gift box. Expected: the ribbon and bow animate away, the lid halves swing open, the box screen fades/scales out, and an empty letter screen (blank card, no text yet — that's Task 5) fades in. In DevTools, confirm `#box-screen` gains `hidden` and `#letter-screen` loses it after the animation. Re-check with `prefers-reduced-motion: reduce` emulated: the same state change happens almost instantly, nothing gets stuck mid-transition.

- [ ] **Step 9: Commit**

```bash
git add lib/giftBoxState.js tests/giftBoxState.test.js styles.css script.js index.html
git commit -m "feat: add gift box open animation and screen transition"
```

---

### Task 5: Letter unfold and typewriter text reveal

**Files:**
- Create: `lib/typewriter.js`
- Create: `tests/typewriter.test.js`
- Modify: `styles.css` (append)
- Modify: `script.js` (add function, replace `onLetterOpen` body)

**Interfaces:**
- Consumes: `prefersReducedMotion()` (Task 3), the `onLetterOpen(config)` hook and `.screen--letter.is-visible` trigger (Task 4).
- Produces: `window.LetterLib.buildRevealSchedule(text, msPerChar = 18) -> Array<{index: number, char: string, delay: number}>`.
- Produces: `typeLetterText(text)` in `script.js`, called from `onLetterOpen`.

- [ ] **Step 1: Write the failing tests for the reveal schedule**

Create `tests/typewriter.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const { buildRevealSchedule } = require("../lib/typewriter.js");

test("empty string yields an empty schedule", () => {
  assert.deepEqual(buildRevealSchedule(""), []);
});

test("schedule length matches text length, delays step by msPerChar", () => {
  const schedule = buildRevealSchedule("hi", 10);
  assert.equal(schedule.length, 2);
  assert.equal(schedule[0].char, "h");
  assert.equal(schedule[0].delay, 0);
  assert.equal(schedule[1].char, "i");
  assert.equal(schedule[1].delay, 10);
});

test("defaults to 18ms per character when not specified", () => {
  const schedule = buildRevealSchedule("ab");
  assert.equal(schedule[1].delay, 18);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/typewriter.test.js`
Expected: FAIL — `Cannot find module '../lib/typewriter.js'`

- [ ] **Step 3: Implement `lib/typewriter.js`**

```js
(function (global) {
  function buildRevealSchedule(text, msPerChar = 18) {
    const schedule = [];
    for (let i = 0; i < text.length; i++) {
      schedule.push({ index: i, char: text[i], delay: i * msPerChar });
    }
    return schedule;
  }

  const api = { buildRevealSchedule };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    global.LetterLib = Object.assign(global.LetterLib || {}, api);
  }
})(typeof window !== "undefined" ? window : globalThis);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/typewriter.test.js`
Expected: PASS — 3 tests, 0 failures

- [ ] **Step 5: Add the letter card styling**

Append to `styles.css`:

```css
.letter-card {
  position: relative;
  z-index: 1;
  width: min(90vw, 480px);
  max-height: 70vh;
  overflow-y: auto;
  padding: clamp(20px, 5vw, 36px);
  border-radius: 4px;
  background: #fffaf5;
  color: var(--color-fg);
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.2);
  transform: scaleY(0.05);
  transform-origin: top center;
  transition: transform 0.5s ease 0.35s;
}

.screen--letter.is-visible .letter-card {
  transform: scaleY(1);
}

.letter-card__text {
  margin: 0;
  white-space: pre-wrap;
  font-size: 1.05rem;
  line-height: 1.7;
  text-align: left;
}

@media (prefers-reduced-motion: reduce) {
  .letter-card { transition: none; transform: scaleY(1); }
}
```

- [ ] **Step 6: Wire the typewriter reveal into `script.js`**

Add to `script.js` (after `initOpenSequence`, before `init`):

```js
function typeLetterText(text) {
  const el = document.getElementById("letter-text");
  el.textContent = "";
  if (prefersReducedMotion()) {
    el.textContent = text;
    return;
  }
  const schedule = window.LetterLib.buildRevealSchedule(text, 16);
  schedule.forEach(({ char, delay }) => {
    window.setTimeout(() => {
      el.textContent += char;
    }, delay);
  });
}
```

Replace the `onLetterOpen` body added in Task 4:

```js
function onLetterOpen(config) {
  typeLetterText(config.letterText);
}
```

- [ ] **Step 7: Add the new script tag**

In `index.html`, insert before `<script src="script.js"></script>`:

```html
<script src="lib/typewriter.js"></script>
```

- [ ] **Step 8: Manually verify in a browser**

Reload `index.html`, click the box. Expected: the letter card unfolds (scales open from the top) and the message types out character by character at a readable pace. With `prefers-reduced-motion: reduce` emulated, the full text appears immediately with no typing animation.

- [ ] **Step 9: Commit**

```bash
git add lib/typewriter.js tests/typewriter.test.js styles.css script.js index.html
git commit -m "feat: add letter unfold and typewriter text reveal"
```

---

### Task 6: Scattered photos with missing-file fallback

**Files:**
- Modify: `styles.css` (append)
- Modify: `script.js` (add function, replace `onLetterOpen` body)

**Interfaces:**
- Consumes: `prefersReducedMotion()` (Task 3), `#photo-scatter` container (Task 1 HTML), the `onLetterOpen(config)` hook (Task 4/5), `config.photos: Array<{src, alt}>` (Task 1 `lib/config.js`).
- Produces: `renderPhotos(photos)` in `script.js`, called from `onLetterOpen`.

- [ ] **Step 1: Add the polaroid styling**

Append to `styles.css`:

```css
.photo-scatter {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.polaroid {
  position: absolute;
  margin: 0;
  width: 120px;
  padding: 10px 10px 28px;
  background: #fff;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.22);
  opacity: 0;
  transform: translateY(16px) rotate(var(--polaroid-rotate, 0deg)) scale(0.9);
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.polaroid.is-visible {
  opacity: 1;
  transform: translateY(0) rotate(var(--polaroid-rotate, 0deg)) scale(1);
}

.polaroid img {
  display: block;
  width: 100%;
  height: 100px;
  object-fit: cover;
}

.polaroid:nth-of-type(1) { left: 4%; top: 12%; --polaroid-rotate: -12deg; }
.polaroid:nth-of-type(2) { right: 4%; top: 18%; --polaroid-rotate: 9deg; }
.polaroid:nth-of-type(3) { left: 2%; bottom: 10%; --polaroid-rotate: 8deg; }
.polaroid:nth-of-type(4) { right: 2%; bottom: 16%; --polaroid-rotate: -7deg; }
.polaroid:nth-of-type(5) { left: 50%; top: 4%; --polaroid-rotate: -3deg; transform: translate(-50%, 16px); }
.polaroid:nth-of-type(5).is-visible { transform: translate(-50%, 0) rotate(var(--polaroid-rotate)) scale(1); }

@media (max-width: 640px) {
  .polaroid { width: 88px; }
}

@media (prefers-reduced-motion: reduce) {
  .polaroid { transition: none; }
}
```

- [ ] **Step 2: Wire photo rendering into `script.js`**

Add to `script.js` (after `typeLetterText`, before `init`):

```js
function renderPhotos(photos) {
  const container = document.getElementById("photo-scatter");
  container.innerHTML = "";
  photos.forEach((photo, index) => {
    const wrap = document.createElement("figure");
    wrap.className = "polaroid";
    const img = document.createElement("img");
    img.src = photo.src;
    img.alt = photo.alt || "";
    img.onerror = () => wrap.remove();
    wrap.appendChild(img);
    container.appendChild(wrap);
    const delay = prefersReducedMotion() ? 0 : 500 + index * 180;
    window.setTimeout(() => wrap.classList.add("is-visible"), delay);
  });
}
```

Replace the `onLetterOpen` body added in Task 5:

```js
function onLetterOpen(config) {
  typeLetterText(config.letterText);
  renderPhotos(config.photos);
}
```

- [ ] **Step 3: Manually verify in a browser**

In `config.js`, temporarily set `photos` to `[{ src: "assets/photos/one.jpg", alt: "test" }, { src: "assets/photos/missing.jpg", alt: "broken" }]` (no need for real files yet for the second one). Create `assets/photos/` and drop any small `.jpg` in as `one.jpg`. Reload, click the box. Expected: the `one.jpg` polaroid scatters in with a staggered fade/slide after the letter opens; the `missing.jpg` entry never appears (no broken-image icon). Revert `config.js`'s `photos` back to `[]` (or your real photos) afterward.

- [ ] **Step 4: Commit**

```bash
git add styles.css script.js
git commit -m "feat: add scattered polaroid photos with missing-file fallback"
```

---

### Task 7: Background music, final resilience pass, and docs

**Files:**
- Modify: `styles.css` (append)
- Modify: `script.js` (add function, replace `onLetterOpen` body, add `initMusic` call in `init()`)
- Create: `README.md`
- Create: `assets/photos/.gitkeep`

**Interfaces:**
- Consumes: `#song` audio element and `#music-toggle`/`#music-toggle-icon` buttons (Task 1 HTML), `config.song: {src, title} | null` (Task 1 `lib/config.js`), the `onLetterOpen(config)` hook (Task 4/5/6).
- Produces: `initMusic(config)` in `script.js`, called from `init()`; sets the module-level `playMusicOnOpen` function used by the final `onLetterOpen`.

- [ ] **Step 1: Add the music toggle styling**

Append to `styles.css`:

```css
.music-toggle {
  position: fixed;
  right: 16px;
  bottom: 16px;
  width: 48px;
  height: 48px;
  border-radius: 999px;
  border: 0;
  background: var(--color-primary);
  color: #fff;
  font-size: 1.2rem;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
  z-index: 2;
}

.music-toggle[hidden] { display: none; }
```

- [ ] **Step 2: Wire music playback into `script.js`**

Add near the top of `script.js`, right after the `"use strict"`-equivalent top (i.e. as the first statement in the file, before `applyTheme`):

```js
let playMusicOnOpen = () => {};
```

Add a new function (after `renderPhotos`, before `init`):

```js
function initMusic(config) {
  const toggle = document.getElementById("music-toggle");
  const audio = document.getElementById("song");

  if (!config.song || !config.song.src) {
    return; // no track configured; toggle stays hidden
  }

  audio.src = config.song.src;
  audio.loop = true;
  audio.onerror = () => {
    toggle.hidden = true;
  };
  toggle.hidden = false;

  function setIcon(isPlaying) {
    document.getElementById("music-toggle-icon").textContent = isPlaying ? "❚❚" : "♪";
  }

  toggle.addEventListener("click", () => {
    if (audio.paused) {
      audio.play().then(() => setIcon(true)).catch(() => setIcon(false));
    } else {
      audio.pause();
      setIcon(false);
    }
  });

  playMusicOnOpen = () => {
    audio.play().then(() => setIcon(true)).catch(() => setIcon(false));
  };
}
```

Replace the `onLetterOpen` body added in Task 6:

```js
function onLetterOpen(config) {
  typeLetterText(config.letterText);
  renderPhotos(config.photos);
  playMusicOnOpen();
}
```

Modify `init()` to call `initMusic`:

```js
function init() {
  const config = window.LetterLib.validateConfig(window.LETTER_CONFIG);
  applyTheme(config.theme);
  renderNames(config);
  initTilt();
  initMusic(config);
  initOpenSequence(config);
  return config;
}

init();
```

- [ ] **Step 3: Manually verify music playback**

In `config.js`, temporarily set `song: { src: "assets/song.mp3", title: "test" }` and drop any small `.mp3` at `assets/song.mp3`. Reload, click the box. Expected: the floating music button appears bottom-right, and the track starts automatically the moment the letter opens (no "autoplay blocked" console error, since playback is triggered from the click's call stack); clicking the button pauses/resumes it. Then point `song.src` at a non-existent file and reload: the button should stay hidden and no error should be thrown. Revert `config.js` to your real song (or `null`) afterward.

- [ ] **Step 4: Full responsive / reduced-motion / missing-asset QA pass**

In the browser: resize the viewport to ~375px wide (or use device emulation) and re-run the full flow (tilt/idle float → open → letter → photos → music) — confirm nothing overflows or gets clipped. Emulate `prefers-reduced-motion: reduce` in DevTools' Rendering panel and re-run the full flow — confirm every stage still completes (idle float off, open is near-instant, letter card appears at full size immediately, typing is instant, photos appear without sliding, transitions are effectively instant). Temporarily blank out `config.js`'s `photos` and `song` entirely — confirm the page still works with no photos and no music toggle shown.

- [ ] **Step 5: Write the README**

Create `README.md`:

```markdown
# A Letter For You

A personalized, animated "open the gift" love letter page. Static HTML/CSS/JS — no build step, no server required to view it, no dependencies.

## Customize it

Edit `config.js`:

- `recipientName`, `senderName` — the names shown on the box screen
- `letterText` — your message (use `\n` for line breaks)
- `photos` — up to 5 `{ src, alt }` entries; put the image files in `assets/photos/`
- `song` — `{ src: "assets/song.mp3", title: "..." }`, or `null` to leave out music
- `theme` — colors and font, applied via CSS custom properties

Missing photo files or a missing/broken song file are skipped automatically — the page won't break.

## Preview it

Double-click `index.html`, or drag it into a browser tab. No server needed.

## Host it

Upload the whole folder to any static host (GitHub Pages, Netlify, Vercel, etc.) — `index.html` is the entry point.

## Run the unit tests (optional, for development only)

Requires Node.js 18+.

    node --test tests/

These cover the pure logic (config validation, tilt math, typewriter timing, the box's open-state machine). The animations themselves are verified by eye in a browser — see the manual verification steps in `docs/superpowers/plans/2026-08-19-love-letter-reveal.md`.
```

- [ ] **Step 6: Add the photos folder placeholder**

Create `assets/photos/.gitkeep` (empty file, so the folder exists in git even with no photos committed yet):

```

```

- [ ] **Step 7: Commit**

```bash
git add styles.css script.js README.md assets/photos/.gitkeep
git commit -m "feat: add background music, final QA pass, and README"
```
