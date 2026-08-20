# Personalized Love Letter Reveal Page — Design

**Date:** 2026-08-19
**Status:** Approved

## Purpose

A single, self-contained webpage that delivers a personalized romantic message
as a gift-reveal experience: a ribboned gift box that tilts in 3D as you move
the cursor, opens on tap into an unfolding letter, surrounded by scattered
photos, with background music. Inspired by the reveal animation on
https://www.2-luv.com/en/letter/1860f1c742 (a "digital love letter" product),
but built as a fully custom, freely-editable static site — no backend, no
account, no third-party service.

## Non-goals

- No password gate / privacy gate (the reference site has one for sharing
  private links; not needed here since the user controls hosting/sharing).
- No CMS or multi-letter support — this is one page for one message.
- No backend, database, or build tooling.

## Architecture

Static site, zero build step:

```
birthday/
├── index.html
├── styles.css
├── script.js
├── config.js          ← all personalization lives here
└── assets/
    ├── photos/         (recipient photos, user-supplied)
    └── song.mp3         (background track, user-supplied)
```

`config.js` defines one plain object (recipient name, sender name, letter
text, ordered photo filenames, song filename) plus theme knobs. `script.js`
reads it and drives all DOM/animation state; `styles.css` holds the visual
design including a small set of CSS custom properties for colors/fonts at the
top for easy retheming. No framework, no package manager — open `index.html`
directly or host the folder as-is (GitHub Pages, Netlify drag-and-drop, etc.).

## Screens & Flow

1. **Gift box screen** (initial state)
   - Recipient/sender names rendered above the box from `config.js`.
   - Gift box built from CSS + inline SVG (box body, ribbon, bow), matching
     the reference's ribbon/bow look.
   - Desktop: box tilts in 3D following the pointer, via CSS custom
     properties (`--tilt-rotate-x/y`) updated on `pointermove`.
   - Touch devices: no hover/tilt-follow (touch has no persistent pointer
     position) — instead a slow idle float/breathing animation.
   - A "tap to open" affordance sits on/near the box. Click/tap fires the
     open sequence.

2. **Opening animation** (transition)
   - Ribbon untie animation, box lid halves swing open, box scales/fades out
     while the letter view crossfades in. Driven by CSS transitions/Web
     Animations API, sequenced with `setTimeout`/`transitionend` — no
     animation library dependency.

3. **Letter view** (final state)
   - Paper-textured letter card unfolds (scale/clip-path or rotateX unfold)
     and the message text fades in (or a lightweight typewriter reveal).
   - 3–5 polaroid-style photo cards (from `config.js`'s photo list) enter
     staggered, each at a fixed slight rotation, scattered behind/around the
     letter card.
   - Background music (`song.mp3`) starts via `audio.play()` invoked from the
     same user-gesture handler that opened the box (satisfies browser
     autoplay-with-sound restrictions). A small floating mute/play toggle
     is always visible in a corner, and also serves as the manual fallback if
     `play()` still rejects (e.g. some in-app browsers).

## Resilience / edge cases

- Honors `prefers-reduced-motion: reduce` — skips the tilt-follow and
  multi-stage unfold/scatter choreography in favor of simple opacity fades,
  while preserving the same screen structure and content.
- A missing/broken photo file is skipped (`onerror` hides that card) rather
  than showing a broken-image icon.
- A missing/broken audio file disables the music toggle rather than throwing.
- Layout is responsive down to small mobile widths (this is primarily a
  phone-shared link).

## Customization workflow

The user edits only `config.js` (text/names/file lists) and, optionally, the
CSS custom properties block at the top of `styles.css` (colors/fonts). No
other file needs to change for basic personalization.

## Testing / verification

Manual verification in the browser (no automated test framework for a static
animation page):
- Desktop: pointer-tilt responds smoothly, open animation plays once and
  cleanly transitions to the letter, music starts on tap.
- Mobile viewport: idle float instead of tilt, tap-to-open works, layout
  doesn't overflow/clip.
- `prefers-reduced-motion` emulation: heavy animations are replaced by fades,
  nothing breaks or gets stuck mid-transition.
- Missing photo/audio file: page still loads and functions.
